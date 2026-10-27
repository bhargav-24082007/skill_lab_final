import React from "react";

export default function GameInfo({
  roomCode,
  players,
  myColor,
  currentTurn,
  status,
  winner,
  totalMoves,
  onLeave,
  onRequestRematch,
  onAcceptRematch,
  rematchOfferedByOpponent,
  rematchRequestedByMe,
}) {
  const isMyTurn = status === "playing" && currentTurn === myColor;
  const isGameOver = status === "finished";

  const redPlayer = players?.R?.name || "Player 1";
  const yellowPlayer = players?.Y?.name || "Player 2";

  const getResultText = () => {
    if (!isGameOver) return null;
    if (winner === myColor) {
      return { title: "Victory!", desc: "You connected four discs!", type: "win" };
    }
    if (winner && winner !== myColor) {
      const winnerName = players?.[winner]?.name || (winner === "R" ? "Red" : "Yellow");
      return { title: "Defeat", desc: `${winnerName} won this match.`, type: "loss" };
    }
    return { title: "Draw", desc: "Board is full with no winner.", type: "draw" };
  };

  const result = getResultText();

  return (
    <div className="game-info-container">
      {/* Top Header: Room Code and Action */}
      <div className="game-top-bar">
        <div className="room-badge">
          <span className="room-label">ROOM</span>
          <span className="room-code-tag">{roomCode}</span>
        </div>
        <button className="btn-secondary btn-sm" onClick={onLeave}>
          Leave Game
        </button>
      </div>

      {/* Players Card */}
      <div className="players-vs-grid">
        {/* Red Player */}
        <div
          className={`player-box player-red ${
            currentTurn === "R" && status === "playing" ? "active-turn" : ""
          } ${myColor === "R" ? "is-you" : ""}`}
        >
          <div className="player-disc-indicator red-glow" />
          <div className="player-meta">
            <span className="player-name">{redPlayer}</span>
            <span className="player-role">
              Red {myColor === "R" ? "(You)" : "(Opponent)"}
            </span>
          </div>
          {currentTurn === "R" && status === "playing" && (
            <div className="turn-pulse-badge">TURN</div>
          )}
        </div>

        <div className="vs-divider">VS</div>

        {/* Yellow Player */}
        <div
          className={`player-box player-yellow ${
            currentTurn === "Y" && status === "playing" ? "active-turn" : ""
          } ${myColor === "Y" ? "is-you" : ""}`}
        >
          <div className="player-disc-indicator yellow-glow" />
          <div className="player-meta">
            <span className="player-name">{yellowPlayer}</span>
            <span className="player-role">
              Yellow {myColor === "Y" ? "(You)" : "(Opponent)"}
            </span>
          </div>
          {currentTurn === "Y" && status === "playing" && (
            <div className="turn-pulse-badge">TURN</div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      {status === "playing" && (
        <div className={`status-banner ${isMyTurn ? "banner-my-turn" : "banner-waiting"}`}>
          {isMyTurn ? (
            <span className="pulse-text">⚡ Your turn — select a column to drop your disc!</span>
          ) : (
            <span>⏳ Waiting for opponent to make a move...</span>
          )}
        </div>
      )}

      {/* Game Over Card */}
      {isGameOver && (
        <div className={`game-over-banner result-${result?.type}`}>
          <div className="game-over-title">{result?.title}</div>
          <div className="game-over-desc">{result?.desc}</div>
          <div className="total-moves-stat">Total Moves: {totalMoves}</div>

          {/* Rematch Section */}
          <div className="rematch-controls">
            {rematchOfferedByOpponent ? (
              <div className="rematch-offer-box">
                <p>Opponent proposed a rematch!</p>
                <button className="btn-primary" onClick={onAcceptRematch}>
                  Accept Rematch
                </button>
              </div>
            ) : rematchRequestedByMe ? (
              <div className="rematch-waiting-box">
                <span>Waiting for opponent to accept rematch...</span>
              </div>
            ) : (
              <button className="btn-primary btn-rematch" onClick={onRequestRematch}>
                Play Again (Rematch)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
