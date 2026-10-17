// Compiles a string of ruby code into javascript. Port of
// lib/opal/compiler.rb, using potch (lib/opal/potch) as the parser.
import { parseWithMetadata } from "../potch/index.mjs";
import { pm_options_filepath_set, pm_options_version_set } from "../potch/options.mjs";
import { Fragment, flatten, eachFragment, codeOf, lastFragment } from "./fragment.mjs";
import { sourceTextEncoding } from "./nodes/literal.mjs";
import { cleanpath } from "./helpers.mjs";
import { SourceMapFile } from "./source_map/file.mjs";
import { handlers } from "./nodes/base.mjs";
import { transform } from "./transforms/index.mjs";
import "./nodes/index.mjs";

// Generated code gets indented with two spaces on each scope
const INDENT = "  ";

const MAGIC_COMMENT_RE = /^# *(\w+) *: *(\S+.*?) *$/;
const EMACS_MAGIC_COMMENT_RE = /^# *-\*- *(\w+) *: *(\S+.*?) *-\*- *$/;

// Raised for parse errors and for errors found while compiling, with the
// file, line and source line it refers to (Opal::SyntaxError).
export class OpalSyntaxError extends SyntaxError {
  constructor(message, { file = null, line = null, column = null, sourceLine = null } = {}) {
    super(message);
    this.name = "OpalSyntaxError";
    this.file = file;
    this.line = line;
    this.column = column;
    this.sourceLine = sourceLine;
  }

  // "file:line:in `label'", as Opal::OpalBacktraceLocation#to_s
  get location() {
    let string = this.file || "(file)";
    if (this.line) string += `:${this.line}`;
    string += ":in ";
    string += this.sourceLine != null ? `\`${this.sourceLine}'` : "unknown";
    return string;
  }
}

// Compiler options: name -> { default, magicComment, validValues }.
const OPTIONS = {
  // The filename to use for compiling this code. Used for __FILE__ directives
  // as well as finding relative require()
  file: { default: "(file)" },
  // adds method stubs for all used methods in file
  method_missing: { default: true },
  // adds an arity check to every method definition
  arity_check: { default: false },
  // @deprecated: stubs out #freeze and #frozen?
  freezing: { default: true },
  // compile top level local vars with support for irb style vars
  irb: { default: false },
  // how to handle dynamic requires (error, warning, ignore)
  dynamic_require_severity: { default: "ignore", validValues: ["error", "warning", "ignore"] },
  // Prepare the code for future requires
  requirable: { default: false },
  // Instantly load a requirable module
  load: { default: false },
  // Encourage ESM semantics, eg. exporting run result
  esm: { default: false },
  // Don't export this compile, even if ESM mode is enabled.
  no_export: { default: false },
  // are operators compiled inline
  inline_operators: { default: true },
  eval: { default: false },
  // Adds source_location for every method definition
  enable_source_location: { default: false },
  // Embeds source code along compiled files
  enable_file_source_embed: { default: false },
  // Enables JavaScript's strict mode (i.e., adds 'use strict'; statement)
  use_strict: { default: false, magicComment: true },
  // Builds a JavaScript file that is aimed to reside as part of a directory
  // for an import map build or something similar.
  directory: { default: false },
  // Adds comments for every method definition
  parse_comments: { default: false },
  // Allows use of a backtick operator (and `%x{}`) to embed verbatim JavaScript.
  backtick_javascript: { default: false, magicComment: true },
  // Generates code for runtime use, only suitable for early runtime functions.
  opal_runtime_mode: { default: false, magicComment: true },
  // Caches fragments.
  cache_fragments: { default: false },
  // Whether dead code elimination will read this compile: with it off the
  // compiler emits no post-processor directives (see Builder#dce, which sets
  // both this and cache_fragments).
  dce: { default: false },
  scope_variables: { default: [] },
  // Enable async/await support and optionally enable auto-await.
  await: { default: false, magicComment: true },
  // ruby/spec support: filtered spec names and the mspec special calls
  rubyspec_filters: { default: null },
  rubyspec_specials: { default: false },
};


const PLAIN_TEMP_NAME = /^[\w$]*$/;

// `require path` (a compiler-made call, with a plain string argument).
function requireNode(path, location) {
  const string = { type: "StringNode", location, unescaped: path, flags: [], synthetic: true };
  const args = { type: "ArgumentsNode", location, arguments: [string], flags: [] };
  return { type: "CallNode", location, receiver: null, name: "require", arguments: args, block: null, flags: ["ignore_visibility"] };
}
export class Compiler {
  // Path without extension, normalized (Compiler.module_name).
  static moduleName(path) {
    const slash = path.lastIndexOf("/");
    const dir = slash === -1 ? "." : path.slice(0, slash) || "/";
    const base = path.slice(slash + 1).split(".")[0];
    return cleanpath(`${dir}/${base}`);
  }

