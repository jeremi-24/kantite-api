import { Injectable } from '@nestjs/common';
import { join } from 'path';
import * as fs from 'fs';

export interface StoreSettings {
  nom: string;
  adresse: string;
  telephone: string;
  email: string;
  devise: string;
  piedDePage: string;
  nifStat: string;
  logoUrl: string;
}

const LIMITES: Record<keyof StoreSettings, number> = {
  nom: 100,
  adresse: 200,
  telephone: 50,
  email: 150,
  devise: 20,
  piedDePage: 300,
  nifStat: 100,
  logoUrl: 300,
};

// Hors de storage/, qui est servi publiquement. Survit aux déploiements (non versionné).
const DOSSIER = join(process.cwd(), 'data');
const FICHIER = join(DOSSIER, 'settings.json');

@Injectable()
export class SettingsService {
  get(): Partial<StoreSettings> {
    try {
      return JSON.parse(fs.readFileSync(FICHIER, 'utf-8'));
    } catch {
      return {};
    }
  }

  save(body: Record<string, unknown>): StoreSettings {
    const out = {} as StoreSettings;
    for (const cle of Object.keys(LIMITES) as (keyof StoreSettings)[]) {
      const v = body?.[cle];
      out[cle] = typeof v === 'string' ? v.trim().slice(0, LIMITES[cle]) : '';
    }
    // Seuls les logos téléversés sur le serveur (ou une URL web) sont partageables entre utilisateurs
    if (out.logoUrl && !/^(\/storage\/|https?:\/\/)/.test(out.logoUrl)) out.logoUrl = '';

    fs.mkdirSync(DOSSIER, { recursive: true });
    const tmp = `${FICHIER}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(out, null, 2), 'utf-8');
    fs.renameSync(tmp, FICHIER);
    return out;
  }
}
