import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
@Entity('categories')
export class Categorie { @PrimaryGeneratedColumn('uuid') id!: string; @Column({ length: 100, unique: true }) nom!: string; }
