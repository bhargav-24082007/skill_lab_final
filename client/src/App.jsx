import React, { useState, useEffect } from "react";
import { socket } from "./socket";
import Home from "./components/Home";
import WaitingRoom from "./components/WaitingRoom";
import Board from "./components/Board";
import GameInfo from "./components/GameInfo";
import MatchHistory from "./components/MatchHistory";
import "./App.css";

export default function App() {
  const [screen, setScreen] = useState("home"); // home | waiting | game | history
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [myColor, setMyColor] = useState(null); // "R" | "Y"
  const [gameState, setGameState] = useState(null);
  const [rematchOfferedByOpponent, setRematchOfferedByOpponent] = useState(false);
  const [rematchRequestedByMe, setRematchRequestedByMe] = useState(false);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState("");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    function onConnect() {
      setConnected(true);
      setError("");
    }

    function onDisconnect() {
      setConnected(false);
    }

    function onRoomUpdated(state) {
      setGameState(state);
      if (state?.roomCode) setRoomCode(state.roomCode);
      if (state?.status === "playing") {
        setScreen("game");
        if (state?.myColor) {
          setMyColor(state.myColor);
        } else if (name && state?.players) {
          if (state.players.R?.name === name && state.players.Y?.name !== name) {
            setMyColor("R");
          } else if (state.players.Y?.name === name && state.players.R?.name !== name) {
            setMyColor("Y");
          }
        }
      }
    }

    function onGameState(state) {
      setGameState(state);
      if (state?.roomCode) setRoomCode(state.roomCode);
      if (state?.status === "playing") {
        setScreen("game");
        setRematchOfferedByOpponent(false);
        setRematchRequestedByMe(false);
        if (state?.myColor) {
          setMyColor(state.myColor);
        } else if (name && state?.players) {
          if (state.players.R?.name === name && state.players.Y?.name !== name) {
            setMyColor("R");
          } else if (state.players.Y?.name === name && state.players.R?.name !== name) {
            setMyColor("Y");
          }
        }
      }
    }

    function onPlayerAssigned({ color }) {
      if (color) {
        setMyColor(color);
      }
    }

    function onRematchRequest({ from }) {
      setRematchOfferedByOpponent(true);
      setNotification(`${from} proposed a rematch!`);
    }

    function onPlayerDisconnected({ message }) {
      setNotification(message);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room-updated", onRoomUpdated);
    socket.on("game-state", onGameState);
    socket.on("player-assigned", onPlayerAssigned);
    socket.on("rematch-request", onRematchRequest);
    socket.on("player-disconnected", onPlayerDisconnected);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room-updated", onRoomUpdated);
      socket.off("game-state", onGameState);
      socket.off("player-assigned", onPlayerAssigned);
      socket.off("rematch-request", onRematchRequest);
      socket.off("player-disconnected", onPlayerDisconnected);
    };
  }, [name]);

  // ── Actions ──

  const handleCreateRoom = () => {
    setError("");
    if (!socket.connected) {
      setError(
        "Cannot connect to the backend server. If using a free Render server, it may take 40-50s to wake up from sleep. Check the top-right status dot."
      );
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
      setError("Server request timed out. Please check your backend connection or refresh.");
    }, 10000);

    socket.emit("create-room", { name: name.trim() }, (res) => {
      clearTimeout(timer);
      setLoading(false);
      if (res && res.success) {
        setRoomCode(res.roomCode);
        setMyColor(res.color);
        setScreen("waiting");
      } else {
        setError(res?.message || "Failed to create room.");
      }
    });
  };

  const handleJoinRoom = (code) => {
    setError("");
    if (!socket.connected) {
      setError(
        "Cannot connect to the backend server. If using a free Render server, it may take 40-50s to wake up from sleep. Check the top-right status dot."
      );
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
      setError("Server request timed out. Please check your backend connection or refresh.");
    }, 10000);

    socket.emit("join-room", { roomCode: code, name: name.trim() }, (res) => {
      clearTimeout(timer);
      setLoading(false);
      if (res && res.success) {
        setRoomCode(res.roomCode || code);
        setMyColor(res.color);
        setScreen("game");
      } else {
        setError(res?.message || "Failed to join room.");
      }
    });
  };

  const handleDropDisc = (col) => {
    const activeCode = roomCode || gameState?.roomCode;
    socket.emit("make-move", { roomCode: activeCode, col, column: col }, (res) => {
      if (res && !res.success) {
        setError(res.message);
        setTimeout(() => setError(""), 3000);
      }
    });
  };

  const handleLeave = () => {
    const activeCode = roomCode || gameState?.roomCode;
    if (activeCode) {
      socket.emit("leave-room", { roomCode: activeCode });
    }
    setRoomCode("");
    setMyColor(null);
    setGameState(null);
    setRematchOfferedByOpponent(false);
    setRematchRequestedByMe(false);
    setScreen("home");
  };

  const handleRequestRematch = () => {
    const activeCode = roomCode || gameState?.roomCode;
    socket.emit("rematch-request", { roomCode: activeCode }, (res) => {
      if (res && res.success) {
        setRematchRequestedByMe(true);
      } else {
        setError(res?.message || "Could not request rematch.");
      }
    });
  };

  const handleAcceptRematch = () => {
    const activeCode = roomCode || gameState?.roomCode;
    socket.emit("rematch-accepted", { roomCode: activeCode }, (res) => {
      if (res && res.success) {
        if (res.color) setMyColor(res.color);
        setRematchOfferedByOpponent(false);
        setRematchRequestedByMe(false);
      } else if (res && !res.success) {
        setError(res.message || "Failed to accept rematch.");
      }
    });
  };

  return (
    <div className="app-layout">
      {/* Navbar */}
      <header className="app-header">
        <div className="header-brand" onClick={() => screen === "history" && setScreen("home")}>
          <div className="mini-discs">
            <span className="dot dot-red" />
            <span className="dot dot-yellow" />
          </div>
          <span className="brand-title">Connect Four</span>
        </div>
        <div className="connection-pill">
          <span className={`status-indicator ${connected ? "online" : "offline"}`} />
          <span className="status-text">{connected ? "Connected" : "Disconnected"}</span>
        </div>
      </header>

      {/* Global Toast / Notification */}
      {notification && (
        <div className="toast-notification">
          <span>{notification}</span>
          <button className="toast-close" onClick={() => setNotification("")}>✕</button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="main-content">
        {screen === "home" && (
          <Home
            name={name}
            setName={setName}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onViewHistory={() => setScreen("history")}
            loading={loading}
            error={error}
          />
        )}

        {screen === "waiting" && (
          <WaitingRoom
            roomCode={roomCode}
            players={gameState?.players}
            myColor={myColor}
            onLeave={handleLeave}
          />
        )}

        {screen === "game" && gameState && (
          <div className="game-screen-layout">
            <GameInfo
              roomCode={roomCode}
              players={gameState.players}
              myColor={myColor}
              currentTurn={gameState.currentTurn}
              status={gameState.status}
              winner={gameState.winner}
              totalMoves={gameState.totalMoves}
              onLeave={handleLeave}
              onRequestRematch={handleRequestRematch}
              onAcceptRematch={handleAcceptRematch}
              rematchOfferedByOpponent={rematchOfferedByOpponent}
              rematchRequestedByMe={rematchRequestedByMe}
            />

            <Board
              board={gameState.board}
              onDrop={handleDropDisc}
              myColor={myColor}
              currentTurn={gameState.currentTurn}
              status={gameState.status}
              winningCells={gameState.winningCells}
              disabled={gameState.status !== "playing"}
            />
          </div>
        )}

        {screen === "history" && (
          <MatchHistory onBack={() => setScreen("home")} />
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>Connect Four Online • College Skill Lab Project • Real-Time Socket.IO & MongoDB</p>
      </footer>
    </div>
  );
}
