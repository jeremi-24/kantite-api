import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { LieuxStockService } from './lieux-stock.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../common/roles.decorator.js';
import { Role } from '../common/enums.js';

@Controller('lieux-stock')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LieuxStockController {
  constructor(private service: LieuxStockService) {}

  @Get()
  all() {
    return this.service.findAll();
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() b: any) {
    return this.service.create(b);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() b: any) {
    return this.service.update(id, b);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
