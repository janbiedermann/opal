// A list of byte offsets of newlines in a string.
// Deviation from C: there is no out-param convention here; pm_newline_list_init
// allocates the list itself when called without one and always returns the list
// (the C function returns a bool). The C `const uint8_t *start` pointer into the
// source is stored as the numeric offset in the `start` field.

// Initialize a new newline list with the given capacity. Returns the list.
// (UNI-BUILD: allocation cannot fail, so the C bool return is gone.)
export function pm_newline_list_init(list = {}, start = 0, capacity = 4) {
    list.offsets = new Array(capacity).fill(0);
    list.start = start;

    // This is 1 instead of 0 because we want to include the first line of the
    // file as having offset 0, which is set because of calloc.
    list.size = 1;
    list.capacity = capacity;

    return list;
}

// Clear out the newlines that have been appended to the list.
export function pm_newline_list_clear(list) {
    list.size = 1;
}

// Append a new offset to the newline list. Returns true if the reallocation of
// the offsets succeeds (if one was necessary), otherwise returns false.
// `cursor` is the numeric offset of the newline character within the source
// (in C it is a pointer into the source).
export function pm_newline_list_append(list, cursor) {
    // assert(*cursor == '\n');
    // assert(cursor >= list->start);
    // (UNI-BUILD: JS arrays grow on demand; C's realloc-and-copy is gone.)
    list.offsets[list.size++] = cursor - list.start + 1;

    return true;
}

// Returns the line of the given offset. If the offset is not in the list, the
// line of the closest offset less than the given offset is returned.
//
// Deviation: shares its binary search with pm_newline_list_line_column below
// (they were previously two copies of the same search differing only in
// return shape) - the column half of the computation is harmless to do here
// too, since it's a pure, already-bounds-safe expression with no side effects.
export function pm_newline_list_line(list, cursor, start_line) {
    return pm_newline_list_line_column(list, cursor, start_line).line;
}

// Returns the line and column of the given offset. If the offset is not in the
// list, the line and column of the closest offset less than the given offset
// are returned.
export function pm_newline_list_line_column(list, cursor, start_line) {
    // assert(cursor >= list->start);
    const offset = cursor - list.start;

    let left = 0;
    let right = list.size - 1;

    while (left <= right) {
        const mid = left + Math.floor((right - left) / 2);

        if (list.offsets[mid] === offset) {
            return { line: mid + start_line, column: 0 };
        }

        if (list.offsets[mid] < offset) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    return {
        line: left + start_line - 1,
        column: offset - list.offsets[left - 1]
    };
}

