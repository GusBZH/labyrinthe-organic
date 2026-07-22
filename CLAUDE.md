# Labyrinthe Organic — Contexte projet

## C'est quoi
Jeu de société original créé par Gus (aussi appelé "Maze El Touffe" à un moment).
Labyrinthe vivant manipulé par les joueurs, avec mécaniques RPG : deck-building,
sorts élémentaires, cartes énergie, monstres, 13 modes de jeu.

6 éléments : Feu, Eau, Terre, Air, Ombre, Multi.

## Architecture technique — IMPORTANT
App web SANS étape de build (pas de JSX compilé, pas de Babel, pas de bundler).
La logique tourne en `React.createElement` pur, découpée en modules ES natifs
(`import`/`export` entre fichiers `.js`, chargés par le navigateur sans outil).
- `index.html` — coquille HTML + CSS + les deux `<script>` UMD React/ReactDOM
  + `<script type="module" src="src/main.js">`
- `src/main.js` — point d'entrée, monte `<App/>`
- `src/App.js` — état de session (token, data, sha, editMode), chargement/
  sauvegarde GitHub, routing entre pages
- `src/react.js` — réexporte `h`/hooks depuis le global `React` (UMD)
- `src/config.js` — constantes (éléments, statuts, couleurs...)
- `src/github.js` — lecture/écriture de `data.json` via l'API GitHub
- `src/utils.js` — helpers (`uid`, `renderText`, `useReorder`, `useEditFlash`,
  `migrateVisuels`, `editBgStyle`)
- `src/data/initialData.js` — jeu de données de secours (mode local sans token)
- `src/components/` — briques UI génériques réutilisées partout (Card, Section,
  EditText, ElemGroup, LvlGroup, BlockEditor, DragHandle, UndoRedo, EditableSection...)
- `src/pages/` — écrans assemblés à partir des composants (HomePage,
  SoireePage, IdeeVracPage, PlateauPage)
- `data.json` — toutes les données du jeu (source de vérité, lu/écrit via l'API GitHub)
- `manifest.json` — PWA manifest

Déployé sur GitHub Pages : https://gusbzh.github.io/labyrinthe-organic/
GitHub Pages sert les fichiers tels quels — pas de pipeline CI/CD. Les modules
ES fonctionnent nativement dans le navigateur sans build, mais ne se testent
pas en ouvrant le fichier directement (`file://`) — il faut un serveur local
(ex: `python3 -m http.server`) à cause des restrictions CORS sur les imports.

## Structure de data.json
Le nombre d'entrées et le contenu exact évoluent en continu — data.json est la
seule source de vérité, ne pas se fier à un compte figé ici. Les catégories :
- `sorts` — cartes sort par élément, avec statut, coût PA, limite, effet
- `energies` — cartes énergie, dont catégorie "Commun" (effets partagés)
- `monstres` — cartes monstre avec niveaux et effets
- `cases` — types de cases du plateau avec quantités
- `regles` — règles validées
- `lexique` — glossaire des termes du jeu
- `modes` — modes de jeu, chacun avec notes de test
- `ideesModes` — idées de modes non encore développées
- `soireesProto` — notes de soirées de playtest
- `ideeEnVrac` — brainstorm libre
- `materiel` — liste du matériel physique du jeu
- `visuels` — tableau extensible de catégories `{id, label, content}` (renommables,
  ajoutables, réordonnables, supprimables depuis l'UI). Migré automatiquement au
  chargement depuis l'ancien format objet fixe si besoin (`migrateVisuels` dans
  `src/utils.js`) — aucune modification manuelle de data.json requise.
- `sectionOrder` — ordre d'affichage des grandes sections de la home page (tableau de
  clés). Absent ou incomplet → complété automatiquement (`migrateSectionOrder` dans
  `src/utils.js`).

Chaque item a généralement un champ `statut` : Validé / Test 1 / Test 2 / Test 3 / Archivé,
avec un système de pastilles colorées dans l'UI.

## Conventions de travail — À RESPECTER
- **Ne jamais modifier un bloc de code déjà validé/confirmé.** Ajouter les nouvelles
  fonctionnalités comme des blocs séparés (nouveau composant, nouvelle fonction),
  plutôt que de retoucher ce qui marche déjà.
- Double saut de ligne dans un texte = doit créer une séparation visuelle (ligne hr) dans l'UI.
- Dans Idées en vrac, Visuels (contenu de chaque catégorie) et Matériel, le contenu est
  stocké comme un seul texte, les blocs séparés par une ligne vide (`\n\n`) — même
  convention que le rendu `renderText`. En mode édition, chaque bloc est un `<textarea>`
  à hauteur automatique séparé par un vrai `<hr>` gris (jamais des tirets en texte, ça
  ne s'adapte pas à la largeur d'écran). Entrée deux fois de suite scinde le bloc courant
  en deux (nouveau séparateur) ; Retour arrière au tout début d'un bloc le refusionne
  avec le précédent. Composant partagé `src/components/BlockEditor.js`.
