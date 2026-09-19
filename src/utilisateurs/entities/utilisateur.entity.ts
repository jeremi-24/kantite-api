import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from '../../common/enums.js';
@Entity('utilisateurs')
export class Utilisateur { @PrimaryGeneratedColumn('uuid') id!: string; @Column({ length: 100 }) nom!: string; @Column({ length: 150, unique: true }) email!: string; @Column({ name: 'mot_de_passe_hash' }) motDePasseHash!: string; @Column({ type: 'enum', enum: Role }) role!: Role; @CreateDateColumn({ name: 'created_at' }) createdAt!: Date; }
