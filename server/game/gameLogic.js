/**
 * game/gameLogic.js
 *
 * Pure game-rule functions for Connect Four.
 * No I/O, no networking, no side effects --- easy to unit test.
 *
 * Board layout:
 *   board[0]      = top row
 *   board[ROWS-1] = bottom row
 *   board[row][col] is null | "R" | "Y"
 */

"use strict";

const ROWS = 6;
const COLS = 7;

/**
 * createBoard()
 * Returns a fresh 6×7 board filled with null.
 * Each row is an independent array (no shared references).
 */
function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

/**
 * dropDisc(board, column, player)
 *
 * Mutates `board` in place by placing `player`'s disc in `column`.
 * Discs fall to the lowest empty cell (highest row index).
 *
 * @param {Array}  board   - 6×7 array of null | "R" | "Y"
 * @param {number} column  - 0-indexed column (0–6)
 * @param {string} player  - "R" or "Y"
 *
 * @returns {{ success: boolean, row: number|null, col: number|null, message: string }}
 */
function dropDisc(board, column, player) {
  // Validate player
  if (player !== "R" && player !== "Y") {
    return { success: false, row: null, col: null, message: "Invalid player. Must be 'R' or 'Y'." };
  }

  // Validate column type and range
  if (!Number.isInteger(column) || column < 0 || column >= COLS) {
    return { success: false, row: null, col: null, message: `Invalid column. Must be an integer 0–${COLS - 1}.` };
  }

  // Find the lowest empty cell in the column (scan from bottom)
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][column] === null) {
      board[row][column] = player;
      return { success: true, row, col: column, message: "Disc placed." };
    }
  }

  // Column is full
  return { success: false, row: null, col: null, message: "Column is full." };
}

/**
 * checkWinner(board, row, col)
 *
 * Checks for a four-in-a-row starting from the last placed disc.
 * Only scans in the four possible directions from that cell,
 * so no full-board scan is needed.
 *
 * @param {Array}  board
 * @param {number} row - row of the last placed disc
 * @param {number} col - column of the last placed disc
 *
 * @returns {{ winner: string|null, winningCells: Array }}
 *   winner       - "R", "Y", or null
 *   winningCells - array of [row, col] pairs forming the winning line (empty if no winner)
 */
function checkWinner(board, row, col) {
  const player = board[row][col];
  if (!player) return { winner: null, winningCells: [] };

  // Four directions: horizontal, vertical, diag-down-right, diag-down-left
  const directions = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal down-right / up-left
    [1, -1],  // diagonal down-left / up-right
  ];

  for (const [dr, dc] of directions) {
    const cells = [[row, col]]; // start with the placed disc

    // Walk in the positive direction
    for (let step = 1; step <= 3; step++) {
      const r = row + dr * step;
      const c = col + dc * step;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) break;
      if (board[r][c] !== player) break;
      cells.push([r, c]);
    }

    // Walk in the negative direction
    for (let step = 1; step <= 3; step++) {
      const r = row - dr * step;
      const c = col - dc * step;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) break;
      if (board[r][c] !== player) break;
      cells.push([r, c]);
    }

    if (cells.length >= 4) {
      return { winner: player, winningCells: cells };
    }
  }

  return { winner: null, winningCells: [] };
}

/**
 * checkDraw(board)
 *
 * Returns true if the board is completely filled (no null cells).
 * Call this AFTER checkWinner returns no winner.
 *
 * @param {Array} board
 * @returns {boolean}
 */
function checkDraw(board) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (board[row][col] === null) return false;
    }
  }
  return true;
}

module.exports = { ROWS, COLS, createBoard, dropDisc, checkWinner, checkDraw };
