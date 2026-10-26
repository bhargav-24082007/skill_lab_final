/**
 * tests/gameLogic.test.js
 *
 * Unit tests for game/gameLogic.js using Node's built-in test runner.
 * Run with:  node --test tests/gameLogic.test.js
 * (from the project root, one level above `server/`)
 *
 * No external test libraries required.
 */

"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");

// Path is relative to this test file (tests/) → go up one level to server/
const {
  ROWS,
  COLS,
  createBoard,
  dropDisc,
  checkWinner,
  checkDraw,
} = require("../server/game/gameLogic");

// ─── createBoard ─────────────────────────────────────────────────────────────

test("createBoard: has correct dimensions", () => {
  const board = createBoard();
  assert.equal(board.length, ROWS, "board should have 6 rows");
  board.forEach((row, i) => {
    assert.equal(row.length, COLS, `row ${i} should have 7 columns`);
  });
});

test("createBoard: all cells are null", () => {
  const board = createBoard();
  board.forEach((row, r) =>
    row.forEach((cell, c) => {
      assert.equal(cell, null, `cell [${r}][${c}] should be null`);
    })
  );
});

test("createBoard: rows are independent arrays (no shared references)", () => {
  const board = createBoard();
  // Mutate the first row; other rows must not change
  board[0][0] = "R";
  assert.equal(board[1][0], null, "row 1 should not be affected by change to row 0");
  assert.equal(board[2][0], null, "row 2 should not be affected by change to row 0");
});

// ─── dropDisc ────────────────────────────────────────────────────────────────

test("dropDisc: disc lands at bottom of empty column", () => {
  const board = createBoard();
  const result = dropDisc(board, 3, "R");
  assert.equal(result.success, true, "drop should succeed");
  assert.equal(result.row, ROWS - 1, "disc should land at the bottom row");
  assert.equal(result.col, 3, "column should be correct");
  assert.equal(board[ROWS - 1][3], "R", "board should reflect the disc");
});

test("dropDisc: second disc in same column lands one row above first", () => {
  const board = createBoard();
  dropDisc(board, 0, "R");
  const result = dropDisc(board, 0, "Y");
  assert.equal(result.success, true);
  assert.equal(result.row, ROWS - 2, "second disc should be one row above bottom");
  assert.equal(board[ROWS - 2][0], "Y");
});

test("dropDisc: rejects column < 0", () => {
  const board = createBoard();
  const result = dropDisc(board, -1, "R");
  assert.equal(result.success, false, "should fail for column -1");
});

test("dropDisc: rejects column >= COLS", () => {
  const board = createBoard();
  const result = dropDisc(board, COLS, "R");
  assert.equal(result.success, false, `should fail for column ${COLS}`);
});

test("dropDisc: rejects non-integer column", () => {
  const board = createBoard();
  const result = dropDisc(board, 2.5, "R");
  assert.equal(result.success, false, "should fail for float column");
});

test("dropDisc: rejects invalid player value", () => {
  const board = createBoard();
  const result = dropDisc(board, 0, "G");
  assert.equal(result.success, false, "should fail for player 'G'");
});

test("dropDisc: rejects full column", () => {
  const board = createBoard();
  // Fill column 4 completely
  for (let i = 0; i < ROWS; i++) dropDisc(board, 4, "R");
  const result = dropDisc(board, 4, "Y");
  assert.equal(result.success, false, "full column should be rejected");
});

test("dropDisc: rejected move does not modify the board", () => {
  const board = createBoard();
  // Fill column 2
  for (let i = 0; i < ROWS; i++) dropDisc(board, 2, "R");
  // Snapshot a cell that is NOT in column 2
  board[0][3] = null;
  // Attempt the rejected move
  dropDisc(board, 2, "Y");
  // Column 2, row 0 should still be "R" (last placed), not "Y"
  assert.equal(board[0][2], "R", "rejected disc should not appear in the board");
});

// ─── checkWinner ─────────────────────────────────────────────────────────────

test("checkWinner: no winner on empty board", () => {
  const board = createBoard();
  dropDisc(board, 0, "R");
  const { winner } = checkWinner(board, ROWS - 1, 0);
  assert.equal(winner, null);
});

