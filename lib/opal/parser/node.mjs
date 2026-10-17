// node.c converted to JavaScript (ES2022).
//
// Integrator notes:
// - Optional embedded locations that C leaves as a NULL start pointer are
//   represented as `{ start: null, end: null }`; the `.start !== null` checks
//   below mirror the C `!= NULL` tests exactly.
// - pm_dump_json is intentionally not ported (the uni build emits JSON from
//   index.js instead); C guards it with PRISM_EXCLUDE_JSON.
// - pm_node_destroy is intentionally not ported: it only walked the tree to
//   free memory, which garbage collection handles; call sites were removed.

import * as ast from "./ast.mjs";

// A pm_node_list_t (the list of children behind every array-valued AST
// field - StatementsNode.body, ArrayNode.elements, ArgumentsNode.arguments,
// etc.) is a plain JS array.
//
// Deviation: the C implementation is a manually growable `{ size, capacity,
// nodes }` struct, with capacity-doubling xrealloc (and uint32_t-wraparound
// overflow checks that cannot occur in JS numbers) because C arrays don't
// grow themselves. A JS array already grows, and `.length` already tracks
// the real element count exactly (no separate "capacity" concept needed).

/**
 * Append a new node onto the end of the node list.
 */
export function pm_node_list_append(list, node) {
    list.push(node);
}

/**
 * Prepend a new node onto the beginning of the node list.
 */
export function pm_node_list_prepend(list, node) {
    list.unshift(node);
}

/**
 * Concatenate the given node list onto the end of the other node list.
 */
export function pm_node_list_concat(list, other) {
    if (other.length > 0) list.push(...other);
}

/**
 * Visit each of the nodes in this subtree using the given visitor callback. The
 * callback function will be called for each node in the subtree. If it returns
 * false, then that node's children will not be visited. If it returns true,
 * then the children will be visited. The data parameter is treated as an opaque
 * pointer and is passed to the visitor callback for consumers to use as they
 * see fit.
 */
export function pm_visit_node(node, visitor, data) {
    if (visitor(node, data)) pm_visit_child_nodes(node, visitor, data);
}

/**
 * Visit the children of the given node with the given callback. This is the
 * default behavior for walking the tree that is called from pm_visit_node if
 * the callback returns true.
 */