  constructor(source, options = {}) {
    this.source = source;
    this.indentStr = "";
    this.uniqueCounter = 0;
    this.options = options instanceof Map ? Object.fromEntries(options) : { ...options };
    this.comments = new Map();
    this.caseStmt = null;
    this.methodCalls = new Set();
    this.optionValues = new Map();
    this.magicComments = {};
    this.dynamicCacheResult = false;
    this.scope = null;
    this.topScope = null;
    this.closureStack = [];
    this.requires = [];
    this.requiredTrees = [];
    this.autoloads = [];
    this.eofContent = null;
    this.whileLoop = null;
  }

  // Fetches and memoizes the value for an option.
  option(name) {
    if (this.optionValues.has(name)) return this.optionValues.get(name);

    const config = OPTIONS[name];
    let value = Object.prototype.hasOwnProperty.call(this.options, name) ? this.options[name] : config.default;

    if (config.magicComment && Object.prototype.hasOwnProperty.call(this.magicComments, name)) {
      value = this.magicComments[name];
    }

    if (config.validValues && !config.validValues.includes(value)) {
      throw new TypeError(`invalid value ${JSON.stringify(value)} for option ${name} (valid values: ${JSON.stringify(config.validValues)})`);
    }

    this.optionValues.set(name, value);
    return value;
  }

  get file() { return this.option("file"); }
  get isMethodMissing() { return this.option("method_missing"); }
  get isArityCheck() { return this.option("arity_check"); }
  get isIrb() { return this.option("irb"); }
  get dynamicRequireSeverity() { return this.option("dynamic_require_severity"); }
  get isRequirable() { return this.option("requirable"); }
  get isLoad() { return this.option("load"); }
  get isEsm() { return this.option("esm"); }
  get isNoExport() { return this.option("no_export"); }
  get isInlineOperators() { return this.option("inline_operators"); }
  get isEval() { return this.option("eval"); }
  get isEnableSourceLocation() { return this.option("enable_source_location"); }
  get isEnableFileSourceEmbed() { return this.option("enable_file_source_embed"); }
  get isUseStrict() { return this.option("use_strict"); }
  get isDirectory() { return this.option("directory"); }
  get isParseComments() { return this.option("parse_comments"); }
  get isBacktickJavascript() { return this.option("backtick_javascript"); }
  get isRuntimeMode() { return this.option("opal_runtime_mode"); }
  get isCacheFragments() { return this.option("cache_fragments"); }
  get isDce() { return this.option("dce"); }
  get scopeVariables() { return this.option("scope_variables"); }

  // Warn about impending compatibility break
  isBacktickJavascriptOrWarn() {
    const value = this.isBacktickJavascript;
    if (value === true) return true;
    if (value === false) return false;
    if (!this.backtickJavascriptWarned) {
      this.warning("Backtick operator usage interpreted as intent to embed JavaScript; this code will " +
        "break in Opal 2.0; add a magic comment: `# backtick_javascript: true`");
      this.backtickJavascriptWarned = true;
    }
    return true;
  }

  // Auto-await setting: false, true, or a RegExp of method names to await.
  get asyncAwait() {
    if (this.asyncAwaitValue !== undefined) return this.asyncAwaitValue;

    const original = this.option("await");
    let value;
    if (typeof original === "string") {
      value = asyncAwaitSetToRegexp(original.split(",").map((h) => h.trim()));
    } else if (Array.isArray(original) || original instanceof Set) {
      value = asyncAwaitSetToRegexp([...original].map(String));
    } else if (original instanceof RegExp || original === true || original === false) {
      value = original;
    } else {
      throw new TypeError("A value of await compiler option can be either a Set, an Array, a String or a Boolean.");
    }
    this.asyncAwaitValue = value;
    return value;
  }

  // The compiled fragment tree (nested arrays of fragments/directives).
  get fragmentTree() {
    if (this.fragmentTreeValue === undefined) {
      this.parse();
      this.fragmentTreeValue = this.reRaiseWithLocation(() => this.process(this.ast));
    }
    return this.fragmentTreeValue;
  }

