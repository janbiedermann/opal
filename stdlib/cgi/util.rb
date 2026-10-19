# backtick_javascript: true

# This file contains parts of https://github.com/ruby/ruby/blob/master/lib/cgi/util.rb
# licensed under a Ruby license.

class CGI
  module Util
    # URL-encode a string into application/x-www-form-urlencoded.
    # Space characters (+" "+) are encoded with plus signs (+"+"+)
    #   url_encoded_string = CGI.escape("'Stop!' said Fred")
    #      # => "%27Stop%21%27+said+Fred"
    def escape(c)
      %x{
        // Only -._~ and the alphanumerics stay; every other byte becomes an
        // uppercase %XX and a space a +, which is what Ruby does with a gsub
        // over the ASCII-8BIT bytes. encodeURI keeps the reserved characters
        // (`/#&?`) and the non-ASCII ones, so it answered something else.
        let out = "";
        for (const byte of #{c.bytes}) {
          if (byte === 0x20) {
            out += "+";
          } else if ((byte >= 0x30 && byte <= 0x39) || (byte >= 0x41 && byte <= 0x5a) ||
                     (byte >= 0x61 && byte <= 0x7a) || byte === 0x2d || byte === 0x2e ||
                     byte === 0x5f || byte === 0x7e) {
            out += String.fromCharCode(byte);
          } else {
            out += "%" + byte.toString(16).toUpperCase().padStart(2, "0");
          }
        }
        return out;
      }
    end

    # URL-decode an application/x-www-form-urlencoded string with encoding(optional).
    #   string = CGI.unescape("%27Stop%21%27+said+Fred")
    #      # => "'Stop!' said Fred"
    def unescape(c)
      %x{
        // Every %XX pair becomes a byte and a + is a space; decodeURI leaves
        // the escapes that are legal inside a URI (%2F, %3A) alone and hands
        // the input back. The bytes are read as UTF-8 unless the string is
        // binary, which is Ruby's ASCII-8BIT then force_encoding pair.
        const str = String(c);
        const encoder = new TextEncoder();
        const bytes = [];
        for (let i = 0; i < str.length; i++) {
          const ch = str[i];
          if (ch === "+") {
            bytes.push(0x20);
          } else if (ch === "%" && /^[0-9a-fA-F]{2}/.test(str.substr(i + 1, 2))) {
            bytes.push(parseInt(str.substr(i + 1, 2), 16));
            i += 2;
          } else {
            const point = str.codePointAt(i);
            if (point > 0xffff) i++;
            for (const byte of encoder.encode(String.fromCodePoint(point))) bytes.push(byte);
          }
        }
        const buffer = Buffer.from(bytes);
        const name = (c && c.encoding && c.encoding.name) || "UTF-8";
        if (name === "ASCII-8BIT" || name === "BINARY") return Opal.str(buffer.toString("latin1"), "BINARY");
        return new TextDecoder("utf-8").decode(buffer);
      }
    end

    # URL-encode a string following RFC 3986
    # Space characters (+" "+) are encoded with (+"%20"+)
    #   url_encoded_string = CGI.escapeURIComponent("'Stop!' said Fred")
    #      # => "%27Stop%21%27%20said%20Fred"
    def escapeURIComponent(c)
      `encodeURIComponent(c)`
    end

    # URL-decode a string following RFC 3986 with encoding(optional).
    #   string = CGI.unescapeURIComponent("%27Stop%21%27+said%20Fred")
    #      # => "'Stop!'+said Fred"
    def unescapeURIComponent(c)
      `decodeURIComponent(c)`
    end

    # The set of special characters and their escaped values
    TABLE_FOR_ESCAPE_HTML__ = {
      "'" => '&#39;',
      '&' => '&amp;',
      '"' => '&quot;',
      '<' => '&lt;',
      '>' => '&gt;',
    }

    # Escape special characters in HTML, namely '&\"<>
    #   CGI.escapeHTML('Usage: foo "bar" <baz>')
    #      # => "Usage: foo &quot;bar&quot; &lt;baz&gt;"
    def escapeHTML(string)
      string.gsub(/['&"<>]/, TABLE_FOR_ESCAPE_HTML__)
    end

    # Unescape a string that has been HTML-escaped
    #   CGI.unescapeHTML("Usage: foo &quot;bar&quot; &lt;baz&gt;")
    #      # => "Usage: foo \"bar\" <baz>"
    def unescapeHTML(string)
      string.gsub(/&(apos|amp|quot|gt|lt|\#[0-9]+|\#[xX][0-9A-Fa-f]+);/) do
        match = ::Regexp.last_match(1)
        case match
        when 'apos'                then "'"
        when 'amp'                 then '&'
        when 'quot'                then '"'
        when 'gt'                  then '>'
        when 'lt'                  then '<'
        when /\A#0*(\d+)\z/
          n = ::Regexp.last_match(1).to_i
          n.chr('utf-8')
        when /\A#x([0-9a-f]+)\z/i
          n = ::Regexp.last_match(1).hex
          n.chr('utf-8')
        else
          "&#{match};"
        end
      end
    end

    # Synonym for CGI.escapeHTML(str)
    alias escape_html escapeHTML

    # Synonym for CGI.unescapeHTML(str)
    alias unescape_html unescapeHTML

    alias h escapeHTML
  end

  include Util
  extend Util
end
