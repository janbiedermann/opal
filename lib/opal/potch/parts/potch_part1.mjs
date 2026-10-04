// prism.c lines 1-1930 converted to JavaScript (ES2022).
//
// This is a plain fragment: it declares consts/functions only, no
// import/export. It relies on sibling modules being concatenated/imported
// around it.
//
// Adaptation notes for the integrator:
// - C pointers into parser->source are numeric offsets; dereferences index
//   parser.source.
// - pm_diagnostic_list_append_format receives "%.*s" arguments as TWO JS
//   arguments: (length, string), matching the printf-style formatter.
// - Encoding callbacks are called as fn(parser.source, offset, n).
// - char_is_identifier_utf8 takes (source, b, n): it has no parser parameter
//   in C, so the source buffer is passed explicitly.
// - token_is_setter_name takes (parser, token) so it can read the trailing
//   '=' byte from parser.source.
// - pm_local_is_keyword takes (source, length) where source is the JS string
//   holding the content (C took a bare char *).
// - pm_parser_constant_id_owned takes (parser, bytes, length) where bytes is
//   a JS string whose first `length` code units hold the content (pointer
//   analog; may be a view into parser.source or a standalone buffer).
// - debug_state/debug_lex_state_set (C's PM_DEBUG_LOGGING helpers) had zero
//   callers and were removed rather than ported as dead code.
// - xmalloc/xcalloc failures cannot happen in JS; those branches vanish and
//   allocation-returning functions just build objects.
// - asserts are debug-only in C and are omitted.
//
// Struct shapes referenced below (documented, not declared):
// - pm_arguments_t := {
//       opening_loc: { start, end },
//       arguments: pm_arguments_node_t | null,
//       closing_loc: { start, end },
//       block: pm_block_node_t | null,
//       has_forwarding: boolean
//   }
// - pm_lex_mode_t := { mode, as: { string|regexp|list variant fields, other
//   variants null } } where e.g. as.list := { nesting, interpolation,
//   incrementor, terminator, breakpoints: number[] }.
// - parser.lex_modes := { stack: pm_lex_mode_t[], current } - a plain,
//   unbounded array stack; see lex_mode_push/_pop in this file.

/******************************************************************************/
/* Version                                                                    */
/******************************************************************************/

// #define PRISM_VERSION "1.9.0" (include/prism/version.h)
const PRISM_VERSION = "1.9.0";

/**
 * The prism version and the serialization format.
 */
function pm_version() {
    return PRISM_VERSION;
}

/**
 * In heredocs, tabs automatically complete up to the next 8 spaces. This is
 * defined in CRuby as TAB_WIDTH.
 */
const PM_TAB_WHITESPACE_SIZE = 8;

// Macros for min/max.

/******************************************************************************/
/* Helpful AST-related macros                                                 */
/******************************************************************************/

function FL(node, flags) { node.flags |= flags; }

// UP(node) upcasts are no-ops in JS and have been inlined away.
function PM_NODE_START(node) { return node.location.start; }
function PM_NODE_END(node) { return node.location.end; }

function PM_LOCATION_NULL_VALUE(parser) { return { start: parser.start, end: parser.start }; }
// PM_LOCATION_TOKEN_VALUE is imported from ast.js (see the module's own
// export) rather than redefined here - the two were byte-for-byte
// identical, `{ start: token.start, end: token.end }`, once inlined.
// PM_LOCATION_NODE_VALUE is intentionally NOT deduplicated the same way:
// ast.js's export returns `node.location` itself (an alias), while this
// one below returns a fresh `{ start, end }` copy. The 3 call sites here
// assign the result directly to a `name_loc` field on a newly-created
// node, so aliasing the original node's `.location` would let a later
// mutation of that node's location silently corrupt the copy's
// `name_loc` too - a real behavior difference, not just a style one.
function PM_LOCATION_NODE_VALUE(node) { return { start: PM_NODE_START(node), end: PM_NODE_END(node) }; }

// Snapshot a token into a fresh { type, start, end } object (many call sites
// copy parser.previous/parser.current because later code mutates them).
function copyToken(token) {
    return { type: token.type, start: token.start, end: token.end };
}

// Value-copy of a pm_constant_id_list_t (C struct assignment).
function pm_constant_id_list_copy(list) {
    return list.slice();
}

// A binary operator's constant id, trimmed of the trailing `=` (C: the
// `operator.end - 1` location shared by every *_write_node_create).
function pm_operator_token_id(parser, operator) {
    return pm_parser_constant_id_location(parser, operator.start, operator.end - 1);
}
function PM_OPTIONAL_LOCATION_TOKEN_VALUE(token) { return token.type === PM_TOKEN_NOT_PROVIDED ? { start: null, end: null } : PM_LOCATION_TOKEN_VALUE(token); }

/******************************************************************************/
/* Lex mode manipulations                                                     */
/******************************************************************************/

/**
 * Returns the incrementor character that should be used to increment the
 * nesting count if one is possible.
 */
function lex_mode_incrementor(start) {
    return (start === 40 || start === 91 || start === 123 || start === 60) ? start : 0;
}

/**
 * Returns the matching character that should be used to terminate a list
 * beginning with the given character.
 */
function lex_mode_terminator(start) {
    return ({ 40: 41, 91: 93, 123: 125, 60: 62 })[start] ?? start;
}

// A parser's lex-mode stack (parser.lex_modes) is `{ stack: [...], current }`:
// a plain, unbounded array plus a cached reference to its top entry.
//
// Deviation: C preallocates a fixed-size array (PM_LEX_STACK_SIZE slots) and
// falls back to a manually-linked heap chain (each lex_mode carrying a `prev`
// pointer) once that's exhausted, since C arrays can't grow. A JS array has
// no such limit, so there's only one code path, and `prev` (only ever used
// to unwind that overflow chain) is unnecessary.

/**
 * Push a new lex state onto the stack.
 */
function lex_mode_push(parser, lex_mode) {
    parser.lex_modes.stack.push(lex_mode);
    parser.lex_modes.current = lex_mode;
}

/**
 * Push on a new list lex mode.
 */
function lex_mode_push_list(parser, interpolation, delimiter) {
    const incrementor = lex_mode_incrementor(delimiter);
    const terminator = lex_mode_terminator(delimiter);

    // These are the places where we need to split up the content of the list.
    // We'll use strpbrk to find the first of these characters. (0, the NUL
    // sentinel, is always a breakpoint - an embedded NUL byte ends content.)
    const breakpoints = [92, 32, 9, 12, 13, 11, 10, 0]; // \ SP \t \f \r \v \n NUL

    // Now we'll add the terminator to the list of breakpoints. If the
    // terminator is not already a NULL byte, add it to the list.
    if (terminator !== 0) {
        breakpoints.push(terminator);
    }

    // If interpolation is allowed, then we're going to check for the #
    // character. Otherwise we'll only look for escapes and the terminator.
    if (interpolation) {
        breakpoints.push(35); // '#'
    }

    // If there is an incrementor, then we'll check for that as well.
    if (incrementor !== 0) {
        breakpoints.push(incrementor);
    }

    const lex_mode = {
        mode: PM_LEX_LIST,
        as: {
            string: null,
            regexp: null,
            list: {
                nesting: 0,
                interpolation: interpolation,
                incrementor: incrementor,
                terminator: terminator,
                breakpoints
            }
        }
    };

    parser.explicit_encoding = null;
    lex_mode_push(parser, lex_mode);
}

