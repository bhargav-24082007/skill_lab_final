/**
 * server/index.js
 *
 * Entry point for the Connect Four backend.
 *
 * Responsibilities:
 *  - Load environment variables
 *  - Create Express app + HTTP server + Socket.IO instance
 *  - Connect to MongoDB (optional — game works without it)
 *  - Register HTTP routes
 *  - Handle Socket.IO connection / room / game events
 *  - Broadcast authoritative game state
 *  - Persist completed matches
 */

"use strict";

require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");

const { connectDB } = require("./db");
const { saveMatch, getRecentMatches } = require("./services/matchService");
const { createBoard, dropDisc, checkWinner, checkDraw } = require("./game/gameLogic");

// ─── Configuration ────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || "3000", 10);
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// ─── Express setup ────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: CLIENT_URL,
    methods: ["GET"],
  })
);

// ─── HTTP server ──────────────────────────────────────────────────────────────

const server = http.createServer(app);

// ─── Socket.IO setup ──────────────────────────────────────────────────────────

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
  },
});

// ─── In-memory room store ─────────────────────────────────────────────────────

/**
 * rooms: Map<roomCode, RoomObject>
 *
 * RoomObject shape (agreed with Person A):
 * {
 *   roomCode:     string,
 *   players: {
 *     R: { socketId: string, name: string } | null,
 *     Y: { socketId: string, name: string } | null,
 *   },
 *   board:        null[][],   // 6 × 7
 *   currentTurn:  "R" | "Y",
 *   status:       "waiting" | "playing" | "finished",
 *   winner:       string | null,   // player color ("R"/"Y") or null
 *   winningCells: Array<[number,number]>,
 *   totalMoves:   number,
 *   createdAt:    number,         // Date.now()
 * }
 *
 * NOTE: In-memory rooms are lost on server restart.
 * Active room state is intentionally NOT stored in MongoDB for v1.
 */
const rooms = new Map();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generate a random 6-character alphanumeric room code, unique among active rooms. */
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let code;
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  } while (rooms.has(code));
  return code;
}

/** Sanitise and validate a player display name. */
function validateName(raw) {
  if (typeof raw !== "string") return null;
  const name = raw.trim().slice(0, 20);
  return name.length > 0 ? name : null;
}

/** Sanitise and normalise a room code from user input. */
function normaliseRoomCode(raw) {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase();
  return /^[A-Z0-9]{6}$/.test(code) ? code : null;
}

/**
 * buildPublicState(room)
 * Returns the room state that is safe to broadcast to both players.
 */
function buildPublicState(room) {
  return {
    roomCode: room.roomCode,
    players: {
      R: room.players.R ? { name: room.players.R.name } : null,
      Y: room.players.Y ? { name: room.players.Y.name } : null,
    },
    board: room.board,
    currentTurn: room.currentTurn,
    status: room.status,
    winner: room.winner,
    winningCells: room.winningCells,
    totalMoves: room.totalMoves,
  };
}

/** Look up which color a socketId belongs to in a room, or null. */
function getPlayerColor(room, socketId) {
  if (room.players.R && room.players.R.socketId === socketId) return "R";
  if (room.players.Y && room.players.Y.socketId === socketId) return "Y";
  return null;
}

// ─── HTTP Routes ──────────────────────────────────────────────────────────────

/** Health check — lets the frontend verify the server is running. */
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/** Recent match history from MongoDB. */
app.get("/api/matches", async (_req, res) => {
  try {
    const matches = await getRecentMatches(20);
    res.json({ matches });
  } catch (err) {
    console.error("[HTTP] /api/matches error:", err.message);
    res.status(500).json({ error: "Failed to retrieve match history." });
  }
});

// ─── Socket.IO Events ─────────────────────────────────────────────────────────

