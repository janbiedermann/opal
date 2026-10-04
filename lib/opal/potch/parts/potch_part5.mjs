// prism.c lines 12118-15357 converted to JavaScript (ES2022).
//
// This fragment contains the binding-power machinery, the match/accept/expect
// token helpers, and the parse functions for expressions-as-targets/writes,
// statements, assoc/arguments lists, parameters, rescues, blocks, returns /
// block exits, predicates and conditionals.
//
// This is a plain fragment: it declares consts/functions only, no
// import/export. It relies on part1/part2/part3/part4, ast.js, node.js,
// diagnostic.js, options.js, token_type.js, encoding.js, static_literals.js
// and the util modules being concatenated/imported around it.
//
// Adaptation notes for the integrator:
// - parse_expression is forward-declared in this range (prism.c:12445) but
//   DEFINED in a later fragment (~prism.c:15512+, part7). It is NOT defined
//   here; it is called directly and resolves once the whole file is
//   assembled.
// - C `pm_token_t local = parser->previous;` struct copies become fresh
//   objects `{ type, start, end }` (parser.current is mutated in place by the
//   lexer and parser.previous.* fields are mutated by expect*, so aliases
//   must not be shared).
// - C pointer out-params become return values where possible:
//     * parse_write_name returns the new pm_constant_id_t directly (as does
//       part2's pm_call_write_read_name_init).
//     * update_parameter_state takes pm_parameters_order_t *current as
//       { value }.
//   Token out-params (parse_predicate's then_keyword) are mutated in place
//   (the caller passes the actual token object created by not_provided()).
// - NULL pointers: object pointers are null (call->opening_loc.start,
//   parser->heredoc_end); locations use { start: null, end: null } like
//   part2. `end[-1]` byte reads index parser.source[end - 1].
// - pm_static_literals_t hash_keys = { 0 } becomes pm_static_literals_zeroed()
//   (helper below matching the zero-initialized shape documented in
//   static_literals.js). pm_buffer_t buffer = { 0 } becomes a zeroed buffer
//   object literal; the append functions grow it lazily exactly like C.
// - memmove is expressed with typed-array/array copyWithin semantics via a
//   small inline loop (see pm_node_unreference_each).
// - The designated-initializer tables (pm_binding_powers,
//   parameters_ordering) are fully materialized arrays indexed by token type
//   with the same zero-defaults as C's static storage.
// - The PM_CASE_* switch-label macros (prism.c:15290-15346) become Sets of
//   token types / node types; later fragments test membership with .has().
// - PM_STATIC_ASSERT (prism.c:15350) is debug-only in C and is omitted, as
//   are all asserts.
// - "%.2s" format arguments are passed as parser.source.subarray(start,
//   start + 2); "%.*s" pairs as (length, subarray view), matching
//   diagnostic.js's coerce_format_argument convention.
// - Encoding callbacks are called as fn(parser.source, offset, n).

/******************************************************************************/
/* Binding powers                                                             */
/******************************************************************************/

/**
 * These are the various precedence rules. Because we are using a Pratt parser,
 * they are named binding power to represent the manner in which nodes are bound
 * together in the stack.
 *
 * We increment by 2 because we want to leave room for the infix operators to
 * specify their associativity by adding or subtracting one.
 */
const PM_BINDING_POWER_UNSET = 0; // used to indicate this token cannot be used as an infix operator
const PM_BINDING_POWER_STATEMENT = 2;
const PM_BINDING_POWER_MODIFIER_RESCUE = 4; // rescue
const PM_BINDING_POWER_MODIFIER = 6; // if unless until while
const PM_BINDING_POWER_COMPOSITION = 8; // and or
const PM_BINDING_POWER_NOT = 10; // not
const PM_BINDING_POWER_MATCH = 12; // => in
const PM_BINDING_POWER_DEFINED = 14; // defined?
const PM_BINDING_POWER_MULTI_ASSIGNMENT = 16; // =
const PM_BINDING_POWER_ASSIGNMENT = 18; // = += -= *= /= %= &= |= ^= &&= ||= <<= >>= **=
const PM_BINDING_POWER_TERNARY = 20; // ?:
const PM_BINDING_POWER_RANGE = 22; // .. ...
const PM_BINDING_POWER_LOGICAL_OR = 24; // ||
const PM_BINDING_POWER_LOGICAL_AND = 26; // &&
const PM_BINDING_POWER_EQUALITY = 28; // <=> == === != =~ !~
const PM_BINDING_POWER_COMPARISON = 30; // > >= < <=
const PM_BINDING_POWER_BITWISE_OR = 32; // | ^
const PM_BINDING_POWER_BITWISE_AND = 34; // &
const PM_BINDING_POWER_SHIFT = 36; // << >>
const PM_BINDING_POWER_TERM = 38; // + -
const PM_BINDING_POWER_FACTOR = 40; // * / %
const PM_BINDING_POWER_UMINUS = 42; // -@
const PM_BINDING_POWER_EXPONENT = 44; // **
const PM_BINDING_POWER_UNARY = 46; // ! ~ +@
const PM_BINDING_POWER_INDEX = 48; // [] []=
const PM_BINDING_POWER_CALL = 50; // :: .
const PM_BINDING_POWER_MAX = 52;

// #define BINDING_POWER_ASSIGNMENT { PM_BINDING_POWER_UNARY, PM_BINDING_POWER_ASSIGNMENT, true, false }
function BINDING_POWER_ASSIGNMENT() {
    return { left: PM_BINDING_POWER_UNARY, right: PM_BINDING_POWER_ASSIGNMENT, binary: true, nonassoc: false };
}

// #define LEFT_ASSOCIATIVE(precedence) { precedence, precedence + 1, true, false }
function LEFT_ASSOCIATIVE(precedence) {
    return { left: precedence, right: precedence + 1, binary: true, nonassoc: false };
}

// #define RIGHT_ASSOCIATIVE(precedence) { precedence, precedence, true, false }
function RIGHT_ASSOCIATIVE(precedence) {
    return { left: precedence, right: precedence, binary: true, nonassoc: false };
}

// #define NON_ASSOCIATIVE(precedence) { precedence, precedence + 1, true, true }
function NON_ASSOCIATIVE(precedence) {
    return { left: precedence, right: precedence + 1, binary: true, nonassoc: true };
}

// #define RIGHT_ASSOCIATIVE_UNARY(precedence) { precedence, precedence, false, false }
function RIGHT_ASSOCIATIVE_UNARY(precedence) {
    return { left: precedence, right: precedence, binary: false, nonassoc: false };
}

// pm_binding_powers_t := { left, right, binary, nonassoc }
// Zero-initialized entries mirror C's static storage default.
// Entries are only ever replaced wholesale (never field-mutated), so one
// shared zero object is safe.
const PM_BINDING_POWER_UNSET_ENTRY = { left: PM_BINDING_POWER_UNSET, right: PM_BINDING_POWER_UNSET, binary: false, nonassoc: false };
const pm_binding_powers = Array(PM_TOKEN_MAXIMUM).fill(PM_BINDING_POWER_UNSET_ENTRY);

// rescue
pm_binding_powers[PM_TOKEN_KEYWORD_RESCUE_MODIFIER] = { left: PM_BINDING_POWER_MODIFIER_RESCUE, right: PM_BINDING_POWER_COMPOSITION, binary: true, nonassoc: false };

// if unless until while
pm_binding_powers[PM_TOKEN_KEYWORD_IF_MODIFIER] = LEFT_ASSOCIATIVE(PM_BINDING_POWER_MODIFIER);
pm_binding_powers[PM_TOKEN_KEYWORD_UNLESS_MODIFIER] = LEFT_ASSOCIATIVE(PM_BINDING_POWER_MODIFIER);
pm_binding_powers[PM_TOKEN_KEYWORD_UNTIL_MODIFIER] = LEFT_ASSOCIATIVE(PM_BINDING_POWER_MODIFIER);
pm_binding_powers[PM_TOKEN_KEYWORD_WHILE_MODIFIER] = LEFT_ASSOCIATIVE(PM_BINDING_POWER_MODIFIER);

// and or
pm_binding_powers[PM_TOKEN_KEYWORD_AND] = LEFT_ASSOCIATIVE(PM_BINDING_POWER_COMPOSITION);
pm_binding_powers[PM_TOKEN_KEYWORD_OR] = LEFT_ASSOCIATIVE(PM_BINDING_POWER_COMPOSITION);

// => in
pm_binding_powers[PM_TOKEN_EQUAL_GREATER] = NON_ASSOCIATIVE(PM_BINDING_POWER_MATCH);
pm_binding_powers[PM_TOKEN_KEYWORD_IN] = NON_ASSOCIATIVE(PM_BINDING_POWER_MATCH);

// &&= &= ^= = >>= <<= -= %= |= ||= += /= *= **=
pm_binding_powers[PM_TOKEN_AMPERSAND_AMPERSAND_EQUAL] = BINDING_POWER_ASSIGNMENT();
pm_binding_powers[PM_TOKEN_AMPERSAND_EQUAL] = BINDING_POWER_ASSIGNMENT();
pm_binding_powers[PM_TOKEN_CARET_EQUAL] = BINDING_POWER_ASSIGNMENT();
pm_binding_powers[PM_TOKEN_EQUAL] = BINDING_POWER_ASSIGNMENT();
pm_binding_powers[PM_TOKEN_GREATER_GREATER_EQUAL] = BINDING_POWER_ASSIGNMENT();
pm_binding_powers[PM_TOKEN_LESS_LESS_EQUAL] = BINDING_POWER_ASSIGNMENT();
pm_binding_powers[PM_TOKEN_MINUS_EQUAL] = BINDING_POWER_ASSIGNMENT();
pm_binding_powers[PM_TOKEN_PERCENT_EQUAL] = BINDING_POWER_ASSIGNMENT();
pm_binding_powers[PM_TOKEN_PIPE_EQUAL] = BINDING_POWER_ASSIGNMENT();
pm_binding_powers[PM_TOKEN_PIPE_PIPE_EQUAL] = BINDING_POWER_ASSIGNMENT();
pm_binding_powers[PM_TOKEN_PLUS_EQUAL] = BINDING_POWER_ASSIGNMENT();
pm_binding_powers[PM_TOKEN_SLASH_EQUAL] = BINDING_POWER_ASSIGNMENT();
pm_binding_powers[PM_TOKEN_STAR_EQUAL] = BINDING_POWER_ASSIGNMENT();
pm_binding_powers[PM_TOKEN_STAR_STAR_EQUAL] = BINDING_POWER_ASSIGNMENT();

// ?:
pm_binding_powers[PM_TOKEN_QUESTION_MARK] = RIGHT_ASSOCIATIVE(PM_BINDING_POWER_TERNARY);

// .. ...
pm_binding_powers[PM_TOKEN_DOT_DOT] = NON_ASSOCIATIVE(PM_BINDING_POWER_RANGE);
pm_binding_powers[PM_TOKEN_DOT_DOT_DOT] = NON_ASSOCIATIVE(PM_BINDING_POWER_RANGE);
pm_binding_powers[PM_TOKEN_UDOT_DOT] = RIGHT_ASSOCIATIVE_UNARY(PM_BINDING_POWER_LOGICAL_OR);
pm_binding_powers[PM_TOKEN_UDOT_DOT_DOT] = RIGHT_ASSOCIATIVE_UNARY(PM_BINDING_POWER_LOGICAL_OR);

// ||
pm_binding_powers[PM_TOKEN_PIPE_PIPE] = LEFT_ASSOCIATIVE(PM_BINDING_POWER_LOGICAL_OR);

// &&
pm_binding_powers[PM_TOKEN_AMPERSAND_AMPERSAND] = LEFT_ASSOCIATIVE(PM_BINDING_POWER_LOGICAL_AND);

// != !~ == === =~ <=>
pm_binding_powers[PM_TOKEN_BANG_EQUAL] = NON_ASSOCIATIVE(PM_BINDING_POWER_EQUALITY);
pm_binding_powers[PM_TOKEN_BANG_TILDE] = NON_ASSOCIATIVE(PM_BINDING_POWER_EQUALITY);
pm_binding_powers[PM_TOKEN_EQUAL_EQUAL] = NON_ASSOCIATIVE(PM_BINDING_POWER_EQUALITY);
pm_binding_powers[PM_TOKEN_EQUAL_EQUAL_EQUAL] = NON_ASSOCIATIVE(PM_BINDING_POWER_EQUALITY);
pm_binding_powers[PM_TOKEN_EQUAL_TILDE] = NON_ASSOCIATIVE(PM_BINDING_POWER_EQUALITY);
pm_binding_powers[PM_TOKEN_LESS_EQUAL_GREATER] = NON_ASSOCIATIVE(PM_BINDING_POWER_EQUALITY);

// > >= < <=
pm_binding_powers[PM_TOKEN_GREATER] = LEFT_ASSOCIATIVE(PM_BINDING_POWER_COMPARISON);
pm_binding_powers[PM_TOKEN_GREATER_EQUAL] = LEFT_ASSOCIATIVE(PM_BINDING_POWER_COMPARISON);
pm_binding_powers[PM_TOKEN_LESS] = LEFT_ASSOCIATIVE(PM_BINDING_POWER_COMPARISON);
pm_binding_powers[PM_TOKEN_LESS_EQUAL] = LEFT_ASSOCIATIVE(PM_BINDING_POWER_COMPARISON);

// ^ |
pm_binding_powers[PM_TOKEN_CARET] = LEFT_ASSOCIATIVE(PM_BINDING_POWER_BITWISE_OR);
pm_binding_powers[PM_TOKEN_PIPE] = LEFT_ASSOCIATIVE(PM_BINDING_POWER_BITWISE_OR);

// &
pm_binding_powers[PM_TOKEN_AMPERSAND] = LEFT_ASSOCIATIVE(PM_BINDING_POWER_BITWISE_AND);

// >> <<
pm_binding_powers[PM_TOKEN_GREATER_GREATER] = LEFT_ASSOCIATIVE(PM_BINDING_POWER_SHIFT);
pm_binding_powers[PM_TOKEN_LESS_LESS] = LEFT_ASSOCIATIVE(PM_BINDING_POWER_SHIFT);

// - +
pm_binding_powers[PM_TOKEN_MINUS] = LEFT_ASSOCIATIVE(PM_BINDING_POWER_TERM);
pm_binding_powers[PM_TOKEN_PLUS] = LEFT_ASSOCIATIVE(PM_BINDING_POWER_TERM);

// % / *
pm_binding_powers[PM_TOKEN_PERCENT] = LEFT_ASSOCIATIVE(PM_BINDING_POWER_FACTOR);
pm_binding_powers[PM_TOKEN_SLASH] = LEFT_ASSOCIATIVE(PM_BINDING_POWER_FACTOR);
pm_binding_powers[PM_TOKEN_STAR] = LEFT_ASSOCIATIVE(PM_BINDING_POWER_FACTOR);
pm_binding_powers[PM_TOKEN_USTAR] = RIGHT_ASSOCIATIVE_UNARY(PM_BINDING_POWER_FACTOR);

// -@
pm_binding_powers[PM_TOKEN_UMINUS] = RIGHT_ASSOCIATIVE_UNARY(PM_BINDING_POWER_UMINUS);
pm_binding_powers[PM_TOKEN_UMINUS_NUM] = { left: PM_BINDING_POWER_UMINUS, right: PM_BINDING_POWER_MAX, binary: false, nonassoc: false };

// **
pm_binding_powers[PM_TOKEN_STAR_STAR] = RIGHT_ASSOCIATIVE(PM_BINDING_POWER_EXPONENT);
pm_binding_powers[PM_TOKEN_USTAR_STAR] = RIGHT_ASSOCIATIVE_UNARY(PM_BINDING_POWER_UNARY);

// ! ~ +@
pm_binding_powers[PM_TOKEN_BANG] = RIGHT_ASSOCIATIVE_UNARY(PM_BINDING_POWER_UNARY);
pm_binding_powers[PM_TOKEN_TILDE] = RIGHT_ASSOCIATIVE_UNARY(PM_BINDING_POWER_UNARY);
pm_binding_powers[PM_TOKEN_UPLUS] = RIGHT_ASSOCIATIVE_UNARY(PM_BINDING_POWER_UNARY);

// [
pm_binding_powers[PM_TOKEN_BRACKET_LEFT] = LEFT_ASSOCIATIVE(PM_BINDING_POWER_INDEX);

// :: . &.
pm_binding_powers[PM_TOKEN_COLON_COLON] = RIGHT_ASSOCIATIVE(PM_BINDING_POWER_CALL);
pm_binding_powers[PM_TOKEN_DOT] = RIGHT_ASSOCIATIVE(PM_BINDING_POWER_CALL);
pm_binding_powers[PM_TOKEN_AMPERSAND_DOT] = RIGHT_ASSOCIATIVE(PM_BINDING_POWER_CALL);

/******************************************************************************/
/* Token helpers                                                              */
/******************************************************************************/

/**
 * Returns true if the current token is of the given type.
 */
function match1(parser, type) {
    return parser.current.type === type;
}

/**
 * Returns true if the current token is of either of the given types.
 */
function match2(parser, type1, type2) {
    return match1(parser, type1) || match1(parser, type2);
}

/**
 * Returns true if the current token is any of the three given types.
 */
function match3(parser, type1, type2, type3) {
    return match1(parser, type1) || match1(parser, type2) || match1(parser, type3);
}

/**
 * Returns true if the current token is any of the four given types.
 */
