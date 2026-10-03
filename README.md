# Beer Distribution Game

A full-stack implementation of the Beer Distribution Game using React, TypeScript, NestJS, WebSockets, and SQLite.

## 1. Running the Project

### Requirements

* Node.js 24
* npm

The project uses `.nvmrc` to specify the required Node.js version.

### Install dependencies

From the project root:

```bash
npm install
```

### Development

```bash
npm run dev
```

### Run tests

```bash
npm test
```

### Production build

```bash
npm run build
```

### Production

```bash
npm start
```

No Docker or external database is required. SQLite is used for persistence and is created automatically when the backend starts.

---

## 2. Project Structure

The project is divided into two main parts:

```text
.
├── backend/
│   ├── src/
│   │   ├── games/
│   │   │   ├── game.ts
│   │   │   ├── games.service.ts
│   │   │   ├── games.gateway.ts
│   │   │   └── game.repository.ts
│   │   ├── app.controller.ts
│   │   └── main.ts
│   └── test/
│
├── frontend/
│   └── src/
│       ├── components/
│       ├── game/
│       ├── screens/
│       ├── App.tsx
│       └── main.tsx
│
├── .nvmrc
└── package.json
```

### Backend

The backend is responsible for the authoritative game state.

* `game.ts` contains the core game rules and state transitions.
* `games.service.ts` manages rooms, players, sessions, and game operations.
* `games.gateway.ts` handles WebSocket communication.
* `game.repository.ts` persists games in SQLite.
* `main.ts` bootstraps the NestJS application.

### Frontend

The frontend is responsible for rendering the current game view and sending player actions.

React components do not calculate the authoritative game state. They display the state received from the server.

---

## 3. Synchronization Between Four Clients

The four clients communicate with the backend through WebSockets.

```text
Client 1 ─┐
Client 2 ─┤
Client 3 ─┼── WebSocket ──> NestJS Server ──> SQLite
Client 4 ─┘
```

The server is the single source of truth.

Clients send intents such as:

```text
join
resume
submit order
```

The server:

1. Validates the request.
2. Applies the game rules.
3. Updates the game state.
4. Persists the new state.
5. Sends the updated view to the connected clients.

For example:

```text
Player submits order
        ↓
WebSocket → Server
        ↓
Validate order
        ↓
Update GameState
        ↓
Save to SQLite
        ↓
Broadcast updated views
        ↓
React clients update their UI
```

Each client receives a **player-specific view**. During the game, a player only receives their own inventory, backlog, shipments, orders, and costs.

This privacy is enforced by the backend rather than relying only on frontend hiding.

---

## 4. Game State Model

The game is modeled as a single `GameState`.

At a high level:

```ts
type GameState = {
  status: 'waiting' | 'playing' | 'finished';
  round: number;
  roles: Record<Role, RoleState>;
  orders: Partial<Record<Role, number>>;
};
```

Each role has its own state:

```ts
type RoleState = {
  inventory: number;
  backlog: number;
  shipmentsInTransit: [number, number];
  lastOrderPlaced: number;
  totalCost: number;
  shipmentArrived: number;
  incomingOrder: number;
  shipped: number;
  roundCost: number;
  history: RoundRecord[];
};
```

The game rules are implemented as state transitions.

For example:

```text
startGame()
    ↓
prepareRound()
    ↓
submitOrder()
    ↓
prepare next round
```

The server does not trust values calculated by the client. Inventory, backlog, shipments, costs, and round progression are calculated on the server.

The complete game state is persisted as a JSON document in SQLite.

---

## 5. Design Trade-offs

### SQLite + JSON game state

I chose SQLite with the game state stored as a JSON document.

**Advantages:**

* Very simple setup
* No external database required
* Easy local development
* The entire game can be persisted and restored as one state

**Trade-off:**

This approach is less suitable for large-scale querying or running many backend instances. For a production system with many concurrent games, PostgreSQL with a more structured persistence model would be a better choice.

### Native WebSockets

I used WebSockets instead of polling or Socket.IO.

**Advantages:**

* Simple communication model
* Real-time server updates
* Lightweight protocol
* No need for an additional abstraction layer for this relatively small application

**Trade-off:**

Socket.IO could provide features such as rooms, reconnection handling, and fallbacks out of the box. Here, those requirements are implemented explicitly because the application only needs a small WebSocket protocol.

### Server-authoritative state

The server owns all game rules and state transitions.

**Advantages:**

* Prevents clients from manipulating game state
* Makes synchronization deterministic
* Allows the server to enforce player privacy

**Trade-off:**

The backend contains more game logic than the frontend, but this is intentional because correctness and consistency are more important than keeping the client logic simple.

---

## 6. What I Would Improve With More Time

If I had more time, I would focus on:

* Add optional bot players so games can start with fewer than four human players.
* Improve post-game analytics and add more visualizations.
* Add richer animations for shipments moving through the supply chain.
* Further improve mobile responsiveness and touch interactions.
* Add more comprehensive edge-case and load testing.
* Improve the bot strategy beyond a simple demand-based approach.
* For a larger production deployment, move persistence to PostgreSQL and support multiple backend instances with shared state.
* Add authentication/user accounts if the application needed persistent player identities across games.
