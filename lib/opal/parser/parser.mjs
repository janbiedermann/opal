// Generated: assembled from lib/opal/parser/parts/*.mjs (uni / UTF-16 string build)
import { pm_buffer_append_byte, pm_buffer_append_bytes, pm_buffer_append_string, pm_buffer_append_unicode_codepoint, pm_buffer_init, pm_buffer_init_capacity, pm_buffer_length, pm_buffer_value } from "./util/pm_buffer.mjs";
import { pm_char_is_binary_digit, pm_char_is_decimal_digit, pm_char_is_hexadecimal_digit, pm_char_is_inline_whitespace, pm_char_is_octal_digit, pm_char_is_whitespace, pm_strspn_binary_number, pm_strspn_decimal_digit, pm_strspn_decimal_number, pm_strspn_hexadecimal_digit, pm_strspn_hexadecimal_number, pm_strspn_inline_whitespace, pm_strspn_octal_number, pm_strspn_regexp_option, pm_strspn_whitespace_newlines } from "./util/pm_char.mjs";
import { PM_CONSTANT_ID_UNSET, pm_constant_id_list_append, pm_constant_id_list_includes, pm_constant_pool_id_to_constant, pm_constant_pool_init, pm_constant_pool_insert_constant, pm_constant_pool_insert_owned, pm_constant_pool_insert_shared } from "./util/pm_constant_pool.mjs";
import { PM_INTEGER_BASE_BINARY, PM_INTEGER_BASE_DECIMAL, PM_INTEGER_BASE_DEFAULT, PM_INTEGER_BASE_HEXADECIMAL, PM_INTEGER_BASE_OCTAL, pm_integer_parse, pm_integers_reduce } from "./util/pm_integer.mjs";
import { pm_newline_list_append, pm_newline_list_clear, pm_newline_list_init, pm_newline_list_line, pm_newline_list_line_column } from "./util/pm_newline_list.mjs";
import { pm_strpbrk } from "./util/pm_strpbrk.mjs";
import { PM_ALIAS_GLOBAL_VARIABLE_NODE, PM_ALIAS_METHOD_NODE, PM_ALTERNATION_PATTERN_NODE, PM_AND_NODE, PM_ARGUMENTS_NODE, PM_ARGUMENTS_NODE_FLAGS_CONTAINS_FORWARDING, PM_ARGUMENTS_NODE_FLAGS_CONTAINS_KEYWORDS, PM_ARGUMENTS_NODE_FLAGS_CONTAINS_KEYWORD_SPLAT, PM_ARGUMENTS_NODE_FLAGS_CONTAINS_MULTIPLE_SPLATS, PM_ARGUMENTS_NODE_FLAGS_CONTAINS_SPLAT, PM_ARRAY_NODE, PM_ARRAY_NODE_FLAGS_CONTAINS_SPLAT, PM_ARRAY_PATTERN_NODE, PM_ASSOC_NODE, PM_ASSOC_SPLAT_NODE, PM_BACK_REFERENCE_READ_NODE, PM_BEGIN_NODE, PM_BLOCK_ARGUMENT_NODE, PM_BLOCK_LOCAL_VARIABLE_NODE, PM_BLOCK_NODE, PM_BLOCK_PARAMETERS_NODE, PM_BLOCK_PARAMETER_NODE, PM_BREAK_NODE, PM_CALL_AND_WRITE_NODE, PM_CALL_NODE, PM_CALL_NODE_FLAGS_ATTRIBUTE_WRITE, PM_CALL_NODE_FLAGS_IGNORE_VISIBILITY, PM_CALL_NODE_FLAGS_LAST, PM_CALL_NODE_FLAGS_SAFE_NAVIGATION, PM_CALL_NODE_FLAGS_VARIABLE_CALL, PM_CALL_OPERATOR_WRITE_NODE, PM_CALL_OR_WRITE_NODE, PM_CALL_TARGET_NODE, PM_CAPTURE_PATTERN_NODE, PM_CASE_MATCH_NODE, PM_CASE_NODE, PM_CLASS_NODE, PM_CLASS_VARIABLE_AND_WRITE_NODE, PM_CLASS_VARIABLE_OPERATOR_WRITE_NODE, PM_CLASS_VARIABLE_OR_WRITE_NODE, PM_CLASS_VARIABLE_READ_NODE, PM_CLASS_VARIABLE_TARGET_NODE, PM_CLASS_VARIABLE_WRITE_NODE, PM_COMMENT_EMBDOC, PM_COMMENT_INLINE, PM_CONSTANT_AND_WRITE_NODE, PM_CONSTANT_OPERATOR_WRITE_NODE, PM_CONSTANT_OR_WRITE_NODE, PM_CONSTANT_PATH_AND_WRITE_NODE, PM_CONSTANT_PATH_NODE, PM_CONSTANT_PATH_OPERATOR_WRITE_NODE, PM_CONSTANT_PATH_OR_WRITE_NODE, PM_CONSTANT_PATH_TARGET_NODE, PM_CONSTANT_PATH_WRITE_NODE, PM_CONSTANT_READ_NODE, PM_CONSTANT_TARGET_NODE, PM_CONSTANT_WRITE_NODE, PM_CONTEXT_BEGIN, PM_CONTEXT_BEGIN_ELSE, PM_CONTEXT_BEGIN_ENSURE, PM_CONTEXT_BEGIN_RESCUE, PM_CONTEXT_BLOCK_BRACES, PM_CONTEXT_BLOCK_ELSE, PM_CONTEXT_BLOCK_ENSURE, PM_CONTEXT_BLOCK_KEYWORDS, PM_CONTEXT_BLOCK_PARAMETERS, PM_CONTEXT_BLOCK_RESCUE, PM_CONTEXT_CASE_IN, PM_CONTEXT_CASE_WHEN, PM_CONTEXT_CLASS, PM_CONTEXT_CLASS_ELSE, PM_CONTEXT_CLASS_ENSURE, PM_CONTEXT_CLASS_RESCUE, PM_CONTEXT_DEF, PM_CONTEXT_DEFAULT_PARAMS, PM_CONTEXT_DEFINED, PM_CONTEXT_DEF_ELSE, PM_CONTEXT_DEF_ENSURE, PM_CONTEXT_DEF_PARAMS, PM_CONTEXT_DEF_RESCUE, PM_CONTEXT_ELSE, PM_CONTEXT_ELSIF, PM_CONTEXT_EMBEXPR, PM_CONTEXT_FOR, PM_CONTEXT_FOR_INDEX, PM_CONTEXT_IF, PM_CONTEXT_LAMBDA_BRACES, PM_CONTEXT_LAMBDA_DO_END, PM_CONTEXT_LAMBDA_ELSE, PM_CONTEXT_LAMBDA_ENSURE, PM_CONTEXT_LAMBDA_RESCUE, PM_CONTEXT_LOOP_PREDICATE, PM_CONTEXT_MAIN, PM_CONTEXT_MODULE, PM_CONTEXT_MODULE_ELSE, PM_CONTEXT_MODULE_ENSURE, PM_CONTEXT_MODULE_RESCUE, PM_CONTEXT_MULTI_TARGET, PM_CONTEXT_NONE, PM_CONTEXT_PARENS, PM_CONTEXT_POSTEXE, PM_CONTEXT_PREDICATE, PM_CONTEXT_PREEXE, PM_CONTEXT_RESCUE_MODIFIER, PM_CONTEXT_SCLASS, PM_CONTEXT_SCLASS_ELSE, PM_CONTEXT_SCLASS_ENSURE, PM_CONTEXT_SCLASS_RESCUE, PM_CONTEXT_TERNARY, PM_CONTEXT_UNLESS, PM_CONTEXT_UNTIL, PM_CONTEXT_WHILE, PM_DEFINED_NODE, PM_DEF_NODE, PM_ELSE_NODE, PM_EMBEDDED_STATEMENTS_NODE, PM_EMBEDDED_VARIABLE_NODE, PM_ENSURE_NODE, PM_FALSE_NODE, PM_FIND_PATTERN_NODE, PM_FLIP_FLOP_NODE, PM_FLOAT_NODE, PM_FORWARDING_ARGUMENTS_NODE, PM_FORWARDING_PARAMETER_NODE, PM_FORWARDING_SUPER_NODE, PM_FOR_NODE, PM_GLOBAL_VARIABLE_AND_WRITE_NODE, PM_GLOBAL_VARIABLE_OPERATOR_WRITE_NODE, PM_GLOBAL_VARIABLE_OR_WRITE_NODE, PM_GLOBAL_VARIABLE_READ_NODE, PM_GLOBAL_VARIABLE_TARGET_NODE, PM_GLOBAL_VARIABLE_WRITE_NODE, PM_HASH_NODE, PM_HASH_PATTERN_NODE, PM_HEREDOC_INDENT_DASH, PM_HEREDOC_INDENT_NONE, PM_HEREDOC_INDENT_TILDE, PM_HEREDOC_QUOTE_BACKTICK, PM_HEREDOC_QUOTE_DOUBLE, PM_HEREDOC_QUOTE_NONE, PM_HEREDOC_QUOTE_SINGLE, PM_IF_NODE, PM_IMAGINARY_NODE, PM_IMPLICIT_NODE, PM_IMPLICIT_REST_NODE, PM_INDEX_AND_WRITE_NODE, PM_INDEX_OPERATOR_WRITE_NODE, PM_INDEX_OR_WRITE_NODE, PM_INDEX_TARGET_NODE, PM_INSTANCE_VARIABLE_AND_WRITE_NODE, PM_INSTANCE_VARIABLE_OPERATOR_WRITE_NODE, PM_INSTANCE_VARIABLE_OR_WRITE_NODE, PM_INSTANCE_VARIABLE_READ_NODE, PM_INSTANCE_VARIABLE_TARGET_NODE, PM_INSTANCE_VARIABLE_WRITE_NODE, PM_INTEGER_BASE_FLAGS_BINARY, PM_INTEGER_BASE_FLAGS_DECIMAL, PM_INTEGER_BASE_FLAGS_HEXADECIMAL, PM_INTEGER_BASE_FLAGS_OCTAL, PM_INTEGER_NODE, PM_INTERPOLATED_MATCH_LAST_LINE_NODE, PM_INTERPOLATED_REGULAR_EXPRESSION_NODE, PM_INTERPOLATED_STRING_NODE, PM_INTERPOLATED_STRING_NODE_FLAGS_FROZEN, PM_INTERPOLATED_STRING_NODE_FLAGS_MUTABLE, PM_INTERPOLATED_SYMBOL_NODE, PM_INTERPOLATED_X_STRING_NODE, PM_IN_NODE, PM_IT_LOCAL_VARIABLE_READ_NODE, PM_IT_PARAMETERS_NODE, PM_KEYWORD_HASH_NODE, PM_KEYWORD_HASH_NODE_FLAGS_SYMBOL_KEYS, PM_KEYWORD_REST_PARAMETER_NODE, PM_LAMBDA_NODE, PM_LEX_DEFAULT, PM_LEX_EMBEXPR, PM_LEX_EMBVAR, PM_LEX_HEREDOC, PM_LEX_LIST, PM_LEX_REGEXP, PM_LEX_STATE_ARG, PM_LEX_STATE_ARG_ANY, PM_LEX_STATE_BEG, PM_LEX_STATE_BEG_ANY, PM_LEX_STATE_CLASS, PM_LEX_STATE_CMDARG, PM_LEX_STATE_DOT, PM_LEX_STATE_END, PM_LEX_STATE_ENDARG, PM_LEX_STATE_ENDFN, PM_LEX_STATE_END_ANY, PM_LEX_STATE_FITEM, PM_LEX_STATE_FNAME, PM_LEX_STATE_LABEL, PM_LEX_STATE_LABELED, PM_LEX_STATE_MID, PM_LEX_STATE_NONE, PM_LEX_STRING, PM_LOCAL_VARIABLE_AND_WRITE_NODE, PM_LOCAL_VARIABLE_OPERATOR_WRITE_NODE, PM_LOCAL_VARIABLE_OR_WRITE_NODE, PM_LOCAL_VARIABLE_READ_NODE, PM_LOCAL_VARIABLE_TARGET_NODE, PM_LOCAL_VARIABLE_WRITE_NODE, PM_LOCATION_TOKEN_VALUE, PM_LOOP_FLAGS_BEGIN_MODIFIER, PM_MATCH_LAST_LINE_NODE, PM_MATCH_PREDICATE_NODE, PM_MATCH_REQUIRED_NODE, PM_MATCH_WRITE_NODE, PM_MISSING_NODE, PM_MODULE_NODE, PM_MULTI_TARGET_NODE, PM_MULTI_WRITE_NODE, PM_NEXT_NODE, PM_NIL_NODE, PM_NODE_FLAG_NEWLINE, PM_NODE_FLAG_STATIC_LITERAL, PM_NO_KEYWORDS_PARAMETER_NODE, PM_NUMBERED_PARAMETERS_NODE, PM_NUMBERED_REFERENCE_READ_NODE, PM_OPTIONAL_KEYWORD_PARAMETER_NODE, PM_OPTIONAL_PARAMETER_NODE, PM_OR_NODE, PM_PARAMETERS_NODE, PM_PARAMETER_FLAGS_REPEATED_PARAMETER, PM_PARENTHESES_NODE, PM_PARENTHESES_NODE_FLAGS_MULTIPLE_STATEMENTS, PM_PINNED_EXPRESSION_NODE, PM_PINNED_VARIABLE_NODE, PM_POST_EXECUTION_NODE, PM_PRE_EXECUTION_NODE, PM_PROGRAM_NODE, PM_RANGE_FLAGS_EXCLUDE_END, PM_RANGE_NODE, PM_RATIONAL_NODE, PM_REDO_NODE, PM_REGULAR_EXPRESSION_FLAGS_ASCII_8BIT, PM_REGULAR_EXPRESSION_FLAGS_EUC_JP, PM_REGULAR_EXPRESSION_FLAGS_EXTENDED, PM_REGULAR_EXPRESSION_FLAGS_FORCED_US_ASCII_ENCODING, PM_REGULAR_EXPRESSION_FLAGS_FORCED_UTF8_ENCODING, PM_REGULAR_EXPRESSION_FLAGS_IGNORE_CASE, PM_REGULAR_EXPRESSION_FLAGS_MULTI_LINE, PM_REGULAR_EXPRESSION_FLAGS_ONCE, PM_REGULAR_EXPRESSION_FLAGS_UTF_8, PM_REGULAR_EXPRESSION_FLAGS_WINDOWS_31J, PM_REGULAR_EXPRESSION_NODE, PM_REQUIRED_KEYWORD_PARAMETER_NODE, PM_REQUIRED_PARAMETER_NODE, PM_RESCUE_MODIFIER_NODE, PM_RESCUE_NODE, PM_REST_PARAMETER_NODE, PM_RETRY_NODE, PM_RETURN_NODE, PM_SCOPE_PARAMETERS_FORWARDING_ALL, PM_SCOPE_PARAMETERS_FORWARDING_BLOCK, PM_SCOPE_PARAMETERS_FORWARDING_KEYWORDS, PM_SCOPE_PARAMETERS_FORWARDING_POSITIONALS, PM_SCOPE_PARAMETERS_IMPLICIT_DISALLOWED, PM_SCOPE_PARAMETERS_NONE, PM_SCOPE_PARAMETERS_NUMBERED_FOUND, PM_SCOPE_PARAMETERS_NUMBERED_INNER, PM_SCOPE_SHAREABLE_CONSTANT_EXPERIMENTAL_COPY, PM_SCOPE_SHAREABLE_CONSTANT_EXPERIMENTAL_EVERYTHING, PM_SCOPE_SHAREABLE_CONSTANT_LITERAL, PM_SCOPE_SHAREABLE_CONSTANT_NONE, PM_SELF_NODE, PM_SHAREABLE_CONSTANT_NODE, PM_SINGLETON_CLASS_NODE, PM_SOURCE_ENCODING_NODE, PM_SOURCE_FILE_NODE, PM_SOURCE_LINE_NODE, PM_SPLAT_NODE, PM_STATEMENTS_NODE, PM_STRING_FLAGS_FORCED_BINARY_ENCODING, PM_STRING_FLAGS_FORCED_UTF8_ENCODING, PM_STRING_FLAGS_FROZEN, PM_STRING_FLAGS_MUTABLE, PM_STRING_NODE, PM_SUPER_NODE, PM_SYMBOL_FLAGS_FORCED_BINARY_ENCODING, PM_SYMBOL_FLAGS_FORCED_US_ASCII_ENCODING, PM_SYMBOL_FLAGS_FORCED_UTF8_ENCODING, PM_SYMBOL_NODE, PM_TOKEN_AMPERSAND, PM_TOKEN_AMPERSAND_AMPERSAND, PM_TOKEN_AMPERSAND_AMPERSAND_EQUAL, PM_TOKEN_AMPERSAND_DOT, PM_TOKEN_AMPERSAND_EQUAL, PM_TOKEN_BACKTICK, PM_TOKEN_BACK_REFERENCE, PM_TOKEN_BANG, PM_TOKEN_BANG_EQUAL, PM_TOKEN_BANG_TILDE, PM_TOKEN_BRACE_LEFT, PM_TOKEN_BRACE_RIGHT, PM_TOKEN_BRACKET_LEFT, PM_TOKEN_BRACKET_LEFT_ARRAY, PM_TOKEN_BRACKET_LEFT_RIGHT, PM_TOKEN_BRACKET_LEFT_RIGHT_EQUAL, PM_TOKEN_BRACKET_RIGHT, PM_TOKEN_CARET, PM_TOKEN_CARET_EQUAL, PM_TOKEN_CHARACTER_LITERAL, PM_TOKEN_CLASS_VARIABLE, PM_TOKEN_COLON, PM_TOKEN_COLON_COLON, PM_TOKEN_COMMA, PM_TOKEN_COMMENT, PM_TOKEN_CONSTANT, PM_TOKEN_DOT, PM_TOKEN_DOT_DOT, PM_TOKEN_DOT_DOT_DOT, PM_TOKEN_EMBDOC_BEGIN, PM_TOKEN_EMBDOC_END, PM_TOKEN_EMBDOC_LINE, PM_TOKEN_EMBEXPR_BEGIN, PM_TOKEN_EMBEXPR_END, PM_TOKEN_EMBVAR, PM_TOKEN_EOF, PM_TOKEN_EQUAL, PM_TOKEN_EQUAL_EQUAL, PM_TOKEN_EQUAL_EQUAL_EQUAL, PM_TOKEN_EQUAL_GREATER, PM_TOKEN_EQUAL_TILDE, PM_TOKEN_FLOAT, PM_TOKEN_FLOAT_IMAGINARY, PM_TOKEN_FLOAT_RATIONAL, PM_TOKEN_FLOAT_RATIONAL_IMAGINARY, PM_TOKEN_GLOBAL_VARIABLE, PM_TOKEN_GREATER, PM_TOKEN_GREATER_EQUAL, PM_TOKEN_GREATER_GREATER, PM_TOKEN_GREATER_GREATER_EQUAL, PM_TOKEN_HEREDOC_END, PM_TOKEN_HEREDOC_START, PM_TOKEN_IDENTIFIER, PM_TOKEN_IGNORED_NEWLINE, PM_TOKEN_INSTANCE_VARIABLE, PM_TOKEN_INTEGER, PM_TOKEN_INTEGER_IMAGINARY, PM_TOKEN_INTEGER_RATIONAL, PM_TOKEN_INTEGER_RATIONAL_IMAGINARY, PM_TOKEN_KEYWORD_ALIAS, PM_TOKEN_KEYWORD_AND, PM_TOKEN_KEYWORD_BEGIN, PM_TOKEN_KEYWORD_BEGIN_UPCASE, PM_TOKEN_KEYWORD_BREAK, PM_TOKEN_KEYWORD_CASE, PM_TOKEN_KEYWORD_CLASS, PM_TOKEN_KEYWORD_DEF, PM_TOKEN_KEYWORD_DEFINED, PM_TOKEN_KEYWORD_DO, PM_TOKEN_KEYWORD_DO_LOOP, PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_KEYWORD_ELSIF, PM_TOKEN_KEYWORD_END, PM_TOKEN_KEYWORD_END_UPCASE, PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_FALSE, PM_TOKEN_KEYWORD_FOR, PM_TOKEN_KEYWORD_IF, PM_TOKEN_KEYWORD_IF_MODIFIER, PM_TOKEN_KEYWORD_IN, PM_TOKEN_KEYWORD_MODULE, PM_TOKEN_KEYWORD_NEXT, PM_TOKEN_KEYWORD_NIL, PM_TOKEN_KEYWORD_NOT, PM_TOKEN_KEYWORD_OR, PM_TOKEN_KEYWORD_REDO, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_RESCUE_MODIFIER, PM_TOKEN_KEYWORD_RETRY, PM_TOKEN_KEYWORD_RETURN, PM_TOKEN_KEYWORD_SELF, PM_TOKEN_KEYWORD_SUPER, PM_TOKEN_KEYWORD_THEN, PM_TOKEN_KEYWORD_TRUE, PM_TOKEN_KEYWORD_UNDEF, PM_TOKEN_KEYWORD_UNLESS, PM_TOKEN_KEYWORD_UNLESS_MODIFIER, PM_TOKEN_KEYWORD_UNTIL, PM_TOKEN_KEYWORD_UNTIL_MODIFIER, PM_TOKEN_KEYWORD_WHEN, PM_TOKEN_KEYWORD_WHILE, PM_TOKEN_KEYWORD_WHILE_MODIFIER, PM_TOKEN_KEYWORD_YIELD, PM_TOKEN_KEYWORD___ENCODING__, PM_TOKEN_KEYWORD___FILE__, PM_TOKEN_KEYWORD___LINE__, PM_TOKEN_LABEL, PM_TOKEN_LABEL_END, PM_TOKEN_LAMBDA_BEGIN, PM_TOKEN_LESS, PM_TOKEN_LESS_EQUAL, PM_TOKEN_LESS_EQUAL_GREATER, PM_TOKEN_LESS_LESS, PM_TOKEN_LESS_LESS_EQUAL, PM_TOKEN_MAXIMUM, PM_TOKEN_METHOD_NAME, PM_TOKEN_MINUS, PM_TOKEN_MINUS_EQUAL, PM_TOKEN_MINUS_GREATER, PM_TOKEN_MISSING, PM_TOKEN_NEWLINE, PM_TOKEN_NOT_PROVIDED, PM_TOKEN_NUMBERED_REFERENCE, PM_TOKEN_PARENTHESIS_LEFT, PM_TOKEN_PARENTHESIS_LEFT_PARENTHESES, PM_TOKEN_PARENTHESIS_RIGHT, PM_TOKEN_PERCENT, PM_TOKEN_PERCENT_EQUAL, PM_TOKEN_PERCENT_LOWER_I, PM_TOKEN_PERCENT_LOWER_W, PM_TOKEN_PERCENT_LOWER_X, PM_TOKEN_PERCENT_UPPER_I, PM_TOKEN_PERCENT_UPPER_W, PM_TOKEN_PIPE, PM_TOKEN_PIPE_EQUAL, PM_TOKEN_PIPE_PIPE, PM_TOKEN_PIPE_PIPE_EQUAL, PM_TOKEN_PLUS, PM_TOKEN_PLUS_EQUAL, PM_TOKEN_QUESTION_MARK, PM_TOKEN_REGEXP_BEGIN, PM_TOKEN_REGEXP_END, PM_TOKEN_SEMICOLON, PM_TOKEN_SLASH, PM_TOKEN_SLASH_EQUAL, PM_TOKEN_STAR, PM_TOKEN_STAR_EQUAL, PM_TOKEN_STAR_STAR, PM_TOKEN_STAR_STAR_EQUAL, PM_TOKEN_STRING_BEGIN, PM_TOKEN_STRING_CONTENT, PM_TOKEN_STRING_END, PM_TOKEN_SYMBOL_BEGIN, PM_TOKEN_TILDE, PM_TOKEN_UAMPERSAND, PM_TOKEN_UCOLON_COLON, PM_TOKEN_UDOT_DOT, PM_TOKEN_UDOT_DOT_DOT, PM_TOKEN_UMINUS, PM_TOKEN_UMINUS_NUM, PM_TOKEN_UPLUS, PM_TOKEN_USTAR, PM_TOKEN_USTAR_STAR, PM_TOKEN_WORDS_SEP, PM_TOKEN___END__, PM_TRUE_NODE, PM_UNDEF_NODE, PM_UNLESS_NODE, PM_UNTIL_NODE, PM_WHEN_NODE, PM_WHILE_NODE, PM_X_STRING_NODE, PM_YIELD_NODE } from "./ast.mjs";
import { PM_ERR_ALIAS_ARGUMENT, PM_ERR_ALIAS_ARGUMENT_NUMBERED_REFERENCE, PM_ERR_AMPAMPEQ_MULTI_ASSIGN, PM_ERR_ARGUMENT_AFTER_BLOCK, PM_ERR_ARGUMENT_AFTER_FORWARDING_ELLIPSES, PM_ERR_ARGUMENT_BARE_HASH, PM_ERR_ARGUMENT_BLOCK_MULTI, PM_ERR_ARGUMENT_CONFLICT_AMPERSAND, PM_ERR_ARGUMENT_CONFLICT_STAR, PM_ERR_ARGUMENT_CONFLICT_STAR_STAR, PM_ERR_ARGUMENT_FORMAL_CLASS, PM_ERR_ARGUMENT_FORMAL_CONSTANT, PM_ERR_ARGUMENT_FORMAL_GLOBAL, PM_ERR_ARGUMENT_FORMAL_IVAR, PM_ERR_ARGUMENT_FORWARDING_UNBOUND, PM_ERR_ARGUMENT_NO_FORWARDING_AMPERSAND, PM_ERR_ARGUMENT_NO_FORWARDING_ELLIPSES, PM_ERR_ARGUMENT_NO_FORWARDING_STAR, PM_ERR_ARGUMENT_NO_FORWARDING_STAR_STAR, PM_ERR_ARGUMENT_SPLAT_AFTER_ASSOC_SPLAT, PM_ERR_ARGUMENT_TERM_PAREN, PM_ERR_ARGUMENT_UNEXPECTED_BLOCK, PM_ERR_ARRAY_ELEMENT, PM_ERR_ARRAY_EXPRESSION, PM_ERR_ARRAY_EXPRESSION_AFTER_STAR, PM_ERR_ARRAY_SEPARATOR, PM_ERR_ARRAY_TERM, PM_ERR_BEGIN_LONELY_ELSE, PM_ERR_BEGIN_TERM, PM_ERR_BEGIN_UPCASE_BRACE, PM_ERR_BEGIN_UPCASE_TERM, PM_ERR_BEGIN_UPCASE_TOPLEVEL, PM_ERR_BLOCK_PARAM_LOCAL_VARIABLE, PM_ERR_BLOCK_PARAM_PIPE_TERM, PM_ERR_BLOCK_TERM_BRACE, PM_ERR_BLOCK_TERM_END, PM_ERR_CANNOT_PARSE_EXPRESSION, PM_ERR_CANNOT_PARSE_STRING_PART, PM_ERR_CASE_EXPRESSION_AFTER_CASE, PM_ERR_CASE_EXPRESSION_AFTER_WHEN, PM_ERR_CASE_MATCH_MISSING_PREDICATE, PM_ERR_CASE_MISSING_CONDITIONS, PM_ERR_CASE_TERM, PM_ERR_CLASS_IN_METHOD, PM_ERR_CLASS_NAME, PM_ERR_CLASS_SUPERCLASS, PM_ERR_CLASS_TERM, PM_ERR_CLASS_UNEXPECTED_END, PM_ERR_CLASS_VARIABLE_BARE, PM_ERR_CONDITIONAL_IF_PREDICATE, PM_ERR_CONDITIONAL_PREDICATE_TERM, PM_ERR_CONDITIONAL_TERM, PM_ERR_CONDITIONAL_TERM_ELSE, PM_ERR_CONDITIONAL_UNLESS_PREDICATE, PM_ERR_CONDITIONAL_UNTIL_PREDICATE, PM_ERR_CONDITIONAL_WHILE_PREDICATE, PM_ERR_CONSTANT_PATH_COLON_COLON_CONSTANT, PM_ERR_DEFINED_EXPRESSION, PM_ERR_DEF_ENDLESS, PM_ERR_DEF_ENDLESS_PARAMETERS, PM_ERR_DEF_ENDLESS_SETTER, PM_ERR_DEF_NAME, PM_ERR_DEF_PARAMS_TERM, PM_ERR_DEF_PARAMS_TERM_PAREN, PM_ERR_DEF_RECEIVER, PM_ERR_DEF_RECEIVER_TERM, PM_ERR_DEF_TERM, PM_ERR_EMBDOC_TERM, PM_ERR_EMBEXPR_END, PM_ERR_EMBVAR_INVALID, PM_ERR_END_UPCASE_BRACE, PM_ERR_END_UPCASE_TERM, PM_ERR_ESCAPE_INVALID_CONTROL, PM_ERR_ESCAPE_INVALID_CONTROL_REPEAT, PM_ERR_ESCAPE_INVALID_HEXADECIMAL, PM_ERR_ESCAPE_INVALID_META, PM_ERR_ESCAPE_INVALID_META_REPEAT, PM_ERR_ESCAPE_INVALID_UNICODE, PM_ERR_ESCAPE_INVALID_UNICODE_LIST, PM_ERR_ESCAPE_INVALID_UNICODE_LITERAL, PM_ERR_ESCAPE_INVALID_UNICODE_LONG, PM_ERR_ESCAPE_INVALID_UNICODE_SHORT, PM_ERR_ESCAPE_INVALID_UNICODE_TERM, PM_ERR_EXPECT_ARGUMENT, PM_ERR_EXPECT_EOL_AFTER_STATEMENT, PM_ERR_EXPECT_EXPRESSION_AFTER_AMPAMPEQ, PM_ERR_EXPECT_EXPRESSION_AFTER_COMMA, PM_ERR_EXPECT_EXPRESSION_AFTER_EQUAL, PM_ERR_EXPECT_EXPRESSION_AFTER_LESS_LESS, PM_ERR_EXPECT_EXPRESSION_AFTER_OPERATOR, PM_ERR_EXPECT_EXPRESSION_AFTER_PIPEPIPEEQ, PM_ERR_EXPECT_EXPRESSION_AFTER_SPLAT, PM_ERR_EXPECT_EXPRESSION_AFTER_SPLAT_HASH, PM_ERR_EXPECT_EXPRESSION_AFTER_STAR, PM_ERR_EXPECT_FOR_DELIMITER, PM_ERR_EXPECT_IDENT_REQ_PARAMETER, PM_ERR_EXPECT_IN_DELIMITER, PM_ERR_EXPECT_LPAREN_AFTER_NOT_LPAREN, PM_ERR_EXPECT_LPAREN_AFTER_NOT_OTHER, PM_ERR_EXPECT_LPAREN_REQ_PARAMETER, PM_ERR_EXPECT_MESSAGE, PM_ERR_EXPECT_RBRACKET, PM_ERR_EXPECT_RPAREN, PM_ERR_EXPECT_RPAREN_REQ_PARAMETER, PM_ERR_EXPECT_SINGLETON_CLASS_DELIMITER, PM_ERR_EXPECT_STRING_CONTENT, PM_ERR_EXPECT_WHEN_DELIMITER, PM_ERR_EXPRESSION_BARE_HASH, PM_ERR_EXPRESSION_NOT_WRITABLE, PM_ERR_EXPRESSION_NOT_WRITABLE_ENCODING, PM_ERR_EXPRESSION_NOT_WRITABLE_FALSE, PM_ERR_EXPRESSION_NOT_WRITABLE_FILE, PM_ERR_EXPRESSION_NOT_WRITABLE_LINE, PM_ERR_EXPRESSION_NOT_WRITABLE_NIL, PM_ERR_EXPRESSION_NOT_WRITABLE_NUMBERED, PM_ERR_EXPRESSION_NOT_WRITABLE_SELF, PM_ERR_EXPRESSION_NOT_WRITABLE_TRUE, PM_ERR_FLOAT_PARSE, PM_ERR_FOR_COLLECTION, PM_ERR_FOR_IN, PM_ERR_FOR_INDEX, PM_ERR_FOR_TERM, PM_ERR_GLOBAL_VARIABLE_BARE, PM_ERR_HASH_EXPRESSION_AFTER_LABEL, PM_ERR_HASH_KEY, PM_ERR_HASH_ROCKET, PM_ERR_HASH_TERM, PM_ERR_HASH_VALUE, PM_ERR_HEREDOC_IDENTIFIER, PM_ERR_HEREDOC_TERM, PM_ERR_INCOMPLETE_QUESTION_MARK, PM_ERR_INCOMPLETE_VARIABLE_CLASS, PM_ERR_INCOMPLETE_VARIABLE_CLASS_3_3, PM_ERR_INCOMPLETE_VARIABLE_INSTANCE, PM_ERR_INCOMPLETE_VARIABLE_INSTANCE_3_3, PM_ERR_INSTANCE_VARIABLE_BARE, PM_ERR_INVALID_BLOCK_EXIT, PM_ERR_INVALID_CHARACTER, PM_ERR_INVALID_COMMA, PM_ERR_INVALID_ENCODING_MAGIC_COMMENT, PM_ERR_INVALID_ESCAPE_CHARACTER, PM_ERR_INVALID_FLOAT_EXPONENT, PM_ERR_INVALID_LOCAL_VARIABLE_READ, PM_ERR_INVALID_LOCAL_VARIABLE_WRITE, PM_ERR_INVALID_MULTIBYTE_CHARACTER, PM_ERR_INVALID_MULTIBYTE_ESCAPE, PM_ERR_INVALID_NUMBER_BINARY, PM_ERR_INVALID_NUMBER_DECIMAL, PM_ERR_INVALID_NUMBER_FRACTION, PM_ERR_INVALID_NUMBER_HEXADECIMAL, PM_ERR_INVALID_NUMBER_OCTAL, PM_ERR_INVALID_NUMBER_UNDERSCORE_INNER, PM_ERR_INVALID_NUMBER_UNDERSCORE_TRAILING, PM_ERR_INVALID_PERCENT, PM_ERR_INVALID_PERCENT_EOF, PM_ERR_INVALID_PRINTABLE_CHARACTER, PM_ERR_INVALID_RETRY_AFTER_ELSE, PM_ERR_INVALID_RETRY_AFTER_ENSURE, PM_ERR_INVALID_RETRY_WITHOUT_RESCUE, PM_ERR_INVALID_SYMBOL, PM_ERR_INVALID_VARIABLE_GLOBAL, PM_ERR_INVALID_VARIABLE_GLOBAL_3_3, PM_ERR_INVALID_YIELD, PM_ERR_IT_NOT_ALLOWED_NUMBERED, PM_ERR_IT_NOT_ALLOWED_ORDINARY, PM_ERR_LAMBDA_OPEN, PM_ERR_LAMBDA_TERM_BRACE, PM_ERR_LAMBDA_TERM_END, PM_ERR_LIST_I_LOWER_ELEMENT, PM_ERR_LIST_I_LOWER_TERM, PM_ERR_LIST_I_UPPER_ELEMENT, PM_ERR_LIST_I_UPPER_TERM, PM_ERR_LIST_W_LOWER_ELEMENT, PM_ERR_LIST_W_LOWER_TERM, PM_ERR_LIST_W_UPPER_ELEMENT, PM_ERR_LIST_W_UPPER_TERM, PM_ERR_MIXED_ENCODING, PM_ERR_MODULE_IN_METHOD, PM_ERR_MODULE_NAME, PM_ERR_MODULE_TERM, PM_ERR_MULTI_ASSIGN_MULTI_SPLATS, PM_ERR_MULTI_ASSIGN_UNEXPECTED_REST, PM_ERR_NESTING_TOO_DEEP, PM_ERR_NON_ASSOCIATIVE_OPERATOR, PM_ERR_NOT_EXPRESSION, PM_ERR_NO_LOCAL_VARIABLE, PM_ERR_NUMBERED_PARAMETER_INNER_BLOCK, PM_ERR_NUMBERED_PARAMETER_IT, PM_ERR_NUMBERED_PARAMETER_ORDINARY, PM_ERR_NUMBERED_PARAMETER_OUTER_BLOCK, PM_ERR_OPERATOR_MULTI_ASSIGN, PM_ERR_OPERATOR_WRITE_ARGUMENTS, PM_ERR_OPERATOR_WRITE_BLOCK, PM_ERR_PARAMETER_ASSOC_SPLAT_MULTI, PM_ERR_PARAMETER_BLOCK_MULTI, PM_ERR_PARAMETER_CIRCULAR, PM_ERR_PARAMETER_FORWARDING_AFTER_REST, PM_ERR_PARAMETER_METHOD_NAME, PM_ERR_PARAMETER_NAME_DUPLICATED, PM_ERR_PARAMETER_NO_DEFAULT, PM_ERR_PARAMETER_NO_DEFAULT_KW, PM_ERR_PARAMETER_NUMBERED_RESERVED, PM_ERR_PARAMETER_ORDER, PM_ERR_PARAMETER_SPLAT_MULTI, PM_ERR_PARAMETER_STAR, PM_ERR_PARAMETER_UNEXPECTED_FWD, PM_ERR_PARAMETER_UNEXPECTED_NO_KW, PM_ERR_PARAMETER_WILD_LOOSE_COMMA, PM_ERR_PATTERN_ARRAY_MULTIPLE_RESTS, PM_ERR_PATTERN_CAPTURE_DUPLICATE, PM_ERR_PATTERN_CAPTURE_IN_ALTERNATIVE, PM_ERR_PATTERN_EXPRESSION_AFTER_BRACKET, PM_ERR_PATTERN_EXPRESSION_AFTER_COMMA, PM_ERR_PATTERN_EXPRESSION_AFTER_HROCKET, PM_ERR_PATTERN_EXPRESSION_AFTER_IN, PM_ERR_PATTERN_EXPRESSION_AFTER_KEY, PM_ERR_PATTERN_EXPRESSION_AFTER_PAREN, PM_ERR_PATTERN_EXPRESSION_AFTER_PIN, PM_ERR_PATTERN_EXPRESSION_AFTER_PIPE, PM_ERR_PATTERN_EXPRESSION_AFTER_RANGE, PM_ERR_PATTERN_EXPRESSION_AFTER_REST, PM_ERR_PATTERN_FIND_MISSING_INNER, PM_ERR_PATTERN_HASH_IMPLICIT, PM_ERR_PATTERN_HASH_KEY, PM_ERR_PATTERN_HASH_KEY_DUPLICATE, PM_ERR_PATTERN_HASH_KEY_INTERPOLATED, PM_ERR_PATTERN_HASH_KEY_LABEL, PM_ERR_PATTERN_HASH_KEY_LOCALS, PM_ERR_PATTERN_IDENT_AFTER_HROCKET, PM_ERR_PATTERN_LABEL_AFTER_COMMA, PM_ERR_PATTERN_REST, PM_ERR_PATTERN_TERM_BRACE, PM_ERR_PATTERN_TERM_BRACKET, PM_ERR_PATTERN_TERM_PAREN, PM_ERR_PIPEPIPEEQ_MULTI_ASSIGN, PM_ERR_REGEXP_ENCODING_OPTION_MISMATCH, PM_ERR_REGEXP_INVALID_UNICODE_RANGE, PM_ERR_REGEXP_NON_ESCAPED_MBC, PM_ERR_REGEXP_PARSE_ERROR, PM_ERR_REGEXP_TERM, PM_ERR_REGEXP_UNKNOWN_OPTIONS, PM_ERR_RESCUE_EXPRESSION, PM_ERR_RESCUE_MODIFIER_VALUE, PM_ERR_RESCUE_TERM, PM_ERR_RESCUE_VARIABLE, PM_ERR_RETURN_INVALID, PM_ERR_SCRIPT_NOT_FOUND, PM_ERR_SINGLETON_FOR_LITERALS, PM_ERR_STATEMENT_ALIAS, PM_ERR_STATEMENT_POSTEXE_END, PM_ERR_STATEMENT_PREEXE_BEGIN, PM_ERR_STATEMENT_UNDEF, PM_ERR_STRING_CONCATENATION, PM_ERR_STRING_INTERPOLATED_TERM, PM_ERR_STRING_LITERAL_EOF, PM_ERR_STRING_LITERAL_TERM, PM_ERR_SYMBOL_INVALID, PM_ERR_SYMBOL_TERM_DYNAMIC, PM_ERR_SYMBOL_TERM_INTERPOLATED, PM_ERR_TERNARY_COLON, PM_ERR_TERNARY_EXPRESSION_FALSE, PM_ERR_TERNARY_EXPRESSION_TRUE, PM_ERR_UNARY_DISALLOWED, PM_ERR_UNARY_RECEIVER, PM_ERR_UNDEF_ARGUMENT, PM_ERR_UNEXPECTED_BLOCK_ARGUMENT, PM_ERR_UNEXPECTED_INDEX_BLOCK, PM_ERR_UNEXPECTED_INDEX_KEYWORDS, PM_ERR_UNEXPECTED_LABEL, PM_ERR_UNEXPECTED_MULTI_WRITE, PM_ERR_UNEXPECTED_PARAMETER_DEFAULT_VALUE, PM_ERR_UNEXPECTED_RANGE_OPERATOR, PM_ERR_UNEXPECTED_SAFE_NAVIGATION, PM_ERR_UNEXPECTED_TOKEN_CLOSE_CONTEXT, PM_ERR_UNEXPECTED_TOKEN_IGNORE, PM_ERR_UNTIL_TERM, PM_ERR_VOID_EXPRESSION, PM_ERR_WHILE_TERM, PM_ERR_WRITE_TARGET_IN_METHOD, PM_ERR_WRITE_TARGET_READONLY, PM_ERR_WRITE_TARGET_UNEXPECTED, PM_ERR_XSTRING_TERM, PM_WARN_AMBIGUOUS_BINARY_OPERATOR, PM_WARN_AMBIGUOUS_FIRST_ARGUMENT_MINUS, PM_WARN_AMBIGUOUS_FIRST_ARGUMENT_PLUS, PM_WARN_AMBIGUOUS_PREFIX_AMPERSAND, PM_WARN_AMBIGUOUS_PREFIX_STAR, PM_WARN_AMBIGUOUS_PREFIX_STAR_STAR, PM_WARN_AMBIGUOUS_SLASH, PM_WARN_COMPARISON_AFTER_COMPARISON, PM_WARN_DOT_DOT_DOT_EOL, PM_WARN_DUPLICATED_HASH_KEY, PM_WARN_DUPLICATED_WHEN_CLAUSE, PM_WARN_END_IN_METHOD, PM_WARN_EQUAL_IN_CONDITIONAL, PM_WARN_EQUAL_IN_CONDITIONAL_3_3, PM_WARN_FLOAT_OUT_OF_RANGE, PM_WARN_IGNORED_FROZEN_STRING_LITERAL, PM_WARN_INDENTATION_MISMATCH, PM_WARN_INTEGER_IN_FLIP_FLOP, PM_WARN_INVALID_CHARACTER, PM_WARN_INVALID_MAGIC_COMMENT_VALUE, PM_WARN_INVALID_NUMBERED_REFERENCE, PM_WARN_KEYWORD_EOL, PM_WARN_LITERAL_IN_CONDITION_DEFAULT, PM_WARN_LITERAL_IN_CONDITION_VERBOSE, PM_WARN_SHAREABLE_CONSTANT_VALUE_LINE, PM_WARN_SHEBANG_CARRIAGE_RETURN, PM_WARN_UNEXPECTED_CARRIAGE_RETURN, PM_WARN_UNREACHABLE_STATEMENT, PM_WARN_UNUSED_LOCAL_VARIABLE, PM_WARN_VOID_STATEMENT, pm_diagnostic_list_append, pm_diagnostic_list_append_format } from "./diagnostic.mjs";
import { pm_token_type_human } from "./token_type.mjs";
import { PM_ENCODING_ASCII_8BIT_ENTRY, PM_ENCODING_EUC_JP_ENTRY, PM_ENCODING_UTF_8_ENTRY, PM_ENCODING_WINDOWS_31J_ENTRY, PRISM_ENCODING_ALPHABETIC_BIT, PRISM_ENCODING_ALPHANUMERIC_BIT, pm_encoding_canonical_name, pm_encoding_family, pm_encoding_find, pm_encoding_unicode_table, pm_encoding_utf_8_char_width, pm_encoding_utf_8_isupper_char } from "./encoding.mjs";
import { PM_OPTIONS_COMMAND_LINE_A, PM_OPTIONS_COMMAND_LINE_E, PM_OPTIONS_COMMAND_LINE_L, PM_OPTIONS_COMMAND_LINE_N, PM_OPTIONS_COMMAND_LINE_P, PM_OPTIONS_COMMAND_LINE_X, PM_OPTIONS_FROZEN_STRING_LITERAL_DISABLED, PM_OPTIONS_FROZEN_STRING_LITERAL_ENABLED, PM_OPTIONS_FROZEN_STRING_LITERAL_UNSET, PM_OPTIONS_VERSION_CRUBY_3_3, PM_OPTIONS_VERSION_CRUBY_3_4, PM_OPTIONS_VERSION_CRUBY_4_0, PM_OPTIONS_VERSION_LATEST, PM_OPTIONS_VERSION_UNSET, pm_options_scope_get, pm_options_scope_local_get } from "./options.mjs";
import { pm_static_literal_inspect, pm_static_literals_add } from "./static_literals.mjs";
import { pm_regexp_parse } from "./regexp.mjs";
import { pm_node_list_append, pm_node_list_concat, pm_node_list_prepend, pm_visit_node } from "./node.mjs";

