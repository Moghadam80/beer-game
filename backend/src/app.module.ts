import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { GameRepository } from './game/game.repository.js';
import { GamesService } from './game/games.service.js';
import { GamesGateway } from './game/games.gateway.js';

@Module({
  controllers: [AppController],
  providers: [AppService, GameRepository, GamesService, GamesGateway],
})
export class AppModule {}
