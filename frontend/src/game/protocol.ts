// Types shared with the backend's WebSocket protocol (see backend/src/game).

export const ROLES = ['retailer', 'wholesaler', 'distributor', 'factory'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  retailer: 'Retailer',
  wholesaler: 'Wholesaler',
  distributor: 'Distributor',
  factory: 'Factory',
};

export interface PlayerSummary {
  role: Role;
  name: string | null;
  taken: boolean;
  connected: boolean;
  submitted: boolean;
}

/** The numbers a player is allowed to see about their own role. */
export interface OwnState {
  inventory: number;
  backlog: number;
  shipmentArrived: number;
  incomingOrder: number;
  shipped: number;
  lastOrderPlaced: number;
  roundCost: number;
  totalCost: number;
}

export interface GameResults {
  costs: Record<Role, number>;
  total: number;
}

export interface GameView {
  type: 'state';
  code: string;
  status: 'waiting' | 'playing' | 'finished';
  round: number;
  totalRounds: number;
  role: Role | null;
  players: PlayerSummary[];
  own: OwnState | null;
  results: GameResults | null;
}

/** A view that belongs to a seated player, so role and own numbers exist. */
export type PlayerGameView = GameView & { role: Role; own: OwnState };

export function isPlayerView(view: GameView): view is PlayerGameView {
  return view.role !== null && view.own !== null;
}

export interface Session {
  code: string;
  token: string;
}

export type ServerMessage =
  | GameView
  | { type: 'session'; code: string; token: string }
  | { type: 'created'; code: string }
  | { type: 'error'; code: string; message: string };

export type ClientMessage =
  | { action: 'create' }
  | { action: 'watch'; code: string }
  | { action: 'join'; code: string; role: Role; name: string }
  | { action: 'resume'; code: string; token: string }
  | { action: 'order'; round: number; order: number };
