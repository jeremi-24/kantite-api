import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventaire } from './entities/inventaire.entity.js';
import { Lot } from '../produits/entities/lot.entity.js';

@Injectable()
export class InventaireService {
  constructor(
    @InjectRepository(Inventaire) private inventaires: Repository<Inventaire>,
    @InjectRepository(Lot) private lots: Repository<Lot>,
  ) {}

  async enregistrerComptage(produitId: string, quantiteComptee: number) {
    const raw = await this.lots
      .createQueryBuilder('l')
      .select('COALESCE(SUM(l.quantite_stock), 0)', 'total')
      .where('l.produit_id = :produitId', { produitId })
      .getRawOne<{ total: string }>();

    const systeme = Number(raw?.total || 0);
    return this.inventaires.save(
      this.inventaires.create({
        produitId,
        quantiteComptee,
        quantiteSysteme: systeme,
        ecart: quantiteComptee - systeme,
      }),
    );
  }

  findAll(q: { date?: string; produit_id?: string; ecarts_non_nuls?: string }) {
    const qb = this.inventaires.createQueryBuilder('i');
    if (q.date) qb.andWhere('DATE(i.date) = :date', { date: q.date });
    if (q.produit_id) qb.andWhere('i.produit_id = :id', { id: q.produit_id });
    if (q.ecarts_non_nuls === 'true') qb.andWhere('i.ecart != 0');
    return qb.orderBy('i.date', 'DESC').getMany();
  }
}
