import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const clientBuild = fileURLToPath(new URL('../../frontend/dist', import.meta.url));
  if (existsSync(clientBuild)) app.useStaticAssets(clientBuild);
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 3000));
}

await bootstrap();