  // The fragments of the compiled code as a flat list (made from the tree
  // on demand; compile and sourceMap work on the tree).
  get fragments() {
    if (this.fragmentsValue) return this.fragmentsValue;

    const fragments = flatten(this.fragmentTree);
    if (!fragments[fragments.length - 1].code.endsWith("\n")) {
      fragments.push(new Fragment("\n", null, null));
    }
    this.fragmentsValue = fragments;
    return fragments;
  }

  // For post-processors (DCE) replacing the fragments.
  set fragments(fragments) {
    this.result = null;
    this.fragmentsValue = fragments;
  }

  // The fragments of the compiled code for a single pass (the flat list,
  // or the tree, which adds a final newline as the list does): an object
  // with forEach(fn), see eachFragment.
  get fragmentSequence() {
    if (this.fragmentsValue) return this.fragmentsValue;
    const tree = this.fragmentTree;
    const finalNewline = this.needsFinalNewline();
    return {
      forEach(fn) {
        eachFragment(tree, fn);
        if (finalNewline) fn(new Fragment("\n", null, null));
      },
    };
  }

  // Does the fragment tree need a final newline (its last fragment's code
  // doesn't end with one)?
  needsFinalNewline() {
    const last = lastFragment(this.fragmentTree);
    return last === null || !last.code.endsWith("\n");
  }

  // Compile some ruby code to a string.
  compile() {
    if (this.result == null) {
      if (this.fragmentsValue) {
        let result = "";
        for (const fragment of this.fragmentsValue) result += fragment.code;
        this.result = result;
      } else {
        const tree = this.fragmentTree;
        this.result = codeOf(tree) + (this.needsFinalNewline() ? "\n" : "");
      }
    }
    return this.result;
  }

  // Returns a source map that can be used in the browser to map back to
  // original ruby code.
  get sourceMap() {
    return new SourceMapFile(this.fragmentSequence, this.file, this.source, this.compile());
  }

  parse() {
    const options = {};
    pm_options_filepath_set(options, this.file);
    pm_options_version_set(options, "4.0", 3);

    const envelope = parseWithMetadata(this.source, options);
    this.envelope = envelope;
    this.lineOffsets = envelope.offsets;

    if (envelope.errors.length > 0) {
      const error = envelope.errors[0];
      const line = this.lineOf({ location: error });
      throw new OpalSyntaxError(error.message, {
        file: this.file,
        line,
        column: this.columnOf(error.start),
        sourceLine: this.sourceLine(line),
      });
    }

    for (const warning of envelope.warnings) {
      if (warning.level === "default") this.warning(warning.message, this.lineOf({ location: warning }));
    }

    const program = envelope.ast;
    const body = program.statements.body;
    const firstNode = body.length > 0 ? body[0] : null;

    this.magicComments = this.parseMagicComments(firstNode, envelope.comments);
    this.eofContent = this.parseEofContent(envelope.data_loc);

    // A source in Shift_JIS or EUC-JP requires the corelib file of its
    // encoding first (its string literals are in that encoding).
    const textEncoding = sourceTextEncoding(this);
    if (textEncoding) body.unshift(requireNode(textEncoding.require, firstNode ? firstNode.location : { start: 0, end: 0 }));

    let kind = "main";
    if (this.isRequirable) kind = "require";
    else if (this.isEval) kind = "eval";

    // the file top level has no location, as s(:top) in the Ruby compiler
    this.ast = transform(this, { type: "OpalTop", location: null, body: program.statements, kind });
  }

  // Magic comment flags from the comments before the first line of code
  // (Opal::MagicComments.parse).
  parseMagicComments(firstNode, comments) {
    const flags = {};
    const firstLine = firstNode ? this.lineOf(firstNode) : null;

    for (const comment of comments) {
      if (firstLine && this.lineOf({ location: comment }) >= firstLine) continue;

      const text = this.source.slice(comment.start, comment.end).replace(/\r$/, "");
      const m = MAGIC_COMMENT_RE.exec(text) || EMACS_MAGIC_COMMENT_RE.exec(text);
      if (m) {
        const [, key, value] = m;
        flags[key] = value === "true" ? true : value === "false" ? false : value;
      }
    }

    return flags;
  }

  // Any content after __END__ (Opal::EofContent).
  parseEofContent(dataLoc) {
    if (!dataLoc) return null;
    const data = this.source.slice(dataLoc.start, dataLoc.end);
    const newline = data.indexOf("\n");
    return newline === -1 ? "" : data.slice(newline + 1);
  }

  // 1-based line of a node (or of anything with a `location`), or null.
  lineOf(node) {
    if (!node || !node.location) return null;
    return this.lineAt(node.location.start);
  }