function match4(parser, type1, type2, type3, type4) {
    return match1(parser, type1) || match1(parser, type2) || match1(parser, type3) || match1(parser, type4);
}

/**
 * Returns true if the current token is any of the seven given types.
 */
function match7(parser, type1, type2, type3, type4, type5, type6, type7) {
    return match1(parser, type1) || match1(parser, type2) || match1(parser, type3) || match1(parser, type4) || match1(parser, type5) || match1(parser, type6) || match1(parser, type7);
}

/**
 * Returns true if the current token is any of the eight given types.
 */
function match8(parser, type1, type2, type3, type4, type5, type6, type7, type8) {
    return match1(parser, type1) || match1(parser, type2) || match1(parser, type3) || match1(parser, type4) || match1(parser, type5) || match1(parser, type6) || match1(parser, type7) || match1(parser, type8);
}

/**
 * If the current token is of the specified type, lex forward by one token and
 * return true. Otherwise, return false. For example:
 *
 *     if (accept1(parser, PM_TOKEN_COLON)) { ... }
 */
function accept1(parser, type) {
    if (match1(parser, type)) {
        parser_lex(parser);
        return true;
    }
    return false;
}

/**
 * If the current token is either of the two given types, lex forward by one
 * token and return true. Otherwise return false.
 */
function accept2(parser, type1, type2) {
    if (match2(parser, type1, type2)) {
        parser_lex(parser);
        return true;
    }
    return false;
}

/**
 * This function indicates that the parser expects a token in a specific
 * position. For example, if you're parsing a BEGIN block, you know that a { is
 * expected immediately after the keyword. In that case you would call this
 * function to indicate that that token should be found.
 *
 * If we didn't find the token that we were expecting, then we're going to add
 * an error to the parser's list of errors (to indicate that the tree is not
 * valid) and create an artificial token instead. This allows us to recover from
 * the fact that the token isn't present and continue parsing.
 */
function expect1(parser, type, diag_id) {
    if (accept1(parser, type)) return;

    const location = parser.previous.end;
    pm_parser_err(parser, location, location, diag_id);

    parser.previous.start = location;
    parser.previous.type = PM_TOKEN_MISSING;
}

/**
 * This function is the same as expect1, but it expects either of two token
 * types.
 */
function expect2(parser, type1, type2, diag_id) {
    if (accept2(parser, type1, type2)) return;

    const location = parser.previous.end;
    pm_parser_err(parser, location, location, diag_id);

    parser.previous.start = location;
    parser.previous.type = PM_TOKEN_MISSING;
}

/**
 * A special expect1 that expects a heredoc terminator and handles popping the
 * lex mode accordingly.
 */
function expect1_heredoc_term(parser, ident_start, ident_length) {
    if (match1(parser, PM_TOKEN_HEREDOC_END)) {
        parser_lex(parser);
    } else {
        pm_parser_err_heredoc_term(parser, ident_start, ident_length);
        parser.previous.start = parser.previous.end;
        parser.previous.type = PM_TOKEN_MISSING;
    }
}

/**
 * A special expect1 that attaches the error to the opening token location
 * rather than the current position. This is useful for errors about missing
 * closing tokens, where we want to point to the line with the opening token
 * (e.g., `def`, `class`, `if`, `{`) rather than the end of the file.
 */
function expect1_opening(parser, type, diag_id, opening) {
    if (accept1(parser, type)) return;

    pm_parser_err(parser, opening.start, opening.end, diag_id);

    parser.previous.start = parser.previous.end;
    parser.previous.type = PM_TOKEN_MISSING;
}

// parse_expression is forward-declared here in C (prism.c:12445); its body is
// owned by a later fragment. Function declarations hoist within the assembled
// module, so it can simply be called.

/**
 * This is a wrapper of parse_expression, which also checks whether the
 * resulting node is a value expression.
 */
function parse_value_expression(parser, binding_power, accepts_command_call, accepts_label, diag_id, depth) {
    const node = parse_expression(parser, binding_power, accepts_command_call, accepts_label, diag_id, depth);
    pm_assert_value_expression(parser, node);
    return node;
}

/**
 * This function controls whether or not we will attempt to parse an expression
 * beginning at the subsequent token. It is used when we are in a context where
 * an expression is optional.
 *
 * For example, looking at a range object when we've already lexed the operator,
 * we need to know if we should attempt to parse an expression on the right.
 *
 * For another example, if we've parsed an identifier or a method call and we do
 * not have parentheses, then the next token may be the start of an argument or
 * it may not.
 *
 * CRuby parsers that are generated would resolve this by using a lookahead and
 * potentially backtracking. We attempt to do this by just looking at the next
 * token and making a decision based on that. I am not sure if this is going to
 * work in all cases, it may need to be refactored later. But it appears to work
 * for now.
 */
function token_begins_expression_p(type) {
    switch (type) {
        case PM_TOKEN_EQUAL_GREATER:
        case PM_TOKEN_KEYWORD_IN:
            // We need to special case this because it is a binary operator that
            // should not be marked as beginning an expression.
            return false;
        case PM_TOKEN_BRACE_RIGHT:
        case PM_TOKEN_BRACKET_RIGHT:
        case PM_TOKEN_COLON:
        case PM_TOKEN_COMMA:
        case PM_TOKEN_EMBEXPR_END:
        case PM_TOKEN_EOF:
        case PM_TOKEN_LAMBDA_BEGIN:
        case PM_TOKEN_KEYWORD_DO:
        case PM_TOKEN_KEYWORD_DO_LOOP:
        case PM_TOKEN_KEYWORD_END:
        case PM_TOKEN_KEYWORD_ELSE:
        case PM_TOKEN_KEYWORD_ELSIF:
        case PM_TOKEN_KEYWORD_ENSURE:
        case PM_TOKEN_KEYWORD_THEN:
        case PM_TOKEN_KEYWORD_RESCUE:
        case PM_TOKEN_KEYWORD_WHEN:
        case PM_TOKEN_NEWLINE:
        case PM_TOKEN_PARENTHESIS_RIGHT:
        case PM_TOKEN_SEMICOLON:
            // The reason we need this short-circuit is because we're using the
            // binding powers table to tell us if the subsequent token could
            // potentially be the start of an expression. If there _is_ a binding
            // power for one of these tokens, then we should remove it from this list
            // and let it be handled by the default case below.
            // assert(pm_binding_powers[type].left == PM_BINDING_POWER_UNSET): debug-only in C.
            return false;
        case PM_TOKEN_UAMPERSAND:
            // This is a special case because this unary operator cannot appear
            // as a general operator, it only appears in certain circumstances.
            return false;
        case PM_TOKEN_UCOLON_COLON:
        case PM_TOKEN_UMINUS:
        case PM_TOKEN_UMINUS_NUM:
        case PM_TOKEN_UPLUS:
        case PM_TOKEN_BANG:
        case PM_TOKEN_TILDE:
        case PM_TOKEN_UDOT_DOT:
        case PM_TOKEN_UDOT_DOT_DOT:
            // These unary tokens actually do have binding power associated with them
            // so that we can correctly place them into the precedence order. But we
            // want them to be marked as beginning an expression, so we need to
            // special case them here.
            return true;
        default:
            return pm_binding_powers[type].left === PM_BINDING_POWER_UNSET;
    }
}

/**
 * Parse an expression with the given binding power that may be optionally
 * prefixed by the * operator.
 */
function parse_starred_expression(parser, binding_power, accepts_command_call, diag_id, depth) {
    if (accept1(parser, PM_TOKEN_USTAR)) {
        const operator = copyToken(parser.previous);
        const expression = parse_value_expression(parser, binding_power, false, false, PM_ERR_EXPECT_EXPRESSION_AFTER_STAR, depth + 1);
        return pm_splat_node_create(parser, operator, expression);
    }

    return parse_value_expression(parser, binding_power, accepts_command_call, false, diag_id, depth);
}

/******************************************************************************/
/* Block exit / implicit parameter unreferencing                              */
/******************************************************************************/

function pm_node_unreference_each(node, data) {
    switch (node.type) {
        // When we are about to destroy a set of nodes that could potentially
        // contain block exits for the current scope, we need to check if they
        // are contained in the list of block exits and remove them if they are.
        case PM_BREAK_NODE:
        case PM_NEXT_NODE:
        case PM_REDO_NODE: {
            const parser = data;
            const exits = parser.current_block_exits;
            const index = exits.indexOf(node);
            if (index !== -1) {
                exits.splice(index, 1);
            }

            // Note returning true here because these nodes could have
            // arguments that are themselves block exits.
            return true;
        }
        // When an implicit local variable is written to or targeted, it becomes
        // a regular, named local variable. This branch removes it from the list
        // of implicit parameters when that happens.
        case PM_LOCAL_VARIABLE_READ_NODE:
        case PM_IT_LOCAL_VARIABLE_READ_NODE: {
            const parser = data;
            const implicit_parameters = parser.current_scope.implicit_parameters;
            const index = implicit_parameters.indexOf(node);
            if (index !== -1) {
                implicit_parameters.splice(index, 1);
            }

            return false;
        }
        default:
            return true;
    }
}

/**
 * When we are about to destroy a set of nodes that could potentially be
 * referenced by one or more lists on the parser, then remove them from those
 * lists so we don't get a use-after-free.
 */
function pm_node_unreference(parser, node) {
    pm_visit_node(node, pm_node_unreference_each, parser);
}

/******************************************************************************/
/* Writes and targets                                                         */
/******************************************************************************/

/**
 * Convert the name of a method into the corresponding write method name. For
 * example, foo would be turned into foo=.
 *
 * Adaptation: name_field is a { value } box standing in for the C
 * pm_constant_id_t * out-param.
 */
function parse_write_name(parser, name) {
    // The method name needs to change. If we previously had
    // foo, we now need foo=. In this case we'll allocate a new
    // owned string, copy the previous method name in, and
    // append an =.
    const constant = pm_constant_pool_id_to_constant(parser.constant_pool, name);
    const name_text = constant.start + "=";

    // Now switch the name to the new string.
    return pm_constant_pool_insert_owned(parser.constant_pool, name_text, name_text.length);
}

/**
 * Certain expressions are not targetable, but in order to provide a better
 * experience we give a specific error message. In order to maintain as much
 * information in the tree as possible, we replace them with local variable
 * writes.
 */
function parse_unwriteable_target(parser, target) {
    switch (target.type) {
        case PM_SOURCE_ENCODING_NODE: pm_parser_err_node(parser, target, PM_ERR_EXPRESSION_NOT_WRITABLE_ENCODING); break;
        case PM_FALSE_NODE: pm_parser_err_node(parser, target, PM_ERR_EXPRESSION_NOT_WRITABLE_FALSE); break;
        case PM_SOURCE_FILE_NODE: pm_parser_err_node(parser, target, PM_ERR_EXPRESSION_NOT_WRITABLE_FILE); break;
        case PM_SOURCE_LINE_NODE: pm_parser_err_node(parser, target, PM_ERR_EXPRESSION_NOT_WRITABLE_LINE); break;
        case PM_NIL_NODE: pm_parser_err_node(parser, target, PM_ERR_EXPRESSION_NOT_WRITABLE_NIL); break;
        case PM_SELF_NODE: pm_parser_err_node(parser, target, PM_ERR_EXPRESSION_NOT_WRITABLE_SELF); break;
        case PM_TRUE_NODE: pm_parser_err_node(parser, target, PM_ERR_EXPRESSION_NOT_WRITABLE_TRUE); break;
        default: break;
    }

    const name = pm_parser_constant_id_location(parser, target.location.start, target.location.end);
    const result = pm_local_variable_target_node_create(parser, target.location, name, 0);

    return result;
}

/**
 * Whether a call node can be re-read as a write target: a message that is not
 * a `!`/`?` method, with no opening, no arguments and no block. `parse_target`
 * and `parse_write` both gate their `PM_CALL_NODE` case on exactly this.
 */
function call_is_write_target(parser, call) {
    return (call.message_loc.start !== null) &&
        ((parser.source.charCodeAt(call.message_loc.end - 1)) !== 0x21 /* '!' */) &&
        ((parser.source.charCodeAt(call.message_loc.end - 1)) !== 0x3f /* '?' */) &&
        (call.opening_loc.start === null) &&
        (call.arguments === null) &&
        (call.block === null);
}

/**
 * Convert the given node into a valid target node.
 *
 * @param multiple Whether or not this target is part of a larger set of
 *   targets. If it is, then the &. operator is not allowed.
 * @param splat Whether or not this target is a child of a splat target. If it
 *   is, then fewer patterns are allowed.
 */
function parse_target(parser, target, multiple, splat_parent) {
    switch (target.type) {
        case PM_MISSING_NODE:
            return target;
        case PM_SOURCE_ENCODING_NODE:
        case PM_FALSE_NODE:
        case PM_SOURCE_FILE_NODE:
        case PM_SOURCE_LINE_NODE:
        case PM_NIL_NODE:
        case PM_SELF_NODE:
        case PM_TRUE_NODE: {
            // In these special cases, we have specific error messages and we
            // will replace them with local variable writes.
            return parse_unwriteable_target(parser, target);
        }
        case PM_CLASS_VARIABLE_READ_NODE:
            // assert(sizeof(pm_class_variable_target_node_t) == sizeof(pm_class_variable_read_node_t)): debug-only in C.
            target.type = PM_CLASS_VARIABLE_TARGET_NODE;
            return target;
        case PM_CONSTANT_PATH_NODE:
            if (context_def_p(parser)) {
                pm_parser_err_node(parser, target, PM_ERR_WRITE_TARGET_IN_METHOD);
            }

            target.type = PM_CONSTANT_PATH_TARGET_NODE;

            return target;
        case PM_CONSTANT_READ_NODE:
            if (context_def_p(parser)) {
                pm_parser_err_node(parser, target, PM_ERR_WRITE_TARGET_IN_METHOD);
            }

            target.type = PM_CONSTANT_TARGET_NODE;

            return target;
        case PM_BACK_REFERENCE_READ_NODE:
        case PM_NUMBERED_REFERENCE_READ_NODE:
            PM_PARSER_ERR_NODE_FORMAT_CONTENT(parser, target, PM_ERR_WRITE_TARGET_READONLY);
            return target;
        case PM_GLOBAL_VARIABLE_READ_NODE:
            target.type = PM_GLOBAL_VARIABLE_TARGET_NODE;
            return target;
        case PM_LOCAL_VARIABLE_READ_NODE: {
            if (pm_token_is_numbered_parameter(parser.source, target.location.start, target.location.end)) {
                PM_PARSER_ERR_FORMAT(parser, target.location.start, target.location.end, PM_ERR_PARAMETER_NUMBERED_RESERVED, parser.source.slice(target.location.start, target.location.start + 2));
                pm_node_unreference(parser, target);
            }

            const name = target.name;
            const depth = target.depth;
            pm_locals_unread(pm_parser_scope_find(parser, depth).locals, name);

            target.type = PM_LOCAL_VARIABLE_TARGET_NODE;

            return target;
        }
        case PM_IT_LOCAL_VARIABLE_READ_NODE: {
            const name = pm_parser_local_add_constant(parser, "it", 2);
            const node = pm_local_variable_target_node_create(parser, target.location, name, 0);

            pm_node_unreference(parser, target);

            return node;
        }
        case PM_INSTANCE_VARIABLE_READ_NODE:
            target.type = PM_INSTANCE_VARIABLE_TARGET_NODE;
            return target;
        case PM_MULTI_TARGET_NODE:
            if (splat_parent) {
                // Multi target is not accepted in all positions. If this is one
                // of them, then we need to add an error.
                pm_parser_err_node(parser, target, PM_ERR_WRITE_TARGET_UNEXPECTED);
            }

            return target;
        case PM_SPLAT_NODE: {
            const splat = target;

            if (splat.expression !== null) {
                splat.expression = parse_target(parser, splat.expression, multiple, true);
            }

            return splat;
        }
        case PM_CALL_NODE: {
            const call = target;

            // If we have no arguments to the call node and we need this to be a
            // target then this is either a method call or a local variable
            // write.
            if (call_is_write_target(parser, call)) {
                if (call.receiver === null) {
                    // When we get here, we have a local variable write, because it
                    // was previously marked as a method call but now we have an =.
                    // This looks like:
                    //
                    //     foo = 1
                    //
                    // When it was parsed in the prefix position, foo was seen as a
                    // method call with no receiver and no arguments. Now we have an
                    // =, so we know it's a local variable write.
                    const message_loc = call.message_loc;

                    const name = pm_parser_local_add_location(parser, message_loc.start, message_loc.end, 0);

                    return pm_local_variable_target_node_create(parser, message_loc, name, 0);
                }

                if (peek_at(parser, call.message_loc.start) === 0x5f /* '_' */ || parser.encoding.alnum_char(parser.source, call.message_loc.start, call.message_loc.end - call.message_loc.start)) {
                    if (multiple && PM_NODE_FLAG_P(call, PM_CALL_NODE_FLAGS_SAFE_NAVIGATION)) {
                        pm_parser_err_node(parser, call, PM_ERR_UNEXPECTED_SAFE_NAVIGATION);
                    }

                    call.name = parse_write_name(parser, call.name);

                    return pm_call_target_node_create(parser, call);
                }
            }

            // If there is no call operator and the message is "[]" then this is
            // an aref expression, and we can transform it into an aset
            // expression.
            if (PM_NODE_FLAG_P(call, PM_CALL_NODE_FLAGS_INDEX)) {
                return pm_index_target_node_create(parser, call);
            }
        }
        // PRISM_FALLTHROUGH
        default:
            // In this case we have a node that we don't know how to convert
            // into a target. We need to treat it as an error. For now, we'll
            // mark it as an error and just skip right past it.
            pm_parser_err_node(parser, target, PM_ERR_WRITE_TARGET_UNEXPECTED);
            return target;
    }
}

