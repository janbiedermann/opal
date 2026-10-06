# Getting Started

Opal is a Ruby to JavaScript compiler and an implementation of the Ruby corelib and stdlib, for building fast client-side web applications in Ruby.

## Installation

Opal runs on Node.js (22 or later); it needs no Ruby. Get it from git and install
its development dependencies:

```
$ git clone https://github.com/opal/opal.git
$ cd opal
$ bin/setup
```

`exe/opal` is the command line interface (add `exe/` to your `PATH` to call it
as `opal`):

```
$ exe/opal -e "[1, 2, 3].each { |a| puts a }"
1
2
3
$ exe/opal --compile app.rb > app.js
```

## Getting Started with Opal

At its core, Opal provides a simple method of compiling a string of Ruby into JavaScript that can run on top of the Opal runtime:

```js
import { compile } from "./lib/opal/compiler/index.mjs";

compile("[1, 2, 3].each { |a| puts a }");
// => "Opal.queue(function(Opal) { ... })"
```

Opal allows for Ruby (and ERB) assets to be compiled and treated as first-class JavaScript citizens. Ruby sources can require JavaScript and other Ruby files.

This relies on the Opal load path: `opal/`, `stdlib/` and `lib/` of Opal itself, plus the directories you add.

### Adding Lookup Paths

Opal uses a load path to create a set of locations from which Opal can require files. To add a directory to it, pass it to the CLI:

```
$ exe/opal -I ../my_lib app.rb
```

or to the builder:

```js
import { Builder } from "./lib/opal/compiler/builder/builder.mjs";

const builder = new Builder();
builder.appendPaths("../my_lib");
```

or list it in an [Opalfile](opalfile.md). Now, any Ruby files in this directory can be discovered.

### Standalone Executables

`--compile-to-exe node` builds a standalone executable from a program, a
Node.js [single executable application](https://nodejs.org/api/single-executable-applications.html):

```
$ exe/opal --compile-to-exe node -o hello hello.rb
$ ./hello world
```

The executable gets Node.js's platform (`ARGV`, `ENV`, `STDIN`, `File`,
`Dir`, ... as with `require 'nodejs'`) and the V8 code cache of the program,
and leaves out the source map. It is made from the Node.js that runs `opal`,
which must have the single executable application fuse: the official builds
have it, some Linux distributions' builds don't (`opal` checks this before
compiling and says so, exiting with status 69). `postject` comes from npm
(`npx`). In an executable only Node's own modules can be required, so
`Dir.glob` (picomatch) and `open-uri` (unxhr) aren't available in one.

## FAQ

### Why Does Opal Exist?

Opal aims to keep Ruby relevant in a world where client-side applications are making JavaScript the primary development platform.

### How Compatible is Opal?

Opal is tested against the [Ruby spec](https://github.com/ruby/spec) as our primary testing setup. The goal is to make Opal as compatible as possible while also considering the restrictions of JavaScript when applicable. Opal supports the majority of Ruby syntax features, as well as a very large part of the corelib implementation. Opal can compile and run RSpec unmodified, as well as self-host the compiler at runtime.

### What Version of Ruby Does Opal Target?

The compiler implements Ruby 4.0 syntax (its parser is a port of Prism). The corelib is tested against ruby/spec.

### Why Doesn't Opal Support Mutable Strings?

All strings in Opal are immutable because Ruby strings are compiled directly into JavaScript strings, which are immutable. Wrapping Ruby strings as a custom JavaScript object would add a lot of overhead and complicate interaction between Ruby and JavaScript libraries.