  lineAt(offset) {
    const offsets = this.lineOffsets;
    let low = 0;
    let high = offsets.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if (offsets[mid] <= offset) low = mid;
      else high = mid - 1;
    }
    return low + 1;
  }

  // 0-based column (in UTF-16 code units) of an offset.
  columnOf(offset) {
    return offset - this.lineOffsets[this.lineAt(offset) - 1];
  }

  sourceLine(line) {
    const lines = this.source.split("\n");
    const text = lines[line - 1];
    return text == null ? null : text.trim();
  }

  // Any helpers required by this file. Used by the top node to reference
  // runtime helpers that are needed.
  get helpers() {
    this.helpersValue ??= new Set(
      String(this.magicComments.helpers || "").split(",").map((h) => h.trim()).filter((h) => h !== "")
    );
    return this.helpersValue;
  }

  recordMethodCall(mid) {
    this.methodCalls.add(mid);
  }

  // This is called when a parsing/processing error occurs.
  error(msg, line = null) {
    throw new OpalSyntaxError(msg, { file: this.file, line, sourceLine: line ? this.sourceLine(line) : null });
  }

  reRaiseWithLocation(fn) {
    try {
      return fn();
    } catch (error) {
      if (error instanceof OpalSyntaxError) throw error;
      const wrapped = new OpalSyntaxError(error.message, { file: this.file });
      wrapped.cause = error;
      throw wrapped;
    }
  }

  // This is called when a parsing/processing warning occurs.
  warning(msg, line = null) {
    const handler = this.options.warning;
    const text = `warning: ${msg} -- ${this.file}:${line == null ? "" : line}`;
    if (typeof handler === "function") handler(text);
    else console.warn(text);
  }

  get parserIndent() {
    return this.indentStr;
  }

  fragment(str, scope, node = null) {
    return new Fragment(str, scope, node);
  }

  // Used to generate a unique id name per file. These are used
  // mainly to name method bodies for methods that use blocks.
  uniqueTemp(name) {
    name = String(name);
    // (only names with operator characters need replacements)
    if (name !== "" && !PLAIN_TEMP_NAME.test(name)) {
      name = name
        .replaceAll("<=>", "$lt_eq_gt")
        .replaceAll("===", "$eq_eq_eq")
        .replaceAll("==", "$eq_eq")
        .replaceAll("=~", "$eq_tilde")
        .replaceAll("!~", "$excl_tilde")
        .replaceAll("!=", "$not_eq")
        .replaceAll("<=", "$lt_eq")
        .replaceAll(">=", "$gt_eq")
        .replaceAll("=", "$eq")
        .replaceAll("?", "$ques")
        .replaceAll("!", "$excl")
        .replaceAll("/", "$slash")
        .replaceAll("%", "$percent")
        .replaceAll("+", "$plus")
        .replaceAll("-", "$minus")
        .replaceAll("<", "$lt")
        .replaceAll(">", "$gt")
        .replace(/[^\w$]/gu, "$");
    }
    const unique = (this.uniqueCounter += 1);
    return `${name.startsWith("$") ? "" : "$"}${name}$${unique}`;
  }

  // Use the given helper
  helper(name) {
    this.helpers.add(name);
  }

  // To keep code blocks nicely indented, this will yield a block after
  // adding an extra layer of indent, and then returning the resulting
  // code after reverting the indent.
  indent(fn) {
    const indent = this.indentStr;
    this.indentStr += INDENT;
    const res = fn();
    this.indentStr = indent;
    return res;
  }

  // Temporary varibales will be needed from time to time in the
  // generated code, and this method will assign (or reuse) on
  // while the block is yielding, and queue it back up once it is
  // finished.
  withTemp(fn) {
    const tmp = this.scope.newTemp();
    const res = fn(tmp);
    this.scope.queueTemp(tmp);
    return res;
  }

  // Used when we enter a while statement. This pushes onto the current
  // scope's while stack so we know how to handle break, next etc.
  inWhile(fn) {
    this.whileLoop = this.scope.pushWhile();
    const result = fn();
    this.scope.popWhile();
    return result;
  }

  inCase(fn) {
    const old = this.caseStmt;
    this.caseStmt = {};
    fn();
    this.caseStmt = old;
  }

  // Returns true if the parser is curently handling a while node
  inWhileP() {
    return this.scope.inWhileP();
  }

  // Process the given node by creating a node instance, based on its type,
  // and compiling it to fragments.
  process(node, level = "expr") {
    if (node == null) return [this.fragment("", this.scope)];

    const Handler = handlers.get(node.type);
    if (!Handler) this.error(`Unsupported node: ${node.type}`, this.lineOf(node));
    return new Handler(node, level, this).compileToFragments();
  }

  trackRequire(mod) {
    this.requires.push(mod);
  }

  // The last statements in method bodies, for example, need to be returned
  // in the compiled javascript. Due to syntax differences between
  // javascript any ruby, some nodes need to be handled specially. For
  // example, `if` statemented cannot be returned in javascript, so
  // instead the "truthy" and "falsy" parts of the if statement both
  // need to be returned instead.
  //
  // Nodes that need to be returned are passed to this method, and the
  // altered/new nodes are returned and should be used instead.
  returns(node) {
    if (!node) return this.returns({ type: "NilNode", location: null });

    const s = (type, props) => ({ type, location: node.location, ...props });

    switch (node.type) {
      case "UndefNode":
        // undef :method_name always returns nil
        return this.returns(s("OpalBegin", { body: [node, s("NilNode", {})] }));
      case "BreakNode":
      case "NextNode":
      case "RedoNode":
      case "RetryNode":
        return node;
      case "YieldNode":
        return s("OpalReturnableYield", { yield: node });
      case "StatementsNode":
        if (node.body.length === 1) return this.returns(node.body[0]);
        return returnsLast(this, node, "body");
      case "OpalBegin":
      case "OpalKwbegin":
        return returnsLast(this, node, "body");
      case "ParenthesesNode": {
        const body = node.body && node.body.type === "StatementsNode" ? node.body.body : node.body ? [node.body] : [];
        return returnsLast(this, s("OpalBegin", { body }), "body");
      }
      case "OpalRescue":
        return {
          ...node,
          body: this.returns(node.body),
          resbodies: node.resbodies.map((resbody) => this.returns(resbody)),
          elseBody: node.elseBody && this.returns(node.elseBody),
        };
      case "OpalResbody":
        return { ...node, body: this.returns(node.body) };
      case "OpalEnsure":
        return s("OpalJsReturn", { value: { ...node, body: this.returns(node.body) } });
      case "WhileNode":
      case "UntilNode":
      case "ReturnNode":
      case "OpalJsReturn":
      case "OpalReturnableYield":
        return node;
      case "XStringNode":
      case "InterpolatedXStringNode":
        if (this.isBacktickJavascriptOrWarn()) return { ...node, returning: true };
        return node;
      case "OpalIf":
        return { ...node, trueBody: this.returns(node.trueBody), falseBody: this.returns(node.falseBody), returning: true };
      case "CallNode":
        if (!node.receiver && node.name === "debugger" && !node.arguments && !node.block) {
          // debugger is a statement, so it doesn't return a value
          // and returning it is invalid. Therefore we update it
          // to do `debugger; return nil`.
          return s("OpalBegin", { body: [node, s("OpalJsReturn", { value: s("NilNode", {}) })] });
        }
        return s("OpalJsReturn", { value: node });
      default:
        return s("OpalJsReturn", { value: node });
    }
  }

  // The comment lines directly before a node (for the parse_comments
  // option): the comments with nothing but whitespace between them and
  // the node.
  commentsBefore(node) {
    const comments = this.envelope.comments;
    const out = [];
    let pos = node.location.start;
    for (let i = comments.length - 1; i >= 0; i--) {
      const comment = comments[i];
      if (comment.end > pos) continue;
      if (this.source.slice(comment.end, pos).trim() !== "") break;
      out.unshift(this.source.slice(comment.start, comment.end).replace(/\r$/, ""));
      pos = comment.start;
    }
    return out;
  }

  handleBlockGivenCall(node) {
    this.scope.usesBlock();
    if (this.scope.blockName) {
      return this.fragment(`(${this.scope.blockName} !== nil)`, this.scope, node);
    }
    const scope = this.scope.findParentDef();
    if (scope && scope.blockName) {
      return this.fragment(`(${scope.blockName} !== nil)`, this.scope, node);
    }
    return this.fragment("false", this.scope, node);
  }
}

// A begin-like node with its last statement returned (or `return nil`
// when it is empty).
function returnsLast(compiler, node, key) {
  const list = node[key];
  const body = list.slice(0, -1);
  body.push(compiler.returns(list.length > 0 ? list[list.length - 1] : null));
  return { ...node, [key]: body };
}

function asyncAwaitSetToRegexp(set) {
  const pattern = set
    .map((name) => String(name).replace(/[.*+?^${}()|[\]\\/-]/g, "\\$&").replaceAll("\\*", ".*?"))
    .join("|");
  return new RegExp(`^(${pattern})$`);
}

export { cleanpath };
