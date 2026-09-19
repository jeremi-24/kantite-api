import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Utilisateur } from '../utilisateurs/entities/utilisateur.entity.js';
import { Role } from '../common/enums.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Utilisateur) private users: Repository<Utilisateur>,
    private jwt: JwtService,
  ) {}

  async login(email: string, motDePasse: string) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (motDePasse || '').trim();

    // Auto-seed admin user if login for admin@admin.com is requested and user doesn't exist
    if (cleanEmail === 'admin@admin.com') {
      let adminUser = await this.users.findOneBy({ email: 'admin@admin.com' });
      if (!adminUser) {
        adminUser = await this.users.save(
          this.users.create({
            nom: 'Super Admin',
            email: 'admin@admin.com',
            motDePasseHash: 'admin123',
            role: Role.ADMIN,
          }),
        );
      }
    }

    const user = await this.users
      .createQueryBuilder('u')
      .where('LOWER(u.email) = :email', { email: cleanEmail })
      .getOne();

    if (!user || user.motDePasseHash !== cleanPassword) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    return {
      access_token: await this.jwt.signAsync({
        sub: user.id,
        email: user.email,
        role: user.role,
      }),
    };
  }
}
