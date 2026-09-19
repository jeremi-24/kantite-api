import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { TypeConditionnement } from '../../common/enums.js';

@Entity('conditionnements_produit')
@Unique(['produitId', 'type'])
export class ConditionnementProduit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'produit_id', type: 'uuid' })
  produitId!: string;

  @Column({ type: 'enum', enum: TypeConditionnement })
  type!: TypeConditionnement;

  @Column({ name: 'facteur_conversion', default: 1 })
  facteurConversion!: number;

  @Column('numeric', { name: 'prix_reference', precision: 12, scale: 2 })
  prixReference!: string;

  @Column({ name: 'vente_unitaire_autorisee', default: true })
  venteUnitaireAutorisee!: boolean;
}

