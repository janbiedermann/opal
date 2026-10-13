# helpers: coerce_to, coerce_to_or_nil, coerce_to_or_raise, respond_to, global_regexp, prop, opal32_init, opal32_add, transform_regexp, str
# backtick_javascript: true

# depends on:
# require 'corelib/comparable' # required by mini
# require 'corelib/regexp'     # required by mini

### Performance considerations ###

## .valueOf() ##

# We use primitive JavaScript strings and String objects here, code is supposed to work with both of them equally.
# But this is very challenging for JavaScript engines to optimize, because internally these are different types.
# In such situation using .valueOf() on strings before calling a string operator or function ensures that the
# JavaScript engine can rely on getting always the same type (a primitive string) and can optimize code much better.
# In short in JavaScript with string1 and string2 being a primitive or Object:
#   string1.valueOf() + string2.valueOf();
# is faster than:
#   string1 + string2;
# YMMV depending on JavaScript engine.

## String Ropes ##

# Because strings are immutable in JavaScript the way to concatenate or modify strings is to create new strings.
# Usually this would require a new allocation for each new string, which is rather expensive.
# To optimize this situation and prevent frequent allocations JavaScript engines employ "string ropes" internally.
# For example, when concatenating string3 = string1 + string2, instead of making string3 a new allocation, string3
# may just be internally represented as string1 with a pointer to string2, essentially avoiding a new allocation.
# There are certain conditions that must be met to use string ropes and there may be differences between engines.
# In general, as a rule of thumb, when concatenating to a existing string:
#   string = string + other_string;
# creates a rope and is faster than:
#   string += other_string;
# which allocates a new string.
# Also, if a string rope is used for IO or in the DOM or passed anywhere else outside the JavaScript engine it must
# be serialized which may require a final allocation and copying of the individual rope strings into the final string.
# Overall this is still more efficient than the otherwise required multiple smaller allocations and copies.
# YMMV depending on JavaScript engine.

