// Node types, token types, flags, and small location helpers ported from include/prism/ast.h.
// Lexer/parser state constants ported from include/prism/parser.h.

// pm_token_type_t
export const PM_TOKEN_EOF = 1;
export const PM_TOKEN_BRACE_RIGHT = 2;
export const PM_TOKEN_COMMA = 3;
export const PM_TOKEN_EMBEXPR_END = 4;
export const PM_TOKEN_KEYWORD_DO = 5;
export const PM_TOKEN_KEYWORD_ELSE = 6;
export const PM_TOKEN_KEYWORD_ELSIF = 7;
export const PM_TOKEN_KEYWORD_END = 8;
export const PM_TOKEN_KEYWORD_ENSURE = 9;
export const PM_TOKEN_KEYWORD_IN = 10;
export const PM_TOKEN_KEYWORD_RESCUE = 11;
export const PM_TOKEN_KEYWORD_THEN = 12;
export const PM_TOKEN_KEYWORD_WHEN = 13;
export const PM_TOKEN_NEWLINE = 14;
export const PM_TOKEN_PARENTHESIS_RIGHT = 15;
export const PM_TOKEN_PIPE = 16;
export const PM_TOKEN_SEMICOLON = 17;
export const PM_TOKEN_AMPERSAND = 18;
export const PM_TOKEN_AMPERSAND_AMPERSAND = 19;
export const PM_TOKEN_AMPERSAND_AMPERSAND_EQUAL = 20;
export const PM_TOKEN_AMPERSAND_DOT = 21;
export const PM_TOKEN_AMPERSAND_EQUAL = 22;
export const PM_TOKEN_BACKTICK = 23;
export const PM_TOKEN_BACK_REFERENCE = 24;
export const PM_TOKEN_BANG = 25;
export const PM_TOKEN_BANG_EQUAL = 26;
export const PM_TOKEN_BANG_TILDE = 27;
export const PM_TOKEN_BRACE_LEFT = 28;
export const PM_TOKEN_BRACKET_LEFT = 29;
export const PM_TOKEN_BRACKET_LEFT_ARRAY = 30;
export const PM_TOKEN_BRACKET_LEFT_RIGHT = 31;
export const PM_TOKEN_BRACKET_LEFT_RIGHT_EQUAL = 32;
export const PM_TOKEN_BRACKET_RIGHT = 33;
export const PM_TOKEN_CARET = 34;
export const PM_TOKEN_CARET_EQUAL = 35;
export const PM_TOKEN_CHARACTER_LITERAL = 36;
export const PM_TOKEN_CLASS_VARIABLE = 37;
export const PM_TOKEN_COLON = 38;
export const PM_TOKEN_COLON_COLON = 39;
export const PM_TOKEN_COMMENT = 40;
export const PM_TOKEN_CONSTANT = 41;
export const PM_TOKEN_DOT = 42;
export const PM_TOKEN_DOT_DOT = 43;
export const PM_TOKEN_DOT_DOT_DOT = 44;
export const PM_TOKEN_EMBDOC_BEGIN = 45;
export const PM_TOKEN_EMBDOC_END = 46;
export const PM_TOKEN_EMBDOC_LINE = 47;
export const PM_TOKEN_EMBEXPR_BEGIN = 48;
export const PM_TOKEN_EMBVAR = 49;
export const PM_TOKEN_EQUAL = 50;
export const PM_TOKEN_EQUAL_EQUAL = 51;
export const PM_TOKEN_EQUAL_EQUAL_EQUAL = 52;
export const PM_TOKEN_EQUAL_GREATER = 53;
export const PM_TOKEN_EQUAL_TILDE = 54;
export const PM_TOKEN_FLOAT = 55;
export const PM_TOKEN_FLOAT_IMAGINARY = 56;
export const PM_TOKEN_FLOAT_RATIONAL = 57;
export const PM_TOKEN_FLOAT_RATIONAL_IMAGINARY = 58;
export const PM_TOKEN_GLOBAL_VARIABLE = 59;
export const PM_TOKEN_GREATER = 60;
export const PM_TOKEN_GREATER_EQUAL = 61;
export const PM_TOKEN_GREATER_GREATER = 62;
export const PM_TOKEN_GREATER_GREATER_EQUAL = 63;
export const PM_TOKEN_HEREDOC_END = 64;
export const PM_TOKEN_HEREDOC_START = 65;
export const PM_TOKEN_IDENTIFIER = 66;
export const PM_TOKEN_IGNORED_NEWLINE = 67;
export const PM_TOKEN_INSTANCE_VARIABLE = 68;
export const PM_TOKEN_INTEGER = 69;
export const PM_TOKEN_INTEGER_IMAGINARY = 70;
export const PM_TOKEN_INTEGER_RATIONAL = 71;
export const PM_TOKEN_INTEGER_RATIONAL_IMAGINARY = 72;
export const PM_TOKEN_KEYWORD_ALIAS = 73;
export const PM_TOKEN_KEYWORD_AND = 74;
export const PM_TOKEN_KEYWORD_BEGIN = 75;
export const PM_TOKEN_KEYWORD_BEGIN_UPCASE = 76;
export const PM_TOKEN_KEYWORD_BREAK = 77;
export const PM_TOKEN_KEYWORD_CASE = 78;
export const PM_TOKEN_KEYWORD_CLASS = 79;
export const PM_TOKEN_KEYWORD_DEF = 80;
export const PM_TOKEN_KEYWORD_DEFINED = 81;
export const PM_TOKEN_KEYWORD_DO_LOOP = 82;
export const PM_TOKEN_KEYWORD_END_UPCASE = 83;
export const PM_TOKEN_KEYWORD_FALSE = 84;
export const PM_TOKEN_KEYWORD_FOR = 85;
export const PM_TOKEN_KEYWORD_IF = 86;
export const PM_TOKEN_KEYWORD_IF_MODIFIER = 87;
export const PM_TOKEN_KEYWORD_MODULE = 88;
export const PM_TOKEN_KEYWORD_NEXT = 89;
export const PM_TOKEN_KEYWORD_NIL = 90;
export const PM_TOKEN_KEYWORD_NOT = 91;
export const PM_TOKEN_KEYWORD_OR = 92;
export const PM_TOKEN_KEYWORD_REDO = 93;
export const PM_TOKEN_KEYWORD_RESCUE_MODIFIER = 94;
export const PM_TOKEN_KEYWORD_RETRY = 95;
export const PM_TOKEN_KEYWORD_RETURN = 96;
export const PM_TOKEN_KEYWORD_SELF = 97;
export const PM_TOKEN_KEYWORD_SUPER = 98;
export const PM_TOKEN_KEYWORD_TRUE = 99;
export const PM_TOKEN_KEYWORD_UNDEF = 100;
export const PM_TOKEN_KEYWORD_UNLESS = 101;
export const PM_TOKEN_KEYWORD_UNLESS_MODIFIER = 102;
export const PM_TOKEN_KEYWORD_UNTIL = 103;
export const PM_TOKEN_KEYWORD_UNTIL_MODIFIER = 104;
export const PM_TOKEN_KEYWORD_WHILE = 105;
export const PM_TOKEN_KEYWORD_WHILE_MODIFIER = 106;
export const PM_TOKEN_KEYWORD_YIELD = 107;
export const PM_TOKEN_KEYWORD___ENCODING__ = 108;
export const PM_TOKEN_KEYWORD___FILE__ = 109;
export const PM_TOKEN_KEYWORD___LINE__ = 110;
export const PM_TOKEN_LABEL = 111;
export const PM_TOKEN_LABEL_END = 112;
export const PM_TOKEN_LAMBDA_BEGIN = 113;
export const PM_TOKEN_LESS = 114;
export const PM_TOKEN_LESS_EQUAL = 115;
export const PM_TOKEN_LESS_EQUAL_GREATER = 116;
export const PM_TOKEN_LESS_LESS = 117;
export const PM_TOKEN_LESS_LESS_EQUAL = 118;
export const PM_TOKEN_METHOD_NAME = 119;
export const PM_TOKEN_MINUS = 120;
export const PM_TOKEN_MINUS_EQUAL = 121;
export const PM_TOKEN_MINUS_GREATER = 122;
export const PM_TOKEN_NUMBERED_REFERENCE = 123;
export const PM_TOKEN_PARENTHESIS_LEFT = 124;
export const PM_TOKEN_PARENTHESIS_LEFT_PARENTHESES = 125;
export const PM_TOKEN_PERCENT = 126;
export const PM_TOKEN_PERCENT_EQUAL = 127;
export const PM_TOKEN_PERCENT_LOWER_I = 128;
export const PM_TOKEN_PERCENT_LOWER_W = 129;
export const PM_TOKEN_PERCENT_LOWER_X = 130;
export const PM_TOKEN_PERCENT_UPPER_I = 131;
export const PM_TOKEN_PERCENT_UPPER_W = 132;
export const PM_TOKEN_PIPE_EQUAL = 133;
export const PM_TOKEN_PIPE_PIPE = 134;
export const PM_TOKEN_PIPE_PIPE_EQUAL = 135;
export const PM_TOKEN_PLUS = 136;
export const PM_TOKEN_PLUS_EQUAL = 137;
export const PM_TOKEN_QUESTION_MARK = 138;
export const PM_TOKEN_REGEXP_BEGIN = 139;
export const PM_TOKEN_REGEXP_END = 140;
export const PM_TOKEN_SLASH = 141;
export const PM_TOKEN_SLASH_EQUAL = 142;
export const PM_TOKEN_STAR = 143;
export const PM_TOKEN_STAR_EQUAL = 144;
export const PM_TOKEN_STAR_STAR = 145;
export const PM_TOKEN_STAR_STAR_EQUAL = 146;
export const PM_TOKEN_STRING_BEGIN = 147;
export const PM_TOKEN_STRING_CONTENT = 148;
export const PM_TOKEN_STRING_END = 149;
export const PM_TOKEN_SYMBOL_BEGIN = 150;
export const PM_TOKEN_TILDE = 151;
export const PM_TOKEN_UAMPERSAND = 152;
export const PM_TOKEN_UCOLON_COLON = 153;
export const PM_TOKEN_UDOT_DOT = 154;
export const PM_TOKEN_UDOT_DOT_DOT = 155;
export const PM_TOKEN_UMINUS = 156;
export const PM_TOKEN_UMINUS_NUM = 157;
export const PM_TOKEN_UPLUS = 158;
export const PM_TOKEN_USTAR = 159;
export const PM_TOKEN_USTAR_STAR = 160;
export const PM_TOKEN_WORDS_SEP = 161;
export const PM_TOKEN___END__ = 162;
export const PM_TOKEN_MISSING = 163;
export const PM_TOKEN_NOT_PROVIDED = 164;
export const PM_TOKEN_MAXIMUM = 165;