/**
 * Push on a new list lex mode that is only used for compatibility. This is
 * called when we're at the end of the file. We want the parser to be able to
 * perform its normal error tolerance.
 */
function lex_mode_push_list_eof(parser) {
    lex_mode_push_list(parser, false, 0);
}

/**
 * Push on a new regexp lex mode.
 */
function lex_mode_push_regexp(parser, incrementor, terminator) {
    // These are the places where we need to split up the content of the
    // regular expression. We'll use strpbrk to find the first of these
    // characters. (0, the NUL sentinel, is always a breakpoint.)
    const breakpoints = [13, 10, 92, 35, 0]; // \r \n \ # NUL

    // First we'll add the terminator.
    if (terminator !== 0) {
        breakpoints.push(terminator);
    }

    // Next, if there is an incrementor, then we'll check for that as well.
    if (incrementor !== 0) {
        breakpoints.push(incrementor);
    }

    const lex_mode = {
        mode: PM_LEX_REGEXP,
        as: {
            string: null,
            list: null,
            regexp: {
                nesting: 0,
                incrementor: incrementor,
                terminator: terminator,
                breakpoints
            }
        }
    };

    parser.explicit_encoding = null;
    lex_mode_push(parser, lex_mode);
}

/**
 * Push on a new string lex mode.
 */
function lex_mode_push_string(parser, interpolation, label_allowed, incrementor, terminator) {
    // These are the places where we need to split up the content of the
    // string. We'll use strpbrk to find the first of these characters.
    // (0, the NUL sentinel, is always a breakpoint.)
    const breakpoints = [13, 10, 92, 0]; // \r \n \ NUL

    // Now add in the terminator. If the terminator is not already a NULL byte,
    // then we'll add it.
    if (terminator !== 0) {
        breakpoints.push(terminator);
    }

    // If interpolation is allowed, then we're going to check for the #
    // character. Otherwise we'll only look for escapes and the terminator.
    if (interpolation) {
        breakpoints.push(35); // '#'
    }

    // If we have an incrementor, then we'll add that in as a breakpoint as
    // well.
    if (incrementor !== 0) {
        breakpoints.push(incrementor);
    }

    const lex_mode = {
        mode: PM_LEX_STRING,
        as: {
            list: null,
            regexp: null,
            string: {
                nesting: 0,
                interpolation: interpolation,
                label_allowed: label_allowed,
                incrementor: incrementor,
                terminator: terminator,
                breakpoints
            }
        }
    };

    parser.explicit_encoding = null;
    lex_mode_push(parser, lex_mode);
}

/**
 * Push on a new string lex mode that is only used for compatibility. This is
 * called when we're at the end of the file. We want the parser to be able to
 * perform its normal error tolerance.
 */
function lex_mode_push_string_eof(parser) {
    lex_mode_push_string(parser, false, false, 0, 0);
}

/**
 * Pop the current lex state off the stack. The bottom-most (initial) entry
 * is never actually removed - popping past it just resets its mode back to
 * default, matching the C original's "can't pop below the base" guard.
 */
function lex_mode_pop(parser) {
    if (parser.lex_modes.stack.length === 1) {
        parser.lex_modes.current.mode = PM_LEX_DEFAULT;
    } else {
        parser.lex_modes.stack.pop();
        parser.lex_modes.current = parser.lex_modes.stack[parser.lex_modes.stack.length - 1];
    }
}

/**
 * This is the equivalent of IS_lex_state is CRuby.
 */
function lex_state_p(parser, state) {
    return (parser.lex_state & state) !== 0;
}

// pm_ignored_newline_type_t
const PM_IGNORED_NEWLINE_NONE = 0;
const PM_IGNORED_NEWLINE_ALL = 1;
const PM_IGNORED_NEWLINE_PATTERN = 2;

function lex_state_ignored_p(parser) {
    const ignored = lex_state_p(parser, PM_LEX_STATE_BEG | PM_LEX_STATE_CLASS | PM_LEX_STATE_FNAME | PM_LEX_STATE_DOT) && !lex_state_p(parser, PM_LEX_STATE_LABELED);

    if (ignored) {
        return PM_IGNORED_NEWLINE_ALL;
    } else if ((parser.lex_state & ~PM_LEX_STATE_LABEL) === (PM_LEX_STATE_ARG | PM_LEX_STATE_LABELED)) {
        return PM_IGNORED_NEWLINE_PATTERN;
    } else {
        return PM_IGNORED_NEWLINE_NONE;
    }
}

function lex_state_beg_p(parser) {
    return lex_state_p(parser, PM_LEX_STATE_BEG_ANY) || ((parser.lex_state & (PM_LEX_STATE_ARG | PM_LEX_STATE_LABELED)) === (PM_LEX_STATE_ARG | PM_LEX_STATE_LABELED));
}

function lex_state_arg_p(parser) {
    return lex_state_p(parser, PM_LEX_STATE_ARG_ANY);
}

function lex_state_spcarg_p(parser, space_seen) {
    if (parser.current.end >= parser.end) {
        return false;
    }
    return lex_state_arg_p(parser) && space_seen && !pm_char_is_whitespace((parser.source.charCodeAt(parser.current.end)));
}

function lex_state_end_p(parser) {
    return lex_state_p(parser, PM_LEX_STATE_END_ANY);
}

/**
 * This is the equivalent of IS_AFTER_OPERATOR in CRuby.
 */
function lex_state_operator_p(parser) {
    return lex_state_p(parser, PM_LEX_STATE_FNAME | PM_LEX_STATE_DOT);
}

/**
 * Set the state of the lexer. This is defined as a function to be able to put a
 * breakpoint in it.
 */
function lex_state_set(parser, state) {
    parser.lex_state = state;
}

/******************************************************************************/
/* Command-line macro helpers                                                 */
/******************************************************************************/

/** True if the parser has the given command-line option. */
function PM_PARSER_COMMAND_LINE_OPTION(parser, option) { return (parser.command_line & option) !== 0; }

/** True if the -a command line option was given. */
function PM_PARSER_COMMAND_LINE_OPTION_A(parser) { return PM_PARSER_COMMAND_LINE_OPTION(parser, PM_OPTIONS_COMMAND_LINE_A); }

/** True if the -e command line option was given. */
function PM_PARSER_COMMAND_LINE_OPTION_E(parser) { return PM_PARSER_COMMAND_LINE_OPTION(parser, PM_OPTIONS_COMMAND_LINE_E); }

/** True if the -l command line option was given. */
function PM_PARSER_COMMAND_LINE_OPTION_L(parser) { return PM_PARSER_COMMAND_LINE_OPTION(parser, PM_OPTIONS_COMMAND_LINE_L); }

/** True if the -n command line option was given. */
function PM_PARSER_COMMAND_LINE_OPTION_N(parser) { return PM_PARSER_COMMAND_LINE_OPTION(parser, PM_OPTIONS_COMMAND_LINE_N); }

