import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProduitsController } from './produits.controller.js';
import { ProduitsService } from './produits.service.js';
import { Produit } from './entities/produit.entity.js';
import { ConditionnementProduit } from './entities/conditionnement-produit.entity.js';
import { Lot } from './entities/lot.entity.js';
import { HistoriquePrix } from './entities/historique-prix.entity.js';
import { Categorie } from '../categories/entities/categorie.entity.js';
import { LieuStock } from '../lieux-stock/entities/lieu-stock.entity.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Produit,
      ConditionnementProduit,
      Lot,
      HistoriquePrix,
      Categorie,
      LieuStock,
    ]),
    AuthModule,
  ],
  controllers: [ProduitsController],
  providers: [ProduitsService],
  exports: [TypeOrmModule, ProduitsService],
})
export class ProduitsModule {}