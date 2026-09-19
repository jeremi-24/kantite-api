import { Injectable, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Utilisateur } from './entities/utilisateur.entity.js';
import { Role } from '../common/enums.js';

@Injectable()
export class UtilisateursService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Utilisateur) private repo: Repository<Utilisateur>,
  ) {}

  async onApplicationBootstrap() {
    const adminEmail = 'admin@admin.com';
    const existingAdmin = await this.repo.findOneBy({ email: adminEmail });
    if (!existingAdmin) {
      await this.repo.save(
        this.repo.create({
          nom: 'Super Admin',
          email: adminEmail,
          motDePasseHash: 'admin123',
          role: Role.ADMIN,
        }),
      );
      console.log('✅ Compte Super Admin créé avec succès (admin@admin.com / admin123)');
    }
  }

  findAll() {
    return this.repo.find({
      select: { id: true, nom: true, email: true, role: true, createdAt: true },
    });
  }

  create(data: Omit<Utilisateur, 'id' | 'createdAt'>) {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Partial<Utilisateur>) {
    const x = await this.repo.preload({ id, ...data });
    if (!x) throw new NotFoundException('Utilisateur introuvable');
    return this.repo.save(x);
  }
}