- Réordonner par glisser (souris ou tactile, appui-maintenu) est disponible partout :
  Lexique, Modes de jeu, Idées de modes, catégories de Visuels, Soirées Proto, et même
  l'ordre des grandes sections de la page d'accueil (Règles, Cases, Sorts...). Sur
  Sorts/Énergies/Monstres/Règles/Cases, qui se trient déjà par statut en mode édition
  (Validé en premier, etc.), l'ordre manuel s'applique *à l'intérieur* de chaque groupe
  élément+statut (ou niveau+statut pour les monstres) — pas de nouvel attribut de
  priorité : l'ordre est simplement la position dans le tableau `data.sorts` /
  `data.energies` / etc., et le tri par statut étant stable, il respecte cet ordre comme
  critère de départage. Conséquence : si on change l'élément (ou le niveau) d'un item,
  il ne garde pas une position arbitraire de son ancien groupe — `updArr` dans
  `src/App.js` détecte ce changement et renvoie l'item en fin de tableau, donc il
  atterrit en dernier dans son nouveau groupe (dernier de son statut, pas forcément
  tout en bas si des statuts inférieurs suivent). Aucun risque de collision : comme il
  n'y a pas de numéro de priorité séparé, il ne peut pas y avoir deux items avec la
  "même" position. Helper `reorderSubset()` dans `src/utils.js` pour committer le
  réordonnancement d'un sous-ensemble filtré/trié sans toucher aux autres items du
  tableau complet. Hook partagé `useReorder()` (Pointer Events, marche pareil souris/
  tactile), poignée `src/components/DragHandle.js`. L'ordre des sections elles-mêmes
  vit dans `data.sectionOrder`, l'ordre des groupes élément (Sorts/Énergies, partagé
  entre les deux) dans `data.elementOrder`, l'ordre des niveaux de Monstres dans
  `data.lvlOrder` — chacun avec sa migration douce si absent (`migrateSectionOrder`/
  `migrateElementOrder`/`migrateLvlOrder` dans `src/utils.js`). Les blocs de texte
  eux-mêmes (dans Idées en vrac / Visuels / Matériel, séparés par `\n\n`) sont aussi
  réordonnables un par un via `BlockEditor`. Les grandes sections (et `data.sectionOrder`)
  sont aussi renommables par double-tap, comme les catégories de Visuels : le libellé
  complet (emoji inclus) est un seul champ `label` par entrée, édité via `EditableSection`
  (`src/components/EditableSection.js`) plutôt que le `Section` figé.
- **Règle globale, valable pour toute fenêtre/popup présente ou future** : elle se ferme
  en cliquant/tapant n'importe où en dehors, OU dès qu'on sélectionne autre chose (ex :
  cliquer sur un autre élément similaire ferme la première fenêtre et ouvre la sienne,
  sans avoir besoin de refermer explicitement). Géré une seule fois dans
  `src/components/Popup.js` via un `anchorRef` fourni par l'appelant : le ref doit
  englober à la fois le bouton/déclencheur et la popup, sinon cliquer le déclencheur
  pour la fermer la rouvrirait aussitôt (l'ancien onClick et le nouveau listener global
  entreraient en conflit). `Popup` accepte soit `items` (liste de choix, mode d'origine)
  soit `children` (contenu libre, ex: la fenêtre d'infos joueur du Plateau) — même
  fermeture au clic extérieur dans les deux cas.
- Tous les `<textarea>` en mode édition (`EditText` multiligne et `BlockEditor`)
  s'agrandissent automatiquement à la hauteur du texte (`autoGrow()` dans
  `src/utils.js`) — jamais de petite zone de texte à scroller en interne.
- Undo/redo en mode édition (boutons ↩/↪ à gauche du crayon, `src/components/UndoRedo.js`) :
  historique en mémoire géré dans `src/App.js` (pile `pastRef`/`futureRef`, 50 étapes max),
  remis à zéro à chaque nouveau chargement de données. Ne persiste pas entre les sessions.
- Le mode édition permet la modification de tout texte par double-tap.
- Activer/désactiver le mode édition déclenche un flash de 0.5s sur la grille de fond
  (déjà visible en continu en mode édition) : à l'entrée, montée rapide puis
  redescente un peu plus lente (glow) ; à la sortie, un clignotement (glitch) façon
  power-down. Le flash est un `::after` sur le même élément que le fond en grille
  (classes `.gridflash-in`/`.gridflash-out` dans `index.html`) pour rester pixel-aligné
  avec la grille même en scrollant — jamais un calque `position:fixed` séparé, qui
  désynchronise au scroll. Hook partagé `useEditFlash()` dans `src/utils.js`, conçu pour
  ne jamais rester bloqué même en activant/désactivant très rapidement (chaque bascule
  force une nouvelle classe, jamais un no-op).
- Garder le vocabulaire du jeu tel quel (ex: "Énergie" et pas "Combo" — choix de lore assumé).

## Bug connu — probablement résolu, à confirmer
Les sections s'affichaient vides hors mode édition. Cause trouvée : `ghGet` (lecture de
data.json depuis l'API GitHub) ne décodait pas correctement l'UTF-8 depuis le base64,
contrairement à `ghPut` (sauvegarde) — ça corrompait les caractères accentués à chaque
lecture, et notamment le champ `statut` ("Validé" devenait "ValidÃ©"), cassant le filtre
d'affichage qui compare une chaîne exacte. Corrigé dans `src/github.js` (helpers
`base64ToUtf8`/`utf8ToBase64` symétriques) + réparation ponctuelle de data.json déjà
corrompu. Gus a confirmé que ça fonctionne à nouveau après ce fix — si un bug d'affichage
similaire réapparaît, vérifier en premier si data.json contient du texte corrompu
(rechercher "Ã" dans le fichier).

## Système de jeu — plateau interactif (design validé, à implémenter par couches)
Philosophie générale : le plateau numérique est une **aide visuelle de confort**, jamais
un arbitre de règles. Comme IRL, les joueurs restent responsables de calculer et valider
leurs propres actions (PA, effets de sorts, etc.) — l'app ne comprend pas la sémantique
des cartes, elle affiche et laisse manipuler librement. Corollaire : **aucun compteur de
PA/déplacement n'est prévu** — mouvement des persos totalement libre sur la grille, sans
limite ni calcul côté app.

Recommandation d'implémentation : construire par couches testables séparément plutôt
qu'en un seul bloc (risque de régression difficile à isoler sinon) :
1. Grille + sélection/déplacement perso
2. Pioche/pose/rotation de tuiles
3. Items et multi-sélection par case (joueurs/monstres, sorts, énergies)
4. Mode Vision
5. Pan/zoom fin + undo/redo global

### Plateau et grille
- Plateau quadrillé, clics/taps uniquement sur des cases (jamais entre les cases).
- PV : compteur manuel par joueur, boutons `+1`/`-1`, actionnable sur soi-même ou sur un
  autre joueur (utile si AFK). Même esprit simple que le reste : aucun calcul, juste un tally.
