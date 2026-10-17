// prism.c lines 15357-17424 converted to JavaScript (ES2022).
//
// This is a plain fragment: it declares consts/functions only, no
// import/export. It relies on part1-part5, ast.js, node.js, diagnostic.js,
// options.js, encoding.js, regexp.js, static_literals.js, token_type.js and
// the util modules being concatenated/imported around it.
//
// Adaptation notes for the integrator:
// - parse_operator_symbol_name (prism.c:15512) is NOT defined here; part2 owns
//   its definition (with a (parser, name) adaptation). Call sites keep the
//   part2 signature.
// - parse_pattern is forward-declared at prism.c:16174 and defined at
//   prism.c:16978 (both inside this range). Function declarations hoist in
//   JS, so only the definition appears here.
// - C struct copies of tokens (`pm_token_t x = parser->current/->previous`)
//   become fresh `{ type, start, end }` snapshots, because parser.current is
//   mutated in place by the lexer and expect1/expect1_opening mutate
//   parser.previous in place.
// - C struct copies of pm_string_t (`unescaped = parser->current_string`)
//   become shallow field-wise copies ({ type, length, source }); the lexer
//   reinitializes parser.current_string in place through pm_string_*_init.
// - `unescaped = PM_STRING_EMPTY` becomes `""` (value
//   copy of the C global).
// - The *_create factories from part2 alias PM_STRING_EMPTY into new nodes'
//   unescaped field; where C immediately does
//   pm_string_shared_init(&node->unescaped, ...) afterwards, we assign the
//   real value directly. (An earlier conversion pass detached onto a
//   freshly-zeroed pm_string_t first, mirroring C's aliasing-mutation
//   hazard; that hazard doesn't exist for JS strings, which are immutable
//   value types, so the detach step was a dead store and has been removed.)
// - parse_heredoc_dedent_string replicates C's memmove over the owned bytes
//   with Uint8Array.prototype.copyWithin; pm_string_ensure_owned guarantees
//   string.source is a private, writable copy before the byte-shifting.
// - parse_regular_expression_error receives offsets relative to the source
//   handed to pm_regexp_parse (C received absolute pointers). When the
//   unescaped string is shared, error_data.base carries the view's base offset
//   within parser.source so locations stay absolute like in C.
// - xfree calls vanish (garbage collection).
// - asserts are debug-only in C and are kept as comments only.
// - Pointers are numeric offsets; NULL becomes null (-1 where a helper
//   returns offsets, matching prior parts).

/******************************************************************************/
/* String unescaped encoding                                                  */
/******************************************************************************/

/**
 * Return the flags that should be applied to an unescaped string based on the
 * explicit encoding of the parser. (prism.c:15357)
 */
function parse_unescaped_encoding(parser) {
    // UNI-BUILD: C keys off encoding-entry identity; here explicit_encoding
    // holds a family sentinel set by the escape writers:
    //   "utf8"     - a `\u` escape, or a `\xNN` escape in a UTF-8 source
    //   "us-ascii" - a `\xNN` escape in a US-ASCII source
    //   "other"    - a `\xNN` escape in a non-ASCII source (EUC-JP, binary...)
    // C: `\u` -> FORCED_UTF8; `\x` -> FORCED_UTF8 if the source is UTF-8,
    // FORCED_BINARY if the source is US-ASCII, else 0.
    if (parser.explicit_encoding === "utf8") {
        return PM_STRING_FLAGS_FORCED_UTF8_ENCODING;
    }
    if (parser.explicit_encoding === "us-ascii") {
        return PM_STRING_FLAGS_FORCED_BINARY_ENCODING;
    }
    return 0;
}

/**
 * Parse a node that is part of a string. If the subsequent tokens cannot be
 * parsed as a string part, then NULL is returned. (prism.c:15379)
 */
function parse_string_part(parser, depth) {
    switch (parser.current.type) {
        // Here the lexer has returned to us plain string content. In this case
        // we'll create a string node that has no opening or closing and return that
        // as the part. These kinds of parts look like:
        //
        //     "aaa #{bbb} #@ccc ddd"
        //      ^^^^      ^     ^^^^
        case PM_TOKEN_STRING_CONTENT: {
            const opening = not_provided(parser);
            const closing = not_provided(parser);

            const node = pm_string_node_create_current_string(parser, opening, parser.current, closing);
            pm_node_flag_set(node, parse_unescaped_encoding(parser));

            parser_lex(parser);
            return node;
        }
        // Here the lexer has returned the beginning of an embedded expression. In
        // that case we'll parse the inner statements and return that as the part.
        // These kinds of parts look like:
        //
        //     "aaa #{bbb} #@ccc ddd"
        //          ^^^^^^
        case PM_TOKEN_EMBEXPR_BEGIN: {
            // Ruby disallows seeing encoding around interpolation in strings,
            // even though it is known at parse time.
            parser.explicit_encoding = null;

            const state = parser.lex_state;
            const brace_nesting = parser.brace_nesting;

            parser.brace_nesting = 0;
            lex_state_set(parser, PM_LEX_STATE_BEG);
            parser_lex(parser);

            const opening = copyToken(parser.previous);
            let statements = null;

            if (!match1(parser, PM_TOKEN_EMBEXPR_END)) {
                pm_accepts_block_stack_push(parser, true);
                statements = parse_statements(parser, PM_CONTEXT_EMBEXPR, depth + 1);
                pm_accepts_block_stack_pop(parser);
            }

            parser.brace_nesting = brace_nesting;
            lex_state_set(parser, state);

            expect1(parser, PM_TOKEN_EMBEXPR_END, PM_ERR_EMBEXPR_END);
            const closing = copyToken(parser.previous);

            // If this set of embedded statements only contains a single
            // statement, then Ruby does not consider it as a possible statement
            // that could emit a line event.
            if (statements?.body.length === 1) {
                pm_node_flag_unset(statements.body[0], PM_NODE_FLAG_NEWLINE);
            }

            return pm_embedded_statements_node_create(parser, opening, statements, closing);
        }

        // Here the lexer has returned the beginning of an embedded variable.
        // In that case we'll parse the variable and create an appropriate node
        // for it and then return that node. These kinds of parts look like:
        //
        //     "aaa #{bbb} #@ccc ddd"
        //                 ^^^^^
        case PM_TOKEN_EMBVAR: {
            // Ruby disallows seeing encoding around interpolation in strings,
            // even though it is known at parse time.
            parser.explicit_encoding = null;

            lex_state_set(parser, PM_LEX_STATE_BEG);
            parser_lex(parser);

            const operator = copyToken(parser.previous);
            let variable;

            switch (parser.current.type) {
                // In this case a back reference is being interpolated. We'll
                // create a global variable read node.
                case PM_TOKEN_BACK_REFERENCE:
                    parser_lex(parser);
                    variable = pm_back_reference_read_node_create(parser, parser.previous);
                    break;
                // In this case an nth reference is being interpolated. We'll
                // create a global variable read node.
                case PM_TOKEN_NUMBERED_REFERENCE:
                    parser_lex(parser);
                    variable = pm_numbered_reference_read_node_create(parser, parser.previous);
                    break;
                // In this case a global variable is being interpolated. We'll
                // create a global variable read node.
                case PM_TOKEN_GLOBAL_VARIABLE:
                    parser_lex(parser);
                    variable = pm_global_variable_read_node_create(parser, parser.previous);
                    break;
                // In this case an instance variable is being interpolated.
                // We'll create an instance variable read node.
                case PM_TOKEN_INSTANCE_VARIABLE:
                    parser_lex(parser);
                    variable = pm_instance_variable_read_node_create(parser, parser.previous);
                    break;
                // In this case a class variable is being interpolated.
                // We'll create a class variable read node.
                case PM_TOKEN_CLASS_VARIABLE:
                    parser_lex(parser);
                    variable = pm_class_variable_read_node_create(parser, parser.previous);
                    break;
                // We can hit here if we got an invalid token. In that case
                // we'll not attempt to lex this token and instead just return a
                // missing node.
                default:
                    expect1(parser, PM_TOKEN_IDENTIFIER, PM_ERR_EMBVAR_INVALID);
                    variable = pm_missing_node_create(parser, parser.current.start, parser.current.end);
                    break;
            }

            return pm_embedded_variable_node_create(parser, operator, variable);
        }
        default:
            parser_lex(parser);
            pm_parser_err_previous(parser, PM_ERR_CANNOT_PARSE_STRING_PART);
            return null;
    }
}

// parse_operator_symbol_name (prism.c:15512) is defined in part2; skip its
// definition here and use the part2 (parser, name) signature at call sites.

/**
 * When creating a symbol, unary operators that cannot be binary operators
 * automatically drop trailing `@` characters. This happens at the parser level,
 * such that `~@` is parsed as `~` and `!@` is parsed as `!`. We do that here.
 * (prism.c:15524)
 */
function parse_operator_symbol(parser, opening, next_state) {
    const closing = not_provided(parser);
    const symbol = pm_symbol_node_create(parser, opening, parser.current, closing);

    const end = parse_operator_symbol_name(parser, parser.current);

    if (next_state !== PM_LEX_STATE_NONE) lex_state_set(parser, next_state);
    parser_lex(parser);

    symbol.unescaped = parser.source.slice(parser.previous.start, end);
    pm_node_flag_set(symbol, PM_SYMBOL_FLAGS_FORCED_US_ASCII_ENCODING);

    return symbol;
}

/**
 * Parse a symbol node. This function will get called immediately after finding
 * a symbol opening token. This handles parsing bare symbols and interpolated
 * symbols. (prism.c:15545)
 */
