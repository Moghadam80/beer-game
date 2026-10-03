# Beer Distribution Game

A four-player, twenty-round supply-chain game built with **NestJS, React,
TypeScript, SQLite and WebSockets**. The supplied requirements are preserved
in `ASSIGNMENT.md`; `EXAMPLE.md` and the original JSON fixture are unchanged.

## Run locally

Use **Node 24** (`.nvmrc`) and npm. Run all commands from this folder, not
from either child project:

```sh
npm install
npm run dev
```

Open `http://localhost:5173`. Create a room, copy its code or invitation link,
and open **four fresh tabs** in the same browser. Choose a different role in
each tab. The game starts immediately when the fourth player joins.

```sh
npm test         # pure rule tests, then real WebSocket/restart integration tests
npm run build    # builds the Vite client and compiles the NestJS backend
npm start        # serves both production client and backend on port 3000
npm run lint     # frontend ESLint and backend oxlint
```

For production, open `http://localhost:3000` after building. `npm start` runs
compiled JavaScript, not a TypeScript development runner. There is no separate
frontend server in production. An install and the dev command are enough
for local play; no database setup, credentials, or external service is needed.

The backend uses port 3000 and Vite uses 5173. `PORT` can change the production
backend port; if you change it during development, also change Vite's proxy.
`DATABASE_PATH` optionally overrides the SQLite file. The default is
`backend/data/beer-game.sqlite`, independent of the working directory.

## Rules and timing

Roles, in downstream-to-upstream order: Retailer, Wholesaler, Distributor,
Factory. Orders move upstream; shipments move downstream. All roles start
with inventory 12, backlog 0, last order 4, and two shipments of 4 scheduled
for rounds 1 and 2. Customer demand is 4 in rounds 1–4 and 8 in rounds 5–20.

At the start of each round, the server:

1. Receives the due shipment into each role's inventory.
2. Receives the previous round's downstream order (or customer demand).
3. Ships `min(inventory, backlog + incomingOrder)`, carrying unmet demand as backlog.
4. Charges `0.5 * remaining inventory + backlog`.
5. Waits for exactly one non-negative integer order from every role.

The first round's steps 1–4 happen **before** any round-one player decision.
A shipment sent in round R arrives in R+2. Actual upstream shipments, not
requested quantities, enter downstream pipelines. The unlimited supplier
ships the Factory's previous-round order with the same two-round delivery
delay. All incoming orders are snapshotted before shipping, and shipments
are scheduled only after every role has shipped.

For example, the Retailer's increase to 8 ordered in round 5 reaches the
Wholesaler in round 6; its shipment reaches the Retailer in round 8. All-four
ordering 4 matches the provided fixture in every field and round: final
costs are 394, 120, 120, 120, for a team total of **754**.

Round 20 still requires four submissions. It finishes without preparing a
round 21 or charging another cost. The final screen reveals all role costs
and their total.

## Architecture

- `backend/src/game/game.ts`: pure immutable rules. No NestJS, network,
  database, or React imports. Contains the shipping queues, current round,
  pending orders, per-role round metrics and historical records.
- `game.repository.ts`: SQLite persistence. Each row holds one room document,
  including player tokens, role ownership, full game state and partial
  submissions. SQLite's atomic upsert completes before clients are notified.
- `games.service.ts`: room creation, role claiming, token authentication,
  authoritative order validation and explicit per-player view projection.
- `games.gateway.ts`: the `ws` server attached to Nest's HTTP server as a
  lifecycle-managed provider. Connections are associated with authenticated
  sessions, not client-supplied roles. It broadcasts a separate view to every
  client after each successful action.
- `frontend/src/useGame.ts`: connection lifecycle, per-tab sessions and
  automatic reconnect/resume. `App.tsx` provides lobby, gameplay and results.

The only public player information is role, name, connection status and
whether an order is submitted. Private numerical state is included only for
the authenticated player's own role. Unauthenticated room views have no
private state. Other players' orders, inventory, backlog, costs, tokens and
histories are never broadcast while playing. Results are revealed only after
the game is finished.

Each connection sends small intents such as:

```json
{"action":"create"}
{"action":"watch","code":"A1B2C3"}
{"action":"join","code":"A1B2C3","role":"retailer","name":"Ali"}
{"action":"resume","code":"A1B2C3","token":"server-issued-secret"}
{"action":"order","round":5,"order":8}
```

The server returns `created`, `session`, `state` or `error` messages. Role
claims and round transitions run synchronously in one server process.
Duplicate submissions, stale rounds, occupied roles, malformed messages,
negative/fractional/non-number orders and invalid sessions are rejected.
Orders are represented as JavaScript safe integers (including zero).

## Reloads, disconnects and restarts

Player tokens are generated by the server and stored in **sessionStorage**,
not shared localStorage. Reloading preserves a tab's role; four tabs can
control four different roles. Do not duplicate an already-joined tab if you
want a different role: browsers can copy sessionStorage on duplication. Use
a fresh tab, or “Leave this tab” in the duplicate before joining another role.

The frontend reconnects with capped exponential backoff after socket loss and
requests its latest authorized view. No orders are automatically replayed.
Disconnects do not release roles, charge costs, or advance a round. A player
must resume using their original token. Already submitted orders survive a
reload or backend restart. A restarted backend reads rooms directly from
SQLite, so no reconstruction from connected clients is necessary.

“Leave this tab” only clears that tab's credentials. It does **not** abandon
or free a role; use it with care during a live game. This avoids substituting
players or changing rules during an in-progress round.

## Verification

The framework-free suite checks every field of all 80 role-round snapshots
in `fixtures/everyone-orders-four.json`, the round-6/round-8 delay example,
actual shipment routing when an upstream player has insufficient stock,
backlog fulfillment, the unlimited supplier, zero/invalid orders, duplicate
and stale submissions, four-player gating and twenty-round termination.

The integration suite starts a real Nest server, connects four independent
WebSocket clients, checks privacy and validation, restarts the backend with
a partially submitted round in a temporary SQLite database, resumes all
players, and completes the game with the expected final results.

Manual smoke check: create/join from four tabs, submit in just three (the
round must not advance), submit in the fourth, reload one tab and restart
the backend. Each player must retain their own role and see the latest round.

## Tradeoffs and next steps

The implementation targets the core assignment; there are no bots, charts or
animations. Whole-room JSON storage and a single process keep round updates
simple and reviewable. Multi-process deployments would require transactional
compare-and-swap updates and shared realtime broadcasting. No login/accounts,
public room directory, timeout-based orders, role forfeiture or automatic
room cleanup are implemented.

Tokens are bearer credentials. For public deployment, add TLS, origin checks,
rate limits and room retention policies. More time would go to browser-level
automation, accessibility testing and disconnect/abandonment rules agreed
with the product owner, before optional visual features.

## AI usage

An AI coding assistant helped migrate the initial scaffold into NestJS/Vite,
implement and correct the rules and session handling, write tests, and draft
this documentation. The earlier scaffold had incorrect shipment routing and
shared-tab sessions; those were replaced rather than reused unchanged.
The submission should be reviewed by the applicant, who must be able to
explain the round timing, privacy projection, persistence and reconnect code.
