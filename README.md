<h1 align="center">
  <img src="https://secure.gravatar.com/avatar/88298620949a6534d403da2e356c9339?s=420"
  align="center" title="Opal logo by Elia Schito" width="105" height="105" />
  <br/>
  Opal  <br/>
  <img src="https://img.shields.io/badge/Opal-Ruby%20💛%20JavaScript-yellow.svg?logo=ruby&style=social&logoColor=777" alt="Opal-Ruby 💛 JavaScript"/>
</h1>

<p align="center">
  <em><strong>Opal</strong> is a Ruby to JavaScript source-to-source compiler.<br>
    It also has an implementation of the Ruby <code>corelib</code> and <code>stdlib</code>.</em>
</p>

<p align="center">
  <strong>Community:</strong><br>
  <a href="https://stackoverflow.com/questions/ask?tags=opalrb"><img src="https://img.shields.io/badge/stackoverflow-%23opalrb-orange.svg?style=flat" alt="Stack Overflow" title="" /></a>
  <a href="#backers"><img src="https://opencollective.com/opal/backers/badge.svg" alt="Backers on Open Collective" title="" /></a>
  <a href="#sponsors"><img src="https://opencollective.com/opal/sponsors/badge.svg" alt="Sponsors on Open Collective" title="" /></a>
  <a href="https://slack.opalrb.com/"><img src="https://img.shields.io/badge/slack-join%20chat-46BC99?logo=slack&style=flat" alt="Slack" title="Join Chat" /></a>
  <a href="https://opalrb.com/docs"><img src="https://img.shields.io/badge/docs-updated-blue.svg" alt="Documentation" title="" /></a>

  <br>
  <strong>Code:</strong><br>
  <a href="https://github.com/opal/opal/actions?query=workflow%3Abuild"><img src="https://github.com/opal/opal/workflows/build/badge.svg" alt="Build Status" /></a>
  <a href="https://codeclimate.com/github/opal/opal"><img src="https://img.shields.io/codeclimate/maintainability-percentage/opal/opal.svg" alt="Code Climate" title="" /></a>
  <a href="https://coveralls.io/github/opal/opal?branch=master"><img src="https://coveralls.io/repos/opal/opal/badge.svg?branch=master&amp;service=github" alt="Coverage Status" title="" /></a>

  <br>
  <strong>Sponsors:</strong>
  <br/><a href="https://nebulab.it?utm_source=github&utm_medium=badge"><img src="https://img.shields.io/static/v1?label=Nebulab&message=Open+Source+Fridays&color=%235dbefd&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAYAAAByDd+UAAAACXBIWXMAABYlAAAWJQFJUiTwAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAMQSURBVHgBrZZNTxNRFIbfczsgIMQiLBCRFDaGhUr9A9iiIa5EEneIwE/AlRsNv8KlIKwFl35RTUBX8rFBdiVKAgqmXSCY0M71nJl+zJTOdKh9k6Yzc8/cZ86555x7CQE0mji5hSyGlQoNaOgIPwrnhtIArWszu4EQFudjdR8rzUV+gw8/ZMZB9IwvIwimJJGafhmjWZwFOJ7QkYzWCwTdj+qUDJGKz8Rou3RAlT4YS+hHWW2u/QdM1MNzrI6+zwyXDrg8FANStIDaSXOIJ5whLgAljOIZiglRK6U4vDfz4S2ElGGJWsEaQkCTUbhtNbV+lb+xgFY2Bs9ET0h/GzBxlfAkqnCUKY5xKfVLbsi1/R126lcF6WgCYp2ES42EBp6tvQFY+alLTUlrUxizJEVNWiVwBkVagGg7oe+CDclLYOfrgMdfTBz8PfWa1lkzbsDEsH/5FyF9YUK0zQ1xwpoZtsm9pwxMRLyA9wyi0A2Jcjl1NNqeeEFEimxYPkmWd014ikIDnDTeBb53DOweaRxnvWGyhnmYfPZWGt487sNi6lsK67/lZ1oZGOtUaD3nhtU7etXXfe0VzrzCBgLKCR68rNDX6oaJlvd0xXnklbSfgSTL/QghXF8EP980cVKyVL/Ys9UDVFJa8Tdt+1lYmcmJM3Vd4UEvWeslRf32h9ubrVRl77gBrCto85OfUU+LXTMGx+JuN2Hoin3/Zkfjj6ObBAknV+KG4jpc9BqXMEpiCMz6Z9ZQ12kvJZxb6co4Zr1W83esY8F2OYsIe+eEyfTiVXczCl7uM2wliHfMEJaRc3Wa++mLUotrF4EW7h6f94Dvh6aVFM60Fy8Xkya+BfBOjh5yUWhqY0vmKi9q1GnVxZ7sHKIWSs7FQ71yUagkRTTCfymnVY1gsgHHC5z8hbUjaz0Fr8ZanXhX0pPOw5SrV8wNGjNscMrTKpXKaj05f9twVYHnMZGPHEuwTwEBNi+3NGiNt6GRcsfEIAfhp2cAV3cQLtXoOz7q8+ZJRLx3kmxn4dy7aas1SrfiBpKraV/9A+PSJLDAXLUvAAAAAElFTkSuQmCC" alt="Nebulab: Open Source Fridays" /></a>