// pm_node_type_t
export const PM_ALIAS_GLOBAL_VARIABLE_NODE = 1;
export const PM_ALIAS_METHOD_NODE = 2;
export const PM_ALTERNATION_PATTERN_NODE = 3;
export const PM_AND_NODE = 4;
export const PM_ARGUMENTS_NODE = 5;
export const PM_ARRAY_NODE = 6;
export const PM_ARRAY_PATTERN_NODE = 7;
export const PM_ASSOC_NODE = 8;
export const PM_ASSOC_SPLAT_NODE = 9;
export const PM_BACK_REFERENCE_READ_NODE = 10;
export const PM_BEGIN_NODE = 11;
export const PM_BLOCK_ARGUMENT_NODE = 12;
export const PM_BLOCK_LOCAL_VARIABLE_NODE = 13;
export const PM_BLOCK_NODE = 14;
export const PM_BLOCK_PARAMETER_NODE = 15;
export const PM_BLOCK_PARAMETERS_NODE = 16;
export const PM_BREAK_NODE = 17;
export const PM_CALL_AND_WRITE_NODE = 18;
export const PM_CALL_NODE = 19;
export const PM_CALL_OPERATOR_WRITE_NODE = 20;
export const PM_CALL_OR_WRITE_NODE = 21;
export const PM_CALL_TARGET_NODE = 22;
export const PM_CAPTURE_PATTERN_NODE = 23;
export const PM_CASE_MATCH_NODE = 24;
export const PM_CASE_NODE = 25;
export const PM_CLASS_NODE = 26;
export const PM_CLASS_VARIABLE_AND_WRITE_NODE = 27;
export const PM_CLASS_VARIABLE_OPERATOR_WRITE_NODE = 28;
export const PM_CLASS_VARIABLE_OR_WRITE_NODE = 29;
export const PM_CLASS_VARIABLE_READ_NODE = 30;
export const PM_CLASS_VARIABLE_TARGET_NODE = 31;
export const PM_CLASS_VARIABLE_WRITE_NODE = 32;
export const PM_CONSTANT_AND_WRITE_NODE = 33;
export const PM_CONSTANT_OPERATOR_WRITE_NODE = 34;
export const PM_CONSTANT_OR_WRITE_NODE = 35;
export const PM_CONSTANT_PATH_AND_WRITE_NODE = 36;
export const PM_CONSTANT_PATH_NODE = 37;
export const PM_CONSTANT_PATH_OPERATOR_WRITE_NODE = 38;
export const PM_CONSTANT_PATH_OR_WRITE_NODE = 39;
export const PM_CONSTANT_PATH_TARGET_NODE = 40;
export const PM_CONSTANT_PATH_WRITE_NODE = 41;
export const PM_CONSTANT_READ_NODE = 42;
export const PM_CONSTANT_TARGET_NODE = 43;
export const PM_CONSTANT_WRITE_NODE = 44;
export const PM_DEF_NODE = 45;
export const PM_DEFINED_NODE = 46;
export const PM_ELSE_NODE = 47;
export const PM_EMBEDDED_STATEMENTS_NODE = 48;
export const PM_EMBEDDED_VARIABLE_NODE = 49;
export const PM_ENSURE_NODE = 50;
export const PM_FALSE_NODE = 51;
export const PM_FIND_PATTERN_NODE = 52;
export const PM_FLIP_FLOP_NODE = 53;
export const PM_FLOAT_NODE = 54;
export const PM_FOR_NODE = 55;
export const PM_FORWARDING_ARGUMENTS_NODE = 56;
export const PM_FORWARDING_PARAMETER_NODE = 57;
export const PM_FORWARDING_SUPER_NODE = 58;
export const PM_GLOBAL_VARIABLE_AND_WRITE_NODE = 59;
export const PM_GLOBAL_VARIABLE_OPERATOR_WRITE_NODE = 60;
export const PM_GLOBAL_VARIABLE_OR_WRITE_NODE = 61;
export const PM_GLOBAL_VARIABLE_READ_NODE = 62;
export const PM_GLOBAL_VARIABLE_TARGET_NODE = 63;
export const PM_GLOBAL_VARIABLE_WRITE_NODE = 64;
export const PM_HASH_NODE = 65;
export const PM_HASH_PATTERN_NODE = 66;
export const PM_IF_NODE = 67;
export const PM_IMAGINARY_NODE = 68;
export const PM_IMPLICIT_NODE = 69;
export const PM_IMPLICIT_REST_NODE = 70;
export const PM_IN_NODE = 71;
export const PM_INDEX_AND_WRITE_NODE = 72;
export const PM_INDEX_OPERATOR_WRITE_NODE = 73;
export const PM_INDEX_OR_WRITE_NODE = 74;
export const PM_INDEX_TARGET_NODE = 75;
export const PM_INSTANCE_VARIABLE_AND_WRITE_NODE = 76;
export const PM_INSTANCE_VARIABLE_OPERATOR_WRITE_NODE = 77;
export const PM_INSTANCE_VARIABLE_OR_WRITE_NODE = 78;
export const PM_INSTANCE_VARIABLE_READ_NODE = 79;
export const PM_INSTANCE_VARIABLE_TARGET_NODE = 80;
export const PM_INSTANCE_VARIABLE_WRITE_NODE = 81;
export const PM_INTEGER_NODE = 82;
export const PM_INTERPOLATED_MATCH_LAST_LINE_NODE = 83;
export const PM_INTERPOLATED_REGULAR_EXPRESSION_NODE = 84;
export const PM_INTERPOLATED_STRING_NODE = 85;
export const PM_INTERPOLATED_SYMBOL_NODE = 86;
export const PM_INTERPOLATED_X_STRING_NODE = 87;
export const PM_IT_LOCAL_VARIABLE_READ_NODE = 88;
export const PM_IT_PARAMETERS_NODE = 89;
export const PM_KEYWORD_HASH_NODE = 90;
export const PM_KEYWORD_REST_PARAMETER_NODE = 91;
export const PM_LAMBDA_NODE = 92;
export const PM_LOCAL_VARIABLE_AND_WRITE_NODE = 93;
export const PM_LOCAL_VARIABLE_OPERATOR_WRITE_NODE = 94;
export const PM_LOCAL_VARIABLE_OR_WRITE_NODE = 95;
export const PM_LOCAL_VARIABLE_READ_NODE = 96;
export const PM_LOCAL_VARIABLE_TARGET_NODE = 97;
export const PM_LOCAL_VARIABLE_WRITE_NODE = 98;
export const PM_MATCH_LAST_LINE_NODE = 99;
export const PM_MATCH_PREDICATE_NODE = 100;
export const PM_MATCH_REQUIRED_NODE = 101;
export const PM_MATCH_WRITE_NODE = 102;
export const PM_MISSING_NODE = 103;
export const PM_MODULE_NODE = 104;
export const PM_MULTI_TARGET_NODE = 105;
export const PM_MULTI_WRITE_NODE = 106;
export const PM_NEXT_NODE = 107;
export const PM_NIL_NODE = 108;
export const PM_NO_KEYWORDS_PARAMETER_NODE = 109;
export const PM_NUMBERED_PARAMETERS_NODE = 110;
export const PM_NUMBERED_REFERENCE_READ_NODE = 111;
export const PM_OPTIONAL_KEYWORD_PARAMETER_NODE = 112;
export const PM_OPTIONAL_PARAMETER_NODE = 113;
export const PM_OR_NODE = 114;
export const PM_PARAMETERS_NODE = 115;
export const PM_PARENTHESES_NODE = 116;
export const PM_PINNED_EXPRESSION_NODE = 117;
export const PM_PINNED_VARIABLE_NODE = 118;
export const PM_POST_EXECUTION_NODE = 119;
export const PM_PRE_EXECUTION_NODE = 120;
export const PM_PROGRAM_NODE = 121;
export const PM_RANGE_NODE = 122;
export const PM_RATIONAL_NODE = 123;
export const PM_REDO_NODE = 124;
export const PM_REGULAR_EXPRESSION_NODE = 125;
export const PM_REQUIRED_KEYWORD_PARAMETER_NODE = 126;
export const PM_REQUIRED_PARAMETER_NODE = 127;
export const PM_RESCUE_MODIFIER_NODE = 128;
export const PM_RESCUE_NODE = 129;
export const PM_REST_PARAMETER_NODE = 130;
export const PM_RETRY_NODE = 131;
export const PM_RETURN_NODE = 132;
export const PM_SELF_NODE = 133;
export const PM_SHAREABLE_CONSTANT_NODE = 134;
export const PM_SINGLETON_CLASS_NODE = 135;
export const PM_SOURCE_ENCODING_NODE = 136;
export const PM_SOURCE_FILE_NODE = 137;
export const PM_SOURCE_LINE_NODE = 138;
export const PM_SPLAT_NODE = 139;
export const PM_STATEMENTS_NODE = 140;
export const PM_STRING_NODE = 141;
export const PM_SUPER_NODE = 142;
export const PM_SYMBOL_NODE = 143;
export const PM_TRUE_NODE = 144;
export const PM_UNDEF_NODE = 145;
export const PM_UNLESS_NODE = 146;
export const PM_UNTIL_NODE = 147;
export const PM_WHEN_NODE = 148;
export const PM_WHILE_NODE = 149;
export const PM_X_STRING_NODE = 150;
export const PM_YIELD_NODE = 151;
export const PM_SCOPE_NODE = 152;