/**
 * Parse a write target and validate that it is in a valid position for
 * assignment.
 */
function parse_target_validate(parser, target, multiple) {
    const result = parse_target(parser, target, multiple, false);

    // Ensure that we have one of an =, an 'in' in for indexes, and a ')' in
    // parens after the targets.
    if (
        !match1(parser, PM_TOKEN_EQUAL) &&
        !(context_p(parser, PM_CONTEXT_FOR_INDEX) && match1(parser, PM_TOKEN_KEYWORD_IN)) &&
        !(context_p(parser, PM_CONTEXT_PARENS) && match1(parser, PM_TOKEN_PARENTHESIS_RIGHT))
    ) {
        pm_parser_err_node(parser, result, PM_ERR_WRITE_TARGET_UNEXPECTED);
    }

    return result;
}

/**
 * Potentially wrap a constant write node in a shareable constant node depending
 * on the current state.
 */
function parse_shareable_constant_write(parser, write) {
    const shareable_constant = pm_parser_scope_shareable_constant_get(parser);

    if (shareable_constant !== PM_SCOPE_SHAREABLE_CONSTANT_NONE) {
        return pm_shareable_constant_node_create(parser, write, shareable_constant);
    }

    return write;
}

/**
 * Convert the given node into a valid write node.
 */
function parse_write(parser, target, operator, value) {
    switch (target.type) {
        case PM_MISSING_NODE:
            return target;
        case PM_CLASS_VARIABLE_READ_NODE: {
            const node = pm_class_variable_write_node_create(parser, target, operator, value);
            return node;
        }
        case PM_CONSTANT_PATH_NODE: {
            const node = pm_constant_path_write_node_create(parser, target, operator, value);

            if (context_def_p(parser)) {
                pm_parser_err_node(parser, node, PM_ERR_WRITE_TARGET_IN_METHOD);
            }

            return parse_shareable_constant_write(parser, node);
        }
        case PM_CONSTANT_READ_NODE: {
            const node = pm_constant_write_node_create(parser, target, operator, value);

            if (context_def_p(parser)) {
                pm_parser_err_node(parser, node, PM_ERR_WRITE_TARGET_IN_METHOD);
            }

            return parse_shareable_constant_write(parser, node);
        }
        case PM_BACK_REFERENCE_READ_NODE:
        case PM_NUMBERED_REFERENCE_READ_NODE:
            PM_PARSER_ERR_NODE_FORMAT_CONTENT(parser, target, PM_ERR_WRITE_TARGET_READONLY);
            // PRISM_FALLTHROUGH
        case PM_GLOBAL_VARIABLE_READ_NODE: {
            const node = pm_global_variable_write_node_create(parser, target, operator, value);
            return node;
        }
        case PM_LOCAL_VARIABLE_READ_NODE: {
            const local_read = target;

            const name = local_read.name;
            const name_loc = target.location;

            const depth = local_read.depth;
            const scope = pm_parser_scope_find(parser, depth);

            if (pm_token_is_numbered_parameter(parser.source, target.location.start, target.location.end)) {
                const diag_id = ((scope.parameters & PM_SCOPE_PARAMETERS_NUMBERED_FOUND) !== 0) ? PM_ERR_EXPRESSION_NOT_WRITABLE_NUMBERED : PM_ERR_PARAMETER_NUMBERED_RESERVED;
                PM_PARSER_ERR_FORMAT(parser, target.location.start, target.location.end, diag_id, parser.source.slice(target.location.start, target.location.start + 2));
                pm_node_unreference(parser, target);
            }

            pm_locals_unread(scope.locals, name);

            return pm_local_variable_write_node_create(parser, name, depth, value, name_loc, operator);
        }
        case PM_IT_LOCAL_VARIABLE_READ_NODE: {
            const name = pm_parser_local_add_constant(parser, "it", 2);
            const node = pm_local_variable_write_node_create(parser, name, 0, value, target.location, operator);

            pm_node_unreference(parser, target);

            return node;
        }
        case PM_INSTANCE_VARIABLE_READ_NODE: {
            const write_node = pm_instance_variable_write_node_create(parser, target, operator, value);
            return write_node;
        }
        case PM_MULTI_TARGET_NODE:
            return pm_multi_write_node_create(parser, target, operator, value);
        case PM_SPLAT_NODE: {
            const splat = target;

            if (splat.expression !== null) {
                splat.expression = parse_write(parser, splat.expression, operator, value);
            }

            const multi_target = pm_multi_target_node_create(parser);
            pm_multi_target_node_targets_append(parser, multi_target, splat);

            return pm_multi_write_node_create(parser, multi_target, operator, value);
        }
        case PM_CALL_NODE: {
            const call = target;

            // If we have no arguments to the call node and we need this to be a
            // target then this is either a method call or a local variable
            // write.
            if (call_is_write_target(parser, call)) {
                if (call.receiver === null) {
                    // When we get here, we have a local variable write, because it
                    // was previously marked as a method call but now we have an =.
                    // This looks like:
                    //
                    //     foo = 1
                    //
                    // When it was parsed in the prefix position, foo was seen as a
                    // method call with no receiver and no arguments. Now we have an
                    // =, so we know it's a local variable write.
                    const message = call.message_loc;

                    pm_parser_local_add_location(parser, message.start, message.end, 0);

                    const constant_id = pm_parser_constant_id_location(parser, message.start, message.end);
                    target = pm_local_variable_write_node_create(parser, constant_id, 0, value, message, operator);

                    pm_refute_numbered_parameter(parser, message.start, message.end);
                    return target;
                }

                if (char_is_identifier_start(parser, call.message_loc.start, parser.end - call.message_loc.start)) {
                    // When we get here, we have a method call, because it was
                    // previously marked as a method call but now we have an =. This
                    // looks like:
                    //
                    //     foo.bar = 1
                    //
                    // When it was parsed in the prefix position, foo.bar was seen as a
                    // method call with no arguments. Now we have an =, so we know it's
                    // a method call with an argument. In this case we will create the
                    // arguments node, parse the argument, and add it to the list.
                    const arguments_ = pm_arguments_node_create(parser);
                    call.arguments = arguments_;

                    pm_arguments_node_arguments_append(arguments_, value);
                    call.location.end = arguments_.location.end;
                    call.equal_loc = PM_LOCATION_TOKEN_VALUE(operator);

                    call.name = parse_write_name(parser, call.name);

                    pm_node_flag_set(call, PM_CALL_NODE_FLAGS_ATTRIBUTE_WRITE | pm_implicit_array_write_flags(value, PM_CALL_NODE_FLAGS_IMPLICIT_ARRAY));

                    return call;
                }
            }

            // If there is no call operator and the message is "[]" then this is
            // an aref expression, and we can transform it into an aset
            // expression.
            if (PM_NODE_FLAG_P(call, PM_CALL_NODE_FLAGS_INDEX)) {
                if (call.arguments === null) {
                    call.arguments = pm_arguments_node_create(parser);
                }

                pm_arguments_node_arguments_append(call.arguments, value);
                target.location.end = value.location.end;

                // Replace the name with "[]=".
                call.name = pm_parser_constant_id_constant(parser, "[]=", 3);
                call.equal_loc = PM_LOCATION_TOKEN_VALUE(operator);

                // Ensure that the arguments for []= don't contain keywords
                pm_index_arguments_check(parser, call.arguments, call.block);
                pm_node_flag_set(call, PM_CALL_NODE_FLAGS_ATTRIBUTE_WRITE | pm_implicit_array_write_flags(value, PM_CALL_NODE_FLAGS_IMPLICIT_ARRAY));

                return target;
            }

            // If there are arguments on the call node, then it can't be a
            // method call ending with = or a local variable write, so it must
            // be a syntax error. In this case we'll fall through to our default
            // handling. We need to free the value that we parsed because there
            // is no way for us to attach it to the tree at this point.
            //
            // Since it is possible for the value to contain an implicit
            // parameter somewhere in its subtree, we need to walk it and remove
            // any implicit parameters from the list of implicit parameters for
            // the current scope.
            pm_node_unreference(parser, value);
        }
        // PRISM_FALLTHROUGH
        default:
            // In this case we have a node that we don't know how to convert into a
            // target. We need to treat it as an error. For now, we'll mark it as an
            // error and just skip right past it.
            pm_parser_err_token(parser, operator, PM_ERR_WRITE_TARGET_UNEXPECTED);
            return target;
    }
}

/**
 * Certain expressions are not writable, but in order to provide a better
 * experience we give a specific error message. In order to maintain as much
 * information in the tree as possible, we replace them with local variable
 * writes.
 */
function parse_unwriteable_write(parser, target, equals, value) {
    switch (target.type) {
        case PM_SOURCE_ENCODING_NODE: pm_parser_err_token(parser, equals, PM_ERR_EXPRESSION_NOT_WRITABLE_ENCODING); break;
        case PM_FALSE_NODE: pm_parser_err_token(parser, equals, PM_ERR_EXPRESSION_NOT_WRITABLE_FALSE); break;
        case PM_SOURCE_FILE_NODE: pm_parser_err_token(parser, equals, PM_ERR_EXPRESSION_NOT_WRITABLE_FILE); break;
        case PM_SOURCE_LINE_NODE: pm_parser_err_token(parser, equals, PM_ERR_EXPRESSION_NOT_WRITABLE_LINE); break;
        case PM_NIL_NODE: pm_parser_err_token(parser, equals, PM_ERR_EXPRESSION_NOT_WRITABLE_NIL); break;
        case PM_SELF_NODE: pm_parser_err_token(parser, equals, PM_ERR_EXPRESSION_NOT_WRITABLE_SELF); break;
        case PM_TRUE_NODE: pm_parser_err_token(parser, equals, PM_ERR_EXPRESSION_NOT_WRITABLE_TRUE); break;
        default: break;
    }

    const name = pm_parser_local_add_location(parser, target.location.start, target.location.end, 1);
    const result = pm_local_variable_write_node_create(parser, name, 0, value, target.location, equals);

    return result;
}

/**
 * Parse a list of targets for assignment. This is used in the case of a for
 * loop or a multi-assignment. For example, in the following code:
 *
 *     for foo, bar in baz
 *         ^^^^^^^^
 *
 * The targets are `foo` and `bar`. This function will either return a single
 * target node or a multi-target node.
 */
function parse_targets(parser, first_target, binding_power, depth) {
    let has_rest = PM_NODE_TYPE_P(first_target, PM_SPLAT_NODE);

    const result = pm_multi_target_node_create(parser);
    pm_multi_target_node_targets_append(parser, result, parse_target(parser, first_target, true, false));

    while (accept1(parser, PM_TOKEN_COMMA)) {
        if (accept1(parser, PM_TOKEN_USTAR)) {
            // Here we have a splat operator. It can have a name or be
            // anonymous. It can be the final target or be in the middle if
            // there haven't been any others yet.
            if (has_rest) {
                pm_parser_err_previous(parser, PM_ERR_MULTI_ASSIGN_MULTI_SPLATS);
            }

            const star_operator = copyToken(parser.previous);
            let name = null;

            if (token_begins_expression_p(parser.current.type)) {
                name = parse_expression(parser, binding_power, false, false, PM_ERR_EXPECT_EXPRESSION_AFTER_STAR, depth + 1);
                name = parse_target(parser, name, true, true);
            }

            const splat = pm_splat_node_create(parser, star_operator, name);
            pm_multi_target_node_targets_append(parser, result, splat);
            has_rest = true;
        } else if (match1(parser, PM_TOKEN_PARENTHESIS_LEFT)) {
            context_push(parser, PM_CONTEXT_MULTI_TARGET);
            let target = parse_expression(parser, binding_power, false, false, PM_ERR_EXPECT_EXPRESSION_AFTER_COMMA, depth + 1);
            target = parse_target(parser, target, true, false);

            pm_multi_target_node_targets_append(parser, result, target);
            context_pop(parser);
        } else if (token_begins_expression_p(parser.current.type)) {
            let target = parse_expression(parser, binding_power, false, false, PM_ERR_EXPECT_EXPRESSION_AFTER_COMMA, depth + 1);
            target = parse_target(parser, target, true, false);

            pm_multi_target_node_targets_append(parser, result, target);
        } else if (!match1(parser, PM_TOKEN_EOF)) {
            // If we get here, then we have a trailing , in a multi target node.
            // We'll add an implicit rest node to represent this.
            const rest = pm_implicit_rest_node_create(parser, parser.previous);
            pm_multi_target_node_targets_append(parser, result, rest);
            break;
        }
    }

    return result;
}

/**
 * Parse a list of targets and validate that it is in a valid position for
 * assignment.
 */
function parse_targets_validate(parser, first_target, binding_power, depth) {
    const result = parse_targets(parser, first_target, binding_power, depth);
    accept1(parser, PM_TOKEN_NEWLINE);

    // Ensure that we have either an = or a ) after the targets.
    if (!match2(parser, PM_TOKEN_EQUAL, PM_TOKEN_PARENTHESIS_RIGHT)) {
        pm_parser_err_node(parser, result, PM_ERR_WRITE_TARGET_UNEXPECTED);
    }

    return result;
}

/**
 * Parse a list of statements separated by newlines or semicolons.
 */
function parse_statements(parser, context, depth) {
    // First, skip past any optional terminators that might be at the beginning
    // of the statements.
    while (accept2(parser, PM_TOKEN_SEMICOLON, PM_TOKEN_NEWLINE));

    // If we have a terminator, then we can just return NULL.
    if (context_terminator(context, parser.current)) return null;

    const statements = pm_statements_node_create(parser);

    // At this point we know we have at least one statement, and that it
    // immediately follows the current token.
    context_push(parser, context);

    while (true) {
        const node = parse_expression(parser, PM_BINDING_POWER_STATEMENT, true, false, PM_ERR_CANNOT_PARSE_EXPRESSION, depth + 1);
        pm_statements_node_body_append(parser, statements, node, true);

        // If we're recovering from a syntax error, then we need to stop parsing
        // the statements now.
        if (parser.recovering) {
            // If this is the level of context where the recovery has happened,
            // then we can mark the parser as done recovering.
            if (context_terminator(context, parser.current)) parser.recovering = false;
            break;
        }

        // If we have a terminator, then we will parse all consecutive
        // terminators and then continue parsing the statements list.
        if (accept2(parser, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON)) {
            // If we have a terminator, then we will continue parsing the
            // statements list.
            while (accept2(parser, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON));
            if (context_terminator(context, parser.current)) break;

            // Now we can continue parsing the list of statements.
            continue;
        }

        // At this point we have a list of statements that are not terminated by
        // a newline or semicolon. At this point we need to check if we're at
        // the end of the statements list. If we are, then we should break out
        // of the loop.
        if (context_terminator(context, parser.current)) break;

        // At this point, we have a syntax error, because the statement was not
        // terminated by a newline or semicolon, and we're not at the end of the
        // statements list. Ideally we should scan forward to determine if we
        // should insert a missing terminator or break out of parsing the
        // statements list at this point.
        //
        // We don't have that yet, so instead we'll do a more naive approach. If
        // we were unable to parse an expression, then we will skip past this
        // token and continue parsing the statements list. Otherwise we'll add
        // an error and continue parsing the statements list.
        if (PM_NODE_TYPE_P(node, PM_MISSING_NODE)) {
            parser_lex(parser);

            // If we are at the end of the file, then we need to stop parsing
            // the statements entirely at this point. Mark the parser as
            // recovering, as we know that EOF closes the top-level context, and
            // then break out of the loop.
            if (match1(parser, PM_TOKEN_EOF)) {
                parser.recovering = true;
                break;
            }

            while (accept2(parser, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON));
            if (context_terminator(context, parser.current)) break;
        } else if (!accept2(parser, PM_TOKEN_NEWLINE, PM_TOKEN_EOF)) {
            // This is an inlined version of accept1 because the error that we
            // want to add has varargs. If this happens again, we should
            // probably extract a helper function.
            PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, PM_ERR_EXPECT_EOL_AFTER_STATEMENT, pm_token_type_human(parser.current.type));
            parser.previous.start = parser.previous.end;
            parser.previous.type = PM_TOKEN_MISSING;
        }
    }

    context_pop(parser);
    let last_value = true;
    switch (context) {
        case PM_CONTEXT_BEGIN_ENSURE:
        case PM_CONTEXT_DEF_ENSURE:
            last_value = false;
            break;
        default:
            break;
    }
    pm_void_statements_check(parser, statements, last_value);

    return statements;
}

/******************************************************************************/
/* Static literal helpers                                                     */
/******************************************************************************/

// Adaptation: helper for C's `pm_static_literals_t literals = { 0 };`
// (zero-initialized static literals set; shape per static_literals.js).
function pm_static_literals_zeroed() {
    return {
        integer_nodes: new Map(),
        float_nodes: new Map(),
        number_nodes: new Map(),
        string_nodes: new Map(),
        regexp_nodes: new Map(),
        symbol_nodes: new Map(),
        true_node: null,
        false_node: null,
        nil_node: null,
        source_encoding_node: null
    };
}

/**
 * Add a node to a set of static literals that holds a set of hash keys. If the
 * node is a duplicate, then add an appropriate warning.
 */
