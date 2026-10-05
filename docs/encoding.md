# Encoding

Encoding support is partial and mostly given by the encoding set by the HTML page.
We suggest to always set encoding to UTF-8 explicitly:

```html
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <!-- ... -->
```

Support for EUC-JP, JIS and ShiftJIS encodings is available but must be explicitly required:
```ruby
require 'corelib/string/encoding/eucjp' # for EUC-JP
require 'corelib/string/encoding/jis'   # for JIS
require 'corelib/string/encoding/sjis'  # for ShiftJIS
```

## Source encodings

Sources are UTF-8 unless an encoding magic comment (`# encoding: ...` on the
first or second line) says otherwise; the builder and `opal` decode them
accordingly. As in CRuby:

* string literals in a source in `ASCII-8BIT` (`binary`), `ISO-8859-1` or
  `US-ASCII` have that encoding and the source's bytes (a `\u` escape makes a
  literal UTF-8; a `\x` escape of a byte above `0x7F` in a US-ASCII source
  makes it `ASCII-8BIT`)
* `__ENCODING__` is the source's encoding

Sources in other encodings (e.g. `Windows-1252`, `Shift_JIS`, `EUC-JP`) are
decoded correctly, but their string literals are UTF-8 strings of the decoded
text. Symbols are always strings in Opal, so their encoding doesn't follow
the source.
