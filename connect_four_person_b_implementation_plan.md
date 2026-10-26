# Connect Four Online --- Implementation Plan for Person B

## Role: Backend, Game Logic, Real-Time Multiplayer, and Database

**Project goal:** Build the server for a two-player online Connect Four
game. The server must own the game state, validate all moves,
synchronize players through Socket.IO, and save completed match history
to MongoDB.

**Budget:** ₹0. Use free, open-source tools and local development. No
paid APIs, paid hosting, paid database plan, or subscription is
required.

------------------------------------------------------------------------

## 1. Responsibilities and boundaries

Person B owns the backend and test files and is responsible for:

-   Node.js and Express setup.
-   Socket.IO server setup and event handling.
-   Room creation, joining, capacity, and player assignment.
-   The Connect Four board and all game rules.
-   Server-side validation of every move.
-   Win detection in all four directions and draw detection.
-   Broadcasting authoritative game state to both players.
-   Disconnect and reconnect behavior appropriate to the project's
    scope.
-   MongoDB connection and match-history persistence.
-   Game-logic tests.
-   Documenting backend setup, environment variables, events, and data
    structures.

Person B should not build React screens or put MongoDB credentials in
the frontend. Person A owns the frontend. Both members must agree on the
shared state shape and Socket.IO event contract before implementation.

------------------------------------------------------------------------

## 2. Required free tools

Install:

-   Node.js LTS: https://nodejs.org/
-   Visual Studio Code: https://code.visualstudio.com/
-   Git: https://git-scm.com/
-   A modern browser for integration tests.
-   Optional: local MongoDB or a free MongoDB Atlas account.

Use Node.js, Express, Socket.IO, the official MongoDB driver or
Mongoose, and Node's built-in test runner. Choose one database access
approach and keep it consistent. To minimize abstraction, the official
MongoDB driver is a reasonable choice; Mongoose is also acceptable if
the team already knows it.

Do not add Redis, microservices, paid services, a message broker, or
complex deployment infrastructure. A single Node.js server is
sufficient.

------------------------------------------------------------------------

## 3. Project structure owned by Person B

``` text
server/
├── game/
│   └── gameLogic.js
├── services/
│   └── matchService.js
├── db.js
├── index.js
├── .env.example
└── package.json

tests/
└── gameLogic.test.js
```

### File responsibilities

-   `index.js`: starts Express and Socket.IO, manages rooms and socket
    events, validates requests, and broadcasts game state.
-   `game/gameLogic.js`: initializes the board, drops a disc, checks
    wins, checks draws, and returns winning positions.
-   `db.js`: connects to MongoDB and exposes the database connection.
-   `services/matchService.js`: saves a completed match and retrieves
    recent history.
-   `tests/gameLogic.test.js`: tests game rules and important edge
    cases.

Keep the backend understandable. Avoid creating a large framework or an
unnecessary class hierarchy.

------------------------------------------------------------------------

## 4. Game rules and state

Connect Four uses a board with 6 rows and 7 columns. Each move places a
disc in a selected column. The disc falls into the lowest empty cell in
that column.

-   Player 1 is assigned red (`"R"`).
-   Player 2 is assigned yellow (`"Y"`).
-   Empty cells are `null`.
-   Players take turns.
-   A player wins by connecting at least four discs horizontally,
    vertically, or diagonally.
-   If all 42 cells are filled and no player has won, the game is a
    draw.
-   No moves are accepted after the game finishes.

Use a simple two-dimensional array:

``` js
const ROWS = 6;
const COLS = 7;

function createBoard() {
  return Array.from(
    { length: ROWS },
    () => Array(COLS).fill(null)
  );
}
```

This is easy to explain: each outer-array item is a row, and each row
contains seven cells.

A possible room object is:

``` js
{
  roomCode: "AB12CD",
  players: {
    R: { socketId: "...", name: "Player One" },
    Y: { socketId: "...", name: "Player Two" }
  },
  board: [],              // 6 x 7 array
  currentTurn: "R",
  status: "waiting",      // waiting, playing, finished
  winner: null,
  winningCells: [],
  totalMoves: 0,
  createdAt: Date.now()
}
```

This is an illustrative structure. Use the final shared format agreed
with Person A. Do not store active game rooms in MongoDB for the first
version; keep active room state in server memory and store completed
match records in MongoDB.

**Limitation:** In-memory rooms are lost if the server restarts. This is
acceptable for the initial college project if documented. Do not claim
that unfinished games survive a server restart.

------------------------------------------------------------------------

## 5. Game logic implementation

Implement the rules as small functions in `game/gameLogic.js`.