function parse_symbol(parser, lex_mode, next_state, depth) {
    const opening = copyToken(parser.previous);

    if (lex_mode.mode !== PM_LEX_STRING) {
        if (next_state !== PM_LEX_STATE_NONE) lex_state_set(parser, next_state);

        if (PM_CASE_OPERATOR.has(parser.current.type)) {
            return parse_operator_symbol(parser, opening, next_state === PM_LEX_STATE_NONE ? PM_LEX_STATE_ENDFN : next_state);
        } else if (
            parser.current.type === PM_TOKEN_IDENTIFIER ||
            parser.current.type === PM_TOKEN_CONSTANT ||
            parser.current.type === PM_TOKEN_INSTANCE_VARIABLE ||
            parser.current.type === PM_TOKEN_METHOD_NAME ||
            parser.current.type === PM_TOKEN_CLASS_VARIABLE ||
            parser.current.type === PM_TOKEN_GLOBAL_VARIABLE ||
            parser.current.type === PM_TOKEN_NUMBERED_REFERENCE ||
            parser.current.type === PM_TOKEN_BACK_REFERENCE ||
            PM_CASE_KEYWORD.has(parser.current.type)
        ) {
            parser_lex(parser);
        } else {
            expect2(parser, PM_TOKEN_IDENTIFIER, PM_TOKEN_METHOD_NAME, PM_ERR_SYMBOL_INVALID);
        }

        const closing = not_provided(parser);
        const symbol = pm_symbol_node_create(parser, opening, parser.previous, closing);

        symbol.unescaped = parser.source.slice(parser.previous.start, parser.previous.end);
        pm_node_flag_set(symbol, parse_symbol_encoding(parser, parser.previous, symbol.unescaped, false));

        return symbol;
    }

    if (lex_mode.as.string.interpolation) {
        // If we have the end of the symbol, then we can return an empty symbol.
        if (match1(parser, PM_TOKEN_STRING_END)) {
            if (next_state !== PM_LEX_STATE_NONE) lex_state_set(parser, next_state);
            parser_lex(parser);

            const content = not_provided(parser);
            const closing = copyToken(parser.previous);
            return pm_symbol_node_create(parser, opening, content, closing);
        }

        // Now we can parse the first part of the symbol.
        let part = parse_string_part(parser, depth + 1);

        // If we got a string part, then it's possible that we could transform
        // what looks like an interpolated symbol into a regular symbol.
        if (part && PM_NODE_TYPE_P(part, PM_STRING_NODE) && match2(parser, PM_TOKEN_STRING_END, PM_TOKEN_EOF)) {
            if (next_state !== PM_LEX_STATE_NONE) lex_state_set(parser, next_state);
            expect1(parser, PM_TOKEN_STRING_END, PM_ERR_SYMBOL_TERM_INTERPOLATED);

            return pm_string_node_to_symbol_node(parser, part, opening, parser.previous);
        }

        const symbol = pm_interpolated_symbol_node_create(parser, opening, null, opening);
        if (part) pm_interpolated_symbol_node_append(symbol, part);

        while (!match2(parser, PM_TOKEN_STRING_END, PM_TOKEN_EOF)) {
            if ((part = parse_string_part(parser, depth + 1)) !== null) {
                pm_interpolated_symbol_node_append(symbol, part);
            }
        }

        if (next_state !== PM_LEX_STATE_NONE) lex_state_set(parser, next_state);
        if (match1(parser, PM_TOKEN_EOF)) {
            pm_parser_err_token(parser, opening, PM_ERR_SYMBOL_TERM_INTERPOLATED);
        } else {
            expect1(parser, PM_TOKEN_STRING_END, PM_ERR_SYMBOL_TERM_INTERPOLATED);
        }

        pm_interpolated_symbol_node_closing_loc_set(symbol, parser.previous);
        return symbol;
    }

    let content;
    let unescaped;

    if (match1(parser, PM_TOKEN_STRING_CONTENT)) {
        content = copyToken(parser.current);
        unescaped = parser.current_string;
        parser_lex(parser);

        // If we have two string contents in a row, then the content of this
        // symbol is split because of heredoc contents. This looks like:
        //
        // <<A; :'a
        // A
        // b'
        //
        // In this case, the best way we have to represent this is as an
        // interpolated string node, so that's what we'll do here.
        if (match1(parser, PM_TOKEN_STRING_CONTENT)) {
            const symbol = pm_interpolated_symbol_node_create(parser, opening, null, opening);
            const bounds = not_provided(parser);

            let part = pm_string_node_create_unescaped(parser, bounds, content, bounds, unescaped);
            pm_interpolated_symbol_node_append(symbol, part);

            // C copies the pm_string_t struct by value; JS strings are
            // immutable and assigned by value, so pass the string directly.
            part = pm_string_node_create_unescaped(parser, bounds, parser.current, bounds, parser.current_string);
            pm_interpolated_symbol_node_append(symbol, part);

            if (next_state !== PM_LEX_STATE_NONE) {
                lex_state_set(parser, next_state);
            }

            parser_lex(parser);
            expect1(parser, PM_TOKEN_STRING_END, PM_ERR_SYMBOL_TERM_DYNAMIC);

            pm_interpolated_symbol_node_closing_loc_set(symbol, parser.previous);
            return symbol;
        }
    } else {
        content = { type: PM_TOKEN_STRING_CONTENT, start: parser.previous.end, end: parser.previous.end };
        unescaped = parser.source.slice(content.start, content.end);
    }

    if (next_state !== PM_LEX_STATE_NONE) {
        lex_state_set(parser, next_state);
    }

    if (match1(parser, PM_TOKEN_EOF)) {
        pm_parser_err_token(parser, opening, PM_ERR_SYMBOL_TERM_DYNAMIC);
    } else {
        expect1(parser, PM_TOKEN_STRING_END, PM_ERR_SYMBOL_TERM_DYNAMIC);
    }

    return pm_symbol_node_create_unescaped(parser, opening, content, parser.previous, unescaped, parse_symbol_encoding(parser, content, unescaped, false));
}

/**
 * Parse an argument to undef which can either be a bare word, a symbol, a
 * constant, or an interpolated symbol. (prism.c:15682)
 */
function parse_undef_argument(parser, depth) {
    if (PM_CASE_OPERATOR.has(parser.current.type)) {
        const opening = not_provided(parser);
        return parse_operator_symbol(parser, opening, PM_LEX_STATE_NONE);
    } else if (
        PM_CASE_KEYWORD.has(parser.current.type) ||
        parser.current.type === PM_TOKEN_CONSTANT ||
        parser.current.type === PM_TOKEN_IDENTIFIER ||
        parser.current.type === PM_TOKEN_METHOD_NAME
    ) {
        parser_lex(parser);

        const opening = not_provided(parser);
        const closing = not_provided(parser);
        const symbol = pm_symbol_node_create(parser, opening, parser.previous, closing);

        symbol.unescaped = parser.source.slice(parser.previous.start, parser.previous.end);
        pm_node_flag_set(symbol, parse_symbol_encoding(parser, parser.previous, symbol.unescaped, false));

        return symbol;
    } else if (parser.current.type === PM_TOKEN_SYMBOL_BEGIN) {
        // pm_lex_mode_t lex_mode = *parser->lex_modes.current; (struct value
        // copy; snapshot what parse_symbol reads so later mode pops/pushes
        // cannot mutate it under us)
        const current_mode = parser.lex_modes.current;
        const lex_mode = {
            mode: current_mode.mode,
            as: {
                list: null,
                regexp: null,
                string: current_mode.as.string === null ? null : { ...current_mode.as.string }
            },
            prev: null
        };
        parser_lex(parser);

        return parse_symbol(parser, lex_mode, PM_LEX_STATE_NONE, depth + 1);
    } else {
        pm_parser_err_current(parser, PM_ERR_UNDEF_ARGUMENT);
        return pm_missing_node_create(parser, parser.current.start, parser.current.end);
    }
}

/**
 * Parse an argument to alias which can either be a bare word, a symbol, an
 * interpolated symbol or a global variable. If this is the first argument, then
 * we need to set the lex state to PM_LEX_STATE_FNAME | PM_LEX_STATE_FITEM
 * between the first and second arguments. (prism.c:15722)
 */
function parse_alias_argument(parser, first, depth) {
    if (PM_CASE_OPERATOR.has(parser.current.type)) {
        const opening = not_provided(parser);
        return parse_operator_symbol(parser, opening, first ? (PM_LEX_STATE_FNAME | PM_LEX_STATE_FITEM) : PM_LEX_STATE_NONE);
    } else if (
        PM_CASE_KEYWORD.has(parser.current.type) ||
        parser.current.type === PM_TOKEN_CONSTANT ||
        parser.current.type === PM_TOKEN_IDENTIFIER ||
        parser.current.type === PM_TOKEN_METHOD_NAME
    ) {
        if (first) lex_state_set(parser, PM_LEX_STATE_FNAME | PM_LEX_STATE_FITEM);
        parser_lex(parser);

        const opening = not_provided(parser);
        const closing = not_provided(parser);
        const symbol = pm_symbol_node_create(parser, opening, parser.previous, closing);

        symbol.unescaped = parser.source.slice(parser.previous.start, parser.previous.end);
        pm_node_flag_set(symbol, parse_symbol_encoding(parser, parser.previous, symbol.unescaped, false));

        return symbol;
    } else if (parser.current.type === PM_TOKEN_SYMBOL_BEGIN) {
        // pm_lex_mode_t lex_mode = *parser->lex_modes.current; (struct value
        // copy; see parse_undef_argument)
        const current_mode = parser.lex_modes.current;
        const lex_mode = {
            mode: current_mode.mode,
            as: {
                list: null,
                regexp: null,
                string: current_mode.as.string === null ? null : { ...current_mode.as.string }
            },
            prev: null
        };
        parser_lex(parser);

        return parse_symbol(parser, lex_mode, first ? (PM_LEX_STATE_FNAME | PM_LEX_STATE_FITEM) : PM_LEX_STATE_NONE, depth + 1);
    } else if (parser.current.type === PM_TOKEN_BACK_REFERENCE) {
        parser_lex(parser);
        return pm_back_reference_read_node_create(parser, parser.previous);
    } else if (parser.current.type === PM_TOKEN_NUMBERED_REFERENCE) {
        parser_lex(parser);
        return pm_numbered_reference_read_node_create(parser, parser.previous);
    } else if (parser.current.type === PM_TOKEN_GLOBAL_VARIABLE) {
        parser_lex(parser);
        return pm_global_variable_read_node_create(parser, parser.previous);
    } else {
        pm_parser_err_current(parser, PM_ERR_ALIAS_ARGUMENT);
        return pm_missing_node_create(parser, parser.current.start, parser.current.end);
    }
}

/**
 * Parse an identifier into either a local variable read. If the local variable
 * is not found, it returns NULL instead. (prism.c:15770)
 */