// Common node flags
export const PM_NODE_FLAG_NEWLINE = 1;
export const PM_NODE_FLAG_STATIC_LITERAL = 2;

// pm_arguments_node_flags_t
export const PM_ARGUMENTS_NODE_FLAGS_CONTAINS_FORWARDING = 4;
export const PM_ARGUMENTS_NODE_FLAGS_CONTAINS_KEYWORDS = 8;
export const PM_ARGUMENTS_NODE_FLAGS_CONTAINS_KEYWORD_SPLAT = 16;
export const PM_ARGUMENTS_NODE_FLAGS_CONTAINS_SPLAT = 32;
export const PM_ARGUMENTS_NODE_FLAGS_CONTAINS_MULTIPLE_SPLATS = 64;

// pm_array_node_flags_t
export const PM_ARRAY_NODE_FLAGS_CONTAINS_SPLAT = 4;

// pm_call_node_flags_t
export const PM_CALL_NODE_FLAGS_SAFE_NAVIGATION = 4;
export const PM_CALL_NODE_FLAGS_VARIABLE_CALL = 8;
export const PM_CALL_NODE_FLAGS_ATTRIBUTE_WRITE = 16;
export const PM_CALL_NODE_FLAGS_IGNORE_VISIBILITY = 32;
// PM_CALL_NODE_FLAGS_LAST is the only *_FLAGS_LAST sentinel actually used
// (part2 derives PM_CALL_NODE_FLAGS_IMPLICIT_ARRAY/COMPARISON/INDEX from it);
// every other node family's sentinel was dead (index.js explicitly skips
// names ending in "_LAST" when building flag-name tables) and has been
// removed.
export const PM_CALL_NODE_FLAGS_LAST = 33;