// ----------------------------------------------------------------------
// parser_part1.mjs
// ----------------------------------------------------------------------
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
// An optional location that isn't set: one shared object, frozen (C has
// the location structs inside the nodes; an optional location is
// replaced, never changed in place).
const PM_LOCATION_UNSET = Object.freeze({ start: null, end: null });

function PM_OPTIONAL_LOCATION_TOKEN_VALUE(token) { return token.type === PM_TOKEN_NOT_PROVIDED ? PM_LOCATION_UNSET : PM_LOCATION_TOKEN_VALUE(token); }

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

// ----------------------------------------------------------------------
// parser_part2.mjs
// ----------------------------------------------------------------------
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
            const embedded = (part.statements?.body.length === 1) ? part.statements.body[0] : null;

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
            const embedded = (part.statements?.body.length === 1) ? part.statements.body[0] : null;

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

// ----------------------------------------------------------------------
// parser_part3.mjs
// ----------------------------------------------------------------------
// prism.c lines 7090-9735 converted to JavaScript (ES2022).
//
// This is a plain fragment: it declares consts/functions only, no
// import/export. It relies on part1/part2, ast.js, node.js, diagnostic.js,
// options.js, token_type.js, encoding.js and the util modules being
// concatenated/imported around it.
//
// Adaptation notes for the integrator:
// - C pointers into parser->source are numeric offsets (see part1). NULL
//   pointers become null for objects and -1 for numeric offsets:
//   next_newline, parser_lex_magic_comment_emacs_marker and every pm_memchr
//   call site below use -1 as the "not found" sentinel.
// - next_newline has no parser parameter in C, so the source buffer is passed
//   explicitly (same pattern as part1's char_is_identifier_utf8):
//   next_newline(source, cursor, length) -> offset or -1.
// - pm_state_stack_t values live on the parser as plain number fields
//   (parser.accepts_block_stack / parser.do_loop_stack) with uint32 wrap
//   semantics ((x << 1 | v) >>> 0, x >>> 1). The generic helpers take and
//   return plain numbers; the parser-specific wrappers assign them directly.
// - C out-params become return values: lex_optional_float_suffix /
//   lex_numeric_prefix return { type, seen_e }; pm_heredoc_strspn_inline_
//   whitespace returns [whitespace, cursor]; the strspn number scanners return
//   { size, invalid } with `invalid` a source offset or null.
// - Encoding callbacks are called as fn(parser.source, offset, n).
// - Magic-comment keys/values are compared case-insensitively via
//   .toLowerCase() === constant_string.
//   encode those constants once at module level below
//   (MAGIC_COMMENT_*_BYTES).
// - escape_unicode indexes parser.source directly: its C `string` pointer
//   parameter becomes a numeric offset so that the error_location == null
//   branch keeps exact start/end offsets.
// - Octal escapes truncate through uint8_t in C (\777 wraps to 255); those
//   shifts are masked with & 0xff explicitly.
// - Magic comments appended to parser.magic_comment_list are plain objects
//   { key_start, value_start, key_length, value_length } where key_start /
//   value_start are numeric offsets into parser.source.
// - pm_slice_ascii_only_p takes a JS string (a slice of the source) plus a
//   length; offset-based call sites pass parser.source.slice(start, end).
// - Token buffers (pm_token_buffer_t / pm_regexp_token_buffer_t) are plain
//   objects:
//     pm_token_buffer_t        := { buffer: pm_buffer_t, cursor: number | null }
//     pm_regexp_token_buffer_t := { base: pm_token_buffer_t, regexp_buffer: pm_buffer_t }
//   Local buffers are created as `{}` and initialized via
//   pm_buffer_init_capacity, mirroring `pm_buffer_t buffer; init(&buffer)`.
// - parser.heredoc_end is an offset or null (C NULL pointer);
//   parser_flush_heredoc_end assigns it to parser.next_start verbatim.
// - parser.current_string is written in place through
//   pm_string_shared_init/pm_string_owned_init exactly like regexp.js does.
// - The LEX(token_type) macro (prism.c:9726) is not defined here; expand it at
//   its use sites as `parser.current.type = X; parser_lex_callback(parser);
//   return;`.
// - parser_lex itself starts at prism.c:9734 and belongs to the next fragment.
//
// Struct shapes referenced below (documented, not declared):
// - pm_magic_comment_t := { key_start, value_start, key_length, value_length }
// - pm_comment_t       := { type, location: { start, end } }
// - pm_context_node_t  := { context, prev }

/******************************************************************************/
/* Local variables                                                            */
/******************************************************************************/

/**
 * Check if any of the currently visible scopes contain a local variable
 * described by the given constant id.
 */
function pm_parser_local_depth_constant_id(parser, constant_id) {
    let scope = parser.current_scope;
    let depth = 0;

    while (scope !== null) {
        if (scope.locals.has(constant_id)) return depth;
        if (scope.closed) break;

        scope = scope.previous;
        depth++;
    }

    return -1;
}

/**
 * Check if any of the currently visible scopes contain a local variable
 * described by the given token. This function implicitly inserts a constant
 * into the constant pool.
 */
function pm_parser_local_depth(parser, token) {
    return pm_parser_local_depth_constant_id(parser, pm_parser_constant_id_token(parser, token));
}

/**
 * Add a constant id to the local table of the current scope.
 */
function pm_parser_local_add(parser, constant_id, start, end, reads) {
    pm_locals_write(parser.current_scope.locals, constant_id, start, end, reads);
}

/**
 * Add a local variable from a location to the current scope.
 */
function pm_parser_local_add_location(parser, start, end, reads) {
    const constant_id = pm_parser_constant_id_location(parser, start, end);
    if (constant_id !== 0) pm_parser_local_add(parser, constant_id, start, end, reads);
    return constant_id;
}

/**
 * Add a local variable from a token to the current scope.
 */
function pm_parser_local_add_token(parser, token, reads) {
    return pm_parser_local_add_location(parser, token.start, token.end, reads);
}

/**
 * Add a local variable from an owned string to the current scope. `bytes`
 * holds the content (a Uint8Array whose first `length` entries hold it).
 */
function pm_parser_local_add_owned(parser, bytes, length) {
    const constant_id = pm_parser_constant_id_owned(parser, bytes, length);
    if (constant_id !== 0) pm_parser_local_add(parser, constant_id, parser.start, parser.start, 1);
    return constant_id;
}

/**
 * Add a local variable from a constant string to the current scope. `str` is
 * a JS string.
 */
function pm_parser_local_add_constant(parser, str, length) {
    const constant_id = pm_parser_constant_id_constant(parser, str, length);
    if (constant_id !== 0) pm_parser_local_add(parser, constant_id, parser.start, parser.start, 1);
    return constant_id;
}

/**
 * Add a parameter name to the current scope and check whether the name of the
 * parameter is unique or not.
 *
 * Returns `true` if this is a duplicate parameter name, otherwise returns
 * false.
 */
function pm_parser_parameter_name_check(parser, name) {
    // We want to check whether the parameter name is a numbered parameter or
    // not.
    pm_refute_numbered_parameter(parser, name.start, name.end);

    // Otherwise we'll fetch the constant id for the parameter name and check
    // whether it's already in the current scope.
    const constant_id = pm_parser_constant_id_token(parser, name);

    if (parser.current_scope.locals.has(constant_id)) {
        // Add an error if the parameter doesn't start with _ and has been seen before
        if ((name.start < name.end) && (parser.source[name.start] !== '_')) {
            pm_parser_err_token(parser, name, PM_ERR_PARAMETER_NAME_DUPLICATED);
        }
        return true;
    }
    return false;
}

/**
 * Pop the current scope off the scope stack.
 */
function pm_parser_scope_pop(parser) {
    const scope = parser.current_scope;
    parser.current_scope = scope.previous;
}

/******************************************************************************/
/* Stack helpers                                                              */
/******************************************************************************/
//
// The stacks themselves (parser.accepts_block_stack / parser.do_loop_stack)
// are plain uint32 numbers on the parser; these helpers pass them through a
// { value } box so they can mutate them.

/**
 * Pushes a value onto the stack.
 */
function pm_state_stack_push(value, bit) {
    return ((value << 1) | (bit & 1)) >>> 0;
}

/**
 * Pops a value off the stack.
 */
function pm_state_stack_pop(value) {
    return value >>> 1;
}

/**
 * Returns the value at the top of the stack.
 */
function pm_state_stack_p(value) {
    return (value & 1) !== 0;
}

function pm_accepts_block_stack_push(parser, value) {
    // Use the negation of the value to prevent stack overflow.
    parser.accepts_block_stack = pm_state_stack_push(parser.accepts_block_stack, !value);
}

function pm_accepts_block_stack_pop(parser) {
    parser.accepts_block_stack = pm_state_stack_pop(parser.accepts_block_stack);
}

function pm_accepts_block_stack_p(parser) {
    return !pm_state_stack_p(parser.accepts_block_stack);
}

function pm_do_loop_stack_push(parser, value) {
    parser.do_loop_stack = pm_state_stack_push(parser.do_loop_stack, value);
}

function pm_do_loop_stack_pop(parser) {
    parser.do_loop_stack = pm_state_stack_pop(parser.do_loop_stack);
}

function pm_do_loop_stack_p(parser) {
    return pm_state_stack_p(parser.do_loop_stack);
}

/******************************************************************************/
/* Lexer check helpers                                                        */
/******************************************************************************/

/**
 * Get the next character in the source starting from +cursor+. If that position
 * is beyond the end of the source then return '\0'.
 */
function peek_at(parser, cursor) {
    if (cursor < parser.end) {
        return (parser.source.charCodeAt(cursor));
    } else {
        return 0; // '\0'
    }
}

/**
 * Get the next character in the source starting from parser->current.end and
 * adding the given offset. If that position is beyond the end of the source
 * then return '\0'.
 */
function peek_offset(parser, offset) {
    return peek_at(parser, parser.current.end + offset);
}

/**
 * Get the next character in the source starting from parser->current.end. If
 * that position is beyond the end of the source then return '\0'.
 */
function peek(parser) {
    return peek_at(parser, parser.current.end);
}

/**
 * If the character to be read matches the given value, then returns true and
 * advances the current pointer.
 */
function match(parser, value) {
    if (peek(parser) === value) {
        parser.current.end++;
        return true;
    }
    return false;
}

/**
 * Return the length of the line ending string starting at +cursor+, or 0 if it
 * is not a line ending. This function is intended to be CRLF/LF agnostic.
 */
function match_eol_at(parser, cursor) {
    if (peek_at(parser, cursor) === 10 /* '\n' */) {
        return 1;
    }
    if (peek_at(parser, cursor) === 13 /* '\r' */ && peek_at(parser, cursor + 1) === 10 /* '\n' */) {
        return 2;
    }
    return 0;
}

/**
 * Return the length of the line ending string starting at
 * `parser->current.end + offset`, or 0 if it is not a line ending. This
 * function is intended to be CRLF/LF agnostic.
 */
function match_eol_offset(parser, offset) {
    return match_eol_at(parser, parser.current.end + offset);
}

/**
 * Return the length of the line ending string starting at parser->current.end,
 * or 0 if it is not a line ending. This function is intended to be CRLF/LF
 * agnostic.
 */
function match_eol(parser) {
    return match_eol_at(parser, parser.current.end);
}

/**
 * Skip to the next newline character or NUL byte. Returns the offset of the
 * newline or -1 (C NULL).
 */
function next_newline(source, cursor, length) {
    const index = source.indexOf("\n", cursor);
    return ((index !== -1) && (index - cursor < length)) ? index : -1;
}

/**
 * This is equivalent to the predicate of warn_balanced in CRuby.
 */
function ambiguous_operator_p(parser, space_seen) {
    return !lex_state_p(parser, PM_LEX_STATE_CLASS | PM_LEX_STATE_DOT | PM_LEX_STATE_FNAME | PM_LEX_STATE_ENDFN) && space_seen && !pm_char_is_whitespace(peek(parser));
}

/**
 * Here we're going to check if this is a "magic" comment, and perform whatever
 * actions are necessary for it here.
 */
function parser_lex_magic_comment_encoding_value(parser, start, end) {
    const encoding = pm_encoding_find(parser.source, start, end);

    if (encoding !== null) {
        if (parser.encoding !== encoding) {
            parser.encoding = encoding;
        }

        // UNI-BUILD: `parser.encoding` is collapsed; keep the declared
        // encoding's family so escape-encoding flag logic can still work,
        // and its canonical name for the Ruby bridge's Result#encoding.
        const declared = parser.source.slice(start, end);
        parser.source_encoding_family = pm_encoding_family(declared);
        parser.encoding_comment_name = pm_encoding_canonical_name(declared) ?? parser.encoding_comment_name;

        return true;
    }

    return false;
}

// ASCII constants compared case-insensitively against source slices below.
const MAGIC_COMMENT_CODING_BYTES = "coding";
const MAGIC_COMMENT_ENCODING_BYTES = "encoding";
const MAGIC_COMMENT_TRUE_BYTES = "true";
const MAGIC_COMMENT_FALSE_BYTES = "false";
const MAGIC_COMMENT_WARN_INDENT_BYTES = "warn_indent";
const MAGIC_COMMENT_FROZEN_STRING_LITERAL_BYTES = "frozen_string_literal";
const MAGIC_COMMENT_SHAREABLE_CONSTANT_VALUE_BYTES = "shareable_constant_value";
const MAGIC_COMMENT_NONE_BYTES = "none";
const MAGIC_COMMENT_LITERAL_BYTES = "literal";
const MAGIC_COMMENT_EXPERIMENTAL_EVERYTHING_BYTES = "experimental_everything";
const MAGIC_COMMENT_EXPERIMENTAL_COPY_BYTES = "experimental_copy";

/**
 * Look for a specific pattern of "coding" and potentially set the encoding on
 * the parser.
 */
function parser_lex_magic_comment_encoding(parser) {
    let cursor = parser.current.start + 1;
    const end = parser.current.end;

    let separator = false;
    while (true) {
        if (end - cursor <= 6) return;
        switch ((parser.source.charCodeAt(cursor + 6) || 0)) {
            case 67: case 99: cursor += 6; continue; // 'C' 'c'
            case 79: case 111: cursor += 5; continue; // 'O' 'o'
            case 68: case 100: cursor += 4; continue; // 'D' 'd'
            case 73: case 105: cursor += 3; continue; // 'I' 'i'
            case 78: case 110: cursor += 2; continue; // 'N' 'n'
            case 71: case 103: cursor += 1; continue; // 'G' 'g'
            case 61: case 58: // '=' ':'
                separator = true;
                cursor += 6;
                break;
            default:
                cursor += 6;
                if (pm_char_is_whitespace((parser.source.charCodeAt(cursor) || 0))) break;
                continue;
        }
        if ((parser.source.slice(cursor - 6, cursor).toLowerCase() === MAGIC_COMMENT_CODING_BYTES)) break;
        separator = false;
    }

    while (true) {
        do {
            cursor++;
            if (cursor >= end) return;
        } while (pm_char_is_whitespace((parser.source.charCodeAt(cursor) || 0)));

        if (separator) break;
        if ((parser.source.charCodeAt(cursor) || 0) !== 61 && (parser.source.charCodeAt(cursor) || 0) !== 58) return; // '=' ':'

        separator = true;
        cursor++;
    }

    const value_start = cursor;
    while (((parser.source[cursor] === '-') || (parser.source[cursor] === '_') || parser.encoding.alnum_char(parser.source, cursor, 1)) && (++cursor < end));

    if (!parser_lex_magic_comment_encoding_value(parser, value_start, cursor)) {
        // If we were unable to parse the encoding value, then we've got an
        // issue because we didn't understand the encoding that the user was
        // trying to use. In this case we'll keep using the default encoding but
        // add an error to the parser to indicate an unsuccessful parse.
        pm_parser_err(parser, value_start, cursor, PM_ERR_INVALID_ENCODING_MAGIC_COMMENT);
    }
}

// pm_magic_comment_boolean_value_t
const PM_MAGIC_COMMENT_BOOLEAN_VALUE_TRUE = 0;
const PM_MAGIC_COMMENT_BOOLEAN_VALUE_FALSE = 1;
const PM_MAGIC_COMMENT_BOOLEAN_VALUE_INVALID = 2;

/**
 * Check if this is a magic comment that includes the frozen_string_literal
 * pragma. If it does, set that field on the parser.
 *
 * (Adaptation: takes the source buffer explicitly because it has no parser
 * parameter in C but must index into parser.source.)
 */
function parser_lex_magic_comment_boolean_value(source, value_start, value_length) {
    if (value_length === 4 && (source.slice(value_start, value_start + 4).toLowerCase() === MAGIC_COMMENT_TRUE_BYTES)) {
        return PM_MAGIC_COMMENT_BOOLEAN_VALUE_TRUE;
    } else if (value_length === 5 && (source.slice(value_start, value_start + 5).toLowerCase() === MAGIC_COMMENT_FALSE_BYTES)) {
        return PM_MAGIC_COMMENT_BOOLEAN_VALUE_FALSE;
    } else {
        return PM_MAGIC_COMMENT_BOOLEAN_VALUE_INVALID;
    }
}

function pm_char_is_magic_comment_key_delimiter(b) {
    return b === 39 /* '\'' */ || b === 34 /* '"' */ || b === 58 /* ':' */ || b === 59 /* ';' */;
}

/**
 * Find an emacs magic comment marker (-*-) within the given bounds. If one is
 * found, it returns an offset to the start of the marker. Otherwise it returns
 * -1 (C NULL).
 */
function parser_lex_magic_comment_emacs_marker(parser, cursor, end) {
    while (true) {
        if (cursor + 3 > end) break;
        cursor = parser.source.indexOf("-", cursor);
        if (cursor === -1 || cursor >= end) break;

        if (cursor + 3 <= end && parser.source[cursor + 1] === '*' && parser.source[cursor + 2] === '-') {
            return cursor;
        }
        cursor++;
    }
    return -1;
}

/**
 * Parse the current token on the parser to see if it's a magic comment and
 * potentially perform some action based on that. A regular expression that this
 * function is effectively matching is:
 *
 *     %r"([^\\s\'\":;]+)\\s*:\\s*(\"(?:\\\\.|[^\"])*\"|[^\"\\s;]+)[\\s;]*"
 *
 * It returns true if it consumes the entire comment. Otherwise it returns
 * false.
 */
function parser_lex_magic_comment(parser, semantic_token_seen) {
    let result = true;

    let start = parser.current.start + 1;
    let end = parser.current.end;
    if (end - start <= 7) return false;

    let cursor;
    let indicator = false;

    if ((cursor = parser_lex_magic_comment_emacs_marker(parser, start, end)) !== -1) {
        start = cursor + 3;

        if ((cursor = parser_lex_magic_comment_emacs_marker(parser, start, end)) !== -1) {
            end = cursor;
            indicator = true;
        } else {
            // If we have a start marker but not an end marker, then we cannot
            // have a magic comment.
            return false;
        }
    }

    cursor = start;
    while (cursor < end) {
        while (cursor < end) {
            const c = parser.source.charCodeAt(cursor) || 0;
            if (!(pm_char_is_magic_comment_key_delimiter(c) || pm_char_is_whitespace(c))) break;
            cursor++;
        }

        const key_start = cursor;
        while (cursor < end) {
            const c = parser.source.charCodeAt(cursor) || 0;
            if (pm_char_is_magic_comment_key_delimiter(c) || pm_char_is_whitespace(c)) break;
            cursor++;
        }

        const key_end = cursor;
        while (cursor < end && pm_char_is_whitespace((parser.source.charCodeAt(cursor) || 0))) cursor++;
        if (cursor === end) break;

        if (parser.source[cursor] === ':') {
            cursor++;
        } else {
            if (!indicator) return false;
            continue;
        }

        while (cursor < end && pm_char_is_whitespace((parser.source.charCodeAt(cursor) || 0))) cursor++;
        if (cursor === end) break;

        let value_start;
        let value_end;

        if (parser.source[cursor] === '"') {
            value_start = ++cursor;
            for (; cursor < end && (parser.source.charCodeAt(cursor) || 0) !== 34; cursor++) {
                if (parser.source[cursor] === '\\' && (cursor + 1 < end)) cursor++;
            }
            value_end = cursor;
            if (cursor < end && (parser.source.charCodeAt(cursor) || 0) === 34) cursor++;
        } else {
            value_start = cursor;
            while (cursor < end) {
                const c = parser.source.charCodeAt(cursor) || 0;
                if (c === 34 || parser.source[cursor] === ';' || pm_char_is_whitespace(c)) break;
                cursor++;
            }
            value_end = cursor;
        }

        if (indicator) {
            while (cursor < end && (parser.source[cursor] === ';' || pm_char_is_whitespace((parser.source.charCodeAt(cursor) || 0)))) cursor++;
        } else {
            while (cursor < end && pm_char_is_whitespace((parser.source.charCodeAt(cursor) || 0))) cursor++;
            if (cursor !== end) return false;
        }

        // Here, we need to do some processing on the key to swap out dashes for
        // underscores. We only need to do this if there _is_ a dash in the key.
        const key_length = key_end - key_start;
        // C replaces every '-' with '_' in place; strings are immutable here,
        // so do it with a replacement pass.
        const key = parser.source.slice(key_start, key_end).replace(/-/g, "_");

        // Finally, we can start checking the key against the list of known
        // magic comment keys, and potentially change state based on that.
        const key_source = (key || "");
        const value_length = value_end - value_start;

        // We only want to attempt to compare against encoding comments if it's
        // the first line in the file (or the second in the case of a shebang).
        if (parser.current.start === parser.encoding_comment_start && !parser.encoding_locked) {
            if (
                (key_length === 8 && (key_source.toLowerCase() === MAGIC_COMMENT_ENCODING_BYTES)) ||
                (key_length === 6 && (key_source.toLowerCase() === MAGIC_COMMENT_CODING_BYTES))
            ) {
                result = parser_lex_magic_comment_encoding_value(parser, value_start, value_end);
            }
        }

        if (key_length === 11) {
            if ((key_source.toLowerCase() === MAGIC_COMMENT_WARN_INDENT_BYTES)) {
                switch (parser_lex_magic_comment_boolean_value(parser.source, value_start, value_length)) {
                    case PM_MAGIC_COMMENT_BOOLEAN_VALUE_INVALID:
                        PM_PARSER_WARN_TOKEN_FORMAT(
                            parser,
                            parser.current,
                            PM_WARN_INVALID_MAGIC_COMMENT_VALUE,
                            key_length,
                            key_source,
                            value_length,
                            parser.source.slice(value_start, value_end)
                        );
                        break;
                    case PM_MAGIC_COMMENT_BOOLEAN_VALUE_FALSE:
                        parser.warn_mismatched_indentation = false;
                        break;
                    case PM_MAGIC_COMMENT_BOOLEAN_VALUE_TRUE:
                        parser.warn_mismatched_indentation = true;
                        break;
                }
            }
        } else if (key_length === 21) {
            if ((key_source.toLowerCase() === MAGIC_COMMENT_FROZEN_STRING_LITERAL_BYTES)) {
                // We only want to handle frozen string literal comments if it's
                // before any semantic tokens have been seen.
                if (semantic_token_seen) {
                    pm_parser_warn_token(parser, parser.current, PM_WARN_IGNORED_FROZEN_STRING_LITERAL);
                } else {
                    switch (parser_lex_magic_comment_boolean_value(parser.source, value_start, value_length)) {
                        case PM_MAGIC_COMMENT_BOOLEAN_VALUE_INVALID:
                            PM_PARSER_WARN_TOKEN_FORMAT(
                                parser,
                                parser.current,
                                PM_WARN_INVALID_MAGIC_COMMENT_VALUE,
                                key_length,
                                key_source,
                                value_length,
                                parser.source.slice(value_start, value_end)
                            );
                            break;
                        case PM_MAGIC_COMMENT_BOOLEAN_VALUE_FALSE:
                            parser.frozen_string_literal = PM_OPTIONS_FROZEN_STRING_LITERAL_DISABLED;
                            break;
                        case PM_MAGIC_COMMENT_BOOLEAN_VALUE_TRUE:
                            parser.frozen_string_literal = PM_OPTIONS_FROZEN_STRING_LITERAL_ENABLED;
                            break;
                    }
                }
            }
        } else if (key_length === 24) {
            if ((key_source.toLowerCase() === MAGIC_COMMENT_SHAREABLE_CONSTANT_VALUE_BYTES)) {
                {
                    let cursor = parser.current.start;
                    while ((cursor > parser.start) && ((parser.source[cursor - 1] === ' ') || (parser.source[cursor - 1] === '\t'))) cursor--;

                    if (!((cursor === parser.start) || (parser.source[cursor - 1] === '\n'))) {
                        pm_parser_warn_token(parser, parser.current, PM_WARN_SHAREABLE_CONSTANT_VALUE_LINE);
                    } else if (value_length === 4 && (parser.source.slice(value_start, value_start + 4).toLowerCase() === MAGIC_COMMENT_NONE_BYTES)) {
                        pm_parser_scope_shareable_constant_set(parser, PM_SCOPE_SHAREABLE_CONSTANT_NONE);
                    } else if (value_length === 7 && (parser.source.slice(value_start, value_start + 7).toLowerCase() === MAGIC_COMMENT_LITERAL_BYTES)) {
                        pm_parser_scope_shareable_constant_set(parser, PM_SCOPE_SHAREABLE_CONSTANT_LITERAL);
                    } else if (value_length === 23 && (parser.source.slice(value_start, value_start + 23).toLowerCase() === MAGIC_COMMENT_EXPERIMENTAL_EVERYTHING_BYTES)) {
                        pm_parser_scope_shareable_constant_set(parser, PM_SCOPE_SHAREABLE_CONSTANT_EXPERIMENTAL_EVERYTHING);
                    } else if (value_length === 17 && (parser.source.slice(value_start, value_start + 17).toLowerCase() === MAGIC_COMMENT_EXPERIMENTAL_COPY_BYTES)) {
                        pm_parser_scope_shareable_constant_set(parser, PM_SCOPE_SHAREABLE_CONSTANT_EXPERIMENTAL_COPY);
                    } else {
                        PM_PARSER_WARN_TOKEN_FORMAT(
                            parser,
                            parser.current,
                            PM_WARN_INVALID_MAGIC_COMMENT_VALUE,
                            key_length,
                            key_source,
                            value_length,
                            parser.source.slice(value_start, value_end)
                        );
                    }
                }
            }
        }

        // When we're done, we want to free the string in case we had to
        // allocate memory for it.

        // Allocate a new magic comment node to append to the parser's list.
        const magic_comment = {
            key_start: key_start,
            value_start: value_start,
            key_length: key_length,
            value_length: value_length
        };
        parser.magic_comment_list.push(magic_comment);
    }

    return result;
}

