// encoding.js (uni)
//
// The uni build always operates on decoded UTF-16 text, so the entire
// encoding-table subsystem of the C library collapses into a single Unicode
// encoding object. Character classification uses Unicode property tests;
// every character is one code unit - except astral characters, which are
// surrogate pairs (width 2).
//
// Exported names mirror include/prism/encoding.h so converted call sites
// compile unchanged.

export const PRISM_ENCODING_ALPHABETIC_BIT = 1 << 0;
export const PRISM_ENCODING_ALPHANUMERIC_BIT = 1 << 1;
export const PRISM_ENCODING_UPPERCASE_BIT = 1 << 2;

const ALPHA_RE = /[\p{Alphabetic}]/u;
const ALNUM_RE = /[\p{Alphabetic}\p{Nd}\p{Nl}\p{No}\d]/u;
const UPPER_RE = /\p{Uppercase}/u;

function isHighSurrogate(c) {
	return c >= 0xd800 && c <= 0xdbff;
}
function isLowSurrogate(c) {
	return c >= 0xdc00 && c <= 0xdfff;
}

// Decode the code point at offset. (Callers that need the code unit width
// already computed it via uni_char_width before calling this.)
function decode(source, offset) {
	const c = source.charCodeAt(offset);
	if (isHighSurrogate(c) && offset + 1 < source.length && isLowSurrogate(source.charCodeAt(offset + 1))) {
		return (c - 0xd800) * 0x400 + (source.charCodeAt(offset + 1) - 0xdc00) + 0x10000;
	}
	return c;
}

// Width of the character at offset in code units (astral = 2), or 0 if
// invalid (out of bounds / lone surrogate).
export function uni_char_width(source, offset, n) {
	if (n <= 0 || offset < 0 || offset >= source.length) return 0;
	const c = source.charCodeAt(offset);
	if (c === 0) return 0;
	if (isHighSurrogate(c)) {
		return offset + 1 < source.length && isLowSurrogate(source.charCodeAt(offset + 1)) ? 2 : 0;
	}
	if (isLowSurrogate(c)) return 0;
	return 1;
}

function classify(source, offset, n, test) {
	const width = uni_char_width(source, offset, n);
	if (width === 0) return 0;
	const cp = decode(source, offset);
	return test(cp) ? width : 0;
}

function alphaTest(cp) {
	if (cp < 0x80) return (cp >= 65 && cp <= 90) || (cp >= 97 && cp <= 122);
	return ALPHA_RE.test(String.fromCodePoint(cp));
}
function alnumTest(cp) {
	if (cp < 0x80) return (cp >= 65 && cp <= 90) || (cp >= 97 && cp <= 122) || (cp >= 48 && cp <= 57);
	return ALNUM_RE.test(String.fromCodePoint(cp));
}
function upperTest(cp) {
	if (cp < 0x80) return cp >= 65 && cp <= 90;
	return UPPER_RE.test(String.fromCodePoint(cp));
}

// The single encoding instance used everywhere in the uni build.
export const UNI_ENCODING = {
	char_width: uni_char_width,
	alpha_char: (source, offset, n) => classify(source, offset, n, alphaTest),
	alnum_char: (source, offset, n) => classify(source, offset, n, alnumTest),
	isupper_char: (source, offset, n) => classify(source, offset, n, upperTest) !== 0,
	name: "UTF-16",
	multibyte: true,
};

// Public single-character callbacks (names kept from encoding.h).
export function pm_encoding_utf_8_char_width(source, offset, n) {
	return UNI_ENCODING.char_width(source, offset, n);
}
export function pm_encoding_utf_8_isupper_char(source, offset, n) {
	return UNI_ENCODING.isupper_char(source, offset, n);
}

// The ASCII classification table referenced by the parser. Every call site
// indexes it only under a `charCodeAt(...) < 0x80` guard, so it only needs
// to cover the ASCII range (indices 128-255 of the original 256-entry Latin-1
// table were never read).
export const pm_encoding_unicode_table = buildUnicodeTable();

function bit(alphabetic, alphanumeric, uppercase) {
	return (alphabetic ? PRISM_ENCODING_ALPHABETIC_BIT : 0) |
		(alphanumeric ? PRISM_ENCODING_ALPHANUMERIC_BIT : 0) |
		(uppercase ? PRISM_ENCODING_UPPERCASE_BIT : 0);
}

function buildUnicodeTable() {
	const table = new Array(128).fill(0);
	for (let cp = 0; cp < 128; cp++) {
		const ch = String.fromCharCode(cp);
		table[cp] = bit(ALPHA_RE.test(ch), ALNUM_RE.test(ch), UPPER_RE.test(ch));
	}
	return table;
}

