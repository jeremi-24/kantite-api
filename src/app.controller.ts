import {
  Controller,
  Get,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AppService } from './app.service.js';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { JwtAuthGuard } from './auth/jwt-auth.guard.js';
import { RolesGuard } from './auth/roles.guard.js';
import { Roles } from './common/roles.decorator.js';
import { Role } from './common/enums.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('upload/logo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = join(process.cwd(), 'storage', 'logo');
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname) || '.png';
          cb(null, `logo-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp|svg\+xml)$/)) {
          return cb(new BadRequestException('Format de fichier image non supporté'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadLogo(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }
    const logoUrl = `/storage/logo/${file.filename}`;
    return { logoUrl, filename: file.filename };
  }
}