function parse_variable(parser) {
    const name_id = pm_parser_constant_id_token(parser, parser.previous);
    const is_numbered_param = pm_token_is_numbered_parameter(parser.source, parser.previous.start, parser.previous.end);
    const depth = is_numbered_param ? -1 : pm_parser_local_depth_constant_id(parser, name_id);

    if (!is_numbered_param && depth !== -1) {
        return pm_local_variable_read_node_create_constant_id(parser, parser.previous, name_id, depth, false);
    }

    const current_scope = parser.current_scope;
    if (!current_scope.closed && !((current_scope.parameters & PM_SCOPE_PARAMETERS_IMPLICIT_DISALLOWED) !== 0)) {
        if (is_numbered_param) {
            // When you use a numbered parameter, it implies the existence of
            // all of the locals that exist before it. For example, referencing
            // _2 means that _1 must exist. Therefore here we loop through all
            // of the possibilities and add them into the constant pool.
            const maximum = (parser.source.charCodeAt(parser.previous.start + 1)) - 48 /* '0' */;
            for (let number = 1; number <= maximum; number++) {
                pm_parser_local_add_constant(parser, pm_numbered_parameter_names[number - 1], 2);
            }

            if (!match1(parser, PM_TOKEN_EQUAL)) {
                current_scope.parameters |= PM_SCOPE_PARAMETERS_NUMBERED_FOUND;
            }

            const node = pm_local_variable_read_node_create_constant_id(parser, parser.previous, name_id, 0, false);
            pm_node_list_append(current_scope.implicit_parameters, node);

            return node;
        } else if ((parser.version >= PM_OPTIONS_VERSION_CRUBY_3_4) && pm_token_is_it(parser.source, parser.previous.start, parser.previous.end)) {
            const node = pm_it_local_variable_read_node_create(parser, parser.previous);
            pm_node_list_append(current_scope.implicit_parameters, node);

            return node;
        }
    }

    return null;
}

/**
 * Parse an identifier into either a local variable read or a call.
 * (prism.c:15814)
 */
function parse_variable_call(parser) {
    let flags = 0;

    const previous_last_char = parser.source.charCodeAt(parser.previous.end - 1);
    if (!match1(parser, PM_TOKEN_PARENTHESIS_LEFT) && (previous_last_char !== 33 /* '!' */) && (previous_last_char !== 63 /* '?' */)) {
        const node = parse_variable(parser);
        if (node !== null) return node;
        flags |= PM_CALL_NODE_FLAGS_VARIABLE_CALL;
    }

    const node = pm_call_node_variable_call_create(parser, parser.previous);
    pm_node_flag_set(node, flags);

    return node;
}

/**
 * Parse the method definition name based on the current token available on the
 * parser. If it does not match a valid method definition name, then a missing
 * token is returned. (prism.c:15835)
 */
function parse_method_definition_name(parser) {
    if (PM_CASE_KEYWORD.has(parser.current.type)) {
        parser_lex(parser);
        return copyToken(parser.previous);
    } else if (parser.current.type === PM_TOKEN_CONSTANT || parser.current.type === PM_TOKEN_METHOD_NAME) {
        parser_lex(parser);
        return copyToken(parser.previous);
    } else if (parser.current.type === PM_TOKEN_IDENTIFIER) {
        pm_refute_numbered_parameter(parser, parser.current.start, parser.current.end);
        parser_lex(parser);
        return copyToken(parser.previous);
    } else if (PM_CASE_OPERATOR.has(parser.current.type)) {
        lex_state_set(parser, PM_LEX_STATE_ENDFN);
        parser_lex(parser);
        return copyToken(parser.previous);
    } else {
        PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, PM_ERR_DEF_NAME, pm_token_type_human(parser.current.type));
        return { type: PM_TOKEN_MISSING, start: parser.current.start, end: parser.current.end };
    }
}

/******************************************************************************/
/* Heredoc dedenting                                                          */
/******************************************************************************/

/**
 * Dedent a string by the given amount of common whitespace, mutating the bytes
 * of the owned copy in place (the JS equivalent of C's memmove).
 * (prism.c:15857)
 */
function parse_heredoc_dedent_string(string, common_whitespace) { // returns the dedented text
    // Strings are immutable in JS: instead of C's in-place memmove we build
    // and return the dedented slice.
    const source = string || "";
    let source_cursor = 0;
    const source_end = source.length;

    // We're going to move bytes backward in the string when we get leading
    // whitespace, so we'll maintain a pointer to the current position in the
    // string that we're writing to.
    let trimmed_whitespace = 0;

    // While we haven't reached the amount of common whitespace that we need to
    // trim and we haven't reached the end of the string, we'll keep trimming
    // whitespace. Trimming in this context means skipping over these bytes such
    // that they aren't copied into the new string.
    while ((source_cursor < source_end) && pm_char_is_inline_whitespace((source.charCodeAt(source_cursor))) && trimmed_whitespace < common_whitespace) {
        if ((source.charCodeAt(source_cursor)) === 9 /* '\t' */) {
            trimmed_whitespace = Math.floor(trimmed_whitespace / PM_TAB_WHITESPACE_SIZE + 1) * PM_TAB_WHITESPACE_SIZE;
            if (trimmed_whitespace > common_whitespace) break;
        } else {
            trimmed_whitespace++;
        }

        source_cursor++;
    }

    return source.slice(source_cursor, source_end);
}

/**
 * Take a heredoc node that is indented by a ~ and trim the leading whitespace.
 * (prism.c:15898)
 */
function parse_heredoc_dedent(parser, nodes, common_whitespace) {
    // The next node should be dedented if it's the first node in the list or if
    // it follows a string node.
    let dedent_next = true;

    // Iterate over all nodes, and trim whitespace accordingly. We're going to
    // keep around two indices: a read and a write. If we end up trimming all of
    // the whitespace from a node, then we'll drop it from the list entirely.
    let write_index = 0;

    for (let read_index = 0; read_index < nodes.length; read_index++) {
        const node = nodes[read_index];

        // We're not manipulating child nodes that aren't strings. In this case
        // we'll skip past it and indicate that the subsequent node should not
        // be dedented.
        if (!PM_NODE_TYPE_P(node, PM_STRING_NODE)) {
            nodes[write_index++] = node;
            dedent_next = false;
            continue;
        }

        const string_node = node;
        if (dedent_next) {
            string_node.unescaped = parse_heredoc_dedent_string(string_node.unescaped, common_whitespace);
        }

        if (string_node.unescaped.length === 0) {
        } else {
            nodes[write_index++] = node;
        }

        // We always dedent the next node if it follows a string node.
        dedent_next = true;
    }

    nodes.length = write_index;
}

/******************************************************************************/
/* Strings                                                                    */
/******************************************************************************/

/**
 * Return a string content token at a particular location that is empty.
 * (prism.c:15941)
 */
function parse_strings_empty_content(location) {
    return { type: PM_TOKEN_STRING_CONTENT, start: location, end: location };
}

/**
 * Parse a set of strings that could be concatenated together.
 * (prism.c:15949)
 */
