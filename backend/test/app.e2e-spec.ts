import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WebSocket } from 'ws';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { ROLES } from '../src/game/game.js';

type Message = {
  type: string; code?: string; token?: string; round?: number; status?: string;
  role?: string; own?: Record<string, unknown> | null;
  results?: { costs: Record<string, number>; total: number } | null;
  players?: { role: string; submitted: boolean }[];
};

class Client {
  readonly messages: Message[] = [];
  constructor(readonly socket: WebSocket) {
    socket.on('message', (raw) => this.messages.push(JSON.parse(raw.toString()) as Message));
  }
  send(message: unknown): void { this.socket.send(JSON.stringify(message)); }
  async next(predicate: (message: Message) => boolean = () => true): Promise<Message> {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const index = this.messages.findIndex(predicate);
      if (index >= 0) return this.messages.splice(index, 1)[0];
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    throw new Error('Timed out waiting for WebSocket state');
  }
}

describe('multiplayer and restart persistence', () => {
  let app: INestApplication;
  let url: string;
  let directory: string;
  const clients: Client[] = [];
  const previousPath = process.env.DATABASE_PATH;

  async function boot(): Promise<void> {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.listen(0, '127.0.0.1');
    url = (await app.getUrl()).replace('http:', 'ws:') + '/ws';
  }

  async function connect(): Promise<Client> {
    const client = new Client(new WebSocket(url));
    clients.push(client);
    await new Promise<void>((resolve, reject) => {
      client.socket.once('open', resolve);
      client.socket.once('error', reject);
    });
    return client;
  }

  beforeAll(async () => {
    directory = mkdtempSync(join(tmpdir(), 'beer-game-test-'));
    process.env.DATABASE_PATH = join(directory, 'game.sqlite');
    await boot();
  });

  afterAll(async () => {
    for (const client of clients) client.socket.terminate();
    if (app) await app.close();
    if (previousPath === undefined) delete process.env.DATABASE_PATH;
    else process.env.DATABASE_PATH = previousPath;
    if (directory) rmSync(directory, { recursive: true, force: true });
  });

  it('runs a complete game with private views, rejects invalid messages, and restores mid-round after restart', async () => {
    const creator = await connect();
    creator.send({ action: 'create' });
    const created = await creator.next((message) => message.type === 'created');
    const code = created.code!;
    const players: Client[] = [];
    const tokens: string[] = [];
    for (const role of ROLES) {
      const player = await connect();
      player.send({ action: 'join', code, role, name: role });
      tokens.push((await player.next((message) => message.type === 'session')).token!);
      players.push(player);
      if (players.length < 4) expect((await player.next((message) => message.type === 'state')).status).toBe('waiting');
    }
    const intruder = await connect();
    intruder.send({ action: 'resume', code, token: 'guess' });
    expect((await intruder.next()).code).toBe('SESSION_NOT_FOUND');
    intruder.send({ action: 'join', code, role: 'retailer', name: 'intruder' });
    expect((await intruder.next()).code).toBe('ROLE_TAKEN');
    intruder.socket.send('{');
    expect((await intruder.next()).code).toBe('INVALID_MESSAGE');

    for (const [index, player] of players.entries()) {
      const state = await player.next((message) => message.type === 'state' && message.status === 'playing');
      expect(state.role).toBe(ROLES[index]);
      expect(state.own).toMatchObject({ totalCost: 6, inventory: 12, incomingOrder: 4, shipmentArrived: 4 });
      expect(state.results).toBeNull();
      expect(JSON.stringify(state)).not.toContain(tokens[index]);
      expect(Object.keys(state.own!)).not.toContain('history');
      expect(Object.keys(state.own!)).not.toContain('shipmentsInTransit');
      expect(Object.keys(state)).not.toContain('roles');
    }
    const lobby = await fetch(url.replace('ws:', 'http:').replace('/ws', `/api/games/${code}`));
    const spectator = await lobby.json() as Message;
    expect(spectator.own).toBeNull();
    expect(spectator.results).toBeNull();

    players[0].send({ action: 'order', round: 1, order: -1 });
    expect((await players[0].next((message) => message.type === 'error')).code).toBe('INVALID_ORDER');
    players[0].send({ action: 'order', round: 1, order: 4, role: 'factory' });
    await players[0].next((message) => message.players?.[0].submitted === true);
    players[0].send({ action: 'order', round: 1, order: 4 });
    expect((await players[0].next((message) => message.type === 'error')).code).toBe('ALREADY_SUBMITTED');
    await app.close();
    await boot();
    for (const [index, token] of tokens.entries()) {
      const player = await connect();
      player.send({ action: 'resume', code, token });
      await player.next((message) => message.type === 'session');
      const state = await player.next((message) => message.type === 'state');
      expect(state.round).toBe(1);
      expect(state.role).toBe(ROLES[index]);
      expect(state.players?.[0].submitted).toBe(true);
      players[index] = player;
    }
    for (let round = 1; round <= 20; round += 1) {
      for (const [index, player] of players.entries()) {
        if (round === 1 && index === 0) continue;
        player.send({ action: 'order', round, order: 4 });
      }
      for (const player of players) {
        const state = await player.next((message) => message.type === 'state' &&
          (round === 20 ? message.status === 'finished' : message.round === round + 1));
        if (round === 20) {
          expect(state.round).toBe(20);
          expect(state.results).toEqual({ costs: { retailer: 394, wholesaler: 120, distributor: 120, factory: 120 }, total: 754 });
        }
      }
    }
    players[0].send({ action: 'order', round: 20, order: 4 });
    expect((await players[0].next((message) => message.type === 'error')).code).toBe('NOT_PLAYING');
  });
});
