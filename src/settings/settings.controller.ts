import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../common/roles.decorator.js';
import { Role } from '../common/enums.js';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private service: SettingsService) {}

  @Get()
  get() {
    return this.service.get();
  }

  @Put()
  @Roles(Role.ADMIN)
  save(@Body() body: Record<string, unknown>) {
    return this.service.save(body);
  }
}
