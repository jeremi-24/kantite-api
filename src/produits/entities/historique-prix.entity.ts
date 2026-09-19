import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('historique_prix')
export class HistoriquePrix {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'lot_id', type: 'uuid', nullable: true })
  lotId!: string | null;

  @Column({ name: 'produit_id', type: 'uuid', nullable: true })
  produitId!: string | null;

  @Column('numeric', { name: 'ancien_prix', precision: 12, scale: 2 })
  ancienPrix!: string;

  @Column('numeric', { name: 'nouveau_prix', precision: 12, scale: 2 })
  nouveauPrix!: string;

  @CreateDateColumn()
  date!: Date;
}