/** True if the -p command line option was given. */
function PM_PARSER_COMMAND_LINE_OPTION_P(parser) { return PM_PARSER_COMMAND_LINE_OPTION(parser, PM_OPTIONS_COMMAND_LINE_P); }

/** True if the -x command line option was given. */
function PM_PARSER_COMMAND_LINE_OPTION_X(parser) { return PM_PARSER_COMMAND_LINE_OPTION(parser, PM_OPTIONS_COMMAND_LINE_X); }

/******************************************************************************/
/* Diagnostic-related functions                                               */
/******************************************************************************/

/**
 * Append an error to the list of errors on the parser.
 */
function pm_parser_err(parser, start, end, diag_id) {
    pm_diagnostic_list_append(parser.error_list, start, end, diag_id);
}

/**
 * Append an error to the list of errors on the parser using a format string.
 * Format arguments follow the "%.*s => (length, Uint8ArrayView)" convention.
 */
function PM_PARSER_ERR_FORMAT(parser, start, end, diag_id, ...args) {
    pm_diagnostic_list_append_format(parser.error_list, start, end, diag_id, ...args);
}

/**
 * Append an error to the list of errors on the parser using the location of the
 * current token.
 */
function pm_parser_err_current(parser, diag_id) {
    pm_parser_err(parser, parser.current.start, parser.current.end, diag_id);
}

/**
 * Append an error to the list of errors on the parser using the given location
 * using a format string.
 */
function PM_PARSER_ERR_LOCATION_FORMAT(parser, location, diag_id, ...args) {
    PM_PARSER_ERR_FORMAT(parser, location.start, location.end, diag_id, ...args);
}

/**
 * Append an error to the list of errors on the parser using the location of the
 * given node.
 */
function pm_parser_err_node(parser, node, diag_id) {
    pm_parser_err(parser, node.location.start, node.location.end, diag_id);
}

/**
 * Append an error to the list of errors on the parser using the location of the
 * given node and a format string.
 */
function PM_PARSER_ERR_NODE_FORMAT(parser, node, diag_id, ...args) {
    PM_PARSER_ERR_FORMAT(parser, node.location.start, node.location.end, diag_id, ...args);
}

/**
 * Append an error to the list of errors on the parser using the location of the
 * given node and a format string, and add on the content of the node.
 */
function PM_PARSER_ERR_NODE_FORMAT_CONTENT(parser, node, diag_id) {
    PM_PARSER_ERR_NODE_FORMAT(parser, node, diag_id, node.location.end - node.location.start, parser.source.slice(node.location.start, node.location.end));
}

/**
 * Append an error to the list of errors on the parser using the location of the
 * previous token.
 */
function pm_parser_err_previous(parser, diag_id) {
    pm_parser_err(parser, parser.previous.start, parser.previous.end, diag_id);
}

/**
 * Append an error to the list of errors on the parser using the location of the
 * given token.
 */
function pm_parser_err_token(parser, token, diag_id) {
    pm_parser_err(parser, token.start, token.end, diag_id);
}

/**
 * Append an error to the list of errors on the parser using the location of the
 * given token and a format string.
 */
function PM_PARSER_ERR_TOKEN_FORMAT(parser, token, diag_id, ...args) {
    PM_PARSER_ERR_FORMAT(parser, token.start, token.end, diag_id, ...args);
}

/**
 * Append an error to the list of errors on the parser using the location of the
 * given token and a format string, and add on the content of the token.
 */
function PM_PARSER_ERR_TOKEN_FORMAT_CONTENT(parser, token, diag_id) {
    PM_PARSER_ERR_TOKEN_FORMAT(parser, token, diag_id, token.end - token.start, parser.source.slice(token.start, token.end));
}

/**
 * Append a warning to the list of warnings on the parser.
 */
function pm_parser_warn(parser, start, end, diag_id) {
    pm_diagnostic_list_append(parser.warning_list, start, end, diag_id);
}

/**
 * Append a warning to the list of warnings on the parser using the location of
 * the given token.
 */
function pm_parser_warn_token(parser, token, diag_id) {
    pm_parser_warn(parser, token.start, token.end, diag_id);
}

/**
 * Append a warning to the list of warnings on the parser using the location of
 * the given node.
 */
function pm_parser_warn_node(parser, node, diag_id) {
    pm_parser_warn(parser, node.location.start, node.location.end, diag_id);
}

/**
 * Append a warning to the list of warnings on the parser using a format string.
 */
function PM_PARSER_WARN_FORMAT(parser, start, end, diag_id, ...args) {
    pm_diagnostic_list_append_format(parser.warning_list, start, end, diag_id, ...args);
}

/**
 * Append a warning to the list of warnings on the parser using the location of
 * the given token and a format string.
 */
function PM_PARSER_WARN_TOKEN_FORMAT(parser, token, diag_id, ...args) {
    PM_PARSER_WARN_FORMAT(parser, token.start, token.end, diag_id, ...args);
}

/**
 * Append a warning to the list of warnings on the parser using the location of
 * the given token and a format string, and add on the content of the token.
 */
function PM_PARSER_WARN_TOKEN_FORMAT_CONTENT(parser, token, diag_id) {
    PM_PARSER_WARN_TOKEN_FORMAT(parser, token, diag_id, token.end - token.start, parser.source.slice(token.start, token.end));
}

/**
 * Append a warning to the list of warnings on the parser using the location of
 * the given node and a format string.
 */
function PM_PARSER_WARN_NODE_FORMAT(parser, node, diag_id, ...args) {
    PM_PARSER_WARN_FORMAT(parser, node.location.start, node.location.end, diag_id, ...args);
}

/**
 * Add an error for an expected heredoc terminator. This is a special function
 * only because it grabs its location off of a lex mode instead of a node or a
 * token.
 */
function pm_parser_err_heredoc_term(parser, ident_start, ident_length) {
    PM_PARSER_ERR_FORMAT(
        parser,
        ident_start,
        ident_start + ident_length,
        PM_ERR_HEREDOC_TERM,
        ident_length,
        parser.source.slice(ident_start, ident_start + ident_length)
    );
}

/******************************************************************************/
/* Scope-related functions                                                    */
/******************************************************************************/

/**
 * Allocate and initialize a new scope. Push it onto the scope stack.
 *
 * pm_scope_t shape:
 *   { previous, locals: Map<constant_id, { location, reads }>,
 *     parameters, implicit_parameters: { size, capacity, nodes: [] },
 *     shareable_constant, closed }
 */
function pm_parser_scope_push(parser, closed) {
    const scope = {
        previous: parser.current_scope,
        locals: new Map(),
        parameters: PM_SCOPE_PARAMETERS_NONE,
        implicit_parameters: [],
        shareable_constant: parser.current_scope === null ? PM_SCOPE_SHAREABLE_CONSTANT_NONE : parser.current_scope.shareable_constant,
        closed: closed
    };

    parser.current_scope = scope;
}

/**
 * Determine if the current scope is at the top level. This means it is either
 * the top-level scope or it is open to the top-level.
 */
function pm_parser_scope_toplevel_p(parser) {
    let scope = parser.current_scope;

    do {
        if (scope.previous === null) return true;
        if (scope.closed) return false;
    } while ((scope = scope.previous) !== null);

    return true;
}

/**
 * Retrieve the scope at the given depth.
 */