- Dé : bouton qui lance un dé virtuel.
- Pas de compteur PA ni de compteur de déplacement — mouvement libre, à la charge des joueurs.

### Sélection et déplacement des personnages
- Sélectionner un perso (tap/clic simple) → surbrillance bleu glow.
- Cliquer/tap sur une case d'arrivée → le perso s'y déplace, sans limite de distance
  ni de coût compté par l'app.
- Le labyrinthe (tuiles) ne peut être manipulé que sur des cases sans joueur dessus —
  prévoir quand même un moyen de choisir explicitement "perso" vs "case" si les deux se
  chevauchent (cf. système de sélection par geste ci-dessous).

### Système de sélection par geste (résout l'ambiguïté multi-entités par case)
**Historique** : un premier design (double-tap/clic-droit/appui-prolongé *par couche*)
a été remplacé un temps par un système à un seul geste ("un tap sélectionne tout ce
qu'il y a sur la case, une fenêtre à colonnes départage s'il y a ambiguïté") — **Gus est
revenu dessus après l'avoir testé** ("remet le principe de sélection d'avant") : le geste
unique compliquait la suite (poser une tuile puis cliquer une pioche pour l'y ranger,
sélectionner une carte de la défausse, etc.). Design actuel, **un geste distinct par
type d'entité** (le plus fréquent = le geste le plus simple) :
- **Clic/tap simple** → joueurs et monstres (`handleSingleClick`, via `onContentClick`,
  qui retarde l'exécution de 250ms pour pouvoir l'annuler si un second clic arrive et
  se révèle être un double-clic — voir plus bas).
- **Double-clic/double-tap** → cases/tuiles (`onContentDoubleClick`, aussi bien pour
  poser une tuile tenue en main que pour sélectionner/déplacer une tuile déjà posée).
- **Appui long** → items (sorts/énergies), une fois qu'ils existeront sur le plateau
  (Couche 3, pas encore commencée) — pas de collision avec l'appui long des *pioches*
  dans le header (Diviser/Mélanger), qui est un geste séparé sur un élément différent.

Un double-clic ne touche jamais aux joueurs — il sert **exclusivement** à ramasser une
tuile déjà posée (`selectTileAt`, dans `onContentDoubleClick`), rien d'autre. Distinguer
un simple clic d'un double-clic sur le même élément demande un léger délai
(`clickTimerRef`, 250ms) : un double-clic déclenche aussi deux évènements `click` natifs
en plus du `dblclick`, donc le premier `click` est retenu brièvement — si un second
arrive à temps il l'annule et laisse `onDoubleClick` agir seul à sa place.

**Une fois qu'une carte est "en main" d'une façon ou d'une autre — tuile tenue depuis
une pioche (`heldTile`), carte prise dans la défausse (`selectedDiscardCardId`), ou
tuile ramassée par double-clic (`selectedTileId`) — un seul tap suffit pour la poser/
déplacer.** Gus est revenu sur une première version où ce second geste était aussi un
double-clic ("2 tap c'est juste pour sélectionner la carte") : sur une grille où on
bouge très souvent d'une seule case, le double-clic de déplacement retombait 3 fois sur
4 pile sur les 3 boutons d'option flottant à côté de la tuile (voir plus bas), qui
bloquaient alors le tap. Un simple clic les évite presque toujours. `handleSingleClick`
(via `onContentClick`) gère donc, dans cet ordre :
1. Mode Vision actif ? Bloque toute manipulation de carte (rien ne bouge tant qu'il est
   actif — voir plus bas) et ne gère que l'inspection de joueurs.
2. Une tuile tenue en main (`heldTile`) ? Ce tap la pose ici (si la case est libre).
3. Une carte de défausse sélectionnée (`selectedDiscardCardId`) ? Ce tap la pose ici
   (retirée de la défausse).
4. Une tuile déjà sélectionnée (`selectedTileId`) ? Ce tap la déplace ici (ou la
   désélectionne si c'est sa propre case ; bloqué si une autre tuile occupe déjà la case
   cible).
5. Sinon : sélection/déplacement de joueur, inchangé par rapport à avant ; plusieurs
   joueurs sur la même case → `cellPicker` (une simple liste de noms — plus besoin de
   colonnes par type puisque les tuiles ne passent plus jamais par ce picker).

**Désélection d'une carte (tuile ou carte de défausse) — règle globale** : re-taper la
même tuile, sélectionner autre chose (joueur, autre tuile), ou cliquer n'importe où dans
le header/pied de page (`clearCardSelection`, câblé sur leur `onClick` de fond — les
piles/défausse font `e.stopPropagation()` sur leur propre clic pour ne pas se faire
annuler leur propre action par ce même handler) désélectionne. Même esprit que la
fermeture au clic extérieur des popups.

**Règle d'occupation tuile/joueur** (toujours en vigueur : "une tuile ne peut être
manipulée que si aucun joueur n'est dessus") : `selectTileAt` refuse de sélectionner une
tuile si un joueur est présent sur la même case.

**Mode Vision = inspection pure, aucune carte ne bouge tant qu'il est actif** :
`onContentDoubleClick` et le bloc carte de `handleSingleClick` sont tous deux court-
circuités pendant que `visionMode` est vrai — impossible de ramasser une nouvelle tuile
ou de déplacer/poser celle déjà en main. `toggleVisionMode` désélectionne aussi
`selectedTileId`/`selectedDiscardCardId` à l'entrée (même geste que pour `selectedId`
déjà en place) pour ne pas laisser un glow de sélection sans aucun moyen d'agir dessus.
Une tuile *tenue* depuis une pioche (`heldTile`) n'est volontairement pas annulée à
l'entrée en mode Vision : elle attend simplement, non posable, jusqu'à la sortie du mode.

### Monstres traités comme des "joueurs"
Les monstres suivent le même système de sélection/déplacement que les joueurs (pas de
mécanique séparée à coder). Flux d'une rencontre :
1. Le joueur arrive sur une case monstre.
2. Il clique sur la pioche monstre, puis sur sa propre case → le monstre apparaît sur
   la case (traité désormais comme une entité "joueur" sélectionnable dessus).
