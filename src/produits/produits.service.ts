import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Produit } from './entities/produit.entity.js';
import { ConditionnementProduit } from './entities/conditionnement-produit.entity.js';
import { Lot } from './entities/lot.entity.js';
import { HistoriquePrix } from './entities/historique-prix.entity.js';
import { Categorie } from '../categories/entities/categorie.entity.js';
import { LieuStock } from '../lieux-stock/entities/lieu-stock.entity.js';
import { TypeConditionnement } from '../common/enums.js';

import * as XLSX from 'xlsx';

export interface ImportProductDTO {
  nom: string;
  categorie: string;
  lieu_stock?: string;
  quantite_initiale: number;
  prix: number | string;
  qte_min?: number;
  conditionnement_type?: string;
  facteur_conversion?: number;
  vente_unitaire_autorisee?: boolean;
  produit_offert_nom?: string;
}

@Injectable()
export class ProduitsService {
  constructor(
    @InjectRepository(Produit) private produits: Repository<Produit>,
    @InjectRepository(ConditionnementProduit) private conditions: Repository<ConditionnementProduit>,
    @InjectRepository(Lot) private lots: Repository<Lot>,
    @InjectRepository(HistoriquePrix) private historique: Repository<HistoriquePrix>,
    @InjectRepository(Categorie) private categories: Repository<Categorie>,
    @InjectRepository(LieuStock) private lieux: Repository<LieuStock>,
    private dataSource: DataSource,
  ) {}

  async findAll(filters: { nom?: string; categorie_id?: string; lieu_stock_id?: string }) {
    const qb = this.produits.createQueryBuilder('p');
    if (filters.nom) qb.andWhere('p.nom ILIKE :nom', { nom: `%${filters.nom}%` });
    if (filters.categorie_id) qb.andWhere('p.categorie_id::text = :categorie', { categorie: filters.categorie_id });
    if (filters.lieu_stock_id) qb.andWhere('p.lieu_stock_id::text = :lieu', { lieu: filters.lieu_stock_id });
    const list = await qb.orderBy('p.nom', 'ASC').getMany();

    return Promise.all(
      list.map(async (p) => {
        const [lots, conditionnements, categorie, lieuStock] = await Promise.all([
          this.lots.find({ where: { produitId: p.id }, order: { dateReception: 'ASC' } }),
          this.conditions.findBy({ produitId: p.id }),
          this.categories.findOneBy({ id: p.categorieId }),
          this.lieux.findOneBy({ id: p.lieuStockId }),
        ]);
        const quantiteTotale = lots.reduce((sum, l) => sum + (l.quantiteStock || 0), 0);
        return {
          ...p,
          quantiteTotale,
          categorie,
          lieuStock,
          conditionnements,
          lots,
        };
      }),
    );
  }

  async findOne(id: string) { const p = await this.produits.findOneBy({ id }); if (!p) throw new NotFoundException('Produit introuvable'); return p; }
  create(data: Omit<Produit, 'id'|'createdAt'|'updatedAt'>) { return this.produits.save(this.produits.create(data)); }
  async update(id: string, data: Partial<Produit>) { const p = await this.produits.preload({ id, ...data }); if (!p) throw new NotFoundException('Produit introuvable'); return this.produits.save(p); }
  async remove(id: string) { const r = await this.produits.delete(id); if (!r.affected) throw new NotFoundException('Produit introuvable'); }
  async listConditions(produitId: string) { await this.findOne(produitId); return this.conditions.findBy({ produitId }); }
  async addCondition(produitId: string, data: Omit<ConditionnementProduit, 'id'|'produitId'>) { await this.findOne(produitId); if (data.facteurConversion < 1) throw new BadRequestException('Le facteur de conversion doit être au moins 1'); if (await this.conditions.existsBy({ produitId, type: data.type })) throw new ConflictException('Ce type de conditionnement existe déjà pour ce produit'); return this.conditions.save(this.conditions.create({ ...data, produitId })); }
  async updateCondition(produitId: string, id: string, data: Partial<ConditionnementProduit>) { const c = await this.conditions.findOneBy({ id, produitId }); if (!c) throw new NotFoundException('Conditionnement introuvable'); if (data.facteurConversion !== undefined && data.facteurConversion < 1) throw new BadRequestException('Le facteur de conversion doit être au moins 1'); return this.conditions.save(Object.assign(c, data)); }
  async listLots(produitId: string) { await this.findOne(produitId); return this.lots.find({ where: { produitId }, order: { dateReception: 'ASC' } }); }
  async addLot(produitId: string, data: Omit<Lot, 'id'|'produitId'|'dateReception'> & { dateReception?: Date }) { await this.findOne(produitId); if (data.quantiteStock < 0) throw new BadRequestException('La quantité ne peut pas être négative'); return this.lots.save(this.lots.create({ ...data, produitId })); }
  async updateLot(id: string, data: Partial<Lot>) { return this.dataSource.transaction(async manager => { const lot = await manager.findOneBy(Lot, { id }); if (!lot) throw new NotFoundException('Lot introuvable'); if (data.quantiteStock !== undefined && data.quantiteStock < 0) throw new BadRequestException('La quantité ne peut pas être négative'); const before = lot.prixReference; Object.assign(lot, data); const saved = await manager.save(lot); if (data.prixReference !== undefined && String(before) !== String(data.prixReference)) await manager.save(HistoriquePrix, { lotId: id, produitId: null, ancienPrix: before, nouveauPrix: String(data.prixReference) }); return saved; }); }

