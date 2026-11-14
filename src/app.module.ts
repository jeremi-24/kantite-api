import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module.js'; import { UtilisateursModule } from './utilisateurs/utilisateurs.module.js'; import { LieuxStockModule } from './lieux-stock/lieux-stock.module.js'; import { CategoriesModule } from './categories/categories.module.js'; import { ProduitsModule } from './produits/produits.module.js'; import { VentesModule } from './ventes/ventes.module.js'; import { InventaireModule } from './inventaire/inventaire.module.js'; import { DashboardModule } from './dashboard/dashboard.module.js'; import { SettingsModule } from './settings/settings.module.js';

@Module({
  controllers: [AppController],
  providers: [AppService],
  imports: [TypeOrmModule.forRoot({ type: 'postgres', host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 5432), username: process.env.DB_USERNAME || 'postgres', password: process.env.DB_PASSWORD || 'postgres', database: process.env.DB_NAME || 'stockapp', autoLoadEntities: true, synchronize: process.env.NODE_ENV !== 'production' }), AuthModule, UtilisateursModule, LieuxStockModule, CategoriesModule, ProduitsModule, VentesModule, InventaireModule, DashboardModule, SettingsModule],
})
export class AppModule {}