3. Le joueur lance le dé (bouton dé).
4. S'il gagne, il fait une sélection prolongée sur la case pour cibler le monstre, puis
   clique sur la défausse pour le défausser.

### Pioche et pose de tuiles (labyrinthe) — Couche 2, implémentée
**Visuel des cartes** (`CardFace` dans `PlateauPage.js`) : une vraie carte carrée à deux
faces, dos tout noir / face blanche avec une croix noire, retournée via `rotateY` +
`backfaceVisibility:'hidden'` (`transformStyle:'preserve-3d'`) — réutilisé partout : pile,
tuile tenue en main, défausse (toujours face visible), tuiles posées sur la grille.
La pioche affiche un effet de perspective (deux carrés légèrement décalés derrière la
carte du dessus) et montre le dos tant qu'aucune carte n'est en main ; cliquer la pioche
retourne la carte du dessus (affiche sa face) et la tient en main — **recliquer la
même pioche pendant qu'on tient sa carte l'annule** : la carte retourne dans la pioche
et se remet dos visible (`drawFromPile` compare `heldTile.fromPileId` à la pioche
cliquée). Cliquer une AUTRE pioche pendant qu'on tient une carte ne fait rien (il faut
d'abord résoudre — poser, défausser, ou annuler — celle qu'on tient).
1. Un tap (clic simple) sur une case vide de la grille → pose la tuile tenue en main
   là — **un seul tap suffit**, pas un double-clic (voir "Système de sélection par
   geste" : Gus est revenu sur une version où poser/déplacer une carte en main prenait
   aussi un double-clic).
2. Double-clic sur une tuile déjà posée (sans joueur dessus) → la sélectionne. C'est le
   **seul** geste qui prend deux taps ici — une fois sélectionnée, la déplacer à
   nouveau ne prend plus qu'un tap (voir "Système de sélection par geste").
3. Une tuile sélectionnée affiche **juste 3 petits boutons autour d'elle**, sans
   agrandir la carte (une première version affichait une copie agrandie dans une
   fenêtre flottante séparée — Gus a demandé de l'enlever, "juste les options qui
   arrivent") : ↕️ (flip, affiche le dos), ⟳ (rotation 90° sens horaire, cliquable/
   spammable), ✕ rouge (défausse directement la tuile). Positionnés sur les **coins**
   de la tuile (haut-gauche, haut-droit, bas-droit) plutôt que sur ses arêtes
   cardinales (haut/gauche/droite) — une première version au milieu des arêtes plaçait
   les boutons quasiment pile sur le centre de la case voisine dans ces 3 directions,
   or déplacer d'une case (le mouvement de très loin le plus fréquent) vise justement ce
   centre-là, donc 3 fois sur 4 le tap de déplacement tombait sur un bouton au lieu de la
   grille. Le coin d'une case est à distance égale (une demi-diagonale, ~31px à
   CELL=44) de son propre centre ET du centre de n'importe laquelle des cases
   adjacentes (orthogonales ou diagonales) — le déplacement le plus courant ne peut donc
   jamais tomber pile sur un bouton, quelle que soit la direction prise. Rendus comme
   enfants du conteneur transformé (coordonnées `row*CELL`/`col*CELL`, pas une fenêtre
   `position:fixed` séparée) donc ils suivent naturellement le pan/zoom — un `zIndex`
   explicite les fait passer au-dessus des tuiles voisines malgré l'ordre du DOM (voir
   le piège de fenêtre invisible ci-dessous, résolu différemment cette fois : pas
   besoin de sortir du conteneur transformé, un simple z-index suffit puisque les
   tuiles voisines n'en ont pas et qu'un élément positionné avec z-index > 0 passe
   toujours au-dessus d'éléments positionnés à z-index:auto dans le même contexte
   d'empilement, quel que soit l'ordre du DOM). Tuile sélectionnée = léger glow bleu
   (même style que la sélection joueur), plutôt que la mise en évidence par opacité
   réduite d'une version antérieure.
   - Une tuile ne peut être sélectionnée (et donc manipulée) que si aucun joueur n'est
     dessus — voir la règle d'occupation dans "Système de sélection par geste" ci-dessus.
   - Cliquer une pioche pendant qu'une tuile (ou une carte de la défausse) est
     sélectionnée n'y pioche pas — ça ouvre un mini menu Dessus/Dessous pour l'y
     ranger, voir "Pioches et défausses" ci-dessous.
- Deck actuel : **100 cartes identiques (placeholder)**, en attendant de brancher la
  vraie pioche dynamique — voir note "Pioches dynamiques depuis le catalogue" ci-dessous.