function pm_hash_key_static_literals_add(parser, literals, node) {
    const duplicated = pm_static_literals_add(parser.newline_list, parser.start_line, literals, node, true);

    if (duplicated !== null) {
        const buffer = { length: 0, capacity: 0, bytes: new Uint8Array(0) };
        pm_static_literal_inspect(buffer, parser.newline_list, parser.start_line, parser.encoding.name, duplicated, parser.source);

        pm_diagnostic_list_append_format(
            parser.warning_list,
            duplicated.location.start,
            duplicated.location.end,
            PM_WARN_DUPLICATED_HASH_KEY,
            pm_buffer_length(buffer),
            pm_buffer_value(buffer),
            pm_newline_list_line_column(parser.newline_list, node.location.start, parser.start_line).line
        );

    }
}

/**
 * Add a node to a set of static literals that holds a set of hash keys. If the
 * node is a duplicate, then add an appropriate warning.
 */
function pm_when_clause_static_literals_add(parser, literals, node) {
    let previous;

    if ((previous = pm_static_literals_add(parser.newline_list, parser.start_line, literals, node, false)) !== null) {
        pm_diagnostic_list_append_format(
            parser.warning_list,
            node.location.start,
            node.location.end,
            PM_WARN_DUPLICATED_WHEN_CLAUSE,
            pm_newline_list_line_column(parser.newline_list, node.location.start, parser.start_line).line,
            pm_newline_list_line_column(parser.newline_list, previous.location.start, parser.start_line).line
        );
    }
}

/******************************************************************************/
/* Assocs and arguments                                                       */
/******************************************************************************/

/**
 * Parse all of the elements of a hash. Return true if a double splat was found.
 */
function parse_assocs(parser, literals, node, depth) {
    // assert(PM_NODE_TYPE_P(node, PM_HASH_NODE) || PM_NODE_TYPE_P(node, PM_KEYWORD_HASH_NODE)): debug-only in C.
    let contains_keyword_splat = false;

    while (true) {
        let element;

        switch (parser.current.type) {
            case PM_TOKEN_USTAR_STAR: {
                parser_lex(parser);
                const operator = copyToken(parser.previous);
                let value = null;

                if (match1(parser, PM_TOKEN_BRACE_LEFT)) {
                    // If we're about to parse a nested hash that is being
                    // pushed into this hash directly with **, then we want the
                    // inner hash to share the static literals with the outer
                    // hash.
                    parser.current_hash_keys = literals;
                    value = parse_value_expression(parser, PM_BINDING_POWER_DEFINED, false, false, PM_ERR_EXPECT_EXPRESSION_AFTER_SPLAT_HASH, depth + 1);
                } else if (token_begins_expression_p(parser.current.type)) {
                    value = parse_value_expression(parser, PM_BINDING_POWER_DEFINED, false, false, PM_ERR_EXPECT_EXPRESSION_AFTER_SPLAT_HASH, depth + 1);
                } else {
                    pm_parser_scope_forwarding_keywords_check(parser, operator);
                }

                element = pm_assoc_splat_node_create(parser, value, operator);
                contains_keyword_splat = true;
                break;
            }
            case PM_TOKEN_LABEL: {
                const label = copyToken(parser.current);
                parser_lex(parser);

                const key = pm_symbol_node_label_create(parser, label);
                pm_hash_key_static_literals_add(parser, literals, key);

                const operator = not_provided(parser);
                let value = null;

                if (token_begins_expression_p(parser.current.type)) {
                    value = parse_value_expression(parser, PM_BINDING_POWER_DEFINED, false, false, PM_ERR_HASH_EXPRESSION_AFTER_LABEL, depth + 1);
                } else {
                    if (parser.encoding.isupper_char(parser.source, label.start, (label.end - 1) - label.start)) {
                        const constant = { type: PM_TOKEN_CONSTANT, start: label.start, end: label.end - 1 };
                        value = pm_constant_read_node_create(parser, constant);
                    } else {
                        let depth = -1; // shadows the depth parameter, like C
                        const identifier = { type: PM_TOKEN_IDENTIFIER, start: label.start, end: label.end - 1 };

                        if ((parser.source.charCodeAt(identifier.end - 1)) === 0x21 /* '!' */ || (parser.source.charCodeAt(identifier.end - 1)) === 0x3f /* '?' */) {
                            PM_PARSER_ERR_TOKEN_FORMAT_CONTENT(parser, identifier, PM_ERR_INVALID_LOCAL_VARIABLE_READ);
                        } else {
                            depth = pm_parser_local_depth(parser, identifier);
                        }

                        if (depth === -1) {
                            value = pm_call_node_variable_call_create(parser, identifier);
                        } else {
                            value = pm_local_variable_read_node_create(parser, identifier, depth);
                        }
                    }

                    value.location.end++;
                    value = pm_implicit_node_create(parser, value);
                }

                element = pm_assoc_node_create(parser, key, operator, value);
                break;
            }
            default: {
                const key = parse_value_expression(parser, PM_BINDING_POWER_DEFINED, false, true, PM_ERR_HASH_KEY, depth + 1);

                // Hash keys that are strings are automatically frozen. We will
                // mark that here.
                if (PM_NODE_TYPE_P(key, PM_STRING_NODE)) {
                    pm_node_flag_set(key, PM_STRING_FLAGS_FROZEN | PM_NODE_FLAG_STATIC_LITERAL);
                }

                pm_hash_key_static_literals_add(parser, literals, key);

                let operator;
                if (pm_symbol_node_label_p(parser, key)) {
                    operator = not_provided(parser);
                } else {
                    expect1(parser, PM_TOKEN_EQUAL_GREATER, PM_ERR_HASH_ROCKET);
                    operator = copyToken(parser.previous);
                }

                const value = parse_value_expression(parser, PM_BINDING_POWER_DEFINED, false, false, PM_ERR_HASH_VALUE, depth + 1);
                element = pm_assoc_node_create(parser, key, operator, value);
                break;
            }
        }

        if (PM_NODE_TYPE_P(node, PM_HASH_NODE)) {
            pm_hash_node_elements_append(node, element);
        } else {
            pm_keyword_hash_node_elements_append(node, element);
        }

        // If there's no comma after the element, then we're done.
        if (!accept1(parser, PM_TOKEN_COMMA)) break;

        // If the next element starts with a label or a **, then we know we have
        // another element in the hash, so we'll continue parsing.
        if (match2(parser, PM_TOKEN_USTAR_STAR, PM_TOKEN_LABEL)) continue;

        // Otherwise we need to check if the subsequent token begins an expression.
        // If it does, then we'll continue parsing.
        if (token_begins_expression_p(parser.current.type)) continue;

        // Otherwise by default we will exit out of this loop.
        break;
    }

    return contains_keyword_splat;
}

function argument_allowed_for_bare_hash(parser, argument) {
    if (pm_symbol_node_label_p(parser, argument)) {
        return true;
    }

    switch (argument.type) {
        case PM_CALL_NODE: {
            if (argument.opening_loc.start === null && argument.arguments !== null) {
                if (PM_NODE_FLAG_P(argument.arguments, PM_ARGUMENTS_NODE_FLAGS_CONTAINS_KEYWORDS | PM_ARGUMENTS_NODE_FLAGS_CONTAINS_SPLAT)) {
                    return false;
                }
                if (argument.block !== null) {
                    return false;
                }
            }
            break;
        }
        default: break;
    }
    return accept1(parser, PM_TOKEN_EQUAL_GREATER);
}

/**
 * Append an argument to a list of arguments.
 */
function parse_arguments_append(parser, arguments_, argument) {
    if (arguments_.arguments === null) {
        arguments_.arguments = pm_arguments_node_create(parser);
    }

    pm_arguments_node_arguments_append(arguments_.arguments, argument);
}

/**
 * Parse a list of arguments.
 */
function parse_arguments(parser, arguments_, accepts_forwarding, terminator, depth) {
    const binding_power = pm_binding_powers[parser.current.type].left;

    // First we need to check if the next token is one that could be the start
    // of an argument. If it's not, then we can just return.
    if (
        match2(parser, terminator, PM_TOKEN_EOF) ||
        (binding_power !== PM_BINDING_POWER_UNSET && binding_power < PM_BINDING_POWER_RANGE) ||
        context_terminator(parser.current_context.context, parser.current)
    ) {
        return;
    }

    let parsed_first_argument = false;
    let parsed_bare_hash = false;
    let parsed_block_argument = false;
    let parsed_forwarding_arguments = false;

    while (!match1(parser, PM_TOKEN_EOF)) {
        if (parsed_forwarding_arguments) {
            pm_parser_err_current(parser, PM_ERR_ARGUMENT_AFTER_FORWARDING_ELLIPSES);
        }

        let argument = null;

        switch (parser.current.type) {
            case PM_TOKEN_USTAR_STAR:
            case PM_TOKEN_LABEL: {
                if (parsed_bare_hash) {
                    pm_parser_err_current(parser, PM_ERR_ARGUMENT_BARE_HASH);
                }

                const hash = pm_keyword_hash_node_create(parser);
                argument = hash;

                const hash_keys = pm_static_literals_zeroed();
                const contains_keyword_splat = parse_assocs(parser, hash_keys, hash, depth + 1);

                parse_arguments_append(parser, arguments_, argument);

                let flags = PM_ARGUMENTS_NODE_FLAGS_CONTAINS_KEYWORDS;
                if (contains_keyword_splat) flags |= PM_ARGUMENTS_NODE_FLAGS_CONTAINS_KEYWORD_SPLAT;
                pm_node_flag_set(arguments_.arguments, flags);

                parsed_bare_hash = true;

                break;
            }
            case PM_TOKEN_UAMPERSAND: {
                parser_lex(parser);
                const operator = copyToken(parser.previous);
                let expression = null;

                if (token_begins_expression_p(parser.current.type)) {
                    expression = parse_value_expression(parser, PM_BINDING_POWER_DEFINED, false, false, PM_ERR_EXPECT_ARGUMENT, depth + 1);
                } else {
                    pm_parser_scope_forwarding_block_check(parser, operator);
                }

                argument = pm_block_argument_node_create(parser, operator, expression);
                if (parsed_block_argument) {
                    parse_arguments_append(parser, arguments_, argument);
                } else {
                    arguments_.block = argument;
                }

                if (match1(parser, PM_TOKEN_COMMA)) {
                    pm_parser_err_current(parser, PM_ERR_ARGUMENT_AFTER_BLOCK);
                }

                parsed_block_argument = true;
                break;
            }
            case PM_TOKEN_USTAR: {
                parser_lex(parser);
                const operator = copyToken(parser.previous);

                if (match4(parser, PM_TOKEN_PARENTHESIS_RIGHT, PM_TOKEN_COMMA, PM_TOKEN_SEMICOLON, PM_TOKEN_BRACKET_RIGHT)) {
                    pm_parser_scope_forwarding_positionals_check(parser, operator);
                    argument = pm_splat_node_create(parser, operator, null);
                    if (parsed_bare_hash) {
                        pm_parser_err_previous(parser, PM_ERR_ARGUMENT_SPLAT_AFTER_ASSOC_SPLAT);
                    }
                } else {
                    const expression = parse_value_expression(parser, PM_BINDING_POWER_DEFINED, false, false, PM_ERR_EXPECT_EXPRESSION_AFTER_SPLAT, depth + 1);

                    if (parsed_bare_hash) {
                        pm_parser_err(parser, operator.start, expression.location.end, PM_ERR_ARGUMENT_SPLAT_AFTER_ASSOC_SPLAT);
                    }

                    argument = pm_splat_node_create(parser, operator, expression);
                }

                parse_arguments_append(parser, arguments_, argument);
                break;
            }
            case PM_TOKEN_UDOT_DOT_DOT: {
                if (accepts_forwarding) {
                    parser_lex(parser);

                    if (token_begins_expression_p(parser.current.type)) {
                        // If the token begins an expression then this ... was
                        // not actually argument forwarding but was instead a
                        // range.
                        const operator = copyToken(parser.previous);
                        const right = parse_expression(parser, PM_BINDING_POWER_RANGE, false, false, PM_ERR_EXPECT_EXPRESSION_AFTER_OPERATOR, depth + 1);

                        // If we parse a range, we need to validate that we
                        // didn't accidentally violate the nonassoc rules of the
                        // ... operator.
                        if (PM_NODE_TYPE_P(right, PM_RANGE_NODE)) {
                            const range = right;
                            pm_parser_err(parser, range.operator_loc.start, range.operator_loc.end, PM_ERR_UNEXPECTED_RANGE_OPERATOR);
                        }

                        argument = pm_range_node_create(parser, null, operator, right);
                    } else {
                        pm_parser_scope_forwarding_all_check(parser, parser.previous);
                        if (parsed_first_argument && terminator === PM_TOKEN_EOF) {
                            pm_parser_err_previous(parser, PM_ERR_ARGUMENT_FORWARDING_UNBOUND);
                        }

                        argument = pm_forwarding_arguments_node_create(parser, parser.previous);
                        parse_arguments_append(parser, arguments_, argument);
                        pm_node_flag_set(arguments_.arguments, PM_ARGUMENTS_NODE_FLAGS_CONTAINS_FORWARDING);
                        arguments_.has_forwarding = true;
                        parsed_forwarding_arguments = true;
                        break;
                    }
                }
            }
            // PRISM_FALLTHROUGH
            default: {
                if (argument === null) {
                    argument = parse_value_expression(parser, PM_BINDING_POWER_DEFINED, !parsed_first_argument, true, PM_ERR_EXPECT_ARGUMENT, depth + 1);
                }

                let contains_keywords = false;
                let contains_keyword_splat = false;

                if (argument_allowed_for_bare_hash(parser, argument)) {
                    if (parsed_bare_hash) {
                        pm_parser_err_previous(parser, PM_ERR_ARGUMENT_BARE_HASH);
                    }

                    let operator;
                    if (parser.previous.type === PM_TOKEN_EQUAL_GREATER) {
                        operator = copyToken(parser.previous);
                    } else {
                        operator = not_provided(parser);
                    }

                    const bare_hash = pm_keyword_hash_node_create(parser);
                    contains_keywords = true;

                    // Create the set of static literals for this hash.
                    const hash_keys = pm_static_literals_zeroed();
                    pm_hash_key_static_literals_add(parser, hash_keys, argument);

                    // Finish parsing the one we are part way through.
                    const value = parse_value_expression(parser, PM_BINDING_POWER_DEFINED, false, false, PM_ERR_HASH_VALUE, depth + 1);
                    argument = pm_assoc_node_create(parser, argument, operator, value);

                    pm_keyword_hash_node_elements_append(bare_hash, argument);
                    argument = bare_hash;

                    // Then parse more if we have a comma
                    if (accept1(parser, PM_TOKEN_COMMA) && (
                        token_begins_expression_p(parser.current.type) ||
                        match2(parser, PM_TOKEN_USTAR_STAR, PM_TOKEN_LABEL)
                    )) {
                        contains_keyword_splat = parse_assocs(parser, hash_keys, bare_hash, depth + 1);
                    }

                    parsed_bare_hash = true;
                }

                parse_arguments_append(parser, arguments_, argument);

                let flags = 0;
                if (contains_keywords) flags |= PM_ARGUMENTS_NODE_FLAGS_CONTAINS_KEYWORDS;
                if (contains_keyword_splat) flags |= PM_ARGUMENTS_NODE_FLAGS_CONTAINS_KEYWORD_SPLAT;
                pm_node_flag_set(arguments_.arguments, flags);

                break;
            }
        }

        parsed_first_argument = true;

        // If parsing the argument failed, we need to stop parsing arguments.
        if (PM_NODE_TYPE_P(argument, PM_MISSING_NODE) || parser.recovering) break;

        // If the terminator of these arguments is not EOF, then we have a
        // specific token we're looking for. In that case we can accept a
        // newline here because it is not functioning as a statement terminator.
        let accepted_newline = false;
        if (terminator !== PM_TOKEN_EOF) {
            accepted_newline = accept1(parser, PM_TOKEN_NEWLINE);
        }

        if (parser.previous.type === PM_TOKEN_COMMA && parsed_bare_hash) {
            // If we previously were on a comma and we just parsed a bare hash,
            // then we want to continue parsing arguments. This is because the
            // comma was grabbed up by the hash parser.
        } else if (accept1(parser, PM_TOKEN_COMMA)) {
            // If there was a comma, then we need to check if we also accepted a
            // newline. If we did, then this is a syntax error.
            if (accepted_newline) {
                pm_parser_err_previous(parser, PM_ERR_INVALID_COMMA);
            }

            // If this is a command call and an argument takes a block,
            // there can be no further arguments. For example,
            // `foo(bar 1 do end, 2)` should be rejected.
            if (PM_NODE_TYPE_P(argument, PM_CALL_NODE)) {
                const call = argument;
                if (call.opening_loc.start === null && call.arguments !== null && call.block !== null) {
                    pm_parser_err_previous(parser, PM_ERR_INVALID_COMMA);
                    break;
                }
            }
        } else {
            // If there is no comma at the end of the argument list then we're
            // done parsing arguments and can break out of this loop.
            break;
        }

        // If we hit the terminator, then that means we have a trailing comma so
        // we can accept that output as well.
        if (match1(parser, terminator)) break;
    }
}

/******************************************************************************/
/* Parameters                                                                 */
/******************************************************************************/

/**
 * Required parameters on method, block, and lambda declarations can be
 * destructured using parentheses. This looks like:
 *
 *     def foo((bar, baz))
 *     end
 *
 * It can recurse infinitely down, and splats are allowed to group arguments.
 */
