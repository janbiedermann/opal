# backtick_javascript: true
# use_strict: true
# opal_runtime_mode: true
# helpers: raise, slice, splice, has_own

module ::Opal
  # Hashes
  # ------

  # Experiments have shown, that using new Map([[1,2]]) inline is rather slow
  # compared to using new Map() in combination with .set(1,2), because the former
  # creates a new Array for each pair and then discards it. Using .set though
  # would increase the size of the generated code. So lets use a compromise and
  # use a helper function, which allows the compiler to generate compact code
  # and at the same time provides the performance improvement of using .set
  # with a overall smaller overhead than creating arrays for each pair.
  # For primitive keys:
  def self.hash_new(*args)
    %x{
      let h = new Map();
      for (let i = 0; i < args.length; i += 2) {
        h.set(args[i], args[i + 1]);
      }
      return h;
    }
  end

  # The same as above, except for complex keys:
  def self.hash_new2(*args)
    %x{
      let h = new Map();
      for (let i = 0; i < args.length; i += 2) {
        Opal.hash_put(h, args[i], args[i + 1]);
      }
      return h;
    }
  end

  def self.hash_clone(from_hash, to_hash)
    %x{
      to_hash.$$none = from_hash.$$none;
      to_hash.$$proc = from_hash.$$proc;

      for (let entry of from_hash) {
        Opal.hash_put(to_hash, entry[0], entry[1]);
      }

      return to_hash;
    }
  end

  def self.hash_put(hash, key, value)
    %x{
      let type = typeof key;
      if (type === "string" || type === "symbol" || type === "number" || type === "boolean" || type === "bigint") {
        hash.set(key, value)
      } else if (key.$$is_string) {
        hash.set(key.valueOf(), value);
      } else {
        if (!hash.$$keys)
          hash.$$keys = new Map();

        let key_hash = key.$$is_string ? key.valueOf() : (hash.$$by_identity ? Opal.id(key) : key.$hash()),
            keys = hash.$$keys;

        if (!keys.has(key_hash)) {
          keys.set(key_hash, [key]);
          hash.set(key, value);
          return;
        }

        let objects = keys.get(key_hash);

        for (let object of objects) {
          if (key === object || key['$eql?'](object)) {
            hash.set(object, value);
            return;
          }
        }

        objects.push(key);
        hash.set(key, value);
      }
    }
  end

  def self.hash_get(hash, key)
    %x{
      let type = typeof key;
      if (type === "string" || type === "symbol" || type === "number" || type === "boolean" || type === "bigint") {
        return hash.get(key)
      } else if (hash.$$keys) {
        let key_hash = key.$$is_string ? key.valueOf() : (hash.$$by_identity ? Opal.id(key) : key.$hash()),
            objects = hash.$$keys.get(key_hash);

        if (objects !== undefined) {
          for (let object of objects) {
            if (key === object || key['$eql?'](object))
              return hash.get(object);
          }
        } else if (key.$$is_string) {
          return hash.get(key_hash);
        }
      } else if (key.$$is_string) {
        return hash.get(key.valueOf());
      }
    }
  end

  def self.hash_delete(hash, key)
    %x{
      let type = typeof key, value;
      if (type === "string" || type === "symbol" || type === "number" || type === "boolean" || type === "bigint") {
        value = hash.get(key);
        hash.delete(key);
        return value;
      } else if (hash.$$keys) {
        let key_hash = key.$$is_string ? key.valueOf() : (hash.$$by_identity ? Opal.id(key) : key.$hash()),
            objects = hash.$$keys.get(key_hash);

        if (objects !== undefined) {
          for (let i = 0; i < objects.length; i++) {
            let object = objects[i];
            if (key === object || key['$eql?'](object)) {
              objects.splice(i, 1);
              if (objects.length === 0)
                hash.$$keys.delete(key_hash);
              value = hash.get(object);
              hash.delete(object);
              return value;
            }
          }
        } else if (key.$$is_string) {
          value = hash.get(key_hash);
          hash.delete(key_hash);
          return value;
        }
      } else if (key.$$is_string) {
        value = hash.get(key.valueOf());
        hash.delete(key.valueOf());
        return value;
      }
    }
  end

  def self.hash_rehash(hash)
    %x{
      let keys = hash.$$keys;

      if (keys)
        keys.clear();

      for (let entry of hash) {
        let key = entry[0],
            type = typeof key;

        if (type === "string" || type === "symbol" || type === "number" || type === "boolean" || type === "bigint")
          continue; // nothing to rehash

        let key_hash = key.$$is_string ? key.valueOf() : (hash.$$by_identity ? Opal.id(key) : key.$hash());

        if (!keys)
          hash.$$keys = keys = new Map();

        if (!keys.has(key_hash)) {
          keys.set(key_hash, [key]);
          continue;
        }

        let objects = keys.get(key_hash),
            objects_copy = (objects.length === 1) ? objects : $slice(objects);

        for (let object of objects_copy) {
          if (key === object || key['$eql?'](object)) {
            // got a duplicate, remove it
            objects.splice(objects.indexOf(object), 1);
            hash.delete(object);
          }
        }

        objects.push(key);
      }

      return hash;
    }
  end

  def self.hash(*args)
    %x{
      let args_length = args.length,
        hash,
        i,
        length,
        key,
        value;

      if (args_length === 1 && args[0].$$is_hash) {
        return args[0];
      }

      hash = new Map();

      if (args_length === 1) {
        let arg = args[0];

        if (arg.$$is_array) {
          length = arg.length;

          for (i = 0; i < length; i++) {
            if (arg[i].length !== 2) {
              $raise(Opal.ArgumentError, 'value not of length 2: ' + arg[i].$inspect());
            }

            key = arg[i][0];
            value = arg[i][1];

            Opal.hash_put(hash, key, value);
          }

          return hash;
        } else {
          for (key in arg) {
            if ($has_own(arg, key)) {
              value = arg[key];

              Opal.hash_put(hash, key, value);
            }
          }

          return hash;
        }
      }

      if (args_length % 2 !== 0) {
        $raise(Opal.ArgumentError, 'odd number of arguments for Hash');
      }

      for (i = 0; i < args_length; i += 2) {
        key = args[i];
        value = args[i + 1];

        Opal.hash_put(hash, key, value);
      }

      return hash;
    }
  end

  # Primitives for handling parameters
  def self.ensure_kwargs(kwargs)
    %x{
      if (kwargs == null) {
        return new Map();
      } else if (kwargs.$$is_hash) {
        return kwargs;
      } else {
        $raise(Opal.ArgumentError, 'expected kwargs');
      }
    }
  end

  def self.get_kwarg(kwargs, key)
    %x{
      let kwarg = Opal.hash_get(kwargs, key);
      if (kwarg === undefined) {
        $raise(Opal.ArgumentError, 'missing keyword: '+key);
      }
      return kwarg;
    }
  end

  # Used for extracting keyword arguments from arguments passed to
  # JS function.
  #
  # @param parameters [Array]
  # @return [Hash] or undefined

  def self.extract_kwargs(parameters)
    %x{
      let kwargs = parameters.at(-1);
      if (kwargs != null && Opal.respond_to(kwargs, '$to_hash', true)) {
        $splice(parameters, parameters.length - 1);
        return kwargs;
      }
    }
  end

  # Used to get a list of rest keyword arguments. Method takes the given
  # keyword args, i.e. the hash literal passed to the method containing all
  # keyword arguments passed to method, as well as the used args which are
  # the names of required and optional arguments defined. This method then
  # just returns all key/value pairs which have not been used, in a new
  # hash literal.
  #
  # @param given_args [Hash] all kwargs given to method
  # @param used_args [Object<String: true>] all keys used as named kwargs
  # @return [Hash]

  def self.kwrestargs(given_args, used_args)
    %x{
      let map = new Map();

      for (let entry of given_args) {
        if (!used_args[entry[0]]) {
          Opal.hash_put(map, entry[0], entry[1]);
        }
      }

      return map;
    }
  end

  # Helpers for extracting kwsplats
  # Used for: { **h }
  def self.to_hash(value)
    %x{
      if (value.$$is_hash) {
        return value;
      }
      else if (value['$respond_to?']('to_hash', true)) {
        let hash = value.$to_hash();
        if (hash.$$is_hash) {
          return hash;
        }
        else {
          $raise(Opal.TypeError, "Can't convert " + value.$$class +
            " to Hash (" + value.$$class + "#to_hash gives " + hash.$$class + ")");
        }
      }
      else {
        $raise(Opal.TypeError, "no implicit conversion of " + value.$$class + " into Hash");
      }
    }
  end

  # Opal32-checksum algorithm for #hash
  # -----------------------------------

  def self.opal32_init = 0x4f70616c

  # The chain of structures being hashed by #hash, shared by Array, Hash and
  # Struct so that a cycle is seen whichever type closes it. Empty between
  # calls; corelib binds it with `# helpers: hash_ids`.
  %x{
    Opal.hash_ids = [];
    // The hash of a structure that contains a cycle, shared so that a cyclic
    // array and a cyclic hash holding it agree. A property, not a method:
    // corelib binds it with `# helpers: cyclic_hash`.
    Opal.cyclic_hash = 0x01010101;
  }

  %x{
    function $opal32_ror(n, d) {
      return (n << d)|(n >>> (32 - d));
    };
  }

  def self.opal32_add(hash, next_value)
    %x{
      hash ^= next_value;
      hash = $opal32_ror(hash, 1);
      return hash;
    }
  end
end

::Opal