// The child-node fields of every node type, in the order the C tree
// walk visits them (replaces the 150-case switch). A field whose value
// is a { size, nodes } list is expanded; a plain node is visited
// directly; a null/absent child is skipped.
const PM_NODE_CHILD_FIELDS = {
    [ast.PM_ALIAS_GLOBAL_VARIABLE_NODE]: ["new_name", "old_name"],
    [ast.PM_ALIAS_METHOD_NODE]: ["new_name", "old_name"],
    [ast.PM_ALTERNATION_PATTERN_NODE]: ["left", "right"],
    [ast.PM_AND_NODE]: ["left", "right"],
    [ast.PM_ARGUMENTS_NODE]: ["arguments"],
    [ast.PM_ARRAY_NODE]: ["elements"],
    [ast.PM_ARRAY_PATTERN_NODE]: ["constant", "requireds", "rest", "posts"],
    [ast.PM_ASSOC_NODE]: ["key", "value"],
    [ast.PM_ASSOC_SPLAT_NODE]: ["value"],
    [ast.PM_BEGIN_NODE]: ["statements", "rescue_clause", "else_clause", "ensure_clause"],
    [ast.PM_BLOCK_ARGUMENT_NODE]: ["expression"],
    [ast.PM_BLOCK_NODE]: ["parameters", "body"],
    [ast.PM_BLOCK_PARAMETERS_NODE]: ["parameters", "locals"],
    [ast.PM_BREAK_NODE]: ["arguments"],
    [ast.PM_CALL_AND_WRITE_NODE]: ["receiver", "value"],
    [ast.PM_CALL_NODE]: ["receiver", "arguments", "block"],
    [ast.PM_CALL_OPERATOR_WRITE_NODE]: ["receiver", "value"],
    [ast.PM_CALL_OR_WRITE_NODE]: ["receiver", "value"],
    [ast.PM_CALL_TARGET_NODE]: ["receiver"],
    [ast.PM_CAPTURE_PATTERN_NODE]: ["value", "target"],
    [ast.PM_CASE_MATCH_NODE]: ["predicate", "conditions", "else_clause"],
    [ast.PM_CASE_NODE]: ["predicate", "conditions", "else_clause"],
    [ast.PM_CLASS_NODE]: ["constant_path", "superclass", "body"],
    [ast.PM_CLASS_VARIABLE_AND_WRITE_NODE]: ["value"],
    [ast.PM_CLASS_VARIABLE_OPERATOR_WRITE_NODE]: ["value"],
    [ast.PM_CLASS_VARIABLE_OR_WRITE_NODE]: ["value"],
    [ast.PM_CLASS_VARIABLE_WRITE_NODE]: ["value"],
    [ast.PM_CONSTANT_AND_WRITE_NODE]: ["value"],
    [ast.PM_CONSTANT_OPERATOR_WRITE_NODE]: ["value"],
    [ast.PM_CONSTANT_OR_WRITE_NODE]: ["value"],
    [ast.PM_CONSTANT_PATH_AND_WRITE_NODE]: ["target", "value"],
    [ast.PM_CONSTANT_PATH_NODE]: ["parent"],
    [ast.PM_CONSTANT_PATH_OPERATOR_WRITE_NODE]: ["target", "value"],
    [ast.PM_CONSTANT_PATH_OR_WRITE_NODE]: ["target", "value"],
    [ast.PM_CONSTANT_PATH_TARGET_NODE]: ["parent"],
    [ast.PM_CONSTANT_PATH_WRITE_NODE]: ["target", "value"],
    [ast.PM_CONSTANT_WRITE_NODE]: ["value"],
    [ast.PM_DEF_NODE]: ["receiver", "parameters", "body"],
    [ast.PM_DEFINED_NODE]: ["value"],
    [ast.PM_ELSE_NODE]: ["statements"],
    [ast.PM_EMBEDDED_STATEMENTS_NODE]: ["statements"],
    [ast.PM_EMBEDDED_VARIABLE_NODE]: ["variable"],
    [ast.PM_ENSURE_NODE]: ["statements"],
    [ast.PM_FIND_PATTERN_NODE]: ["constant", "left", "requireds", "right"],
    [ast.PM_FLIP_FLOP_NODE]: ["left", "right"],
    [ast.PM_FOR_NODE]: ["index", "collection", "statements"],
    [ast.PM_FORWARDING_SUPER_NODE]: ["block"],
    [ast.PM_GLOBAL_VARIABLE_AND_WRITE_NODE]: ["value"],
    [ast.PM_GLOBAL_VARIABLE_OPERATOR_WRITE_NODE]: ["value"],
    [ast.PM_GLOBAL_VARIABLE_OR_WRITE_NODE]: ["value"],
    [ast.PM_GLOBAL_VARIABLE_WRITE_NODE]: ["value"],
    [ast.PM_HASH_NODE]: ["elements"],
    [ast.PM_HASH_PATTERN_NODE]: ["constant", "elements", "rest"],
    [ast.PM_IF_NODE]: ["predicate", "statements", "subsequent"],
    [ast.PM_IMAGINARY_NODE]: ["numeric"],
    [ast.PM_IMPLICIT_NODE]: ["value"],
    [ast.PM_IN_NODE]: ["pattern", "statements"],
    [ast.PM_INDEX_AND_WRITE_NODE]: ["receiver", "arguments", "block", "value"],
    [ast.PM_INDEX_OPERATOR_WRITE_NODE]: ["receiver", "arguments", "block", "value"],
    [ast.PM_INDEX_OR_WRITE_NODE]: ["receiver", "arguments", "block", "value"],
    [ast.PM_INDEX_TARGET_NODE]: ["receiver", "arguments", "block"],
    [ast.PM_INSTANCE_VARIABLE_AND_WRITE_NODE]: ["value"],
    [ast.PM_INSTANCE_VARIABLE_OPERATOR_WRITE_NODE]: ["value"],
    [ast.PM_INSTANCE_VARIABLE_OR_WRITE_NODE]: ["value"],
    [ast.PM_INSTANCE_VARIABLE_WRITE_NODE]: ["value"],
    [ast.PM_INTERPOLATED_MATCH_LAST_LINE_NODE]: ["parts"],
    [ast.PM_INTERPOLATED_REGULAR_EXPRESSION_NODE]: ["parts"],
    [ast.PM_INTERPOLATED_STRING_NODE]: ["parts"],
    [ast.PM_INTERPOLATED_SYMBOL_NODE]: ["parts"],
    [ast.PM_INTERPOLATED_X_STRING_NODE]: ["parts"],
    [ast.PM_KEYWORD_HASH_NODE]: ["elements"],
    [ast.PM_LAMBDA_NODE]: ["parameters", "body"],
    [ast.PM_LOCAL_VARIABLE_AND_WRITE_NODE]: ["value"],
    [ast.PM_LOCAL_VARIABLE_OPERATOR_WRITE_NODE]: ["value"],
    [ast.PM_LOCAL_VARIABLE_OR_WRITE_NODE]: ["value"],
    [ast.PM_LOCAL_VARIABLE_WRITE_NODE]: ["value"],
    [ast.PM_MATCH_PREDICATE_NODE]: ["value", "pattern"],
    [ast.PM_MATCH_REQUIRED_NODE]: ["value", "pattern"],
    [ast.PM_MATCH_WRITE_NODE]: ["call", "targets"],
    [ast.PM_MODULE_NODE]: ["constant_path", "body"],
    [ast.PM_MULTI_TARGET_NODE]: ["lefts", "rest", "rights"],
    [ast.PM_MULTI_WRITE_NODE]: ["lefts", "rest", "rights", "value"],
    [ast.PM_NEXT_NODE]: ["arguments"],
    [ast.PM_OPTIONAL_KEYWORD_PARAMETER_NODE]: ["value"],
    [ast.PM_OPTIONAL_PARAMETER_NODE]: ["value"],
    [ast.PM_OR_NODE]: ["left", "right"],
    [ast.PM_PARAMETERS_NODE]: ["requireds", "optionals", "rest", "posts", "keywords", "keyword_rest", "block"],
    [ast.PM_PARENTHESES_NODE]: ["body"],
    [ast.PM_PINNED_EXPRESSION_NODE]: ["expression"],
    [ast.PM_PINNED_VARIABLE_NODE]: ["variable"],
    [ast.PM_POST_EXECUTION_NODE]: ["statements"],
    [ast.PM_PRE_EXECUTION_NODE]: ["statements"],
    [ast.PM_PROGRAM_NODE]: ["statements"],
    [ast.PM_RANGE_NODE]: ["left", "right"],
    [ast.PM_RESCUE_MODIFIER_NODE]: ["expression", "rescue_expression"],
    [ast.PM_RESCUE_NODE]: ["exceptions", "reference", "statements", "subsequent"],
    [ast.PM_RETURN_NODE]: ["arguments"],
    [ast.PM_SHAREABLE_CONSTANT_NODE]: ["write"],
    [ast.PM_SINGLETON_CLASS_NODE]: ["expression", "body"],
    [ast.PM_SPLAT_NODE]: ["expression"],
    [ast.PM_STATEMENTS_NODE]: ["body"],
    [ast.PM_SUPER_NODE]: ["arguments", "block"],
    [ast.PM_UNDEF_NODE]: ["names"],
    [ast.PM_UNLESS_NODE]: ["predicate", "statements", "else_clause"],
    [ast.PM_UNTIL_NODE]: ["predicate", "statements"],
    [ast.PM_WHEN_NODE]: ["conditions", "statements"],
    [ast.PM_WHILE_NODE]: ["predicate", "statements"],
    [ast.PM_YIELD_NODE]: ["arguments"],
};

export function pm_visit_child_nodes(node, visitor, data) {
    const fields = PM_NODE_CHILD_FIELDS[node.type];
    if (fields === undefined) return;
    for (let index = 0; index < fields.length; index++) {
        const child = node[fields[index]];
        if (child === null || child === undefined) continue;
        if (Array.isArray(child)) {
            for (let child_index = 0; child_index < child.length; child_index++) {
                pm_visit_node(child[child_index], visitor, data);
            }
        } else {
            pm_visit_node(child, visitor, data);
        }
    }
}