function parse_required_destructured_parameter(parser) {
    expect1(parser, PM_TOKEN_PARENTHESIS_LEFT, PM_ERR_EXPECT_LPAREN_REQ_PARAMETER);

    const node = pm_multi_target_node_create(parser);
    pm_multi_target_node_opening_set(node, parser.previous);

    do {
        let param;

        // If we get here then we have a trailing comma, which isn't allowed in
        // the grammar. In other places, multi targets _do_ allow trailing
        // commas, so here we'll assume this is a mistake of the user not
        // knowing it's not allowed here.
        if (node.lefts.length > 0 && match1(parser, PM_TOKEN_PARENTHESIS_RIGHT)) {
            param = pm_implicit_rest_node_create(parser, parser.previous);
            pm_multi_target_node_targets_append(parser, node, param);
            pm_parser_err_current(parser, PM_ERR_PARAMETER_WILD_LOOSE_COMMA);
            break;
        }

        if (match1(parser, PM_TOKEN_PARENTHESIS_LEFT)) {
            param = parse_required_destructured_parameter(parser);
        } else if (accept1(parser, PM_TOKEN_USTAR)) {
            const star = copyToken(parser.previous);
            let value = null;

            if (accept1(parser, PM_TOKEN_IDENTIFIER)) {
                const name = copyToken(parser.previous);
                value = pm_required_parameter_node_create(parser, name);
                if (pm_parser_parameter_name_check(parser, name)) {
                    pm_node_flag_set_repeated_parameter(value);
                }
                pm_parser_local_add_token(parser, name, 1);
            }

            param = pm_splat_node_create(parser, star, value);
        } else {
            expect1(parser, PM_TOKEN_IDENTIFIER, PM_ERR_EXPECT_IDENT_REQ_PARAMETER);
            const name = copyToken(parser.previous);

            param = pm_required_parameter_node_create(parser, name);
            if (pm_parser_parameter_name_check(parser, name)) {
                pm_node_flag_set_repeated_parameter(param);
            }
            pm_parser_local_add_token(parser, name, 1);
        }

        pm_multi_target_node_targets_append(parser, node, param);
    } while (accept1(parser, PM_TOKEN_COMMA));

    accept1(parser, PM_TOKEN_NEWLINE);
    expect1(parser, PM_TOKEN_PARENTHESIS_RIGHT, PM_ERR_EXPECT_RPAREN_REQ_PARAMETER);
    pm_multi_target_node_closing_set(node, parser.previous);

    return node;
}

/**
 * This represents the different order states we can be in when parsing
 * method parameters.
 */
const PM_PARAMETERS_NO_CHANGE = 0; // Extra state for tokens that should not change the state
const PM_PARAMETERS_ORDER_NOTHING_AFTER = 1;
const PM_PARAMETERS_ORDER_KEYWORDS_REST = 2;
const PM_PARAMETERS_ORDER_KEYWORDS = 3;
const PM_PARAMETERS_ORDER_REST = 4;
const PM_PARAMETERS_ORDER_AFTER_OPTIONAL = 5;
const PM_PARAMETERS_ORDER_OPTIONAL = 6;
const PM_PARAMETERS_ORDER_NAMED = 7;
const PM_PARAMETERS_ORDER_NONE = 8;

/**
 * This matches parameters tokens with parameters state.
 */
const parameters_ordering = new Array(PM_TOKEN_MAXIMUM).fill(PM_PARAMETERS_NO_CHANGE);
parameters_ordering[PM_TOKEN_UAMPERSAND] = PM_PARAMETERS_ORDER_NOTHING_AFTER;
parameters_ordering[PM_TOKEN_AMPERSAND] = PM_PARAMETERS_ORDER_NOTHING_AFTER;
parameters_ordering[PM_TOKEN_UDOT_DOT_DOT] = PM_PARAMETERS_ORDER_NOTHING_AFTER;
parameters_ordering[PM_TOKEN_IDENTIFIER] = PM_PARAMETERS_ORDER_NAMED;
parameters_ordering[PM_TOKEN_PARENTHESIS_LEFT] = PM_PARAMETERS_ORDER_NAMED;
parameters_ordering[PM_TOKEN_EQUAL] = PM_PARAMETERS_ORDER_OPTIONAL;
parameters_ordering[PM_TOKEN_LABEL] = PM_PARAMETERS_ORDER_KEYWORDS;
parameters_ordering[PM_TOKEN_USTAR] = PM_PARAMETERS_ORDER_AFTER_OPTIONAL;
parameters_ordering[PM_TOKEN_STAR] = PM_PARAMETERS_ORDER_AFTER_OPTIONAL;
parameters_ordering[PM_TOKEN_USTAR_STAR] = PM_PARAMETERS_ORDER_KEYWORDS_REST;
parameters_ordering[PM_TOKEN_STAR_STAR] = PM_PARAMETERS_ORDER_KEYWORDS_REST;

/**
 * Check if current parameter follows valid parameters ordering. If not it adds
 * an error to the list without stopping the parsing, otherwise sets the
 * parameters state to the one corresponding to the current parameter.
 *
 * It returns true if it was successful, and false otherwise.
 *
 * Adaptation: current is a { value } box standing in for the C
 * pm_parameters_order_t * out-param.
 */
function update_parameter_state(parser, token, current) {
    const state = parameters_ordering[token.type];
    if (state === PM_PARAMETERS_NO_CHANGE) return { ok: true, order: current };

    // If we see another ordered argument after a optional argument
    // we only continue parsing ordered arguments until we stop seeing ordered arguments.
    if (current === PM_PARAMETERS_ORDER_OPTIONAL && state === PM_PARAMETERS_ORDER_NAMED) {
        return { ok: true, order: PM_PARAMETERS_ORDER_AFTER_OPTIONAL };
    } else if (current === PM_PARAMETERS_ORDER_AFTER_OPTIONAL && state === PM_PARAMETERS_ORDER_NAMED) {
        return { ok: true, order: current };
    }

    if (token.type === PM_TOKEN_USTAR && current === PM_PARAMETERS_ORDER_AFTER_OPTIONAL) {
        pm_parser_err_token(parser, token, PM_ERR_PARAMETER_STAR);
        return { ok: false, order: current };
    } else if (token.type === PM_TOKEN_UDOT_DOT_DOT && (current >= PM_PARAMETERS_ORDER_KEYWORDS_REST && current <= PM_PARAMETERS_ORDER_AFTER_OPTIONAL)) {
        pm_parser_err_token(parser, token, current === PM_PARAMETERS_ORDER_AFTER_OPTIONAL ? PM_ERR_PARAMETER_FORWARDING_AFTER_REST : PM_ERR_PARAMETER_ORDER);
        return { ok: false, order: current };
    } else if (current === PM_PARAMETERS_ORDER_NOTHING_AFTER || state > current) {
        // We know what transition we failed on, so we can provide a better error here.
        pm_parser_err_token(parser, token, PM_ERR_PARAMETER_ORDER);
        return { ok: false, order: current };
    }

    return { ok: true, order: state < current ? state : current };
}

/**
 * Parse a list of parameters on a method definition.
 */
function parse_parameters(
    parser,
    binding_power,
    uses_parentheses,
    allows_trailing_comma,
    allows_forwarding_parameters,
    accepts_blocks_in_defaults,
    in_block,
    depth
) {
    pm_do_loop_stack_push(parser, false);

    const params = pm_parameters_node_create(parser);
    let order = PM_PARAMETERS_ORDER_NONE;

    while (true) {
        let parsing = true;

        switch (parser.current.type) {
            case PM_TOKEN_PARENTHESIS_LEFT: {
                order = update_parameter_state(parser, parser.current, order).order;
                const param = parse_required_destructured_parameter(parser);

                if (order > PM_PARAMETERS_ORDER_AFTER_OPTIONAL) {
                    pm_parameters_node_requireds_append(params, param);
                } else {
                    pm_parameters_node_posts_append(params, param);
                }
                break;
            }
            case PM_TOKEN_UAMPERSAND:
            case PM_TOKEN_AMPERSAND: {
                order = update_parameter_state(parser, parser.current, order).order;
                parser_lex(parser);

                const operator = copyToken(parser.previous);
                let name;

                let repeated = false;
                if (accept1(parser, PM_TOKEN_IDENTIFIER)) {
                    name = copyToken(parser.previous);
                    repeated = pm_parser_parameter_name_check(parser, name);
                    pm_parser_local_add_token(parser, name, 1);
                } else {
                    name = not_provided(parser);
                    parser.current_scope.parameters |= PM_SCOPE_PARAMETERS_FORWARDING_BLOCK;
                }

                const param = pm_block_parameter_node_create(parser, name, operator);
                if (repeated) {
                    pm_node_flag_set_repeated_parameter(param);
                }
                if (params.block === null) {
                    pm_parameters_node_block_set(params, param);
                } else {
                    pm_parser_err_node(parser, param, PM_ERR_PARAMETER_BLOCK_MULTI);
                    pm_parameters_node_posts_append(params, param);
                }

                break;
            }
            case PM_TOKEN_UDOT_DOT_DOT: {
                if (!allows_forwarding_parameters) {
                    pm_parser_err_current(parser, PM_ERR_ARGUMENT_NO_FORWARDING_ELLIPSES);
                }

                const succeeded = update_parameter_state(parser, parser.current, order);
                order = succeeded.order;
                parser_lex(parser);

                parser.current_scope.parameters |= PM_SCOPE_PARAMETERS_FORWARDING_ALL;
                const param = pm_forwarding_parameter_node_create(parser, parser.previous);

                if (params.keyword_rest !== null) {
                    // If we already have a keyword rest parameter, then we replace it with the
                    // forwarding parameter and move the keyword rest parameter to the posts list.
                    const keyword_rest = params.keyword_rest;
                    pm_parameters_node_posts_append(params, keyword_rest);
                    if (succeeded.ok) pm_parser_err_previous(parser, PM_ERR_PARAMETER_UNEXPECTED_FWD);
                    params.keyword_rest = null;
                }

                pm_parameters_node_keyword_rest_set(params, param);
                break;
            }
            case PM_TOKEN_CLASS_VARIABLE:
            case PM_TOKEN_IDENTIFIER:
            case PM_TOKEN_CONSTANT:
            case PM_TOKEN_INSTANCE_VARIABLE:
            case PM_TOKEN_GLOBAL_VARIABLE:
            case PM_TOKEN_METHOD_NAME: {
                parser_lex(parser);
                switch (parser.previous.type) {
                    case PM_TOKEN_CONSTANT:
                        pm_parser_err_previous(parser, PM_ERR_ARGUMENT_FORMAL_CONSTANT);
                        break;
                    case PM_TOKEN_INSTANCE_VARIABLE:
                        pm_parser_err_previous(parser, PM_ERR_ARGUMENT_FORMAL_IVAR);
                        break;
                    case PM_TOKEN_GLOBAL_VARIABLE:
                        pm_parser_err_previous(parser, PM_ERR_ARGUMENT_FORMAL_GLOBAL);
                        break;
                    case PM_TOKEN_CLASS_VARIABLE:
                        pm_parser_err_previous(parser, PM_ERR_ARGUMENT_FORMAL_CLASS);
                        break;
                    case PM_TOKEN_METHOD_NAME:
                        pm_parser_err_previous(parser, PM_ERR_PARAMETER_METHOD_NAME);
                        break;
                    default: break;
                }

                if (parser.current.type === PM_TOKEN_EQUAL) {
                    order = update_parameter_state(parser, parser.current, order).order;
                } else {
                    order = update_parameter_state(parser, parser.previous, order).order;
                }

                const name = copyToken(parser.previous);
                const repeated = pm_parser_parameter_name_check(parser, name);
                pm_parser_local_add_token(parser, name, 1);

                if (match1(parser, PM_TOKEN_EQUAL)) {
                    const operator = copyToken(parser.current);
                    context_push(parser, PM_CONTEXT_DEFAULT_PARAMS);
                    parser_lex(parser);

                    const name_id = pm_parser_constant_id_token(parser, name);
                    const reads = parser.version <= PM_OPTIONS_VERSION_CRUBY_3_3 ? pm_locals_reads(parser.current_scope.locals, name_id) : 0;

                    if (accepts_blocks_in_defaults) pm_accepts_block_stack_push(parser, true);
                    const value = parse_value_expression(parser, binding_power, false, false, PM_ERR_PARAMETER_NO_DEFAULT, depth + 1);
                    if (accepts_blocks_in_defaults) pm_accepts_block_stack_pop(parser);

                    const param = pm_optional_parameter_node_create(parser, name, operator, value);

                    if (repeated) {
                        pm_node_flag_set_repeated_parameter(param);
                    }
                    pm_parameters_node_optionals_append(params, param);

                    // If the value of the parameter increased the number of
                    // reads of that parameter, then we need to warn that we
                    // have a circular definition.
                    if ((parser.version <= PM_OPTIONS_VERSION_CRUBY_3_3) && (pm_locals_reads(parser.current_scope.locals, name_id) !== reads)) {
                        PM_PARSER_ERR_TOKEN_FORMAT_CONTENT(parser, name, PM_ERR_PARAMETER_CIRCULAR);
                    }

                    context_pop(parser);

                    // If parsing the value of the parameter resulted in error recovery,
                    // then we can put a missing node in its place and stop parsing the
                    // parameters entirely now.
                    if (parser.recovering) {
                        parsing = false;
                        break;
                    }
                } else if (order > PM_PARAMETERS_ORDER_AFTER_OPTIONAL) {
                    const param = pm_required_parameter_node_create(parser, name);
                    if (repeated) {
                        pm_node_flag_set_repeated_parameter(param);
                    }
                    pm_parameters_node_requireds_append(params, param);
                } else {
                    const param = pm_required_parameter_node_create(parser, name);
                    if (repeated) {
                        pm_node_flag_set_repeated_parameter(param);
                    }
                    pm_parameters_node_posts_append(params, param);
                }

                break;
            }
            case PM_TOKEN_LABEL: {
                if (!uses_parentheses && !in_block) parser.in_keyword_arg = true;
                order = update_parameter_state(parser, parser.current, order).order;

                context_push(parser, PM_CONTEXT_DEFAULT_PARAMS);
                parser_lex(parser);

                const name = copyToken(parser.previous);
                const local = { type: name.type, start: name.start, end: name.end - 1 };

                if (pm_encoding_utf_8_isupper_char(parser.source, local.start, local.end - local.start)) {
                    pm_parser_err(parser, local.start, local.end, PM_ERR_ARGUMENT_FORMAL_CONSTANT);
                } else if ((parser.source.charCodeAt(local.end - 1)) === 0x21 /* '!' */ || (parser.source.charCodeAt(local.end - 1)) === 0x3f /* '?' */) {
                    PM_PARSER_ERR_TOKEN_FORMAT_CONTENT(parser, local, PM_ERR_INVALID_LOCAL_VARIABLE_WRITE);
                }

                const repeated = pm_parser_parameter_name_check(parser, local);
                pm_parser_local_add_token(parser, local, 1);

                switch (parser.current.type) {
                    case PM_TOKEN_COMMA:
                    case PM_TOKEN_PARENTHESIS_RIGHT:
                    case PM_TOKEN_PIPE: {
                        context_pop(parser);

                        const param = pm_required_keyword_parameter_node_create(parser, name);
                        if (repeated) {
                            pm_node_flag_set_repeated_parameter(param);
                        }

                        pm_parameters_node_keywords_append(params, param);
                        break;
                    }
                    case PM_TOKEN_SEMICOLON:
                    case PM_TOKEN_NEWLINE: {
                        context_pop(parser);

                        if (uses_parentheses) {
                            parsing = false;
                            break;
                        }

                        const param = pm_required_keyword_parameter_node_create(parser, name);
                        if (repeated) {
                            pm_node_flag_set_repeated_parameter(param);
                        }

                        pm_parameters_node_keywords_append(params, param);
                        break;
                    }
                    default: {
                        let param;

                        if (token_begins_expression_p(parser.current.type)) {
                            const name_id = pm_parser_constant_id_token(parser, local);
                            const reads = parser.version <= PM_OPTIONS_VERSION_CRUBY_3_3 ? pm_locals_reads(parser.current_scope.locals, name_id) : 0;

                            if (accepts_blocks_in_defaults) pm_accepts_block_stack_push(parser, true);
                            const value = parse_value_expression(parser, binding_power, false, false, PM_ERR_PARAMETER_NO_DEFAULT_KW, depth + 1);
                            if (accepts_blocks_in_defaults) pm_accepts_block_stack_pop(parser);

                            if (parser.version <= PM_OPTIONS_VERSION_CRUBY_3_3 && (pm_locals_reads(parser.current_scope.locals, name_id) !== reads)) {
                                PM_PARSER_ERR_TOKEN_FORMAT_CONTENT(parser, local, PM_ERR_PARAMETER_CIRCULAR);
                            }

                            param = pm_optional_keyword_parameter_node_create(parser, name, value);
                        }
                        else {
                            param = pm_required_keyword_parameter_node_create(parser, name);
                        }

                        if (repeated) {
                            pm_node_flag_set_repeated_parameter(param);
                        }

                        context_pop(parser);
                        pm_parameters_node_keywords_append(params, param);

                        // If parsing the value of the parameter resulted in error recovery,
                        // then we can put a missing node in its place and stop parsing the
                        // parameters entirely now.
                        if (parser.recovering) {
                            parsing = false;
                            break;
                        }
                    }
                }

                parser.in_keyword_arg = false;
                break;
            }
            case PM_TOKEN_USTAR:
            case PM_TOKEN_STAR: {
                order = update_parameter_state(parser, parser.current, order).order;
                parser_lex(parser);

                const operator = copyToken(parser.previous);
                let name;
                let repeated = false;

                if (accept1(parser, PM_TOKEN_IDENTIFIER)) {
                    name = copyToken(parser.previous);
                    repeated = pm_parser_parameter_name_check(parser, name);
                    pm_parser_local_add_token(parser, name, 1);
                } else {
                    name = not_provided(parser);
                    parser.current_scope.parameters |= PM_SCOPE_PARAMETERS_FORWARDING_POSITIONALS;
                }

                const param = pm_rest_parameter_node_create(parser, operator, name);
                if (repeated) {
                    pm_node_flag_set_repeated_parameter(param);
                }

                if (params.rest === null) {
                    pm_parameters_node_rest_set(params, param);
                } else {
                    pm_parser_err_node(parser, param, PM_ERR_PARAMETER_SPLAT_MULTI);
                    pm_parameters_node_posts_append(params, param);
                }

                break;
            }
            case PM_TOKEN_STAR_STAR:
            case PM_TOKEN_USTAR_STAR: {
                const previous_order = order;
                order = update_parameter_state(parser, parser.current, order).order;
                parser_lex(parser);

                const operator = copyToken(parser.previous);
                let param;

                if (accept1(parser, PM_TOKEN_KEYWORD_NIL)) {
                    if (previous_order <= PM_PARAMETERS_ORDER_KEYWORDS) {
                        pm_parser_err_previous(parser, PM_ERR_PARAMETER_UNEXPECTED_NO_KW);
                    }

                    param = pm_no_keywords_parameter_node_create(parser, operator, parser.previous);
                } else {
                    let name;

                    let repeated = false;
                    if (accept1(parser, PM_TOKEN_IDENTIFIER)) {
                        name = copyToken(parser.previous);
                        repeated = pm_parser_parameter_name_check(parser, name);
                        pm_parser_local_add_token(parser, name, 1);
                    } else {
                        name = not_provided(parser);
                        parser.current_scope.parameters |= PM_SCOPE_PARAMETERS_FORWARDING_KEYWORDS;
                    }

                    param = pm_keyword_rest_parameter_node_create(parser, operator, name);
                    if (repeated) {
                        pm_node_flag_set_repeated_parameter(param);
                    }
                }

                if (params.keyword_rest === null) {
                    pm_parameters_node_keyword_rest_set(params, param);
                } else {
                    pm_parser_err_node(parser, param, PM_ERR_PARAMETER_ASSOC_SPLAT_MULTI);
                    pm_parameters_node_posts_append(params, param);
                }

                break;
            }
            default:
                if (parser.previous.type === PM_TOKEN_COMMA) {
                    if (allows_trailing_comma && order >= PM_PARAMETERS_ORDER_NAMED) {
                        // If we get here, then we have a trailing comma in a
                        // block parameter list.
                        const param = pm_implicit_rest_node_create(parser, parser.previous);

                        if (params.rest === null) {
                            pm_parameters_node_rest_set(params, param);
                        } else {
                            pm_parser_err_node(parser, param, PM_ERR_PARAMETER_SPLAT_MULTI);
                            pm_parameters_node_posts_append(params, param);
                        }
                    } else {
                        pm_parser_err_previous(parser, PM_ERR_PARAMETER_WILD_LOOSE_COMMA);
                    }
                }

                parsing = false;
                break;
        }

        // If we hit some kind of issue while parsing the parameter, this would
        // have been set to false. In that case, we need to break out of the
        // loop.
        if (!parsing) break;

        let accepted_newline = false;
        if (uses_parentheses) {
            accepted_newline = accept1(parser, PM_TOKEN_NEWLINE);
        }

        if (accept1(parser, PM_TOKEN_COMMA)) {
            // If there was a comma, but we also accepted a newline, then this
            // is a syntax error.
            if (accepted_newline) {
                pm_parser_err_previous(parser, PM_ERR_INVALID_COMMA);
            }
        } else {
            // If there was no comma, then we're done parsing parameters.
            break;
        }
    }

    pm_do_loop_stack_pop(parser);

    // If we don't have any parameters, return `NULL` instead of an empty `ParametersNode`.
    if (params.location.start === params.location.end) {
        return null;
    }

    return params;
}

