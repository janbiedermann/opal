// Ported from src/diagnostic.c and include/prism/diagnostic.h.


// pm_error_level_t
export const PM_ERROR_LEVEL_SYNTAX = 0;
export const PM_ERROR_LEVEL_ARGUMENT = 1;
export const PM_ERROR_LEVEL_LOAD = 2;

// pm_warning_level_t
export const PM_WARNING_LEVEL_DEFAULT = 0;
export const PM_WARNING_LEVEL_VERBOSE = 1;

// pm_diagnostic_id_t
export const PM_ERR_ALIAS_ARGUMENT = 0;
export const PM_ERR_ALIAS_ARGUMENT_NUMBERED_REFERENCE = 1;
export const PM_ERR_AMPAMPEQ_MULTI_ASSIGN = 2;
export const PM_ERR_ARGUMENT_AFTER_BLOCK = 3;
export const PM_ERR_ARGUMENT_AFTER_FORWARDING_ELLIPSES = 4;
export const PM_ERR_ARGUMENT_BARE_HASH = 5;
export const PM_ERR_ARGUMENT_BLOCK_FORWARDING = 6;
export const PM_ERR_ARGUMENT_BLOCK_MULTI = 7;
export const PM_ERR_ARGUMENT_CONFLICT_AMPERSAND = 8;
export const PM_ERR_ARGUMENT_CONFLICT_STAR = 9;
export const PM_ERR_ARGUMENT_CONFLICT_STAR_STAR = 10;
export const PM_ERR_ARGUMENT_FORMAL_CLASS = 11;
export const PM_ERR_ARGUMENT_FORMAL_CONSTANT = 12;
export const PM_ERR_ARGUMENT_FORMAL_GLOBAL = 13;
export const PM_ERR_ARGUMENT_FORMAL_IVAR = 14;
export const PM_ERR_ARGUMENT_FORWARDING_UNBOUND = 15;
export const PM_ERR_ARGUMENT_NO_FORWARDING_AMPERSAND = 16;
export const PM_ERR_ARGUMENT_NO_FORWARDING_ELLIPSES = 17;
export const PM_ERR_ARGUMENT_NO_FORWARDING_STAR = 18;
export const PM_ERR_ARGUMENT_NO_FORWARDING_STAR_STAR = 19;
export const PM_ERR_ARGUMENT_SPLAT_AFTER_ASSOC_SPLAT = 20;
export const PM_ERR_ARGUMENT_SPLAT_AFTER_SPLAT = 21;
export const PM_ERR_ARGUMENT_TERM_PAREN = 22;
export const PM_ERR_ARGUMENT_UNEXPECTED_BLOCK = 23;
export const PM_ERR_ARRAY_ELEMENT = 24;
export const PM_ERR_ARRAY_EXPRESSION = 25;
export const PM_ERR_ARRAY_EXPRESSION_AFTER_STAR = 26;
export const PM_ERR_ARRAY_SEPARATOR = 27;
export const PM_ERR_ARRAY_TERM = 28;
export const PM_ERR_BEGIN_LONELY_ELSE = 29;
export const PM_ERR_BEGIN_TERM = 30;
export const PM_ERR_BEGIN_UPCASE_BRACE = 31;
export const PM_ERR_BEGIN_UPCASE_TERM = 32;
export const PM_ERR_BEGIN_UPCASE_TOPLEVEL = 33;
export const PM_ERR_BLOCK_PARAM_LOCAL_VARIABLE = 34;
export const PM_ERR_BLOCK_PARAM_PIPE_TERM = 35;
export const PM_ERR_BLOCK_TERM_BRACE = 36;
export const PM_ERR_BLOCK_TERM_END = 37;
export const PM_ERR_CANNOT_PARSE_EXPRESSION = 38;
export const PM_ERR_CANNOT_PARSE_STRING_PART = 39;
export const PM_ERR_CASE_EXPRESSION_AFTER_CASE = 40;
export const PM_ERR_CASE_EXPRESSION_AFTER_WHEN = 41;
export const PM_ERR_CASE_MATCH_MISSING_PREDICATE = 42;
export const PM_ERR_CASE_MISSING_CONDITIONS = 43;
export const PM_ERR_CASE_TERM = 44;
export const PM_ERR_CLASS_IN_METHOD = 45;
export const PM_ERR_CLASS_NAME = 46;
export const PM_ERR_CLASS_SUPERCLASS = 47;
export const PM_ERR_CLASS_TERM = 48;
export const PM_ERR_CLASS_UNEXPECTED_END = 49;
export const PM_ERR_CLASS_VARIABLE_BARE = 50;
export const PM_ERR_CONDITIONAL_ELSIF_PREDICATE = 51;
export const PM_ERR_CONDITIONAL_IF_PREDICATE = 52;
export const PM_ERR_CONDITIONAL_PREDICATE_TERM = 53;
export const PM_ERR_CONDITIONAL_TERM = 54;
export const PM_ERR_CONDITIONAL_TERM_ELSE = 55;
export const PM_ERR_CONDITIONAL_UNLESS_PREDICATE = 56;
export const PM_ERR_CONDITIONAL_UNTIL_PREDICATE = 57;
export const PM_ERR_CONDITIONAL_WHILE_PREDICATE = 58;
export const PM_ERR_CONSTANT_PATH_COLON_COLON_CONSTANT = 59;
export const PM_ERR_DEF_ENDLESS = 60;
export const PM_ERR_DEF_ENDLESS_PARAMETERS = 61;
export const PM_ERR_DEF_ENDLESS_SETTER = 62;
export const PM_ERR_DEF_NAME = 63;
export const PM_ERR_DEF_PARAMS_TERM = 64;
export const PM_ERR_DEF_PARAMS_TERM_PAREN = 65;
export const PM_ERR_DEF_RECEIVER = 66;
export const PM_ERR_DEF_RECEIVER_TERM = 67;
export const PM_ERR_DEF_TERM = 68;
export const PM_ERR_DEFINED_EXPRESSION = 69;
export const PM_ERR_EMBDOC_TERM = 70;
export const PM_ERR_EMBEXPR_END = 71;
export const PM_ERR_EMBVAR_INVALID = 72;
export const PM_ERR_END_UPCASE_BRACE = 73;
export const PM_ERR_END_UPCASE_TERM = 74;
export const PM_ERR_ESCAPE_INVALID_CONTROL = 75;
export const PM_ERR_ESCAPE_INVALID_CONTROL_REPEAT = 76;
export const PM_ERR_ESCAPE_INVALID_HEXADECIMAL = 77;
export const PM_ERR_ESCAPE_INVALID_META = 78;
export const PM_ERR_ESCAPE_INVALID_META_REPEAT = 79;
export const PM_ERR_ESCAPE_INVALID_UNICODE = 80;
export const PM_ERR_ESCAPE_INVALID_UNICODE_CM_FLAGS = 81;
export const PM_ERR_ESCAPE_INVALID_UNICODE_LIST = 82;
export const PM_ERR_ESCAPE_INVALID_UNICODE_LITERAL = 83;
export const PM_ERR_ESCAPE_INVALID_UNICODE_LONG = 84;
export const PM_ERR_ESCAPE_INVALID_UNICODE_SHORT = 85;
export const PM_ERR_ESCAPE_INVALID_UNICODE_TERM = 86;
export const PM_ERR_EXPECT_ARGUMENT = 87;
export const PM_ERR_EXPECT_EOL_AFTER_STATEMENT = 88;
export const PM_ERR_EXPECT_EXPRESSION_AFTER_AMPAMPEQ = 89;
export const PM_ERR_EXPECT_EXPRESSION_AFTER_COMMA = 90;
export const PM_ERR_EXPECT_EXPRESSION_AFTER_EQUAL = 91;
export const PM_ERR_EXPECT_EXPRESSION_AFTER_LESS_LESS = 92;
export const PM_ERR_EXPECT_EXPRESSION_AFTER_LPAREN = 93;
export const PM_ERR_EXPECT_EXPRESSION_AFTER_OPERATOR = 94;
export const PM_ERR_EXPECT_EXPRESSION_AFTER_PIPEPIPEEQ = 95;
export const PM_ERR_EXPECT_EXPRESSION_AFTER_QUESTION = 96;
export const PM_ERR_EXPECT_EXPRESSION_AFTER_SPLAT = 97;
export const PM_ERR_EXPECT_EXPRESSION_AFTER_SPLAT_HASH = 98;
export const PM_ERR_EXPECT_EXPRESSION_AFTER_STAR = 99;
export const PM_ERR_EXPECT_FOR_DELIMITER = 100;
export const PM_ERR_EXPECT_IDENT_REQ_PARAMETER = 101;
export const PM_ERR_EXPECT_IN_DELIMITER = 102;
export const PM_ERR_EXPECT_LPAREN_AFTER_NOT_LPAREN = 103;
export const PM_ERR_EXPECT_LPAREN_AFTER_NOT_OTHER = 104;
export const PM_ERR_EXPECT_LPAREN_REQ_PARAMETER = 105;
export const PM_ERR_EXPECT_MESSAGE = 106;
export const PM_ERR_EXPECT_RBRACKET = 107;
export const PM_ERR_EXPECT_RPAREN = 108;
export const PM_ERR_EXPECT_RPAREN_AFTER_MULTI = 109;
export const PM_ERR_EXPECT_RPAREN_REQ_PARAMETER = 110;
export const PM_ERR_EXPECT_SINGLETON_CLASS_DELIMITER = 111;
export const PM_ERR_EXPECT_STRING_CONTENT = 112;
export const PM_ERR_EXPECT_WHEN_DELIMITER = 113;
export const PM_ERR_EXPRESSION_BARE_HASH = 114;
export const PM_ERR_EXPRESSION_NOT_WRITABLE = 115;
export const PM_ERR_EXPRESSION_NOT_WRITABLE_ENCODING = 116;
export const PM_ERR_EXPRESSION_NOT_WRITABLE_FALSE = 117;
export const PM_ERR_EXPRESSION_NOT_WRITABLE_FILE = 118;
export const PM_ERR_EXPRESSION_NOT_WRITABLE_LINE = 119;
export const PM_ERR_EXPRESSION_NOT_WRITABLE_NIL = 120;
export const PM_ERR_EXPRESSION_NOT_WRITABLE_NUMBERED = 121;
export const PM_ERR_EXPRESSION_NOT_WRITABLE_SELF = 122;
export const PM_ERR_EXPRESSION_NOT_WRITABLE_TRUE = 123;
export const PM_ERR_FLOAT_PARSE = 124;
export const PM_ERR_FOR_COLLECTION = 125;
export const PM_ERR_FOR_IN = 126;
export const PM_ERR_FOR_INDEX = 127;
export const PM_ERR_FOR_TERM = 128;
export const PM_ERR_GLOBAL_VARIABLE_BARE = 129;
export const PM_ERR_HASH_EXPRESSION_AFTER_LABEL = 130;
export const PM_ERR_HASH_KEY = 131;
export const PM_ERR_HASH_ROCKET = 132;
export const PM_ERR_HASH_TERM = 133;
export const PM_ERR_HASH_VALUE = 134;
export const PM_ERR_HEREDOC_IDENTIFIER = 135;
export const PM_ERR_HEREDOC_TERM = 136;
export const PM_ERR_INCOMPLETE_QUESTION_MARK = 137;
export const PM_ERR_INCOMPLETE_VARIABLE_CLASS = 138;
export const PM_ERR_INCOMPLETE_VARIABLE_CLASS_3_3 = 139;
export const PM_ERR_INCOMPLETE_VARIABLE_INSTANCE = 140;
export const PM_ERR_INCOMPLETE_VARIABLE_INSTANCE_3_3 = 141;
export const PM_ERR_INSTANCE_VARIABLE_BARE = 142;
export const PM_ERR_INVALID_BLOCK_EXIT = 143;
export const PM_ERR_INVALID_CHARACTER = 144;
export const PM_ERR_INVALID_COMMA = 145;
export const PM_ERR_INVALID_ENCODING_MAGIC_COMMENT = 146;
export const PM_ERR_INVALID_ESCAPE_CHARACTER = 147;
export const PM_ERR_INVALID_FLOAT_EXPONENT = 148;
export const PM_ERR_INVALID_LOCAL_VARIABLE_READ = 149;
export const PM_ERR_INVALID_LOCAL_VARIABLE_WRITE = 150;
export const PM_ERR_INVALID_MULTIBYTE_CHAR = 151;
export const PM_ERR_INVALID_MULTIBYTE_CHARACTER = 152;
export const PM_ERR_INVALID_MULTIBYTE_ESCAPE = 153;
export const PM_ERR_INVALID_NUMBER_BINARY = 154;
export const PM_ERR_INVALID_NUMBER_DECIMAL = 155;
export const PM_ERR_INVALID_NUMBER_FRACTION = 156;
export const PM_ERR_INVALID_NUMBER_HEXADECIMAL = 157;
export const PM_ERR_INVALID_NUMBER_OCTAL = 158;
export const PM_ERR_INVALID_NUMBER_UNDERSCORE_INNER = 159;
export const PM_ERR_INVALID_NUMBER_UNDERSCORE_TRAILING = 160;
export const PM_ERR_INVALID_PERCENT = 161;
export const PM_ERR_INVALID_PERCENT_EOF = 162;
export const PM_ERR_INVALID_PRINTABLE_CHARACTER = 163;
export const PM_ERR_INVALID_RETRY_AFTER_ELSE = 164;
export const PM_ERR_INVALID_RETRY_AFTER_ENSURE = 165;
export const PM_ERR_INVALID_RETRY_WITHOUT_RESCUE = 166;
export const PM_ERR_INVALID_SYMBOL = 167;
export const PM_ERR_INVALID_VARIABLE_GLOBAL = 168;
export const PM_ERR_INVALID_VARIABLE_GLOBAL_3_3 = 169;
export const PM_ERR_INVALID_YIELD = 170;
export const PM_ERR_IT_NOT_ALLOWED_NUMBERED = 171;
export const PM_ERR_IT_NOT_ALLOWED_ORDINARY = 172;
export const PM_ERR_LAMBDA_OPEN = 173;
export const PM_ERR_LAMBDA_TERM_BRACE = 174;
export const PM_ERR_LAMBDA_TERM_END = 175;
export const PM_ERR_LIST_I_LOWER_ELEMENT = 176;
export const PM_ERR_LIST_I_LOWER_TERM = 177;
export const PM_ERR_LIST_I_UPPER_ELEMENT = 178;
export const PM_ERR_LIST_I_UPPER_TERM = 179;
export const PM_ERR_LIST_W_LOWER_ELEMENT = 180;
export const PM_ERR_LIST_W_LOWER_TERM = 181;
export const PM_ERR_LIST_W_UPPER_ELEMENT = 182;
export const PM_ERR_LIST_W_UPPER_TERM = 183;
export const PM_ERR_MALLOC_FAILED = 184;
export const PM_ERR_MIXED_ENCODING = 185;
export const PM_ERR_MODULE_IN_METHOD = 186;
export const PM_ERR_MODULE_NAME = 187;
export const PM_ERR_MODULE_TERM = 188;
export const PM_ERR_MULTI_ASSIGN_MULTI_SPLATS = 189;
export const PM_ERR_MULTI_ASSIGN_UNEXPECTED_REST = 190;
export const PM_ERR_NESTING_TOO_DEEP = 191;
export const PM_ERR_NO_LOCAL_VARIABLE = 192;
export const PM_ERR_NON_ASSOCIATIVE_OPERATOR = 193;
export const PM_ERR_NOT_EXPRESSION = 194;
export const PM_ERR_NUMBER_LITERAL_UNDERSCORE = 195;
export const PM_ERR_NUMBERED_PARAMETER_INNER_BLOCK = 196;
export const PM_ERR_NUMBERED_PARAMETER_IT = 197;
export const PM_ERR_NUMBERED_PARAMETER_ORDINARY = 198;
export const PM_ERR_NUMBERED_PARAMETER_OUTER_BLOCK = 199;
export const PM_ERR_OPERATOR_MULTI_ASSIGN = 200;
export const PM_ERR_OPERATOR_WRITE_ARGUMENTS = 201;
export const PM_ERR_OPERATOR_WRITE_BLOCK = 202;
export const PM_ERR_PARAMETER_ASSOC_SPLAT_MULTI = 203;
export const PM_ERR_PARAMETER_BLOCK_MULTI = 204;
export const PM_ERR_PARAMETER_CIRCULAR = 205;
export const PM_ERR_PARAMETER_FORWARDING_AFTER_REST = 206;
export const PM_ERR_PARAMETER_METHOD_NAME = 207;
export const PM_ERR_PARAMETER_NAME_DUPLICATED = 208;
export const PM_ERR_PARAMETER_NO_DEFAULT = 209;
export const PM_ERR_PARAMETER_NO_DEFAULT_KW = 210;
export const PM_ERR_PARAMETER_NUMBERED_RESERVED = 211;
export const PM_ERR_PARAMETER_ORDER = 212;
export const PM_ERR_PARAMETER_SPLAT_MULTI = 213;
export const PM_ERR_PARAMETER_STAR = 214;
export const PM_ERR_PARAMETER_UNEXPECTED_FWD = 215;
export const PM_ERR_PARAMETER_UNEXPECTED_NO_KW = 216;
export const PM_ERR_PARAMETER_WILD_LOOSE_COMMA = 217;
export const PM_ERR_PATTERN_ARRAY_MULTIPLE_RESTS = 218;
export const PM_ERR_PATTERN_CAPTURE_DUPLICATE = 219;
export const PM_ERR_PATTERN_CAPTURE_IN_ALTERNATIVE = 220;
export const PM_ERR_PATTERN_EXPRESSION_AFTER_BRACKET = 221;
export const PM_ERR_PATTERN_EXPRESSION_AFTER_COMMA = 222;
export const PM_ERR_PATTERN_EXPRESSION_AFTER_HROCKET = 223;
export const PM_ERR_PATTERN_EXPRESSION_AFTER_IN = 224;
export const PM_ERR_PATTERN_EXPRESSION_AFTER_KEY = 225;
export const PM_ERR_PATTERN_EXPRESSION_AFTER_PAREN = 226;
export const PM_ERR_PATTERN_EXPRESSION_AFTER_PIN = 227;
export const PM_ERR_PATTERN_EXPRESSION_AFTER_PIPE = 228;
export const PM_ERR_PATTERN_EXPRESSION_AFTER_RANGE = 229;
export const PM_ERR_PATTERN_EXPRESSION_AFTER_REST = 230;
export const PM_ERR_PATTERN_FIND_MISSING_INNER = 231;
export const PM_ERR_PATTERN_HASH_IMPLICIT = 232;
export const PM_ERR_PATTERN_HASH_KEY = 233;
export const PM_ERR_PATTERN_HASH_KEY_DUPLICATE = 234;
export const PM_ERR_PATTERN_HASH_KEY_INTERPOLATED = 235;
export const PM_ERR_PATTERN_HASH_KEY_LABEL = 236;
export const PM_ERR_PATTERN_HASH_KEY_LOCALS = 237;
export const PM_ERR_PATTERN_IDENT_AFTER_HROCKET = 238;
export const PM_ERR_PATTERN_LABEL_AFTER_COMMA = 239;
export const PM_ERR_PATTERN_REST = 240;
export const PM_ERR_PATTERN_TERM_BRACE = 241;
export const PM_ERR_PATTERN_TERM_BRACKET = 242;
export const PM_ERR_PATTERN_TERM_PAREN = 243;
export const PM_ERR_PIPEPIPEEQ_MULTI_ASSIGN = 244;
export const PM_ERR_REGEXP_ENCODING_OPTION_MISMATCH = 245;
export const PM_ERR_REGEXP_INCOMPAT_CHAR_ENCODING = 246;
export const PM_ERR_REGEXP_INVALID_UNICODE_RANGE = 247;
export const PM_ERR_REGEXP_NON_ESCAPED_MBC = 248;
export const PM_ERR_REGEXP_PARSE_ERROR = 249;
export const PM_ERR_REGEXP_TERM = 250;
export const PM_ERR_REGEXP_UNKNOWN_OPTIONS = 251;
export const PM_ERR_REGEXP_UTF8_CHAR_NON_UTF8_REGEXP = 252;
export const PM_ERR_RESCUE_EXPRESSION = 253;
export const PM_ERR_RESCUE_MODIFIER_VALUE = 254;
export const PM_ERR_RESCUE_TERM = 255;
export const PM_ERR_RESCUE_VARIABLE = 256;
export const PM_ERR_RETURN_INVALID = 257;
export const PM_ERR_SCRIPT_NOT_FOUND = 258;
export const PM_ERR_SINGLETON_FOR_LITERALS = 259;
export const PM_ERR_STATEMENT_ALIAS = 260;
export const PM_ERR_STATEMENT_POSTEXE_END = 261;
export const PM_ERR_STATEMENT_PREEXE_BEGIN = 262;
export const PM_ERR_STATEMENT_UNDEF = 263;
export const PM_ERR_STRING_CONCATENATION = 264;
export const PM_ERR_STRING_INTERPOLATED_TERM = 265;
export const PM_ERR_STRING_LITERAL_EOF = 266;
export const PM_ERR_STRING_LITERAL_TERM = 267;
export const PM_ERR_SYMBOL_INVALID = 268;
export const PM_ERR_SYMBOL_TERM_DYNAMIC = 269;
export const PM_ERR_SYMBOL_TERM_INTERPOLATED = 270;
export const PM_ERR_TERNARY_COLON = 271;
export const PM_ERR_TERNARY_EXPRESSION_FALSE = 272;
export const PM_ERR_TERNARY_EXPRESSION_TRUE = 273;
export const PM_ERR_UNARY_DISALLOWED = 274;
export const PM_ERR_UNARY_RECEIVER = 275;
export const PM_ERR_UNDEF_ARGUMENT = 276;
export const PM_ERR_UNEXPECTED_BLOCK_ARGUMENT = 277;
export const PM_ERR_UNEXPECTED_INDEX_BLOCK = 278;
export const PM_ERR_UNEXPECTED_INDEX_KEYWORDS = 279;
export const PM_ERR_UNEXPECTED_LABEL = 280;
export const PM_ERR_UNEXPECTED_MULTI_WRITE = 281;
export const PM_ERR_UNEXPECTED_PARAMETER_DEFAULT_VALUE = 282;
export const PM_ERR_UNEXPECTED_RANGE_OPERATOR = 283;
export const PM_ERR_UNEXPECTED_SAFE_NAVIGATION = 284;
export const PM_ERR_UNEXPECTED_TOKEN_CLOSE_CONTEXT = 285;
export const PM_ERR_UNEXPECTED_TOKEN_IGNORE = 286;
export const PM_ERR_UNTIL_TERM = 287;
export const PM_ERR_VOID_EXPRESSION = 288;
export const PM_ERR_WHILE_TERM = 289;
export const PM_ERR_WRITE_TARGET_IN_METHOD = 290;
export const PM_ERR_WRITE_TARGET_READONLY = 291;
export const PM_ERR_WRITE_TARGET_UNEXPECTED = 292;
export const PM_ERR_XSTRING_TERM = 293;
export const PM_WARN_AMBIGUOUS_BINARY_OPERATOR = 294;
export const PM_WARN_AMBIGUOUS_FIRST_ARGUMENT_MINUS = 295;
export const PM_WARN_AMBIGUOUS_FIRST_ARGUMENT_PLUS = 296;
export const PM_WARN_AMBIGUOUS_PREFIX_AMPERSAND = 297;
export const PM_WARN_AMBIGUOUS_PREFIX_STAR = 298;
export const PM_WARN_AMBIGUOUS_PREFIX_STAR_STAR = 299;
export const PM_WARN_AMBIGUOUS_SLASH = 300;
export const PM_WARN_COMPARISON_AFTER_COMPARISON = 301;
export const PM_WARN_DOT_DOT_DOT_EOL = 302;
export const PM_WARN_EQUAL_IN_CONDITIONAL = 303;
export const PM_WARN_EQUAL_IN_CONDITIONAL_3_3 = 304;
export const PM_WARN_END_IN_METHOD = 305;
export const PM_WARN_DUPLICATED_HASH_KEY = 306;
export const PM_WARN_DUPLICATED_WHEN_CLAUSE = 307;
export const PM_WARN_FLOAT_OUT_OF_RANGE = 308;
export const PM_WARN_IGNORED_FROZEN_STRING_LITERAL = 309;
export const PM_WARN_INDENTATION_MISMATCH = 310;
export const PM_WARN_INTEGER_IN_FLIP_FLOP = 311;
export const PM_WARN_INVALID_CHARACTER = 312;
export const PM_WARN_INVALID_MAGIC_COMMENT_VALUE = 313;
export const PM_WARN_INVALID_NUMBERED_REFERENCE = 314;
export const PM_WARN_KEYWORD_EOL = 315;
export const PM_WARN_LITERAL_IN_CONDITION_DEFAULT = 316;
export const PM_WARN_LITERAL_IN_CONDITION_VERBOSE = 317;
export const PM_WARN_SHAREABLE_CONSTANT_VALUE_LINE = 318;
export const PM_WARN_SHEBANG_CARRIAGE_RETURN = 319;
export const PM_WARN_UNEXPECTED_CARRIAGE_RETURN = 320;
export const PM_WARN_UNREACHABLE_STATEMENT = 321;
export const PM_WARN_UNUSED_LOCAL_VARIABLE = 322;
export const PM_WARN_VOID_STATEMENT = 323;
export const PM_DIAGNOSTIC_ID_MAX = 324;

