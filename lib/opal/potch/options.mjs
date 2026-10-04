import { pm_strspn_decimal_digit } from "./util/pm_char.mjs";

// Frozen string literal magic comment values
export const PM_OPTIONS_FROZEN_STRING_LITERAL_DISABLED = -1;
export const PM_OPTIONS_FROZEN_STRING_LITERAL_UNSET = 0;
export const PM_OPTIONS_FROZEN_STRING_LITERAL_ENABLED = 1;

// Scope forwarding flags
export const PM_OPTIONS_SCOPE_FORWARDING_NONE = 0x0;
export const PM_OPTIONS_SCOPE_FORWARDING_POSITIONALS = 0x1;
export const PM_OPTIONS_SCOPE_FORWARDING_KEYWORDS = 0x2;
export const PM_OPTIONS_SCOPE_FORWARDING_BLOCK = 0x4;
export const PM_OPTIONS_SCOPE_FORWARDING_ALL = 0x8;

// pm_options_version_t
export const PM_OPTIONS_VERSION_UNSET = 0;
export const PM_OPTIONS_VERSION_CRUBY_3_3 = 1;
export const PM_OPTIONS_VERSION_CRUBY_3_4 = 2;
export const PM_OPTIONS_VERSION_CRUBY_3_5 = 3;
export const PM_OPTIONS_VERSION_CRUBY_4_0 = 3;
export const PM_OPTIONS_VERSION_CRUBY_4_1 = 4;
export const PM_OPTIONS_VERSION_LATEST = PM_OPTIONS_VERSION_CRUBY_4_1;

// Command line option bits
export const PM_OPTIONS_COMMAND_LINE_A = 0x1;
export const PM_OPTIONS_COMMAND_LINE_E = 0x2;
export const PM_OPTIONS_COMMAND_LINE_L = 0x4;
export const PM_OPTIONS_COMMAND_LINE_N = 0x8;
export const PM_OPTIONS_COMMAND_LINE_P = 0x10;
export const PM_OPTIONS_COMMAND_LINE_X = 0x20;

/**
 * Set the filepath option on the given options struct.
 */
export function pm_options_filepath_set(options, filepath) {
    options.filepath = filepath;
}

/**
 * Set the encoding option on the given options struct.
 */
export function pm_options_encoding_set(options, encoding) {
    options.encoding = encoding;
}

/**
 * Set the line option on the given options struct.
 */
export function pm_options_line_set(options, line) {
    options.line = line;
}

/**
 * Set the frozen string literal option on the given options struct.
 */
export function pm_options_frozen_string_literal_set(options, frozen_string_literal) {
    options.frozen_string_literal = frozen_string_literal ? PM_OPTIONS_FROZEN_STRING_LITERAL_ENABLED : PM_OPTIONS_FROZEN_STRING_LITERAL_DISABLED;
}

// Maps the 3-character "X.Y" prefix of a --version string to the enum value
// it selects. Both "3.5" and "4.0" map to PM_OPTIONS_VERSION_CRUBY_4_0 (they
// share the same underlying value) since CRuby 4.0 absorbed 3.5's grammar.
const PM_OPTIONS_VERSION_BY_PREFIX = new Map([
    ["3.3", PM_OPTIONS_VERSION_CRUBY_3_3],
    ["3.4", PM_OPTIONS_VERSION_CRUBY_3_4],
    ["3.5", PM_OPTIONS_VERSION_CRUBY_4_0],
    ["4.0", PM_OPTIONS_VERSION_CRUBY_4_0],
    ["4.1", PM_OPTIONS_VERSION_CRUBY_4_1],
]);

/**
 * Set the version option on the given options struct by parsing the given
 * string. If the string contains an invalid option, this returns false.
 * Otherwise, it returns true.
 */
export function pm_options_version_set(options, version, length) {
    if (version === null) {
        options.version = PM_OPTIONS_VERSION_LATEST;
        return true;
    }

    if (length === 6 && version.slice(0, 6) === "latest") {
        options.version = PM_OPTIONS_VERSION_LATEST;
        return true;
    }

    const mapped = PM_OPTIONS_VERSION_BY_PREFIX.get(version.slice(0, 3));
    if (mapped === undefined) return false;

    if (length === 3) {
        options.version = mapped;
        return true;
    }

    // "X.Y.Z...": accept an arbitrary-length, all-decimal-digit patch version
    // (including an empty one, i.e. a trailing dot with nothing after it -
    // this matches the original is_number(..., length - 4)'s behavior of
    // treating a zero-length span as trivially all-digits).
    if (length >= 4 && version[3] === "." && pm_strspn_decimal_digit(version, 4, length - 4) === length - 4) {
        options.version = mapped;
        return true;
    }

    return false;
}

/**
 * Set the main script option on the given options struct.
 */
export function pm_options_main_script_set(options, main_script) {
    options.main_script = main_script;
}

/**
 * Set the partial script option on the given options struct.
 */
export function pm_options_partial_script_set(options, partial_script) {
    options.partial_script = partial_script;
}

// Maps a command_line flag letter to its bit. Mirrors CRuby's
// dump_options_command_line (lib/prism/ffi.rb) and pm_options_read
// (src/options.c).
const COMMAND_LINE_BITS = {
    a: PM_OPTIONS_COMMAND_LINE_A,
    e: PM_OPTIONS_COMMAND_LINE_E,
    l: PM_OPTIONS_COMMAND_LINE_L,
    n: PM_OPTIONS_COMMAND_LINE_N,
    p: PM_OPTIONS_COMMAND_LINE_P,
    x: PM_OPTIONS_COMMAND_LINE_X,
};

/**
 * Set the command_line option on the given options struct. Accepts either a
 * pre-computed numeric bitmask or the CRuby-style flag-letter string ("pna").
 */
export function pm_options_command_line_set(options, command_line) {
    if (typeof command_line === "number") {
        options.command_line = command_line;
        return;
    }
    let value = 0;
    for (const char of String(command_line)) {
        const bit = COMMAND_LINE_BITS[char];
        if (bit === undefined) throw new Error(`invalid command_line option: ${char}`);
        value |= bit;
    }
    options.command_line = value;
}

/**
 * Allocate and zero out the scopes array on the given options struct.
 */
export function pm_options_scopes_init(options, scopes_count) {
    options.scopes_count = scopes_count;
    options.scopes = new Array(scopes_count);
    for (let i = 0; i < scopes_count; i++) options.scopes[i] = {};
}

/**
 * Return a pointer to the scope at the given index within the given options.
 */
export function pm_options_scope_get(options, index) {
    return options.scopes[index];
}

/**
 * Create a new options scope struct. This will hold a set of locals that are in
 * scope surrounding the code that is being parsed.
 */
export function pm_options_scope_init(scope, locals_count) {
    scope.locals_count = locals_count;
    scope.locals = new Array(locals_count);
    for (let i = 0; i < locals_count; i++) scope.locals[i] = { type: 0, length: 0, source: null };
    scope.forwarding = PM_OPTIONS_SCOPE_FORWARDING_NONE;
}

/**
 * Return a pointer to the local at the given index within the given scope.
 */
export function pm_options_scope_local_get(scope, index) {
    return scope.locals[index];
}

/**
 * Set the forwarding option on the given scope struct.
 */
export function pm_options_scope_forwarding_set(scope, forwarding) {
    scope.forwarding = forwarding;
}

