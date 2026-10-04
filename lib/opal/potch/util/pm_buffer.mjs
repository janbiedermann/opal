// pm_buffer.js (uni) - a growable STRING builder.
//
// In the UTF-16 port every byte buffer becomes a buffer of UTF-16 code units.
// The public API mirrors the C pm_buffer_t functions so the converted parser
// code is unchanged; the stored payload however is text, and pm_buffer_value
// returns a real JavaScript string.
//
// Object shape: { capacity: number, length: number, bytes: string[] }
// ("bytes" keeps the historical field name; it holds string chunks.)


// Escaping modes (kept for API parity with the C buffer; used by dump_json).
export const PM_BUFFER_ESCAPING_RUBY = 1;
export const PM_BUFFER_ESCAPING_JSON = 2;

export function pm_buffer_init_capacity(buffer, capacity) {
	buffer.capacity = typeof capacity === "number" ? Math.max(capacity, 16) : 16;
	buffer.length = 0;
	buffer.bytes = [];
	return true;
}

export function pm_buffer_init(buffer) {
	return pm_buffer_init_capacity(buffer, 1024);
}

// The full accumulated text.
export function pm_buffer_value(buffer) {
	const value = buffer.bytes.join("");
	// normalize back to a single chunk so repeated joins stay cheap
	buffer.bytes = [value];
	return value;
}

export function pm_buffer_length(buffer) {
	return buffer.length;
}

function ensure(buffer) {
	if (!Array.isArray(buffer.bytes)) buffer.bytes = [];
}

function appendChunk(buffer, chunk, unitLength) {
	ensure(buffer);
	buffer.bytes.push(chunk);
	buffer.length += unitLength;
}

export function pm_buffer_append_length() {
	// C returns false on allocation failure; strings cannot fail.
	return true;
}

// Append raw text (or a single numeric char code for convenience).
export function pm_buffer_append(buffer, text) {
	if (typeof text === "number") {
		appendChunk(buffer, String.fromCharCode(text), 1);
	} else {
		appendChunk(buffer, text, text.length);
	}
}

export function pm_buffer_append_zeroes(buffer, count) {
	appendChunk(buffer, "\u0000".repeat(count), count);
}

// Append a JS string (C: pm_buffer_append_str / append_cstr).
export function pm_buffer_append_string(buffer, text) {
	const str = String(text);
	appendChunk(buffer, str, str.length);
}

// Append a string, optionally truncated: append_bytes(buffer, text[, length]).
// Matches the C convention where the third argument is a byte count.
export function pm_buffer_append_bytes(buffer, source, startOrLength, end) {
	if (typeof source === "string") {
		if (startOrLength === undefined) {
			appendChunk(buffer, source, source.length);
		} else if (end === undefined) {
			const n = typeof startOrLength === "number" ? startOrLength : source.length;
			const piece = source.slice(0, Math.min(n, source.length));
			appendChunk(buffer, piece, piece.length);
		} else {
			const piece = source.slice(startOrLength, end);
			appendChunk(buffer, piece, piece.length);
		}
		return;
	}
	// Arrays of char codes (e.g. breakpoint tables) are appended as chars.
	let out = "";
	for (let i = 0; i < source.length; i++) out += String.fromCharCode(source[i]);
	appendChunk(buffer, out, out.length);
}

export function pm_buffer_append_byte(buffer, byte) {
	appendChunk(buffer, String.fromCharCode(byte), 1);
}

// The printf-style format-string engine that used to live here has been
// removed: every one of its real call sites (the diagnostic message table,
// and a handful of one-off %s/%d/%02X uses elsewhere) has been converted to
// a direct JS expression or closure. The one non-trivial conversion ("%g",
// used to inspect Float literal values) now lives as pm_format_g in
// static_literals.js, its sole remaining consumer.

// Alias used by some converted call sites.
export const pm_buffer_append_str = pm_buffer_append_string;

export function pm_buffer_prepend_string(buffer, text) {
	ensure(buffer);
	const str = String(text);
	buffer.bytes.unshift(str);
	buffer.length += str.length;
}

export function pm_buffer_concat(buffer, other) {
	const text = typeof other === "string" ? other : pm_buffer_value(other);
	appendChunk(buffer, text, text.length);
}

export function pm_buffer_clear(buffer) {
	buffer.bytes = [];
	buffer.length = 0;
}

export function pm_buffer_rstrip(buffer) {
	const text = pm_buffer_value(buffer);
	let end = text.length;
	while (end > 0) {
		const c = text.charCodeAt(end - 1);
		if (c === 32 || c === 9 || c === 10 || c === 11 || c === 12 || c === 13) end--;
		else break;
	}
	if (end !== text.length) {
		const trimmed = text.slice(0, end);
		buffer.bytes = [trimmed];
		buffer.length = end;
	}
}

export function pm_buffer_index(buffer, needle) {
	return pm_buffer_value(buffer).indexOf(needle);
}

export function pm_buffer_insert(buffer, index, text) {
	const value = pm_buffer_value(buffer);
	const next = value.slice(0, index) + text + value.slice(index);
	buffer.bytes = [next];
	buffer.length = next.length;
}