// pm_encoding_flags_t
export const PM_ENCODING_FLAGS_FORCED_UTF8_ENCODING = 4;
export const PM_ENCODING_FLAGS_FORCED_BINARY_ENCODING = 8;

// pm_integer_base_flags_t
export const PM_INTEGER_BASE_FLAGS_BINARY = 4;
export const PM_INTEGER_BASE_FLAGS_DECIMAL = 8;
export const PM_INTEGER_BASE_FLAGS_OCTAL = 16;
export const PM_INTEGER_BASE_FLAGS_HEXADECIMAL = 32;

// pm_interpolated_string_node_flags_t
export const PM_INTERPOLATED_STRING_NODE_FLAGS_FROZEN = 4;
export const PM_INTERPOLATED_STRING_NODE_FLAGS_MUTABLE = 8;

// pm_keyword_hash_node_flags_t
export const PM_KEYWORD_HASH_NODE_FLAGS_SYMBOL_KEYS = 4;

// pm_loop_flags_t
export const PM_LOOP_FLAGS_BEGIN_MODIFIER = 4;

// pm_parameter_flags_t
export const PM_PARAMETER_FLAGS_REPEATED_PARAMETER = 4;

// pm_parentheses_node_flags_t
export const PM_PARENTHESES_NODE_FLAGS_MULTIPLE_STATEMENTS = 4;

