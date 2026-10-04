// prism.c lines 9726-12117 converted to JavaScript (ES2022).
//
// This is the entire `parser_lex` tokenizer dispatch (defined at prism.c:9734)
// plus its LEX convenience macro (prism.c:9726). Nothing else from prism.c is
// included here.
//
// This is a plain fragment: it declares consts/functions only, no
// import/export. It relies on part1/part2/part3, ast.js, token_type.js,
// options.js and the util modules being concatenated/imported around it.
//
// Adaptation notes for the integrator:
// - The LEX(token_type) macro is implemented as the setToken(parser, type)
//   helper below; every use site calls `return setToken(parser, X);`.
// - C `goto lex_next_token` (a backward jump to the top of the default-mode
//   lexing block) is translated as `continue lex_next_token`, where the block
//   is wrapped in an infinite labeled loop `lex_next_token: while (true)`.
// - Pointers into parser->source are numeric offsets (see part1). Helpers that
//   returned NULL in C return -1 here: next_newline and pm_strpbrk call sites
//   compare against -1. DEPENDENCY: util/pm_strpbrk.c has not been ported yet;
//   this fragment assumes a future `pm_strpbrk(parser, string_offset,
//   accept_Uint8Array, maximum, validate)` returning an offset or -1 (the same
//   convention as util/pm_memchr.js). Object pointers (heredoc_end,
//   next_start, explicit_encoding, common_whitespace) use null.
// - All pointer checks use strict comparisons (`!== null` / `!== -1`) because
//   offset 0 is a valid non-null position.
// - `parser->previous = parser->current` copies the token struct in C; tokens
//   are mutated in place in JS (and parse code mutates parser.previous.*), so
//   the fields are snapshotted into a fresh object.
// - `pm_token_buffer_t x = { 0 }` becomes `{ buffer: {}, cursor: null }` and
//   `pm_regexp_token_buffer_t x = { 0 }` becomes
//   `{ base: { buffer: {}, cursor: null }, regexp_buffer: {} }`; the buffers
//   are lazily initialized by pm_token_buffer_escape /
//   pm_regexp_token_buffer_escape exactly like C's zero-initialized structs.
// - memcmp against string literals ("begin", "__END__") is expanded into byte
//   comparisons; dynamic-length memcmp(terminator_start, ident_start,
//   ident_length) uses the small source_bytes_equal helper below.
// - Encoding callbacks are called as fn(parser.source, offset, n); the C
//   `parser->encoding->alnum_char(&delimiter, 1)` local-address call passes a
//   one-byte Uint8Array view.
// - asserts are debug-only in C and are omitted.

/**
 * Returns true if `length` bytes at offsets `a` and `b` of `source` are equal
 * (i.e. memcmp(source + a, source + b, length) == 0).
 */
function source_bytes_equal(source, a, b, length) {
    for (let index = 0; index < length; index++) {
        if ((source.charCodeAt(a + index) || 0) !== (source.charCodeAt(b + index) || 0)) return false;
    }

    return true;
}

/**
 * The LEX(type) macro from prism.c:9726: sets the current token's type,
 * fires the lex callback, and signals the caller to return immediately
 * (via `return setToken(...)` at each call site). Every one of
 * parser_lex's 130+ token-producing branches ends by calling this.
 */
function setToken(parser, type) {
    parser.current.type = type;
    parser_lex_callback(parser);
}

/**
 * Shared by the string and regexp modes: whether a breakpoint is the mode's
 * terminator, allowing for \r\n counting as a newline when the terminator is
 * \n and not counting one when it is \r.
 */
function lex_breakpoint_is_terminator(parser, breakpoint, term) {
    let is_terminator = ((parser.source.charCodeAt(breakpoint) || 0) === term);

    if (parser.source[breakpoint] === '\r' && peek_at(parser, breakpoint + 1) === 10 /* '\n' */) {
        if (term === 10 /* '\n' */) {
            is_terminator = true;
        }

        if (term === 13 /* '\r' */) {
            is_terminator = false;
        }
    }

    return is_terminator;
}

/**
 * Shared by the string and regexp modes: start the next token, honouring a
 * pending next_start.
 */
function lex_token_start(parser) {
    if (parser.next_start === null) {
        parser.current.start = parser.current.end;
    } else {
        parser.current.start = parser.next_start;
        parser.current.end = parser.next_start;
        parser.next_start = null;
    }
}


/**
 * Called when the parser requires a new token. The parser maintains a moving
 * window of two tokens at a time: parser.previous and parser.current. This
 * function will move the current token into the previous token and then
 * lex a new token into the current token. (prism.c:9734)
 */
