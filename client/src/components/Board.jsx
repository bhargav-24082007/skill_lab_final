import React, { useState } from "react";
import Cell from "./Cell";

export default function Board({
  board,
  onDrop,
  myColor,
  currentTurn,
  status,
  winningCells = [],
  disabled = false,
}) {
  const [hoverCol, setHoverCol] = useState(null);

  const isMyTurn = status === "playing" && currentTurn === myColor && !disabled;

  const isColumnFull = (col) => {
    return board && board[0] && board[0][col] !== null;
  };

  const handleColumnClick = (col) => {
    if (!isMyTurn || isColumnFull(col)) return;
    onDrop(col);
  };

  const isWinning = (r, c) => {
    return winningCells.some(([wr, wc]) => wr === r && wc === c);
  };

  return (
    <div className="board-wrapper">
      {/* Hover drop indicators row */}
      <div className="hover-indicator-row">
        {[0, 1, 2, 3, 4, 5, 6].map((col) => (
          <div
            key={col}
            className="hover-slot"
            onClick={() => handleColumnClick(col)}
            onMouseEnter={() => setHoverCol(col)}
            onMouseLeave={() => setHoverCol(null)}
          >
            {isMyTurn && hoverCol === col && !isColumnFull(col) && (
              <div
                className={`ghost-disc ${
                  myColor === "R" ? "ghost-red" : "ghost-yellow"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* 6x7 Blue Connect Four Physical Frame */}
      <div className={`connect-four-board ${!isMyTurn ? "board-disabled" : ""}`}>
        {board &&
          board.map((row, r) => (
            <div key={r} className="board-row">
              {row.map((cellValue, c) => (
                <div
                  key={c}
                  className="cell-column-touch"
                  onClick={() => handleColumnClick(c)}
                  onMouseEnter={() => setHoverCol(c)}
                  onMouseLeave={() => setHoverCol(null)}
                >
                  <Cell
                    value={cellValue}
                    isWinningCell={isWinning(r, c)}
                  />
                </div>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}
