import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('lots')
export class Lot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'produit_id', type: 'uuid' })
  produitId!: string;

  @Column('numeric', { name: 'prix_reference', precision: 12, scale: 2 })
  prixReference!: string;

  @Column({ name: 'quantite_stock' })
  quantiteStock!: number;

  @CreateDateColumn({ name: 'date_reception' })
  dateReception!: Date;
}

