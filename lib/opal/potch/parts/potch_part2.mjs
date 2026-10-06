// prism.c lines 1930-7083 converted to JavaScript (ES2022).
//
// This is a plain fragment: it declares consts/functions only, no
// import/export. It relies on part1, ast.js, node.js, diagnostic.js,
// options.js, encoding.js and the util modules being concatenated/imported
// around it.
//
// Adaptation notes for the integrator:
// - pm_node_alloc/PM_NODE_ALLOC/xcalloc vanish (garbage collection); every
//   *_create builds its node as one flat object literal with the base fields
//   first (type/flags/node_id/location exactly as the PM_NODE_INIT variant
//   computes them). C's zero-initialization is mirrored by giving unmentioned
//   location fields { start: null, end: null }, node-list fields [] (a plain
//   array; see node.js) and pointers null.
// - `FL(node)` in this range is the PM_NODE_FLAGS getter (C prism.c:25), i.e.
//   plain `node.flags`; part1's FL(node, flags) setter form is not used here.
// - UP(node) upcasts are no-ops in JS and are omitted.
// - xfree(target) calls vanish (GC).
// - asserts are debug-only in C and are kept as comments only.
// - The C parameter name `arguments` is reserved in JS; those parameters are
//   named `arguments_` (same convention as part1).
// - `.locals = *locals` struct copies become value copies of the id list
//   (a plain array): `locals.slice()` via pm_constant_id_list_copy.
// - pm_call_write_read_name_init takes the write_name value and RETURNS the
//   derived read_name (C's pm_constant_id_t * out-param), so callers assign the
//   plain number fields directly; the stored node shape still matches C.
// - pm_token_is_it / pm_token_is_numbered_parameter take the source buffer
//   explicitly (they deref raw pointers in C): (source, start, end).
// - pm_symbol_node_label_p takes (parser, node): it reads the byte before
//   closing_loc.end out of parser.source (same adaptation as part1's
//   token_is_setter_name).
// - parse_operator_symbol_name is DEFINED here because it is forward-declared
//   in this range (prism.c:2643). Its C definition lives at prism.c:15512;
//   whichever later part owns that line must drop its copy. It takes
//   (parser, name) so it can read the trailing '@' byte from parser.source.
// - pm_double_parse reproduces strtod with Number() over the extracted decimal
//   text (both are correctly rounded). The locale decimal-point normalization
//   cannot trigger (JS Number parsing always expects '.').
// - PM_NODE_TYPE_P / PM_NODE_FLAG_P are defined here (they exist nowhere else
//   yet); if another fragment defines them, keep exactly one copy.
//
// Struct shapes referenced below (documented, not declared):
// - pm_integer_t := a plain bigint (see util/pm_integer.js)
// - pm_string_t  := { type, length, source: Uint8Array | null }

/******************************************************************************/
/* AST-related macros not present in part1                                    */
/******************************************************************************/

function PM_NODE_TYPE_P(node, type) {
    return node.type === type;
}

function PM_NODE_FLAG_P(node, flag) {
    return (node.flags & flag) !== 0;
}

/******************************************************************************/
/* Node creation functions                                                    */
/******************************************************************************/

/**
 * Allocate a new MissingNode node.
 */
function pm_missing_node_create(parser, start, end) {
    const node = {
        type: PM_MISSING_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        location: { start, end },
    };
    return node;
}

/**
 * Allocate and initialize a new AliasGlobalVariableNode node.
 */
function pm_alias_global_variable_node_create(parser, keyword, new_name, old_name) {
    // assert(keyword.type === PM_TOKEN_KEYWORD_ALIAS);
    const node = {
        type: PM_ALIAS_GLOBAL_VARIABLE_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN_NODE(keyword, old_name)
        location: { start: keyword.start, end: old_name.location.end },
        new_name,
        old_name,
        keyword_loc: PM_LOCATION_TOKEN_VALUE(keyword),
    };
    return node;
}

/**
 * Allocate and initialize a new AliasMethodNode node.
 */
function pm_alias_method_node_create(parser, keyword, new_name, old_name) {
    // assert(keyword.type === PM_TOKEN_KEYWORD_ALIAS);
    const node = {
        type: PM_ALIAS_METHOD_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN_NODE(keyword, old_name)
        location: { start: keyword.start, end: old_name.location.end },
        new_name,
        old_name,
        keyword_loc: PM_LOCATION_TOKEN_VALUE(keyword),
    };
    return node;
}

/**
 * Allocate a new AlternationPatternNode node.
 */
function pm_alternation_pattern_node_create(parser, left, right, operator) {
    const node = {
        type: PM_ALTERNATION_PATTERN_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_NODES(left, right)
        location: { start: left.location.start, end: right.location.end },
        left,
        right,
        operator_loc: PM_LOCATION_TOKEN_VALUE(operator),
    };
    return node;
}

/**
 * Allocate and initialize a new and node.
 */
function pm_and_node_create(parser, left, operator, right) {
    pm_assert_value_expression(parser, left);

    const node = {
        type: PM_AND_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_NODES(left, right)
        location: { start: left.location.start, end: right.location.end },
        left,
        right,
        operator_loc: PM_LOCATION_TOKEN_VALUE(operator),
    };
    return node;
}

/**
 * Allocate an initialize a new arguments node.
 */
function pm_arguments_node_create(parser) {
    const node = {
        type: PM_ARGUMENTS_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_BASE
        location: { start: parser.start, end: parser.start },
        arguments: [],
    };
    return node;
}

/**
 * Return the size of the given arguments node.
 */
function pm_arguments_node_size(node) {
    return node.arguments.length;
}

/**
 * Append an argument to an arguments node.
 */
function pm_arguments_node_arguments_append(node, argument) {
    if (pm_arguments_node_size(node) === 0) {
        node.location.start = argument.location.start;
    }

    if (node.location.end < argument.location.end) {
        node.location.end = argument.location.end;
    }

    pm_node_list_append(node.arguments, argument);

    if (PM_NODE_TYPE_P(argument, PM_SPLAT_NODE)) {
        if (PM_NODE_FLAG_P(node, PM_ARGUMENTS_NODE_FLAGS_CONTAINS_SPLAT)) {
            pm_node_flag_set(node, PM_ARGUMENTS_NODE_FLAGS_CONTAINS_MULTIPLE_SPLATS);
        } else {
            pm_node_flag_set(node, PM_ARGUMENTS_NODE_FLAGS_CONTAINS_SPLAT);
        }
    }
}

/**
 * Allocate and initialize a new ArrayNode node.
 */
function pm_array_node_create(parser, opening) {
    const node = {
        type: PM_ARRAY_NODE,
        flags: PM_NODE_FLAG_STATIC_LITERAL,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(opening)
        location: { start: opening.start, end: opening.end },
        elements: [],
        opening_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(opening),
        closing_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(opening),
    };
    return node;
}

/**
 * Append an argument to an array node.
 */
function pm_array_node_elements_append(node, element) {
    if (!node.elements.length && node.opening_loc.start === null) { // C: opening_loc.start == NULL (pointer check)
        node.location.start = element.location.start;
    }

    pm_node_list_append(node.elements, element);
    node.location.end = element.location.end;

    // If the element is not a static literal, then the array is not a static
    // literal. Turn that flag off.
    if (PM_NODE_TYPE_P(element, PM_ARRAY_NODE) || PM_NODE_TYPE_P(element, PM_HASH_NODE) || PM_NODE_TYPE_P(element, PM_RANGE_NODE) || !PM_NODE_FLAG_P(element, PM_NODE_FLAG_STATIC_LITERAL)) {
        pm_node_flag_unset(node, PM_NODE_FLAG_STATIC_LITERAL);
    }

    if (PM_NODE_TYPE_P(element, PM_SPLAT_NODE)) {
        pm_node_flag_set(node, PM_ARRAY_NODE_FLAGS_CONTAINS_SPLAT);
    }
}

/**
 * Set the closing token and end location of an array node.
 */
function pm_array_node_close_set(node, closing) {
    // assert(closing.type === PM_TOKEN_BRACKET_RIGHT || closing.type === PM_TOKEN_STRING_END || closing.type === PM_TOKEN_MISSING || closing.type === PM_TOKEN_NOT_PROVIDED);
    node.location.end = closing.end;
    node.closing_loc = PM_LOCATION_TOKEN_VALUE(closing);
}

/**
 * Allocate and initialize a new array pattern node. The node list given in the
 * nodes parameter is guaranteed to have at least two nodes.
 */
function pm_array_pattern_node_node_list_create(parser, nodes) {
    const node = {
        type: PM_ARRAY_PATTERN_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_NODES(nodes[0], nodes[nodes.length - 1])
        location: { start: nodes[0].location.start, end: nodes[nodes.length - 1].location.end },
        constant: null,
        requireds: [],
        rest: null,
        posts: [],
        opening_loc: PM_LOCATION_UNSET,
        closing_loc: PM_LOCATION_UNSET,
    };

    // For now we're going to just copy over each pointer manually. This could be
    // much more efficient, as we could instead resize the node list.
    let found_rest = false;

    for (let index = 0; index < nodes.length; index++) {
        const child = nodes[index];

        if (!found_rest && (PM_NODE_TYPE_P(child, PM_SPLAT_NODE) || PM_NODE_TYPE_P(child, PM_IMPLICIT_REST_NODE))) {
            node.rest = child;
            found_rest = true;
        } else if (found_rest) {
            pm_node_list_append(node.posts, child);
        } else {
            pm_node_list_append(node.requireds, child);
        }
    }

    return node;
}

/**
 * Allocate and initialize a new array pattern node from a single rest node.
 */
function pm_array_pattern_node_rest_create(parser, rest) {
    const node = {
        type: PM_ARRAY_PATTERN_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_NODE(rest)
        location: { start: rest.location.start, end: rest.location.end },
        constant: null,
        requireds: [],
        rest,
        posts: [],
        opening_loc: PM_LOCATION_UNSET,
        closing_loc: PM_LOCATION_UNSET,
    };
    return node;
}

/**
 * Allocate and initialize a new array pattern node from a constant and opening
 * and closing tokens.
 */
function pm_array_pattern_node_constant_create(parser, constant, opening, closing) {
    const node = {
        type: PM_ARRAY_PATTERN_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_NODE_TOKEN(constant, closing)
        location: { start: constant.location.start, end: closing.end },
        constant,
        requireds: [],
        rest: null,
        posts: [],
        opening_loc: PM_LOCATION_TOKEN_VALUE(opening),
        closing_loc: PM_LOCATION_TOKEN_VALUE(closing),
    };
    return node;
}

/**
 * Allocate and initialize a new array pattern node from an opening and closing
 * token.
 */
function pm_array_pattern_node_empty_create(parser, opening, closing) {
    const node = {
        type: PM_ARRAY_PATTERN_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKENS(opening, closing)
        location: { start: opening.start, end: closing.end },
        constant: null,
        requireds: [],
        rest: null,
        posts: [],
        opening_loc: PM_LOCATION_TOKEN_VALUE(opening),
        closing_loc: PM_LOCATION_TOKEN_VALUE(closing),
    };
    return node;
}

function pm_array_pattern_node_requireds_append(node, inner) {
    pm_node_list_append(node.requireds, inner);
}

/**
 * Allocate and initialize a new assoc node.
 */
function pm_assoc_node_create(parser, key, operator, value) {
    let end;

    if (value !== null && value.location.end > key.location.end) {
        end = value.location.end;
    } else if (operator.type !== PM_TOKEN_NOT_PROVIDED) {
        end = operator.end;
    } else {
        end = key.location.end;
    }

    // Hash string keys will be frozen, so we can mark them as frozen here so
    // that the compiler picks them up and also when we check for static literal
    // on the keys it gets factored in.
    if (PM_NODE_TYPE_P(key, PM_STRING_NODE)) {
        key.flags |= PM_STRING_FLAGS_FROZEN | PM_NODE_FLAG_STATIC_LITERAL;
    }

    // If the key and value of this assoc node are both static literals, then
    // we can mark this node as a static literal.
    let flags = 0;
    if (
        !PM_NODE_TYPE_P(key, PM_ARRAY_NODE) && !PM_NODE_TYPE_P(key, PM_HASH_NODE) && !PM_NODE_TYPE_P(key, PM_RANGE_NODE) &&
        value && !PM_NODE_TYPE_P(value, PM_ARRAY_NODE) && !PM_NODE_TYPE_P(value, PM_HASH_NODE) && !PM_NODE_TYPE_P(value, PM_RANGE_NODE)
    ) {
        flags = key.flags & value.flags & PM_NODE_FLAG_STATIC_LITERAL;
    }

    const node = {
        type: PM_ASSOC_NODE,
        flags,
        node_id: ++parser.node_id,
        // PM_NODE_INIT(key.location.start, end)
        location: { start: key.location.start, end },
        key,
        value,
        operator_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(operator),
    };
    return node;
}

/**
 * Allocate and initialize a new assoc splat node.
 */
function pm_assoc_splat_node_create(parser, value, operator) {
    // assert(operator.type === PM_TOKEN_USTAR_STAR);
    const node = {
        type: PM_ASSOC_SPLAT_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        location: (
            (value === null)
            ? { start: operator.start, end: operator.end }
            : { start: operator.start, end: value.location.end }
        ),
        value,
        operator_loc: PM_LOCATION_TOKEN_VALUE(operator),
    };
    return node;
}

/**
 * Allocate a new BackReferenceReadNode node.
 */
function pm_back_reference_read_node_create(parser, name) {
    // assert(name.type === PM_TOKEN_BACK_REFERENCE);
    const node = {
        type: PM_BACK_REFERENCE_READ_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(name)
        location: { start: name.start, end: name.end },
        name: pm_parser_constant_id_token(parser, name),
    };
    return node;
}

/**
 * Allocate and initialize new a begin node.
 */
function pm_begin_node_create(parser, begin_keyword, statements) {
    const node = {
        type: PM_BEGIN_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        location: (
            (statements === null)
            ? { start: begin_keyword.start, end: begin_keyword.end }
            : { start: begin_keyword.start, end: statements.location.end }
        ),
        begin_keyword_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(begin_keyword),
        statements,
        rescue_clause: null,
        else_clause: null,
        ensure_clause: null,
        end_keyword_loc: PM_LOCATION_UNSET,
    };
    return node;
}

/**
 * Set the rescue clause, optionally start, and end location of a begin node.
 */
function pm_begin_node_rescue_clause_set(node, rescue_clause) {
    // If the begin keyword doesn't exist, we set the start on the begin_node
    if (node.begin_keyword_loc.start === null) { // C: !node->begin_keyword_loc.start (pointer NULL)
        node.location.start = rescue_clause.location.start;
    }
    node.location.end = rescue_clause.location.end;
    node.rescue_clause = rescue_clause;
}

/**
 * Set the else clause and end location of a begin node.
 */
function pm_begin_node_else_clause_set(node, else_clause) {
    node.location.end = else_clause.location.end;
    node.else_clause = else_clause;
}

/**
 * Set the ensure clause and end location of a begin node.
 */
function pm_begin_node_ensure_clause_set(node, ensure_clause) {
    node.location.end = ensure_clause.location.end;
    node.ensure_clause = ensure_clause;
}

/**
 * Set the end keyword and end location of a begin node.
 */
function pm_begin_node_end_keyword_set(node, end_keyword) {
    // assert(end_keyword.type === PM_TOKEN_KEYWORD_END || end_keyword.type === PM_TOKEN_MISSING);

    node.location.end = end_keyword.end;
    node.end_keyword_loc = PM_OPTIONAL_LOCATION_TOKEN_VALUE(end_keyword);
}

/**
 * Allocate and initialize a new BlockArgumentNode node.
 */
function pm_block_argument_node_create(parser, operator, expression) {
    const node = {
        type: PM_BLOCK_ARGUMENT_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        location: (
            (expression === null)
            ? { start: operator.start, end: operator.end }
            : { start: operator.start, end: expression.location.end }
        ),
        expression,
        operator_loc: PM_LOCATION_TOKEN_VALUE(operator),
    };
    return node;
}

/**
 * Allocate and initialize a new BlockNode node.
 */
function pm_block_node_create(parser, locals, opening, parameters, body, closing) {
    const node = {
        type: PM_BLOCK_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKENS(opening, closing)
        location: { start: opening.start, end: closing.end },
        locals: pm_constant_id_list_copy(locals),
        parameters,
        body,
        opening_loc: PM_LOCATION_TOKEN_VALUE(opening),
        closing_loc: PM_LOCATION_TOKEN_VALUE(closing),
    };
    return node;
}

/**
 * Allocate and initialize a new BlockParameterNode node.
 */
function pm_block_parameter_node_create(parser, name, operator) {
    // assert(operator.type === PM_TOKEN_NOT_PROVIDED || operator.type === PM_TOKEN_UAMPERSAND || operator.type === PM_TOKEN_AMPERSAND);
    const node = {
        type: PM_BLOCK_PARAMETER_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        location: (
            (name.type === PM_TOKEN_NOT_PROVIDED)
            ? { start: operator.start, end: operator.end }
            : { start: operator.start, end: name.end }
        ),
        name: pm_parser_optional_constant_id_token(parser, name),
        name_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(name),
        operator_loc: PM_LOCATION_TOKEN_VALUE(operator),
    };
    return node;
}

/**
 * Allocate and initialize a new BlockParametersNode node.
 */
function pm_block_parameters_node_create(parser, parameters, opening) {
    let start;
    if (opening.type !== PM_TOKEN_NOT_PROVIDED) {
        start = opening.start;
    } else if (parameters !== null) {
        start = parameters.location.start;
    } else {
        start = null;
    }

    let end;
    if (parameters !== null) {
        end = parameters.location.end;
    } else if (opening.type !== PM_TOKEN_NOT_PROVIDED) {
        end = opening.end;
    } else {
        end = null;
    }

    const node = {
        type: PM_BLOCK_PARAMETERS_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT(start, end)
        location: { start, end },
        parameters,
        locals: [],
        opening_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(opening),
        closing_loc: PM_LOCATION_UNSET,
    };
    return node;
}

/**
 * Set the closing location of a BlockParametersNode node.
 */
function pm_block_parameters_node_closing_set(node, closing) {
    // assert(closing.type === PM_TOKEN_PIPE || closing.type === PM_TOKEN_PARENTHESIS_RIGHT || closing.type === PM_TOKEN_MISSING);

    node.location.end = closing.end;
    node.closing_loc = PM_LOCATION_TOKEN_VALUE(closing);
}

/**
 * Allocate and initialize a new BlockLocalVariableNode node.
 */
function pm_block_local_variable_node_create(parser, name) {
    const node = {
        type: PM_BLOCK_LOCAL_VARIABLE_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(name)
        location: { start: name.start, end: name.end },
        name: pm_parser_constant_id_token(parser, name),
    };
    return node;
}

/**
 * Append a new block-local variable to a BlockParametersNode node.
 */
function pm_block_parameters_node_append_local(node, local) {
    pm_node_list_append(node.locals, local);

    if (node.location.start === null) node.location.start = local.location.start;
    node.location.end = local.location.end;
}

/**
 * Allocate and initialize a new BreakNode node.
 */
function pm_break_node_create(parser, keyword, arguments_) {
    // assert(keyword.type === PM_TOKEN_KEYWORD_BREAK);
    const node = {
        type: PM_BREAK_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        location: (
            (arguments_ === null)
            ? { start: keyword.start, end: keyword.end }
            : { start: keyword.start, end: arguments_.location.end }
        ),
        arguments: arguments_,
        keyword_loc: PM_LOCATION_TOKEN_VALUE(keyword),
    };
    return node;
}

// There are certain flags that we want to use internally but don't want to
// expose because they are not relevant beyond parsing. Therefore we'll define
// them here and not define them in config.yml/a header file.
const PM_WRITE_NODE_FLAGS_IMPLICIT_ARRAY = 1 << 2;