// pm_range_flags_t
export const PM_RANGE_FLAGS_EXCLUDE_END = 4;

// pm_regular_expression_flags_t
export const PM_REGULAR_EXPRESSION_FLAGS_IGNORE_CASE = 4;
export const PM_REGULAR_EXPRESSION_FLAGS_EXTENDED = 8;
export const PM_REGULAR_EXPRESSION_FLAGS_MULTI_LINE = 16;
export const PM_REGULAR_EXPRESSION_FLAGS_ONCE = 32;
export const PM_REGULAR_EXPRESSION_FLAGS_EUC_JP = 64;
export const PM_REGULAR_EXPRESSION_FLAGS_ASCII_8BIT = 128;
export const PM_REGULAR_EXPRESSION_FLAGS_WINDOWS_31J = 256;
export const PM_REGULAR_EXPRESSION_FLAGS_UTF_8 = 512;
export const PM_REGULAR_EXPRESSION_FLAGS_FORCED_UTF8_ENCODING = 1024;
export const PM_REGULAR_EXPRESSION_FLAGS_FORCED_BINARY_ENCODING = 2048;
export const PM_REGULAR_EXPRESSION_FLAGS_FORCED_US_ASCII_ENCODING = 4096;

// pm_shareable_constant_node_flags_t
export const PM_SHAREABLE_CONSTANT_NODE_FLAGS_LITERAL = 4;
export const PM_SHAREABLE_CONSTANT_NODE_FLAGS_EXPERIMENTAL_EVERYTHING = 8;
export const PM_SHAREABLE_CONSTANT_NODE_FLAGS_EXPERIMENTAL_COPY = 16;