function parse_strings(parser, current, accepts_label, depth) {
    // assert(parser.current.type === PM_TOKEN_STRING_BEGIN);
    let concating = false;

    while (match1(parser, PM_TOKEN_STRING_BEGIN)) {
        let node = null;

        // Here we have found a string literal. We'll parse it and add it to
        // the list of strings.
        const lex_mode = parser.lex_modes.current;
        // assert(lex_mode.mode === PM_LEX_STRING);
        const lex_interpolation = lex_mode.as.string.interpolation;
        const label_allowed = lex_mode.as.string.label_allowed && accepts_label;

        const opening = copyToken(parser.current);
        parser_lex(parser);

        if (match2(parser, PM_TOKEN_STRING_END, PM_TOKEN_EOF)) {
            expect1(parser, PM_TOKEN_STRING_END, PM_ERR_STRING_LITERAL_EOF);
            // If we get here, then we have an end immediately after a
            // start. In that case we'll create an empty content token and
            // return an uninterpolated string.
            const content = parse_strings_empty_content(parser.previous.start);
            const string = pm_string_node_create(parser, opening, content, parser.previous);

            string.unescaped = parser.source.slice(content.start, content.end);
            node = string;
        } else if (accept1(parser, PM_TOKEN_LABEL_END)) {
            // If we get here, then we have an end of a label immediately
            // after a start. In that case we'll create an empty symbol
            // node.
            const content = parse_strings_empty_content(parser.previous.start);
            const symbol = pm_symbol_node_create(parser, opening, content, parser.previous);

            symbol.unescaped = parser.source.slice(content.start, content.end);
            node = symbol;

            if (!label_allowed) pm_parser_err_node(parser, node, PM_ERR_UNEXPECTED_LABEL);
        } else if (!lex_interpolation) {
            // If we don't accept interpolation then we expect the string to
            // start with a single string content node.
            let unescaped;
            let content;

            if (match1(parser, PM_TOKEN_EOF)) {
                // unescaped = ""; (struct copy in C)
                unescaped = "";
                content = not_provided(parser);
            } else {
                // unescaped = parser->current_string; (struct copy in C; the
                // lexer reinitializes the original through pm_string_*_init)
                unescaped = parser.current_string;
                expect1(parser, PM_TOKEN_STRING_CONTENT, PM_ERR_EXPECT_STRING_CONTENT);
                content = copyToken(parser.previous);
            }

            // It is unfortunately possible to have multiple string content
            // nodes in a row in the case that there's heredoc content in
            // the middle of the string, like this cursed example:
            //
            // <<-END+'b
            //  a
            // END
            //  c'+'d'
            //
            // In that case we need to switch to an interpolated string to
            // be able to contain all of the parts.
            if (match1(parser, PM_TOKEN_STRING_CONTENT)) {
                const parts = [];

                const delimiters = not_provided(parser);
                let part = pm_string_node_create_unescaped(parser, delimiters, content, delimiters, unescaped);
                pm_node_list_append(parts, part);

                do {
                    part = pm_string_node_create_current_string(parser, delimiters, parser.current, delimiters);
                    pm_node_list_append(parts, part);
                    parser_lex(parser);
                } while (match1(parser, PM_TOKEN_STRING_CONTENT));

                expect1(parser, PM_TOKEN_STRING_END, PM_ERR_STRING_LITERAL_EOF);
                node = pm_interpolated_string_node_create(parser, opening, parts, parser.previous);

            } else if (accept1(parser, PM_TOKEN_LABEL_END)) {
                node = pm_symbol_node_create_unescaped(parser, opening, content, parser.previous, unescaped, parse_symbol_encoding(parser, content, unescaped, true));
                if (!label_allowed) pm_parser_err_node(parser, node, PM_ERR_UNEXPECTED_LABEL);
            } else if (match1(parser, PM_TOKEN_EOF)) {
                pm_parser_err_token(parser, opening, PM_ERR_STRING_LITERAL_EOF);
                node = pm_string_node_create_unescaped(parser, opening, content, parser.current, unescaped);
            } else if (accept1(parser, PM_TOKEN_STRING_END)) {
                node = pm_string_node_create_unescaped(parser, opening, content, parser.previous, unescaped);
            } else {
                PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.previous, PM_ERR_STRING_LITERAL_TERM, pm_token_type_human(parser.previous.type));
                parser.previous.start = parser.previous.end;
                parser.previous.type = PM_TOKEN_MISSING;
                node = pm_string_node_create_unescaped(parser, opening, content, parser.previous, unescaped);
            }
        } else if (match1(parser, PM_TOKEN_STRING_CONTENT)) {
            // In this case we've hit string content so we know the string
            // at least has something in it. We'll need to check if the
            // following token is the end (in which case we can return a
            // plain string) or if it's not then it has interpolation.
            const content = copyToken(parser.current);
            // unescaped = parser->current_string; (struct copy in C)
            const unescaped = parser.current_string;
            parser_lex(parser);

            if (match2(parser, PM_TOKEN_STRING_END, PM_TOKEN_EOF)) {
                node = pm_string_node_create_unescaped(parser, opening, content, parser.current, unescaped);
                pm_node_flag_set(node, parse_unescaped_encoding(parser));

                // Kind of odd behavior, but basically if we have an
                // unterminated string and it ends in a newline, we back up one
                // character so that the error message is on the last line of
                // content in the string.
                if (!accept1(parser, PM_TOKEN_STRING_END)) {
                    let location = parser.previous.end;
                    if (location > parser.start && (parser.source.charCodeAt(location - 1)) === 10 /* '\n' */) location--;
                    pm_parser_err(parser, location, location, PM_ERR_STRING_LITERAL_EOF);

                    parser.previous.start = parser.previous.end;
                    parser.previous.type = PM_TOKEN_MISSING;
                }
            } else if (accept1(parser, PM_TOKEN_LABEL_END)) {
                node = pm_symbol_node_create_unescaped(parser, opening, content, parser.previous, unescaped, parse_symbol_encoding(parser, content, unescaped, true));
                if (!label_allowed) pm_parser_err_node(parser, node, PM_ERR_UNEXPECTED_LABEL);
            } else {
                // If we get here, then we have interpolation so we'll need
                // to create a string or symbol node with interpolation.
                const parts = [];
                const string_opening = not_provided(parser);
                const string_closing = not_provided(parser);

                let part = pm_string_node_create_unescaped(parser, string_opening, parser.previous, string_closing, unescaped);
                pm_node_flag_set(part, parse_unescaped_encoding(parser));
                pm_node_list_append(parts, part);

                while (!match3(parser, PM_TOKEN_STRING_END, PM_TOKEN_LABEL_END, PM_TOKEN_EOF)) {
                    if ((part = parse_string_part(parser, depth + 1)) !== null) {
                        pm_node_list_append(parts, part);
                    }
                }

                if (accept1(parser, PM_TOKEN_LABEL_END)) {
                    node = pm_interpolated_symbol_node_create(parser, opening, parts, parser.previous);
                    if (!label_allowed) pm_parser_err_node(parser, node, PM_ERR_UNEXPECTED_LABEL);
                } else if (match1(parser, PM_TOKEN_EOF)) {
                    pm_parser_err_token(parser, opening, PM_ERR_STRING_INTERPOLATED_TERM);
                    node = pm_interpolated_string_node_create(parser, opening, parts, parser.current);
                } else {
                    expect1(parser, PM_TOKEN_STRING_END, PM_ERR_STRING_INTERPOLATED_TERM);
                    node = pm_interpolated_string_node_create(parser, opening, parts, parser.previous);
                }

            }
        } else {
            // If we get here, then the first part of the string is not plain
            // string content, in which case we need to parse the string as an
            // interpolated string.
            const parts = [];
            let part;

            while (!match3(parser, PM_TOKEN_STRING_END, PM_TOKEN_LABEL_END, PM_TOKEN_EOF)) {
                if ((part = parse_string_part(parser, depth + 1)) !== null) {
                    pm_node_list_append(parts, part);
                }
            }

            if (accept1(parser, PM_TOKEN_LABEL_END)) {
                node = pm_interpolated_symbol_node_create(parser, opening, parts, parser.previous);
                if (!label_allowed) pm_parser_err_node(parser, node, PM_ERR_UNEXPECTED_LABEL);
            } else if (match1(parser, PM_TOKEN_EOF)) {
                pm_parser_err_token(parser, opening, PM_ERR_STRING_INTERPOLATED_TERM);
                node = pm_interpolated_string_node_create(parser, opening, parts, parser.current);
            } else {
                expect1(parser, PM_TOKEN_STRING_END, PM_ERR_STRING_INTERPOLATED_TERM);
                node = pm_interpolated_string_node_create(parser, opening, parts, parser.previous);
            }

        }

        if (current === null) {
            // If the node we just parsed is a symbol node, then we can't
            // concatenate it with anything else, so we can now return that
            // node.
            if (PM_NODE_TYPE_P(node, PM_SYMBOL_NODE) || PM_NODE_TYPE_P(node, PM_INTERPOLATED_SYMBOL_NODE)) {
                return node;
            }

            // If we don't already have a node, then it's fine and we can just
            // set the result to be the node we just parsed.
            current = node;
        } else {
            // Otherwise we need to check the type of the node we just parsed.
            // If it cannot be concatenated with the previous node, then we'll
            // need to add a syntax error.
            if (!PM_NODE_TYPE_P(node, PM_STRING_NODE) && !PM_NODE_TYPE_P(node, PM_INTERPOLATED_STRING_NODE)) {
                pm_parser_err_node(parser, node, PM_ERR_STRING_CONCATENATION);
            }

            // If we haven't already created our container for concatenation,
            // we'll do that now.
            if (!concating) {
                if (!PM_NODE_TYPE_P(current, PM_STRING_NODE) && !PM_NODE_TYPE_P(current, PM_INTERPOLATED_STRING_NODE)) {
                    pm_parser_err_node(parser, current, PM_ERR_STRING_CONCATENATION);
                }

                concating = true;
                const bounds = not_provided(parser);

                const container = pm_interpolated_string_node_create(parser, bounds, null, bounds);
                pm_interpolated_string_node_append(container, current);
                current = container;
            }

            pm_interpolated_string_node_append(current, node);
        }
    }

    return current;
}

/******************************************************************************/
/* Pattern matching                                                           */
/******************************************************************************/

// #define PM_PARSE_PATTERN_SINGLE (prism.c:16170)
const PM_PARSE_PATTERN_SINGLE = 0;
// #define PM_PARSE_PATTERN_TOP (prism.c:16171)
const PM_PARSE_PATTERN_TOP = 1;
// #define PM_PARSE_PATTERN_MULTI (prism.c:16172)
const PM_PARSE_PATTERN_MULTI = 2;

// C forward-declares parse_pattern here (prism.c:16174-16175); it is defined
// at prism.c:16978 below. Function declarations hoist in JS.

/**
 * Add the newly created local to the list of captures for this pattern matching
 * expression. If it is duplicated from a previous local, then we'll need to add
 * an error to the parser. (prism.c:16183)
 */
function parse_pattern_capture(parser, captures, capture, location) {
    // Skip this capture if it starts with an underscore.
    if (peek_at(parser, location.start) === 95 /* '_' */) return;

    if (pm_constant_id_list_includes(captures, capture)) {
        pm_parser_err(parser, location.start, location.end, PM_ERR_PATTERN_CAPTURE_DUPLICATE);
    } else {
        pm_constant_id_list_append(captures, capture);
    }
}

/**
 * Accept any number of constants joined by :: delimiters.
 * (prism.c:16198)
 */
function parse_pattern_constant_path(parser, captures, node, depth) {
    // Now, if there are any :: operators that follow, parse them as constant
    // path nodes.
    while (accept1(parser, PM_TOKEN_COLON_COLON)) {
        const delimiter = copyToken(parser.previous);
        expect1(parser, PM_TOKEN_CONSTANT, PM_ERR_CONSTANT_PATH_COLON_COLON_CONSTANT);
        node = pm_constant_path_node_create(parser, node, delimiter, parser.previous);
    }

    // If there is a [ or ( that follows, then this is part of a larger pattern
    // expression. We'll parse the inner pattern here, then modify the returned
    // inner pattern with our constant path attached.
    if (!match2(parser, PM_TOKEN_BRACKET_LEFT, PM_TOKEN_PARENTHESIS_LEFT)) {
        return node;
    }

    let opening;
    let closing;
    let inner = null;

    if (accept1(parser, PM_TOKEN_BRACKET_LEFT)) {
        opening = copyToken(parser.previous);
        accept1(parser, PM_TOKEN_NEWLINE);

        if (!accept1(parser, PM_TOKEN_BRACKET_RIGHT)) {
            inner = parse_pattern(parser, captures, PM_PARSE_PATTERN_TOP | PM_PARSE_PATTERN_MULTI, PM_ERR_PATTERN_EXPRESSION_AFTER_BRACKET, depth + 1);
            accept1(parser, PM_TOKEN_NEWLINE);
            expect1_opening(parser, PM_TOKEN_BRACKET_RIGHT, PM_ERR_PATTERN_TERM_BRACKET, opening);
        }

        closing = copyToken(parser.previous);
    } else {
        parser_lex(parser);
        opening = copyToken(parser.previous);
        accept1(parser, PM_TOKEN_NEWLINE);

        if (!accept1(parser, PM_TOKEN_PARENTHESIS_RIGHT)) {
            inner = parse_pattern(parser, captures, PM_PARSE_PATTERN_TOP | PM_PARSE_PATTERN_MULTI, PM_ERR_PATTERN_EXPRESSION_AFTER_PAREN, depth + 1);
            accept1(parser, PM_TOKEN_NEWLINE);
            expect1_opening(parser, PM_TOKEN_PARENTHESIS_RIGHT, PM_ERR_PATTERN_TERM_PAREN, opening);
        }

        closing = copyToken(parser.previous);
    }

    if (!inner) {
        // If there was no inner pattern, then we have something like Foo() or
        // Foo[]. In that case we'll create an array pattern with no requireds.
        return pm_array_pattern_node_constant_create(parser, node, opening, closing);
    }

    // Now that we have the inner pattern, check to see if it's an array, find,
    // or hash pattern. If it is, then we'll attach our constant path to it if
    // it doesn't already have a constant. If it's not one of those node types
    // or it does have a constant, then we'll create an array pattern. The three
    // cases were byte-identical in C, so they share one body here.
    if ((inner.type === PM_ARRAY_PATTERN_NODE) || (inner.type === PM_FIND_PATTERN_NODE) || (inner.type === PM_HASH_PATTERN_NODE)) {
        const pattern_node = inner;

        if (pattern_node.constant === null && pattern_node.opening_loc.start === null) {
            pattern_node.location.start = node.location.start;
            pattern_node.location.end = closing.end;

            pattern_node.constant = node;
            pattern_node.opening_loc = PM_LOCATION_TOKEN_VALUE(opening);
            pattern_node.closing_loc = PM_LOCATION_TOKEN_VALUE(closing);

            return pattern_node;
        }
    }

    // If we got here, then we didn't return one of the inner patterns by
    // attaching its constant. In this case we'll create an array pattern and
    // attach our constant to it.
    const pattern_node = pm_array_pattern_node_constant_create(parser, node, opening, closing);
    pm_array_pattern_node_requireds_append(pattern_node, inner);
    return pattern_node;
}