const PM_CALL_NODE_FLAGS_IMPLICIT_ARRAY = (PM_CALL_NODE_FLAGS_LAST - 1) << 1;
const PM_CALL_NODE_FLAGS_COMPARISON = (PM_CALL_NODE_FLAGS_LAST - 1) << 2;
const PM_CALL_NODE_FLAGS_INDEX = (PM_CALL_NODE_FLAGS_LAST - 1) << 3;

/**
 * When creating a symbol, unary operators that cannot be binary operators
 * automatically drop trailing `@` characters. This happens at the parser level,
 * such that `~@` is parsed as `~` and `!@` is parsed as `!`. We do that here.
 *
 * (Forward-declared at prism.c:2643; defined at prism.c:15512.)
 * Adaptation: takes (parser, name) so it can read the trailing byte from
 * parser.source (same adaptation as part1's token_is_setter_name).
 */
function parse_operator_symbol_name(parser, name) {
    switch (name.type) {
        case PM_TOKEN_TILDE:
        case PM_TOKEN_BANG:
            if (parser.source[name.end - 1] === '@') return name.end - 1;
            // PRISM_FALLTHROUGH
        default:
            return name.end;
    }
}

/**
 * Allocate and initialize a new CallNode node. This sets everything to NULL or
 * PM_TOKEN_NOT_PROVIDED as appropriate such that its values can be overridden
 * in the various specializations of this function.
 */
function pm_call_node_create(parser, flags) {
    const node = {
        type: PM_CALL_NODE,
        flags,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_BASE
        location: { start: parser.start, end: parser.start },
        receiver: null,
        call_operator_loc: PM_LOCATION_UNSET,
        name: 0,
        message_loc: PM_LOCATION_UNSET,
        opening_loc: PM_LOCATION_UNSET,
        arguments: null,
        closing_loc: PM_LOCATION_UNSET,
        equal_loc: PM_LOCATION_UNSET,
        block: null,
    };
    return node;
}

/**
 * Returns the value that the ignore visibility flag should be set to for the
 * given receiver.
 */
function pm_call_node_ignore_visibility_flag(receiver) {
    return PM_NODE_TYPE_P(receiver, PM_SELF_NODE) ? PM_CALL_NODE_FLAGS_IGNORE_VISIBILITY : 0;
}

/**
 * Allocate and initialize a new CallNode node from an aref or an aset
 * expression.
 */
function pm_call_node_aref_create(parser, receiver, arguments_) {
    pm_assert_value_expression(parser, receiver);

    let flags = pm_call_node_ignore_visibility_flag(receiver);
    if (arguments_.block === null || PM_NODE_TYPE_P(arguments_.block, PM_BLOCK_ARGUMENT_NODE)) {
        flags |= PM_CALL_NODE_FLAGS_INDEX;
    }

    const node = pm_call_node_create(parser, flags);

    node.location.start = receiver.location.start;
    node.location.end = pm_arguments_end(arguments_);

    node.receiver = receiver;
    node.message_loc = { start: arguments_.opening_loc.start, end: arguments_.closing_loc.end };

    node.opening_loc = arguments_.opening_loc;
    node.arguments = arguments_.arguments;
    node.closing_loc = arguments_.closing_loc;
    node.block = arguments_.block;

    node.name = pm_parser_constant_id_constant(parser, "[]", 2);
    return node;
}

/**
 * Allocate and initialize a new CallNode node from a binary expression.
 */
function pm_call_node_binary_create(parser, receiver, operator, argument, flags) {
    pm_assert_value_expression(parser, receiver);
    pm_assert_value_expression(parser, argument);

    const node = pm_call_node_create(parser, pm_call_node_ignore_visibility_flag(receiver) | flags);

    node.location.start = Math.min(receiver.location.start, argument.location.start);
    node.location.end = Math.max(receiver.location.end, argument.location.end);

    node.receiver = receiver;
    node.message_loc = PM_OPTIONAL_LOCATION_TOKEN_VALUE(operator);

    const arguments_node = pm_arguments_node_create(parser);
    pm_arguments_node_arguments_append(arguments_node, argument);
    node.arguments = arguments_node;

    node.name = pm_parser_constant_id_token(parser, operator);
    return node;
}

/**
 * Allocate and initialize a new CallNode node from a call expression.
 */
function pm_call_node_call_create(parser, receiver, operator, message, arguments_) {
    pm_assert_value_expression(parser, receiver);

    const node = pm_call_node_create(parser, pm_call_node_ignore_visibility_flag(receiver));

    node.location.start = receiver.location.start;
    let end = pm_arguments_end(arguments_);
    if (end === null) {
        end = message.end;
    }
    node.location.end = end;

    node.receiver = receiver;
    node.call_operator_loc = PM_OPTIONAL_LOCATION_TOKEN_VALUE(operator);
    node.message_loc = PM_OPTIONAL_LOCATION_TOKEN_VALUE(message);
    node.opening_loc = arguments_.opening_loc;
    node.arguments = arguments_.arguments;
    node.closing_loc = arguments_.closing_loc;
    node.block = arguments_.block;

    if (operator.type === PM_TOKEN_AMPERSAND_DOT) {
        pm_node_flag_set(node, PM_CALL_NODE_FLAGS_SAFE_NAVIGATION);
    }

    /**
     * If the final character is `@` as is the case for `foo.~@`,
     * we should ignore the @ in the same way we do for symbols.
     */
    node.name = pm_parser_constant_id_location(parser, message.start, parse_operator_symbol_name(parser, message));
    return node;
}

/**
 * Allocate and initialize a new synthesized CallNode node from a call expression.
 */
function pm_call_node_call_synthesized_create(parser, receiver, message, arguments_) {
    const node = pm_call_node_create(parser, 0);
    node.location.start = parser.start;
    node.location.end = parser.end;

    node.receiver = receiver;
    node.call_operator_loc = { start: null, end: null };
    node.message_loc = { start: null, end: null };
    node.arguments = arguments_;

    node.name = pm_parser_constant_id_constant(parser, message, message.length);
    return node;
}

/**
 * Allocate and initialize a new CallNode node from a call to a method name
 * without a receiver that could not have been a local variable read.
 */
function pm_call_node_fcall_create(parser, message, arguments_) {
    const node = pm_call_node_create(parser, PM_CALL_NODE_FLAGS_IGNORE_VISIBILITY);

    node.location.start = message.start;
    node.location.end = pm_arguments_end(arguments_);

    node.message_loc = PM_OPTIONAL_LOCATION_TOKEN_VALUE(message);
    node.opening_loc = arguments_.opening_loc;
    node.arguments = arguments_.arguments;
    node.closing_loc = arguments_.closing_loc;
    node.block = arguments_.block;

    node.name = pm_parser_constant_id_token(parser, message);
    return node;
}

/**
 * Allocate and initialize a new CallNode node from a synthesized call to a
 * method name with the given arguments.
 */
function pm_call_node_fcall_synthesized_create(parser, arguments_, name) {
    const node = pm_call_node_create(parser, PM_CALL_NODE_FLAGS_IGNORE_VISIBILITY);

    node.location = PM_LOCATION_NULL_VALUE(parser);
    node.arguments = arguments_;

    node.name = name;
    return node;
}

/**
 * Allocate and initialize a new CallNode node from a not expression.
 */
function pm_call_node_not_create(parser, receiver, message, arguments_) {
    pm_assert_value_expression(parser, receiver);
    if (receiver !== null) pm_conditional_predicate(parser, receiver, PM_CONDITIONAL_PREDICATE_TYPE_NOT);

    const node = pm_call_node_create(parser, receiver === null ? 0 : pm_call_node_ignore_visibility_flag(receiver));

    node.location.start = message.start;
    if (arguments_.closing_loc.start !== null) {
        node.location.end = arguments_.closing_loc.end;
    } else {
        // assert(receiver !== null);
        node.location.end = receiver.location.end;
    }

    node.receiver = receiver;
    node.message_loc = PM_OPTIONAL_LOCATION_TOKEN_VALUE(message);
    node.opening_loc = arguments_.opening_loc;
    node.arguments = arguments_.arguments;
    node.closing_loc = arguments_.closing_loc;

    node.name = pm_parser_constant_id_constant(parser, "!", 1);
    return node;
}

/**
 * Allocate and initialize a new CallNode node from a call shorthand expression.
 */
function pm_call_node_shorthand_create(parser, receiver, operator, arguments_) {
    pm_assert_value_expression(parser, receiver);

    const node = pm_call_node_create(parser, pm_call_node_ignore_visibility_flag(receiver));

    node.location.start = receiver.location.start;
    node.location.end = pm_arguments_end(arguments_);

    node.receiver = receiver;
    node.call_operator_loc = PM_OPTIONAL_LOCATION_TOKEN_VALUE(operator);
    node.opening_loc = arguments_.opening_loc;
    node.arguments = arguments_.arguments;
    node.closing_loc = arguments_.closing_loc;
    node.block = arguments_.block;

    if (operator.type === PM_TOKEN_AMPERSAND_DOT) {
        pm_node_flag_set(node, PM_CALL_NODE_FLAGS_SAFE_NAVIGATION);
    }

    node.name = pm_parser_constant_id_constant(parser, "call", 4);
    return node;
}

/**
 * Allocate and initialize a new CallNode node from a unary operator expression.
 */
function pm_call_node_unary_create(parser, operator, receiver, name) {
    pm_assert_value_expression(parser, receiver);

    const node = pm_call_node_create(parser, pm_call_node_ignore_visibility_flag(receiver));

    node.location.start = operator.start;
    node.location.end = receiver.location.end;

    node.receiver = receiver;
    node.message_loc = PM_OPTIONAL_LOCATION_TOKEN_VALUE(operator);

    node.name = pm_parser_constant_id_constant(parser, name, name.length);
    return node;
}

/**
 * Allocate and initialize a new CallNode node from a call to a method name
 * without a receiver that could also have been a local variable read.
 */
function pm_call_node_variable_call_create(parser, message) {
    const node = pm_call_node_create(parser, PM_CALL_NODE_FLAGS_IGNORE_VISIBILITY);

    node.location = PM_LOCATION_TOKEN_VALUE(message);
    node.message_loc = PM_OPTIONAL_LOCATION_TOKEN_VALUE(message);

    node.name = pm_parser_constant_id_token(parser, message);
    return node;
}

/**
 * Returns whether or not this call can be used on the left-hand side of an
 * operator assignment.
 */
function pm_call_node_writable_p(parser, node) {
    return (
        (node.message_loc.start !== null) &&
        (parser.source[node.message_loc.end - 1] !== '!') &&
        (parser.source[node.message_loc.end - 1] !== '?') &&
        char_is_identifier_start(parser, node.message_loc.start, parser.end - node.message_loc.start) &&
        (node.opening_loc.start === null) &&
        (node.arguments === null) &&
        (node.block === null)
    );
}

/**
 * Initialize the read name by reading the write name and chopping off the '='.
 *
 * Adaptation: read_name/write_name are box objects ({ value }) standing in for
 * the C pm_constant_id_t * out-params.
 */
function pm_call_write_read_name_init(parser, write_name) {
    const write_constant = pm_constant_pool_id_to_constant(parser.constant_pool, write_name);

    if (write_constant.length > 0) {
        const length = write_constant.length - 1;

        const memory = write_constant.start.slice(0, length);

        return pm_constant_pool_insert_owned(parser.constant_pool, memory, length);
    }

    // We can get here if the message was missing because of a syntax error.
    return pm_parser_constant_id_constant(parser, "", 0);
}

/**
 * Validate that index expressions do not have keywords or blocks if we are
 * parsing as Ruby 3.4+.
 */
function pm_index_arguments_check(parser, arguments_, block) {
    if (parser.version >= PM_OPTIONS_VERSION_CRUBY_3_4) {
        if (arguments_ !== null && PM_NODE_FLAG_P(arguments_, PM_ARGUMENTS_NODE_FLAGS_CONTAINS_KEYWORDS)) {
            for (let index = 0; index < arguments_.arguments.length; index++) {
                const node = arguments_.arguments[index];
                if (PM_NODE_TYPE_P(node, PM_KEYWORD_HASH_NODE)) {
                    pm_parser_err_node(parser, node, PM_ERR_UNEXPECTED_INDEX_KEYWORDS);
                    break;
                }
            }
        }

        if (block !== null) {
            pm_parser_err_node(parser, block, PM_ERR_UNEXPECTED_INDEX_BLOCK);
        }
    }
}

/**
 * Shared node builder for the Call{And,Operator,Or}WriteNode family. The
 * three differ only in `type` and whether the write carries a fixed
 * `operator_loc` (&&=/||=) or a `binary_operator`+`binary_operator_loc` pair
 * (an arbitrary op=, e.g. `+=`).
 */
function pm_call_write_node_create(parser, node_type, target, operator, value, has_binary_operator) {
    // assert(target.block === null);
    return {
        type: node_type,
        flags: target.flags,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_NODES(target, value)
        location: { start: target.location.start, end: value.location.end },
        receiver: target.receiver,
        call_operator_loc: target.call_operator_loc,
        message_loc: target.message_loc,
        read_name: pm_call_write_read_name_init(parser, target.name),
        write_name: target.name,
        ...(has_binary_operator
            ? { binary_operator: pm_operator_token_id(parser, operator), binary_operator_loc: PM_LOCATION_TOKEN_VALUE(operator) }
            : { operator_loc: PM_LOCATION_TOKEN_VALUE(operator) }),
        value,
    };
}

/**
 * Allocate and initialize a new CallAndWriteNode node.
 */
function pm_call_and_write_node_create(parser, target, operator, value) {
    // assert(operator.type === PM_TOKEN_AMPERSAND_AMPERSAND_EQUAL);
    return pm_call_write_node_create(parser, PM_CALL_AND_WRITE_NODE, target, operator, value, false);
}

/**
 * Allocate a new CallOperatorWriteNode node.
 */
function pm_call_operator_write_node_create(parser, target, operator, value) {
    return pm_call_write_node_create(parser, PM_CALL_OPERATOR_WRITE_NODE, target, operator, value, true);
}

/**
 * Allocate and initialize a new CallOrWriteNode node.
 */
function pm_call_or_write_node_create(parser, target, operator, value) {
    // assert(operator.type === PM_TOKEN_PIPE_PIPE_EQUAL);
    return pm_call_write_node_create(parser, PM_CALL_OR_WRITE_NODE, target, operator, value, false);
}

/**
 * Shared node builder for the Index{And,Operator,Or}WriteNode family. Same
 * operator_loc vs. binary_operator+binary_operator_loc split as
 * pm_call_write_node_create, for index-assignment targets (`a[i] op= v`).
 */
function pm_index_write_node_create(parser, node_type, target, operator, value, has_binary_operator) {
    pm_index_arguments_check(parser, target.arguments, target.block);
    // assert(!target.block || PM_NODE_TYPE_P(target.block, PM_BLOCK_ARGUMENT_NODE));
    return {
        type: node_type,
        flags: target.flags,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_NODES(target, value)
        location: { start: target.location.start, end: value.location.end },
        receiver: target.receiver,
        call_operator_loc: target.call_operator_loc,
        opening_loc: target.opening_loc,
        arguments: target.arguments,
        closing_loc: target.closing_loc,
        block: target.block,
        ...(has_binary_operator
            ? { binary_operator: pm_operator_token_id(parser, operator), binary_operator_loc: PM_LOCATION_TOKEN_VALUE(operator) }
            : { operator_loc: PM_LOCATION_TOKEN_VALUE(operator) }),
        value,
    };
}

/**
 * Allocate and initialize a new IndexAndWriteNode node.
 */
function pm_index_and_write_node_create(parser, target, operator, value) {
    // assert(operator.type === PM_TOKEN_AMPERSAND_AMPERSAND_EQUAL);
    return pm_index_write_node_create(parser, PM_INDEX_AND_WRITE_NODE, target, operator, value, false);
}

/**
 * Allocate a new IndexOperatorWriteNode node.
 */
function pm_index_operator_write_node_create(parser, target, operator, value) {
    return pm_index_write_node_create(parser, PM_INDEX_OPERATOR_WRITE_NODE, target, operator, value, true);
}

/**
 * Allocate and initialize a new IndexOrWriteNode node.
 */
function pm_index_or_write_node_create(parser, target, operator, value) {
    // assert(operator.type === PM_TOKEN_PIPE_PIPE_EQUAL);
    return pm_index_write_node_create(parser, PM_INDEX_OR_WRITE_NODE, target, operator, value, false);
}

/**
 * Allocate and initialize a new CallTargetNode node from an existing call
 * node.
 */
function pm_call_target_node_create(parser, target) {
    const node = {
        type: PM_CALL_TARGET_NODE,
        flags: target.flags,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_NODE(target)
        location: { start: target.location.start, end: target.location.end },
        receiver: target.receiver,
        call_operator_loc: target.call_operator_loc,
        name: target.name,
        message_loc: target.message_loc,
    };

    /* It is possible to get here where we have parsed an invalid syntax tree
     * where the call operator was not present. In that case we will have a
     * problem because it is a required location. In this case we need to fill
     * it in with a fake location so that the syntax tree remains valid. */
    if (node.call_operator_loc.start === null) {
        node.call_operator_loc = {
            start: target.location.start,
            end: target.location.start,
        };
    }


    return node;
}

/**
 * Allocate and initialize a new IndexTargetNode node from an existing call
 * node.
 */
function pm_index_target_node_create(parser, target) {
    pm_index_arguments_check(parser, target.arguments, target.block);
    // assert(!target.block || PM_NODE_TYPE_P(target.block, PM_BLOCK_ARGUMENT_NODE));

    const node = {
        type: PM_INDEX_TARGET_NODE,
        flags: target.flags | PM_CALL_NODE_FLAGS_ATTRIBUTE_WRITE,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_NODE(target)
        location: { start: target.location.start, end: target.location.end },
        receiver: target.receiver,
        opening_loc: target.opening_loc,
        arguments: target.arguments,
        closing_loc: target.closing_loc,
        block: target.block,
    };


    return node;
}

/**
 * Allocate and initialize a new CapturePatternNode node.
 */
function pm_capture_pattern_node_create(parser, value, target, operator) {
    const node = {
        type: PM_CAPTURE_PATTERN_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_NODES(value, target)
        location: { start: value.location.start, end: target.location.end },
        value,
        target,
        operator_loc: PM_LOCATION_TOKEN_VALUE(operator),
    };
    return node;
}

/**
 * Allocate and initialize a new CaseNode node.
 */
function pm_case_node_create(parser, case_keyword, predicate, end_keyword) {
    const node = {
        type: PM_CASE_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKENS(case_keyword, end_keyword)
        location: { start: case_keyword.start, end: end_keyword.end },
        predicate,
        conditions: [],
        else_clause: null,
        case_keyword_loc: PM_LOCATION_TOKEN_VALUE(case_keyword),
        end_keyword_loc: PM_LOCATION_TOKEN_VALUE(end_keyword),
    };
    return node;
}

/**
 * Append a new condition to a CaseNode node.
 */
function pm_case_node_condition_append(node, condition) {
    // assert(PM_NODE_TYPE_P(condition, PM_WHEN_NODE));

    pm_node_list_append(node.conditions, condition);
    node.location.end = condition.location.end;
}

/**
 * Set the else clause of a CaseNode node.
 */
function pm_case_node_else_clause_set(node, else_clause) {
    node.else_clause = else_clause;
    node.location.end = else_clause.location.end;
}

/**
 * Set the end location for a CaseNode node.
 */
function pm_case_node_end_keyword_loc_set(node, end_keyword) {
    node.location.end = end_keyword.end;
    node.end_keyword_loc = PM_LOCATION_TOKEN_VALUE(end_keyword);
}

/**
 * Allocate and initialize a new CaseMatchNode node.
 */
function pm_case_match_node_create(parser, case_keyword, predicate, end_keyword) {
    const node = {
        type: PM_CASE_MATCH_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKENS(case_keyword, end_keyword)
        location: { start: case_keyword.start, end: end_keyword.end },
        predicate,
        conditions: [],
        else_clause: null,
        case_keyword_loc: PM_LOCATION_TOKEN_VALUE(case_keyword),
        end_keyword_loc: PM_LOCATION_TOKEN_VALUE(end_keyword),
    };
    return node;
}

