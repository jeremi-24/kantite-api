import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('inventaires')
export class Inventaire {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'produit_id', type: 'uuid' })
  produitId!: string;

  @CreateDateColumn()
  date!: Date;

  @Column({ name: 'quantite_comptee' })
  quantiteComptee!: number;

  @Column({ name: 'quantite_systeme' })
  quantiteSysteme!: number;

  @Column()
  ecart!: number;
}