// pm_string_flags_t
export const PM_STRING_FLAGS_FORCED_UTF8_ENCODING = 4;
export const PM_STRING_FLAGS_FORCED_BINARY_ENCODING = 8;
export const PM_STRING_FLAGS_FROZEN = 16;
export const PM_STRING_FLAGS_MUTABLE = 32;

// pm_symbol_flags_t
export const PM_SYMBOL_FLAGS_FORCED_UTF8_ENCODING = 4;
export const PM_SYMBOL_FLAGS_FORCED_BINARY_ENCODING = 8;
export const PM_SYMBOL_FLAGS_FORCED_US_ASCII_ENCODING = 16;

// #define constants from ast.h
export const PRISM_SERIALIZE_ONLY_SEMANTICS_FIELDS = 0;

// pm_lex_state_bit_t
export const PM_LEX_STATE_BIT_BEG = 0;
export const PM_LEX_STATE_BIT_END = 1;
export const PM_LEX_STATE_BIT_ENDARG = 2;
export const PM_LEX_STATE_BIT_ENDFN = 3;
export const PM_LEX_STATE_BIT_ARG = 4;
export const PM_LEX_STATE_BIT_CMDARG = 5;
export const PM_LEX_STATE_BIT_MID = 6;
export const PM_LEX_STATE_BIT_FNAME = 7;
export const PM_LEX_STATE_BIT_DOT = 8;
export const PM_LEX_STATE_BIT_CLASS = 9;
export const PM_LEX_STATE_BIT_LABEL = 10;
export const PM_LEX_STATE_BIT_LABELED = 11;
export const PM_LEX_STATE_BIT_FITEM = 12;