/**
 * Append a new condition to a CaseMatchNode node.
 */
function pm_case_match_node_condition_append(node, condition) {
    // assert(PM_NODE_TYPE_P(condition, PM_IN_NODE));

    pm_node_list_append(node.conditions, condition);
    node.location.end = condition.location.end;
}

/**
 * Set the else clause of a CaseMatchNode node.
 */
function pm_case_match_node_else_clause_set(node, else_clause) {
    node.else_clause = else_clause;
    node.location.end = else_clause.location.end;
}

/**
 * Set the end location for a CaseMatchNode node.
 */
function pm_case_match_node_end_keyword_loc_set(node, end_keyword) {
    node.location.end = end_keyword.end;
    node.end_keyword_loc = PM_LOCATION_TOKEN_VALUE(end_keyword);
}

/**
 * Allocate a new ClassNode node.
 */
function pm_class_node_create(parser, locals, class_keyword, constant_path, name, inheritance_operator, superclass, body, end_keyword) {
    const node = {
        type: PM_CLASS_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKENS(class_keyword, end_keyword)
        location: { start: class_keyword.start, end: end_keyword.end },
        locals: pm_constant_id_list_copy(locals),
        class_keyword_loc: PM_LOCATION_TOKEN_VALUE(class_keyword),
        constant_path,
        inheritance_operator_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(inheritance_operator),
        superclass,
        body,
        end_keyword_loc: PM_LOCATION_TOKEN_VALUE(end_keyword),
        name: pm_parser_constant_id_token(parser, name),
    };
    return node;
}

/**
 * Shared node builder for the {ClassVariable,Constant,GlobalVariable,
 * InstanceVariable} x {And,Operator,Or}WriteNode families - 12 node types
 * that differ only in `type` and how `name` is derived from the target, and
 * whether the write carries a plain `operator_loc` (&&=/||=) or a
 * `binary_operator_loc`+`value`+`binary_operator` triple (an arbitrary op=;
 * note `value` sits between the two binary_operator fields here, unlike the
 * call/index write-node family above - this matches each node type's own
 * C member order, verified per family before merging).
 */
function pm_name_write_node_create(parser, node_type, name, name_loc, operator, value, has_binary_operator) {
    return {
        type: node_type,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_NODES(target, value)
        location: { start: name_loc.start, end: value.location.end },
        name,
        name_loc,
        ...(has_binary_operator
            ? { binary_operator_loc: PM_LOCATION_TOKEN_VALUE(operator), value, binary_operator: pm_operator_token_id(parser, operator) }
            : { operator_loc: PM_LOCATION_TOKEN_VALUE(operator), value }),
    };
}

/**
 * Allocate and initialize a new ClassVariableAndWriteNode node.
 */
function pm_class_variable_and_write_node_create(parser, target, operator, value) {
    // assert(operator.type === PM_TOKEN_AMPERSAND_AMPERSAND_EQUAL);
    return pm_name_write_node_create(parser, PM_CLASS_VARIABLE_AND_WRITE_NODE, target.name, target.location, operator, value, false);
}

/**
 * Allocate and initialize a new ClassVariableOperatorWriteNode node.
 */
function pm_class_variable_operator_write_node_create(parser, target, operator, value) {
    return pm_name_write_node_create(parser, PM_CLASS_VARIABLE_OPERATOR_WRITE_NODE, target.name, target.location, operator, value, true);
}

/**
 * Allocate and initialize a new ClassVariableOrWriteNode node.
 */
function pm_class_variable_or_write_node_create(parser, target, operator, value) {
    // assert(operator.type === PM_TOKEN_PIPE_PIPE_EQUAL);
    return pm_name_write_node_create(parser, PM_CLASS_VARIABLE_OR_WRITE_NODE, target.name, target.location, operator, value, false);
}

/**
 * Allocate and initialize a new ClassVariableReadNode node.
 */
function pm_class_variable_read_node_create(parser, token) {
    // assert(token.type === PM_TOKEN_CLASS_VARIABLE);
    const node = {
        type: PM_CLASS_VARIABLE_READ_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(token)
        location: { start: token.start, end: token.end },
        name: pm_parser_constant_id_token(parser, token),
    };
    return node;
}

/**
 * True if the given node is an implicit array node on a write, as in:
 *
 *     a = *b
 *     a = 1, 2, 3
 */
function pm_implicit_array_write_flags(node, flags) {
    if (PM_NODE_TYPE_P(node, PM_ARRAY_NODE) && node.opening_loc.start === null) {
        return flags;
    }
    return 0;
}

/**
 * Initialize a new ClassVariableWriteNode node from a ClassVariableRead node.
 */
function pm_class_variable_write_node_create(parser, read_node, operator, value) {
    const flags = pm_implicit_array_write_flags(value, PM_WRITE_NODE_FLAGS_IMPLICIT_ARRAY);

    const node = {
        type: PM_CLASS_VARIABLE_WRITE_NODE,
        flags,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_NODES(read_node, value)
        location: { start: read_node.location.start, end: value.location.end },
        name: read_node.name,
        name_loc: PM_LOCATION_NODE_VALUE(read_node),
        value,
        operator_loc: PM_LOCATION_TOKEN_VALUE(operator),
    };
    return node;
}

/**
 * Shared node builder for the ConstantPath{And,Operator,Or}WriteNode family.
 * Same operator_loc vs. binary_operator_loc+value+binary_operator split as
 * pm_name_write_node_create, but keyed on a `target` field instead of a
 * name/name_loc pair.
 */
function pm_constant_path_and_or_operator_write_node_create(parser, node_type, target, operator, value, has_binary_operator) {
    return {
        type: node_type,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_NODES(target, value)
        location: { start: target.location.start, end: value.location.end },
        target,
        ...(has_binary_operator
            ? { binary_operator_loc: PM_LOCATION_TOKEN_VALUE(operator), value, binary_operator: pm_operator_token_id(parser, operator) }
            : { operator_loc: PM_LOCATION_TOKEN_VALUE(operator), value }),
    };
}

/**
 * Allocate and initialize a new ConstantPathAndWriteNode node.
 */
function pm_constant_path_and_write_node_create(parser, target, operator, value) {
    // assert(operator.type === PM_TOKEN_AMPERSAND_AMPERSAND_EQUAL);
    return pm_constant_path_and_or_operator_write_node_create(parser, PM_CONSTANT_PATH_AND_WRITE_NODE, target, operator, value, false);
}

/**
 * Allocate and initialize a new ConstantPathOperatorWriteNode node.
 */
function pm_constant_path_operator_write_node_create(parser, target, operator, value) {
    return pm_constant_path_and_or_operator_write_node_create(parser, PM_CONSTANT_PATH_OPERATOR_WRITE_NODE, target, operator, value, true);
}

/**
 * Allocate and initialize a new ConstantPathOrWriteNode node.
 */
function pm_constant_path_or_write_node_create(parser, target, operator, value) {
    // assert(operator.type === PM_TOKEN_PIPE_PIPE_EQUAL);
    return pm_constant_path_and_or_operator_write_node_create(parser, PM_CONSTANT_PATH_OR_WRITE_NODE, target, operator, value, false);
}

/**
 * Allocate and initialize a new ConstantPathNode node.
 */
function pm_constant_path_node_create(parser, parent, delimiter, name_token) {
    pm_assert_value_expression(parser, parent);

    let name = PM_CONSTANT_ID_UNSET;
    if (name_token.type === PM_TOKEN_CONSTANT) {
        name = pm_parser_constant_id_token(parser, name_token);
    }

    let node;
    if (parent === null) {
        node = {
            type: PM_CONSTANT_PATH_NODE,
            flags: 0,
            node_id: ++parser.node_id,
            // PM_NODE_INIT_TOKENS(delimiter, name_token)
            location: { start: delimiter.start, end: name_token.end },
            parent,
            name,
            delimiter_loc: PM_LOCATION_TOKEN_VALUE(delimiter),
            name_loc: PM_LOCATION_TOKEN_VALUE(name_token),
        };
    } else {
        node = {
            type: PM_CONSTANT_PATH_NODE,
            flags: 0,
            node_id: ++parser.node_id,
            // PM_NODE_INIT_NODE_TOKEN(parent, name_token)
            location: { start: parent.location.start, end: name_token.end },
            parent,
            name,
            delimiter_loc: PM_LOCATION_TOKEN_VALUE(delimiter),
            name_loc: PM_LOCATION_TOKEN_VALUE(name_token),
        };
    }

    return node;
}

/**
 * Allocate a new ConstantPathWriteNode node.
 */
function pm_constant_path_write_node_create(parser, target, operator, value) {
    const flags = pm_implicit_array_write_flags(value, PM_WRITE_NODE_FLAGS_IMPLICIT_ARRAY);

    const node = {
        type: PM_CONSTANT_PATH_WRITE_NODE,
        flags,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_NODES(target, value)
        location: { start: target.location.start, end: value.location.end },
        target,
        operator_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(operator),
        value,
    };
    return node;
}

/**
 * Allocate and initialize a new ConstantAndWriteNode node.
 */
function pm_constant_and_write_node_create(parser, target, operator, value) {
    // assert(operator.type === PM_TOKEN_AMPERSAND_AMPERSAND_EQUAL);
    return pm_name_write_node_create(parser, PM_CONSTANT_AND_WRITE_NODE, target.name, target.location, operator, value, false);
}

/**
 * Allocate and initialize a new ConstantOperatorWriteNode node.
 */
function pm_constant_operator_write_node_create(parser, target, operator, value) {
    return pm_name_write_node_create(parser, PM_CONSTANT_OPERATOR_WRITE_NODE, target.name, target.location, operator, value, true);
}

/**
 * Allocate and initialize a new ConstantOrWriteNode node.
 */
function pm_constant_or_write_node_create(parser, target, operator, value) {
    // assert(operator.type === PM_TOKEN_PIPE_PIPE_EQUAL);
    return pm_name_write_node_create(parser, PM_CONSTANT_OR_WRITE_NODE, target.name, target.location, operator, value, false);
}

/**
 * Allocate and initialize a new ConstantReadNode node.
 */
function pm_constant_read_node_create(parser, name) {
    // assert(name.type === PM_TOKEN_CONSTANT || name.type === PM_TOKEN_MISSING);
    const node = {
        type: PM_CONSTANT_READ_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(name)
        location: { start: name.start, end: name.end },
        name: pm_parser_constant_id_token(parser, name),
    };
    return node;
}

/**
 * Allocate a new ConstantWriteNode node.
 */
function pm_constant_write_node_create(parser, target, operator, value) {
    const flags = pm_implicit_array_write_flags(value, PM_WRITE_NODE_FLAGS_IMPLICIT_ARRAY);

    const node = {
        type: PM_CONSTANT_WRITE_NODE,
        flags,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_NODES(target, value)
        location: { start: target.location.start, end: value.location.end },
        name: target.name,
        name_loc: target.location,
        value,
        operator_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(operator),
    };
    return node;
}

/**
 * Check if the receiver of a `def` node is allowed.
 */
function pm_def_node_receiver_check(parser, node) {
    switch (node.type) {
        case PM_BEGIN_NODE: {
            if (node.statements !== null) pm_def_node_receiver_check(parser, node.statements);
            break;
        }
        case PM_PARENTHESES_NODE: {
            if (node.body !== null) pm_def_node_receiver_check(parser, node.body);
            break;
        }
        case PM_STATEMENTS_NODE: {
            pm_def_node_receiver_check(parser, node.body[node.body.length - 1]);
            break;
        }
        case PM_ARRAY_NODE:
        case PM_FLOAT_NODE:
        case PM_IMAGINARY_NODE:
        case PM_INTEGER_NODE:
        case PM_INTERPOLATED_REGULAR_EXPRESSION_NODE:
        case PM_INTERPOLATED_STRING_NODE:
        case PM_INTERPOLATED_SYMBOL_NODE:
        case PM_INTERPOLATED_X_STRING_NODE:
        case PM_RATIONAL_NODE:
        case PM_REGULAR_EXPRESSION_NODE:
        case PM_SOURCE_ENCODING_NODE:
        case PM_SOURCE_FILE_NODE:
        case PM_SOURCE_LINE_NODE:
        case PM_STRING_NODE:
        case PM_SYMBOL_NODE:
        case PM_X_STRING_NODE:
            pm_parser_err_node(parser, node, PM_ERR_SINGLETON_FOR_LITERALS);
            break;
        default:
            break;
    }
}

/**
 * Allocate and initialize a new DefNode node.
 */
function pm_def_node_create(
    parser,
    name,
    name_loc,
    receiver,
    parameters,
    body,
    locals,
    def_keyword,
    operator,
    lparen,
    rparen,
    equal,
    end_keyword
) {
    if (receiver !== null) {
        pm_def_node_receiver_check(parser, receiver);
    }

    const node = {
        type: PM_DEF_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        location: (
            (end_keyword.type === PM_TOKEN_NOT_PROVIDED)
            ? { start: def_keyword.start, end: body.location.end }
            : { start: def_keyword.start, end: end_keyword.end }
        ),
        name,
        name_loc: PM_LOCATION_TOKEN_VALUE(name_loc),
        receiver,
        parameters,
        body,
        locals: pm_constant_id_list_copy(locals),
        def_keyword_loc: PM_LOCATION_TOKEN_VALUE(def_keyword),
        operator_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(operator),
        lparen_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(lparen),
        rparen_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(rparen),
        equal_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(equal),
        end_keyword_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(end_keyword),
    };
    return node;
}

/**
 * Allocate a new DefinedNode node.
 */
function pm_defined_node_create(parser, lparen, value, rparen, keyword) {
    const node = {
        type: PM_DEFINED_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        location: (
            (rparen.type === PM_TOKEN_NOT_PROVIDED)
            ? { start: keyword.start, end: value.location.end }
            : { start: keyword.start, end: rparen.end }
        ),
        lparen_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(lparen),
        value,
        rparen_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(rparen),
        keyword_loc: PM_LOCATION_TOKEN_VALUE(keyword),
    };
    return node;
}

/**
 * Allocate and initialize a new ElseNode node.
 */
function pm_else_node_create(parser, else_keyword, statements, end_keyword) {
    const node = {
        type: PM_ELSE_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        location: (
            ((end_keyword.type === PM_TOKEN_NOT_PROVIDED) && (statements !== null))
            ? { start: else_keyword.start, end: statements.location.end }
            : { start: else_keyword.start, end: end_keyword.end }
        ),
        else_keyword_loc: PM_LOCATION_TOKEN_VALUE(else_keyword),
        statements,
        end_keyword_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(end_keyword),
    };
    return node;
}

/**
 * Allocate and initialize a new EmbeddedStatementsNode node.
 */
function pm_embedded_statements_node_create(parser, opening, statements, closing) {
    const node = {
        type: PM_EMBEDDED_STATEMENTS_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKENS(opening, closing)
        location: { start: opening.start, end: closing.end },
        opening_loc: PM_LOCATION_TOKEN_VALUE(opening),
        statements,
        closing_loc: PM_LOCATION_TOKEN_VALUE(closing),
    };
    return node;
}

/**
 * Allocate and initialize a new EmbeddedVariableNode node.
 */
function pm_embedded_variable_node_create(parser, operator, variable) {
    const node = {
        type: PM_EMBEDDED_VARIABLE_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN_NODE(operator, variable)
        location: { start: operator.start, end: variable.location.end },
        operator_loc: PM_LOCATION_TOKEN_VALUE(operator),
        variable,
    };
    return node;
}

/**
 * Allocate a new EnsureNode node.
 */
function pm_ensure_node_create(parser, ensure_keyword, statements, end_keyword) {
    const node = {
        type: PM_ENSURE_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKENS(ensure_keyword, end_keyword)
        location: { start: ensure_keyword.start, end: end_keyword.end },
        ensure_keyword_loc: PM_LOCATION_TOKEN_VALUE(ensure_keyword),
        statements,
        end_keyword_loc: PM_LOCATION_TOKEN_VALUE(end_keyword),
    };
    return node;
}

/**
 * Allocate and initialize a new FalseNode node.
 */
function pm_false_node_create(parser, token) {
    // assert(token.type === PM_TOKEN_KEYWORD_FALSE);
    const node = {
        type: PM_FALSE_NODE,
        flags: PM_NODE_FLAG_STATIC_LITERAL,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(token)
        location: { start: token.start, end: token.end },
    };
    return node;
}

/**
 * Allocate and initialize a new find pattern node. The node list given in the
 * nodes parameter is guaranteed to have at least two nodes.
 */
function pm_find_pattern_node_create(parser, nodes) {
    const left = nodes[0];
    // assert(PM_NODE_TYPE_P(left, PM_SPLAT_NODE));
    const left_splat_node = left;

    let right;

    if (nodes.length === 1) {
        right = pm_missing_node_create(parser, left.location.end, left.location.end);
    } else {
        right = nodes[nodes.length - 1];
        // assert(PM_NODE_TYPE_P(right, PM_SPLAT_NODE));
    }

    // PRISM_SERIALIZE_ONLY_SEMANTICS_FIELDS is 0 in this port, so the potential
    // MissingNode is kept as-is on .right.
    const right_splat_node = right;

    const node = {
        type: PM_FIND_PATTERN_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_NODES(left, right)
        location: { start: left.location.start, end: right.location.end },
        constant: null,
        left: left_splat_node,
        requireds: [],
        right: right_splat_node,
        opening_loc: PM_LOCATION_UNSET,
        closing_loc: PM_LOCATION_UNSET,
    };

    // For now we're going to just copy over each pointer manually. This could be
    // much more efficient, as we could instead resize the node list to only point
    // to 1...-1.
    for (let index = 1; index < nodes.length - 1; index++) {
        pm_node_list_append(node.requireds, nodes[index]);
    }

    return node;
}

/**
 * Parse the value of a double, add appropriate errors if there is an issue, and
 * return the value that should be saved on the PM_FLOAT_NODE node.
 *
 * Adaptation: C calls strtod, which is correctly rounded; Number() over the
 * same normalized decimal text is correctly rounded as well, so the produced
 * doubles are identical. Overflow yields Infinity where C yielded HUGE_VAL
 * with errno == ERANGE; underflow yields the same denormal/zero silently.
 */
function pm_double_parse(parser, token) {
    const diff = token.end - token.start;
    if (diff <= 0) return 0.0;

    // First, get the content, dropping underscores along the way.
    // (C normalizes a non-'.' locale decimal point here first; JS number
    // parsing always expects '.', so that step cannot trigger.)
    const text = parser.source.slice(token.start, token.end).replace(/_/g, "");
    const length = text.length;

    // Now, parse the value (strtod in C). Note that CRuby has their own
    // version of strtod which avoids locales. We're okay using the locale-aware
    // version because we've already validated through the parser that the token
    // is in a valid format.
    const value = Number(text);

    // This should never happen, because we've already checked that the token
    // is in a valid format. However it's good to be safe. (C checks that strtod
    // consumed the entire buffer and that errno was neither set nor ERANGE;
    // NaN covers both failure modes here.)
    if (Number.isNaN(value)) {
        PM_PARSER_ERR_TOKEN_FORMAT_CONTENT(parser, token, PM_ERR_FLOAT_PARSE);
        return 0.0;
    }

    // If errno is set, then it should only be ERANGE. At this point we need to
    // check if it's infinity (it should be).
    if (!Number.isFinite(value)) {
        let warn_width;
        let ellipsis;

        if (length > 20) {
            warn_width = 20;
            ellipsis = "...";
        } else {
            warn_width = length;
            ellipsis = "";
        }

        PM_PARSER_WARN_FORMAT(
            parser,
            token.start,
            token.end,
            PM_WARN_FLOAT_OUT_OF_RANGE,
            warn_width,
            parser.source.slice(token.start, token.start + warn_width),
            ellipsis
        );

        return value < 0 ? -Infinity : Infinity;
    }

    return value;
}

/**
 * Allocate and initialize a new FloatNode node.
 */
