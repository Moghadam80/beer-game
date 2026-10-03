import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { WebSocket, WebSocketServer, type RawData } from 'ws';
import { GameError } from './game.js';
import { GamesService } from './games.service.js';

type Connection = { code: string; token?: string };

@Injectable()
export class GamesGateway implements OnModuleInit, OnModuleDestroy {
  private server: WebSocketServer;
  private readonly connections = new Map<WebSocket, Connection>();
  private readonly logger = new Logger(GamesGateway.name);

  constructor(
    @Inject(HttpAdapterHost) private readonly adapter: HttpAdapterHost,
    @Inject(GamesService) private readonly games: GamesService,
  ) {}

  onModuleInit(): void {
    this.server = new WebSocketServer({
      server: this.adapter.httpAdapter.getHttpServer(), path: '/ws', maxPayload: 4096,
    });
    this.server.on('connection', (socket) => {
      socket.on('message', (raw) => this.handle(socket, raw));
      socket.on('error', () => socket.close());
      socket.on('close', () => {
        const connection = this.connections.get(socket);
        this.connections.delete(socket);
        if (connection) this.broadcast(connection.code);
      });
    });
  }

  private send(socket: WebSocket, message: unknown): void {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  }

  private attach(socket: WebSocket, connection: Connection): void {
    const previous = this.connections.get(socket);
    this.connections.set(socket, connection);
    if (previous && previous.code !== connection.code) this.broadcast(previous.code);
  }

  private handle(socket: WebSocket, raw: RawData): void {
    try {
      let parsed: unknown;
      try { parsed = JSON.parse(raw.toString()); }
      catch { throw new GameError('INVALID_MESSAGE', 'Send a valid JSON message.'); }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new GameError('INVALID_MESSAGE', 'Send a message object.');
      }
      const message = parsed as Record<string, unknown>;
      switch (message.action) {
        case 'create': {
          const room = this.games.create();
          this.attach(socket, { code: room.code });
          this.send(socket, { type: 'created', code: room.code });
          this.broadcast(room.code);
          break;
        }
        case 'watch': {
          const room = this.games.get(message.code);
          this.attach(socket, { code: room.code });
          this.broadcast(room.code);
          break;
        }
        case 'join': {
          if (this.connections.get(socket)?.token) throw new GameError('ALREADY_JOINED', 'Use a new tab to join another role.');
          const { room, member } = this.games.join(message.code, message.role, message.name);
          this.attach(socket, { code: room.code, token: member.token });
          this.send(socket, { type: 'session', code: room.code, token: member.token });
          this.broadcast(room.code);
          break;
        }
        case 'resume': {
          const { room, member } = this.games.authenticate(message.code, message.token);
          this.attach(socket, { code: room.code, token: member.token });
          this.send(socket, { type: 'session', code: room.code, token: member.token });
          this.broadcast(room.code);
          break;
        }
        case 'order': {
          const connection = this.connections.get(socket);
          if (!connection?.token) throw new GameError('NOT_JOINED', 'Join a role before placing an order.');
          const room = this.games.order(connection.code, connection.token, message.round, message.order);
          this.broadcast(room.code);
          break;
        }
        default: throw new GameError('UNKNOWN_ACTION', 'Unknown game action.');
      }
    } catch (error) {
      if (!(error instanceof GameError)) this.logger.error(error);
      this.send(socket, {
        type: 'error', code: error instanceof GameError ? error.code : 'SERVER_ERROR',
        message: error instanceof GameError ? error.message : 'Unable to save the game. Please retry.',
      });
    }
  }

  private broadcast(code: string): void {
  try {
    const room = this.games.get(code);
    const connected = new Set(
      [...this.connections.entries()].filter(([socket, connection]) =>
        connection.code === code && socket.readyState === WebSocket.OPEN,
      ).map(([, connection]) => connection.token).filter((token): token is string => !!token),
    );
    for (const [socket, connection] of this.connections) {
      if (connection.code === code) this.send(socket, this.games.view(room, connection.token, connected));
    }
  } catch (error) {
    this.logger.error(error);
  }
}

  onModuleDestroy(): void {
    for (const socket of this.server.clients) socket.terminate();
    this.connections.clear();
    this.server.close();
  }
}
