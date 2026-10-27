import React from "react";

export default function Cell({ value, isWinningCell }) {
  let discClass = "cell-slot";
  if (value === "R") discClass += " disc-red";
  if (value === "Y") discClass += " disc-yellow";
  if (isWinningCell) discClass += " disc-winner";

  return (
    <div className="board-cell">
      <div className={discClass}>
        {isWinningCell && <div className="winner-ring" />}
      </div>
    </div>
  );
}
