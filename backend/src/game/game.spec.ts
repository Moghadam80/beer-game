import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createGame, ROLES, startGame, submitOrder, type GameState, type Role, type RoundRecord } from './game.js';

function finishRound(state: GameState, orders: Partial<Record<Role, number>> = {}): GameState {
  const round = state.round;
  for (const role of ROLES) state = submitOrder(state, role, round, orders[role] ?? 4);
  return state;
}

describe('framework-free game rules', () => {
  it('starts each role with the exact initial state and prepares round one before ordering', () => {
    const initial = createGame();
    expect(initial.roles.retailer).toMatchObject({
      inventory: 12, backlog: 0, shipmentsInTransit: [4, 4], lastOrderPlaced: 4,
    });
    const game = startGame(initial);
    for (const role of ROLES) expect(game.roles[role]).toMatchObject({
      shipmentArrived: 4, incomingOrder: 4, shipped: 4, inventory: 12,
      backlog: 0, roundCost: 6, totalCost: 6,
    });
    expect(initial.status).toBe('waiting');
    expect(initial.roles.retailer.totalCost).toBe(0);
  });

  it('matches every field of all four roles in all twenty fixture rounds', () => {
    const fixture = JSON.parse(readFileSync(new URL('../../../fixtures/everyone-orders-four.json', import.meta.url), 'utf8')) as {
      rounds: ({ round: number } & Record<Role, RoundRecord>)[];
      finalCosts: Record<Role, number>;
      totalCost: number;
    };
    let game = startGame(createGame());
    for (const expected of fixture.rounds) {
      expect(game.round).toBe(expected.round);
      for (const role of ROLES) expect(game.roles[role].history[game.round - 1]).toEqual(expected[role]);
      game = finishRound(game);
    }
    expect(game.status).toBe('finished');
    expect(game.round).toBe(20);
    expect(Object.fromEntries(ROLES.map((role) => [role, game.roles[role].totalCost]))).toEqual(fixture.finalCosts);
    expect(ROLES.reduce((total, role) => total + game.roles[role].totalCost, 0)).toBe(754);
    for (const role of ROLES) expect(game.roles[role].history).toHaveLength(20);
  });

  it('delivers the retailer order increase in round six and actual shipment in round eight', () => {
    let game = startGame(createGame());
    while (game.round < 8) {
      game = finishRound(game, { retailer: game.round >= 5 ? 8 : 4 });
      if (game.round === 5) expect(game.roles.retailer.incomingOrder).toBe(8);
      if (game.round === 6) expect(game.roles.wholesaler.incomingOrder).toBe(8);
      if (game.round <= 7) expect(game.roles.retailer.shipmentArrived).toBe(4);
    }
    expect(game.roles.retailer.shipmentArrived).toBe(8);
  });

  it('routes actual upstream shipments, not the requested order quantity', () => {
    const initial = createGame();
    initial.roles.wholesaler.inventory = 0;
    initial.roles.wholesaler.shipmentsInTransit = [0, 0];
    let game = startGame(initial);
    expect(game.roles.wholesaler.shipped).toBe(0);
    expect(game.roles.wholesaler.backlog).toBe(4);
    game = finishRound(finishRound(game, { retailer: 100 }));
    expect(game.roles.retailer.shipmentArrived).toBe(0);
    expect(game.roles.wholesaler.backlog).toBeGreaterThan(0);
  });

  it('automatically fulfills both backlog and new demand when a shipment arrives', () => {
    const initial = createGame();
    initial.roles.retailer.inventory = 0;
    initial.roles.retailer.backlog = 3;
    initial.roles.retailer.shipmentsInTransit = [0, 10];
    let game = startGame(initial);
    expect(game.roles.retailer.backlog).toBe(7);
    expect(game.roles.retailer.roundCost).toBe(7);
    game = finishRound(game);
    expect(game.roles.retailer).toMatchObject({ shipped: 10, inventory: 0, backlog: 1, roundCost: 1 });
  });

  it('uses the unlimited supplier with the same order and shipping delays', () => {
    let game = startGame(createGame());
    game = finishRound(game, { factory: 9 });
    expect(game.roles.factory.shipmentsInTransit).toEqual([4, 9]);
    game = finishRound(game);
    expect(game.roles.factory.shipmentArrived).toBe(4);
    game = finishRound(game);
    expect(game.roles.factory.shipmentArrived).toBe(9);
  });

  it('waits for all four submissions, accepts zero, and rejects duplicates and stale rounds', () => {
    const first = startGame(createGame());
    const second = submitOrder(first, 'retailer', 1, 0);
    expect(second.round).toBe(1);
    expect(first.orders).toEqual({});
    expect(second.roles.retailer.totalCost).toBe(6);
    expect(() => submitOrder(second, 'retailer', 1, 4)).toThrow('already submitted');
    expect(() => submitOrder(second, 'wholesaler', 0, 4)).toThrow('round has changed');
    let game = second;
    for (const role of ROLES.slice(1)) game = submitOrder(game, role, 1, 4);
    expect(game.round).toBe(2);
    expect(game.roles.wholesaler.incomingOrder).toBe(0);
    expect(() => submitOrder(game, 'factory', 1, 4)).toThrow('round has changed');
  });

  it.each([-1, 1.5, NaN, Infinity, '4', null, undefined, Number.MAX_SAFE_INTEGER + 1])('rejects invalid order %s', (order) => {
    expect(() => submitOrder(startGame(createGame()), 'retailer', 1, order)).toThrow('whole number');
  });

  it('does not accept orders before start or after round twenty', () => {
    expect(() => submitOrder(createGame(), 'retailer', 0, 4)).toThrow('not accepting');
    let game = startGame(createGame());
    for (let round = 1; round <= 20; round += 1) game = finishRound(game);
    expect(() => submitOrder(game, 'retailer', 20, 4)).toThrow('not accepting');
  });
});