/**
 * Parse a rest pattern.
 * (prism.c:16318)
 */
function parse_pattern_rest(parser, captures) {
    // assert(parser.previous.type === PM_TOKEN_USTAR);
    const operator = copyToken(parser.previous);
    let name = null;

    // Rest patterns don't necessarily have a name associated with them. So we
    // will check for that here. If they do, then we'll add it to the local
    // table since this pattern will cause it to become a local variable.
    if (accept1(parser, PM_TOKEN_IDENTIFIER)) {
        const identifier = copyToken(parser.previous);
        const constant_id = pm_parser_constant_id_token(parser, identifier);

        const depth = pm_parser_local_depth_constant_id(parser, constant_id);
        if (depth === -1) {
            pm_parser_local_add(parser, constant_id, identifier.start, identifier.end, 0);
        }

        parse_pattern_capture(parser, captures, constant_id, PM_LOCATION_TOKEN_VALUE(identifier));
        name = pm_local_variable_target_node_create(
            parser,
            PM_LOCATION_TOKEN_VALUE(identifier),
            constant_id,
            (depth === -1 ? 0 : depth)
        );
    }

    // Finally we can return the created node.
    return pm_splat_node_create(parser, operator, name);
}

/**
 * Parse a keyword rest node.
 * (prism.c:16352)
 */
function parse_pattern_keyword_rest(parser, captures) {
    // assert(parser.current.type === PM_TOKEN_USTAR_STAR);
    parser_lex(parser);

    const operator = copyToken(parser.previous);
    let value = null;

    if (accept1(parser, PM_TOKEN_KEYWORD_NIL)) {
        return pm_no_keywords_parameter_node_create(parser, operator, parser.previous);
    }

    if (accept1(parser, PM_TOKEN_IDENTIFIER)) {
        const constant_id = pm_parser_constant_id_token(parser, parser.previous);

        const depth = pm_parser_local_depth_constant_id(parser, constant_id);
        if (depth === -1) {
            pm_parser_local_add(parser, constant_id, parser.previous.start, parser.previous.end, 0);
        }

        parse_pattern_capture(parser, captures, constant_id, PM_LOCATION_TOKEN_VALUE(parser.previous));
        value = pm_local_variable_target_node_create(
            parser,
            PM_LOCATION_TOKEN_VALUE(parser.previous),
            constant_id,
            (depth === -1 ? 0 : depth)
        );
    }

    return pm_assoc_splat_node_create(parser, value, operator);
}

/**
 * Check that the slice of the source given by the bounds parameters constitutes
 * a valid local variable name. (prism.c:16388)
 */
function pm_slice_is_valid_local(parser, start, end) {
    const length = end - start;
    if (length === 0) return false;

    // First ensure that it starts with a valid identifier starting character.
    let width = char_is_identifier_start(parser, start, end - start);
    if (width === 0) return false;

    // Next, ensure that it's not an uppercase character.
    {
        if (pm_encoding_utf_8_isupper_char(parser.source, start, length)) return false;
    }

    // Next, iterate through all of the bytes of the string to ensure that they
    // are all valid identifier characters.
    let cursor = start + width;
    while ((width = char_is_identifier(parser, cursor, end - cursor))) cursor += width;

    return cursor === end;
}

/**
 * Create an implicit node for the value of a hash pattern that has omitted the
 * value. This will use an implicit local variable target.
 * (prism.c:16415)
 */
function parse_pattern_hash_implicit_value(parser, captures, key) {
    const value_loc = key.value_loc;

    const constant_id = pm_parser_constant_id_location(parser, value_loc.start, value_loc.end);
    let depth = -1;

    if (pm_slice_is_valid_local(parser, value_loc.start, value_loc.end)) {
        depth = pm_parser_local_depth_constant_id(parser, constant_id);
    } else {
        pm_parser_err(parser, key.location.start, key.location.end, PM_ERR_PATTERN_HASH_KEY_LOCALS);

        const value_last_char = parser.source.charCodeAt(value_loc.end - 1);
        if ((value_loc.end > value_loc.start) && ((value_last_char === 33 /* '!' */) || (value_last_char === 63 /* '?' */))) {
            // %.*s format arguments are passed as (length, view).
            PM_PARSER_ERR_LOCATION_FORMAT(parser, value_loc, PM_ERR_INVALID_LOCAL_VARIABLE_WRITE, value_loc.end - value_loc.start, parser.source.slice(value_loc.start, value_loc.end));
        }
    }

    if (depth === -1) {
        pm_parser_local_add(parser, constant_id, value_loc.start, value_loc.end, 0);
    }

    parse_pattern_capture(parser, captures, constant_id, value_loc);
    const target = pm_local_variable_target_node_create(
        parser,
        value_loc,
        constant_id,
        (depth === -1 ? 0 : depth)
    );

    return pm_implicit_node_create(parser, target);
}

/**
 * Add a node to the list of keys for a hash pattern, and if it is a duplicate
 * then add an error to the parser. (prism.c:16451)
 */
function parse_pattern_hash_key(parser, keys, node) {
    if (pm_static_literals_add(parser.newline_list, parser.start_line, keys, node, true) !== null) {
        pm_parser_err_node(parser, node, PM_ERR_PATTERN_HASH_KEY_DUPLICATE);
    }
}

/**
 * Parse a hash pattern.
 * (prism.c:16461)
 */
function parse_pattern_hash(parser, captures, first_node, depth) {
    const assocs = [];
    // pm_static_literals_t keys = { 0 };
    const keys = pm_static_literals_zeroed();
    let rest = null;

    if (first_node.type === PM_ASSOC_SPLAT_NODE || first_node.type === PM_NO_KEYWORDS_PARAMETER_NODE) {
        rest = first_node;
    } else if (first_node.type === PM_SYMBOL_NODE && pm_symbol_node_label_p(parser, first_node)) {
        parse_pattern_hash_key(parser, keys, first_node);
        let value;

        if (match8(parser, PM_TOKEN_COMMA, PM_TOKEN_KEYWORD_THEN, PM_TOKEN_BRACE_RIGHT, PM_TOKEN_BRACKET_RIGHT, PM_TOKEN_PARENTHESIS_RIGHT, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON, PM_TOKEN_EOF)) {
            // Otherwise, we will create an implicit local variable
            // target for the value.
            value = parse_pattern_hash_implicit_value(parser, captures, first_node);
        } else {
            // Here we have a value for the first assoc in the list, so
            // we will parse it now.
            value = parse_pattern(parser, captures, PM_PARSE_PATTERN_SINGLE, PM_ERR_PATTERN_EXPRESSION_AFTER_KEY, depth + 1);
        }

        const operator = not_provided(parser);
        const assoc = pm_assoc_node_create(parser, first_node, operator, value);

        pm_node_list_append(assocs, assoc);
    } else {
        // (C falls through from the non-label symbol case into this default
        // case.) If we get anything else, then this is an error. For this we'll
        // create a missing node for the value and create an assoc node for
        // the first node in the list.
        const diag_id = PM_NODE_TYPE_P(first_node, PM_INTERPOLATED_SYMBOL_NODE) ? PM_ERR_PATTERN_HASH_KEY_INTERPOLATED : PM_ERR_PATTERN_HASH_KEY_LABEL;
        pm_parser_err_node(parser, first_node, diag_id);

        const operator = not_provided(parser);
        const value = pm_missing_node_create(parser, first_node.location.start, first_node.location.end);
        const assoc = pm_assoc_node_create(parser, first_node, operator, value);

        pm_node_list_append(assocs, assoc);
    }

    // If there are any other assocs, then we'll parse them now.
    while (accept1(parser, PM_TOKEN_COMMA)) {
        // Here we need to break to support trailing commas.
        if (match7(parser, PM_TOKEN_KEYWORD_THEN, PM_TOKEN_BRACE_RIGHT, PM_TOKEN_BRACKET_RIGHT, PM_TOKEN_PARENTHESIS_RIGHT, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON, PM_TOKEN_EOF)) {
            // Trailing commas are not allowed to follow a rest pattern.
            if (rest !== null) {
                pm_parser_err_token(parser, parser.current, PM_ERR_PATTERN_EXPRESSION_AFTER_REST);
            }

            break;
        }

        if (match1(parser, PM_TOKEN_USTAR_STAR)) {
            const assoc = parse_pattern_keyword_rest(parser, captures);

            if (rest === null) {
                rest = assoc;
            } else {
                pm_parser_err_node(parser, assoc, PM_ERR_PATTERN_EXPRESSION_AFTER_REST);
                pm_node_list_append(assocs, assoc);
            }
        } else {
            let key;

            if (match1(parser, PM_TOKEN_STRING_BEGIN)) {
                key = parse_strings(parser, null, true, depth + 1);

                if (PM_NODE_TYPE_P(key, PM_INTERPOLATED_SYMBOL_NODE)) {
                    pm_parser_err_node(parser, key, PM_ERR_PATTERN_HASH_KEY_INTERPOLATED);
                } else if (!pm_symbol_node_label_p(parser, key)) {
                    pm_parser_err_node(parser, key, PM_ERR_PATTERN_LABEL_AFTER_COMMA);
                }
            } else {
                expect1(parser, PM_TOKEN_LABEL, PM_ERR_PATTERN_LABEL_AFTER_COMMA);
                key = pm_symbol_node_label_create(parser, parser.previous);
            }

            parse_pattern_hash_key(parser, keys, key);
            let value = null;

            if (match7(parser, PM_TOKEN_COMMA, PM_TOKEN_KEYWORD_THEN, PM_TOKEN_BRACE_RIGHT, PM_TOKEN_BRACKET_RIGHT, PM_TOKEN_PARENTHESIS_RIGHT, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON)) {
                if (PM_NODE_TYPE_P(key, PM_SYMBOL_NODE)) {
                    value = parse_pattern_hash_implicit_value(parser, captures, key);
                } else {
                    value = pm_missing_node_create(parser, key.location.end, key.location.end);
                }
            } else {
                value = parse_pattern(parser, captures, PM_PARSE_PATTERN_SINGLE, PM_ERR_PATTERN_EXPRESSION_AFTER_KEY, depth + 1);
            }

            const operator = not_provided(parser);
            const assoc = pm_assoc_node_create(parser, key, operator, value);

            if (rest !== null) {
                pm_parser_err_node(parser, assoc, PM_ERR_PATTERN_EXPRESSION_AFTER_REST);
            }

            pm_node_list_append(assocs, assoc);
        }
    }

    const node = pm_hash_pattern_node_node_list_create(parser, assocs, rest);

    return node;
}

