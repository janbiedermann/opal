// The runner side of the toolchain: drill (exe/drill) runs programs on a
// runtime. Its option table and runner registry are here; its CLI core
// (cli.mjs) reuses the compiler's CLI class, and its command entry is the
// Ruby program lib/opal/exe/drill.rb, compiled into exe/drill like
// exe/ruby's lib/opal/exe/ruby.rb. The import direction is drill ->
// compiler (Builder, Compiler, the parser, the option machinery): nothing
// under lib/opal/compiler/ imports this directory.
export { DRILL_OPTIONS } from "./options.mjs";
export { RUNNERS as DRILL_RUNNERS } from "./runners/index.mjs";