function pm_float_node_create(parser, token) {
    // assert(token.type === PM_TOKEN_FLOAT);
    const node = {
        type: PM_FLOAT_NODE,
        flags: PM_NODE_FLAG_STATIC_LITERAL,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(token)
        location: { start: token.start, end: token.end },
        value: pm_double_parse(parser, token),
    };
    return node;
}

/**
 * Allocate and initialize a new FloatNode node from a FLOAT_IMAGINARY token.
 */
function pm_float_node_imaginary_create(parser, token) {
    // assert(token.type === PM_TOKEN_FLOAT_IMAGINARY);

    const node = {
        type: PM_IMAGINARY_NODE,
        flags: PM_NODE_FLAG_STATIC_LITERAL,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(token)
        location: { start: token.start, end: token.end },
        numeric: pm_float_node_create(parser, { type: PM_TOKEN_FLOAT, start: token.start, end: token.end - 1 }),
    };
    return node;
}

/**
 * Allocate and initialize a new RationalNode node from a FLOAT_RATIONAL token.
 */
function pm_float_node_rational_create(parser, token) {
    // assert(token.type === PM_TOKEN_FLOAT_RATIONAL);

    const node = {
        type: PM_RATIONAL_NODE,
        flags: PM_INTEGER_BASE_FLAGS_DECIMAL | PM_NODE_FLAG_STATIC_LITERAL,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(token)
        location: { start: token.start, end: token.end },
        numerator: 0n,
        denominator: 0n,
    };

    let start = token.start;
    let end = token.end - 1; // r

    while (start < end && parser.source[start] === '0') start++; // 0.1 -> .1
    while (end > start && parser.source[end - 1] === '0') end--; // 1.0 -> 1.

    const length = end - start;
    if (length === 1) {
        node.denominator = 1n;
        return node;
    }

    // point = memchr(start, '.', length)
    const point = parser.source.indexOf(".", start);
    // assert(point !== -1 && "should have a decimal point");

    const numerator_text = parser.source.slice(start, point) + parser.source.slice(point + 1, end);
    node.numerator = pm_integer_parse(PM_INTEGER_BASE_DEFAULT, numerator_text, 0, length - 1);

    const fract_length = end - point - (parser.source.slice(point, end).match(/_/g) || []).length;
    const denominator_text = "1" + "0".repeat(Math.max(0, fract_length - 1));
    node.denominator = pm_integer_parse(PM_INTEGER_BASE_DEFAULT, denominator_text, 0, fract_length);

    [node.numerator, node.denominator] = pm_integers_reduce(node.numerator, node.denominator);
    return node;
}

/**
 * Allocate and initialize a new FloatNode node from a FLOAT_RATIONAL_IMAGINARY
 * token.
 */
function pm_float_node_rational_imaginary_create(parser, token) {
    // assert(token.type === PM_TOKEN_FLOAT_RATIONAL_IMAGINARY);

    const node = {
        type: PM_IMAGINARY_NODE,
        flags: PM_NODE_FLAG_STATIC_LITERAL,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(token)
        location: { start: token.start, end: token.end },
        numeric: pm_float_node_rational_create(parser, { type: PM_TOKEN_FLOAT_RATIONAL, start: token.start, end: token.end - 1 }),
    };
    return node;
}

/**
 * Allocate and initialize a new ForNode node.
 */
function pm_for_node_create(
    parser,
    index,
    collection,
    statements,
    for_keyword,
    in_keyword,
    do_keyword,
    end_keyword
) {
    const node = {
        type: PM_FOR_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKENS(for_keyword, end_keyword)
        location: { start: for_keyword.start, end: end_keyword.end },
        index,
        collection,
        statements,
        for_keyword_loc: PM_LOCATION_TOKEN_VALUE(for_keyword),
        in_keyword_loc: PM_LOCATION_TOKEN_VALUE(in_keyword),
        do_keyword_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(do_keyword),
        end_keyword_loc: PM_LOCATION_TOKEN_VALUE(end_keyword),
    };
    return node;
}

/**
 * Allocate and initialize a new ForwardingArgumentsNode node.
 */
function pm_forwarding_arguments_node_create(parser, token) {
    // assert(token.type === PM_TOKEN_UDOT_DOT_DOT);
    const node = {
        type: PM_FORWARDING_ARGUMENTS_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(token)
        location: { start: token.start, end: token.end },
    };
    return node;
}

/**
 * Allocate and initialize a new ForwardingParameterNode node.
 */
function pm_forwarding_parameter_node_create(parser, token) {
    // assert(token.type === PM_TOKEN_UDOT_DOT_DOT);
    const node = {
        type: PM_FORWARDING_PARAMETER_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(token)
        location: { start: token.start, end: token.end },
    };
    return node;
}

/**
 * Allocate and initialize a new ForwardingSuper node.
 */
function pm_forwarding_super_node_create(parser, token, arguments_) {
    // assert(arguments_.block === null || PM_NODE_TYPE_P(arguments_.block, PM_BLOCK_NODE));
    // assert(token.type === PM_TOKEN_KEYWORD_SUPER);

    let block = null;
    if (arguments_.block !== null) {
        block = arguments_.block;
    }

    const node = {
        type: PM_FORWARDING_SUPER_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        location: (
            (block === null)
            ? { start: token.start, end: token.end }
            : { start: token.start, end: block.location.end }
        ),
        block,
    };
    return node;
}

/**
 * Allocate and initialize a new hash pattern node from an opening and closing
 * token.
 */
function pm_hash_pattern_node_empty_create(parser, opening, closing) {
    const node = {
        type: PM_HASH_PATTERN_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKENS(opening, closing)
        location: { start: opening.start, end: closing.end },
        constant: null,
        elements: [],
        rest: null,
        opening_loc: PM_LOCATION_TOKEN_VALUE(opening),
        closing_loc: PM_LOCATION_TOKEN_VALUE(closing),
    };
    return node;
}

/**
 * Allocate and initialize a new hash pattern node.
 */
function pm_hash_pattern_node_node_list_create(parser, elements, rest) {
    let start;
    let end;

    if (elements.length > 0) {
        if (rest) {
            start = Math.min(rest.location.start, elements[0].location.start);
            end = Math.max(rest.location.end, elements[elements.length - 1].location.end);
        } else {
            start = elements[0].location.start;
            end = elements[elements.length - 1].location.end;
        }
    } else {
        // assert(rest !== null);
        start = rest.location.start;
        end = rest.location.end;
    }

    const node = {
        type: PM_HASH_PATTERN_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT(start, end)
        location: { start, end },
        constant: null,
        elements: [],
        rest,
        opening_loc: PM_LOCATION_UNSET,
        closing_loc: PM_LOCATION_UNSET,
    };

    pm_node_list_concat(node.elements, elements);
    return node;
}

/**
 * Retrieve the name from a node that will become a global variable write node.
 */
function pm_global_variable_write_name(parser, target) {
    switch (target.type) {
        case PM_GLOBAL_VARIABLE_READ_NODE:
            return target.name;
        case PM_BACK_REFERENCE_READ_NODE:
            return target.name;
        case PM_NUMBERED_REFERENCE_READ_NODE:
            // This will only ever happen in the event of a syntax error, but we
            // still need to provide something for the node.
            return pm_parser_constant_id_location(parser, target.location.start, target.location.end);
        default:
            // assert(false && "unreachable");
            return -1;
    }
}

/**
 * Allocate and initialize a new GlobalVariableAndWriteNode node.
 */
function pm_global_variable_and_write_node_create(parser, target, operator, value) {
    // assert(operator.type === PM_TOKEN_AMPERSAND_AMPERSAND_EQUAL);
    return pm_name_write_node_create(parser, PM_GLOBAL_VARIABLE_AND_WRITE_NODE, pm_global_variable_write_name(parser, target), target.location, operator, value, false);
}

/**
 * Allocate and initialize a new GlobalVariableOperatorWriteNode node.
 */
function pm_global_variable_operator_write_node_create(parser, target, operator, value) {
    return pm_name_write_node_create(parser, PM_GLOBAL_VARIABLE_OPERATOR_WRITE_NODE, pm_global_variable_write_name(parser, target), target.location, operator, value, true);
}

/**
 * Allocate and initialize a new GlobalVariableOrWriteNode node.
 */
function pm_global_variable_or_write_node_create(parser, target, operator, value) {
    // assert(operator.type === PM_TOKEN_PIPE_PIPE_EQUAL);
    return pm_name_write_node_create(parser, PM_GLOBAL_VARIABLE_OR_WRITE_NODE, pm_global_variable_write_name(parser, target), target.location, operator, value, false);
}

/**
 * Allocate a new GlobalVariableReadNode node.
 */
function pm_global_variable_read_node_create(parser, name) {
    const node = {
        type: PM_GLOBAL_VARIABLE_READ_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(name)
        location: { start: name.start, end: name.end },
        name: pm_parser_constant_id_token(parser, name),
    };
    return node;
}

/**
 * Allocate and initialize a new synthesized GlobalVariableReadNode node.
 */
function pm_global_variable_read_node_synthesized_create(parser, name) {
    const node = {
        type: PM_GLOBAL_VARIABLE_READ_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_BASE
        location: { start: parser.start, end: parser.start },
        name,
    };
    return node;
}

/**
 * Allocate and initialize a new GlobalVariableWriteNode node.
 */
function pm_global_variable_write_node_create(parser, target, operator, value) {
    const flags = pm_implicit_array_write_flags(value, PM_WRITE_NODE_FLAGS_IMPLICIT_ARRAY);

    const node = {
        type: PM_GLOBAL_VARIABLE_WRITE_NODE,
        flags,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_NODES(target, value)
        location: { start: target.location.start, end: value.location.end },
        name: pm_global_variable_write_name(parser, target),
        name_loc: PM_LOCATION_NODE_VALUE(target),
        value,
        operator_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(operator),
    };
    return node;
}

/**
 * Allocate and initialize a new synthesized GlobalVariableWriteNode node.
 */
function pm_global_variable_write_node_synthesized_create(parser, name, value) {
    const node = {
        type: PM_GLOBAL_VARIABLE_WRITE_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_BASE
        location: { start: parser.start, end: parser.start },
        name,
        name_loc: PM_LOCATION_NULL_VALUE(parser),
        value,
        operator_loc: PM_LOCATION_NULL_VALUE(parser),
    };
    return node;
}

/**
 * Allocate a new HashNode node.
 */
function pm_hash_node_create(parser, opening) {
    // assert(opening !== null);
    const node = {
        type: PM_HASH_NODE,
        flags: PM_NODE_FLAG_STATIC_LITERAL,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(opening)
        location: { start: opening.start, end: opening.end },
        opening_loc: PM_LOCATION_TOKEN_VALUE(opening),
        elements: [],
        closing_loc: PM_LOCATION_NULL_VALUE(parser),
    };
    return node;
}

/**
 * Append a new element to a hash node.
 */
function pm_hash_node_elements_append(hash, element) {
    pm_node_list_append(hash.elements, element);

    let static_literal = PM_NODE_TYPE_P(element, PM_ASSOC_NODE);
    if (static_literal) {
        const assoc = element;
        static_literal = !PM_NODE_TYPE_P(assoc.key, PM_ARRAY_NODE) && !PM_NODE_TYPE_P(assoc.key, PM_HASH_NODE) && !PM_NODE_TYPE_P(assoc.key, PM_RANGE_NODE);
        static_literal = static_literal && PM_NODE_FLAG_P(assoc.key, PM_NODE_FLAG_STATIC_LITERAL);
        static_literal = static_literal && PM_NODE_FLAG_P(assoc, PM_NODE_FLAG_STATIC_LITERAL);
    }

    if (!static_literal) {
        pm_node_flag_unset(hash, PM_NODE_FLAG_STATIC_LITERAL);
    }
}

function pm_hash_node_closing_loc_set(hash, token) {
    hash.location.end = token.end;
    hash.closing_loc = PM_LOCATION_TOKEN_VALUE(token);
}

/**
 * Allocate a new IfNode node.
 */
function pm_if_node_create(
    parser,
    if_keyword,
    predicate,
    then_keyword,
    statements,
    subsequent,
    end_keyword
) {
    pm_conditional_predicate(parser, predicate, PM_CONDITIONAL_PREDICATE_TYPE_CONDITIONAL);

    let end;
    if (end_keyword.type !== PM_TOKEN_NOT_PROVIDED) {
        end = end_keyword.end;
    } else if (subsequent !== null) {
        end = subsequent.location.end;
    } else if (pm_statements_node_body_length(statements) !== 0) {
        end = statements.location.end;
    } else {
        end = predicate.location.end;
    }

    const node = {
        type: PM_IF_NODE,
        flags: PM_NODE_FLAG_NEWLINE,
        node_id: ++parser.node_id,
        // PM_NODE_INIT(if_keyword.start, end)
        location: { start: if_keyword.start, end },
        if_keyword_loc: PM_LOCATION_TOKEN_VALUE(if_keyword),
        predicate,
        then_keyword_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(then_keyword),
        statements,
        subsequent,
        end_keyword_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(end_keyword),
    };
    return node;
}

/**
 * Allocate and initialize new IfNode node in the modifier form.
 */
function pm_if_node_modifier_create(parser, statement, if_keyword, predicate) {
    pm_conditional_predicate(parser, predicate, PM_CONDITIONAL_PREDICATE_TYPE_CONDITIONAL);

    const statements = pm_statements_node_create(parser);
    pm_statements_node_body_append(parser, statements, statement, true);

    const node = {
        type: PM_IF_NODE,
        flags: PM_NODE_FLAG_NEWLINE,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_NODES(statement, predicate)
        location: { start: statement.location.start, end: predicate.location.end },
        if_keyword_loc: PM_LOCATION_TOKEN_VALUE(if_keyword),
        predicate,
        then_keyword_loc: PM_LOCATION_UNSET,
        statements,
        subsequent: null,
        end_keyword_loc: PM_LOCATION_UNSET,
    };
    return node;
}

/**
 * Allocate and initialize an if node from a ternary expression.
 */
function pm_if_node_ternary_create(parser, predicate, qmark, true_expression, colon, false_expression) {
    pm_assert_value_expression(parser, predicate);
    pm_conditional_predicate(parser, predicate, PM_CONDITIONAL_PREDICATE_TYPE_CONDITIONAL);

    const if_statements = pm_statements_node_create(parser);
    pm_statements_node_body_append(parser, if_statements, true_expression, true);

    const else_statements = pm_statements_node_create(parser);
    pm_statements_node_body_append(parser, else_statements, false_expression, true);

    const end_keyword = not_provided(parser);
    const else_node = pm_else_node_create(parser, colon, else_statements, end_keyword);

    const node = {
        type: PM_IF_NODE,
        flags: PM_NODE_FLAG_NEWLINE,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_NODES(predicate, false_expression)
        location: { start: predicate.location.start, end: false_expression.location.end },
        if_keyword_loc: PM_LOCATION_UNSET,
        predicate,
        then_keyword_loc: PM_LOCATION_TOKEN_VALUE(qmark),
        statements: if_statements,
        subsequent: else_node,
        end_keyword_loc: PM_LOCATION_UNSET,
    };
    return node;
}

function pm_if_node_end_keyword_loc_set(node, keyword) {
    node.location.end = keyword.end;
    node.end_keyword_loc = PM_LOCATION_TOKEN_VALUE(keyword);
}

function pm_else_node_end_keyword_loc_set(node, keyword) {
    node.location.end = keyword.end;
    node.end_keyword_loc = PM_LOCATION_TOKEN_VALUE(keyword);
}

/**
 * Allocate and initialize a new ImplicitNode node.
 */
function pm_implicit_node_create(parser, value) {
    const node = {
        type: PM_IMPLICIT_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_NODE(value)
        location: { start: value.location.start, end: value.location.end },
        value,
    };
    return node;
}

/**
 * Allocate and initialize a new ImplicitRestNode node.
 */
function pm_implicit_rest_node_create(parser, token) {
    // assert(token.type === PM_TOKEN_COMMA);

    const node = {
        type: PM_IMPLICIT_REST_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(token)
        location: { start: token.start, end: token.end },
    };
    return node;
}

/**
 * The lexer records an integer's base as a node flag; the integer parser wants
 * its own base enum. Shared by the integer and rational node creators. Any
 * other value (including the 0 that a parser starts with) means decimal, as in
 * C's `default: break`.
 */
const INTEGER_BASE_BY_FLAG = {
    [PM_INTEGER_BASE_FLAGS_BINARY]: PM_INTEGER_BASE_BINARY,
    [PM_INTEGER_BASE_FLAGS_OCTAL]: PM_INTEGER_BASE_OCTAL,
    [PM_INTEGER_BASE_FLAGS_DECIMAL]: PM_INTEGER_BASE_DECIMAL,
    [PM_INTEGER_BASE_FLAGS_HEXADECIMAL]: PM_INTEGER_BASE_HEXADECIMAL,
};

/**
 * Allocate and initialize a new IntegerNode node.
 */
function pm_integer_node_create(parser, base, token) {
    // assert(token.type === PM_TOKEN_INTEGER);
    const node = {
        type: PM_INTEGER_NODE,
        flags: base | PM_NODE_FLAG_STATIC_LITERAL,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(token)
        location: { start: token.start, end: token.end },
        value: 0n,
    };

    node.value = pm_integer_parse(INTEGER_BASE_BY_FLAG[base] ?? PM_INTEGER_BASE_DECIMAL, parser.source, token.start, token.end);
    return node;
}

/**
 * Allocate and initialize a new IntegerNode node from an INTEGER_IMAGINARY
 * token.
 */
function pm_integer_node_imaginary_create(parser, base, token) {
    // assert(token.type === PM_TOKEN_INTEGER_IMAGINARY);

    const node = {
        type: PM_IMAGINARY_NODE,
        flags: PM_NODE_FLAG_STATIC_LITERAL,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(token)
        location: { start: token.start, end: token.end },
        numeric: pm_integer_node_create(parser, base, { type: PM_TOKEN_INTEGER, start: token.start, end: token.end - 1 }),
    };
    return node;
}

/**
 * Allocate and initialize a new RationalNode node from an INTEGER_RATIONAL
 * token.
 */
function pm_integer_node_rational_create(parser, base, token) {
    // assert(token.type === PM_TOKEN_INTEGER_RATIONAL);

    const node = {
        type: PM_RATIONAL_NODE,
        flags: base | PM_NODE_FLAG_STATIC_LITERAL,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(token)
        location: { start: token.start, end: token.end },
        numerator: 0n,
        denominator: 1n,
    };

    node.numerator = pm_integer_parse(INTEGER_BASE_BY_FLAG[base] ?? PM_INTEGER_BASE_DECIMAL, parser.source, token.start, token.end - 1);

    return node;
}

/**
 * Allocate and initialize a new IntegerNode node from an
 * INTEGER_RATIONAL_IMAGINARY token.
 */
function pm_integer_node_rational_imaginary_create(parser, base, token) {
    // assert(token.type === PM_TOKEN_INTEGER_RATIONAL_IMAGINARY);

    const node = {
        type: PM_IMAGINARY_NODE,
        flags: PM_NODE_FLAG_STATIC_LITERAL,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(token)
        location: { start: token.start, end: token.end },
        numeric: pm_integer_node_rational_create(parser, base, { type: PM_TOKEN_INTEGER_RATIONAL, start: token.start, end: token.end - 1 }),
    };
    return node;
}

/**
 * Allocate and initialize a new InNode node.
 */
function pm_in_node_create(parser, pattern, statements, in_keyword, then_keyword) {
    let end;
    if (statements !== null) {
        end = statements.location.end;
    } else if (then_keyword.type !== PM_TOKEN_NOT_PROVIDED) {
        end = then_keyword.end;
    } else {
        end = pattern.location.end;
    }

    const node = {
        type: PM_IN_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT(in_keyword.start, end)
        location: { start: in_keyword.start, end },
        pattern,
        statements,
        in_loc: PM_LOCATION_TOKEN_VALUE(in_keyword),
        then_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(then_keyword),
    };
    return node;
}

/**
 * Allocate and initialize a new InstanceVariableAndWriteNode node.
 */
