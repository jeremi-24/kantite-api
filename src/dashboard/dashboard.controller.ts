import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../common/roles.decorator.js';
import { Role } from '../common/enums.js';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class DashboardController {
  constructor(private s: DashboardService) {}

  @Get('stock')
  stock() {
    return this.s.stock();
  }

  @Get('alertes-stock-bas')
  alertes() {
    return this.s.alertes();
  }

  @Get('chiffre-affaires')
  ca(
    @Query('periode') p?: string,
    @Query('date_debut') dateDebut?: string,
    @Query('date_fin') dateFin?: string,
  ) {
    return this.s.chiffreAffaires(p, dateDebut, dateFin);
  }

  @Get('top-produits')
  top(
    @Query('date_debut') dateDebut?: string,
    @Query('date_fin') dateFin?: string,
  ) {
    return this.s.topProduits(dateDebut, dateFin);
  }

  @Get('ecarts-inventaire')
  ecarts(
    @Query('date_debut') dateDebut?: string,
    @Query('date_fin') dateFin?: string,
  ) {
    return this.s.ecarts(dateDebut, dateFin);
  }

  @Get('historique-prix')
  historique() {
    return this.s.historiquePrix();
  }
}

