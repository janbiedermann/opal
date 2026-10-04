// pm_strpbrk.js (uni) - locate any of a set of code units in the source.
//
// Signature mirrors the converted call sites:
//   pm_strpbrk(parser, startOffset, charset, maximum, validate)
// charset is an array of char codes (historically a NUL-padded byte table).
// Returns the matching offset or -1. The multibyte validation paths of the C
// implementation do not apply: input is already decoded UTF-16 text.

import { PM_ERR_INVALID_MULTIBYTE_ESCAPE, pm_diagnostic_list_append } from "../diagnostic.mjs";

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
	while (cursor < end) {
		const c = source.charCodeAt(cursor);
		// The C breakpoint tables always include the NUL sentinel, so an
		// embedded NUL inside bounds is a *match* (content ends there).
		if (charset.includes(c)) {
			return validate ? pm_strpbrk_invalid_multibyte_character(parser, source, cursor) : cursor;
		}
		cursor++;
	}
	return -1;
}

export function pm_strpbrk_explicit_encoding_set(parser) {
	// In the C implementation this marks the explicit encoding when a high
	// byte is found; the uni build is single-encoding by construction.
	parser.explicit_encoding = parser.encoding;
}
