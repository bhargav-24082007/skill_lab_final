# Connect Four Online --- Implementation Plan for Person A

## Role: Frontend, User Interface, and Client-Side Integration

**Project goal:** Build the React frontend for a two-player online
Connect Four game. The interface must be simple, responsive, easy to
explain in a college viva, and compatible with Person B's Node.js +
Express + Socket.IO backend.

**Budget:** ₹0. Use free, open-source tools and local development. Do
not purchase domains, assets, subscriptions, or paid APIs.

------------------------------------------------------------------------

## 1. Responsibilities and boundaries

Person A owns the files under `client/` and is responsible for:

-   React application setup using Vite.
-   UI layout, styling, and responsive behavior using plain CSS.
-   Home screen, room creation/joining form, waiting room, game screen,
    and match history.
-   Rendering the board from the game state received from the server.
-   Connecting to the backend using Socket.IO.
-   Showing loading states, errors, turns, wins, draws, connection
    status, and player information.
-   Frontend validation for user-friendly feedback. The server remains
    authoritative and performs all security/game-rule validation.
-   Frontend testing and integration with Person B's backend.
-   Helping with the README, screenshots, demo, report, and
    presentation.

Person A should **not** implement the authoritative game rules, decide
the winner on behalf of the server, or connect directly to MongoDB.

------------------------------------------------------------------------

## 2. Required free tools

Install:

-   Node.js LTS: https://nodejs.org/
-   Visual Studio Code: https://code.visualstudio.com/
-   Git: https://git-scm.com/
-   Chrome or Firefox.
-   A free GitHub account for collaboration.

Use React, Vite, CSS, and `socket.io-client`. Do not add a UI framework,
paid template, animation library, global state library, or other
dependency unless the team agrees it is necessary.

------------------------------------------------------------------------

## 3. Project structure owned by Person A

Create the following frontend structure:

``` text
client/
├── public/
├── src/
│   ├── components/
│   │   ├── Home.jsx
│   │   ├── WaitingRoom.jsx
│   │   ├── Board.jsx
│   │   ├── Cell.jsx
│   │   └── GameInfo.jsx
│   ├── styles/
│   │   └── style.css
│   ├── socket.js
│   ├── App.jsx
│   └── main.jsx
├── .env.example
└── package.json
```

Keep the project small. Do not create a file for every tiny function.

### File responsibilities

-   `main.jsx`: React entry point; renders `App`.
-   `App.jsx`: stores high-level screen and game state; chooses which
    screen is visible.
-   `Home.jsx`: username input, Create Room button, room-code input,
    Join Room button, and short game rules.
-   `WaitingRoom.jsx`: room code, copy button, player slots, waiting
    status, and leave-room action.
-   `Board.jsx`: renders six rows and seven columns from the current
    board array.
-   `Cell.jsx`: renders one circular board cell and reports the clicked
    column.
-   `GameInfo.jsx`: player names/colors, turn message, connection
    status, winner/draw message, rematch and leave buttons.
-   `socket.js`: creates and exports the Socket.IO client connection.
-   `style.css`: all basic styling and responsive layout.

------------------------------------------------------------------------

## 4. UI requirements

### Screen A --- Home

Include:

-   Title: **Connect Four Online**.
-   A short subtitle explaining the game.
-   Display-name/username input.
-   Create Room button.
-   Room-code input.
-   Join Room button.
-   Brief rules: two players, take turns, connect four to win.
-   Visible validation messages for missing username or room code.

Keep the layout uncluttered and responsive. A display name is not an
authenticated identity; do not present it as a secure account.

### Screen B --- Waiting room

Include:

-   Room code displayed clearly.
-   Copy Room Code button using the browser clipboard API if available;
    show a fallback/error message if it fails.
-   Player 1 and Player 2 names or a "Waiting for opponent" message.
-   Room status.
-   Leave Room button.
-   Start Game button only if the agreed backend protocol supports a
    host-start flow. Otherwise, the server should start the game when
    both players are present.

### Screen C --- Game

Include:

-   Board with exactly 6 rows and 7 columns.
-   Red and yellow circular discs.
-   Player names and their assigned colors.
-   Clear indication of whose turn it is.
-   Connection status.
-   Error feedback when a move cannot be made.
-   Winning or draw message.
-   Highlighting for the four winning cells if the backend provides the
    winning positions.
