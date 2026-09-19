import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProduitsService } from './produits.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../common/roles.decorator.js';
import { Role } from '../common/enums.js';

@Controller('produits')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProduitsController {
  constructor(private service: ProduitsService) {}

  @Get()
  all(@Query() q: { nom?: string; categorie_id?: string; lieu_stock_id?: string }) {
    return this.service.findAll(q);
  }

  @Post('import')
  @Roles(Role.ADMIN)
  importBulk(@Body() body: any) {
    const items = Array.isArray(body) ? body : body.items;
    return this.service.importBulk(items);
  }

  @Post('import-file')
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  importFile(@UploadedFile() file: { buffer: Buffer; originalname: string }) {
    if (!file) throw new Error('Aucun fichier fourni');
    const items = this.service.parseFileBuffer(file.buffer, file.originalname);
    return this.service.importBulk(items);
  }

  @Get(':id')
  one(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get(':id/conditionnements')
  conditions(@Param('id') id: string) {
    return this.service.listConditions(id);
  }

  @Post(':id/conditionnements')
  @Roles(Role.ADMIN)
  addCondition(@Param('id') id: string, @Body() body: any) {
    return this.service.addCondition(id, body);
  }

  @Patch(':id/conditionnements/:condId')
  @Roles(Role.ADMIN)
  updateCondition(@Param('id') id: string, @Param('condId') cond: string, @Body() body: any) {
    return this.service.updateCondition(id, cond, body);
  }

  @Get(':id/lots')
  lots(@Param('id') id: string) {
    return this.service.listLots(id);
  }

  @Post(':id/lots')
  @Roles(Role.ADMIN)
  addLot(@Param('id') id: string, @Body() body: any) {
    return this.service.addLot(id, body);
  }

  @Patch(':id/lots/:lotId')
  @Roles(Role.ADMIN)
  updateLot(@Param('lotId') lotId: string, @Body() body: any) {
    return this.service.updateLot(lotId, body);
  }
}

