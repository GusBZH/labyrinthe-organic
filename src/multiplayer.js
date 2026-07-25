// Couche de synchro temps réel pour la version en ligne du Plateau (voir
// CLAUDE.md "Version en ligne entre amis"). Volontairement minimale : une
// partie = un noeud Firebase `rooms/<code>` avec deux enfants —
// `board` (exactement la forme des clés déjà persistées par commitBoard en
// solo : players/piles/discardCards/placedTiles/heldTile/boardItems/heldItem/
// monsters/markers/heldMarker, SANS currentIndex qui reste local par
// appareil — voir CLAUDE.md) et `cardCatalog` (la table id → données du
// catalogue, voir cardCatalogRef dans PlateauPage — ne grossit jamais que
// par le haut, donc un merge suffit, jamais un écrasement). Aucune
// sémantique de jeu ici, ce module ne fait que lire/écrire/observer un blob
// JSON partagé.
import { db } from "./firebase.js";
import { ref, get, set, update, onValue, off } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js";

function roomRef(code) {
  return ref(db, `rooms/${code}`);
}

// Renvoie true si une partie existe déjà sous ce code (pour avertir avant
// d'écraser une partie en cours si quelqu'un choisit un code déjà pris, ou
// pour dire "aucune partie trouvée" en mode rejoindre).
export async function roomExists(code) {
  const snap = await get(ref(db, `rooms/${code}/board`));
  return snap.exists();
}

// Crée (ou réinitialise) une partie à ce code avec un état de plateau et un
// catalogue de cartes initiaux.
export async function createRoom(code, initialBoard, initialCardCatalog) {
  await set(roomRef(code), {board: initialBoard, cardCatalog: initialCardCatalog || {}});
}

// Abonnement live : callback({board, cardCatalog}) appelé immédiatement avec
// l'état courant puis à chaque changement distant. Renvoie une fonction de
// désabonnement à appeler au démontage du composant.
export function subscribeToRoom(code, callback) {
  const r = roomRef(code);
  const listener = onValue(r, (snapshot) => {
    callback(snapshot.val());
  });
  return () => off(r, 'value', listener);
}

// Pousse une mise à jour PARTIELLE du board (merge, pas d'écrasement des
// autres clés) — même forme que l'objet `updates` déjà utilisé par
// commitBoard en solo.
export function pushBoardUpdate(code, updates) {
  return update(ref(db, `rooms/${code}/board`), updates);
}

// Fusionne de nouvelles entrées dans le catalogue partagé (jamais de
// suppression — le catalogue ne fait que grossir, voir cardCatalogRef).
export function pushCardCatalogEntries(code, entries) {
  if (!entries || !Object.keys(entries).length) return Promise.resolve();
  return update(ref(db, `rooms/${code}/cardCatalog`), entries);
}
