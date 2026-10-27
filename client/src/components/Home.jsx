import React, { useState } from "react";

export default function Home({
  name,
  setName,
  onCreateRoom,
  onJoinRoom,
  onViewHistory,
  loading,
  error,
}) {
  const [roomInput, setRoomInput] = useState("");
  const [localError, setLocalError] = useState("");

  const handleCreate = (e) => {
    e.preventDefault();
    setLocalError("");
    if (!name.trim()) {
      setLocalError("Please enter your display name.");
      return;
    }
    onCreateRoom();
  };

  const handleJoin = (e) => {
    e.preventDefault();
    setLocalError("");
    if (!name.trim()) {
      setLocalError("Please enter your display name.");
      return;
    }
    const cleanCode = roomInput.trim().toUpperCase();
    if (cleanCode.length !== 6) {
      setLocalError("Room code must be exactly 6 characters.");
      return;
    }
    onJoinRoom(cleanCode);
  };

  const displayError = error || localError;

  return (
    <div className="home-container">
      <div className="home-hero">
        <div className="game-brand">
          <div className="brand-disc-pair">
            <span className="brand-disc brand-red" />
            <span className="brand-disc brand-yellow" />
          </div>
          <h1 className="home-title">CONNECT FOUR</h1>
          <p className="home-tagline">ONLINE MULTIPLAYER</p>
        </div>
        <p className="home-description">
          Drop discs, strategize turns, and connect four in a row horizontally,
          vertically, or diagonally to win.
        </p>
      </div>

      {displayError && (
        <div className="error-alert">
          <span>⚠️ {displayError}</span>
        </div>
      )}

      {/* Main Action Card */}
      <div className="home-card glass-panel">
        {/* Name Input */}
        <div className="form-group">
          <label className="input-label" htmlFor="player-name">Your Display Name</label>
          <input
            id="player-name"
            type="text"
            className="text-input"
            placeholder="e.g. Alex"
            maxLength={20}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setLocalError("");
            }}
          />
        </div>

        {/* Create Room Button */}
        <button
          className="btn-primary btn-block btn-lg"
          onClick={handleCreate}
          disabled={loading}
        >
          {loading ? "Creating..." : "✨ Create New Room"}
        </button>

        <div className="form-divider">
          <span>OR JOIN WITH CODE</span>
        </div>

        {/* Join Room Form */}
        <div className="join-form">
          <input
            type="text"
            className="text-input text-center text-uppercase"
            placeholder="ENTER 6-CHAR CODE"
            maxLength={6}
            value={roomInput}
            onChange={(e) => {
              setRoomInput(e.target.value.toUpperCase());
              setLocalError("");
            }}
          />
          <button
            className="btn-secondary btn-block"
            onClick={handleJoin}
            disabled={loading}
          >
            {loading ? "Joining..." : "Join Game"}
          </button>
        </div>
      </div>

      {/* Action to View History */}
      <div className="home-aux-actions">
        <button className="btn-link" onClick={onViewHistory}>
          📜 View Match History
        </button>
      </div>

      {/* Rules Mini-Card */}
      <div className="rules-mini-card">
        <h3>How to Play</h3>
        <ul>
          <li><strong>2 Players:</strong> Player 1 drops Red discs, Player 2 drops Yellow.</li>
          <li><strong>Take Turns:</strong> Click any column to drop a disc to the lowest empty spot.</li>
          <li><strong>Win:</strong> Connect 4 of your discs in any row, column, or diagonal!</li>
        </ul>
      </div>
    </div>
  );
}
