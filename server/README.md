# Connect Four Online — Backend (Person B)

Authoritative backend service for two-player online Connect Four, built with **Node.js**, **Express**, **Socket.IO**, and **MongoDB**.

---

## Architecture Overview

- **Authoritative Server**: All game moves, turns, win checks, and room assignments are validated on the server. Clients never dictate game outcomes.
- **In-Memory Active Games**: Active rooms and board states are held in memory (`rooms` Map) for minimal latency.
- **MongoDB Persistence**: Completed matches are saved to MongoDB (`matches` collection) via `services/matchService.js`. If MongoDB is not running or `MONGODB_URI` is not configured, the server falls back to non-persistent play without crashing.
- **REST Endpoints**: Simple Express routes for health check and recent match history.

---

## Directory Structure

```
server/
├── game/
│   └── gameLogic.js          # Core Connect Four logic (board, drops, win/draw checks)
├── services/
│   └── matchService.js       # MongoDB match history read/write operations
├── db.js                     # MongoDB connection management & graceful fallback
├── index.js                  # Express server, Socket.IO event handlers, room lifecycle
├── package.json              # Backend dependencies and test scripts
└── .env.example              # Example environment variable template

tests/
├── gameLogic.test.js         # Unit tests for pure Connect Four game logic (20 tests)
└── socketEvents.test.js      # Integration tests for Socket.IO multiplayer flows (16 tests)
```

---

## Setup & Running

### 1. Prerequisites
- **Node.js** >= 18.0.0
- (Optional) **MongoDB** instance (local or free MongoDB Atlas cluster)

### 2. Environment Configuration
Copy `.env.example` to `.env` in the `server/` directory:
```bash
PORT=3000
MONGODB_URI=mongodb://localhost:27017/connectfour
CLIENT_URL=http://localhost:5173
```
*Note: If `MONGODB_URI` is left blank, the server runs in local play mode without database persistence.*

### 3. Install Dependencies
```bash
cd server
npm install
```

### 4. Run Server
- **Production mode**: `npm start`
- **Development mode (auto-reload)**: `npm run dev`

The server will listen at `http://localhost:3000`.

---

## Automated Tests

Node's native test runner (`node:test`) is used with zero external test frameworks required.

Run from repository root:
```bash
cmd /c "npm test"            # Runs all 36 unit & integration tests
cmd /c "npm run test:logic"  # Runs the 20 gameLogic unit tests
cmd /c "npm run test:socket" # Runs the 16 socket integration tests
```

Or from `server/`:
```bash
cd server
node --test ../tests/gameLogic.test.js ../tests/socketEvents.test.js
```

---

## HTTP REST Endpoints

### `GET /health`
Verifies server health.
- **Response**: `{ status: "ok", timestamp: "2026-10-27T..." }`

### `GET /api/matches`
Fetches the 20 most recent completed games from MongoDB.
- **Response**: `{ matches: [ { _id, roomCode, player1, player2, winner, result, totalMoves, createdAt } ] }`

---

## Agreed Socket.IO Event Contract (For Person A)

### 1. Connection
- **URL**: `http://localhost:3000` (or `VITE_SERVER_URL`)
- **Transports**: `["websocket", "polling"]`

### 2. Events Sent by Client (Emits with Acknowledgement)

| Event | Payload | Acknowledgement Response | Description |
|---|---|---|---|
| `create-room` | `{ name: string }` | `{ success: true, roomCode: string, color: "R" }` or `{ success: false, message: string }` | Creates a new room. Creator is assigned color `"R"`. |
| `join-room` | `{ roomCode: string, name: string }` | `{ success: true, roomCode: string, color: "Y" }` or `{ success: false, message: string }` | Joins an existing room. Second player is assigned `"Y"`. |
| `make-move` | `{ roomCode: string, col: number }` | `{ success: true }` or `{ success: false, message: string }` | Drops a disc into column `0` to `6`. |
| `leave-room` | `{ roomCode: string }` | `{ success: true }` or `{ success: false, message: string }` | Leaves the room. |
| `rematch-request` | `{ roomCode: string }` | `{ success: true }` or `{ success: false, message: string }` | Requests a rematch after game over. |
| `rematch-accepted` | `{ roomCode: string }` | `{ success: true }` or `{ success: false, message: string }` | Accepts rematch. Swaps colors (`Y` becomes `R`) and resets board. |

### 3. Events Sent by Server (Broadcasts)

| Event | Target | Payload | Description |
|---|---|---|---|
| `room-updated` | Room | Public Game State | Broadcast when players join/leave/update. |
| `game-state` | Room | Public Game State | Authoritative board state broadcast after each accepted move. |
| `rematch-request` | Opponent | `{ from: string }` | Notifies opponent that a rematch has been requested. |
| `player-disconnected` | Opponent | `{ message: string }` | Notifies remaining player when opponent leaves or disconnects. |

### 4. Public Game State Shape
```json
{
  "roomCode": "ABC123",
  "players": {
    "R": { "name": "Alice" },
    "Y": { "name": "Bob" }
  },
  "board": [
    [null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null]
  ],
  "currentTurn": "R",
  "status": "playing",
  "winner": null,
  "winningCells": [],
  "totalMoves": 0
}
```
- `board`: 6 rows × 7 columns. Cell values are `null`, `"R"`, or `"Y"`. Row 0 is the top, Row 5 is the bottom.
- `status`: `"waiting"` (1 player), `"playing"` (2 players), or `"finished"` (win/draw/forfeit).
- `winner`: `"R"`, `"Y"`, or `null`.
- `winningCells`: Array of `[row, col]` pairs indicating the four connected winning discs (for UI highlighting).
