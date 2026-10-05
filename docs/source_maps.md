# Source maps

Source maps are available on most environments we support.

## The `opal` CLI

`opal` appends the source map to the compiled code as a data URI by
default:

```
$ opal --compile app.rb > app.js           # with an embedded source map
$ opal --compile --no-source-map app.rb    # without
$ opal --compile -P app.js.map app.rb      # also writes the map to a file
```

When running code (`opal app.rb`, the default nodejs runner, or `-R chrome`
etc.), the source maps are used for the backtraces.

`opal --debug-source-map -e 'puts 123'` prints a link to a source map
visualization of the compiled code.

## The builder

The builder (`lib/opal/compiler/builder/builder.mjs`) gives the code with
the embedded source map, or the map as an object:

```js
const builder = new Builder();
builder.build("application");
builder.compiledSource();                        // code + embedded source map
builder.compiledSource({ withSourceMap: false }); // just the code
builder.sourceMap.map();                         // the (index) source map
```

In [directory mode](directory_mode.md) each file gets its own `.map` file.

## The server runner

`opal -R server app.rb` serves the program with its source map embedded.

## The compiler

`new Compiler(source, { file }).sourceMap` is the source map of a single
compiled file (`map()` gives the JSON object, `toDataUriComment()` the
comment to append).
