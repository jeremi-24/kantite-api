import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    })
  );

  // Assurer la création du dossier storage/logo
  const storagePath = join(process.cwd(), 'storage');
  const logoPath = join(storagePath, 'logo');
  if (!fs.existsSync(logoPath)) {
    fs.mkdirSync(logoPath, { recursive: true });
  }

  // Servir les fichiers statiques de storage sous /storage/ et /api/storage/
  app.useStaticAssets(storagePath, {
    prefix: '/storage/',
  });
  app.useStaticAssets(storagePath, {
    prefix: '/api/storage/',
  });

  const port = process.env.PORT || 5003;
  await app.listen(port);
  console.log(`🚀 Backend StockApp en cours d'exécution sur le port ${port}`);
}
bootstrap();