### Function A --- `createBoard()`

-   Return six independent row arrays.
-   Each row contains seven `null` cells.
-   Avoid accidentally creating six references to the same row array.

### Function B --- `dropDisc(board, column, player)`

1.  Confirm that `column` is an integer from 0 to 6.
2.  Confirm that `player` is `"R"` or `"Y"`.
3.  Search from row index 5 upward to row index 0.
4.  Find the first empty cell in the selected column.
5.  Place the player's disc there.
6.  Return the updated board and placed row/column, or a clear failure
    result.
7.  Reject a full column without changing the board.

Decide whether this function mutates the existing board or returns a
copied board, then use that choice consistently. For a simple backend,
controlled mutation can be explained easily, but tests must ensure
rejected moves do not change the board.

### Function C --- `checkWinner(board, row, column)`

Check from the last placed disc in four directions:

-   Horizontal: `(0, 1)`
-   Vertical: `(1, 0)`
-   Diagonal down-right/up-left: `(1, 1)`
-   Diagonal down-left/up-right: `(1, -1)`

For each direction:

1.  Count matching discs from the newly placed cell in one direction.
2.  Count matching discs in the opposite direction.
3.  Include the newly placed disc.
4.  If the total is at least four, report a win and return the four or
    more connected winning positions.

Checking from the last placed disc avoids scanning the entire board
after every move. Do not write a complicated generalized game engine.

### Function D --- draw detection

A draw occurs when no empty cells remain and no winner has been
detected. Check for a win before declaring a draw.

### Function E --- tests

Use `node:test` and `node:assert` so no paid testing tool is needed.

Required test cases:

-   Empty board is correct.
-   A disc lands at the bottom of an empty column.
-   A second disc in the same column lands one row above.
-   Invalid column values are rejected.
-   A full column rejects further moves.
-   Horizontal win.
-   Vertical win.
-   Diagonal win in each diagonal direction.
-   Three connected discs do not trigger a win.
-   Draw is detected only when the board is full and there is no winner.
-   A rejected move does not modify the board unexpectedly.

Do not test only one winning direction. Diagonal detection is a common
source of bugs.

------------------------------------------------------------------------

## 6. Express and Socket.IO setup

Initialize the backend in `server/`:

``` bash
mkdir server
cd server
npm init -y
npm install express socket.io cors dotenv
```

Use the `http` module to create an HTTP server and attach Socket.IO to
that server. Do not start Express and Socket.IO as unrelated servers.

Typical backend responsibilities:

-   Parse configuration from environment variables.
-   Configure CORS for the agreed frontend origin.
-   Add a simple health endpoint such as `GET /health`.
-   Initialize Socket.IO.
-   Connect to MongoDB if configured.
-   Start listening on the configured port.
-   Handle graceful shutdown if time allows.

Example environment file:

``` env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
CLIENT_URL=http://localhost:5173
```

Use `.env.example` with placeholders and keep the actual `.env` out of
Git. If local gameplay must run without a database, handle database
setup explicitly and show a clear startup message; do not silently
pretend match history is being saved.

------------------------------------------------------------------------

## 7. Room management

Use a simple in-memory `Map` keyed by room code:

``` js
const rooms = new Map();
```

### Create room

1.  Receive a display name from the client.
2.  Validate and trim the name.
3.  Generate a unique, human-readable room code.
4.  Create a room with an empty board and status `waiting`.
5.  Assign the creator as red.
6.  Add the socket to the Socket.IO room.
7.  Send a success acknowledgement with the room code and player
    assignment.
8.  Broadcast room status to the room.

Room codes should be generated randomly and checked for collisions. Do
not rely on a timestamp alone.

### Join room

1.  Normalize and validate the submitted room code.
2.  Find the room.
3.  Reject if the room does not exist.
4.  Reject if the room already has two players or is no longer joinable.
5.  Assign the second player yellow.
6.  Add the socket to the room.
7.  Update room status.
8.  Send acknowledgement and broadcast the updated player list.
9.  Start the game automatically when both players are present, unless
    the team agrees to a host-start button.

### Leave room and disconnect

-   Remove or mark the disconnected player's socket.
-   Notify the other player.
-   Do not silently assign a new player to an already-running game
    without a clear policy.
-   For the first version, it is acceptable to mark the game interrupted
    and require a new room if reconnection cannot be implemented simply.
-   If reconnect support is implemented, use a stable player/session
    token rather than trusting a display name alone.
-   Clean up abandoned waiting rooms after a reasonable period if time
    allows.

Document the chosen disconnect policy in the README.

------------------------------------------------------------------------