/******************************************************************************/
/* Context manipulations                                                      */
/******************************************************************************/

// The token types that can terminate each parse context. (C packs the
// token types into a uint32 bitset with a `type < 32` guard; every
// terminator token is < 32, so a Set per context is exactly equivalent.)
const context_terminators = [];
context_terminators[PM_CONTEXT_NONE] = new Set();
context_terminators[PM_CONTEXT_BEGIN] = new Set([PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_BEGIN_ENSURE] = new Set([PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_BEGIN_ELSE] = new Set([PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_BEGIN_RESCUE] = new Set([PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_BLOCK_BRACES] = new Set([PM_TOKEN_BRACE_RIGHT]);
context_terminators[PM_CONTEXT_BLOCK_KEYWORDS] = new Set([PM_TOKEN_KEYWORD_END, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ENSURE]);
context_terminators[PM_CONTEXT_BLOCK_ENSURE] = new Set([PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_BLOCK_ELSE] = new Set([PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_BLOCK_PARAMETERS] = new Set([PM_TOKEN_PIPE]);
context_terminators[PM_CONTEXT_BLOCK_RESCUE] = new Set([PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_CASE_WHEN] = new Set([PM_TOKEN_KEYWORD_WHEN, PM_TOKEN_KEYWORD_END, PM_TOKEN_KEYWORD_ELSE]);
context_terminators[PM_CONTEXT_CASE_IN] = new Set([PM_TOKEN_KEYWORD_IN, PM_TOKEN_KEYWORD_END, PM_TOKEN_KEYWORD_ELSE]);
context_terminators[PM_CONTEXT_CLASS] = new Set([PM_TOKEN_KEYWORD_END, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ENSURE]);
context_terminators[PM_CONTEXT_CLASS_ENSURE] = new Set([PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_CLASS_ELSE] = new Set([PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_CLASS_RESCUE] = new Set([PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_DEF] = new Set([PM_TOKEN_KEYWORD_END, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ENSURE]);
context_terminators[PM_CONTEXT_DEF_ENSURE] = new Set([PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_DEF_ELSE] = new Set([PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_DEF_RESCUE] = new Set([PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_DEF_PARAMS] = new Set([PM_TOKEN_EOF]);
context_terminators[PM_CONTEXT_DEFINED] = new Set([PM_TOKEN_EOF]);
context_terminators[PM_CONTEXT_DEFAULT_PARAMS] = new Set([PM_TOKEN_COMMA, PM_TOKEN_PARENTHESIS_RIGHT]);
context_terminators[PM_CONTEXT_ELSE] = new Set([PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_ELSIF] = new Set([PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_KEYWORD_ELSIF, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_EMBEXPR] = new Set([PM_TOKEN_EMBEXPR_END]);
context_terminators[PM_CONTEXT_FOR] = new Set([PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_FOR_INDEX] = new Set([PM_TOKEN_KEYWORD_IN]);
context_terminators[PM_CONTEXT_IF] = new Set([PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_KEYWORD_ELSIF, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_LAMBDA_BRACES] = new Set([PM_TOKEN_BRACE_RIGHT]);
context_terminators[PM_CONTEXT_LAMBDA_DO_END] = new Set([PM_TOKEN_KEYWORD_END, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ENSURE]);
context_terminators[PM_CONTEXT_LAMBDA_ENSURE] = new Set([PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_LAMBDA_ELSE] = new Set([PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_LAMBDA_RESCUE] = new Set([PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_LOOP_PREDICATE] = new Set([PM_TOKEN_KEYWORD_DO, PM_TOKEN_KEYWORD_THEN]);
context_terminators[PM_CONTEXT_MAIN] = new Set([PM_TOKEN_EOF]);
context_terminators[PM_CONTEXT_MODULE] = new Set([PM_TOKEN_KEYWORD_END, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ENSURE]);
context_terminators[PM_CONTEXT_MODULE_ENSURE] = new Set([PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_MODULE_ELSE] = new Set([PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_MODULE_RESCUE] = new Set([PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_MULTI_TARGET] = new Set([PM_TOKEN_EOF]);
context_terminators[PM_CONTEXT_PARENS] = new Set([PM_TOKEN_PARENTHESIS_RIGHT]);
context_terminators[PM_CONTEXT_POSTEXE] = new Set([PM_TOKEN_BRACE_RIGHT]);
context_terminators[PM_CONTEXT_PREDICATE] = new Set([PM_TOKEN_KEYWORD_THEN, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON]);
context_terminators[PM_CONTEXT_PREEXE] = new Set([PM_TOKEN_BRACE_RIGHT]);
context_terminators[PM_CONTEXT_RESCUE_MODIFIER] = new Set([PM_TOKEN_EOF]);
context_terminators[PM_CONTEXT_SCLASS] = new Set([PM_TOKEN_KEYWORD_END, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ENSURE]);
context_terminators[PM_CONTEXT_SCLASS_ENSURE] = new Set([PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_SCLASS_ELSE] = new Set([PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_SCLASS_RESCUE] = new Set([PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_TERNARY] = new Set([PM_TOKEN_EOF]);
context_terminators[PM_CONTEXT_UNLESS] = new Set([PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_UNTIL] = new Set([PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_WHILE] = new Set([PM_TOKEN_KEYWORD_END]);

function context_terminator(context, token) {
    return context_terminators[context].has(token.type);
}

/**
 * Returns the context that the given token is found to be terminating, or
 * returns PM_CONTEXT_NONE.
 */
function context_recoverable(parser, token) {
    let context_node = parser.current_context;

    while (context_node !== null) {
        if (context_terminator(context_node.context, token)) return context_node.context;
        context_node = context_node.prev;
    }

    return PM_CONTEXT_NONE;
}

function context_push(parser, context) {
    const context_node = { context: context, prev: null };

    if (parser.current_context === null) {
        parser.current_context = context_node;
    } else {
        context_node.prev = parser.current_context;
        parser.current_context = context_node;
    }
}

function context_pop(parser) {
    const prev = parser.current_context.prev;
    parser.current_context = prev;
}

function context_p(parser, context) {
    let context_node = parser.current_context;

    while (context_node !== null) {
        if (context_node.context === context) return true;
        context_node = context_node.prev;
    }

    return false;
}

function context_def_p(parser) {
    let context_node = parser.current_context;

    while (context_node !== null) {
        switch (context_node.context) {
            case PM_CONTEXT_DEF:
            case PM_CONTEXT_DEF_PARAMS:
            case PM_CONTEXT_DEF_ENSURE:
            case PM_CONTEXT_DEF_RESCUE:
            case PM_CONTEXT_DEF_ELSE:
                return true;
            case PM_CONTEXT_CLASS:
            case PM_CONTEXT_CLASS_ENSURE:
            case PM_CONTEXT_CLASS_RESCUE:
            case PM_CONTEXT_CLASS_ELSE:
            case PM_CONTEXT_MODULE:
            case PM_CONTEXT_MODULE_ENSURE:
            case PM_CONTEXT_MODULE_RESCUE:
            case PM_CONTEXT_MODULE_ELSE:
            case PM_CONTEXT_SCLASS:
            case PM_CONTEXT_SCLASS_ENSURE:
            case PM_CONTEXT_SCLASS_RESCUE:
            case PM_CONTEXT_SCLASS_ELSE:
                return false;
            default:
                context_node = context_node.prev;
        }
    }

    return false;
}

/**
 * Returns a human readable string for the given context, used in error
 * messages.
 */
function context_human(context) {
    switch (context) {
        case PM_CONTEXT_NONE:
            // assert(false && "unreachable");
            return "";
        case PM_CONTEXT_BEGIN: return "begin statement";
        case PM_CONTEXT_BLOCK_BRACES: return "'{'..'}' block";
        case PM_CONTEXT_BLOCK_KEYWORDS: return "'do'..'end' block";
        case PM_CONTEXT_BLOCK_PARAMETERS: return "'|'..'|' block parameter";
        case PM_CONTEXT_CASE_WHEN: return "'when' clause";
        case PM_CONTEXT_CASE_IN: return "'in' clause";
        case PM_CONTEXT_CLASS: return "class definition";
        case PM_CONTEXT_DEF: return "method definition";
        case PM_CONTEXT_DEF_PARAMS: return "method parameters";
        case PM_CONTEXT_DEFAULT_PARAMS: return "parameter default value";
        case PM_CONTEXT_DEFINED: return "'defined?' expression";
        case PM_CONTEXT_ELSE:
        case PM_CONTEXT_BEGIN_ELSE:
        case PM_CONTEXT_BLOCK_ELSE:
        case PM_CONTEXT_CLASS_ELSE:
        case PM_CONTEXT_DEF_ELSE:
        case PM_CONTEXT_LAMBDA_ELSE:
        case PM_CONTEXT_MODULE_ELSE:
        case PM_CONTEXT_SCLASS_ELSE: return "'else' clause";
        case PM_CONTEXT_ELSIF: return "'elsif' clause";
        case PM_CONTEXT_EMBEXPR: return "embedded expression";
        case PM_CONTEXT_BEGIN_ENSURE:
        case PM_CONTEXT_BLOCK_ENSURE:
        case PM_CONTEXT_CLASS_ENSURE:
        case PM_CONTEXT_DEF_ENSURE:
        case PM_CONTEXT_LAMBDA_ENSURE:
        case PM_CONTEXT_MODULE_ENSURE:
        case PM_CONTEXT_SCLASS_ENSURE: return "'ensure' clause";
        case PM_CONTEXT_FOR: return "for loop";
        case PM_CONTEXT_FOR_INDEX: return "for loop index";
        case PM_CONTEXT_IF: return "if statement";
        case PM_CONTEXT_LAMBDA_BRACES: return "'{'..'}' lambda block";
        case PM_CONTEXT_LAMBDA_DO_END: return "'do'..'end' lambda block";
        case PM_CONTEXT_LOOP_PREDICATE: return "loop predicate";
        case PM_CONTEXT_MAIN: return "top level context";
        case PM_CONTEXT_MODULE: return "module definition";
        case PM_CONTEXT_MULTI_TARGET: return "multiple targets";
        case PM_CONTEXT_PARENS: return "parentheses";
        case PM_CONTEXT_POSTEXE: return "'END' block";
        case PM_CONTEXT_PREDICATE: return "predicate";
        case PM_CONTEXT_PREEXE: return "'BEGIN' block";
        case PM_CONTEXT_BEGIN_RESCUE:
        case PM_CONTEXT_BLOCK_RESCUE:
        case PM_CONTEXT_CLASS_RESCUE:
        case PM_CONTEXT_DEF_RESCUE:
        case PM_CONTEXT_LAMBDA_RESCUE:
        case PM_CONTEXT_MODULE_RESCUE:
        case PM_CONTEXT_RESCUE_MODIFIER:
        case PM_CONTEXT_SCLASS_RESCUE: return "'rescue' clause";
        case PM_CONTEXT_SCLASS: return "singleton class definition";
        case PM_CONTEXT_TERNARY: return "ternary expression";
        case PM_CONTEXT_UNLESS: return "unless statement";
        case PM_CONTEXT_UNTIL: return "until statement";
        case PM_CONTEXT_WHILE: return "while statement";
    }

    // assert(false && "unreachable");
    return "";
}

/******************************************************************************/
/* Specific token lexers                                                      */
/******************************************************************************/

function pm_strspn_number_validate(parser, string, length, invalid) {
    if (invalid !== null) {
        const diag_id = (invalid === string + length - 1) ? PM_ERR_INVALID_NUMBER_UNDERSCORE_TRAILING : PM_ERR_INVALID_NUMBER_UNDERSCORE_INNER;
        pm_parser_err(parser, invalid, invalid + 1, diag_id);
    }
}

function pm_strspn_binary_number_validate(parser, string) {
    const { size, invalid } = pm_strspn_binary_number(parser.source, string, parser.end - string);
    pm_strspn_number_validate(parser, string, size, invalid);
    return size;
}

function pm_strspn_octal_number_validate(parser, string) {
    const { size, invalid } = pm_strspn_octal_number(parser.source, string, parser.end - string);
    pm_strspn_number_validate(parser, string, size, invalid);
    return size;
}

function pm_strspn_decimal_number_validate(parser, string) {
    const { size, invalid } = pm_strspn_decimal_number(parser.source, string, parser.end - string);
    pm_strspn_number_validate(parser, string, size, invalid);
    return size;
}

function pm_strspn_hexadecimal_number_validate(parser, string) {
    const { size, invalid } = pm_strspn_hexadecimal_number(parser.source, string, parser.end - string);
    pm_strspn_number_validate(parser, string, size, invalid);
    return size;
}

function lex_optional_float_suffix(parser) {
    let type = PM_TOKEN_INTEGER;
    let seen_e = false;

    // Here we're going to attempt to parse the optional decimal portion of a
    // float. If it's not there, then it's okay and we'll just continue on.
    if (peek(parser) === 46 /* '.' */) {
        if (pm_char_is_decimal_digit(peek_offset(parser, 1))) {
            parser.current.end += 2;
            parser.current.end += pm_strspn_decimal_number_validate(parser, parser.current.end);
            type = PM_TOKEN_FLOAT;
        } else {
            // If we had a . and then something else, then it's not a float
            // suffix on a number it's a method call or something else.
            return { type, seen_e };
        }
    }

    // Here we're going to attempt to parse the optional exponent portion of a
    // float. If it's not there, it's okay and we'll just continue on.
    if ((peek(parser) === 101 /* 'e' */) || (peek(parser) === 69 /* 'E' */)) {
        if ((peek_offset(parser, 1) === 43 /* '+' */) || (peek_offset(parser, 1) === 45 /* '-' */)) {
            parser.current.end += 2;

            if (pm_char_is_decimal_digit(peek(parser))) {
                parser.current.end++;
                parser.current.end += pm_strspn_decimal_number_validate(parser, parser.current.end);
            } else {
                pm_parser_err_current(parser, PM_ERR_INVALID_FLOAT_EXPONENT);
            }
        } else if (pm_char_is_decimal_digit(peek_offset(parser, 1))) {
            parser.current.end++;
            parser.current.end += pm_strspn_decimal_number_validate(parser, parser.current.end);
        } else {
            return { type, seen_e };
        }

        seen_e = true;
        type = PM_TOKEN_FLOAT;
    }

    return { type, seen_e };
}

function lex_numeric_prefix(parser) {
    let type = PM_TOKEN_INTEGER;
    let seen_e = false;

    if (peek_offset(parser, -1) === 48 /* '0' */) {
        switch ((parser.source.charCodeAt(parser.current.end) || 0)) {
            // 0d1111 is a decimal number
            case 100: // 'd'
            case 68: // 'D'
                parser.current.end++;
                if (pm_char_is_decimal_digit(peek(parser))) {
                    parser.current.end += pm_strspn_decimal_number_validate(parser, parser.current.end);
                } else {
                    match(parser, 95 /* '_' */);
                    pm_parser_err_current(parser, PM_ERR_INVALID_NUMBER_DECIMAL);
                }

                break;

            // 0b1111 is a binary number
            case 98: // 'b'
            case 66: // 'B'
                parser.current.end++;
                if (pm_char_is_binary_digit(peek(parser))) {
                    parser.current.end += pm_strspn_binary_number_validate(parser, parser.current.end);
                } else {
                    match(parser, 95 /* '_' */);
                    pm_parser_err_current(parser, PM_ERR_INVALID_NUMBER_BINARY);
                }

                parser.integer_base = PM_INTEGER_BASE_FLAGS_BINARY;
                break;

            // 0o1111 is an octal number
            case 111: // 'o'
            case 79: // 'O'
                parser.current.end++;
                if (pm_char_is_octal_digit(peek(parser))) {
                    parser.current.end += pm_strspn_octal_number_validate(parser, parser.current.end);
                } else {
                    match(parser, 95 /* '_' */);
                    pm_parser_err_current(parser, PM_ERR_INVALID_NUMBER_OCTAL);
                }

                parser.integer_base = PM_INTEGER_BASE_FLAGS_OCTAL;
                break;

            // 01111 is an octal number
            case 95: // '_'
            case 48: // '0'
            case 49: // '1'
            case 50: // '2'
            case 51: // '3'
            case 52: // '4'
            case 53: // '5'
            case 54: // '6'
            case 55: // '7'
                parser.current.end += pm_strspn_octal_number_validate(parser, parser.current.end);
                parser.integer_base = PM_INTEGER_BASE_FLAGS_OCTAL;
                break;

            // 0x1111 is a hexadecimal number
            case 120: // 'x'
            case 88: // 'X'
                parser.current.end++;
                if (pm_char_is_hexadecimal_digit(peek(parser))) {
                    parser.current.end += pm_strspn_hexadecimal_number_validate(parser, parser.current.end);
                } else {
                    match(parser, 95 /* '_' */);
                    pm_parser_err_current(parser, PM_ERR_INVALID_NUMBER_HEXADECIMAL);
                }

                parser.integer_base = PM_INTEGER_BASE_FLAGS_HEXADECIMAL;
                break;

            // 0.xxx is a float
            case 46 /* '.' */: {
                ({ type, seen_e } = lex_optional_float_suffix(parser));
                break;
            }

            // 0exxx is a float
            case 101: // 'e'
            // 'E':
            case 69: {
                ({ type, seen_e } = lex_optional_float_suffix(parser));
                break;
            }
        }
    } else {
        // If it didn't start with a 0, then we'll lex as far as we can into a
        // decimal number.
        parser.current.end += pm_strspn_decimal_number_validate(parser, parser.current.end);

        // Afterward, we'll lex as far as we can into an optional float suffix.
        ({ type, seen_e } = lex_optional_float_suffix(parser));
    }

    // At this point we have a completed number, but we want to provide the user
    // with a good experience if they put an additional .xxx fractional
    // component on the end, so we'll check for that here.
    if (peek_offset(parser, 0) === 46 /* '.' */ && pm_char_is_decimal_digit(peek_offset(parser, 1))) {
        const fraction_start = parser.current.end;
        let fraction_end = parser.current.end + 2;
        fraction_end += pm_strspn_decimal_digit(parser.source, fraction_end, parser.end - fraction_end);
        pm_parser_err(parser, fraction_start, fraction_end, PM_ERR_INVALID_NUMBER_FRACTION);
    }

    return { type, seen_e };
}

function lex_numeric(parser) {
    let type = PM_TOKEN_INTEGER;
    parser.integer_base = PM_INTEGER_BASE_FLAGS_DECIMAL;

    if (parser.current.end < parser.end) {
        const prefix = lex_numeric_prefix(parser);
        type = prefix.type;
        const seen_e = prefix.seen_e;

        const end = parser.current.end;
        let suffix_type = type;

        if (type === PM_TOKEN_INTEGER) {
            if (match(parser, 114 /* 'r' */)) {
                suffix_type = PM_TOKEN_INTEGER_RATIONAL;

                if (match(parser, 105 /* 'i' */)) {
                    suffix_type = PM_TOKEN_INTEGER_RATIONAL_IMAGINARY;
                }
            } else if (match(parser, 105 /* 'i' */)) {
                suffix_type = PM_TOKEN_INTEGER_IMAGINARY;
            }
        } else {
            if (!seen_e && match(parser, 114 /* 'r' */)) {
                suffix_type = PM_TOKEN_FLOAT_RATIONAL;

                if (match(parser, 105 /* 'i' */)) {
                    suffix_type = PM_TOKEN_FLOAT_RATIONAL_IMAGINARY;
                }
            } else if (match(parser, 105 /* 'i' */)) {
                suffix_type = PM_TOKEN_FLOAT_IMAGINARY;
            }
        }

        const b = peek(parser);
        if (b !== 0 && (b >= 0x80 || ((b >= 97 /* 'a' */ && b <= 122 /* 'z' */) || (b >= 65 /* 'A' */ && b <= 90 /* 'Z' */)) || b === 95 /* '_' */)) {
            parser.current.end = end;
        } else {
            type = suffix_type;
        }
    }

    return type;
}

function lex_global_variable(parser) {
    if (parser.current.end >= parser.end) {
        pm_parser_err_token(parser, parser.current, PM_ERR_GLOBAL_VARIABLE_BARE);
        return PM_TOKEN_GLOBAL_VARIABLE;
    }

    // True if multiple characters are allowed after the declaration of the
    // global variable. Not true when it starts with "$-".
    let allow_multiple = true;

    // Special global variable names: "$~" (match data), "$*" (argv), "$/"
    // (input record separator), and friends. "$&"/"$$"-style reads double as
    // back references outside of a method-name context. (C used two switch
    // arms over character codes.)
    const c = parser.source[parser.current.end];

    if ("~*$?!@/\\;,=.:<>\"".includes(c)) {
        parser.current.end++;
        return PM_TOKEN_GLOBAL_VARIABLE;
    }

    if ("&`'+".includes(c)) {
        parser.current.end++;
        return lex_state_p(parser, PM_LEX_STATE_FNAME) ? PM_TOKEN_GLOBAL_VARIABLE : PM_TOKEN_BACK_REFERENCE;
    }

    {
        if (c === "0") {
            parser.current.end++;
            let width;

            if ((width = char_is_identifier(parser, parser.current.end, parser.end - parser.current.end)) > 0) {
                do {
                    parser.current.end += width;
                } while ((width = char_is_identifier(parser, parser.current.end, parser.end - parser.current.end)) > 0);

                // $0 isn't allowed to be followed by anything.
                const diag_id = parser.version <= PM_OPTIONS_VERSION_CRUBY_3_3 ? PM_ERR_INVALID_VARIABLE_GLOBAL_3_3 : PM_ERR_INVALID_VARIABLE_GLOBAL;
                PM_PARSER_ERR_TOKEN_FORMAT_CONTENT(parser, parser.current, diag_id);
            }

            return PM_TOKEN_GLOBAL_VARIABLE;
        }

        if (c >= "1" && c <= "9") {
            parser.current.end += pm_strspn_decimal_digit(parser.source, parser.current.end, parser.end - parser.current.end);
            return lex_state_p(parser, PM_LEX_STATE_FNAME) ? PM_TOKEN_GLOBAL_VARIABLE : PM_TOKEN_NUMBERED_REFERENCE;
        }

        // "$-" only allows a single following character; every other
        // unrecognized character takes the generic path. (C: case '-' falls
        // through into the switch's default arm.)
        if (c === "-") {
            parser.current.end++;
            allow_multiple = false;
        }
        {
            let width;

            if ((width = char_is_identifier(parser, parser.current.end, parser.end - parser.current.end)) > 0) {
                do {
                    parser.current.end += width;
                } while (allow_multiple && (width = char_is_identifier(parser, parser.current.end, parser.end - parser.current.end)) > 0);
            } else if (pm_char_is_whitespace(peek(parser))) {
                // If we get here, then we have a $ followed by whitespace,
                // which is not allowed.
                pm_parser_err_token(parser, parser.current, PM_ERR_GLOBAL_VARIABLE_BARE);
            } else {
                // If we get here, then we have a $ followed by something that
                // isn't recognized as a global variable.
                const diag_id = parser.version <= PM_OPTIONS_VERSION_CRUBY_3_3 ? PM_ERR_INVALID_VARIABLE_GLOBAL_3_3 : PM_ERR_INVALID_VARIABLE_GLOBAL;
                const end = parser.current.end + parser.encoding.char_width(parser.source, parser.current.end, parser.end - parser.current.end);
                PM_PARSER_ERR_FORMAT(parser, parser.current.start, end, diag_id, end - parser.current.start, parser.source.slice(parser.current.start, end));
            }

            return PM_TOKEN_GLOBAL_VARIABLE;
        }
    }
}

/**
 * This function checks if the current token matches a keyword. If it does, it
 * returns the token type. Otherwise, it returns PM_TOKEN_EOF. The arguments are as follows:
 *
 * * `parser` - the parser object
 * * `current_start` - offset of the start of the current token
 * * `value` - the literal string that we're checking for
 * * `vlen` - the length of the token
 * * `state` - the state that we should transition to if the token matches
 * * `type` - the expected token type
 * * `modifier_type` - the expected modifier token type
 */
function lex_keyword(parser, current_start, value, state, type, modifier_type) {
    // memcmp(current_start, value, strlen(value)) == 0 (the first character
    // compared first: most identifiers aren't the keyword)
    if (parser.source.charCodeAt(current_start) === value.charCodeAt(0) && parser.source.startsWith(value, current_start)) {
        const last_state = parser.lex_state;

        if (parser.lex_state & PM_LEX_STATE_FNAME) {
            lex_state_set(parser, PM_LEX_STATE_ENDFN);
        } else {
            lex_state_set(parser, state);
            if (state === PM_LEX_STATE_BEG) {
                parser.command_start = true;
            }

            if ((modifier_type !== PM_TOKEN_EOF) && !(last_state & (PM_LEX_STATE_BEG | PM_LEX_STATE_LABELED | PM_LEX_STATE_CLASS))) {
                lex_state_set(parser, PM_LEX_STATE_BEG | PM_LEX_STATE_LABEL);
                return modifier_type;
            }
        }

        return type;
    }

    return PM_TOKEN_EOF;
}

function lex_identifier(parser, previous_command_start) {
    // Lex as far as we can into the current identifier.
    let width;
    const end = parser.end;
    const current_start = parser.current.start;
    let current_end = parser.current.end;

    
        while ((width = char_is_identifier_utf8(parser.source, current_end, end - current_end)) > 0) {
            current_end += width;
        }
    
    parser.current.end = current_end;

    // Now cache the length of the identifier so that we can quickly compare it
    // against known keywords.
    width = current_end - current_start;

    if (current_end < end) {
        if (((current_end + 1 >= end) || (parser.source[current_end + 1] !== '=')) && (match(parser, 33 /* '!' */) || match(parser, 63 /* '?' */))) {
            // First we'll attempt to extend the identifier by a ! or ?. Then we'll
            // check if we're returning the defined? keyword or just an identifier.
            width++;

            if (
                ((lex_state_p(parser, PM_LEX_STATE_LABEL | PM_LEX_STATE_ENDFN) && !previous_command_start) || lex_state_arg_p(parser)) &&
                (peek(parser) === 58 /* ':' */) && (peek_offset(parser, 1) !== 58 /* ':' */)
            ) {
                // If we're in a position where we can accept a : at the end of an
                // identifier, then we'll optionally accept it.
                lex_state_set(parser, PM_LEX_STATE_ARG | PM_LEX_STATE_LABELED);
                match(parser, 58 /* ':' */);
                return PM_TOKEN_LABEL;
            }

            if (parser.lex_state !== PM_LEX_STATE_DOT) {
                if (width === 8 && (lex_keyword(parser, current_start, "defined?", PM_LEX_STATE_ARG, PM_TOKEN_KEYWORD_DEFINED, PM_TOKEN_EOF) !== PM_TOKEN_EOF)) {
                    return PM_TOKEN_KEYWORD_DEFINED;
                }
            }

            return PM_TOKEN_METHOD_NAME;
        }

        if (lex_state_p(parser, PM_LEX_STATE_FNAME) && peek_offset(parser, 1) !== 126 /* '~' */ && peek_offset(parser, 1) !== 62 /* '>' */ && (peek_offset(parser, 1) !== 61 /* '=' */ || peek_offset(parser, 2) === 62 /* '>' */) && match(parser, 61 /* '=' */)) {
            // If we're in a position where we can accept a = at the end of an
            // identifier, then we'll optionally accept it.
            return PM_TOKEN_IDENTIFIER;
        }

        if (
            ((lex_state_p(parser, PM_LEX_STATE_LABEL | PM_LEX_STATE_ENDFN) && !previous_command_start) || lex_state_arg_p(parser)) &&
            peek(parser) === 58 /* ':' */ && peek_offset(parser, 1) !== 58 /* ':' */
        ) {
            // If we're in a position where we can accept a : at the end of an
            // identifier, then we'll optionally accept it.
            lex_state_set(parser, PM_LEX_STATE_ARG | PM_LEX_STATE_LABELED);
            match(parser, 58 /* ':' */);
            return PM_TOKEN_LABEL;
        }
    }

    if (parser.lex_state !== PM_LEX_STATE_DOT) {
        let type;
        switch (width) {
            case 2:
                if (lex_keyword(parser, current_start, "do", PM_LEX_STATE_BEG, PM_TOKEN_KEYWORD_DO, PM_TOKEN_EOF) !== PM_TOKEN_EOF) {
                    if (pm_do_loop_stack_p(parser)) {
                        return PM_TOKEN_KEYWORD_DO_LOOP;
                    }
                    return PM_TOKEN_KEYWORD_DO;
                }

                if ((type = lex_keyword(parser, current_start, "if", PM_LEX_STATE_BEG, PM_TOKEN_KEYWORD_IF, PM_TOKEN_KEYWORD_IF_MODIFIER)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "in", PM_LEX_STATE_BEG, PM_TOKEN_KEYWORD_IN, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "or", PM_LEX_STATE_BEG, PM_TOKEN_KEYWORD_OR, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                break;
            case 3:
                if ((type = lex_keyword(parser, current_start, "and", PM_LEX_STATE_BEG, PM_TOKEN_KEYWORD_AND, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "def", PM_LEX_STATE_FNAME, PM_TOKEN_KEYWORD_DEF, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "end", PM_LEX_STATE_END, PM_TOKEN_KEYWORD_END, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "END", PM_LEX_STATE_END, PM_TOKEN_KEYWORD_END_UPCASE, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "for", PM_LEX_STATE_BEG, PM_TOKEN_KEYWORD_FOR, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "nil", PM_LEX_STATE_END, PM_TOKEN_KEYWORD_NIL, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "not", PM_LEX_STATE_ARG, PM_TOKEN_KEYWORD_NOT, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                break;
            case 4:
                if ((type = lex_keyword(parser, current_start, "case", PM_LEX_STATE_BEG, PM_TOKEN_KEYWORD_CASE, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "else", PM_LEX_STATE_BEG, PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "next", PM_LEX_STATE_MID, PM_TOKEN_KEYWORD_NEXT, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "redo", PM_LEX_STATE_END, PM_TOKEN_KEYWORD_REDO, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "self", PM_LEX_STATE_END, PM_TOKEN_KEYWORD_SELF, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "then", PM_LEX_STATE_BEG, PM_TOKEN_KEYWORD_THEN, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "true", PM_LEX_STATE_END, PM_TOKEN_KEYWORD_TRUE, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "when", PM_LEX_STATE_BEG, PM_TOKEN_KEYWORD_WHEN, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                break;
            case 5:
                if ((type = lex_keyword(parser, current_start, "alias", PM_LEX_STATE_FNAME | PM_LEX_STATE_FITEM, PM_TOKEN_KEYWORD_ALIAS, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "begin", PM_LEX_STATE_BEG, PM_TOKEN_KEYWORD_BEGIN, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "BEGIN", PM_LEX_STATE_END, PM_TOKEN_KEYWORD_BEGIN_UPCASE, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "break", PM_LEX_STATE_MID, PM_TOKEN_KEYWORD_BREAK, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "class", PM_LEX_STATE_CLASS, PM_TOKEN_KEYWORD_CLASS, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "elsif", PM_LEX_STATE_BEG, PM_TOKEN_KEYWORD_ELSIF, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "false", PM_LEX_STATE_END, PM_TOKEN_KEYWORD_FALSE, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "retry", PM_LEX_STATE_END, PM_TOKEN_KEYWORD_RETRY, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "super", PM_LEX_STATE_ARG, PM_TOKEN_KEYWORD_SUPER, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "undef", PM_LEX_STATE_FNAME | PM_LEX_STATE_FITEM, PM_TOKEN_KEYWORD_UNDEF, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "until", PM_LEX_STATE_BEG, PM_TOKEN_KEYWORD_UNTIL, PM_TOKEN_KEYWORD_UNTIL_MODIFIER)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "while", PM_LEX_STATE_BEG, PM_TOKEN_KEYWORD_WHILE, PM_TOKEN_KEYWORD_WHILE_MODIFIER)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "yield", PM_LEX_STATE_ARG, PM_TOKEN_KEYWORD_YIELD, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                break;
            case 6:
                if ((type = lex_keyword(parser, current_start, "ensure", PM_LEX_STATE_BEG, PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "module", PM_LEX_STATE_BEG, PM_TOKEN_KEYWORD_MODULE, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "rescue", PM_LEX_STATE_MID, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_RESCUE_MODIFIER)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "return", PM_LEX_STATE_MID, PM_TOKEN_KEYWORD_RETURN, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "unless", PM_LEX_STATE_BEG, PM_TOKEN_KEYWORD_UNLESS, PM_TOKEN_KEYWORD_UNLESS_MODIFIER)) !== PM_TOKEN_EOF) return type;
                break;
            case 8:
                if ((type = lex_keyword(parser, current_start, "__LINE__", PM_LEX_STATE_END, PM_TOKEN_KEYWORD___LINE__, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "__FILE__", PM_LEX_STATE_END, PM_TOKEN_KEYWORD___FILE__, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                break;
            case 12:
                if ((type = lex_keyword(parser, current_start, "__ENCODING__", PM_LEX_STATE_END, PM_TOKEN_KEYWORD___ENCODING__, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                break;
        }
    }

    
    return pm_encoding_utf_8_isupper_char(parser.source, current_start, end - current_start) ? PM_TOKEN_CONSTANT : PM_TOKEN_IDENTIFIER;
}

/**
 * Returns true if the current token that the parser is considering is at the
 * beginning of a line or the beginning of the source.
 */
function current_token_starts_line(parser) {
    return (parser.current.start === parser.start) || (parser.source[parser.current.start - 1] === '\n');
}

/**
 * When we hit a # while lexing something like a string, we need to potentially
 * handle interpolation. This function performs that check. It returns a token
 * type representing what it found. Those cases are:
 *
 * * PM_TOKEN_NOT_PROVIDED - No interpolation was found at this point. The
 *     caller should keep lexing.
 * * PM_TOKEN_STRING_CONTENT - No interpolation was found at this point. The
 *     caller should return this token type.
 * * PM_TOKEN_EMBEXPR_BEGIN - An embedded expression was found. The caller
 *     should return this token type.
 * * PM_TOKEN_EMBVAR - An embedded variable was found. The caller should return
 *     this token type.
 */
function lex_interpolation(parser, pound) {
    // If there is no content following this #, then we're at the end of
    // the string and we can safely return string content.
    if (pound + 1 >= parser.end) {
        parser.current.end = pound + 1;
        return PM_TOKEN_STRING_CONTENT;
    }

    // Now we'll check against the character that follows the #. If it constitutes
    // valid interplation, we'll handle that, otherwise we'll return
    // PM_TOKEN_NOT_PROVIDED.
    switch ((parser.source.charCodeAt(pound + 1) || 0)) {
        case 64 /* '@' */: {
            // In this case we may have hit an embedded instance or class variable.
            if (pound + 2 >= parser.end) {
                parser.current.end = pound + 1;
                return PM_TOKEN_STRING_CONTENT;
            }

            // If we're looking at a @ and there's another @, then we'll skip past the
            // second @.
            let variable = pound + 2;
            if (parser.source[variable] === '@' && pound + 3 < parser.end) variable++;

            if (char_is_identifier_start(parser, variable, parser.end - variable)) {
                // At this point we're sure that we've either hit an embedded instance
                // or class variable. In this case we'll first need to check if we've
                // already consumed content.
                if (pound > parser.current.start) {
                    parser.current.end = pound;
                    return PM_TOKEN_STRING_CONTENT;
                }

                // Otherwise we need to return the embedded variable token
                // and then switch to the embedded variable lex mode.
                lex_mode_push(parser, { mode: PM_LEX_EMBVAR, as: null, prev: null });
                parser.current.end = pound + 1;
                return PM_TOKEN_EMBVAR;
            }

            // If we didn't get a valid interpolation, then this is just regular
            // string content. This is like if we get "#@-". In this case the caller
            // should keep lexing.
            parser.current.end = pound + 1;
            return PM_TOKEN_NOT_PROVIDED;
        }
        case 36 /* '$' */:
            // In this case we may have hit an embedded global variable. If there's
            // not enough room, then we'll just return string content.
            if (pound + 2 >= parser.end) {
                parser.current.end = pound + 1;
                return PM_TOKEN_STRING_CONTENT;
            }

            // This is the character that we're going to check to see if it is the
            // start of an identifier that would indicate that this is a global
            // variable.
            let check = pound + 2;

            if (parser.source[pound + 2] === '-') {
                if (pound + 3 >= parser.end) {
                    parser.current.end = pound + 2;
                    return PM_TOKEN_STRING_CONTENT;
                }

                check++;
            }

            // If the character that we're going to check is the start of an
            // identifier, or we don't have a - and the character is a decimal number
            // or a global name punctuation character, then we've hit an embedded
            // global variable.
            if (
                char_is_identifier_start(parser, check, parser.end - check) ||
                (parser.source[pound + 2] !== '-' && (pm_char_is_decimal_digit((parser.source.charCodeAt(pound + 2) || 0)) || char_is_global_name_punctuation((parser.source.charCodeAt(pound + 2) || 0))))
            ) {
                // In this case we've hit an embedded global variable. First check to
                // see if we've already consumed content. If we have, then we need to
                // return that content as string content first.
                if (pound > parser.current.start) {
                    parser.current.end = pound;
                    return PM_TOKEN_STRING_CONTENT;
                }

                // Otherwise, we need to return the embedded variable token and switch
                // to the embedded variable lex mode.
                lex_mode_push(parser, { mode: PM_LEX_EMBVAR, as: null, prev: null });
                parser.current.end = pound + 1;
                return PM_TOKEN_EMBVAR;
            }

            // In this case we've hit a #$ that does not indicate a global variable.
            // In this case we'll continue lexing past it.
            parser.current.end = pound + 1;
            return PM_TOKEN_NOT_PROVIDED;
        case 123 /* '{' */:
            // In this case it's the start of an embedded expression. If we have
            // already consumed content, then we need to return that content as string
            // content first.
            if (pound > parser.current.start) {
                parser.current.end = pound;
                return PM_TOKEN_STRING_CONTENT;
            }

            parser.enclosure_nesting++;

            // Otherwise we'll skip past the #{ and begin lexing the embedded
            // expression.
            lex_mode_push(parser, { mode: PM_LEX_EMBEXPR, as: null, prev: null });
            parser.current.end = pound + 2;
            parser.command_start = true;
            pm_do_loop_stack_push(parser, false);
            return PM_TOKEN_EMBEXPR_BEGIN;
        default:
            // In this case we've hit a # that doesn't constitute interpolation. We'll
            // mark that by returning the not provided token type. This tells the
            // consumer to keep lexing forward.
            parser.current.end = pound + 1;
            return PM_TOKEN_NOT_PROVIDED;
    }
}

const PM_ESCAPE_FLAG_NONE = 0x0;
const PM_ESCAPE_FLAG_CONTROL = 0x1;
const PM_ESCAPE_FLAG_META = 0x2;
const PM_ESCAPE_FLAG_SINGLE = 0x4;
const PM_ESCAPE_FLAG_REGEXP = 0x8;

/**
 * This is a lookup table for whether or not an ASCII character is printable.
 */
const ascii_printable_chars = [
    false, false, false, false, false, false, false, false, false, true, true, true, true, true, false, false,
    false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false,
    true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true,
    true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true,
    true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true,
    true, true, true, true, true, true, true, true, true, true, true, true, false, true, true, true,
    true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true,
    true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, false
];

function char_is_ascii_printable(b) {
    return (b < 0x80) && ascii_printable_chars[b];
}

/**
 * Return the value that a hexadecimal digit character represents. For example,
 * transform 'a' into 10, 'b' into 11, etc.
 */
function escape_hexadecimal_digit(value) {
    return (value <= 57 /* '9' */) ? (value - 48 /* '0' */) : ((value & 0x7) + 9);
}

/**
 * Scan the 4 digits of a Unicode escape into the value. Returns the number of
 * digits scanned. This function assumes that the characters have already been
 * validated. (`string` is a numeric offset into parser.source.)
 */
function escape_unicode(parser, string, length, error_location) {
    let value = 0;
    for (let index = 0; index < length; index++) {
        if (index !== 0) value <<= 4;
        value |= escape_hexadecimal_digit((parser.source.charCodeAt(string + index) || 0));
    }

    // Here we're going to verify that the value is actually a valid Unicode
    // codepoint and not a surrogate pair.
    if (value >= 0xD800 && value <= 0xDFFF) {
        if (error_location !== null) {
            pm_parser_err(parser, error_location.start, error_location.end, PM_ERR_ESCAPE_INVALID_UNICODE);
        } else {
            pm_parser_err(parser, string, string + length, PM_ERR_ESCAPE_INVALID_UNICODE);
        }
        return 0xFFFD;
    }

    return value >>> 0;
}

/**
 * Escape a single character value based on the given flags.
 */
function escape_byte(value, flags) {
    if (flags & PM_ESCAPE_FLAG_CONTROL) value &= 0x9f;
    if (flags & PM_ESCAPE_FLAG_META) value |= 0x80;
    return value;
}

/**
 * Write a unicode codepoint to the given buffer.
 */
function escape_write_unicode(parser, buffer, flags, start, end, value) {
    // \u escape sequences in string-like structures implicitly change the
    // encoding to UTF-8 if they are >= 0x80 or if they are used in a character
    // literal.
    if (value >= 0x80 || flags & PM_ESCAPE_FLAG_SINGLE) {
        // A literal already locked to a source encoding other than UTF-8 (by
        // a `\xNN` escape or a non-ASCII character, see pm_strpbrk) can't
        // have a `\u` escape.
        if (parser.explicit_encoding != null && parser.explicit_encoding !== "utf8") {
            PM_PARSER_ERR_FORMAT(parser, start, end, PM_ERR_MIXED_ENCODING, parser.encoding_comment_name);
        }

        // UNI-BUILD: C sets explicit_encoding to &PM_ENCODING_UTF_8_ENTRY
        // here (a `\u` escape implies UTF-8). We store the sentinel "utf8"
        // so parse_unescaped_encoding / parse_symbol_encoding can tell a
        // `\u` escape from a `\xNN` byte escape.
        parser.explicit_encoding = "utf8";
    }

    if (!pm_buffer_append_unicode_codepoint(buffer, value)) {
        pm_parser_err(parser, start, end, PM_ERR_ESCAPE_INVALID_UNICODE);
        // UNI-BUILD: C appends the UTF-8 *bytes* of U+FFFD here, because its
        // buffer is a byte buffer. Ours is a JS string, so appending those
        // three bytes as individual code units (0xEF, 0xBF, 0xBD) would
        // produce three mojibake characters instead of one U+FFFD - append
        // the codepoint itself, as every other replacement-character fallback
        // in this file already does (escape_write_byte_encoded above).
        pm_buffer_append_unicode_codepoint(buffer, 0xfffd);
    }
}

/**
 * When you're writing a byte to the unescape buffer, if the byte is non-ASCII
 * (i.e., the top bit is set) then it locks in the encoding.
 */
function escape_write_byte_encoded(parser, buffer, byte, flags) {
    const regexp_context = (flags & PM_ESCAPE_FLAG_REGEXP) !== 0;

    if (byte >= 0x80) {
        // a `\xNN` escape after a `\u` escape in a source in another
        // encoding than UTF-8
        if (parser.explicit_encoding === "utf8" && parser.source_encoding_family !== "utf8") {
            PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, PM_ERR_MIXED_ENCODING, parser.encoding_comment_name);
        }

        // UNI-BUILD: C sets explicit_encoding to `parser->encoding` here (a
        // `\xNN` byte escape locks the literal to the *source* encoding),
        // in regular expressions too (where it keeps /.../n with escaped
        // non-ASCII bytes from being reported as an encoding mismatch).
        // We store that encoding's family so the flag logic downstream can
        // decide FORCED_UTF8 (source is UTF-8) / FORCED_BINARY (source is
        // US-ASCII) / nothing (source is its own non-ASCII encoding).
        parser.explicit_encoding = parser.source_encoding_family;
    }

    if (!regexp_context && byte >= 0x80) {

        // UNI-BUILD: \xNN / \ONN escapes produce raw "bytes"; when a lead
        // byte starts a valid UTF-8 sequence, consume the following
        // continuation escapes and emit one real code point instead.
        const width = byte >= 0xf0 ? 4 : byte >= 0xe0 ? 3 : byte >= 0xc2 ? 2 : 1;
        if (width === 1) {
            // Lone continuation byte: invalid on its own.
            pm_buffer_append_unicode_codepoint(buffer, 0xfffd);
            return;
        }
        if (width > 1) {
            let pos = parser.current.end;
            const units = [byte];
            while (units.length < width) {
                if ((parser.source.charCodeAt(pos) || 0) !== 92 /* backslash */) break;
                const c1 = (parser.source.charCodeAt(pos + 1) || 0);
                let value = null;
                let next = -1;
                if (c1 === 120 /* x */ || c1 === 88 /* X */) {
                    // Validate the hex digits before decoding: unlike the
                    // reference call sites (escape_read, the named-capture
                    // escaper), escape_hexadecimal_digit never returns -1, so
                    // the old `h1 !== -1` checks were dead and invalid digits
                    // silently became values.
                    const d1 = (parser.source.charCodeAt(pos + 2) || 0);
                    const d2 = (parser.source.charCodeAt(pos + 3) || 0);
                    if (pm_char_is_hexadecimal_digit(d1) && pm_char_is_hexadecimal_digit(d2)) {
                        value = (escape_hexadecimal_digit(d1) << 4) | escape_hexadecimal_digit(d2);
                        next = pos + 4;
                    }
                } else if (c1 >= 48 /* 0 */ && c1 <= 55 /* 7 */) {
                    value = c1 - 48; next = pos + 2;
                    for (let k = 0; k < 2; k++) {
                        const oc = (parser.source.charCodeAt(next) || 0);
                        if (oc >= 48 && oc <= 55) { value = value * 8 + (oc - 48); next++; } else break;
                    }
                }
                if (value === null || (value & 0xc0) !== 0x80) break;
                units.push(value);
                pos = next;
            }
            if (units.length === width) {
                const cp = width === 2
                    ? ((units[0] & 0x1f) << 6) | (units[1] & 0x3f)
                    : width === 3
                        ? ((units[0] & 0x0f) << 12) | ((units[1] & 0x3f) << 6) | (units[2] & 0x3f)
                        : ((units[0] & 0x07) << 18) | ((units[1] & 0x3f) << 12) | ((units[2] & 0x3f) << 6) | (units[3] & 0x3f);
                const min = width === 2 ? 0x80 : width === 3 ? 0x800 : 0x10000;
                if (cp >= min && cp <= 0x10ffff && !(cp >= 0xd800 && cp <= 0xdfff)) {
                    pm_buffer_append_unicode_codepoint(buffer, cp);
                    parser.current.end = pos;
                    return;
                }
            }
            // Invalid lead/sequence: single replacement character, mirroring
            // how decoding the byte build's output behaves.
            pm_buffer_append_unicode_codepoint(buffer, 0xfffd);
            return;
        }
    }

    pm_buffer_append_byte(buffer, byte);
}

/**
 * The regular expression engine doesn't support the same escape sequences as
 * Ruby does. So first we have to read the escape sequence, and then we have to
 * format it like the regular expression engine expects it. For example, in Ruby
 * if we have:
 *
 *     /\M-\C-?/
 *
 * then the first byte is actually 255, so we have to rewrite this as:
 *
 *     /\xFF/
 *
 * Note that in this case there is a literal \ byte in the regular expression
 * source so that the regular expression engine will perform its own unescaping.
 */
function escape_write_byte(parser, buffer, regular_expression_buffer, flags, byte) {
    if (flags & PM_ESCAPE_FLAG_REGEXP) {
        pm_buffer_append_string(regular_expression_buffer, `\\x${Math.trunc(Number(byte)).toString(16).toUpperCase().padStart(2, "0")}`);
    }

    escape_write_byte_encoded(parser, buffer, byte, flags);
}

/**
 * Write each byte of the given escaped character into the buffer.
 */
function escape_write_escape_encoded(parser, buffer, regular_expression_buffer, flags) {
    // UNI-BUILD: C computes a UTF-8 *byte* width here and treats width == 1
    // as "a single ASCII byte, still subject to \C-/\M- processing" and
    // width > 1 as "a complete multibyte character - ignore the backslash
    // and copy it through raw". In this build the source is already a
    // UTF-16 string, so the equivalent split is "ASCII code unit" vs
    // "anything else" (a non-ASCII BMP code unit, or a surrogate pair) -
    // `pm_encoding_utf_8_char_width` returns 1 for a lone `«` here, which
    // used to route it through escape_byte and mangle it to U+FFFD.
    const first = parser.source.charCodeAt(parser.current.end) || 0;

    if (first < 0x80) {
        parser.current.end++;
        escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(first, flags));
        return;
    }

    const width = pm_encoding_utf_8_char_width(parser.source, parser.current.end, parser.end - parser.current.end);
    if (width >= 1) {
        // A complete non-ASCII character: the backslash is a no-op here,
        // so copy the character through raw.
        const b = (flags & PM_ESCAPE_FLAG_REGEXP) ? regular_expression_buffer : buffer;
        pm_buffer_append_bytes(b, parser.source.slice(parser.current.end, parser.current.end + width), width);
        parser.current.end += width;
    } else {
        // Assume the next character wasn't meant to be part of this escape
        // sequence since it is invalid. Add an error and move on.
        parser.current.end++;
        pm_parser_err_current(parser, PM_ERR_ESCAPE_INVALID_CONTROL);
    }
}

/**
 * Warn about using a space or a tab character in an escape, as opposed to using
 * \\s or \\t. Note that we can quite copy the source because the warning
 * message replaces \\c with \\C.
 */
function escape_read_warn(parser, flags, flag, type) {
    const FLAG = (value) => ((value & PM_ESCAPE_FLAG_CONTROL) ? "\\C-" : (value & PM_ESCAPE_FLAG_META) ? "\\M-" : "");

    PM_PARSER_WARN_TOKEN_FORMAT(
        parser,
        parser.current,
        PM_WARN_INVALID_CHARACTER,
        FLAG(flags),
        FLAG(flag),
        type
    );
}

/**
 * Shared body of escape_read's `\cX` and `\C-X` control-escape cases. `\cX`
 * is the short form; `\C-X` requires the literal `-` that `\cX` doesn't -
 * that's the only control-flow difference between them. Once past that,
 * both forms dispatch identically on the following character, with one
 * more small difference preserved via `requires_hyphen`: when that
 * character turns out to be non-printable, `\C-` reports an error range
 * extended by the invalid character's width, while `\c` does not (matching
 * the C original's two separately-written branches exactly).
 */
function escape_read_control(parser, buffer, regular_expression_buffer, flags, requires_hyphen) {
    parser.current.end++;
    if (flags & PM_ESCAPE_FLAG_CONTROL) {
        pm_parser_err_current(parser, PM_ERR_ESCAPE_INVALID_CONTROL_REPEAT);
    }

    if (requires_hyphen) {
        if (peek(parser) !== 45 /* '-' */) {
            const width = parser.encoding.char_width(parser.source, parser.current.end, parser.end - parser.current.end);
            pm_parser_err(parser, parser.current.start, parser.current.end + width, PM_ERR_ESCAPE_INVALID_CONTROL);
            return;
        }
        parser.current.end++;
    }

    if (parser.current.end === parser.end) {
        pm_parser_err_current(parser, PM_ERR_ESCAPE_INVALID_CONTROL);
        return;
    }

    const peeked = peek(parser); // shadowed `peeked` in C
    switch (peeked) {
        case 63 /* '?' */: {
            parser.current.end++;
            escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(0x7f, flags));
            return;
        }
        case 92 /* '\\' */:
            parser.current.end++;

            if (match(parser, 117 /* 'u' */) || match(parser, 85 /* 'U' */)) {
                pm_parser_err(parser, parser.current.start, parser.current.end, PM_ERR_INVALID_ESCAPE_CHARACTER);
                return;
            }

            escape_read(parser, buffer, regular_expression_buffer, flags | PM_ESCAPE_FLAG_CONTROL);
            return;
        case 32 /* ' ' */:
            parser.current.end++;
            escape_read_warn(parser, flags, PM_ESCAPE_FLAG_CONTROL, "\\s");
            escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(peeked, flags | PM_ESCAPE_FLAG_CONTROL));
            return;
        case 9 /* '\t' */:
            parser.current.end++;
            escape_read_warn(parser, flags, 0, "\\t");
            escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(peeked, flags | PM_ESCAPE_FLAG_CONTROL));
            return;
        default: {
            if (!char_is_ascii_printable(peeked)) {
                if (requires_hyphen) {
                    const width = parser.encoding.char_width(parser.source, parser.current.end, parser.end - parser.current.end);
                    pm_parser_err(parser, parser.current.start, parser.current.end + width, PM_ERR_ESCAPE_INVALID_CONTROL);
                } else {
                    pm_parser_err_current(parser, PM_ERR_ESCAPE_INVALID_CONTROL);
                }
                return;
            }

            parser.current.end++;
            escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(peeked, flags | PM_ESCAPE_FLAG_CONTROL));
            return;
        }
    }
}

/**
 * Read the value of an escape into the buffer.
 */
function escape_read(parser, buffer, regular_expression_buffer, flags) {
    const peeked = peek(parser);
    switch (peeked) {
        case 92 /* '\\' */: {
            parser.current.end++;
            escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(92, flags));
            return;
        }
        case 39 /* '\'' */: {
            parser.current.end++;
            escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(39, flags));
            return;
        }
        case 97 /* 'a' */: {
            parser.current.end++;
            escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(7 /* '\a' */, flags));
            return;
        }
        case 98 /* 'b' */: {
            parser.current.end++;
            escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(8 /* '\b' */, flags));
            return;
        }
        case 101 /* 'e' */: {
            parser.current.end++;
            escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(27 /* '\033' */, flags));
            return;
        }
        case 102 /* 'f' */: {
            parser.current.end++;
            escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(12 /* '\f' */, flags));
            return;
        }
        case 110 /* 'n' */: {
            parser.current.end++;
            escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(10 /* '\n' */, flags));
            return;
        }
        case 114 /* 'r' */: {
            parser.current.end++;
            escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(13 /* '\r' */, flags));
            return;
        }
        case 115 /* 's' */: {
            parser.current.end++;
            escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(32 /* ' ' */, flags));
            return;
        }
        case 116 /* 't' */: {
            parser.current.end++;
            escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(9 /* '\t' */, flags));
            return;
        }
        case 118 /* 'v' */: {
            parser.current.end++;
            escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(11 /* '\v' */, flags));
            return;
        }
        case 48: case 49: case 50: case 51: case 52: case 53: case 54: case 55: {
            let value = (parser.source.charCodeAt(parser.current.end) || 0) - 48 /* '0' */;
            parser.current.end++;

            if (pm_char_is_octal_digit(peek(parser))) {
                value = (((value << 3) & 0xff) | ((parser.source.charCodeAt(parser.current.end) || 0) - 48 /* '0' */)); // (uint8_t)(value << 3)
                parser.current.end++;

                if (pm_char_is_octal_digit(peek(parser))) {
                    value = (((value << 3) & 0xff) | ((parser.source.charCodeAt(parser.current.end) || 0) - 48 /* '0' */)); // (uint8_t)(value << 3)
                    parser.current.end++;
                }
            }

            value = escape_byte(value, flags);
            escape_write_byte(parser, buffer, regular_expression_buffer, flags, value);
            return;
        }
        case 120 /* 'x' */: {
            const start = parser.current.end - 1;

            parser.current.end++;
            let byte = peek(parser);

            if (pm_char_is_hexadecimal_digit(byte)) {
                let value = escape_hexadecimal_digit(byte);
                parser.current.end++;

                byte = peek(parser);
                if (pm_char_is_hexadecimal_digit(byte)) {
                    value = (value << 4) | escape_hexadecimal_digit(byte);
                    parser.current.end++;
                }

                value = escape_byte(value, flags);
                if (flags & PM_ESCAPE_FLAG_REGEXP) {
                    if (flags & (PM_ESCAPE_FLAG_CONTROL | PM_ESCAPE_FLAG_META)) {
                        pm_buffer_append_string(regular_expression_buffer, `\\x${Math.trunc(Number(value)).toString(16).toUpperCase().padStart(2, "0")}`);
                    } else {
                        pm_buffer_append_bytes(regular_expression_buffer, parser.source.slice(start, parser.current.end), parser.current.end - start);
                    }
                }

                escape_write_byte_encoded(parser, buffer, value, flags);
            } else {
                pm_parser_err_current(parser, PM_ERR_ESCAPE_INVALID_HEXADECIMAL);
            }

            return;
        }
        case 117 /* 'u' */: {
            const start = parser.current.end - 1;
            parser.current.end++;

            if (parser.current.end === parser.end) {
                const short_start = parser.current.end - 2; // shadowed `start` in C
                PM_PARSER_ERR_FORMAT(parser, short_start, parser.current.end, PM_ERR_ESCAPE_INVALID_UNICODE_SHORT, 2, parser.source.slice(short_start, parser.current.end));
            } else if (peek(parser) === 123 /* '{' */) {
                const unicode_codepoints_start = parser.current.end - 2;
                parser.current.end++;

                while (true) {
                    const whitespace = pm_strspn_inline_whitespace(parser.source, parser.current.end, parser.end - parser.current.end);
                    if (whitespace > 0) {
                        parser.current.end += whitespace;
                    } else if (peek(parser) === 92 /* '\\' */ && peek_offset(parser, 1) === 110 /* 'n' */) {
                        // This is super hacky, but it gets us nicer error
                        // messages because we can still pass it off to the
                        // regular expression engine even if we hit an
                        // unterminated regular expression.
                        parser.current.end += 2;
                    } else {
                        break;
                    }
                }

                let extra_codepoints_start = null; // NULL
                let codepoints_count = 0;

                while ((parser.current.end < parser.end) && (parser.source[parser.current.end] !== '}')) {
                    const unicode_start = parser.current.end;
                    const hexadecimal_length = pm_strspn_hexadecimal_digit(parser.source, parser.current.end, parser.end - parser.current.end);

                    if (hexadecimal_length > 6) {
                        // \u{nnnn} character literal allows only 1-6 hexadecimal digits
                        pm_parser_err(parser, unicode_start, unicode_start + hexadecimal_length, PM_ERR_ESCAPE_INVALID_UNICODE_LONG);
                    } else if (hexadecimal_length === 0) {
                        // there are not hexadecimal characters

                        if (flags & PM_ESCAPE_FLAG_REGEXP) {
                            // If this is a regular expression, we are going to
                            // let the regular expression engine handle this
                            // error instead of us.
                            pm_buffer_append_bytes(regular_expression_buffer, parser.source.slice(start, parser.current.end), parser.current.end - start);
                        } else {
                            pm_parser_err(parser, parser.current.end, parser.current.end, PM_ERR_ESCAPE_INVALID_UNICODE);
                            pm_parser_err(parser, parser.current.end, parser.current.end, PM_ERR_ESCAPE_INVALID_UNICODE_TERM);
                        }

                        return;
                    }

                    parser.current.end += hexadecimal_length;
                    codepoints_count++;
                    if (flags & PM_ESCAPE_FLAG_SINGLE && codepoints_count === 2) {
                        extra_codepoints_start = unicode_start;
                    }

                    const value = escape_unicode(parser, unicode_start, hexadecimal_length, null);
                    escape_write_unicode(parser, buffer, flags, unicode_start, parser.current.end, value);

                    parser.current.end += pm_strspn_inline_whitespace(parser.source, parser.current.end, parser.end - parser.current.end);
                }

                // ?\u{nnnn} character literal should contain only one codepoint
                // and cannot be like ?\u{nnnn mmmm}.
                if (flags & PM_ESCAPE_FLAG_SINGLE && codepoints_count > 1) {
                    pm_parser_err(parser, extra_codepoints_start, parser.current.end - 1, PM_ERR_ESCAPE_INVALID_UNICODE_LITERAL);
                }

                if (parser.current.end === parser.end) {
                    PM_PARSER_ERR_FORMAT(parser, start, parser.current.end, PM_ERR_ESCAPE_INVALID_UNICODE_LIST, parser.current.end - start, parser.source.slice(start, parser.current.end));
                } else if (peek(parser) === 125 /* '}' */) {
                    parser.current.end++;
                } else {
                    if (flags & PM_ESCAPE_FLAG_REGEXP) {
                        // If this is a regular expression, we are going to let
                        // the regular expression engine handle this error
                        // instead of us.
                        pm_buffer_append_bytes(regular_expression_buffer, parser.source.slice(start, parser.current.end), parser.current.end - start);
                    } else {
                        pm_parser_err(parser, unicode_codepoints_start, parser.current.end, PM_ERR_ESCAPE_INVALID_UNICODE_TERM);
                    }
                }

                if (flags & PM_ESCAPE_FLAG_REGEXP) {
                    pm_buffer_append_bytes(regular_expression_buffer, parser.source.slice(unicode_codepoints_start, parser.current.end), parser.current.end - unicode_codepoints_start);
                }
            } else {
                const length = pm_strspn_hexadecimal_digit(parser.source, parser.current.end, Math.min(parser.end - parser.current.end, 4));

                if (length === 0) {
                    if (flags & PM_ESCAPE_FLAG_REGEXP) {
                        pm_buffer_append_bytes(regular_expression_buffer, parser.source.slice(start, parser.current.end), parser.current.end - start);
                    } else {
                        const short_start = parser.current.end - 2; // shadowed `start` in C
                        PM_PARSER_ERR_FORMAT(parser, short_start, parser.current.end, PM_ERR_ESCAPE_INVALID_UNICODE_SHORT, 2, parser.source.slice(short_start, parser.current.end));
                    }
                } else if (length === 4) {
                    const value = escape_unicode(parser, parser.current.end, 4, null);

                    if (flags & PM_ESCAPE_FLAG_REGEXP) {
                        pm_buffer_append_bytes(regular_expression_buffer, parser.source.slice(start, parser.current.end + 4), parser.current.end + 4 - start);
                    }

                    escape_write_unicode(parser, buffer, flags, start, parser.current.end + 4, value);
                    parser.current.end += 4;
                } else {
                    parser.current.end += length;

                    if (flags & PM_ESCAPE_FLAG_REGEXP) {
                        // If this is a regular expression, we are going to let
                        // the regular expression engine handle this error
                        // instead of us.
                        pm_buffer_append_bytes(regular_expression_buffer, parser.source.slice(start, parser.current.end), parser.current.end - start);
                    } else {
                        pm_parser_err_current(parser, PM_ERR_ESCAPE_INVALID_UNICODE);
                    }
                }
            }

            return;
        }
        case 99 /* 'c' */:
            return escape_read_control(parser, buffer, regular_expression_buffer, flags, false);
        case 67 /* 'C' */:
            return escape_read_control(parser, buffer, regular_expression_buffer, flags, true);
        case 77 /* 'M' */: {
            parser.current.end++;
            if (flags & PM_ESCAPE_FLAG_META) {
                pm_parser_err_current(parser, PM_ERR_ESCAPE_INVALID_META_REPEAT);
            }

            if (peek(parser) !== 45 /* '-' */) {
                const width = parser.encoding.char_width(parser.source, parser.current.end, parser.end - parser.current.end);
                pm_parser_err(parser, parser.current.start, parser.current.end + width, PM_ERR_ESCAPE_INVALID_META);
                return;
            }

            parser.current.end++;
            if (parser.current.end === parser.end) {
                pm_parser_err_current(parser, PM_ERR_ESCAPE_INVALID_META);
                return;
            }

            const peeked = peek(parser); // shadowed `peeked` in C
            switch (peeked) {
                case 92 /* '\\' */:
                    parser.current.end++;

                    if (match(parser, 117 /* 'u' */) || match(parser, 85 /* 'U' */)) {
                        pm_parser_err(parser, parser.current.start, parser.current.end, PM_ERR_INVALID_ESCAPE_CHARACTER);
                        return;
                    }

                    escape_read(parser, buffer, regular_expression_buffer, flags | PM_ESCAPE_FLAG_META);
                    return;
                case 32 /* ' ' */:
                    parser.current.end++;
                    escape_read_warn(parser, flags, PM_ESCAPE_FLAG_META, "\\s");
                    escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(peeked, flags | PM_ESCAPE_FLAG_META));
                    return;
                case 9 /* '\t' */:
                    parser.current.end++;
                    escape_read_warn(parser, flags & (~PM_ESCAPE_FLAG_CONTROL & 0xff), PM_ESCAPE_FLAG_META, "\\t");
                    escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(peeked, flags | PM_ESCAPE_FLAG_META));
                    return;
                default:
                    if (!char_is_ascii_printable(peeked)) {
                        const width = parser.encoding.char_width(parser.source, parser.current.end, parser.end - parser.current.end);
                        pm_parser_err(parser, parser.current.start, parser.current.end + width, PM_ERR_ESCAPE_INVALID_META);
                        return;
                    }

                    parser.current.end++;
                    escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(peeked, flags | PM_ESCAPE_FLAG_META));
                    return;
            }
        }
        case 13 /* '\r' */: {
            if (peek_offset(parser, 1) === 10 /* '\n' */) {
                parser.current.end += 2;
                escape_write_byte_encoded(parser, buffer, escape_byte(10 /* '\n' */, flags));
                return;
            }
            // PRISM_FALLTHROUGH
        }
        default: {
            if ((flags & (PM_ESCAPE_FLAG_CONTROL | PM_ESCAPE_FLAG_META)) && !char_is_ascii_printable(peeked)) {
                const width = parser.encoding.char_width(parser.source, parser.current.end, parser.end - parser.current.end);
                pm_parser_err(parser, parser.current.start, parser.current.end + width, PM_ERR_ESCAPE_INVALID_META);
                return;
            }
            if (parser.current.end < parser.end) {
                escape_write_escape_encoded(parser, buffer, regular_expression_buffer, flags);
            } else {
                pm_parser_err_current(parser, PM_ERR_INVALID_ESCAPE_CHARACTER);
            }
            return;
        }
    }
}

/**
 * This function is responsible for lexing either a character literal or the ?
 * operator. The supported character literals are described below.
 *
 * \\a            bell, ASCII 07h (BEL)
 * \\b            backspace, ASCII 08h (BS)
 * \t             horizontal tab, ASCII 09h (TAB)
 * \\n            newline (line feed), ASCII 0Ah (LF)
 * \v             vertical tab, ASCII 0Bh (VT)
 * \f             form feed, ASCII 0Ch (FF)
 * \r             carriage return, ASCII 0Dh (CR)
 * \\e            escape, ASCII 1Bh (ESC)
 * \s             space, ASCII 20h (SPC)
 * \\             backslash
 * \nnn           octal bit pattern, where nnn is 1-3 octal digits ([0-7])
 * \xnn           hexadecimal bit pattern, where nn is 1-2 hexadecimal digits ([0-9a-fA-F])
 * \unnnn         Unicode character, where nnnn is exactly 4 hexadecimal digits ([0-9a-fA-F])
 * \u{nnnn ...}   Unicode character(s), where each nnnn is 1-6 hexadecimal digits ([0-9a-fA-F])
 * \cx or \C-x    control character, where x is an ASCII printable character
 * \M-x           meta character, where x is an ASCII printable character
 * \M-\C-x        meta control character, where x is an ASCII printable character
 * \M-\cx         same as above
 * \\c\M-x        same as above
 * \\c? or \C-?   delete, ASCII 7Fh (DEL)
 */
function lex_question_mark(parser) {
    if (lex_state_end_p(parser)) {
        lex_state_set(parser, PM_LEX_STATE_BEG);
        return PM_TOKEN_QUESTION_MARK;
    }

    if (parser.current.end >= parser.end) {
        pm_parser_err_current(parser, PM_ERR_INCOMPLETE_QUESTION_MARK);
        parser.current_string = parser.source.slice(parser.current.start + 1, parser.current.end);
        parser.current_string_shared = true;
        return PM_TOKEN_CHARACTER_LITERAL;
    }

    if (pm_char_is_whitespace((parser.source.charCodeAt(parser.current.end) || 0))) {
        lex_state_set(parser, PM_LEX_STATE_BEG);
        return PM_TOKEN_QUESTION_MARK;
    }

    lex_state_set(parser, PM_LEX_STATE_BEG);

    if (match(parser, 92 /* '\\' */)) {
        lex_state_set(parser, PM_LEX_STATE_END);

        const buffer = {};
        pm_buffer_init_capacity(buffer, 3);

        escape_read(parser, buffer, null, PM_ESCAPE_FLAG_SINGLE);
        parser.current_string = pm_buffer_value(buffer);
        parser.current_string_shared = false;

        return PM_TOKEN_CHARACTER_LITERAL;
    } else {
        const encoding_width = parser.encoding.char_width(parser.source, parser.current.end, parser.end - parser.current.end);

        // Ternary operators can have a ? immediately followed by an identifier
        // which starts with an underscore. We check for this case here.
        if (
            !(parser.encoding.alnum_char(parser.source, parser.current.end, parser.end - parser.current.end) || peek(parser) === 95 /* '_' */) ||
            (
                (parser.current.end + encoding_width >= parser.end) ||
                !char_is_identifier(parser, parser.current.end + encoding_width, parser.end - (parser.current.end + encoding_width))
            )
        ) {
            lex_state_set(parser, PM_LEX_STATE_END);
            parser.current.end += encoding_width;
            parser.current_string = parser.source.slice(parser.current.start + 1, parser.current.end);
            parser.current_string_shared = true;
            return PM_TOKEN_CHARACTER_LITERAL;
        }
    }

    return PM_TOKEN_QUESTION_MARK;
}

/**
 * Lex a variable that starts with an @ sign (either an instance or class
 * variable).
 */
function lex_at_variable(parser) {
    const type = match(parser, 64 /* '@' */) ? PM_TOKEN_CLASS_VARIABLE : PM_TOKEN_INSTANCE_VARIABLE;
    const end = parser.end;

    let width;
    if ((width = char_is_identifier_start(parser, parser.current.end, end - parser.current.end)) > 0) {
        parser.current.end += width;

        while ((width = char_is_identifier(parser, parser.current.end, end - parser.current.end)) > 0) {
            parser.current.end += width;
        }
    } else if (parser.current.end < end && pm_char_is_decimal_digit((parser.source.charCodeAt(parser.current.end) || 0))) {
        let diag_id = (type === PM_TOKEN_CLASS_VARIABLE) ? PM_ERR_INCOMPLETE_VARIABLE_CLASS : PM_ERR_INCOMPLETE_VARIABLE_INSTANCE;
        if (parser.version <= PM_OPTIONS_VERSION_CRUBY_3_3) {
            diag_id = (type === PM_TOKEN_CLASS_VARIABLE) ? PM_ERR_INCOMPLETE_VARIABLE_CLASS_3_3 : PM_ERR_INCOMPLETE_VARIABLE_INSTANCE_3_3;
        }

        const width = parser.encoding.char_width(parser.source, parser.current.end, end - parser.current.end); // shadowed `width` in C
        PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, diag_id, (parser.current.end + width) - parser.current.start, parser.source.slice(parser.current.start, parser.current.end + width));
    } else {
        const diag_id = (type === PM_TOKEN_CLASS_VARIABLE) ? PM_ERR_CLASS_VARIABLE_BARE : PM_ERR_INSTANCE_VARIABLE_BARE;
        pm_parser_err_token(parser, parser.current, diag_id);
    }

    // If we're lexing an embedded variable, then we need to pop back into the
    // parent lex context.
    if (parser.lex_modes.current.mode === PM_LEX_EMBVAR) {
        lex_mode_pop(parser);
    }

    return type;
}

/**
 * Optionally call out to the lex callback if one is provided.
 */
function parser_lex_callback(parser) {
    if (parser.lex_callback) {
        parser.lex_callback.callback(parser.lex_callback.data, parser, parser.current);
    }
}

/**
 * Return a new comment node of the specified type.
 */
function parser_comment(parser, type) {
    return {
        type: type,
        location: { start: parser.current.start, end: parser.current.end }
    };
}

/**
 * Lex out embedded documentation, and return when we have either hit the end of
 * the file or the end of the embedded documentation. This calls the callback
 * manually because only the lexer should see these tokens, not the parser.
 */
function lex_embdoc(parser) {
    // First, lex out the EMBDOC_BEGIN token.
    let newline = next_newline(parser.source, parser.current.end, parser.end - parser.current.end);

    if (newline === -1) {
        parser.current.end = parser.end;
    } else {
        pm_newline_list_append(parser.newline_list, newline);
        parser.current.end = newline + 1;
    }

    parser.current.type = PM_TOKEN_EMBDOC_BEGIN;
    parser_lex_callback(parser);

    // Now, create a comment that is going to be attached to the parser.
    const comment = parser_comment(parser, PM_COMMENT_EMBDOC);

    // Now, loop until we find the end of the embedded documentation or the end
    // of the file.
    while (parser.current.end + 4 <= parser.end) {
        parser.current.start = parser.current.end;

        // If we've hit the end of the embedded documentation then we'll return
        // that token here.
        if (
            (parser.source[parser.current.end] === '=' && parser.source[parser.current.end + 1] === 'e' && parser.source[parser.current.end + 2] === 'n' && parser.source[parser.current.end + 3] === 'd') &&
            (
                (parser.current.end + 4 === parser.end) || // end of file
                pm_char_is_whitespace((parser.source.charCodeAt(parser.current.end + 4) || 0)) || // whitespace
                ((parser.source.charCodeAt(parser.current.end + 4) || 0) === 0) || // NUL or end of script
                ((parser.source.charCodeAt(parser.current.end + 4) || 0) === 4) || // ^D
                ((parser.source.charCodeAt(parser.current.end + 4) || 0) === 26) // ^Z
            )
        ) {
            newline = next_newline(parser.source, parser.current.end, parser.end - parser.current.end);

            if (newline === -1) {
                parser.current.end = parser.end;
            } else {
                pm_newline_list_append(parser.newline_list, newline);
                parser.current.end = newline + 1;
            }

            parser.current.type = PM_TOKEN_EMBDOC_END;
            parser_lex_callback(parser);

            comment.location.end = parser.current.end;
            parser.comment_list.push(comment);

            return PM_TOKEN_EMBDOC_END;
        }

        // Otherwise, we'll parse until the end of the line and return a line of
        // embedded documentation.
        newline = next_newline(parser.source, parser.current.end, parser.end - parser.current.end);

        if (newline === -1) {
            parser.current.end = parser.end;
        } else {
            pm_newline_list_append(parser.newline_list, newline);
            parser.current.end = newline + 1;
        }

        parser.current.type = PM_TOKEN_EMBDOC_LINE;
        parser_lex_callback(parser);
    }

    pm_parser_err_current(parser, PM_ERR_EMBDOC_TERM);

    comment.location.end = parser.current.end;
    parser.comment_list.push(comment);

    return PM_TOKEN_EOF;
}

/**
 * Set the current type to an ignored newline and then call the lex callback.
 * This happens in a couple places depending on whether or not we have already
 * lexed a comment.
 */
function parser_lex_ignored_newline(parser) {
    parser.current.type = PM_TOKEN_IGNORED_NEWLINE;
    parser_lex_callback(parser);
}

/**
 * This function will be called when a newline is encountered. In some newlines,
 * we need to check if there is a heredoc or heredocs that we have already lexed
 * the body of that we need to now skip past. That will be indicated by the
 * heredoc_end field on the parser.
 *
 * If it is set, then we need to skip past the heredoc body and then clear the
 * heredoc_end field.
 */
function parser_flush_heredoc_end(parser) {
    // assert(parser.heredoc_end <= parser.end): debug-only in C.
    parser.next_start = parser.heredoc_end;
    parser.heredoc_end = null;
}

/**
 * Returns true if the parser has lexed the last token on the current line.
*/
function parser_end_of_line_p(parser) {
    let cursor = parser.current.end;

    while (cursor < parser.end && parser.source[cursor] !== '\n' && parser.source[cursor] !== '#') {
        if (!pm_char_is_inline_whitespace((parser.source.charCodeAt(cursor++) || 0))) return false;
    }

    return true;
}

/**
 * When we're lexing certain types (strings, symbols, lists, etc.) we have
 * string content associated with the tokens. For example:
 *
 *     "foo"
 *
 * In this case, the string content is foo. Since there is no escaping, there's
 * no need to track additional information and the token can be returned as
 * normal. However, if we have escape sequences:
 *
 *     "foo\n"
 *
 * then the bytes in the string are "f", "o", "o", "\", "n", but we want to
 * provide our consumers with the string content "f", "o", "o", "\n". In these
 * cases, when we find the first escape sequence, we initialize a pm_buffer_t
 * to keep track of the string content. Then in the parser, it will
 * automatically attach the string content to the node that it belongs to.
 *
 * pm_token_buffer_t := { buffer: pm_buffer_t, cursor: number | null }
 *
 * pm_regexp_token_buffer_t := {
 *     base: pm_token_buffer_t,
 *     regexp_buffer: pm_buffer_t
 * }
 */

/**
 * Push the given byte into the token buffer.
 */
function pm_token_buffer_push_byte(token_buffer, byte) {
    pm_buffer_append_byte(token_buffer.buffer, byte);
}

function pm_regexp_token_buffer_push_byte(token_buffer, byte) {
    pm_buffer_append_byte(token_buffer.regexp_buffer, byte);
}

/**
 * Return the width of the character at the end of the current token.
 */
function parser_char_width(parser) {
    const width = pm_encoding_utf_8_char_width(parser.source, parser.current.end, parser.end - parser.current.end);

    // TODO: If the character is invalid in the given encoding, then we'll just
    // push one byte into the buffer. This should actually be an error.
    return (width === 0 ? 1 : width);
}

/**
 * Shared core of pm_token_buffer_push_escaped/pm_regexp_token_buffer_push_escaped:
 * push the character at the current token's end into each of `buffers`, then
 * advance past it. The regexp variant just passes two target buffers instead
 * of one.
 */
function pm_token_buffer_push_escaped_into(buffers, parser) {
    const width = parser_char_width(parser);
    const text = parser.source.slice(parser.current.end, parser.current.end + width);
    for (const buffer of buffers) pm_buffer_append_bytes(buffer, text, width);
    parser.current.end += width;
}

/**
 * Push an escaped character into the token buffer.
 */
function pm_token_buffer_push_escaped(token_buffer, parser) {
    pm_token_buffer_push_escaped_into([token_buffer.buffer], parser);
}

function pm_regexp_token_buffer_push_escaped(token_buffer, parser) {
    pm_token_buffer_push_escaped_into([token_buffer.base.buffer, token_buffer.regexp_buffer], parser);
}

function pm_slice_ascii_only_p(value, length) {
    // UNI-BUILD: C tests `byte & 0x80` over a UTF-8 byte stream, where any
    // set high bit means "not ASCII". `value` here is a native UTF-16
    // string, so the equivalent test is "code unit > 0x7F" - `& 0x80`
    // against a full code unit is wrong (e.g. U+0202 is 0x0202, which has
    // bit 0x80 clear even though it's far outside ASCII).
    for (let index = 0; index < length; index++) {
        if ((value.charCodeAt(index) || 0) > 0x7f) return false;
    }

    return true;
}

/**
 * When we're about to return from lexing the current token and we know for sure
 * that we have found an escape sequence, this function is called to copy the
 * contents of the token buffer into the current string on the parser so that it
 * can be attached to the correct node.
 */
function pm_token_buffer_copy(parser, token_buffer) {
    parser.current_string = pm_buffer_value(token_buffer.buffer);
    parser.current_string_shared = false;
}

function pm_regexp_token_buffer_copy(parser, token_buffer) {
    pm_token_buffer_copy(parser, token_buffer.base);
    parser.current_regular_expression_ascii_only = pm_slice_ascii_only_p(pm_buffer_value(token_buffer.regexp_buffer), pm_buffer_length(token_buffer.regexp_buffer));
}

/**
 * When we're about to return from lexing the current token, we need to flush
 * all of the content that we have pushed into the buffer into the current
 * string. If we haven't pushed anything into the buffer, this means that we
 * never found an escape sequence, so we can directly reference the bounds of
 * the current string. Either way, at the return of this function it is expected
 * that parser->current_string is established in such a way that it can be
 * attached to a node.
 */
function pm_token_buffer_flush(parser, token_buffer) {
    if (token_buffer.cursor === null) {
        parser.current_string = parser.source.slice(parser.current.start, parser.current.end);
        parser.current_string_shared = true;
    } else {
        pm_buffer_append_bytes(token_buffer.buffer, parser.source.slice(token_buffer.cursor, parser.current.end), parser.current.end - token_buffer.cursor);
        pm_token_buffer_copy(parser, token_buffer);
    }
}

function pm_regexp_token_buffer_flush(parser, token_buffer) {
    if (token_buffer.base.cursor === null) {
        parser.current_string = parser.source.slice(parser.current.start, parser.current.end);
        parser.current_string_shared = true;
        parser.current_regular_expression_ascii_only = pm_slice_ascii_only_p(parser.source.slice(parser.current.start, parser.current.end), parser.current.end - parser.current.start);
    } else {
        pm_buffer_append_bytes(token_buffer.base.buffer, parser.source.slice(token_buffer.base.cursor, parser.current.end), parser.current.end - token_buffer.base.cursor);
        pm_buffer_append_bytes(token_buffer.regexp_buffer, parser.source.slice(token_buffer.base.cursor, parser.current.end), parser.current.end - token_buffer.base.cursor);
        pm_regexp_token_buffer_copy(parser, token_buffer);
    }
}

const PM_TOKEN_BUFFER_DEFAULT_SIZE = 16;

/**
 * When we've found an escape sequence, we need to copy everything up to this
 * point into the buffer because we're about to provide a string that has
 * different content than a direct slice of the source.
 *
 * It is expected that the parser's current token end will be pointing at one
 * byte past the backslash that starts the escape sequence.
 */
/**
 * Shared bookkeeping for pm_token_buffer_escape/pm_regexp_token_buffer_escape:
 * compute the [start, end) range to copy up through the byte before the
 * current escape sequence, initializing the base buffer's capacity on first
 * use, and advance the cursor. Does not itself append to any buffer, since
 * the two variants write the range into a different number of buffers.
 */
function pm_token_buffer_escape_range(parser, token_buffer) {
    let start;
    if (token_buffer.cursor === null) {
        pm_buffer_init_capacity(token_buffer.buffer, PM_TOKEN_BUFFER_DEFAULT_SIZE);
        start = parser.current.start;
    } else {
        start = token_buffer.cursor;
    }

    const end = parser.current.end - 1;
    // assert(end >= start): debug-only in C.
    token_buffer.cursor = end;

    return { start, end };
}

function pm_token_buffer_escape(parser, token_buffer) {
    const { start, end } = pm_token_buffer_escape_range(parser, token_buffer);
    pm_buffer_append_bytes(token_buffer.buffer, parser.source.slice(start, end), end - start);
}

function pm_regexp_token_buffer_escape(parser, token_buffer) {
    const needs_init = token_buffer.base.cursor === null;
    const { start, end } = pm_token_buffer_escape_range(parser, token_buffer.base);
    if (needs_init) pm_buffer_init_capacity(token_buffer.regexp_buffer, PM_TOKEN_BUFFER_DEFAULT_SIZE);

    const text = parser.source.slice(start, end);
    pm_buffer_append_bytes(token_buffer.base.buffer, text, end - start);
    pm_buffer_append_bytes(token_buffer.regexp_buffer, text, end - start);
}
// #undef PM_TOKEN_BUFFER_DEFAULT_SIZE (kept defined; JS consts cannot be undefined)

/**
 * Effectively the same thing as pm_strspn_inline_whitespace, but in the case of
 * a tilde heredoc expands out tab characters to the nearest tab boundaries.
 *
 * (Adaptation: `cursor` is a { value } box since C passes a pointer-to-pointer.)
 */
function pm_heredoc_strspn_inline_whitespace(parser, cursor, indent) {
    let whitespace = 0;

    switch (indent) {
        case PM_HEREDOC_INDENT_NONE:
            // Do nothing, we can't match a terminator with
            // indentation and there's no need to calculate common
            // whitespace.
            break;
        case PM_HEREDOC_INDENT_DASH:
            // Skip past inline whitespace.
            cursor += pm_strspn_inline_whitespace(parser.source, cursor, parser.end - cursor);
            break;
        case PM_HEREDOC_INDENT_TILDE:
            // Skip past inline whitespace and calculate common
            // whitespace.
            while (cursor < parser.end && pm_char_is_inline_whitespace((parser.source.charCodeAt(cursor) || 0))) {
                if (parser.source[cursor] === '\t') {
                    whitespace = Math.floor(whitespace / PM_TAB_WHITESPACE_SIZE + 1) * PM_TAB_WHITESPACE_SIZE;
                } else {
                    whitespace++;
                }
                cursor++;
            }

            break;
    }

    return [whitespace, cursor];
}

/**
 * Lex past the delimiter of a percent literal. Handle newlines and heredocs
 * appropriately.
 */
function pm_lex_percent_delimiter(parser) {
    const eol_length = match_eol(parser);

    if (eol_length) {
        if (parser.heredoc_end) {
            // If we have already lexed a heredoc, then the newline has already
            // been added to the list. In this case we want to just flush the
            // heredoc end.
            parser_flush_heredoc_end(parser);
        } else {
            // Otherwise, we'll add the newline to the list of newlines.
            pm_newline_list_append(parser.newline_list, parser.current.end + eol_length - 1);
        }

        let delimiter = (parser.source.charCodeAt(parser.current.end) || 0);

        // If our delimiter is \r\n, we want to treat it as if it's \n.
        // For example, %\r\nfoo\r\n should be "foo"
        if (eol_length === 2) {
            delimiter = (parser.source.charCodeAt(parser.current.end + 1) || 0);
        }

        parser.current.end += eol_length;
        return delimiter;
    }

    const delimiter = (parser.source.charCodeAt(parser.current.end) || 0);
    parser.current.end++;
    return delimiter;
}

/**
 * This is a convenience macro that sets the current token type, calls the lex
 * callback, and then returns from the parser_lex function. Not converted as a
 * function because it returns from its caller; expand at use sites as
 * `parser.current.type = X; parser_lex_callback(parser); return;`.
 * (prism.c:9726)
 */

// parser_lex (prism.c:9734) belongs to the next fragment.

// ----------------------------------------------------------------------
// parser_part4.mjs
// ----------------------------------------------------------------------
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

// ----------------------------------------------------------------------
// parser_part5.mjs
// ----------------------------------------------------------------------
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

// ----------------------------------------------------------------------
// parser_part6a.mjs
// ----------------------------------------------------------------------
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

// ----------------------------------------------------------------------
// parser_part6b.mjs
// ----------------------------------------------------------------------
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

// ----------------------------------------------------------------------
// parser_part7.mjs
// ----------------------------------------------------------------------
// prism.c lines 20206-22679 converted to JavaScript (ES2022).
//
// This fragment contains the tail of the parser driver:
// - parse_assignment_value/_local/_values, parse_call_operator_write
// - the named-capture machinery for =~ regular expressions
// - parse_expression_infix (the infix operator dispatch)
// - pm_call_node_command_p, parse_expression (THE driver), wrap_statements,
//   parse_program
// - the external API: pm_parser_init, pm_parser_register_encoding_changed_callback,
//   pm_parse, the streaming API, the
//   serialization entry points and the slice query APIs.
//   (pm_parser_free / pm_options_free are intentionally not ported: they only
//   freed memory, which garbage collection handles.)
//
// This is a plain fragment: it declares consts/functions only, no
// import/export. It relies on parts 1-6b, ast.js, node.js, diagnostic.js,
// options.js, token_type.js, encoding.js, regexp.js, static_literals.js,
// serialize.js and the util modules being concatenated/imported around it.
// In particular it defines four of the five functions that src/serialize.js
// imports from ./parser.js: pm_parser_init, pm_parse and
// pm_serialize (pm_parser_free is intentionally not ported).
//
// Adaptation notes for the integrator:
// - Byte access is parser.source[offset]; C NULL pointers become null, and -1
//   stands in for NULL returns of search helpers such as pm_memchr/next_newline.
// - pm_named_capture_escape_hex/octal/unicode/pm_named_capture_escape operate
//   on an explicit Uint8Array plus numeric offsets (the capture name may live
//   in a standalone escape buffer rather than parser.source).
// - escape_unicode is duplicated below as an explicit-buffer variant because
//   part3's version reads parser.source directly; the logic is identical.
// - parse_regular_expression_named_capture computes `base`
//   (source.byteOffset - parser.source.byteOffset) to translate views into
//   parser.source back to absolute offsets. When the content was shared but
//   the name contained escapes, C inserts a shared constant that points into
//   the escape buffer freed immediately afterwards (use-after-free); JS cannot
//   reproduce that, so the bytes are copied and inserted owned instead. The
//   pool hashes by content so ids match C.
// - part6a's pm_slice_is_valid_local hardcodes parser.source; this range needs
//   to validate names living in other buffers, so the logic is duplicated in
//   pm_slice_is_valid_local_bytes with an explicit buffer parameter.
// - pm_strnstr takes the big-buffer Uint8Array explicitly plus the start
//   offset of the search (C took a raw pointer into parser.source).
// - shebang_callback is invoked as callback(next_options, start_offset,
//   length, data) where start_offset is an offset into parser.source (C
//   passed a uint8_t * into the same buffer).
// - Option encodings arrive as standalone strings (from options.js setters,
//   or a shebang callback mutating the copied options), never as offsets into
//   parser.source, so pm_parser_init_shebang and pm_parser_init duplicate the
//   small body of part3's parser_lex_magic_comment_encoding_value with an
//   explicit buffer parameter (pm_parser_init_set_encoding_value).
// - The C streaming API (pm_parse_stream_read/stream_fgets/stream_feof) was
//   never ported; there is no streaming entry point in this build.
// - The `data` parameters of the public serialize/query entry points are
//   string|null per spec. (The C options-blob deserializer was never ported;
//   pm_parse_success_p relied on it and is not ported either.)
// - `pm_options_t options = { 0 }` becomes zero_options() below.
// - xmalloc/memcpy become new Uint8Array/slice()/set(); xfree vanishes (GC);
//   asserts are debug-only in C and omitted.
// - First definitions of constants from other headers used here:
//     PRISM_DEPTH_MAXIMUM (defines.h), PRISM_VERSION_MAJOR/MINOR/PATCH
//     (version.h), PM_STRING_QUERY_* (prism.h), PM_SLICE_TYPE_* (below).

// PRISM_DEPTH_MAXIMUM (include/prism/defines.h)
const PRISM_DEPTH_MAXIMUM = 10000;

// PRISM_VERSION_MAJOR/MINOR/PATCH (include/prism/version.h)
const PRISM_VERSION_MAJOR = 1;
const PRISM_VERSION_MINOR = 9;
const PRISM_VERSION_PATCH = 0;

// typedef enum { ... } pm_string_query_t; (include/prism.h)
const PM_STRING_QUERY_ERROR = -1;
const PM_STRING_QUERY_FALSE = 0;
const PM_STRING_QUERY_TRUE = 1;

/**
 * Parse the value that is going to be written to some kind of variable or
 * method call. We need to handle this separately because the rescue modifier
 * is permitted on the end of these expressions, which is a deviation from its
 * normal binding power.
 *
 * Note that this will only be called after an operator write, as in &&=, ||=,
 * or any of the binary operators that can be written to a variable.
 * (prism.c:20206)
 */
function parse_assignment_value(parser, previous_binding_power, binding_power, accepts_command_call, diag_id, depth) {
    const value = parse_value_expression(parser, binding_power, previous_binding_power === PM_BINDING_POWER_ASSIGNMENT ? accepts_command_call : previous_binding_power < PM_BINDING_POWER_MATCH, false, diag_id, depth + 1);

    // Contradicting binding powers, the right-hand-side value of the assignment
    // allows the `rescue` modifier.
    if (match1(parser, PM_TOKEN_KEYWORD_RESCUE_MODIFIER)) {
        context_push(parser, PM_CONTEXT_RESCUE_MODIFIER);

        const rescue = copyToken(parser.current);
        parser_lex(parser);

        const right = parse_expression(parser, pm_binding_powers[PM_TOKEN_KEYWORD_RESCUE_MODIFIER].right, false, false, PM_ERR_RESCUE_MODIFIER_VALUE, depth + 1);
        context_pop(parser);

        return pm_rescue_modifier_node_create(parser, value, rescue, right);
    }

    return value;
}

/**
 * When a local variable write node is the value being written in a different
 * write, the local variable is considered "used". (prism.c:20231)
 */
function parse_assignment_value_local(parser, node) {
    switch (node.type) {
        case PM_BEGIN_NODE: {
            if (node.statements !== null) parse_assignment_value_local(parser, node.statements);
            break;
        }
        case PM_LOCAL_VARIABLE_WRITE_NODE: {
            pm_locals_read(pm_parser_scope_find(parser, node.depth).locals, node.name);
            break;
        }
        case PM_PARENTHESES_NODE: {
            if (node.body !== null) parse_assignment_value_local(parser, node.body);
            break;
        }
        case PM_STATEMENTS_NODE: {
            for (let index = 0; index < node.body.length; index++) {
                parse_assignment_value_local(parser, node.body[index]);
            }
            break;
        }
        default:
            break;
    }
}

/**
 * Parse the value (or values, through an implicit array) that is going to be
 * written to some kind of variable or method call. We need to handle this
 * separately because the rescue modifier is permitted on the end of the these
 * expressions, which is a deviation from its normal binding power.
 *
 * Additionally, if the value is a local variable write node (e.g., a = a = 1),
 * the "a" is marked as being used so the parser should not warn on it.
 *
 * Note that this will only be called after an = operator, as that is the only
 * operator that allows multiple values after it. (prism.c:20275)
 */
function parse_assignment_values(parser, previous_binding_power, binding_power, accepts_command_call, diag_id, depth) {
    let permitted = true;
    if (previous_binding_power !== PM_BINDING_POWER_STATEMENT && match1(parser, PM_TOKEN_USTAR)) permitted = false;

    let value = parse_starred_expression(parser, binding_power, previous_binding_power === PM_BINDING_POWER_ASSIGNMENT ? accepts_command_call : previous_binding_power < PM_BINDING_POWER_MODIFIER, diag_id, depth + 1);
    if (!permitted) pm_parser_err_node(parser, value, PM_ERR_UNEXPECTED_MULTI_WRITE);

    parse_assignment_value_local(parser, value);
    let single_value = true;

    if (previous_binding_power === PM_BINDING_POWER_STATEMENT && (PM_NODE_TYPE_P(value, PM_SPLAT_NODE) || match1(parser, PM_TOKEN_COMMA))) {
        single_value = false;

        const opening = not_provided(parser);
        const array = pm_array_node_create(parser, opening);

        pm_array_node_elements_append(array, value);
        value = array;

        while (accept1(parser, PM_TOKEN_COMMA)) {
            const element = parse_starred_expression(parser, binding_power, false, PM_ERR_ARRAY_ELEMENT, depth + 1);

            pm_array_node_elements_append(array, element);
            if (PM_NODE_TYPE_P(element, PM_MISSING_NODE)) break;

            parse_assignment_value_local(parser, element);
        }
    }

    // Contradicting binding powers, the right-hand-side value of the assignment
    // allows the `rescue` modifier.
    if ((single_value || (binding_power === (PM_BINDING_POWER_MULTI_ASSIGNMENT + 1))) && match1(parser, PM_TOKEN_KEYWORD_RESCUE_MODIFIER)) {
        context_push(parser, PM_CONTEXT_RESCUE_MODIFIER);

        const rescue = copyToken(parser.current);
        parser_lex(parser);

        let accepts_command_call_inner = false;

        // RHS can accept command call iff the value is a call with arguments
        // but without parenthesis.
        if (PM_NODE_TYPE_P(value, PM_CALL_NODE)) {
            const call_node = value;
            if ((call_node.arguments !== null) && (call_node.opening_loc.start === null)) {
                accepts_command_call_inner = true;
            }
        }

        const right = parse_expression(parser, pm_binding_powers[PM_TOKEN_KEYWORD_RESCUE_MODIFIER].right, accepts_command_call_inner, false, PM_ERR_RESCUE_MODIFIER_VALUE, depth + 1);
        context_pop(parser);

        return pm_rescue_modifier_node_create(parser, value, rescue, right);
    }

    return value;
}

/**
 * Ensure a call node that is about to become a call operator node does not
 * have arguments or a block attached. If it does, then we'll need to add an
 * error message and destroy the arguments/block. Ideally we would keep the node
 * around so that consumers would still have access to it, but we don't have a
 * great structure for that at the moment. (prism.c:20340)
 */
function parse_call_operator_write(parser, call_node, operator) {
    if (call_node.arguments !== null) {
        pm_parser_err_token(parser, operator, PM_ERR_OPERATOR_WRITE_ARGUMENTS);
        pm_node_unreference(parser, call_node.arguments);
        call_node.arguments = null;
    }

    if (call_node.block !== null) {
        pm_parser_err_token(parser, operator, PM_ERR_OPERATOR_WRITE_BLOCK);
        pm_node_unreference(parser, call_node.block);
        call_node.block = null;
    }
}

/******************************************************************************/
/* Named captures in regular expressions                                      */
/******************************************************************************/

/**
 * This object is used to pass information between the regular expression
 * parser and the named capture callback. In C it is
 *
 *     typedef struct {
 *         pm_parser_t *parser;
 *         pm_call_node_t *call;
 *         pm_match_write_node_t *match;
 *         pm_constant_id_list_t names;
 *         bool shared;
 *     } parse_regular_expression_named_capture_data_t;
 *
 * Here it is a plain object with the same fields.
 */

// UNI-BUILD: `unescaped` is a JS-string buffer, not a byte buffer, so a
// single escaped byte >= 0x80 can't just be pushed as its own code unit -
// that produces one mojibake character per byte instead of the one real
// codepoint a multi-byte UTF-8 sequence (spelled out here as consecutive
// \xNN/\0NN escapes) decodes to. Mirrors escape_write_byte_encoded's own
// continuation-merging (parser_part3.js), adapted to read against a local
// `source`/`cursor` slice (the capture name text) instead of the live
// parser cursor - same algorithm, different cursor source.
function pm_named_capture_merge_continuation(source, cursor, end, lead_byte) {
    const width = lead_byte >= 0xf0 ? 4 : lead_byte >= 0xe0 ? 3 : lead_byte >= 0xc2 ? 2 : 1;
    if (width === 1) return { codepoint: 0xfffd, cursor };

    let pos = cursor;
    const units = [lead_byte];
    while (units.length < width) {
        if ((source.charCodeAt(pos) || 0) !== 92 /* '\\' */) break;
        const c1 = source.charCodeAt(pos + 1) || 0;
        let value = null;
        let next = -1;

        if (c1 === 120 /* 'x' */ || c1 === 88 /* 'X' */) {
            const d1 = source.charCodeAt(pos + 2) || 0;
            const d2 = source.charCodeAt(pos + 3) || 0;
            if (pm_char_is_hexadecimal_digit(d1) && pm_char_is_hexadecimal_digit(d2)) {
                value = (escape_hexadecimal_digit(d1) << 4) | escape_hexadecimal_digit(d2);
                next = pos + 4;
            }
        } else if (c1 >= 48 /* '0' */ && c1 <= 55 /* '7' */) {
            value = c1 - 48;
            next = pos + 2;
            for (let k = 0; k < 2; k++) {
                const oc = source.charCodeAt(next) || 0;
                if (oc >= 48 && oc <= 55) { value = value * 8 + (oc - 48); next++; } else break;
            }
        }

        if (value === null || (value & 0xc0) !== 0x80) break;
        units.push(value);
        pos = next;
    }

    if (units.length === width) {
        const cp = width === 2
            ? ((units[0] & 0x1f) << 6) | (units[1] & 0x3f)
            : width === 3
                ? ((units[0] & 0x0f) << 12) | ((units[1] & 0x3f) << 6) | (units[2] & 0x3f)
                : ((units[0] & 0x07) << 18) | ((units[1] & 0x3f) << 12) | ((units[2] & 0x3f) << 6) | (units[3] & 0x3f);
        const min = width === 2 ? 0x80 : width === 3 ? 0x800 : 0x10000;
        if (cp >= min && cp <= 0x10ffff && !(cp >= 0xd800 && cp <= 0xdfff)) {
            return { codepoint: cp, cursor: pos };
        }
    }

    // Invalid lead/sequence: single replacement character, no extra
    // escapes consumed beyond the lead byte itself.
    return { codepoint: 0xfffd, cursor };
}

// `cursor` points at the 'x'. Offsets are into `source`. (prism.c:20382)
function pm_named_capture_escape_hex(unescaped, source, cursor, end) {
    cursor++;

    if (cursor < end && pm_char_is_hexadecimal_digit((source.charCodeAt(cursor)))) {
        let value = escape_hexadecimal_digit((source.charCodeAt(cursor)));
        cursor++;

        if (cursor < end && pm_char_is_hexadecimal_digit((source.charCodeAt(cursor)))) {
            value = (value << 4) | escape_hexadecimal_digit((source.charCodeAt(cursor)));
            cursor++;
        }

        if (value >= 0x80) {
            const merged = pm_named_capture_merge_continuation(source, cursor, end, value);
            pm_buffer_append_unicode_codepoint(unescaped, merged.codepoint);
            cursor = merged.cursor;
        } else {
            pm_buffer_append_byte(unescaped, value & 0xff);
        }
    } else {
        pm_buffer_append_string(unescaped, "\\x");
    }

    return cursor;
}

// `cursor` points at the first octal digit. (prism.c:20403)
function pm_named_capture_escape_octal(unescaped, source, cursor, end) {
    let value = (source.charCodeAt(cursor)) - 48; /* '0' */
    cursor++;

    if (cursor < end && pm_char_is_octal_digit((source.charCodeAt(cursor)))) {
        value = ((value << 3) & 0xff) | ((source.charCodeAt(cursor)) - 48); /* '0' */
        cursor++;

        if (cursor < end && pm_char_is_octal_digit((source.charCodeAt(cursor)))) {
            value = ((value << 3) & 0xff) | ((source.charCodeAt(cursor)) - 48); /* '0' */
            cursor++;
        }
    }

    if (value >= 0x80) {
        const merged = pm_named_capture_merge_continuation(source, cursor, end, value);
        pm_buffer_append_unicode_codepoint(unescaped, merged.codepoint);
        cursor = merged.cursor;
    } else {
        pm_buffer_append_byte(unescaped, value & 0xff);
    }

    return cursor;
}

// Copy of part3's escape_unicode that reads an explicit buffer instead of
// parser.source (the capture name may live in a standalone escape buffer).
// `string` is an offset into `source`. When error_location is null the error
// is reported at base + string .. base + string + length (in C these were raw
// pointer values). Behavior is otherwise identical. (prism.c escape_unicode)
function pm_named_capture_escape_unicode_value(parser, source, string, length, error_location, base) {
    let value = 0;
    for (let index = 0; index < length; index++) {
        if (index !== 0) value <<= 4;
        value |= escape_hexadecimal_digit((source.charCodeAt(string + index)));
    }

    // Here we're going to verify that the value is actually a valid Unicode
    // codepoint and not a surrogate pair.
    if (value >= 0xD800 && value <= 0xDFFF) {
        if (error_location !== null) {
            pm_parser_err(parser, error_location.start, error_location.end, PM_ERR_ESCAPE_INVALID_UNICODE);
        } else {
            pm_parser_err(parser, base + string, base + string + length, PM_ERR_ESCAPE_INVALID_UNICODE);
        }
        return 0xFFFD;
    }

    return value >>> 0;
}

// `cursor` points at the 'u'. (prism.c:20422)
function pm_named_capture_escape_unicode(parser, unescaped, source, cursor, end, error_location) {
    const start = cursor - 1;
    cursor++;

    if (cursor >= end) {
        pm_buffer_append_string(unescaped, "\\u");
        return cursor;
    }

    if ((source.charCodeAt(cursor)) !== 123 /* '{' */) {
        const length = pm_strspn_hexadecimal_digit(source, cursor, Math.min(end - cursor, 4));
        const value = pm_named_capture_escape_unicode_value(parser, source, cursor, length, error_location, 0);

        if (!pm_buffer_append_unicode_codepoint(unescaped, value)) {
            pm_buffer_append_bytes(unescaped, source.slice(start, cursor + length), (cursor + length) - start);
        }

        return cursor + length;
    }

    cursor++;
    for (;;) {
        while (cursor < end && (source.charCodeAt(cursor)) === 32 /* ' ' */) cursor++;

        if (cursor >= end) break;
        if ((source.charCodeAt(cursor)) === 125 /* '}' */) {
            cursor++;
            break;
        }

        const length = pm_strspn_hexadecimal_digit(source, cursor, end - cursor);
        if (length === 0) {
            break;
        }
        const value = pm_named_capture_escape_unicode_value(parser, source, cursor, length, error_location, 0);

        pm_buffer_append_unicode_codepoint(unescaped, value);
        cursor += length;
    }

    return cursor;
}

// `cursor` points at the first backslash within source[0..length).
// (prism.c:20466)
function pm_named_capture_escape(parser, unescaped, source, length, cursor, error_location) {
    const end = length;
    pm_buffer_append_bytes(unescaped, source.slice(0, cursor), cursor);

    for (;;) {
        if (++cursor >= end) {
            pm_buffer_append_byte(unescaped, 92); /* '\\' */
            return;
        }

        switch ((source.charCodeAt(cursor))) {
            case 120: // 'x'
                cursor = pm_named_capture_escape_hex(unescaped, source, cursor, end);
                break;
            case 48: case 49: case 50: case 51: case 52: case 53: case 54: case 55: // '0'..'7'
                cursor = pm_named_capture_escape_octal(unescaped, source, cursor, end);
                break;
            case 117: // 'u'
                cursor = pm_named_capture_escape_unicode(parser, unescaped, source, cursor, end, error_location);
                break;
            default:
                pm_buffer_append_byte(unescaped, 92); /* '\\' */
                break;
        }

        const next_cursor_raw = source.indexOf("\\", cursor);
        if (next_cursor_raw === -1 || next_cursor_raw >= end) break;
        const next_cursor = next_cursor_raw;

        pm_buffer_append_bytes(unescaped, source.slice(cursor, next_cursor), next_cursor - cursor);
        cursor = next_cursor;
    }

    pm_buffer_append_bytes(unescaped, source.slice(cursor, end), end - cursor);
}

// Copy of part6a's pm_slice_is_valid_local that validates bytes in an
// explicit buffer rather than parser.source. Logic is identical.
// (prism.c:16388)
function pm_slice_is_valid_local_bytes(parser, bytes, start, end) {
    const length = end - start;
    if (length === 0) return false;

    // First ensure that it starts with a valid identifier starting character.
    let width;
     if ((bytes.charCodeAt(start) || 0) < 0x80) {
        if (((pm_encoding_unicode_table[(bytes.charCodeAt(start) || 0)] & PRISM_ENCODING_ALPHABETIC_BIT) !== 0) || ((bytes.charCodeAt(start) || 0) === 0x5f)) {
            width = 1;
        } else {
            return false;
        }
    } else {
        width = pm_encoding_utf_8_char_width(bytes, start, length);
        if (!(width > 0)) return false;
    }

    // Next, ensure that it's not an uppercase character.
    
        if (pm_encoding_utf_8_isupper_char(bytes, start, length)) return false;
    

    // Next, iterate through all of the bytes of the string to ensure that they
    // are all valid identifier characters.
    let cursor = start + width;
    while (true) {
        let matched = false;

         if ((bytes.charCodeAt(cursor) || 0) < 0x80) {
            if (((pm_encoding_unicode_table[(bytes.charCodeAt(cursor) || 0)] & PRISM_ENCODING_ALPHANUMERIC_BIT) !== 0) || ((bytes.charCodeAt(cursor) || 0) === 0x5f)) {
                cursor += 1;
                matched = true;
            }
        } else {
            width = pm_encoding_utf_8_char_width(bytes, cursor, end - cursor);
            if (width > 0) {
                cursor += width;
                matched = true;
            }
        }

        if (!matched) break;
    }

    return cursor === end;
}

/**
 * This callback is called when the regular expression parser encounters a named
 * capture group. (prism.c:20506)
 */
function parse_regular_expression_named_capture(capture_start, capture_end, data) {
    const callback_data = data;

    const parser = callback_data.parser;
    const call = callback_data.call;
    const names = callback_data.names;

    // Capture text: `capture_start/end` are relative to the scanned content
    // (C received pointers into it). For shared content the same bytes live
    // at data.base within parser.source; owned content is self-contained.
    let source = callback_data.content.slice(capture_start, capture_end);
    let length = source.length;
    let escaped = false;
    const unescaped = {};
    pm_buffer_init(unescaped);

    // First, we need to handle escapes within the name of the capture group.
    // This is because regular expressions have three different representations
    // in prism. The first is the plain source code. The second is the
    // representation that will be sent to the regular expression engine, which
    // is the value of the "unescaped" field. This is poorly named, because it
    // actually still contains escapes, just a subset of them that the regular
    // expression engine knows how to handle. The third representation is fully
    // unescaped, which is what we need.
    const cursor = (() => { const idx = source.indexOf("\\"); return (idx !== -1 && idx < length) ? idx : -1; })();
    if (cursor !== -1) {
        escaped = true;
        pm_named_capture_escape(parser, unescaped, source, length, cursor, callback_data.shared ? null : call.receiver.location);
        source = pm_buffer_value(unescaped);
        length = pm_buffer_length(unescaped);
    }

    // Offset of `source` within parser.source when it aliases parser.source
    // (shared content without escapes); otherwise it stands in for the raw
    // malloc pointer values that C used here.
    let location;
    let name;

    // If the name of the capture group isn't a valid identifier, we do
    // not add it to the local table.
    if (!pm_slice_is_valid_local_bytes(parser, source, 0, length)) {
        return;
    }

    if (callback_data.shared && !escaped) {
        // Unescaped text aliases the source: the name lives in the source.
        location = { start: callback_data.base + capture_start, end: callback_data.base + capture_end };
        name = pm_parser_constant_id_location(parser, location.start, location.end);
    } else if (callback_data.shared) {
        // Escaped: C frees the escape buffer while the constant pool keeps
        // pointing into it, so copy the bytes out and insert them owned.
        // Location offsets stay where C kept raw malloc pointers.
        location = { start: callback_data.base + capture_start, end: callback_data.base + capture_start + length };

        const memory = source.slice(0, length);
        name = pm_parser_constant_id_owned(parser, memory, length);
    } else {
        // Otherwise, the name is a slice of the malloc-ed owned string,
        // in which case we need to copy it out into a new string.
        location = call.receiver.location;

        const memory = source.slice(0, length);
        name = pm_parser_constant_id_owned(parser, memory, length);
    }

    // Add this name to the list of constants if it is valid, not duplicated,
    // and not a keyword.
    if (name !== 0 && !pm_constant_id_list_includes(names, name)) {
        pm_constant_id_list_append(names, name);

        const depth = pm_parser_local_depth_constant_id(parser, name);
        if (depth === -1) {
            // If the local is not already a local but it is a keyword, then we
            // do not want to add a capture for this.
            if (pm_local_is_keyword(source, length)) {
                return;
            }

            // If the identifier is not already a local, then we will add it to
            // the local table.
            pm_parser_local_add(parser, name, location.start, location.end, 0);
        }

        // Here we lazily create the MatchWriteNode since we know we're
        // about to add a target.
        if (callback_data.match === null) {
            callback_data.match = pm_match_write_node_create(parser, call);
        }

        // Next, create the local variable target and add it to the list of
        // targets for the match.
        const target = pm_local_variable_target_node_create(parser, location, name, depth === -1 ? 0 : (depth >>> 0));
        pm_node_list_append(callback_data.match.targets, target);
    }

}

/**
 * Potentially change a =~ with a regular expression with named captures into a
 * match write node. (prism.c:20598)
 */
function parse_regular_expression_named_captures(parser, content, call, extended_mode, shared, base) {
    const callback_data = {
        parser,
        call,
        match: null,
        names: [],
        content,
        shared,
        base
    };

    const error_data = {
        parser,
        start: call.receiver.location.start,
        end: call.receiver.location.end,
        shared,
        base
    };

    pm_regexp_parse(parser, (content || ""), (content ? content.length : 0), extended_mode, parse_regular_expression_named_capture, callback_data, parse_regular_expression_error, error_data);

    if (callback_data.match !== null) {
        return callback_data.match;
    } else {
        return call;
    }
}

/******************************************************************************/
/* Infix expression parsing                                                   */
/******************************************************************************/

// Case labels of prism.c:20956-20965 (the operator-assignment tokens that share
// one arm of the parse_expression_infix switch).
const PARSE_EXPRESSION_INFIX_OPERATOR_EQUAL = new Set([
    PM_TOKEN_AMPERSAND_EQUAL, PM_TOKEN_CARET_EQUAL, PM_TOKEN_GREATER_GREATER_EQUAL,
    PM_TOKEN_LESS_LESS_EQUAL, PM_TOKEN_MINUS_EQUAL, PM_TOKEN_PERCENT_EQUAL,
    PM_TOKEN_PIPE_EQUAL, PM_TOKEN_PLUS_EQUAL, PM_TOKEN_SLASH_EQUAL,
    PM_TOKEN_STAR_EQUAL, PM_TOKEN_STAR_STAR_EQUAL
]);

// Case labels of prism.c:20666-20672 (the pseudo-constant nodes that get a
// dedicated "unwriteable" error on `=`).
const PARSE_EXPRESSION_INFIX_UNWRITEABLE = new Set([
    PM_SOURCE_ENCODING_NODE, PM_FALSE_NODE, PM_SOURCE_FILE_NODE,
    PM_SOURCE_LINE_NODE, PM_NIL_NODE, PM_SELF_NODE, PM_TRUE_NODE
]);

// Descriptors for parse_compound_write's &&=/||=/op= handling below: the
// "expect expression after X" diagnostic id used throughout, the
// diagnostic for a PM_MULTI_WRITE_NODE receiver, the write-node
// constructor to call per receiver-node "family", and how the
// default/unrecognized-receiver case reports its error (&&=/||= use a
// plain token error; the generic operator case uses a formatted one
// anchored to parser.previous with the current token's human-readable
// type name - prism.c:20956-21044 keeps these as three separate, nearly
// identical switches over node.type; this consolidates them into one
// parameterized by which of these three things varies).
const PARSE_COMPOUND_WRITE_AMPAMPEQ = {
    diag_id: PM_ERR_EXPECT_EXPRESSION_AFTER_AMPAMPEQ,
    multi_write_diag_id: PM_ERR_AMPAMPEQ_MULTI_ASSIGN,
    global_variable_create: pm_global_variable_and_write_node_create,
    class_variable_create: pm_class_variable_and_write_node_create,
    constant_path_create: pm_constant_path_and_write_node_create,
    constant_create: pm_constant_and_write_node_create,
    instance_variable_create: pm_instance_variable_and_write_node_create,
    local_variable_create: pm_local_variable_and_write_node_create,
    index_create: pm_index_and_write_node_create,
    call_create: pm_call_and_write_node_create,
    report_default_error: (parser, token) => pm_parser_err_token(parser, token, PM_ERR_EXPECT_EXPRESSION_AFTER_AMPAMPEQ),
};

const PARSE_COMPOUND_WRITE_PIPEPIPEEQ = {
    diag_id: PM_ERR_EXPECT_EXPRESSION_AFTER_PIPEPIPEEQ,
    multi_write_diag_id: PM_ERR_PIPEPIPEEQ_MULTI_ASSIGN,
    global_variable_create: pm_global_variable_or_write_node_create,
    class_variable_create: pm_class_variable_or_write_node_create,
    constant_path_create: pm_constant_path_or_write_node_create,
    constant_create: pm_constant_or_write_node_create,
    instance_variable_create: pm_instance_variable_or_write_node_create,
    local_variable_create: pm_local_variable_or_write_node_create,
    index_create: pm_index_or_write_node_create,
    call_create: pm_call_or_write_node_create,
    report_default_error: (parser, token) => pm_parser_err_token(parser, token, PM_ERR_EXPECT_EXPRESSION_AFTER_PIPEPIPEEQ),
};

const PARSE_COMPOUND_WRITE_OPERATOR = {
    diag_id: PM_ERR_EXPECT_EXPRESSION_AFTER_OPERATOR,
    multi_write_diag_id: PM_ERR_OPERATOR_MULTI_ASSIGN,
    global_variable_create: pm_global_variable_operator_write_node_create,
    class_variable_create: pm_class_variable_operator_write_node_create,
    constant_path_create: pm_constant_path_operator_write_node_create,
    constant_create: pm_constant_operator_write_node_create,
    instance_variable_create: pm_instance_variable_operator_write_node_create,
    local_variable_create: pm_local_variable_operator_write_node_create,
    index_create: pm_index_operator_write_node_create,
    call_create: pm_call_operator_write_node_create,
    report_default_error: (parser, token) => PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.previous, PM_ERR_EXPECT_EXPRESSION_AFTER_OPERATOR, pm_token_type_human(parser.current.type)),
};

// Shared handler for `target &&= value`, `target ||= value`, and
// `target op= value` (op being any of +-*/%**&|^<<>>). The three cases in
// prism.c differ only in the diagnostic ids used and which write-node
// constructor gets called per target-node type; `ops` (one of the
// PARSE_COMPOUND_WRITE_* descriptors above) carries those.
//
// Deviation: the PM_CALL_NODE case's `parser_lex(parser)` call is hoisted
// to run unconditionally at the top (matching the C `op=` arm's structure)
// rather than once per branch (the C `&&=`/`||=` arms' structure) - proven
// equivalent since nothing between the two call sites in either structure
// reads lexer cursor state (`pm_refute_numbered_parameter`/
// `pm_parser_local_add_location` only read the already-captured
// `message_loc` and `parser.source`/`parser.constant_pool`), and confirmed
// via byte-identical output across every operator kind before/after.
function parse_compound_write(parser, node, token, previous_binding_power, binding_power, accepts_command_call, depth, ops) {
    switch (node.type) {
        case PM_BACK_REFERENCE_READ_NODE:
        case PM_NUMBERED_REFERENCE_READ_NODE:
            PM_PARSER_ERR_NODE_FORMAT_CONTENT(parser, node, PM_ERR_WRITE_TARGET_READONLY);
            // PRISM_FALLTHROUGH
        case PM_GLOBAL_VARIABLE_READ_NODE: {
            parser_lex(parser);
            const value = parse_assignment_value(parser, previous_binding_power, binding_power, accepts_command_call, ops.diag_id, depth + 1);
            return ops.global_variable_create(parser, node, token, value);
        }
        case PM_CLASS_VARIABLE_READ_NODE: {
            parser_lex(parser);
            const value = parse_assignment_value(parser, previous_binding_power, binding_power, accepts_command_call, ops.diag_id, depth + 1);
            return ops.class_variable_create(parser, node, token, value);
        }
        case PM_CONSTANT_PATH_NODE: {
            parser_lex(parser);
            const value = parse_assignment_value(parser, previous_binding_power, binding_power, accepts_command_call, ops.diag_id, depth + 1);
            const write = ops.constant_path_create(parser, node, token, value);
            return parse_shareable_constant_write(parser, write);
        }
        case PM_CONSTANT_READ_NODE: {
            parser_lex(parser);
            const value = parse_assignment_value(parser, previous_binding_power, binding_power, accepts_command_call, ops.diag_id, depth + 1);
            const write = ops.constant_create(parser, node, token, value);
            return parse_shareable_constant_write(parser, write);
        }
        case PM_INSTANCE_VARIABLE_READ_NODE: {
            parser_lex(parser);
            const value = parse_assignment_value(parser, previous_binding_power, binding_power, accepts_command_call, ops.diag_id, depth + 1);
            return ops.instance_variable_create(parser, node, token, value);
        }
        case PM_IT_LOCAL_VARIABLE_READ_NODE: {
            const name = pm_parser_local_add_constant(parser, "it", 2);
            parser_lex(parser);

            const value = parse_assignment_value(parser, previous_binding_power, binding_power, accepts_command_call, ops.diag_id, depth + 1);
            const result = ops.local_variable_create(parser, node, token, value, name, 0);

            pm_node_unreference(parser, node);
            return result;
        }
        case PM_LOCAL_VARIABLE_READ_NODE: {
            if (pm_token_is_numbered_parameter(parser.source, node.location.start, node.location.end)) {
                PM_PARSER_ERR_FORMAT(parser, node.location.start, node.location.end, PM_ERR_PARAMETER_NUMBERED_RESERVED, parser.source.slice(node.location.start, node.location.end));
                pm_node_unreference(parser, node);
            }

            parser_lex(parser);

            const value = parse_assignment_value(parser, previous_binding_power, binding_power, accepts_command_call, ops.diag_id, depth + 1);
            return ops.local_variable_create(parser, node, token, value, node.name, node.depth);
        }
        case PM_CALL_NODE: {
            parser_lex(parser);

            // If we have a vcall (a method with no arguments and no
            // receiver that could have been a local variable) then we
            // will transform it into a local variable write.
            if (PM_NODE_FLAG_P(node, PM_CALL_NODE_FLAGS_VARIABLE_CALL)) {
                const message_loc = node.message_loc;
                pm_refute_numbered_parameter(parser, message_loc.start, message_loc.end);

                const constant_id = pm_parser_local_add_location(parser, message_loc.start, message_loc.end, 1);
                const value = parse_assignment_value(parser, previous_binding_power, binding_power, accepts_command_call, ops.diag_id, depth + 1);
                return ops.local_variable_create(parser, node, token, value, constant_id, 0);
            }

            // If there is no call operator and the message is "[]" then
            // this is an aref expression, and we can transform it into
            // an aset expression.
            if (PM_NODE_FLAG_P(node, PM_CALL_NODE_FLAGS_INDEX)) {
                const value = parse_assignment_value(parser, previous_binding_power, binding_power, accepts_command_call, ops.diag_id, depth + 1);
                return ops.index_create(parser, node, token, value);
            }

            // If this node cannot be writable, then we have an error.
            if (pm_call_node_writable_p(parser, node)) {
                node.name = parse_write_name(parser, node.name);
            } else {
                pm_parser_err_node(parser, node, PM_ERR_WRITE_TARGET_UNEXPECTED);
            }

            parse_call_operator_write(parser, node, token);
            const value = parse_assignment_value(parser, previous_binding_power, binding_power, accepts_command_call, ops.diag_id, depth + 1);
            return ops.call_create(parser, node, token, value);
        }
        case PM_MULTI_WRITE_NODE: {
            parser_lex(parser);
            pm_parser_err_token(parser, token, ops.multi_write_diag_id);
            return node;
        }
        default:
            parser_lex(parser);

            // In this case we have a compound-assignment sign, but we don't
            // know what it's for. We need to treat it as an error. For now,
            // we'll mark it as an error and just skip right past it.
            ops.report_default_error(parser, token);
            return node;
    }
}

function parse_expression_infix(parser, node, previous_binding_power, binding_power, accepts_command_call, depth) {
    const token = copyToken(parser.current);

    if (token.type === PM_TOKEN_EQUAL) {
        // PRISM_FALLTHROUGH expansion: in C a PM_CALL_NODE label falls through
        // into the PM_CASE_WRITABLE arm after vcall bookkeeping.
        if (node.type === PM_CALL_NODE) {
            // If we have no arguments to the call node and we need this
            // to be a target then this is either a method call or a
            // local variable write. This _must_ happen before the value
            // is parsed because it could be referenced in the value.
            const call_node = node;
            if (PM_NODE_FLAG_P(call_node, PM_CALL_NODE_FLAGS_VARIABLE_CALL)) {
                pm_parser_local_add_location(parser, call_node.message_loc.start, call_node.message_loc.end, 0);
            }
        }

        if ((node.type === PM_CALL_NODE) || PM_CASE_WRITABLE.has(node.type)) {
            // When we have `it = value`, we need to add `it` as a local
            // variable before parsing the value, in case the value
            // references the variable.
            if (PM_NODE_TYPE_P(node, PM_IT_LOCAL_VARIABLE_READ_NODE)) {
                pm_parser_local_add_location(parser, node.location.start, node.location.end, 0);
            }

            parser_lex(parser);
            const value = parse_assignment_values(parser, previous_binding_power, PM_NODE_TYPE_P(node, PM_MULTI_TARGET_NODE) ? PM_BINDING_POWER_MULTI_ASSIGNMENT + 1 : binding_power, accepts_command_call, PM_ERR_EXPECT_EXPRESSION_AFTER_EQUAL, depth + 1);

            if (PM_NODE_TYPE_P(node, PM_MULTI_TARGET_NODE) && previous_binding_power !== PM_BINDING_POWER_STATEMENT) {
                pm_parser_err_node(parser, node, PM_ERR_UNEXPECTED_MULTI_WRITE);
            }

            return parse_write(parser, node, token, value);
        } else if (node.type === PM_SPLAT_NODE) {
            const multi_target = pm_multi_target_node_create(parser);
            pm_multi_target_node_targets_append(parser, multi_target, node);

            parser_lex(parser);
            const value = parse_assignment_values(parser, previous_binding_power, PM_BINDING_POWER_MULTI_ASSIGNMENT + 1, accepts_command_call, PM_ERR_EXPECT_EXPRESSION_AFTER_EQUAL, depth + 1);
            return parse_write(parser, multi_target, token, value);
        } else if (PARSE_EXPRESSION_INFIX_UNWRITEABLE.has(node.type)) {
            // In these special cases, we have specific error messages
            // and we will replace them with local variable writes.
            parser_lex(parser);
            const value = parse_assignment_values(parser, previous_binding_power, binding_power, accepts_command_call, PM_ERR_EXPECT_EXPRESSION_AFTER_EQUAL, depth + 1);
            return parse_unwriteable_write(parser, node, token, value);
        } else {
            // In this case we have an = sign, but we don't know what
            // it's for. We need to treat it as an error. We'll mark it
            // as an error and skip past it.
            parser_lex(parser);
            pm_parser_err_token(parser, token, PM_ERR_EXPRESSION_NOT_WRITABLE);
            return node;
        }
    } else if (token.type === PM_TOKEN_AMPERSAND_AMPERSAND_EQUAL) {
        return parse_compound_write(parser, node, token, previous_binding_power, binding_power, accepts_command_call, depth, PARSE_COMPOUND_WRITE_AMPAMPEQ);
    } else if (token.type === PM_TOKEN_PIPE_PIPE_EQUAL) {
        return parse_compound_write(parser, node, token, previous_binding_power, binding_power, accepts_command_call, depth, PARSE_COMPOUND_WRITE_PIPEPIPEEQ);
    } else if (PARSE_EXPRESSION_INFIX_OPERATOR_EQUAL.has(token.type)) {
        return parse_compound_write(parser, node, token, previous_binding_power, binding_power, accepts_command_call, depth, PARSE_COMPOUND_WRITE_OPERATOR);
    } else if (token.type === PM_TOKEN_AMPERSAND_AMPERSAND || token.type === PM_TOKEN_KEYWORD_AND) {
        parser_lex(parser);

        const right = parse_expression(parser, binding_power, parser.previous.type === PM_TOKEN_KEYWORD_AND, false, PM_ERR_EXPECT_EXPRESSION_AFTER_OPERATOR, depth + 1);
        return pm_and_node_create(parser, node, token, right);
    } else if (token.type === PM_TOKEN_KEYWORD_OR || token.type === PM_TOKEN_PIPE_PIPE) {
        parser_lex(parser);

        const right = parse_expression(parser, binding_power, parser.previous.type === PM_TOKEN_KEYWORD_OR, false, PM_ERR_EXPECT_EXPRESSION_AFTER_OPERATOR, depth + 1);
        return pm_or_node_create(parser, node, token, right);
    } else if (token.type === PM_TOKEN_EQUAL_TILDE) {
        // Note that we _must_ parse the value before adding the local
        // variables in order to properly mirror the behavior of Ruby. For
        // example,
        //
        //     /(?<foo>bar)/ =~ foo
        //
        // In this case, `foo` should be a method call and not a local yet.
        parser_lex(parser);
        const argument = parse_expression(parser, binding_power, false, false, PM_ERR_EXPECT_EXPRESSION_AFTER_OPERATOR, depth + 1);

        // By default, we're going to create a call node and then return it.
        const call = pm_call_node_binary_create(parser, node, token, argument, 0);
        let result = call;

        // If the receiver of this =~ is a regular expression node, then we
        // need to introduce local variables for it based on its named
        // capture groups.
        if (PM_NODE_TYPE_P(node, PM_INTERPOLATED_REGULAR_EXPRESSION_NODE)) {
            // It's possible to have an interpolated regular expression node
            // that only contains strings. This is because it can be split
            // up by a heredoc. In this case we need to concat the unescaped
            // strings together and then parse them as a regular expression.
            const parts = node.parts;

            let interpolated = false;
            let total_length = 0;

            for (let index = 0; index < parts.length; index++) {
                const part = parts[index];
                if (PM_NODE_TYPE_P(part, PM_STRING_NODE)) {
                    total_length += (part.unescaped ? part.unescaped.length : 0);
                } else {
                    interpolated = true;
                    break;
                }
            }

            if (!interpolated && total_length > 0) {
                // UNI-BUILD: unescaped fields are plain strings; join them.
                let memory = "";
                for (let index = 0; index < parts.length; index++) {
                    memory += parts[index].unescaped || "";
                }

                result = parse_regular_expression_named_captures(parser, memory, call, PM_NODE_FLAG_P(node, PM_REGULAR_EXPRESSION_FLAGS_EXTENDED), false, 0);
            }
        } else if (PM_NODE_TYPE_P(node, PM_REGULAR_EXPRESSION_NODE)) {
            // If we have a regular expression node, then we can just parse
            // the named captures directly off the unescaped string.
            const content = node.unescaped;
            // C checks `content->type == PM_STRING_SHARED`; the lexer records
            // the same distinction on the node.
            const shared = node.unescaped_shared === true;
            result = parse_regular_expression_named_captures(parser, content, call, PM_NODE_FLAG_P(node, PM_REGULAR_EXPRESSION_FLAGS_EXTENDED), shared, shared ? node.content_loc.start : 0);
        }

        return result;
    } else if (
        token.type === PM_TOKEN_UAMPERSAND ||
        token.type === PM_TOKEN_USTAR ||
        token.type === PM_TOKEN_USTAR_STAR ||
        // The only times this will occur are when we are in an error state,
        // but we'll put them in here so that errors can propagate.
        token.type === PM_TOKEN_BANG_EQUAL ||
        token.type === PM_TOKEN_BANG_TILDE ||
        token.type === PM_TOKEN_EQUAL_EQUAL ||
        token.type === PM_TOKEN_EQUAL_EQUAL_EQUAL ||
        token.type === PM_TOKEN_LESS_EQUAL_GREATER ||
        token.type === PM_TOKEN_CARET ||
        token.type === PM_TOKEN_PIPE ||
        token.type === PM_TOKEN_AMPERSAND ||
        token.type === PM_TOKEN_GREATER_GREATER ||
        token.type === PM_TOKEN_LESS_LESS ||
        token.type === PM_TOKEN_MINUS ||
        token.type === PM_TOKEN_PLUS ||
        token.type === PM_TOKEN_PERCENT ||
        token.type === PM_TOKEN_SLASH ||
        token.type === PM_TOKEN_STAR ||
        token.type === PM_TOKEN_STAR_STAR
    ) {
        parser_lex(parser);
        const operator = copyToken(parser.previous);
        switch (node.type) {
            case PM_RESCUE_MODIFIER_NODE: {
                if (PM_NODE_TYPE_P(node.rescue_expression, PM_MATCH_PREDICATE_NODE) || PM_NODE_TYPE_P(node.rescue_expression, PM_MATCH_REQUIRED_NODE)) {
                    PM_PARSER_ERR_TOKEN_FORMAT(parser, operator, PM_ERR_EXPECT_EOL_AFTER_STATEMENT, pm_token_type_human(operator.type));
                }
                break;
            }
            case PM_AND_NODE: {
                if (PM_NODE_TYPE_P(node.right, PM_MATCH_PREDICATE_NODE) || PM_NODE_TYPE_P(node.right, PM_MATCH_REQUIRED_NODE)) {
                    PM_PARSER_ERR_TOKEN_FORMAT(parser, operator, PM_ERR_EXPECT_EOL_AFTER_STATEMENT, pm_token_type_human(operator.type));
                }
                break;
            }
            case PM_OR_NODE: {
                if (PM_NODE_TYPE_P(node.right, PM_MATCH_PREDICATE_NODE) || PM_NODE_TYPE_P(node.right, PM_MATCH_REQUIRED_NODE)) {
                    PM_PARSER_ERR_TOKEN_FORMAT(parser, operator, PM_ERR_EXPECT_EOL_AFTER_STATEMENT, pm_token_type_human(operator.type));
                }
                break;
            }
            default:
                break;
        }

        const argument = parse_expression(parser, binding_power, false, false, PM_ERR_EXPECT_EXPRESSION_AFTER_OPERATOR, depth + 1);
        return pm_call_node_binary_create(parser, node, token, argument, 0);
    } else if (token.type === PM_TOKEN_GREATER || token.type === PM_TOKEN_GREATER_EQUAL || token.type === PM_TOKEN_LESS || token.type === PM_TOKEN_LESS_EQUAL) {
        if (PM_NODE_TYPE_P(node, PM_CALL_NODE) && PM_NODE_FLAG_P(node, PM_CALL_NODE_FLAGS_COMPARISON)) {
            PM_PARSER_WARN_TOKEN_FORMAT_CONTENT(parser, parser.current, PM_WARN_COMPARISON_AFTER_COMPARISON);
        }

        parser_lex(parser);
        const argument = parse_expression(parser, binding_power, false, false, PM_ERR_EXPECT_EXPRESSION_AFTER_OPERATOR, depth + 1);
        return pm_call_node_binary_create(parser, node, token, argument, PM_CALL_NODE_FLAGS_COMPARISON);
    } else if (token.type === PM_TOKEN_AMPERSAND_DOT || token.type === PM_TOKEN_DOT) {
        parser_lex(parser);
        const operator = copyToken(parser.previous);
        const arguments_ = {
                    opening_loc: PM_LOCATION_UNSET,
                    arguments: null,
                    closing_loc: PM_LOCATION_UNSET,
                    block: null,
                    has_forwarding: false
                };

        // This if statement handles the foo.() syntax.
        if (match1(parser, PM_TOKEN_PARENTHESIS_LEFT)) {
            parse_arguments_list(parser, arguments_, true, false, depth + 1);
            return pm_call_node_shorthand_create(parser, node, operator, arguments_);
        }

        switch (node.type) {
            case PM_RESCUE_MODIFIER_NODE: {
                if (PM_NODE_TYPE_P(node.rescue_expression, PM_MATCH_PREDICATE_NODE) || PM_NODE_TYPE_P(node.rescue_expression, PM_MATCH_REQUIRED_NODE)) {
                    PM_PARSER_ERR_TOKEN_FORMAT(parser, operator, PM_ERR_EXPECT_EOL_AFTER_STATEMENT, pm_token_type_human(operator.type));
                }
                break;
            }
            case PM_AND_NODE: {
                if (PM_NODE_TYPE_P(node.right, PM_MATCH_PREDICATE_NODE) || PM_NODE_TYPE_P(node.right, PM_MATCH_REQUIRED_NODE)) {
                    PM_PARSER_ERR_TOKEN_FORMAT(parser, operator, PM_ERR_EXPECT_EOL_AFTER_STATEMENT, pm_token_type_human(operator.type));
                }
                break;
            }
            case PM_OR_NODE: {
                if (PM_NODE_TYPE_P(node.right, PM_MATCH_PREDICATE_NODE) || PM_NODE_TYPE_P(node.right, PM_MATCH_REQUIRED_NODE)) {
                    PM_PARSER_ERR_TOKEN_FORMAT(parser, operator, PM_ERR_EXPECT_EOL_AFTER_STATEMENT, pm_token_type_human(operator.type));
                }
                break;
            }
            default:
                break;
        }

        let message;

        if (
            PM_CASE_OPERATOR.has(parser.current.type) ||
            PM_CASE_KEYWORD.has(parser.current.type) ||
            parser.current.type === PM_TOKEN_CONSTANT ||
            parser.current.type === PM_TOKEN_IDENTIFIER ||
            parser.current.type === PM_TOKEN_METHOD_NAME
        ) {
            parser_lex(parser);
            message = copyToken(parser.previous);
        } else {
            PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, PM_ERR_EXPECT_MESSAGE, pm_token_type_human(parser.current.type));
            message = { type: PM_TOKEN_MISSING, start: parser.previous.end, end: parser.previous.end };
        }

        parse_arguments_list(parser, arguments_, true, accepts_command_call, depth + 1);
        const call = pm_call_node_call_create(parser, node, operator, message, arguments_);

        if (
            (previous_binding_power === PM_BINDING_POWER_STATEMENT) &&
            arguments_.arguments === null &&
            arguments_.opening_loc.start === null &&
            match1(parser, PM_TOKEN_COMMA)
        ) {
            return parse_targets_validate(parser, call, PM_BINDING_POWER_INDEX, depth + 1);
        } else {
            return call;
        }
    } else if (token.type === PM_TOKEN_DOT_DOT || token.type === PM_TOKEN_DOT_DOT_DOT) {
        parser_lex(parser);

        let right = null;
        if (token_begins_expression_p(parser.current.type)) {
            right = parse_expression(parser, binding_power, false, false, PM_ERR_EXPECT_EXPRESSION_AFTER_OPERATOR, depth + 1);
        }

        return pm_range_node_create(parser, node, token, right);
    } else if (token.type === PM_TOKEN_KEYWORD_IF_MODIFIER) {
        const keyword = copyToken(parser.current);
        parser_lex(parser);

        const predicate = parse_value_expression(parser, binding_power, true, false, PM_ERR_CONDITIONAL_IF_PREDICATE, depth + 1);
        return pm_if_node_modifier_create(parser, node, keyword, predicate);
    } else if (token.type === PM_TOKEN_KEYWORD_UNLESS_MODIFIER) {
        const keyword = copyToken(parser.current);
        parser_lex(parser);

        const predicate = parse_value_expression(parser, binding_power, true, false, PM_ERR_CONDITIONAL_UNLESS_PREDICATE, depth + 1);
        return pm_unless_node_modifier_create(parser, node, keyword, predicate);
    } else if (token.type === PM_TOKEN_KEYWORD_UNTIL_MODIFIER) {
        parser_lex(parser);
        const statements = pm_statements_node_create(parser);
        pm_statements_node_body_append(parser, statements, node, true);

        const predicate = parse_value_expression(parser, binding_power, true, false, PM_ERR_CONDITIONAL_UNTIL_PREDICATE, depth + 1);
        return pm_until_node_modifier_create(parser, token, predicate, statements, PM_NODE_TYPE_P(node, PM_BEGIN_NODE) ? PM_LOOP_FLAGS_BEGIN_MODIFIER : 0);
    } else if (token.type === PM_TOKEN_KEYWORD_WHILE_MODIFIER) {
        parser_lex(parser);
        const statements = pm_statements_node_create(parser);
        pm_statements_node_body_append(parser, statements, node, true);

        const predicate = parse_value_expression(parser, binding_power, true, false, PM_ERR_CONDITIONAL_WHILE_PREDICATE, depth + 1);
        return pm_while_node_modifier_create(parser, token, predicate, statements, PM_NODE_TYPE_P(node, PM_BEGIN_NODE) ? PM_LOOP_FLAGS_BEGIN_MODIFIER : 0);
    } else if (token.type === PM_TOKEN_QUESTION_MARK) {
        context_push(parser, PM_CONTEXT_TERNARY);
        const current_block_exits = [];
        const previous_block_exits = push_block_exits(parser, current_block_exits);

        const qmark = copyToken(parser.current);
        parser_lex(parser);

        const true_expression = parse_expression(parser, PM_BINDING_POWER_DEFINED, false, false, PM_ERR_TERNARY_EXPRESSION_TRUE, depth + 1);

        if (parser.recovering) {
            // If parsing the true expression of this ternary resulted in a syntax
            // error that we can recover from, then we're going to put missing nodes
            // and tokens into the remaining places. We want to be sure to do this
            // before the `expect` function call to make sure it doesn't
            // accidentally move past a ':' token that occurs after the syntax
            // error.
            const colon = { type: PM_TOKEN_MISSING, start: parser.previous.end, end: parser.previous.end };
            const false_expression = pm_missing_node_create(parser, colon.start, colon.end);

            context_pop(parser);
            pop_block_exits(parser, previous_block_exits);

            return pm_if_node_ternary_create(parser, node, qmark, true_expression, colon, false_expression);
        }

        accept1(parser, PM_TOKEN_NEWLINE);
        expect1(parser, PM_TOKEN_COLON, PM_ERR_TERNARY_COLON);

        const colon = copyToken(parser.previous);
        const false_expression = parse_expression(parser, PM_BINDING_POWER_DEFINED, false, false, PM_ERR_TERNARY_EXPRESSION_FALSE, depth + 1);

        context_pop(parser);
        pop_block_exits(parser, previous_block_exits);

        return pm_if_node_ternary_create(parser, node, qmark, true_expression, colon, false_expression);
    } else if (token.type === PM_TOKEN_COLON_COLON) {
        parser_lex(parser);
        const delimiter = copyToken(parser.previous);

        if (parser.current.type === PM_TOKEN_CONSTANT) {
            parser_lex(parser);
            let path;

            if (
                (parser.current.type === PM_TOKEN_PARENTHESIS_LEFT) ||
                (accepts_command_call && (token_begins_expression_p(parser.current.type) || match3(parser, PM_TOKEN_UAMPERSAND, PM_TOKEN_USTAR, PM_TOKEN_USTAR_STAR)))
            ) {
                // If we have a constant immediately following a '::' operator, then
                // this can either be a constant path or a method call, depending on
                // what follows the constant.
                //
                // If we have parentheses, then this is a method call. That would
                // look like Foo::Bar().
                const message = copyToken(parser.previous);
                const arguments_ = {
                    opening_loc: PM_LOCATION_UNSET,
                    arguments: null,
                    closing_loc: PM_LOCATION_UNSET,
                    block: null,
                    has_forwarding: false
                };

                parse_arguments_list(parser, arguments_, true, accepts_command_call, depth + 1);
                path = pm_call_node_call_create(parser, node, delimiter, message, arguments_);
            } else {
                // Otherwise, this is a constant path. That would look like Foo::Bar.
                path = pm_constant_path_node_create(parser, node, delimiter, parser.previous);
            }

            // If this is followed by a comma then it is a multiple assignment.
            if (previous_binding_power === PM_BINDING_POWER_STATEMENT && match1(parser, PM_TOKEN_COMMA)) {
                return parse_targets_validate(parser, path, PM_BINDING_POWER_INDEX, depth + 1);
            }

            return path;
        } else if (
            PM_CASE_OPERATOR.has(parser.current.type) ||
            PM_CASE_KEYWORD.has(parser.current.type) ||
            parser.current.type === PM_TOKEN_IDENTIFIER ||
            parser.current.type === PM_TOKEN_METHOD_NAME
        ) {
            parser_lex(parser);
            const message = copyToken(parser.previous);

            // If we have an identifier following a '::' operator, then it is for
            // sure a method call.
            const arguments_ = {
                    opening_loc: PM_LOCATION_UNSET,
                    arguments: null,
                    closing_loc: PM_LOCATION_UNSET,
                    block: null,
                    has_forwarding: false
                };
            parse_arguments_list(parser, arguments_, true, accepts_command_call, depth + 1);
            const call = pm_call_node_call_create(parser, node, delimiter, message, arguments_);

            // If this is followed by a comma then it is a multiple assignment.
            if (previous_binding_power === PM_BINDING_POWER_STATEMENT && match1(parser, PM_TOKEN_COMMA)) {
                return parse_targets_validate(parser, call, PM_BINDING_POWER_INDEX, depth + 1);
            }

            return call;
        } else if (parser.current.type === PM_TOKEN_PARENTHESIS_LEFT) {
            // If we have a parenthesis following a '::' operator, then it is the
            // method call shorthand. That would look like Foo::(bar).
            const arguments_ = {
                    opening_loc: PM_LOCATION_UNSET,
                    arguments: null,
                    closing_loc: PM_LOCATION_UNSET,
                    block: null,
                    has_forwarding: false
                };
            parse_arguments_list(parser, arguments_, true, false, depth + 1);

            return pm_call_node_shorthand_create(parser, node, delimiter, arguments_);
        } else {
            expect1(parser, PM_TOKEN_CONSTANT, PM_ERR_CONSTANT_PATH_COLON_COLON_CONSTANT);
            return pm_constant_path_node_create(parser, node, delimiter, parser.previous);
        }
    } else if (token.type === PM_TOKEN_KEYWORD_RESCUE_MODIFIER) {
        context_push(parser, PM_CONTEXT_RESCUE_MODIFIER);
        parser_lex(parser);
        accept1(parser, PM_TOKEN_NEWLINE);

        const value = parse_expression(parser, binding_power, true, false, PM_ERR_RESCUE_MODIFIER_VALUE, depth + 1);
        context_pop(parser);

        return pm_rescue_modifier_node_create(parser, node, token, value);
    } else if (token.type === PM_TOKEN_BRACKET_LEFT) {
        parser_lex(parser);

        const arguments_ = {
                    opening_loc: PM_LOCATION_UNSET,
                    arguments: null,
                    closing_loc: PM_LOCATION_UNSET,
                    block: null,
                    has_forwarding: false
                };
        arguments_.opening_loc = { start: parser.previous.start, end: parser.previous.end };

        if (!accept1(parser, PM_TOKEN_BRACKET_RIGHT)) {
            pm_accepts_block_stack_push(parser, true);
            parse_arguments(parser, arguments_, false, PM_TOKEN_BRACKET_RIGHT, depth + 1);
            pm_accepts_block_stack_pop(parser);
            expect1(parser, PM_TOKEN_BRACKET_RIGHT, PM_ERR_EXPECT_RBRACKET);
        }

        arguments_.closing_loc = { start: parser.previous.start, end: parser.previous.end };

        // If we have a comma after the closing bracket then this is a multiple
        // assignment and we should parse the targets.
        if (previous_binding_power === PM_BINDING_POWER_STATEMENT && match1(parser, PM_TOKEN_COMMA)) {
            const aref = pm_call_node_aref_create(parser, node, arguments_);
            return parse_targets_validate(parser, aref, PM_BINDING_POWER_INDEX, depth + 1);
        }

        // If we're at the end of the arguments, we can now check if there is a
        // block node that starts with a {. If there is, then we can parse it and
        // add it to the arguments.
        let block = null;
        if (accept1(parser, PM_TOKEN_BRACE_LEFT)) {
            block = parse_block(parser, depth + 1);
            pm_arguments_validate_block(parser, arguments_, block);
        } else if (pm_accepts_block_stack_p(parser) && accept1(parser, PM_TOKEN_KEYWORD_DO)) {
            block = parse_block(parser, depth + 1);
        }

        if (block !== null) {
            if (arguments_.block !== null) {
                pm_parser_err_node(parser, block, PM_ERR_ARGUMENT_AFTER_BLOCK);
                if (arguments_.arguments === null) {
                    arguments_.arguments = pm_arguments_node_create(parser);
                }
                pm_arguments_node_arguments_append(arguments_.arguments, arguments_.block);
            }

            arguments_.block = block;
        }

        return pm_call_node_aref_create(parser, node, arguments_);
    } else if (token.type === PM_TOKEN_KEYWORD_IN) {
        const previous_pattern_matching_newlines = parser.pattern_matching_newlines;
        parser.pattern_matching_newlines = true;

        const operator = copyToken(parser.current);
        parser.command_start = false;
        lex_state_set(parser, PM_LEX_STATE_BEG | PM_LEX_STATE_LABEL);
        parser_lex(parser);

        const captures = [];
        const pattern = parse_pattern(parser, captures, PM_PARSE_PATTERN_TOP | PM_PARSE_PATTERN_MULTI, PM_ERR_PATTERN_EXPRESSION_AFTER_IN, depth + 1);

        parser.pattern_matching_newlines = previous_pattern_matching_newlines;

        return pm_match_predicate_node_create(parser, node, pattern, operator);
    } else if (token.type === PM_TOKEN_EQUAL_GREATER) {
        const previous_pattern_matching_newlines = parser.pattern_matching_newlines;
        parser.pattern_matching_newlines = true;

        const operator = copyToken(parser.current);
        parser.command_start = false;
        lex_state_set(parser, PM_LEX_STATE_BEG | PM_LEX_STATE_LABEL);
        parser_lex(parser);

        const captures = [];
        const pattern = parse_pattern(parser, captures, PM_PARSE_PATTERN_TOP | PM_PARSE_PATTERN_MULTI, PM_ERR_PATTERN_EXPRESSION_AFTER_HROCKET, depth + 1);

        parser.pattern_matching_newlines = previous_pattern_matching_newlines;

        return pm_match_required_node_create(parser, node, pattern, operator);
    } else {
        // assert(false && "unreachable") in C; debug-only.
        return null;
    }
}

/**
 * Determine if a given call node looks like a "command", which means it has
 * arguments but does not have parentheses. (prism.c:21565)
 */
function pm_call_node_command_p(node) {
    return (
        (node.opening_loc.start === null) &&
        (node.block === null || PM_NODE_TYPE_P(node.block, PM_BLOCK_ARGUMENT_NODE)) &&
        (node.arguments !== null || node.block !== null)
    );
}

/**
 * Parse an expression at the given point of the parser using the given binding
 * power to parse subsequent chains. If this function finds a syntax error, it
 * will append the error message to the parser's error list.
 *
 * Consumers of this function should always check parser->recovering to
 * determine if they need to perform additional cleanup. (prism.c:21582)
 */
function parse_expression(parser, binding_power, accepts_command_call, accepts_label, diag_id, depth) {
    if (depth >= PRISM_DEPTH_MAXIMUM) {
        pm_parser_err_current(parser, PM_ERR_NESTING_TOO_DEEP);
        return pm_missing_node_create(parser, parser.current.start, parser.current.end);
    }

    let node = parse_expression_prefix(parser, binding_power, accepts_command_call, accepts_label, diag_id, depth);

    switch (node.type) {
        case PM_MISSING_NODE:
            // If we found a syntax error, then the type of node returned by
            // parse_expression_prefix is going to be a missing node.
            return node;
        case PM_PRE_EXECUTION_NODE:
        case PM_POST_EXECUTION_NODE:
        case PM_ALIAS_GLOBAL_VARIABLE_NODE:
        case PM_ALIAS_METHOD_NODE:
        case PM_MULTI_WRITE_NODE:
        case PM_UNDEF_NODE:
            // These expressions are statements, and cannot be followed by
            // operators (except modifiers).
            if (pm_binding_powers[parser.current.type].left > PM_BINDING_POWER_MODIFIER) {
                return node;
            }
            break;
        case PM_CALL_NODE:
            // If we have a call node, then we need to check if it looks like a
            // method call without parentheses that contains arguments. If it
            // does, then it has different rules for parsing infix operators,
            // namely that it only accepts composition (and/or) and modifiers
            // (if/unless/etc.).
            if ((pm_binding_powers[parser.current.type].left > PM_BINDING_POWER_COMPOSITION) && pm_call_node_command_p(node)) {
                return node;
            }
            break;
        case PM_SYMBOL_NODE:
            // If we have a symbol node that is being parsed as a label, then we
            // need to immediately return, because there should never be an
            // infix operator following this node.
            if (pm_symbol_node_label_p(parser, node)) {
                return node;
            }
            break;
        default:
            break;
    }

    // Otherwise we'll look and see if the next token can be parsed as an infix
    // operator. If it can, then we'll parse it using parse_expression_infix.
    let current_binding_powers;
    let current_token_type;

    while (
        (
            current_token_type = parser.current.type,
            current_binding_powers = pm_binding_powers[current_token_type],
            binding_power <= current_binding_powers.left &&
            current_binding_powers.binary
        )
     ) {
        node = parse_expression_infix(parser, node, binding_power, current_binding_powers.right, accepts_command_call, depth + 1);

        if (context_terminator(parser.current_context.context, parser.current)) {
            // If this token terminates the current context, then we need to
            // stop parsing the expression, as it has become a statement.
            return node;
        }

        switch (node.type) {
            case PM_MULTI_WRITE_NODE:
                // Multi-write nodes are statements, and cannot be followed by
                // operators except modifiers.
                if (pm_binding_powers[parser.current.type].left > PM_BINDING_POWER_MODIFIER) {
                    return node;
                }
                break;
            case PM_CLASS_VARIABLE_WRITE_NODE:
            case PM_CONSTANT_PATH_WRITE_NODE:
            case PM_CONSTANT_WRITE_NODE:
            case PM_GLOBAL_VARIABLE_WRITE_NODE:
            case PM_INSTANCE_VARIABLE_WRITE_NODE:
            case PM_LOCAL_VARIABLE_WRITE_NODE:
                // These expressions are statements, by virtue of the right-hand
                // side of their write being an implicit array.
                if (PM_NODE_FLAG_P(node, PM_WRITE_NODE_FLAGS_IMPLICIT_ARRAY) && pm_binding_powers[parser.current.type].left > PM_BINDING_POWER_MODIFIER) {
                    return node;
                }
                break;
            case PM_CALL_NODE:
                // These expressions are also statements, by virtue of the
                // right-hand side of the expression (i.e., the last argument to
                // the call node) being an implicit array.
                if (PM_NODE_FLAG_P(node, PM_CALL_NODE_FLAGS_IMPLICIT_ARRAY) && pm_binding_powers[parser.current.type].left > PM_BINDING_POWER_MODIFIER) {
                    return node;
                }
                break;
            default:
                break;
        }

        // If the operator is nonassoc and we should not be able to parse the
        // upcoming infix operator, break.
        if (current_binding_powers.nonassoc) {
            // If this is a non-assoc operator and we are about to parse the
            // exact same operator, then we need to add an error.
            if (match1(parser, current_token_type)) {
                PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, PM_ERR_NON_ASSOCIATIVE_OPERATOR, pm_token_type_human(parser.current.type), pm_token_type_human(current_token_type));
                break;
            }

            // If this is an endless range, then we need to reject a couple of
            // additional operators because it violates the normal operator
            // precedence rules. Those patterns are:
            //
            //     1.. & 2
            //     1.. * 2
            //
            if (PM_NODE_TYPE_P(node, PM_RANGE_NODE) && node.right === null) {
                if (match4(parser, PM_TOKEN_UAMPERSAND, PM_TOKEN_USTAR, PM_TOKEN_DOT, PM_TOKEN_AMPERSAND_DOT)) {
                    PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, PM_ERR_NON_ASSOCIATIVE_OPERATOR, pm_token_type_human(parser.current.type), pm_token_type_human(current_token_type));
                    break;
                }

                if (PM_BINDING_POWER_TERM <= pm_binding_powers[parser.current.type].left) {
                    break;
                }
            } else if (current_binding_powers.left <= pm_binding_powers[parser.current.type].left) {
                break;
            }
        }

        if (accepts_command_call) {
            // A command-style method call is only accepted on method chains.
            // Thus, we check whether the parsed node can continue method chains.
            // The method chain can continue if the parsed node is one of the following five kinds:
            // (1) index access: foo[1]
            // (2) attribute access: foo.bar
            // (3) method call with parenthesis: foo.bar(1)
            // (4) method call with a block: foo.bar do end
            // (5) constant path: foo::Bar
            switch (node.type) {
                case PM_CALL_NODE: {
                    if (
                        // (1) foo[1]
                        !(
                            node.call_operator_loc.start === null &&
                            node.message_loc.start !== null &&
                            (parser.source.charCodeAt(node.message_loc.start)) === 91 /* '[' */ &&
                            (parser.source.charCodeAt(node.message_loc.end - 1)) === 93 /* ']' */
                        ) &&
                        // (2) foo.bar
                        !(
                            node.call_operator_loc.start !== null &&
                            node.arguments === null &&
                            node.block === null &&
                            node.opening_loc.start === null
                        ) &&
                        // (3) foo.bar(1)
                        !(
                            node.call_operator_loc.start !== null &&
                            node.opening_loc.start !== null
                        ) &&
                        // (4) foo.bar do end
                        !(
                            node.block !== null && PM_NODE_TYPE_P(node.block, PM_BLOCK_NODE)
                        )
                     ) {
                        accepts_command_call = false;
                    }
                    break;
                }
                // (5) foo::Bar
                case PM_CONSTANT_PATH_NODE:
                    break;
                default:
                    accepts_command_call = false;
                    break;
            }
        }
    }

    return node;
}

/**
 * ruby -p, ruby -n, ruby -a, and ruby -l options will mutate the AST. We
 * perform that mutation here. (prism.c:21770)
 */
function wrap_statements(parser, statements) {
    if (PM_PARSER_COMMAND_LINE_OPTION_P(parser)) {
        if (statements === null) {
            statements = pm_statements_node_create(parser);
        }

        const arguments_ = pm_arguments_node_create(parser);
        pm_arguments_node_arguments_append(
            arguments_,
            pm_global_variable_read_node_synthesized_create(parser, pm_parser_constant_id_constant(parser, "$_", 2))
        );

        pm_statements_node_body_append(parser, statements, pm_call_node_fcall_synthesized_create(
            parser,
            arguments_,
            pm_parser_constant_id_constant(parser, "print", 5)
        ), true);
    }

    if (PM_PARSER_COMMAND_LINE_OPTION_N(parser)) {
        if (PM_PARSER_COMMAND_LINE_OPTION_A(parser)) {
            if (statements === null) {
                statements = pm_statements_node_create(parser);
            }

            const arguments_ = pm_arguments_node_create(parser);
            pm_arguments_node_arguments_append(
                arguments_,
                pm_global_variable_read_node_synthesized_create(parser, pm_parser_constant_id_constant(parser, "$;", 2))
            );

            const receiver = pm_global_variable_read_node_synthesized_create(parser, pm_parser_constant_id_constant(parser, "$_", 2));
            const call = pm_call_node_call_synthesized_create(parser, receiver, "split", arguments_);

            const write = pm_global_variable_write_node_synthesized_create(
                parser,
                pm_parser_constant_id_constant(parser, "$F", 2),
                call
            );

            pm_statements_node_body_prepend(statements, write);
        }

        const arguments_ = pm_arguments_node_create(parser);
        pm_arguments_node_arguments_append(
            arguments_,
            pm_global_variable_read_node_synthesized_create(parser, pm_parser_constant_id_constant(parser, "$/", 2))
        );

        if (PM_PARSER_COMMAND_LINE_OPTION_L(parser)) {
            const keywords = pm_keyword_hash_node_create(parser);
            pm_keyword_hash_node_elements_append(keywords, pm_assoc_node_create(
                parser,
                pm_symbol_node_synthesized_create(parser, "chomp"),
                { type: PM_TOKEN_NOT_PROVIDED, start: parser.start, end: parser.start },
                pm_true_node_synthesized_create(parser)
            ));

            pm_arguments_node_arguments_append(arguments_, keywords);
            pm_node_flag_set(arguments_, PM_ARGUMENTS_NODE_FLAGS_CONTAINS_KEYWORDS);
        }

        const wrapped_statements = pm_statements_node_create(parser);
        pm_statements_node_body_append(parser, wrapped_statements, pm_while_node_synthesized_create(
            parser,
            pm_call_node_fcall_synthesized_create(parser, arguments_, pm_parser_constant_id_constant(parser, "gets", 4)),
            statements
        ), true);

        statements = wrapped_statements;
    }

    return statements;
}

/**
 * Parse the top-level program node. (prism.c:21849)
 */
function parse_program(parser) {
    // If the current scope is NULL, then we want to push a new top level scope.
    // The current scope could exist in the event that we are parsing an eval
    // and the user has passed into scopes that already exist.
    if (parser.current_scope === null) {
        pm_parser_scope_push(parser, true);
    }

    const current_block_exits = [];
    const previous_block_exits = push_block_exits(parser, current_block_exits);

    parser_lex(parser);
    let statements = parse_statements(parser, PM_CONTEXT_MAIN, 0);

    if (statements !== null && !parser.parsing_eval) {
        // If we have statements, then the top-level statement should be
        // explicitly checked as well. We have to do this here because
        // everywhere else we check all but the last statement.
        pm_void_statement_check(parser, statements.body[statements.body.length - 1]);
    }

    const locals = pm_locals_order(parser, parser.current_scope.locals, true);
    pm_parser_scope_pop(parser);

    // At the top level, see if we need to wrap the statements in a program
    // node with a while loop based on the options.
    if (parser.command_line & (PM_OPTIONS_COMMAND_LINE_P | PM_OPTIONS_COMMAND_LINE_N)) {
        statements = wrap_statements(parser, statements);
    } else {
        flush_block_exits(parser, previous_block_exits);
    }


    // If this is an empty file, then we're still going to parse all of the
    // statements in order to gather up all of the comments and such. Here we'll
    // correct the location information.
    if (statements === null) {
        statements = pm_statements_node_create(parser);
        pm_statements_node_location_set(statements, parser.start, parser.start);
    }

    return pm_program_node_create(parser, locals, statements);
}

/******************************************************************************/
/* External functions                                                         */
/******************************************************************************/

/**
 * A vendored version of strnstr that is used to find a substring within a
 * string with a given length. This function is used to search for the Ruby
 * engine name within a shebang when the -x option is passed to Ruby.
 *
 * The only modification that we made here is that we don't do NULL byte checks
 * because we know the little parameter will not have a NULL byte and we allow
 * the big parameter to have them.
 *
 * Adaptation: `big` is the buffer and `big_start` the offset the search starts
 * at (C passed a pointer into parser.source). Returns the offset of the match
 * or -1 for NULL. (prism.c:21910)
 */
function pm_strnstr(big, big_start, little, big_length) {
    // The first occurrence of `little` at or after `big_start` counts only if
    // it ends within the window; later occurrences end further right, so one
    // indexOf probes the whole space.
    const index = big.indexOf(little, big_start);
    return (index !== -1 && index + little.length <= big_start + big_length) ? index : -1;
}

/**
 * Potentially warn the user if the shebang that has been found to include
 * "ruby" has a carriage return at the end, as that can cause problems on some
 * platforms.
 *
 * (The _WIN32 variant of this macro is a no-op in C; this port follows the
 * POSIX version.) (prism.c:21929)
 */
function pm_parser_warn_shebang_carriage_return(parser, start, length) {
    if (length > 2 && parser.source[start + length - 2] === '\r' && parser.source[start + length - 1] === '\n') {
        pm_parser_warn(parser, start, start + length, PM_WARN_SHEBANG_CARRIAGE_RETURN);
    }
}

// Copy of part3's parser_lex_magic_comment_encoding_value with an explicit
// buffer: option encodings are standalone pm_string_t buffers whose bytes are
// not offsets into parser.source. Logic is identical.
function pm_parser_init_set_encoding_value(parser, encoding_source, encoding_length) {
    const encoding = pm_encoding_find(encoding_source, 0, encoding_length);

    if (encoding !== null) {
        if (parser.encoding !== encoding) {
            parser.encoding = encoding;
        }

        // UNI-BUILD: see parser_lex_magic_comment_encoding_value.
        const declared = String(encoding_source).slice(0, encoding_length);
        parser.source_encoding_family = pm_encoding_family(declared);
        parser.encoding_comment_name = pm_encoding_canonical_name(declared) ?? parser.encoding_comment_name;

        return true;
    }

    return false;
}

/**
 * Process the shebang when initializing the parser. This function assumes that
 * the shebang_callback option has already been checked for nullability.
 *
 * Adaptation: `engine` is an offset into parser.source; the callback receives
 * (next_options, start_offset, length, data). (prism.c:21941)
 */
function pm_parser_init_shebang(parser, options, engine, length) {
    const switches = pm_strnstr(parser.source, engine, " -", length);
    if (switches === -1) return;

    // pm_options_t next_options = *options; (struct copy in C; shallow is
    // correct here — the port's option fields are strings/numbers)
    const next_options = { ...options };
    options.shebang_callback(
        next_options,
        switches + 1,
        length - (switches - engine) - 1,
        options.shebang_callback_data
    );

    const encoding_source = next_options.encoding || "";
    if (encoding_source.length > 0) {
        pm_parser_init_set_encoding_value(parser, encoding_source, encoding_source.length);
    }

    parser.command_line = next_options.command_line;
    parser.frozen_string_literal = next_options.frozen_string_literal;
}

/**
 * Initialize a parser with the given start and end pointers.
 *
 * Adaptation: `source` is the Uint8Array of the whole input, stored as
 * parser.source; parser.start is 0 and parser.end is size. (prism.c:21967)
 */
function pm_parser_init(parser, source, size, options) {
    // *parser = (pm_parser_t) { ... }; (field-by-field in C declaration/init order)
    parser.node_id = 0;
    parser.lex_state = PM_LEX_STATE_BEG;
    parser.enclosure_nesting = 0;
    parser.lambda_enclosure_nesting = -1;
    parser.brace_nesting = 0;
    parser.do_loop_stack = 0;
    parser.accepts_block_stack = 0;
    const initial_lex_mode = { mode: PM_LEX_DEFAULT, as: {} };
    parser.lex_modes = { stack: [initial_lex_mode], current: initial_lex_mode };
    parser.source = source; // extra field per conventions: the whole input
    parser.start = 0;
    parser.end = size;
    parser.previous = { type: PM_TOKEN_EOF, start: 0, end: 0 };
    parser.current = { type: PM_TOKEN_EOF, start: 0, end: 0 };
    parser.next_start = null;
    parser.heredoc_end = null;
    parser.data_loc = { start: null, end: null };
    parser.comment_list = [];
    parser.magic_comment_list = [];
    parser.warning_list = [];
    parser.error_list = [];
    parser.current_scope = null;
    parser.current_context = null;
    parser.current_hash_keys = null;
    parser.encoding = PM_ENCODING_UTF_8_ENTRY;
    // UNI-BUILD: the encoding model is collapsed - `parser.encoding` is one
    // shared entry regardless of the source's declared encoding. A few
    // spots still need to know the *family* of that declared encoding
    // (whether a `\xNN` byte escape forces a string/symbol/regexp to UTF-8,
    // ASCII-8BIT, or its own encoding depends on it - see
    // parse_unescaped_encoding / parse_symbol_encoding). Track just that
    // here: "utf8" | "us-ascii" | "other", defaulting to UTF-8.
    parser.source_encoding_family = "utf8";
    // UNI-BUILD: the canonical name of the source's declared encoding (magic
    // comment or `encoding:` option), for the Ruby bridge to report as
    // Prism::Result#encoding. Mirrors the real library serializing
    // parser->encoding->name. Defaults to UTF-8.
    parser.encoding_comment_name = "UTF-8";
    parser.encoding_comment_start = 0;
    parser.lex_callback = null;
    parser.filepath = "";
    parser.constant_pool = {};
    parser.newline_list = {};
    parser.integer_base = 0;
    // A FRESH empty string object here (C copies the PM_STRING_EMPTY struct
    // value); do not alias the shared singleton that part2/part3 rebind.
    parser.current_string = "";
    parser.current_string_shared = true;
    parser.start_line = 1;
    parser.explicit_encoding = null;
    parser.version = PM_OPTIONS_VERSION_UNSET; // zero-initialized in C
    parser.command_line = 0;
    parser.parsing_eval = false;
    parser.partial_script = false;
    parser.command_start = true;
    parser.recovering = false;
    parser.encoding_locked = false;
    parser.pattern_matching_newlines = false;
    parser.in_keyword_arg = false;
    parser.current_block_exits = null;
    parser.semantic_token_seen = false;
    parser.frozen_string_literal = PM_OPTIONS_FROZEN_STRING_LITERAL_UNSET;
    parser.current_regular_expression_ascii_only = false;
    parser.warn_mismatched_indentation = true;

    // Initialize the constant pool. We're going to completely guess as to the
    // number of constants that we'll need based on the size of the input. The
    // ratio we chose here is actually less arbitrary than you might think.
    //
    // We took ~50K Ruby files and measured the size of the file versus the
    // number of constants that were found in those files. Then we found the
    // average and standard deviation of the ratios of constants/bytesize. Then
    // we added 1.34 standard deviations to the average to get a ratio that
    // would fit 75% of the files (for a two-tailed distribution). This works
    // because there was about a 0.77 correlation and the distribution was
    // roughly normal.
    //
    // This ratio will need to change if we add more constants to the constant
    // pool for another node type.
    const constant_size = (size / 95) | 0;
    pm_constant_pool_init(parser.constant_pool, constant_size < 4 ? 4 : constant_size);

    // Initialize the newline list. Similar to the constant pool, we're going to
    // guess at the number of newlines that we'll need based on the size of the
    // input.
    const newline_size = (size / 22) | 0;
    pm_newline_list_init(parser.newline_list, 0, newline_size < 4 ? 4 : newline_size);

    // If options were provided to this parse, establish them here.
    if (options !== null) {
        // filepath option — keep as a plain JS string in this port. C does
        // a pm_string_t struct copy here; in JS it is just a string, so a
        // missing/non-string filepath means "no filepath", i.e. "" (the
        // default set above) rather than `{...undefined}` === `{}`, which
        // would later stringify to the literal "[object Object]".
        parser.filepath = typeof options.filepath === "string" ? options.filepath : parser.filepath;

        // line option
        if (options.line !== undefined) parser.start_line = options.line;

        // encoding option
        const encoding_source = options.encoding || "";
        if (encoding_source.length > 0) {
            pm_parser_init_set_encoding_value(parser, encoding_source, encoding_source.length);
        }

        // In C `options` is a fully zero-initialized struct, so every field
        // always holds a valid value; a JS `options` object can be partial
        // (e.g. cmd.js builds one with only the fields the caller supplied),
        // so coalesce each missing field back to the parser default set
        // above rather than overwriting it with `undefined` - notably,
        // `parser.version = undefined` makes every `parser.version >= X`
        // check silently false and skips the UNSET->LATEST promotion below.

        // encoding_locked option
        parser.encoding_locked = options.encoding_locked ?? parser.encoding_locked;

        // frozen_string_literal option
        parser.frozen_string_literal = options.frozen_string_literal ?? parser.frozen_string_literal;

        // command_line option
        parser.command_line = options.command_line ?? parser.command_line;

        // version option
        parser.version = options.version ?? parser.version;

        // partial_script
        parser.partial_script = options.partial_script ?? parser.partial_script;

        // scopes option
        parser.parsing_eval = options.scopes_count > 0;
        if (parser.parsing_eval) parser.warn_mismatched_indentation = false;

        for (let scope_index = 0; scope_index < options.scopes_count; scope_index++) {
            const scope = pm_options_scope_get(options, scope_index);
            pm_parser_scope_push(parser, scope_index === 0);

            // Scopes given from the outside are not allowed to have numbered
            // parameters.
            parser.current_scope.parameters = scope.forwarding | PM_SCOPE_PARAMETERS_IMPLICIT_DISALLOWED;

            for (let local_index = 0; local_index < scope.locals_count; local_index++) {
                const local = pm_options_scope_local_get(scope, local_index);

                const local_text = local || "";
                pm_parser_local_add_owned(parser, local_text, local_text.length);
            }
        }
    }

    // Now that we have established the user-provided options, check if
    // a version was given and parse as the latest version otherwise.
    if (parser.version === PM_OPTIONS_VERSION_UNSET) {
        parser.version = PM_OPTIONS_VERSION_LATEST;
    }

    pm_accepts_block_stack_push(parser, true);

    // Skip past the UTF-8 BOM if it exists.
    // UNI-BUILD: the C check reads the three UTF-8 bytes of the BOM; here the
    // BOM is a single code unit (U+FEFF), so detection uses startsWith and the
    // skip is one unit wide.
    if (source.startsWith("\uFEFF")) {
        parser.current.end += 1;
        parser.encoding_comment_start += 1;

        // UNI-BUILD: C re-points the encoding at UTF-8 when the BOM is found
        // and the encoding differs; the encoding is always the UTF-8-emulating
        // entry here, so there is nothing to change.
    }

    // If the -x command line flag is set, or the first shebang of the file does
    // not include "ruby", then we'll search for a shebang that does include
    // "ruby" and start parsing from there.
    let search_shebang = PM_PARSER_COMMAND_LINE_OPTION_X(parser);

    // If the first two bytes of the source are a shebang, then we will do a bit
    // of extra processing.
    //
    // First, we'll indicate that the encoding comment is at the end of the
    // shebang. This means that when a shebang is present the encoding comment
    // can begin on the second line.
    //
    // Second, we will check if the shebang includes "ruby". If it does, then we
    // we will start parsing from there. We will also potentially warning the
    // user if there is a carriage return at the end of the shebang. We will
    // also potentially call the shebang callback if this is the main script to
    // allow the caller to parse the shebang and find any command-line options.
    // If the shebang does not include "ruby" and this is the main script being
    // parsed, then we will start searching the file for a shebang that does
    // contain "ruby" as if -x were passed on the command line.
    let newline = next_newline(source, parser.current.end, parser.end - parser.current.end);
    const length = (newline !== -1 ? newline : parser.end) - parser.current.end;

    if (length > 2 && parser.source[parser.current.end] === '#' && parser.source[parser.current.end + 1] === '!') {
        let engine;

        if ((engine = pm_strnstr(parser.source, 0, "ruby", length)) !== -1) {
            if (newline !== -1) {
                parser.encoding_comment_start = newline + 1;

                if (options === null || options.main_script) {
                    pm_parser_warn_shebang_carriage_return(parser, 0, length + 1);
                }
            }

            if (options !== null && options.main_script && options.shebang_callback != null) {
                pm_parser_init_shebang(parser, options, engine, length - engine);
            }

            search_shebang = false;
        } else if (options !== null && options.main_script && !parser.parsing_eval) {
            search_shebang = true;
        }
    }

    // Here we're going to find the first shebang that includes "ruby" and start
    // parsing from there.
    if (search_shebang) {
        // If a shebang that includes "ruby" is not found, then we're going to a
        // a load error to the list of errors on the parser.
        let found_shebang = false;

        // This is going to point to the start of each line as we check it.
        // We'll maintain a moving window looking at each line at they come.
        let cursor = parser.start;

        // The newline pointer points to the end of the current line that we're
        // considering. If it is NULL, then we're at the end of the file.
        newline = next_newline(source, cursor, parser.end - cursor);

        while (newline !== -1) {
            pm_newline_list_append(parser.newline_list, newline);

            cursor = newline + 1;
            newline = next_newline(source, cursor, parser.end - cursor);

            const line_length = (newline !== -1 ? newline : parser.end) - cursor;
            if (line_length > 2 && parser.source[cursor] === '#' && parser.source[cursor + 1] === '!') {
                let engine;
                if ((engine = pm_strnstr(parser.source, cursor, "ruby", line_length)) !== -1) {
                    found_shebang = true;

                    if (newline !== -1) {
                        pm_parser_warn_shebang_carriage_return(parser, cursor, line_length + 1);
                        parser.encoding_comment_start = newline + 1;
                    }

                    if (options !== null && options.shebang_callback != null) {
                        pm_parser_init_shebang(parser, options, engine, line_length - (engine - cursor));
                    }

                    break;
                }
            }
        }

        if (found_shebang) {
            parser.previous = { type: PM_TOKEN_EOF, start: cursor, end: cursor };
            parser.current = { type: PM_TOKEN_EOF, start: cursor, end: cursor };
        } else {
            pm_parser_err(parser, parser.start, parser.start, PM_ERR_SCRIPT_NOT_FOUND);
            pm_newline_list_clear(parser.newline_list);
        }
    }

    // The encoding comment can start after any amount of inline whitespace, so
    // here we'll advance it to the first non-inline-whitespace character so
    // that it is ready for future comparisons.
    // parser->encoding_comment_start += pm_strspn_inline_whitespace(...)
    parser.encoding_comment_start += pm_strspn_inline_whitespace(parser.source, parser.encoding_comment_start, parser.end - parser.encoding_comment_start);
}

/**
 * Register a callback that will be called whenever prism changes the encoding
 * it is using to parse based on the magic comment. (prism.c:22228)
 */
function pm_parser_register_encoding_changed_callback(parser, callback) {
    parser.encoding_changed_callback = callback;
}

/**
 * Parse the Ruby source associated with the given parser and return the tree.
 * (prism.c:22292)
 */
function pm_parse(parser) {
    return parse_program(parser);
}

// ---------------------------------------------------------------------------
// Restored public query/success APIs (lost in an earlier over-consumption)
// ---------------------------------------------------------------------------


// The category of slice returned from pm_slice_type. (prism.c:22523 enum —
// these were lost when the query APIs were restored; only the functions came
// back.)
const PM_SLICE_TYPE_ERROR = -1;
const PM_SLICE_TYPE_NONE = 0;
const PM_SLICE_TYPE_LOCAL = 1;
const PM_SLICE_TYPE_CONSTANT = 2;
const PM_SLICE_TYPE_METHOD_NAME = 3;



function pm_slice_type(source, length, encoding_name) {
    // first, get the right encoding object
    // UNI-BUILD: pm_encoding_find ignores its arguments and returns the single
    // UTF-8-emulating entry, so the C byte-encoding of the name is unnecessary.
    const encoding = pm_encoding_find(encoding_name, 0, encoding_name.length);
    if (encoding === null) return PM_SLICE_TYPE_ERROR;

    // check that there is at least one character
    if (length === 0) return PM_SLICE_TYPE_NONE;

    const end = length;
    let width;
    let offset = 0;

    if ((width = encoding.alpha_char(source, offset, length)) !== 0) {
        // valid because alphabetical
    } else if (source[offset] === '_') {
        // valid because underscore
        width = 1;
    } else if (((source.charCodeAt(offset) || 0) >= 0x80) && ((width = encoding.char_width(source, offset, length)) > 0)) {
        // valid because multibyte
    } else {
        // invalid because no match
        return PM_SLICE_TYPE_NONE;
    }

    // determine the type of the slice based on the first character
    let result = encoding.isupper_char(source, 0, end) ? PM_SLICE_TYPE_CONSTANT : PM_SLICE_TYPE_LOCAL;

    // next, iterate through all of the bytes of the string to ensure that they
    // are all valid identifier characters
    offset += width;

    while (offset < end) {
        if ((width = encoding.alnum_char(source, offset, end - offset)) !== 0) {
            // valid because alphanumeric
            offset += width;
        } else if (source[offset] === '_') {
            // valid because underscore
            offset++;
        } else if (((source.charCodeAt(offset) || 0) >= 0x80) && ((width = encoding.char_width(source, offset, end - offset)) > 0)) {
            // valid because multibyte
            offset += width;
        } else {
            // invalid because no match
            break;
        }
    }

    // accept a ! or ? at the end of the slice as a method name
    // (in C this reads the byte at source[end] when the whole slice was
    // consumed, i.e. the caller's terminator; an out-of-bounds read in JS
    // yields undefined, which compares false like a NUL terminator)
    if ((source[offset] === '!') || (source[offset] === '?') || (source[offset] === '=')) {
        offset++;
        result = PM_SLICE_TYPE_METHOD_NAME;
    }

    // valid if we are at the end of the slice
    return offset === end ? result : PM_SLICE_TYPE_NONE;
}

/**
 * Check that the slice is a valid local variable name. (prism.c:22603)
 */


/**
 * Check that the slice is a valid constant name. (prism.c:22623)
 */


// #define B(p)
function pm_string_query_method_name_b(p) {
    return p ? PM_STRING_QUERY_TRUE : PM_STRING_QUERY_FALSE;
}

// #define C1(c): (*source == c)
// C compares the first `length` code units against fixed operator spellings
// (memcmp macros); in JS the same checks are set/some lookups.
const PM_UNARY_METHOD_CHARS = new Set(["&", "`", "!", "^", ">", "<", "-", "%", "|", "+", "/", "*", "~"]);
const PM_BINARY_METHOD_NAMES = ["!=", "!~", "[]", "==", "=~", ">=", ">>", "<=", "<<", "**"];
const PM_TERNARY_METHOD_NAMES = ["===", "<=>", "[]="];

/**
 * Check that the slice is a valid method name. (prism.c:22643)
 */



function pm_string_query_local(source, length, encoding_name) {
    switch (pm_slice_type(source, length, encoding_name)) {
        case PM_SLICE_TYPE_ERROR:
            return PM_STRING_QUERY_ERROR;
        case PM_SLICE_TYPE_NONE:
        case PM_SLICE_TYPE_CONSTANT:
        case PM_SLICE_TYPE_METHOD_NAME:
            return PM_STRING_QUERY_FALSE;
        case PM_SLICE_TYPE_LOCAL:
            return PM_STRING_QUERY_TRUE;
    }

    // assert(false && "unreachable") in C; debug-only.
    return PM_STRING_QUERY_FALSE;
}

function pm_string_query_constant(source, length, encoding_name) {
    switch (pm_slice_type(source, length, encoding_name)) {
        case PM_SLICE_TYPE_ERROR:
            return PM_STRING_QUERY_ERROR;
        case PM_SLICE_TYPE_NONE:
        case PM_SLICE_TYPE_LOCAL:
        case PM_SLICE_TYPE_METHOD_NAME:
            return PM_STRING_QUERY_FALSE;
        case PM_SLICE_TYPE_CONSTANT:
            return PM_STRING_QUERY_TRUE;
    }

    // assert(false && "unreachable") in C; debug-only.
    return PM_STRING_QUERY_FALSE;
}

function pm_string_query_method_name(source, length, encoding_name) {
    switch (pm_slice_type(source, length, encoding_name)) {
        case PM_SLICE_TYPE_ERROR:
            return PM_STRING_QUERY_ERROR;
        case PM_SLICE_TYPE_NONE:
            break;
        case PM_SLICE_TYPE_LOCAL:
            // numbered parameters are not valid method names
            return pm_string_query_method_name_b((length !== 2) || (source[0] !== '_') || (source[1] === '0') || !pm_char_is_decimal_digit((source.charCodeAt(1) || 0)));
        case PM_SLICE_TYPE_CONSTANT:
            // all constants are valid method names
        case PM_SLICE_TYPE_METHOD_NAME:
            // all method names are valid method names
            return PM_STRING_QUERY_TRUE;
    }

    switch (length) {
        case 1:
            return pm_string_query_method_name_b(PM_UNARY_METHOD_CHARS.has(source[0]));
        case 2:
            return pm_string_query_method_name_b(PM_BINARY_METHOD_NAMES.some((s) => source.startsWith(s)));
        case 3:
            return pm_string_query_method_name_b(PM_TERNARY_METHOD_NAMES.some((s) => source.startsWith(s)));
        default:
            return PM_STRING_QUERY_FALSE;
    }
}

export {
  pm_version, FL, PM_NODE_START, PM_NODE_END, PM_LOCATION_NULL_VALUE, PM_LOCATION_NODE_VALUE,
  copyToken, pm_constant_id_list_copy, pm_operator_token_id, PM_OPTIONAL_LOCATION_TOKEN_VALUE, lex_mode_incrementor, lex_mode_terminator,
  lex_mode_push, lex_mode_push_list, lex_mode_push_list_eof, lex_mode_push_regexp, lex_mode_push_string, lex_mode_push_string_eof,
  lex_mode_pop, lex_state_p, lex_state_ignored_p, lex_state_beg_p, lex_state_arg_p, lex_state_spcarg_p,
  lex_state_end_p, lex_state_operator_p, lex_state_set, PM_PARSER_COMMAND_LINE_OPTION, PM_PARSER_COMMAND_LINE_OPTION_A, PM_PARSER_COMMAND_LINE_OPTION_E,
  PM_PARSER_COMMAND_LINE_OPTION_L, PM_PARSER_COMMAND_LINE_OPTION_N, PM_PARSER_COMMAND_LINE_OPTION_P, PM_PARSER_COMMAND_LINE_OPTION_X, pm_parser_err, PM_PARSER_ERR_FORMAT,
  pm_parser_err_current, PM_PARSER_ERR_LOCATION_FORMAT, pm_parser_err_node, PM_PARSER_ERR_NODE_FORMAT, PM_PARSER_ERR_NODE_FORMAT_CONTENT, pm_parser_err_previous,
  pm_parser_err_token, PM_PARSER_ERR_TOKEN_FORMAT, PM_PARSER_ERR_TOKEN_FORMAT_CONTENT, pm_parser_warn, pm_parser_warn_token, pm_parser_warn_node,
  PM_PARSER_WARN_FORMAT, PM_PARSER_WARN_TOKEN_FORMAT, PM_PARSER_WARN_TOKEN_FORMAT_CONTENT, PM_PARSER_WARN_NODE_FORMAT, pm_parser_err_heredoc_term, pm_parser_scope_push,
  pm_parser_scope_toplevel_p, pm_parser_scope_find, pm_parser_scope_forwarding_param_check, pm_parser_scope_forwarding_block_check, pm_parser_scope_forwarding_positionals_check, pm_parser_scope_forwarding_all_check,
  pm_parser_scope_forwarding_keywords_check, pm_parser_scope_shareable_constant_get, pm_parser_scope_shareable_constant_set, pm_locals_write, pm_locals_read, pm_locals_unread,
  pm_locals_reads, pm_locals_order, pm_parser_constant_id_location, pm_parser_constant_id_owned, pm_parser_constant_id_constant, pm_parser_constant_id_token,
  pm_parser_optional_constant_id_token, pm_check_value_expression, pm_assert_value_expression, pm_void_statement_check, pm_void_statements_check, pm_parser_warn_conditional_predicate_literal,
  pm_conditional_predicate_warn_write_literal_p, pm_conditional_predicate_warn_write_literal, pm_conditional_predicate, not_provided, pm_arguments_end, pm_arguments_validate_block,
  char_is_identifier_start, char_is_identifier_utf8, char_is_identifier, char_is_global_name_punctuation, token_is_setter_name, pm_local_is_keyword,
  pm_node_flag_set, pm_node_flag_unset, pm_node_flag_set_repeated_parameter, pm_regular_expression_flags_create, PM_NODE_TYPE_P, PM_NODE_FLAG_P,
  pm_missing_node_create, pm_alias_global_variable_node_create, pm_alias_method_node_create, pm_alternation_pattern_node_create, pm_and_node_create, pm_arguments_node_create,
  pm_arguments_node_size, pm_arguments_node_arguments_append, pm_array_node_create, pm_array_node_elements_append, pm_array_node_close_set, pm_array_pattern_node_node_list_create,
  pm_array_pattern_node_rest_create, pm_array_pattern_node_constant_create, pm_array_pattern_node_empty_create, pm_array_pattern_node_requireds_append, pm_assoc_node_create, pm_assoc_splat_node_create,
  pm_back_reference_read_node_create, pm_begin_node_create, pm_begin_node_rescue_clause_set, pm_begin_node_else_clause_set, pm_begin_node_ensure_clause_set, pm_begin_node_end_keyword_set,
  pm_block_argument_node_create, pm_block_node_create, pm_block_parameter_node_create, pm_block_parameters_node_create, pm_block_parameters_node_closing_set, pm_block_local_variable_node_create,
  pm_block_parameters_node_append_local, pm_break_node_create, parse_operator_symbol_name, pm_call_node_create, pm_call_node_ignore_visibility_flag, pm_call_node_aref_create,
  pm_call_node_binary_create, pm_call_node_call_create, pm_call_node_call_synthesized_create, pm_call_node_fcall_create, pm_call_node_fcall_synthesized_create, pm_call_node_not_create,
  pm_call_node_shorthand_create, pm_call_node_unary_create, pm_call_node_variable_call_create, pm_call_node_writable_p, pm_call_write_read_name_init, pm_index_arguments_check,
  pm_call_write_node_create, pm_call_and_write_node_create, pm_call_operator_write_node_create, pm_call_or_write_node_create, pm_index_write_node_create, pm_index_and_write_node_create,
  pm_index_operator_write_node_create, pm_index_or_write_node_create, pm_call_target_node_create, pm_index_target_node_create, pm_capture_pattern_node_create, pm_case_node_create,
  pm_case_node_condition_append, pm_case_node_else_clause_set, pm_case_node_end_keyword_loc_set, pm_case_match_node_create, pm_case_match_node_condition_append, pm_case_match_node_else_clause_set,
  pm_case_match_node_end_keyword_loc_set, pm_class_node_create, pm_name_write_node_create, pm_class_variable_and_write_node_create, pm_class_variable_operator_write_node_create, pm_class_variable_or_write_node_create,
  pm_class_variable_read_node_create, pm_implicit_array_write_flags, pm_class_variable_write_node_create, pm_constant_path_and_or_operator_write_node_create, pm_constant_path_and_write_node_create, pm_constant_path_operator_write_node_create,
  pm_constant_path_or_write_node_create, pm_constant_path_node_create, pm_constant_path_write_node_create, pm_constant_and_write_node_create, pm_constant_operator_write_node_create, pm_constant_or_write_node_create,
  pm_constant_read_node_create, pm_constant_write_node_create, pm_def_node_receiver_check, pm_def_node_create, pm_defined_node_create, pm_else_node_create,
  pm_embedded_statements_node_create, pm_embedded_variable_node_create, pm_ensure_node_create, pm_false_node_create, pm_find_pattern_node_create, pm_double_parse,
  pm_float_node_create, pm_float_node_imaginary_create, pm_float_node_rational_create, pm_float_node_rational_imaginary_create, pm_for_node_create, pm_forwarding_arguments_node_create,
  pm_forwarding_parameter_node_create, pm_forwarding_super_node_create, pm_hash_pattern_node_empty_create, pm_hash_pattern_node_node_list_create, pm_global_variable_write_name, pm_global_variable_and_write_node_create,
  pm_global_variable_operator_write_node_create, pm_global_variable_or_write_node_create, pm_global_variable_read_node_create, pm_global_variable_read_node_synthesized_create, pm_global_variable_write_node_create, pm_global_variable_write_node_synthesized_create,
  pm_hash_node_create, pm_hash_node_elements_append, pm_hash_node_closing_loc_set, pm_if_node_create, pm_if_node_modifier_create, pm_if_node_ternary_create,
  pm_if_node_end_keyword_loc_set, pm_else_node_end_keyword_loc_set, pm_implicit_node_create, pm_implicit_rest_node_create, pm_integer_node_create, pm_integer_node_imaginary_create,
  pm_integer_node_rational_create, pm_integer_node_rational_imaginary_create, pm_in_node_create, pm_instance_variable_and_write_node_create, pm_instance_variable_operator_write_node_create, pm_instance_variable_or_write_node_create,
  pm_instance_variable_read_node_create, pm_instance_variable_write_node_create, pm_interpolated_node_append, pm_interpolated_regular_expression_node_create, pm_interpolated_regular_expression_node_append, pm_interpolated_regular_expression_node_closing_set,
  pm_interpolated_string_node_append_clear_flags, pm_interpolated_string_node_append_mutable_flags, pm_interpolated_string_node_append, pm_interpolated_string_node_create, pm_interpolated_string_node_closing_set, pm_interpolated_symbol_node_append,
  pm_interpolated_symbol_node_closing_loc_set, pm_interpolated_symbol_node_create, pm_interpolated_xstring_node_create, pm_interpolated_xstring_node_append, pm_interpolated_xstring_node_closing_set, pm_it_local_variable_read_node_create,
  pm_it_parameters_node_create, pm_keyword_hash_node_create, pm_keyword_hash_node_elements_append, pm_required_keyword_parameter_node_create, pm_optional_keyword_parameter_node_create, pm_keyword_rest_parameter_node_create,
  pm_lambda_node_create, pm_local_variable_and_or_operator_write_node_create, pm_local_variable_and_write_node_create, pm_local_variable_operator_write_node_create, pm_local_variable_or_write_node_create, pm_local_variable_read_node_create_constant_id,
  pm_local_variable_read_node_create, pm_local_variable_read_node_missing_create, pm_local_variable_write_node_create, pm_token_is_it, pm_token_is_numbered_parameter, pm_refute_numbered_parameter,
  pm_local_variable_target_node_create, pm_match_predicate_node_create, pm_match_required_node_create, pm_match_write_node_create, pm_module_node_create, pm_multi_target_node_create,
  pm_multi_target_node_targets_append, pm_multi_target_node_opening_set, pm_multi_target_node_closing_set, pm_multi_write_node_create, pm_next_node_create, pm_nil_node_create,
  pm_no_keywords_parameter_node_create, pm_numbered_parameters_node_create, pm_numbered_reference_read_node_number, pm_numbered_reference_read_node_create, pm_optional_parameter_node_create, pm_or_node_create,
  pm_parameters_node_create, pm_parameters_node_location_set, pm_parameters_node_requireds_append, pm_parameters_node_optionals_append, pm_parameters_node_posts_append, pm_parameters_node_rest_set,
  pm_parameters_node_keywords_append, pm_parameters_node_keyword_rest_set, pm_parameters_node_block_set, pm_program_node_create, pm_parentheses_node_create, pm_pinned_expression_node_create,
  pm_pinned_variable_node_create, pm_post_execution_node_create, pm_pre_execution_node_create, pm_range_node_create, pm_redo_node_create, pm_regular_expression_node_create_unescaped,
  pm_regular_expression_node_create, pm_required_parameter_node_create, pm_rescue_modifier_node_create, pm_rescue_node_create, pm_rescue_node_operator_set, pm_rescue_node_reference_set,
  pm_rescue_node_statements_set, pm_rescue_node_subsequent_set, pm_rescue_node_exceptions_append, pm_rest_parameter_node_create, pm_retry_node_create, pm_return_node_create,
  pm_self_node_create, pm_shareable_constant_node_create, pm_singleton_class_node_create, pm_source_encoding_node_create, pm_source_file_node_create, pm_source_line_node_create,
  pm_splat_node_create, pm_statements_node_create, pm_statements_node_body_length, pm_statements_node_location_set, pm_statements_node_body_update, pm_statements_node_body_append,
  pm_statements_node_body_prepend, pm_string_node_create_unescaped, pm_string_node_create, pm_string_node_create_current_string, pm_super_node_create, pm_ascii_only_p,
  parse_symbol_encoding_validate_utf8, parse_symbol_encoding_validate_other, parse_symbol_encoding, parse_and_validate_regular_expression_encoding_modifier, parse_and_validate_regular_expression_encoding, pm_symbol_node_create_unescaped,
  pm_symbol_node_create, pm_symbol_node_create_current_string, pm_symbol_node_label_create, pm_symbol_node_synthesized_create, pm_symbol_node_label_p, pm_string_node_to_symbol_node,
  pm_symbol_node_to_string_node, pm_true_node_create, pm_true_node_synthesized_create, pm_undef_node_create, pm_undef_node_append, pm_unless_node_create,
  pm_unless_node_modifier_create, pm_unless_node_end_keyword_loc_set, pm_loop_modifier_block_exits, pm_until_node_create, pm_until_node_modifier_create, pm_when_node_create,
  pm_when_node_conditions_append, pm_when_node_then_keyword_loc_set, pm_when_node_statements_set, pm_while_node_create, pm_while_node_modifier_create, pm_while_node_synthesized_create,
  pm_xstring_node_create_unescaped, pm_xstring_node_create, pm_yield_node_create, pm_parser_local_depth_constant_id, pm_parser_local_depth, pm_parser_local_add,
  pm_parser_local_add_location, pm_parser_local_add_token, pm_parser_local_add_owned, pm_parser_local_add_constant, pm_parser_parameter_name_check, pm_parser_scope_pop,
  pm_state_stack_push, pm_state_stack_pop, pm_state_stack_p, pm_accepts_block_stack_push, pm_accepts_block_stack_pop, pm_accepts_block_stack_p,
  pm_do_loop_stack_push, pm_do_loop_stack_pop, pm_do_loop_stack_p, peek_at, peek_offset, peek,
  match, match_eol_at, match_eol_offset, match_eol, next_newline, ambiguous_operator_p,
  parser_lex_magic_comment_encoding_value, parser_lex_magic_comment_encoding, parser_lex_magic_comment_boolean_value, pm_char_is_magic_comment_key_delimiter, parser_lex_magic_comment_emacs_marker, parser_lex_magic_comment,
  context_terminator, context_recoverable, context_push, context_pop, context_p, context_def_p,
  context_human, pm_strspn_number_validate, pm_strspn_binary_number_validate, pm_strspn_octal_number_validate, pm_strspn_decimal_number_validate, pm_strspn_hexadecimal_number_validate,
  lex_optional_float_suffix, lex_numeric_prefix, lex_numeric, lex_global_variable, lex_keyword, lex_identifier,
  current_token_starts_line, lex_interpolation, char_is_ascii_printable, escape_hexadecimal_digit, escape_unicode, escape_byte,
  escape_write_unicode, escape_write_byte_encoded, escape_write_byte, escape_write_escape_encoded, escape_read_warn, escape_read_control,
  escape_read, lex_question_mark, lex_at_variable, parser_lex_callback, parser_comment, lex_embdoc,
  parser_lex_ignored_newline, parser_flush_heredoc_end, parser_end_of_line_p, pm_token_buffer_push_byte, pm_regexp_token_buffer_push_byte, parser_char_width,
  pm_token_buffer_push_escaped_into, pm_token_buffer_push_escaped, pm_regexp_token_buffer_push_escaped, pm_slice_ascii_only_p, pm_token_buffer_copy, pm_regexp_token_buffer_copy,
  pm_token_buffer_flush, pm_regexp_token_buffer_flush, pm_token_buffer_escape_range, pm_token_buffer_escape, pm_regexp_token_buffer_escape, pm_heredoc_strspn_inline_whitespace,
  pm_lex_percent_delimiter, source_bytes_equal, setToken, lex_breakpoint_is_terminator, lex_token_start, parser_lex,
  BINDING_POWER_ASSIGNMENT, LEFT_ASSOCIATIVE, RIGHT_ASSOCIATIVE, NON_ASSOCIATIVE, RIGHT_ASSOCIATIVE_UNARY, match1,
  match2, match3, match4, match7, match8, accept1,
  accept2, expect1, expect2, expect1_heredoc_term, expect1_opening, parse_value_expression,
  token_begins_expression_p, parse_starred_expression, pm_node_unreference_each, pm_node_unreference, parse_write_name, parse_unwriteable_target,
  call_is_write_target, parse_target, parse_target_validate, parse_shareable_constant_write, parse_write, parse_unwriteable_write,
  parse_targets, parse_targets_validate, parse_statements, pm_static_literals_zeroed, pm_hash_key_static_literals_add, pm_when_clause_static_literals_add,
  parse_assocs, argument_allowed_for_bare_hash, parse_arguments_append, parse_arguments, parse_required_destructured_parameter, update_parameter_state,
  parse_parameters, token_newline_index, token_column, parser_warn_indentation_mismatch, parse_rescues, parse_rescues_implicit_begin,
  parse_block_parameters, outer_scope_using_numbered_parameters_p, parse_blocklike_parameters, parse_block, parse_arguments_list, parse_return,
  parse_block_exit, push_block_exits, flush_block_exits, pop_block_exits, parse_predicate, parse_conditional,
  parse_unescaped_encoding, parse_string_part, parse_operator_symbol, parse_symbol, parse_undef_argument, parse_alias_argument,
  parse_variable, parse_variable_call, parse_method_definition_name, parse_heredoc_dedent_string, parse_heredoc_dedent, parse_strings_empty_content,
  parse_strings, parse_pattern_capture, parse_pattern_constant_path, parse_pattern_rest, parse_pattern_keyword_rest, pm_slice_is_valid_local,
  parse_pattern_hash_implicit_value, parse_pattern_hash_key, parse_pattern_hash, parse_pattern_primitive, parse_pattern_alternation_error_each, parse_pattern_alternation_error,
  parse_pattern_primitives, parse_pattern, parse_negative_numeric, pm_parser_err_prefix, parse_retry, parse_yield,
  parse_regular_expression_error, parse_regular_expression_errors, parse_percent_list_closing, parse_percent_list_plain, parse_percent_list_embedded, parse_percent_list_interpolated,
  parse_expression_prefix, parse_assignment_value, parse_assignment_value_local, parse_assignment_values, parse_call_operator_write, pm_named_capture_merge_continuation,
  pm_named_capture_escape_hex, pm_named_capture_escape_octal, pm_named_capture_escape_unicode_value, pm_named_capture_escape_unicode, pm_named_capture_escape, pm_slice_is_valid_local_bytes,
  parse_regular_expression_named_capture, parse_regular_expression_named_captures, parse_compound_write, parse_expression_infix, pm_call_node_command_p, parse_expression,
  wrap_statements, parse_program, pm_strnstr, pm_parser_warn_shebang_carriage_return, pm_parser_init_set_encoding_value, pm_parser_init_shebang,
  pm_parser_init, pm_parser_register_encoding_changed_callback, pm_parse, pm_slice_type, pm_string_query_method_name_b, pm_string_query_local,
  pm_string_query_constant, pm_string_query_method_name, PRISM_VERSION, PM_TAB_WHITESPACE_SIZE, PM_LOCATION_UNSET, PM_IGNORED_NEWLINE_NONE,
  PM_IGNORED_NEWLINE_ALL, PM_IGNORED_NEWLINE_PATTERN, PM_SCOPE_FORWARDING_PARAM_CHECK_RESULT_PASS, PM_SCOPE_FORWARDING_PARAM_CHECK_RESULT_CONFLICT, PM_SCOPE_FORWARDING_PARAM_CHECK_RESULT_FAIL, PM_VOID_STATEMENT_OPERATOR_NAMES,
  PM_CONDITIONAL_PREDICATE_TYPE_CONDITIONAL, PM_CONDITIONAL_PREDICATE_TYPE_FLIP_FLOP, PM_CONDITIONAL_PREDICATE_TYPE_NOT, PM_GLOBAL_NAME_PUNCTUATION, PM_LOCAL_KEYWORDS, PM_WRITE_NODE_FLAGS_IMPLICIT_ARRAY,
  PM_CALL_NODE_FLAGS_IMPLICIT_ARRAY, PM_CALL_NODE_FLAGS_COMPARISON, PM_CALL_NODE_FLAGS_INDEX, INTEGER_BASE_BY_FLAG, NTH_REF_MAX, MAGIC_COMMENT_CODING_BYTES,
  MAGIC_COMMENT_ENCODING_BYTES, MAGIC_COMMENT_TRUE_BYTES, MAGIC_COMMENT_FALSE_BYTES, MAGIC_COMMENT_WARN_INDENT_BYTES, MAGIC_COMMENT_FROZEN_STRING_LITERAL_BYTES, MAGIC_COMMENT_SHAREABLE_CONSTANT_VALUE_BYTES,
  MAGIC_COMMENT_NONE_BYTES, MAGIC_COMMENT_LITERAL_BYTES, MAGIC_COMMENT_EXPERIMENTAL_EVERYTHING_BYTES, MAGIC_COMMENT_EXPERIMENTAL_COPY_BYTES, PM_MAGIC_COMMENT_BOOLEAN_VALUE_TRUE, PM_MAGIC_COMMENT_BOOLEAN_VALUE_FALSE,
  PM_MAGIC_COMMENT_BOOLEAN_VALUE_INVALID, context_terminators, PM_ESCAPE_FLAG_NONE, PM_ESCAPE_FLAG_CONTROL, PM_ESCAPE_FLAG_META, PM_ESCAPE_FLAG_SINGLE,
  PM_ESCAPE_FLAG_REGEXP, ascii_printable_chars, PM_TOKEN_BUFFER_DEFAULT_SIZE, PM_BINDING_POWER_UNSET, PM_BINDING_POWER_STATEMENT, PM_BINDING_POWER_MODIFIER_RESCUE,
  PM_BINDING_POWER_MODIFIER, PM_BINDING_POWER_COMPOSITION, PM_BINDING_POWER_NOT, PM_BINDING_POWER_MATCH, PM_BINDING_POWER_DEFINED, PM_BINDING_POWER_MULTI_ASSIGNMENT,
  PM_BINDING_POWER_ASSIGNMENT, PM_BINDING_POWER_TERNARY, PM_BINDING_POWER_RANGE, PM_BINDING_POWER_LOGICAL_OR, PM_BINDING_POWER_LOGICAL_AND, PM_BINDING_POWER_EQUALITY,
  PM_BINDING_POWER_COMPARISON, PM_BINDING_POWER_BITWISE_OR, PM_BINDING_POWER_BITWISE_AND, PM_BINDING_POWER_SHIFT, PM_BINDING_POWER_TERM, PM_BINDING_POWER_FACTOR,
  PM_BINDING_POWER_UMINUS, PM_BINDING_POWER_EXPONENT, PM_BINDING_POWER_UNARY, PM_BINDING_POWER_INDEX, PM_BINDING_POWER_CALL, PM_BINDING_POWER_MAX,
  PM_BINDING_POWER_UNSET_ENTRY, pm_binding_powers, PM_PARAMETERS_NO_CHANGE, PM_PARAMETERS_ORDER_NOTHING_AFTER, PM_PARAMETERS_ORDER_KEYWORDS_REST, PM_PARAMETERS_ORDER_KEYWORDS,
  PM_PARAMETERS_ORDER_REST, PM_PARAMETERS_ORDER_AFTER_OPTIONAL, PM_PARAMETERS_ORDER_OPTIONAL, PM_PARAMETERS_ORDER_NAMED, PM_PARAMETERS_ORDER_NONE, parameters_ordering,
  PM_RESCUES_BEGIN, PM_RESCUES_BLOCK, PM_RESCUES_CLASS, PM_RESCUES_DEF, PM_RESCUES_LAMBDA, PM_RESCUES_MODULE,
  PM_RESCUES_SCLASS, pm_numbered_parameter_names, PARSE_RETURN_CONTEXTS_CONTINUE, PARSE_RETURN_CONTEXTS_SCLASS, PARSE_RETURN_CONTEXTS_INVALID, PARSE_BLOCK_EXIT_CONTEXTS_GOOD,
  PARSE_BLOCK_EXIT_CONTEXTS_BAD, PM_CASE_KEYWORD, PM_CASE_OPERATOR, PM_CASE_PRIMITIVE, PM_CASE_PARAMETER, PM_CASE_WRITABLE,
  PM_PARSE_PATTERN_SINGLE, PM_PARSE_PATTERN_TOP, PM_PARSE_PATTERN_MULTI, PM_PIN_OPERAND_NODE_CREATE, PARSE_RETRY_CONTEXTS_GOOD, PARSE_RETRY_CONTEXTS_BAD,
  PARSE_RETRY_CONTEXTS_ELSE, PARSE_RETRY_CONTEXTS_ENSURE, PARSE_YIELD_CONTEXTS_GOOD, PARSE_YIELD_CONTEXTS_BAD, PRISM_DEPTH_MAXIMUM, PRISM_VERSION_MAJOR,
  PRISM_VERSION_MINOR, PRISM_VERSION_PATCH, PM_STRING_QUERY_ERROR, PM_STRING_QUERY_FALSE, PM_STRING_QUERY_TRUE, PARSE_EXPRESSION_INFIX_OPERATOR_EQUAL,
  PARSE_EXPRESSION_INFIX_UNWRITEABLE, PARSE_COMPOUND_WRITE_AMPAMPEQ, PARSE_COMPOUND_WRITE_PIPEPIPEEQ, PARSE_COMPOUND_WRITE_OPERATOR, PM_SLICE_TYPE_ERROR, PM_SLICE_TYPE_NONE,
  PM_SLICE_TYPE_LOCAL, PM_SLICE_TYPE_CONSTANT, PM_SLICE_TYPE_METHOD_NAME, PM_UNARY_METHOD_CHARS, PM_BINARY_METHOD_NAMES, PM_TERNARY_METHOD_NAMES,
};
export { pm_visit_node, pm_visit_child_nodes } from "./node.mjs";