// Pin-operator (`^`) operand node constructors that share an identical
// shape in parse_pattern_primitive below: lex the token, wrap it in the
// matching read-node constructor. PM_TOKEN_IDENTIFIER is handled separately
// (it needs a null check) and isn't part of this table.
const PM_PIN_OPERAND_NODE_CREATE = new Map([
    [PM_TOKEN_INSTANCE_VARIABLE, pm_instance_variable_read_node_create],
    [PM_TOKEN_CLASS_VARIABLE, pm_class_variable_read_node_create],
    [PM_TOKEN_GLOBAL_VARIABLE, pm_global_variable_read_node_create],
    [PM_TOKEN_NUMBERED_REFERENCE, pm_numbered_reference_read_node_create],
    [PM_TOKEN_BACK_REFERENCE, pm_back_reference_read_node_create],
]);

/**
 * Parse a pattern expression primitive.
 * (prism.c:16582)
 */
function parse_pattern_primitive(parser, captures, diag_id, depth) {
    if (parser.current.type === PM_TOKEN_IDENTIFIER || parser.current.type === PM_TOKEN_METHOD_NAME) {
        parser_lex(parser);
        const constant_id = pm_parser_constant_id_token(parser, parser.previous);

        const depth = pm_parser_local_depth_constant_id(parser, constant_id);
        if (depth === -1) {
            pm_parser_local_add(parser, constant_id, parser.previous.start, parser.previous.end, 0);
        }

        parse_pattern_capture(parser, captures, constant_id, PM_LOCATION_TOKEN_VALUE(parser.previous));
        return pm_local_variable_target_node_create(
            parser,
            PM_LOCATION_TOKEN_VALUE(parser.previous),
            constant_id,
            (depth === -1 ? 0 : depth)
        );
    } else if (parser.current.type === PM_TOKEN_BRACKET_LEFT_ARRAY) {
        const opening = copyToken(parser.current);
        parser_lex(parser);

        if (accept1(parser, PM_TOKEN_BRACKET_RIGHT)) {
            // If we have an empty array pattern, then we'll just return a new
            // array pattern node.
            return pm_array_pattern_node_empty_create(parser, opening, parser.previous);
        }

        // Otherwise, we'll parse the inner pattern, then deal with it depending
        // on the type it returns.
        const inner = parse_pattern(parser, captures, PM_PARSE_PATTERN_MULTI, PM_ERR_PATTERN_EXPRESSION_AFTER_BRACKET, depth + 1);

        accept1(parser, PM_TOKEN_NEWLINE);
        expect1_opening(parser, PM_TOKEN_BRACKET_RIGHT, PM_ERR_PATTERN_TERM_BRACKET, opening);
        const closing = copyToken(parser.previous);

        switch (inner.type) {
            case PM_ARRAY_PATTERN_NODE: {
                const pattern_node = inner;
                if (pattern_node.opening_loc.start === null) {
                    pattern_node.location.start = opening.start;
                    pattern_node.location.end = closing.end;

                    pattern_node.opening_loc = PM_LOCATION_TOKEN_VALUE(opening);
                    pattern_node.closing_loc = PM_LOCATION_TOKEN_VALUE(closing);

                    return pattern_node;
                }

                break;
            }
            case PM_FIND_PATTERN_NODE: {
                const pattern_node = inner;
                if (pattern_node.opening_loc.start === null) {
                    pattern_node.location.start = opening.start;
                    pattern_node.location.end = closing.end;

                    pattern_node.opening_loc = PM_LOCATION_TOKEN_VALUE(opening);
                    pattern_node.closing_loc = PM_LOCATION_TOKEN_VALUE(closing);

                    return pattern_node;
                }

                break;
            }
            default:
                break;
        }

        const node = pm_array_pattern_node_empty_create(parser, opening, closing);
        pm_array_pattern_node_requireds_append(node, inner);
        return node;
    } else if (parser.current.type === PM_TOKEN_BRACE_LEFT) {
        const previous_pattern_matching_newlines = parser.pattern_matching_newlines;
        parser.pattern_matching_newlines = false;

        let node;
        const opening = copyToken(parser.current);
        parser_lex(parser);

        if (accept1(parser, PM_TOKEN_BRACE_RIGHT)) {
            // If we have an empty hash pattern, then we'll just return a new hash
            // pattern node.
            node = pm_hash_pattern_node_empty_create(parser, opening, parser.previous);
        } else {
            let first_node;

            if (parser.current.type === PM_TOKEN_LABEL) {
                parser_lex(parser);
                first_node = pm_symbol_node_label_create(parser, parser.previous);
            } else if (parser.current.type === PM_TOKEN_USTAR_STAR) {
                first_node = parse_pattern_keyword_rest(parser, captures);
            } else if (parser.current.type === PM_TOKEN_STRING_BEGIN) {
                first_node = parse_expression(parser, PM_BINDING_POWER_MAX, false, true, PM_ERR_PATTERN_HASH_KEY_LABEL, depth + 1);
            } else {
                PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, PM_ERR_PATTERN_HASH_KEY, pm_token_type_human(parser.current.type));
                parser_lex(parser);

                first_node = pm_missing_node_create(parser, parser.previous.start, parser.previous.end);
            }

            node = parse_pattern_hash(parser, captures, first_node, depth + 1);

            accept1(parser, PM_TOKEN_NEWLINE);
            expect1_opening(parser, PM_TOKEN_BRACE_RIGHT, PM_ERR_PATTERN_TERM_BRACE, opening);
            const closing = copyToken(parser.previous);

            node.location.start = opening.start;
            node.location.end = closing.end;

            node.opening_loc = PM_LOCATION_TOKEN_VALUE(opening);
            node.closing_loc = PM_LOCATION_TOKEN_VALUE(closing);
        }

        parser.pattern_matching_newlines = previous_pattern_matching_newlines;
        return node;
    } else if (parser.current.type === PM_TOKEN_UDOT_DOT || parser.current.type === PM_TOKEN_UDOT_DOT_DOT) {
        const operator = copyToken(parser.current);
        parser_lex(parser);

        // Since we have a unary range operator, we need to parse the subsequent
        // expression as the right side of the range.
        if (PM_CASE_PRIMITIVE.has(parser.current.type)) {
            const right = parse_expression(parser, PM_BINDING_POWER_MAX, false, false, PM_ERR_PATTERN_EXPRESSION_AFTER_RANGE, depth + 1);
            return pm_range_node_create(parser, null, operator, right);
        } else {
            pm_parser_err_token(parser, operator, PM_ERR_PATTERN_EXPRESSION_AFTER_RANGE);
            const right = pm_missing_node_create(parser, operator.start, operator.end);
            return pm_range_node_create(parser, null, operator, right);
        }
    } else if (PM_CASE_PRIMITIVE.has(parser.current.type)) {
        const node = parse_expression(parser, PM_BINDING_POWER_MAX, false, true, diag_id, depth + 1);

        // If we found a label, we need to immediately return to the caller.
        if (pm_symbol_node_label_p(parser, node)) return node;

        // Call nodes (arithmetic operations) are not allowed in patterns
        if (node.type === PM_CALL_NODE) {
            pm_parser_err_node(parser, node, diag_id);
            const missing_node = pm_missing_node_create(parser, node.location.start, node.location.end);

            pm_node_unreference(parser, node);
            return missing_node;
        }

        // Now that we have a primitive, we need to check if it's part of a range.
        if (accept2(parser, PM_TOKEN_DOT_DOT, PM_TOKEN_DOT_DOT_DOT)) {
            const operator = copyToken(parser.previous);

            // Now that we have the operator, we need to check if this is followed
            // by another expression. If it is, then we will create a full range
            // node. Otherwise, we'll create an endless range.
            if (PM_CASE_PRIMITIVE.has(parser.current.type)) {
                const right = parse_expression(parser, PM_BINDING_POWER_MAX, false, false, PM_ERR_PATTERN_EXPRESSION_AFTER_RANGE, depth + 1);
                return pm_range_node_create(parser, node, operator, right);
            } else {
                return pm_range_node_create(parser, node, operator, null);
            }
        }

        return node;
    } else if (parser.current.type === PM_TOKEN_CARET) {
        parser_lex(parser);
        const operator = copyToken(parser.previous);

        // At this point we have a pin operator. We need to check the subsequent
        // expression to determine if it's a variable or an expression.
        if (parser.current.type === PM_TOKEN_IDENTIFIER) {
            parser_lex(parser);
            let variable = parse_variable(parser);

            if (variable === null) {
                PM_PARSER_ERR_TOKEN_FORMAT_CONTENT(parser, parser.previous, PM_ERR_NO_LOCAL_VARIABLE);
                variable = pm_local_variable_read_node_missing_create(parser, parser.previous, 0);
            }

            return pm_pinned_variable_node_create(parser, operator, variable);
        } else if (PM_PIN_OPERAND_NODE_CREATE.has(parser.current.type)) {
            const create = PM_PIN_OPERAND_NODE_CREATE.get(parser.current.type);
            parser_lex(parser);
            const variable = create(parser, parser.previous);

            return pm_pinned_variable_node_create(parser, operator, variable);
        } else if (parser.current.type === PM_TOKEN_PARENTHESIS_LEFT) {
            const previous_pattern_matching_newlines = parser.pattern_matching_newlines;
            parser.pattern_matching_newlines = false;

            const lparen = copyToken(parser.current);
            parser_lex(parser);

            const expression = parse_value_expression(parser, PM_BINDING_POWER_STATEMENT, true, false, PM_ERR_PATTERN_EXPRESSION_AFTER_PIN, depth + 1);
            parser.pattern_matching_newlines = previous_pattern_matching_newlines;

            accept1(parser, PM_TOKEN_NEWLINE);
            expect1_opening(parser, PM_TOKEN_PARENTHESIS_RIGHT, PM_ERR_PATTERN_TERM_PAREN, lparen);
            return pm_pinned_expression_node_create(parser, expression, operator, lparen, parser.previous);
        } else {
            // If we get here, then we have a pin operator followed by something
            // not understood. We'll create a missing node and return that.
            pm_parser_err_token(parser, operator, PM_ERR_PATTERN_EXPRESSION_AFTER_PIN);
            const variable = pm_missing_node_create(parser, operator.start, operator.end);
            return pm_pinned_variable_node_create(parser, operator, variable);
        }
    } else if (parser.current.type === PM_TOKEN_UCOLON_COLON) {
        const delimiter = copyToken(parser.current);
        parser_lex(parser);

        expect1(parser, PM_TOKEN_CONSTANT, PM_ERR_CONSTANT_PATH_COLON_COLON_CONSTANT);
        const node = pm_constant_path_node_create(parser, null, delimiter, parser.previous);

        return parse_pattern_constant_path(parser, captures, node, depth + 1);
    } else if (parser.current.type === PM_TOKEN_CONSTANT) {
        const constant = copyToken(parser.current);
        parser_lex(parser);

        const node = pm_constant_read_node_create(parser, constant);
        return parse_pattern_constant_path(parser, captures, node, depth + 1);
    } else {
        pm_parser_err_current(parser, diag_id);
        return pm_missing_node_create(parser, parser.current.start, parser.current.end);
    }
}