// Every requested encoding name resolves to the Unicode implementation: the
// caller's text has already been decoded, so the original file encoding is
// irrelevant to parsing.
export function pm_encoding_find(buffer, start, end) {
	// The source has already been decoded, so every encoding Ruby knows is
	// the same entry; an unknown name is null, as in the real parser (a
	// magic comment then gets PM_ERR_INVALID_ENCODING_MAGIC_COMMENT).
	if (buffer == null || end <= start) return null;
	if (pm_encoding_canonical_name(String(buffer).slice(start, end)) === null) return null;
	return UNI_ENCODING;
}

// UNI-BUILD helper: classify a declared encoding name (from a magic comment
// or the `encoding:` option) into the family the parser still needs -
// "utf8" (UTF-8 and its aliases/platform suffixes, CP65001), "us-ascii"
// (US-ASCII / ASCII / ANSI_X3.4-1968), or "other" (everything else,
// including BINARY/ASCII-8BIT, EUC-JP, Shift_JIS, ...). Mirrors the
// relevant branches of the real pm_encoding_find name table.
export function pm_encoding_family(name) {
	const n = String(name).trim().toLowerCase();
	if (n.startsWith("utf-8") || n.startsWith("utf8") || n === "cp65001") return "utf8";
	if (n === "us-ascii" || n === "ascii" || n === "ansi_x3.4-1968") return "us-ascii";
	return "other";
}