/******************************************************************************/
/* Indentation warnings                                                       */
/******************************************************************************/

/**
 * Accepts a parser returns the index of the last newline in the file that was
 * ecorded before the current token within the newline list.
 */
function token_newline_index(parser) {
    if (parser.heredoc_end === null) {
        // This is the common case. In this case we can look at the previously
        // recorded newline in the newline list and subtract from the current
        // offset.
        return parser.newline_list.size - 1;
    } else {
        // This is unlikely. This is the case that we have already parsed the
        // start of a heredoc, so we cannot rely on looking at the previous
        // offset of the newline list, and instead must go through the whole
        // process of a binary search for the line number.
        return pm_newline_list_line(parser.newline_list, parser.current.start, 0);
    }
}

/**
 * Accepts a parser, a newline index, and a token and returns the column. The
 * important piece of this is that it expands tabs out to the next tab stop.
 */
function token_column(parser, newline_index, token, break_on_non_space) {
    let cursor = parser.start + parser.newline_list.offsets[newline_index];
    const end = token.start;

    // Skip over the BOM if it is present.
    if (
        newline_index === 0 &&
        parser.source.startsWith("\uFEFF")
    ) cursor += 1;

    let column = 0;
    for (; cursor < end; cursor++) {
        switch ((parser.source.charCodeAt(cursor) || 0)) {
            case 9: // '\t'
                column = Math.floor(column / PM_TAB_WHITESPACE_SIZE + 1) * PM_TAB_WHITESPACE_SIZE;
                break;
            case 32: // ' '
                column++;
                break;
            default:
                column++;
                if (break_on_non_space) return -1;
                break;
        }
    }

    return column;
}

/**
 * Accepts a parser, two newline indices, and pointers to two tokens. This
 * function warns if the indentation of the two tokens does not match.
 */
function parser_warn_indentation_mismatch(parser, opening_newline_index, opening_token, if_after_else, allow_indent) {
    // If these warnings are disabled (unlikely), then we can just return.
    if (!parser.warn_mismatched_indentation) return;

    // If the tokens are on the same line, we do not warn.
    const closing_newline_index = token_newline_index(parser);
    if (opening_newline_index === closing_newline_index) return;

    // If the opening token has anything other than spaces or tabs before it,
    // then we do not warn. This is unless we are matching up an `if`/`end` pair
    // and the `if` immediately follows an `else` keyword.
    const opening_column = token_column(parser, opening_newline_index, opening_token, !if_after_else);
    if (!if_after_else && (opening_column === -1)) return;

    // Get a reference to the closing token off the current parser. This assumes
    // that the caller has placed this in the correct position.
    const closing_token = copyToken(parser.current);

    // If the tokens are at the same indentation, we do not warn.
    const closing_column = token_column(parser, closing_newline_index, closing_token, true);
    if ((closing_column === -1) || (opening_column === closing_column)) return;

    // If the closing column is greater than the opening column and we are
    // allowing indentation, then we do not warn.
    if (allow_indent && (closing_column > opening_column)) return;

    // Otherwise, add a warning.
    PM_PARSER_WARN_FORMAT(
        parser,
        closing_token.start,
        closing_token.end,
        PM_WARN_INDENTATION_MISMATCH,
        closing_token.end - closing_token.start,
        parser.source.slice(closing_token.start, closing_token.end),
        opening_token.end - opening_token.start,
        parser.source.slice(opening_token.start, opening_token.end),
        opening_newline_index + parser.start_line
    );
}

/******************************************************************************/
/* Rescues                                                                    */
/******************************************************************************/

const PM_RESCUES_BEGIN = 1;
const PM_RESCUES_BLOCK = 2;
const PM_RESCUES_CLASS = 3;
const PM_RESCUES_DEF = 4;
const PM_RESCUES_LAMBDA = 5;
const PM_RESCUES_MODULE = 6;
const PM_RESCUES_SCLASS = 7;

/**
 * Parse any number of rescue clauses. This will form a linked list of if
 * nodes pointing to each other from the top.
 */
function parse_rescues(parser, opening_newline_index, opening, parent_node, type, depth) {
    let current = null;

    while (match1(parser, PM_TOKEN_KEYWORD_RESCUE)) {
        if (opening !== null) parser_warn_indentation_mismatch(parser, opening_newline_index, opening, false, false);
        parser_lex(parser);

        const rescue = pm_rescue_node_create(parser, parser.previous);

        switch (parser.current.type) {
            case PM_TOKEN_EQUAL_GREATER: {
                // Here we have an immediate => after the rescue keyword, in which case
                // we're going to have an empty list of exceptions to rescue (which
                // implies StandardError).
                parser_lex(parser);
                pm_rescue_node_operator_set(rescue, parser.previous);

                let reference = parse_expression(parser, PM_BINDING_POWER_INDEX, false, false, PM_ERR_RESCUE_VARIABLE, depth + 1);
                reference = parse_target(parser, reference, false, false);

                pm_rescue_node_reference_set(rescue, reference);
                break;
            }
            case PM_TOKEN_NEWLINE:
            case PM_TOKEN_SEMICOLON:
            case PM_TOKEN_KEYWORD_THEN:
                // Here we have a terminator for the rescue keyword, in which
                // case we're going to just continue on.
                break;
            default: {
                if (token_begins_expression_p(parser.current.type) || match1(parser, PM_TOKEN_USTAR)) {
                    // Here we have something that could be an exception expression, so
                    // we'll attempt to parse it here and any others delimited by commas.

                    do {
                        const expression = parse_starred_expression(parser, PM_BINDING_POWER_DEFINED, false, PM_ERR_RESCUE_EXPRESSION, depth + 1);
                        pm_rescue_node_exceptions_append(rescue, expression);

                        // If we hit a newline, then this is the end of the rescue expression. We
                        // can continue on to parse the statements.
                        if (match3(parser, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON, PM_TOKEN_KEYWORD_THEN)) break;

                        // If we hit a `=>` then we're going to parse the exception variable. Once
                        // we've done that, we'll break out of the loop and parse the statements.
                        if (accept1(parser, PM_TOKEN_EQUAL_GREATER)) {
                            pm_rescue_node_operator_set(rescue, parser.previous);

                            let reference = parse_expression(parser, PM_BINDING_POWER_INDEX, false, false, PM_ERR_RESCUE_VARIABLE, depth + 1);
                            reference = parse_target(parser, reference, false, false);

                            pm_rescue_node_reference_set(rescue, reference);
                            break;
                        }
                    } while (accept1(parser, PM_TOKEN_COMMA));
                }
            }
        }

        if (accept2(parser, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON)) {
            if (accept1(parser, PM_TOKEN_KEYWORD_THEN)) {
                rescue.then_keyword_loc = PM_OPTIONAL_LOCATION_TOKEN_VALUE(parser.previous);
            }
        } else {
            expect1(parser, PM_TOKEN_KEYWORD_THEN, PM_ERR_RESCUE_TERM);
            rescue.then_keyword_loc = PM_OPTIONAL_LOCATION_TOKEN_VALUE(parser.previous);
        }

        if (!match3(parser, PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_END)) {
            pm_accepts_block_stack_push(parser, true);
            let context;

            switch (type) {
                case PM_RESCUES_BEGIN: context = PM_CONTEXT_BEGIN_RESCUE; break;
                case PM_RESCUES_BLOCK: context = PM_CONTEXT_BLOCK_RESCUE; break;
                case PM_RESCUES_CLASS: context = PM_CONTEXT_CLASS_RESCUE; break;
                case PM_RESCUES_DEF: context = PM_CONTEXT_DEF_RESCUE; break;
                case PM_RESCUES_LAMBDA: context = PM_CONTEXT_LAMBDA_RESCUE; break;
                case PM_RESCUES_MODULE: context = PM_CONTEXT_MODULE_RESCUE; break;
                case PM_RESCUES_SCLASS: context = PM_CONTEXT_SCLASS_RESCUE; break;
                default: /* assert(false && "unreachable"): debug-only in C */ context = PM_CONTEXT_BEGIN_RESCUE; break;
            }

            const statements = parse_statements(parser, context, depth + 1);
            if (statements !== null) pm_rescue_node_statements_set(rescue, statements);

            pm_accepts_block_stack_pop(parser);
            accept2(parser, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON);
        }

        if (current === null) {
            pm_begin_node_rescue_clause_set(parent_node, rescue);
        } else {
            pm_rescue_node_subsequent_set(current, rescue);
        }

        current = rescue;
    }

    // The end node locations on rescue nodes will not be set correctly
    // since we won't know the end until we've found all subsequent
    // clauses. This sets the end location on all rescues once we know it.
    if (current !== null) {
        const end_to_set = current.location.end;
        let clause = parent_node.rescue_clause;

        while (clause !== null) {
            clause.location.end = end_to_set;
            clause = clause.subsequent;
        }
    }

    let else_keyword;
    if (match1(parser, PM_TOKEN_KEYWORD_ELSE)) {
        if (opening !== null) parser_warn_indentation_mismatch(parser, opening_newline_index, opening, false, false);
        opening_newline_index = token_newline_index(parser);

        else_keyword = copyToken(parser.current);
        opening = else_keyword;

        parser_lex(parser);
        accept2(parser, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON);

        let else_statements = null;
        if (!match2(parser, PM_TOKEN_KEYWORD_END, PM_TOKEN_KEYWORD_ENSURE)) {
            pm_accepts_block_stack_push(parser, true);
            let context;

            switch (type) {
                case PM_RESCUES_BEGIN: context = PM_CONTEXT_BEGIN_ELSE; break;
                case PM_RESCUES_BLOCK: context = PM_CONTEXT_BLOCK_ELSE; break;
                case PM_RESCUES_CLASS: context = PM_CONTEXT_CLASS_ELSE; break;
                case PM_RESCUES_DEF: context = PM_CONTEXT_DEF_ELSE; break;
                case PM_RESCUES_LAMBDA: context = PM_CONTEXT_LAMBDA_ELSE; break;
                case PM_RESCUES_MODULE: context = PM_CONTEXT_MODULE_ELSE; break;
                case PM_RESCUES_SCLASS: context = PM_CONTEXT_SCLASS_ELSE; break;
                default: /* assert(false && "unreachable"): debug-only in C */ context = PM_CONTEXT_BEGIN_ELSE; break;
            }

            else_statements = parse_statements(parser, context, depth + 1);
            pm_accepts_block_stack_pop(parser);

            accept2(parser, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON);
        }

        const else_clause = pm_else_node_create(parser, else_keyword, else_statements, parser.current);
        pm_begin_node_else_clause_set(parent_node, else_clause);

        // If we don't have a `current` rescue node, then this is a dangling
        // else, and it's an error.
        if (current === null) pm_parser_err_node(parser, else_clause, PM_ERR_BEGIN_LONELY_ELSE);
    }

    if (match1(parser, PM_TOKEN_KEYWORD_ENSURE)) {
        if (opening !== null) parser_warn_indentation_mismatch(parser, opening_newline_index, opening, false, false);
        const ensure_keyword = copyToken(parser.current);

        parser_lex(parser);
        accept2(parser, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON);

        let ensure_statements = null;
        if (!match1(parser, PM_TOKEN_KEYWORD_END)) {
            pm_accepts_block_stack_push(parser, true);
            let context;

            switch (type) {
                case PM_RESCUES_BEGIN: context = PM_CONTEXT_BEGIN_ENSURE; break;
                case PM_RESCUES_BLOCK: context = PM_CONTEXT_BLOCK_ENSURE; break;
                case PM_RESCUES_CLASS: context = PM_CONTEXT_CLASS_ENSURE; break;
                case PM_RESCUES_DEF: context = PM_CONTEXT_DEF_ENSURE; break;
                case PM_RESCUES_LAMBDA: context = PM_CONTEXT_LAMBDA_ENSURE; break;
                case PM_RESCUES_MODULE: context = PM_CONTEXT_MODULE_ENSURE; break;
                case PM_RESCUES_SCLASS: context = PM_CONTEXT_SCLASS_ENSURE; break;
                default: /* assert(false && "unreachable"): debug-only in C */ context = PM_CONTEXT_BEGIN_RESCUE; break;
            }

            ensure_statements = parse_statements(parser, context, depth + 1);
            pm_accepts_block_stack_pop(parser);

            accept2(parser, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON);
        }

        const ensure_clause = pm_ensure_node_create(parser, ensure_keyword, ensure_statements, parser.current);
        pm_begin_node_ensure_clause_set(parent_node, ensure_clause);
    }

    if (match1(parser, PM_TOKEN_KEYWORD_END)) {
        if (opening !== null) parser_warn_indentation_mismatch(parser, opening_newline_index, opening, false, false);
        pm_begin_node_end_keyword_set(parent_node, parser.current);
    } else {
        const end_keyword = { type: PM_TOKEN_MISSING, start: parser.previous.end, end: parser.previous.end };
        pm_begin_node_end_keyword_set(parent_node, end_keyword);
    }
}

/**
 * Parse a set of rescue clauses with an implicit begin (for example when on a
 * class, module, def, etc.).
 */
function parse_rescues_implicit_begin(parser, opening_newline_index, opening, start, statements, type, depth) {
    const begin_keyword = not_provided(parser);
    const node = pm_begin_node_create(parser, begin_keyword, statements);

    parse_rescues(parser, opening_newline_index, opening, node, type, depth + 1);
    node.location.start = start;

    return node;
}

