// The textDocument/selectionRange request (port of
// ../../features/selection_ranges.rb): for each cursor position, the
// innermost node and then the chain outward, as nested SelectionRanges
// (VS Code's expand/shrink-selection). Document#locateNode gives the
// containing chain; here it becomes the nested object, skipping nodes
// that share a range with their parent (statements vs program and
// friends).

export function perform(document, positions) {
  const parseResult = document.parse();
  return positions.map((position) => {
    const { ancestors } = document.locateNode(position.line, position.character);
    return build(parseResult, ancestors);
  });
}

// ancestors is innermost-first; walk outermost-in so each node hangs
// off the previous, leaving the innermost as the head.
function build(parseResult, ancestors) {
  let acc = null;
  let previousRange = null;
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const range = parseResult.rangeForNode(ancestors[i]);
    if (previousRange !== null && JSON.stringify(range) === JSON.stringify(previousRange)) {
      continue; // same span as its parent: no selection step
    }
    acc = { range, parent: acc };
    previousRange = range;
  }
  return acc;
}