</p>

## Usage

See the website for more detailed instructions and guides for Rails, jQuery, Sinatra, rack, CDN, etc. [https://opalrb.com](https://opalrb.com).

### Compiling Ruby code with the CLI (Command Line Interface)

Contents of `app.rb`:

```ruby
puts 'Hello world!'
```

Then from the terminal

```bash
$ opal --compile app.rb > app.js # The Opal runtime is included by default
                                 # but can be skipped with the --no-opal flag
```

The resulting JavaScript file can be used normally from an HTML page:

```html
<script src="app.js"></script>
```

Be sure to set the page encoding to `UTF-8` inside your `<head>` tag as follows:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <script src="app.js"></script>
    …
  </head>
  <body>
    …
  </body>
</html>
```

Just open this page in a browser and check the JavaScript console.


### Compiling Ruby code from JavaScript

The compiler is a set of ES modules that run in Node.js (and in the
browser, see `opal-parser` below). `compile` turns a string of Ruby into
a string of JavaScript code:

```js
import { compile } from "./lib/opal/compiler/index.mjs";

compile("puts 'wow'", { file: "wow.rb" }); // => "Opal.queue(function(Opal) { ... self.$puts(\"wow\"); ... })"
```

Running this by itself is not enough; you need the opal runtime/corelib.

#### Using the Builder

The builder (Node.js) builds the runtime/corelib into a string, or an
entire app including dependencies declared with `require`:

```js
import { Builder } from "./lib/opal/compiler/builder/builder.mjs";
import { writeFileSync } from "node:fs";

const builder = new Builder();
builder.build("opal");
builder.buildStr('puts "wow"', "(inline)");
writeFileSync("app.js", builder.toString());
```

### Compiling Ruby code from HTML (or using it as you would with inline JavaScript)

`opal-parser` allows you to *eval* Ruby code directly from your HTML (and from Opal) files without needing any other building process.

So you can create a file like the one below, and start writing ruby for
your web applications.


```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <script src="https://cdn.opalrb.com/opal/current/opal.js"></script>
    <script src="https://cdn.opalrb.com/opal/current/opal-parser.js" onload="Opal.load('opal-parser')"></script>

    <script type="text/ruby">
      puts "hi"
    </script>

  </head>
  <body>
  </body>
</html>
```

Just open this page and check the JavaScript console.

**NOTE**: Although this is possible, this is not really recommended for
production and should only be used as a quick way to get your hands
on opal.

## Running tests

Opal needs Node.js (22 or later), git and yarn. Setup the project:

    $ bin/setup

The test suite (the parser and compiler specs, [MSpec][] with ruby/spec
and Opal's own specs, and the Minitest suites) can be run using:

    $ node tasks/test.mjs

`node tasks/test.mjs mspec_ruby` runs a single suite,
`node tasks/test.mjs spec/ruby/core/string` the given specs, and
`node tasks/test.mjs -R chrome mspec` the specs in a browser. See
[HACKING.md](HACKING.md) for more.

## Code Overview

What code is supposed to run where?

* `lib/` is the toolchain, in JavaScript: the parser and compiler, the builder and the CLI. It runs in Node.js (the compiler also in browsers).
* `opal/` is the runtime+corelib for our implementation (runs in browser).
* `stdlib/` is our implementation of Ruby's stdlib. It is optional (runs in browser).

### lib/

The `lib/opal` directory holds the **parser**, Opal's Ruby parser (a JavaScript
port of [Prism](https://github.com/ruby/prism)), and the **compiler**, which
compiles Ruby into JavaScript, with the **builder** and the `opal` **CLI**
(`exe/opal`). The compiler is also built ready for the browser into
`opal-parser.js` to allow compilation in any JavaScript environment.

### opal/

This directory holds the **Opal runtime and corelib** implemented in Ruby and
JavaScript.

### stdlib/

Holds the **stdlib currently supported by Opal**. This includes `Observable`,
`StringScanner`, `Date`, etc.

## Browser support

Opal generates and runs code for browsers that support ES2024:

* Chrome (Current - 1) or Current, including Chrome on Android 14 and later
* Firefox (Current - 1) or Current
* Safari (Current - 1) or Current, including Safari on iOS 18 and on macOS
* Opera (Current - 1) or Current

Any problems encountered using the browsers listed above should be reported as bugs.

(Current - 1) or Current denotes that we support the current stable version of
the browser and the version that preceded it. For example, if the current
version of a browser is 24.x, we support the 24.x and 23.x versions.

Node.js 22 or later is supported as well and is the version used by the
toolchain.

## Contributors

This project exists thanks to all the people who contribute. [![contributors](https://opencollective.com/opal/contributors.svg?width=890&button=false")](https://github.com/opal/opal/graphs/contributors)

## Versioning

Opal will broadly follow semver as a version policy, trying to bump the major version when introducing breaking changes.
Being a language implementation we're also aware that there's a fine line between what can be considered breaking and what is expected to be "safe" or just "additive". Moving forward we'll attempt to better clarify what interfaces are meant to be public and what should be considered private.

## Backers

Thank you to all our backers! 🙏 [[Become a backer](https://opencollective.com/opal#backer)]

<a href="https://opencollective.com/opal#backers" target="_blank"><img src="https://opencollective.com/opal/backers.svg?width=890" alt="Become a Backer Button" /></a>
<a href="https://opencollective.com/opal/sponsor/1/website" target="_blank"><img src="https://opencollective.com/opal/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/opal/sponsor/2/website" target="_blank"><img src="https://opencollective.com/opal/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/opal/sponsor/3/website" target="_blank"><img src="https://opencollective.com/opal/sponsor/3/avatar.svg"></a>
<a href="https://opencollective.com/opal/sponsor/4/website" target="_blank"><img src="https://opencollective.com/opal/sponsor/4/avatar.svg"></a>
<a href="https://opencollective.com/opal/sponsor/5/website" target="_blank"><img src="https://opencollective.com/opal/sponsor/5/avatar.svg"></a>
<a href="https://opencollective.com/opal/sponsor/6/website" target="_blank"><img src="https://opencollective.com/opal/sponsor/6/avatar.svg"></a>
<a href="https://opencollective.com/opal/sponsor/7/website" target="_blank"><img src="https://opencollective.com/opal/sponsor/7/avatar.svg"></a>
<a href="https://opencollective.com/opal/sponsor/8/website" target="_blank"><img src="https://opencollective.com/opal/sponsor/8/avatar.svg"></a>
<a href="https://opencollective.com/opal/sponsor/9/website" target="_blank"><img src="https://opencollective.com/opal/sponsor/9/avatar.svg"></a>


## Sponsors

### Donations

Support this project by becoming a sponsor. Your logo will show up here with a link to your website. [[Become a sponsor](https://opencollective.com/opal#sponsor)]

<a href="https://opencollective.com/opal/sponsor/0/website" target="_blank"><img src="https://opencollective.com/opal/sponsor/0/avatar.svg" alt="Become a Sponsor Button"></a>

### Sponsored Contributions

<a href="https://nebulab.it/?utm_source=github&utm_medium=sponsors" target="_blank"><img src=".github/sponsors/nebulab-logo.svg" alt="Nebulab Logo"></a>

<a href="https://www.testmu.ai/?utm_source=github&utm_medium=sponsors" target="_blank"><img src=".github/sponsors/testmu-ai-black.svg" alt="TestMu AI Logo" width="200"></a>


## License

(The MIT License)

Copyright (C) 2013-2021 by Adam Beynon and the Opal contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.


[MSpec]: https://github.com/ruby/mspec#readme
