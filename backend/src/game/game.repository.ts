import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import type { GameState, Role } from './game.js';

export type Member = { role: Role; name: string; token: string };
export type Room = { code: string; state: GameState; members: Member[] };

@Injectable()
export class GameRepository implements OnModuleDestroy {
  private readonly database: DatabaseSync;

  constructor() {
    const path = process.env.DATABASE_PATH ?? fileURLToPath(new URL('../../data/beer-game.sqlite', import.meta.url));
    if (path !== ':memory:') mkdirSync(dirname(resolve(path)), { recursive: true });
    this.database = new DatabaseSync(path);
    this.database.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; CREATE TABLE IF NOT EXISTS games (code TEXT PRIMARY KEY, document TEXT NOT NULL)');
  }

  get(code: string): Room | undefined {
    const row = this.database.prepare('SELECT document FROM games WHERE code = ?').get(code);
    return row ? JSON.parse(row.document as string) as Room : undefined;
  }

  save(room: Room): void {
    this.database.prepare('INSERT INTO games (code, document) VALUES (?, ?) ON CONFLICT(code) DO UPDATE SET document = excluded.document')
      .run(room.code, JSON.stringify(room));
  }

  onModuleDestroy(): void {
    this.database.close();
  }
}