## 8. Socket.IO event contract

Agree on these events with Person A before implementation. Keep names
and payloads identical on both sides.

  -----------------------------------------------------------------------
  Event                   Direction               Purpose
  ----------------------- ----------------------- -----------------------
  `create-room`           Client to server        Create a room

  `join-room`             Client to server        Join a room

  `room-updated`          Server to clients       Broadcast player list
                                                  and room status

  `start-game`            Client to server, if    Request game start
                          required                

  `make-move`             Client to server        Request a move in a
                                                  column

  `game-state`            Server to clients       Send the authoritative
                                                  game state

  `game-over`             Server to clients, if   Announce win/draw
                          separate                

  `rematch-request`       Client to server, if    Request a new round
                          implemented             

  `player-disconnected`   Server to clients       Notify the opponent

  `error-message`         Server to client        Communicate a readable
                                                  failure
  -----------------------------------------------------------------------

For each event, define the payload and acknowledgement response in a
shared note or README. Do not let Person A and Person B independently
invent different payload shapes.

A move request can contain a room code and column index. The server must
determine the player from the socket's room membership/session, not
trust a client-supplied color.

Use structured acknowledgement results, for example a success flag and
message. Exact fields should be agreed with Person A.

------------------------------------------------------------------------

## 9. Server-authoritative move flow

For every `make-move` request:

1.  Validate that the socket belongs to the specified room.
2.  Confirm the room is in `playing` status.
3.  Identify the player's assigned color from the server's room data.
4.  Confirm it is that player's turn.
5.  Validate the column number.
6.  Attempt to drop the disc.
7.  If invalid, return an error without broadcasting a fake move.
8.  If valid, update the room board and move count.
9.  Check whether the move wins the game.
10. If there is no winner, check for a draw.
11. If the game is finished, set status to `finished`.
12. Broadcast the latest state to both players.
13. Save the match once if it has just finished.

Protect against rapid duplicate requests and simultaneous events.
Node.js handles callbacks on one event loop, but every request still
needs validation against the latest state. Never trust a board, current
turn, or winner submitted by the frontend.

------------------------------------------------------------------------

## 10. Database and match history

Use MongoDB to persist completed matches only. Do not store every move
or every active room in the first version.

Example document:

``` js
{
  roomCode: "AB12CD",
  player1: "Player One",
  player2: "Player Two",
  winner: "Player One", // null for a draw
  result: "win",        // or "draw"
  totalMoves: 17,
  createdAt: new Date()
}
```

Suggested files:

-   `db.js`: connect to MongoDB and expose the database.
-   `services/matchService.js`: functions such as `saveMatch(match)` and
    `getRecentMatches(limit)`.

Requirements:

-   Validate fields before saving.
-   Save a match only once when the status changes from playing to
    finished.
-   Handle database failures without crashing the entire game server.
-   Do not claim persistence succeeded if the save failed.
-   Provide a simple HTTP endpoint such as `GET /api/matches` for recent
    match history.
-   Limit the number of records returned.
-   Return a consistent JSON response and a suitable HTTP status.
-   Never expose the MongoDB URI to the frontend.

For a college project, a simple match history is enough. A leaderboard
can be derived from match records later; do not add user authentication
just to create a leaderboard.

------------------------------------------------------------------------

## 11. Recommended API and event behavior

### HTTP endpoints

-   `GET /health`: returns whether the backend is running.
-   `GET /api/matches`: returns recent completed matches from MongoDB.

Use JSON responses with clear error messages. Keep HTTP routes limited
to health checks and history; real-time gameplay should use Socket.IO.

### Input validation

Reject or normalize:

-   Missing/empty display names.
-   Excessively long names.
-   Invalid room codes.
-   Invalid column values.
-   Requests from sockets not in the room.
-   Moves by the wrong player.
-   Moves when the game is waiting or finished.
-   Requests to join full rooms.

Never trust the client to choose its own player color or declare a
winner.

------------------------------------------------------------------------

## 12. Implementation schedule

### Days 1--2: Setup and contract

-   Initialize Node.js and Express.
-   Create the Git repository structure with Person A.
-   Agree on state format, events, payloads, and acknowledgements.
-   Start the HTTP server and verify `/health`.

### Days 3--5: Game logic

-   Implement `createBoard`.
-   Implement `dropDisc`.
-   Implement win detection and draw detection.
-   Write unit tests for all directions and invalid moves.
-   Demonstrate the rules independently of networking.

### Days 6--9: Multiplayer

