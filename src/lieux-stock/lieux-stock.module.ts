import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LieuStock } from './entities/lieu-stock.entity.js';
import { LieuxStockService } from './lieux-stock.service.js';
import { LieuxStockController } from './lieux-stock.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([LieuStock]), AuthModule],
  providers: [LieuxStockService],
  controllers: [LieuxStockController]
})
export class LieuxStockModule {}