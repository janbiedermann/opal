# Opal Compiler

Opal is a source to source compiler. It accepts ruby code as a string and
generates javascript code which can be run in any environment. Generated
code relies on the opal runtime which provides the class system and some
other runtime helpers.

The compiler is written in JavaScript (ES modules in `lib/opal/compiler`)
and runs in Node.js and, as `opal-parser`, in the browser.

## Compiler stages

The compiler can be broken down into 3 separate stages:

* parsing
* transforms
* code generation

### Parser

The [opal parser][parser], potch, is a JavaScript port of
[Prism](https://github.com/ruby/prism), the parser of CRuby. It returns
Prism's syntax tree as plain objects (see [potch](potch.md));
`opal --sexp -e '...'` prints it.

### Transforms

The [transforms][transforms] rewrite parts of the tree before code
generation: they normalize some nodes, rewrite `for` loops, operator
assignments and pattern matching into simpler nodes, and so on.

### Code generation

The [opal compiler][compiler] takes the tree and generates javascript from
it. Each type of node has [its own node class][base-node] used to generate
javascript. Each node creates an array of one or more
[fragments][fragments] which are then concatenated together to
form the final javascript. Fragments are used as they contain the generated
code as well as a reference back to the original node which is useful for
generating source maps afterwards.


[parser]: https://github.com/opal/opal/tree/master/lib/opal/potch
[transforms]: https://github.com/opal/opal/tree/master/lib/opal/compiler/transforms
[compiler]: https://github.com/opal/opal/tree/master/lib/opal/compiler/compiler.mjs
[fragments]: https://github.com/opal/opal/tree/master/lib/opal/compiler/fragment.mjs
[base-node]: https://github.com/opal/opal/tree/master/lib/opal/compiler/nodes/base.mjs