-   Implement room creation and joining.
-   Add player assignment and room capacity.
-   Implement the server-authoritative `make-move` flow.
-   Broadcast room and game state.
-   Test with two browser sessions.
-   Handle wrong-turn, full-column, finished-game, and disconnect cases.

### Days 10--11: Database

-   Connect to local MongoDB or a free Atlas cluster.
-   Implement match saving and match-history retrieval.
-   Ensure a match is saved once.
-   Test database failure behavior.

### Days 12--14: Integration and submission

-   Integrate with Person A's frontend.
-   Test all game rules and room edge cases.
-   Fix bugs and review error messages.
-   Document setup and limitations.
-   Help prepare the architecture diagram, report, presentation, and
    demo.

If the schedule slips, prioritize a correct game and multiplayer
synchronization before optional rematches or leaderboards.

------------------------------------------------------------------------

## 13. Backend testing checklist

-   [ ] Server starts using environment variables.
-   [ ] `/health` returns a successful response.
-   [ ] Board has six independent rows and seven columns.
-   [ ] Disc drops to the lowest empty cell.
-   [ ] Invalid columns are rejected.
-   [ ] Full columns are rejected.
-   [ ] Horizontal win works.
-   [ ] Vertical win works.
-   [ ] Both diagonal wins work.
-   [ ] Draw is detected correctly.
-   [ ] Moves after game completion are rejected.
-   [ ] Room codes are unique among active rooms.
-   [ ] A third player cannot join a full room.
-   [ ] Players cannot move in rooms they do not belong to.
-   [ ] Wrong-turn moves are rejected.
-   [ ] Client-supplied player colors or winner claims are ignored.
-   [ ] Both players receive the same game state.
-   [ ] Disconnect behavior is consistent with the documented policy.
-   [ ] Match results are saved only once.
-   [ ] History endpoint returns recent records.
-   [ ] Database errors are handled clearly.
-   [ ] No credentials are committed to Git.

------------------------------------------------------------------------

## 14. Zero-cost requirements

-   Use Node.js, Express, Socket.IO, and free npm packages.
-   Use local development and local multiplayer tests at no cost.
-   Use local MongoDB if hosted database limits or setup become a
    problem.
-   Alternatively, use an eligible free MongoDB Atlas cluster after
    checking current conditions.
-   Do not use paid APIs, paid hosting, premium monitoring, or paid
    database features.
-   Keep deployment optional until local functionality is complete.
-   If deployed, use only a free plan and check its current limits,
    sleep behavior, and availability.
-   Do not buy a domain or enter a paid plan to make the demo work.

The guaranteed zero-cost fallback is to run the frontend, backend, and
database locally and demonstrate two browser sessions on the same
computer.

------------------------------------------------------------------------

## 15. Security and reliability basics

-   Keep `.env` out of Git.
-   Validate all event payloads.
-   Restrict Socket.IO CORS to the configured frontend origin in
    deployment.
-   Use HTTPS/WSS for a public deployment.
-   Avoid logging secrets or the database URI.
-   Do not trust the client for turn, board, color, or winner
    information.
-   Clean up room state when appropriate.
-   Document that in-memory active rooms disappear on server restart.
-   Do not claim authentication or anti-cheat protection beyond what is
    actually implemented.

For this project, simple input validation and server-authoritative game
logic are sufficient; do not attempt to build enterprise-grade security
infrastructure.

------------------------------------------------------------------------

## 16. Viva preparation

Person B should be able to explain:

1.  How a two-dimensional array represents the board.
2.  How a disc falls to the lowest empty cell.
3.  How win detection checks horizontal, vertical, and diagonal
    directions.
4.  Why the server must validate every move.
5.  How Socket.IO rooms allow two players to receive the same updates.
6.  How the server identifies which player owns each color.
7.  How a draw is detected.
8.  How a completed match is saved in MongoDB.
9.  Why active rooms are kept in memory for the first version.
10. What happens when a player disconnects or the server restarts.

Use descriptive function names, short functions, and straightforward
loops and conditions. Avoid complicated abstractions that neither team
member can explain.

------------------------------------------------------------------------

## 17. Person B's completion criteria

Person B's work is complete when:

1.  Game logic passes its tests.
2.  Rooms can be created and joined with two players.
3.  Socket.IO synchronizes both players' game state.
4.  The server rejects invalid and out-of-turn moves.
5.  All win directions and draws are detected correctly.
6.  Completed matches are saved once and can be retrieved.
7.  Disconnect behavior is documented and works as specified.
8.  Environment variables and credentials are handled safely.
9.  The backend can be started from documented instructions without paid
    services.
10. Person B can explain every important backend function and the full
    move-validation flow in the viva.
