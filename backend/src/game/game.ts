export const ROLES = ['retailer', 'wholesaler', 'distributor', 'factory'] as const;
export type Role = (typeof ROLES)[number];
export const TOTAL_ROUNDS = 20;

export type RoundRecord = {
  shipmentArrived: number;
  incomingOrder: number;
  shipped: number;
  inventory: number;
  backlog: number;
  roundCost: number;
  totalCost: number;
  orderPlaced: number;
};

export type RoleState = {
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

export type GameState = {
  status: 'waiting' | 'playing' | 'finished';
  round: number;
  roles: Record<Role, RoleState>;
  orders: Partial<Record<Role, number>>;
};

export class GameError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && ROLES.includes(value as Role);
}

function createRole(): RoleState {
  return {
    inventory: 12, backlog: 0, shipmentsInTransit: [4, 4],
    lastOrderPlaced: 4, totalCost: 0, shipmentArrived: 0,
    incomingOrder: 0, shipped: 0, roundCost: 0, history: [],
  };
}

export function createGame(): GameState {
  return {
    status: 'waiting',
    round: 0,
    roles: {
      retailer: createRole(),
      wholesaler: createRole(),
      distributor: createRole(),
      factory: createRole(),
    },
    orders: {},
  };
}

function prepareRound(state: GameState): void {
  const previousOrders = ROLES.map((role) => state.roles[role].lastOrderPlaced);
  for (const [index, role] of ROLES.entries()) {
    const player = state.roles[role];
    player.shipmentArrived = player.shipmentsInTransit[0];
    player.shipmentsInTransit = [player.shipmentsInTransit[1], 0];
    player.inventory += player.shipmentArrived;
    player.incomingOrder = index === 0
      ? (state.round <= 4 ? 4 : 8)
      : previousOrders[index - 1];
    const required = player.backlog + player.incomingOrder;
    player.shipped = Math.min(player.inventory, required);
    player.inventory -= player.shipped;
    player.backlog = required - player.shipped;
    player.roundCost = 0.5 * player.inventory + player.backlog;
    player.totalCost += player.roundCost;
    player.history.push({
      shipmentArrived: player.shipmentArrived, incomingOrder: player.incomingOrder,
      shipped: player.shipped, inventory: player.inventory, backlog: player.backlog,
      roundCost: player.roundCost, totalCost: player.totalCost,
      orderPlaced: player.lastOrderPlaced,
    });
  }
  for (const [index, role] of ROLES.entries()) {
    state.roles[role].shipmentsInTransit[1] = index === ROLES.length - 1
      ? previousOrders[index]
      : state.roles[ROLES[index + 1]].shipped;
  }
}

export function startGame(state: GameState): GameState {
  if (state.status !== 'waiting') throw new GameError('ALREADY_STARTED', 'This game has already started.');
  const next = structuredClone(state);
  next.status = 'playing';
  next.round = 1;
  prepareRound(next);
  return next;
}

export function submitOrder(state: GameState, role: Role, round: unknown, order: unknown): GameState {
  if (state.status !== 'playing') throw new GameError('NOT_PLAYING', 'The game is not accepting orders.');
  if (!isRole(role)) throw new GameError('INVALID_ROLE', 'Choose a valid role.');
  if (round !== state.round) throw new GameError('STALE_ROUND', 'The round has changed. Check the latest state.');
  if (Object.hasOwn(state.orders, role)) throw new GameError('ALREADY_SUBMITTED', 'You have already submitted this round.');
  if (typeof order !== 'number' || !Number.isSafeInteger(order) || order < 0) {
    throw new GameError('INVALID_ORDER', 'An order must be a non-negative whole number.');
  }
  const next = structuredClone(state);
  next.orders[role] = order;
  next.roles[role].lastOrderPlaced = order;
  next.roles[role].history[next.round - 1].orderPlaced = order;
  if (ROLES.every((playerRole) => Object.hasOwn(next.orders, playerRole))) {
    if (next.round === TOTAL_ROUNDS) {
      next.status = 'finished';
    } else {
      next.round += 1;
      next.orders = {};
      prepareRound(next);
    }
  }
  return next;
}