// UNI-BUILD: `pm_encoding_find` above collapses every encoding to one object,
// so the source's *declared* encoding name is otherwise lost. The potch bridge
// still needs it: `Prism::Result#encoding` must report the encoding a magic
// comment (or the `encoding:` option) selected, exactly as the real library's
// serialized metadata carries `parser->encoding->name`. This table + resolver
// reproduce `pm_encoding_find`'s name recognition (src/encoding.c) and return
// the canonical Ruby encoding name, or null for an unrecognized name (which is
// how the real parser decides to keep the default UTF-8 and emit
// PM_ERR_INVALID_ENCODING_MAGIC_COMMENT). Keys are lowercased; matching is
// case-insensitive and length-exact, just like the C ENCODING1/ENCODING2 macros.
const ENCODING_CANONICAL_NAMES = {
	"ascii": "US-ASCII", "ascii-8bit": "ASCII-8BIT", "ansi_x3.4-1968": "US-ASCII",
	"binary": "ASCII-8BIT", "big5": "Big5", "big5-uao": "Big5-UAO",
	"big5-hkscs": "Big5-HKSCS", "big5-hkscs:2008": "Big5-HKSCS",
	"cp65001": "UTF-8", "cesu-8": "CESU-8", "cp437": "IBM437", "cp720": "IBM720",
	"cp737": "IBM737", "cp775": "IBM775", "cp850": "CP850", "cp852": "CP852",
	"cp855": "CP855", "cp857": "IBM857", "cp860": "IBM860", "cp861": "IBM861",
	"cp862": "IBM862", "cp863": "IBM863", "cp864": "IBM864", "cp865": "IBM865",
	"cp866": "IBM866", "cp869": "IBM869", "cp874": "Windows-874", "cp878": "KOI8-R",
	"cp932": "Windows-31J", "cswindows31j": "Windows-31J", "cp936": "GBK",
	"cp949": "CP949", "cp950": "CP950", "cp951": "CP951", "cp1250": "Windows-1250",
	"cp1251": "Windows-1251", "cp1252": "Windows-1252", "cp1253": "Windows-1253",
	"cp1254": "Windows-1254", "cp1255": "Windows-1255", "cp1256": "Windows-1256",
	"cp1257": "Windows-1257", "cp1258": "Windows-1258", "cp51932": "CP51932",
	"emacs-mule": "Emacs-Mule", "euc-jp": "EUC-JP", "eucjp": "EUC-JP",
	"eucjp-ms": "eucJP-ms", "euc-jp-ms": "eucJP-ms", "euc-jis-2004": "EUC-JIS-2004",
	"euc-jisx0213": "EUC-JIS-2004", "euc-kr": "EUC-KR", "euckr": "EUC-KR",
	"euc-cn": "GB2312", "euccn": "GB2312", "euc-tw": "EUC-TW", "euctw": "EUC-TW",
	"gbk": "GBK", "gb12345": "GB12345", "gb18030": "GB18030", "gb1988": "GB1988",
	"gb2312": "GB2312", "ibm437": "IBM437", "ibm720": "IBM720", "ibm737": "IBM737",
	"ibm775": "IBM775", "ibm850": "CP850", "ibm852": "IBM852", "ibm855": "IBM855",
	"ibm857": "IBM857", "ibm860": "IBM860", "ibm861": "IBM861", "ibm862": "IBM862",
	"ibm863": "IBM863", "ibm864": "IBM864", "ibm865": "IBM865", "ibm866": "IBM866",
	"ibm869": "IBM869", "koi8-r": "KOI8-R", "koi8-u": "KOI8-U",
	"maccenteuro": "macCentEuro", "maccroatian": "macCroatian",
	"maccyrillic": "macCyrillic", "macgreek": "macGreek", "maciceland": "macIceland",
	"macjapanese": "MacJapanese", "macjapan": "MacJapanese", "macroman": "macRoman",
	"macromania": "macRomania", "macthai": "macThai", "macturkish": "macTurkish",
	"macukraine": "macUkraine", "pck": "Windows-31J", "sjis": "Windows-31J",
	"shift_jis": "Shift_JIS", "sjis-docomo": "SJIS-DoCoMo", "sjis-kddi": "SJIS-KDDI",
	"sjis-softbank": "SJIS-SoftBank", "stateless-iso-2022-jp": "stateless-ISO-2022-JP",
	"stateless-iso-2022-jp-kddi": "stateless-ISO-2022-JP-KDDI", "tis-620": "TIS-620",
	"us-ascii": "US-ASCII", "utf8-mac": "UTF8-MAC", "utf-8-hfs": "UTF8-MAC",
	"utf8-docomo": "UTF8-DoCoMo", "utf8-kddi": "UTF8-KDDI",
	"utf8-softbank": "UTF8-SoftBank", "windows-31j": "Windows-31J",
	"windows-874": "Windows-874", "windows-1250": "Windows-1250",
	"windows-1251": "Windows-1251", "windows-1252": "Windows-1252",
	"windows-1253": "Windows-1253", "windows-1254": "Windows-1254",
	"windows-1255": "Windows-1255", "windows-1256": "Windows-1256",
	"windows-1257": "Windows-1257", "windows-1258": "Windows-1258",
	"646": "US-ASCII",
	"iso-8859-1": "ISO-8859-1", "iso8859-1": "ISO-8859-1", "iso-8859-2": "ISO-8859-2",
	"iso8859-2": "ISO-8859-2", "iso-8859-3": "ISO-8859-3", "iso8859-3": "ISO-8859-3",
	"iso-8859-4": "ISO-8859-4", "iso8859-4": "ISO-8859-4", "iso-8859-5": "ISO-8859-5",
	"iso8859-5": "ISO-8859-5", "iso-8859-6": "ISO-8859-6", "iso8859-6": "ISO-8859-6",
	"iso-8859-7": "ISO-8859-7", "iso8859-7": "ISO-8859-7", "iso-8859-8": "ISO-8859-8",
	"iso8859-8": "ISO-8859-8", "iso-8859-9": "ISO-8859-9", "iso8859-9": "ISO-8859-9",
	"iso-8859-10": "ISO-8859-10", "iso8859-10": "ISO-8859-10",
	"iso-8859-11": "ISO-8859-11", "iso8859-11": "ISO-8859-11",
	"iso-8859-13": "ISO-8859-13", "iso8859-13": "ISO-8859-13",
	"iso-8859-14": "ISO-8859-14", "iso8859-14": "ISO-8859-14",
	"iso-8859-15": "ISO-8859-15", "iso8859-15": "ISO-8859-15",
	"iso-8859-16": "ISO-8859-16", "iso8859-16": "ISO-8859-16",
};

export function pm_encoding_canonical_name(name) {
	const raw = String(name);
	// UTF-8 prefix rule: any name beginning "UTF-8" is UTF-8 (platform suffixes
	// like -MAC / -UNIX are ignored), except "UTF-8-HFS" which is UTF8-MAC.
	if (raw.length >= 5 && raw.slice(0, 5).toLowerCase() === "utf-8") {
		if (raw.length === 9 && raw.slice(5).toLowerCase() === "-hfs") return "UTF8-MAC";
		return "UTF-8";
	}
	return ENCODING_CANONICAL_NAMES[raw.toLowerCase()] ?? null;
}

// Entry accessors used by the parser bootstrap.
export const PM_ENCODING_UTF_8_ENTRY = UNI_ENCODING;
export const PM_ENCODING_US_ASCII_ENTRY = UNI_ENCODING;
export const PM_ENCODING_ASCII_8BIT_ENTRY = UNI_ENCODING;
export const PM_ENCODING_EUC_JP_ENTRY = UNI_ENCODING;
export const PM_ENCODING_WINDOWS_31J_ENTRY = UNI_ENCODING;
