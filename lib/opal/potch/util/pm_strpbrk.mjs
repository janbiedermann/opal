// pm_strpbrk.js (uni) - locate any of a set of code units in the source.
//
// Signature mirrors the converted call sites:
//   pm_strpbrk(parser, startOffset, charset, maximum, validate)
// charset is an array of char codes (historically a NUL-padded byte table).
// Returns the matching offset or -1. The multibyte validation paths of the C
// implementation do not apply: input is already decoded UTF-16 text.

import { PM_ERR_INVALID_MULTIBYTE_ESCAPE, PM_ERR_MIXED_ENCODING, pm_diagnostic_list_append, pm_diagnostic_list_append_format } from "../diagnostic.mjs";

export function pm_strpbrk_invalid_multibyte_character(parser, source, cursor) {
	if (parser !== null && parser !== undefined) {
		const c = source.charCodeAt(cursor);
		if (c >= 0xd800 && c <= 0xdfff) {
			pm_diagnostic_list_append(parser.error_list, cursor, cursor + 1, PM_ERR_INVALID_MULTIBYTE_ESCAPE);
		}
	}
	return cursor;
}

export function pm_strpbrk(parser, start, charset, maximum, validate) {
	const source = parser.source;
	let cursor = start;
	const end = Math.min(start + maximum, source.length);
	// (a non-ASCII character of a source in another encoding than UTF-8
	// locks the literal to that encoding, as in C's non-UTF-8 paths)
	const lock = validate && parser.source_encoding_family !== undefined && parser.source_encoding_family !== "utf8";
	while (cursor < end) {
		const c = source.charCodeAt(cursor);
		// The C breakpoint tables always include the NUL sentinel, so an
		// embedded NUL inside bounds is a *match* (content ends there).
		if (charset.includes(c)) {
			return validate ? pm_strpbrk_invalid_multibyte_character(parser, source, cursor) : cursor;
		}
		// (C reports a conflict at the start of the scan, not at the character)
		if (lock && c >= 0x80) pm_strpbrk_explicit_encoding_set(parser, start, 1);
		cursor++;
	}
	return -1;
}

// A non-ASCII character in a literal of a source in another encoding than
// UTF-8: the literal is in the source's encoding, which conflicts with a
// `\u` escape before it (explicit_encoding "utf8", see escape_write_unicode).
export function pm_strpbrk_explicit_encoding_set(parser, start, width) {
	if (parser.explicit_encoding === "utf8") {
		pm_diagnostic_list_append_format(parser.error_list, start, start + width, PM_ERR_MIXED_ENCODING, parser.encoding_comment_name);
	}
	parser.explicit_encoding = parser.source_encoding_family;
}
