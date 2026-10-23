import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('produits')
export class Produit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 200 })
  nom!: string;

  @Column({ name: 'categorie_id', type: 'uuid' })
  categorieId!: string;

  @Column({ name: 'lieu_stock_id', type: 'uuid' })
  lieuStockId!: string;

  @Column({ name: 'qte_min', default: 0 })
  qteMin!: number;

  @Column({ type: 'jsonb', nullable: true })
  caracteristiques!: Record<string, unknown> | null;

  @Column({ name: 'produit_offert_id', type: 'uuid', nullable: true })
  produitOffertId!: string | null;

  /** Fabriqué sur commande (ex. verres optiques) : se vend sans stock, le stock n'est pas suivi. */
  @Column({ name: 'sur_commande', default: false })
  surCommande!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