// Append the UTF-16 code units of the given code point. Astral characters
// contribute two code units (surrogate pair). Returns false for invalid
// code points, mirroring the C bool return.
export function pm_buffer_append_unicode_codepoint(buffer, value) {
	if (typeof value !== "number" || Number.isNaN(value) || value < 0 || value > 0x10ffff) {
		return false;
	}
	const text = String.fromCodePoint(value);
	appendChunk(buffer, text, text.length);
	return true;
}

// Append a source-derived string with C-compatible escaping. C's
// pm_buffer_append_source iterates UTF-8 bytes; here `source` is a JS string,
// so non-ASCII code points are re-encoded to UTF-8 bytes to match C's \xNN
// output, while ASCII code units follow C's byte switch exactly.
function utf8Bytes(codePoint) {
	if (codePoint < 0x80) return [codePoint];
	if (codePoint < 0x800) return [0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f)];
	if (codePoint < 0x10000) return [0xe0 | (codePoint >> 12), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f)];
	return [0xf0 | (codePoint >> 18), 0x80 | ((codePoint >> 12) & 0x3f), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f)];
}

export function pm_buffer_append_source(buffer, source, length, escaping) {
	const text = typeof source === "string" ? source : String(source ?? "");
	const n = Math.min(typeof length === "number" ? length : text.length, text.length);
	let out = "";
	for (let index = 0; index < n; ) {
		const codePoint = text.codePointAt(index);
		index += codePoint > 0xffff ? 2 : 1;
		if (codePoint < 0x80) {
			if ((codePoint <= 0x06) || (codePoint >= 0x0e && codePoint <= 0x1f) || codePoint === 0x7f) {
				out += escaping === PM_BUFFER_ESCAPING_JSON
					? `\\u${codePoint.toString(16).toUpperCase().padStart(4, "0")}`
					: `\\x${codePoint.toString(16).toUpperCase().padStart(2, "0")}`;
			} else {
				switch (codePoint) {
					case 0x07: out += escaping === PM_BUFFER_ESCAPING_RUBY ? "\\a" : "\\u0007"; break;
					case 0x08: out += "\\b"; break;
					case 0x09: out += "\\t"; break;
					case 0x0a: out += "\\n"; break;
					case 0x0b: out += escaping === PM_BUFFER_ESCAPING_RUBY ? "\\v" : "\\u000b"; break;
					case 0x0c: out += "\\f"; break;
					case 0x0d: out += "\\r"; break;
					case 0x22: out += "\\\""; break;
					case 0x23: {
						if (escaping === PM_BUFFER_ESCAPING_RUBY && index < n) {
							const next = text.charCodeAt(index);
							if (next === 0x7b /* { */ || next === 0x40 /* @ */ || next === 0x24 /* $ */) out += "\\";
						}
						out += "#";
						break;
					}
					case 0x5c: out += "\\\\"; break;
					default: out += String.fromCharCode(codePoint);
				}
			}
		} else {
			for (const byte of utf8Bytes(codePoint)) {
				out += `\\x${byte.toString(16).toUpperCase().padStart(2, "0")}`;
			}
		}
	}
	pm_buffer_append_string(buffer, out);
}

// Recompose a Latin-1 style code-unit string (where values 0x80..0xFF were
// individual UTF-8 *bytes* produced by \xNN / \ONN escapes) into proper
// Unicode text. Invalid sequences become U+FFFD, mirroring how decoding the
// byte-oriented build's output behaves.
export function composeLatin1Utf8(text) {
	let out = "";
	const n = text.length;
	for (let i = 0; i < n; ) {
		const c = text.charCodeAt(i);
		if (c < 0x80 || c > 0xff) {
			out += text[i];
			i++;
			continue;
		}
		const len = c >= 0xf0 ? 4 : c >= 0xe0 ? 3 : c >= 0xc0 ? 2 : 1;
		let ok = len > 1;
		if (ok && i + len > n) ok = false;
		const u = [c];
		if (ok) {
			for (let k = 1; k < len; k++) {
				const cc = text.charCodeAt(i + k);
				u.push(cc);
				if ((cc & 0xc0) !== 0x80) { ok = false; break; }
			}
		}
		let cp = 0;
		if (ok) {
			cp = len === 2
				? ((u[0] & 0x1f) << 6) | (u[1] & 0x3f)
				: len === 3
					? ((u[0] & 0x0f) << 12) | ((u[1] & 0x3f) << 6) | (u[2] & 0x3f)
					: ((u[0] & 0x07) << 18) | ((u[1] & 0x3f) << 12) | ((u[2] & 0x3f) << 6) | (u[3] & 0x3f);
			if (cp >= 0xd800 && cp <= 0xdfff) ok = false;
			const min = len === 2 ? 0x80 : len === 3 ? 0x800 : 0x10000;
			if (cp < min || cp > 0x10ffff) ok = false;
		}
		if (!ok) {
			out += "\uFFFD";
			i++;
			continue;
		}
		out += String.fromCodePoint(cp);
		i += len;
	}
	return out;
}
