// prism.c lines 17424-20194 converted to JavaScript (ES2022).
//
// This fragment contains the giant `parse_expression_prefix` dispatch
// (prism.c:17425-20194): every token type that can begin an expression,
// building the corresponding AST node.
//
// This is a plain fragment: it declares consts/functions only, no
// import/export. It relies on part1/part2/part3/part4/part5/part6a, ast.js,
// node.js, diagnostic.js, options.js, token_type.js, encoding.js,
// static_literals.js and the util modules being concatenated/imported around
// it.
//
// Functions expected from part6a (prism.c:15357-17423), referenced here with
// the exact C signatures adapted per the conventions:
// - parse_unescaped_encoding(parser) -> flags number
// - parse_string_part(parser, depth) -> node | null
// - parse_operator_symbol_name(name_token) -> number offset into source
// - parse_symbol(parser, lex_mode, next_state, depth) -> node
// - parse_undef_argument(parser, depth) -> node
// - parse_alias_argument(parser, first, depth) -> node
// - parse_variable_call(parser) -> node
// - parse_method_definition_name(parser) -> token object
// - parse_strings_empty_content(location_offset) -> token object
// - parse_strings(parser, node, accepts_label, depth) -> node
// - parse_heredoc_dedent_string(string, common_whitespace_number)
// - parse_heredoc_dedent(parser, nodes, common_whitespace_number)
// - parse_pattern(parser, captures, flags, diag_id, depth) -> node
// - parse_negative_numeric(node)
// - parse_retry(parser, node)
// - parse_yield(parser, node)
// - parse_regular_expression_errors(parser, node)
// - pm_parser_err_prefix(parser, diag_id)
// - consts PM_PARSE_PATTERN_SINGLE/TOP/MULTI (#defines in the part6a range)
//
// Adaptation notes for the integrator:
// - parse_operator_symbol_name keeps part2's adapted (parser, name) signature
//   at the def call site (prism.c:18973), per part6a's note.
// - `FL(node)` (getter form, prism.c:19845) is plain `node.flags` here;
//   part1's FL(node, flags) setter form is not used in this range.
// - `size_t common_whitespace = (size_t) -1` becomes the box object
//   `{ value: -1 }` (same convention as part4's heredoc lexer); it is stored
//   into parser.lex_modes.current.as.heredoc.common_whitespace and its
//   `.value` is passed to the dedent helpers.
// - `pm_lex_mode_t lex_mode = *parser->lex_modes.current` (prism.c:20160) is
//   a shallow copy `{ mode, as, prev }`; parse_symbol only reads it.
// - `pm_string_t unescaped = parser->current_string` is a shallow copy of the
//   string struct ({ type, length, source }), like C's struct copy.
// - xfree() calls vanish (GC).
// - asserts are debug-only in C and are omitted.
// - `pm_node_list_t x = { 0 }` becomes `[]`;
//   `pm_constant_id_list_t x = { 0 }` becomes `[]`.
// - PRISM_FALLTHROUGH in the alias/def switches is expanded into explicit
//   shared code paths with identical behavior.

/**
 * Shared tail of the four percent-list machines (%i %I %w %W): close the array,
 * reporting the missing terminator when the list ran into EOF.
 */
function parse_percent_list_closing(parser, array, opening, err_term) {
    let closing = copyToken(parser.current);

    if (match1(parser, PM_TOKEN_EOF)) {
        pm_parser_err_token(parser, opening, err_term);
        closing = { type: PM_TOKEN_MISSING, start: parser.previous.end, end: parser.previous.end };
    } else {
        expect1(parser, PM_TOKEN_STRING_END, err_term);
    }

    pm_array_node_close_set(array, closing);
}

/**
 * %i and %w: a percent list that cannot interpolate. `symbol` picks between %i's
 * symbol elements - including C's quirk of rebuilding an already-parsed symbol
 * from its unescaped value and taking the new part from parser.previous - and
 * %w's plain string elements.
 */
function parse_percent_list_plain(parser, symbol, err_element, err_term) {
    parser_lex(parser);

    const opening = copyToken(parser.previous);
    const array = pm_array_node_create(parser, opening);
    let current = null;

    while (!match2(parser, PM_TOKEN_STRING_END, PM_TOKEN_EOF)) {
        accept1(parser, PM_TOKEN_WORDS_SEP);
        if (match1(parser, PM_TOKEN_STRING_END)) break;

        // Interpolation is not possible but nested heredocs can still lead to
        // consecutive (disjoint) string tokens when the final newline is escaped.
        while (match1(parser, PM_TOKEN_STRING_CONTENT)) {
            // In C these shadow the outer `opening`/`closing` tokens.
            const part_opening = not_provided(parser);
            const part_closing = not_provided(parser);

            if (symbol) {
                // Record the string node, moving to interpolation if needed.
                if (current === null) {
                    current = pm_symbol_node_create_current_string(parser, part_opening, parser.current, part_closing);
                    parser_lex(parser);
                } else if (PM_NODE_TYPE_P(current, PM_INTERPOLATED_SYMBOL_NODE)) {
                    const string = pm_string_node_create_current_string(parser, part_opening, parser.current, part_closing);
                    parser_lex(parser);

                    pm_interpolated_symbol_node_append(current, string);
                } else if (PM_NODE_TYPE_P(current, PM_SYMBOL_NODE)) {
                    const bounds = not_provided(parser);

                    const content = { type: PM_TOKEN_STRING_CONTENT, start: current.value_loc.start, end: current.value_loc.end };
                    const first_string = pm_string_node_create_unescaped(parser, bounds, content, bounds, current.unescaped);
                    const second_string = pm_string_node_create_current_string(parser, part_opening, parser.previous, part_closing);
                    parser_lex(parser);

                    const interpolated = pm_interpolated_symbol_node_create(parser, part_opening, null, part_closing);
                    pm_interpolated_symbol_node_append(interpolated, first_string);
                    pm_interpolated_symbol_node_append(interpolated, second_string);

                    current = interpolated;
                } else {
                    // assert(false && "unreachable"): debug-only in C.
                }
            } else {
                const string = pm_string_node_create_current_string(parser, part_opening, parser.current, part_closing);

                // Record the string node, moving to interpolation if needed.
                if (current === null) {
                    current = string;
                } else if (PM_NODE_TYPE_P(current, PM_INTERPOLATED_STRING_NODE)) {
                    pm_interpolated_string_node_append(current, string);
                } else if (PM_NODE_TYPE_P(current, PM_STRING_NODE)) {
                    const interpolated = pm_interpolated_string_node_create(parser, part_opening, null, part_closing);
                    pm_interpolated_string_node_append(interpolated, current);
                    pm_interpolated_string_node_append(interpolated, string);

                    current = interpolated;
                } else {
                    // assert(false && "unreachable"): debug-only in C.
                }

                parser_lex(parser);
            }
        }

        if (current !== null) {
            pm_array_node_elements_append(array, current);
            current = null;
        } else {
            expect1(parser, PM_TOKEN_STRING_CONTENT, err_element);
        }
    }

    parse_percent_list_closing(parser, array, opening, err_term);
    return array;
}

/**
 * An embedded variable or embedded expression inside %I/%W. It either starts a
 * new interpolated element, wraps an existing plain one, or joins an existing
 * interpolated one. %I moves the element's start location onto the part unless
 * the element was just built around the plain node; %W does not track it.
 */
function parse_percent_list_embedded(parser, current, depth, symbol) {
    if (symbol) {
        let start_location_set = false;

        if (current === null) {
            const part_opening = not_provided(parser);
            const part_closing = not_provided(parser);
            current = pm_interpolated_symbol_node_create(parser, part_opening, null, part_closing);
        } else if (PM_NODE_TYPE_P(current, PM_SYMBOL_NODE)) {
            const part_opening = not_provided(parser);
            const part_closing = not_provided(parser);
            const interpolated = pm_interpolated_symbol_node_create(parser, part_opening, null, part_closing);

            current = pm_symbol_node_to_string_node(parser, current);
            pm_interpolated_symbol_node_append(interpolated, current);
            interpolated.location.start = current.location.start;
            start_location_set = true;

            current = interpolated;
        } else {
            // The current node is already an interpolated symbol: just add the part.
        }

        const part = parse_string_part(parser, depth + 1);
        pm_interpolated_symbol_node_append(current, part);

        if (!start_location_set) {
            current.location.start = part.location.start;
        }
    } else {
        if (current === null) {
            const part_opening = not_provided(parser);
            const part_closing = not_provided(parser);
            current = pm_interpolated_string_node_create(parser, part_opening, null, part_closing);
        } else if (PM_NODE_TYPE_P(current, PM_STRING_NODE)) {
            const part_opening = not_provided(parser);
            const part_closing = not_provided(parser);
            const interpolated = pm_interpolated_string_node_create(parser, part_opening, null, part_closing);

            pm_interpolated_string_node_append(interpolated, current);
            current = interpolated;
        } else {
            // The current node is already an interpolated string: just add the part.
        }

        const part = parse_string_part(parser, depth + 1);
        pm_interpolated_string_node_append(current, part);
    }

    return current;
}

/**
 * %I and %W: a percent list that can interpolate. `symbol` picks between %I's
 * symbol elements and %W's string elements, which additionally reset the
 * explicit encoding at every separator (each element can have its own) and tag
 * every part with the unescaped encoding.
 */
function parse_percent_list_interpolated(parser, depth, symbol, err_element, err_term) {
    parser_lex(parser);

    const opening = copyToken(parser.previous);
    const array = pm_array_node_create(parser, opening);

    // This is the current node that we are parsing that will be added to the
    // list of elements.
    let current = null;

    while (!match2(parser, PM_TOKEN_STRING_END, PM_TOKEN_EOF)) {
        switch (parser.current.type) {
            case PM_TOKEN_WORDS_SEP: {
                if (!symbol) {
                    // Reset the explicit encoding if we hit a separator since
                    // each element can have its own encoding.
                    parser.explicit_encoding = null;
                }

                if (current !== null) {
                    // If we hit a separator after we've hit content, then we
                    // need to append that content to the list and reset the
                    // current node.
                    pm_array_node_elements_append(array, current);
                    current = null;
                }

                parser_lex(parser);
                break;
            }
            case PM_TOKEN_STRING_CONTENT: {
                // In C these shadow the outer `opening`/`closing` tokens.
                const part_opening = not_provided(parser);
                const part_closing = not_provided(parser);

                if (symbol) {
                    if (current === null) {
                        // Content with no current node: this is the first
                        // content seen, so start a plain symbol.
                        current = pm_symbol_node_create_current_string(parser, part_opening, parser.current, part_closing);
                        parser_lex(parser);
                    } else if (PM_NODE_TYPE_P(current, PM_INTERPOLATED_SYMBOL_NODE)) {
                        // Content inside an interpolated symbol: append it.
                        const string = pm_string_node_create_current_string(parser, part_opening, parser.current, part_closing);
                        parser_lex(parser);

                        pm_interpolated_symbol_node_append(current, string);
                    } else if (PM_NODE_TYPE_P(current, PM_SYMBOL_NODE)) {
                        // Content after a plain symbol: convert it into an
                        // interpolated symbol holding both parts.
                        const bounds = not_provided(parser);

                        const content = { type: PM_TOKEN_STRING_CONTENT, start: current.value_loc.start, end: current.value_loc.end };
                        const first_string = pm_string_node_create_unescaped(parser, bounds, content, bounds, current.unescaped);
                        const second_string = pm_string_node_create_current_string(parser, part_opening, parser.previous, part_closing);
                        parser_lex(parser);

                        const interpolated = pm_interpolated_symbol_node_create(parser, part_opening, null, part_closing);
                        pm_interpolated_symbol_node_append(interpolated, first_string);
                        pm_interpolated_symbol_node_append(interpolated, second_string);

                        current = interpolated;
                    } else {
                        // assert(false && "unreachable"): debug-only in C.
                    }
                } else {
                    const string = pm_string_node_create_current_string(parser, part_opening, parser.current, part_closing);
                    pm_node_flag_set(string, parse_unescaped_encoding(parser));
                    parser_lex(parser);

                    if (current === null) {
                        current = string;
                    } else if (PM_NODE_TYPE_P(current, PM_INTERPOLATED_STRING_NODE)) {
                        pm_interpolated_string_node_append(current, string);
                    } else if (PM_NODE_TYPE_P(current, PM_STRING_NODE)) {
                        const interpolated = pm_interpolated_string_node_create(parser, part_opening, null, part_closing);
                        pm_interpolated_string_node_append(interpolated, current);
                        pm_interpolated_string_node_append(interpolated, string);

                        current = interpolated;
                    } else {
                        // assert(false && "unreachable"): debug-only in C.
                    }
                }

                break;
            }
            case PM_TOKEN_EMBVAR:
            case PM_TOKEN_EMBEXPR_BEGIN: {
                current = parse_percent_list_embedded(parser, current, depth, symbol);
                break;
            }
            default:
                expect1(parser, PM_TOKEN_STRING_CONTENT, err_element);
                parser_lex(parser);
                break;
        }
    }

    // If we have a current node, then we need to append it to the list.
    if (current !== null) {
        pm_array_node_elements_append(array, current);
    }

    parse_percent_list_closing(parser, array, opening, err_term);
    return array;
}

/**
 * Parse an expression that begins with the previous node that we just lexed.
 */
