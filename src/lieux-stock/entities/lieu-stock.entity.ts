import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
@Entity('lieux_stock')
export class LieuStock { @PrimaryGeneratedColumn('uuid') id!: string; @Column({ length: 100 }) nom!: string; @CreateDateColumn({ name: 'created_at' }) createdAt!: Date; }
