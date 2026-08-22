// Maps catalog fields (element/lvl) to the physical back-image files Gus
// uploaded to /assets — one back image per deck type, varying by element
// (sorts/énergies) or by monster level. See CLAUDE.md "Assets — cartes
// réelles (back/front)" for the full spec Gus gave.
const OMBRE_CYCLE = ['Feu', 'Eau', 'Terre', 'Air'];

// Sorts: back matches the sort's own element, EXCEPT Ombre — there's no
// dedicated Ombre back (and Gus explicitly said never use Sort_Back_Multi
// for it either) — instead it cycles through Feu/Eau/Terre/Air in catalog
// order (1st Ombre sort → Feu, 2nd → Eau, 3rd → Terre, 4th → Air, 5th →
// Feu again...). `ombreIndex` is the running count of Ombre cards already
// assigned a back this deck-build, passed in by the caller.
export function sortBackFor(element, ombreIndex = 0) {
  if (element === 'Ombre') return `Sort_Back_${OMBRE_CYCLE[ombreIndex % 4]}.jpg`;
  return `Sort_Back_${element}.jpg`;
}

// Énergies: back matches the element directly, except Ombre AND Multi both
// share Energy_Back_Multi.jpg (no dedicated Ombre back was provided).
export function energyBackFor(element) {
  if (element === 'Ombre' || element === 'Multi') return 'Energy_Back_Multi.jpg';
  return `Energy_Back_${element}.jpg`;
}

// Monstres: back is picked by level number (Lvl 1 → Monstre_1.jpg...), not
// by element (monsters don't carry one).
export function monsterBackFor(lvl) {
  const n = parseInt(String(lvl || '').replace(/[^\d]/g, ''), 10) || 1;
  return `Monstre_${n}.jpg`;
}

// Natural bonus text printed on an énergie's face, fixed per element (not
// derived from any catalog field) — Gus's own split: Multi/Ombre/Eau/Air
// give +1 PA, Feu/Terre give +1 PV.
// Bonus naturel affiché en bas de la carte (pas l'effet du milieu) — Gus a
// demandé de retirer celui de Multi/Ombre spécifiquement ("le bonus +1 PA
// de toutes les cartes énergie ombre et énergie multi"), gardant Eau/Air
// (+1 PA) et Feu/Terre (+1 PV) inchangés. Chaîne vide plutôt qu'une entrée
// absente : `CardFront` fait déjà `ENERGY_BONUS[data.element] || ''`, donc
// les deux se comportent pareil, mais une entrée explicite documente que
// c'est un choix délibéré plutôt qu'un oubli.
export const ENERGY_BONUS = {
  Multi: '', Ombre: '', Eau: '+1 PA', Air: '+1 PA',
  Feu: '+1 PV', Terre: '+1 PV',
};

export const CASE_BACK_IMG = 'assets/Case_Map_Back.jpg';
export const DEPART_IMG = 'assets/Case_de_Depart.png';