- **Piège rencontré (fenêtre du menu pioche invisible)** : la mini-fenêtre Diviser/
  Mélanger de l'appui long sur une pioche s'affichait derrière la grille malgré son
  propre `zIndex`. Cause : le header n'avait aucun `position` explicite (donc `static`
  par défaut), et un élément `static` **ignore totalement son `zIndex`** — ajouter
  `position:'relative'` au header suffit à faire gagner sa pile d'empilement (et donc
  celle de ses popups enfants) au-dessus de la grille transformée (qui crée sa propre
  pile d'empilement via `transform`).

### Pioches et défausses (mécanique générique, s'applique à toute pioche/défausse du jeu) — implémentée pour les tuiles
- Tap/clic simple sur une pioche → pioche la carte du dessus (défausse non piochable).
- Appui long (500ms) sur une pioche → l'arme (glow bleu) et ouvre une mini fenêtre
  Diviser/Mélanger. Diviser coupe le paquet en deux **sans mélanger** (juste couper en
  deux piles, pas de rebrassage — corrige une version antérieure de cette note qui
  disait l'inverse). Mélanger rebrasse la pile sur place.
- Au lieu d'utiliser le menu, cliquer une **autre** pioche (ou la défausse) pendant
  qu'une pioche est armée fusionne celle-ci dans la cible — et là ça **rebrasse** le
  résultat (contrairement à Diviser). C'est comme ça qu'on peut diviser une pioche en
  deux puis les rassembler plus tard. La défausse elle-même n'est pas armable/divisible
  (elle n'est qu'une cible de fusion) — pas de menu long-press pour elle.
- **Fusion réservée au même type de carte** (`pile.type`, ex: `'case'` pour l'unique
  deck existant aujourd'hui) : `mergeArmedInto` refuse la fusion entre deux piles si
  leurs types diffèrent (pas de souci pratique tant qu'il n'y a qu'un seul type de
  deck, mais empêchera à l'avenir de mélanger des piles de sorts et d'énergies). Seule
  exception : fusionner dans la défausse reste toujours permis (bac commun non typé,
  puisqu'il n'existe qu'un seul type de carte pour l'instant).
- **Défausse = affiche sa carte du dessus, face visible** (jamais de dos — inutile de la
  retourner puisqu'elle est déjà connue), positionnée **juste sous la pioche** dans le
  header ; reste un carré à bordure pointillée seulement quand elle est vide. Cliquer sa
  carte du dessus la **sélectionne** (glow bleu, bascule si on reclique) — de là, elle
  peut être posée sur la grille (double-clic, comme une tuile tenue en main) ou renvoyée
  dans une pioche (voir menu Dessus/Dessous ci-dessous). Sélectionner une tuile sur la
  grille puis cliquer la défausse l'y envoie directement (équivalent au bouton ✕ de la
  tuile sélectionnée, juste un second point d'entrée pour le même geste).
- **Ranger une carte sélectionnée (tuile de la grille ou carte du dessus de la défausse)
  dans une pioche** : cliquer une pioche pendant qu'une carte est sélectionnée ouvre un
  mini menu **⬆️ Dessus / ⬇️ Dessous** (au lieu de piocher normalement) — le choix retire
  la carte de sa source (grille ou défausse) et l'ajoute à l'extrémité choisie de la
  pioche cible (`insertSelectedCardIntoPile`). Concrètement le seul geste qui, à ce
  stade, permet de remettre une carte défaussée en jeu ailleurs que directement sur la
  grille.
- **Piège rencontré (fusion de piles)** : la fenêtre Diviser/Mélanger de la pioche armée
  se ferme au clic extérieur (règle globale des popups) — mais ce clic extérieur, c'est
  justement le clic sur la pioche CIBLE qui doit déclencher la fusion. Le listener
  `pointerdown` global de la popup (attaché sur `document`) se déclenche pendant la
  phase de bulle **avant** l'évènement `click` (qui arrive après le `pointerup`), donc
  la pioche source était déjà désarmée (état React remis à `null`) au moment où le
  gestionnaire de clic de la cible s'exécutait — la fusion tombait silencieusement en
  pioche normale à la place. Remplacer la lecture de l'état React par une *ref* React
  n'a pas suffi non plus : `onPointerDown` de la CIBLE (délégué par React à la racine,
  donc atteint plus tôt dans la remontée de bulle) se déclenche bien avant le listener
  `document` de la popup de la source, donc capturer la valeur armée à CE moment-là
  (`pendingArmedRef`, dans `PileStack`) fonctionne — mais il fallait aussi **passer
  cette valeur capturée en argument explicite** à `mergeArmedInto` plutôt que la
  fonction ne relise elle-même la ref au niveau du parent (qui, elle, est déjà repassée
  à `null` par la désarmement de la source à ce moment).

### Pioches dynamiques depuis le catalogue (pas encore implémenté)
Idée validée pour une prochaine passe : au lieu des 100 cartes identiques actuelles,
générer la vraie pioche de cases depuis `data.cases` — un exemplaire de carte par unité
de `quantite`, en ne prenant que les entrées avec le statut **Validé** (pastille verte).
Modifier une quantité dans le catalogue et relancer une partie change directement la
composition de la pioche, sans code à toucher. Même principe prévu plus tard pour les
pioches de sorts et d'énergies (`data.sorts`/`data.energies`).

### Undo/redo global
Boutons retour/avancer pour annuler des actions accidentelles (ex: mélange non
désiré). Réutiliser si possible le composant `UndoRedo` déjà construit pour le mode
édition (`src/components/UndoRedo.js`) plutôt que redévelopper un système d'historique
séparé — à évaluer techniquement selon la nature des actions de jeu (probablement un
historique distinct de celui du mode édition, mais même pattern UI/logique réutilisable).
Pas encore fait pour les actions de tuiles/pioches (piocher, poser, tourner, diviser,
mélanger, fusionner) — seul l'undo des joueurs/PV/déplacements existe pour l'instant.

### Mode Vision (affichage détaillé d'une carte/entité)
Bouton "œil" en bas à droite de l'écran (footer du Plateau, juste à gauche de la
flèche `›`). Une fois activé, toute sélection (case, perso, monstre, item) affichera
le texte complet de la carte en grand plutôt que d'exécuter l'action normale associée
à la sélection — ex: sélectionner un monstre en mode Vision affichera ses stats et
récompenses en plein écran, au lieu du menu d'action habituel. **Ce volet "révèle le
contenu des cartes" n'est pas encore codé** (dépend des items/cartes-sur-case de la
Couche 3, pas encore présents) ; en revanche l'**ambiance visuelle du toggle est
implémentée** : overlay bleuté sur les lignes de la grille du Plateau (même dégradé
répété que le fond de grille, teinté bleu par-dessus, cf. `visionGridStyle` dans
`PlateauPage.js`), avec un effet glitch inspiré du mode édition à l'activation/
désactivation. Contrairement au flash du mode édition (transitoire, retombe à 0),
la teinte du mode Vision **reste visible tant qu'il est actif** : pic à 50% d'opacité
pendant le clignotement d'entrée puis stabilisation à 25% en continu, glitch
inverse (mêmes paliers que le clignotement de sortie du mode édition, adapté à ces
valeurs) pour repasser à 0 à la désactivation. Nouveau hook dédié `useVisionFlash`
dans `src/utils.js` (même schéma "classe fraîche à chaque bascule" que
`useEditFlash`, mais sans le retomber-à-0 puisque l'état doit persister — pas de
modification de `useEditFlash` lui-même). Classes CSS `visionflash-in`/
`visionflash-out` dans `index.html`. Quelques traits fins blancs/gris de l'interface
(bordures des boutons du header/pied de page) passent en bleu (`rgba(79,163,255,.5)`)
tant que le mode est actif, pour renforcer l'ambiance (helper `borderColor()` dans
`PlateauPage.js`).

