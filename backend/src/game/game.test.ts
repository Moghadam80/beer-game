import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createGame, GameError, ROLES, startGame, submitOrder, type GameState, type Role } from './game.js';

const fixture = JSON.parse(
  readFileSync(new URL('../../../fixtures/everyone-orders-four.json', import.meta.url), 'utf8'),
);

function playRound(state: GameState, orders: Partial<Record<Role, number>> = {}): GameState {
  let next = state;
  for (const role of ROLES) next = submitOrder(next, role, next.round, orders[role] ?? 4);
  return next;
}

function errorCode(action: () => unknown): string | undefined {
  try { action(); } catch (error) { return error instanceof GameError ? error.code : 'NOT_A_GAME_ERROR'; }
  return undefined;
}

describe('game rules', () => {
  it('matches the worked example for all 20 rounds', () => {
    let state = startGame(createGame());
    for (const expected of fixture.rounds) {
      expect(state.round).toBe(expected.round);
      for (const role of ROLES) {
        const { orderPlaced, ...afterStepFour } = expected[role];
        expect(state.roles[role]).toMatchObject(afterStepFour);
      }
      state = playRound(state);
    }
    expect(state.status).toBe('finished');
    for (const role of ROLES) expect(state.roles[role].totalCost).toBe(fixture.finalCosts[role]);
    expect(errorCode(() => submitOrder(state, 'retailer', 20, 4))).toBe('NOT_PLAYING');
  });

  it('delays orders by one round and shipments by two', () => {
    let state = startGame(createGame());
    state = playRound(state, { retailer: 10, factory: 9 });
    // round 2: the wholesaler sees the retailer's round-1 order and ships it from stock
    expect(state.roles.wholesaler).toMatchObject({ incomingOrder: 10, shipped: 10, inventory: 6, roundCost: 3 });
    state = playRound(state);
    expect(state.roles.retailer.shipmentArrived).toBe(4); // round 3
    expect(state.roles.factory.shipmentArrived).toBe(4);
    state = playRound(state);
    expect(state.roles.retailer.shipmentArrived).toBe(10); // round 4
    expect(state.roles.factory.shipmentArrived).toBe(9); // supplier ships what the factory ordered
  });

  it('rejects invalid, duplicate and stale orders', () => {
    const state = submitOrder(startGame(createGame()), 'retailer', 1, 4);
    expect(errorCode(() => submitOrder(state, 'retailer', 1, 4))).toBe('ALREADY_SUBMITTED');
    expect(errorCode(() => submitOrder(state, 'factory', 1, -1))).toBe('INVALID_ORDER');
    expect(errorCode(() => submitOrder(state, 'factory', 1, 2.5))).toBe('INVALID_ORDER');
    expect(errorCode(() => submitOrder(state, 'factory', 1, '4'))).toBe('INVALID_ORDER');
    expect(errorCode(() => submitOrder(state, 'factory', 2, 4))).toBe('STALE_ROUND');
    expect(errorCode(() => submitOrder(createGame(), 'retailer', 0, 4))).toBe('NOT_PLAYING');
  });

  it('waits for all four players and never mutates its input', () => {
    const start = startGame(createGame());
    let state = start;
    for (const role of ['retailer', 'wholesaler', 'distributor'] as const) {
      state = submitOrder(state, role, 1, 4);
      expect(state.round).toBe(1);
    }
    expect(start.orders).toEqual({});
    state = submitOrder(state, 'factory', 1, 4);
    expect(state.round).toBe(2);
    expect(state.orders).toEqual({});
  });
});