/******************************************************************************/
/* Blocks                                                                     */
/******************************************************************************/

/**
 * Parse a list of parameters and local on a block definition.
 */
function parse_block_parameters(
    parser,
    allows_trailing_comma,
    opening,
    is_lambda_literal,
    accepts_blocks_in_defaults,
    depth
) {
    let parameters = null;
    if (!match1(parser, PM_TOKEN_SEMICOLON)) {
        if (!is_lambda_literal) {
            context_push(parser, PM_CONTEXT_BLOCK_PARAMETERS);
        }
        parameters = parse_parameters(
            parser,
            is_lambda_literal ? PM_BINDING_POWER_DEFINED : PM_BINDING_POWER_INDEX,
            false,
            allows_trailing_comma,
            false,
            accepts_blocks_in_defaults,
            true,
            depth + 1
        );
        if (!is_lambda_literal) {
            context_pop(parser);
        }
    }

    const block_parameters = pm_block_parameters_node_create(parser, parameters, opening);
    if ((opening.type !== PM_TOKEN_NOT_PROVIDED)) {
        accept1(parser, PM_TOKEN_NEWLINE);

        if (accept1(parser, PM_TOKEN_SEMICOLON)) {
            do {
                switch (parser.current.type) {
                    case PM_TOKEN_CONSTANT:
                        pm_parser_err_current(parser, PM_ERR_ARGUMENT_FORMAL_CONSTANT);
                        parser_lex(parser);
                        break;
                    case PM_TOKEN_INSTANCE_VARIABLE:
                        pm_parser_err_current(parser, PM_ERR_ARGUMENT_FORMAL_IVAR);
                        parser_lex(parser);
                        break;
                    case PM_TOKEN_GLOBAL_VARIABLE:
                        pm_parser_err_current(parser, PM_ERR_ARGUMENT_FORMAL_GLOBAL);
                        parser_lex(parser);
                        break;
                    case PM_TOKEN_CLASS_VARIABLE:
                        pm_parser_err_current(parser, PM_ERR_ARGUMENT_FORMAL_CLASS);
                        parser_lex(parser);
                        break;
                    default:
                        expect1(parser, PM_TOKEN_IDENTIFIER, PM_ERR_BLOCK_PARAM_LOCAL_VARIABLE);
                        break;
                }

                const repeated = pm_parser_parameter_name_check(parser, parser.previous);
                pm_parser_local_add_token(parser, parser.previous, 1);

                const local = pm_block_local_variable_node_create(parser, parser.previous);
                if (repeated) pm_node_flag_set_repeated_parameter(local);

                pm_block_parameters_node_append_local(block_parameters, local);
            } while (accept1(parser, PM_TOKEN_COMMA));
        }
    }

    return block_parameters;
}

/**
 * Return true if any of the visible scopes to the current context are using
 * numbered parameters.
 */
function outer_scope_using_numbered_parameters_p(parser) {
    for (let scope = parser.current_scope.previous; scope !== null && !scope.closed; scope = scope.previous) {
        if ((scope.parameters & PM_SCOPE_PARAMETERS_NUMBERED_FOUND) !== 0) return true;
    }

    return false;
}

/**
 * These are the names of the various numbered parameters. We have them here so
 * that when we insert them into the constant pool we can use a constant string
 * and not have to allocate.
 */
const pm_numbered_parameter_names = [
    "_1", "_2", "_3", "_4", "_5", "_6", "_7", "_8", "_9"
];

/**
 * Return the node that should be used in the parameters field of a block-like
 * (block or lambda) node, depending on the kind of parameters that were
 * declared in the current scope.
 */
function parse_blocklike_parameters(parser, parameters, opening, closing) {
    const implicit_parameters = parser.current_scope.implicit_parameters;

    // If we have ordinary parameters, then we will return them as the set of
    // parameters.
    if (parameters !== null) {
        // If we also have implicit parameters, then this is an error.
        if (implicit_parameters.length > 0) {
            const node = implicit_parameters[0];

            if (PM_NODE_TYPE_P(node, PM_LOCAL_VARIABLE_READ_NODE)) {
                pm_parser_err_node(parser, node, PM_ERR_NUMBERED_PARAMETER_ORDINARY);
            } else if (PM_NODE_TYPE_P(node, PM_IT_LOCAL_VARIABLE_READ_NODE)) {
                pm_parser_err_node(parser, node, PM_ERR_IT_NOT_ALLOWED_ORDINARY);
            } else {
                // assert(false && "unreachable"): debug-only in C.
            }
        }

        return parameters;
    }

    // If we don't have any implicit parameters, then the set of parameters is
    // NULL.
    if (implicit_parameters.length === 0) {
        return null;
    }

    // If we don't have ordinary parameters, then we now must validate our set
    // of implicit parameters. We can only have numbered parameters or it, but
    // they cannot be mixed.
    let numbered_parameter = 0;
    let it_parameter = false;

    for (let index = 0; index < implicit_parameters.length; index++) {
        const node = implicit_parameters[index];

        if (PM_NODE_TYPE_P(node, PM_LOCAL_VARIABLE_READ_NODE)) {
            if (it_parameter) {
                pm_parser_err_node(parser, node, PM_ERR_NUMBERED_PARAMETER_IT);
            } else if (outer_scope_using_numbered_parameters_p(parser)) {
                pm_parser_err_node(parser, node, PM_ERR_NUMBERED_PARAMETER_OUTER_BLOCK);
            } else if ((parser.current_scope.parameters & PM_SCOPE_PARAMETERS_NUMBERED_INNER) !== 0) {
                pm_parser_err_node(parser, node, PM_ERR_NUMBERED_PARAMETER_INNER_BLOCK);
            } else if (pm_token_is_numbered_parameter(parser.source, node.location.start, node.location.end)) {
                numbered_parameter = Math.max(numbered_parameter, (parser.source.charCodeAt(node.location.start + 1)) - 48 /* '0' */);
            } else {
                // assert(false && "unreachable"): debug-only in C.
            }
        } else if (PM_NODE_TYPE_P(node, PM_IT_LOCAL_VARIABLE_READ_NODE)) {
            if (numbered_parameter > 0) {
                pm_parser_err_node(parser, node, PM_ERR_IT_NOT_ALLOWED_NUMBERED);
            } else {
                it_parameter = true;
            }
        }
    }

    if (numbered_parameter > 0) {
        // Go through the parent scopes and mark them as being disallowed from
        // using numbered parameters because this inner scope is using them.
        for (let scope = parser.current_scope.previous; scope !== null && !scope.closed; scope = scope.previous) {
            scope.parameters |= PM_SCOPE_PARAMETERS_NUMBERED_INNER;
        }

        const location = { start: opening.start, end: closing.end };
        return pm_numbered_parameters_node_create(parser, location, numbered_parameter);
    }

    if (it_parameter) {
        return pm_it_parameters_node_create(parser, opening, closing);
    }

    return null;
}

/**
 * Parse a block.
 */
function parse_block(parser, depth) {
    const opening = copyToken(parser.previous);
    accept1(parser, PM_TOKEN_NEWLINE);

    pm_accepts_block_stack_push(parser, true);
    pm_parser_scope_push(parser, false);

    let block_parameters = null;

    if (accept1(parser, PM_TOKEN_PIPE)) {
        const block_parameters_opening = copyToken(parser.previous);
        if (match1(parser, PM_TOKEN_PIPE)) {
            block_parameters = pm_block_parameters_node_create(parser, null, block_parameters_opening);
            parser.command_start = true;
            parser_lex(parser);
        } else {
            block_parameters = parse_block_parameters(parser, true, block_parameters_opening, false, true, depth + 1);
            accept1(parser, PM_TOKEN_NEWLINE);
            parser.command_start = true;
            expect1(parser, PM_TOKEN_PIPE, PM_ERR_BLOCK_PARAM_PIPE_TERM);
        }

        pm_block_parameters_node_closing_set(block_parameters, parser.previous);
    }

    accept1(parser, PM_TOKEN_NEWLINE);
    let statements = null;

    if (opening.type === PM_TOKEN_BRACE_LEFT) {
        if (!match1(parser, PM_TOKEN_BRACE_RIGHT)) {
            statements = parse_statements(parser, PM_CONTEXT_BLOCK_BRACES, depth + 1);
        }

        expect1_opening(parser, PM_TOKEN_BRACE_RIGHT, PM_ERR_BLOCK_TERM_BRACE, opening);
    } else {
        if (!match1(parser, PM_TOKEN_KEYWORD_END)) {
            if (!match3(parser, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_KEYWORD_ENSURE)) {
                pm_accepts_block_stack_push(parser, true);
                statements = parse_statements(parser, PM_CONTEXT_BLOCK_KEYWORDS, depth + 1);
                pm_accepts_block_stack_pop(parser);
            }

            if (match2(parser, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ENSURE)) {
                // assert(statements == null || PM_NODE_TYPE_P(statements, PM_STATEMENTS_NODE)): debug-only in C.
                statements = parse_rescues_implicit_begin(parser, 0, null, opening.start, statements, PM_RESCUES_BLOCK, depth + 1);
            }
        }

        expect1_opening(parser, PM_TOKEN_KEYWORD_END, PM_ERR_BLOCK_TERM_END, opening);
    }

    const locals = pm_locals_order(parser, parser.current_scope.locals, pm_parser_scope_toplevel_p(parser));
    const parameters = parse_blocklike_parameters(parser, block_parameters, opening, parser.previous);

    pm_parser_scope_pop(parser);
    pm_accepts_block_stack_pop(parser);

    return pm_block_node_create(parser, locals, opening, parameters, statements, parser.previous);
}

/**
 * Parse a list of arguments and their surrounding parentheses if they are
 * present. It returns true if it found any pieces of arguments (parentheses,
 * arguments, or blocks).
 */
function parse_arguments_list(parser, arguments_, accepts_block, accepts_command_call, depth) {
    let found = false;

    if (accept1(parser, PM_TOKEN_PARENTHESIS_LEFT)) {
        found = true;
        arguments_.opening_loc = PM_LOCATION_TOKEN_VALUE(parser.previous);

        if (accept1(parser, PM_TOKEN_PARENTHESIS_RIGHT)) {
            arguments_.closing_loc = PM_LOCATION_TOKEN_VALUE(parser.previous);
        } else {
            pm_accepts_block_stack_push(parser, true);
            parse_arguments(parser, arguments_, accepts_block, PM_TOKEN_PARENTHESIS_RIGHT, depth + 1);

            if (!accept1(parser, PM_TOKEN_PARENTHESIS_RIGHT)) {
                PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, PM_ERR_ARGUMENT_TERM_PAREN, pm_token_type_human(parser.current.type));
                parser.previous.start = parser.previous.end;
                parser.previous.type = PM_TOKEN_MISSING;
            }

            pm_accepts_block_stack_pop(parser);
            arguments_.closing_loc = PM_LOCATION_TOKEN_VALUE(parser.previous);
        }
    } else if (accepts_command_call && (token_begins_expression_p(parser.current.type) || match3(parser, PM_TOKEN_USTAR, PM_TOKEN_USTAR_STAR, PM_TOKEN_UAMPERSAND)) && !match1(parser, PM_TOKEN_BRACE_LEFT)) {
        found = true;
        pm_accepts_block_stack_push(parser, false);

        // If we get here, then the subsequent token cannot be used as an infix
        // operator. In this case we assume the subsequent token is part of an
        // argument to this method call.
        parse_arguments(parser, arguments_, accepts_block, PM_TOKEN_EOF, depth + 1);

        // If we have done with the arguments and still not consumed the comma,
        // then we have a trailing comma where we need to check whether it is
        // allowed or not.
        if (parser.previous.type === PM_TOKEN_COMMA && !match1(parser, PM_TOKEN_SEMICOLON)) {
            PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.previous, PM_ERR_EXPECT_ARGUMENT, pm_token_type_human(parser.current.type));
        }

        pm_accepts_block_stack_pop(parser);
    }

    // If we're at the end of the arguments, we can now check if there is a block
    // node that starts with a {. If there is, then we can parse it and add it to
    // the arguments.
    if (accepts_block) {
        let block = null;

        if (accept1(parser, PM_TOKEN_BRACE_LEFT)) {
            found = true;
            block = parse_block(parser, depth + 1);
            pm_arguments_validate_block(parser, arguments_, block);
        } else if (pm_accepts_block_stack_p(parser) && accept1(parser, PM_TOKEN_KEYWORD_DO)) {
            found = true;
            block = parse_block(parser, depth + 1);
        }

        if (block !== null) {
            if (arguments_.block === null && !arguments_.has_forwarding) {
                arguments_.block = block;
            } else {
                pm_parser_err_node(parser, block, PM_ERR_ARGUMENT_BLOCK_MULTI);

                if (arguments_.block !== null) {
                    if (arguments_.arguments === null) {
                        arguments_.arguments = pm_arguments_node_create(parser);
                    }
                    pm_arguments_node_arguments_append(arguments_.arguments, arguments_.block);
                }
                arguments_.block = block;
            }
        }
    }

    return found;
}

/******************************************************************************/
/* Returns and block exits                                                    */
/******************************************************************************/

// Context buckets for parse_return/parse_block_exit below. Every
// PM_CONTEXT_* value falls into exactly one bucket per function (verified
// against ast.js's full 55-value enum); a context not listed in any of a
// function's buckets means "keep walking up the context chain unchanged"
// (this includes the unreachable-in-practice PM_CONTEXT_NONE).

// Returns can see through these contexts to an enclosing one.
const PARSE_RETURN_CONTEXTS_CONTINUE = new Set([
    PM_CONTEXT_BEGIN_ELSE, PM_CONTEXT_BEGIN_ENSURE, PM_CONTEXT_BEGIN_RESCUE, PM_CONTEXT_BEGIN,
    PM_CONTEXT_CASE_IN, PM_CONTEXT_CASE_WHEN, PM_CONTEXT_DEFAULT_PARAMS, PM_CONTEXT_DEFINED,
    PM_CONTEXT_ELSE, PM_CONTEXT_ELSIF, PM_CONTEXT_EMBEXPR, PM_CONTEXT_FOR_INDEX, PM_CONTEXT_FOR,
    PM_CONTEXT_IF, PM_CONTEXT_LOOP_PREDICATE, PM_CONTEXT_MAIN, PM_CONTEXT_MULTI_TARGET,
    PM_CONTEXT_PARENS, PM_CONTEXT_POSTEXE, PM_CONTEXT_PREDICATE, PM_CONTEXT_PREEXE,
    PM_CONTEXT_RESCUE_MODIFIER, PM_CONTEXT_TERNARY, PM_CONTEXT_UNLESS, PM_CONTEXT_UNTIL, PM_CONTEXT_WHILE
]);

// Like CONTINUE, but also marks that the return passed through a singleton
// class body (affects the post-loop CRuby-3.4+ check below).
const PARSE_RETURN_CONTEXTS_SCLASS = new Set([
    PM_CONTEXT_SCLASS_ELSE, PM_CONTEXT_SCLASS_ENSURE, PM_CONTEXT_SCLASS_RESCUE, PM_CONTEXT_SCLASS
]);

// These contexts are invalid for a return.
const PARSE_RETURN_CONTEXTS_INVALID = new Set([
    PM_CONTEXT_CLASS_ELSE, PM_CONTEXT_CLASS_ENSURE, PM_CONTEXT_CLASS_RESCUE, PM_CONTEXT_CLASS,
    PM_CONTEXT_MODULE_ELSE, PM_CONTEXT_MODULE_ENSURE, PM_CONTEXT_MODULE_RESCUE, PM_CONTEXT_MODULE
]);
// Everything else (block/def/lambda contexts) is valid for a return, and
// stops the walk without an error - the fallback at the bottom of the loop.

/**
 * Check that the return is allowed in the current context. If it isn't, add an
 * error to the parser.
 */
function parse_return(parser, node) {
    let in_sclass = false;
    for (let context_node = parser.current_context; context_node !== null; context_node = context_node.prev) {
        const context = context_node.context;

        if (PARSE_RETURN_CONTEXTS_CONTINUE.has(context)) continue;
        if (PARSE_RETURN_CONTEXTS_SCLASS.has(context)) {
            in_sclass = true;
            continue;
        }
        if (PARSE_RETURN_CONTEXTS_INVALID.has(context)) {
            pm_parser_err_node(parser, node, PM_ERR_RETURN_INVALID);
            return;
        }
        if (context === PM_CONTEXT_NONE) {
            // This case should never happen.
            // assert(false && "unreachable"): debug-only in C.
            continue;
        }

        // Any other context (block/def/lambda) is valid for a return, and we
        // should not continue to loop.
        return;
    }
    if (in_sclass && parser.version >= PM_OPTIONS_VERSION_CRUBY_3_4) {
        pm_parser_err_node(parser, node, PM_ERR_RETURN_INVALID);
    }
}

// A block exit (next, break, redo) is allowed in these contexts.
const PARSE_BLOCK_EXIT_CONTEXTS_GOOD = new Set([
    PM_CONTEXT_BLOCK_BRACES, PM_CONTEXT_BLOCK_KEYWORDS, PM_CONTEXT_BLOCK_ELSE, PM_CONTEXT_BLOCK_ENSURE,
    PM_CONTEXT_BLOCK_PARAMETERS, PM_CONTEXT_BLOCK_RESCUE, PM_CONTEXT_DEFINED, PM_CONTEXT_FOR,
    PM_CONTEXT_LAMBDA_BRACES, PM_CONTEXT_LAMBDA_DO_END, PM_CONTEXT_LAMBDA_ELSE, PM_CONTEXT_LAMBDA_ENSURE,
    PM_CONTEXT_LAMBDA_RESCUE, PM_CONTEXT_LOOP_PREDICATE, PM_CONTEXT_POSTEXE, PM_CONTEXT_UNTIL, PM_CONTEXT_WHILE
]);

