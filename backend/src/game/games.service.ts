import { Inject, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { createGame, GameError, isRole, ROLES, startGame, submitOrder, TOTAL_ROUNDS } from './game.js';
import { GameRepository, type Member, type Room } from './game.repository.js';

@Injectable()
export class GamesService {
  constructor(@Inject(GameRepository) private readonly repository: GameRepository) {}

  create(): Room {
    let code: string;
    do { code = randomBytes(3).toString('hex').toUpperCase(); } while (this.repository.get(code));
    const room: Room = { code, state: createGame(), members: [] };
    this.repository.save(room);
    return room;
  }

  get(code: unknown): Room {
    if (typeof code !== 'string') throw new GameError('INVALID_CODE', 'Enter a room code.');
    const room = this.repository.get(code.trim().toUpperCase());
    if (!room) throw new GameError('GAME_NOT_FOUND', 'That room does not exist.');
    return room;
  }

  join(code: unknown, role: unknown, name: unknown): { room: Room; member: Member } {
    const room = this.get(code);
    if (!isRole(role)) throw new GameError('INVALID_ROLE', 'Choose a valid role.');
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 40) {
      throw new GameError('INVALID_NAME', 'Enter a name between 1 and 40 characters.');
    }
    if (room.state.status !== 'waiting' || room.members.some((member) => member.role === role)) {
      throw new GameError('ROLE_TAKEN', 'That role is already taken.');
    }
    const member: Member = { role, name: name.trim(), token: randomBytes(32).toString('hex') };
    room.members.push(member);
    if (room.members.length === ROLES.length) room.state = startGame(room.state);
    this.repository.save(room);
    return { room, member };
  }

  authenticate(code: unknown, token: unknown): { room: Room; member: Member } {
    const room = this.get(code);
    const member = typeof token === 'string' ? room.members.find((player) => player.token === token) : undefined;
    if (!member) throw new GameError('SESSION_NOT_FOUND', 'Your saved player session is not valid.');
    return { room, member };
  }

  order(code: string, token: string, round: unknown, order: unknown): Room {
    const { room, member } = this.authenticate(code, token);
    room.state = submitOrder(room.state, member.role, round, order);
    this.repository.save(room);
    return room;
  }

  view(room: Room, token?: string, connected = new Set<string>()) {
    const member = room.members.find((player) => player.token === token);
    const player = member ? room.state.roles[member.role] : undefined;
    const own = player ? {
  inventory: player.inventory, backlog: player.backlog,
  shipmentArrived: player.shipmentArrived, incomingOrder: player.incomingOrder,
  shipped: player.shipped, lastOrderPlaced: player.lastOrderPlaced,
  roundCost: player.roundCost, totalCost: player.totalCost,
} : null;
    const results = room.state.status === 'finished' ? {
      costs: Object.fromEntries(ROLES.map((role) => [role, room.state.roles[role].totalCost])),
      total: ROLES.reduce((total, role) => total + room.state.roles[role].totalCost, 0),
    } : null;
    const analytics =
  room.state.status === 'finished'
    ? Object.fromEntries(
        ROLES.map((role) => [
          role,
          {
            role,
            history: room.state.roles[role].history.map(
              (item, index) => ({
                round: index + 1,
                inventory: item.inventory,
                backlog: item.backlog,
                order: item.orderPlaced,
              }),
            ),
          },
        ]),
      )
    : null;
    return {
      type: 'state' as const, code: room.code, status: room.state.status,
      round: room.state.round, totalRounds: TOTAL_ROUNDS, role: member?.role ?? null, own, results,
      players: ROLES.map((role) => {
        const occupant = room.members.find((playerMember) => playerMember.role === role);
        return {
          role, name: occupant?.name ?? null, taken: !!occupant,
          connected: !!occupant && connected.has(occupant.token),
          submitted: Object.hasOwn(room.state.orders, role),
        };
      }),
      analytics
    };
  }
}
