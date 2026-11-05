export function hasTablePosition(table) {
  return Number.isInteger(table.grid_row) && Number.isInteger(table.grid_col);
}

// Keep tables without configured positions visible in a default layout.
export function displayTableLayout(tables) {
  const positioned = tables.filter(hasTablePosition);
  const firstFallbackRow = positioned.length
    ? Math.max(...positioned.map((table) => table.grid_row)) + 2
    : 0;
  let fallbackIndex = 0;
  return tables.map((table) => {
    if (hasTablePosition(table)) {
      return { ...table, displayRow: table.grid_row, displayCol: table.grid_col };
    }
    const index = fallbackIndex++;
    return {
      ...table,
      displayRow: firstFallbackRow + Math.floor(index / 4),
      displayCol: index % 4,
    };
  });
}