// pm_lex_state_t
export const PM_LEX_STATE_NONE = 0;
export const PM_LEX_STATE_BEG = 1;
export const PM_LEX_STATE_END = 2;
export const PM_LEX_STATE_ENDARG = 4;
export const PM_LEX_STATE_ENDFN = 8;
export const PM_LEX_STATE_ARG = 16;
export const PM_LEX_STATE_CMDARG = 32;
export const PM_LEX_STATE_MID = 64;
export const PM_LEX_STATE_FNAME = 128;
export const PM_LEX_STATE_DOT = 256;
export const PM_LEX_STATE_CLASS = 512;
export const PM_LEX_STATE_LABEL = 1024;
export const PM_LEX_STATE_LABELED = 2048;
export const PM_LEX_STATE_FITEM = 4096;
export const PM_LEX_STATE_BEG_ANY = 577;
export const PM_LEX_STATE_ARG_ANY = 48;
export const PM_LEX_STATE_END_ANY = 14;

// pm_heredoc_quote_t
export const PM_HEREDOC_QUOTE_NONE = 0;
export const PM_HEREDOC_QUOTE_SINGLE = 39;
export const PM_HEREDOC_QUOTE_DOUBLE = 34;
export const PM_HEREDOC_QUOTE_BACKTICK = 96;

// pm_heredoc_indent_t
export const PM_HEREDOC_INDENT_NONE = 0;
export const PM_HEREDOC_INDENT_DASH = 1;
export const PM_HEREDOC_INDENT_TILDE = 2;

// Lex modes
export const PM_LEX_DEFAULT = 0;
export const PM_LEX_EMBEXPR = 1;
export const PM_LEX_EMBVAR = 2;
export const PM_LEX_HEREDOC = 3;
export const PM_LEX_LIST = 4;
export const PM_LEX_REGEXP = 5;
export const PM_LEX_STRING = 6;