function pm_parser_scope_find(parser, depth) {
    let scope = parser.current_scope;

    while (depth-- > 0) {
        scope = scope.previous;
    }

    return scope;
}

// pm_scope_forwarding_param_check_result_t
const PM_SCOPE_FORWARDING_PARAM_CHECK_RESULT_PASS = 0;
const PM_SCOPE_FORWARDING_PARAM_CHECK_RESULT_CONFLICT = 1;
const PM_SCOPE_FORWARDING_PARAM_CHECK_RESULT_FAIL = 2;

function pm_parser_scope_forwarding_param_check(parser, mask) {
    let scope = parser.current_scope;
    let conflict = false;

    while (scope !== null) {
        if ((scope.parameters & mask) !== 0) {
            if (scope.closed) {
                if (conflict) {
                    return PM_SCOPE_FORWARDING_PARAM_CHECK_RESULT_CONFLICT;
                } else {
                    return PM_SCOPE_FORWARDING_PARAM_CHECK_RESULT_PASS;
                }
            }

            conflict = true;
        }

        if (scope.closed) break;
        scope = scope.previous;
    }

    return PM_SCOPE_FORWARDING_PARAM_CHECK_RESULT_FAIL;
}

function pm_parser_scope_forwarding_block_check(parser, token) {
    switch (pm_parser_scope_forwarding_param_check(parser, PM_SCOPE_PARAMETERS_FORWARDING_BLOCK)) {
        case PM_SCOPE_FORWARDING_PARAM_CHECK_RESULT_PASS:
            // Pass.
            break;
        case PM_SCOPE_FORWARDING_PARAM_CHECK_RESULT_CONFLICT:
            pm_parser_err_token(parser, token, PM_ERR_ARGUMENT_CONFLICT_AMPERSAND);
            break;
        case PM_SCOPE_FORWARDING_PARAM_CHECK_RESULT_FAIL:
            pm_parser_err_token(parser, token, PM_ERR_ARGUMENT_NO_FORWARDING_AMPERSAND);
            break;
    }
}

function pm_parser_scope_forwarding_positionals_check(parser, token) {
    switch (pm_parser_scope_forwarding_param_check(parser, PM_SCOPE_PARAMETERS_FORWARDING_POSITIONALS)) {
        case PM_SCOPE_FORWARDING_PARAM_CHECK_RESULT_PASS:
            // Pass.
            break;
        case PM_SCOPE_FORWARDING_PARAM_CHECK_RESULT_CONFLICT:
            pm_parser_err_token(parser, token, PM_ERR_ARGUMENT_CONFLICT_STAR);
            break;
        case PM_SCOPE_FORWARDING_PARAM_CHECK_RESULT_FAIL:
            pm_parser_err_token(parser, token, PM_ERR_ARGUMENT_NO_FORWARDING_STAR);
            break;
    }
}

function pm_parser_scope_forwarding_all_check(parser, token) {
    switch (pm_parser_scope_forwarding_param_check(parser, PM_SCOPE_PARAMETERS_FORWARDING_ALL)) {
        case PM_SCOPE_FORWARDING_PARAM_CHECK_RESULT_PASS:
            // Pass.
            break;
        case PM_SCOPE_FORWARDING_PARAM_CHECK_RESULT_CONFLICT:
            // This shouldn't happen, because ... is not allowed in the
            // declaration of blocks. If we get here, we assume we already have
            // an error for this.
            break;
        case PM_SCOPE_FORWARDING_PARAM_CHECK_RESULT_FAIL:
            pm_parser_err_token(parser, token, PM_ERR_ARGUMENT_NO_FORWARDING_ELLIPSES);
            break;
    }
}

function pm_parser_scope_forwarding_keywords_check(parser, token) {
    switch (pm_parser_scope_forwarding_param_check(parser, PM_SCOPE_PARAMETERS_FORWARDING_KEYWORDS)) {
        case PM_SCOPE_FORWARDING_PARAM_CHECK_RESULT_PASS:
            // Pass.
            break;
        case PM_SCOPE_FORWARDING_PARAM_CHECK_RESULT_CONFLICT:
            pm_parser_err_token(parser, token, PM_ERR_ARGUMENT_CONFLICT_STAR_STAR);
            break;
        case PM_SCOPE_FORWARDING_PARAM_CHECK_RESULT_FAIL:
            pm_parser_err_token(parser, token, PM_ERR_ARGUMENT_NO_FORWARDING_STAR_STAR);
            break;
    }
}

/**
 * Get the current state of constant shareability.
 */
function pm_parser_scope_shareable_constant_get(parser) {
    return parser.current_scope.shareable_constant;
}

/**
 * Set the current state of constant shareability. We'll set it on all of the
 * open scopes so that reads are quick.
 */
function pm_parser_scope_shareable_constant_set(parser, shareable_constant) {
    let scope = parser.current_scope;

    do {
        scope.shareable_constant = shareable_constant;
    } while (!scope.closed && (scope = scope.previous) !== null);
}

/******************************************************************************/
/* Local variable-related functions                                           */
/******************************************************************************/

// A scope's set of locals is a `Map` from constant id to `{ location, reads }`.
//
// Deviation: the C implementation is a dual list/open-addressing-hashtable
// hybrid (switching representation above PM_LOCALS_HASH_THRESHOLD entries,
// with a hand-mixed hash function and linear probing) because C has no
// built-in associative array. A JS `Map` already provides O(1) lookup and
// preserves insertion order natively, which is exactly what `pm_locals_order`
// below needs (the C version reconstructs declaration order from a stored
// `index` field precisely because its hashtable's iteration order isn't
// meaningful; a `Map`'s iteration order already *is* declaration order, so no
// such field is needed here).

/**
 * Add a new local to the set of locals.
 *
 * @param locals The set of locals to add to.
 * @param name The name of the local.
 * @param start The source location that represents the start of the local. This
 *   is used for the location of the warning in case this local is not read.
 * @param end The source location that represents the end of the local. This is
 *   used for the location of the warning in case this local is not read.
 * @param reads The initial number of reads for this local. Usually this is set
 *   to 0, but for some locals (like parameters) we want to initialize it with
 *   1 so that we never warn on unused parameters.
 * @return True if the local was added, and false if the local already exists.
 */
function pm_locals_write(locals, name, start, end, reads) {
    if (locals.has(name)) return false;
    locals.set(name, { location: { start, end }, reads });
    return true;
}

/**
 * Called when a variable is read in a certain lexical context. Tracks the read
 * by adding to the reads count.
 */
function pm_locals_read(locals, name) {
    locals.get(name).reads++;
}

/**
 * Called when a variable read is transformed into a variable write, because a
 * write operator is found after the variable name.
 */
function pm_locals_unread(locals, name) {
    locals.get(name).reads--;
}

/**
 * Returns the current number of reads for a local variable.
 */
function pm_locals_reads(locals, name) {
    return locals.get(name).reads;
}

/**
 * Write out the locals into the given list of constant ids in the correct
 * order. This is used to set the list of locals on the nodes in the tree once
 * we're sure no additional locals will be added to the set.
 *
 * This function is also responsible for warning when a local variable has been
 * written but not read in certain contexts.
 */