function parse_pattern_alternation_error_each(node, data) {
    switch (node.type) {
        case PM_LOCAL_VARIABLE_TARGET_NODE:
            pm_parser_err(data, node.location.start, node.location.end, PM_ERR_PATTERN_CAPTURE_IN_ALTERNATIVE);
            return false;
        default:
            return true;
    }
}

/**
 * When we get here, we know that we already have a syntax error, because we
 * know we have captured a variable and that we are in an alternation.
 * (prism.c:16871)
 */
function parse_pattern_alternation_error(parser, node) {
    pm_visit_node(node, parse_pattern_alternation_error_each, parser);
}

/**
 * Parse any number of primitives joined by alternation and ended optionally by
 * assignment.
 * (prism.c:16880)
 */
function parse_pattern_primitives(parser, captures, first_node, diag_id, depth) {
    let node = first_node;
    let alternation = false;

    while ((node === null) || (alternation = accept1(parser, PM_TOKEN_PIPE))) {
        if (alternation && !PM_NODE_TYPE_P(node, PM_ALTERNATION_PATTERN_NODE) && captures.length) {
            parse_pattern_alternation_error(parser, node);
        }

        if (
            parser.current.type === PM_TOKEN_IDENTIFIER ||
            parser.current.type === PM_TOKEN_BRACKET_LEFT_ARRAY ||
            parser.current.type === PM_TOKEN_BRACE_LEFT ||
            parser.current.type === PM_TOKEN_CARET ||
            parser.current.type === PM_TOKEN_CONSTANT ||
            parser.current.type === PM_TOKEN_UCOLON_COLON ||
            parser.current.type === PM_TOKEN_UDOT_DOT ||
            parser.current.type === PM_TOKEN_UDOT_DOT_DOT ||
            PM_CASE_PRIMITIVE.has(parser.current.type)
        ) {
            if (!alternation) {
                node = parse_pattern_primitive(parser, captures, diag_id, depth + 1);
            } else {
                const operator = copyToken(parser.previous);
                const right = parse_pattern_primitive(parser, captures, PM_ERR_PATTERN_EXPRESSION_AFTER_PIPE, depth + 1);

                if (captures.length) parse_pattern_alternation_error(parser, right);
                node = pm_alternation_pattern_node_create(parser, node, right, operator);
            }
        } else if (parser.current.type === PM_TOKEN_PARENTHESIS_LEFT || parser.current.type === PM_TOKEN_PARENTHESIS_LEFT_PARENTHESES) {
            const operator = copyToken(parser.previous);
            const opening = copyToken(parser.current);
            parser_lex(parser);

            const body = parse_pattern(parser, captures, PM_PARSE_PATTERN_SINGLE, PM_ERR_PATTERN_EXPRESSION_AFTER_PAREN, depth + 1);
            accept1(parser, PM_TOKEN_NEWLINE);
            expect1_opening(parser, PM_TOKEN_PARENTHESIS_RIGHT, PM_ERR_PATTERN_TERM_PAREN, opening);
            const right = pm_parentheses_node_create(parser, opening, body, parser.previous, 0);

            if (!alternation) {
                node = right;
            } else {
                if (captures.length) parse_pattern_alternation_error(parser, right);
                node = pm_alternation_pattern_node_create(parser, node, right, operator);
            }
        } else {
            pm_parser_err_current(parser, diag_id);
            const right = pm_missing_node_create(parser, parser.current.start, parser.current.end);

            if (!alternation) {
                node = right;
            } else {
                if (captures.length) parse_pattern_alternation_error(parser, right);
                node = pm_alternation_pattern_node_create(parser, node, right, parser.previous);
            }
        }
    }

    // If we have an =>, then we are assigning this pattern to a variable.
    // In this case we should create an assignment node.
    while (accept1(parser, PM_TOKEN_EQUAL_GREATER)) {
        const operator = copyToken(parser.previous);
        expect1(parser, PM_TOKEN_IDENTIFIER, PM_ERR_PATTERN_IDENT_AFTER_HROCKET);

        const constant_id = pm_parser_constant_id_token(parser, parser.previous);
        const depth = pm_parser_local_depth_constant_id(parser, constant_id);

        if (depth === -1) {
            pm_parser_local_add(parser, constant_id, parser.previous.start, parser.previous.end, 0);
        }

        parse_pattern_capture(parser, captures, constant_id, PM_LOCATION_TOKEN_VALUE(parser.previous));
        const target = pm_local_variable_target_node_create(
            parser,
            PM_LOCATION_TOKEN_VALUE(parser.previous),
            constant_id,
            (depth === -1 ? 0 : depth)
        );

        node = pm_capture_pattern_node_create(parser, node, target, operator);
    }

    return node;
}

/**
 * Parse a pattern matching expression.
 * (prism.c:16978)
 */
function parse_pattern(parser, captures, flags, diag_id, depth) {
    let node = null;

    let leading_rest = false;
    let trailing_rest = false;

    if (parser.current.type === PM_TOKEN_LABEL) {
        parser_lex(parser);
        const key = pm_symbol_node_label_create(parser, parser.previous);
        node = parse_pattern_hash(parser, captures, key, depth + 1);

        if (!(flags & PM_PARSE_PATTERN_TOP)) {
            pm_parser_err_node(parser, node, PM_ERR_PATTERN_HASH_IMPLICIT);
        }

        return node;
    } else if (parser.current.type === PM_TOKEN_USTAR_STAR) {
        node = parse_pattern_keyword_rest(parser, captures);
        node = parse_pattern_hash(parser, captures, node, depth + 1);

        if (!(flags & PM_PARSE_PATTERN_TOP)) {
            pm_parser_err_node(parser, node, PM_ERR_PATTERN_HASH_IMPLICIT);
        }

        return node;
    } else if (parser.current.type === PM_TOKEN_STRING_BEGIN) {
        // We need special handling for string beginnings because they could
        // be dynamic symbols leading to hash patterns.
        node = parse_pattern_primitive(parser, captures, diag_id, depth + 1);

        if (pm_symbol_node_label_p(parser, node)) {
            node = parse_pattern_hash(parser, captures, node, depth + 1);

            if (!(flags & PM_PARSE_PATTERN_TOP)) {
                pm_parser_err_node(parser, node, PM_ERR_PATTERN_HASH_IMPLICIT);
            }

            return node;
        }

        node = parse_pattern_primitives(parser, captures, node, diag_id, depth + 1);
    } else if (parser.current.type === PM_TOKEN_USTAR && (flags & (PM_PARSE_PATTERN_TOP | PM_PARSE_PATTERN_MULTI))) {
        // (C falls through to the default case when the flags don't allow a
        // leading rest here.)
        parser_lex(parser);
        node = parse_pattern_rest(parser, captures);
        leading_rest = true;
    } else {
        node = parse_pattern_primitives(parser, captures, null, diag_id, depth + 1);
    }

    // If we got a dynamic label symbol, then we need to treat it like the
    // beginning of a hash pattern.
    if (pm_symbol_node_label_p(parser, node)) {
        return parse_pattern_hash(parser, captures, node, depth + 1);
    }

    if ((flags & PM_PARSE_PATTERN_MULTI) && match1(parser, PM_TOKEN_COMMA)) {
        // If we have a comma, then we are now parsing either an array pattern
        // or a find pattern. We need to parse all of the patterns, put them
        // into a big list, and then determine which type of node we have.
        const nodes = [];
        pm_node_list_append(nodes, node);

        // Gather up all of the patterns into the list.
        while (accept1(parser, PM_TOKEN_COMMA)) {
            // Break early here in case we have a trailing comma.
            if (match7(parser, PM_TOKEN_KEYWORD_THEN, PM_TOKEN_BRACE_RIGHT, PM_TOKEN_BRACKET_RIGHT, PM_TOKEN_PARENTHESIS_RIGHT, PM_TOKEN_SEMICOLON, PM_TOKEN_KEYWORD_AND, PM_TOKEN_KEYWORD_OR)) {
                node = pm_implicit_rest_node_create(parser, parser.previous);
                pm_node_list_append(nodes, node);
                trailing_rest = true;
                break;
            }

            if (accept1(parser, PM_TOKEN_USTAR)) {
                node = parse_pattern_rest(parser, captures);

                // If we have already parsed a splat pattern, then this is an
                // error. We will continue to parse the rest of the patterns,
                // but we will indicate it as an error.
                if (trailing_rest) {
                    pm_parser_err_previous(parser, PM_ERR_PATTERN_REST);
                }

                trailing_rest = true;
            } else {
                node = parse_pattern_primitives(parser, captures, null, PM_ERR_PATTERN_EXPRESSION_AFTER_COMMA, depth + 1);
            }

            pm_node_list_append(nodes, node);
        }

        // If the first pattern and the last pattern are rest patterns, then we
        // will call this a find pattern, regardless of how many rest patterns
        // are in between because we know we already added the appropriate
        // errors. Otherwise we will create an array pattern.
        if (leading_rest && PM_NODE_TYPE_P(nodes[nodes.length - 1], PM_SPLAT_NODE)) {
            node = pm_find_pattern_node_create(parser, nodes);

            if (nodes.length === 2) {
                pm_parser_err_node(parser, node, PM_ERR_PATTERN_FIND_MISSING_INNER);
            }
        } else {
            node = pm_array_pattern_node_node_list_create(parser, nodes);

            if (leading_rest && trailing_rest) {
                pm_parser_err_node(parser, node, PM_ERR_PATTERN_ARRAY_MULTIPLE_RESTS);
            }
        }

    } else if (leading_rest) {
        // Otherwise, if we parsed a single splat pattern, then we know we have
        // an array pattern, so we can go ahead and create that node.
        node = pm_array_pattern_node_rest_create(parser, node);
    }

    return node;
}