-   Rematch button after a completed match, if the rematch feature is
    included.
-   Leave Game button.

The board must be rendered from the latest server-provided state. Do not
permanently add a disc only in the local browser before the server
accepts the move. A temporary click/hover effect is fine, but the actual
board is server-authoritative.

### Screen D --- Match history

Include a simple table or list with:

-   Date/time.
-   Player 1.
-   Player 2.
-   Result/winner.
-   Optional total moves.

Show a friendly empty state when no history exists and an error message
if the history cannot be loaded. Add a basic leaderboard only after core
gameplay and history work.

### Visual style

-   Use plain CSS.
-   Use a readable font stack available on the system.
-   Use a simple background, high-contrast board, red and yellow pieces,
    clear buttons, and visible focus states.
-   Make the layout usable on desktop and mobile.
-   Do not use paid images, icons, fonts, or templates.
-   Avoid excessive animation and visual complexity.

------------------------------------------------------------------------

## 5. Frontend state and shared data contract

Before implementing Socket.IO, agree with Person B on the exact event
names and payloads. Do not invent separate event names independently.

An illustrative game-state object is:

``` js
{
  roomCode: "AB12CD",
  board: [],             // 6 rows x 7 columns
  currentTurn: "R",
  status: "waiting",     // waiting, playing, finished
  players: {
    R: "Player One",
    Y: "Player Two"
  },
  winner: null,
  winningCells: [],
  totalMoves: 0
}
```

The backend may adjust this format, but both team members must use the
same final contract. Agree on whether the board is an array of arrays
containing `null`, `"R"`, and `"Y"`.

Suggested event contract (confirm with Person B):

  -----------------------------------------------------------------------
  Event                   Direction               Frontend behavior
  ----------------------- ----------------------- -----------------------
  `create-room`           Client to server        Send display name; wait
                                                  for success/error
                                                  acknowledgement

  `join-room`             Client to server        Send room code and
                                                  display name

  `room-updated`          Server to clients       Update waiting-room
                                                  player list/status

  `start-game`            Client to server, if    Request game start
                          required                

  `make-move`             Client to server        Send room code and
                                                  selected column

  `game-state`            Server to clients       Replace local displayed
                                                  game state with server
                                                  state

  `game-over`             Server to clients, if   Show winner/draw result
                          separate                

  `rematch-request`       Client to server, if    Ask for a rematch
                          included                

  `player-disconnected`   Server to clients       Show opponent
                                                  disconnection status

  `error-message`         Server to client        Display a readable
                                                  error
  -----------------------------------------------------------------------

Use Socket.IO acknowledgement callbacks for room creation/joining and
other actions where the server returns success or failure. Confirm the
exact acknowledgement shape with Person B.

Do not send a client-generated winner or full board state to the server.
For a move, the client should send only the requested column and the
required room/session context.

------------------------------------------------------------------------

## 6. Implementation sequence

### Step 1 --- Initialize the frontend

1.  Create the repository or clone the team's repository.
2.  From the repository root, create the Vite React project in
    `client/`.
3.  Install dependencies, including `socket.io-client`.
4.  Run the starter page.
5.  Confirm the app opens locally before adding features.

Typical commands:

``` bash
npm create vite@latest client -- --template react
cd client
npm install
npm install socket.io-client
npm run dev
```

If the `client` folder already exists, do not overwrite it; inspect it
first.

### Step 2 --- Build the static screens

1.  Build the Home screen.
2.  Build the Waiting Room screen.
3.  Build the Board and Cell components.
4.  Build the Game Info component.
5.  Add the CSS and responsive layout.
6.  Use temporary sample data only while developing the UI; remove or
    clearly separate it before integration.

### Step 3 --- Render the board

1.  Receive or define the agreed 6-by-7 board structure.
2.  Render each row and cell using simple array mapping.
3.  Render empty, red, and yellow cells based on the cell value.
4.  On click, report the column index to `App.jsx`.
5.  Do not calculate the winner in the frontend.

### Step 4 --- Connect Socket.IO

1.  Create `socket.js` and connect to the configured server URL.
2.  Put the backend URL in a Vite environment variable, such as
    `VITE_SERVER_URL`.