class ::String < `String`
  include ::Comparable

  # The encoding to be used for binary representation of the string.
  # For literal strings that would be mostly UTF-8, for strings read from a file
  # it would be the IO#external_encoding, for newly created strings the same as
  # encoding below, mostly UTF-8 by default.
  # This is set to the default encoding (UTF-8) at the end of corelib/string/encoding.rb
  attr_reader :binary_encoding

  # The encoding to be used for everything else.
  # For literal strings that would be mostly UTF-8, for strings read from a file
  # it would be the IO#internal_encoding.
  # This is set to a default encoding (UTF-8) at the end of corelib/string/encoding.rb
  attr_reader :encoding

  %x{
    const MAX_STR_LEN = Number.MAX_SAFE_INTEGER;

    Opal.prop(#{self}.$$prototype, '$$is_string', true);

    var string_id_map = new Map();

    // Only a surrogate pair makes the JavaScript length differ from the number
    // of characters, so testing for one is what makes it usable as the
    // character length.
    var surrogate_pair = new RegExp('[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]');

    function has_surrogates(str) {
      return surrogate_pair.test(str);
    }

    // The encoding of a string, ready to be shared by the strings built out of
    // its pieces, or null when it is not an Encoding object yet.
    function resolved_encoding(string) {
      const encoding = string.encoding;
      return encoding?.name && encoding.names ? encoding : null;
    }

    // Box a piece of a string with an encoding that is already resolved.
    // Opal.str does the same with three calls and an encoding lookup.
    function box_string(str, encoding) {
      const boxed = new String(str);
      boxed.encoding = encoding;
      boxed.binary_encoding = encoding;
      return boxed;
    }

    let UTF8_ENCODING; // the Encoding::UTF-8 object, taken on first use

    // The Encoding::UTF-8 object, taken once. A plain JavaScript string is one,
    // so its encoding is only re-boxed when the string has another one.
    function utf8_encoding() {
      return UTF8_ENCODING ??= #{::Encoding::UTF_8};
    }

    // The NUL bytes and the ASCII whitespace that String#strip removes.
    function is_strippable(code) {
      return code === 0 || (code >= 9 && code <= 13) || code === 32;
    }

    // The regular expressions that String#sub and String#gsub build from their
    // string patterns. Escaping and compiling a pattern costs more than a Map
    // lookup, so the last ones seen are kept.
    const sub_pattern_regexps = new Map();
    const gsub_pattern_regexps = new Map();

    function regexp_for_pattern(pattern, global) {
      const key = pattern.valueOf(), cache = global ? gsub_pattern_regexps : sub_pattern_regexps;
      let regexp = cache.get(key);
      if (regexp === undefined) {
        if (cache.size > 128) cache.clear();
        regexp = global
          ? new RegExp(key.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'gmu')
          : new RegExp(key.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'));
        cache.set(key, regexp);
      }
      regexp.lastIndex = 0;
      return regexp;
    }

    /* eslint-disable no-misleading-character-class */
    // The characters String#dump escapes, its escape table, and the # of a
    // Ruby interpolation, which dump escapes too.
    const dump_escapable = new RegExp("[\\\\\"\x00-\x1F\x7F-\xFF\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f" +
      String.fromCharCode(0xd800) + '-' + String.fromCharCode(0xdfff) + "\ufeff\ufff0-\uffff]", 'g');

    const dump_meta = {
      '\u0007': '\\a',
      '\u001b': '\\e',
      '\b': '\\b',
      '\t': '\\t',
      '\n': '\\n',
      '\f': '\\f',
      '\r': '\\r',
      '\v': '\\v',
      '"' : '\\"',
      '\\': '\\\\'
    };

    const dump_interpolation = /\#[\$\@\{]/g;
    /* eslint-enable no-misleading-character-class */

    // The leading underscore, the sign and base prefix, and the separators of
    // the numeric strings of String#to_i and String#oct.
    const number_leading_underscore = /^\s*_/;
    const number_prefix = /^(\s*[+-]?)(0[bodx]?)(.+)$/;
    const number_prefix_i = /^(\s*[+-]?)(0[bodx]?)(.+)$/i;
    const number_underscores = /_(?!_)/g;

    // Whether the digits of an integer string of the given radix can start
    // here: after the whitespace and the sign there must be a digit of that
    // radix or an underscore.
    function starts_with_a_number(string, radix) {
      let at = 0, code;
      while (at < string.length) {
        code = string.charCodeAt(at);
        if (code === 32 || (code >= 9 && code <= 13)) at++;
        else break;
      }
      if (at < string.length) {
        code = string.charCodeAt(at);
        if (code === 0x2b || code === 0x2d) at++;
      }
      if (at === string.length) return false;
      code = string.charCodeAt(at);
      if (code === 0x5f) return true;
      if (code >= 0x30 && code <= 0x39) return code - 0x30 < radix;
      if (code >= 0x41 && code <= 0x5a) code += 0x20;
      return radix > 10 && code >= 0x61 && code - 0x61 + 10 < radix;
    }

    // The whitespace of the default separator of String#split.
    function is_whitespace(code) {
      return code === 32 || code === 0xa0 || (code >= 9 && code <= 13);
    }

    // The pieces of a string between the runs of whitespace, which is what
    // splitting it with the default separator regular expression gives.
    function split_on_whitespace(string) {
      const result = [];
      let index = 0, length = string.length;
      while (index < length && is_whitespace(string.charCodeAt(index))) index++;
      let start = index;
      while (index < length) {
        if (is_whitespace(string.charCodeAt(index))) {
          result.push(string.slice(start, index));
          while (index < length && is_whitespace(string.charCodeAt(index))) index++;
          start = index;
        } else {
          index++;
        }
      }
      result.push(string.slice(start));
      return result;
    }

    // The pieces of a string between the matches of a global regular
    // expression, which is what String#split returns. It gives up with null for
    // the cases split treats differently: a match of zero length, and capture
    // groups, whose values split returns as pieces too.
    function split_by_matches(string, regexp) {
      const result = [];
      let start = 0, match;
      regexp.lastIndex = 0;
      while ((match = regexp.exec(string)) !== null) {
        if (match[0].length === 0 || match.length > 1) {
          regexp.lastIndex = 0;
          return null;
        }
        result.push(string.slice(start, match.index));
        start = match.index + match[0].length;
      }
      result.push(string.slice(start));
      return result;
    }

    function first_char(str) {
      return String.fromCodePoint(str.codePointAt(0));
    }

    // UTF-16 aware find_index_of, args:
    //   str: string
    //   search: the string to search for in str
    //   search_l: is optional, if given must be search.$length(), do NOT use search.length
    //   last: boolean, optional too, if true returns the last index otherwise the first
    function find_index_of(str, search, search_l, last) {
      let search_f = (search.length === 1) ? search : first_char(search);
      let i = 0, col = [], l = 0, idx = -1;
      for (const c of str) {
        if (col.length > 0) {
          for (const e of col) {
            if (e.l < l) { e.search = e.search + c; e.l++; }
            if (e.l === l) {
              if (e.search == search) { if (last) idx = e.index; else return e.index; }
              e.search = null;
            }
          }
          if (!col[0].search) col.shift();
        }
        if (search_f == c) {
          if (search.length === 1) { if (last) idx = i; else return i; }
          else {
            if (l === 0) l = search_l || search.$length();
            if (l === 1) { if (last) idx = i; else return i; }
            else col.push({ index: i, search: c, l: 1 });
          }
        }
        i++;
      }
      return idx;
    }

    // Whether a UTF-16 index starts a character instead of its second unit.
    function starts_a_character(string, index) {
      const code = string.charCodeAt(index);
      return code < 0xDC00 || code > 0xDFFF;
    }

    // multi byte character aware find_byte_index_of, args:
    //   str: string
    //   search: the string to search for in str
    //   search_l: is optional, if given must be search.$length(), do NOT use search.length
    //   last: boolean, optional too, if true returns the last index otherwise the first
    function find_byte_index_of(str, search, search_l, offset, last) {
      let search_f = (search.length === 0 || search.length === 1) ? search : first_char(search);
      let i = 0, col = [], l = 0, idx = -1, hit_boundary = (offset === 0) ? true : false;
      if (last) l = search_l || search.$length();
      for (const c of str) {
        if (col.length > 0) {
          for (const e of col) {
            if (e.l < l) { e.search = e.search + c; e.l++; }
            if (e.l === l) {
              if (e.search == search) { if (last) idx = e.index; else return e.index; }
              e.search = null;
            }
          }
          if (!col[0].search) col.shift();
        }
        if (!(!last && offset > 0 && i < offset)) {
          if (last && ((l < 2 && i > offset) || (i > offset + l))) {
            break;
          } else if (search_f == c) {
            if (search.length === 1) { if (last && i <= offset) idx = i; else return i; }
            else {
              if (l === 0) l = search_l || search.$length();
              if (l === 1) { if (last && i <= offset) idx = i; else return i; }
              else if (!(last && i > offset)) col.push({ index: i, search: c, l: 1 });
            }
          }
        }
        i += c.$bytesize();
        if (offset === i) hit_boundary = true;
      }
      if (!last && i < offset) return -1;
      if (last && offset > i) {
        if (search.length === 0) return i;
        return idx;
      }
      if ((!hit_boundary) && (idx > -1 || search.length === 0))
        #{raise IndexError, "offset #{`offset`} does not land on character boundary"};
      if (search.length === 0) return offset;
      return idx;
    }

    // UTF-16 aware cut_from_end, cuts characters from end
    //   str: the string to cut
    //   cut_l: the length, count of characters to cut
    function cut_from_end(str, cut_l) {
      let i = str.length - 1, curr_cp;
      for (; i >= 0; i--) {
        curr_cp = str.codePointAt(i);
        if (curr_cp >= 0xDC00 && curr_cp <= 0xDFFF) continue; // low surrogate, get the full code point
        cut_l--;
        if (cut_l === 0) break;
      }
      return str.slice(0, i);
    }

    function padding(padstr, width) {
      let result_l = 0,
          result = '',
          p_l = padstr.length,
          padstr_l = p_l === 1 ? p_l : padstr.$length();

      while (result_l < width) {
        result = result + padstr;
        result_l += padstr_l;
      }

      if (result_l === width) return result;
      if (p_l === padstr_l) return result.slice(0, width);
      return cut_from_end(result, result_l - width);
    }

    function starts_with_low_surrogate(str) {
      if (str.length === 0) return false;
      let cp = str.codePointAt(0);
      if (cp >= 0xDC00 && cp <= 0xDFFF) return true;
      return false;
    }

    function ends_with_high_surrogate(str) {
      if (str.length === 0) return false;
      let cp = str.codePointAt(str.length - 1);
      if (cp >= 0xD800 && cp <= 0xDBFF) return true;
      return false;
    }

    function starts_with(str, prefix) {
      return (str.length >= prefix.length && !ends_with_high_surrogate(prefix) && str.startsWith(prefix));
    }

    function ends_with(str, suffix) {
      return (str.length >= suffix.length && !starts_with_low_surrogate(suffix) && str.endsWith(suffix));
    }

    let GRAPHEME_SEGMENTER; // initialized on demand by #each_grapheme_cluster below using:

    function grapheme_segmenter() {
      if (!GRAPHEME_SEGMENTER) {
        // Leaving the locale parameter as undefined, indicating browsers default locale.
        // Depending on implementation quality and default locale, there is a chance,
        // that grapheme segmentation results differ.
        GRAPHEME_SEGMENTER = new Intl.Segmenter(undefined, { granularity: "grapheme" });
      }
      return GRAPHEME_SEGMENTER;
    }

    // The characters that continue the grapheme cluster before them: the marks
    // and the format characters (which include the prepend ones), the joiners
    // of Hangul jamo and of regional indicators, the pictographs joining with a
    // zero width joiner, and the few characters Intl.Segmenter segments like
    // marks without being a mark, a format character or a pictograph. A string
    // holding none of them has one grapheme cluster per character.
    /* eslint-disable-next-line no-misleading-character-class */
    const CLUSTER_JOINING = /[\p{M}\p{Nl}\p{Cf}\u0D4E\u0E33\u0EB3\uFF9E-\uFF9F\u1100-\u11FF\u{11000}-\u{11FFF}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}\uA960-\uA97C\uD7B0-\uD7FF]|\p{Extended_Pictographic}/u;

    // The grapheme clusters of a string, as plain JavaScript strings.
    function grapheme_clusters_of(string) {
      if (string.isWellFormed() && !CLUSTER_JOINING.test(string)) {
        // One cluster per character, with the CR LF pair kept together.
        const length = string.length, result = new Array(length);
        let i = 0, count = 0;
        while (i < length) {
          let end = i + 1;
          const code = string.charCodeAt(i);
          if (code >= 0xD800 && code <= 0xDBFF) end++;
          else if (code === 13 && string.charCodeAt(end) === 10) end++;
          result[count++] = string.slice(i, end);
          i = end;
        }
        return count === length ? result : result.slice(0, count);
      }
      const result = [];
      for (const cluster of grapheme_segmenter().segment(string)) result[result.length] = cluster.segment;
      return result;
    }

    function char_class_from_char_sets(sets) {
      // Escape the characters of a generated character class. Only the few
      // characters that are special inside a class need a backslash, and doing
      // it here keeps Regexp.escape, a Ruby method, out of the hot path.
      function escape_char_class(chars) {
        return chars.replace(/[\\^\-\]]/g, '\\$&');
      }

      function explode_sequences_in_character_set(set_s) {
        var result = [],
            i, len = set_s.length,
            curr_char,
            skip_next_dash,
            code_point_from,
            code_point_upto,
            code_point;
        for (i = 0; i < len; i++) {
          curr_char = set_s[i];
          if (curr_char === '-' && i > 0 && i < (len - 1) && !skip_next_dash) {
            code_point_from = set_s[i - 1].codePointAt(0);
            code_point_upto = set_s[i + 1].codePointAt(0);
            if (code_point_from > code_point_upto) {
              #{::Kernel.raise ::ArgumentError, "invalid range \"#{`code_point_from`}-#{`code_point_upto`}\" in string transliteration"}
            }
            for (code_point = code_point_from + 1; code_point < code_point_upto + 1; code_point++) {
              if (code_point >= 0xD800 && code_point <= 0xDFFF) code_point = 0xE000; // exclude surrogate range
              result.push(String.fromCodePoint(code_point));
            }
            skip_next_dash = true;
            i++;
          } else {
            skip_next_dash = (curr_char === '\\');
            result.push(curr_char);
          }
        }
        return result;
      }

      function intersection(setA, setB) {
        if (setA.length === 0) {
          return setB;
        }
        var result = [],
            i, len = setA.length,
            chr;
        for (i = 0; i < len; i++) {
          chr = setA[i];
          if (setB.indexOf(chr) !== -1) {
            result.push(chr);
          }
        }
        return result;
      }

      var i, len, set, set_s, neg, chr, tmp,
          pos_intersection = [],
          neg_intersection = [];

      for (i = 0, len = sets.length; i < len; i++) {
        set = $coerce_to(sets[i], Opal.String, 'to_str').valueOf();
        set_s = [];
        for (const c of set) {
          let cd = c.codePointAt(0);
          if (cd < 0xD800 || cd > 0xDFFF) set_s.push(c); // exclude surrogate range
        }
        neg = (set_s[0] === '^' && set_s.length > 1);
        set_s = explode_sequences_in_character_set(neg ? set_s.slice(1) : set_s);
        if (neg) {
          neg_intersection = intersection(neg_intersection, set_s);
        } else {
          pos_intersection = intersection(pos_intersection, set_s);
        }
      }

      if (pos_intersection.length > 0 && neg_intersection.length > 0) {
        tmp = [];
        for (i = 0, len = pos_intersection.length; i < len; i++) {
          chr = pos_intersection[i];
          if (neg_intersection.indexOf(chr) === -1) {
            tmp.push(chr);
          }
        }
        pos_intersection = tmp;
        neg_intersection = [];
      }

      if (pos_intersection.length > 0) {
        return '[' + escape_char_class(pos_intersection.join('')) + ']';
      }

      if (neg_intersection.length > 0) {
        return '[^' + escape_char_class(neg_intersection.join('')) + ']';
      }

      return null;
    }

    function slice_by_string(string, index, length) {
      if (length != null) #{::Kernel.raise ::TypeError};
      if (find_index_of(string, index) === -1) return nil;
      return index.toString();
    }

    function slice_by_regexp(string, index, length) {
      let match = string.match(index);
      if (match === null) {
        #{$~ = nil}
        return nil;
      }
      #{$~ = ::MatchData.new(`index`, `match`)}
      if (length == null) return match[0];
      length = $coerce_to(length, Opal.Integer, 'to_int');
      if (length < 0 && -length < match.length) {
        return match[length += match.length];
      }
      if (length >= 0 && length < match.length) {
        return match[length];
      }
      return nil;
    }

    function slice_by_index_neg(string, index, length) {
      // negative index, walk from the end of the string,
      if (index < -string.length || length < -string.length) return nil;
      let j = string.length - 1, i = -1, result = '', result_l = 0, curr_cp, idx_end, max;
      if (length != null) {
        if (length < 0) max = length;
        else if (length === Infinity || (index + length >= 0)) max = -1;
        else max = index + length - 1;
      }
      for (; j >= 0; j--) {
        curr_cp = string.codePointAt(j);
        if (curr_cp >= 0xDC00 && curr_cp <= 0xDFFF) continue; // low surrogate, get the full code point next
        if (length != null && i <= max) {
          if (!idx_end) idx_end = (curr_cp > 0xDFFF) ? j + 2 : j + 1;
          result_l++;
        }
        if (i === index) {
          if (length === 0 || index === length) return "";
          if (length === 1 || length == null) return String.fromCodePoint(curr_cp);
          break;
        }
        i--;
      }
      if (result_l > 0) {
        result = string.slice(j, idx_end);
        if (length < 0 && ((result_l + length) < 0)) return "";
        return result;
      }
      return nil;
    }

    function slice_by_index_zero(string, length) {
      // special conditions
      if (length === 0 || string.length === 0) return (length != null) ? "" : nil;
      if (length === 1 || length == null) return first_char(string);
      if (length === Infinity) return string.toString();
      // walk the string
      let i = 0, result = '';
      for (const c of string) {
        result = result + c;
        i++;
        if (i === length) break;
      }
      if (length < 0) {
        // if length is a negative index from a range, we walked to the end, so shorten the result
        if ((i + length) > 0) return cut_from_end(result, -length);
        else return "";
      }
      return result;
    }

    function slice_by_index_pos(string, index, length) {
      let i = 0, result_l = 0, result;
      for (const c of string) {
        if (i < index) {
          i++;
        } else if (i === index) {
          if (length === 1 || length == null) return c;
          if (length === 0) return "";
          result = c;
          i++; result_l++;
        } else if (i > index) {
          if (result_l < length || length < 0) {
            result = result + c;
            i++; result_l++;
          } else if (length > 0 && result_l >= length) break;
        }
      }
      if (result) {
        if (length < 0) {
          // if length is a negative index from a range, we walked to the end, so shorten the result
          if ((result_l + length) > 0) return cut_from_end(result, -length);
          else return "";
        }
        if (result_l > 0 && index <= i && length > 1) return result;
      }
      // special condition for ruby weirdness
      if (i === index && length != null) return "";
      return nil;
    }

    function slice(string, index, length) {
      if (index.$$is_string) return slice_by_string(string, index.valueOf(), length);
      if (index.$$is_regexp) return slice_by_regexp(string, index, length);

      if (index.$$is_range) {
        if (length) #{raise TypeError, 'length not allowed if range is given'};
        // This part sets index and length, basically converting string[2..3] range
        // to string[2, 1] index + length and letting the range get handled by the
        // index + length code below.
        //
        // For ranges, first index always is a index, possibly negative.
        // Length is either the length, if it can be determined by the indexes of the range,
        // or its a possibly negative index, because the exact string length is not known,
        // or Infinity, with Infinity indicating 'walk to end of string'.
        const range = index;
        const r_end = range.end === nil ? Infinity : $coerce_to(range.end, Opal.Integer, 'to_int');
        index = range.begin === nil ? 0 : $coerce_to(range.begin, Opal.Integer, 'to_int');

        if (((index > 0 && r_end > 0) || (index < 0 && r_end < 0)) && index > r_end) {
          length = 0;
        } else if (index === r_end) {
          length = range.excl ? 0 : 1;
        } else {
          const e = range.excl ? 0 : 1;
          if ((!range.excl && r_end === -1) || r_end === Infinity) length = Infinity;
          else if (index == 0 || (index > 0 && r_end < 0)) length = r_end === Infinity ? Infinity : (r_end + e);
          else if (index < 0 && r_end >= 0) length = 0;
          else if ((index < 0 && r_end < 0) || (index > 0 && r_end > 0)) {
            length = r_end === Infinity ? Infinity : (r_end - index + e);
            if (length < 0) length = 0;
          }
        }
      } else {
        index = $coerce_to(index, Opal.Integer, 'to_int');
        if (length != null) length = $coerce_to(length, Opal.Integer, 'to_int');
        if (length < 0) return nil;
      }

      if (index > MAX_STR_LEN) #{raise RangeError, 'index too large'};
      if (length !== Infinity && length > MAX_STR_LEN) #{raise RangeError, 'length too large'};
      if (index < 0) return slice_by_index_neg(string, index, length);
      if (index === 0) return slice_by_index_zero(string, length);
      return slice_by_index_pos(string, index, length);
    }

    function raise_if_not_stringish(obj) {
      if (obj === nil) #{raise TypeError, 'no implicit conversion of nil into String'};
      if (typeof obj === "number") #{raise TypeError, 'no implicit conversion of Integer into String'};
      if (obj === true || obj === false) #{raise TypeError, "no implicit conversion of #{`obj`} into String"};
    }

    function case_options_have_ascii(options, allow_fold) {
      let ascii = false, fold = false;
      if (options.length > 0) {
        for(const option of options) {
          if (option == "ascii") ascii = true;
          else if (options == "fold") fold = true;
          else #{raise ArgumentError, "unknown option :#{`option`}"}
        }
        if (!allow_fold) {
          if (fold && ascii) #{raise ArgumentError, 'too many options'};
          if (fold) #{raise ArgumentError, ':fold not allowed'};
        }
      }
      return ascii;
    }
  }

  # Force strict mode to suppress autoboxing of `this`
  %x{
    (function() {
      'use strict';
      #{
        def __id__
          %x{
            if (typeof self === 'object') {
              return #{super}
            }
            if (string_id_map.has(self)) {
              return string_id_map.get(self);
            }
            var id = Opal.uid();
            string_id_map.set(self, id);
            return id;
          }
        end

        def hash
          %x{
            var hash = $opal32_init(), i, length = self.length;
            hash = $opal32_add(hash, 0x5);
            hash = $opal32_add(hash, length);
            for (i = 0; i < length; i++) {
              hash = $opal32_add(hash, self.charCodeAt(i));
            }
            return hash;
          }
        end
      }
    })();
  }

  def self.try_convert(what)
    `$coerce_to_or_nil(what, Opal.String, "to_str")`
  end

  def self.new(*args)
    %x{
      var str = args[0] || "";
      var opts = args[args.length-1];
      str = $coerce_to(str, Opal.String, 'to_str');
      if (self.$$constructor === String) {
        str = $str(str);
      } else {
        str = new self.$$constructor(str);
      }
      if (opts && opts.$$is_hash) {
        if (opts.has('encoding')) str = str.$force_encoding(opts.get('encoding'));
      }
      if (!str.$initialize.$$pristine) #{`str`.initialize(*args)};
      return str;
    }
  end

  # Our initialize method does nothing, the string value setup is being
  # done by String.new. Therefore not all kinds of subclassing will work.
  # As a rule of thumb, when subclassing String, either make sure to override
  # .new or make sure that the first argument given to a constructor is
  # a string we want our subclass-string to hold.
  def initialize(str = undefined, encoding: nil, capacity: nil)
  end

  def %(data)
    if ::Array === data
      format(self, *data)
    elsif data.respond_to?(:to_ary)
      ary = `$coerce_to_or_nil(data, Opal.Array, "to_ary")`
      ary = [data] if ary.nil?
      format(self, *ary)
    else
      format(self, data)
    end
  end

  def *(count)
    %x{
      count = $coerce_to(count, Opal.Integer, 'to_int');

      if (count < 0) {
        #{::Kernel.raise ::ArgumentError, 'negative argument'}
      }

      if (count === 0) {
        return '';
      }

      var result = '',
          string = self.valueOf();

      // All credit for the bit-twiddling magic code below goes to Mozilla
      // polyfill implementation of String.prototype.repeat() posted here:
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/repeat

      if (string.length * count >= MAX_STR_LEN) {
        #{::Kernel.raise ::RangeError, 'multiply count must not overflow maximum string size'}
      }

      for (;;) {
        if ((count & 1) === 1) {
          result = result + string;
        }
        count >>>= 1;
        if (count === 0) {
          break;
        }
        string = string + string;
      }

      return result;
    }
  end

  def +(other)
    other = `$coerce_to(#{other}, Opal.String, 'to_str')`
    %x{
      if (other.length === 0 && self.$$class === Opal.String) return self;
      if (self.length === 0 && other.$$class === Opal.String) return other;
      return $str(self.valueOf() + other.valueOf(), self.encoding);
    }
  end

  def +@
    frozen? ? dup : self
  end

  def -@
    %x{
      if (typeof self === 'string' || self.$$frozen) return self;
      return self.$dup().$freeze();
    }
  end

  # << - not supported, mutates string

  def <=>(other)
    if other.respond_to? :to_str
      %x{
        other = other.$to_str().valueOf();
        let s = self.valueOf();
        return s > other ? 1 : (s < other ? -1 : 0);
      }
    else
      %x{
        var cmp = #{other <=> self};

        if (cmp === nil) {
          return nil;
        }
        else {
          return cmp > 0 ? -1 : (cmp < 0 ? 1 : 0);
        }
      }
    end
  end

  def ==(other)
    %x{
      if (other.$$is_string) {
        return self.toString() === other.toString();
      }
      if ($respond_to(other, '$to_str')) {
        return #{other == self};
      }
      return false;
    }
  end

  alias === ==

  def =~(other)
    %x{
      if (other.$$is_string) {
        #{::Kernel.raise ::TypeError, 'type mismatch: String given'};
      }

      return #{other =~ self};
    }
  end

  def [](index, length = undefined)
    result = `slice(self.valueOf(), index, length)`
    if result
      %x{
        if (self.encoding === Opal.Encoding?.UTF_8) return result;
        return $str(result, self.encoding);
      }
    end
    nil
  end

  # []= - not supported, mutates string
  # append_as_bytes - not supported, mutates string

  def ascii_only?
    # non-ASCII-compatible encoding must return false
    %x{
      if (!self.encoding?.ascii) return false;
      return /^[\x00-\x7F]*$/.test(self.valueOf());
    }
  end

  def b
    %x{
     let b_enc = self.binary_encoding,
        s = $str(self, 'BINARY');
      s.binary_encoding = b_enc;
      return s;
    }
  end

  def byteindex(search, offset = 0)
    %x{
      let index, match, regex;

      if (offset == nil || offset == null) {
        offset = 0;
      } else {
        offset = $coerce_to(offset, Opal.Integer, 'to_int');
        if (offset < 0) {
          offset += self.$bytesize();
          if (offset < 0) return nil;
        }
      }

      raise_if_not_stringish(search);

      if (search.$$is_regexp) {
        let str, b_size;
        if (offset > 0) {
          // because we cannot do binary RegExp, we byteslice self from offset
          // then exec the regexp on the remaining string, getting the
          // char index, and then measure the bytesize until the char index
          b_size = self.$bytesize();
          if (offset > b_size) return nil;
          str = self.$byteslice(offset, b_size - offset);
        }
        else str = self;
        regex = $global_regexp(search);
        match = regex.exec(str);
        if (match === null) {
          #{$~ = nil};
          return nil;
        }
        #{$~ = ::MatchData.new(`regex`, `match`)};
        index = match.index;
        if (index === 0) return offset;
        return offset + #{binary_encoding.bytesize(`str`, `index - 1`)};
      }
      search = $coerce_to(search, Opal.String, 'to_str').valueOf();

      // A search string at a positive byte offset on a character boundary is
      // found with indexOf, then the characters before it are measured. The
      // encoding converts the byte offset to a character index and back.
      if (search.length > 0 && offset >= 0) {
        const string = self.valueOf(), encoding = self.binary_encoding;
        const char_index = encoding.$char_index(string, offset);
        if (char_index !== -1) {
          if (char_index === -2) return nil;
          let found = string.indexOf(search, char_index);
          while (found !== -1 && !starts_a_character(string, found)) found = string.indexOf(search, found + 1);
          if (found !== -1) return encoding.$byte_index(string, found);
          return nil;
        }
      }

      index = find_byte_index_of(self.valueOf(), search, search.$length(), offset, false);
      if (index === -1) return nil;
      return index;
    }
  end

  def byterindex(search, offset = undefined)
    %x{
      let index, match, regex, _m;

      if (offset == undefined) {
        offset = self.$bytesize();
      } else {
        offset = $coerce_to(offset, Opal.Integer, 'to_int');
        if (offset < 0) {
          offset += self.$bytesize();
          if (offset < 0) return nil;
        }
      }

      raise_if_not_stringish(search);

      if (search.$$is_regexp) {
        let br_idx, b_length = self.$bytesize();
        if (offset < b_length)
          br_idx = self.$byteslice(0, offset + 1).length - 1;
        match = null;
        regex = $global_regexp(search);
        while (true) {
          _m = regex.exec(self);
          if (_m === null || _m.index > br_idx) break;
          match = _m;
          regex.lastIndex = match.index + 1;
        }
        if (match === null) {
          #{$~ = nil}
          return nil;
        }
        #{$~ = ::MatchData.new `regex`, `match`};
        index = match.index;
        if (index === 0) return 0;
        return #{binary_encoding.bytesize(`self`, `index - 1`)};
      }
      search = $coerce_to(search, Opal.String, 'to_str').valueOf();

      // The same lookup as byteindex, from the byte offset backwards.
      if (search.length > 0 && offset >= 0) {
        const string = self.valueOf(), encoding = self.binary_encoding;
        let char_limit = encoding.$char_index(string, offset);
        if (char_limit === -2) char_limit = string.length; // an offset past the end is its end
        if (char_limit !== -1) {
          let found = string.lastIndexOf(search, char_limit);
          while (found !== -1 && !starts_a_character(string, found)) found = string.lastIndexOf(search, found - 1);
          if (found !== -1) return encoding.$byte_index(string, found);
          return nil;
        }
      }

      index = find_byte_index_of(self.valueOf(), search, search.$length(), offset, true);
      if (index === -1) return nil;
      return index;
    }
  end

  def bytes(&block)
    return binary_encoding.bytes(self) unless block_given?
    binary_encoding.each_byte(self, &block)
    self
  end

  def bytesize
    binary_encoding.bytesize(self, `self.length`)
  end

  def byteslice(index, length = undefined)
    %x{
      if (index.$$is_range) {
        if (length) #{raise TypeError, 'length not allowed if range is given'};
        // This part sets index and length, basically converting self[2..3] range
        // to self[2, 1] index + length and letting the range get handled by the
        // index + length code below.
        const range = index;
        const r_end = index.end === nil ? Infinity : $coerce_to(range.end, Opal.Integer, 'to_int');
        index = range.begin === nil ? 0 : $coerce_to(range.begin, Opal.Integer, 'to_int');

        if (((index > 0 && r_end > 0) || (index < 0 && r_end <0)) && index > r_end) {
          length = 0;
        } else if (index === r_end) {
          length = range.excl ? 0 : 1;
        } else {
          const e = range.excl ? 0 : 1;
          if ((!range.excl && r_end === -1) || r_end === Infinity) length = Infinity;
          else if (index == 0 || (index > 0 && r_end < 0)) length = r_end === Infinity ? Infinity : (r_end + e);
          else if (index < 0 && r_end >= 0) length = 0;
          else if ((index < 0 && r_end < 0) || (index > 0 && r_end > 0)) {
            length = r_end === Infinity ? Infinity : (r_end - index + e);
            if (length < 0) length = 0;
          }
        }
      } else {
        index = $coerce_to(index, Opal.Integer, 'to_int');
        if (length != null) length = $coerce_to(length, Opal.Integer, 'to_int');
        if (length < 0) return nil;
        if (length == null || length === nil) {
          if (self.length === 0) return nil; // no match possible
          length = 1;
        }
      }
      if (index > MAX_STR_LEN) #{raise RangeError, 'index too large'};
      if (length !== Infinity && length > MAX_STR_LEN) #{raise RangeError, 'length too large'};
    }
    result = binary_encoding.byteslice(self, index, length)
    if result
      %x{
        if (self.encoding === Opal.Encoding?.UTF_8) return result;
        return $str(result, self.encoding);
      }
    end
  end

  # bytesplice - not supported, mutates string

  def capitalize(*options)
    %x{
      if (self.length === 0) return '';
      let first = first_char(self);
      if (case_options_have_ascii(options) && first.codePointAt(0) > 127) return self;
      let first_upper = first.toUpperCase();
      if (first_upper.length > first.length && first_upper.codePointAt(0) < 128) {
        first_upper = first_upper[0] + first_upper[1].toLowerCase();
      }
      let capz = first_upper + self.substring(first.length).toLowerCase();
      return $str(capz, self.encoding);
    }
  end

  # capitalize! - not supported, mutates string

  def casecmp(other)
    return nil unless other.respond_to?(:to_str)
    other = `$coerce_to(other, Opal.String, "to_str")`
    %x{
      // The ASCII case folding of downcase(:ascii), compared character by
      // character instead of building the two downcased strings.
      const a = self.valueOf(), b = other.valueOf();
      let i = 0, j = 0, ca, cb;
      while (i < a.length && j < b.length) {
        ca = a.codePointAt(i);
        cb = b.codePointAt(j);
        if (ca >= 0x41 && ca <= 0x5A) ca += 32;
        if (cb >= 0x41 && cb <= 0x5A) cb += 32;
        if (ca !== cb) return ca < cb ? -1 : 1;
        i += ca > 0xFFFF ? 2 : 1;
        j += cb > 0xFFFF ? 2 : 1;
      }
      if (i < a.length) return 1;
      if (j < b.length) return -1;
      return 0;
    }
  end

  def casecmp?(other)
    return nil unless other.respond_to?(:to_str)
    other = `$coerce_to(other, Opal.String, 'to_str').valueOf()`
    c = downcase(:fold) <=> other.downcase(:fold)
    return true if c == 0
    return nil if c.nil?
    false
  end

  def center(width, padstr = ' ')
    width  = `$coerce_to(#{width}, Opal.Integer, 'to_int')`
    padstr = `$coerce_to(#{padstr}, Opal.String, 'to_str').valueOf()`

    ::Kernel.raise ::ArgumentError, 'zero width padding' if padstr.empty?

    l = length

    return self if width <= l

    %x{
      return $str(padding(padstr, Math.floor((width + l) / 2) - l) +
                  self.valueOf() +
                  padding(padstr, Math.ceil((width + l) / 2) - l),
                  self.encoding);
    }
  end

  def chars(&block)
    return each_char(&block) if block_given?
    %x{
      // Building the array here avoids the enumerator of each_char.to_a, and
      // the encoding is resolved once for all of the pieces. Array#push is a
      // Ruby method, so the array is filled by index.
      const encoding = resolved_encoding(self);
      if (!encoding) return #{each_char.to_a};
      const string = self.valueOf(), length = string.length, result = new Array(length);
      let count = 0;
      if (!has_surrogates(string)) {
        for (let i = 0; i < length; i++) result[count++] = box_string(string[i], encoding);
      } else {
        for (let i = 0; i < length; i++) {
          let end = i + 1;
          const code = string.charCodeAt(i);
          if (code >= 0xD800 && code <= 0xDBFF) {
            const next = string.charCodeAt(end);
            if (next >= 0xDC00 && next <= 0xDFFF) end++;
          }
          result[count++] = box_string(string.slice(i, end), encoding);
          i = end - 1;
        }
      }
      if (count !== length) result.length = count;
      return result;
    }
  end

  def chomp(separator = $/)
    return self if `separator === nil || self.length === 0`

    separator = `$coerce_to_or_raise(separator, Opal.String, "to_str").valueOf()`

    %x{
      var result;

      if (separator == "\n") {
        result = self.valueOf().replace(/\r?\n?$/, '');
      }
      else if (separator.length === 0) {
        result = self.valueOf().replace(/(\r?\n)+$/, '');
      }
      else if (self.length >= separator.length &&
               !starts_with_low_surrogate(separator) &&
               !ends_with_high_surrogate(separator)) {

        // compare tail with separator
        var s = self.valueOf();
        if (s.substring(s.length - separator.length) == separator) {
          result = s.substring(0, s.length - separator.length);
        }
      }

      if (result != null) {
        return $str(result, self.encoding);
      }
    }

    self
  end

  # chomp! - not supported, mutates string

  def chop
    %x{
      var s = self.valueOf(), length = s.length, result;

      if (length <= 1) {
        result = "";
      } else if (s.charAt(length - 1) === "\n" && s.charAt(length - 2) === "\r") {
        result = s.substring(0, length - 2);
      } else {
        let cut = s.codePointAt(length - 2) > 0xFFFF ? 2 : 1;
        result = s.substring(0, length - cut);
      }
      return $str(result, self.encoding);
    }
  end

  # chop! - not supported, mutates string

  def chr
    %x{
      let result = self.length > 0 ? first_char(self.valueOf()) : '';
      return $str(result, self.encoding);
    }
  end

  # clear - not supported, mutates string

  %x{
    (function() {
      "use strict";
      #{
        def clone(freeze: nil)
          unless freeze.nil? || freeze == true || freeze == false
            raise ArgumentError, "unexpected value for freeze: #{freeze.class}"
          end

          copy = `$str(self)`
          copy.copy_singleton_methods(self)
          copy.initialize_clone(self, freeze: freeze)

          if freeze == true
            `if (!copy.$$frozen) copy.$$frozen = true;`
          elsif freeze.nil?
            `if (typeof self === "string" || self.$$frozen) copy.$$frozen = true;`
          end

          copy
        end
      }
    })();
  }

  def codepoints(&block)
    # If a block is given, which is a deprecated form, works the same as each_codepoint.
    return each_codepoint(&block) if block_given?
    %x{
      const string = self.valueOf(), length = string.length;
      if (self.encoding === utf8_encoding() && string.isWellFormed()) {
        // Array#push is a Ruby method, so the array is filled by index.
        const result = new Array(length);
        let count = 0;
        for (let i = 0; i < length; i++) {
          let code = string.charCodeAt(i);
          if (code >= 0xD800 && code <= 0xDBFF) { code = string.codePointAt(i); i++; }
          result[count++] = code;
        }
        if (count !== length) result.length = count;
        return result;
      }
      return #{each_codepoint.to_a};
    }
  end

  # concat - not supported, mutates string

  def count(*sets)
    %x{
      if (sets.length === 0) {
        #{::Kernel.raise ::ArgumentError, 'ArgumentError: wrong number of arguments (0 for 1+)'}
      }
      let char_class = char_class_from_char_sets(sets);
      if (char_class === null) return 0;

      // The character class is built above out of escaped characters, so it is
      // already a valid JavaScript pattern, and it always matches a whole
      // character, so its matches are the characters of the sets.
      const string = self.valueOf();
      const regexp = new RegExp(char_class, 'gu');
      let count = 0;
      while (regexp.exec(string) !== null) { count++; }
      return count;
    }
  end

  # crypt - not implemented, crypt(3) missing
  # dedup - not implemented

  def delete(*sets)
    %x{
      if (sets.length === 0) {
        #{::Kernel.raise ::ArgumentError, 'ArgumentError: wrong number of arguments (0 for 1+)'}
      }
      let char_class = char_class_from_char_sets(sets);
      if (char_class === null) return self;

      // The pieces between the matches are joined, which costs less than
      // letting the regular expression build the whole replaced string.
      const string = self.valueOf(), regexp = new RegExp(char_class, 'gu');
      let result = '', start = 0, match;
      while ((match = regexp.exec(string)) !== null) {
        result += string.slice(start, match.index);
        start = match.index + match[0].length;
      }
      return box_string(result + string.slice(start), self.encoding);
    }
  end

  # delete! - not supported, mutates string

  def delete_prefix(prefix)
    %x{
      if (!prefix.$$is_string) {
        prefix = $coerce_to(prefix, Opal.String, 'to_str');
      }
      let s = self.valueOf();
      if (starts_with(s, prefix)) {
        return $str(s.slice(prefix.length), self.encoding);
      }
      return self;
    }
  end

  # delete_prefix! - not supported, mutates string

  def delete_suffix(suffix)
    %x{
      if (!suffix.$$is_string) {
        suffix = $coerce_to(suffix, Opal.String, 'to_str');
      }
      if (ends_with(self, suffix)) {
        return $str(self.slice(0, self.length - suffix.length), self.encoding);
      }
      return self;
    }
  end

  # delete_suffix! - not supported, mutates string

  def downcase(*options)
    %x{
      let str = self.valueOf();

      if (options.length > 0){
        if (case_options_have_ascii(options, true)) {
          str = str.replace(/[A-Z]+/g, (match)=>{ return match.toLowerCase(); });
        } else if (options.includes('fold')) {
          str = str.toUpperCase(); // ß -> SS
          str = str.toLowerCase(); // SS -> ss
        }
      } else {
        str = str.toLowerCase();
      }
      return $str(str, self.encoding);
    }
  end

  # downcase! - not supported, mutates string

  def dump
    %x{
      const string = self.valueOf();
      // The printable ASCII characters that need no escaping and are not the
      // # of a Ruby interpolation, the common case.
      let plain = true;
      for (let i = 0, length = string.length; i < length; i++) {
        const code = string.charCodeAt(i);
        if (code < 0x20 || code > 0x7e || code === 0x22 || code === 0x5c ||
            code === 0x23 || code === 0x24 || code === 0x40 || code === 0x7b) {
          plain = false;
          break;
        }
      }
      if (plain) return box_string('"' + string + '"', self.encoding);

      let prev_chr = '',
          encoding = self.encoding,
          escaped = string.replace(dump_escapable, function (chr) {
            if (dump_meta[chr]) return dump_meta[chr];
            const char_code = chr.charCodeAt(0);
            if (encoding['$dump_byte_escape?'](char_code)) {
              return '\\x' + ('00' + char_code.toString(16).toUpperCase()).slice(-2);
            } else if (char_code >= 0xD800 && char_code <= 0xDBFF) {
              prev_chr = chr;
              return '';
            } else if (char_code >= 0xDC00 && char_code <= 0xDFFF) {
              return '\\u{' + (prev_chr + chr).codePointAt(0).toString(16).toUpperCase() + '}';
            } else {
              return '\\u' + ('0000' + char_code.toString(16).toUpperCase()).slice(-4);
            }
          });
      return box_string('"' + escaped.replace(dump_interpolation, '\\$&') + '"', self.encoding);
    }
  end

  def dup
    copy = `$str(self)`
    copy.initialize_dup(self)
    copy
  end

  def each_byte(&block)
    return enum_for(:each_byte) { bytesize } unless block_given?
    binary_encoding.each_byte(self, &block)
    self
  end

  def each_char(&block)
    return enum_for(:each_char) { size } unless block_given?
    %x{
      const encoding = resolved_encoding(self), string = self.valueOf();
      if (encoding && !has_surrogates(string)) {
        for (let i = 0, length = string.length; i < length; i++) {
          #{yield `box_string(string[i], encoding)`};
        }
      } else if (encoding) {
        for (const c of string) { #{yield `box_string(c, encoding)`}; }
      } else {
        for (const c of string) { #{yield `$str(c, self.encoding)`}; }
      }
    }
    self
  end

  def each_codepoint(&block)
    return enum_for(:each_codepoint) { length } unless block_given?
    %x{
      const string = self.valueOf();
      if (self.encoding === utf8_encoding() && string.isWellFormed()) {
        for (let i = 0, length = string.length; i < length; i++) {
          let code = string.charCodeAt(i);
          if (code >= 0xD800 && code <= 0xDBFF) { code = string.codePointAt(i); i++; }
          #{yield `code`};
        }
      } else {
        #{raise ArgumentError, 'string has invalid encoding' unless valid_encoding?}
        for (const c of string) { #{yield `c.codePointAt(0)`}; }
      }
    }
    self
  end

  def each_grapheme_cluster(&block)
    return enum_for(:each_grapheme_cluster) { length } unless block_given?

    %x{
      const string = self.valueOf(), encoding = self.encoding;
      if (string.isWellFormed() && !CLUSTER_JOINING.test(string)) {
        // One cluster per character, with the CR LF pair kept together.
        let i = 0;
        const length = string.length;
        while (i < length) {
          let end = i + 1;
          const code = string.charCodeAt(i);
          if (code >= 0xD800 && code <= 0xDBFF) end++;
          else if (code === 13 && string.charCodeAt(end) === 10) end++;
          #{yield `box_string(string.slice(i, end), encoding)`};
          i = end;
        }
        return self;
      }
      for (const cluster of grapheme_segmenter().segment(string)) #{yield `box_string(cluster.segment, encoding)`};
    }

    self
  end

  def each_line(separator = $/, chomp: false, &block)
    return enum_for :each_line, separator, chomp: chomp unless block_given?

    %x{
      if (separator === nil) {
        Opal.yield1(block, self);

        return self;
      }

      separator = $coerce_to(separator, Opal.String, 'to_str');

      var a, i, n, length, chomped, trailing, splitted, value;

      if (separator.length === 1 && (separator.charCodeAt(0) < 0xD800 || separator.charCodeAt(0) > 0xDFFF)) {
        // The common case: a one character separator, walked with indexOf
        // instead of split, which first builds the array of the pieces.
        const string = self.valueOf(), separator_string = separator.valueOf();
        const separator_code = separator_string.charCodeAt(0);
        let start = 0, at;
        while ((at = string.indexOf(separator_string, start)) !== -1) {
          // chomp takes "\r\n" as the line end when the separator is "\n"
          let end = at;
          if (!chomp) end = at + 1;
          else if (separator_code === 10 && at > start && string.charCodeAt(at - 1) === 13) end = at - 1;
          Opal.yield1(block, box_string(string.slice(start, end), self.encoding));
          start = at + 1;
        }
        if (start < string.length) {
          Opal.yield1(block, box_string(string.slice(start), self.encoding));
        }
        return self;
      }

      if (self.length === 0) return self;

      if (separator.length === 0) {
        for (a = self.split(/((?:\r?\n){2})(?:(?:\r?\n)*)/), i = 0, n = a.length; i < n; i += 2) {
          if (a[i] || a[i + 1]) {
            value = (a[i] || "") + (a[i + 1] || "");
            if (chomp) {
              value = #{`value`.chomp("\n")};
            }
            Opal.yield1(block, $str(value, self.encoding));
          }
        }

        return self;
      }

      chomped  = #{chomp(separator)};
      trailing = self.length != chomped.length;

      if (starts_with_low_surrogate(separator) || ends_with_high_surrogate(separator)) {
        splitted = [chomped];
      } else {
        splitted = chomped.split(separator);
      }

      for (i = 0, length = splitted.length; i < length; i++) {
        value = splitted[i];
        if (i < length - 1 || trailing) {
          value = value + separator;
        }
        if (chomp) {
          value = #{`value`.chomp(separator)};
        }
        Opal.yield1(block, $str(value, self.encoding));
      }
    }

    self
  end

  def empty?
    `self.length === 0`
  end

  def encode(encoding)
    `$str(self, encoding)`
  end

  # encode! - not supported, mutates string
  # encoding - read only accessor, see above

  def end_with?(*suffixes)
    %x{
      for (let i = 0, suffix, length = suffixes.length; i < length; i++) {
        suffix = $coerce_to(suffixes[i], Opal.String, 'to_str').valueOf();
        if (ends_with(self.valueOf(), suffix)) return true;
      }
    }

    false
  end

  alias eql? ==
  alias equal? ===

  def force_encoding(encoding)
    `if (encoding === self.encoding) return self;`
    unless encoding.is_a?(::Encoding)
      %x{
        encoding = $coerce_to_or_raise(encoding, Opal.String, "to_str");
        encoding = #{::Encoding.find(encoding)};
        if (encoding === self.encoding) return self;
      }
    end
    `Opal.set_encoding(self, encoding.name)`
  end

  %x{
    (function() {
      "use strict";
      #{
        def freeze
          %x{
            if (typeof self === 'string') { return self; }
            $prop(self, "$$frozen", true);
            return self;
          }
        end

        def frozen?
          `typeof self === 'string' || self.$$frozen === true`
        end
      }
    })();
  }

  def getbyte(idx)
    idx = `$coerce_to_or_raise(#{idx}, Opal.Integer, "to_int")`
    `self.binary_encoding.$byte_at(self, idx)`
  end

  def grapheme_clusters(&block)
    return each_grapheme_cluster(&block) if block_given?

    %x{
      const encoding = self.encoding, clusters = grapheme_clusters_of(self);
      const result = new Array(clusters.length);
      for (let i = 0, length = clusters.length; i < length; i++) result[i] = box_string(clusters[i], encoding);
      return result;
    }
  end

  def gsub(pattern, replacement = undefined, &block)
    %x{
      if (replacement === undefined && block === nil) {
        return #{enum_for :gsub, pattern};
      }

      var result = '', match_data = nil, last_match = null, index = 0, match, _replacement;

      if (pattern.$$is_regexp) {
        pattern = $global_regexp(pattern);
      } else {
        pattern = regexp_for_pattern($coerce_to(pattern, Opal.String, 'to_str'), true);
      }

      // The escapes of the replacement are resolved for every match, but a
      // replacement holding none of them is used as it is.
      var plain_replacement = (replacement !== undefined && replacement.$$is_string &&
        !/[\\&`'+0-9]/.test(replacement)) ? replacement : null;

      var lastIndex, s = self.valueOf();
      while (true) {
        match = pattern.exec(s);

        if (match === null) {
          result = result + s.slice(index);
          break;
        }

        if (replacement === undefined) {
          // The block sees $~ of every match, so every one becomes a MatchData.
          match_data = #{::MatchData.new `pattern`, `match`};
        } else {
          last_match = match;
        }

        if (replacement === undefined) {
          lastIndex = pattern.lastIndex;
          _replacement = block(match[0]);
          pattern.lastIndex = lastIndex; // save and restore lastIndex
        }
        else if (plain_replacement !== null) {
          _replacement = plain_replacement;
        }
        else if (replacement.$$is_hash) {
          _replacement = #{`replacement`[`match[0]`].to_s};
        }
        else {
          if (!replacement.$$is_string) {
            replacement = $coerce_to(replacement, Opal.String, 'to_str');
          }
          _replacement = replacement.replace(/([\\]+)([0-9+&`'])/g, function (original, slashes, command) {
            if (slashes.length % 2 === 0) {
              return original;
            }
            switch (command) {
            case "+":
              for (var i = match.length - 1; i > 0; i--) {
                if (match[i] !== undefined) {
                  return slashes.slice(1) + match[i];
                }
              }
              return '';
            case "&": return slashes.slice(1) + match[0];
            case "`": return slashes.slice(1) + s.slice(0, match.index);
            case "'": return slashes.slice(1) + s.slice(match.index + match[0].length);
            default:  return slashes.slice(1) + (match[command] || '');
            }
          }).replace(/\\\\/g, '\\');
        }

        if (pattern.lastIndex === match.index) {
          result = result + (s.slice(index, match.index) + _replacement + (s[match.index] || ""));
          pattern.lastIndex += 1;
        }
        else {
          result = result + (s.slice(index, match.index) + _replacement)
        }
        index = pattern.lastIndex;
      }

      if (match_data !== nil) {
        #{$~ = `match_data`}
      }
      else if (last_match !== null) { #{$~ = ::MatchData.new(`pattern`, `last_match`)} }
      else { #{$~ = nil} }
      return result;
    }
  end

  # gsub! - not supported, mutates string

  def hex
    to_i 16
  end

  def include?(other)
    %x{
      if (!other.$$is_string) {
        other = $coerce_to(other, Opal.String, 'to_str');
      }
      if (other.length === 0) return true;
      return find_index_of(self.valueOf(), other.valueOf()) !== -1;
    }
  end

  def index(search, offset = undefined)
    %x{
      let index;

      if (offset === undefined) offset = 0;
      else offset = $coerce_to(offset, Opal.Integer, 'to_int');

      if (search.$$is_regexp) {
        let regex = $global_regexp(search), str = self.valueOf(), match;
        if (offset < 0) {
          offset += str.$length();
          if (offset < 0) return nil;
        }
        while (true) {
          match = regex.exec(str);
          if (match === null) {
            #{$~ = nil};
            return nil;
          }
          if (match.index >= offset) {
            #{$~ = ::MatchData.new(`regex`, `match`)}
            return match.index;
          }
          regex.lastIndex = match.index + 1;
        }
      } else {
        search = $coerce_to(search, Opal.String, 'to_str').valueOf();
        if (search.length === 0) {
          let l = self.$length();
          if (offset > l) return nil;
          if (offset < 0) {
            offset += l;
            if (offset < 0) return nil;
          }
          return offset;
        } else {
          let str = self.valueOf();
          if (offset < 0) {
            offset += str.$length();
            if (offset < 0) return nil;
          }
          if (offset > 0) {
            str = str["$[]"](offset, Infinity);
            if (str.length === 0 || str === nil) return nil;
          }
          index = find_index_of(str, search);
          if (index === -1) return nil;
          return index + offset;
        }
      }

      return nil;
    }
  end

  def initialize_copy(other)
    `self.encoding = other.encoding`
    `self.binary_encoding = other.binary_encoding`
  end

  # insert - not supported, mutates string

  def inspect
    %x{
      /* eslint-disable no-misleading-character-class */
      let escapable = /[\\\"\x00-\x1f\x7F-\xFF\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
          meta = {
            '\u0007': '\\a',
            '\u001b': '\\e',
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '\v': '\\v',
            '"' : '\\"',
            '\\': '\\\\'
          },
          char_code,
          is_binary = self.encoding == Opal.Encoding?.ASCII_8BIT || self.binary_encoding == Opal.Encoding?.ASCII_8BIT,
          external_is_utf8 = Opal.Encoding.default_external == Opal.Encoding.UTF_8,
          escaped = self.replace(escapable, function (chr) {
            if (meta[chr]) return meta[chr];
            char_code = chr.charCodeAt(0);
            if (is_binary && char_code <= 0xff) {
              return '\\x' + ('00' + char_code.toString(16).toUpperCase()).slice(-2);
            } else if (external_is_utf8 && char_code >= 0xA0 && char_code <= 0xff) {
              return chr;
            } else {
              return '\\u' + ('0000' + char_code.toString(16).toUpperCase()).slice(-4);
            }
          });
      // A string in an encoding other than UTF-8 (the result's encoding)
      // shows its other non-ASCII characters escaped, as in CRuby: \\u00E9
      // (\\u{1F600}) in UTF-16/UTF-32, else \\x{93FA} (its bytes).
      let encoding = self.encoding, name = encoding.name;
      if (!is_binary && name !== "UTF-8" && !encoding["$dummy?"]()) {
        let unicode = name.startsWith("UTF-16") || name.startsWith("UTF-32");
        escaped = escaped.replace(/[^\x00-\x7F]/gu, function (chr) {
          let cp = chr.codePointAt(0);
          if (unicode) return cp > 0xffff ? '\\u{' + cp.toString(16).toUpperCase() + '}' : '\\u' + ('0000' + cp.toString(16).toUpperCase()).slice(-4);
          return '\\x{' + $str(chr, encoding).$bytes().map(function (b) { return ('00' + b.toString(16).toUpperCase()).slice(-2); }).join('') + '}';
        });
      }
      return '"' + escaped.replace(/\#[\$\@\{]/g, '\\$&') + '"';
      /* eslint-enable no-misleading-character-class */
    }
  end

  def intern
    # specs expect the exception to have the invalid character: "(invalid symbol in encoding UTF-8 :"\xC3")"
    #   raise EncodingError, "invalid symbol in encoding #{encoding.name}" unless valid_encoding?
    #   return `self.toString().$force_encoding(Opal.Encoding.US_ASCII)` if ascii_only?
    # but lets keep things fast until we have real Symbols
    `self.valueOf()` # .$force_encoding(self.encoding)
  end

  def length
    %x{
      const string = self.valueOf();
      if (!has_surrogates(string)) return string.length;
      let length = 0;
      for (const _c of string) { length++; }
      return length;
    }
  end

  def lines(separator = $/, chomp: false, &block)
    return each_line(separator, chomp: chomp, &block) if block_given?

    %x{
      if (separator === nil) return [self];

      separator = $coerce_to(separator, Opal.String, 'to_str');

      const string = self.valueOf(), sep = separator.valueOf();

      // The paragraph splitting and the surrogate edge cases stay with each_line.
      if (sep.length === 0 || starts_with_low_surrogate(sep) || ends_with_high_surrogate(sep))
        return #{each_line(`separator`, chomp: chomp).to_a};

      const encoding = self.encoding, result = [];
      let start = 0, index, value;
      while ((index = string.indexOf(sep, start)) !== -1) {
        value = string.slice(start, index + sep.length);
        if (chomp) value = #{`value`.chomp(`separator`)};
        result.push(box_string(value, encoding));
        start = index + sep.length;
      }
      if (start < string.length) result.push(box_string(string.slice(start), encoding));
      return result;
    }
  end

  def ljust(width, padstr = ' ')
    width  = `$coerce_to(#{width}, Opal.Integer, 'to_int')`
    padstr = `$coerce_to(#{padstr}, Opal.String, 'to_str').valueOf()`

    if padstr.empty?
      ::Kernel.raise ::ArgumentError, 'zero width padding'
    end

    l = size

    return self if width <= l

    `$str(self.valueOf() + padding(padstr, width - l), self.encoding)`
  end

  def lstrip
    %x{
      const string = self.valueOf();
      let start = 0;
      while (start < string.length && is_strippable(string.charCodeAt(start))) start++;
      return box_string(string.slice(start), self.encoding);
    }
  end

  # lstrip! - not supported, mutates string

  def match(pattern, pos = undefined, &block)
    if String === pattern || pattern.respond_to?(:to_str)
      pattern = ::Regexp.new(pattern.to_str)
    end

    unless ::Regexp === pattern
      ::Kernel.raise ::TypeError, "wrong argument type #{pattern.class} (expected Regexp)"
    end

    pattern.match(self, pos, &block)
  end

  def match?(pattern, pos = undefined)
    if String === pattern || pattern.respond_to?(:to_str)
      pattern = ::Regexp.new(pattern.to_str)
    end

    unless ::Regexp === pattern
      ::Kernel.raise ::TypeError, "wrong argument type #{pattern.class} (expected Regexp)"
    end

    pattern.match?(self, pos)
  end

  def next
    %x{
      let i = self.length;
      if (i === 0) return '';

      let result = self,
          first_alphanum_char_index = self.search(/[a-zA-Z0-9]/),
          carry = false,
          code = null,
          prior_code;
      while (i--) {
        code = self.codePointAt(i);
        if (code >= 0xDC00 && code <= 0xDFFF) continue; // low surrogate, get the full code at next iteration
        if ((code >= 48 && code <= 57) ||
          (code >= 65 && code <= 90) ||
          (code >= 97 && code <= 122)) {
          switch (code) {
          case 57:
            carry = true;
            code = 48;
            break;
          case 90:
            carry = true;
            code = 65;
            break;
          case 122:
            carry = true;
            code = 97;
            break;
          default:
            carry = false;
            code += 1;
          }
        } else {
          if (first_alphanum_char_index === -1) {
            if (code === 255 || code === 0x10FFFF) {
              carry = true;
              code = 0;
            } else {
              carry = false;
              if (code === 0xD7FF) code = 0xE000;
              else code += 1;
            }
          } else {
            carry = true;
          }
        }
        result = result.slice(0, i) + String.fromCodePoint(code) + result.slice(i + 1);
        if (carry && (i === 0 || i === first_alphanum_char_index)) {
          switch (code) {
          case 65:
            break;
          case 97:
            break;
          default:
            code += 1;
          }
          if (i === 0) {
            result = String.fromCodePoint(code) + result;
          } else {
            result = result.slice(0, i) + String.fromCodePoint(code) + result.slice(i);
          }
          carry = false;
        }
        if (!carry) break;
      }
      return $str(result, self.encoding);
    }
  end

  # next! - not supported, mutates string

  def oct
    %x{
      var result,
          string = self.valueOf(),
          radix = 8;

      if (!starts_with_a_number(string, 8)) {
        // What starts with neither a digit nor an underscore is zero.
        return 0;
      }

      if (number_leading_underscore.test(string)) {
        return 0;
      }

      string = string.replace(number_prefix_i, function (original, head, flag, tail) {
        switch (tail.charAt(0)) {
        case '+':
        case '-':
          return original;
        case '0':
          if (tail.charAt(1) === 'x' && flag === '0x') {
            return original;
          }
        }
        switch (flag) {
        case '0b':
          radix = 2;
          break;
        case '0':
        case '0o':
          radix = 8;
          break;
        case '0d':
          radix = 10;
          break;
        case '0x':
          radix = 16;
          break;
        }
        return head + tail;
      });

      result = parseInt(string.replace(number_underscores, ''), radix);
      return isNaN(result) ? 0 : result;
    }
  end

  def ord
    `self.valueOf().codePointAt(0)`
  end

  def partition(sep)
    %x{
      var i, m, s = self.valueOf();

      if (sep.$$is_regexp) {
        m = sep.exec(s);
        if (m === null) {
          i = -1;
        } else {
          #{::MatchData.new `sep`, `m`};
          sep = m[0];
          i = m.index;
        }
      } else {
        sep = $coerce_to(sep, Opal.String, 'to_str');
        if (starts_with_low_surrogate(sep) || ends_with_high_surrogate(sep)) i = -1;
        else i = s.indexOf(sep);
      }

      if (i === -1) return [self, $str('', sep.encoding), $str('', self.encoding)];

      return [
        $str(s.slice(0, i), self.encoding),
        $str(s.slice(i, i + sep.length), sep.encoding),
        $str(s.slice(i + sep.length), self.encoding)
      ];
    }
  end

  # prepend - not supported, mutates string
  # replace - not supported, mutates string

  def reverse
    %x{
      let res = '';
      for (const c of self) { res = c + res; }
      return $str(res, self.encoding);
    }
  end

  # reverse! - not supported, mutates string

  def rindex(search, offset = undefined)
    %x{
      let index, m, r, _m;

      if (offset === undefined) {
        offset = Infinity; // to avoid calling #size here, to call it only when necessary later on
      } else {
        offset = $coerce_to(offset, Opal.Integer, 'to_int');
        if (offset < 0) {
          offset += self.$length();
          if (offset < 0) return nil;
        }
      }

      if (search.$$is_regexp) {
        let str = self.valueOf();
        if (offset === Infinity) offset = str.$length();
        m = null;
        r = $global_regexp(search);
        while (true) {
          _m = r.exec(str);
          if (_m === null || _m.index > offset) break;
          m = _m;
          r.lastIndex = m.index + 1;
        }
        if (m === null) {
          #{$~ = nil}
          return nil;
        } else {
          #{::MatchData.new `r`, `m`};
          return m.index;
        }
      } else {
        search = $coerce_to(search, Opal.String, 'to_str').valueOf();
        if (search.length === 0) {
          let str_l = self.$length();
          if (offset > str_l) index = str_l;
          else index = offset;
        } else {
          let str = self.valueOf(),
              search_l = search.$length();
          if (offset !== Infinity && offset + search_l < self.$length()) {
            str = self["$[]"](0, offset + search_l);
          }
          index = find_index_of(str, search, search_l, true);
        }
      }

      return index === -1 ? nil : index;
    }
  end

  def rjust(width, padstr = ' ')
    width  = `$coerce_to(#{width}, Opal.Integer, 'to_int')`
    padstr = `$coerce_to(#{padstr}, Opal.String, 'to_str').valueOf()`

    if padstr.empty?
      ::Kernel.raise ::ArgumentError, 'zero width padding'
    end

    l = size

    return self if width <= l

    `$str(padding(padstr, width - l) + self.valueOf(), self.encoding)`
  end

  def rpartition(sep)
    %x{
      var i, m, r, _m, s = self.valueOf();

      if (sep.$$is_regexp) {
        m = null;
        r = $global_regexp(sep);

        while (true) {
          _m = r.exec(s);
          if (_m === null) {
            break;
          }
          m = _m;
          r.lastIndex = m.index + 1;
        }

        if (m === null) {
          i = -1;
        } else {
          #{::MatchData.new `r`, `m`};
          sep = m[0];
          i = m.index;
        }

      } else {
        sep = $coerce_to(sep, Opal.String, 'to_str');
        if (starts_with_low_surrogate(sep) || ends_with_high_surrogate(sep)) i = -1;
        else i = s.lastIndexOf(sep);
      }

      if (i === -1) return [$str('', self.encoding), $str('', sep.encoding), self];

      return [
        $str(s.slice(0, i), self.encoding),
        $str(s.slice(i, i + sep.length), sep.encoding),
        $str(s.slice(i + sep.length), self.encoding)
      ];
    }
  end

  def rstrip
    %x{
      const string = self.valueOf();
      let last = string.length;
      while (last > 0 && is_strippable(string.charCodeAt(last - 1))) last--;
      return box_string(string.slice(0, last), self.encoding);
    }
  end

  # rstrip! - not supported, mutates string

  def scan(pattern, no_matchdata: false, &block)
    %x{
      var result = [], match_data = nil, last_match = null, match, match_o, captures;

      // A block sees $~ of every match, without one only the last match is
      // turned into a MatchData.
      var every_match = #{!no_matchdata} && block !== nil;

      if (pattern.$$is_regexp) {
        pattern = $global_regexp(pattern);
      } else {
        pattern = regexp_for_pattern($coerce_to(pattern, Opal.String, 'to_str'), true);
      }

      while ((match = pattern.exec(self)) != null) {
        if (every_match) {
          match_data = #{::MatchData.new `pattern`, `match`, no_matchdata: no_matchdata};
        } else {
          last_match = match;
        }
        if (match.length === 1) {
          match_o = $str(match[0], self.encoding);
          if (block === nil) result.push(match_o);
          else Opal.yield1(block, match_o);
        } else {
          captures = match.slice(1).map((group) => group === undefined ? nil : $str(group, self.encoding));
          if (block === nil) result.push(captures);
          else Opal.yield1(block, captures);
        }
        if (pattern.lastIndex === match.index) {
          pattern.lastIndex += 1;
        }
      }

      if (#{!no_matchdata}) {
        if (match_data !== nil) { #{$~ = `match_data`} }
        else if (last_match !== null) { #{$~ = ::MatchData.new(`pattern`, `last_match`)} }
        else { #{$~ = nil} }
      }

      return (block !== nil ? self : result);
    }
  end

  def scrub(replacement_string = nil, &block)
    if replacement_string.is_a?(String)
      raise ArgumentError, 'replacement string has invalid encoding' unless replacement_string.valid_encoding?
      replacement_string = `replacement_string.toString()`
    elsif !replacement_string.nil?
      raise TypeError, 'replacement must be a String'
    end

    encoding.scrub(self, replacement_string)
  end

  # scrub! - not supported, mutates string
  # setbyte - not supported, mutates string
  # shellescape - defined in stdlib/shellescape
  # shellsplit - defined in stdlib/shellescape

  # We redefine this method on String, as kernel.rb is in strict mode
  # so that things like Boolean don't get boxed. For String though -
  # we either need to box it to define properties on it, or run it in
  # non-strict mode. This is a mess and we need to come back to it
  # at a later time.
  def singleton_class
    `Opal.get_singleton_class(self)`
  end

  alias size length

  alias slice []

  # slice! - not supported, mutates string

  def split(pattern = undefined, limit = undefined, &block)
    %x{
      if (self.length === 0) return (block && block !== nil) ? self : [];

      if (limit === undefined) {
        limit = 0;
      } else {
        limit = $coerce_to_or_raise(limit, Opal.Integer, "to_int");
        if (limit === 1) {
          if (block && block !== nil) {
            #{yield self};
            return self;
          }
          return [self]
        }
        if (limit > MAX_STR_LEN) #{raise RangeError, 'limit too large'};
      }

      if (pattern === undefined || pattern === nil) {
        pattern = #{$; || ' '};
      }

      var result,
          string = self.valueOf(),
          index = 0,
          match,
          match_count = 0,
          valid_result_length = 0,
          split_whitespace = false,
          i, max;

      if (pattern.$$is_regexp) {
        pattern = $global_regexp(pattern);
      } else {
        pattern = $coerce_to(pattern, Opal.String, 'to_str');

        if (pattern === ' ') {
          // The default separator is ASCII, so its encoding is always valid.
          pattern = /[\f\n\r\t\v\u0020\u00a0]+/gmu;
          let lead = 0;
          while (lead < string.length && is_whitespace(string.charCodeAt(lead))) lead++;
          if (lead > 0) {
            string = string.slice(lead);
            if (string.length === 0) return [];
          }
          split_whitespace = true;
        } else {
          // An ASCII-only pattern of an ASCII-compatible encoding is always
          // valid, and valid_encoding? is a Ruby call.
          var pattern_s = pattern.valueOf();
          if ((pattern.encoding && pattern.encoding.ascii === false) || !/^[\x00-\x7F]*$/.test(pattern_s)) {
            if (!pattern["$valid_encoding?"]()) #{raise ArgumentError, 'pattern has invalid encoding'};
          }
          if (pattern.length > 0 && (starts_with_low_surrogate(pattern) || ends_with_high_surrogate(pattern))) {
            result = [string];
          }
        }
      }

      if (!result) {
        if (split_whitespace) {
          result = split_on_whitespace(string);
        } else if (pattern.$$is_regexp) {
          result = split_by_matches(string, pattern) || string.split(pattern);
        } else if (pattern.length === 0) {
          result = [...string];
        } else {
          result = string.split(pattern);
        }

        if (!(result.length === 1 && result[0] === string)) {
          // Only a regular expression can produce undefined for a group that
          // did not participate in a match.
          if (pattern.$$is_regexp) {
            while ((i = result.indexOf(undefined)) !== -1) {
              result.splice(i, 1);
            }
          }

          if (limit === 0) {
            while (result[result.length - 1] === '') {
              result.pop();
            }
          } else {
            if (!pattern.$$is_regexp) {
              pattern = Opal.escape_regexp(pattern);
              let pattern_flags = $transform_regexp(pattern, 'gmu');
              pattern = new RegExp(pattern_flags[0], pattern_flags[1]);
            }

            match = pattern.exec(string);

            if (limit < 0) {
              if (match !== null && match[0] === '' && pattern.source.indexOf('(?=') === -1) {
                for (i = 0, max = match.length; i < max; i++) {
                  result.push('');
                }
              }
            } else  if (match !== null && match[0] === '') {
              valid_result_length = (match.length - 1) * (limit - 1) + limit
              result.splice(valid_result_length - 1, result.length - 1, result.slice(valid_result_length - 1).join(''));
            } else if (limit < result.length) {
              while (match !== null) {
                match_count++;
                index = pattern.lastIndex;
                valid_result_length += match.length
                if (match_count + 1 === limit) {
                  break;
                }
                match = pattern.exec(string);
              }
              result.splice(valid_result_length, result.length - 1, string.slice(index));
            }
          }
        }
      }
      // Box the pieces in place, with the encoding resolved once instead of
      // looking it up for every piece.
      var encoding = self.encoding;
      if (encoding && encoding.name && encoding.names) {
        for (let i = 0, length = result.length; i < length; i++) {
          const str = new String(result[i]);
          str.encoding = encoding;
          str.binary_encoding = encoding;
          result[i] = str;
        }
      } else {
        for (let i = 0, length = result.length; i < length; i++) {
          result[i] = $str(result[i], encoding);
        }
      }
      if (block && block !== nil) {
        for (const substr of result) {#{yield `substr`}}
        return self;
      }
      return result;
    }
  end

  def squeeze(*sets)
    %x{
      if (sets.length === 0) {
        return $str(self.valueOf().replace(/(.)\1+/g, '$1'), self.encoding);
      }
      var char_class = char_class_from_char_sets(sets);
      if (char_class === null) {
        return self;
      }
      return $str(self.valueOf().replace(new RegExp('(' + char_class + ')\\1+', 'gu'), '$1'), self.encoding);
    }
  end

  # squeeze! - not supported, mutates string

  def start_with?(*prefixes)
    %x{
      for (var i = 0, length = prefixes.length; i < length; i++) {
        if (prefixes[i].$$is_regexp) {
          var regexp = prefixes[i];
          var match = regexp.exec(self.valueOf());

          if (match != null && match.index === 0) {
            #{$~ = ::MatchData.new(`regexp`, `match`)};
            return true;
          } else {
            #{$~ = nil}
          }
        } else {
          let prefix = $coerce_to(prefixes[i], Opal.String, 'to_str').valueOf();
          // this is correct behavior since ruby 3.3
          // specs work when RUBY_VERSION is set to at least 3.3
          if (starts_with(self.valueOf(), prefix) || prefix.length === 0) return true;
        }
      }

      return false;
    }
  end

  def strip
    %x{
      const string = self.valueOf();
      let start = 0, last = string.length;
      while (start < last && is_strippable(string.charCodeAt(start))) start++;
      while (last > start && is_strippable(string.charCodeAt(last - 1))) last--;
      return box_string(string.slice(start, last), self.encoding);
    }
  end

  # strip! - not supported, mutates string

  def sub(pattern, replacement = undefined, &block)
    %x{
      if (!pattern.$$is_regexp) {
        pattern = regexp_for_pattern($coerce_to(pattern, Opal.String, 'to_str'), false);
      }

      var s = self.valueOf(), result, match = pattern.exec(s);

      if (match === null) {
        #{$~ = nil}
        result = s;
      } else {
        #{::MatchData.new `pattern`, `match`}

        if (replacement === undefined) {

          if (block === nil) {
            #{::Kernel.raise ::ArgumentError, 'wrong number of arguments (1 for 2)'}
          }
          result = s.slice(0, match.index) + block(match[0]) + s.slice(match.index + match[0].length);

        } else if (replacement.$$is_hash) {

          result = s.slice(0, match.index) + #{`replacement`[`match[0]`].to_s} + s.slice(match.index + match[0].length);

        } else {

          replacement = $coerce_to(replacement, Opal.String, 'to_str').valueOf();

          if (!/[\\&`'+0-9]/.test(replacement)) {
            // A replacement holding none of the escapes is used as it is.
            result = s.slice(0, match.index) + replacement + s.slice(match.index + match[0].length);
          } else {
            replacement = replacement.replace(/([\\]+)([0-9+&`'])/g, function (original, slashes, command) {
              if (slashes.length % 2 === 0) {
                return original;
              }
              switch (command) {
              case "+":
                for (var i = match.length - 1; i > 0; i--) {
                  if (match[i] !== undefined) {
                    return slashes.slice(1) + match[i];
                  }
                }
                return '';
              case "&": return slashes.slice(1) + match[0];
              case "`": return slashes.slice(1) + s.slice(0, match.index);
              case "'": return slashes.slice(1) + s.slice(match.index + match[0].length);
              default:  return slashes.slice(1) + (match[command] || '');
              }
            }).replace(/\\\\/g, '\\');

            result = s.slice(0, match.index) + replacement + s.slice(match.index + match[0].length);
          }
        }
      }

      return result;
    }
  end

  # sub! - not supported, mutates string

  alias succ next

  # succ! - not supported, mutates string

  def sum(n = 16)
    %x{
      n = $coerce_to(n, Opal.Integer, 'to_int');

      const result = self.binary_encoding.$bytes_sum(self);

      if (n <= 0) {
        return result;
      }

      return result & (Math.pow(2, n) - 1);
    }
  end

  def swapcase(*options)
    %x{
      if (case_options_have_ascii(options)) {
        return self.valueOf().replace(/([a-z]+)|([A-Z]+)/g, function($0,$1,$2) {
          return $1 ? $0.toUpperCase() : $0.toLowerCase();
        });
      }
      // The runs of ASCII letters are swapped at once. A run of other
      // characters is kept when its case mapping is the identity, and only a
      // run that changes is swapped character by character.
      const string = self.valueOf();
      let swapped = '', start = 0, i = 0, length = string.length, code;
      while (i < length) {
        code = string.charCodeAt(i);
        if (code >= 0x61 && code <= 0x7a) {
          do { i++; } while (i < length && (code = string.charCodeAt(i)) >= 0x61 && code <= 0x7a);
          swapped += string.slice(start, i).toUpperCase();
          start = i;
        } else if (code >= 0x41 && code <= 0x5a) {
          do { i++; } while (i < length && (code = string.charCodeAt(i)) >= 0x41 && code <= 0x5a);
          swapped += string.slice(start, i).toLowerCase();
          start = i;
        } else if (code <= 0x7f) {
          i++;
        } else {
          if (start < i) swapped += string.slice(start, i);
          const run_start = i;
          do { i++; } while (i < length && string.charCodeAt(i) > 0x7f);
          const run = string.slice(run_start, i);
          if (run.toUpperCase() === run && run.toLowerCase() === run) swapped += run;
          else {
            for (const c of run) {
              const upper_cased = c.toUpperCase();
              swapped += upper_cased === c ? c.toLowerCase() : upper_cased;
            }
          }
          start = i;
        }
      }
      if (start < length) swapped += string.slice(start);
      return $str(swapped, self.encoding);
    }
  end

  # swapcase! - not supported, mutates string

  # to_c - defined in corelib/complex

  def to_f
    %x{
      let s = self.valueOf();
      if (s.charAt(0) === '_') {
        return 0;
      }

      var result = parseFloat(s.replace(/_/g, ''));

      if (isNaN(result) || result == Infinity || result == -Infinity) {
        return 0;
      }
      else {
        return result;
      }
    }
  end

  def to_i(base = 10)
    %x{
      let result,
          string,
          radix = $coerce_to(base, Opal.Integer, 'to_int');

      if (radix === 1 || radix < 0 || radix > 36) {
        #{::Kernel.raise ::ArgumentError, "invalid radix #{`radix`}"}
      }

      if (radix !== 0 && !starts_with_a_number(self.valueOf(), radix)) {
        // What starts with neither a digit nor an underscore is zero, which is
        // most of the strings that are not numbers at all.
        return 0;
      }

      string = self.valueOf().toLowerCase();

      if (number_leading_underscore.test(string)) {
        return 0;
      }

      string = string.replace(number_prefix, function (original, head, flag, tail) {
        switch (tail.charAt(0)) {
        case '+':
        case '-':
          return original;
        case '0':
          if (tail.charAt(1) === 'x' && flag === '0x' && (radix === 0 || radix === 16)) {
            return original;
          }
        }
        switch (flag) {
        case '0b':
          if (radix === 0 || radix === 2) {
            radix = 2;
            return head + tail;
          }
          break;
        case '0':
        case '0o':
          if (radix === 0 || radix === 8) {
            radix = 8;
            return head + tail;
          }
          break;
        case '0d':
          if (radix === 0 || radix === 10) {
            radix = 10;
            return head + tail;
          }
          break;
        case '0x':
          if (radix === 0 || radix === 16) {
            radix = 16;
            return head + tail;
          }
          break;
        }
        return original
      });

      result = parseInt(string.replace(number_underscores, ''), radix);
      return isNaN(result) ? 0 : result;
    }
  end

  def to_proc
    method_name = `self.valueOf()`
    jsid = `Opal.jsid(method_name)`

    proc = ::Kernel.proc do |*args, &block|
      %x{
        if (args.length === 0) {
          #{::Kernel.raise ::ArgumentError, 'no receiver given'}
        }

        var recv = args[0];

        if (recv == null) recv = nil;

        var body = recv[jsid];

        if (!body) {
          body = recv.$method_missing;
          args[0] = #{method_name};
        } else {
          args = args.slice(1);
        }

        if (typeof block === 'function') {
          body.$$p = block;
        }

        if (args.length === 0) {
          return body.call(recv);
        } else {
          return body.apply(recv, args);
        }
      }
    end

    `proc.$$source_location = nil`

    proc
  end

  # to_r - defined in corelib/rational/base

  %x{
    (function() {
      "use strict";
      #{
        def to_s
          return self if instance_of?(::String)
          `self.toString()`
        end
      }
    })();
  }

  alias to_str to_s

  alias to_sym intern

  %x{
    function expand_chars(chars) {
      let length = chars.length,
          expanded = [],
          ch, last_ch, start, end,
          c, i = 0, in_range;
      for (; i < length; i++) {
        ch = chars[i];
        if (last_ch == null) {
          last_ch = ch;
          expanded.push(ch);
        }
        else if (ch == '-' && !in_range) {
          if (i > 0 && i < length - 1) {
            in_range = true;
          } else {
            expanded.push('-');
          }
        }
        else if (in_range) {
          start = last_ch.codePointAt(0);
          end = ch.codePointAt(0);
          if (start > end) {
            #{::Kernel.raise ::ArgumentError, "invalid range \"#{`String.fromCodePoint(start)`}-#{`String.fromCodePoint(end)`}\" in string transliteration"}
          } else if (start !== end) {
            for (c = start + 1; c < end; c++) {
              expanded.push(String.fromCodePoint(c));
            }
            expanded.push(ch);
          }
          in_range = null;
          last_ch = null;
        } else {
          expanded.push(ch);
        }
      }
      return expanded;
    }

    function common_tr(self, from, to, is_tr_s) {
      from = $coerce_to(from, Opal.String, 'to_str').$to_s();
      to = $coerce_to(to, Opal.String, 'to_str').$to_s();

      if (from.length == 0) return self;

      var i, in_range, c, ch, start, end, length, size;
      var subs = new Map();
      var from_chars = [...from];
      var from_length = from_chars.length;
      var to_chars = [...to];
      var to_length = to_chars.length;

      var inverse = false;
      var global_sub = null;
      if (from_chars[0] == '^' && from_chars.length > 1) {
        inverse = true;
        from_chars.shift();
        global_sub = to_chars.at(-1)
        from_length -= 1;
      }

      from_chars = expand_chars(from_chars);
      from_length = from_chars.length;

      if (inverse) {
        for (i = 0; i < from_length; i++) {
          subs.set(from_chars[i].codePointAt(0), true);
        }
      } else {
        if (to_length > 0) {
          to_chars = expand_chars(to_chars);
          to_length = to_chars.length;
        }

        var length_diff = from_length - to_length;
        if (length_diff > 0) {
          var pad_char = (to_length > 0 ? to_chars.at(-1) : '');
          for (i = 0; i < length_diff; i++) {
            to_chars.push(pad_char);
          }
        }

        for (i = 0; i < from_length; i++) {
          subs.set(from_chars[i].codePointAt(0), to_chars[i]);
        }
      }

      let new_str = '',
          sub;

      // The characters are read by index and looked up by code point, which
      // costs less than iterating them and indexing an object by their strings.
      // tr_s keeps the last substitute, which tr leaves null so that it always
      // takes the substitutions.
      const string = self.valueOf(),
            string_length = string.length;
      var last_substitute = null;

      for (i = 0; i < string_length; i++) {
        c = string.charCodeAt(i);
        size = 1;
        if (c >= 0xD800 && c <= 0xDBFF && i + 1 < string_length &&
            string.charCodeAt(i + 1) >= 0xDC00 && string.charCodeAt(i + 1) <= 0xDFFF) {
          c = string.codePointAt(i);
          size = 2;
        }
        sub = subs.get(c);
        if (inverse) {
          if (sub === undefined) {
            if (last_substitute == null) {
              new_str += global_sub;
              last_substitute = is_tr_s ? true : null;
            }
          } else {
            new_str += (size === 1 ? string[i] : string.slice(i, i + 2));
            last_substitute = null;
          }
        } else if (sub !== undefined) {
          if (last_substitute == null || last_substitute !== sub) {
            new_str += sub;
            last_substitute = is_tr_s ? sub : null;
          }
        } else {
          new_str += (size === 1 ? string[i] : string.slice(i, i + 2));
          last_substitute = null;
        }
        i += size - 1;
      }
      return new_str;
    }
  }

  def tr(from, to)
    `common_tr(self, from, to, false)`
  end

  # tr! - not supported, mutates string

  def tr_s(from, to)
    `common_tr(self, from, to, true)`
  end

  # tr_s! - not supported, mutates string

  # def undump
  #  # TODO
  # end

  def unicode_normalize(form = :nfc)
    ::Kernel.raise ::ArgumentError, "Invalid normalization form #{form}" unless %i[nfc nfd nfkc nfkd].include?(form)
    `self.normalize(#{form.upcase})`
  end

  # unicode_normalize! - not supported, mutates string

  def unicode_normalized?(form = :nfc)
    unicode_normalize(form) == self
  end

  def unpack(format)
    ::Kernel.raise "To use String#unpack, you must first require 'corelib/string/unpack'."
  end

  def unpack1(format)
    ::Kernel.raise "To use String#unpack1, you must first require 'corelib/string/unpack'."
  end

  def upcase(*options)
    %x{
      let result, s = self.valueOf();
      if (case_options_have_ascii(options)) {
        result = s.replace(/[a-z]+/g, (match)=>{ return match.toUpperCase(); });
      } else {
        result = s.toUpperCase();
      }
      return $str(result, self.encoding)
    }
  end

  # upcase! -not supported, mutates string

  def upto(stop, excl = false, &block)
    return enum_for :upto, stop, excl unless block_given?
    %x{
      var a, b, s = self.valueOf();

      stop = $coerce_to(stop, Opal.String, 'to_str').valueOf();

      let str_l = self.$length(),
          stop_l = stop.$length();

      if (str_l === 1 && stop_l === 1) {

        a = self.codePointAt(0);
        b = stop.codePointAt(0);
        if (b >= 0xD800 && b <= 0xDFFF) b = 0; // exclude surrogate range for b

        while (a <= b) {
          if (excl && a === b) break;

          block(String.fromCodePoint(a));

          a += 1;
          if (a >= 0xD800 && a <= 0xDFFF) a = 0xE000; // exclude surrogate range
        }

      } else if (parseInt(s, 10).toString() === s && parseInt(stop, 10).toString() === stop) {

        a = parseInt(s, 10);
        b = parseInt(stop, 10);

        while (a <= b) {
          if (excl && a === b) break;

          block(a.toString());

          a += 1;
        }
      } else {
        let s_l;
        while (str_l <= stop_l && s <= stop) {
          if (excl && s == stop) break;

          block(s);

          s_l = s.length;
          s = s.$next();
          if (s.length !== s_l) str_l = s.$length();
        }

      }
      return self;
    }
  end

  def valid_encoding?
    encoding.valid_encoding?(self)
  end

  def instance_variables
    []
  end

  def self._load(*args)
    new(*args)
  end

  alias object_id __id__

  ::Opal.pristine self, :initialize
end

Symbol = String
