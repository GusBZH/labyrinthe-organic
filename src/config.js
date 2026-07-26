export const GH_USER = "GusBZH";
export const GH_REPO = "labyrinthe-organic";
export const GH_FILE = "data.json";

// Bumped à chaque déploiement (voir "Vérification de version" dans
// CLAUDE.md) — comparé au contenu de version.json (récupéré sans cache) par
// App.js pour détecter un onglet resté ouvert sur une vieille version du
// JS et proposer un rechargement, plutôt que de laisser un client obsolète
// pousser une forme de données incompatible dans une partie en ligne
// partagée (Gus : "si quelqu'un d'autre crée une partie ils ont une vieille
// version du jeu, avec plus de 100 cartes maps, pas tous les monstres").
export const APP_VERSION = "2026-07-26.2";

export const ELEMENTS = ["Feu","Eau","Terre","Air","Ombre","Multi"];
export const STATUTS  = ["Validé","Test 1","Test 2","Test 3","Archivé"];
export const LVLS     = ["Lvl 1","Lvl 2","Lvl 3","Lvl 4"];

export const EC = {
  Feu:   {bg:"rgba(220,60,40,.15)",  br:"rgba(220,60,40,.4)",  dot:"#dc3c28", em:"🔥"},
  Eau:   {bg:"rgba(40,120,220,.15)", br:"rgba(40,120,220,.4)", dot:"#2878dc", em:"💧"},
  Terre: {bg:"rgba(120,80,40,.15)",  br:"rgba(120,80,40,.4)",  dot:"#785028", em:"🌍"},
  Air:   {bg:"rgba(80,180,120,.15)", br:"rgba(80,180,120,.4)", dot:"#50b478", em:"💨"},
  Ombre: {bg:"rgba(120,60,180,.15)", br:"rgba(120,60,180,.4)", dot:"#783cb4", em:"🌑"},
  Multi: {bg:"rgba(200,160,40,.15)", br:"rgba(200,160,40,.4)", dot:"#c8a028", em:"🌈"},
  Commun:{bg:"rgba(255,255,255,.06)",br:"rgba(255,255,255,.2)", dot:"#ccc",   em:"⚪"},
};

export const SC = {"Validé":"#4caf50","Test 1":"#ffeb3b","Test 2":"#ff9800","Test 3":"#f44336","Archivé":"#555"};

export const LR = {
  "Lvl 1":"1 énergie / -2 au dé",
  "Lvl 2":"1 sort / -1 au dé",
  "Lvl 3":"1 sort + 1 énergie",
  "Lvl 4":"2 sorts / +2 dés monstre",
};

// Bonus PV fixe pour TOUS les niveaux de monstre (Gus : "rajouter '2 PV'
// pour tous les monstres... écrit à la ligne sur la carte et sans '+'") —
// une constante à part plutôt que concaténée dans LR, puisque rendue sur sa
// propre ligne sur la carte plateau (PlateauPage.js CardFront), pas comme un
// simple suffixe de texte.
export const MONSTER_PV_BONUS = "2 PV";

export const VISUEL_CATS = [
  {key:'general',label:'💡 Idée générale'},{key:'boite',label:'📦 Boîte'},
  {key:'personnages',label:'🧑 Personnages'},{key:'cases',label:'🗺️ Cases'},
  {key:'items',label:'💎 Items'},{key:'monstres',label:'👹 Monstres'},
  {key:'accessoires',label:'🎲 Accessoires'},{key:'references',label:'🎨 Références'},
];

export const SECTION_ORDER_DEFAULT = ['regles','cases','sorts','energies','monstres','lexique','modes','visuels','materiel','application'];

export const SECTION_LABELS_DEFAULT = {
  regles: '📋 Règles de base',
  cases: '🗺️ Cases',
  sorts: '💎 Sorts',
  energies: '✨ Énergies',
  monstres: '👹 Monstres',
  lexique: '📖 Lexique',
  modes: '🎮 Modes de jeu',
  visuels: '🎨 Visuels',
  materiel: '🧰 Matériel',
  application: '🤖 Application',
};