function pm_locals_order(parser, locals, toplevel) {
    const list = [];

    // We will only warn for unused variables if we're not at the top level, or
    // if we're parsing a file outside of eval or -e.
    const warn_unused = !toplevel || (!parser.parsing_eval && !(parser.command_line & PM_OPTIONS_COMMAND_LINE_E));

    // UNI-BUILD deviation: C's pm_locals_order walks its open-addressing
    // locals table (src/prism.c), so it emits the unused-local warnings in
    // hash-slot order while rebuilding the constant-id list in insertion order
    // via pm_constant_id_list_insert. A JS Map is already insertion-ordered, so
    // the emitted `locals` list matches C exactly, but the warnings come out in
    // insertion order instead - a difference that only appears once a scope's
    // locals table has grown into C's hash mode (7+ locals). Deliberately not
    // "fixed": matching it would mean restoring the hash table this build
    // removed. Covered by test/prism/result/warnings_test.rb's
    // test_unused_local_variables_order, which pins the set, not the order.
    for (const [name, local] of locals) {
        pm_constant_id_list_append(list, name);

        if (warn_unused && local.reads === 0 && ((parser.start_line >= 0) || (pm_newline_list_line(parser.newline_list, local.location.start, parser.start_line) >= 0))) {
            const constant = pm_constant_pool_id_to_constant(parser.constant_pool, name);

            if (constant.length >= 1 && constant.start[0] !== '_') {
                PM_PARSER_WARN_FORMAT(
                    parser,
                    local.location.start,
                    local.location.end,
                    PM_WARN_UNUSED_LOCAL_VARIABLE,
                    constant.length,
                    constant.start
                );
            }
        }
    }

    return list;
}

/******************************************************************************/
/* Node-related functions                                                     */
/******************************************************************************/

/**
 * Retrieve the constant pool id for the given location.
 */
function pm_parser_constant_id_location(parser, start, end) {
    return pm_constant_pool_insert_shared(parser.constant_pool, parser.source, start, end);
}

/**
 * Retrieve the constant pool id for the given string. `bytes` holds the
 * content (a view into the source or a standalone buffer).
 */
function pm_parser_constant_id_owned(parser, bytes, length) {
    return pm_constant_pool_insert_owned(parser.constant_pool, bytes, length);
}

/**
 * Retrieve the constant pool id for the given static literal C string. `str`
 * is a JS string.
 */
function pm_parser_constant_id_constant(parser, str, length) {
    return pm_constant_pool_insert_constant(parser.constant_pool, str, length);
}

/**
 * Retrieve the constant pool id for the given token.
 */
function pm_parser_constant_id_token(parser, token) {
    return pm_parser_constant_id_location(parser, token.start, token.end);
}

/**
 * Retrieve the constant pool id for the given token. If the token is not
 * provided, then return 0.
 */
function pm_parser_optional_constant_id_token(parser, token) {
    return token.type === PM_TOKEN_NOT_PROVIDED ? 0 : pm_parser_constant_id_token(parser, token);
}

/**
 * Check whether or not the given node is value expression.
 * If the node is value node, it returns NULL.
 * If not, it returns the pointer to the node to be inspected as "void expression".
 */
function pm_check_value_expression(parser, node) {
    let void_node = null;

    while (node !== null) {
        switch (node.type) {
            case PM_RETURN_NODE:
            case PM_BREAK_NODE:
            case PM_NEXT_NODE:
            case PM_REDO_NODE:
            case PM_RETRY_NODE:
            case PM_MATCH_REQUIRED_NODE:
                return void_node !== null ? void_node : node;
            case PM_MATCH_PREDICATE_NODE:
                return null;
            case PM_BEGIN_NODE: {

                if (node.ensure_clause !== null) {
                    if (node.rescue_clause !== null) {
                        const vn = pm_check_value_expression(parser, node.rescue_clause);
                        if (vn !== null) return vn;
                    }

                    if (node.statements !== null) {
                        const vn = pm_check_value_expression(parser, node.statements);
                        if (vn !== null) return vn;
                    }

                    node = node.ensure_clause;
                } else if (node.rescue_clause !== null) {
                    if (node.statements === null) return null;

                    const vn = pm_check_value_expression(parser, node.statements);
                    if (vn === null) return null;
                    if (void_node === null) void_node = vn;

                    for (let rescue_clause = node.rescue_clause; rescue_clause !== null; rescue_clause = rescue_clause.subsequent) {
                        const vn = pm_check_value_expression(parser, rescue_clause.statements);
                        if (vn === null) {
                            void_node = null;
                            break;
                        }
                        if (void_node === null) {
                            void_node = vn;
                        }
                    }

                    if (node.else_clause !== null) {
                        node = node.else_clause;
                    } else {
                        return void_node;
                    }
                } else {
                    node = node.statements;
                }

                break;
            }
            case PM_ENSURE_NODE: {
                node = node.statements;
                break;
            }
            case PM_PARENTHESES_NODE: {
                node = node.body;
                break;
            }
            case PM_STATEMENTS_NODE: {
                node = node.body[node.body.length - 1];
                break;
            }
            case PM_IF_NODE: {
                if (node.statements === null || node.subsequent === null) {
                    return null;
                }
                const vn = pm_check_value_expression(parser, node.statements);
                if (vn === null) {
                    return null;
                }
                if (void_node === null) {
                    void_node = vn;
                }
                node = node.subsequent;
                break;
            }
            case PM_UNLESS_NODE: {
                if (node.statements === null || node.else_clause === null) {
                    return null;
                }
                const vn = pm_check_value_expression(parser, node.statements);
                if (vn === null) {
                    return null;
                }
                if (void_node === null) {
                    void_node = vn;
                }
                node = node.else_clause;
                break;
            }
            case PM_ELSE_NODE: {
                node = node.statements;
                break;
            }
            case PM_AND_NODE: {
                node = node.left;
                break;
            }
            case PM_OR_NODE: {
                node = node.left;
                break;
            }
            case PM_LOCAL_VARIABLE_WRITE_NODE: {

                let scope = parser.current_scope;
                for (let depth = 0; depth < node.depth; depth++) scope = scope.previous;

                pm_locals_read(scope.locals, node.name);
                return null;
            }
            default:
                return null;
        }
    }

    return null;
}

function pm_assert_value_expression(parser, node) {
    const void_node = pm_check_value_expression(parser, node);
    if (void_node !== null) {
        pm_parser_err_node(parser, void_node, PM_ERR_VOID_EXPRESSION);
    }
}

// Operator method names that make a receiver-less CallNode eligible for the
// "possibly useless use of X in void context" warning below - the exact set
// the original nested char-code switch (on message.length, then each byte)
// accepted, flattened into one lookup since `message.start` is already the
// full method-name string, not a byte buffer.
const PM_VOID_STATEMENT_OPERATOR_NAMES = new Set([
    "+", "-", "*", "/", "%", "|", "^", "&", ">", "<",
    "<=", ">=", "!=", "==", "+@", "-@", "**",
    "<=>",
]);

/**
 * Warn if the given node is a "void" statement.
 */