// A block exit is not allowed in these contexts - at least not yet; it could
// still become valid if a trailing while/until is found (see
// push_block_exits/flush_block_exits below), so it's queued rather than
// immediately reported.
const PARSE_BLOCK_EXIT_CONTEXTS_BAD = new Set([
    PM_CONTEXT_DEF, PM_CONTEXT_DEF_PARAMS, PM_CONTEXT_DEF_ELSE, PM_CONTEXT_DEF_ENSURE, PM_CONTEXT_DEF_RESCUE,
    PM_CONTEXT_MAIN, PM_CONTEXT_PREEXE, PM_CONTEXT_SCLASS, PM_CONTEXT_SCLASS_ELSE,
    PM_CONTEXT_SCLASS_ENSURE, PM_CONTEXT_SCLASS_RESCUE
]);
// Everything else continues walking up the list of contexts unchanged.

/**
 * Check that the block exit (next, break, redo) is allowed in the current
 * context. If it isn't, add an error to the parser.
 */
function parse_block_exit(parser, node) {
    for (let context_node = parser.current_context; context_node !== null; context_node = context_node.prev) {
        const context = context_node.context;

        if (PARSE_BLOCK_EXIT_CONTEXTS_GOOD.has(context)) return;
        if (PARSE_BLOCK_EXIT_CONTEXTS_BAD.has(context)) {
            // If we get here, then we're about to mark this block exit
            // as invalid. However, it could later _become_ valid if we
            // find a trailing while/until on the expression. In this
            // case instead of adding the error here, we'll add the
            // block exit to the list of exits for the expression, and
            // the node parsing will handle validating it instead.
            // assert(parser.current_block_exits !== null): debug-only in C.
            pm_node_list_append(parser.current_block_exits, node);
            return;
        }
        // Any other context (including the unreachable-in-practice
        // PM_CONTEXT_NONE) means keep walking up the list of contexts.
    }
}

/**
 * When we hit an expression that could contain block exits, we need to stash
 * the previous set and create a new one.
 */
function push_block_exits(parser, current_block_exits) {
    const previous_block_exits = parser.current_block_exits;
    parser.current_block_exits = current_block_exits;
    return previous_block_exits;
}

/**
 * If we did not match a trailing while/until and this was the last chance to do
 * so, then all of the block exits in the list are invalid and we need to add an
 * error for each of them.
 */
function flush_block_exits(parser, previous_block_exits) {
    let block_exit;

    for (let index = 0; index < parser.current_block_exits.length; index++) {
        block_exit = parser.current_block_exits[index];

        let type;

        switch (block_exit.type) {
            case PM_BREAK_NODE: type = "break"; break;
            case PM_NEXT_NODE: type = "next"; break;
            case PM_REDO_NODE: type = "redo"; break;
            default: /* assert(false && "unreachable"): debug-only in C. */ type = ""; break;
        }

        PM_PARSER_ERR_NODE_FORMAT(parser, block_exit, PM_ERR_INVALID_BLOCK_EXIT, type);
    }

    parser.current_block_exits = previous_block_exits;
}

/**
 * Pop the current level of block exits from the parser, and add errors to the
 * parser if any of them are deemed to be invalid.
 */
function pop_block_exits(parser, previous_block_exits) {
    if (match2(parser, PM_TOKEN_KEYWORD_WHILE_MODIFIER, PM_TOKEN_KEYWORD_UNTIL_MODIFIER)) {
        // If we matched a trailing while/until, then all of the block exits in
        // the contained list are valid. In this case we do not need to do
        // anything.
        parser.current_block_exits = previous_block_exits;
    } else if (previous_block_exits !== null) {
        // If we did not matching a trailing while/until, then all of the block
        // exits contained in the list are invalid for this specific context.
        // However, they could still become valid in a higher level context if
        // there is another list above this one. In this case we'll push all of
        // the block exits up to the previous list.
        pm_node_list_concat(previous_block_exits, parser.current_block_exits);
        parser.current_block_exits = previous_block_exits;
    } else {
        // If we did not match a trailing while/until and this was the last
        // chance to do so, then all of the block exits in the list are invalid
        // and we need to add an error for each of them.
        flush_block_exits(parser, previous_block_exits);
    }
}

/******************************************************************************/
/* Predicates and conditionals                                                */
/******************************************************************************/

function parse_predicate(parser, binding_power, context, then_keyword, depth) {
    context_push(parser, PM_CONTEXT_PREDICATE);
    const error_id = context === PM_CONTEXT_IF ? PM_ERR_CONDITIONAL_IF_PREDICATE : PM_ERR_CONDITIONAL_UNLESS_PREDICATE;
    const predicate = parse_value_expression(parser, binding_power, true, false, error_id, depth + 1);

    // Predicates are closed by a term, a "then", or a term and then a "then".
    let predicate_closed = accept2(parser, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON);

    if (accept1(parser, PM_TOKEN_KEYWORD_THEN)) {
        predicate_closed = true;
        then_keyword.type = parser.previous.type;
        then_keyword.start = parser.previous.start;
        then_keyword.end = parser.previous.end;
    }

    if (!predicate_closed) {
        pm_parser_err_current(parser, PM_ERR_CONDITIONAL_PREDICATE_TERM);
    }

    context_pop(parser);
    return predicate;
}

function parse_conditional(parser, context, opening_newline_index, if_after_else, depth) {
    const current_block_exits = [];
    const previous_block_exits = push_block_exits(parser, current_block_exits);

    const keyword = copyToken(parser.previous);
    const then_keyword = not_provided(parser);

    const predicate = parse_predicate(parser, PM_BINDING_POWER_MODIFIER, context, then_keyword, depth + 1);
    let statements = null;

    if (!match3(parser, PM_TOKEN_KEYWORD_ELSIF, PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_KEYWORD_END)) {
        pm_accepts_block_stack_push(parser, true);
        statements = parse_statements(parser, context, depth + 1);
        pm_accepts_block_stack_pop(parser);
        accept2(parser, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON);
    }

    const end_keyword = not_provided(parser);
    let parent = null;

    switch (context) {
        case PM_CONTEXT_IF:
            parent = pm_if_node_create(parser, keyword, predicate, then_keyword, statements, null, end_keyword);
            break;
        case PM_CONTEXT_UNLESS:
            parent = pm_unless_node_create(parser, keyword, predicate, then_keyword, statements);
            break;
        default:
            // assert(false && "unreachable"): debug-only in C.
            break;
    }

    let current = parent;

    // Parse any number of elsif clauses. This will form a linked list of if
    // nodes pointing to each other from the top.
    if (context === PM_CONTEXT_IF) {
        while (match1(parser, PM_TOKEN_KEYWORD_ELSIF)) {
            if (parser_end_of_line_p(parser)) {
                PM_PARSER_WARN_TOKEN_FORMAT_CONTENT(parser, parser.current, PM_WARN_KEYWORD_EOL);
            }

            parser_warn_indentation_mismatch(parser, opening_newline_index, keyword, false, false);
            const elsif_keyword = copyToken(parser.current);
            parser_lex(parser);

            const elsif_predicate = parse_predicate(parser, PM_BINDING_POWER_MODIFIER, PM_CONTEXT_ELSIF, then_keyword, depth + 1);
            pm_accepts_block_stack_push(parser, true);

            const elsif_statements = parse_statements(parser, PM_CONTEXT_ELSIF, depth + 1);
            pm_accepts_block_stack_pop(parser);
            accept2(parser, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON);

            const elsif = pm_if_node_create(parser, elsif_keyword, elsif_predicate, then_keyword, elsif_statements, null, end_keyword);
            current.subsequent = elsif;
            current = elsif;
        }
    }

    if (match1(parser, PM_TOKEN_KEYWORD_ELSE)) {
        parser_warn_indentation_mismatch(parser, opening_newline_index, keyword, false, false);
        opening_newline_index = token_newline_index(parser);

        parser_lex(parser);
        const else_keyword = copyToken(parser.previous);

        pm_accepts_block_stack_push(parser, true);
        const else_statements = parse_statements(parser, PM_CONTEXT_ELSE, depth + 1);
        pm_accepts_block_stack_pop(parser);

        accept2(parser, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON);
        parser_warn_indentation_mismatch(parser, opening_newline_index, else_keyword, false, false);
        expect1_opening(parser, PM_TOKEN_KEYWORD_END, PM_ERR_CONDITIONAL_TERM_ELSE, keyword);

        const else_node = pm_else_node_create(parser, else_keyword, else_statements, parser.previous);

        switch (context) {
            case PM_CONTEXT_IF:
                current.subsequent = else_node;
                break;
            case PM_CONTEXT_UNLESS:
                parent.else_clause = else_node;
                break;
            default:
                // assert(false && "unreachable"): debug-only in C.
                break;
        }
    } else {
        parser_warn_indentation_mismatch(parser, opening_newline_index, keyword, if_after_else, false);
        expect1_opening(parser, PM_TOKEN_KEYWORD_END, PM_ERR_CONDITIONAL_TERM, keyword);
    }

    // Set the appropriate end location for all of the nodes in the subtree.
    switch (context) {
        case PM_CONTEXT_IF: {
            let walker = parent;
            let recursing = true;

            while (recursing) {
                switch (walker.type) {
                    case PM_IF_NODE:
                        pm_if_node_end_keyword_loc_set(walker, parser.previous);
                        walker = walker.subsequent;
                        recursing = walker !== null;
                        break;
                    case PM_ELSE_NODE:
                        pm_else_node_end_keyword_loc_set(walker, parser.previous);
                        recursing = false;
                        break;
                    default: {
                        recursing = false;
                        break;
                    }
                }
            }
            break;
        }
        case PM_CONTEXT_UNLESS:
            pm_unless_node_end_keyword_loc_set(parent, parser.previous);
            break;
        default:
            // assert(false && "unreachable"): debug-only in C.
            break;
    }

    pop_block_exits(parser, previous_block_exits);

    return parent;
}

/******************************************************************************/
/* Case-label macros (for use by later fragments)                             */
/******************************************************************************/

// #define PM_CASE_KEYWORD (prism.c:15290) - switch-label macro in C; a Set of
// token types here, tested with .has().
const PM_CASE_KEYWORD = new Set([
    PM_TOKEN_KEYWORD___ENCODING__, PM_TOKEN_KEYWORD___FILE__, PM_TOKEN_KEYWORD___LINE__,
    PM_TOKEN_KEYWORD_ALIAS, PM_TOKEN_KEYWORD_AND, PM_TOKEN_KEYWORD_BEGIN, PM_TOKEN_KEYWORD_BEGIN_UPCASE,
    PM_TOKEN_KEYWORD_BREAK, PM_TOKEN_KEYWORD_CASE, PM_TOKEN_KEYWORD_CLASS, PM_TOKEN_KEYWORD_DEF,
    PM_TOKEN_KEYWORD_DEFINED, PM_TOKEN_KEYWORD_DO, PM_TOKEN_KEYWORD_DO_LOOP, PM_TOKEN_KEYWORD_ELSE,
    PM_TOKEN_KEYWORD_ELSIF, PM_TOKEN_KEYWORD_END, PM_TOKEN_KEYWORD_END_UPCASE, PM_TOKEN_KEYWORD_ENSURE,
    PM_TOKEN_KEYWORD_FALSE, PM_TOKEN_KEYWORD_FOR, PM_TOKEN_KEYWORD_IF, PM_TOKEN_KEYWORD_IN,
    PM_TOKEN_KEYWORD_MODULE, PM_TOKEN_KEYWORD_NEXT, PM_TOKEN_KEYWORD_NIL, PM_TOKEN_KEYWORD_NOT,
    PM_TOKEN_KEYWORD_OR, PM_TOKEN_KEYWORD_REDO, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_RETRY,
    PM_TOKEN_KEYWORD_RETURN, PM_TOKEN_KEYWORD_SELF, PM_TOKEN_KEYWORD_SUPER, PM_TOKEN_KEYWORD_THEN,
    PM_TOKEN_KEYWORD_TRUE, PM_TOKEN_KEYWORD_UNDEF, PM_TOKEN_KEYWORD_UNLESS, PM_TOKEN_KEYWORD_UNTIL,
    PM_TOKEN_KEYWORD_WHEN, PM_TOKEN_KEYWORD_WHILE, PM_TOKEN_KEYWORD_YIELD
]);

// #define PM_CASE_OPERATOR (prism.c:15306)
const PM_CASE_OPERATOR = new Set([
    PM_TOKEN_AMPERSAND, PM_TOKEN_BACKTICK, PM_TOKEN_BANG_EQUAL,
    PM_TOKEN_BANG_TILDE, PM_TOKEN_BANG, PM_TOKEN_BRACKET_LEFT_RIGHT_EQUAL,
    PM_TOKEN_BRACKET_LEFT_RIGHT, PM_TOKEN_CARET, PM_TOKEN_EQUAL_EQUAL_EQUAL, PM_TOKEN_EQUAL_EQUAL,
    PM_TOKEN_EQUAL_TILDE, PM_TOKEN_GREATER_EQUAL, PM_TOKEN_GREATER_GREATER, PM_TOKEN_GREATER,
    PM_TOKEN_LESS_EQUAL_GREATER, PM_TOKEN_LESS_EQUAL, PM_TOKEN_LESS_LESS, PM_TOKEN_LESS,
    PM_TOKEN_MINUS, PM_TOKEN_PERCENT, PM_TOKEN_PIPE, PM_TOKEN_PLUS, PM_TOKEN_SLASH,
    PM_TOKEN_STAR_STAR, PM_TOKEN_STAR, PM_TOKEN_TILDE, PM_TOKEN_UAMPERSAND, PM_TOKEN_UMINUS,
    PM_TOKEN_UMINUS_NUM, PM_TOKEN_UPLUS, PM_TOKEN_USTAR, PM_TOKEN_USTAR_STAR
]);

// #define PM_CASE_PRIMITIVE (prism.c:15320)
const PM_CASE_PRIMITIVE = new Set([
    PM_TOKEN_INTEGER, PM_TOKEN_INTEGER_IMAGINARY, PM_TOKEN_INTEGER_RATIONAL,
    PM_TOKEN_INTEGER_RATIONAL_IMAGINARY, PM_TOKEN_FLOAT, PM_TOKEN_FLOAT_IMAGINARY,
    PM_TOKEN_FLOAT_RATIONAL, PM_TOKEN_FLOAT_RATIONAL_IMAGINARY, PM_TOKEN_SYMBOL_BEGIN,
    PM_TOKEN_REGEXP_BEGIN, PM_TOKEN_BACKTICK, PM_TOKEN_PERCENT_LOWER_X, PM_TOKEN_PERCENT_LOWER_I,
    PM_TOKEN_PERCENT_LOWER_W, PM_TOKEN_PERCENT_UPPER_I, PM_TOKEN_PERCENT_UPPER_W,
    PM_TOKEN_STRING_BEGIN, PM_TOKEN_KEYWORD_NIL, PM_TOKEN_KEYWORD_SELF, PM_TOKEN_KEYWORD_TRUE,
    PM_TOKEN_KEYWORD_FALSE, PM_TOKEN_KEYWORD___FILE__, PM_TOKEN_KEYWORD___LINE__,
    PM_TOKEN_KEYWORD___ENCODING__, PM_TOKEN_MINUS_GREATER, PM_TOKEN_HEREDOC_START,
    PM_TOKEN_UMINUS_NUM, PM_TOKEN_CHARACTER_LITERAL
]);

// #define PM_CASE_PARAMETER (prism.c:15334)
const PM_CASE_PARAMETER = new Set([
    PM_TOKEN_UAMPERSAND, PM_TOKEN_AMPERSAND, PM_TOKEN_UDOT_DOT_DOT,
    PM_TOKEN_IDENTIFIER, PM_TOKEN_LABEL, PM_TOKEN_USTAR, PM_TOKEN_STAR, PM_TOKEN_STAR_STAR,
    PM_TOKEN_USTAR_STAR, PM_TOKEN_CONSTANT, PM_TOKEN_INSTANCE_VARIABLE, PM_TOKEN_GLOBAL_VARIABLE,
    PM_TOKEN_CLASS_VARIABLE
]);

// #define PM_CASE_WRITABLE (prism.c:15343) - a Set of node types.
const PM_CASE_WRITABLE = new Set([
    PM_CLASS_VARIABLE_READ_NODE, PM_CONSTANT_PATH_NODE,
    PM_CONSTANT_READ_NODE, PM_GLOBAL_VARIABLE_READ_NODE, PM_LOCAL_VARIABLE_READ_NODE,
    PM_INSTANCE_VARIABLE_READ_NODE, PM_MULTI_TARGET_NODE, PM_BACK_REFERENCE_READ_NODE,
    PM_NUMBERED_REFERENCE_READ_NODE, PM_IT_LOCAL_VARIABLE_READ_NODE
]);

// PM_STATIC_ASSERT (prism.c:15350) is compile-time debug machinery in C and is
// omitted.

// parse_unescaped_encoding starts at prism.c:15353; its body belongs to the
// next fragment.
