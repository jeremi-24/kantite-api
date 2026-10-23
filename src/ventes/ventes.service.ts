import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Vente } from './entities/vente.entity.js';
import { LigneVente } from './entities/ligne-vente.entity.js';
import { Produit } from '../produits/entities/produit.entity.js';
import { Lot } from '../produits/entities/lot.entity.js';
import { ConditionnementProduit } from '../produits/entities/conditionnement-produit.entity.js';
import { ModePaiement, StatutVente, TypeConditionnement } from '../common/enums.js';

type LigneInput = {
  produit_id: string;
  lot_id: string;
  conditionnement_id: string;
  quantite: number;
  prix_reel_applique: number;
  /** Transmis par le frontend : true si la ligne a été ajoutée automatiquement comme cadeau */
  est_offert?: boolean;
};

@Injectable()
export class VentesService {
  constructor(
    @InjectRepository(Vente) private ventes: Repository<Vente>,
    @InjectRepository(LigneVente) private lignes: Repository<LigneVente>,
    private ds: DataSource,
  ) {}

  async creerVente(utilisateurId: string, modePaiement: ModePaiement, inputs: LigneInput[]) {
    if (!inputs.length) throw new BadRequestException('Une vente doit contenir au moins une ligne');
    return this.ds.transaction(async (m) => {
      const vente = await m.save(Vente, {
        utilisateurId,
        modePaiement,
        total: '0',
        statut: StatutVente.VALIDEE,
      });

      let total = 0;
      for (const input of inputs) {
        if (!Number.isInteger(input.quantite) || input.quantite <= 0)
          throw new BadRequestException('Quantité invalide');

        const produit = await m.findOneBy(Produit, { id: input.produit_id });
        const lot = await m.findOneBy(Lot, { id: input.lot_id });
        const condition = await m.findOneBy(ConditionnementProduit, { id: input.conditionnement_id });

        if (!produit || !lot || !condition)
          throw new NotFoundException('Produit, lot ou conditionnement introuvable');

        if (lot.produitId !== produit.id || condition.produitId !== produit.id)
          throw new BadRequestException('Le lot et le conditionnement doivent appartenir au produit');

        if (condition.type === TypeConditionnement.UNITE && !condition.venteUnitaireAutorisee)
          throw new BadRequestException('La vente à l’unité est interdite pour ce conditionnement');

        const qteReelle = input.quantite * condition.facteurConversion;
        if (!produit.surCommande && lot.quantiteStock < qteReelle)
          throw new BadRequestException('Stock insuffisant sur le lot sélectionné');

        // estOffert vient du frontend (qui sait si la ligne est un cadeau automatique)
        // Ne pas le recalculer côté backend depuis produitOffertId (sémantique ambigüë)
        const estOffert = Boolean(input.est_offert);
        const prix = estOffert ? 0 : input.prix_reel_applique;

        if (!Number.isFinite(prix) || prix < 0)
          throw new BadRequestException('Prix réel invalide');

        if (!produit.surCommande) {
          lot.quantiteStock -= qteReelle;
          await m.save(Lot, lot);
        }

        await m.save(LigneVente, {
          venteId: vente.id,
          produitId: produit.id,
          lotId: lot.id,
          conditionnementId: condition.id,
          quantite: input.quantite,
          prixReelApplique: String(prix),
          estOffert,
          statut: StatutVente.VALIDEE,
        });

        if (!estOffert) total += prix * input.quantite;
      }

      vente.total = total.toFixed(2);
      return m.save(Vente, vente);
    });
  }

  async findAll(filters: { date?: string; date_debut?: string; date_fin?: string; produit_id?: string; categorie_id?: string }) {
    const qb = this.ventes.createQueryBuilder('v').leftJoinAndSelect(LigneVente, 'l', 'l.vente_id::text = v.id::text');
    if (filters.date) qb.andWhere('DATE(v.date) = :date', { date: filters.date });
    if (filters.date_debut) qb.andWhere('DATE(v.date) >= :dateDebut', { dateDebut: filters.date_debut });
    if (filters.date_fin) qb.andWhere('DATE(v.date) <= :dateFin', { dateFin: filters.date_fin });
    if (filters.produit_id) qb.andWhere('l.produit_id::text = :produit', { produit: filters.produit_id });
    if (filters.categorie_id)
      qb.innerJoin(Produit, 'p', 'p.id::text = l.produit_id::text').andWhere('p.categorie_id::text = :cat', {
        cat: filters.categorie_id,
      });

    return qb.orderBy('v.date', 'DESC').getMany();
  }