function pm_instance_variable_and_write_node_create(parser, target, operator, value) {
    // assert(operator.type === PM_TOKEN_AMPERSAND_AMPERSAND_EQUAL);
    return pm_name_write_node_create(parser, PM_INSTANCE_VARIABLE_AND_WRITE_NODE, target.name, target.location, operator, value, false);
}

/**
 * Allocate and initialize a new InstanceVariableOperatorWriteNode node.
 */
function pm_instance_variable_operator_write_node_create(parser, target, operator, value) {
    return pm_name_write_node_create(parser, PM_INSTANCE_VARIABLE_OPERATOR_WRITE_NODE, target.name, target.location, operator, value, true);
}

/**
 * Allocate and initialize a new InstanceVariableOrWriteNode node.
 */
function pm_instance_variable_or_write_node_create(parser, target, operator, value) {
    // assert(operator.type === PM_TOKEN_PIPE_PIPE_EQUAL);
    return pm_name_write_node_create(parser, PM_INSTANCE_VARIABLE_OR_WRITE_NODE, target.name, target.location, operator, value, false);
}

/**
 * Allocate and initialize a new InstanceVariableReadNode node.
 */
function pm_instance_variable_read_node_create(parser, token) {
    // assert(token.type === PM_TOKEN_INSTANCE_VARIABLE);
    const node = {
        type: PM_INSTANCE_VARIABLE_READ_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(token)
        location: { start: token.start, end: token.end },
        name: pm_parser_constant_id_token(parser, token),
    };
    return node;
}

/**
 * Initialize a new InstanceVariableWriteNode node from an InstanceVariableRead
 * node.
 */
function pm_instance_variable_write_node_create(parser, read_node, operator, value) {
    const flags = pm_implicit_array_write_flags(value, PM_WRITE_NODE_FLAGS_IMPLICIT_ARRAY);

    const node = {
        type: PM_INSTANCE_VARIABLE_WRITE_NODE,
        flags,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_NODES(read_node, value)
        location: { start: read_node.location.start, end: value.location.end },
        name: read_node.name,
        name_loc: PM_LOCATION_NODE_VALUE(read_node),
        value,
        operator_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(operator),
    };
    return node;
}

/**
 * Append a part into a list of string parts. Importantly this handles nested
 * interpolated strings by not necessarily removing the marker for static
 * literals.
 */
function pm_interpolated_node_append(node, parts, part) {
    switch (part.type) {
        case PM_STRING_NODE:
            pm_node_flag_set(part, PM_NODE_FLAG_STATIC_LITERAL | PM_STRING_FLAGS_FROZEN);
            break;
        case PM_EMBEDDED_STATEMENTS_NODE: {
            const embedded = (part.statements !== null && part.statements.body.length === 1) ? part.statements.body[0] : null;

            if (embedded === null) {
                // If there are no statements or more than one statement, then
                // we lose the static literal flag.
                pm_node_flag_unset(node, PM_NODE_FLAG_STATIC_LITERAL);
            } else if (PM_NODE_TYPE_P(embedded, PM_STRING_NODE)) {
                // If the embedded statement is a string, then we can keep the
                // static literal flag and mark the string as frozen.
                pm_node_flag_set(embedded, PM_NODE_FLAG_STATIC_LITERAL | PM_STRING_FLAGS_FROZEN);
            } else if (PM_NODE_TYPE_P(embedded, PM_INTERPOLATED_STRING_NODE) && PM_NODE_FLAG_P(embedded, PM_NODE_FLAG_STATIC_LITERAL)) {
                // If the embedded statement is an interpolated string and it's
                // a static literal, then we can keep the static literal flag.
            } else {
                // Otherwise we lose the static literal flag.
                pm_node_flag_unset(node, PM_NODE_FLAG_STATIC_LITERAL);
            }

            break;
        }
        case PM_EMBEDDED_VARIABLE_NODE:
            pm_node_flag_unset(node, PM_NODE_FLAG_STATIC_LITERAL);
            break;
        default:
            break; // assert(false && "unexpected node type");
    }

    pm_node_list_append(parts, part);
}

/**
 * Allocate a new InterpolatedRegularExpressionNode node.
 */
function pm_interpolated_regular_expression_node_create(parser, opening) {
    const node = {
        type: PM_INTERPOLATED_REGULAR_EXPRESSION_NODE,
        flags: PM_NODE_FLAG_STATIC_LITERAL,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(opening)
        location: { start: opening.start, end: opening.end },
        opening_loc: PM_LOCATION_TOKEN_VALUE(opening),
        parts: [],
        closing_loc: PM_LOCATION_TOKEN_VALUE(opening),
    };
    return node;
}

function pm_interpolated_regular_expression_node_append(node, part) {
    if (node.location.start > part.location.start) {
        node.location.start = part.location.start;
    }
    if (node.location.end < part.location.end) {
        node.location.end = part.location.end;
    }

    pm_interpolated_node_append(node, node.parts, part);
}

function pm_interpolated_regular_expression_node_closing_set(parser, node, closing) {
    node.closing_loc = PM_LOCATION_TOKEN_VALUE(closing);
    node.location.end = closing.end;
    pm_node_flag_set(node, pm_regular_expression_flags_create(parser, closing));
}

/**
 * Append a part to an InterpolatedStringNode node.
 *
 * This has some somewhat complicated semantics, because we need to update
 * multiple flags that have somewhat confusing interactions.
 *
 * PM_NODE_FLAG_STATIC_LITERAL indicates that the node should be treated as a
 * single static literal string that can be pushed onto the stack on its own.
 * Note that this doesn't necessarily mean that the string will be frozen or
 * not; the instructions in CRuby will be either putobject or putstring,
 * depending on the combination of `--enable-frozen-string-literal`,
 * `# frozen_string_literal: true`, and whether or not there is interpolation.
 *
 * PM_INTERPOLATED_STRING_NODE_FLAGS_FROZEN indicates that the string should be
 * explicitly frozen. This will only happen if the string is comprised entirely
 * of string parts that are themselves static literals and frozen.
 *
 * PM_INTERPOLATED_STRING_NODE_FLAGS_MUTABLE indicates that the string should
 * be explicitly marked as mutable. This will happen from
 * `--disable-frozen-string-literal` or `# frozen_string_literal: false`. This
 * is necessary to indicate that the string should be left up to the runtime,
 * which could potentially use a chilled string otherwise.
 */
// #define CLEAR_FLAGS(node) ...
function pm_interpolated_string_node_append_clear_flags(node) {
    node.flags &= ~(PM_NODE_FLAG_STATIC_LITERAL | PM_INTERPOLATED_STRING_NODE_FLAGS_FROZEN | PM_INTERPOLATED_STRING_NODE_FLAGS_MUTABLE);
}

// #define MUTABLE_FLAGS(node) ...
function pm_interpolated_string_node_append_mutable_flags(node) {
    node.flags = (node.flags | PM_INTERPOLATED_STRING_NODE_FLAGS_MUTABLE) & ~PM_INTERPOLATED_STRING_NODE_FLAGS_FROZEN;
}

function pm_interpolated_string_node_append(node, part) {
    if (node.parts.length === 0 && node.opening_loc.start === null) {
        node.location.start = part.location.start;
    }

    node.location.end = Math.max(node.location.end, part.location.end);

    switch (part.type) {
        case PM_STRING_NODE:
            // If inner string is not frozen, it stops being a static literal. We should *not* clear other flags,
            // because concatenating two frozen strings (`'foo' 'bar'`) is still frozen. This holds true for
            // as long as this interpolation only consists of other string literals.
            if (!PM_NODE_FLAG_P(part, PM_STRING_FLAGS_FROZEN)) {
                pm_node_flag_unset(node, PM_NODE_FLAG_STATIC_LITERAL);
            }
            part.flags = (part.flags | PM_NODE_FLAG_STATIC_LITERAL | PM_STRING_FLAGS_FROZEN) & ~PM_STRING_FLAGS_MUTABLE;
            break;
        case PM_INTERPOLATED_STRING_NODE:
            if (PM_NODE_FLAG_P(part, PM_NODE_FLAG_STATIC_LITERAL)) {
                // If the string that we're concatenating is a static literal,
                // then we can keep the static literal flag for this string.
            } else {
                // Otherwise, we lose the static literal flag here and we should
                // also clear the mutability flags.
                pm_interpolated_string_node_append_clear_flags(node);
            }
            break;
        case PM_EMBEDDED_STATEMENTS_NODE: {
            const embedded = (part.statements !== null && part.statements.body.length === 1) ? part.statements.body[0] : null;

            if (embedded === null) {
                // If we're embedding multiple statements or no statements, then
                // the string is not longer a static literal.
                pm_interpolated_string_node_append_clear_flags(node);
            } else if (PM_NODE_TYPE_P(embedded, PM_STRING_NODE)) {
                // If the embedded statement is a string, then we can make that
                // string as frozen and static literal, and not touch the static
                // literal status of this string.
                embedded.flags = (embedded.flags | PM_NODE_FLAG_STATIC_LITERAL | PM_STRING_FLAGS_FROZEN) & ~PM_STRING_FLAGS_MUTABLE;

                if (PM_NODE_FLAG_P(node, PM_NODE_FLAG_STATIC_LITERAL)) {
                    pm_interpolated_string_node_append_mutable_flags(node);
                }
            } else if (PM_NODE_TYPE_P(embedded, PM_INTERPOLATED_STRING_NODE) && PM_NODE_FLAG_P(embedded, PM_NODE_FLAG_STATIC_LITERAL)) {
                // If the embedded statement is an interpolated string, but that
                // string is marked as static literal, then we can keep our
                // static literal status for this string.
                if (PM_NODE_FLAG_P(node, PM_NODE_FLAG_STATIC_LITERAL)) {
                    pm_interpolated_string_node_append_mutable_flags(node);
                }
            } else {
                // In all other cases, we lose the static literal flag here and
                // become mutable.
                pm_interpolated_string_node_append_clear_flags(node);
            }

            break;
        }
        case PM_EMBEDDED_VARIABLE_NODE:
            // Embedded variables clear static literal, which means we also
            // should clear the mutability flags.
            pm_interpolated_string_node_append_clear_flags(node);
            break;
        case PM_X_STRING_NODE:
        case PM_INTERPOLATED_X_STRING_NODE:
        case PM_SYMBOL_NODE:
        case PM_INTERPOLATED_SYMBOL_NODE:
            // These will only happen in error cases. But we want to handle it
            // here so that we don't fail the assertion.
            pm_interpolated_string_node_append_clear_flags(node);
            break;
        default:
            break; // assert(false && "unexpected node type");
    }

    pm_node_list_append(node.parts, part);
}

/**
 * Allocate and initialize a new InterpolatedStringNode node.
 */
function pm_interpolated_string_node_create(parser, opening, parts, closing) {
    let flags = PM_NODE_FLAG_STATIC_LITERAL;

    switch (parser.frozen_string_literal) {
        case PM_OPTIONS_FROZEN_STRING_LITERAL_DISABLED:
            flags |= PM_INTERPOLATED_STRING_NODE_FLAGS_MUTABLE;
            break;
        case PM_OPTIONS_FROZEN_STRING_LITERAL_ENABLED:
            flags |= PM_INTERPOLATED_STRING_NODE_FLAGS_FROZEN;
            break;
    }

    const node = {
        type: PM_INTERPOLATED_STRING_NODE,
        flags,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKENS(opening, closing)
        location: { start: opening.start, end: closing.end },
        opening_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(opening),
        parts: [],
        closing_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(closing),
    };

    if (parts !== null) {
        for (let index = 0; index < parts.length; index++) {
            const part = parts[index];
            pm_interpolated_string_node_append(node, part);
        }
    }

    return node;
}

/**
 * Set the closing token of the given InterpolatedStringNode node.
 */
function pm_interpolated_string_node_closing_set(node, closing) {
    node.closing_loc = PM_OPTIONAL_LOCATION_TOKEN_VALUE(closing);
    node.location.end = closing.end;
}

function pm_interpolated_symbol_node_append(node, part) {
    if (node.parts.length === 0 && node.opening_loc.start === null) {
        node.location.start = part.location.start;
    }

    pm_interpolated_node_append(node, node.parts, part);
    node.location.end = Math.max(node.location.end, part.location.end);
}

function pm_interpolated_symbol_node_closing_loc_set(node, closing) {
    node.closing_loc = PM_OPTIONAL_LOCATION_TOKEN_VALUE(closing);
    node.location.end = closing.end;
}

/**
 * Allocate and initialize a new InterpolatedSymbolNode node.
 */
function pm_interpolated_symbol_node_create(parser, opening, parts, closing) {
    const node = {
        type: PM_INTERPOLATED_SYMBOL_NODE,
        flags: PM_NODE_FLAG_STATIC_LITERAL,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKENS(opening, closing)
        location: { start: opening.start, end: closing.end },
        opening_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(opening),
        parts: [],
        closing_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(closing),
    };

    if (parts !== null) {
        for (let index = 0; index < parts.length; index++) {
            const part = parts[index];
            pm_interpolated_symbol_node_append(node, part);
        }
    }

    return node;
}

/**
 * Allocate a new InterpolatedXStringNode node.
 */
function pm_interpolated_xstring_node_create(parser, opening, closing) {
    const node = {
        type: PM_INTERPOLATED_X_STRING_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKENS(opening, closing)
        location: { start: opening.start, end: closing.end },
        opening_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(opening),
        parts: [],
        closing_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(closing),
    };
    return node;
}

function pm_interpolated_xstring_node_append(node, part) {
    pm_interpolated_node_append(node, node.parts, part);
    node.location.end = part.location.end;
}

function pm_interpolated_xstring_node_closing_set(node, closing) {
    node.closing_loc = PM_LOCATION_TOKEN_VALUE(closing);
    node.location.end = closing.end;
}

/**
 * Create a local variable read that is reading the implicit 'it' variable.
 */
function pm_it_local_variable_read_node_create(parser, name) {
    const node = {
        type: PM_IT_LOCAL_VARIABLE_READ_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(name)
        location: { start: name.start, end: name.end },
    };
    return node;
}

/**
 * Allocate and initialize a new ItParametersNode node.
 */
function pm_it_parameters_node_create(parser, opening, closing) {
    const node = {
        type: PM_IT_PARAMETERS_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKENS(opening, closing)
        location: { start: opening.start, end: closing.end },
    };
    return node;
}

/**
 * Allocate a new KeywordHashNode node.
 */
function pm_keyword_hash_node_create(parser) {
    const node = {
        type: PM_KEYWORD_HASH_NODE,
        flags: PM_KEYWORD_HASH_NODE_FLAGS_SYMBOL_KEYS,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_UNSET
        location: { start: null, end: null },
        elements: [],
    };
    return node;
}

/**
 * Append an element to a KeywordHashNode node.
 */
function pm_keyword_hash_node_elements_append(hash, element) {
    // If the element being added is not an AssocNode or does not have a symbol
    // key, then we want to turn the SYMBOL_KEYS flag off.
    if (!PM_NODE_TYPE_P(element, PM_ASSOC_NODE) || !PM_NODE_TYPE_P(element.key, PM_SYMBOL_NODE)) {
        pm_node_flag_unset(hash, PM_KEYWORD_HASH_NODE_FLAGS_SYMBOL_KEYS);
    }

    pm_node_list_append(hash.elements, element);
    if (hash.location.start === null) {
        hash.location.start = element.location.start;
    }
    hash.location.end = element.location.end;
}

/**
 * Allocate and initialize a new RequiredKeywordParameterNode node.
 */
function pm_required_keyword_parameter_node_create(parser, name) {
    const node = {
        type: PM_REQUIRED_KEYWORD_PARAMETER_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(name)
        location: { start: name.start, end: name.end },
        name: pm_parser_constant_id_location(parser, name.start, name.end - 1),
        name_loc: PM_LOCATION_TOKEN_VALUE(name),
    };
    return node;
}

/**
 * Allocate a new OptionalKeywordParameterNode node.
 */
function pm_optional_keyword_parameter_node_create(parser, name, value) {
    const node = {
        type: PM_OPTIONAL_KEYWORD_PARAMETER_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN_NODE(name, value)
        location: { start: name.start, end: value.location.end },
        name: pm_parser_constant_id_location(parser, name.start, name.end - 1),
        name_loc: PM_LOCATION_TOKEN_VALUE(name),
        value,
    };
    return node;
}

/**
 * Allocate a new KeywordRestParameterNode node.
 */
function pm_keyword_rest_parameter_node_create(parser, operator, name) {
    const node = {
        type: PM_KEYWORD_REST_PARAMETER_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        location: (
            (name.type === PM_TOKEN_NOT_PROVIDED)
            ? { start: operator.start, end: operator.end }
            : { start: operator.start, end: name.end }
        ),
        name: pm_parser_optional_constant_id_token(parser, name),
        name_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(name),
        operator_loc: PM_LOCATION_TOKEN_VALUE(operator),
    };
    return node;
}

/**
 * Allocate a new LambdaNode node.
 */
function pm_lambda_node_create(
    parser,
    locals,
    operator,
    opening,
    closing,
    parameters,
    body
) {
    const node = {
        type: PM_LAMBDA_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKENS(operator, closing)
        location: { start: operator.start, end: closing.end },
        locals: pm_constant_id_list_copy(locals),
        operator_loc: PM_LOCATION_TOKEN_VALUE(operator),
        opening_loc: PM_LOCATION_TOKEN_VALUE(opening),
        closing_loc: PM_LOCATION_TOKEN_VALUE(closing),
        parameters,
        body,
    };
    return node;
}

/**
 * Shared node builder for the LocalVariable{And,Operator,Or}WriteNode
 * family. Field order differs from pm_name_write_node_create's families:
 * `name` and `depth` (identifying which existing local this write resolves
 * to) come after `value` rather than up front as a name/name_loc pair.
 */
function pm_local_variable_and_or_operator_write_node_create(parser, node_type, target, operator, value, name, depth, has_binary_operator) {
    return {
        type: node_type,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_NODES(target, value)
        location: { start: target.location.start, end: value.location.end },
        name_loc: target.location,
        ...(has_binary_operator
            ? { binary_operator_loc: PM_LOCATION_TOKEN_VALUE(operator), value, name, binary_operator: pm_operator_token_id(parser, operator), depth }
            : { operator_loc: PM_LOCATION_TOKEN_VALUE(operator), value, name, depth }),
    };
}

/**
 * Allocate and initialize a new LocalVariableAndWriteNode node.
 */
function pm_local_variable_and_write_node_create(parser, target, operator, value, name, depth) {
    // assert(PM_NODE_TYPE_P(target, PM_LOCAL_VARIABLE_READ_NODE) || PM_NODE_TYPE_P(target, PM_IT_LOCAL_VARIABLE_READ_NODE) || PM_NODE_TYPE_P(target, PM_CALL_NODE));
    // assert(operator.type === PM_TOKEN_AMPERSAND_AMPERSAND_EQUAL);
    return pm_local_variable_and_or_operator_write_node_create(parser, PM_LOCAL_VARIABLE_AND_WRITE_NODE, target, operator, value, name, depth, false);
}

/**
 * Allocate and initialize a new LocalVariableOperatorWriteNode node.
 */
function pm_local_variable_operator_write_node_create(parser, target, operator, value, name, depth) {
    return pm_local_variable_and_or_operator_write_node_create(parser, PM_LOCAL_VARIABLE_OPERATOR_WRITE_NODE, target, operator, value, name, depth, true);
}

/**
 * Allocate and initialize a new LocalVariableOrWriteNode node.
 */
function pm_local_variable_or_write_node_create(parser, target, operator, value, name, depth) {
    // assert(PM_NODE_TYPE_P(target, PM_LOCAL_VARIABLE_READ_NODE) || PM_NODE_TYPE_P(target, PM_IT_LOCAL_VARIABLE_READ_NODE) || PM_NODE_TYPE_P(target, PM_CALL_NODE));
    // assert(operator.type === PM_TOKEN_PIPE_PIPE_EQUAL);
    return pm_local_variable_and_or_operator_write_node_create(parser, PM_LOCAL_VARIABLE_OR_WRITE_NODE, target, operator, value, name, depth, false);
}

