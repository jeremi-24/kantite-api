import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VentesController } from './ventes.controller.js';
import { VentesService } from './ventes.service.js';
import { Vente } from './entities/vente.entity.js';
import { LigneVente } from './entities/ligne-vente.entity.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Vente, LigneVente]), AuthModule],
  controllers: [VentesController],
  providers: [VentesService]
})
export class VentesModule {}