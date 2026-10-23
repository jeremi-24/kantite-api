import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DashboardService {
  constructor(private ds: DataSource) {}

  stock() {
    return this.ds.query(
      `SELECT p.id, p.nom, p.categorie_id, p.lieu_stock_id, COALESCE(SUM(l.quantite_stock),0)::int AS quantite, COALESCE(SUM(l.quantite_stock*l.prix_reference),0) AS valeur_estimee FROM produits p LEFT JOIN lots l ON l.produit_id::text=p.id::text GROUP BY p.id`
    );
  }

  alertes() {
    return this.ds.query(
      `SELECT p.*, COALESCE(SUM(l.quantite_stock),0)::int AS quantite_stock FROM produits p LEFT JOIN lots l ON l.produit_id::text=p.id::text WHERE NOT p.sur_commande GROUP BY p.id HAVING COALESCE(SUM(l.quantite_stock),0) < p.qte_min`
    );
  }

  async chiffreAffaires(periode?: string, dateDebut?: string, dateFin?: string) {
    if (dateDebut && dateFin) {
      const start = new Date(dateDebut);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateFin);
      end.setHours(23, 59, 59, 999);

      const [r] = await this.ds.query(
        `SELECT COALESCE(SUM(l.prix_reel_applique*l.quantite),0) AS total 
         FROM lignes_vente l 
         JOIN ventes v ON v.id::text=l.vente_id::text 
         WHERE l.est_offert=false AND l.statut='VALIDEE' AND v.statut='VALIDEE' 
         AND v.date >= $1 AND v.date <= $2`,
        [start.toISOString(), end.toISOString()]
      );
      return r;
    }

    const trunc = { jour: 'day', semaine: 'week', mois: 'month' }[periode || 'jour'];
    if (!trunc) throw new BadRequestException('Période invalide');
    const [r] = await this.ds.query(
      `SELECT COALESCE(SUM(l.prix_reel_applique*l.quantite),0) AS total 
       FROM lignes_vente l 
       JOIN ventes v ON v.id::text=l.vente_id::text 
       WHERE l.est_offert=false AND l.statut='VALIDEE' AND v.statut='VALIDEE' 
       AND v.date >= date_trunc($1, NOW())`,
      [trunc]
    );
    return r;
  }

  topProduits(dateDebut?: string, dateFin?: string) {
    let dateFilter = '';
    const params: any[] = [];

    if (dateDebut && dateFin) {
      const start = new Date(dateDebut);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateFin);
      end.setHours(23, 59, 59, 999);
      dateFilter = ' AND v.date >= $1 AND v.date <= $2';
      params.push(start.toISOString(), end.toISOString());
    }

    return this.ds.query(
      `SELECT p.id, p.nom, SUM(l.quantite)::int AS quantite_vendue 
       FROM lignes_vente l 
       JOIN produits p ON p.id::text=l.produit_id::text 
       JOIN ventes v ON v.id::text=l.vente_id::text 
       WHERE l.statut='VALIDEE' AND v.statut='VALIDEE'${dateFilter} 
       GROUP BY p.id ORDER BY quantite_vendue DESC LIMIT 10`,
      params
    );
  }

  ecarts(dateDebut?: string, dateFin?: string) {
    let dateFilter = ' WHERE ecart != 0';
    const params: any[] = [];

    if (dateDebut && dateFin) {
      const start = new Date(dateDebut);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateFin);
      end.setHours(23, 59, 59, 999);
      dateFilter += ' AND date >= $1 AND date <= $2';
      params.push(start.toISOString(), end.toISOString());
    }

    return this.ds.query(
      `SELECT * FROM inventaires${dateFilter} ORDER BY date DESC LIMIT 20`,
      params
    );
  }

  historiquePrix() {
    return this.ds.query(`SELECT * FROM historique_prix ORDER BY date DESC`);
  }
}