  parseFileBuffer(buffer: Buffer, originalname: string): ImportProductDTO[] {
    const fileName = (originalname || '').toLowerCase();
    let jsonRows: any[] = [];

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      jsonRows = XLSX.utils.sheet_to_json(worksheet);
    } else {
      const text = buffer.toString('utf-8');
      try {
        if (text.trim().startsWith('[') || text.trim().startsWith('{')) {
          const parsed = JSON.parse(text);
          jsonRows = Array.isArray(parsed) ? parsed : [parsed];
        } else {
          const lines = text.trim().split('\n');
          if (lines.length >= 2) {
            const headers = lines[0].split(/[,;\t]/).map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''));
            for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;
              const values = line.split(/[,;\t]/).map((v) => v.trim().replace(/^"|"$/g, ''));
              const row: any = {};
              headers.forEach((h, idx) => {
                row[h] = values[idx] || '';
              });
              jsonRows.push(row);
            }
          }
        }
      } catch (e) {}
    }

    const items: ImportProductDTO[] = [];
    for (const row of jsonRows) {
      const nom = row['nom'] || row['Nom'] || row['PRODUIT'] || row['Produit'] || row['designation'] || row['Designation'] || '';
      const categorie = row['categorie'] || row['Categorie'] || row['CAT'] || row['Catégorie'] || '';
      if (!nom || !categorie) continue;

      items.push({
        nom: String(nom).trim(),
        categorie: String(categorie).trim(),
        lieu_stock: String(row['lieu_stock'] || row['Lieu'] || row['lieu'] || 'Réserve').trim(),
        quantite_initiale: Number(row['quantite_initiale'] || row['Quantité'] || row['qte'] || row['stock'] || 0),
        prix: Number(row['prix'] || row['Prix'] || row['prix_reference'] || 0),
        qte_min: row['qte_min'] ? Number(row['qte_min']) : 5,
        conditionnement_type: String(row['conditionnement_type'] || row['Conditionnement'] || row['conditionnement'] || 'UNITE').trim(),
        facteur_conversion: Number(row['facteur_conversion'] || row['Facteur'] || row['qte_par_carton'] || 1),
        vente_unitaire_autorisee:
          row['vente_unitaire_autorisee'] !== undefined
            ? !['false', '0', 'non', 'no'].includes(String(row['vente_unitaire_autorisee']).toLowerCase())
            : true,
        produit_offert_nom: String(row['produit_offert_nom'] || row['produit_offert'] || row['Cadeau'] || '').trim(),
      });
    }

    return items;
  }

  async importBulk(items: ImportProductDTO[]) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('La liste des produits à importer est vide');
    }

    const created: any[] = [];
    const updated: any[] = [];

    await this.dataSource.transaction(async (m) => {
      const catMap = new Map<string, Categorie>();
      const lieuMap = new Map<string, LieuStock>();

      const allCats = await m.find(Categorie);
      allCats.forEach((c) => catMap.set(c.nom.toUpperCase().trim(), c));

      const allLieux = await m.find(LieuStock);
      allLieux.forEach((l) => lieuMap.set(l.nom.toUpperCase().trim(), l));

      for (const item of items) {
        if (!item.nom || !item.categorie) continue;

        const catName = item.categorie.toUpperCase().trim();
        let cat = catMap.get(catName);
        if (!cat) {
          cat = await m.save(Categorie, m.create(Categorie, { nom: catName }));
          catMap.set(catName, cat);
        }

        const lieuName = (item.lieu_stock || 'Réserve').toUpperCase().trim();
        let lieu = lieuMap.get(lieuName);
        if (!lieu) {
          lieu = await m.save(LieuStock, m.create(LieuStock, { nom: item.lieu_stock || 'Réserve' }));
          lieuMap.set(lieuName, lieu);
        }

        let produit = await m.findOne(Produit, {
          where: { nom: item.nom.trim(), categorieId: cat.id },
        });
        let isNew = false;

        if (!produit) {
          isNew = true;
          // Le produit courant EST le cadeau si produit_offert_nom est renseigné :
          // produit_courant.produitOffertId → produit_principal.id
          let produitOffertId: string | null = null;
          if (item.produit_offert_nom) {
            const mainProd = await m.findOne(Produit, { where: { nom: item.produit_offert_nom.trim() } });
            if (mainProd) produitOffertId = mainProd.id;
            // Si le produit principal n'est pas encore créé (ordre des lignes),
            // on laisse null et on le résoudra dans le second passage ci-dessous.
          }

          produit = await m.save(
            Produit,
            m.create(Produit, {
              nom: item.nom.trim(),
              categorieId: cat.id,
              lieuStockId: lieu.id,
              qteMin: item.qte_min !== undefined ? Number(item.qte_min) : 5,
              produitOffertId,
            })
          );
        }

        const rawTypeStr = (item.conditionnement_type || 'UNITE').toUpperCase().trim();
        const enumType = (Object.values(TypeConditionnement) as string[]).includes(rawTypeStr)
          ? (rawTypeStr as TypeConditionnement)
          : TypeConditionnement.UNITE;

        const factor = Number(item.facteur_conversion || 1);
        const allowUnite = item.vente_unitaire_autorisee !== undefined ? Boolean(item.vente_unitaire_autorisee) : true;

        let existingCond = await m.findOne(ConditionnementProduit, {
          where: { produitId: produit.id, type: enumType },
        });

        if (existingCond) {
          existingCond.facteurConversion = factor;
          existingCond.prixReference = String(item.prix || existingCond.prixReference);
          existingCond.venteUnitaireAutorisee = allowUnite;
          await m.save(ConditionnementProduit, existingCond);
        } else {
          await m.save(
            ConditionnementProduit,
            m.create(ConditionnementProduit, {
              produitId: produit.id,
              type: enumType,
              facteurConversion: factor,
              prixReference: String(item.prix || 0),
              venteUnitaireAutorisee: allowUnite,
            })
          );
        }

        const newLot = await m.save(
          Lot,
          m.create(Lot, {
            produitId: produit.id,
            quantiteStock: Number(item.quantite_initiale || 0),
            prixReference: String(item.prix || 0),
          })
        );

        if (isNew) {
          created.push({ id: produit.id, nom: produit.nom, cat: cat.nom });
        } else {
          updated.push({ id: produit.id, nom: produit.nom, newLotId: newLot.id });
        }
      }

      // Second passage : résoudre les références produit_offert_nom qui n'ont pas pu
      // être résolues lors du premier passage (cadeau importé avant le produit principal).
      for (const item of items) {
        if (!item.produit_offert_nom || !item.nom) continue;
        const cadeau = await m.findOne(Produit, { where: { nom: item.nom.trim() } });
        if (!cadeau || cadeau.produitOffertId) continue; // déjà résolu
        const principal = await m.findOne(Produit, { where: { nom: item.produit_offert_nom.trim() } });
        if (principal) {
          cadeau.produitOffertId = principal.id;
          await m.save(Produit, cadeau);
        }
      }
    });

    return {
      message: `Importation réussie : ${created.length} produit(s) créé(s), ${updated.length} lot(s) ajouté(s).`,
      countCreated: created.length,
      countUpdated: updated.length,
      created,
      updated,
    };
  }
}

