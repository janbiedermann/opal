// Builds the low-level options struct parseWithMetadata()/lexWithMetadata()
// expect, from a plain JSON-ish description. Adapted from cmd.js's own
// buildOptions() (same project, same contract) so tests exercise exactly the
// path a real `--json-in` request goes through, instead of poking parser
// internals directly.

import {
  pm_options_line_set,
  pm_options_filepath_set,
  pm_options_encoding_set,
  pm_options_frozen_string_literal_set,
  pm_options_version_set,
  pm_options_partial_script_set,
  pm_options_main_script_set,
  pm_options_command_line_set,
  pm_options_scopes_init,
  pm_options_scope_init,
  pm_options_scope_forwarding_set,
  PM_OPTIONS_SCOPE_FORWARDING_POSITIONALS,
  PM_OPTIONS_SCOPE_FORWARDING_KEYWORDS,
  PM_OPTIONS_SCOPE_FORWARDING_BLOCK,
  PM_OPTIONS_SCOPE_FORWARDING_ALL,
} from "../../../../lib/opal/potch/options.mjs";

const FORWARDING_FLAGS = {
  "*": PM_OPTIONS_SCOPE_FORWARDING_POSITIONALS,
  "**": PM_OPTIONS_SCOPE_FORWARDING_KEYWORDS,
  "&": PM_OPTIONS_SCOPE_FORWARDING_BLOCK,
  "...": PM_OPTIONS_SCOPE_FORWARDING_ALL,
};

/**
 * @param {{filepath?, line?, encoding?, frozen_string_literal?, version?,
 *   partial_script?, main_script?, command_line?,
 *   scopes?: {locals?: string[], forwarding?: string[]}[]}} optsIn
 * @returns the options struct, or null if optsIn is null/omitted entirely.
 */
export function buildOptions(optsIn) {
  if (optsIn == null) return null;
  const options = {};
  if (optsIn.filepath != null) pm_options_filepath_set(options, optsIn.filepath);
  if (optsIn.line != null) pm_options_line_set(options, optsIn.line);
  if (optsIn.encoding != null) pm_options_encoding_set(options, optsIn.encoding);
  if (optsIn.frozen_string_literal != null) {
    pm_options_frozen_string_literal_set(options, optsIn.frozen_string_literal);
  }
  let versionOk = true;
  if (optsIn.version != null) {
    versionOk = pm_options_version_set(options, optsIn.version, optsIn.version.length);
  }
  if (optsIn.partial_script != null) pm_options_partial_script_set(options, optsIn.partial_script);
  if (optsIn.main_script != null) pm_options_main_script_set(options, optsIn.main_script);
  if (optsIn.command_line != null) pm_options_command_line_set(options, optsIn.command_line);
  if (Array.isArray(optsIn.scopes)) {
    pm_options_scopes_init(options, optsIn.scopes.length);
    optsIn.scopes.forEach((scopeSpec, index) => {
      const scope = options.scopes[index];
      const locals = Array.isArray(scopeSpec?.locals) ? scopeSpec.locals : [];
      pm_options_scope_init(scope, locals.length);
      locals.forEach((name, li) => {
        scope.locals[li] = name;
      });
      for (const fwd of scopeSpec?.forwarding ?? []) {
        const flag = FORWARDING_FLAGS[fwd];
        if (flag !== undefined) pm_options_scope_forwarding_set(scope, flag);
      }
    });
  }
  // Exposed so callers can tell an invalid --version string apart from one
  // that was simply never set (mirrors pm_options_version_set's own
  // true/false return - see src/options.js).
  options.__versionOk = versionOk;
  return options;
}

/**
 * The 1-indexed source line containing `offset`, given the envelope's
 * `offsets` (newline positions) and `start_line` (the `line:` option, or 1).
 * Mirrors Prism::Source#line / #find_line (lib/prism/parse_result.rb).
 */
export function lineForOffset(offsets, startLine, offset) {
  let index = offsets.findIndex((o) => o > offset);
  if (index === -1) index = offsets.length;
  return startLine + (index - 1);
}

/**
 * The 0-indexed byte column of `offset` from the start of its line. Mirrors
 * Prism::Location#column / Prism::Source#line_start (lib/prism/parse_result.rb).
 */
export function columnForOffset(offsets, offset) {
  let index = offsets.findIndex((o) => o > offset);
  if (index === -1) index = offsets.length;
  return offset - offsets[index - 1];
}

/** Breadth-first search for the first node of the given type in the tree. */
export function findNode(root, type) {
  return searchFirst(root, (node) => node.type === type);
}

/** Breadth-first search for the first node matching `predicate`. */
export function searchFirst(root, predicate) {
  const queue = [root];
  while (queue.length > 0) {
    const node = queue.shift();
    if (node == null || typeof node !== "object") continue;
    if (predicate(node)) return node;
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) queue.push(...value);
      else if (value && typeof value === "object") queue.push(value);
    }
  }
  return null;
}

/** Breadth-first search for every node matching `predicate`. */
export function searchAll(root, predicate) {
  const found = [];
  const queue = [root];
  while (queue.length > 0) {
    const node = queue.shift();
    if (node == null || typeof node !== "object") continue;
    if (predicate(node)) found.push(node);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) queue.push(...value);
      else if (value && typeof value === "object") queue.push(value);
    }
  }
  return found;
}