/** This struct holds the data for each diagnostic. */
const diagnostic_messages = [
    { message: () => "invalid argument being passed to `alias`; expected a bare word, symbol, constant, or global variable", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "invalid argument being passed to `alias`; can't make alias for the number variables", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected `&&=` in a multiple assignment", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected argument after a block argument", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected argument after `...`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected bare hash argument", level: PM_ERROR_LEVEL_SYNTAX },
    { message: null, level: 0 },
    { message: () => "both block arg and actual block given; only one block is allowed", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected `&`; anonymous block parameter is also used within block", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected `*`; anonymous rest parameter is also used within block", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected `**`; anonymous keyword rest parameter is also used within block", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "invalid formal argument; formal argument cannot be a class variable", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "invalid formal argument; formal argument cannot be a constant", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "invalid formal argument; formal argument cannot be a global variable", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "invalid formal argument; formal argument cannot be an instance variable", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected `...` in an non-parenthesized call", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected `&`; no anonymous block parameter", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected ... when the parent method is not forwarding", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected `*`; no anonymous rest parameter", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected `**`; no anonymous keyword rest parameter", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected `*` splat argument after a `**` keyword splat argument", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected `*` splat argument after a `*` splat argument", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0) => `unexpected ${a0}; expected a \`)\` to close the arguments`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected '{' after a method call without parenthesis", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected an element for the array", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected an expression for the array element", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected an expression after `*` in the array", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0) => `unexpected ${a0}; expected a \`,\` separator for the array elements`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0) => `unexpected ${a0}; expected a \`]\` to close the array`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected `else` in `begin` block; else without rescue is useless", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected an `end` to close the `begin` statement", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a `{` after `BEGIN`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a `}` to close the `BEGIN` statement", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "BEGIN is permitted only at toplevel", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a local variable name in the block parameters", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected the block parameters to end with `|`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a block beginning with `{` to end with `}`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a block beginning with `do` to end with `end`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "cannot parse the expression", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "cannot parse the string part", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected an expression after `case`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected an expression after `when`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a predicate for a case matching statement", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a `when` or `in` clause after `case`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected an `end` to close the `case` statement", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected class definition in method body", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected constant path after `class`; class/module name must be CONSTANT", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a superclass after `<`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected an `end` to close the `class` statement", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected `end`, expecting ';' or '\\n'", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "'@@' without identifiers is not allowed as a class variable name", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a predicate expression for the `elsif` statement", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a predicate expression for the `if` statement", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected `then` or `;` or '\\n'", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected an `end` to close the conditional clause", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected an `end` to close the `else` clause", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a predicate expression for the `unless` statement", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a predicate expression for the `until` statement", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a predicate expression for the `while` statement", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a constant after the `::` operator", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "could not parse the endless method body", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "could not parse the endless method parameters", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "invalid method name; a setter method cannot be defined in an endless method definition", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0) => `unexpected ${a0}; expected a method name`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a delimiter to close the parameters", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0) => `unexpected ${a0}; expected a \`)\` to close the parameters`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a receiver for the method definition", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a `.` or `::` after the receiver in a method definition", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected an `end` to close the `def` statement", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected an expression after `defined?`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "embedded document meets end of file", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a `}` to close the embedded expression", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "invalid embedded variable", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a `{` after `END`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a `}` to close the `END` statement", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "Invalid escape character syntax", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "invalid control escape sequence; control cannot be repeated", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "invalid hex escape sequence", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "Invalid escape character syntax", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "invalid meta escape sequence; meta cannot be repeated", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "invalid Unicode escape sequence", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "invalid Unicode escape sequence; Unicode cannot be combined with control or meta flags", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0, a1) => `invalid Unicode list: ${(a0 >= 0 ? a1.slice(0, a0) : a1)}`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "invalid Unicode escape sequence; Multiple codepoints at single character literal are disallowed", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "invalid Unicode escape sequence; maximum length is 6 digits", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0, a1) => `too short escape sequence: ${(a0 >= 0 ? a1.slice(0, a0) : a1)}`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unterminated Unicode escape", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0) => `unexpected ${a0}; expected an argument`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0) => `unexpected ${a0}, expecting end-of-input`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected an expression after `&&=`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected an expression after `,`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected an expression after `=`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected an expression after `<<`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected an expression after `(`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0) => `unexpected ${a0}; expected an expression after the operator`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected an expression after `||=`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: null, level: 0 },
    { message: () => "expected an expression after `*` splat in an argument", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected an expression after `**` in a hash", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected an expression after `*`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0) => `unexpected ${a0}; expected a 'do', newline, or ';' after the 'for' loop collection`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected an identifier for the required parameter", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a delimiter after the patterns of an `in` clause", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a `(` immediately after `not`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a `(` after `not`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a `(` to start a required parameter", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0) => `unexpected ${a0}; expecting a message to send to the receiver`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a matching `]`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a matching `)`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a `)` after multiple assignment", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a `)` to end a required parameter", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0) => `unexpected ${a0}; expected a newline or a ';' after the singleton class`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected string content after opening string delimiter", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a delimiter after the predicates of a `when` clause", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected bare hash in expression", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected '='; target cannot be written", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "Can't assign to __ENCODING__", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "Can't assign to false", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "Can't assign to __FILE__", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "Can't assign to __LINE__", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "Can't assign to nil", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0) => `Can't assign to numbered parameter ${a0.slice(0, 2)}`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "Can't change the value of self", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "Can't assign to true", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0, a1) => `could not parse the float '${(a0 >= 0 ? a1.slice(0, a0) : a1)}'`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a collection after the `in` in a `for` statement", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected an `in` after the index in a `for` statement", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected an index after `for`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected an `end` to close the `for` loop", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "'$' without identifiers is not allowed as a global variable name", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected an expression after the label in a hash", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0) => `unexpected ${a0}, expecting '}' or a key in the hash literal`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a `=>` between the hash key and value", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a `}` to close the hash literal", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0) => `unexpected ${a0}; expected a value in the hash literal`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unterminated here document identifier", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0, a1) => `unterminated heredoc; can't find string "${(a0 >= 0 ? a1.slice(0, a0) : a1)}" anywhere before EOF`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "incomplete expression at `?`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0, a1) => `'${(a0 >= 0 ? a1.slice(0, a0) : a1)}' is not allowed as a class variable name`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0, a1) => `\`${(a0 >= 0 ? a1.slice(0, a0) : a1)}' is not allowed as a class variable name`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0, a1) => `'${(a0 >= 0 ? a1.slice(0, a0) : a1)}' is not allowed as an instance variable name`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0, a1) => `\`${(a0 >= 0 ? a1.slice(0, a0) : a1)}' is not allowed as an instance variable name`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "'@' without identifiers is not allowed as an instance variable name", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0) => `Invalid ${a0}`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0) => `Invalid char '\\x${Math.abs(Math.trunc(Number(a0))).toString(16).toUpperCase().padStart(2, "0")}' in expression`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "invalid comma", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unknown or invalid encoding in the magic comment", level: PM_ERROR_LEVEL_ARGUMENT },
    { message: () => "Invalid escape character syntax", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "invalid exponent", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0, a1) => `identifier ${(a0 >= 0 ? a1.slice(0, a0) : a1)} is not valid to get`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0, a1) => `identifier ${(a0 >= 0 ? a1.slice(0, a0) : a1)} is not valid to set`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0) => `invalid multibyte char (${a0})`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0) => `invalid multibyte character 0x${Math.abs(Math.trunc(Number(a0))).toString(16).toUpperCase()}`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0, a1) => `invalid multibyte escape: /${(a0 >= 0 ? a1.slice(0, a0) : a1)}/`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "invalid binary number; numeric literal without digits", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "invalid decimal number; numeric literal without digits", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected fraction part after numeric literal", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "invalid hexadecimal number; numeric literal without digits", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "invalid octal number; numeric literal without digits", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "invalid underscore placement in number", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "trailing '_' in number", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unknown type of %string", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unterminated quoted string meets end of file", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0) => `invalid character \`${String.fromCharCode(typeof a0 === "number" ? a0 : String(a0).charCodeAt(0))}\``, level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "Invalid retry after else", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "Invalid retry after ensure", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "Invalid retry without rescue", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "invalid symbol", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0, a1) => `'${(a0 >= 0 ? a1.slice(0, a0) : a1)}' is not allowed as a global variable name`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0, a1) => `\`${(a0 >= 0 ? a1.slice(0, a0) : a1)}' is not allowed as a global variable name`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "Invalid yield", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "'it' is not allowed when a numbered parameter is already used", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "'it' is not allowed when an ordinary parameter is defined", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a `do` keyword or a `{` to open the lambda block", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a lambda block beginning with `{` to end with `}`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a lambda block beginning with `do` to end with `end`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a symbol in a `%i` list", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unterminated list; expected a closing delimiter for the `%i`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a symbol in a `%I` list", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unterminated list; expected a closing delimiter for the `%I`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a string in a `%w` list", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unterminated list; expected a closing delimiter for the `%w`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a string in a `%W` list", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unterminated list; expected a closing delimiter for the `%W`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "failed to allocate memory", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0) => `UTF-8 mixed within ${a0} source`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected module definition in method body", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected constant path after `module`; class/module name must be CONSTANT", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected an `end` to close the `module` statement", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "multiple splats in multiple assignment", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0, a1) => `unexpected '${(a0 >= 0 ? a1.slice(0, a0) : a1)}' resulting in multiple splats in multiple assignment`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "nesting too deep", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0, a1) => `${(a0 >= 0 ? a1.slice(0, a0) : a1)}: no such local variable`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0, a1) => `unexpected ${a0}; ${a1} is a non-associative operator`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected an expression after `not`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "number literal ending with a `_`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "numbered parameter is already used in inner block", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "numbered parameters are not allowed when 'it' is already used", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "numbered parameters are not allowed when an ordinary parameter is defined", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "numbered parameter is already used in outer block", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected operator for a multiple assignment", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected operator after a call with arguments", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected operator after a call with a block", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected multiple `**` splat parameters", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "multiple block parameters; only one block is allowed", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0, a1) => `circular argument reference - ${(a0 >= 0 ? a1.slice(0, a0) : a1)}`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "... after rest argument", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected name for a parameter", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "duplicated argument name", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a default value for the parameter", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a default value for the keyword parameter", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0) => `${a0.slice(0, 2)} is reserved for numbered parameters`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected parameter order", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected multiple `*` splat parameters", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected parameter `*`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected `...` in parameters", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected **nil; no keywords marker disallowed after keywords", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected `,` in parameters", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected multiple '*' rest patterns in an array pattern", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "duplicated variable name", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "variable capture in alternative pattern", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a pattern expression after the `[` operator", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a pattern expression after `,`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a pattern expression after `=>`", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a pattern expression after the `in` keyword", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a pattern expression after the key", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a pattern expression after the `(` operator", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a pattern expression after the `^` pin operator", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a pattern expression after the `|` operator", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a pattern expression after the range operator", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected pattern expression after the `**` expression", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "find patterns need at least one required inner pattern", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected implicit hash in pattern; use '{' to delineate", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0) => `unexpected ${a0}; expected a key in the hash pattern`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "duplicated key name", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "symbol literal with interpolation is not allowed", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a label as the key in the hash pattern", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "key must be valid as local variables", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected an identifier after the `=>` operator", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a label after the `,` in the hash pattern", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected rest pattern", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a `}` to close the pattern expression", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a `]` to close the pattern expression", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a `)` to close the pattern expression", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected `||=` in a multiple assignment", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0, a1) => `regexp encoding option '${String.fromCharCode(typeof a0 === "number" ? a0 : String(a0).charCodeAt(0))}' differs from source encoding '${a1}'`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0, a1) => `incompatible character encoding: /${(a0 >= 0 ? a1.slice(0, a0) : a1)}/`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0, a1) => `invalid Unicode range: /${(a0 >= 0 ? a1.slice(0, a0) : a1)}/`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0, a1) => `/.../n has a non escaped non ASCII character in non ASCII-8BIT script: /${(a0 >= 0 ? a1.slice(0, a0) : a1)}/`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0) => `${a0}`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unterminated regexp meets end of file; expected a closing delimiter", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0, a1, a2) => `unknown regexp ${a0} - ${(a1 >= 0 ? a2.slice(0, a1) : a2)}`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0) => `UTF-8 character in non UTF-8 regexp: /${a0}/`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a rescued expression", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a value after the `rescue` modifier", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a closing delimiter for the `rescue` clause", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected an exception variable after `=>` in a rescue statement", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "Invalid return in class/module body", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "no Ruby script found in input", level: PM_ERROR_LEVEL_LOAD },
    { message: () => "cannot define singleton method for literals", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected an `alias` at a non-statement position", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected an `END` at a non-statement position", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected a `BEGIN` at a non-statement position", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected an `undef` at a non-statement position", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a string for concatenation", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unterminated string; expected a closing delimiter for the interpolated string", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unterminated string meets end of file", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0) => `unexpected ${a0}, expected a string literal terminator`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "invalid symbol", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unterminated quoted string; expected a closing delimiter for the dynamic symbol", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unterminated symbol; expected a closing delimiter for the interpolated symbol", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a `:` after the true expression of a ternary operator", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected an expression after `:` in the ternary operator", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected an expression after `?` in the ternary operator", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0) => `unexpected ${a0}; unary calls are not allowed in this context`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0, a1) => `unexpected ${a0}, expected a receiver for unary \`${String.fromCharCode(typeof a1 === "number" ? a1 : String(a1).charCodeAt(0))}\``, level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "invalid argument being passed to `undef`; expected a bare word, constant, or symbol argument", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "block argument should not be given", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected block arg given in index assignment; blocks are not allowed in index assignment expressions", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected keyword arg given in index assignment; keywords are not allowed in index assignment expressions", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected label", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected multiple assignment; multiple assignment is not allowed in this context", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0) => `unexpected ${a0}; expected a default value for a parameter`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected range operator; .. and ... are non-associative and cannot be chained", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "&. inside multiple assignment destination", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0, a1) => `unexpected ${a0}, assuming it is closing the parent ${a1}`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0) => `unexpected ${a0}, ignoring it`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected an `end` to close the `until` statement", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected void value expression", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected an `end` to close the `while` statement", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "dynamic constant assignment", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0, a1) => `Can't set variable ${(a0 >= 0 ? a1.slice(0, a0) : a1)}`, level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "unexpected write target", level: PM_ERROR_LEVEL_SYNTAX },
    { message: () => "expected a closing delimiter for the `%x` or backtick string", level: PM_ERROR_LEVEL_SYNTAX },
    { message: (a0, a1) => `'${a0}' after local variable or literal is interpreted as binary operator even though it seems like ${a1}`, level: PM_WARNING_LEVEL_VERBOSE },
    { message: () => "ambiguous first argument; put parentheses or a space even after `-` operator", level: PM_WARNING_LEVEL_VERBOSE },
    { message: () => "ambiguous first argument; put parentheses or a space even after `+` operator", level: PM_WARNING_LEVEL_VERBOSE },
    { message: () => "ambiguous `&` has been interpreted as an argument prefix", level: PM_WARNING_LEVEL_VERBOSE },
    { message: () => "ambiguous `*` has been interpreted as an argument prefix", level: PM_WARNING_LEVEL_VERBOSE },
    { message: () => "ambiguous `**` has been interpreted as an argument prefix", level: PM_WARNING_LEVEL_VERBOSE },
    { message: () => "ambiguous `/`; wrap regexp in parentheses or add a space after `/` operator", level: PM_WARNING_LEVEL_VERBOSE },
    { message: (a0, a1) => `comparison '${(a0 >= 0 ? a1.slice(0, a0) : a1)}' after comparison`, level: PM_WARNING_LEVEL_VERBOSE },
    { message: () => "... at EOL, should be parenthesized?", level: PM_WARNING_LEVEL_DEFAULT },
    { message: () => "found '= literal' in conditional, should be ==", level: PM_WARNING_LEVEL_DEFAULT },
    { message: () => "found `= literal' in conditional, should be ==", level: PM_WARNING_LEVEL_DEFAULT },
    { message: () => "END in method; use at_exit", level: PM_WARNING_LEVEL_DEFAULT },
    { message: (a0, a1, a2) => `key ${(a0 >= 0 ? a1.slice(0, a0) : a1)} is duplicated and overwritten on line ${Math.abs(Math.trunc(Number(a2)))}`, level: PM_WARNING_LEVEL_DEFAULT },
    { message: (a0, a1) => `'when' clause on line ${Math.abs(Math.trunc(Number(a0)))} duplicates 'when' clause on line ${Math.abs(Math.trunc(Number(a1)))} and is ignored`, level: PM_WARNING_LEVEL_VERBOSE },
    { message: (a0, a1, a2) => `Float ${(a0 >= 0 ? a1.slice(0, a0) : a1)}${a2} out of range`, level: PM_WARNING_LEVEL_VERBOSE },
    { message: () => "'frozen_string_literal' is ignored after any tokens", level: PM_WARNING_LEVEL_VERBOSE },
    { message: (a0, a1, a2, a3, a4) => `mismatched indentations at '${(a0 >= 0 ? a1.slice(0, a0) : a1)}' with '${(a2 >= 0 ? a3.slice(0, a2) : a3)}' at ${Math.abs(Math.trunc(Number(a4)))}`, level: PM_WARNING_LEVEL_VERBOSE },
    { message: () => "integer literal in flip-flop", level: PM_WARNING_LEVEL_DEFAULT },
    { message: (a0, a1, a2) => `invalid character syntax; use ${a0}${a1}${a2}`, level: PM_WARNING_LEVEL_DEFAULT },
    { message: (a0, a1, a2, a3) => `invalid value for ${(a0 >= 0 ? a1.slice(0, a0) : a1)}: ${(a2 >= 0 ? a3.slice(0, a2) : a3)}`, level: PM_WARNING_LEVEL_VERBOSE },
    { message: (a0, a1) => `'${(a0 >= 0 ? a1.slice(0, a0) : a1)}' is too big for a number variable, always nil`, level: PM_WARNING_LEVEL_DEFAULT },
    { message: (a0, a1) => `\`${(a0 >= 0 ? a1.slice(0, a0) : a1)}\` at the end of line without an expression`, level: PM_WARNING_LEVEL_VERBOSE },
    { message: (a0, a1) => `${a0}literal in ${a1}`, level: PM_WARNING_LEVEL_DEFAULT },
    { message: (a0, a1) => `${a0}literal in ${a1}`, level: PM_WARNING_LEVEL_VERBOSE },
    { message: () => "'shareable_constant_value' is ignored unless in comment-only line", level: PM_WARNING_LEVEL_VERBOSE },
    { message: () => "shebang line ending with \\r may cause problems", level: PM_WARNING_LEVEL_DEFAULT },
    { message: () => "encountered \\r in middle of line, treated as a mere space", level: PM_WARNING_LEVEL_DEFAULT },
    { message: () => "statement not reached", level: PM_WARNING_LEVEL_VERBOSE },
    { message: (a0, a1) => `assigned but unused variable - ${(a0 >= 0 ? a1.slice(0, a0) : a1)}`, level: PM_WARNING_LEVEL_VERBOSE },
    { message: (a0, a1) => `possibly useless use of ${(a0 >= 0 ? a1.slice(0, a0) : a1)} in void context`, level: PM_WARNING_LEVEL_VERBOSE },
];