3.  Register event listeners once in a suitable React effect.
4.  Remove event listeners during cleanup to prevent duplicate updates.
5.  Handle connect, disconnect, reconnect, and connection errors.
6.  Send room creation/join requests using the agreed payloads.
7.  Display acknowledgement errors in the UI.
8.  Update the waiting room from `room-updated`.
9.  Send `make-move` when a user clicks a column.
10. Update the displayed board only from the authoritative `game-state`
    received from the server.

Example environment file:

``` env
VITE_SERVER_URL=http://localhost:3000
```

Do not put secrets in `VITE_` variables; frontend variables are visible
to users. The server's MongoDB connection string must never be placed in
the frontend.

### Step 5 --- Add history

1.  Agree with Person B on the HTTP route or Socket.IO event for
    retrieving match history.
2.  Fetch/display completed match records.
3.  Show loading, empty, success, and error states.
4.  Format timestamps in a readable way.
5.  Do not connect directly to MongoDB from React.

### Step 6 --- Polish

1.  Disable or visually block repeated clicks while an action is pending
    if needed.
2.  Show whose turn it is and which player owns each color.
3.  Show win/draw state clearly.
4.  Add a winning-cell highlight if the backend sends winning positions.
5.  Add mobile responsiveness and accessible button labels.
6.  Check that the interface does not claim a move succeeded before the
    server accepts it.

------------------------------------------------------------------------

## 7. Frontend testing checklist

-   [ ] Home screen renders correctly.
-   [ ] Empty username is rejected with a helpful message.
-   [ ] A room can be created and its room code is shown.
-   [ ] A valid room code can be submitted to join a room.
-   [ ] Invalid/nonexistent room errors are shown.
-   [ ] Waiting room updates when the second player joins.
-   [ ] Board always renders 6 rows and 7 columns.
-   [ ] Red and yellow discs render in the correct cells.
-   [ ] A clicked column sends the correct column index.
-   [ ] Both browser sessions show the same server-provided board.
-   [ ] Turn indicator changes with server state.
-   [ ] Winner and draw messages are displayed correctly.
-   [ ] Full-column and wrong-turn errors are displayed.
-   [ ] Disconnect/reconnect status is visible.
-   [ ] Match history displays records and an empty state.
-   [ ] Mobile layout remains usable.
-   [ ] Event listeners are not duplicated after screen
    changes/re-renders.
-   [ ] No database credentials or other secrets are present in frontend
    files.

------------------------------------------------------------------------

## 8. Git collaboration rules

-   Person A primarily edits `client/`.
-   Person B primarily edits `server/` and `tests/`.
-   Both agree on the event contract and state shape before integration.
-   Use descriptive commits, for example:
    -   `feat: add home and waiting room screens`
    -   `feat: render connect four board`
    -   `feat: connect frontend to socket events`
    -   `fix: clean up socket listeners`
-   Pull changes before beginning a new task.
-   Do not commit `.env`, `node_modules`, build outputs, or credentials.
-   Do not modify Person B's game logic without discussing it first.

------------------------------------------------------------------------

## 9. Zero-cost requirements

-   Use free/open-source React, Vite, CSS, and Socket.IO client
    packages.
-   Develop and test locally at no cost.
-   Use free GitHub repository hosting.
-   Use no paid design assets or APIs.
-   If a hosted backend is needed, use a service's free tier only after
    checking current limits and sleep behavior.
-   For the database, use local MongoDB or an eligible free MongoDB
    Atlas cluster.
-   Do not buy a domain or upgrade a plan.
-   Keep a local demo as a fallback in case free hosting is unavailable.

A fully local demonstration is the most reliable guaranteed ₹0 path.
Public deployment may have free-tier limits, availability restrictions,
or sleeping services.

------------------------------------------------------------------------

## 10. Person A's completion criteria

Person A's work is complete when:

1.  All agreed screens are implemented and responsive.
2.  The frontend connects to the backend using the agreed event
    contract.
3.  Room creation and joining work through the UI.
4.  The board reflects server state and never independently decides
    valid moves or winners.
5.  Turn, win, draw, errors, and connection states are shown clearly.
6.  Match history is displayed when the backend endpoint/event is ready.
7.  Frontend tests and manual checks pass.
8.  The code is simple enough for Person A to explain line by line in
    the viva.
9.  The README includes the exact frontend setup and run commands.
10. Person A can explain how React state, components, Socket.IO events,
    and server-authoritative updates work.
