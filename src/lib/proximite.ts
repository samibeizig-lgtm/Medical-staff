/**
 * Proximité du lieu de travail : distance à vol d'oiseau entre les chefs-lieux des gouvernorats.
 */
import { GOUVERNORATS } from './data';

/** Coordonnées (latitude, longitude) des chefs-lieux des 24 gouvernorats */
const COORDS: Record<string, [number, number]> = {
  'Ariana': [36.8625, 10.1956],
  'Béja': [36.7256, 9.1817],
  'Ben Arous': [36.7531, 10.2189],
  'Bizerte': [37.2744, 9.8739],
  'Gabès': [33.8815, 10.0982],
  'Gafsa': [34.425, 8.7842],
  'Jendouba': [36.5011, 8.7802],
  'Kairouan': [35.6781, 10.0963],
  'Kasserine': [35.1676, 8.8365],
  'Kébili': [33.7044, 8.969],
  'Le Kef': [36.1822, 8.7147],
  'Mahdia': [35.5047, 11.0622],
  'La Manouba': [36.8101, 10.0956],
  'Médenine': [33.3549, 10.5055],
  'Monastir': [35.7643, 10.8113],
  'Nabeul': [36.4561, 10.7376],
  'Sfax': [34.7406, 10.7603],
  'Sidi Bouzid': [35.0382, 9.4849],
  'Siliana': [36.085, 9.3708],
  'Sousse': [35.8254, 10.636],
  'Tataouine': [32.9297, 10.4518],
  'Tozeur': [33.9197, 8.1335],
  'Tunis': [36.8065, 10.1815],
  'Zaghouan': [36.4029, 10.1429],
};

/** Jusqu'à cette distance, la proximité est maximale (même agglomération / gouvernorats voisins) */
export const DISTANCE_PLEINE = 25;
/** Au-delà, la proximité ne rapporte plus de points */
export const DISTANCE_NULLE = 300;
export const RAYONS = [25, 50, 100, 200] as const;

/** Distance en km (arrondie) entre deux gouvernorats, ou null si l'un est inconnu */
export function distanceKm(a: string | null | undefined, b: string | null | undefined): number | null {
  const p = a ? COORDS[a] : undefined, q = b ? COORDS[b] : undefined;
  if (!p || !q) return null;
  if (a === b) return 0;
  const rad = Math.PI / 180;
  const dLat = (q[0] - p[0]) * rad, dLon = (q[1] - p[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(p[0] * rad) * Math.cos(q[0] * rad) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)));
}

/** Score de proximité entre 0 et 1 (null si la ville du candidat ou de l'offre est inconnue) */
export function proximite(d: number | null): number {
  if (d === null) return 0;
  if (d <= DISTANCE_PLEINE) return 1;
  return Math.max(0, 1 - (d - DISTANCE_PLEINE) / (DISTANCE_NULLE - DISTANCE_PLEINE));
}

/** Gouvernorats situés à moins de `rayon` km du gouvernorat `centre` (centre inclus) */
export function gouvernoratsDansRayon(centre: string, rayon: number): string[] {
  return GOUVERNORATS.filter((g) => { const d = distanceKm(centre, g); return d !== null && d <= rayon; });
}

export const libelleDistance = (d: number | null) => d === null ? '' : d === 0 ? 'même gouvernorat' : `≈ ${d} km`;

export const rayonValide = (v: unknown): number | null => {
  const n = Number(v);
  return (RAYONS as readonly number[]).includes(n) ? n : null;
};