/**
 * Allocate a new LocalVariableReadNode node with constant_id.
 */
function pm_local_variable_read_node_create_constant_id(parser, name, name_id, depth, missing) {
    if (!missing) pm_locals_read(pm_parser_scope_find(parser, depth).locals, name_id);

    const node = {
        type: PM_LOCAL_VARIABLE_READ_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(name)
        location: { start: name.start, end: name.end },
        name: name_id,
        depth,
    };
    return node;
}

/**
 * Allocate and initialize a new LocalVariableReadNode node.
 */
function pm_local_variable_read_node_create(parser, name, depth) {
    const name_id = pm_parser_constant_id_token(parser, name);
    return pm_local_variable_read_node_create_constant_id(parser, name, name_id, depth, false);
}

/**
 * Allocate and initialize a new LocalVariableReadNode node for a missing local
 * variable. (This will only happen when there is a syntax error.)
 */
function pm_local_variable_read_node_missing_create(parser, name, depth) {
    const name_id = pm_parser_constant_id_token(parser, name);
    return pm_local_variable_read_node_create_constant_id(parser, name, name_id, depth, true);
}

/**
 * Allocate and initialize a new LocalVariableWriteNode node.
 */
function pm_local_variable_write_node_create(parser, name, depth, value, name_loc, operator) {
    const flags = pm_implicit_array_write_flags(value, PM_WRITE_NODE_FLAGS_IMPLICIT_ARRAY);

    const node = {
        type: PM_LOCAL_VARIABLE_WRITE_NODE,
        flags,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN_NODE(name_loc, value): name_loc is used as a
        // token here, so only its start offset matters.
        location: { start: name_loc.start, end: value.location.end },
        name,
        depth,
        name_loc: { start: name_loc.start, end: name_loc.end },
        value,
        operator_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(operator),
    };
    return node;
}

/**
 * Returns true if the given bounds comprise `it`.
 *
 * Adaptation: takes the source buffer explicitly (C derefs raw pointers).
 */
function pm_token_is_it(source, start, end) {
    return (end - start === 2) && (source[start] === 'i') && (source[start + 1] === 't');
}

/**
 * Returns true if the given bounds comprise a numbered parameter (i.e., they
 * are of the form /^_\d$/).
 *
 * Adaptation: takes the source buffer explicitly (C derefs raw pointers).
 */
function pm_token_is_numbered_parameter(source, start, end) {
    return (end - start === 2) && (source[start] === '_') && (source[start + 1] !== '0') && (pm_char_is_decimal_digit((source.charCodeAt(start + 1) || 0)));
}

/**
 * Ensure the given bounds do not comprise a numbered parameter. If they do, add
 * an appropriate error message to the parser.
 */
function pm_refute_numbered_parameter(parser, start, end) {
    if (pm_token_is_numbered_parameter(parser.source, start, end)) {
        // "%.2s is reserved for numbered parameters"
        PM_PARSER_ERR_FORMAT(parser, start, end, PM_ERR_PARAMETER_NUMBERED_RESERVED, parser.source.slice(start, start + 2));
    }
}

/**
 * Allocate and initialize a new LocalVariableTargetNode node with the given
 * name and depth.
 */
function pm_local_variable_target_node_create(parser, location, name, depth) {
    pm_refute_numbered_parameter(parser, location.start, location.end);

    const node = {
        type: PM_LOCAL_VARIABLE_TARGET_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(location): the location is used as a token here.
        location: { start: location.start, end: location.end },
        name,
        depth,
    };
    return node;
}

/**
 * Allocate and initialize a new MatchPredicateNode node.
 */
function pm_match_predicate_node_create(parser, value, pattern, operator) {
    pm_assert_value_expression(parser, value);

    const node = {
        type: PM_MATCH_PREDICATE_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_NODES(value, pattern)
        location: { start: value.location.start, end: pattern.location.end },
        value,
        pattern,
        operator_loc: PM_LOCATION_TOKEN_VALUE(operator),
    };
    return node;
}

/**
 * Allocate and initialize a new MatchRequiredNode node.
 */
function pm_match_required_node_create(parser, value, pattern, operator) {
    pm_assert_value_expression(parser, value);

    const node = {
        type: PM_MATCH_REQUIRED_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_NODES(value, pattern)
        location: { start: value.location.start, end: pattern.location.end },
        value,
        pattern,
        operator_loc: PM_LOCATION_TOKEN_VALUE(operator),
    };
    return node;
}

/**
 * Allocate and initialize a new MatchWriteNode node.
 */
function pm_match_write_node_create(parser, call) {
    const node = {
        type: PM_MATCH_WRITE_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_NODE(call)
        location: { start: call.location.start, end: call.location.end },
        call,
        targets: [],
    };
    return node;
}

/**
 * Allocate a new ModuleNode node.
 */
function pm_module_node_create(parser, locals, module_keyword, constant_path, name, body, end_keyword) {
    const node = {
        type: PM_MODULE_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKENS(module_keyword, end_keyword)
        location: { start: module_keyword.start, end: end_keyword.end },
        locals: (locals === null ? [] : pm_constant_id_list_copy(locals)),
        module_keyword_loc: PM_LOCATION_TOKEN_VALUE(module_keyword),
        constant_path,
        body,
        end_keyword_loc: PM_LOCATION_TOKEN_VALUE(end_keyword),
        name: pm_parser_constant_id_token(parser, name),
    };
    return node;
}

/**
 * Allocate and initialize new MultiTargetNode node.
 */
function pm_multi_target_node_create(parser) {
    const node = {
        type: PM_MULTI_TARGET_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_UNSET
        location: { start: null, end: null },
        lefts: [],
        rest: null,
        rights: [],
        lparen_loc: PM_LOCATION_UNSET,
        rparen_loc: PM_LOCATION_UNSET,
    };
    return node;
}

/**
 * Append a target to a MultiTargetNode node.
 */
function pm_multi_target_node_targets_append(parser, node, target) {
    if (PM_NODE_TYPE_P(target, PM_SPLAT_NODE)) {
        if (node.rest === null) {
            node.rest = target;
        } else {
            pm_parser_err_node(parser, target, PM_ERR_MULTI_ASSIGN_MULTI_SPLATS);
            pm_node_list_append(node.rights, target);
        }
    } else if (PM_NODE_TYPE_P(target, PM_IMPLICIT_REST_NODE)) {
        if (node.rest === null) {
            node.rest = target;
        } else {
            PM_PARSER_ERR_TOKEN_FORMAT_CONTENT(parser, parser.current, PM_ERR_MULTI_ASSIGN_UNEXPECTED_REST);
            pm_node_list_append(node.rights, target);
        }
    } else if (node.rest === null) {
        pm_node_list_append(node.lefts, target);
    } else {
        pm_node_list_append(node.rights, target);
    }

    if (node.location.start === null || (node.location.start > target.location.start)) {
        node.location.start = target.location.start;
    }

    if (node.location.end === null || (node.location.end < target.location.end)) {
        node.location.end = target.location.end;
    }
}

/**
 * Set the opening of a MultiTargetNode node.
 */
function pm_multi_target_node_opening_set(node, lparen) {
    node.location.start = lparen.start;
    node.lparen_loc = PM_LOCATION_TOKEN_VALUE(lparen);
}

/**
 * Set the closing of a MultiTargetNode node.
 */
function pm_multi_target_node_closing_set(node, rparen) {
    node.location.end = rparen.end;
    node.rparen_loc = PM_LOCATION_TOKEN_VALUE(rparen);
}

/**
 * Allocate a new MultiWriteNode node.
 */
function pm_multi_write_node_create(parser, target, operator, value) {
    const flags = pm_implicit_array_write_flags(value, PM_WRITE_NODE_FLAGS_IMPLICIT_ARRAY);

    const node = {
        type: PM_MULTI_WRITE_NODE,
        flags,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_NODES(target, value)
        location: { start: target.location.start, end: value.location.end },
        lefts: target.lefts,
        rest: target.rest,
        rights: target.rights,
        lparen_loc: target.lparen_loc,
        rparen_loc: target.rparen_loc,
        operator_loc: PM_LOCATION_TOKEN_VALUE(operator),
        value,
    };

    // Explicitly do not destroy the node here because we want to keep
    // around all of the information within the MultiWriteNode node.

    return node;
}

/**
 * Allocate and initialize a new NextNode node.
 */
function pm_next_node_create(parser, keyword, arguments_) {
    // assert(keyword.type === PM_TOKEN_KEYWORD_NEXT);
    const node = {
        type: PM_NEXT_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        location: ( (arguments_ === null) ? { start: keyword.start, end: keyword.end } : { start: keyword.start, end: arguments_.location.end } ),
        arguments: arguments_,
        keyword_loc: PM_LOCATION_TOKEN_VALUE(keyword),
    };
    return node;
}

/**
 * Allocate and initialize a new NilNode node.
 */
function pm_nil_node_create(parser, token) {
    // assert(token.type === PM_TOKEN_KEYWORD_NIL);
    const node = {
        type: PM_NIL_NODE,
        flags: PM_NODE_FLAG_STATIC_LITERAL,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(token)
        location: { start: token.start, end: token.end },
    };
    return node;
}

/**
 * Allocate and initialize a new NoKeywordsParameterNode node.
 */
function pm_no_keywords_parameter_node_create(parser, operator, keyword) {
    // assert(operator.type === PM_TOKEN_USTAR_STAR || operator.type === PM_TOKEN_STAR_STAR);
    // assert(keyword.type === PM_TOKEN_KEYWORD_NIL);
    const node = {
        type: PM_NO_KEYWORDS_PARAMETER_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKENS(operator, keyword)
        location: { start: operator.start, end: keyword.end },
        operator_loc: PM_LOCATION_TOKEN_VALUE(operator),
        keyword_loc: PM_LOCATION_TOKEN_VALUE(keyword),
    };
    return node;
}

/**
 * Allocate and initialize a new NumberedParametersNode node.
 */
function pm_numbered_parameters_node_create(parser, location, maximum) {
    const node = {
        type: PM_NUMBERED_PARAMETERS_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(location): the location is used as a token here.
        location: { start: location.start, end: location.end },
        maximum,
    };
    return node;
}

// The maximum numbered reference value is defined as the maximum value that an
// integer can hold minus 1 bit for CRuby instruction sequence operand tagging.
// ((uint32_t) (INT_MAX >> 1))
const NTH_REF_MAX = 2147483647 >> 1;

/**
 * Parse the decimal number represented by the range of bytes. Returns
 * 0 if the number fails to parse or if the number is greater than the maximum
 * value representable by a numbered reference. This function assumes that the
 * range of bytes has already been validated to contain only decimal digits.
 *
 * Adaptation: strtoul saturation (errno == ERANGE) and value > NTH_REF_MAX both
 * funnel into the same warning + zero branch; JS numbers beyond 2^53 are
 * inexact but still compare > NTH_REF_MAX, so the outcome is identical.
 */
function pm_numbered_reference_read_node_number(parser, token) {
    const start = token.start + 1;
    const end = token.end;

    // assert(end - start > 0);
    const length = end - start;

    const digits = parser.source.slice(start, end);

    // unsigned long value = strtoul(digits, &endptr, 10);
    let value = 0;
    if (!/^\d+$/.test(digits)) {
        pm_parser_err(parser, start, end, PM_ERR_INVALID_NUMBER_DECIMAL);
    } else {
        value = Number(digits);
    }

    if (value > NTH_REF_MAX) {
        PM_PARSER_WARN_FORMAT(parser, start, end, PM_WARN_INVALID_NUMBERED_REFERENCE, length + 1, parser.source.slice(token.start, token.start + length + 1));
        value = 0;
    }

    return value;
}

/**
 * Allocate and initialize a new NthReferenceReadNode node.
 */
function pm_numbered_reference_read_node_create(parser, name) {
    // assert(name.type === PM_TOKEN_NUMBERED_REFERENCE);
    const node = {
        type: PM_NUMBERED_REFERENCE_READ_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(name)
        location: { start: name.start, end: name.end },
        number: pm_numbered_reference_read_node_number(parser, name),
    };
    return node;
}

/**
 * Allocate a new OptionalParameterNode node.
 */
function pm_optional_parameter_node_create(parser, name, operator, value) {
    const node = {
        type: PM_OPTIONAL_PARAMETER_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN_NODE(name, value)
        location: { start: name.start, end: value.location.end },
        name: pm_parser_constant_id_token(parser, name),
        name_loc: PM_LOCATION_TOKEN_VALUE(name),
        operator_loc: PM_LOCATION_TOKEN_VALUE(operator),
        value,
    };
    return node;
}

/**
 * Allocate and initialize a new OrNode node.
 */
function pm_or_node_create(parser, left, operator, right) {
    pm_assert_value_expression(parser, left);

    const node = {
        type: PM_OR_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_NODES(left, right)
        location: { start: left.location.start, end: right.location.end },
        left,
        right,
        operator_loc: PM_LOCATION_TOKEN_VALUE(operator),
    };
    return node;
}

/**
 * Allocate and initialize a new ParametersNode node.
 */
function pm_parameters_node_create(parser) {
    const node = {
        type: PM_PARAMETERS_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_UNSET
        location: { start: null, end: null },
        requireds: [],
        optionals: [],
        rest: null,
        posts: [],
        keywords: [],
        keyword_rest: null,
        block: null,
    };
    return node;
}

/**
 * Set the location properly for the parameters node.
 */
function pm_parameters_node_location_set(params, param) {
    if (params.location.start === null) {
        params.location.start = param.location.start;
    } else {
        params.location.start = params.location.start < param.location.start ? params.location.start : param.location.start;
    }

    if (params.location.end === null) {
        params.location.end = param.location.end;
    } else {
        params.location.end = params.location.end > param.location.end ? params.location.end : param.location.end;
    }
}

/**
 * Append a required parameter to a ParametersNode node.
 */
function pm_parameters_node_requireds_append(params, param) {
    pm_parameters_node_location_set(params, param);
    pm_node_list_append(params.requireds, param);
}

/**
 * Append an optional parameter to a ParametersNode node.
 */
function pm_parameters_node_optionals_append(params, param) {
    pm_parameters_node_location_set(params, param);
    pm_node_list_append(params.optionals, param);
}

/**
 * Append a post optional arguments parameter to a ParametersNode node.
 */
function pm_parameters_node_posts_append(params, param) {
    pm_parameters_node_location_set(params, param);
    pm_node_list_append(params.posts, param);
}

/**
 * Set the rest parameter on a ParametersNode node.
 */
function pm_parameters_node_rest_set(params, param) {
    pm_parameters_node_location_set(params, param);
    params.rest = param;
}

/**
 * Append a keyword parameter to a ParametersNode node.
 */
function pm_parameters_node_keywords_append(params, param) {
    pm_parameters_node_location_set(params, param);
    pm_node_list_append(params.keywords, param);
}

/**
 * Set the keyword rest parameter on a ParametersNode node.
 */
function pm_parameters_node_keyword_rest_set(params, param) {
    // assert(params.keyword_rest === null);
    pm_parameters_node_location_set(params, param);
    params.keyword_rest = param;
}

/**
 * Set the block parameter on a ParametersNode node.
 */
function pm_parameters_node_block_set(params, param) {
    // assert(params.block === null);
    pm_parameters_node_location_set(params, param);
    params.block = param;
}

/**
 * Allocate a new ProgramNode node.
 */
function pm_program_node_create(parser, locals, statements) {
    const node = {
        type: PM_PROGRAM_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_NODE(statements)
        location: { start: statements.location.start, end: statements.location.end },
        locals: pm_constant_id_list_copy(locals),
        statements,
    };
    return node;
}

/**
 * Allocate and initialize new ParenthesesNode node.
 */
function pm_parentheses_node_create(parser, opening, body, closing, flags) {
    const node = {
        type: PM_PARENTHESES_NODE,
        flags,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKENS(opening, closing)
        location: { start: opening.start, end: closing.end },
        body,
        opening_loc: PM_LOCATION_TOKEN_VALUE(opening),
        closing_loc: PM_LOCATION_TOKEN_VALUE(closing),
    };
    return node;
}

/**
 * Allocate and initialize a new PinnedExpressionNode node.
 */
function pm_pinned_expression_node_create(parser, expression, operator, lparen, rparen) {
    const node = {
        type: PM_PINNED_EXPRESSION_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKENS(operator, rparen)
        location: { start: operator.start, end: rparen.end },
        expression,
        operator_loc: PM_LOCATION_TOKEN_VALUE(operator),
        lparen_loc: PM_LOCATION_TOKEN_VALUE(lparen),
        rparen_loc: PM_LOCATION_TOKEN_VALUE(rparen),
    };
    return node;
}

/**
 * Allocate and initialize a new PinnedVariableNode node.
 */
function pm_pinned_variable_node_create(parser, operator, variable) {
    const node = {
        type: PM_PINNED_VARIABLE_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN_NODE(operator, variable)
        location: { start: operator.start, end: variable.location.end },
        variable,
        operator_loc: PM_LOCATION_TOKEN_VALUE(operator),
    };
    return node;
}

/**
 * Allocate and initialize a new PostExecutionNode node.
 */
function pm_post_execution_node_create(parser, keyword, opening, statements, closing) {
    const node = {
        type: PM_POST_EXECUTION_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKENS(keyword, closing)
        location: { start: keyword.start, end: closing.end },
        statements,
        keyword_loc: PM_LOCATION_TOKEN_VALUE(keyword),
        opening_loc: PM_LOCATION_TOKEN_VALUE(opening),
        closing_loc: PM_LOCATION_TOKEN_VALUE(closing),
    };
    return node;
}

/**
 * Allocate and initialize a new PreExecutionNode node.
 */
function pm_pre_execution_node_create(parser, keyword, opening, statements, closing) {
    const node = {
        type: PM_PRE_EXECUTION_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKENS(keyword, closing)
        location: { start: keyword.start, end: closing.end },
        statements,
        keyword_loc: PM_LOCATION_TOKEN_VALUE(keyword),
        opening_loc: PM_LOCATION_TOKEN_VALUE(opening),
        closing_loc: PM_LOCATION_TOKEN_VALUE(closing),
    };
    return node;
}

/**
 * Allocate and initialize new RangeNode node.
 */
function pm_range_node_create(parser, left, operator, right) {
    pm_assert_value_expression(parser, left);
    pm_assert_value_expression(parser, right);

    let flags = 0;

    // Indicate that this node is an exclusive range if the operator is `...`.
    if (operator.type === PM_TOKEN_DOT_DOT_DOT || operator.type === PM_TOKEN_UDOT_DOT_DOT) {
        flags |= PM_RANGE_FLAGS_EXCLUDE_END;
    }

    // Indicate that this node is a static literal (i.e., can be compiled with
    // a putobject in CRuby) if the left and right are implicit nil, explicit
    // nil, or integers.
    if (
        (left === null || PM_NODE_TYPE_P(left, PM_NIL_NODE) || PM_NODE_TYPE_P(left, PM_INTEGER_NODE)) &&
        (right === null || PM_NODE_TYPE_P(right, PM_NIL_NODE) || PM_NODE_TYPE_P(right, PM_INTEGER_NODE))
    ) {
        flags |= PM_NODE_FLAG_STATIC_LITERAL;
    }

    const node = {
        type: PM_RANGE_NODE,
        flags,
        node_id: ++parser.node_id,
        // PM_NODE_INIT((left == NULL ? operator->start : left->location.start), (right == NULL ? operator->end : right->location.end))
        location: { start: left === null ? operator.start : left.location.start, end: right === null ? operator.end : right.location.end },
        left,
        right,
        operator_loc: PM_LOCATION_TOKEN_VALUE(operator),
    };
    return node;
}

/**
 * Allocate and initialize a new RedoNode node.
 */
function pm_redo_node_create(parser, token) {
    // assert(token.type === PM_TOKEN_KEYWORD_REDO);
    const node = {
        type: PM_REDO_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(token)
        location: { start: token.start, end: token.end },
    };
    return node;
}

/**
 * Allocate a new initialize a new RegularExpressionNode node with the given
 * unescaped string.
 */
