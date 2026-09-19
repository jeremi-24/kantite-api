import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inventaire } from './entities/inventaire.entity.js';
import { Lot } from '../produits/entities/lot.entity.js';
import { InventaireService } from './inventaire.service.js';
import { InventaireController } from './inventaire.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Inventaire, Lot]), AuthModule],
  providers: [InventaireService],
  controllers: [InventaireController]
})
export class InventaireModule {}