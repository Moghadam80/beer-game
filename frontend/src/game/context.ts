import { createContext } from 'react';
import type { Role } from './protocol';
import type { ConnectionStatus } from './socket';

export interface GameActions {
  createRoom: () => void;
  findRoom: (code: string) => void;
  join: (role: Role, name: string) => void;
  placeOrder: (round: number, order: number) => void;
  /** Forget this tab's player and return to the home screen. */
  leave: () => void;
}

export interface GameContextValue {
  connection: ConnectionStatus;
  error: string;
  /** True while a request is waiting for the server's answer. */
  pending: boolean;
  /** True when buttons should be disabled: offline or waiting for the server. */
  busy: boolean;
  /** Room code from the URL or the saved session, used to prefill the home form. */
  initialRoom: string;
  actions: GameActions;
}

export const GameContext = createContext<GameContextValue | null>(null);
