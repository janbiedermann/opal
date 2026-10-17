// pm_constant_pool.js (uni) - interner over JS string keys.
//
// Same id semantics as the C implementation: each distinct key gets one
// sequential id starting at 1; re-inserting an existing key returns its id.
// Hashing walks UTF-16 code units instead of bytes.

export const PM_CONSTANT_ID_UNSET = 0;

// A list of constant ids (a pm_constant_id_list_t) is a plain JS array.
//
// Deviation: the C implementation hand-rolls a growable `{ size, capacity,
// ids }` array with capacity-doubling reallocation, because C arrays don't
// grow themselves. A JS array already grows, so no init/capacity machinery
// is needed - callers just start from `[]`.

export function pm_constant_id_list_append(list, id) {
	list.push(id);
}

export function pm_constant_id_list_includes(list, id) {
	return list.includes(id);
}


// ---------------------------------------------------------------------------
// Pool
// ---------------------------------------------------------------------------

// The C pool is an open-addressing table with a djb2 hash; a Map keyed by the
// interned string does the same job with exact semantics. Ids remain
// sequential starting at 1, and the id -> constant table stays indexed by
// id - 1 for the C API shape.
export function pm_constant_pool_init(pool, capacity) {
	pool = pool ?? {};
	pool.size = 0;
	pool.constants = []; // indexed by id - 1
	pool.map = new Map();
	return pool;
}

function intern(pool, key) {
	let id = pool.map.get(key);
	if (id === undefined) {
		id = ++pool.size;
		pool.map.set(key, id);
		pool.constants.push({ length: key.length, start: key });
	}
	return id;
}

export function pm_constant_pool_insert_shared(pool, buffer, start, end) {
	return intern(pool, buffer.slice(start, end));
}

export function pm_constant_pool_insert_owned(pool, bytes, length) {
	const key = typeof bytes === "string" ? bytes.slice(0, length ?? bytes.length) : String(bytes);
	return intern(pool, key);
}

export function pm_constant_pool_insert_constant(pool, text, length) {
	const key = typeof text === "string" ? text.slice(0, length ?? text.length) : String(text);
	return intern(pool, key);
}

export function pm_constant_pool_id_to_constant(pool, id) {
	return pool.constants[id - 1];
}