### Pan et zoom
- Mobile : glisser (tap qui traverse plusieurs cases, cf. seuils ci-dessus) pour
  déplacer la vue ; pincer à deux doigts pour zoomer/dézoomer.
- PC : cliquer-glisser pour déplacer la vue ; molette ou geste trackpad pour zoomer.
- **Implémenté sur la Couche 1** (`PlateauPage.js`) : zoomé/dézoomé vers un point de
  focus (le point sous la souris pour la molette, le milieu des deux doigts pour le
  pincement). Le zoom applique un simple **`transform:scale(zoom)`** (origine `0 0`) sur
  le conteneur de contenu — celui-ci garde une taille CSS fixe (`COLS*CELL`×`ROWS*CELL`)
  et un fond de grille calculé **une seule fois** (constante de module `GRID_BG`, jamais
  régénéré) ; jetons et overlay Vision restent eux aussi en coordonnées `CELL` fixes,
  tout est mis à l'échelle ensemble par le transform. Grosse simplification par rapport
  à une première version qui recalculait une taille de cellule effective (`CELL * zoom`)
  et régénérait le dégradé CSS de la grille à chaque tick de zoom : en plus d'être plus
  cher (gros reparse/repaint du fond à chaque évènement, en plus du re-rendu React), ça
  provoquait le vrai bug rapporté ("les traits de la grille clignotent/disparaissent") —
  un `repeating-linear-gradient` régénéré à une taille de cellule fractionnaire (ex:
  59.4px) produit des artefacts d'arrondi sous-pixel sur les jonctions du motif. Un
  transform ne fait que mettre à l'échelle un rendu déjà calculé proprement (à 44px, une
  taille "propre") — le navigateur s'en charge sur le GPU, aucun artefact, et le
  `scrollWidth`/`scrollHeight` du conteneur scrollable s'ajuste automatiquement à la
  taille visuelle transformée (confirmé empiriquement, pas besoin d'un conteneur
  intermédiaire dédié à la taille mise à l'échelle). Pincement tactile détecté via
  Pointer Events (`pointersRef`, une `Map` de pointeurs actifs par
  `pointerId`) — ne démarre qu'au **deuxième** doigt, laissant le scroll tactile natif à
  un seul doigt intact ; `setPointerCapture` est protégé par un `try/catch` (peut échouer
  sans casser le suivi du pincement). Pendant un pincement, le point-monde visé est capturé
  **une seule fois** au début du geste (`pinchRef.current.world`, via `worldPointAt()`) et
  réutilisé à chaque `pointermove` — recalculer ce point à partir du milieu courant des
  deux doigts à *chaque* évènement dériverait, car un pincement réel envoie le déplacement
  de chaque doigt comme un `pointermove` séparé (pas simultané), donc un recalcul à chaud
  lirait transitoirement une paire de doigts "à moitié mise à jour".
  **Piège rencontré (x2)** :
  1. La molette (`onWheel` en prop React) est attachée en écouteur *passif* par défaut,
     donc `preventDefault()` y échoue silencieusement (le navigateur scrollait quand même
     en plus du zoom) — corrigé en attachant l'écouteur `wheel` nous-mêmes via
     `addEventListener(..., {passive:false})` dans un `useEffect`, plutôt que la prop JSX
     `onWheel`.
  2. Le recalcul de `scrollLeft`/`scrollTop` après un changement de zoom était fait via
     `requestAnimationFrame` (le temps que React re-rende à la nouvelle taille) — bug réel
     découvert en testant une rafale rapprochée d'évènements tactiles (ex: un pincement
     réel, où chaque doigt déclenche son propre `pointermove`) : React regroupe plusieurs
     mises à jour de zoom survenues dans le même tick en un **seul** re-rendu, qui peut se
     produire *après* que tous les callbacks `requestAnimationFrame` déjà programmés se
     soient exécutés. Chacun lisait/écrivait alors `scrollLeft` contre la taille **encore
     ancienne** du contenu, donc le navigateur bornait silencieusement la valeur au max de
     scroll d'avant — la vue "sautait" à cette position bornée et y restait une fois le
     redimensionnement enfin appliqué (symptôme observé : "ça se déplace dans tous les
     sens" pendant un pincement). Corrigé en remplaçant le `requestAnimationFrame` par un
     `useLayoutEffect` (nécessite `useLayoutEffect` dans `src/react.js`, ajouté aux exports)
     déclenché par un compteur dédié `scrollTick` (pas directement `zoom` : une fois le zoom
     bloqué à `MIN_ZOOM`/`MAX_ZOOM`, des appels répétés passent la même valeur et React
     n'aurait pas re-rendu, donc pas déclenché l'effet, alors que le point du pincement peut
     continuer à dériver même une fois le zoom saturé) — un effet de layout ne s'exécute
     qu'après que le DOM reflète déjà le nouveau `effectiveCell`, donc `scrollWidth`/
     `scrollHeight` sont toujours à jour et rien n'est borné par erreur.

## Roadmap version jouable (multi-étapes)
1. **Version hotseat locale** — un seul écran, les joueurs passent le tour à
   tour de rôle. Objectif : valider que les mécaniques digitalisées marchent
   avant d'ajouter la couche réseau. Voir section "Système de jeu — plateau
   interactif" ci-dessus pour le détail complet du design validé.
   - **Couche 1 (grille + sélection/déplacement perso) : implémentée**, page
     `src/pages/PlateauPage.js`, accessible depuis le bouton "🎮 Jouer" de la
     home page (n'est plus un WIP désactivé). Présentation façon jeu vidéo :
     header sticky en haut (← Retour, titre "Plateau", puis à droite un bouton
     "⟲ Reset" et les boutons undo/redo — le header accueillera plus tard les
     pioches/défausses de tuiles), pied de page sticky en bas (flèches ‹/›
     géantes dans les coins extrêmes pour changer de "joueur courant", puis au
     centre : dé, cœur de PV avec −/+), et une grille **grande (100×100 cases,
     44px/case) entre les deux**, dans son propre conteneur `overflow:auto`
     scrollable/pannable indépendamment du reste (le header/footer ne bougent
     jamais). La page utilise `height:100dvh` (pas `100vh`) sur son conteneur
     racine : sur mobile, `100vh` inclut la zone que la barre d'adresse du
     navigateur occupe/libère en scrollant, ce qui faisait apparaître/
     disparaître le header et le pied de page selon que la barre d'adresse
     était visible ou non — `dvh` (dynamic viewport height) suit la vraie
     hauteur visible et corrige ça.
     Origine de la grille recentrée : les joueurs apparaissent au centre du
     tableau (case `(50,50)` sur 100×100) plutôt qu'en haut à gauche, et la vue
     défile automatiquement pour centrer ce point au chargement — autant
     d'espace pour se déplacer dans les 4 directions dès le départ, plutôt que
     de n'avoir de la place qu'en bas/à droite.
     Rendu perf : pas de 10 000 `<div>` de cellule — la grille est un simple
     fond CSS en dégradés répétés (même technique que `editBgStyle`) et les
     jetons joueurs sont positionnés en absolu par calcul (`row*CELL`,
     `col*CELL`), le clic sur la case cible est déduit des coordonnées du
     clic relatives au conteneur (`getBoundingClientRect`), pas d'un handler
     par case. Pan à la souris (clic-glisser, ajuste `scrollLeft`/`scrollTop`
     manuellement) géré séparément du pan tactile (scroll natif du navigateur,
     ne pas dupliquer la logique pour `pointerType==='touch'`) ; un drag de
     souris au-delà d'un petit seuil (3px) est mémorisé (`wasDraggingRef`) pour
     que le clic de relâchement qui suit ne déclenche pas un déplacement de
     perso non désiré. Sélection/déplacement perso inchangés (tap simple =
     sélection avec glow bleu, second tap = déplacement libre). **Multi-sélection
     par case : implémentée pour les joueurs** — si plusieurs joueurs sont sur
     la même case, une petite popup (`cellPicker`, positionnée aux coordonnées
     brutes du clic, hors du système de pan/zoom transformé) liste leurs noms
     (avec la couleur en pastille) pour choisir explicitement lequel
     sélectionner ; se ferme comme toute popup au clic extérieur. La fenêtre
     de choix joueurs/**monstres** (deux colonnes) de "Système de sélection
     par geste" attend toujours les monstres de la Couche 3.
     Barre des joueurs façon "groupe Dofus" : colonne collée à **droite**
     de l'écran, centrée verticalement, un carré par joueur (fond = couleur du
     joueur en attendant un visuel par personnage, nom éditable par double-clic
     via `EditText`, cœur rouge avec PV en coin, ✕ pour retirer) + bouton `+`
     (`AddBtn`) en bas de la colonne pour ajouter un joueur ("Joueur N" par
     défaut, PV de base = 3, apparaît au centre de la grille). Cliquer un
     carré ouvre une fenêtre d'infos (`Popup` en mode `children`, ouverte vers
     la **gauche** du carré puisque la colonne est collée au bord droit de
     l'écran — sinon elle sortirait de l'écran) qui
     affichera plus tard les sorts/énergies du joueur — pour l'instant un
     simple message d'attente. Quand il n'y a aucun joueur, le texte "Ajoute
     un joueur" du pied de page est lui-même cliquable pour en créer un.
     **Bornée à l'espace entre header et pied de page** (`sidebarBounds`,
     mesuré via `viewportRef.getBoundingClientRect()` — la grille occupe déjà
     exactement cet espace, pas besoin de refs séparées sur le header/footer) :
     une première version centrait la colonne sur `top:'50%'` de tout
     l'écran, sans tenir compte de la hauteur réelle du header ni du nombre de
     joueurs — avec assez de joueurs, la colonne débordait par-dessus le
     header en haut et carrément hors écran en bas. Les carrés rétrécissent
     maintenant dynamiquement (`squareSize`, plancher 40px) pour tenir dans
     l'espace mesuré, et si même le plancher ne suffit pas, la colonne devient
     scrollable (`overflowY:'auto'`) plutôt que de continuer à déborder.
     Le dé est **par joueur** (`player.dice`, pas un état global partagé) : le
     pied de page affiche et fait lancer le dé du joueur courant uniquement,
     donc passer au joueur suivant (flèches ‹/›) affiche son propre dernier
     lancer (ou aucun s'il n'a pas encore lancé), indépendamment des autres.
     Les flèches ‹/› changent quel joueur est "courant" (celui dont le cœur/PV
     et le dé s'affichent dans le pied de page, et plus tard ses sorts/
     énergies) — c'est indépendant de la sélection de déplacement sur la
     grille. Bouton Reset dans le header : ouvre une popup de confirmation
     (Oui/Non) avant de vider tous les joueurs et l'historique — jamais de
     reset silencieux. Undo/redo (header, à droite) : historique séparé de
     celui du mode édition (pile locale à `PlateauPage`, même pattern que
     `App.js`), capture chaque ajout/retrait de joueur, changement de PV et
     déplacement (pas les tirs de dé, ni le changement de joueur courant, ni
     le reset — non significatifs à annuler, et le reset a déjà sa propre
     confirmation).
     État de partie (joueurs, joueur courant) persisté en **`localStorage`**
     (clé `labyrinthe_organic_plateau_v1`), volontairement **hors `data.json`** :
     c'est un état de session de jeu local à l'appareil (hotseat = un seul
     écran), pas une donnée de catalogue partagée via GitHub — évite de
     spammer des commits à chaque déplacement/tir de dé et évite les conflits
     si data.json est édité en parallèle. Pas encore de visuels de personnages
     (roster à venir avec un visuel par personnage, images à uploader dans le
     repo, convention de nommage à définir avec Gus une fois les images
     prêtes) : simple carré/rond de couleur avec initiale en attendant.
   - Pan/zoom (souris/molette, tactile/pincement) : **implémenté** en avance sur la
     Couche 5, directement sur la Couche 1 — voir "Pan et zoom" ci-dessus.
   - Mode Vision : **ambiance visuelle du toggle + affichage détaillé des joueurs
     implémentés**, en avance sur la Couche 4. Cliquer un jeton en mode Vision
     ouvre une grande fenêtre (nom, cœur de PV, section Sorts & Énergies —
     placeholder pour l'instant) au lieu de sélectionner pour déplacement ;
     croix rouge en haut à droite pour fermer (en plus de la fermeture au clic
     extérieur, comme toute popup). C'est la future base d'affichage des
     cartes sort/énergie. Le volet "affiche le contenu détaillé d'une
     case/tuile" attend toujours les items de la Couche 3.
   - **Couche 2 (pioche/pose/rotation/déplacement/défausse de tuiles) : implémentée** —
     voir "Pioche et pose de tuiles" et "Pioches et défausses" ci-dessus pour le détail
     complet (deck placeholder de 100 cartes identiques avec vrai visuel de carte
     recto/verso, diviser/mélanger/fusionner les piles — fusion réservée au même type —,
     poser/tourner/flipper/déplacer/défausser une tuile via de simples boutons en place
     autour d'elle, défausse à carte face visible et sélectionnable, menu Dessus/Dessous
     pour ranger une carte sélectionnée dans une pioche). Le système de sélection par
     case est passé par deux itérations : un premier essai à geste unique ("un tap
     sélectionne tout ce qu'il y a sur la case") a été testé puis **abandonné par Gus**
     au profit d'un retour au système à gestes distincts par type d'entité (clic simple
     = joueurs/monstres, double-clic = cases/tuiles, appui long = items) — voir
     "Système de sélection par geste" ci-dessus pour le détail actuel. Reste : brancher
     la vraie pioche dynamique depuis `data.cases` (voir "Pioches dynamiques depuis le
     catalogue").
   - Couche 3 (items/multi-sélection par case pour sorts/énergies au sol) et le
     contenu détaillé du mode Vision pour les cases/tuiles (Couche 4) : pas encore
     commencées. Undo/redo global au-delà de celui déjà en place pour les
     joueurs/PV/déplacements (pas les actions de tuiles/pioches) : pas encore fait.
2. **Version en ligne entre amis** — choix arrêté : **boardgame.io** (librairie
   JS open source pour jeux de plateau tour par tour, intégrée directement dans
   l'app, pas un service externe) pour la gestion des tours et la synchronisation
   d'état entre joueurs, combinée à **Firebase Realtime Database ou Supabase**
   (gratuit en usage léger) pour l'hébergement temps réel.
   - Avantage décisif par rapport à un serveur perso : tourne dans le cloud,
     aucun appareil (PC ou téléphone) de Gus à garder allumé pendant la partie.
   - Chaque action d'un joueur sur le plateau (déplacement, pose de tuile, etc.)
     est propagée en live à tous les autres joueurs connectés à la même partie.
   - Contrôle total conservé : ce n'est pas un site `.io` externe auquel on
     adapte le jeu, c'est une brique technique intégrée à l'app existante
     (même repo, même design, même data.json).
   - Modifications de `data.json` (cartes, règles) : s'appliquent immédiatement
     à toutes les *nouvelles* parties lancées après la modif. Pas besoin de
     figer les règles par partie en cours — Gus a confirmé qu'il ne changera
     jamais les règles pendant qu'une partie est en cours, donc pas de
     mécanisme de verrouillage à développer pour l'instant (noté dans les
     notes de soirée proto si besoin futur).
   - Ancienne piste abandonnée : serveur Node.js perso (Colyseus) sur PC/tunnel
     Cloudflare — remplacée par l'approche cloud ci-dessus, plus simple et sans
     contrainte de disponibilité matérielle.

## Fonctionnalités en attente / roadmap
- Barre de filtre rapide par statut (pastilles colorées, filtre toutes les sections en même temps)
- Déplacer le bouton Déconnexion en bas de page, après les boutons d'action principaux
- Corriger l'affichage de l'icône power sur mobile
- Mode simulation de playtest jouable dans l'app
- Bots / IA pour tester les mécaniques en solo
- Mode d'affichage/jeu de cartes façon playingcards.io

## Auto-maintenance de ce fichier
À la fin de chaque session de travail (ou avant de clore une tâche significative :
nouvelle fonctionnalité terminée, bug résolu, changement d'archi ou de convention),
relis ce fichier et mets-le à jour toi-même si des sections sont devenues obsolètes
(roadmap, bug connu, architecture). Pas besoin que Gus le demande explicitement.

## Déploiement en continu
Le site est servi depuis la branche `main` (GitHub Pages). Pousser directement
sur `main` après chaque modif validée — pas besoin de demander confirmation
avant chaque mise en ligne, Gus veut voir les changements en direct. Toujours
tester (navigateur headless local) avant de pousser.

## Comment travailler avec Gus
- Communique de façon directe et itérative, apprécie les avis honnnêtes sur les
  choix de design.
- A de bonnes intuitions de design — ne pas pousser des simplifications ou
  changements de nom sans raison solide.
- Préfère un rythme de jeu fluide (ex: a rejeté plusieurs cases neutres au profit
  d'une seule, pour garder le tempo).