/******************************************************************************/
/* Numeric prefixes and context checks                                        */
/******************************************************************************/

/**
 * Incorporate a negative sign into a numeric node by subtracting 1 character
 * from its start bounds. If it's a compound node, then we will recursively
 * apply this function to its value.
 * (prism.c:17113)
 */
function parse_negative_numeric(node) {
    switch (node.type) {
        case PM_INTEGER_NODE: {
            node.location.start--;
            node.value = -node.value;
            break;
        }
        case PM_FLOAT_NODE: {
            node.location.start--;
            node.value = -node.value;
            break;
        }
        case PM_RATIONAL_NODE: {
            node.location.start--;
            node.numerator = -node.numerator;
            break;
        }
        case PM_IMAGINARY_NODE:
            node.location.start--;
            parse_negative_numeric(node.numeric);
            break;
        default:
            // assert(false && "unreachable");
            break;
    }
}

/**
 * Append an error to the error list on the parser using the given diagnostic
 * ID. This function is a specialization that handles formatting the specific
 * kind of error that is being appended.
 * (prism.c:17149)
 */
function pm_parser_err_prefix(parser, diag_id) {
    switch (diag_id) {
        case PM_ERR_HASH_KEY: {
            PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.previous, diag_id, pm_token_type_human(parser.previous.type));
            break;
        }
        case PM_ERR_HASH_VALUE:
        case PM_ERR_EXPECT_EXPRESSION_AFTER_OPERATOR: {
            PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, diag_id, pm_token_type_human(parser.current.type));
            break;
        }
        case PM_ERR_UNARY_RECEIVER: {
            const human = (parser.current.type === PM_TOKEN_EOF ? "end-of-input" : pm_token_type_human(parser.current.type));
            PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.previous, diag_id, human, (parser.source.charCodeAt(parser.previous.start)));
            break;
        }
        case PM_ERR_UNARY_DISALLOWED:
        case PM_ERR_EXPECT_ARGUMENT: {
            PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, diag_id, pm_token_type_human(parser.current.type));
            break;
        }
        default:
            pm_parser_err_previous(parser, diag_id);
            break;
    }
}

// Context buckets for parse_retry/parse_yield below. As with
// PARSE_RETURN_CONTEXTS_*/PARSE_BLOCK_EXIT_CONTEXTS_* in part5.js, every
// PM_CONTEXT_* value falls into exactly one bucket per function; anything
// not listed means "keep walking up the context chain unchanged".

// We're allowed to have a retry in these contexts.
const PARSE_RETRY_CONTEXTS_GOOD = new Set([
    PM_CONTEXT_BEGIN_RESCUE, PM_CONTEXT_BLOCK_RESCUE, PM_CONTEXT_CLASS_RESCUE, PM_CONTEXT_DEF_RESCUE,
    PM_CONTEXT_LAMBDA_RESCUE, PM_CONTEXT_MODULE_RESCUE, PM_CONTEXT_SCLASS_RESCUE,
    PM_CONTEXT_DEFINED, PM_CONTEXT_RESCUE_MODIFIER
]);

// We're not allowed to have a retry in these contexts; which specific error
// gets reported depends on whether an else/ensure was passed on the way here.
const PARSE_RETRY_CONTEXTS_BAD = new Set([
    PM_CONTEXT_CLASS, PM_CONTEXT_DEF, PM_CONTEXT_DEF_PARAMS, PM_CONTEXT_MAIN,
    PM_CONTEXT_MODULE, PM_CONTEXT_PREEXE, PM_CONTEXT_SCLASS
]);

// Also bad, but they mark that we passed through an else/ensure so the
// eventual error message (once a BAD context is reached) is more specific.
const PARSE_RETRY_CONTEXTS_ELSE = new Set([
    PM_CONTEXT_BEGIN_ELSE, PM_CONTEXT_BLOCK_ELSE, PM_CONTEXT_CLASS_ELSE, PM_CONTEXT_DEF_ELSE,
    PM_CONTEXT_LAMBDA_ELSE, PM_CONTEXT_MODULE_ELSE, PM_CONTEXT_SCLASS_ELSE
]);
const PARSE_RETRY_CONTEXTS_ENSURE = new Set([
    PM_CONTEXT_BEGIN_ENSURE, PM_CONTEXT_BLOCK_ENSURE, PM_CONTEXT_CLASS_ENSURE, PM_CONTEXT_DEF_ENSURE,
    PM_CONTEXT_LAMBDA_ENSURE, PM_CONTEXT_MODULE_ENSURE, PM_CONTEXT_SCLASS_ENSURE
]);
// Everything else continues walking up the list of contexts unchanged.

/**
 * Ensures that the current retry token is valid in the current context.
 * (prism.c:17180)
 */
function parse_retry(parser, node) {
    const CONTEXT_NONE = 0;
    const CONTEXT_THROUGH_ENSURE = 1;
    const CONTEXT_THROUGH_ELSE = 2;

    let context = CONTEXT_NONE;

    for (let context_node = parser.current_context; context_node !== null; context_node = context_node.prev) {
        const ctx = context_node.context;

        if (PARSE_RETRY_CONTEXTS_GOOD.has(ctx)) return;
        if (PARSE_RETRY_CONTEXTS_BAD.has(ctx)) {
            if (context === CONTEXT_NONE) {
                pm_parser_err_node(parser, node, PM_ERR_INVALID_RETRY_WITHOUT_RESCUE);
            } else if (context === CONTEXT_THROUGH_ENSURE) {
                pm_parser_err_node(parser, node, PM_ERR_INVALID_RETRY_AFTER_ENSURE);
            } else if (context === CONTEXT_THROUGH_ELSE) {
                pm_parser_err_node(parser, node, PM_ERR_INVALID_RETRY_AFTER_ELSE);
            }
            return;
        }
        if (PARSE_RETRY_CONTEXTS_ELSE.has(ctx)) {
            context = CONTEXT_THROUGH_ELSE;
            continue;
        }
        if (PARSE_RETRY_CONTEXTS_ENSURE.has(ctx)) {
            context = CONTEXT_THROUGH_ENSURE;
            continue;
        }
        // Any other context (including the unreachable-in-practice
        // PM_CONTEXT_NONE) means keep walking up the list of contexts,
        // without changing `context`.
    }
}

// We're allowed to have a yield in these contexts.
const PARSE_YIELD_CONTEXTS_GOOD = new Set([
    PM_CONTEXT_DEF, PM_CONTEXT_DEF_PARAMS, PM_CONTEXT_DEFINED, PM_CONTEXT_DEF_ENSURE,
    PM_CONTEXT_DEF_RESCUE, PM_CONTEXT_DEF_ELSE
]);

// We're not allowed to have a yield in these contexts.
const PARSE_YIELD_CONTEXTS_BAD = new Set([
    PM_CONTEXT_CLASS, PM_CONTEXT_CLASS_ENSURE, PM_CONTEXT_CLASS_RESCUE, PM_CONTEXT_CLASS_ELSE,
    PM_CONTEXT_MAIN, PM_CONTEXT_MODULE, PM_CONTEXT_MODULE_ENSURE, PM_CONTEXT_MODULE_RESCUE,
    PM_CONTEXT_MODULE_ELSE, PM_CONTEXT_SCLASS, PM_CONTEXT_SCLASS_RESCUE, PM_CONTEXT_SCLASS_ENSURE,
    PM_CONTEXT_SCLASS_ELSE
]);
// Everything else continues walking up the list of contexts unchanged.

/**
 * Ensures that the current yield token is valid in the current context.
 * (prism.c:17285)
 */
function parse_yield(parser, node) {
    for (let context_node = parser.current_context; context_node !== null; context_node = context_node.prev) {
        const context = context_node.context;

        if (PARSE_YIELD_CONTEXTS_GOOD.has(context)) return;
        if (PARSE_YIELD_CONTEXTS_BAD.has(context)) {
            pm_parser_err_node(parser, node, PM_ERR_INVALID_YIELD);
            return;
        }
        // Any other context (including the unreachable-in-practice
        // PM_CONTEXT_NONE) means keep walking up the list of contexts.
    }
}

/******************************************************************************/
/* Regular expression errors                                                  */
/******************************************************************************/

/**
 * This struct is used to pass information between the regular expression parser
 * and the error callback. In C it is
 *
 *     typedef struct {
 *         pm_parser_t *parser;
 *         const uint8_t *start;
 *         const uint8_t *end;
 *         bool shared;
 *     } parse_regular_expression_error_data_t;
 *
 * Adaptation: an extra `base` field carries the offset of the shared unescaped
 * view within parser.source, because the JS regexp parser reports offsets
 * relative to the source it was handed instead of absolute pointers.
 */

/**
 * This callback is called when the regular expression parser encounters a
 * syntax error. (prism.c:17392)
 */
function parse_regular_expression_error(start, end, message, data) {
    let location;

    if (data.shared) {
        location = { start: start + data.base, end: end + data.base };
    } else {
        location = { start: data.start, end: data.end };
    }

    PM_PARSER_ERR_FORMAT(data.parser, location.start, location.end, PM_ERR_REGEXP_PARSE_ERROR, message);
}

/**
 * Parse the errors for the regular expression and add them to the parser.
 * (prism.c:17409)
 */
function parse_regular_expression_errors(parser, node) {
    const unescaped = node.unescaped;
    // C checks `unescaped->type == PM_STRING_SHARED`; the lexer records the
    // same distinction on the node (string primitives cannot carry tags).
    const shared = node.unescaped_shared === true;
    const error_data = {
        parser,
        start: node.location.start,
        end: node.location.end,
        shared,
        base: shared ? node.content_loc.start : 0
    };

    pm_regexp_parse(parser, (unescaped || ""), (unescaped ? unescaped.length : 0), PM_NODE_FLAG_P(node, PM_REGULAR_EXPRESSION_FLAGS_EXTENDED), null, null, parse_regular_expression_error, error_data);
}

// parse_expression_prefix starts at prism.c:17425; its body belongs to the
// next fragment.
