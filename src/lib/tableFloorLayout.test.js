import test from 'node:test';
import assert from 'node:assert/strict';
import { displayTableLayout } from './tableFloorLayout.js';

test('legacy tables without coordinates remain visible in a default layout', () => {
  const tables = Array.from({ length: 6 }, (_, i) => ({
    id: String(i), floor_id: 'floor', grid_row: null, grid_col: null,
  }));
  const layout = displayTableLayout(tables);
  assert.equal(layout.length, 6);
  assert.equal(new Set(layout.map(t => `${t.displayRow},${t.displayCol}`)).size, 6);
  assert.ok(layout.every(t => t.grid_row === null && t.grid_col === null));
});

test('fallback positions do not overlap configured tables', () => {
  const layout = displayTableLayout([
    { id: 'a', grid_row: 3, grid_col: 2 },
    { id: 'b', grid_row: null, grid_col: null },
  ]);
  assert.deepEqual([layout[0].displayRow, layout[0].displayCol], [3, 2]);
  assert.ok(layout[1].displayRow > layout[0].displayRow);
});