io.on("connection", (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // ── create-room ─────────────────────────────────────────────────────────────
  /**
   * Client emits: { name: string }
   * Server acks:  { success, roomCode?, color?, message? }
   * Server emits: "room-updated" to the room
   */
  socket.on("create-room", ({ name } = {}, ack) => {
    const playerName = validateName(name);
    if (!playerName) {
      return ack?.({ success: false, message: "A valid display name is required." });
    }

    const roomCode = generateRoomCode();
    const room = {
      roomCode,
      players: {
        R: { socketId: socket.id, name: playerName },
        Y: null,
      },
      board: createBoard(),
      currentTurn: "R",
      status: "waiting",
      winner: null,
      winningCells: [],
      totalMoves: 0,
      createdAt: Date.now(),
    };

    rooms.set(roomCode, room);
    socket.join(roomCode);

    console.log(`[Room] Created ${roomCode} by "${playerName}" (${socket.id})`);

    ack?.({ success: true, roomCode, color: "R" });
    io.to(roomCode).emit("room-updated", buildPublicState(room));
  });

  // ── join-room ────────────────────────────────────────────────────────────────
  /**
   * Client emits: { roomCode: string, name: string }
   * Server acks:  { success, color?, message? }
   * Server emits: "room-updated" to the room, then "game-state" to start the game
   */
  socket.on("join-room", ({ roomCode: rawCode, name } = {}, ack) => {
    const roomCode = normaliseRoomCode(rawCode);
    if (!roomCode) {
      return ack?.({ success: false, message: "Invalid room code." });
    }

    const playerName = validateName(name);
    if (!playerName) {
      return ack?.({ success: false, message: "A valid display name is required." });
    }

    const room = rooms.get(roomCode);
    if (!room) {
      return ack?.({ success: false, message: "Room not found." });
    }

    if (room.status !== "waiting" || room.players.Y !== null) {
      return ack?.({ success: false, message: "Room is full or no longer available." });
    }

    room.players.Y = { socketId: socket.id, name: playerName };
    room.status = "playing";

    socket.join(roomCode);

    console.log(`[Room] ${socket.id} ("${playerName}") joined ${roomCode} as Y`);

    ack?.({ success: true, color: "Y" });

    // Notify both players: room has two players and game is starting
    io.to(roomCode).emit("room-updated", buildPublicState(room));
    io.to(roomCode).emit("game-state", buildPublicState(room));
  });

  // ── make-move ────────────────────────────────────────────────────────────────
  /**
   * Client emits: { roomCode: string, column: number }
   * Server acks:  { success, message? }
   * Server emits: "game-state" (and "game-over" if finished) to both players
   *
   * The server identifies the player's color from its own room data.
   * Client-supplied color or board data is never trusted.
   */
  socket.on("make-move", ({ roomCode: rawCode, column } = {}, ack) => {
    const roomCode = normaliseRoomCode(rawCode);
    const room = roomCode ? rooms.get(roomCode) : null;

    // Validate the socket belongs to this room
    if (!room) {
      return ack?.({ success: false, message: "Room not found." });
    }

    const color = getPlayerColor(room, socket.id);
    if (!color) {
      return ack?.({ success: false, message: "You are not a player in this room." });
    }

    if (room.status !== "playing") {
      return ack?.({ success: false, message: "Game is not in progress." });
    }

    if (room.currentTurn !== color) {
      return ack?.({ success: false, message: "It is not your turn." });
    }

    // Attempt to drop the disc
    const moveResult = dropDisc(room.board, column, color);
    if (!moveResult.success) {
      return ack?.({ success: false, message: moveResult.message });
    }

    room.totalMoves += 1;

    // Check for a winner
    const { winner, winningCells } = checkWinner(room.board, moveResult.row, moveResult.col);

    if (winner) {
      room.status = "finished";
      room.winner = winner;
      room.winningCells = winningCells;
    } else if (checkDraw(room.board)) {
      room.status = "finished";
      room.winner = null;   // draw
      room.winningCells = [];
    } else {
      // Switch turn
      room.currentTurn = color === "R" ? "Y" : "R";
    }

    ack?.({ success: true });

    const state = buildPublicState(room);
    io.to(roomCode).emit("game-state", state);

    // If the game just finished, emit game-over and persist the match
    if (room.status === "finished") {
      io.to(roomCode).emit("game-over", {
        winner: room.winner,
        winningCells: room.winningCells,
        result: room.winner ? "win" : "draw",
      });

      // Persist to MongoDB (fire-and-forget; errors are logged, not thrown)
      const winnerName = room.winner
        ? room.players[room.winner]?.name ?? null
        : null;

      saveMatch({
        roomCode: room.roomCode,
        player1: room.players.R?.name ?? "Unknown",
        player2: room.players.Y?.name ?? "Unknown",
        winner: winnerName,
        result: room.winner ? "win" : "draw",
        totalMoves: room.totalMoves,
        createdAt: new Date(),
      }).catch((err) => console.error("[Socket] saveMatch error:", err.message));
    }
  });

  // ── disconnect ───────────────────────────────────────────────────────────────
  /**
   * Disconnect policy (documented):
   *   - If a player disconnects while the game is in progress, the opponent
   *     is notified via "player-disconnected".
   *   - The room is marked as finished so no further moves are accepted.
   *   - There is no automatic reconnection for v1.
   *     Players must create/join a new room.
   *   - Waiting rooms whose creator disconnects are cleaned up immediately.
   */
  socket.on("disconnect", () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);

    for (const [roomCode, room] of rooms.entries()) {
      const color = getPlayerColor(room, socket.id);
      if (!color) continue;

      if (room.status === "waiting") {
        // Creator disconnected before anyone joined — remove the room
        rooms.delete(roomCode);
        console.log(`[Room] Deleted waiting room ${roomCode} (creator left).`);
      } else if (room.status === "playing") {
        // Game was in progress — mark it interrupted
        room.status = "finished";
        room.players[color] = { ...room.players[color], socketId: null };

        const opponentColor = color === "R" ? "Y" : "R";
        const opponentSocketId = room.players[opponentColor]?.socketId;

        if (opponentSocketId) {
          io.to(opponentSocketId).emit("player-disconnected", {
            message: `${room.players[color]?.name ?? "Your opponent"} disconnected. The game has ended.`,
          });
        }

        console.log(`[Room] Player ${color} disconnected from active game ${roomCode}.`);
      }
      // If the room is already finished, no action needed
      break;
    }
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────

async function start() {
  // Connect to MongoDB (non-fatal if unavailable)
  await connectDB();

  server.listen(PORT, () => {
    console.log(`[Server] Connect Four backend running on http://localhost:${PORT}`);
    console.log(`[Server] Accepting connections from: ${CLIENT_URL}`);
    console.log(`[Server] Health check: http://localhost:${PORT}/health`);
    console.log(`[Server] Match history: http://localhost:${PORT}/api/matches`);
  });
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────

const { closeDB } = require("./db");

process.on("SIGINT", async () => {
  console.log("\n[Server] Shutting down...");
  await closeDB();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n[Server] Shutting down...");
  await closeDB();
  process.exit(0);
});

start();