function parser_lex(parser) {
    // assert(parser->current.end <= parser->end): debug-only in C.
    // C copies the token struct by value here; snapshot the fields.
    parser.previous = copyToken(parser.current);

    // This value mirrors cmd_state from CRuby.
    const previous_command_start = parser.command_start;
    parser.command_start = false;

    // This is used to communicate to the newline lexing function that we've
    // already seen a comment.
    let lexed_comment = false;

    // Here we cache the current value of the semantic token seen flag. This is
    // used to reset it in case we find a token that shouldn't flip this flag.
    const semantic_token_seen = parser.semantic_token_seen;
    parser.semantic_token_seen = true;

    switch (parser.lex_modes.current.mode) {
        case PM_LEX_DEFAULT:
        case PM_LEX_EMBEXPR:
        case PM_LEX_EMBVAR:

        // We have a specific named label here because we are going to jump back to
        // this location in the event that we have lexed a token that should not be
        // returned to the parser. This includes comments, ignored newlines, and
        // invalid tokens of some form.
        lex_next_token: while (true) {
            // If we have the special next_start pointer set, then we're going to jump
            // to that location and start lexing from there.
            if (parser.next_start !== null) {
                parser.current.end = parser.next_start;
                parser.next_start = null;
            }

            // This value mirrors space_seen from CRuby. It tracks whether or not
            // space has been eaten before the start of the next token.
            let space_seen = false;

            // First, we're going to skip past any whitespace at the front of the next
            // token.
            let chomping = true;
            while (parser.current.end < parser.end && chomping) {
                switch ((parser.source.charCodeAt(parser.current.end) || 0)) {
                    case 32: // ' '
                    case 9:  // '\t'
                    case 12: // '\f'
                    case 11: // '\v'
                        parser.current.end++;
                        space_seen = true;
                        break;
                    case 13: // '\r'
                        if (match_eol_offset(parser, 1)) {
                            chomping = false;
                        } else {
                            pm_parser_warn(parser, parser.current.end, parser.current.end + 1, PM_WARN_UNEXPECTED_CARRIAGE_RETURN);
                            parser.current.end++;
                            space_seen = true;
                        }
                        break;
                    case 92: { // '\\'
                        const eol_length = match_eol_offset(parser, 1);
                        if (eol_length) {
                            if (parser.heredoc_end !== null) {
                                parser.current.end = parser.heredoc_end;
                                parser.heredoc_end = null;
                            } else {
                                parser.current.end += eol_length + 1;
                                pm_newline_list_append(parser.newline_list, parser.current.end - 1);
                                space_seen = true;
                            }
                        } else if (pm_char_is_inline_whitespace((parser.source.charCodeAt(parser.current.end) || 0))) {
                            parser.current.end += 2;
                        } else {
                            chomping = false;
                        }

                        break;
                    }
                    default:
                        chomping = false;
                        break;
                }
            }

            // Next, we'll set to start of this token to be the current end.
            parser.current.start = parser.current.end;

            // We'll check if we're at the end of the file. If we are, then we
            // need to return the EOF token.
            if (parser.current.end >= parser.end) {
                // If we hit EOF, but the EOF came immediately after a newline,
                // set the start of the token to the newline.  This way any EOF
                // errors will be reported as happening on that line rather than
                // a line after.  For example "foo(\n" should report an error
                // on line 1 even though EOF technically occurs on line 2.
                if (parser.current.start > parser.start && (parser.source[parser.current.start - 1] === '\n')) {
                    parser.current.start -= 1;
                }
                return setToken(parser, PM_TOKEN_EOF);
            }

            // Finally, we'll check the current character to determine the next
            // token.
            switch ((parser.source.charCodeAt(parser.current.end++) || 0)) {
                case 0:    // '\0': NUL or end of script
                case 4:    // '\004': ^D
                case 26:   // '\032': ^Z
                    parser.current.end--;
                    return setToken(parser, PM_TOKEN_EOF);

                case 35: { // '#': comments
                    const ending = next_newline(parser.source, parser.current.end, parser.end - parser.current.end);
                    parser.current.end = ending === -1 ? parser.end : ending;

                    // If we found a comment while lexing, then we're going to
                    // add it to the list of comments in the file and keep
                    // lexing.
                    const comment = parser_comment(parser, PM_COMMENT_INLINE);
                    parser.comment_list.push(comment);

                    if (ending !== -1) parser.current.end++;
                    parser.current.type = PM_TOKEN_COMMENT;
                    parser_lex_callback(parser);

                    // Here, parse the comment to see if it's a magic comment
                    // and potentially change state on the parser.
                    if (!parser_lex_magic_comment(parser, semantic_token_seen) && (parser.current.start === parser.encoding_comment_start)) {
                        const length = parser.current.end - parser.current.start;

                        // If we didn't find a magic comment within the first
                        // pass and we're at the start of the file, then we need
                        // to do another pass to potentially find other patterns
                        // for encoding comments.
                        if (length >= 10 && !parser.encoding_locked) {
                            parser_lex_magic_comment_encoding(parser);
                        }
                    }

                    lexed_comment = true;
                }
                // fallthrough
                case 13: // '\r'
                case 10: { // '\n'
                    parser.semantic_token_seen = semantic_token_seen;
                    const eol_length = match_eol_at(parser, parser.current.end - 1);

                    if (eol_length) {
                        // The only way you can have carriage returns in this
                        // particular loop is if you have a carriage return
                        // followed by a newline. In that case we'll just skip
                        // over the carriage return and continue lexing, in
                        // order to make it so that the newline token
                        // encapsulates both the carriage return and the
                        // newline. Note that we need to check that we haven't
                        // already lexed a comment here because that falls
                        // through into here as well.
                        if (!lexed_comment) {
                            parser.current.end += eol_length - 1; // skip CR
                        }

                        if (parser.heredoc_end === null) {
                            pm_newline_list_append(parser.newline_list, parser.current.end - 1);
                        }
                    }

                    if (parser.heredoc_end !== null) {
                        parser_flush_heredoc_end(parser);
                    }

                    // If this is an ignored newline, then we can continue lexing after
                    // calling the callback with the ignored newline token.
                    switch (lex_state_ignored_p(parser)) {
                        case PM_IGNORED_NEWLINE_NONE:
                            break;
                        case PM_IGNORED_NEWLINE_PATTERN:
                            if (parser.pattern_matching_newlines || parser.in_keyword_arg) {
                                if (!lexed_comment) parser_lex_ignored_newline(parser);
                                lex_state_set(parser, PM_LEX_STATE_BEG);
                                parser.command_start = true;
                                parser.current.type = PM_TOKEN_NEWLINE;
                                return;
                            }
                            // fallthrough
                        case PM_IGNORED_NEWLINE_ALL:
                            if (!lexed_comment) parser_lex_ignored_newline(parser);
                            lexed_comment = false;
                            continue lex_next_token;
                    }

                    // Here we need to look ahead and see if there is a call operator
                    // (either . or &.) that starts the next line. If there is, then this
                    // is going to become an ignored newline and we're going to instead
                    // return the call operator.
                    let next_content = parser.next_start === null ? parser.current.end : parser.next_start;
                    next_content += pm_strspn_inline_whitespace(parser.source, next_content, parser.end - next_content);

                    if (next_content < parser.end) {
                        // If we hit a comment after a newline, then we're going to check
                        // if it's ignored or if it's followed by a method call ('.').
                        // If it is, then we're going to call the
                        // callback with an ignored newline and then continue lexing.
                        // Otherwise we'll return a regular newline.
                        if (parser.source[next_content] === '#') {
                            // Here we look for a "." or "&." following a "\n".
                            let following = next_newline(parser.source, next_content, parser.end - next_content);

                            while (following !== -1 && (following + 1 < parser.end)) {
                                following++;
                                following += pm_strspn_inline_whitespace(parser.source, following, parser.end - following);

                                // If this is not followed by a comment, then we can break out
                                // of this loop.
                                if (peek_at(parser, following) !== 35 /* '#' */) break;

                                // If there is a comment, then we need to find the end of the
                                // comment and continue searching from there.
                                following = next_newline(parser.source, following, parser.end - following);
                            }

                            // If the lex state was ignored, we will lex the
                            // ignored newline.
                            if (lex_state_ignored_p(parser)) {
                                if (!lexed_comment) parser_lex_ignored_newline(parser);
                                lexed_comment = false;
                                continue lex_next_token;
                            }

                            // If we hit a '.' or a '&.' we will lex the ignored
                            // newline.
                            if (following !== -1 && (
                                (peek_at(parser, following) === 46 /* '.' */) ||
                                (peek_at(parser, following) === 38 /* '&' */ && peek_at(parser, following + 1) === 46 /* '.' */)
                            )) {
                                if (!lexed_comment) parser_lex_ignored_newline(parser);
                                lexed_comment = false;
                                continue lex_next_token;
                            }


                            // If we are parsing as CRuby 4.0 or later and we
                            // hit a '&&' or a '||' then we will lex the ignored
                            // newline.
                            if (
                                (parser.version >= PM_OPTIONS_VERSION_CRUBY_4_0) &&
                                following !== -1 && (
                                    (peek_at(parser, following) === 38 /* '&' */ && peek_at(parser, following + 1) === 38 /* '&' */) ||
                                    (peek_at(parser, following) === 124 /* '|' */ && peek_at(parser, following + 1) === 124 /* '|' */) ||
                                    (peek_at(parser, following) === 97 /* 'a' */ && peek_at(parser, following + 1) === 110 /* 'n' */ && peek_at(parser, following + 2) === 100 /* 'd' */ && !char_is_identifier(parser, following + 3, parser.end - (following + 3))) ||
                                    (peek_at(parser, following) === 111 /* 'o' */ && peek_at(parser, following + 1) === 114 /* 'r' */ && !char_is_identifier(parser, following + 2, parser.end - (following + 2)))
                                )
                            ) {
                                if (!lexed_comment) parser_lex_ignored_newline(parser);
                                lexed_comment = false;
                                continue lex_next_token;
                            }
                        }

                        // If we hit a . after a newline, then we're in a call chain and
                        // we need to return the call operator.
                        if (parser.source[next_content] === '.') {
                            // To match ripper, we need to emit an ignored newline even though
                            // it's a real newline in the case that we have a beginless range
                            // on a subsequent line.
                            if (peek_at(parser, next_content + 1) === 46 /* '.' */) {
                                if (!lexed_comment) parser_lex_ignored_newline(parser);
                                lex_state_set(parser, PM_LEX_STATE_BEG);
                                parser.command_start = true;
                                parser.current.type = PM_TOKEN_NEWLINE;
                                return;
                            }

                            if (!lexed_comment) parser_lex_ignored_newline(parser);
                            lex_state_set(parser, PM_LEX_STATE_DOT);
                            parser.current.start = next_content;
                            parser.current.end = next_content + 1;
                            parser.next_start = null;
                            return setToken(parser, PM_TOKEN_DOT);
                        }

                        // If we hit a &. after a newline, then we're in a call chain and
                        // we need to return the call operator.
                        if (peek_at(parser, next_content) === 38 /* '&' */ && peek_at(parser, next_content + 1) === 46 /* '.' */) {
                            if (!lexed_comment) parser_lex_ignored_newline(parser);
                            lex_state_set(parser, PM_LEX_STATE_DOT);
                            parser.current.start = next_content;
                            parser.current.end = next_content + 2;
                            parser.next_start = null;
                            return setToken(parser, PM_TOKEN_AMPERSAND_DOT);
                        }

                        if (parser.version >= PM_OPTIONS_VERSION_CRUBY_4_0) {
                            // If we hit an && then we are in a logical chain
                            // and we need to return the logical operator.
                            if (peek_at(parser, next_content) === 38 /* '&' */ && peek_at(parser, next_content + 1) === 38 /* '&' */) {
                                if (!lexed_comment) parser_lex_ignored_newline(parser);
                                lex_state_set(parser, PM_LEX_STATE_BEG);
                                parser.current.start = next_content;
                                parser.current.end = next_content + 2;
                                parser.next_start = null;
                                return setToken(parser, PM_TOKEN_AMPERSAND_AMPERSAND);
                            }

                            // If we hit a || then we are in a logical chain and
                            // we need to return the logical operator.
                            if (peek_at(parser, next_content) === 124 /* '|' */ && peek_at(parser, next_content + 1) === 124 /* '|' */) {
                                if (!lexed_comment) parser_lex_ignored_newline(parser);
                                lex_state_set(parser, PM_LEX_STATE_BEG);
                                parser.current.start = next_content;
                                parser.current.end = next_content + 2;
                                parser.next_start = null;
                                return setToken(parser, PM_TOKEN_PIPE_PIPE);
                            }

                            // If we hit an 'and' then we are in a logical chain
                            // and we need to return the logical operator.
                            if (
                                peek_at(parser, next_content) === 97 /* 'a' */ &&
                                peek_at(parser, next_content + 1) === 110 /* 'n' */ &&
                                peek_at(parser, next_content + 2) === 100 /* 'd' */ &&
                                !char_is_identifier(parser, next_content + 3, parser.end - (next_content + 3))
                            ) {
                                if (!lexed_comment) parser_lex_ignored_newline(parser);
                                lex_state_set(parser, PM_LEX_STATE_BEG);
                                parser.current.start = next_content;
                                parser.current.end = next_content + 3;
                                parser.next_start = null;
                                parser.command_start = true;
                                return setToken(parser, PM_TOKEN_KEYWORD_AND);
                            }

                            // If we hit a 'or' then we are in a logical chain
                            // and we need to return the logical operator.
                            if (
                                peek_at(parser, next_content) === 111 /* 'o' */ &&
                                peek_at(parser, next_content + 1) === 114 /* 'r' */ &&
                                !char_is_identifier(parser, next_content + 2, parser.end - (next_content + 2))
                            ) {
                                if (!lexed_comment) parser_lex_ignored_newline(parser);
                                lex_state_set(parser, PM_LEX_STATE_BEG);
                                parser.current.start = next_content;
                                parser.current.end = next_content + 2;
                                parser.next_start = null;
                                parser.command_start = true;
                                return setToken(parser, PM_TOKEN_KEYWORD_OR);
                            }
                        }
                    }

                    // At this point we know this is a regular newline, and we can set the
                    // necessary state and return the token.
                    lex_state_set(parser, PM_LEX_STATE_BEG);
                    parser.command_start = true;
                    parser.current.type = PM_TOKEN_NEWLINE;
                    if (!lexed_comment) parser_lex_callback(parser);
                    return;
                }

                // ,
                case 44: // ','
                    if ((parser.previous.type === PM_TOKEN_COMMA) && (parser.enclosure_nesting > 0)) {
                        PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, PM_ERR_ARRAY_TERM, pm_token_type_human(parser.current.type));
                    }

                    lex_state_set(parser, PM_LEX_STATE_BEG | PM_LEX_STATE_LABEL);
                    return setToken(parser, PM_TOKEN_COMMA);

                // (
                case 40: { // '('
                    let type = PM_TOKEN_PARENTHESIS_LEFT;

                    if (space_seen && (lex_state_arg_p(parser) || parser.lex_state === (PM_LEX_STATE_END | PM_LEX_STATE_LABEL))) {
                        type = PM_TOKEN_PARENTHESIS_LEFT_PARENTHESES;
                    }

                    parser.enclosure_nesting++;
                    lex_state_set(parser, PM_LEX_STATE_BEG | PM_LEX_STATE_LABEL);
                    pm_do_loop_stack_push(parser, false);
                    return setToken(parser, type);
                }

                // )
                case 41: // ')'
                    parser.enclosure_nesting--;
                    lex_state_set(parser, PM_LEX_STATE_ENDFN);
                    pm_do_loop_stack_pop(parser);
                    return setToken(parser, PM_TOKEN_PARENTHESIS_RIGHT);

                // ;
                case 59: // ';'
                    lex_state_set(parser, PM_LEX_STATE_BEG);
                    parser.command_start = true;
                    return setToken(parser, PM_TOKEN_SEMICOLON);

                // [ [] []=
                case 91: { // '['
                    parser.enclosure_nesting++;
                    let type = PM_TOKEN_BRACKET_LEFT;

                    if (lex_state_operator_p(parser)) {
                        if (match(parser, 93 /* ']' */)) {
                            parser.enclosure_nesting--;
                            lex_state_set(parser, PM_LEX_STATE_ARG);
                            if (match(parser, 61 /* '=' */)) { return setToken(parser, PM_TOKEN_BRACKET_LEFT_RIGHT_EQUAL); } else { return setToken(parser, PM_TOKEN_BRACKET_LEFT_RIGHT); }
                        }

                        lex_state_set(parser, PM_LEX_STATE_ARG | PM_LEX_STATE_LABEL);
                        return setToken(parser, type);
                    }

                    if (lex_state_beg_p(parser) || (lex_state_arg_p(parser) && (space_seen || lex_state_p(parser, PM_LEX_STATE_LABELED)))) {
                        type = PM_TOKEN_BRACKET_LEFT_ARRAY;
                    }

                    lex_state_set(parser, PM_LEX_STATE_BEG | PM_LEX_STATE_LABEL);
                    pm_do_loop_stack_push(parser, false);
                    return setToken(parser, type);
                }

                // ]
                case 93: // ']'
                    parser.enclosure_nesting--;
                    lex_state_set(parser, PM_LEX_STATE_END);
                    pm_do_loop_stack_pop(parser);
                    return setToken(parser, PM_TOKEN_BRACKET_RIGHT);

                // {
                case 123: { // '{'
                    let type = PM_TOKEN_BRACE_LEFT;

                    if (parser.enclosure_nesting === parser.lambda_enclosure_nesting) {
                        // This { begins a lambda
                        parser.command_start = true;
                        lex_state_set(parser, PM_LEX_STATE_BEG);
                        type = PM_TOKEN_LAMBDA_BEGIN;
                    } else if (lex_state_p(parser, PM_LEX_STATE_LABELED)) {
                        // This { begins a hash literal
                        lex_state_set(parser, PM_LEX_STATE_BEG | PM_LEX_STATE_LABEL);
                    } else if (lex_state_p(parser, PM_LEX_STATE_ARG_ANY | PM_LEX_STATE_END | PM_LEX_STATE_ENDFN)) {
                        // This { begins a block
                        parser.command_start = true;
                        lex_state_set(parser, PM_LEX_STATE_BEG);
                    } else if (lex_state_p(parser, PM_LEX_STATE_ENDARG)) {
                        // This { begins a block on a command
                        parser.command_start = true;
                        lex_state_set(parser, PM_LEX_STATE_BEG);
                    } else {
                        // This { begins a hash literal
                        lex_state_set(parser, PM_LEX_STATE_BEG | PM_LEX_STATE_LABEL);
                    }

                    parser.enclosure_nesting++;
                    parser.brace_nesting++;
                    pm_do_loop_stack_push(parser, false);

                    return setToken(parser, type);
                }

                // }
                case 125: // '}'
                    parser.enclosure_nesting--;
                    pm_do_loop_stack_pop(parser);

                    if ((parser.lex_modes.current.mode === PM_LEX_EMBEXPR) && (parser.brace_nesting === 0)) {
                        lex_mode_pop(parser);
                        return setToken(parser, PM_TOKEN_EMBEXPR_END);
                    }

                    parser.brace_nesting--;
                    lex_state_set(parser, PM_LEX_STATE_END);
                    return setToken(parser, PM_TOKEN_BRACE_RIGHT);

                // * ** **= *=
                case 42: { // '*'
                    if (match(parser, 42 /* '*' */)) {
                        if (match(parser, 61 /* '=' */)) {
                            lex_state_set(parser, PM_LEX_STATE_BEG);
                            return setToken(parser, PM_TOKEN_STAR_STAR_EQUAL);
                        }

                        let type = PM_TOKEN_STAR_STAR;

                        if (lex_state_spcarg_p(parser, space_seen)) {
                            pm_parser_warn_token(parser, parser.current, PM_WARN_AMBIGUOUS_PREFIX_STAR_STAR);
                            type = PM_TOKEN_USTAR_STAR;
                        } else if (lex_state_beg_p(parser)) {
                            type = PM_TOKEN_USTAR_STAR;
                        } else if (ambiguous_operator_p(parser, space_seen)) {
                            PM_PARSER_WARN_TOKEN_FORMAT(parser, parser.current, PM_WARN_AMBIGUOUS_BINARY_OPERATOR, "**", "argument prefix");
                        }

                        if (lex_state_operator_p(parser)) {
                            lex_state_set(parser, PM_LEX_STATE_ARG);
                        } else {
                            lex_state_set(parser, PM_LEX_STATE_BEG);
                        }

                        return setToken(parser, type);
                    }

                    if (match(parser, 61 /* '=' */)) {
                        lex_state_set(parser, PM_LEX_STATE_BEG);
                        return setToken(parser, PM_TOKEN_STAR_EQUAL);
                    }

                    let type = PM_TOKEN_STAR;

                    if (lex_state_spcarg_p(parser, space_seen)) {
                        pm_parser_warn_token(parser, parser.current, PM_WARN_AMBIGUOUS_PREFIX_STAR);
                        type = PM_TOKEN_USTAR;
                    } else if (lex_state_beg_p(parser)) {
                        type = PM_TOKEN_USTAR;
                    } else if (ambiguous_operator_p(parser, space_seen)) {
                        PM_PARSER_WARN_TOKEN_FORMAT(parser, parser.current, PM_WARN_AMBIGUOUS_BINARY_OPERATOR, "*", "argument prefix");
                    }

                    if (lex_state_operator_p(parser)) {
                        lex_state_set(parser, PM_LEX_STATE_ARG);
                    } else {
                        lex_state_set(parser, PM_LEX_STATE_BEG);
                    }

                    return setToken(parser, type);
                }

                // ! != !~ !@
                case 33: // '!'
                    if (lex_state_operator_p(parser)) {
                        lex_state_set(parser, PM_LEX_STATE_ARG);
                        if (match(parser, 64 /* '@' */)) {
                            return setToken(parser, PM_TOKEN_BANG);
                        }
                    } else {
                        lex_state_set(parser, PM_LEX_STATE_BEG);
                    }

                    if (match(parser, 61 /* '=' */)) {
                        return setToken(parser, PM_TOKEN_BANG_EQUAL);
                    }

                    if (match(parser, 126 /* '~' */)) {
                        return setToken(parser, PM_TOKEN_BANG_TILDE);
                    }

                    return setToken(parser, PM_TOKEN_BANG);

                // = => =~ == === =begin
                case 61: // '='
                    if (
                        current_token_starts_line(parser) &&
                        (parser.current.end + 5 <= parser.end) &&
                        parser.source.startsWith("begin", parser.current.end) &&
                        (pm_char_is_whitespace(peek_offset(parser, 5)) || (peek_offset(parser, 5) === 0))
                    ) {
                        const type = lex_embdoc(parser);
                        if (type === PM_TOKEN_EOF) {
                            return setToken(parser, type);
                        }

                        continue lex_next_token;
                    }

                    if (lex_state_operator_p(parser)) {
                        lex_state_set(parser, PM_LEX_STATE_ARG);
                    } else {
                        lex_state_set(parser, PM_LEX_STATE_BEG);
                    }

                    if (match(parser, 62 /* '>' */)) {
                        return setToken(parser, PM_TOKEN_EQUAL_GREATER);
                    }

                    if (match(parser, 126 /* '~' */)) {
                        return setToken(parser, PM_TOKEN_EQUAL_TILDE);
                    }

                    if (match(parser, 61 /* '=' */)) {
                        if (match(parser, 61 /* '=' */)) { return setToken(parser, PM_TOKEN_EQUAL_EQUAL_EQUAL); } else { return setToken(parser, PM_TOKEN_EQUAL_EQUAL); }
                    }

                    return setToken(parser, PM_TOKEN_EQUAL);

                // < << <<= <= <=>
                case 60: // '<'
                    if (match(parser, 60 /* '<' */)) {
                        if (
                            !lex_state_p(parser, PM_LEX_STATE_DOT | PM_LEX_STATE_CLASS) &&
                            !lex_state_end_p(parser) &&
                            (!lex_state_p(parser, PM_LEX_STATE_ARG_ANY) || lex_state_p(parser, PM_LEX_STATE_LABELED) || space_seen)
                        ) {
                            const end = parser.current.end;

                            let quote = PM_HEREDOC_QUOTE_NONE;
                            let indent = PM_HEREDOC_INDENT_NONE;

                            if (match(parser, 45 /* '-' */)) {
                                indent = PM_HEREDOC_INDENT_DASH;
                            }
                            else if (match(parser, 126 /* '~' */)) {
                                indent = PM_HEREDOC_INDENT_TILDE;
                            }

                            if (match(parser, 96 /* '`' */)) {
                                quote = PM_HEREDOC_QUOTE_BACKTICK;
                            }
                            else if (match(parser, 34 /* '"' */)) {
                                quote = PM_HEREDOC_QUOTE_DOUBLE;
                            }
                            else if (match(parser, 39 /* '\'' */)) {
                                quote = PM_HEREDOC_QUOTE_SINGLE;
                            }

                            const ident_start = parser.current.end;
                            let width = 0;

                            if (parser.current.end >= parser.end) {
                                parser.current.end = end;
                            } else if (quote === PM_HEREDOC_QUOTE_NONE && (width = char_is_identifier(parser, parser.current.end, parser.end - parser.current.end)) === 0) {
                                parser.current.end = end;
                            } else {
                                if (quote === PM_HEREDOC_QUOTE_NONE) {
                                    parser.current.end += width;

                                    while ((width = char_is_identifier(parser, parser.current.end, parser.end - parser.current.end))) {
                                        parser.current.end += width;
                                    }
                                } else {
                                    // If we have quotes, then we're going to go until we find the
                                    // end quote.
                                    while ((parser.current.end < parser.end) && quote !== (parser.source.charCodeAt(parser.current.end) || 0)) {
                                        if (parser.source[parser.current.end] === '\r' || parser.source[parser.current.end] === '\n') break;
                                        parser.current.end++;
                                    }
                                }

                                const ident_length = parser.current.end - ident_start;
                                let ident_error = false;

                                if (quote !== PM_HEREDOC_QUOTE_NONE && !match(parser, quote)) {
                                    pm_parser_err(parser, ident_start, ident_start + ident_length, PM_ERR_HEREDOC_IDENTIFIER);
                                    ident_error = true;
                                }

                                parser.explicit_encoding = null;
                                lex_mode_push(parser, {
                                    mode: PM_LEX_HEREDOC,
                                    as: {
                                        string: null,
                                        regexp: null,
                                        list: null,
                                        heredoc: {
                                            base: {
                                                ident_start: ident_start,
                                                ident_length: ident_length,
                                                quote: quote,
                                                indent: indent
                                            },
                                            next_start: parser.current.end,
                                            common_whitespace: null,
                                            line_continuation: false
                                        }
                                    },
                                    prev: null
                                });

                                if (parser.heredoc_end === null) {
                                    let body_start = next_newline(parser.source, parser.current.end, parser.end - parser.current.end);

                                    if (body_start === -1) {
                                        // If there is no newline after the heredoc identifier, then
                                        // this is not a valid heredoc declaration. In this case we
                                        // will add an error, but we will still return a heredoc
                                        // start.
                                        if (!ident_error) pm_parser_err_heredoc_term(parser, ident_start, ident_length);
                                        body_start = parser.end;
                                    } else {
                                        // Otherwise, we want to indicate that the body of the
                                        // heredoc starts on the character after the next newline.
                                        pm_newline_list_append(parser.newline_list, body_start);
                                        body_start++;
                                    }

                                    parser.next_start = body_start;
                                } else {
                                    parser.next_start = parser.heredoc_end;
                                }

                                return setToken(parser, PM_TOKEN_HEREDOC_START);
                            }
                        }

                        if (match(parser, 61 /* '=' */)) {
                            lex_state_set(parser, PM_LEX_STATE_BEG);
                            return setToken(parser, PM_TOKEN_LESS_LESS_EQUAL);
                        }

                        if (ambiguous_operator_p(parser, space_seen)) {
                            PM_PARSER_WARN_TOKEN_FORMAT(parser, parser.current, PM_WARN_AMBIGUOUS_BINARY_OPERATOR, "<<", "here document");
                        }

                        if (lex_state_operator_p(parser)) {
                            lex_state_set(parser, PM_LEX_STATE_ARG);
                        } else {
                            if (lex_state_p(parser, PM_LEX_STATE_CLASS)) parser.command_start = true;
                            lex_state_set(parser, PM_LEX_STATE_BEG);
                        }

                        return setToken(parser, PM_TOKEN_LESS_LESS);
                    }

                    if (lex_state_operator_p(parser)) {
                        lex_state_set(parser, PM_LEX_STATE_ARG);
                    } else {
                        if (lex_state_p(parser, PM_LEX_STATE_CLASS)) parser.command_start = true;
                        lex_state_set(parser, PM_LEX_STATE_BEG);
                    }

                    if (match(parser, 61 /* '=' */)) {
                        if (match(parser, 62 /* '>' */)) {
                            return setToken(parser, PM_TOKEN_LESS_EQUAL_GREATER);
                        }

                        return setToken(parser, PM_TOKEN_LESS_EQUAL);
                    }

                    return setToken(parser, PM_TOKEN_LESS);

                // > >> >>= >=
                case 62: // '>'
                    if (match(parser, 62 /* '>' */)) {
                        if (lex_state_operator_p(parser)) {
                            lex_state_set(parser, PM_LEX_STATE_ARG);
                        } else {
                            lex_state_set(parser, PM_LEX_STATE_BEG);
                        }
                        if (match(parser, 61 /* '=' */)) { return setToken(parser, PM_TOKEN_GREATER_GREATER_EQUAL); } else { return setToken(parser, PM_TOKEN_GREATER_GREATER); }
                    }

                    if (lex_state_operator_p(parser)) {
                        lex_state_set(parser, PM_LEX_STATE_ARG);
                    } else {
                        lex_state_set(parser, PM_LEX_STATE_BEG);
                    }

                    if (match(parser, 61 /* '=' */)) { return setToken(parser, PM_TOKEN_GREATER_EQUAL); } else { return setToken(parser, PM_TOKEN_GREATER); }

                // double-quoted string literal
                case 34: { // '"'
                    const label_allowed = (lex_state_p(parser, PM_LEX_STATE_LABEL | PM_LEX_STATE_ENDFN) && !previous_command_start) || lex_state_arg_p(parser);
                    lex_mode_push_string(parser, true, label_allowed, 0, 34 /* '"' */);
                    return setToken(parser, PM_TOKEN_STRING_BEGIN);
                }

                // xstring literal
                case 96: { // '`'
                    if (lex_state_p(parser, PM_LEX_STATE_FNAME)) {
                        lex_state_set(parser, PM_LEX_STATE_ENDFN);
                        return setToken(parser, PM_TOKEN_BACKTICK);
                    }

                    if (lex_state_p(parser, PM_LEX_STATE_DOT)) {
                        if (previous_command_start) {
                            lex_state_set(parser, PM_LEX_STATE_CMDARG);
                        } else {
                            lex_state_set(parser, PM_LEX_STATE_ARG);
                        }

                        return setToken(parser, PM_TOKEN_BACKTICK);
                    }

                    lex_mode_push_string(parser, true, false, 0, 96 /* '`' */);
                    return setToken(parser, PM_TOKEN_BACKTICK);
                }

                // single-quoted string literal
                case 39: { // '\''
                    const label_allowed = (lex_state_p(parser, PM_LEX_STATE_LABEL | PM_LEX_STATE_ENDFN) && !previous_command_start) || lex_state_arg_p(parser);
                    lex_mode_push_string(parser, false, label_allowed, 0, 39 /* '\'' */);
                    return setToken(parser, PM_TOKEN_STRING_BEGIN);
                }

                // ? character literal
                case 63: // '?'
                    return setToken(parser, lex_question_mark(parser));

                // & && &&= &=
                case 38: { // '&'
                    if (match(parser, 38 /* '&' */)) {
                        lex_state_set(parser, PM_LEX_STATE_BEG);

                        if (match(parser, 61 /* '=' */)) {
                            return setToken(parser, PM_TOKEN_AMPERSAND_AMPERSAND_EQUAL);
                        }

                        return setToken(parser, PM_TOKEN_AMPERSAND_AMPERSAND);
                    }

                    if (match(parser, 61 /* '=' */)) {
                        lex_state_set(parser, PM_LEX_STATE_BEG);
                        return setToken(parser, PM_TOKEN_AMPERSAND_EQUAL);
                    }

                    if (match(parser, 46 /* '.' */)) {
                        lex_state_set(parser, PM_LEX_STATE_DOT);
                        return setToken(parser, PM_TOKEN_AMPERSAND_DOT);
                    }

                    let type = PM_TOKEN_AMPERSAND;
                    if (lex_state_spcarg_p(parser, space_seen)) {
                        if ((peek(parser) !== 58 /* ':' */) || (peek_offset(parser, 1) === 0)) {
                            pm_parser_warn_token(parser, parser.current, PM_WARN_AMBIGUOUS_PREFIX_AMPERSAND);
                        } else {
                            const delim = peek_offset(parser, 1);

                            if ((delim !== 39 /* '\'' */) && (delim !== 34 /* '"' */) && !char_is_identifier(parser, parser.current.end + 1, parser.end - (parser.current.end + 1))) {
                                pm_parser_warn_token(parser, parser.current, PM_WARN_AMBIGUOUS_PREFIX_AMPERSAND);
                            }
                        }

                        type = PM_TOKEN_UAMPERSAND;
                    } else if (lex_state_beg_p(parser)) {
                        type = PM_TOKEN_UAMPERSAND;
                    } else if (ambiguous_operator_p(parser, space_seen)) {
                        PM_PARSER_WARN_TOKEN_FORMAT(parser, parser.current, PM_WARN_AMBIGUOUS_BINARY_OPERATOR, "&", "argument prefix");
                    }

                    if (lex_state_operator_p(parser)) {
                        lex_state_set(parser, PM_LEX_STATE_ARG);
                    } else {
                        lex_state_set(parser, PM_LEX_STATE_BEG);
                    }

                    return setToken(parser, type);
                }

                // | || ||= |=
                case 124: // '|'
                    if (match(parser, 124 /* '|' */)) {
                        if (match(parser, 61 /* '=' */)) {
                            lex_state_set(parser, PM_LEX_STATE_BEG);
                            return setToken(parser, PM_TOKEN_PIPE_PIPE_EQUAL);
                        }

                        if (lex_state_p(parser, PM_LEX_STATE_BEG)) {
                            parser.current.end--;
                            return setToken(parser, PM_TOKEN_PIPE);
                        }

                        lex_state_set(parser, PM_LEX_STATE_BEG);
                        return setToken(parser, PM_TOKEN_PIPE_PIPE);
                    }

                    if (match(parser, 61 /* '=' */)) {
                        lex_state_set(parser, PM_LEX_STATE_BEG);
                        return setToken(parser, PM_TOKEN_PIPE_EQUAL);
                    }

                    if (lex_state_operator_p(parser)) {
                        lex_state_set(parser, PM_LEX_STATE_ARG);
                    } else {
                        lex_state_set(parser, PM_LEX_STATE_BEG | PM_LEX_STATE_LABEL);
                    }

                    return setToken(parser, PM_TOKEN_PIPE);

                // + += +@
                case 43: { // '+'
                    if (lex_state_operator_p(parser)) {
                        lex_state_set(parser, PM_LEX_STATE_ARG);

                        if (match(parser, 64 /* '@' */)) {
                            return setToken(parser, PM_TOKEN_UPLUS);
                        }

                        return setToken(parser, PM_TOKEN_PLUS);
                    }

                    if (match(parser, 61 /* '=' */)) {
                        lex_state_set(parser, PM_LEX_STATE_BEG);
                        return setToken(parser, PM_TOKEN_PLUS_EQUAL);
                    }

                    let ambiguous_plus = lex_state_beg_p(parser);
                    if (!ambiguous_plus && lex_state_spcarg_p(parser, space_seen)) {
                        pm_parser_warn_token(parser, parser.current, PM_WARN_AMBIGUOUS_FIRST_ARGUMENT_PLUS);
                        ambiguous_plus = true;
                    }

                    if (ambiguous_plus) {
                        lex_state_set(parser, PM_LEX_STATE_BEG);

                        if (pm_char_is_decimal_digit(peek(parser))) {
                            parser.current.end++;
                            const type = lex_numeric(parser);
                            lex_state_set(parser, PM_LEX_STATE_END);
                            return setToken(parser, type);
                        }

                        return setToken(parser, PM_TOKEN_UPLUS);
                    }

                    if (ambiguous_operator_p(parser, space_seen)) {
                        PM_PARSER_WARN_TOKEN_FORMAT(parser, parser.current, PM_WARN_AMBIGUOUS_BINARY_OPERATOR, "+", "unary operator");
                    }

                    lex_state_set(parser, PM_LEX_STATE_BEG);
                    return setToken(parser, PM_TOKEN_PLUS);
                }

                // - -= -@
                case 45: { // '-'
                    if (lex_state_operator_p(parser)) {
                        lex_state_set(parser, PM_LEX_STATE_ARG);

                        if (match(parser, 64 /* '@' */)) {
                            return setToken(parser, PM_TOKEN_UMINUS);
                        }

                        return setToken(parser, PM_TOKEN_MINUS);
                    }

                    if (match(parser, 61 /* '=' */)) {
                        lex_state_set(parser, PM_LEX_STATE_BEG);
                        return setToken(parser, PM_TOKEN_MINUS_EQUAL);
                    }

                    if (match(parser, 62 /* '>' */)) {
                        lex_state_set(parser, PM_LEX_STATE_ENDFN);
                        return setToken(parser, PM_TOKEN_MINUS_GREATER);
                    }

                    const spcarg = lex_state_spcarg_p(parser, space_seen);
                    const is_beg = lex_state_beg_p(parser);
                    if (!is_beg && spcarg) {
                        pm_parser_warn_token(parser, parser.current, PM_WARN_AMBIGUOUS_FIRST_ARGUMENT_MINUS);
                    }

                    if (is_beg || spcarg) {
                        lex_state_set(parser, PM_LEX_STATE_BEG);
                        if (pm_char_is_decimal_digit(peek(parser))) { parser.current.type = PM_TOKEN_UMINUS_NUM; } else { parser.current.type = PM_TOKEN_UMINUS; }
                        parser_lex_callback(parser); return;
                    }

                    if (ambiguous_operator_p(parser, space_seen)) {
                        PM_PARSER_WARN_TOKEN_FORMAT(parser, parser.current, PM_WARN_AMBIGUOUS_BINARY_OPERATOR, "-", "unary operator");
                    }

                    lex_state_set(parser, PM_LEX_STATE_BEG);
                    return setToken(parser, PM_TOKEN_MINUS);
                }

                // . .. ...
                case 46: { // '.'
                    const beg_p = lex_state_beg_p(parser);

                    if (match(parser, 46 /* '.' */)) {
                        if (match(parser, 46 /* '.' */)) {
                            // If we're _not_ inside a range within default parameters
                            if (!context_p(parser, PM_CONTEXT_DEFAULT_PARAMS) && context_p(parser, PM_CONTEXT_DEF_PARAMS)) {
                                if (lex_state_p(parser, PM_LEX_STATE_END)) {
                                    lex_state_set(parser, PM_LEX_STATE_BEG);
                                } else {
                                    lex_state_set(parser, PM_LEX_STATE_ENDARG);
                                }
                                return setToken(parser, PM_TOKEN_UDOT_DOT_DOT);
                            }

                            if (parser.enclosure_nesting === 0 && parser_end_of_line_p(parser)) {
                                pm_parser_warn_token(parser, parser.current, PM_WARN_DOT_DOT_DOT_EOL);
                            }

                            lex_state_set(parser, PM_LEX_STATE_BEG);
                            if (beg_p) { parser.current.type = PM_TOKEN_UDOT_DOT_DOT; } else { parser.current.type = PM_TOKEN_DOT_DOT_DOT; }
                            parser_lex_callback(parser); return;
                        }

                        lex_state_set(parser, PM_LEX_STATE_BEG);
                        if (beg_p) { parser.current.type = PM_TOKEN_UDOT_DOT; } else { parser.current.type = PM_TOKEN_DOT_DOT; }
                        parser_lex_callback(parser); return;
                    }

                    lex_state_set(parser, PM_LEX_STATE_DOT);
                    return setToken(parser, PM_TOKEN_DOT);
                }

                // integer
                case 48: // '0'
                case 49: // '1'
                case 50: // '2'
                case 51: // '3'
                case 52: // '4'
                case 53: // '5'
                case 54: // '6'
                case 55: // '7'
                case 56: // '8'
                case 57: { // '9'
                    const type = lex_numeric(parser);
                    lex_state_set(parser, PM_LEX_STATE_END);
                    return setToken(parser, type);
                }

                // :: symbol
                case 58: // ':'
                    if (match(parser, 58 /* ':' */)) {
                        if (lex_state_beg_p(parser) || lex_state_p(parser, PM_LEX_STATE_CLASS) || (lex_state_p(parser, PM_LEX_STATE_ARG_ANY) && space_seen)) {
                            lex_state_set(parser, PM_LEX_STATE_BEG);
                            return setToken(parser, PM_TOKEN_UCOLON_COLON);
                        }

                        lex_state_set(parser, PM_LEX_STATE_DOT);
                        return setToken(parser, PM_TOKEN_COLON_COLON);
                    }

                    if (lex_state_end_p(parser) || pm_char_is_whitespace(peek(parser)) || peek(parser) === 35 /* '#' */) {
                        lex_state_set(parser, PM_LEX_STATE_BEG);
                        return setToken(parser, PM_TOKEN_COLON);
                    }

                    if (peek(parser) === 34 /* '"' */ || peek(parser) === 39 /* '\'' */) {
                        lex_mode_push_string(parser, peek(parser) === 34 /* '"' */, false, 0, (parser.source.charCodeAt(parser.current.end) || 0));
                        parser.current.end++;
                    }

                    lex_state_set(parser, PM_LEX_STATE_FNAME);
                    return setToken(parser, PM_TOKEN_SYMBOL_BEGIN);

                // / /=
                case 47: // '/'
                    if (lex_state_beg_p(parser)) {
                        lex_mode_push_regexp(parser, 0, 47 /* '/' */);
                        return setToken(parser, PM_TOKEN_REGEXP_BEGIN);
                    }

                    if (match(parser, 61 /* '=' */)) {
                        lex_state_set(parser, PM_LEX_STATE_BEG);
                        return setToken(parser, PM_TOKEN_SLASH_EQUAL);
                    }

                    if (lex_state_spcarg_p(parser, space_seen)) {
                        pm_parser_warn_token(parser, parser.current, PM_WARN_AMBIGUOUS_SLASH);
                        lex_mode_push_regexp(parser, 0, 47 /* '/' */);
                        return setToken(parser, PM_TOKEN_REGEXP_BEGIN);
                    }

                    if (ambiguous_operator_p(parser, space_seen)) {
                        PM_PARSER_WARN_TOKEN_FORMAT(parser, parser.current, PM_WARN_AMBIGUOUS_BINARY_OPERATOR, "/", "regexp literal");
                    }

                    if (lex_state_operator_p(parser)) {
                        lex_state_set(parser, PM_LEX_STATE_ARG);
                    } else {
                        lex_state_set(parser, PM_LEX_STATE_BEG);
                    }

                    return setToken(parser, PM_TOKEN_SLASH);

                // ^ ^=
                case 94: // '^'
                    if (lex_state_operator_p(parser)) {
                        lex_state_set(parser, PM_LEX_STATE_ARG);
                    } else {
                        lex_state_set(parser, PM_LEX_STATE_BEG);
                    }
                    if (match(parser, 61 /* '=' */)) { return setToken(parser, PM_TOKEN_CARET_EQUAL); } else { return setToken(parser, PM_TOKEN_CARET); }

                // ~ ~@
                case 126: // '~'
                    if (lex_state_operator_p(parser)) {
                        match(parser, 64 /* '@' */);
                        lex_state_set(parser, PM_LEX_STATE_ARG);
                    } else {
                        lex_state_set(parser, PM_LEX_STATE_BEG);
                    }

                    return setToken(parser, PM_TOKEN_TILDE);

                // % %= %i %I %q %Q %w %W
                case 37: { // '%'
                    // If there is no subsequent character then we have an
                    // invalid token. We're going to say it's the percent
                    // operator because we don't want to move into the string
                    // lex mode unnecessarily.
                    if ((lex_state_beg_p(parser) || lex_state_arg_p(parser)) && (parser.current.end >= parser.end)) {
                        pm_parser_err_current(parser, PM_ERR_INVALID_PERCENT_EOF);
                        return setToken(parser, PM_TOKEN_PERCENT);
                    }

                    if (!lex_state_beg_p(parser) && match(parser, 61 /* '=' */)) {
                        lex_state_set(parser, PM_LEX_STATE_BEG);
                        return setToken(parser, PM_TOKEN_PERCENT_EQUAL);
                    } else if (
                        lex_state_beg_p(parser) ||
                        (lex_state_p(parser, PM_LEX_STATE_FITEM) && (peek(parser) === 115 /* 's' */)) ||
                        lex_state_spcarg_p(parser, space_seen)
                    ) {
                        if (!parser.encoding.alnum_char(parser.source, parser.current.end, parser.end - parser.current.end)) {
                            if ((parser.source.charCodeAt(parser.current.end) || 0) >= 0x80) {
                                pm_parser_err_current(parser, PM_ERR_INVALID_PERCENT);
                            }

                            const delimiter = pm_lex_percent_delimiter(parser);
                            lex_mode_push_string(parser, true, false, lex_mode_incrementor(delimiter), lex_mode_terminator(delimiter));
                            return setToken(parser, PM_TOKEN_STRING_BEGIN);
                        }

                        // Delimiters for %-literals cannot be alphanumeric. We
                        // validate that here.
                        const delimiter = peek_offset(parser, 1);
                        if (delimiter >= 0x80 || parser.encoding.alnum_char(parser.source, parser.current.end + 1, 1)) {
                            pm_parser_err_current(parser, PM_ERR_INVALID_PERCENT);
                            continue lex_next_token;
                        }

                        switch (peek(parser)) {
                            case 105: { // 'i'
                                parser.current.end++;

                                if (parser.current.end < parser.end) {
                                    lex_mode_push_list(parser, false, pm_lex_percent_delimiter(parser));
                                } else {
                                    lex_mode_push_list_eof(parser);
                                }

                                return setToken(parser, PM_TOKEN_PERCENT_LOWER_I);
                            }
                            case 73: { // 'I'
                                parser.current.end++;

                                if (parser.current.end < parser.end) {
                                    lex_mode_push_list(parser, true, pm_lex_percent_delimiter(parser));
                                } else {
                                    lex_mode_push_list_eof(parser);
                                }

                                return setToken(parser, PM_TOKEN_PERCENT_UPPER_I);
                            }
                            case 114: { // 'r'
                                parser.current.end++;

                                if (parser.current.end < parser.end) {
                                    const delimiter = pm_lex_percent_delimiter(parser);
                                    lex_mode_push_regexp(parser, lex_mode_incrementor(delimiter), lex_mode_terminator(delimiter));
                                } else {
                                    lex_mode_push_regexp(parser, 0, 0);
                                }

                                return setToken(parser, PM_TOKEN_REGEXP_BEGIN);
                            }
                            case 113: { // 'q'
                                parser.current.end++;

                                if (parser.current.end < parser.end) {
                                    const delimiter = pm_lex_percent_delimiter(parser);
                                    lex_mode_push_string(parser, false, false, lex_mode_incrementor(delimiter), lex_mode_terminator(delimiter));
                                } else {
                                    lex_mode_push_string_eof(parser);
                                }

                                return setToken(parser, PM_TOKEN_STRING_BEGIN);
                            }
                            case 81: { // 'Q'
                                parser.current.end++;

                                if (parser.current.end < parser.end) {
                                    const delimiter = pm_lex_percent_delimiter(parser);
                                    lex_mode_push_string(parser, true, false, lex_mode_incrementor(delimiter), lex_mode_terminator(delimiter));
                                } else {
                                    lex_mode_push_string_eof(parser);
                                }

                                return setToken(parser, PM_TOKEN_STRING_BEGIN);
                            }
                            case 115: { // 's'
                                parser.current.end++;

                                if (parser.current.end < parser.end) {
                                    const delimiter = pm_lex_percent_delimiter(parser);
                                    lex_mode_push_string(parser, false, false, lex_mode_incrementor(delimiter), lex_mode_terminator(delimiter));
                                    lex_state_set(parser, PM_LEX_STATE_FNAME | PM_LEX_STATE_FITEM);
                                } else {
                                    lex_mode_push_string_eof(parser);
                                }

                                return setToken(parser, PM_TOKEN_SYMBOL_BEGIN);
                            }
                            case 119: { // 'w'
                                parser.current.end++;

                                if (parser.current.end < parser.end) {
                                    lex_mode_push_list(parser, false, pm_lex_percent_delimiter(parser));
                                } else {
                                    lex_mode_push_list_eof(parser);
                                }

                                return setToken(parser, PM_TOKEN_PERCENT_LOWER_W);
                            }
                            case 87: { // 'W'
                                parser.current.end++;

                                if (parser.current.end < parser.end) {
                                    lex_mode_push_list(parser, true, pm_lex_percent_delimiter(parser));
                                } else {
                                    lex_mode_push_list_eof(parser);
                                }

                                return setToken(parser, PM_TOKEN_PERCENT_UPPER_W);
                            }
                            case 120: { // 'x'
                                parser.current.end++;

                                if (parser.current.end < parser.end) {
                                    const delimiter = pm_lex_percent_delimiter(parser);
                                    lex_mode_push_string(parser, true, false, lex_mode_incrementor(delimiter), lex_mode_terminator(delimiter));
                                } else {
                                    lex_mode_push_string_eof(parser);
                                }

                                return setToken(parser, PM_TOKEN_PERCENT_LOWER_X);
                            }
                            default:
                                // If we get to this point, then we have a % that is completely
                                // unparsable. In this case we'll just drop it from the parser
                                // and skip past it and hope that the next token is something
                                // that we can parse.
                                pm_parser_err_current(parser, PM_ERR_INVALID_PERCENT);
                                continue lex_next_token;
                        }
                    }

                    if (ambiguous_operator_p(parser, space_seen)) {
                        PM_PARSER_WARN_TOKEN_FORMAT(parser, parser.current, PM_WARN_AMBIGUOUS_BINARY_OPERATOR, "%", "string literal");
                    }

                    lex_state_set(parser, lex_state_operator_p(parser) ? PM_LEX_STATE_ARG : PM_LEX_STATE_BEG);
                    return setToken(parser, PM_TOKEN_PERCENT);
                }

                // global variable
                case 36: { // '$'
                    const type = lex_global_variable(parser);

                    // If we're lexing an embedded variable, then we need to pop back into
                    // the parent lex context.
                    if (parser.lex_modes.current.mode === PM_LEX_EMBVAR) {
                        lex_mode_pop(parser);
                    }

                    lex_state_set(parser, PM_LEX_STATE_END);
                    return setToken(parser, type);
                }

                // instance variable, class variable
                case 64: // '@'
                    lex_state_set(parser, parser.lex_state & PM_LEX_STATE_FNAME ? PM_LEX_STATE_ENDFN : PM_LEX_STATE_END);
                    return setToken(parser, lex_at_variable(parser));

                default: {
                    if (parser.source[parser.current.start] !== '_') {
                        const width = char_is_identifier_start(parser, parser.current.start, parser.end - parser.current.start);

                        // If this isn't the beginning of an identifier, then
                        // it's an invalid token as we've exhausted all of the
                        // other options. We'll skip past it and return the next
                        // token after adding an appropriate error message.
                        if (!width) {
                            if ((parser.source.charCodeAt(parser.current.start) || 0) >= 0x80) {
                                PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, PM_ERR_INVALID_MULTIBYTE_CHARACTER, (parser.source.charCodeAt(parser.current.start) || 0));
                            } else if (parser.source[parser.current.start] === '\\') {
                                switch (peek_at(parser, parser.current.start + 1)) {
                                    case 32: // ' '
                                        parser.current.end++;
                                        PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, PM_ERR_UNEXPECTED_TOKEN_IGNORE, "escaped space");
                                        break;
                                    case 12: // '\f'
                                        parser.current.end++;
                                        PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, PM_ERR_UNEXPECTED_TOKEN_IGNORE, "escaped form feed");
                                        break;
                                    case 9: // '\t'
                                        parser.current.end++;
                                        PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, PM_ERR_UNEXPECTED_TOKEN_IGNORE, "escaped horizontal tab");
                                        break;
                                    case 11: // '\v'
                                        parser.current.end++;
                                        PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, PM_ERR_UNEXPECTED_TOKEN_IGNORE, "escaped vertical tab");
                                        break;
                                    case 13: // '\r'
                                        if (peek_at(parser, parser.current.start + 2) !== 10 /* '\n' */) {
                                            parser.current.end++;
                                            PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, PM_ERR_UNEXPECTED_TOKEN_IGNORE, "escaped carriage return");
                                            break;
                                        }
                                        // fallthrough
                                    default:
                                        PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, PM_ERR_UNEXPECTED_TOKEN_IGNORE, "backslash");
                                        break;
                                }
                            } else if (char_is_ascii_printable((parser.source.charCodeAt(parser.current.start) || 0))) {
                                PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, PM_ERR_INVALID_PRINTABLE_CHARACTER, (parser.source.charCodeAt(parser.current.start) || 0));
                            } else {
                                PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, PM_ERR_INVALID_CHARACTER, (parser.source.charCodeAt(parser.current.start) || 0));
                            }

                            continue lex_next_token;
                        }

                        parser.current.end = parser.current.start + width;
                    }

                    const type = lex_identifier(parser, previous_command_start);

                    // If we've hit a __END__ and it was at the start of the
                    // line or the start of the file and it is followed by
                    // either a \n or a \r\n, then this is the last token of the
                    // file.
                    if (
                        ((parser.current.end - parser.current.start) === 7) &&
                        current_token_starts_line(parser) &&
                        parser.source.startsWith("__END__", parser.current.start) &&
                        (parser.current.end === parser.end || match_eol(parser))
                    ) {
                        // Since we know we're about to add an __END__ comment,
                        // we know we need to add all of the newlines to get the
                        // correct column information for it.
                        let cursor = parser.current.end;
                        while ((cursor = next_newline(parser.source, cursor, parser.end - cursor)) !== -1) {
                            pm_newline_list_append(parser.newline_list, cursor);
                            cursor++;
                        }

                        parser.current.end = parser.end;
                        parser.current.type = PM_TOKEN___END__;
                        parser_lex_callback(parser);

                        parser.data_loc.start = parser.current.start;
                        parser.data_loc.end = parser.current.end;

                        return setToken(parser, PM_TOKEN_EOF);
                    }

                    const last_state = parser.lex_state;

                    if (type === PM_TOKEN_IDENTIFIER || type === PM_TOKEN_CONSTANT || type === PM_TOKEN_METHOD_NAME) {
                        if (lex_state_p(parser, PM_LEX_STATE_BEG_ANY | PM_LEX_STATE_ARG_ANY | PM_LEX_STATE_DOT)) {
                            if (previous_command_start) {
                                lex_state_set(parser, PM_LEX_STATE_CMDARG);
                            } else {
                                lex_state_set(parser, PM_LEX_STATE_ARG);
                            }
                        } else if (parser.lex_state === PM_LEX_STATE_FNAME) {
                            lex_state_set(parser, PM_LEX_STATE_ENDFN);
                        } else {
                            lex_state_set(parser, PM_LEX_STATE_END);
                        }
                    }

                    if (
                        !(last_state & (PM_LEX_STATE_DOT | PM_LEX_STATE_FNAME)) &&
                        (type === PM_TOKEN_IDENTIFIER) &&
                        ((pm_parser_local_depth(parser, parser.current) !== -1) ||
                         pm_token_is_numbered_parameter(parser.source, parser.current.start, parser.current.end))
                    ) {
                        lex_state_set(parser, PM_LEX_STATE_END | PM_LEX_STATE_LABEL);
                    }

                    return setToken(parser, type);
                }
            }
        }
        // fallthrough (unreachable; every path above returns or continues)
        case PM_LEX_LIST: {
            if (parser.next_start !== null) {
                parser.current.end = parser.next_start;
                parser.next_start = null;
            }

            // First we'll set the beginning of the token.
            parser.current.start = parser.current.end;

            // If there's any whitespace at the start of the list, then we're
            // going to trim it off the beginning and create a new token.
            let whitespace;

            if (parser.heredoc_end !== null) {
                whitespace = pm_strspn_inline_whitespace(parser.source, parser.current.end, parser.end - parser.current.end);
                if (peek_offset(parser, whitespace) === 10 /* '\n' */) {
                    whitespace += 1;
                }
            } else {
                whitespace = pm_strspn_whitespace_newlines(parser.source, parser.current.end, parser.end - parser.current.end, parser.newline_list);
            }

            if (whitespace > 0) {
                parser.current.end += whitespace;
                if (peek_offset(parser, -1) === 10 /* '\n' */) {
                    // mutates next_start
                    parser_flush_heredoc_end(parser);
                }
                return setToken(parser, PM_TOKEN_WORDS_SEP);
            }

            // We'll check if we're at the end of the file. If we are, then we
            // need to return the EOF token.
            if (parser.current.end >= parser.end) {
                return setToken(parser, PM_TOKEN_EOF);
            }

            // Here we'll get a list of the places where strpbrk should break,
            // and then find the first one.
            const lex_mode = parser.lex_modes.current;
            const breakpoints = lex_mode.as.list.breakpoints;
            let breakpoint = pm_strpbrk(parser, parser.current.end, breakpoints, parser.end - parser.current.end, true);

            // If we haven't found an escape yet, then this buffer will be
            // unallocated since we can refer directly to the source string.
            const token_buffer = { buffer: {}, cursor: null };

            while (breakpoint !== -1) {
                // If we hit whitespace, then we must have received content by
                // now, so we can return an element of the list.
                if (pm_char_is_whitespace((parser.source.charCodeAt(breakpoint) || 0))) {
                    parser.current.end = breakpoint;
                    pm_token_buffer_flush(parser, token_buffer);
                    return setToken(parser, PM_TOKEN_STRING_CONTENT);
                }

                // If we hit the terminator, we need to check which token to
                // return.
                if ((parser.source.charCodeAt(breakpoint) || 0) === lex_mode.as.list.terminator) {
                    // If this terminator doesn't actually close the list, then
                    // we need to continue on past it.
                    if (lex_mode.as.list.nesting > 0) {
                        parser.current.end = breakpoint + 1;
                        breakpoint = pm_strpbrk(parser, parser.current.end, breakpoints, parser.end - parser.current.end, true);
                        lex_mode.as.list.nesting--;
                        continue;
                    }

                    // If we've hit the terminator and we've already skipped
                    // past content, then we can return a list node.
                    if (breakpoint > parser.current.start) {
                        parser.current.end = breakpoint;
                        pm_token_buffer_flush(parser, token_buffer);
                        return setToken(parser, PM_TOKEN_STRING_CONTENT);
                    }

                    // Otherwise, switch back to the default state and return
                    // the end of the list.
                    parser.current.end = breakpoint + 1;
                    lex_mode_pop(parser);
                    lex_state_set(parser, PM_LEX_STATE_END);
                    return setToken(parser, PM_TOKEN_STRING_END);
                }

                // If we hit a null byte, skip directly past it.
                if ((parser.source.charCodeAt(breakpoint) || 0) === 0 /* '\0' */) {
                    breakpoint = pm_strpbrk(parser, breakpoint + 1, breakpoints, parser.end - (breakpoint + 1), true);
                    continue;
                }

                // If we hit escapes, then we need to treat the next token
                // literally. In this case we'll skip past the next character
                // and find the next breakpoint.
                if (parser.source[breakpoint] === '\\') {
                    parser.current.end = breakpoint + 1;

                    // If we've hit the end of the file, then break out of the
                    // loop by setting the breakpoint to NULL.
                    if (parser.current.end === parser.end) {
                        breakpoint = -1;
                        continue;
                    }

                    pm_token_buffer_escape(parser, token_buffer);
                    const peeked = peek(parser);

                    switch (peeked) {
                        case 32:  // ' '
                        case 12:  // '\f'
                        case 9:   // '\t'
                        case 11:  // '\v'
                        case 92:  // '\\'
                            pm_token_buffer_push_byte(token_buffer, peeked);
                            parser.current.end++;
                            break;
                        case 13: // '\r'
                            parser.current.end++;
                            if (peek(parser) !== 10 /* '\n' */) {
                                pm_token_buffer_push_byte(token_buffer, 13 /* '\r' */);
                                break;
                            }
                            // fallthrough
                        case 10: // '\n'
                            pm_token_buffer_push_byte(token_buffer, 10 /* '\n' */);

                            if (parser.heredoc_end !== null) {
                                // ... if we are on the same line as a heredoc,
                                // flush the heredoc and continue parsing after
                                // heredoc_end.
                                parser_flush_heredoc_end(parser);
                                pm_token_buffer_copy(parser, token_buffer);
                                return setToken(parser, PM_TOKEN_STRING_CONTENT);
                            } else {
                                // ... else track the newline.
                                pm_newline_list_append(parser.newline_list, parser.current.end);
                            }

                            parser.current.end++;
                            break;
                        default:
                            if (peeked === lex_mode.as.list.incrementor || peeked === lex_mode.as.list.terminator) {
                                pm_token_buffer_push_byte(token_buffer, peeked);
                                parser.current.end++;
                            } else if (lex_mode.as.list.interpolation) {
                                escape_read(parser, token_buffer.buffer, null, PM_ESCAPE_FLAG_NONE);
                            } else {
                                pm_token_buffer_push_byte(token_buffer, 92 /* '\\' */);
                                pm_token_buffer_push_escaped(token_buffer, parser);
                            }

                            break;
                    }

                    token_buffer.cursor = parser.current.end;
                    breakpoint = pm_strpbrk(parser, parser.current.end, breakpoints, parser.end - parser.current.end, true);
                    continue;
                }

                // If we hit a # , then we will attempt to lex interpolation.
                if (parser.source[breakpoint] === '#') {
                    const type = lex_interpolation(parser, breakpoint);

                    if (type === PM_TOKEN_NOT_PROVIDED) {
                        // If we haven't returned at this point then we had something
                        // that looked like an interpolated class or instance variable
                        // like "#@" but wasn't actually. In this case we'll just skip
                        // to the next breakpoint.
                        breakpoint = pm_strpbrk(parser, parser.current.end, breakpoints, parser.end - parser.current.end, true);
                        continue;
                    }

                    if (type === PM_TOKEN_STRING_CONTENT) {
                        pm_token_buffer_flush(parser, token_buffer);
                    }

                    return setToken(parser, type);
                }

                // If we've hit the incrementor, then we need to skip past it
                // and find the next breakpoint.
                // assert(*breakpoint == lex_mode->as.list.incrementor): debug-only in C.
                parser.current.end = breakpoint + 1;
                breakpoint = pm_strpbrk(parser, parser.current.end, breakpoints, parser.end - parser.current.end, true);
                lex_mode.as.list.nesting++;
                continue;
            }

            if (parser.current.end > parser.current.start) {
                pm_token_buffer_flush(parser, token_buffer);
                return setToken(parser, PM_TOKEN_STRING_CONTENT);
            }

            // If we were unable to find a breakpoint, then this token hits the
            // end of the file.
            parser.current.end = parser.end;
            pm_token_buffer_flush(parser, token_buffer);
            return setToken(parser, PM_TOKEN_STRING_CONTENT);
        }
        case PM_LEX_REGEXP: {
            // First, we'll set to start of this token to be the current end.
            lex_token_start(parser);

            // We'll check if we're at the end of the file. If we are, then we
            // need to return the EOF token.
            if (parser.current.end >= parser.end) {
                return setToken(parser, PM_TOKEN_EOF);
            }

            // Get a reference to the current mode.
            const lex_mode = parser.lex_modes.current;

            // These are the places where we need to split up the content of the
            // regular expression. We'll use strpbrk to find the first of these
            // characters.
            const breakpoints = lex_mode.as.regexp.breakpoints;
            let breakpoint = pm_strpbrk(parser, parser.current.end, breakpoints, parser.end - parser.current.end, false);
            const token_buffer = { base: { buffer: {}, cursor: null }, regexp_buffer: {} };

            while (breakpoint !== -1) {
                const is_terminator = lex_breakpoint_is_terminator(parser, breakpoint, lex_mode.as.regexp.terminator);

                // If we hit the terminator, we need to determine what kind of
                // token to return.
                if (is_terminator) {
                    if (lex_mode.as.regexp.nesting > 0) {
                        parser.current.end = breakpoint + 1;
                        breakpoint = pm_strpbrk(parser, parser.current.end, breakpoints, parser.end - parser.current.end, false);
                        lex_mode.as.regexp.nesting--;
                        continue;
                    }

                    // Here we've hit the terminator. If we have already consumed
                    // content then we need to return that content as string content
                    // first.
                    if (breakpoint > parser.current.start) {
                        parser.current.end = breakpoint;
                        pm_regexp_token_buffer_flush(parser, token_buffer);
                        return setToken(parser, PM_TOKEN_STRING_CONTENT);
                    }

                    // Check here if we need to track the newline.
                    const eol_length = match_eol_at(parser, breakpoint);
                    if (eol_length) {
                        parser.current.end = breakpoint + eol_length;

                        // Track the newline if we're not in a heredoc that
                        // would have already have added the newline to the
                        // list.
                        if (parser.heredoc_end === null) {
                            pm_newline_list_append(parser.newline_list, parser.current.end - 1);
                        }
                    } else {
                        parser.current.end = breakpoint + 1;
                    }

                    // Since we've hit the terminator of the regular expression,
                    // we now need to parse the options.
                    parser.current.end += pm_strspn_regexp_option(parser.source, parser.current.end, parser.end - parser.current.end);

                    lex_mode_pop(parser);
                    lex_state_set(parser, PM_LEX_STATE_END);
                    return setToken(parser, PM_TOKEN_REGEXP_END);
                }

                // If we've hit the incrementor, then we need to skip past it
                // and find the next breakpoint.
                if ((parser.source.charCodeAt(breakpoint) || 0) && (parser.source.charCodeAt(breakpoint) || 0) === lex_mode.as.regexp.incrementor) {
                    parser.current.end = breakpoint + 1;
                    breakpoint = pm_strpbrk(parser, parser.current.end, breakpoints, parser.end - parser.current.end, false);
                    lex_mode.as.regexp.nesting++;
                    continue;
                }

                switch ((parser.source.charCodeAt(breakpoint) || 0)) {
                    case 0: // '\0'
                        // If we hit a null byte, skip directly past it.
                        parser.current.end = breakpoint + 1;
                        breakpoint = pm_strpbrk(parser, parser.current.end, breakpoints, parser.end - parser.current.end, false);
                        break;
                    case 13: // '\r'
                        if (peek_at(parser, breakpoint + 1) !== 10 /* '\n' */) {
                            parser.current.end = breakpoint + 1;
                            breakpoint = pm_strpbrk(parser, parser.current.end, breakpoints, parser.end - parser.current.end, false);
                            break;
                        }

                        breakpoint++;
                        parser.current.end = breakpoint;
                        pm_regexp_token_buffer_escape(parser, token_buffer);
                        token_buffer.base.cursor = breakpoint;

                        // fallthrough
                    case 10: // '\n'
                        // If we've hit a newline, then we need to track that in
                        // the list of newlines.
                        if (parser.heredoc_end === null) {
                            pm_newline_list_append(parser.newline_list, breakpoint);
                            parser.current.end = breakpoint + 1;
                            breakpoint = pm_strpbrk(parser, parser.current.end, breakpoints, parser.end - parser.current.end, false);
                            break;
                        }

                        parser.current.end = breakpoint + 1;
                        parser_flush_heredoc_end(parser);
                        pm_regexp_token_buffer_flush(parser, token_buffer);
                        return setToken(parser, PM_TOKEN_STRING_CONTENT);
                    case 92: { // '\\'
                        // If we hit escapes, then we need to treat the next
                        // token literally. In this case we'll skip past the
                        // next character and find the next breakpoint.
                        parser.current.end = breakpoint + 1;

                        // If we've hit the end of the file, then break out of
                        // the loop by setting the breakpoint to NULL.
                        if (parser.current.end === parser.end) {
                            breakpoint = -1;
                            break;
                        }

                        pm_regexp_token_buffer_escape(parser, token_buffer);
                        const peeked = peek(parser);

                        switch (peeked) {
                            case 13: // '\r'
                                parser.current.end++;
                                if (peek(parser) !== 10 /* '\n' */) {
                                    if (lex_mode.as.regexp.terminator !== 13 /* '\r' */) {
                                        pm_token_buffer_push_byte(token_buffer.base, 92 /* '\\' */);
                                    }
                                    pm_regexp_token_buffer_push_byte(token_buffer, 13 /* '\r' */);
                                    pm_token_buffer_push_byte(token_buffer.base, 13 /* '\r' */);
                                    break;
                                }
                                // fallthrough
                            case 10: // '\n'
                                if (parser.heredoc_end !== null) {
                                    // ... if we are on the same line as a heredoc,
                                    // flush the heredoc and continue parsing after
                                    // heredoc_end.
                                    parser_flush_heredoc_end(parser);
                                    pm_regexp_token_buffer_copy(parser, token_buffer);
                                    return setToken(parser, PM_TOKEN_STRING_CONTENT);
                                } else {
                                    // ... else track the newline.
                                    pm_newline_list_append(parser.newline_list, parser.current.end);
                                }

                                parser.current.end++;
                                break;
                            case 99:  // 'c'
                            case 67:  // 'C'
                            case 77:  // 'M'
                            case 117: // 'u'
                            case 120: // 'x'
                                escape_read(parser, token_buffer.regexp_buffer, token_buffer.base.buffer, PM_ESCAPE_FLAG_REGEXP);
                                break;
                            default:
                                if (lex_mode.as.regexp.terminator === peeked) {
                                    // Some characters when they are used as the
                                    // terminator also receive an escape. They are
                                    // enumerated here.
                                    switch (peeked) {
                                        case 36: // '$'
                                        case 41: // ')'
                                        case 42: // '*'
                                        case 43: // '+'
                                        case 46: // '.'
                                        case 62: // '>'
                                        case 63: // '?'
                                        case 93: // ']'
                                        case 94: // '^'
                                        case 124: // '|'
                                        case 125: // '}'
                                            pm_token_buffer_push_byte(token_buffer.base, 92 /* '\\' */);
                                            break;
                                        default:
                                            break;
                                    }

                                    pm_regexp_token_buffer_push_byte(token_buffer, peeked);
                                    pm_token_buffer_push_byte(token_buffer.base, peeked);
                                    parser.current.end++;
                                    break;
                                }

                                if (peeked < 0x80) pm_token_buffer_push_byte(token_buffer.base, 92 /* '\\' */);
                                pm_regexp_token_buffer_push_escaped(token_buffer, parser);
                                break;
                        }

                        token_buffer.base.cursor = parser.current.end;
                        breakpoint = pm_strpbrk(parser, parser.current.end, breakpoints, parser.end - parser.current.end, false);
                        break;
                    }
                    case 35: { // '#'
                        // If we hit a #, then we will attempt to lex
                        // interpolation.
                        const type = lex_interpolation(parser, breakpoint);

                        if (type === PM_TOKEN_NOT_PROVIDED) {
                            // If we haven't returned at this point then we had
                            // something that looked like an interpolated class or
                            // instance variable like "#@" but wasn't actually. In
                            // this case we'll just skip to the next breakpoint.
                            breakpoint = pm_strpbrk(parser, parser.current.end, breakpoints, parser.end - parser.current.end, false);
                            break;
                        }

                        if (type === PM_TOKEN_STRING_CONTENT) {
                            pm_regexp_token_buffer_flush(parser, token_buffer);
                        }

                        return setToken(parser, type);
                    }
                    default:
                        // assert(false && "unreachable"): debug-only in C.
                        break;
                }
            }

            if (parser.current.end > parser.current.start) {
                pm_regexp_token_buffer_flush(parser, token_buffer);
                return setToken(parser, PM_TOKEN_STRING_CONTENT);
            }

            // If we were unable to find a breakpoint, then this token hits the
            // end of the file.
            parser.current.end = parser.end;
            pm_regexp_token_buffer_flush(parser, token_buffer);
            return setToken(parser, PM_TOKEN_STRING_CONTENT);
        }
        case PM_LEX_STRING: {
            // First, we'll set to start of this token to be the current end.
            lex_token_start(parser);

            // We'll check if we're at the end of the file. If we are, then we need to
            // return the EOF token.
            if (parser.current.end >= parser.end) {
                return setToken(parser, PM_TOKEN_EOF);
            }

            // These are the places where we need to split up the content of the
            // string. We'll use strpbrk to find the first of these characters.
            const lex_mode = parser.lex_modes.current;
            const breakpoints = lex_mode.as.string.breakpoints;
            let breakpoint = pm_strpbrk(parser, parser.current.end, breakpoints, parser.end - parser.current.end, true);

            // If we haven't found an escape yet, then this buffer will be
            // unallocated since we can refer directly to the source string.
            const token_buffer = { buffer: {}, cursor: null };

            while (breakpoint !== -1) {
                // If we hit the incrementor, then we'll increment then nesting and
                // continue lexing.
                if (lex_mode.as.string.incrementor !== 0 /* '\0' */ && (parser.source.charCodeAt(breakpoint) || 0) === lex_mode.as.string.incrementor) {
                    lex_mode.as.string.nesting++;
                    parser.current.end = breakpoint + 1;
                    breakpoint = pm_strpbrk(parser, parser.current.end, breakpoints, parser.end - parser.current.end, true);
                    continue;
                }

                const term = lex_mode.as.string.terminator;
                const is_terminator = lex_breakpoint_is_terminator(parser, breakpoint, term);

                // Note that we have to check the terminator here first because we could
                // potentially be parsing a % string that has a # character as the
                // terminator.
                if (is_terminator) {
                    // If this terminator doesn't actually close the string, then we need
                    // to continue on past it.
                    if (lex_mode.as.string.nesting > 0) {
                        parser.current.end = breakpoint + 1;
                        breakpoint = pm_strpbrk(parser, parser.current.end, breakpoints, parser.end - parser.current.end, true);
                        lex_mode.as.string.nesting--;
                        continue;
                    }

                    // Here we've hit the terminator. If we have already consumed content
                    // then we need to return that content as string content first.
                    if (breakpoint > parser.current.start) {
                        parser.current.end = breakpoint;
                        pm_token_buffer_flush(parser, token_buffer);
                        return setToken(parser, PM_TOKEN_STRING_CONTENT);
                    }

                    // Otherwise we need to switch back to the parent lex mode and
                    // return the end of the string.
                    const eol_length = match_eol_at(parser, breakpoint);
                    if (eol_length) {
                        parser.current.end = breakpoint + eol_length;

                        // Track the newline if we're not in a heredoc that
                        // would have already have added the newline to the
                        // list.
                        if (parser.heredoc_end === null) {
                            pm_newline_list_append(parser.newline_list, parser.current.end - 1);
                        }
                    } else {
                        parser.current.end = breakpoint + 1;
                    }

                    if (lex_mode.as.string.label_allowed && (peek(parser) === 58 /* ':' */) && (peek_offset(parser, 1) !== 58 /* ':' */)) {
                        parser.current.end++;
                        lex_state_set(parser, PM_LEX_STATE_ARG | PM_LEX_STATE_LABELED);
                        lex_mode_pop(parser);
                        return setToken(parser, PM_TOKEN_LABEL_END);
                    }

                    // When the delimiter itself is a newline, we won't
                    // get a chance to flush heredocs in the usual places since
                    // the newline is already consumed.
                    if (term === 10 /* '\n' */ && parser.heredoc_end !== null) {
                        parser_flush_heredoc_end(parser);
                    }

                    lex_state_set(parser, PM_LEX_STATE_END);
                    lex_mode_pop(parser);
                    return setToken(parser, PM_TOKEN_STRING_END);
                }

                switch ((parser.source.charCodeAt(breakpoint) || 0)) {
                    case 0: // '\0'
                        // Skip directly past the null character.
                        parser.current.end = breakpoint + 1;
                        breakpoint = pm_strpbrk(parser, parser.current.end, breakpoints, parser.end - parser.current.end, true);
                        break;
                    case 13: // '\r'
                        if (peek_at(parser, breakpoint + 1) !== 10 /* '\n' */) {
                            parser.current.end = breakpoint + 1;
                            breakpoint = pm_strpbrk(parser, parser.current.end, breakpoints, parser.end - parser.current.end, true);
                            break;
                        }

                        // If we hit a \r\n sequence, then we need to treat it
                        // as a newline.
                        breakpoint++;
                        parser.current.end = breakpoint;
                        pm_token_buffer_escape(parser, token_buffer);
                        token_buffer.cursor = breakpoint;

                        // fallthrough
                    case 10: // '\n'
                        // When we hit a newline, we need to flush any potential
                        // heredocs. Note that this has to happen after we check
                        // for the terminator in case the terminator is a
                        // newline character.
                        if (parser.heredoc_end === null) {
                            pm_newline_list_append(parser.newline_list, breakpoint);
                            parser.current.end = breakpoint + 1;
                            breakpoint = pm_strpbrk(parser, parser.current.end, breakpoints, parser.end - parser.current.end, true);
                            break;
                        }

                        parser.current.end = breakpoint + 1;
                        parser_flush_heredoc_end(parser);
                        pm_token_buffer_flush(parser, token_buffer);
                        return setToken(parser, PM_TOKEN_STRING_CONTENT);
                    case 92: { // '\\'
                        // Here we hit escapes.
                        parser.current.end = breakpoint + 1;

                        // If we've hit the end of the file, then break out of
                        // the loop by setting the breakpoint to NULL.
                        if (parser.current.end === parser.end) {
                            breakpoint = -1;
                            continue;
                        }

                        pm_token_buffer_escape(parser, token_buffer);
                        const peeked = peek(parser);

                        switch (peeked) {
                            case 92: // '\\'
                                pm_token_buffer_push_byte(token_buffer, 92 /* '\\' */);
                                parser.current.end++;
                                break;
                            case 13: // '\r'
                                parser.current.end++;
                                if (peek(parser) !== 10 /* '\n' */) {
                                    if (!lex_mode.as.string.interpolation) {
                                        pm_token_buffer_push_byte(token_buffer, 92 /* '\\' */);
                                    }
                                    pm_token_buffer_push_byte(token_buffer, 13 /* '\r' */);
                                    break;
                                }
                                // fallthrough
                            case 10: // '\n'
                                if (!lex_mode.as.string.interpolation) {
                                    pm_token_buffer_push_byte(token_buffer, 92 /* '\\' */);
                                    pm_token_buffer_push_byte(token_buffer, 10 /* '\n' */);
                                }

                                if (parser.heredoc_end !== null) {
                                    // ... if we are on the same line as a heredoc,
                                    // flush the heredoc and continue parsing after
                                    // heredoc_end.
                                    parser_flush_heredoc_end(parser);
                                    pm_token_buffer_copy(parser, token_buffer);
                                    return setToken(parser, PM_TOKEN_STRING_CONTENT);
                                } else {
                                    // ... else track the newline.
                                    pm_newline_list_append(parser.newline_list, parser.current.end);
                                }

                                parser.current.end++;
                                break;
                            default:
                                if (lex_mode.as.string.incrementor !== 0 /* '\0' */ && peeked === lex_mode.as.string.incrementor) {
                                    pm_token_buffer_push_byte(token_buffer, peeked);
                                    parser.current.end++;
                                } else if (lex_mode.as.string.terminator !== 0 /* '\0' */ && peeked === lex_mode.as.string.terminator) {
                                    pm_token_buffer_push_byte(token_buffer, peeked);
                                    parser.current.end++;
                                } else if (lex_mode.as.string.interpolation) {
                                    escape_read(parser, token_buffer.buffer, null, PM_ESCAPE_FLAG_NONE);
                                } else {
                                    pm_token_buffer_push_byte(token_buffer, 92 /* '\\' */);
                                    pm_token_buffer_push_escaped(token_buffer, parser);
                                }

                                break;
                        }

                        token_buffer.cursor = parser.current.end;
                        breakpoint = pm_strpbrk(parser, parser.current.end, breakpoints, parser.end - parser.current.end, true);
                        break;
                    }
                    case 35: { // '#'
                        const type = lex_interpolation(parser, breakpoint);

                        if (type === PM_TOKEN_NOT_PROVIDED) {
                            // If we haven't returned at this point then we had something that
                            // looked like an interpolated class or instance variable like "#@"
                            // but wasn't actually. In this case we'll just skip to the next
                            // breakpoint.
                            breakpoint = pm_strpbrk(parser, parser.current.end, breakpoints, parser.end - parser.current.end, true);
                            break;
                        }

                        if (type === PM_TOKEN_STRING_CONTENT) {
                            pm_token_buffer_flush(parser, token_buffer);
                        }

                        return setToken(parser, type);
                    }
                    default:
                        // assert(false && "unreachable"): debug-only in C.
                        break;
                }
            }

            if (parser.current.end > parser.current.start) {
                pm_token_buffer_flush(parser, token_buffer);
                return setToken(parser, PM_TOKEN_STRING_CONTENT);
            }

            // If we've hit the end of the string, then this is an unterminated
            // string. In that case we'll return a string content token.
            parser.current.end = parser.end;
            pm_token_buffer_flush(parser, token_buffer);
            return setToken(parser, PM_TOKEN_STRING_CONTENT);
        }
        case PM_LEX_HEREDOC: {
            // First, we'll set to start of this token.
            if (parser.next_start === null) {
                parser.current.start = parser.current.end;
            } else {
                parser.current.start = parser.next_start;
                parser.current.end = parser.next_start;
                parser.heredoc_end = null;
                parser.next_start = null;
            }

            // Now let's grab the information about the identifier off of the
            // current lex mode.
            const lex_mode = parser.lex_modes.current;
            const heredoc_lex_mode = lex_mode.as.heredoc.base;

            const line_continuation = lex_mode.as.heredoc.line_continuation;
            lex_mode.as.heredoc.line_continuation = false;

            // We'll check if we're at the end of the file. If we are, then we
            // will add an error (because we weren't able to find the
            // terminator) but still continue parsing so that content after the
            // declaration of the heredoc can be parsed.
            if (parser.current.end >= parser.end) {
                pm_parser_err_heredoc_term(parser, heredoc_lex_mode.ident_start, heredoc_lex_mode.ident_length);
                parser.next_start = lex_mode.as.heredoc.next_start;
                parser.heredoc_end = parser.current.end;
                lex_state_set(parser, PM_LEX_STATE_END);
                lex_mode_pop(parser);
                return setToken(parser, PM_TOKEN_HEREDOC_END);
            }

            const ident_start = heredoc_lex_mode.ident_start;
            const ident_length = heredoc_lex_mode.ident_length;

            // If we are immediately following a newline and we have hit the
            // terminator, then we need to return the ending of the heredoc.
            if (current_token_starts_line(parser)) {
                let start = parser.current.start;

                if (!line_continuation && (start + ident_length <= parser.end)) {
                    const newline = next_newline(parser.source, start, parser.end - start);
                    let ident_end = newline;
                    let terminator_end = newline;

                    if (newline === -1) {
                        terminator_end = parser.end;
                        ident_end = parser.end;
                    } else {
                        terminator_end++;
                        if (parser.source[newline - 1] === '\r') {
                            ident_end--; // Remove \r
                        }
                    }

                    const terminator_start = ident_end - ident_length;
                    let cursor = start;

                    if (heredoc_lex_mode.indent === PM_HEREDOC_INDENT_DASH || heredoc_lex_mode.indent === PM_HEREDOC_INDENT_TILDE) {
                        while (cursor < terminator_start && pm_char_is_inline_whitespace((parser.source.charCodeAt(cursor) || 0))) {
                            cursor++;
                        }
                    }

                    if (
                        (cursor === terminator_start) &&
                        source_bytes_equal(parser.source, terminator_start, ident_start, ident_length)
                    ) {
                        if (newline !== -1) {
                            pm_newline_list_append(parser.newline_list, newline);
                        }

                        parser.current.end = terminator_end;
                        if (parser.source[lex_mode.as.heredoc.next_start] === '\\') {
                            parser.next_start = null;
                        } else {
                            parser.next_start = lex_mode.as.heredoc.next_start;
                            parser.heredoc_end = parser.current.end;
                        }

                        lex_state_set(parser, PM_LEX_STATE_END);
                        lex_mode_pop(parser);
                        return setToken(parser, PM_TOKEN_HEREDOC_END);
                    }
                }

                const [whitespace, start_after_indent] = pm_heredoc_strspn_inline_whitespace(parser, start, heredoc_lex_mode.indent);
                start = start_after_indent;
                if (
                    heredoc_lex_mode.indent === PM_HEREDOC_INDENT_TILDE &&
                    lex_mode.as.heredoc.common_whitespace !== null &&
                    (lex_mode.as.heredoc.common_whitespace.value === -1 || lex_mode.as.heredoc.common_whitespace.value > whitespace) &&
                    peek_at(parser, start) !== 10 /* '\n' */
                ) {
                    lex_mode.as.heredoc.common_whitespace.value = whitespace;
                }
            }

            // Otherwise we'll be parsing string content. These are the places
            // where we need to split up the content of the heredoc. We'll use
            // strpbrk to find the first of these characters.
            // uint8_t breakpoints[] = "\r\n\\#" (with the trailing NUL byte).
            const breakpoints = [13, 10, 92, 35, 0];

            const quote = heredoc_lex_mode.quote;
            if (quote === PM_HEREDOC_QUOTE_SINGLE) {
                breakpoints[3] = 0;
            }

            let breakpoint = pm_strpbrk(parser, parser.current.end, breakpoints, parser.end - parser.current.end, true);
            const token_buffer = { buffer: {}, cursor: null };
            let was_line_continuation = false;

            while (breakpoint !== -1) {
                switch ((parser.source.charCodeAt(breakpoint) || 0)) {
                    case 0: // '\0'
                        // Skip directly past the null character.
                        parser.current.end = breakpoint + 1;
                        breakpoint = pm_strpbrk(parser, parser.current.end, breakpoints, parser.end - parser.current.end, true);
                        break;
                    case 13: // '\r'
                        parser.current.end = breakpoint + 1;

                        if (peek_at(parser, breakpoint + 1) !== 10 /* '\n' */) {
                            breakpoint = pm_strpbrk(parser, parser.current.end, breakpoints, parser.end - parser.current.end, true);
                            break;
                        }

                        // If we hit a \r\n sequence, then we want to replace it
                        // with a single \n character in the final string.
                        breakpoint++;
                        pm_token_buffer_escape(parser, token_buffer);
                        token_buffer.cursor = breakpoint;

                        // fallthrough
                    case 10: { // '\n'
                        if (parser.heredoc_end !== null && (parser.heredoc_end > breakpoint)) {
                            parser_flush_heredoc_end(parser);
                            parser.current.end = breakpoint + 1;
                            pm_token_buffer_flush(parser, token_buffer);
                            return setToken(parser, PM_TOKEN_STRING_CONTENT);
                        }

                        pm_newline_list_append(parser.newline_list, breakpoint);

                        // If we have a - or ~ heredoc, then we can match after
                        // some leading whitespace.
                        let start = breakpoint + 1;

                        if (!was_line_continuation && (start + ident_length <= parser.end)) {
                            // We want to match the terminator starting from the end of the line in case
                            // there is whitespace in the ident such as <<-'   DOC' or <<~'   DOC'.
                            let newline = next_newline(parser.source, start, parser.end - start);

                            if (newline === -1) {
                                newline = parser.end;
                            } else if (parser.source[newline - 1] === '\r') {
                                newline--; // Remove \r
                            }

                            // Start of a possible terminator.
                            const terminator_start = newline - ident_length;

                            // Cursor to check for the leading whitespace. We skip the
                            // leading whitespace if we have a - or ~ heredoc.
                            let cursor = start;

                            if (heredoc_lex_mode.indent === PM_HEREDOC_INDENT_DASH || heredoc_lex_mode.indent === PM_HEREDOC_INDENT_TILDE) {
                                while (cursor < terminator_start && pm_char_is_inline_whitespace((parser.source.charCodeAt(cursor) || 0))) {
                                    cursor++;
                                }
                            }

                            if (
                                cursor === terminator_start &&
                                source_bytes_equal(parser.source, terminator_start, ident_start, ident_length)
                            ) {
                                parser.current.end = breakpoint + 1;
                                pm_token_buffer_flush(parser, token_buffer);
                                return setToken(parser, PM_TOKEN_STRING_CONTENT);
                            }
                        }

                        const [whitespace, start_after_indent] = pm_heredoc_strspn_inline_whitespace(parser, start, lex_mode.as.heredoc.base.indent);
                        start = start_after_indent;

                        // If we have hit a newline that is followed by a valid
                        // terminator, then we need to return the content of the
                        // heredoc here as string content. Then, the next time a
                        // token is lexed, it will match again and return the
                        // end of the heredoc.
                        if (lex_mode.as.heredoc.base.indent === PM_HEREDOC_INDENT_TILDE) {
                            if ((lex_mode.as.heredoc.common_whitespace !== null) && (lex_mode.as.heredoc.common_whitespace.value === -1 || lex_mode.as.heredoc.common_whitespace.value > whitespace) && peek_at(parser, start) !== 10 /* '\n' */) {
                                lex_mode.as.heredoc.common_whitespace.value = whitespace;
                            }

                            parser.current.end = breakpoint + 1;
                            pm_token_buffer_flush(parser, token_buffer);
                            return setToken(parser, PM_TOKEN_STRING_CONTENT);
                        }

                        // Otherwise we hit a newline and it wasn't followed by
                        // a terminator, so we can continue parsing.
                        parser.current.end = breakpoint + 1;
                        breakpoint = pm_strpbrk(parser, parser.current.end, breakpoints, parser.end - parser.current.end, true);
                        break;
                    }
                    case 92: { // '\\'
                        // If we hit an escape, then we need to skip past
                        // however many characters the escape takes up. However
                        // it's important that if \n or \r\n are escaped, we
                        // stop looping before the newline and not after the
                        // newline so that we can still potentially find the
                        // terminator of the heredoc.
                        parser.current.end = breakpoint + 1;

                        // If we've hit the end of the file, then break out of
                        // the loop by setting the breakpoint to NULL.
                        if (parser.current.end === parser.end) {
                            breakpoint = -1;
                            continue;
                        }

                        pm_token_buffer_escape(parser, token_buffer);
                        const peeked = peek(parser);

                        if (quote === PM_HEREDOC_QUOTE_SINGLE) {
                            switch (peeked) {
                                case 13: // '\r'
                                    parser.current.end++;
                                    if (peek(parser) !== 10 /* '\n' */) {
                                        pm_token_buffer_push_byte(token_buffer, 92 /* '\\' */);
                                        pm_token_buffer_push_byte(token_buffer, 13 /* '\r' */);
                                        break;
                                    }
                                    // fallthrough
                                case 10: // '\n'
                                    pm_token_buffer_push_byte(token_buffer, 92 /* '\\' */);
                                    pm_token_buffer_push_byte(token_buffer, 10 /* '\n' */);
                                    token_buffer.cursor = parser.current.end + 1;
                                    breakpoint = parser.current.end;
                                    continue;
                                default:
                                    pm_token_buffer_push_byte(token_buffer, 92 /* '\\' */);
                                    pm_token_buffer_push_escaped(token_buffer, parser);
                                    break;
                            }
                        } else {
                            switch (peeked) {
                                case 13: // '\r'
                                    parser.current.end++;
                                    if (peek(parser) !== 10 /* '\n' */) {
                                        pm_token_buffer_push_byte(token_buffer, 13 /* '\r' */);
                                        break;
                                    }
                                    // fallthrough
                                case 10: // '\n'
                                    // If we are in a tilde here, we should
                                    // break out of the loop and return the
                                    // string content.
                                    if (heredoc_lex_mode.indent === PM_HEREDOC_INDENT_TILDE) {
                                        const end = parser.current.end;

                                        if (parser.heredoc_end === null) {
                                            pm_newline_list_append(parser.newline_list, end);
                                        }

                                        // Here we want the buffer to only
                                        // include up to the backslash.
                                        parser.current.end = breakpoint;
                                        pm_token_buffer_flush(parser, token_buffer);

                                        // Now we can advance the end of the
                                        // token past the newline.
                                        parser.current.end = end + 1;
                                        lex_mode.as.heredoc.line_continuation = true;
                                        return setToken(parser, PM_TOKEN_STRING_CONTENT);
                                    }

                                    was_line_continuation = true;
                                    token_buffer.cursor = parser.current.end + 1;
                                    breakpoint = parser.current.end;
                                    continue;
                                default:
                                    escape_read(parser, token_buffer.buffer, null, PM_ESCAPE_FLAG_NONE);
                                    break;
                            }
                        }

                        token_buffer.cursor = parser.current.end;
                        breakpoint = pm_strpbrk(parser, parser.current.end, breakpoints, parser.end - parser.current.end, true);
                        break;
                    }
                    case 35: { // '#'
                        const type = lex_interpolation(parser, breakpoint);

                        if (type === PM_TOKEN_NOT_PROVIDED) {
                            // If we haven't returned at this point then we had
                            // something that looked like an interpolated class
                            // or instance variable like "#@" but wasn't
                            // actually. In this case we'll just skip to the
                            // next breakpoint.
                            breakpoint = pm_strpbrk(parser, parser.current.end, breakpoints, parser.end - parser.current.end, true);
                            break;
                        }

                        if (type === PM_TOKEN_STRING_CONTENT) {
                            pm_token_buffer_flush(parser, token_buffer);
                        }

                        return setToken(parser, type);
                    }
                    default:
                        // assert(false && "unreachable"): debug-only in C.
                        break;
                }

                was_line_continuation = false;
            }

            if (parser.current.end > parser.current.start) {
                parser.current.end = parser.end;
                pm_token_buffer_flush(parser, token_buffer);
                return setToken(parser, PM_TOKEN_STRING_CONTENT);
            }

            // If we've hit the end of the string, then this is an unterminated
            // heredoc. In that case we'll return a string content token.
            parser.current.end = parser.end;
            pm_token_buffer_flush(parser, token_buffer);
            return setToken(parser, PM_TOKEN_STRING_CONTENT);
        }
    }

    // assert(false && "unreachable"): debug-only in C.
}