function pm_regular_expression_node_create_unescaped(parser, opening, content, closing, unescaped) {
    const flags = pm_regular_expression_flags_create(parser, closing) | PM_NODE_FLAG_STATIC_LITERAL;

    const node = {
        type: PM_REGULAR_EXPRESSION_NODE,
        flags,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKENS(opening, closing)
        location: { start: opening.start, end: closing.end },
        opening_loc: PM_LOCATION_TOKEN_VALUE(opening),
        content_loc: PM_LOCATION_TOKEN_VALUE(content),
        closing_loc: PM_LOCATION_TOKEN_VALUE(closing),
        unescaped,
    };
    return node;
}

/**
 * Allocate a new initialize a new RegularExpressionNode node.
 */
function pm_regular_expression_node_create(parser, opening, content, closing) {
    return pm_regular_expression_node_create_unescaped(parser, opening, content, closing, "");
}

/**
 * Allocate a new RequiredParameterNode node.
 */
function pm_required_parameter_node_create(parser, token) {
    const node = {
        type: PM_REQUIRED_PARAMETER_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(token)
        location: { start: token.start, end: token.end },
        name: pm_parser_constant_id_token(parser, token),
    };
    return node;
}

/**
 * Allocate a new RescueModifierNode node.
 */
function pm_rescue_modifier_node_create(parser, expression, keyword, rescue_expression) {
    const node = {
        type: PM_RESCUE_MODIFIER_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_NODES(expression, rescue_expression)
        location: { start: expression.location.start, end: rescue_expression.location.end },
        expression,
        keyword_loc: PM_LOCATION_TOKEN_VALUE(keyword),
        rescue_expression,
    };
    return node;
}

/**
 * Allocate and initialize a new RescueNode node.
 */
function pm_rescue_node_create(parser, keyword) {
    const node = {
        type: PM_RESCUE_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(keyword)
        location: { start: keyword.start, end: keyword.end },
        keyword_loc: PM_LOCATION_TOKEN_VALUE(keyword),
        exceptions: [],
        operator_loc: PM_LOCATION_UNSET,
        reference: null,
        then_keyword_loc: PM_LOCATION_UNSET,
        statements: null,
        subsequent: null,
    };
    return node;
}

function pm_rescue_node_operator_set(node, operator) {
    node.operator_loc = PM_OPTIONAL_LOCATION_TOKEN_VALUE(operator);
}

/**
 * Set the reference of a rescue node, and update the location of the node.
 */
function pm_rescue_node_reference_set(node, reference) {
    node.reference = reference;
    node.location.end = reference.location.end;
}

/**
 * Set the statements of a rescue node, and update the location of the node.
 */
function pm_rescue_node_statements_set(node, statements) {
    node.statements = statements;
    if (pm_statements_node_body_length(statements) > 0) {
        node.location.end = statements.location.end;
    }
}

/**
 * Set the subsequent of a rescue node, and update the location.
 */
function pm_rescue_node_subsequent_set(node, subsequent) {
    node.subsequent = subsequent;
    node.location.end = subsequent.location.end;
}

/**
 * Append an exception node to a rescue node, and update the location.
 */
function pm_rescue_node_exceptions_append(node, exception) {
    pm_node_list_append(node.exceptions, exception);
    node.location.end = exception.location.end;
}

/**
 * Allocate a new RestParameterNode node.
 */
function pm_rest_parameter_node_create(parser, operator, name) {
    const node = {
        type: PM_REST_PARAMETER_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        location: (
            (name.type === PM_TOKEN_NOT_PROVIDED)
            ? { start: operator.start, end: operator.end }
            : { start: operator.start, end: name.end }
        ),
        name: pm_parser_optional_constant_id_token(parser, name),
        name_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(name),
        operator_loc: PM_LOCATION_TOKEN_VALUE(operator),
    };
    return node;
}

/**
 * Allocate and initialize a new RetryNode node.
 */
function pm_retry_node_create(parser, token) {
    // assert(token.type === PM_TOKEN_KEYWORD_RETRY);
    const node = {
        type: PM_RETRY_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(token)
        location: { start: token.start, end: token.end },
    };
    return node;
}

/**
 * Allocate a new ReturnNode node.
 */
function pm_return_node_create(parser, keyword, arguments_) {
    const node = {
        type: PM_RETURN_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        location: (
            (arguments_ === null)
            ? { start: keyword.start, end: keyword.end }
            : { start: keyword.start, end: arguments_.location.end }
        ),
        keyword_loc: PM_LOCATION_TOKEN_VALUE(keyword),
        arguments: arguments_,
    };
    return node;
}

/**
 * Allocate and initialize a new SelfNode node.
 */
function pm_self_node_create(parser, token) {
    // assert(token.type === PM_TOKEN_KEYWORD_SELF);
    const node = {
        type: PM_SELF_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(token)
        location: { start: token.start, end: token.end },
    };
    return node;
}

/**
 * Allocate and initialize a new ShareableConstantNode node.
 */
function pm_shareable_constant_node_create(parser, write, value) {
    const node = {
        type: PM_SHAREABLE_CONSTANT_NODE,
        flags: value,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_NODE(write)
        location: { start: write.location.start, end: write.location.end },
        write,
    };
    return node;
}

/**
 * Allocate a new SingletonClassNode node.
 */
function pm_singleton_class_node_create(parser, locals, class_keyword, operator, expression, body, end_keyword) {
    const node = {
        type: PM_SINGLETON_CLASS_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKENS(class_keyword, end_keyword)
        location: { start: class_keyword.start, end: end_keyword.end },
        locals: pm_constant_id_list_copy(locals),
        class_keyword_loc: PM_LOCATION_TOKEN_VALUE(class_keyword),
        operator_loc: PM_LOCATION_TOKEN_VALUE(operator),
        expression,
        body,
        end_keyword_loc: PM_LOCATION_TOKEN_VALUE(end_keyword),
    };
    return node;
}

/**
 * Allocate and initialize a new SourceEncodingNode node.
 */
function pm_source_encoding_node_create(parser, token) {
    // assert(token.type === PM_TOKEN_KEYWORD___ENCODING__);
    const node = {
        type: PM_SOURCE_ENCODING_NODE,
        flags: PM_NODE_FLAG_STATIC_LITERAL,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(token)
        location: { start: token.start, end: token.end },
    };
    return node;
}

/**
 * Allocate and initialize a new SourceFileNode node.
 */
function pm_source_file_node_create(parser, file_keyword) {
    // assert(file_keyword.type === PM_TOKEN_KEYWORD___FILE__);

    let flags = 0;

    switch (parser.frozen_string_literal) {
        case PM_OPTIONS_FROZEN_STRING_LITERAL_DISABLED:
            flags |= PM_STRING_FLAGS_MUTABLE;
            break;
        case PM_OPTIONS_FROZEN_STRING_LITERAL_ENABLED:
            flags |= PM_NODE_FLAG_STATIC_LITERAL | PM_STRING_FLAGS_FROZEN;
            break;
    }

    const node = {
        type: PM_SOURCE_FILE_NODE,
        flags,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(file_keyword)
        location: { start: file_keyword.start, end: file_keyword.end },
        filepath: parser.filepath,
    };
    return node;
}

/**
 * Allocate and initialize a new SourceLineNode node.
 */
function pm_source_line_node_create(parser, token) {
    // assert(token.type === PM_TOKEN_KEYWORD___LINE__);
    const node = {
        type: PM_SOURCE_LINE_NODE,
        flags: PM_NODE_FLAG_STATIC_LITERAL,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(token)
        location: { start: token.start, end: token.end },
    };
    return node;
}

/**
 * Allocate a new SplatNode node.
 */
function pm_splat_node_create(parser, operator, expression) {
    const node = {
        type: PM_SPLAT_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        location: (
            (expression === null)
            ? { start: operator.start, end: operator.end }
            : { start: operator.start, end: expression.location.end }
        ),
        operator_loc: PM_LOCATION_TOKEN_VALUE(operator),
        expression,
    };
    return node;
}

/**
 * Allocate and initialize a new StatementsNode node.
 */
function pm_statements_node_create(parser) {
    const node = {
        type: PM_STATEMENTS_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_BASE
        location: { start: parser.start, end: parser.start },
        body: [],
    };
    return node;
}

/**
 * Get the length of the given StatementsNode node's body.
 */
function pm_statements_node_body_length(node) {
    return (node === null || node === undefined) ? 0 : node.body.length;
}

/**
 * Set the location of the given StatementsNode.
 */
function pm_statements_node_location_set(node, start, end) {
    node.location = { start, end };
}

/**
 * Update the location of the statements node based on the statement that is
 * being added to the list.
 */
function pm_statements_node_body_update(node, statement) {
    if (pm_statements_node_body_length(node) === 0 || statement.location.start < node.location.start) {
        node.location.start = statement.location.start;
    }

    if (statement.location.end > node.location.end) {
        node.location.end = statement.location.end;
    }
}

/**
 * Append a new node to the given StatementsNode node's body.
 */
function pm_statements_node_body_append(parser, node, statement, newline) {
    pm_statements_node_body_update(node, statement);

    if (node.body.length > 0) {
        const previous = node.body[node.body.length - 1];

        switch (previous.type) {
            case PM_BREAK_NODE:
            case PM_NEXT_NODE:
            case PM_REDO_NODE:
            case PM_RETRY_NODE:
            case PM_RETURN_NODE:
                pm_parser_warn_node(parser, statement, PM_WARN_UNREACHABLE_STATEMENT);
                break;
            default:
                break;
        }
    }

    pm_node_list_append(node.body, statement);
    if (newline) pm_node_flag_set(statement, PM_NODE_FLAG_NEWLINE);
}

/**
 * Prepend a new node to the given StatementsNode node's body.
 */
function pm_statements_node_body_prepend(node, statement) {
    pm_statements_node_body_update(node, statement);
    pm_node_list_prepend(node.body, statement);
    pm_node_flag_set(statement, PM_NODE_FLAG_NEWLINE);
}

/**
 * Allocate a new StringNode node with the given unescaped string.
 */
function pm_string_node_create_unescaped(parser, opening, content, closing, string) {
    let flags = 0;

    switch (parser.frozen_string_literal) {
        case PM_OPTIONS_FROZEN_STRING_LITERAL_DISABLED:
            flags = PM_STRING_FLAGS_MUTABLE;
            break;
        case PM_OPTIONS_FROZEN_STRING_LITERAL_ENABLED:
            flags = PM_NODE_FLAG_STATIC_LITERAL | PM_STRING_FLAGS_FROZEN;
            break;
    }

    const start = (opening.type === PM_TOKEN_NOT_PROVIDED ? content.start : opening.start);
    const end = (closing.type === PM_TOKEN_NOT_PROVIDED ? content.end : closing.end);

    const node = {
        type: PM_STRING_NODE,
        flags,
        node_id: ++parser.node_id,
        // PM_NODE_INIT(start, end)
        location: { start, end },
        opening_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(opening),
        content_loc: PM_LOCATION_TOKEN_VALUE(content),
        closing_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(closing),
        unescaped: string,
    };
    return node;
}

/**
 * Allocate a new StringNode node.
 */
function pm_string_node_create(parser, opening, content, closing) {
    return pm_string_node_create_unescaped(parser, opening, content, closing, "");
}

/**
 * Allocate a new StringNode node and create it using the current string on the
 * parser.
 */
function pm_string_node_create_current_string(parser, opening, content, closing) {
    const node = pm_string_node_create_unescaped(parser, opening, content, closing, parser.current_string);
    parser.current_string = "";
    parser.current_string_shared = true;
    return node;
}

/**
 * Allocate and initialize a new SuperNode node.
 */
function pm_super_node_create(parser, keyword, arguments_) {
    // assert(keyword.type === PM_TOKEN_KEYWORD_SUPER);
    const end = pm_arguments_end(arguments_);
    if (end === null) {
        // assert(false && "unreachable");
    }

    const node = {
        type: PM_SUPER_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT(keyword.start, end)
        location: { start: keyword.start, end },
        keyword_loc: PM_LOCATION_TOKEN_VALUE(keyword),
        lparen_loc: arguments_.opening_loc,
        arguments: arguments_.arguments,
        rparen_loc: arguments_.closing_loc,
        block: arguments_.block,
    };
    return node;
}

/**
 * Read through the contents of a string and check if it consists solely of
 * US-ASCII code points.
 */
function pm_ascii_only_p(contents) {
    return !/[\u0080-\uFFFF]/.test(contents || "");
}

/**
 * Validate that the contents of the given symbol are all valid UTF-8.
 *
 * Adaptation: the cursor is a numeric offset into the pm_string_t's own source
 * buffer; encoding callbacks are called as fn(buffer, offset, n).
 */
function parse_symbol_encoding_validate_utf8(parser, location, contents) {
    // UNI-BUILD: C validates the symbol's bytes as UTF-8. In a source in
    // another encoding, a non-ASCII character of the symbol's own source
    // text (escapes are ASCII) is a byte of that encoding there, invalid
    // in UTF-8 (single bytes above 0x7F, assuming they don't happen to form
    // UTF-8 sequences); the decoded contents can't show that.
    if (parser.source_encoding_family !== "utf8") {
        for (let i = location.start; i < location.end; i++) {
            if (parser.source.charCodeAt(i) >= 0x80) {
                pm_parser_err(parser, location.start, location.end, PM_ERR_INVALID_SYMBOL);
                return;
            }
        }
    }

    const contents_source = (contents || "");
    const contents_length = (contents ? contents.length : 0);

    // UNI-BUILD: bytes that aren't valid UTF-8 (from \x escapes) are U+FFFD
    // in the contents; one that the symbol's source text doesn't have itself
    // (as the character or a \u escape) stands for invalid bytes.
    if (contents_source.includes("\uFFFD")) {
        const text = parser.source.slice(location.start, location.end);
        if (!text.includes("\uFFFD") && !/\\u\{?\s*0*fffd/i.test(text)) {
            pm_parser_err(parser, location.start, location.end, PM_ERR_INVALID_SYMBOL);
            return;
        }
    }

    let cursor = 0;
    while (cursor < contents_length) {
        const width = pm_encoding_utf_8_char_width(contents_source, cursor, contents_length - cursor);

        if (width === 0) {
            pm_parser_err(parser, location.start, location.end, PM_ERR_INVALID_SYMBOL);
            break;
        }

        cursor += width;
    }
}

/**
 * Validate that the contents of the given symbol are all valid in the encoding
 * of the parser.
 */
function parse_symbol_encoding_validate_other(parser, location, contents) {
    const encoding = parser.encoding;

    const contents_source = (contents || "");
    const contents_length = (contents ? contents.length : 0);

    let cursor = 0;
    while (cursor < contents_length) {
        const width = encoding.char_width(contents_source, cursor, contents_length - cursor);

        if (width === 0) {
            pm_parser_err(parser, location.start, location.end, PM_ERR_INVALID_SYMBOL);
            break;
        }

        cursor += width;
    }
}

/**
 * Ruby "downgrades" the encoding of Symbols to US-ASCII if the associated
 * encoding is ASCII-compatible and the Symbol consists only of US-ASCII code
 * points. Otherwise, the encoding may be explicitly set with an escape
 * sequence.
 *
 * If the validate flag is set, then it will check the contents of the symbol
 * to ensure that all characters are valid in the encoding.
 */
function parse_symbol_encoding(parser, location, contents, validate) {
    if (parser.explicit_encoding !== null) {
        // A Symbol may optionally have its encoding explicitly set. This will
        // happen if an escape sequence results in a non-ASCII code point.
        // UNI-BUILD: explicit_encoding is a family sentinel - see
        // parse_unescaped_encoding. C: `\u` (or `\x` in a UTF-8 source) ->
        // FORCED_UTF8; `\x` in a US-ASCII source -> FORCED_BINARY; `\x` in
        // its own non-ASCII source -> 0 (validate-other).
        if (parser.explicit_encoding === "utf8") {
            if (validate) parse_symbol_encoding_validate_utf8(parser, location, contents);
            return PM_SYMBOL_FLAGS_FORCED_UTF8_ENCODING;
        }
        if (parser.explicit_encoding === "us-ascii") {
            return PM_SYMBOL_FLAGS_FORCED_BINARY_ENCODING;
        }
        if (validate) parse_symbol_encoding_validate_other(parser, location, contents);
        return 0;
    } else if (pm_ascii_only_p(contents)) {
        // Ruby stipulates that all source files must use an ASCII-compatible
        // encoding. Thus, all symbols appearing in source are eligible for
        // "downgrading" to US-ASCII.
        return PM_SYMBOL_FLAGS_FORCED_US_ASCII_ENCODING;
    } else if (validate) {
        parse_symbol_encoding_validate_other(parser, location, contents);
    }

    return 0;
}

/**
 * Validate the encoding modifier on a regular expression ('n', 'u', 'e', 's').
 * The modifier is passed as a one-character JS string.
 */
function parse_and_validate_regular_expression_encoding_modifier(parser, source, ascii_only, flags, modifier, modifier_encoding) {
    // assert((modifier === 'n' && modifier_encoding === PM_ENCODING_ASCII_8BIT_ENTRY) ||
    //        (modifier === 'u' && modifier_encoding === PM_ENCODING_UTF_8_ENTRY) ||
    //        (modifier === 'e' && modifier_encoding === PM_ENCODING_EUC_JP_ENTRY) ||
    //        (modifier === 's' && modifier_encoding === PM_ENCODING_WINDOWS_31J_ENTRY));

    // There's special validation logic used if a string does not contain any character escape sequences.
    if (parser.explicit_encoding === null) {
        // If an ASCII-only string without character escapes is used with an encoding modifier, then resulting Regexp
        // has the modifier encoding, unless the ASCII-8BIT modifier is used, in which case the Regexp "downgrades" to
        // the US-ASCII encoding.
        if (ascii_only) {
            return modifier === 'n' ? PM_REGULAR_EXPRESSION_FLAGS_FORCED_US_ASCII_ENCODING : flags;
        }

        // UNI-BUILD: C's `encoding == &PM_ENCODING_US_ASCII_ENTRY` is always
        // false here (the source encoding is emulated as UTF-8), so C's
        // corresponding branch (erroring on a non-ASCII-only string in a
        // US-ASCII file) is dropped. `encoding != modifier_encoding` reduces
        // to "the modifier is not 'u'", since 'n'/'e'/'s' select encodings
        // that differ from UTF-8 in C.
        if (modifier !== "u") {
            PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, PM_ERR_REGEXP_ENCODING_OPTION_MISMATCH, modifier, parser.encoding.name);

            if (modifier === 'n' && !ascii_only) {
                PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, PM_ERR_REGEXP_NON_ESCAPED_MBC, (source ? source.length : 0), (source || ""));
            }
        }

        return flags;
    }

    // TODO (nirvdrum 21-Feb-2024): To validate regexp sources with character escape sequences we need to know whether hex or Unicode escape sequences were used and Prism doesn't currently provide that data. We handle a subset of unambiguous cases in the meanwhile.
    const mixed_encoding = false;

    if (mixed_encoding) {
        PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, PM_ERR_INVALID_MULTIBYTE_ESCAPE, (source ? source.length : 0), (source || ""));
    // UNI-BUILD: explicit_encoding, when set, is always the same
    // ASCII_8BIT/UTF_8-equivalent entry (see encoding.js) - so both `&&`
    // clauses below that compared it against a specific C encoding entry are
    // always true, and are dropped.
    } else if (modifier !== 'n') {
        // TODO (nirvdrum 21-Feb-2024): Validate the content is valid in the modifier encoding. Do this on-demand so we don't pay the cost of computation unnecessarily.
        const valid_string_in_modifier_encoding = true;

        if (!valid_string_in_modifier_encoding) {
            PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, PM_ERR_INVALID_MULTIBYTE_ESCAPE, (source ? source.length : 0), (source || ""));
        }
    } else if (modifier !== 'u') {
        // TODO (nirvdrum 21-Feb-2024): There's currently no way to tell if the source used hex or Unicode character escapes from `explicit_encoding` alone. If the source encoding was already UTF-8, both character escape types would set `explicit_encoding` to UTF-8, but need to be processed differently. Skip for now.
        // UNI-BUILD: C's `encoding != &PM_ENCODING_UTF_8_ENTRY` is always
        // false here (the source encoding is always the UTF-8-emulating
        // entry), so C's corresponding branch is dropped.
    }

    // We've determined the encoding would naturally be EUC-JP and there is no need to force the encoding to anything else.
    return flags;
}