function pm_void_statement_check(parser, node) {
    let type = null;
    let length = 0;

    switch (node.type) {
        case PM_BACK_REFERENCE_READ_NODE:
        case PM_CLASS_VARIABLE_READ_NODE:
        case PM_GLOBAL_VARIABLE_READ_NODE:
        case PM_INSTANCE_VARIABLE_READ_NODE:
        case PM_LOCAL_VARIABLE_READ_NODE:
        case PM_NUMBERED_REFERENCE_READ_NODE:
            type = "a variable";
            length = 10;
            break;
        case PM_CALL_NODE: {
            if (node.call_operator_loc.start !== null || node.message_loc.start === null) break;

            const message = pm_constant_pool_id_to_constant(parser.constant_pool, node.name);
            if (PM_VOID_STATEMENT_OPERATOR_NAMES.has(message.start)) {
                type = message.start;
                length = message.length;
            }

            break;
        }
        case PM_CONSTANT_PATH_NODE:
            type = "::";
            length = 2;
            break;
        case PM_CONSTANT_READ_NODE:
            type = "a constant";
            length = 10;
            break;
        case PM_DEFINED_NODE:
            type = "defined?";
            length = 8;
            break;
        case PM_FALSE_NODE:
            type = "false";
            length = 5;
            break;
        case PM_FLOAT_NODE:
        case PM_IMAGINARY_NODE:
        case PM_INTEGER_NODE:
        case PM_INTERPOLATED_REGULAR_EXPRESSION_NODE:
        case PM_INTERPOLATED_STRING_NODE:
        case PM_RATIONAL_NODE:
        case PM_REGULAR_EXPRESSION_NODE:
        case PM_SOURCE_ENCODING_NODE:
        case PM_SOURCE_FILE_NODE:
        case PM_SOURCE_LINE_NODE:
        case PM_STRING_NODE:
        case PM_SYMBOL_NODE:
            type = "a literal";
            length = 9;
            break;
        case PM_NIL_NODE:
            type = "nil";
            length = 3;
            break;
        case PM_RANGE_NODE: {

            if ((node.flags & PM_RANGE_FLAGS_EXCLUDE_END) !== 0) {
                type = "...";
                length = 3;
            } else {
                type = "..";
                length = 2;
            }

            break;
        }
        case PM_SELF_NODE:
            type = "self";
            length = 4;
            break;
        case PM_TRUE_NODE:
            type = "true";
            length = 4;
            break;
        default:
            break;
    }

    if (type !== null) {
        PM_PARSER_WARN_NODE_FORMAT(parser, node, PM_WARN_VOID_STATEMENT, length, type);
    }
}

/**
 * Warn if any of the statements that are not the last statement in the list are
 * a "void" statement.
 */
function pm_void_statements_check(parser, node, last_value) {
    const size = node.body.length - (last_value ? 1 : 0);
    for (let index = 0; index < size; index++) {
        pm_void_statement_check(parser, node.body[index]);
    }
}

// pm_conditional_predicate_type_t
const PM_CONDITIONAL_PREDICATE_TYPE_CONDITIONAL = 0;
const PM_CONDITIONAL_PREDICATE_TYPE_FLIP_FLOP = 1;
const PM_CONDITIONAL_PREDICATE_TYPE_NOT = 2;

/**
 * Add a warning to the parser if the predicate of a conditional is a literal.
 */
function pm_parser_warn_conditional_predicate_literal(parser, node, type, diag_id, prefix) {
    switch (type) {
        case PM_CONDITIONAL_PREDICATE_TYPE_CONDITIONAL:
            PM_PARSER_WARN_NODE_FORMAT(parser, node, diag_id, prefix, "condition");
            break;
        case PM_CONDITIONAL_PREDICATE_TYPE_FLIP_FLOP:
            PM_PARSER_WARN_NODE_FORMAT(parser, node, diag_id, prefix, "flip-flop");
            break;
        case PM_CONDITIONAL_PREDICATE_TYPE_NOT:
            break;
    }
}

/**
 * Return true if the value being written within the predicate of a conditional
 * is a literal value.
 */
function pm_conditional_predicate_warn_write_literal_p(node) {
    switch (node.type) {
        case PM_ARRAY_NODE: {
            if ((node.flags & PM_NODE_FLAG_STATIC_LITERAL) !== 0) return true;

            for (let index = 0; index < node.elements.length; index++) {
                if (!pm_conditional_predicate_warn_write_literal_p(node.elements[index])) return false;
            }

            return true;
        }
        case PM_HASH_NODE: {
            if ((node.flags & PM_NODE_FLAG_STATIC_LITERAL) !== 0) return true;

            for (let index = 0; index < node.elements.length; index++) {
                const element = node.elements[index];
                if (element.type !== PM_ASSOC_NODE) return false;

                const assoc = element;
                if (!pm_conditional_predicate_warn_write_literal_p(assoc.key) || !pm_conditional_predicate_warn_write_literal_p(assoc.value)) return false;
            }

            return true;
        }
        case PM_FALSE_NODE:
        case PM_FLOAT_NODE:
        case PM_IMAGINARY_NODE:
        case PM_INTEGER_NODE:
        case PM_NIL_NODE:
        case PM_RATIONAL_NODE:
        case PM_REGULAR_EXPRESSION_NODE:
        case PM_SOURCE_ENCODING_NODE:
        case PM_SOURCE_FILE_NODE:
        case PM_SOURCE_LINE_NODE:
        case PM_STRING_NODE:
        case PM_SYMBOL_NODE:
        case PM_TRUE_NODE:
            return true;
        default:
            return false;
    }
}

/**
 * Add a warning to the parser if the value that is being written inside of a
 * predicate to a conditional is a literal.
 */
function pm_conditional_predicate_warn_write_literal(parser, node) {
    if (pm_conditional_predicate_warn_write_literal_p(node)) {
        pm_parser_warn_node(parser, node, parser.version <= PM_OPTIONS_VERSION_CRUBY_3_3 ? PM_WARN_EQUAL_IN_CONDITIONAL_3_3 : PM_WARN_EQUAL_IN_CONDITIONAL);
    }
}

/**
 * The predicate of conditional nodes can change what would otherwise be regular
 * nodes into specialized nodes. For example:
 *
 * if foo .. bar         => RangeNode becomes FlipFlopNode
 * if foo and bar .. baz => RangeNode becomes FlipFlopNode
 * if /foo/              => RegularExpressionNode becomes MatchLastLineNode
 * if /foo #{bar}/       => InterpolatedRegularExpressionNode becomes InterpolatedMatchLastLineNode
 *
 * We also want to warn the user if they're using a static literal as a
 * predicate or writing a static literal as the predicate.
 */
