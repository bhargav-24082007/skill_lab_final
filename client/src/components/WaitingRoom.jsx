import React, { useState } from "react";

export default function WaitingRoom({ roomCode, players, myColor, onLeave }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const creatorName = players?.R?.name || "Player 1";

  return (
    <div className="waiting-room-card glass-panel">
      <div className="waiting-badge">LOBBY</div>
      <h2 className="waiting-title">Waiting for Opponent</h2>
      <p className="waiting-subtitle">
        Share this 6-character room code with a friend to begin.
      </p>

      {/* Room Code Display Box */}
      <div className="room-code-display-box">
        <span className="code-text">{roomCode}</span>
        <button
          className={`btn-copy ${copied ? "copied" : ""}`}
          onClick={handleCopy}
          title="Copy room code to clipboard"
        >
          {copied ? "✓ Copied!" : "📋 Copy Code"}
        </button>
      </div>

      {/* Players Status */}
      <div className="waiting-players-list">
        <div className="waiting-player-row ready">
          <div className="player-indicator-dot red-dot" />
          <span className="player-name-text">{creatorName} (Red)</span>
          <span className="player-status-tag ready-tag">Ready</span>
        </div>

        <div className="waiting-player-row waiting">
          <div className="player-indicator-dot yellow-dot-pulse" />
          <span className="player-name-text">Waiting for Player 2...</span>
          <span className="player-status-tag waiting-tag">Pending</span>
        </div>
      </div>

      <div className="waiting-footer">
        <button className="btn-secondary" onClick={onLeave}>
          Cancel & Leave Room
        </button>
      </div>
    </div>
  );
}