test("checkWinner: three in a row does not win", () => {
  const board = createBoard();
  dropDisc(board, 0, "R");
  dropDisc(board, 1, "R");
  const { row, col } = dropDisc(board, 2, "R"); // third
  const { winner } = checkWinner(board, row, col);
  assert.equal(winner, null, "three in a row should not trigger a win");
});

test("checkWinner: horizontal win", () => {
  const board = createBoard();
  dropDisc(board, 0, "R");
  dropDisc(board, 1, "R");
  dropDisc(board, 2, "R");
  const { row, col } = dropDisc(board, 3, "R");
  const { winner, winningCells } = checkWinner(board, row, col);
  assert.equal(winner, "R", "horizontal win not detected");
  assert.equal(winningCells.length >= 4, true, "should return at least 4 winning cells");
});

test("checkWinner: vertical win", () => {
  const board = createBoard();
  dropDisc(board, 5, "Y");
  dropDisc(board, 5, "Y");
  dropDisc(board, 5, "Y");
  const { row, col } = dropDisc(board, 5, "Y");
  const { winner } = checkWinner(board, row, col);
  assert.equal(winner, "Y", "vertical win not detected");
});

test("checkWinner: diagonal win (down-right / up-left)", () => {
  // Build a down-right diagonal win for R at (bottom-3, 0), (bottom-2, 1), (bottom-1, 2), (bottom, 3)
  const board = createBoard();
  // Drop fillers to raise the heights
  //   col 1 needs 1 filler, col 2 needs 2, col 3 needs 3
  dropDisc(board, 1, "Y");
  dropDisc(board, 2, "Y");
  dropDisc(board, 2, "Y");
  dropDisc(board, 3, "Y");
  dropDisc(board, 3, "Y");
  dropDisc(board, 3, "Y");
  // Now place R diagonally
  dropDisc(board, 0, "R");
  dropDisc(board, 1, "R");
  dropDisc(board, 2, "R");
  const { row, col } = dropDisc(board, 3, "R");
  const { winner } = checkWinner(board, row, col);
  assert.equal(winner, "R", "diagonal (down-right) win not detected");
});

test("checkWinner: diagonal win (down-left / up-right)", () => {
  // Build a down-left diagonal win for Y
  const board = createBoard();
  // Fillers to raise columns 0, 1, 2 heights
  dropDisc(board, 0, "R");
  dropDisc(board, 0, "R");
  dropDisc(board, 0, "R");
  dropDisc(board, 1, "R");
  dropDisc(board, 1, "R");
  dropDisc(board, 2, "R");
  // Now Y diagonal: col 3 bottom, col 2, col 1, col 0
  dropDisc(board, 3, "Y");
  dropDisc(board, 2, "Y");
  dropDisc(board, 1, "Y");
  const { row, col } = dropDisc(board, 0, "Y");
  const { winner } = checkWinner(board, row, col);
  assert.equal(winner, "Y", "diagonal (down-left) win not detected");
});

// ─── checkDraw ───────────────────────────────────────────────────────────────

test("checkDraw: returns false on empty board", () => {
  const board = createBoard();
  assert.equal(checkDraw(board), false);
});

test("checkDraw: returns false when board has empty cells", () => {
  const board = createBoard();
  dropDisc(board, 0, "R");
  assert.equal(checkDraw(board), false);
});

test("checkDraw: returns true on a completely full board (no winner)", () => {
  // Fill the board with alternating discs in a pattern that avoids any winner
  // Column pattern: R Y R Y R Y R, alternating across rows with shifted starts
  const board = createBoard();

  // Fill column by column with alternating R/Y in a way that avoids four in a row
  // We fill each row left-to-right, alternating starting color per row
  const pattern = [
    ["R","Y","R","Y","R","Y","R"],
    ["R","Y","R","Y","R","Y","R"],
    ["Y","R","Y","R","Y","R","Y"],
    ["Y","R","Y","R","Y","R","Y"],
    ["R","Y","R","Y","R","Y","R"],
    ["R","Y","R","Y","R","Y","R"],
  ];

  // Write the pattern directly into the board
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      board[r][c] = pattern[r][c];
    }
  }

  assert.equal(checkDraw(board), true, "full board should be detected as a draw");
});