function pm_conditional_predicate(parser, node, type) {
    switch (node.type) {
        case PM_AND_NODE: {
            pm_conditional_predicate(parser, node.left, PM_CONDITIONAL_PREDICATE_TYPE_CONDITIONAL);
            pm_conditional_predicate(parser, node.right, PM_CONDITIONAL_PREDICATE_TYPE_CONDITIONAL);
            break;
        }
        case PM_OR_NODE: {
            pm_conditional_predicate(parser, node.left, PM_CONDITIONAL_PREDICATE_TYPE_CONDITIONAL);
            pm_conditional_predicate(parser, node.right, PM_CONDITIONAL_PREDICATE_TYPE_CONDITIONAL);
            break;
        }
        case PM_PARENTHESES_NODE: {

            if ((node.body !== null) && (node.body.type === PM_STATEMENTS_NODE)) {
                const statements = node.body;
                if (statements.body.length === 1) pm_conditional_predicate(parser, statements.body[0], type);
            }

            break;
        }
        case PM_BEGIN_NODE: {
            if (node.statements !== null) {
                const statements = node.statements;
                if (statements.body.length === 1) pm_conditional_predicate(parser, statements.body[0], type);
            }
            break;
        }
        case PM_RANGE_NODE: {

            if (node.left !== null) pm_conditional_predicate(parser, node.left, PM_CONDITIONAL_PREDICATE_TYPE_FLIP_FLOP);
            if (node.right !== null) pm_conditional_predicate(parser, node.right, PM_CONDITIONAL_PREDICATE_TYPE_FLIP_FLOP);

            // Here we change the range node into a flip flop node. We can do
            // this since the nodes are exactly the same except for the type.
            node.type = PM_FLIP_FLOP_NODE;

            break;
        }
        case PM_REGULAR_EXPRESSION_NODE:
            // Here we change the regular expression node into a match last line
            // node. We can do this since the nodes are exactly the same except
            // for the type.
            node.type = PM_MATCH_LAST_LINE_NODE;

            if (!PM_PARSER_COMMAND_LINE_OPTION_E(parser)) {
                pm_parser_warn_conditional_predicate_literal(parser, node, type, PM_WARN_LITERAL_IN_CONDITION_DEFAULT, "regex ");
            }

            break;
        case PM_INTERPOLATED_REGULAR_EXPRESSION_NODE:
            // Here we change the interpolated regular expression node into an
            // interpolated match last line node. We can do this since the nodes
            // are exactly the same except for the type.
            node.type = PM_INTERPOLATED_MATCH_LAST_LINE_NODE;

            if (!PM_PARSER_COMMAND_LINE_OPTION_E(parser)) {
                pm_parser_warn_conditional_predicate_literal(parser, node, type, PM_WARN_LITERAL_IN_CONDITION_VERBOSE, "regex ");
            }

            break;
        case PM_INTEGER_NODE:
            if (type === PM_CONDITIONAL_PREDICATE_TYPE_FLIP_FLOP) {
                if (!PM_PARSER_COMMAND_LINE_OPTION_E(parser)) {
                    pm_parser_warn_node(parser, node, PM_WARN_INTEGER_IN_FLIP_FLOP);
                }
            } else {
                pm_parser_warn_conditional_predicate_literal(parser, node, type, PM_WARN_LITERAL_IN_CONDITION_VERBOSE, "");
            }
            break;
        case PM_STRING_NODE:
        case PM_SOURCE_FILE_NODE:
        case PM_INTERPOLATED_STRING_NODE:
            pm_parser_warn_conditional_predicate_literal(parser, node, type, PM_WARN_LITERAL_IN_CONDITION_DEFAULT, "string ");
            break;
        case PM_SYMBOL_NODE:
        case PM_INTERPOLATED_SYMBOL_NODE:
            pm_parser_warn_conditional_predicate_literal(parser, node, type, PM_WARN_LITERAL_IN_CONDITION_VERBOSE, "symbol ");
            break;
        case PM_SOURCE_LINE_NODE:
        case PM_SOURCE_ENCODING_NODE:
        case PM_FLOAT_NODE:
        case PM_RATIONAL_NODE:
        case PM_IMAGINARY_NODE:
            pm_parser_warn_conditional_predicate_literal(parser, node, type, PM_WARN_LITERAL_IN_CONDITION_VERBOSE, "");
            break;
        case PM_CLASS_VARIABLE_WRITE_NODE:
            pm_conditional_predicate_warn_write_literal(parser, node.value);
            break;
        case PM_CONSTANT_WRITE_NODE:
            pm_conditional_predicate_warn_write_literal(parser, node.value);
            break;
        case PM_GLOBAL_VARIABLE_WRITE_NODE:
            pm_conditional_predicate_warn_write_literal(parser, node.value);
            break;
        case PM_INSTANCE_VARIABLE_WRITE_NODE:
            pm_conditional_predicate_warn_write_literal(parser, node.value);
            break;
        case PM_LOCAL_VARIABLE_WRITE_NODE:
            pm_conditional_predicate_warn_write_literal(parser, node.value);
            break;
        case PM_MULTI_WRITE_NODE:
            pm_conditional_predicate_warn_write_literal(parser, node.value);
            break;
        default:
            break;
    }
}

/**
 * In a lot of places in the tree you can have tokens that are not provided but
 * that do not cause an error. For example, this happens in a method call
 * without parentheses. In these cases we set the token to the "not provided" type.
 * For example:
 *
 *     pm_token_t token = not_provided(parser);
 */
function not_provided(parser) {
    return { type: PM_TOKEN_NOT_PROVIDED, start: parser.start, end: parser.start };
}

/**
 * This is a special out parameter to the parse_arguments_list function that
 * includes opening and closing parentheses in addition to the arguments since
 * it's so common. It is handy to use when passing argument information to one
 * of the call node creation functions.
 *
 * pm_arguments_t := {
 *     opening_loc: { start, end },
 *     arguments: pm_arguments_node_t | null,
 *     closing_loc: { start, end },
 *     block: pm_block_node_t | null,
 *     has_forwarding: boolean
 * }
 */

/**
 * Retrieve the end location of a `pm_arguments_t` object.
 */
function pm_arguments_end(arguments_) {
    if (arguments_.block !== null) {
        let end = arguments_.block.location.end;
        if (arguments_.closing_loc.start !== null && arguments_.closing_loc.end > end) {
            end = arguments_.closing_loc.end;
        }
        return end;
    }
    if (arguments_.closing_loc.start !== null) {
        return arguments_.closing_loc.end;
    }
    if (arguments_.arguments !== null) {
        return arguments_.arguments.location.end;
    }
    return arguments_.closing_loc.end;
}

/**
 * Check that we're not about to attempt to attach a brace block to a call that
 * has arguments without parentheses.
 */
function pm_arguments_validate_block(parser, arguments_, block) {
    // First, check that we have arguments and that we don't have a closing
    // location for them.
    if (arguments_.arguments === null || arguments_.closing_loc.start !== null) {
        return;
    }

    // Next, check that we don't have a single parentheses argument. This would
    // look like:
    //
    //     foo (1) {}
    //
    // In this case, it's actually okay for the block to be attached to the
    // call, even though it looks like it's attached to the argument.
    if (arguments_.arguments.arguments.length === 1 && arguments_.arguments.arguments[0].type === PM_PARENTHESES_NODE) {
        return;
    }

    // If we didn't hit a case before this check, then at this point we need to
    // add a syntax error.
    pm_parser_err_node(parser, block, PM_ERR_ARGUMENT_UNEXPECTED_BLOCK);
}

/******************************************************************************/
/* Basic character checks                                                     */
/******************************************************************************/

/**
 * This function is used extremely frequently to lex all of the identifiers in a
 * source file, so it's important that it be as fast as possible. For this
 * reason we have the encoding_changed boolean to check if we need to go through
 * the function pointer or can just directly use the UTF-8 functions.
 */
