# Périmètre fonctionnel — Application de gestion de stock / POS

Ce document est le périmètre **figé et validé**. Le développeur suit ce document tel quel : il ne doit pas réinterpréter les règles métier ni élargir le périmètre. Toute question non couverte ici doit être remontée au lead avant implémentation.

---

## 1. Contexte

Boutique multi-catégories (lunettes, accessoires, huiles, boissons, produits ménagers, électronique, sport, médicaments, cosmétiques), organisée en plusieurs **lieux de stock** (pièces). L'application couvre : gestion des produits, vente au point de vente (POS), historique des ventes, inventaire, et un tableau de bord admin.

---

## 2. Entités principales

### 2.1 LieuStock

- `id`
- `nom` (ex: "Pièce 1", "Réserve")
- CRUD simple (créer / lister / modifier / supprimer un lieu)

### 2.2 Categorie

- `id`, `nom` (ex: LUNETTE HOMME BOITE, ACCESSOIRES, HUILE, BOISSON, PRODUIT MENAGER, MEDICAMENT, PRODUIT COSMETIQUE, ELECTRIQUE, SPORT...)

### 2.3 Produit

- `id`, `nom`, `categorie_id`, `lieu_stock_id`
- `qte_min` (seuil d'alerte stock bas)
- `caracteristiques` (champ libre ou attributs optionnels : grande/petite, couleur, volume, avec/sans boîte — représentés dans le nom ou en attributs séparés selon le cas)
- `produit_offert_id` (optionnel — référence vers un autre produit dont celui-ci est le cadeau ; si renseigné, ce produit n'a pas de prix de vente propre et n'apparaît pas comme ligne de vente facturée)
- **Règle : tous les lots d'un même produit sont dans le même&#x20;****`lieu_stock_id`** (le produit porte le lieu, pas le lot). Le cas d'un produit réparti sur 2 lieux n'est pas géré dans cette version.

### 2.4 ConditionnementProduit

Un produit peut avoir un ou plusieurs conditionnements autorisés.

- `id`, `produit_id`
- `type` (UNITE, BOITE, CARTON, PAIRE, SACHET, AUTRE)
- `facteur_conversion` (entier ≥ 1 — nombre d'unités que représente ce conditionnement)
  - Exemple lunettes : BOITE = facteur 1, CARTON = facteur 1 (juste des étiquettes de reconnaissance/traçabilité, aucune multiplication de quantité)
  - Exemple autres produits : PAIRE = facteur 2, SACHET = facteur 100
- `prix_reference` (prix de référence pour ce conditionnement — informatif, voir §2.6 pour le prix réel)
- `vente_unitaire_autorisee` (booléen — si false, ce conditionnement ne peut PAS être vendu à l'unité, il doit être vendu en bloc complet)

**Règle de blocage :** si un produit n'a AUCUN conditionnement avec `vente_unitaire_autorisee = true`, la vente à l'unité doit être bloquée côté POS.

### 2.5 Lot

Gère les stocks et les prix multiples par produit (raison non systématiquement connue : quantité, modèle, lot d'achat...).

- `id`, `produit_id`
- `prix_reference` (ex: lot 1 à 20 000, lot 2 à 45 000)
- `quantite_stock` (quantité disponible dans ce lot)
- `date_reception` (optionnel, pour tri FIFO à l'affichage)

**Règle de vente :** le stock est décrémenté sur le lot précis sélectionné manuellement par le vendeur, jamais sur un stock global agrégé.

### 2.6 Vente / LigneVente

**Vente**

- `id`, `date`, `mode_paiement` (CASH ou MOBILE\_MONEY — champ simple, aucune intégration API réelle), `total`

**LigneVente**

- `id`, `vente_id`, `produit_id`, `lot_id`, `conditionnement_id`
- `quantite`
- `prix_reel_applique` (obligatoire à chaque ligne — peut différer du `prix_reference` du lot ou du conditionnement ; c'est TOUJOURS ce prix qui est facturé et historisé)
- Si le produit est un produit offert (`produit_offert_id` renseigné) : ligne informative sur le reçu, `prix_reel_applique = 0`, ne compte pas dans le total

**Règle de blocage stock :** impossible de valider une vente si `quantite` demandée > `quantite_stock` disponible sur le lot sélectionné (compte tenu du facteur de conversion du conditionnement choisi).

**Retour / annulation :** une vente (ou une ligne) peut être annulée après coup → réincrémente le lot d'origine, garde une trace de l'annulation (ne pas supprimer physiquement la ligne, la marquer annulée).

**Reçu :** génération d'un reçu imprimable en PDF après validation de la vente (produits, quantités, prix réels, total, mode de paiement).

### 2.7 Inventaire

- `id`, `produit_id`, `date`
- `quantite_comptee` (saisie manuelle lors du comptage physique)
- `quantite_systeme` (calculée automatiquement = somme des `quantite_stock` des lots du produit au moment du comptage)
- `ecart` = `quantite_comptee` − `quantite_systeme` (calculé automatiquement, affiché, pas de statut de validation à gérer)

### 2.8 HistoriquePrix

- `id`, `lot_id` ou `produit_id`, `ancien_prix`, `nouveau_prix`, `date`
- Alimenté automatiquement à chaque modification de `prix_reference`

### 2.9 Utilisateur / Rôle

- `id`, `nom`, `role` (VENDEUR ou ADMIN)
- **VENDEUR** : accès module Vente POS uniquement
- **ADMIN** : accès complet (POS + Produits + Inventaire + Dashboard + gestion des lieux/utilisateurs)

---

## 3. Modules et workflows

### 3.1 Module Produit

- CRUD produit (nom, catégorie, lieu de stock, qte\_min, caractéristiques, produit offert lié)
- Gestion des conditionnements du produit (ajout/modification/suppression)
- Gestion des lots du produit (ajout d'un nouveau lot à la réception de stock, avec son prix de référence et sa quantité)

### 3.2 Module Vente POS (écran vendeur)

1. Recherche produit (par nom ou catégorie)
2. Sélection du conditionnement parmi ceux autorisés pour ce produit (si un seul, sélection automatique)
3. Affichage des lots disponibles pour ce produit avec leur prix de référence et quantité restante → sélection manuelle du lot par le vendeur
4. Prix réel pré-rempli avec le prix de référence du lot/conditionnement, **modifiable** par le vendeur
5. Saisie de la quantité → contrôle de disponibilité (bloque si insuffisant)
6. Ajout au panier (plusieurs lignes possibles dans une même vente)
7. Sélection du mode de paiement (Cash / Mobile Money)
8. Validation → décrémente le(s) lot(s) concernés, enregistre la vente et ses lignes, génère le reçu PDF

### 3.3 Module Liste des ventes

- Historique des ventes : date, produit, lot, conditionnement, prix réel, quantité, mode de paiement
- Filtres : par date, produit, catégorie
- Action : annuler une vente ou une ligne (réincrémente le stock du lot d'origine)

### 3.4 Module Inventaire

- Saisie du comptage physique par produit
- Calcul automatique de l'écart (comptée − système)
- Liste des écarts détectés (positifs/négatifs), sans workflow de validation supplémentaire

### 3.5 Module Admin Dashboard

- Stock global par catégorie / par produit (quantité totale tous lots confondus, valeur estimée sur `prix_reference`)
- Alertes stock bas (produits dont le stock total < `qte_min`)
- Chiffre d'affaires : jour / semaine / mois (basé sur `prix_reel_applique` des ventes non annulées)
- Top produits les plus vendus
- Écarts d'inventaire récents
- Vue du stock par lieu de stock
- Historique des changements de prix (`HistoriquePrix`)

### 3.6 Import initial des données

- Script ponctuel (pas un module permanent dans l'UI) pour importer le fichier Excel existant du client vers les entités Produit / Conditionnement (carton) / Lot (avec `prix` comme prix de référence du lot initial et `quantite_initiale` comme quantité du lot initial) / Categorie / LieuStock

---

## 4. Hors périmètre (explicitement exclu)

- Transfert de stock entre lieux
- Intégration Mobile Money réelle (API de paiement) — le champ `mode_paiement` reste une simple donnée déclarative

---

## 5. Notes pour le développeur

- ajouter  gestion de statut "à vérifier" / validation sur l'inventaire
- Ne pas gérer le cas d'un produit réparti sur plusieurs lieux de stock — hors périmètre pour cette version.
- Le facteur de conversion d'un conditionnement peut valoir 1 (cas des lunettes BOITE/CARTON) : ne pas supposer qu'un conditionnement structuré implique toujours une multiplication de quantité.
- Le prix réel appliqué à la vente est toujours saisi/confirmé à la vente, jamais déduit automatiquement sans possibilité de modification.

# Architecture technique — Application gestion de stock / POS

Complément du document `perimetre-gestion-stock.md`. Ici : schéma BDD, découpage NestJS (modules/controllers/services), et règles métier à coder en dur dans les services. Le développeur suit cette structure telle quelle, il n'a qu'à écrire le contenu du code.

Stack supposée : NestJS + PostgreSQL + TypeORM. Si drizzle est utilisé à la place, la structure des modules/services ne change pas, seule la syntaxe des entités change.

---

## 1. Schéma de base de données

### `lieux_stock`

| Colonne     | Type         | Contrainte    |
| ----------- | ------------ | ------------- |
| id          | uuid         | PK            |
| nom         | varchar(100) | NOT NULL      |
| created\_at | timestamp    | default now() |

### `categories`

| Colonne | Type         | Contrainte       |
| ------- | ------------ | ---------------- |
| id      | uuid         | PK               |
| nom     | varchar(100) | NOT NULL, unique |

### `produits`

| Colonne                   | Type         | Contrainte                                  |
| ------------------------- | ------------ | ------------------------------------------- |
| id                        | uuid         | PK                                          |
| nom                       | varchar(200) | NOT NULL                                    |
| categorie\_id             | uuid         | FK → categories.id, NOT NULL                |
| lieu\_stock\_id           | uuid         | FK → lieux\_stock.id, NOT NULL              |
| qte\_min                  | int          | default 0                                   |
| caracteristiques          | jsonb        | nullable                                    |
| produit\_offert\_id       | uuid         | FK → produits.id, nullable (auto-référence) |
| created\_at / updated\_at | timestamp    | default now()                               |

### `conditionnements_produit`

| Colonne                    | Type                                                    | Contrainte                      |
| -------------------------- | ------------------------------------------------------- | ------------------------------- |
| id                         | uuid                                                    | PK                              |
| produit\_id                | uuid                                                    | FK → produits.id, NOT NULL      |
| type                       | enum('UNITE','BOITE','CARTON','PAIRE','SACHET','AUTRE') | NOT NULL                        |
| facteur\_conversion        | int                                                     | NOT NULL, default 1, CHECK >= 1 |
| prix\_reference            | numeric(12,2)                                           | NOT NULL                        |
| vente\_unitaire\_autorisee | boolean                                                 | NOT NULL, default true          |

Contrainte unique : `(produit_id, type)` — un produit n'a qu'un seul conditionnement par type.

### `lots`

| Colonne         | Type          | Contrainte                 |
| --------------- | ------------- | -------------------------- |
| id              | uuid          | PK                         |
| produit\_id     | uuid          | FK → produits.id, NOT NULL |
| prix\_reference | numeric(12,2) | NOT NULL                   |
| quantite\_stock | int           | NOT NULL, CHECK >= 0       |
| date\_reception | timestamp     | default now()              |

### `ventes`

| Colonne         | Type                         | Contrainte                     |
| --------------- | ---------------------------- | ------------------------------ |
| id              | uuid                         | PK                             |
| date            | timestamp                    | default now()                  |
| mode\_paiement  | enum('CASH','MOBILE\_MONEY') | NOT NULL                       |
| total           | numeric(12,2)                | NOT NULL                       |
| statut          | enum('VALIDEE','ANNULEE')    | default 'VALIDEE'              |
| utilisateur\_id | uuid                         | FK → utilisateurs.id, NOT NULL |

### `lignes_vente`

| Colonne              | Type                      | Contrainte                                  |
| -------------------- | ------------------------- | ------------------------------------------- |
| id                   | uuid                      | PK                                          |
| vente\_id            | uuid                      | FK → ventes.id, NOT NULL                    |
| produit\_id          | uuid                      | FK → produits.id, NOT NULL                  |
| lot\_id              | uuid                      | FK → lots.id, NOT NULL                      |
| conditionnement\_id  | uuid                      | FK → conditionnements\_produit.id, NOT NULL |
| quantite             | int                       | NOT NULL, CHECK > 0                         |
| prix\_reel\_applique | numeric(12,2)             | NOT NULL                                    |
| est\_offert          | boolean                   | default false                               |
| statut               | enum('VALIDEE','ANNULEE') | default 'VALIDEE'                           |

### `inventaires`

| Colonne           | Type      | Contrainte                                                               |
| ----------------- | --------- | ------------------------------------------------------------------------ |
| id                | uuid      | PK                                                                       |
| produit\_id       | uuid      | FK → produits.id, NOT NULL                                               |
| date              | timestamp | default now()                                                            |
| quantite\_comptee | int       | NOT NULL                                                                 |
| quantite\_systeme | int       | NOT NULL (snapshot calculé à l'écriture)                                 |
| ecart             | int       | NOT NULL (= quantite\_comptee - quantite\_systeme, calculé à l'écriture) |

### `historique_prix`

| Colonne       | Type          | Contrainte                 |
| ------------- | ------------- | -------------------------- |
| id            | uuid          | PK                         |
| lot\_id       | uuid          | FK → lots.id, nullable     |
| produit\_id   | uuid          | FK → produits.id, nullable |
| ancien\_prix  | numeric(12,2) | NOT NULL                   |
| nouveau\_prix | numeric(12,2) | NOT NULL                   |
| date          | timestamp     | default now()              |

### `utilisateurs`

| Colonne              | Type                    | Contrainte       |
| -------------------- | ----------------------- | ---------------- |
| id                   | uuid                    | PK               |
| nom                  | varchar(100)            | NOT NULL         |
| email                | varchar(150)            | NOT NULL, unique |
| mot\_de\_passe\_hash | varchar                 | NOT NULL         |
| role                 | enum('VENDEUR','ADMIN') | NOT NULL         |
| created\_at          | timestamp               | default now()    |

---

## 2. Découpage NestJS (modules)
```java
src/
  auth/                 → AuthModule, AuthController, AuthService, guards (JwtAuthGuard, RolesGuard)
  utilisateurs/         → UtilisateursModule, Controller, Service
  lieux-stock/          → LieuxStockModule, Controller, Service
  categories/           → CategoriesModule, Controller, Service
  produits/             → ProduitsModule, Controller, Service
    conditionnements/   → ConditionnementsController, ConditionnementsService (sous-ressource de produits)
    lots/               → LotsController, LotsService (sous-ressource de produits)
  ventes/               → VentesModule, Controller, Service
  inventaire/           → InventaireModule, Controller, Service
  dashboard/            → DashboardModule, Controller, Service
  import/               → ImportModule (script CLI ponctuel, pas exposé en API publique)
  common/               → enums partagés, decorators @Roles(), pipes de validation
```

Chaque module : `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/create-*.dto.ts`, `dto/update-*.dto.ts`, `entities/*.entity.ts`.

Toutes les routes sauf `auth/login` sont protégées par `JwtAuthGuard`. Les routes admin (gestion produits, dashboard, gestion utilisateurs/lieux) sont en plus protégées par `RolesGuard` + `@Roles('ADMIN')`. Les routes vente/POS sont accessibles à `VENDEUR` et `ADMIN`.

---

## 3. Endpoints par module

### AuthModule

- `POST /auth/login` → renvoie un JWT

### LieuxStockModule (ADMIN)

- `GET /lieux-stock`
- `POST /lieux-stock`
- `PATCH /lieux-stock/:id`
- `DELETE /lieux-stock/:id`

### CategoriesModule (ADMIN)

- `GET /categories`
- `POST /categories`

### ProduitsModule (ADMIN pour écriture, lecture accessible à VENDEUR)

- `GET /produits` (filtres : nom, categorie\_id, lieu\_stock\_id)
- `GET /produits/:id`
- `POST /produits` (ADMIN)
- `PATCH /produits/:id` (ADMIN)
- `DELETE /produits/:id` (ADMIN)
- `GET /produits/:id/conditionnements`
- `POST /produits/:id/conditionnements` (ADMIN)
- `PATCH /produits/:id/conditionnements/:condId` (ADMIN)
- `GET /produits/:id/lots`
- `POST /produits/:id/lots` (ADMIN) — création d'un nouveau lot à la réception de stock

### VentesModule (VENDEUR, ADMIN)

- `POST /ventes` — body : `{ mode_paiement, lignes: [{ produit_id, lot_id, conditionnement_id, quantite, prix_reel_applique }] }`
- `GET /ventes` (filtres : date, produit\_id, categorie\_id)
- `GET /ventes/:id`
- `POST /ventes/:id/annuler`
- `POST /ventes/:id/lignes/:ligneId/annuler`
- `GET /ventes/:id/recu` → génère et retourne le PDF du reçu

### InventaireModule (ADMIN)

- `POST /inventaire` — body : `{ produit_id, quantite_comptee }`
- `GET /inventaire` (filtres : date, produit\_id, écarts non nuls)

### DashboardModule (ADMIN)

- `GET /dashboard/stock` (global, par catégorie, par produit, par lieu)
- `GET /dashboard/alertes-stock-bas`
- `GET /dashboard/chiffre-affaires?periode=jour|semaine|mois`
- `GET /dashboard/top-produits`
- `GET /dashboard/ecarts-inventaire`
- `GET /dashboard/historique-prix`

### Import (script CLI, pas d'API)

- Commande unique lancée une fois pour migrer le fichier Excel client vers `categories`, `lieux_stock`, `produits`, `conditionnements_produit` (type CARTON à partir de `qte_par_carton`/`prix_carton`), `lots` (premier lot = `prix`/`quantite_initiale`)

---

## 4. Règles métier à coder dans les services (pas dans les controllers)

**`ProduitsService`**

- Si aucun `conditionnement` avec `vente_unitaire_autorisee = true` n'existe pour un produit → la vente à l'unité doit être refusée par `VentesService` (contrôle croisé, voir plus bas).

**`ConditionnementsService`**

- `facteur_conversion` toujours >= 1 (contrainte DB + validation DTO).
- Un produit ne peut pas avoir deux fois le même `type` de conditionnement (contrainte unique DB + message d'erreur explicite côté service).

**`LotsService`**

- `quantite_stock` ne peut jamais devenir négative (vérifié avant toute décrémentation).
- Toute modification de `prix_reference` d'un lot déclenche une écriture dans `historique_prix` (ancien/nouveau prix, date).

**`VentesService`** (méthode `creerVente`)
Pour chaque ligne du panier, dans l'ordre :

1. Charger le conditionnement demandé → vérifier qu'il appartient bien au produit demandé.
2. Si le conditionnement est `UNITE` (facteur 1) → vérifier `vente_unitaire_autorisee = true` sur ce conditionnement, sinon rejeter la ligne.
3. Calculer la quantité réelle à décrémenter = `quantite * facteur_conversion`.
4. Vérifier `lot.quantite_stock >= quantite_reelle_a_decrementer`, sinon rejeter la ligne (stock insuffisant).
5. Si `produit.produit_offert_id` est renseigné pour ce produit → forcer `prix_reel_applique = 0` et `est_offert = true`, exclure du total.
6. Décrémenter `lot.quantite_stock`, créer la `ligne_vente`.
7. Calculer `total` de la vente = somme des `prix_reel_applique * quantite` des lignes non offertes.
   Toute l'opération (5 étapes) est transactionnelle : si une ligne échoue, aucune ligne n'est enregistrée.

**`VentesService`** (méthode `annulerVente` / `annulerLigne`)

- Réincrémente `lot.quantite_stock` de la quantité réelle de la ligne annulée.
- Passe le statut à `ANNULEE`, ne supprime jamais la ligne.
- Une ligne/vente déjà `ANNULEE` ne peut pas être annulée à nouveau.
- Le total de la vente et les calculs de chiffre d'affaires excluent les lignes/ventes `ANNULEE`.

**`InventaireService`** (méthode `enregistrerComptage`)

- Au moment de l'écriture : calculer `quantite_systeme` = somme de `lots.quantite_stock` pour ce `produit_id` à cet instant.
- Calculer et stocker `ecart = quantite_comptee - quantite_systeme`.
- Aucune autre validation, aucun statut — l'écart est juste informatif pour l'admin.

**`DashboardService`**

- `chiffre-affaires` : somme de `lignes_vente.prix_reel_applique * quantite` où `est_offert = false` et la vente/ligne n'est pas `ANNULEE`, filtré sur la période demandée.
- `alertes-stock-bas` : produits où somme des `lots.quantite_stock` < `produit.qte_min`.
- `stock` par lieu : group by `produit.lieu_stock_id`.

---

## 5. Points explicitement hors périmètre (ne pas coder)

- Pas de transfert de stock entre `lieux_stock`.
- Pas d'appel à une API Mobile Money réelle : `mode_paiement = 'MOBILE_MONEY'` est juste une valeur stockée.
- Pas de statut "à vérifier" sur `inventaires`.
- Pas de gestion d'un produit sur plusieurs `lieu_stock_id` simultanément.
- evite de lancer des commande de build ou tsx emit ,et documente en quelque ligne les modif apporté

nest g module lieux-stock

nest g module categories

nest g module produits

nest g module ventes

nest g module inventaire

nest g module dashboard

nest g module auth

nest g module utilisateurs