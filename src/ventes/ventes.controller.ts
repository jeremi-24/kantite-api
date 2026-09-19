import { Body, Controller, Get, Header, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { VentesService } from './ventes.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@Controller('ventes')
@UseGuards(JwtAuthGuard)
export class VentesController {
  constructor(private service: VentesService) {}

  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.service.creerVente(req.user.id, body.mode_paiement, body.lignes);
  }

  @Get()
  all(@Query() q: any) {
    return this.service.findAll(q);
  }

  @Get(':id')
  one(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/recu')
  @Header('Content-Type', 'text/html')
  recu(@Param('id') id: string) {
    return this.service.genererRecuHtml(id);
  }

  @Post(':id/annuler')
  cancel(@Param('id') id: string) {
    return this.service.annulerVente(id);
  }

  @Post(':id/lignes/:ligneId/annuler')
  cancelLine(@Param('id') id: string, @Param('ligneId') line: string) {
    return this.service.annulerLigne(id, line);
  }
}