// Returns the rendered message text of the given diagnostic ID, with no
// format arguments. (static inline in C, where this returned the raw format
// string; here each entry's `message` is a closure, so a plain diagnostic's
// text is just that closure called with no arguments.)
export function pm_diagnostic_message(diag_id) {
    const message = diagnostic_messages[diag_id].message;
    return message === null ? null : message();
}

// Returns the level of the given diagnostic ID. (static inline in C)
export function pm_diagnostic_level(diag_id) {
    return diagnostic_messages[diag_id].level;
}

function pm_diagnostic_append(list, start, end, diag_id, message, owned) {
    list.push({
        location: { start, end },
        diag_id,
        message,
        owned,
        level: pm_diagnostic_level(diag_id)
    });
}

/**
 * Append a diagnostic to the given list of diagnostics that is using shared
 * memory for its message.
 */
export function pm_diagnostic_list_append(list, start, end, diag_id) {
    pm_diagnostic_append(list, start, end, diag_id, pm_diagnostic_message(diag_id), false);
}

/**
 * Append a diagnostic to the given list of diagnostics that is using a format
 * string for its message. Each message-table entry's `message` is a closure
 * taking already-formatted JS values (see the table above); this calls it
 * directly instead of running a format string through a printf engine.
 */
export function pm_diagnostic_list_append_format(list, start, end, diag_id, ...args) {
    pm_diagnostic_append(list, start, end, diag_id, diagnostic_messages[diag_id].message(...args), true);
}