function char_is_identifier_start(parser, b, n) {
    if (n <= 0) return 0;

    const code = parser.source.charCodeAt(b) || 0;
    if (code < 0x80) {
        return ((pm_encoding_unicode_table[code] & PRISM_ENCODING_ALPHABETIC_BIT ? 1 : 0) || (code === 0x5f)) ? 1 : 0;
    } else {
        return pm_encoding_utf_8_char_width(parser.source, b, n);
    }
}

/**
 * Similar to char_is_identifier but this function assumes that the encoding
 * has not been changed. (Adaptation: takes the source buffer explicitly.)
 */
function char_is_identifier_utf8(source, b, n) {
    if (n <= 0) {
        return 0;
    }
    const code = source.charCodeAt(b) || 0;
    if (code < 0x80) {
        return ((code === 0x5f) || (pm_encoding_unicode_table[code] & PRISM_ENCODING_ALPHANUMERIC_BIT ? 1 : 0)) ? 1 : 0;
    } else {
        return pm_encoding_utf_8_char_width(source, b, n);
    }
}

/**
 * Like the above, this function is also used extremely frequently to lex all of
 * the identifiers in a source file once the first character has been found. So
 * it's important that it be as fast as possible.
 */
function char_is_identifier(parser, b, n) {
    if (n <= 0) {
        return 0;
    } else {
        return char_is_identifier_utf8(parser.source, b, n);
    }
}

// Here we're defining a perfect hash for the characters that are allowed in
// global names. This is used to quickly check the next character after a $ to
// see if it's a valid character for a global name.
// The characters that may appear after "$" in a global variable name.
// (C uses a perfect hash over the byte range; the set is equivalent.)
const PM_GLOBAL_NAME_PUNCTUATION = new Set("~*$?!@/\\;,=.:<>\"&`'+0");

function char_is_global_name_punctuation(b) {
    return PM_GLOBAL_NAME_PUNCTUATION.has(String.fromCharCode(b));
}

function token_is_setter_name(parser, token) {
    return (
        (token.type === PM_TOKEN_BRACKET_LEFT_RIGHT_EQUAL) ||
        ((token.type === PM_TOKEN_IDENTIFIER) &&
        (token.end - token.start >= 2) &&
        ((parser.source.charCodeAt(token.end - 1) || 0) === 0x3d))
    );
}

/**
 * Returns true if the given local variable is a keyword.
 * (`source` is a Uint8Array holding the content.)
 */
// The keywords that cannot be used as local variable names. (C dispatches on
// the name length and memcmps the prefix; in JS the whole check is a set
// lookup over the first `length` code units.)
const PM_LOCAL_KEYWORDS = new Set([
    "and", "begin", "break", "case", "class", "def", "do", "else", "end",
    "ensure", "false", "for", "if", "in", "module", "next", "nil", "not",
    "or", "redo", "rescue", "return", "self", "super", "then", "true",
    "undef", "unless", "until", "when", "while", "yield",
    "__ENCODING__", "__FILE__", "__LINE__",
]);

function pm_local_is_keyword(source, length) {
    const text = source.slice(0, length);
    return text.length === length && PM_LOCAL_KEYWORDS.has(text);
}


/******************************************************************************/
/* Node flag handling functions                                               */
/******************************************************************************/

/**
 * Set the given flag on the given node.
 */
function pm_node_flag_set(node, flag) {
    node.flags |= flag;
}

/**
 * Remove the given flag from the given node.
 */
function pm_node_flag_unset(node, flag) {
    node.flags &= ~flag;
}

/**
 * Set the repeated parameter flag on the given node.
 */
function pm_node_flag_set_repeated_parameter(node) {
    pm_node_flag_set(node, PM_PARAMETER_FLAGS_REPEATED_PARAMETER);
}

/******************************************************************************/
/* Node creation functions                                                    */
/******************************************************************************/

/**
 * When you have an encoding flag on a regular expression, it takes precedence
 * over all of the previously set encoding flags. So we need to mask off any
 * previously set encoding flags before setting the new one.
 */

/**
 * Parse out the options for a regular expression.
 */
function pm_regular_expression_flags_create(parser, closing) {
    let flags = 0;

    if (closing.type === PM_TOKEN_REGEXP_END) {
        const unknown_flags = { length: 0, capacity: 0, bytes: new Uint8Array(0) };

        for (let flag = closing.start + 1; flag < closing.end; flag++) {
            switch ((parser.source.charCodeAt(flag) || 0)) {
                case 105: // 'i'
                    flags |= PM_REGULAR_EXPRESSION_FLAGS_IGNORE_CASE;
                    break;
                case 109: // 'm'
                    flags |= PM_REGULAR_EXPRESSION_FLAGS_MULTI_LINE;
                    break;
                case 120: // 'x'
                    flags |= PM_REGULAR_EXPRESSION_FLAGS_EXTENDED;
                    break;
                case 111: // 'o'
                    flags |= PM_REGULAR_EXPRESSION_FLAGS_ONCE;
                    break;

                case 101: // 'e'
                    flags = ((flags & ~(PM_REGULAR_EXPRESSION_FLAGS_EUC_JP | PM_REGULAR_EXPRESSION_FLAGS_ASCII_8BIT | PM_REGULAR_EXPRESSION_FLAGS_WINDOWS_31J | PM_REGULAR_EXPRESSION_FLAGS_UTF_8)) | PM_REGULAR_EXPRESSION_FLAGS_EUC_JP);
                    break;
                case 110: // 'n'
                    flags = ((flags & ~(PM_REGULAR_EXPRESSION_FLAGS_EUC_JP | PM_REGULAR_EXPRESSION_FLAGS_ASCII_8BIT | PM_REGULAR_EXPRESSION_FLAGS_WINDOWS_31J | PM_REGULAR_EXPRESSION_FLAGS_UTF_8)) | PM_REGULAR_EXPRESSION_FLAGS_ASCII_8BIT);
                    break;
                case 115: // 's'
                    flags = ((flags & ~(PM_REGULAR_EXPRESSION_FLAGS_EUC_JP | PM_REGULAR_EXPRESSION_FLAGS_ASCII_8BIT | PM_REGULAR_EXPRESSION_FLAGS_WINDOWS_31J | PM_REGULAR_EXPRESSION_FLAGS_UTF_8)) | PM_REGULAR_EXPRESSION_FLAGS_WINDOWS_31J);
                    break;
                case 117: // 'u'
                    flags = ((flags & ~(PM_REGULAR_EXPRESSION_FLAGS_EUC_JP | PM_REGULAR_EXPRESSION_FLAGS_ASCII_8BIT | PM_REGULAR_EXPRESSION_FLAGS_WINDOWS_31J | PM_REGULAR_EXPRESSION_FLAGS_UTF_8)) | PM_REGULAR_EXPRESSION_FLAGS_UTF_8);
                    break;

                default:
                    pm_buffer_append_byte(unknown_flags, (parser.source.charCodeAt(flag) || 0));
                    break;
            }
        }

        const unknown_flags_length = pm_buffer_length(unknown_flags);
        if (unknown_flags_length !== 0) {
            const word = unknown_flags_length >= 2 ? "options" : "option";
            PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.previous, PM_ERR_REGEXP_UNKNOWN_OPTIONS, word, unknown_flags_length, pm_buffer_value(unknown_flags));
        }
    }

    return flags;
}