// pm_context_t
export const PM_CONTEXT_NONE = 0;
export const PM_CONTEXT_BEGIN = 1;
export const PM_CONTEXT_BEGIN_ENSURE = 2;
export const PM_CONTEXT_BEGIN_ELSE = 3;
export const PM_CONTEXT_BEGIN_RESCUE = 4;
export const PM_CONTEXT_BLOCK_BRACES = 5;
export const PM_CONTEXT_BLOCK_KEYWORDS = 6;
export const PM_CONTEXT_BLOCK_ENSURE = 7;
export const PM_CONTEXT_BLOCK_ELSE = 8;
export const PM_CONTEXT_BLOCK_PARAMETERS = 9;
export const PM_CONTEXT_BLOCK_RESCUE = 10;
export const PM_CONTEXT_CASE_WHEN = 11;
export const PM_CONTEXT_CASE_IN = 12;
export const PM_CONTEXT_CLASS = 13;
export const PM_CONTEXT_CLASS_ENSURE = 14;
export const PM_CONTEXT_CLASS_ELSE = 15;
export const PM_CONTEXT_CLASS_RESCUE = 16;
export const PM_CONTEXT_DEF = 17;
export const PM_CONTEXT_DEF_ENSURE = 18;
export const PM_CONTEXT_DEF_ELSE = 19;
export const PM_CONTEXT_DEF_RESCUE = 20;
export const PM_CONTEXT_DEF_PARAMS = 21;
export const PM_CONTEXT_DEFINED = 22;
export const PM_CONTEXT_DEFAULT_PARAMS = 23;
export const PM_CONTEXT_ELSE = 24;
export const PM_CONTEXT_ELSIF = 25;
export const PM_CONTEXT_EMBEXPR = 26;
export const PM_CONTEXT_FOR = 27;
export const PM_CONTEXT_FOR_INDEX = 28;
export const PM_CONTEXT_IF = 29;
export const PM_CONTEXT_LAMBDA_BRACES = 30;
export const PM_CONTEXT_LAMBDA_DO_END = 31;
export const PM_CONTEXT_LAMBDA_ENSURE = 32;
export const PM_CONTEXT_LAMBDA_ELSE = 33;
export const PM_CONTEXT_LAMBDA_RESCUE = 34;
export const PM_CONTEXT_LOOP_PREDICATE = 35;
export const PM_CONTEXT_MAIN = 36;
export const PM_CONTEXT_MODULE = 37;
export const PM_CONTEXT_MODULE_ENSURE = 38;
export const PM_CONTEXT_MODULE_ELSE = 39;
export const PM_CONTEXT_MODULE_RESCUE = 40;
export const PM_CONTEXT_MULTI_TARGET = 41;
export const PM_CONTEXT_PARENS = 42;
export const PM_CONTEXT_POSTEXE = 43;
export const PM_CONTEXT_PREDICATE = 44;
export const PM_CONTEXT_PREEXE = 45;
export const PM_CONTEXT_RESCUE_MODIFIER = 46;
export const PM_CONTEXT_SCLASS = 47;
export const PM_CONTEXT_SCLASS_ENSURE = 48;
export const PM_CONTEXT_SCLASS_ELSE = 49;
export const PM_CONTEXT_SCLASS_RESCUE = 50;
export const PM_CONTEXT_TERNARY = 51;
export const PM_CONTEXT_UNLESS = 52;
export const PM_CONTEXT_UNTIL = 53;
export const PM_CONTEXT_WHILE = 54;

// pm_comment_type_t
export const PM_COMMENT_INLINE = 0;
export const PM_COMMENT_EMBDOC = 1;

// Scope shareable constants / parameters
export const PM_SCOPE_SHAREABLE_CONSTANT_NONE = 0;
export const PM_SCOPE_SHAREABLE_CONSTANT_LITERAL = 4;
export const PM_SCOPE_SHAREABLE_CONSTANT_EXPERIMENTAL_EVERYTHING = 8;
export const PM_SCOPE_SHAREABLE_CONSTANT_EXPERIMENTAL_COPY = 16;
export const PM_SCOPE_PARAMETERS_NONE = 0x0;
export const PM_SCOPE_PARAMETERS_FORWARDING_POSITIONALS = 0x1;
export const PM_SCOPE_PARAMETERS_FORWARDING_KEYWORDS = 0x2;
export const PM_SCOPE_PARAMETERS_FORWARDING_BLOCK = 0x4;
export const PM_SCOPE_PARAMETERS_FORWARDING_ALL = 0x8;
export const PM_SCOPE_PARAMETERS_IMPLICIT_DISALLOWED = 0x10;
export const PM_SCOPE_PARAMETERS_NUMBERED_INNER = 0x20;
export const PM_SCOPE_PARAMETERS_NUMBERED_FOUND = 0x40;

// Location helpers (macros from prism.c, documented via pm_location_t)
export function PM_LOCATION_TOKEN_VALUE(token) { return { start: token.start, end: token.end }; }
export function PM_LOCATION_NODE_VALUE(node) { return node.location; }

