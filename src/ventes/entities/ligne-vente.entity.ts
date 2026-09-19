import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { StatutVente } from '../../common/enums.js';

@Entity('lignes_vente')
export class LigneVente {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'vente_id', type: 'uuid' })
  venteId!: string;

  @Column({ name: 'produit_id', type: 'uuid' })
  produitId!: string;

  @Column({ name: 'lot_id', type: 'uuid' })
  lotId!: string;

  @Column({ name: 'conditionnement_id', type: 'uuid', nullable: true })
  conditionnementId!: string | null;

  @Column()
  quantite!: number;

  @Column('numeric', { name: 'prix_reel_applique', precision: 12, scale: 2 })
  prixReelApplique!: string;

  @Column({ name: 'est_offert', default: false })
  estOffert!: boolean;

  @Column({ type: 'enum', enum: StatutVente, default: StatutVente.VALIDEE })
  statut!: StatutVente;
}