/**
 * Ruby "downgrades" the encoding of Regexps to US-ASCII if the associated encoding is ASCII-compatible and
 * the unescaped representation of a Regexp source consists only of US-ASCII code points. This is true even
 * when the Regexp is explicitly given an ASCII-8BIT encoding via the (/n) modifier. Otherwise, the encoding
 * may be explicitly set with an escape sequence.
 */
function parse_and_validate_regular_expression_encoding(parser, source, ascii_only, flags) {
    // TODO (nirvdrum 22-Feb-2024): CRuby reports a special Regexp-specific error for invalid Unicode ranges. We either need to scan again or modify the "invalid Unicode escape sequence" message we already report.
    const valid_unicode_range = true;
    if (parser.explicit_encoding !== null /* UNI-BUILD: C: explicit == &PM_ENCODING_UTF_8_ENTRY */ && !valid_unicode_range) {
        PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, PM_ERR_REGEXP_INVALID_UNICODE_RANGE, (source ? source.length : 0), (source || ""));
        return flags;
    }

    // US-ASCII strings do not admit multi-byte character literals. However, character escape sequences corresponding
    // to multi-byte characters are allowed.
    // UNI-BUILD: C errors here (PM_ERR_INVALID_MULTIBYTE_CHAR) when
    // encoding == &PM_ENCODING_US_ASCII_ENTRY and !ascii_only; the source
    // encoding is never US-ASCII here, so that error can never occur and the
    // branch is dropped.

    /**
     * Start checking modifier flags. We need to process these before considering any explicit encodings that may have
     * been set by character literals. The order in which the encoding modifiers is checked does not matter. In the
     * event that both an encoding modifier and an explicit encoding would result in the same encoding we do not set
     * the corresponding "forced_<encoding>" flag. Instead, the caller should check the encoding modifier flag and
     * determine the encoding that way.
     */

    if (flags & PM_REGULAR_EXPRESSION_FLAGS_ASCII_8BIT) {
        return parse_and_validate_regular_expression_encoding_modifier(parser, source, ascii_only, flags, 'n', PM_ENCODING_ASCII_8BIT_ENTRY);
    }

    if (flags & PM_REGULAR_EXPRESSION_FLAGS_UTF_8) {
        return parse_and_validate_regular_expression_encoding_modifier(parser, source, ascii_only, flags, 'u', PM_ENCODING_UTF_8_ENTRY);
    }

    if (flags & PM_REGULAR_EXPRESSION_FLAGS_EUC_JP) {
        return parse_and_validate_regular_expression_encoding_modifier(parser, source, ascii_only, flags, 'e', PM_ENCODING_EUC_JP_ENTRY);
    }

    if (flags & PM_REGULAR_EXPRESSION_FLAGS_WINDOWS_31J) {
        return parse_and_validate_regular_expression_encoding_modifier(parser, source, ascii_only, flags, 's', PM_ENCODING_WINDOWS_31J_ENTRY);
    }

    // At this point no encoding modifiers will be present on the regular expression as they would have already
    // been processed. Ruby stipulates that all source files must use an ASCII-compatible encoding. Thus, all
    // regular expressions without an encoding modifier appearing in source are eligible for "downgrading" to US-ASCII.
    if (ascii_only) {
        return PM_REGULAR_EXPRESSION_FLAGS_FORCED_US_ASCII_ENCODING;
    }

    // A Regexp may optionally have its encoding explicitly set via a character escape sequence in the source string
    // or by specifying a modifier.
    //
    // NB: an explicitly set encoding is ignored by Ruby if the Regexp consists of only US ASCII code points.
    // UNI-BUILD: C checks explicit_encoding == &PM_ENCODING_UTF_8_ENTRY
    // (true for every explicit encoding here); the FORCED_BINARY fallback is
    // unrepresentable.
    if (parser.explicit_encoding !== null) {
        return PM_REGULAR_EXPRESSION_FLAGS_FORCED_UTF8_ENCODING;
    }

    return 0;
}

/**
 * Allocate and initialize a new SymbolNode node with the given unescaped
 * string.
 */
function pm_symbol_node_create_unescaped(parser, opening, value, closing, unescaped, flags) {
    const start = (opening.type === PM_TOKEN_NOT_PROVIDED ? value.start : opening.start);
    const end = (closing.type === PM_TOKEN_NOT_PROVIDED ? value.end : closing.end);

    const node = {
        type: PM_SYMBOL_NODE,
        flags: PM_NODE_FLAG_STATIC_LITERAL | flags,
        node_id: ++parser.node_id,
        // PM_NODE_INIT(start, end)
        location: { start, end },
        opening_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(opening),
        value_loc: PM_LOCATION_TOKEN_VALUE(value),
        closing_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(closing),
        unescaped,
    };
    return node;
}

/**
 * Allocate and initialize a new SymbolNode node.
 */
function pm_symbol_node_create(parser, opening, value, closing) {
    return pm_symbol_node_create_unescaped(parser, opening, value, closing, "", 0);
}

/**
 * Allocate and initialize a new SymbolNode node with the current string.
 */
function pm_symbol_node_create_current_string(parser, opening, value, closing) {
    const node = pm_symbol_node_create_unescaped(parser, opening, value, closing, parser.current_string, parse_symbol_encoding(parser, value, parser.current_string, false));
    parser.current_string = "";
    parser.current_string_shared = true;
    return node;
}

/**
 * Allocate and initialize a new SymbolNode node from a label.
 */
function pm_symbol_node_label_create(parser, token) {
    let node;

    switch (token.type) {
        case PM_TOKEN_LABEL: {
            const opening = not_provided(parser);
            const closing = { type: PM_TOKEN_LABEL_END, start: token.end - 1, end: token.end };

            const label = { type: PM_TOKEN_LABEL, start: token.start, end: token.end - 1 };
            node = pm_symbol_node_create(parser, opening, label, closing);

            // assert((label.end - label.start) >= 0);
            node.unescaped = parser.source.slice(label.start, label.end);
            pm_node_flag_set(node, parse_symbol_encoding(parser, label, node.unescaped, false));

            break;
        }
        case PM_TOKEN_MISSING: {
            const opening = not_provided(parser);
            const closing = not_provided(parser);

            const label = { type: PM_TOKEN_LABEL, start: token.start, end: token.end };
            node = pm_symbol_node_create(parser, opening, label, closing);
            break;
        }
        default:
            // assert(false && "unreachable");
            node = null;
            break;
    }

    return node;
}

/**
 * Allocate and initialize a new synthesized SymbolNode node.
 *
 * Adaptation: `content` is a JS string (C took a bare char *).
 */
function pm_symbol_node_synthesized_create(parser, content) {
    const node = {
        type: PM_SYMBOL_NODE,
        flags: PM_NODE_FLAG_STATIC_LITERAL | PM_SYMBOL_FLAGS_FORCED_US_ASCII_ENCODING,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_BASE
        location: { start: parser.start, end: parser.start },
        opening_loc: PM_LOCATION_UNSET,
        value_loc: PM_LOCATION_NULL_VALUE(parser),
        closing_loc: PM_LOCATION_UNSET,
        unescaped: "",
    };

    node.unescaped = content;
    return node;
}

/**
 * Check if the given node is a label in a hash.
 *
 * Adaptation: takes (parser, node); it reads the byte before closing_loc.end
 * out of parser.source (same adaptation as part1's token_is_setter_name).
 */
function pm_symbol_node_label_p(parser, node) {
    let end = null;

    switch (node.type) {
        case PM_SYMBOL_NODE:
            end = node.closing_loc.end;
            break;
        case PM_INTERPOLATED_SYMBOL_NODE:
            end = node.closing_loc.end;
            break;
        default:
            return false;
    }

    return (end !== null) && (parser.source[end - 1] === ':');
}

/**
 * Convert the given StringNode node to a SymbolNode node.
 */
function pm_string_node_to_symbol_node(parser, node, opening, closing) {
    const new_node = {
        type: PM_SYMBOL_NODE,
        flags: PM_NODE_FLAG_STATIC_LITERAL,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKENS(opening, closing)
        location: { start: opening.start, end: closing.end },
        opening_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(opening),
        value_loc: node.content_loc,
        closing_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(closing),
        unescaped: node.unescaped,
    };

    const content = { type: PM_TOKEN_IDENTIFIER, start: node.content_loc.start, end: node.content_loc.end };
    pm_node_flag_set(new_node, parse_symbol_encoding(parser, content, node.unescaped, true));

    // We are explicitly _not_ destroying the node here because we don't want
    // to trash the unescaped string. We could instead copy the string if we
    // know that it is owned, but we're taking the fast path for now.

    return new_node;
}

/**
 * Convert the given SymbolNode node to a StringNode node.
 */
function pm_symbol_node_to_string_node(parser, node) {
    let flags = 0;

    switch (parser.frozen_string_literal) {
        case PM_OPTIONS_FROZEN_STRING_LITERAL_DISABLED:
            flags = PM_STRING_FLAGS_MUTABLE;
            break;
        case PM_OPTIONS_FROZEN_STRING_LITERAL_ENABLED:
            flags = PM_NODE_FLAG_STATIC_LITERAL | PM_STRING_FLAGS_FROZEN;
            break;
    }

    const new_node = {
        type: PM_STRING_NODE,
        flags,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_NODE(node)
        location: { start: node.location.start, end: node.location.end },
        opening_loc: node.opening_loc,
        content_loc: node.value_loc,
        closing_loc: node.closing_loc,
        unescaped: node.unescaped,
    };

    // We are explicitly _not_ destroying the node here because we don't want
    // to trash the unescaped string. We could instead copy the string if we
    // know that it is owned, but we're taking the fast path for now.

    return new_node;
}

/**
 * Allocate and initialize a new TrueNode node.
 */
function pm_true_node_create(parser, token) {
    // assert(token.type === PM_TOKEN_KEYWORD_TRUE);
    const node = {
        type: PM_TRUE_NODE,
        flags: PM_NODE_FLAG_STATIC_LITERAL,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(token)
        location: { start: token.start, end: token.end },
    };
    return node;
}

/**
 * Allocate and initialize a new synthesized TrueNode node.
 */
function pm_true_node_synthesized_create(parser) {
    const node = {
        type: PM_TRUE_NODE,
        flags: PM_NODE_FLAG_STATIC_LITERAL,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_BASE
        location: { start: parser.start, end: parser.start },
    };
    return node;
}

/**
 * Allocate and initialize a new UndefNode node.
 */
function pm_undef_node_create(parser, token) {
    // assert(token.type === PM_TOKEN_KEYWORD_UNDEF);
    const node = {
        type: PM_UNDEF_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(token)
        location: { start: token.start, end: token.end },
        names: [],
        keyword_loc: PM_LOCATION_TOKEN_VALUE(token),
    };
    return node;
}

/**
 * Append a name to an undef node.
 */
function pm_undef_node_append(node, name) {
    node.location.end = name.location.end;
    pm_node_list_append(node.names, name);
}

/**
 * Allocate a new UnlessNode node.
 */
function pm_unless_node_create(parser, keyword, predicate, then_keyword, statements) {
    pm_conditional_predicate(parser, predicate, PM_CONDITIONAL_PREDICATE_TYPE_CONDITIONAL);

    const end = statements === null ? predicate : statements;

    const node = {
        type: PM_UNLESS_NODE,
        flags: PM_NODE_FLAG_NEWLINE,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN_NODE(keyword, end)
        location: { start: keyword.start, end: end.location.end },
        keyword_loc: PM_LOCATION_TOKEN_VALUE(keyword),
        predicate,
        then_keyword_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(then_keyword),
        statements,
        else_clause: null,
        end_keyword_loc: PM_LOCATION_UNSET,
    };
    return node;
}

/**
 * Allocate and initialize new UnlessNode node in the modifier form.
 */
function pm_unless_node_modifier_create(parser, statement, unless_keyword, predicate) {
    pm_conditional_predicate(parser, predicate, PM_CONDITIONAL_PREDICATE_TYPE_CONDITIONAL);

    const statements = pm_statements_node_create(parser);
    pm_statements_node_body_append(parser, statements, statement, true);

    const node = {
        type: PM_UNLESS_NODE,
        flags: PM_NODE_FLAG_NEWLINE,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_NODES(statement, predicate)
        location: { start: statement.location.start, end: predicate.location.end },
        keyword_loc: PM_LOCATION_TOKEN_VALUE(unless_keyword),
        predicate,
        then_keyword_loc: PM_LOCATION_UNSET,
        statements,
        else_clause: null,
        end_keyword_loc: PM_LOCATION_UNSET,
    };
    return node;
}

function pm_unless_node_end_keyword_loc_set(node, end_keyword) {
    node.end_keyword_loc = PM_LOCATION_TOKEN_VALUE(end_keyword);
    node.location.end = end_keyword.end;
}

/**
 * Loop modifiers could potentially modify an expression that contains block
 * exits. In this case we need to loop through them and remove them from the
 * list of block exits so that they do not later get marked as invalid.
 */
function pm_loop_modifier_block_exits(parser, statements) {
    // assert(parser.current_block_exits !== null);

    // All of the block exits that we want to remove should be within the
    // statements, and since we are modifying the statements, we shouldn't have
    // to check the end location.
    const start = statements.location.start;

    for (let index = parser.current_block_exits.length; index > 0; index--) {
        const block_exit = parser.current_block_exits[index - 1];
        if (block_exit.location.start < start) break;

        // Implicitly remove from the list by lowering the size.
        parser.current_block_exits.length--;
    }
}

/**
 * Allocate a new UntilNode node.
 */
function pm_until_node_create(parser, keyword, do_keyword, closing, predicate, statements, flags) {
    pm_conditional_predicate(parser, predicate, PM_CONDITIONAL_PREDICATE_TYPE_CONDITIONAL);

    const node = {
        type: PM_UNTIL_NODE,
        flags,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKENS(keyword, closing)
        location: { start: keyword.start, end: closing.end },
        keyword_loc: PM_LOCATION_TOKEN_VALUE(keyword),
        do_keyword_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(do_keyword),
        closing_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(closing),
        predicate,
        statements,
    };
    return node;
}

/**
 * Allocate a new UntilNode node.
 */
function pm_until_node_modifier_create(parser, keyword, predicate, statements, flags) {
    pm_conditional_predicate(parser, predicate, PM_CONDITIONAL_PREDICATE_TYPE_CONDITIONAL);
    pm_loop_modifier_block_exits(parser, statements);

    const node = {
        type: PM_UNTIL_NODE,
        flags,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_NODES(statements, predicate)
        location: { start: statements.location.start, end: predicate.location.end },
        keyword_loc: PM_LOCATION_TOKEN_VALUE(keyword),
        do_keyword_loc: PM_LOCATION_UNSET,
        closing_loc: PM_LOCATION_UNSET,
        predicate,
        statements,
    };
    return node;
}

/**
 * Allocate and initialize a new WhenNode node.
 */
function pm_when_node_create(parser, keyword) {
    const node = {
        type: PM_WHEN_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKEN(keyword)
        location: { start: keyword.start, end: keyword.end },
        keyword_loc: PM_LOCATION_TOKEN_VALUE(keyword),
        conditions: [],
        then_keyword_loc: PM_LOCATION_UNSET,
        statements: null,
    };
    return node;
}

/**
 * Append a new condition to a when node.
 */
function pm_when_node_conditions_append(node, condition) {
    node.location.end = condition.location.end;
    pm_node_list_append(node.conditions, condition);
}

/**
 * Set the location of the then keyword of a when node.
 */
function pm_when_node_then_keyword_loc_set(node, then_keyword) {
    node.location.end = then_keyword.end;
    node.then_keyword_loc = PM_LOCATION_TOKEN_VALUE(then_keyword);
}

/**
 * Set the statements list of a when node.
 */
function pm_when_node_statements_set(node, statements) {
    if (statements.location.end > node.location.end) {
        node.location.end = statements.location.end;
    }

    node.statements = statements;
}

/**
 * Allocate a new WhileNode node.
 */
function pm_while_node_create(parser, keyword, do_keyword, closing, predicate, statements, flags) {
    pm_conditional_predicate(parser, predicate, PM_CONDITIONAL_PREDICATE_TYPE_CONDITIONAL);

    const node = {
        type: PM_WHILE_NODE,
        flags,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKENS(keyword, closing)
        location: { start: keyword.start, end: closing.end },
        keyword_loc: PM_LOCATION_TOKEN_VALUE(keyword),
        do_keyword_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(do_keyword),
        closing_loc: PM_OPTIONAL_LOCATION_TOKEN_VALUE(closing),
        predicate,
        statements,
    };
    return node;
}

/**
 * Allocate a new WhileNode node.
 */
function pm_while_node_modifier_create(parser, keyword, predicate, statements, flags) {
    pm_conditional_predicate(parser, predicate, PM_CONDITIONAL_PREDICATE_TYPE_CONDITIONAL);
    pm_loop_modifier_block_exits(parser, statements);

    const node = {
        type: PM_WHILE_NODE,
        flags,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_NODES(statements, predicate)
        location: { start: statements.location.start, end: predicate.location.end },
        keyword_loc: PM_LOCATION_TOKEN_VALUE(keyword),
        do_keyword_loc: PM_LOCATION_UNSET,
        closing_loc: PM_LOCATION_UNSET,
        predicate,
        statements,
    };
    return node;
}

/**
 * Allocate and initialize a new synthesized while loop.
 */
function pm_while_node_synthesized_create(parser, predicate, statements) {
    const node = {
        type: PM_WHILE_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_BASE
        location: { start: parser.start, end: parser.start },
        keyword_loc: PM_LOCATION_NULL_VALUE(parser),
        do_keyword_loc: PM_LOCATION_NULL_VALUE(parser),
        closing_loc: PM_LOCATION_NULL_VALUE(parser),
        predicate,
        statements,
    };
    return node;
}

/**
 * Allocate and initialize a new XStringNode node with the given unescaped
 * string.
 */
function pm_xstring_node_create_unescaped(parser, opening, content, closing, unescaped) {
    const node = {
        type: PM_X_STRING_NODE,
        flags: PM_STRING_FLAGS_FROZEN,
        node_id: ++parser.node_id,
        // PM_NODE_INIT_TOKENS(opening, closing)
        location: { start: opening.start, end: closing.end },
        opening_loc: PM_LOCATION_TOKEN_VALUE(opening),
        content_loc: PM_LOCATION_TOKEN_VALUE(content),
        closing_loc: PM_LOCATION_TOKEN_VALUE(closing),
        unescaped,
    };
    return node;
}

/**
 * Allocate and initialize a new XStringNode node.
 */
function pm_xstring_node_create(parser, opening, content, closing) {
    return pm_xstring_node_create_unescaped(parser, opening, content, closing, "");
}

/**
 * Allocate a new YieldNode node.
 */
function pm_yield_node_create(parser, keyword, lparen_loc, arguments_, rparen_loc) {
    let end;
    if (rparen_loc.start !== null) {
        end = rparen_loc.end;
    } else if (arguments_ !== null) {
        end = arguments_.location.end;
    } else if (lparen_loc.start !== null) {
        end = lparen_loc.end;
    } else {
        end = keyword.end;
    }

    const node = {
        type: PM_YIELD_NODE,
        flags: 0,
        node_id: ++parser.node_id,
        // PM_NODE_INIT(keyword.start, end)
        location: { start: keyword.start, end },
        keyword_loc: PM_LOCATION_TOKEN_VALUE(keyword),
        lparen_loc: { start: lparen_loc.start, end: lparen_loc.end },
        arguments: arguments_,
        rparen_loc: { start: rparen_loc.start, end: rparen_loc.end },
    };
    return node;
}