function parse_expression_prefix(parser, binding_power, accepts_command_call, accepts_label, diag_id, depth) {
    switch (parser.current.type) {
        case PM_TOKEN_BRACKET_LEFT_ARRAY: {
            parser_lex(parser);

            const array = pm_array_node_create(parser, parser.previous);
            pm_accepts_block_stack_push(parser, true);
            let parsed_bare_hash = false;

            while (!match2(parser, PM_TOKEN_BRACKET_RIGHT, PM_TOKEN_EOF)) {
                const accepted_newline = accept1(parser, PM_TOKEN_NEWLINE);

                // Handle the case where we don't have a comma and we have a
                // newline followed by a right bracket.
                if (accepted_newline && match1(parser, PM_TOKEN_BRACKET_RIGHT)) {
                    break;
                }

                // Ensure that we have a comma between elements in the array.
                if (array.elements.length > 0) {
                    if (accept1(parser, PM_TOKEN_COMMA)) {
                        // If there was a comma but we also accepts a newline,
                        // then this is a syntax error.
                        if (accepted_newline) {
                            pm_parser_err_previous(parser, PM_ERR_INVALID_COMMA);
                        }
                    } else {
                        // If there was no comma, then we need to add a syntax
                        // error.
                        const location = parser.previous.end;
                        PM_PARSER_ERR_FORMAT(parser, location, location, PM_ERR_ARRAY_SEPARATOR, pm_token_type_human(parser.current.type));

                        parser.previous.start = location;
                        parser.previous.type = PM_TOKEN_MISSING;
                    }
                }

                // If we have a right bracket immediately following a comma,
                // this is allowed since it's a trailing comma. In this case we
                // can break out of the loop.
                if (match1(parser, PM_TOKEN_BRACKET_RIGHT)) break;

                let element;

                if (accept1(parser, PM_TOKEN_USTAR)) {
                    const operator = copyToken(parser.previous);
                    let expression = null;

                    if (match3(parser, PM_TOKEN_BRACKET_RIGHT, PM_TOKEN_COMMA, PM_TOKEN_EOF)) {
                        pm_parser_scope_forwarding_positionals_check(parser, operator);
                    } else {
                        expression = parse_value_expression(parser, PM_BINDING_POWER_DEFINED, false, false, PM_ERR_ARRAY_EXPRESSION_AFTER_STAR, depth + 1);
                    }

                    element = pm_splat_node_create(parser, operator, expression);
                } else if (match2(parser, PM_TOKEN_LABEL, PM_TOKEN_USTAR_STAR)) {
                    if (parsed_bare_hash) {
                        pm_parser_err_current(parser, PM_ERR_EXPRESSION_BARE_HASH);
                    }

                    element = pm_keyword_hash_node_create(parser);
                    const hash_keys = pm_static_literals_zeroed();

                    if (!match8(parser, PM_TOKEN_EOF, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON, PM_TOKEN_EOF, PM_TOKEN_BRACE_RIGHT, PM_TOKEN_BRACKET_RIGHT, PM_TOKEN_KEYWORD_DO, PM_TOKEN_PARENTHESIS_RIGHT)) {
                        parse_assocs(parser, hash_keys, element, depth + 1);
                    }

                    parsed_bare_hash = true;
                } else {
                    element = parse_value_expression(parser, PM_BINDING_POWER_DEFINED, false, true, PM_ERR_ARRAY_EXPRESSION, depth + 1);

                    if (pm_symbol_node_label_p(parser, element) || accept1(parser, PM_TOKEN_EQUAL_GREATER)) {
                        if (parsed_bare_hash) {
                            pm_parser_err_previous(parser, PM_ERR_EXPRESSION_BARE_HASH);
                        }

                        const hash = pm_keyword_hash_node_create(parser);
                        const hash_keys = pm_static_literals_zeroed();
                        pm_hash_key_static_literals_add(parser, hash_keys, element);

                        let operator;
                        if (parser.previous.type === PM_TOKEN_EQUAL_GREATER) {
                            operator = copyToken(parser.previous);
                        } else {
                            operator = not_provided(parser);
                        }

                        const value = parse_value_expression(parser, PM_BINDING_POWER_DEFINED, false, false, PM_ERR_HASH_VALUE, depth + 1);
                        const assoc = pm_assoc_node_create(parser, element, operator, value);
                        pm_keyword_hash_node_elements_append(hash, assoc);

                        element = hash;
                        if (accept1(parser, PM_TOKEN_COMMA) && !match1(parser, PM_TOKEN_BRACKET_RIGHT)) {
                            parse_assocs(parser, hash_keys, element, depth + 1);
                        }

                        parsed_bare_hash = true;
                    }
                }

                pm_array_node_elements_append(array, element);
                if (PM_NODE_TYPE_P(element, PM_MISSING_NODE)) break;
            }

            accept1(parser, PM_TOKEN_NEWLINE);

            if (!accept1(parser, PM_TOKEN_BRACKET_RIGHT)) {
                PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, PM_ERR_ARRAY_TERM, pm_token_type_human(parser.current.type));
                parser.previous.start = parser.previous.end;
                parser.previous.type = PM_TOKEN_MISSING;
            }

            pm_array_node_close_set(array, parser.previous);
            pm_accepts_block_stack_pop(parser);
            return array;
        }
        case PM_TOKEN_PARENTHESIS_LEFT:
        case PM_TOKEN_PARENTHESIS_LEFT_PARENTHESES: {
            const opening = copyToken(parser.current);
            let flags = 0;

            const current_block_exits = [];
            const previous_block_exits = push_block_exits(parser, current_block_exits);

            parser_lex(parser);
            while (true) {
                if (accept1(parser, PM_TOKEN_SEMICOLON)) {
                    flags |= PM_PARENTHESES_NODE_FLAGS_MULTIPLE_STATEMENTS;
                } else if (!accept1(parser, PM_TOKEN_NEWLINE)) {
                    break;
                }
            }

            // If this is the end of the file or we match a right parenthesis, then
            // we have an empty parentheses node, and we can immediately return.
            if (match2(parser, PM_TOKEN_PARENTHESIS_RIGHT, PM_TOKEN_EOF)) {
                expect1(parser, PM_TOKEN_PARENTHESIS_RIGHT, PM_ERR_EXPECT_RPAREN);

                pop_block_exits(parser, previous_block_exits);

                return pm_parentheses_node_create(parser, opening, null, parser.previous, flags);
            }

            // Otherwise, we're going to parse the first statement in the list
            // of statements within the parentheses.
            pm_accepts_block_stack_push(parser, true);
            context_push(parser, PM_CONTEXT_PARENS);
            const statement = parse_expression(parser, PM_BINDING_POWER_STATEMENT, true, false, PM_ERR_CANNOT_PARSE_EXPRESSION, depth + 1);
            context_pop(parser);

            // Determine if this statement is followed by a terminator. In the
            // case of a single statement, this is fine. But in the case of
            // multiple statements it's required.
            let terminator_found = false;

            if (accept1(parser, PM_TOKEN_SEMICOLON)) {
                terminator_found = true;
                flags |= PM_PARENTHESES_NODE_FLAGS_MULTIPLE_STATEMENTS;
            } else if (accept1(parser, PM_TOKEN_NEWLINE)) {
                terminator_found = true;
            }

            if (terminator_found) {
                while (true) {
                    if (accept1(parser, PM_TOKEN_SEMICOLON)) {
                        flags |= PM_PARENTHESES_NODE_FLAGS_MULTIPLE_STATEMENTS;
                    } else if (!accept1(parser, PM_TOKEN_NEWLINE)) {
                        break;
                    }
                }
            }

            // If we hit a right parenthesis, then we're done parsing the
            // parentheses node, and we can check which kind of node we should
            // return.
            if (match1(parser, PM_TOKEN_PARENTHESIS_RIGHT)) {
                if (opening.type === PM_TOKEN_PARENTHESIS_LEFT_PARENTHESES) {
                    lex_state_set(parser, PM_LEX_STATE_ENDARG);
                }

                parser_lex(parser);
                pm_accepts_block_stack_pop(parser);

                pop_block_exits(parser, previous_block_exits);

                if (PM_NODE_TYPE_P(statement, PM_MULTI_TARGET_NODE) || PM_NODE_TYPE_P(statement, PM_SPLAT_NODE)) {
                    // If we have a single statement and are ending on a right
                    // parenthesis, then we need to check if this is possibly a
                    // multiple target node.
                    let multi_target;

                    if (PM_NODE_TYPE_P(statement, PM_MULTI_TARGET_NODE) && statement.lparen_loc.start === null) {
                        multi_target = statement;
                    } else {
                        multi_target = pm_multi_target_node_create(parser);
                        pm_multi_target_node_targets_append(parser, multi_target, statement);
                    }

                    const lparen_loc = PM_LOCATION_TOKEN_VALUE(opening);
                    const rparen_loc = PM_LOCATION_TOKEN_VALUE(parser.previous);

                    multi_target.lparen_loc = lparen_loc;
                    multi_target.rparen_loc = rparen_loc;
                    multi_target.location.start = lparen_loc.start;
                    multi_target.location.end = rparen_loc.end;

                    let result;
                    if (match1(parser, PM_TOKEN_COMMA) && (binding_power === PM_BINDING_POWER_STATEMENT)) {
                        result = parse_targets(parser, multi_target, PM_BINDING_POWER_INDEX, depth + 1);
                        accept1(parser, PM_TOKEN_NEWLINE);
                    } else {
                        result = multi_target;
                    }

                    if (context_p(parser, PM_CONTEXT_MULTI_TARGET)) {
                        // All set, this is explicitly allowed by the parent
                        // context.
                    } else if (context_p(parser, PM_CONTEXT_FOR_INDEX) && match1(parser, PM_TOKEN_KEYWORD_IN)) {
                        // All set, we're inside a for loop and we're parsing
                        // multiple targets.
                    } else if (binding_power !== PM_BINDING_POWER_STATEMENT) {
                        // Multi targets are not allowed when it's not a
                        // statement level.
                        pm_parser_err_node(parser, result, PM_ERR_WRITE_TARGET_UNEXPECTED);
                    } else if (!match2(parser, PM_TOKEN_EQUAL, PM_TOKEN_PARENTHESIS_RIGHT)) {
                        // Multi targets must be followed by an equal sign in
                        // order to be valid (or a right parenthesis if they are
                        // nested).
                        pm_parser_err_node(parser, result, PM_ERR_WRITE_TARGET_UNEXPECTED);
                    }

                    return result;
                }

                // If we have a single statement and are ending on a right parenthesis
                // and we didn't return a multiple assignment node, then we can return a
                // regular parentheses node now.
                const statements = pm_statements_node_create(parser);
                pm_statements_node_body_append(parser, statements, statement, true);

                return pm_parentheses_node_create(parser, opening, statements, parser.previous, flags);
            }

            // If we have more than one statement in the set of parentheses,
            // then we are going to parse all of them as a list of statements.
            // We'll do that here.
            context_push(parser, PM_CONTEXT_PARENS);
            flags |= PM_PARENTHESES_NODE_FLAGS_MULTIPLE_STATEMENTS;

            const statements = pm_statements_node_create(parser);
            pm_statements_node_body_append(parser, statements, statement, true);

            // If we didn't find a terminator and we didn't find a right
            // parenthesis, then this is a syntax error.
            if (!terminator_found && !match1(parser, PM_TOKEN_EOF)) {
                PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, PM_ERR_EXPECT_EOL_AFTER_STATEMENT, pm_token_type_human(parser.current.type));
            }

            // Parse each statement within the parentheses.
            while (true) {
                const node = parse_expression(parser, PM_BINDING_POWER_STATEMENT, true, false, PM_ERR_CANNOT_PARSE_EXPRESSION, depth + 1);
                pm_statements_node_body_append(parser, statements, node, true);

                // If we're recovering from a syntax error, then we need to stop
                // parsing the statements now.
                if (parser.recovering) {
                    // If this is the level of context where the recovery has
                    // happened, then we can mark the parser as done recovering.
                    if (match1(parser, PM_TOKEN_PARENTHESIS_RIGHT)) parser.recovering = false;
                    break;
                }

                // If we couldn't parse an expression at all, then we need to
                // bail out of the loop.
                if (PM_NODE_TYPE_P(node, PM_MISSING_NODE)) break;

                // If we successfully parsed a statement, then we are going to
                // need terminator to delimit them.
                if (accept2(parser, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON)) {
                    while (accept2(parser, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON));
                    if (match1(parser, PM_TOKEN_PARENTHESIS_RIGHT)) break;
                } else if (match1(parser, PM_TOKEN_PARENTHESIS_RIGHT)) {
                    break;
                } else if (!match1(parser, PM_TOKEN_EOF)) {
                    // If we're at the end of the file, then we're going to add
                    // an error after this for the ) anyway.
                    PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, PM_ERR_EXPECT_EOL_AFTER_STATEMENT, pm_token_type_human(parser.current.type));
                }
            }

            context_pop(parser);
            pm_accepts_block_stack_pop(parser);
            expect1(parser, PM_TOKEN_PARENTHESIS_RIGHT, PM_ERR_EXPECT_RPAREN);

            // When we're parsing multi targets, we allow them to be followed by
            // a right parenthesis if they are at the statement level. This is
            // only possible if they are the final statement in a parentheses.
            // We need to explicitly reject that here.
            {
                let statement = statements.body[statements.body.length - 1];

                if (PM_NODE_TYPE_P(statement, PM_SPLAT_NODE)) {
                    const multi_target = pm_multi_target_node_create(parser);
                    pm_multi_target_node_targets_append(parser, multi_target, statement);

                    statement = multi_target;
                    statements.body[statements.body.length - 1] = statement;
                }

                if (PM_NODE_TYPE_P(statement, PM_MULTI_TARGET_NODE)) {
                    const offset = statement.location.end;
                    const operator = { type: PM_TOKEN_EQUAL, start: offset, end: offset };
                    const value = pm_missing_node_create(parser, offset, offset);

                    statement = pm_multi_write_node_create(parser, statement, operator, value);
                    statements.body[statements.body.length - 1] = statement;

                    pm_parser_err_node(parser, statement, PM_ERR_WRITE_TARGET_UNEXPECTED);
                }
            }

            pop_block_exits(parser, previous_block_exits);

            pm_void_statements_check(parser, statements, true);
            return pm_parentheses_node_create(parser, opening, statements, parser.previous, flags);
        }
        case PM_TOKEN_BRACE_LEFT: {
            // If we were passed a current_hash_keys via the parser, then that
            // means we're already parsing a hash and we want to share the set
            // of hash keys with this inner hash we're about to parse for the
            // sake of warnings. We'll set it to NULL after we grab it to make
            // sure subsequent expressions don't use it. Effectively this is a
            // way of getting around passing it to every call to
            // parse_expression.
            const current_hash_keys = parser.current_hash_keys;
            parser.current_hash_keys = null;

            pm_accepts_block_stack_push(parser, true);
            parser_lex(parser);

            const opening = copyToken(parser.previous);
            const node = pm_hash_node_create(parser, opening);

            if (!match2(parser, PM_TOKEN_BRACE_RIGHT, PM_TOKEN_EOF)) {
                if (current_hash_keys !== null) {
                    parse_assocs(parser, current_hash_keys, node, depth + 1);
                } else {
                    const hash_keys = pm_static_literals_zeroed();
                    parse_assocs(parser, hash_keys, node, depth + 1);
                }

                accept1(parser, PM_TOKEN_NEWLINE);
            }

            pm_accepts_block_stack_pop(parser);
            expect1_opening(parser, PM_TOKEN_BRACE_RIGHT, PM_ERR_HASH_TERM, opening);
            pm_hash_node_closing_loc_set(node, parser.previous);

            return node;
        }
        case PM_TOKEN_CHARACTER_LITERAL: {
            const closing = not_provided(parser);
            const node = pm_string_node_create_current_string(
                parser,
                {
                    type: PM_TOKEN_STRING_BEGIN,
                    start: parser.current.start,
                    end: parser.current.start + 1
                },
                {
                    type: PM_TOKEN_STRING_CONTENT,
                    start: parser.current.start + 1,
                    end: parser.current.end
                },
                closing
            );

            pm_node_flag_set(node, parse_unescaped_encoding(parser));

            // Skip past the character literal here, since now we have handled
            // parser.explicit_encoding correctly.
            parser_lex(parser);

            // Characters can be followed by strings in which case they are
            // automatically concatenated.
            if (match1(parser, PM_TOKEN_STRING_BEGIN)) {
                return parse_strings(parser, node, false, depth + 1);
            }

            return node;
        }
        case PM_TOKEN_CLASS_VARIABLE: {
            parser_lex(parser);
            let node = pm_class_variable_read_node_create(parser, parser.previous);

            if (binding_power === PM_BINDING_POWER_STATEMENT && match1(parser, PM_TOKEN_COMMA)) {
                node = parse_targets_validate(parser, node, PM_BINDING_POWER_INDEX, depth + 1);
            }

            return node;
        }
        case PM_TOKEN_CONSTANT: {
            parser_lex(parser);
            const constant = copyToken(parser.previous);

            // If a constant is immediately followed by parentheses, then this is in
            // fact a method call, not a constant read.
            if (
                match1(parser, PM_TOKEN_PARENTHESIS_LEFT) ||
                (accepts_command_call && (token_begins_expression_p(parser.current.type) || match3(parser, PM_TOKEN_UAMPERSAND, PM_TOKEN_USTAR, PM_TOKEN_USTAR_STAR))) ||
                (pm_accepts_block_stack_p(parser) && match1(parser, PM_TOKEN_KEYWORD_DO)) ||
                match1(parser, PM_TOKEN_BRACE_LEFT)
            ) {
                const arguments_ = {
                    opening_loc: PM_LOCATION_UNSET,
                    arguments: null,
                    closing_loc: PM_LOCATION_UNSET,
                    block: null,
                    has_forwarding: false
                };
                parse_arguments_list(parser, arguments_, true, accepts_command_call, depth + 1);
                return pm_call_node_fcall_create(parser, constant, arguments_);
            }

            let node = pm_constant_read_node_create(parser, parser.previous);

            if ((binding_power === PM_BINDING_POWER_STATEMENT) && match1(parser, PM_TOKEN_COMMA)) {
                // If we get here, then we have a comma immediately following a
                // constant, so we're going to parse this as a multiple assignment.
                node = parse_targets_validate(parser, node, PM_BINDING_POWER_INDEX, depth + 1);
            }

            return node;
        }
        case PM_TOKEN_UCOLON_COLON: {
            parser_lex(parser);
            const delimiter = copyToken(parser.previous);

            expect1(parser, PM_TOKEN_CONSTANT, PM_ERR_CONSTANT_PATH_COLON_COLON_CONSTANT);
            let node = pm_constant_path_node_create(parser, null, delimiter, parser.previous);

            if ((binding_power === PM_BINDING_POWER_STATEMENT) && match1(parser, PM_TOKEN_COMMA)) {
                node = parse_targets_validate(parser, node, PM_BINDING_POWER_INDEX, depth + 1);
            }

            return node;
        }
        case PM_TOKEN_UDOT_DOT:
        case PM_TOKEN_UDOT_DOT_DOT: {
            const operator = copyToken(parser.current);
            parser_lex(parser);

            const right = parse_expression(parser, pm_binding_powers[operator.type].left, false, false, PM_ERR_EXPECT_EXPRESSION_AFTER_OPERATOR, depth + 1);

            // Unary .. and ... are special because these are non-associative
            // operators that can also be unary operators. In this case we need
            // to explicitly reject code that has a .. or ... that follows this
            // expression.
            if (match2(parser, PM_TOKEN_DOT_DOT, PM_TOKEN_DOT_DOT_DOT)) {
                pm_parser_err_current(parser, PM_ERR_UNEXPECTED_RANGE_OPERATOR);
            }

            return pm_range_node_create(parser, null, operator, right);
        }
        case PM_TOKEN_FLOAT:
            parser_lex(parser);
            return pm_float_node_create(parser, parser.previous);
        case PM_TOKEN_FLOAT_IMAGINARY:
            parser_lex(parser);
            return pm_float_node_imaginary_create(parser, parser.previous);
        case PM_TOKEN_FLOAT_RATIONAL:
            parser_lex(parser);
            return pm_float_node_rational_create(parser, parser.previous);
        case PM_TOKEN_FLOAT_RATIONAL_IMAGINARY:
            parser_lex(parser);
            return pm_float_node_rational_imaginary_create(parser, parser.previous);
        case PM_TOKEN_NUMBERED_REFERENCE: {
            parser_lex(parser);
            let node = pm_numbered_reference_read_node_create(parser, parser.previous);

            if (binding_power === PM_BINDING_POWER_STATEMENT && match1(parser, PM_TOKEN_COMMA)) {
                node = parse_targets_validate(parser, node, PM_BINDING_POWER_INDEX, depth + 1);
            }

            return node;
        }
        case PM_TOKEN_GLOBAL_VARIABLE: {
            parser_lex(parser);
            let node = pm_global_variable_read_node_create(parser, parser.previous);

            if (binding_power === PM_BINDING_POWER_STATEMENT && match1(parser, PM_TOKEN_COMMA)) {
                node = parse_targets_validate(parser, node, PM_BINDING_POWER_INDEX, depth + 1);
            }

            return node;
        }
        case PM_TOKEN_BACK_REFERENCE: {
            parser_lex(parser);
            let node = pm_back_reference_read_node_create(parser, parser.previous);

            if (binding_power === PM_BINDING_POWER_STATEMENT && match1(parser, PM_TOKEN_COMMA)) {
                node = parse_targets_validate(parser, node, PM_BINDING_POWER_INDEX, depth + 1);
            }

            return node;
        }
        case PM_TOKEN_IDENTIFIER:
        case PM_TOKEN_METHOD_NAME: {
            parser_lex(parser);
            const identifier = copyToken(parser.previous);
            let node = parse_variable_call(parser);

            if (PM_NODE_TYPE_P(node, PM_CALL_NODE)) {
                // If parse_variable_call returned with a call node, then we
                // know the identifier is not in the local table. In that case
                // we need to check if there are arguments following the
                // identifier.
                const call = node;
                const arguments_ = {
                    opening_loc: PM_LOCATION_UNSET,
                    arguments: null,
                    closing_loc: PM_LOCATION_UNSET,
                    block: null,
                    has_forwarding: false
                };

                if (parse_arguments_list(parser, arguments_, true, accepts_command_call, depth + 1)) {
                    // Since we found arguments, we need to turn off the
                    // variable call bit in the flags.
                    pm_node_flag_unset(call, PM_CALL_NODE_FLAGS_VARIABLE_CALL);

                    call.opening_loc = arguments_.opening_loc;
                    call.arguments = arguments_.arguments;
                    call.closing_loc = arguments_.closing_loc;
                    call.block = arguments_.block;

                    let end = pm_arguments_end(arguments_);
                    if (end === null) {
                        end = call.message_loc.end;
                    }
                    call.location.end = end;
                }
            } else {
                // Otherwise, we know the identifier is in the local table. This
                // can still be a method call if it is followed by arguments or
                // a block, so we need to check for that here.
                if (
                    (accepts_command_call && (token_begins_expression_p(parser.current.type) || match3(parser, PM_TOKEN_UAMPERSAND, PM_TOKEN_USTAR, PM_TOKEN_USTAR_STAR))) ||
                    (pm_accepts_block_stack_p(parser) && match1(parser, PM_TOKEN_KEYWORD_DO)) ||
                    match1(parser, PM_TOKEN_BRACE_LEFT)
                ) {
                    const arguments_ = {
                        opening_loc: PM_LOCATION_UNSET,
                        arguments: null,
                        closing_loc: PM_LOCATION_UNSET,
                        block: null,
                        has_forwarding: false
                    };
                    parse_arguments_list(parser, arguments_, true, accepts_command_call, depth + 1);
                    const fcall = pm_call_node_fcall_create(parser, identifier, arguments_);

                    if (PM_NODE_TYPE_P(node, PM_IT_LOCAL_VARIABLE_READ_NODE)) {
                        // If we're about to convert an 'it' implicit local
                        // variable read into a method call, we need to remove
                        // it from the list of implicit local variables.
                        pm_node_unreference(parser, node);
                    } else {
                        // Otherwise, we're about to convert a regular local
                        // variable read into a method call, in which case we
                        // need to indicate that this was not a read for the
                        // purposes of warnings.
                        // assert(PM_NODE_TYPE_P(node, PM_LOCAL_VARIABLE_READ_NODE)): debug-only in C.

                        if (pm_token_is_numbered_parameter(identifier.start, identifier.end)) {
                            pm_node_unreference(parser, node);
                        } else {
                            pm_locals_unread(pm_parser_scope_find(parser, node.depth).locals, node.name);
                        }
                    }

                    return fcall;
                }
            }

            if ((binding_power === PM_BINDING_POWER_STATEMENT) && match1(parser, PM_TOKEN_COMMA)) {
                node = parse_targets_validate(parser, node, PM_BINDING_POWER_INDEX, depth + 1);
            }

            return node;
        }
        case PM_TOKEN_HEREDOC_START: {
            // Here we have found a heredoc. We'll parse it and add it to the
            // list of strings.
            // assert(parser.lex_modes.current.mode === PM_LEX_HEREDOC): debug-only in C.
            const lex_mode = { ...parser.lex_modes.current.as.heredoc.base };

            const common_whitespace = { value: -1 };
            parser.lex_modes.current.as.heredoc.common_whitespace = common_whitespace;

            parser_lex(parser);
            const opening = copyToken(parser.previous);

            let node;
            let part;

            if (match2(parser, PM_TOKEN_HEREDOC_END, PM_TOKEN_EOF)) {
                // If we get here, then we have an empty heredoc. We'll create
                // an empty content token and return an empty string node.
                expect1_heredoc_term(parser, lex_mode.ident_start, lex_mode.ident_length);
                const content = parse_strings_empty_content(parser.previous.start);

                if (lex_mode.quote === PM_HEREDOC_QUOTE_BACKTICK) {
                    node = pm_xstring_node_create_unescaped(parser, opening, content, parser.previous, "");
                } else {
                    node = pm_string_node_create_unescaped(parser, opening, content, parser.previous, "");
                }

                node.location.end = opening.end;
            } else if ((part = parse_string_part(parser, depth + 1)) === null) {
                // If we get here, then we tried to find something in the
                // heredoc but couldn't actually parse anything, so we'll just
                // return a missing node.
                //
                // parse_string_part handles its own errors, so there is no need
                // for us to add one here.
                node = pm_missing_node_create(parser, parser.previous.start, parser.previous.end);
            } else if (PM_NODE_TYPE_P(part, PM_STRING_NODE) && match2(parser, PM_TOKEN_HEREDOC_END, PM_TOKEN_EOF)) {
                // If we get here, then the part that we parsed was plain string
                // content and we're at the end of the heredoc, so we can return
                // just a string node with the heredoc opening and closing as
                // its opening and closing.
                pm_node_flag_set(part, parse_unescaped_encoding(parser));

                part.opening_loc = PM_LOCATION_TOKEN_VALUE(opening);
                part.closing_loc = PM_LOCATION_TOKEN_VALUE(parser.current);
                part.location = { ...part.opening_loc };

                if (lex_mode.quote === PM_HEREDOC_QUOTE_BACKTICK) {
                    // assert(sizeof(pm_string_node_t) == sizeof(pm_x_string_node_t)): debug-only in C.
                    part.type = PM_X_STRING_NODE;
                }

                if (lex_mode.indent === PM_HEREDOC_INDENT_TILDE && (common_whitespace.value !== -1) && (common_whitespace.value !== 0)) {
                    part.unescaped = parse_heredoc_dedent_string(part.unescaped, common_whitespace.value);
                }

                node = part;
                expect1_heredoc_term(parser, lex_mode.ident_start, lex_mode.ident_length);
            } else {
                // If we get here, then we have multiple parts in the heredoc,
                // so we'll need to create an interpolated string node to hold
                // them all.
                const parts = [];
                pm_node_list_append(parts, part);

                while (!match2(parser, PM_TOKEN_HEREDOC_END, PM_TOKEN_EOF)) {
                    if ((part = parse_string_part(parser, depth + 1)) !== null) {
                        pm_node_list_append(parts, part);
                    }
                }

                // Now that we have all of the parts, create the correct type of
                // interpolated node.
                if (lex_mode.quote === PM_HEREDOC_QUOTE_BACKTICK) {
                    const cast = pm_interpolated_xstring_node_create(parser, opening, opening);
                    cast.parts = parts;

                    expect1_heredoc_term(parser, lex_mode.ident_start, lex_mode.ident_length);
                    pm_interpolated_xstring_node_closing_set(cast, parser.previous);

                    cast.location = { ...cast.opening_loc };
                    node = cast;
                } else {
                    const cast = pm_interpolated_string_node_create(parser, opening, parts, opening);

                    expect1_heredoc_term(parser, lex_mode.ident_start, lex_mode.ident_length);
                    pm_interpolated_string_node_closing_set(cast, parser.previous);

                    cast.location = { ...cast.opening_loc };
                    node = cast;
                }

                // If this is a heredoc that is indented with a ~, then we need
                // to dedent each line by the common leading whitespace.
                if (lex_mode.indent === PM_HEREDOC_INDENT_TILDE && (common_whitespace.value !== -1) && (common_whitespace.value !== 0)) {
                    const nodes = (lex_mode.quote === PM_HEREDOC_QUOTE_BACKTICK) ? node.parts : node.parts;
                    parse_heredoc_dedent(parser, nodes, common_whitespace.value);
                }
            }

            if (match1(parser, PM_TOKEN_STRING_BEGIN)) {
                return parse_strings(parser, node, false, depth + 1);
            }

            return node;
        }
        case PM_TOKEN_INSTANCE_VARIABLE: {
            parser_lex(parser);
            let node = pm_instance_variable_read_node_create(parser, parser.previous);

            if (binding_power === PM_BINDING_POWER_STATEMENT && match1(parser, PM_TOKEN_COMMA)) {
                node = parse_targets_validate(parser, node, PM_BINDING_POWER_INDEX, depth + 1);
            }

            return node;
        }
        case PM_TOKEN_INTEGER: {
            const base = parser.integer_base;
            parser_lex(parser);
            return pm_integer_node_create(parser, base, parser.previous);
        }
        case PM_TOKEN_INTEGER_IMAGINARY: {
            const base = parser.integer_base;
            parser_lex(parser);
            return pm_integer_node_imaginary_create(parser, base, parser.previous);
        }
        case PM_TOKEN_INTEGER_RATIONAL: {
            const base = parser.integer_base;
            parser_lex(parser);
            return pm_integer_node_rational_create(parser, base, parser.previous);
        }
        case PM_TOKEN_INTEGER_RATIONAL_IMAGINARY: {
            const base = parser.integer_base;
            parser_lex(parser);
            return pm_integer_node_rational_imaginary_create(parser, base, parser.previous);
        }
        case PM_TOKEN_KEYWORD___ENCODING__:
            parser_lex(parser);
            return pm_source_encoding_node_create(parser, parser.previous);
        case PM_TOKEN_KEYWORD___FILE__:
            parser_lex(parser);
            return pm_source_file_node_create(parser, parser.previous);
        case PM_TOKEN_KEYWORD___LINE__:
            parser_lex(parser);
            return pm_source_line_node_create(parser, parser.previous);
        case PM_TOKEN_KEYWORD_ALIAS: {
            if (binding_power !== PM_BINDING_POWER_STATEMENT) {
                pm_parser_err_current(parser, PM_ERR_STATEMENT_ALIAS);
            }

            parser_lex(parser);
            const keyword = copyToken(parser.previous);

            const new_name = parse_alias_argument(parser, true, depth + 1);
            const old_name = parse_alias_argument(parser, false, depth + 1);

            {
                const new_name_type = new_name.type;

                if (new_name_type === PM_BACK_REFERENCE_READ_NODE || new_name_type === PM_NUMBERED_REFERENCE_READ_NODE || new_name_type === PM_GLOBAL_VARIABLE_READ_NODE) {
                    if (old_name.type === PM_BACK_REFERENCE_READ_NODE || old_name.type === PM_NUMBERED_REFERENCE_READ_NODE || old_name.type === PM_GLOBAL_VARIABLE_READ_NODE) {
                        if (old_name.type === PM_NUMBERED_REFERENCE_READ_NODE) {
                            pm_parser_err_node(parser, old_name, PM_ERR_ALIAS_ARGUMENT_NUMBERED_REFERENCE);
                        }
                    } else {
                        pm_parser_err_node(parser, old_name, PM_ERR_ALIAS_ARGUMENT);
                    }

                    return pm_alias_global_variable_node_create(parser, keyword, new_name, old_name);
                } else {
                    // PM_SYMBOL_NODE / PM_INTERPOLATED_SYMBOL_NODE fall through to
                    // the default case in C (PRISM_FALLTHROUGH).
                    if (new_name_type === PM_SYMBOL_NODE || new_name_type === PM_INTERPOLATED_SYMBOL_NODE) {
                        if (old_name.type !== PM_SYMBOL_NODE && old_name.type !== PM_INTERPOLATED_SYMBOL_NODE) {
                            pm_parser_err_node(parser, old_name, PM_ERR_ALIAS_ARGUMENT);
                        }
                    }

                    return pm_alias_method_node_create(parser, keyword, new_name, old_name);
                }
            }
        }
        case PM_TOKEN_KEYWORD_CASE: {
            const opening_newline_index = token_newline_index(parser);
            parser_lex(parser);

            const case_keyword = copyToken(parser.previous);
            let predicate = null;

            const current_block_exits = [];
            const previous_block_exits = push_block_exits(parser, current_block_exits);

            if (accept2(parser, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON)) {
                while (accept2(parser, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON));
                predicate = null;
            } else if (match3(parser, PM_TOKEN_KEYWORD_WHEN, PM_TOKEN_KEYWORD_IN, PM_TOKEN_KEYWORD_END)) {
                predicate = null;
            } else if (!token_begins_expression_p(parser.current.type)) {
                predicate = null;
            } else {
                predicate = parse_value_expression(parser, PM_BINDING_POWER_COMPOSITION, true, false, PM_ERR_CASE_EXPRESSION_AFTER_CASE, depth + 1);
                while (accept2(parser, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON));
            }

            if (match1(parser, PM_TOKEN_KEYWORD_END)) {
                parser_warn_indentation_mismatch(parser, opening_newline_index, case_keyword, false, false);
                parser_lex(parser);

                pop_block_exits(parser, previous_block_exits);

                pm_parser_err_token(parser, case_keyword, PM_ERR_CASE_MISSING_CONDITIONS);
                return pm_case_node_create(parser, case_keyword, predicate, parser.previous);
            }

            // At this point we can create a case node, though we don't yet know
            // if it is a case-in or case-when node.
            const end_keyword = not_provided(parser);
            let node;

            if (match1(parser, PM_TOKEN_KEYWORD_WHEN)) {
                const case_node = pm_case_node_create(parser, case_keyword, predicate, end_keyword);
                const literals = pm_static_literals_zeroed();

                // At this point we've seen a when keyword, so we know this is a
                // case-when node. We will continue to parse the when nodes
                // until we hit the end of the list.
                while (match1(parser, PM_TOKEN_KEYWORD_WHEN)) {
                    parser_warn_indentation_mismatch(parser, opening_newline_index, case_keyword, false, true);
                    parser_lex(parser);

                    const when_keyword = copyToken(parser.previous);
                    const when_node = pm_when_node_create(parser, when_keyword);

                    do {
                        if (accept1(parser, PM_TOKEN_USTAR)) {
                            const operator = copyToken(parser.previous);
                            const expression = parse_value_expression(parser, PM_BINDING_POWER_DEFINED, false, false, PM_ERR_EXPECT_EXPRESSION_AFTER_STAR, depth + 1);

                            const splat_node = pm_splat_node_create(parser, operator, expression);
                            pm_when_node_conditions_append(when_node, splat_node);

                            if (PM_NODE_TYPE_P(expression, PM_MISSING_NODE)) break;
                        } else {
                            const condition = parse_value_expression(parser, PM_BINDING_POWER_DEFINED, false, false, PM_ERR_CASE_EXPRESSION_AFTER_WHEN, depth + 1);
                            pm_when_node_conditions_append(when_node, condition);

                            // If we found a missing node, then this is a syntax
                            // error and we should stop looping.
                            if (PM_NODE_TYPE_P(condition, PM_MISSING_NODE)) break;

                            // If this is a string node, then we need to mark it
                            // as frozen because when clause strings are frozen.
                            if (PM_NODE_TYPE_P(condition, PM_STRING_NODE)) {
                                pm_node_flag_set(condition, PM_STRING_FLAGS_FROZEN | PM_NODE_FLAG_STATIC_LITERAL);
                            } else if (PM_NODE_TYPE_P(condition, PM_SOURCE_FILE_NODE)) {
                                pm_node_flag_set(condition, PM_NODE_FLAG_STATIC_LITERAL);
                            }

                            pm_when_clause_static_literals_add(parser, literals, condition);
                        }
                    } while (accept1(parser, PM_TOKEN_COMMA));

                    if (accept2(parser, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON)) {
                        if (accept1(parser, PM_TOKEN_KEYWORD_THEN)) {
                            pm_when_node_then_keyword_loc_set(when_node, parser.previous);
                        }
                    } else {
                        expect1(parser, PM_TOKEN_KEYWORD_THEN, PM_ERR_EXPECT_WHEN_DELIMITER);
                        pm_when_node_then_keyword_loc_set(when_node, parser.previous);
                    }

                    if (!match3(parser, PM_TOKEN_KEYWORD_WHEN, PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_KEYWORD_END)) {
                        const statements = parse_statements(parser, PM_CONTEXT_CASE_WHEN, depth + 1);
                        if (statements !== null) {
                            pm_when_node_statements_set(when_node, statements);
                        }
                    }

                    pm_case_node_condition_append(case_node, when_node);
                }

                // If we didn't parse any conditions (in or when) then we need
                // to indicate that we have an error.
                if (case_node.conditions.length === 0) {
                    pm_parser_err_token(parser, case_keyword, PM_ERR_CASE_MISSING_CONDITIONS);
                }

                node = case_node;
            } else {
                const case_node = pm_case_match_node_create(parser, case_keyword, predicate, end_keyword);

                // If this is a case-match node (i.e., it is a pattern matching
                // case statement) then we must have a predicate.
                if (predicate === null) {
                    pm_parser_err_token(parser, case_keyword, PM_ERR_CASE_MATCH_MISSING_PREDICATE);
                }

                // At this point we expect that we're parsing a case-in node. We
                // will continue to parse the in nodes until we hit the end of
                // the list.
                while (match1(parser, PM_TOKEN_KEYWORD_IN)) {
                    parser_warn_indentation_mismatch(parser, opening_newline_index, case_keyword, false, true);

                    const previous_pattern_matching_newlines = parser.pattern_matching_newlines;
                    parser.pattern_matching_newlines = true;

                    lex_state_set(parser, PM_LEX_STATE_BEG | PM_LEX_STATE_LABEL);
                    parser.command_start = false;
                    parser_lex(parser);

                    const in_keyword = copyToken(parser.previous);

                    const captures = [];
                    let pattern = parse_pattern(parser, captures, PM_PARSE_PATTERN_TOP | PM_PARSE_PATTERN_MULTI, PM_ERR_PATTERN_EXPRESSION_AFTER_IN, depth + 1);

                    parser.pattern_matching_newlines = previous_pattern_matching_newlines;

                    // Since we're in the top-level of the case-in node we need
                    // to check for guard clauses in the form of `if` or
                    // `unless` statements.
                    if (accept1(parser, PM_TOKEN_KEYWORD_IF_MODIFIER)) {
                        const keyword = copyToken(parser.previous);
                        const guard_predicate = parse_value_expression(parser, PM_BINDING_POWER_COMPOSITION, true, false, PM_ERR_CONDITIONAL_IF_PREDICATE, depth + 1);
                        pattern = pm_if_node_modifier_create(parser, pattern, keyword, guard_predicate);
                    } else if (accept1(parser, PM_TOKEN_KEYWORD_UNLESS_MODIFIER)) {
                        const keyword = copyToken(parser.previous);
                        const guard_predicate = parse_value_expression(parser, PM_BINDING_POWER_COMPOSITION, true, false, PM_ERR_CONDITIONAL_UNLESS_PREDICATE, depth + 1);
                        pattern = pm_unless_node_modifier_create(parser, pattern, keyword, guard_predicate);
                    }

                    // Now we need to check for the terminator of the in node's
                    // pattern. It can be a newline or semicolon optionally
                    // followed by a `then` keyword.
                    let then_keyword;
                    if (accept2(parser, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON)) {
                        if (accept1(parser, PM_TOKEN_KEYWORD_THEN)) {
                            then_keyword = copyToken(parser.previous);
                        } else {
                            then_keyword = not_provided(parser);
                        }
                    } else {
                        expect1(parser, PM_TOKEN_KEYWORD_THEN, PM_ERR_EXPECT_IN_DELIMITER);
                        then_keyword = copyToken(parser.previous);
                    }

                    // Now we can actually parse the statements associated with
                    // the in node.
                    let statements;
                    if (match3(parser, PM_TOKEN_KEYWORD_IN, PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_KEYWORD_END)) {
                        statements = null;
                    } else {
                        statements = parse_statements(parser, PM_CONTEXT_CASE_IN, depth + 1);
                    }

                    // Now that we have the full pattern and statements, we can
                    // create the node and attach it to the case node.
                    const condition = pm_in_node_create(parser, pattern, statements, in_keyword, then_keyword);
                    pm_case_match_node_condition_append(case_node, condition);
                }

                // If we didn't parse any conditions (in or when) then we need
                // to indicate that we have an error.
                if (case_node.conditions.length === 0) {
                    pm_parser_err_token(parser, case_keyword, PM_ERR_CASE_MISSING_CONDITIONS);
                }

                node = case_node;
            }

            accept2(parser, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON);
            if (accept1(parser, PM_TOKEN_KEYWORD_ELSE)) {
                const else_keyword = copyToken(parser.previous);
                let else_node;

                if (!match1(parser, PM_TOKEN_KEYWORD_END)) {
                    else_node = pm_else_node_create(parser, else_keyword, parse_statements(parser, PM_CONTEXT_ELSE, depth + 1), parser.current);
                } else {
                    else_node = pm_else_node_create(parser, else_keyword, null, parser.current);
                }

                if (PM_NODE_TYPE_P(node, PM_CASE_NODE)) {
                    pm_case_node_else_clause_set(node, else_node);
                } else {
                    pm_case_match_node_else_clause_set(node, else_node);
                }
            }

            parser_warn_indentation_mismatch(parser, opening_newline_index, case_keyword, false, false);
            expect1_opening(parser, PM_TOKEN_KEYWORD_END, PM_ERR_CASE_TERM, case_keyword);

            if (PM_NODE_TYPE_P(node, PM_CASE_NODE)) {
                pm_case_node_end_keyword_loc_set(node, parser.previous);
            } else {
                pm_case_match_node_end_keyword_loc_set(node, parser.previous);
            }

            pop_block_exits(parser, previous_block_exits);

            return node;
        }
        case PM_TOKEN_KEYWORD_BEGIN: {
            const opening_newline_index = token_newline_index(parser);
            parser_lex(parser);

            const begin_keyword = copyToken(parser.previous);
            accept2(parser, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON);

            const current_block_exits = [];
            const previous_block_exits = push_block_exits(parser, current_block_exits);
            let begin_statements = null;

            if (!match4(parser, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_KEYWORD_END)) {
                pm_accepts_block_stack_push(parser, true);
                begin_statements = parse_statements(parser, PM_CONTEXT_BEGIN, depth + 1);
                pm_accepts_block_stack_pop(parser);
                accept2(parser, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON);
            }

            const begin_node = pm_begin_node_create(parser, begin_keyword, begin_statements);
            parse_rescues(parser, opening_newline_index, begin_keyword, begin_node, PM_RESCUES_BEGIN, depth + 1);
            expect1_opening(parser, PM_TOKEN_KEYWORD_END, PM_ERR_BEGIN_TERM, begin_keyword);

            begin_node.location.end = parser.previous.end;
            pm_begin_node_end_keyword_set(begin_node, parser.previous);

            pop_block_exits(parser, previous_block_exits);

            return begin_node;
        }
        case PM_TOKEN_KEYWORD_BEGIN_UPCASE: {
            const current_block_exits = [];
            const previous_block_exits = push_block_exits(parser, current_block_exits);

            if (binding_power !== PM_BINDING_POWER_STATEMENT) {
                pm_parser_err_current(parser, PM_ERR_STATEMENT_PREEXE_BEGIN);
            }

            parser_lex(parser);
            const keyword = copyToken(parser.previous);

            expect1(parser, PM_TOKEN_BRACE_LEFT, PM_ERR_BEGIN_UPCASE_BRACE);
            const opening = copyToken(parser.previous);
            const statements = parse_statements(parser, PM_CONTEXT_PREEXE, depth + 1);

            expect1_opening(parser, PM_TOKEN_BRACE_RIGHT, PM_ERR_BEGIN_UPCASE_TERM, opening);
            const context = parser.current_context.context;
            if ((context !== PM_CONTEXT_MAIN) && (context !== PM_CONTEXT_PREEXE)) {
                pm_parser_err_token(parser, keyword, PM_ERR_BEGIN_UPCASE_TOPLEVEL);
            }

            flush_block_exits(parser, previous_block_exits);

            return pm_pre_execution_node_create(parser, keyword, opening, statements, parser.previous);
        }
        case PM_TOKEN_KEYWORD_BREAK:
        case PM_TOKEN_KEYWORD_NEXT:
        case PM_TOKEN_KEYWORD_RETURN: {
            parser_lex(parser);

            const keyword = copyToken(parser.previous);
            const arguments_ = {
                opening_loc: PM_LOCATION_UNSET,
                arguments: null,
                closing_loc: PM_LOCATION_UNSET,
                block: null,
                has_forwarding: false
            };

            if (
                token_begins_expression_p(parser.current.type) ||
                match2(parser, PM_TOKEN_USTAR, PM_TOKEN_USTAR_STAR)
            ) {
                const argument_binding_power = pm_binding_powers[parser.current.type].left;

                if (argument_binding_power === PM_BINDING_POWER_UNSET || argument_binding_power >= PM_BINDING_POWER_RANGE) {
                    const next = copyToken(parser.current);
                    parse_arguments(parser, arguments_, false, PM_TOKEN_EOF, depth + 1);

                    // Reject `foo && return bar`.
                    if (!accepts_command_call && arguments_.arguments !== null) {
                        PM_PARSER_ERR_TOKEN_FORMAT(parser, next, PM_ERR_EXPECT_EOL_AFTER_STATEMENT, pm_token_type_human(next.type));
                    }
                }
            }

            switch (keyword.type) {
                case PM_TOKEN_KEYWORD_BREAK: {
                    const node = pm_break_node_create(parser, keyword, arguments_.arguments);
                    if (!parser.partial_script) parse_block_exit(parser, node);
                    return node;
                }
                case PM_TOKEN_KEYWORD_NEXT: {
                    const node = pm_next_node_create(parser, keyword, arguments_.arguments);
                    if (!parser.partial_script) parse_block_exit(parser, node);
                    return node;
                }
                case PM_TOKEN_KEYWORD_RETURN: {
                    const node = pm_return_node_create(parser, keyword, arguments_.arguments);
                    parse_return(parser, node);
                    return node;
                }
                default:
                    // assert(false && "unreachable"): debug-only in C.
                    return pm_missing_node_create(parser, parser.previous.start, parser.previous.end);
            }
        }
        case PM_TOKEN_KEYWORD_SUPER: {
            parser_lex(parser);

            const keyword = copyToken(parser.previous);
            const arguments_ = {
                opening_loc: PM_LOCATION_UNSET,
                arguments: null,
                closing_loc: PM_LOCATION_UNSET,
                block: null,
                has_forwarding: false
            };
            parse_arguments_list(parser, arguments_, true, accepts_command_call, depth + 1);

            if (
                arguments_.opening_loc.start === null &&
                arguments_.arguments === null &&
                ((arguments_.block === null) || PM_NODE_TYPE_P(arguments_.block, PM_BLOCK_NODE))
            ) {
                return pm_forwarding_super_node_create(parser, keyword, arguments_);
            }

            return pm_super_node_create(parser, keyword, arguments_);
        }
        case PM_TOKEN_KEYWORD_YIELD: {
            parser_lex(parser);

            const keyword = copyToken(parser.previous);
            const arguments_ = {
                opening_loc: PM_LOCATION_UNSET,
                arguments: null,
                closing_loc: PM_LOCATION_UNSET,
                block: null,
                has_forwarding: false
            };
            parse_arguments_list(parser, arguments_, false, accepts_command_call, depth + 1);

            // It's possible that we've parsed a block argument through our
            // call to parse_arguments_list. If we found one, we should mark it
            // as invalid and destroy it, as we don't have a place for it on the
            // yield node.
            if (arguments_.block !== null) {
                pm_parser_err_node(parser, arguments_.block, PM_ERR_UNEXPECTED_BLOCK_ARGUMENT);
                pm_node_unreference(parser, arguments_.block);
                arguments_.block = null;
            }

            const node = pm_yield_node_create(parser, keyword, arguments_.opening_loc, arguments_.arguments, arguments_.closing_loc);
            if (!parser.parsing_eval && !parser.partial_script) parse_yield(parser, node);

            return node;
        }
        case PM_TOKEN_KEYWORD_CLASS: {
            const opening_newline_index = token_newline_index(parser);
            parser_lex(parser);

            const class_keyword = copyToken(parser.previous);
            pm_do_loop_stack_push(parser, false);

            const current_block_exits = [];
            const previous_block_exits = push_block_exits(parser, current_block_exits);

            if (accept1(parser, PM_TOKEN_LESS_LESS)) {
                const operator = copyToken(parser.previous);
                const expression = parse_value_expression(parser, PM_BINDING_POWER_COMPOSITION, true, false, PM_ERR_EXPECT_EXPRESSION_AFTER_LESS_LESS, depth + 1);

                pm_parser_scope_push(parser, true);
                if (!match2(parser, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON)) {
                    PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, PM_ERR_EXPECT_SINGLETON_CLASS_DELIMITER, pm_token_type_human(parser.current.type));
                }

                let statements = null;
                if (!match4(parser, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_KEYWORD_END)) {
                    pm_accepts_block_stack_push(parser, true);
                    statements = parse_statements(parser, PM_CONTEXT_SCLASS, depth + 1);
                    pm_accepts_block_stack_pop(parser);
                }

                if (match2(parser, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ENSURE)) {
                    // assert(statements == NULL || PM_NODE_TYPE_P(statements, PM_STATEMENTS_NODE)): debug-only in C.
                    statements = parse_rescues_implicit_begin(parser, opening_newline_index, class_keyword, class_keyword.start, statements, PM_RESCUES_SCLASS, depth + 1);
                } else {
                    parser_warn_indentation_mismatch(parser, opening_newline_index, class_keyword, false, false);
                }

                expect1_opening(parser, PM_TOKEN_KEYWORD_END, PM_ERR_CLASS_TERM, class_keyword);

                const locals = pm_locals_order(parser, parser.current_scope.locals, false);

                pm_parser_scope_pop(parser);
                pm_do_loop_stack_pop(parser);

                flush_block_exits(parser, previous_block_exits);

                return pm_singleton_class_node_create(parser, locals, class_keyword, operator, expression, statements, parser.previous);
            }

            const constant_path = parse_expression(parser, PM_BINDING_POWER_INDEX, false, false, PM_ERR_CLASS_NAME, depth + 1);
            const name = copyToken(parser.previous);
            if (name.type !== PM_TOKEN_CONSTANT) {
                pm_parser_err_token(parser, name, PM_ERR_CLASS_NAME);
            }

            let inheritance_operator;
            let superclass;

            if (match1(parser, PM_TOKEN_LESS)) {
                inheritance_operator = copyToken(parser.current);
                lex_state_set(parser, PM_LEX_STATE_BEG);

                parser.command_start = true;
                parser_lex(parser);

                superclass = parse_value_expression(parser, PM_BINDING_POWER_COMPOSITION, true, false, PM_ERR_CLASS_SUPERCLASS, depth + 1);
            } else {
                inheritance_operator = not_provided(parser);
                superclass = null;
            }

            pm_parser_scope_push(parser, true);

            if (inheritance_operator.type !== PM_TOKEN_NOT_PROVIDED) {
                expect2(parser, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON, PM_ERR_CLASS_UNEXPECTED_END);
            } else {
                accept2(parser, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON);
            }
            let statements = null;

            if (!match4(parser, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_KEYWORD_END)) {
                pm_accepts_block_stack_push(parser, true);
                statements = parse_statements(parser, PM_CONTEXT_CLASS, depth + 1);
                pm_accepts_block_stack_pop(parser);
            }

            if (match2(parser, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ENSURE)) {
                // assert(statements == NULL || PM_NODE_TYPE_P(statements, PM_STATEMENTS_NODE)): debug-only in C.
                statements = parse_rescues_implicit_begin(parser, opening_newline_index, class_keyword, class_keyword.start, statements, PM_RESCUES_CLASS, depth + 1);
            } else {
                parser_warn_indentation_mismatch(parser, opening_newline_index, class_keyword, false, false);
            }

            expect1_opening(parser, PM_TOKEN_KEYWORD_END, PM_ERR_CLASS_TERM, class_keyword);

            if (context_def_p(parser)) {
                pm_parser_err_token(parser, class_keyword, PM_ERR_CLASS_IN_METHOD);
            }

            const locals = pm_locals_order(parser, parser.current_scope.locals, false);

            pm_parser_scope_pop(parser);
            pm_do_loop_stack_pop(parser);

            if (!PM_NODE_TYPE_P(constant_path, PM_CONSTANT_PATH_NODE) && !(PM_NODE_TYPE_P(constant_path, PM_CONSTANT_READ_NODE))) {
                pm_parser_err_node(parser, constant_path, PM_ERR_CLASS_NAME);
            }

            pop_block_exits(parser, previous_block_exits);

            return pm_class_node_create(parser, locals, class_keyword, constant_path, name, inheritance_operator, superclass, statements, parser.previous);
        }
        case PM_TOKEN_KEYWORD_DEF: {
            const current_block_exits = [];
            const previous_block_exits = push_block_exits(parser, current_block_exits);

            const def_keyword = copyToken(parser.current);
            const opening_newline_index = token_newline_index(parser);

            let receiver = null;
            let operator = not_provided(parser);
            let name;

            // This context is necessary for lexing `...` in a bare params
            // correctly. It must be pushed before lexing the first param, so it
            // is here.
            context_push(parser, PM_CONTEXT_DEF_PARAMS);
            parser_lex(parser);

            // This will be false if the method name is not a valid identifier
            // but could be followed by an operator.
            let valid_name = true;

            if (PM_CASE_OPERATOR.has(parser.current.type)) {
                pm_parser_scope_push(parser, true);
                lex_state_set(parser, PM_LEX_STATE_ENDFN);
                parser_lex(parser);

                name = copyToken(parser.previous);
            } else if (parser.current.type === PM_TOKEN_IDENTIFIER) {
                parser_lex(parser);

                if (match2(parser, PM_TOKEN_DOT, PM_TOKEN_COLON_COLON)) {
                    receiver = parse_variable_call(parser);

                    pm_parser_scope_push(parser, true);
                    lex_state_set(parser, PM_LEX_STATE_FNAME);
                    parser_lex(parser);

                    operator = copyToken(parser.previous);
                    name = parse_method_definition_name(parser);
                } else {
                    pm_refute_numbered_parameter(parser, parser.previous.start, parser.previous.end);
                    pm_parser_scope_push(parser, true);

                    name = copyToken(parser.previous);
                }
            } else if (
                parser.current.type === PM_TOKEN_INSTANCE_VARIABLE ||
                parser.current.type === PM_TOKEN_CLASS_VARIABLE ||
                parser.current.type === PM_TOKEN_GLOBAL_VARIABLE ||
                parser.current.type === PM_TOKEN_CONSTANT ||
                parser.current.type === PM_TOKEN_KEYWORD_NIL ||
                parser.current.type === PM_TOKEN_KEYWORD_SELF ||
                parser.current.type === PM_TOKEN_KEYWORD_TRUE ||
                parser.current.type === PM_TOKEN_KEYWORD_FALSE ||
                parser.current.type === PM_TOKEN_KEYWORD___FILE__ ||
                parser.current.type === PM_TOKEN_KEYWORD___LINE__ ||
                parser.current.type === PM_TOKEN_KEYWORD___ENCODING__
            ) {
                // In C, PM_TOKEN_INSTANCE_VARIABLE / PM_TOKEN_CLASS_VARIABLE /
                // PM_TOKEN_GLOBAL_VARIABLE set valid_name = false and then fall
                // through to the shared code below.
                valid_name = !(
                    parser.current.type === PM_TOKEN_INSTANCE_VARIABLE ||
                    parser.current.type === PM_TOKEN_CLASS_VARIABLE ||
                    parser.current.type === PM_TOKEN_GLOBAL_VARIABLE
                );

                pm_parser_scope_push(parser, true);
                parser_lex(parser);

                const identifier = copyToken(parser.previous);

                if (match2(parser, PM_TOKEN_DOT, PM_TOKEN_COLON_COLON)) {
                    lex_state_set(parser, PM_LEX_STATE_FNAME);
                    parser_lex(parser);
                    operator = copyToken(parser.previous);

                    switch (identifier.type) {
                        case PM_TOKEN_CONSTANT:
                            receiver = pm_constant_read_node_create(parser, identifier);
                            break;
                        case PM_TOKEN_INSTANCE_VARIABLE:
                            receiver = pm_instance_variable_read_node_create(parser, identifier);
                            break;
                        case PM_TOKEN_CLASS_VARIABLE:
                            receiver = pm_class_variable_read_node_create(parser, identifier);
                            break;
                        case PM_TOKEN_GLOBAL_VARIABLE:
                            receiver = pm_global_variable_read_node_create(parser, identifier);
                            break;
                        case PM_TOKEN_KEYWORD_NIL:
                            receiver = pm_nil_node_create(parser, identifier);
                            break;
                        case PM_TOKEN_KEYWORD_SELF:
                            receiver = pm_self_node_create(parser, identifier);
                            break;
                        case PM_TOKEN_KEYWORD_TRUE:
                            receiver = pm_true_node_create(parser, identifier);
                            break;
                        case PM_TOKEN_KEYWORD_FALSE:
                            receiver = pm_false_node_create(parser, identifier);
                            break;
                        case PM_TOKEN_KEYWORD___FILE__:
                            receiver = pm_source_file_node_create(parser, identifier);
                            break;
                        case PM_TOKEN_KEYWORD___LINE__:
                            receiver = pm_source_line_node_create(parser, identifier);
                            break;
                        case PM_TOKEN_KEYWORD___ENCODING__:
                            receiver = pm_source_encoding_node_create(parser, identifier);
                            break;
                        default:
                            break;
                    }

                    name = parse_method_definition_name(parser);
                } else {
                    if (!valid_name) {
                        PM_PARSER_ERR_TOKEN_FORMAT(parser, identifier, PM_ERR_DEF_NAME, pm_token_type_human(identifier.type));
                    }

                    name = identifier;
                }
            } else if (parser.current.type === PM_TOKEN_PARENTHESIS_LEFT) {
                // The current context is `PM_CONTEXT_DEF_PARAMS`, however
                // the inner expression of this parenthesis should not be
                // processed under this context. Thus, the context is popped
                // here.
                context_pop(parser);
                parser_lex(parser);

                const lparen = copyToken(parser.previous);
                const expression = parse_value_expression(parser, PM_BINDING_POWER_COMPOSITION, true, false, PM_ERR_DEF_RECEIVER, depth + 1);

                accept1(parser, PM_TOKEN_NEWLINE);
                expect1(parser, PM_TOKEN_PARENTHESIS_RIGHT, PM_ERR_EXPECT_RPAREN);
                const rparen = copyToken(parser.previous);

                lex_state_set(parser, PM_LEX_STATE_FNAME);
                expect2(parser, PM_TOKEN_DOT, PM_TOKEN_COLON_COLON, PM_ERR_DEF_RECEIVER_TERM);

                operator = copyToken(parser.previous);
                receiver = pm_parentheses_node_create(parser, lparen, expression, rparen, 0);

                // To push `PM_CONTEXT_DEF_PARAMS` again is for the same
                // reason as described the above.
                pm_parser_scope_push(parser, true);
                context_push(parser, PM_CONTEXT_DEF_PARAMS);
                name = parse_method_definition_name(parser);
            } else {
                pm_parser_scope_push(parser, true);
                name = parse_method_definition_name(parser);
            }

            let lparen;
            let rparen;
            let params;

            let accept_endless_def = true;
            if (parser.current.type === PM_TOKEN_PARENTHESIS_LEFT) {
                parser_lex(parser);
                lparen = copyToken(parser.previous);

                if (match1(parser, PM_TOKEN_PARENTHESIS_RIGHT)) {
                    params = null;
                } else {
                    params = parse_parameters(parser, PM_BINDING_POWER_DEFINED, true, false, true, true, false, depth + 1);
                }

                lex_state_set(parser, PM_LEX_STATE_BEG);
                parser.command_start = true;

                context_pop(parser);
                if (!accept1(parser, PM_TOKEN_PARENTHESIS_RIGHT)) {
                    PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, PM_ERR_DEF_PARAMS_TERM_PAREN, pm_token_type_human(parser.current.type));
                    parser.previous.start = parser.previous.end;
                    parser.previous.type = PM_TOKEN_MISSING;
                }

                rparen = copyToken(parser.previous);
            } else if (PM_CASE_PARAMETER.has(parser.current.type)) {
                // If we're about to lex a label, we need to add the label
                // state to make sure the next newline is ignored.
                if (parser.current.type === PM_TOKEN_LABEL) {
                    lex_state_set(parser, parser.lex_state | PM_LEX_STATE_LABEL);
                }

                lparen = not_provided(parser);
                rparen = not_provided(parser);
                params = parse_parameters(parser, PM_BINDING_POWER_DEFINED, false, false, true, true, false, depth + 1);

                // Reject `def * = 1` and similar. We have to specifically check
                // for them because they create ambiguity with optional arguments.
                accept_endless_def = false;

                context_pop(parser);
            } else {
                lparen = not_provided(parser);
                rparen = not_provided(parser);
                params = null;

                context_pop(parser);
            }

            let statements = null;
            let equal;
            let end_keyword;

            if (accept1(parser, PM_TOKEN_EQUAL)) {
                if (token_is_setter_name(parser, name)) {
                    pm_parser_err_token(parser, name, PM_ERR_DEF_ENDLESS_SETTER);
                }
                if (!accept_endless_def) {
                    pm_parser_err_previous(parser, PM_ERR_DEF_ENDLESS_PARAMETERS);
                }
                if (
                    parser.current_context.context === PM_CONTEXT_DEFAULT_PARAMS &&
                    parser.current_context.prev.context === PM_CONTEXT_BLOCK_PARAMETERS
                ) {
                    PM_PARSER_ERR_FORMAT(parser, def_keyword.start, parser.previous.end, PM_ERR_UNEXPECTED_PARAMETER_DEFAULT_VALUE, "endless method definition");
                }
                equal = copyToken(parser.previous);

                context_push(parser, PM_CONTEXT_DEF);
                pm_do_loop_stack_push(parser, false);
                statements = pm_statements_node_create(parser);

                let allow_command_call;
                if (parser.version >= PM_OPTIONS_VERSION_CRUBY_4_0) {
                    allow_command_call = accepts_command_call;
                } else {
                    // Allow `def foo = puts "Hello"` but not `private def foo = puts "Hello"`
                    allow_command_call = binding_power === PM_BINDING_POWER_ASSIGNMENT || binding_power < PM_BINDING_POWER_COMPOSITION;
                }

                let statement = parse_expression(parser, PM_BINDING_POWER_DEFINED + 1, allow_command_call, false, PM_ERR_DEF_ENDLESS, depth + 1);

                if (accept1(parser, PM_TOKEN_KEYWORD_RESCUE_MODIFIER)) {
                    context_push(parser, PM_CONTEXT_RESCUE_MODIFIER);

                    const rescue_keyword = copyToken(parser.previous);
                    const value = parse_expression(parser, pm_binding_powers[PM_TOKEN_KEYWORD_RESCUE_MODIFIER].right, false, false, PM_ERR_RESCUE_MODIFIER_VALUE, depth + 1);
                    context_pop(parser);

                    statement = pm_rescue_modifier_node_create(parser, statement, rescue_keyword, value);
                }

                pm_statements_node_body_append(parser, statements, statement, false);
                pm_do_loop_stack_pop(parser);
                context_pop(parser);
                end_keyword = not_provided(parser);
            } else {
                equal = not_provided(parser);

                if (lparen.type === PM_TOKEN_NOT_PROVIDED) {
                    lex_state_set(parser, PM_LEX_STATE_BEG);
                    parser.command_start = true;
                    expect2(parser, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON, PM_ERR_DEF_PARAMS_TERM);
                } else {
                    accept2(parser, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON);
                }

                pm_accepts_block_stack_push(parser, true);
                pm_do_loop_stack_push(parser, false);

                if (!match4(parser, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_KEYWORD_END)) {
                    pm_accepts_block_stack_push(parser, true);
                    statements = parse_statements(parser, PM_CONTEXT_DEF, depth + 1);
                    pm_accepts_block_stack_pop(parser);
                }

                if (match3(parser, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_ELSE)) {
                    // assert(statements == NULL || PM_NODE_TYPE_P(statements, PM_STATEMENTS_NODE)): debug-only in C.
                    statements = parse_rescues_implicit_begin(parser, opening_newline_index, def_keyword, def_keyword.start, statements, PM_RESCUES_DEF, depth + 1);
                } else {
                    parser_warn_indentation_mismatch(parser, opening_newline_index, def_keyword, false, false);
                }

                pm_accepts_block_stack_pop(parser);
                pm_do_loop_stack_pop(parser);

                expect1_opening(parser, PM_TOKEN_KEYWORD_END, PM_ERR_DEF_TERM, def_keyword);
                end_keyword = copyToken(parser.previous);
            }

            const locals = pm_locals_order(parser, parser.current_scope.locals, false);
            pm_parser_scope_pop(parser);

            /**
             * If the final character is `@` as is the case when defining
             * methods to override the unary operators, we should ignore
             * the @ in the same way we do for symbols.
             */
            const name_id = pm_parser_constant_id_location(parser, name.start, parse_operator_symbol_name(parser, name));

            flush_block_exits(parser, previous_block_exits);

            return pm_def_node_create(
                parser,
                name_id,
                name,
                receiver,
                params,
                statements,
                locals,
                def_keyword,
                operator,
                lparen,
                rparen,
                equal,
                end_keyword
            );
        }
        case PM_TOKEN_KEYWORD_DEFINED: {
            parser_lex(parser);
            const keyword = copyToken(parser.previous);

            let lparen;
            let rparen;
            let expression;

            context_push(parser, PM_CONTEXT_DEFINED);
            const newline = accept1(parser, PM_TOKEN_NEWLINE);

            if (accept1(parser, PM_TOKEN_PARENTHESIS_LEFT)) {
                lparen = copyToken(parser.previous);

                if (newline && accept1(parser, PM_TOKEN_PARENTHESIS_RIGHT)) {
                    expression = pm_parentheses_node_create(parser, lparen, null, parser.previous, 0);
                    lparen = not_provided(parser);
                    rparen = not_provided(parser);
                } else {
                    expression = parse_expression(parser, PM_BINDING_POWER_COMPOSITION, true, false, PM_ERR_DEFINED_EXPRESSION, depth + 1);

                    if (parser.recovering) {
                        rparen = not_provided(parser);
                    } else {
                        accept1(parser, PM_TOKEN_NEWLINE);
                        expect1(parser, PM_TOKEN_PARENTHESIS_RIGHT, PM_ERR_EXPECT_RPAREN);
                        rparen = copyToken(parser.previous);
                    }
                }
            } else {
                lparen = not_provided(parser);
                rparen = not_provided(parser);
                expression = parse_expression(parser, PM_BINDING_POWER_DEFINED, false, false, PM_ERR_DEFINED_EXPRESSION, depth + 1);
            }

            context_pop(parser);
            return pm_defined_node_create(
                parser,
                lparen,
                expression,
                rparen,
                keyword
            );
        }
        case PM_TOKEN_KEYWORD_END_UPCASE: {
            if (binding_power !== PM_BINDING_POWER_STATEMENT) {
                pm_parser_err_current(parser, PM_ERR_STATEMENT_POSTEXE_END);
            }

            parser_lex(parser);
            const keyword = copyToken(parser.previous);

            if (context_def_p(parser)) {
                pm_parser_warn_token(parser, keyword, PM_WARN_END_IN_METHOD);
            }

            expect1(parser, PM_TOKEN_BRACE_LEFT, PM_ERR_END_UPCASE_BRACE);
            const opening = copyToken(parser.previous);
            const statements = parse_statements(parser, PM_CONTEXT_POSTEXE, depth + 1);

            expect1_opening(parser, PM_TOKEN_BRACE_RIGHT, PM_ERR_END_UPCASE_TERM, opening);
            return pm_post_execution_node_create(parser, keyword, opening, statements, parser.previous);
        }
        case PM_TOKEN_KEYWORD_FALSE:
            parser_lex(parser);
            return pm_false_node_create(parser, parser.previous);
        case PM_TOKEN_KEYWORD_FOR: {
            const opening_newline_index = token_newline_index(parser);
            parser_lex(parser);

            const for_keyword = copyToken(parser.previous);
            let index;

            context_push(parser, PM_CONTEXT_FOR_INDEX);

            // First, parse out the first index expression.
            if (accept1(parser, PM_TOKEN_USTAR)) {
                const star_operator = copyToken(parser.previous);
                let name = null;

                if (token_begins_expression_p(parser.current.type)) {
                    name = parse_expression(parser, PM_BINDING_POWER_INDEX, false, false, PM_ERR_EXPECT_EXPRESSION_AFTER_STAR, depth + 1);
                }

                index = pm_splat_node_create(parser, star_operator, name);
            } else if (token_begins_expression_p(parser.current.type)) {
                index = parse_expression(parser, PM_BINDING_POWER_INDEX, false, false, PM_ERR_EXPECT_EXPRESSION_AFTER_COMMA, depth + 1);
            } else {
                pm_parser_err_token(parser, for_keyword, PM_ERR_FOR_INDEX);
                index = pm_missing_node_create(parser, for_keyword.start, for_keyword.end);
            }

            // Now, if there are multiple index expressions, parse them out.
            if (match1(parser, PM_TOKEN_COMMA)) {
                index = parse_targets(parser, index, PM_BINDING_POWER_INDEX, depth + 1);
            } else {
                index = parse_target(parser, index, false, false);
            }

            context_pop(parser);
            pm_do_loop_stack_push(parser, true);

            expect1(parser, PM_TOKEN_KEYWORD_IN, PM_ERR_FOR_IN);
            const in_keyword = copyToken(parser.previous);

            const collection = parse_value_expression(parser, PM_BINDING_POWER_COMPOSITION, true, false, PM_ERR_FOR_COLLECTION, depth + 1);
            pm_do_loop_stack_pop(parser);

            let do_keyword;
            if (accept1(parser, PM_TOKEN_KEYWORD_DO_LOOP)) {
                do_keyword = copyToken(parser.previous);
            } else {
                do_keyword = not_provided(parser);
                if (!match2(parser, PM_TOKEN_SEMICOLON, PM_TOKEN_NEWLINE)) {
                    PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, PM_ERR_EXPECT_FOR_DELIMITER, pm_token_type_human(parser.current.type));
                }
            }

            let statements = null;
            if (!match1(parser, PM_TOKEN_KEYWORD_END)) {
                statements = parse_statements(parser, PM_CONTEXT_FOR, depth + 1);
            }

            parser_warn_indentation_mismatch(parser, opening_newline_index, for_keyword, false, false);
            expect1_opening(parser, PM_TOKEN_KEYWORD_END, PM_ERR_FOR_TERM, for_keyword);

            return pm_for_node_create(parser, index, collection, statements, for_keyword, in_keyword, do_keyword, parser.previous);
        }
        case PM_TOKEN_KEYWORD_IF: {
            if (parser_end_of_line_p(parser)) {
                PM_PARSER_WARN_TOKEN_FORMAT_CONTENT(parser, parser.current, PM_WARN_KEYWORD_EOL);
            }

            const opening_newline_index = token_newline_index(parser);
            const if_after_else = parser.previous.type === PM_TOKEN_KEYWORD_ELSE;
            parser_lex(parser);

            return parse_conditional(parser, PM_CONTEXT_IF, opening_newline_index, if_after_else, depth + 1);
        }
        case PM_TOKEN_KEYWORD_UNDEF: {
            if (binding_power !== PM_BINDING_POWER_STATEMENT) {
                pm_parser_err_current(parser, PM_ERR_STATEMENT_UNDEF);
            }

            parser_lex(parser);
            const undef = pm_undef_node_create(parser, parser.previous);
            let name = parse_undef_argument(parser, depth + 1);

            if (PM_NODE_TYPE_P(name, PM_MISSING_NODE)) {
            } else {
                pm_undef_node_append(undef, name);

                while (match1(parser, PM_TOKEN_COMMA)) {
                    lex_state_set(parser, PM_LEX_STATE_FNAME | PM_LEX_STATE_FITEM);
                    parser_lex(parser);
                    name = parse_undef_argument(parser, depth + 1);

                    if (PM_NODE_TYPE_P(name, PM_MISSING_NODE)) {
                        break;
                    }

                    pm_undef_node_append(undef, name);
                }
            }

            return undef;
        }
        case PM_TOKEN_KEYWORD_NOT: {
            parser_lex(parser);

            const message = copyToken(parser.previous);
            const arguments_ = {
                opening_loc: PM_LOCATION_UNSET,
                arguments: null,
                closing_loc: PM_LOCATION_UNSET,
                block: null,
                has_forwarding: false
            };
            let receiver = null;

            // If we do not accept a command call, then we also do not accept a
            // not without parentheses. In this case we need to reject this
            // syntax.
            if (!accepts_command_call && !match1(parser, PM_TOKEN_PARENTHESIS_LEFT)) {
                if (match1(parser, PM_TOKEN_PARENTHESIS_LEFT_PARENTHESES)) {
                    pm_parser_err(parser, parser.previous.end, parser.previous.end + 1, PM_ERR_EXPECT_LPAREN_AFTER_NOT_LPAREN);
                } else {
                    accept1(parser, PM_TOKEN_NEWLINE);
                    pm_parser_err_current(parser, PM_ERR_EXPECT_LPAREN_AFTER_NOT_OTHER);
                }

                return pm_missing_node_create(parser, parser.current.start, parser.current.end);
            }

            accept1(parser, PM_TOKEN_NEWLINE);

            if (accept1(parser, PM_TOKEN_PARENTHESIS_LEFT)) {
                const lparen = copyToken(parser.previous);

                if (accept1(parser, PM_TOKEN_PARENTHESIS_RIGHT)) {
                    receiver = pm_parentheses_node_create(parser, lparen, null, parser.previous, 0);
                } else {
                    arguments_.opening_loc = PM_LOCATION_TOKEN_VALUE(lparen);
                    receiver = parse_expression(parser, PM_BINDING_POWER_COMPOSITION, true, false, PM_ERR_NOT_EXPRESSION, depth + 1);

                    if (!parser.recovering) {
                        accept1(parser, PM_TOKEN_NEWLINE);
                        expect1(parser, PM_TOKEN_PARENTHESIS_RIGHT, PM_ERR_EXPECT_RPAREN);
                        arguments_.closing_loc = PM_LOCATION_TOKEN_VALUE(parser.previous);
                    }
                }
            } else {
                receiver = parse_expression(parser, PM_BINDING_POWER_NOT, true, false, PM_ERR_NOT_EXPRESSION, depth + 1);
            }

            return pm_call_node_not_create(parser, receiver, message, arguments_);
        }
        case PM_TOKEN_KEYWORD_UNLESS: {
            const opening_newline_index = token_newline_index(parser);
            parser_lex(parser);

            return parse_conditional(parser, PM_CONTEXT_UNLESS, opening_newline_index, false, depth + 1);
        }
        case PM_TOKEN_KEYWORD_MODULE: {
            const current_block_exits = [];
            const previous_block_exits = push_block_exits(parser, current_block_exits);

            const opening_newline_index = token_newline_index(parser);
            parser_lex(parser);
            const module_keyword = copyToken(parser.previous);

            let constant_path = parse_expression(parser, PM_BINDING_POWER_INDEX, false, false, PM_ERR_MODULE_NAME, depth + 1);
            let name;

            // If we can recover from a syntax error that occurred while parsing
            // the name of the module, then we'll handle that here.
            if (PM_NODE_TYPE_P(constant_path, PM_MISSING_NODE)) {
                pop_block_exits(parser, previous_block_exits);

                const missing = { type: PM_TOKEN_MISSING, start: parser.previous.end, end: parser.previous.end };
                return pm_module_node_create(parser, null, module_keyword, constant_path, missing, null, missing);
            }

            while (accept1(parser, PM_TOKEN_COLON_COLON)) {
                const double_colon = copyToken(parser.previous);

                expect1(parser, PM_TOKEN_CONSTANT, PM_ERR_CONSTANT_PATH_COLON_COLON_CONSTANT);
                constant_path = pm_constant_path_node_create(parser, constant_path, double_colon, parser.previous);
            }

            // Here we retrieve the name of the module. If it wasn't a constant,
            // then it's possible that `module foo` was passed, which is a
            // syntax error. We handle that here as well.
            // eslint-disable-next-line prefer-const -- single assignment after early-return guard; must not hoist
            name = copyToken(parser.previous);
            if (name.type !== PM_TOKEN_CONSTANT) {
                pm_parser_err_token(parser, name, PM_ERR_MODULE_NAME);
            }

            pm_parser_scope_push(parser, true);
            accept2(parser, PM_TOKEN_SEMICOLON, PM_TOKEN_NEWLINE);
            let statements = null;

            if (!match4(parser, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_KEYWORD_END)) {
                pm_accepts_block_stack_push(parser, true);
                statements = parse_statements(parser, PM_CONTEXT_MODULE, depth + 1);
                pm_accepts_block_stack_pop(parser);
            }

            if (match3(parser, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_ELSE)) {
                // assert(statements == NULL || PM_NODE_TYPE_P(statements, PM_STATEMENTS_NODE)): debug-only in C.
                statements = parse_rescues_implicit_begin(parser, opening_newline_index, module_keyword, module_keyword.start, statements, PM_RESCUES_MODULE, depth + 1);
            } else {
                parser_warn_indentation_mismatch(parser, opening_newline_index, module_keyword, false, false);
            }

            const locals = pm_locals_order(parser, parser.current_scope.locals, false);

            pm_parser_scope_pop(parser);
            expect1_opening(parser, PM_TOKEN_KEYWORD_END, PM_ERR_MODULE_TERM, module_keyword);

            if (context_def_p(parser)) {
                pm_parser_err_token(parser, module_keyword, PM_ERR_MODULE_IN_METHOD);
            }

            pop_block_exits(parser, previous_block_exits);

            return pm_module_node_create(parser, locals, module_keyword, constant_path, name, statements, parser.previous);
        }
        case PM_TOKEN_KEYWORD_NIL:
            parser_lex(parser);
            return pm_nil_node_create(parser, parser.previous);
        case PM_TOKEN_KEYWORD_REDO: {
            parser_lex(parser);

            const node = pm_redo_node_create(parser, parser.previous);
            if (!parser.partial_script) parse_block_exit(parser, node);

            return node;
        }
        case PM_TOKEN_KEYWORD_RETRY: {
            parser_lex(parser);

            const node = pm_retry_node_create(parser, parser.previous);
            parse_retry(parser, node);

            return node;
        }
        case PM_TOKEN_KEYWORD_SELF:
            parser_lex(parser);
            return pm_self_node_create(parser, parser.previous);
        case PM_TOKEN_KEYWORD_TRUE:
            parser_lex(parser);
            return pm_true_node_create(parser, parser.previous);
        case PM_TOKEN_KEYWORD_UNTIL: {
            const opening_newline_index = token_newline_index(parser);

            context_push(parser, PM_CONTEXT_LOOP_PREDICATE);
            pm_do_loop_stack_push(parser, true);

            parser_lex(parser);
            const keyword = copyToken(parser.previous);
            const predicate = parse_value_expression(parser, PM_BINDING_POWER_COMPOSITION, true, false, PM_ERR_CONDITIONAL_UNTIL_PREDICATE, depth + 1);

            pm_do_loop_stack_pop(parser);
            context_pop(parser);

            let do_keyword;
            if (accept1(parser, PM_TOKEN_KEYWORD_DO_LOOP)) {
                do_keyword = copyToken(parser.previous);
            } else {
                do_keyword = not_provided(parser);
                expect2(parser, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON, PM_ERR_CONDITIONAL_UNTIL_PREDICATE);
            }

            let statements = null;
            if (!match1(parser, PM_TOKEN_KEYWORD_END)) {
                pm_accepts_block_stack_push(parser, true);
                statements = parse_statements(parser, PM_CONTEXT_UNTIL, depth + 1);
                pm_accepts_block_stack_pop(parser);
                accept2(parser, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON);
            }

            parser_warn_indentation_mismatch(parser, opening_newline_index, keyword, false, false);
            expect1_opening(parser, PM_TOKEN_KEYWORD_END, PM_ERR_UNTIL_TERM, keyword);

            return pm_until_node_create(parser, keyword, do_keyword, parser.previous, predicate, statements, 0);
        }
        case PM_TOKEN_KEYWORD_WHILE: {
            const opening_newline_index = token_newline_index(parser);

            context_push(parser, PM_CONTEXT_LOOP_PREDICATE);
            pm_do_loop_stack_push(parser, true);

            parser_lex(parser);
            const keyword = copyToken(parser.previous);
            const predicate = parse_value_expression(parser, PM_BINDING_POWER_COMPOSITION, true, false, PM_ERR_CONDITIONAL_WHILE_PREDICATE, depth + 1);

            pm_do_loop_stack_pop(parser);
            context_pop(parser);

            let do_keyword;
            if (accept1(parser, PM_TOKEN_KEYWORD_DO_LOOP)) {
                do_keyword = copyToken(parser.previous);
            } else {
                do_keyword = not_provided(parser);
                expect2(parser, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON, PM_ERR_CONDITIONAL_WHILE_PREDICATE);
            }

            let statements = null;
            if (!match1(parser, PM_TOKEN_KEYWORD_END)) {
                pm_accepts_block_stack_push(parser, true);
                statements = parse_statements(parser, PM_CONTEXT_WHILE, depth + 1);
                pm_accepts_block_stack_pop(parser);
                accept2(parser, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON);
            }

            parser_warn_indentation_mismatch(parser, opening_newline_index, keyword, false, false);
            expect1_opening(parser, PM_TOKEN_KEYWORD_END, PM_ERR_WHILE_TERM, keyword);

            return pm_while_node_create(parser, keyword, do_keyword, parser.previous, predicate, statements, 0);
        }
        case PM_TOKEN_PERCENT_LOWER_I:
            return parse_percent_list_plain(parser, true, PM_ERR_LIST_I_LOWER_ELEMENT, PM_ERR_LIST_I_LOWER_TERM);
        case PM_TOKEN_PERCENT_UPPER_I:
            return parse_percent_list_interpolated(parser, depth, true, PM_ERR_LIST_I_UPPER_ELEMENT, PM_ERR_LIST_I_UPPER_TERM);
        case PM_TOKEN_PERCENT_LOWER_W:
            return parse_percent_list_plain(parser, false, PM_ERR_LIST_W_LOWER_ELEMENT, PM_ERR_LIST_W_LOWER_TERM);
        case PM_TOKEN_PERCENT_UPPER_W:
            return parse_percent_list_interpolated(parser, depth, false, PM_ERR_LIST_W_UPPER_ELEMENT, PM_ERR_LIST_W_UPPER_TERM);
        case PM_TOKEN_REGEXP_BEGIN: {
            const opening = copyToken(parser.current);
            parser_lex(parser);

            if (match1(parser, PM_TOKEN_REGEXP_END)) {
                // If we get here, then we have an end immediately after a start. In
                // that case we'll create an empty content token and return an
                // uninterpolated regular expression.
                const content = {
                    type: PM_TOKEN_STRING_CONTENT,
                    start: parser.previous.end,
                    end: parser.previous.end
                };

                parser_lex(parser);

                const node = pm_regular_expression_node_create(parser, opening, content, parser.previous);
                node.unescaped_shared = true; // C: &PM_STRING_EMPTY (PM_STRING_SHARED)
                pm_node_flag_set(node, PM_REGULAR_EXPRESSION_FLAGS_FORCED_US_ASCII_ENCODING);

                return node;
            }

            let interpolated;

            if (match1(parser, PM_TOKEN_STRING_CONTENT)) {
                // In this case we've hit string content so we know the regular
                // expression at least has something in it. We'll need to check if the
                // following token is the end (in which case we can return a plain
                // regular expression) or if it's not then it has interpolation.
                const unescaped = parser.current_string;
                const unescaped_shared = parser.current_string_shared;
                const content = copyToken(parser.current);
                const ascii_only = parser.current_regular_expression_ascii_only;
                parser_lex(parser);

                // If we hit an end, then we can create a regular expression
                // node without interpolation, which can be represented more
                // succinctly and more easily compiled.
                if (accept1(parser, PM_TOKEN_REGEXP_END)) {
                    const node = pm_regular_expression_node_create_unescaped(parser, opening, content, parser.previous, unescaped);
                    node.unescaped_shared = unescaped_shared;

                    // If we're not immediately followed by a =~, then we want
                    // to parse all of the errors at this point. If it is
                    // followed by a =~, then it will get parsed higher up while
                    // parsing the named captures as well.
                    if (!match1(parser, PM_TOKEN_EQUAL_TILDE)) {
                        parse_regular_expression_errors(parser, node);
                    }

                    pm_node_flag_set(node, parse_and_validate_regular_expression_encoding(parser, unescaped, ascii_only, node.flags));
                    return node;
                }

                // If we get here, then we have interpolation so we'll need to create
                // a regular expression node with interpolation.
                interpolated = pm_interpolated_regular_expression_node_create(parser, opening);

                {
                    // In C these shadow the outer `opening` token.
                    const part_opening = not_provided(parser);
                    const part_closing = not_provided(parser);
                    const part = pm_string_node_create_unescaped(parser, part_opening, parser.previous, part_closing, unescaped);

                    // UNI-BUILD: C tags this part PM_STRING_FLAGS_FORCED_BINARY_ENCODING
                    // (extremely strange, but the first string part of a regular
                    // expression is always tagged binary in a US-ASCII file, no
                    // matter its contents) when encoding == &PM_ENCODING_US_ASCII_ENTRY;
                    // the source encoding is never US-ASCII here, so that never fires.

                    pm_interpolated_regular_expression_node_append(interpolated, part);
                }
            } else {
                // If the first part of the body of the regular expression is not a
                // string content, then we have interpolation and we need to create an
                // interpolated regular expression node.
                interpolated = pm_interpolated_regular_expression_node_create(parser, opening);
            }

            // Now that we're here and we have interpolation, we'll parse all of the
            // parts into the list.
            let part;
            while (!match2(parser, PM_TOKEN_REGEXP_END, PM_TOKEN_EOF)) {
                if ((part = parse_string_part(parser, depth + 1)) !== null) {
                    pm_interpolated_regular_expression_node_append(interpolated, part);
                }
            }

            let closing = copyToken(parser.current);
            if (match1(parser, PM_TOKEN_EOF)) {
                pm_parser_err_token(parser, opening, PM_ERR_REGEXP_TERM);
                closing = { type: PM_TOKEN_MISSING, start: parser.previous.end, end: parser.previous.end };
            } else {
                expect1(parser, PM_TOKEN_REGEXP_END, PM_ERR_REGEXP_TERM);
            }

            pm_interpolated_regular_expression_node_closing_set(parser, interpolated, closing);
            return interpolated;
        }
        case PM_TOKEN_BACKTICK:
        case PM_TOKEN_PERCENT_LOWER_X: {
            parser_lex(parser);
            const opening = copyToken(parser.previous);

            // When we get here, we don't know if this string is going to have
            // interpolation or not, even though it is allowed. Still, we want to be
            // able to return a string node without interpolation if we can since
            // it'll be faster.
            if (match1(parser, PM_TOKEN_STRING_END)) {
                // If we get here, then we have an end immediately after a start. In
                // that case we'll create an empty content token and return an
                // uninterpolated string.
                const content = {
                    type: PM_TOKEN_STRING_CONTENT,
                    start: parser.previous.end,
                    end: parser.previous.end
                };

                parser_lex(parser);
                return pm_xstring_node_create(parser, opening, content, parser.previous);
            }

            let node;

            if (match1(parser, PM_TOKEN_STRING_CONTENT)) {
                // In this case we've hit string content so we know the string
                // at least has something in it. We'll need to check if the
                // following token is the end (in which case we can return a
                // plain string) or if it's not then it has interpolation.
                const unescaped = parser.current_string;
                const content = copyToken(parser.current);
                parser_lex(parser);

                if (match1(parser, PM_TOKEN_STRING_END)) {
                    const uninterp = pm_xstring_node_create_unescaped(parser, opening, content, parser.current, unescaped);
                    pm_node_flag_set(uninterp, parse_unescaped_encoding(parser));
                    parser_lex(parser);
                    return uninterp;
                }

                // If we get here, then we have interpolation so we'll need to
                // create a string node with interpolation.
                node = pm_interpolated_xstring_node_create(parser, opening, opening);

                {
                    // In C these shadow the outer `opening` token.
                    const part_opening = not_provided(parser);
                    const part_closing = not_provided(parser);

                    const part = pm_string_node_create_unescaped(parser, part_opening, parser.previous, part_closing, unescaped);
                    pm_node_flag_set(part, parse_unescaped_encoding(parser));

                    pm_interpolated_xstring_node_append(node, part);
                }
            } else {
                // If the first part of the body of the string is not a string
                // content, then we have interpolation and we need to create an
                // interpolated string node.
                node = pm_interpolated_xstring_node_create(parser, opening, opening);
            }

            let part;
            while (!match2(parser, PM_TOKEN_STRING_END, PM_TOKEN_EOF)) {
                if ((part = parse_string_part(parser, depth + 1)) !== null) {
                    pm_interpolated_xstring_node_append(node, part);
                }
            }

            let closing = copyToken(parser.current);
            if (match1(parser, PM_TOKEN_EOF)) {
                pm_parser_err_token(parser, opening, PM_ERR_XSTRING_TERM);
                closing = { type: PM_TOKEN_MISSING, start: parser.previous.end, end: parser.previous.end };
            } else {
                expect1(parser, PM_TOKEN_STRING_END, PM_ERR_XSTRING_TERM);
            }
            pm_interpolated_xstring_node_closing_set(node, closing);

            return node;
        }
        case PM_TOKEN_USTAR: {
            parser_lex(parser);

            // * operators at the beginning of expressions are only valid in the
            // context of a multiple assignment. We enforce that here. We'll
            // still lex past it though and create a missing node place.
            if (binding_power !== PM_BINDING_POWER_STATEMENT) {
                pm_parser_err_prefix(parser, diag_id);
                return pm_missing_node_create(parser, parser.previous.start, parser.previous.end);
            }

            const operator = copyToken(parser.previous);
            let name = null;

            if (token_begins_expression_p(parser.current.type)) {
                name = parse_expression(parser, PM_BINDING_POWER_INDEX, false, false, PM_ERR_EXPECT_EXPRESSION_AFTER_STAR, depth + 1);
            }

            const splat = pm_splat_node_create(parser, operator, name);

            if (match1(parser, PM_TOKEN_COMMA)) {
                return parse_targets_validate(parser, splat, PM_BINDING_POWER_INDEX, depth + 1);
            } else {
                return parse_target_validate(parser, splat, true);
            }
        }
        case PM_TOKEN_BANG: {
            if (binding_power > PM_BINDING_POWER_UNARY) {
                pm_parser_err_prefix(parser, PM_ERR_UNARY_DISALLOWED);
            }

            parser_lex(parser);

            const operator = copyToken(parser.previous);
            const receiver = parse_expression(parser, pm_binding_powers[parser.previous.type].right, binding_power < PM_BINDING_POWER_MATCH, false, PM_ERR_UNARY_RECEIVER, depth + 1);
            const node = pm_call_node_unary_create(parser, operator, receiver, "!");

            pm_conditional_predicate(parser, receiver, PM_CONDITIONAL_PREDICATE_TYPE_NOT);
            return node;
        }
        case PM_TOKEN_TILDE: {
            if (binding_power > PM_BINDING_POWER_UNARY) {
                pm_parser_err_prefix(parser, PM_ERR_UNARY_DISALLOWED);
            }
            parser_lex(parser);

            const operator = copyToken(parser.previous);
            const receiver = parse_expression(parser, pm_binding_powers[parser.previous.type].right, false, false, PM_ERR_UNARY_RECEIVER, depth + 1);
            const node = pm_call_node_unary_create(parser, operator, receiver, "~");

            return node;
        }
        case PM_TOKEN_UMINUS: {
            if (binding_power > PM_BINDING_POWER_UNARY) {
                pm_parser_err_prefix(parser, PM_ERR_UNARY_DISALLOWED);
            }
            parser_lex(parser);

            const operator = copyToken(parser.previous);
            const receiver = parse_expression(parser, pm_binding_powers[parser.previous.type].right, false, false, PM_ERR_UNARY_RECEIVER, depth + 1);
            const node = pm_call_node_unary_create(parser, operator, receiver, "-@");

            return node;
        }
        case PM_TOKEN_UMINUS_NUM: {
            parser_lex(parser);

            const operator = copyToken(parser.previous);
            let node = parse_expression(parser, pm_binding_powers[parser.previous.type].right, false, false, PM_ERR_UNARY_RECEIVER, depth + 1);

            if (accept1(parser, PM_TOKEN_STAR_STAR)) {
                const exponent_operator = copyToken(parser.previous);
                const exponent = parse_expression(parser, pm_binding_powers[exponent_operator.type].right, false, false, PM_ERR_EXPECT_ARGUMENT, depth + 1);
                node = pm_call_node_binary_create(parser, node, exponent_operator, exponent, 0);
                node = pm_call_node_unary_create(parser, operator, node, "-@");
            } else {
                switch (node.type) {
                    case PM_INTEGER_NODE:
                    case PM_FLOAT_NODE:
                    case PM_RATIONAL_NODE:
                    case PM_IMAGINARY_NODE:
                        parse_negative_numeric(node);
                        break;
                    default:
                        node = pm_call_node_unary_create(parser, operator, node, "-@");
                        break;
                }
            }

            return node;
        }
        case PM_TOKEN_MINUS_GREATER: {
            const previous_lambda_enclosure_nesting = parser.lambda_enclosure_nesting;
            parser.lambda_enclosure_nesting = parser.enclosure_nesting;

            const opening_newline_index = token_newline_index(parser);
            pm_accepts_block_stack_push(parser, true);
            parser_lex(parser);

            const operator = copyToken(parser.previous);
            pm_parser_scope_push(parser, false);

            let block_parameters;

            if (parser.current.type === PM_TOKEN_PARENTHESIS_LEFT) {
                const params_opening = copyToken(parser.current);
                parser_lex(parser);

                if (match1(parser, PM_TOKEN_PARENTHESIS_RIGHT)) {
                    block_parameters = pm_block_parameters_node_create(parser, null, params_opening);
                } else {
                    block_parameters = parse_block_parameters(parser, false, params_opening, true, true, depth + 1);
                }

                accept1(parser, PM_TOKEN_NEWLINE);
                expect1(parser, PM_TOKEN_PARENTHESIS_RIGHT, PM_ERR_EXPECT_RPAREN);

                pm_block_parameters_node_closing_set(block_parameters, parser.previous);
            } else if (PM_CASE_PARAMETER.has(parser.current.type)) {
                pm_accepts_block_stack_push(parser, false);
                const params_opening = not_provided(parser);
                block_parameters = parse_block_parameters(parser, false, params_opening, true, false, depth + 1);
                pm_accepts_block_stack_pop(parser);
            } else {
                block_parameters = null;
            }

            let opening;
            let body = null;
            parser.lambda_enclosure_nesting = previous_lambda_enclosure_nesting;

            if (accept1(parser, PM_TOKEN_LAMBDA_BEGIN)) {
                opening = copyToken(parser.previous);

                if (!match1(parser, PM_TOKEN_BRACE_RIGHT)) {
                    body = parse_statements(parser, PM_CONTEXT_LAMBDA_BRACES, depth + 1);
                }

                parser_warn_indentation_mismatch(parser, opening_newline_index, operator, false, false);
                expect1_opening(parser, PM_TOKEN_BRACE_RIGHT, PM_ERR_LAMBDA_TERM_BRACE, opening);
            } else {
                expect1(parser, PM_TOKEN_KEYWORD_DO, PM_ERR_LAMBDA_OPEN);
                opening = copyToken(parser.previous);

                if (!match3(parser, PM_TOKEN_KEYWORD_END, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ENSURE)) {
                    pm_accepts_block_stack_push(parser, true);
                    body = parse_statements(parser, PM_CONTEXT_LAMBDA_DO_END, depth + 1);
                    pm_accepts_block_stack_pop(parser);
                }

                if (match2(parser, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ENSURE)) {
                    // assert(body == NULL || PM_NODE_TYPE_P(body, PM_STATEMENTS_NODE)): debug-only in C.
                    body = parse_rescues_implicit_begin(parser, opening_newline_index, operator, opening.start, body, PM_RESCUES_LAMBDA, depth + 1);
                } else {
                    parser_warn_indentation_mismatch(parser, opening_newline_index, operator, false, false);
                }

                expect1_opening(parser, PM_TOKEN_KEYWORD_END, PM_ERR_LAMBDA_TERM_END, operator);
            }

            const locals = pm_locals_order(parser, parser.current_scope.locals, pm_parser_scope_toplevel_p(parser));
            const parameters = parse_blocklike_parameters(parser, block_parameters, operator, parser.previous);

            pm_parser_scope_pop(parser);
            pm_accepts_block_stack_pop(parser);

            return pm_lambda_node_create(parser, locals, operator, opening, parser.previous, parameters, body);
        }
        case PM_TOKEN_UPLUS: {
            if (binding_power > PM_BINDING_POWER_UNARY) {
                pm_parser_err_prefix(parser, PM_ERR_UNARY_DISALLOWED);
            }
            parser_lex(parser);

            const operator = copyToken(parser.previous);
            const receiver = parse_expression(parser, pm_binding_powers[parser.previous.type].right, false, false, PM_ERR_UNARY_RECEIVER, depth + 1);
            const node = pm_call_node_unary_create(parser, operator, receiver, "+@");

            return node;
        }
        case PM_TOKEN_STRING_BEGIN:
            return parse_strings(parser, null, accepts_label, depth + 1);
        case PM_TOKEN_SYMBOL_BEGIN: {
            // pm_lex_mode_t lex_mode = *parser->lex_modes.current (struct copy
            // in C); a shallow copy suffices because parse_symbol only reads
            // .mode/.as.
            const lex_mode = { mode: parser.lex_modes.current.mode, as: parser.lex_modes.current.as };
            parser_lex(parser);

            return parse_symbol(parser, lex_mode, PM_LEX_STATE_END, depth + 1);
        }
        default: {
            const recoverable = context_recoverable(parser, parser.current);

            if (recoverable !== PM_CONTEXT_NONE) {
                parser.recovering = true;

                // If the given error is not the generic one, then we'll add it
                // here because it will provide more context in addition to the
                // recoverable error that we will also add.
                if (diag_id !== PM_ERR_CANNOT_PARSE_EXPRESSION) {
                    pm_parser_err_prefix(parser, diag_id);
                }

                // If we get here, then we are assuming this token is closing a
                // parent context, so we'll indicate that to the user so that
                // they know how we behaved.
                PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, PM_ERR_UNEXPECTED_TOKEN_CLOSE_CONTEXT, pm_token_type_human(parser.current.type), context_human(recoverable));
            } else if (diag_id === PM_ERR_CANNOT_PARSE_EXPRESSION) {
                // We're going to make a special case here, because "cannot
                // parse expression" is pretty generic, and we know here that we
                // have an unexpected token.
                PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, PM_ERR_UNEXPECTED_TOKEN_IGNORE, pm_token_type_human(parser.current.type));
            } else {
                pm_parser_err_prefix(parser, diag_id);
            }

            return pm_missing_node_create(parser, parser.previous.start, parser.previous.end);
        }
    }
}
