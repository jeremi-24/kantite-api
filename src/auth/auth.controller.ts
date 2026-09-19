import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private service: AuthService) {}

  @Post('login')
  login(@Body() b: any) {
    const password = b.mot_de_passe ?? b.motDePasse ?? b.password;
    return this.service.login(b.email, password);
  }
}
