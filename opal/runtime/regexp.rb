# backtick_javascript: true
# use_strict: true
# opal_runtime_mode: true

require 'runtime/regexp_transpiler.mjs'

module ::Opal
  # Escape Regexp special chars letting the resulting string be used to build
  # a new Regexp.
  def self.escape_regexp(str)
    `Opal.escape_metacharacters(str.replace(/([-[\]\/{}()*+?.^$\\| ])/g, '\\$1'))`
  end

  def self.escape_metacharacters(str)
    %x{
      return str.replace(/[\n]/g, '\\n')
                .replace(/[\r]/g, '\\r')
                .replace(/[\f]/g, '\\f')
                .replace(/[\t]/g, '\\t');
    }
  end

  # Create a global Regexp from a RegExp object and cache the result
  # on the object itself ($$g attribute).
  def self.global_regexp(pattern)
    %x{
      if (pattern.global) {
        return pattern; // RegExp already has the global flag
      }
      if (pattern.$$g == null) {
        pattern.$$g = new RegExp(pattern.source, 'g' + pattern.flags);
      } else {
        pattern.$$g.lastIndex = null; // reset lastIndex property
      }
      return pattern.$$g;
    }
  end

  # Transform a regular expression from Ruby syntax to JS syntax.
  def self.transform_regexp(regexp, flags)
    `Opal.esm['runtime/regexp_transpiler'].transformRegexp(regexp, flags, function(msg) { Opal.Kernel.$warn(msg); })`
  end

  # Removes the whitespace and comments of an extended (x) regular expression.
  # A multi-line pattern needs it before its newlines are escaped: the
  # stripper drops the whitespace characters, and once they read "\n" they are
  # an escaped newline that the pattern must match.
  def self.strip_extended(regexp)
    `Opal.esm['runtime/regexp_transpiler'].stripExtended(regexp)`
  end

  # Combine multiple regexp parts together
  def self.regexp(parts, flags)
    %x{
      var part;

      if (flags == null) flags = '';

      var ignoreCase = flags.includes('i');

      for (var i = 0, ii = parts.length; i < ii; i++) {
        part = parts[i];
        if (part instanceof RegExp) {
          if (part.ignoreCase !== ignoreCase)
            Opal.Kernel.$warn(
              "ignore case doesn't match for " + part.source.$inspect(),
              new Map([['uplevel',  1]])
            )

          part = part.$$source != null ? part.$$source : part.source;
        }
        if (part == '') part = '(?:)';
        parts[i] = part;
      }

      parts = parts.join('');
      // Ruby shows a pattern with the newlines it was written with, so an
      // extended pattern keeps its source as given, and the stripper has to
      // run first: once escape_metacharacters turns a newline into "\n" that
      // reads as an escaped newline the pattern must match. A pattern without
      // x shows its control characters as escapes, so there the escaping comes
      // before the annotation, as it always did.
      var source, engine;
      if (flags.includes('x')) {
        source = parts;
        engine = Opal.escape_metacharacters(Opal.strip_extended(parts));
      } else {
        source = engine = Opal.escape_metacharacters(parts);
      }

      var output = Opal.transform_regexp(engine, flags);

      var regexp = new RegExp(output[0], output[1]);
      if (source != output[0]) regexp.$$source = source
      if (flags != output[1]) regexp.$$options = flags;
      return regexp;
    }
  end

  # Regexp has been transformed, so let's annotate the original regexp
  def self.annotate_regexp(regexp, source, options)
    %x{
      regexp.$$source = source;
      regexp.$$options = options;
      return regexp;
    }
  end

  # Annotated empty regexp
  def self.empty_regexp(flags)
    `Opal.annotate_regexp(new RegExp(/(?:)/, flags), '')`
  end

  # $+: the text matched by the rightmost group that matched. It isn't the
  # last group when that one didn't participate: /a(b)?(c)/ =~ 'ac' gives 'c'
  # and /(a)(b)?/ =~ 'a' gives 'a', not nil.
  def self.last_match_ref(match_data)
    %x{
      var captures = match_data.$captures();
      for (var i = captures.length - 1; i >= 0; i--) {
        if (captures[i] !== nil) return captures[i];
      }
      return nil;
    }
  end
end

::Opal
