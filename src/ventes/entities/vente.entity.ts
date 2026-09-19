import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ModePaiement, StatutVente } from '../../common/enums.js';

@Entity('ventes')
export class Vente {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn()
  date!: Date;

  @Column({ type: 'enum', enum: ModePaiement, name: 'mode_paiement' })
  modePaiement!: ModePaiement;

  @Column('numeric', { precision: 12, scale: 2 })
  total!: string;

  @Column({ type: 'enum', enum: StatutVente, default: StatutVente.VALIDEE })
  statut!: StatutVente;

  @Column({ name: 'utilisateur_id', type: 'uuid', nullable: true })
  utilisateurId!: string | null;
}