  async findOne(id: string) {
    const vente = await this.ventes.findOneBy({ id });
    if (!vente) throw new NotFoundException('Vente introuvable');
    const lignes = await this.lignes.findBy({ venteId: id });
    const enrichedLignes = await Promise.all(
      lignes.map(async (l) => {
        const produit = await this.ds.getRepository(Produit).findOneBy({ id: l.produitId });
        const lot = await this.ds.getRepository(Lot).findOneBy({ id: l.lotId });
        const conditionnement = l.conditionnementId
          ? await this.ds.getRepository(ConditionnementProduit).findOneBy({ id: l.conditionnementId })
          : null;
        return {
          ...l,
          produitNom: produit?.nom || 'Produit inconnu',
          lotPrixVenteUnitaire: lot?.prixReference || '0',
          conditionnementLibelle: conditionnement?.type || 'UNITE',
        };
      }),
    );
    return { ...vente, lignes: enrichedLignes };
  }

  async annulerLigne(venteId: string, ligneId: string) {
    return this.ds.transaction(async (m) => {
      const vente = await m.findOneBy(Vente, { id: venteId });
      const ligne = await m.findOneBy(LigneVente, { id: ligneId, venteId });
      if (!vente || !ligne) throw new NotFoundException('Vente ou ligne introuvable');
      if (ligne.statut === StatutVente.ANNULEE)
        throw new BadRequestException('Cette ligne est déjà annulée');

      const lot = await m.findOneBy(Lot, { id: ligne.lotId });
      const c = await m.findOneBy(ConditionnementProduit, { id: ligne.conditionnementId! });
      if (!lot || !c) throw new NotFoundException('Lot ou conditionnement introuvable');

      const produit = await m.findOneBy(Produit, { id: ligne.produitId });
      if (!produit?.surCommande) {
        lot.quantiteStock += ligne.quantite * c.facteurConversion;
        await m.save(lot);
      }
      ligne.statut = StatutVente.ANNULEE;
      await m.save(ligne);

      const actives = await m.findBy(LigneVente, { venteId });
      vente.total = actives
        .filter((x) => x.statut === StatutVente.VALIDEE && !x.estOffert)
        .reduce((s, x) => s + Number(x.prixReelApplique) * x.quantite, 0)
        .toFixed(2);

      return m.save(vente);
    });
  }

  async annulerVente(id: string) {
    const vente = await this.ventes.findOneBy({ id });
    if (!vente) throw new NotFoundException('Vente introuvable');
    if (vente.statut === StatutVente.ANNULEE)
      throw new BadRequestException('Cette vente est déjà annulée');

    const lignes = await this.lignes.findBy({ venteId: id, statut: StatutVente.VALIDEE });
    for (const ligne of lignes) await this.annulerLigne(id, ligne.id);

    return this.ds.transaction(async (m) => {
      const v = await m.findOneByOrFail(Vente, { id });
      v.statut = StatutVente.ANNULEE;
      v.total = '0';
      return m.save(v);
    });
  }

  async genererRecuHtml(id: string): Promise<string> {
    const venteData = await this.findOne(id);
    const lignesWithProducts = await Promise.all(
      venteData.lignes.map(async (l) => {
        const prod = await this.ds.getRepository(Produit).findOneBy({ id: l.produitId });
        return { ...l, produitNom: prod?.nom || 'Produit' };
      })
    );

    const lignesHtml = lignesWithProducts
      .map(
        (l) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${l.produitNom} ${l.estOffert ? '(OFFERT)' : ''}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${l.quantite}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${
          l.estOffert ? '0 FCFA' : Number(l.prixReelApplique).toLocaleString() + ' FCFA'
        }</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${
          l.estOffert ? '0 FCFA' : (Number(l.prixReelApplique) * l.quantite).toLocaleString() + ' FCFA'
        }</td>
      </tr>`
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Reçu Vente #${id.slice(0, 8)}</title>
        <style>
          body { font-family: monospace, sans-serif; max-width: 400px; margin: 20px auto; padding: 15px; border: 1px solid #ccc; border-radius: 8px; }
          h2 { text-align: center; margin-bottom: 5px; }
          .header-info { text-align: center; font-size: 12px; color: #555; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          .total-box { margin-top: 15px; border-top: 2px solid #000; padding-top: 10px; text-align: right; font-size: 16px; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #777; }
        </style>
      </head>
      <body>
        <h2>BOUTIQUE POS</h2>
        <div class="header-info">
          Reçu N°: <strong>#${id.slice(0, 8)}</strong><br/>
          Date: ${new Date(venteData.date).toLocaleString('fr-FR')}<br/>
          Mode de règlement: <strong>${venteData.modePaiement}</strong><br/>
          Statut: <strong>${venteData.statut}</strong>
        </div>

        <table>
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 8px; text-align: left;">Produit</th>
              <th style="padding: 8px; text-align: center;">Qté</th>
              <th style="padding: 8px; text-align: right;">Prix u.</th>
              <th style="padding: 8px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${lignesHtml}
          </tbody>
        </table>

        <div class="total-box">
          TOTAL PAYÉ : ${Number(venteData.total).toLocaleString()} FCFA
        </div>

        <div class="footer">
          Merci pour votre visite ! À bientôt.
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;
  }
}

