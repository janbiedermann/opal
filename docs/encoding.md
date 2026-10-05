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
accordingly. An encoding name Ruby doesn't know is a syntax error ("unknown or
invalid encoding in the magic comment"). As in CRuby:

* string literals in a source in `ASCII-8BIT` (`binary`), `ISO-8859-1`,
  `US-ASCII`, `Shift_JIS` or `EUC-JP` have that encoding (a `\u` escape makes a
  literal UTF-8; a `\x` escape of a byte above `0x7F` in a US-ASCII source
  makes it `ASCII-8BIT`)
* `__ENCODING__` is the source's encoding
* a literal can't mix a `\u` escape with non-ASCII characters or `\x` escapes
  of a source in another encoding than UTF-8 ("UTF-8 mixed within ISO-8859-1
  source")

A source in `Shift_JIS` or `EUC-JP` requires the corelib file of its encoding
(`corelib/string/encoding/sjis` or `corelib/string/encoding/eucjp`), which
the builder bundles. A `Windows-31J` source (`# encoding: sjis`, `cp932`) is
compiled as `Shift_JIS`, as Opal has no Windows-31J. A literal whose `\x`
escapes aren't valid in the source encoding stays a UTF-8 string.

Sources in other encodings (e.g. `Windows-1252`) are decoded correctly, but
their string literals are UTF-8 strings of the decoded text. Symbols are
always strings in Opal, so their encoding doesn't follow the source.
