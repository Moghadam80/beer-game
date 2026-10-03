import { Controller, Get, Inject, NotFoundException, Param } from '@nestjs/common';
import { AppService } from './app.service.js';
import { GamesService } from './game/games.service.js';
import { GameError } from './game/game.js';

@Controller('api')
export class AppController {
  constructor(
    @Inject(AppService) private readonly appService: AppService,
    @Inject(GamesService) private readonly games: GamesService,
  ) {}

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('games/:code')
  getRoom(@Param('code') code: string) {
    try { return this.games.view(this.games.get(code)); }
    catch (error) {
    if (error instanceof GameError) throw new NotFoundException('Room not found');
    throw error;
  }
  }
}
