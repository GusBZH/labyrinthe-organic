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
arrive à temps **sur la même case**, il l'annule et laisse `onDoubleClick` agir seul à
sa place ; sur une case **différente**, ce n'est pas un double-clic possible, donc le
premier clic est exécuté immédiatement (au lieu d'être silencieusement perdu) avant de
programmer normalement le second. `clickTimerRef` retient donc `{row, col, ...}` en plus
du timer, pas juste le timer seul.
- **Bug corrigé (joueur ET tuile restaient sélectionnés en même temps)** : Gus tapait un
  joueur puis une case d'arrivée assez vite (moins de 250ms d'écart, un rythme de jeu
  normal) — le second tap **annulait silencieusement** le premier (peu importe la case,
  la version précédente ne vérifiait pas qu'il s'agissait de la même case), donc le
  joueur ne bougeait jamais et restait sélectionné ; le tap suivant retombait alors sur
  la logique de tuile/carte au lieu de la logique joueur. Le check same-cell ci-dessus
  règle le symptôme, mais exécuter le premier clic "en avance" (avant l'expiration du
  timer) a révélé un second piège React classique : `handleSingleClick` planifié via
  `setTimeout` ferme sur les variables d'état de SON rendu d'origine — si un clic
  intercalé change `selectedId`/`selectedTileId`/etc. entre la programmation et
  l'exécution du timer, le callback différé lit quand même les **anciennes** valeurs
  (une fonction JS capturée par closure ne se "rafraîchit" jamais toute seule, même
  après un re-render). Fixé avec `liveRef`, un objet ref réhydraté à **chaque** rendu
  (`useEffect` sans tableau de dépendances) et lu par `handleSingleClick` à la place des
  variables d'état directes — contrairement à une closure, un ref est un objet mutable
  partagé, donc même un `handleSingleClick` "périmé" (capturé par un timer d'un rendu
  précédent) lit sa valeur `.current` à jour au moment de l'exécution. `commitPlayers`
  lit aussi `liveRef.current.players` plutôt que sa propre closure `players`, pour la
  même raison (sinon l'historique undo/redo pourrait pousser un ancien instantané).

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
4. Une tuile déjà sélectionnée (`selectedTileId`) ? Selon son **mode**
   (`selectedTileMode`, `'placed'` ou `'moving'`) :
   - `'moving'` (tuile déjà posée re-sélectionnée par double-clic) : ce tap la déplace
     ici (ou la désélectionne si c'est sa propre case ; bloqué si une autre tuile
     occupe déjà la case cible) — comportement inchangé.
   - `'placed'` (tuile qui vient juste d'être posée depuis une pioche/défausse par ce
     même geste) : **n'importe quel tap désélectionne seulement, ne déplace jamais**.
     Idée de Gus : ce mode "n'autorise que la rotation" — juste le bouton rotation et
     le glow bleu, pas flip/défausse, pas de déplacement au clic ailleurs — pour
     pouvoir orienter une tuile qu'on vient de poser sans risquer de l'envoyer ailleurs
     par un tap perdu. Posé une seule fois (`setSelectedTileMode('placed')` juste après
     la pose), la tuile repasse en mode normal (`'moving'`, tous les boutons) dès
     qu'elle est re-sélectionnée plus tard par double-clic.
5. Sinon : sélection/déplacement de joueur, inchangé par rapport à avant ; plusieurs
   joueurs sur la même case → `cellPicker` (une simple liste de noms — plus besoin de
   colonnes par type puisque les tuiles ne passent plus jamais par ce picker). Cette
   popup est volontairement **plus grande que le style de popup par défaut**
   (`.popup-item`) : elle existe justement pour trancher facilement une ambiguïté, donc
   ses cibles de tap doivent être les plus faciles de l'appli à toucher, pas la taille
   compacte partagée avec les menus Diviser/Mélanger. `Popup` accepte maintenant un
   `itemStyle` optionnel (fusionné sur le style de chaque item, en plus de la classe
   partagée) pour ce genre de cas — sans toucher à `.popup-item` globalement, qui reste
   la taille par défaut pour tous les autres popups de l'appli.

**Désélection d'une carte (tuile ou carte de défausse) — règle globale** : re-taper la
même tuile, sélectionner autre chose (joueur, autre tuile), ou cliquer n'importe où dans
le header/pied de page (`clearCardSelection`, câblé sur leur `onClick` de fond — les
piles/défausse font `e.stopPropagation()` sur leur propre clic pour ne pas se faire
annuler leur propre action par ce même handler) désélectionne. Même esprit que la
fermeture au clic extérieur des popups.

**Règle d'occupation tuile/joueur** (toujours en vigueur : "une tuile ne peut être
manipulée que si aucun joueur n'est dessus") : `selectTileAt` refuse de sélectionner une
tuile si un joueur est présent sur la même case.

**Une seule chose sélectionnée à la fois** : sélectionner une tuile (`selectTileAt`),
piocher une carte (`drawFromPile`), ou sélectionner une carte de la défausse
(`toggleSelectDiscardCard`) désélectionne aussi un joueur en cours de sélection
(`setSelectedId(null)`), et inversement sélectionner un joueur retombe toujours dans une
branche de `handleSingleClick` déjà garantie sans tuile/carte sélectionnée (ces cas sont
vérifiés — et sortent avec `return` — plus tôt dans la même fonction). Ajouté après que
Gus a suggéré cette règle comme piste pour le bug ci-dessus : sans elle, double-cliquer
une tuile pendant qu'un joueur était sélectionné ailleurs laissait légitimement les DEUX
sélectionnés en même temps (pas un bug à proprement parler, juste un état jamais prévu
comme normal) — source probable de confusion ("je sais plus ce qui est sélectionné").

**Bug corrigé (un tap sur une case au hasard puis un tap rapide sur une case DIFFÉRENTE
avec une tuile sélectionnait quand même la tuile)** : Gus a remarqué qu'un simple clic
sur une case vide suivi, assez vite, d'un simple clic sur une case avec une tuile posée
ailleurs sélectionnait cette tuile — alors qu'aucun double-clic n'avait été fait sur
elle, un seul tap y avait atterri. Cause : toute la grille est UN SEUL élément DOM
`content` (pas de `<div>` par case, choix de perf assumé — voir la note de rendu dans la
Couche 1 plus bas) ; le `dblclick` **natif** du navigateur ne vérifie que "même élément
DOM cible + dans la fenêtre de temps/distance OS", il n'a aucune notion de "case". Deux
clics simples sur des cases logiquement différentes peuvent donc déclencher un vrai
`dblclick` natif si le timing colle, et `onContentDoubleClick` s'en servait pour
sélectionner la tuile sous les coordonnées du DEUXIÈME clic — la vérification "même
case" de `clickTimerRef` (voir plus haut) ne protège que la logique de clic simple de
l'appli elle-même, elle n'a aucun pouvoir sur la décision du navigateur d'émettre ou non
l'évènement `dblclick`. Fix : `lastClickCellRef` (dernière case cliquée) et
`sameCellStreakRef` (recalculé à CHAQUE `onContentClick`, donc toujours à jour avant
qu'un `dblclick` éventuel ne suive, puisqu'un `dblclick` natif est toujours précédé de
ses deux `click` — comparé à la case du clic PRÉCÉDENT avant d'écraser
`lastClickCellRef`) ; `onContentDoubleClick` rejette maintenant tout `dblclick` natif
tant que `sameCellStreakRef.current` n'est pas vrai, sans toucher au reste de la logique
existante (un vrai double-tap sur la même case continue de fonctionner normalement,
vérifié explicitement en test).

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
3. Une tuile sélectionnée affiche **juste les boutons pertinents autour d'elle**, sans
   agrandir la carte (une première version affichait une copie agrandie dans une
   fenêtre flottante séparée — Gus a demandé de l'enlever, "juste les options qui
   arrivent") : icône flip fine (affiche le dos), icône rotation fine (rotation 90°
   sens horaire, cliquable/spammable), ✕ rouge (défausse directement la tuile) — ces
   deux derniers seulement en mode `'moving'`, voir "Système de sélection par geste"
   pour le mode `'placed'` qui n'affiche que la rotation. Icônes flip/rotation en SVG
   trait fin (`FlipIcon`/`RotateIcon`) plutôt qu'en emoji (⟳/↕️) : un glyph emoji n'est
   pas centré de la même façon dans sa propre boîte de caractère selon la police/OS,
   ce qui rendait la flèche de rotation visiblement décentrée dans son cercle — un SVG
   avec un `viewBox` explicite est toujours centré à l'identique partout,
   `stroke:'currentColor'` pour hériter la couleur du bouton. Positionnés sur les **coins**
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
- Deck actuel : **100 cartes identiques (placeholder)** par type (cases/sorts/énergies,
  `makeDeck(type)`), en attendant de brancher la vraie pioche dynamique — voir note
  "Pioches dynamiques depuis le catalogue" ci-dessous.
- **Piège rencontré (fenêtre du menu pioche invisible)** : la mini-fenêtre Diviser/
  Mélanger de l'appui long sur une pioche s'affichait derrière la grille malgré son
  propre `zIndex`. Cause : le header n'avait aucun `position` explicite (donc `static`
  par défaut), et un élément `static` **ignore totalement son `zIndex`** — ajouter
  `position:'relative'` au header suffit à faire gagner sa pile d'empilement (et donc
  celle de ses popups enfants) au-dessus de la grille transformée (qui crée sa propre
  pile d'empilement via `transform`).
- **Piège rencontré (le même symptôme est revenu après ce fix)** : Gus a revu la
  fenêtre cachée derrière la grille malgré le fix ci-dessus. Cause réelle, différente
  cette fois : la rangée de pioches dans le header a `overflowX:'auto'` (pour scroller
  horizontalement s'il y a beaucoup de pioches) — et la spec CSS overflow **force
  silencieusement `overflow-y` à `'auto'` aussi** dès que `overflow-x` n'est pas
  `'visible'` (impossible d'avoir l'un scrollable et l'autre visible en même temps).
  La mini-fenêtre (positionnée `top:'100%'` par rapport à sa pioche, donc DANS cette
  rangée) était donc invisiblement rognée par ce `overflow-y:'auto'` implicite dès
  qu'elle dépassait la hauteur de la rangée — un problème de *clipping*, pas de
  z-index, donc totalement indépendant du fix `position:relative` précédent (qui
  réglait une couche différente : header vs grille, pas rangée-de-pioches vs
  contenu-qui-déborde-en-dessous). Fix : les 3 popups concernées (Diviser/Mélanger
  des pioches, Mélanger de la défausse, Dessus/Dessous) passent maintenant en
  `position:'fixed'` avec des coordonnées écran calculées en JS
  (`anchorRef.current.getBoundingClientRect()` au moment de l'ouverture, stockées
  dans un state `menuPos`) au lieu du positionnement CSS relatif `top:'100%'` — un
  élément `position:fixed` échappe au clipping `overflow` de ses ancêtres (tant
  qu'aucun d'eux n'a de `transform`, ce qui n'est pas le cas ici), exactement comme
  `cellPicker`/la modale Vision le font déjà avec succès. `anchorRef` reste inchangé
  (toujours nécessaire pour la fermeture au clic extérieur de `Popup`, indépendante
  du positionnement visuel).

### Pioches et défausses (mécanique générique, s'applique à toute pioche/défausse du jeu) — implémentée pour les tuiles
- **Pioches et défausse totalement inertes tant qu'une tuile est en mode `'placed'`**
  (voir "Système de sélection par geste" pour ce mode) : Gus a signalé qu'après avoir
  posé une tuile (mode rotation-only), cliquer une pioche ou la défausse ouvrait quand
  même le menu Dessus/Dessous ou défaussait directement — alors que ce mode est censé
  n'autoriser QUE la rotation. `PileStack`/`DiscardSlot` reçoivent maintenant une prop
  `disabled` (vraie quand `selectedTileMode==='placed'`, calculée une fois dans
  `PlateauPage` sous le nom `pilesDisabled`) : `onPointerDown` (donc l'armement par
  appui long) et `handleClick` retournent immédiatement si `disabled`. Le clic bloqué
  ne fait PAS `e.stopPropagation()` (contrairement au comportement normal) — il remonte
  donc jusqu'au `onClick:clearCardSelection` du header/pied de page, qui désélectionne
  la tuile en mode `'placed'`, exactement comme cliquer n'importe où en dehors d'une
  sélection le fait déjà ailleurs dans l'appli. `hasSelectedCard`/`hasSelectedTile`
  excluent aussi ce mode de leur calcul (une tuile en mode `'placed'` ne compte pas
  comme "sélectionnée" pour ces deux props), par cohérence avec le blocage — même si
  `disabled` est ce qui bloque réellement le clic dans tous les cas.
- Tap/clic simple sur une pioche → pioche la carte du dessus (défausse non piochable).
- Appui long (500ms) sur une pioche → l'arme (glow bleu) et ouvre une mini fenêtre
  Diviser/Mélanger. Diviser coupe le paquet en deux **sans mélanger** (juste couper en
  deux piles, pas de rebrassage — corrige une version antérieure de cette note qui
  disait l'inverse). Mélanger rebrasse la pile sur place.
- Au lieu d'utiliser le menu, cliquer une **autre** pioche (ou la défausse) pendant
  qu'une pioche est armée fusionne celle-ci dans la cible — et là ça **rebrasse** le
  résultat (contrairement à Diviser). C'est comme ça qu'on peut diviser une pioche en
  deux puis les rassembler plus tard.
- **La défausse elle-même est aussi armable par appui long** (glow bleu, même mécanisme
  partagé `armPile('discard')`/`armedIdRef` que les pioches) — ouvre une mini fenêtre
  avec juste **🔀 Mélanger** (pas de Diviser : la défausse n'a pas de notion de "moitié"
  à séparer). Cliquer une pioche pendant que la défausse est armée fusionne **toute la
  défausse** dans cette pioche (rebrassée), permettant de recycler des cartes défaussées
  en un geste plutôt qu'une par une via le menu Dessus/Dessous. `mergeArmedInto` traite
  `sourceId === 'discard'` comme un cas à part (puise dans `discardCards` plutôt que
  dans `piles`, vide `discardCards` après fusion) — même exception de type que la
  fusion *vers* la défausse : aucune vérification de type, puisque la défausse ne suit
  pas de type par carte individuelle. Un appui long ne s'arme pas si la défausse est
  vide, ni si une tuile est déjà sélectionnée sur la grille (le tap rapide y aurait un
  autre sens : la défausser directement).
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

### Undo/redo global — implémenté pour tout l'état persisté du plateau, y compris Reset
Boutons retour/avancer (composant `UndoRedo` déjà utilisé pour le mode édition,
`src/components/UndoRedo.js`, mais historique **séparé** — `pastRef`/`futureRef` locaux
à `PlateauPage`). À l'origine seul l'undo des joueurs
existait (déplacer/ajouter/retirer un joueur, PV) ; Gus a signalé que **déplacer une
tuile ne s'annulait pas** alors qu'ajouter/retirer un joueur oui — généralisé depuis à
**toutes** les mutations du plateau (piocher/poser n'est PAS undoable en soi, voir
plus bas, mais déplacer/tourner/flipper/défausser une tuile, diviser/mélanger/fusionner
une pioche ou la défausse, insérer une carte Dessus/Dessous, et désormais **Reset
lui-même**, le sont tous).
- **Un seul historique combiné** (`commitBoard(updates)`) plutôt que des piles séparées :
  chaque action pousse un instantané de **tout** l'état persisté à la fois
  (`{players, piles, discardCards, placedTiles, heldTile, currentIndex, boardItems,
  heldItem}`, lu depuis `liveRef` — voir "Système de sélection par geste" pour pourquoi
  `liveRef` et pas les variables d'état directes), puis applique seulement les clés
  fournies dans `updates`. `undo`/`redo` restaurent les 8 clés ensemble (`boardItems`/
  `heldItem` ajoutés avec les items de la Couche 3, voir plus bas — même raisonnement
  que `heldTile`, transitoire mais capturé pour que l'undo d'une pose remette l'item
  "en main"). `commitPlayers(next)` n'est qu'un fin wrapper `commitBoard({players:next})`,
  gardé pour ne pas retoucher tous ses appelants.
- **`heldTile` fait partie de l'instantané** même s'il est par ailleurs traité comme un
  état transitoire non-undoable (voir point suivant) : c'est ce qui permet à l'undo
  d'une POSE de remettre la carte "en main" plutôt que de la faire disparaître (le
  snapshot pris juste avant la pose montre déjà cette carte comme tenue — la restaurer
  revient exactement à "la reprendre en main").
- **Piocher/annuler une pioche n'est PAS undoable en soi** (reste un `setState` direct,
  sans passer par `commitBoard`) : c'est plutôt une sélection en attente qu'une action
  validée, même logique que sélectionner un joueur qui n'est pas undoable non plus (seul
  le déplacement qui suit l'est). Ça reste correct de bout en bout grâce au point
  précédent : annuler la POSE qui suit une pioche redonne la carte, sans avoir besoin
  d'un second `undo` séparé pour "annuler aussi la pioche" — et pour annuler une pioche
  seule (sans la poser), le geste dédié existe déjà (re-cliquer la même pioche).
- **Reset est maintenant undoable** : Gus a demandé à pouvoir annuler un reset comme
  n'importe quelle autre action. `resetBoard` ne vide plus `pastRef`/`futureRef` — il
  appelle `commitBoard({players:[], piles:[...deck neuf...], discardCards:[],
  placedTiles:[], heldTile:null, currentIndex:0})` comme n'importe quel autre appelant,
  ce qui pousse automatiquement l'état d'AVANT le reset comme entrée d'historique
  normale avant d'appliquer le vidage. `currentIndex` a dû rejoindre `liveRef` et les 5
  clés de `commitBoard`/`applySnapshot`/`currentSnapshot` (devenues 6) pour que l'undo
  restaure aussi "quel joueur était courant", pas seulement la liste des joueurs. Seul
  l'état vraiment transitoire (sélection en cours, popups ouvertes, zoom, scroll) reste
  remis à zéro directement, hors du snapshot — comme avant.

### Mode Vision (affichage détaillé d'une carte/entité)
Bouton "œil" en bas à droite de l'écran (footer du Plateau, juste à gauche de la
flèche `›`). Une fois activé, toute sélection (case, perso, monstre, item) affichera
le texte complet de la carte en grand plutôt que d'exécuter l'action normale associée
à la sélection — ex: sélectionner un monstre en mode Vision affichera ses stats et
récompenses en plein écran, au lieu du menu d'action habituel. **Le volet joueurs est
fait** (fenêtre `visionPlayerId`, voir "Couche 3" plus bas pour son contenu réel
sorts/énergies) ; l'inspection détaillée d'une case/tuile/monstre reste à faire (pas
encore de monstres sur le plateau). L'**ambiance visuelle du toggle est
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

### Couche 3 — items (sorts/énergies) sur le plateau et équipés par joueur : implémentée
Deuxième type de "carte" sur le plateau, en plus des tuiles de la Couche 2 : les sorts
et énergies ont leurs propres pioches/défausses dans le header, peuvent être posés sur
le plateau, et peuvent être équipés sur un joueur via une nouvelle zone dans le pied de
page. Toujours des cartes placeholder identiques (même deck 100 cartes que les tuiles,
`makeDeck(type)`), en attendant la vraie pioche dynamique — voir "Pioches dynamiques
depuis le catalogue". Seule différence visuelle pour l'instant entre les 3 types de
carte : le dos (`BACK_ACCENT` dans `PlateauPage.js` — bordure grise/dorée/bleue pour
case/sort/énergie) — "le reste on verra plus tard", le contenu réel des cartes n'est
toujours pas branché.

**Pioches et défausses de sorts/énergies dans le header** — `PileGroup` (nouveau
composant) généralise `PileStack`/`DiscardSlot` (déjà conçus pour ça, voir leur
commentaire sur `pile.type`) à 3 groupes de deck affichés côte à côte : cases, puis
sorts, puis énergies ("les sorts à droite des cases et les énergies à droite des
sorts"). Cartes de sorts/énergies **deux fois plus petites** que les tuiles (`ITEM_BOX`
= 30px de boîte contre 56px pour les cases, `ITEM_BOARD_SIZE` = 22px sur le plateau
contre `CELL-4` pour une tuile) — `PileStack`/`DiscardSlot` prennent maintenant une prop
`boxSize` (défaut 56, inchangé pour les cases) plutôt qu'une taille figée en dur.
- **Un seul défausse "logique" mais 3 défausses visuelles** : `discardCards` reste un
  seul tableau plat, mais chaque entrée porte maintenant un `type` (`'case'`/`'sort'`/
  `'energie'`) — `PileGroup` filtre ce tableau par type pour chaque défausse affichée.
  Un id sélectionné (`selectedDiscardCardId`) reste totalement générique : comme les ids
  sont uniques, il appartient sans ambiguïté à un seul type, retrouvable par
  `discardCards.find(c=>c.id===...)`.
- **L'armement d'une défausse par appui long utilise maintenant un id composite**
  `'discard:'+type` (ex: `'discard:sort'`) plutôt que le `'discard'` unique d'avant —
  `mergeArmedInto` reconnaît ce préfixe pour savoir quelle défausse est concernée et
  n'y déplace que les cartes de CE type (les cartes des 2 autres défausses, si elles
  existent comme d'autres entrées du même tableau `discardCards`, restent en place).
- **Wrap 2 colonnes quand une pioche se divise** (motif demandé par Gus : `◻️◻️` puis
  `◻️` sur une nouvelle ligne au 3ème paquet) : `PileGroup` affiche les piles d'UN type
  dans une simple CSS grid — une grid 2 colonnes remplit naturellement colonne 1 puis
  colonne 2 puis repasse en colonne 1 d'une nouvelle ligne, sans logique de découpage
  manuel. **La défausse est maintenant sous cette grid** (Gus : "la défausse doit être
  en dessous de la pioche pas à côté, pour toutes les pioches" — un premier essai la
  mettait à côté), toujours juste après le dernier paquet, quel que soit leur nombre.
  **Piège rencontré** : `gridTemplateColumns:'repeat(2, ...)'` en dur réservait TOUJOURS
  la largeur de 2 colonnes même avec un seul paquet (CSS grid dimensionne le conteneur
  d'après le nombre de colonnes déclarées, pas le nombre d'enfants réels) — ça laissait
  un vide d'une colonne entière à droite du paquet, et décalait aussi la défausse en
  dessous (centrée sous la grid entière, donc sous ce vide, pas sous le vrai paquet).
  Fix : `repeat(Math.min(2, groupPiles.length), ...)` — jamais plus de colonnes que de
  paquets réels.
- **Rétrécit au lieu de déborder, sans jamais scroller** ("comme les carrés des
  joueurs", mais en plus strict — Gus a signalé un scroll horizontal persistant) : même
  principe que `squareSize` de la sidebar, appliqué à la largeur totale des 3 groupes du
  header (`caseBoxSize`/`itemBoxSize`, calculés depuis `groupNaturalWidth()` vs
  `window.innerWidth`). Contrairement à `squareSize`, le plancher `HEADER_MIN_SCALE` est
  volontairement très bas (0.2× plutôt que 0.5×) : l'objectif est "pile poil la taille de
  l'écran", jamais de scroll réel — `overflowX:'auto'` ne reste qu'un filet de sécurité
  théorique. `HEADER_GROUP_GAP` réduit à 6px (Gus : "trop d'écart... rapproche-les") avec
  un fin séparateur vertical (1px, `rgba(255,255,255,.12)`) entre chaque groupe pour
  garder les 3 types visuellement distincts malgré l'espacement resserré.
- **Cartes sort/énergie 50% plus grandes dans le header** ("entre mes maps et items
  actuel", ni la taille d'une carte case ni la petite taille d'avant) : `HEADER_ITEM_BOX`
  (45px) remplace `ITEM_BOX` (30px, inchangé) dans le calcul `groupNaturalWidth`/
  `itemBoxSize` du header — délibérément une constante SÉPARÉE plutôt qu'un simple bump
  de `ITEM_BOX`, puisque ce dernier sert aussi de base au calcul de `FOOTER_ITEM_SIZE`
  (voir "Équiper un item sur un joueur" plus bas) : grossir `ITEM_BOX` aurait aussi fait
  gonfler les cartes du pied de page, jamais demandé cette fois.

**Items sur le plateau** — nouvel état `boardItems` (`{id, type, row, col}`), rendu
entre les tuiles et les jetons joueurs dans le DOM (donc au-dessus des cases, en
dessous des joueurs, sans besoin de z-index — l'ordre du DOM suffit). Contrairement aux
tuiles, plusieurs items peuvent partager une case et un item n'a ni rotation ni flip ni
bouton dans la grille — "juste déplacer c'est suffisant".
- **Positionné sur un coin de la case, jamais centré** ("quand il y a que un item sur
  une map j'aimerais qu'il aille sur un coin de la carte map plutôt qu'au centre") :
  chaque item choisit un quadrant (`i % 4` sur son index dans le groupe de la case,
  `ITEM_CORNER_INSET` = demi-taille du jeton + 3px de marge) plutôt que d'être centré —
  un item seul (groupe de taille 1) prend simplement le quadrant 0 (coin haut-gauche),
  et un 2ème/3ème/4ème item partageant la case prend le coin suivant. Remplace l'ancien
  `itemCellGroups` à décalage centré (même esprit que le regroupement des joueurs, mais
  ne correspondait pas à ce que Gus voulait pour un item seul).
- **Troisième geste dédié : l'appui long**, exactement le design d'origine prévu dans
  "Système de sélection par geste" (clic = joueurs, double-clic = tuiles, appui long =
  items) — implémenté en autonome via `onContentPointerDown`/`Move`/`Up` sur le div
  `content` (qui n'avait aucun handler pointer avant), sans toucher au système clic/
  double-clic existant : un timer de 500ms (même durée que l'armement des pioches),
  annulé si le pointeur bouge de plus de 6px (seuil un peu plus large que le drag de
  pan, pour laisser le pan tactile natif tranquille). `heldTile`/`heldItem` bloquent la
  sélection (une carte déjà en main doit être résolue avant d'en toucher une autre).
- **Un vrai `click` natif suit toujours un appui long réussi** (le `preventDefault` sur
  `pointerdown` n'annule pas le `click` qui arrive au relâchement) — `suppressNextClickRef`
  (mis à `true` par `handleItemLongPress` quand il sélectionne réellement quelque chose,
  vérifié et remis à `false` en tête de `onContentClick`) absorbe ce clic parasite pour
  qu'il ne retombe pas sur la logique de sélection joueur juste après.
- **Poser/déplacer un item** : `heldItem` (tiré d'une pioche sort/énergie, mêmes deux
  clics que `heldTile` — un pour piocher/tenir, un pour poser) et `selectedItemId` (item
  déjà posé, ramassé par appui long) suivent exactement le même schéma "un seul tap
  suffit pour finir le geste" que les tuiles, sans le mode `'placed'` rotation-only (pas
  besoin, rien à orienter).
- **Plusieurs items sur la même case → petite fenêtre de choix** ("je dois pouvoir
  choisir entre chaque item en ouvrant une fenêtre") : `handleItemLongPress` ne prend
  plus juste le dernier item posé sur la case — s'il y en a plus d'un, il ouvre
  `itemCellPicker` (même esprit que le `cellPicker` multi-joueurs), une liste "🪄 Sort" /
  "🔥 Énergie" par item. Positionnée 40px SOUS le point d'appui plutôt qu'exactement
  dessus : le popup s'ouvre pendant que le doigt/la souris est encore appuyé(e) (au
  seuil des 500ms, comme le menu Diviser/Mélanger d'une pioche) — la placer pile sous le
  pointeur encore actif aurait risqué que le relâchement qui suit tombe directement sur
  une des options et la sélectionne par accident.
- **Mode Vision = aperçu en grand en restant appuyé** ("je dois être capable d'afficher
  le sort sur le plateau en restant appuyé") : contrairement aux autres gestes de carte,
  l'appui long sur un item N'EST PAS bloqué en mode Vision — il affiche `visionPeekItem`
  (la carte en grand, sans `‹`/`›` ni croix — juste un aperçu, pas un navigateur) tant
  que le doigt/la souris reste appuyé(e), refermé automatiquement au relâchement
  (`peekingRef`, vérifié dans `onContentPointerUp`). Sur une case à items multiples en
  mode Vision, le picker ci-dessus s'ouvre à la place — le choisir affiche alors le même
  aperçu, mais cette fois comme une fenêtre normale (fermeture au tap extérieur) puisque
  le geste d'appui a déjà pris fin avant que le choix ne soit fait.

**Équiper un item sur un joueur** — nouvelle zone dans le pied de page, juste au-dessus
de la ligne dé/PV existante (jamais touchée), visible seulement s'il y a un joueur
courant : à gauche un **emplacement unique "sort de nature"** (`player.natureSort`,
carré en pointillés tant qu'il est vide), à droite deux lignes empilées — sorts puis
énergies (`player.sorts`/`player.energies`, tableaux, sans limite dure de 3 — l'app
n'arbitre pas les règles, "genre 3" ne fixe qu'une taille visuelle indicative).
- **Slots à taille fixe** ("le carré du slot du sort nature change de taille... il faut
  aussi une zone slot... pour les sorts et une autre pour les énergies") : les 3
  contours en pointillés (nature + les 2 lignes) ont maintenant chacun une taille CSS
  figée (`FOOTER_ROW_HEIGHT`/`FOOTER_ROW_WIDTH`, `box-sizing:'border-box'`) au lieu de
  se dimensionner sur leur contenu — avant ce fix, le carré nature changeait
  littéralement de taille selon qu'il contenait 0 ou 1 carte, puisque rien ne bornait sa
  hauteur/largeur. Les lignes sorts/énergies ont maintenant elles aussi un contour
  visible (elles n'en avaient aucun avant), assez large pour ~3 cartes (`overflowX:
  'auto'` si plus). **Le carré nature est un vrai carré** (`FOOTER_ROW_HEIGHT` ×
  `FOOTER_ROW_HEIGHT`, la taille d'UNE carte) plutôt qu'un rectangle haut couvrant les 2
  lignes — Gus a demandé ce changement après coup ("je préfère un carré de la taille de
  la carte") ; le conteneur qui l'accueille est passé de `alignItems:'stretch'` à
  `'center'` pour le garder centré verticalement à côté du bloc des 2 lignes, plus haut
  que lui. Même correction appliquée à la fenêtre `visionPlayerId`, qui reprend cette
  disposition à l'identique.
- **Cartes deux fois plus grandes que dans le header** (`FOOTER_ITEM_SIZE`) : le pied de
  page a plus de place que le header serré, et ce sont les cartes qu'on regarde/tape le
  plus souvent. Dérivée d'une base indépendante du header (`ITEM_BOX`) plutôt que de sa
  propre taille — voir le point suivant sur pourquoi les deux ont dû se découpler.
- **"Peu importe où je clique dans cette zone avec un item"** : `onClickCapture` sur la
  zone entière (phase de capture, donc déclenché AVANT le clic propre de n'importe quel
  slot enfant) équipe directement `heldItem`/`selectedItemId` s'il y en a un, et
  `e.stopPropagation()` empêche le clic d'atteindre en plus le handler normal d'un slot
  (qui, lui, ouvrirait la fenêtre agrandie — pas ce qu'on veut ici). Le tout premier
  sort équipé va dans l'emplacement nature ; tous les suivants (et toutes les énergies,
  toujours) s'ajoutent en bout de leur ligne (`equipHeldOrSelectedItem`).
- **Retirer un item équipé** : `selectedFooterItem` (`{playerId, slot, cardId}`) mirrore
  `selectedDiscardCardId`/`selectedItemId` — reste "en place" (glow) dans le tableau du
  joueur jusqu'à un tap ailleurs (case du plateau, pioche/défausse assortie) qui le
  déplace réellement. `removeFooterItem()` centralise le retrait (nature/sorts/
  énergies) pour `insertSelectedCardIntoPile`/`discardSelectedItem`/le tap sur la grille.
- **Supprimer un joueur envoie ses cartes équipées dans les défausses assorties**
  (nature + sorts → défausse sort, énergies → défausse énergie) plutôt que de les faire
  disparaître avec lui — Gus : "ce serait bien que les items aillent dans les défausses
  respectives". `removePlayer` construit ce lot et l'ajoute à `discardCards` dans le
  MÊME `commitBoard` que le retrait du joueur (un seul pas d'undo pour les deux), plutôt
  que de passer par le wrapper `commitPlayers`. Nettoie aussi toute sélection/fenêtre qui
  pointait vers ce joueur (`selectedFooterItem`/`enlargedItem`/`visionPlayerId`) pour
  éviter qu'une action différée agisse sur un joueur qui n'existe plus.
- **Geste final sur un item déjà équipé** (dernière clarification de Gus, remplace une
  première idée plus simple) : **un tap** ouvre directement la fenêtre agrandie ;
  **appui long SANS bouger** sélectionne pour déplacer ailleurs (grille/pioche/
  défausse) ; **appui long EN bougeant** réordonne en glissant dans sa ligne ; **clic
  droit** = équivalent bureau de l'appui long (sélection immédiate, sans les 500ms).
  Moteur dédié `useFooterItemGestures` (dans `PlateauPage.js`, pas exporté — gestes trop
  spécifiques à ce composant pour généraliser `useReorder` de `utils.js`, qui démarre
  toujours son drag immédiatement depuis une poignée dédiée) : même schéma que
  `useReorder` (refs pour l'état de drag "vivant", state seulement pour le re-rendu
  visuel) mais avec un timer de 500ms avant d'armer le drag, et une 3ème issue possible
  (juste ouvrir la fenêtre) si le timer n'a jamais eu le temps de se déclencher. Un clic
  qui suit un appui long réussi (déplacement OU réordonnancement) est absorbé de la même
  façon que sur la grille (`suppressClickRef` interne au hook).

**Fenêtre agrandie avec `‹`/`›`** (`enlargedItem`, `{playerId, index}`) — implémente la
note de design différée d'une session précédente. `playerCardList(p)` aplatit
`[natureSort?, ...sorts, ...energies]` d'un joueur en une seule liste ordonnée pour que
les flèches défilent sur TOUT ce que le joueur possède sans avoir besoin d'un carrousel
séparé par ligne. Accessible de deux endroits qui partagent exactement la même fenêtre :
un tap sur un item déjà équipé dans son propre pied de page, ou un clic sur une carte
listée dans la fenêtre Vision `visionPlayerId`.

**Dos/face des cartes sort/énergie** : `FRONT_GLYPH` (`{case:'+', sort:'🪄',
energie:'🔥'}`) — le dos garde le même traitement sombre uni + bordure d'accent
colorée pour les 3 types (`BACK_ACCENT`, inchangé), seul le glyphe de la face change.

**Fenêtre `visionPlayerId` (sidebar + mode Vision) — mise en page revue** : nom + cœur
de PV à GAUCHE (colonne étroite), sorts/énergies équipés à DROITE, disposés exactement
comme dans le pied de page (même emplacement nature + mêmes lignes en pointillés,
`FooterItemRow` réutilisé avec `onReorder`/`onSelectForMove` en no-op — cette fenêtre
peut afficher N'IMPORTE QUEL joueur, pas seulement le joueur courant, donc rien n'y est
équipable/réordonnable, seulement consultable en cliquant une carte pour l'agrandir),
à une taille réduite (`VISION_ITEM_SIZE`) pour tenir dans la largeur de la fenêtre.
- **`‹`/`›` pour changer de joueur, mais seulement depuis la barre latérale** ("la
  fenêtre... ce serait cool d'avoir en bas les <> pour passer de joueurs en joueur...
  mais en mode vision et qu'on clique sur un joueur pas besoin de <>") : nouveau state
  `visionPlayerFromSidebar` (booléen), mis à `true` uniquement par `PlayerSquare.onOpenInfo`
  (le carré dans la sidebar) et à `false` par les deux chemins d'ouverture depuis le
  plateau en mode Vision (tap direct sur un jeton, ou `cellPicker` si plusieurs joueurs
  partagent la case) — les flèches (`shiftVisionPlayer`, cycle sur `players` dans le même
  ordre que la sidebar) ne s'affichent que si ce flag est vrai.

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
     (`AddBtn`) en bas de la colonne pour ajouter un joueur (PV de base = 3,
     apparaît au centre de la grille). Cliquer un carré ouvre la **même grande
     fenêtre modale** que cliquer un jeton en mode Vision (`visionPlayerId`,
     voir "Mode Vision" plus bas) — nom, cœur de PV, section Sorts & Énergies
     en attente — plutôt qu'une petite popup locale séparée. Une première
     version donnait à `PlayerSquare` sa propre popup locale (`showInfo`,
     children `Popup`) avec un texte d'attente quasi identique mais
     indépendant ; Gus a signalé qu'elle ne s'ouvrait pas de façon fiable et a
     précisé vouloir explicitement RÉUTILISER la fenêtre Vision existante, pas
     en déboguer une seconde. `PlayerSquare` a donc perdu son état local et
     prend maintenant une prop `onOpenInfo` que `PlateauPage` câble à
     `()=>setVisionPlayerId(p.id)` — cette fenêtre ne vérifie déjà nulle part
     si `visionMode` est actif (voir son rendu), donc l'ouvrir depuis la
     sidebar fonctionne à l'identique que le mode Vision soit activé ou non,
     sans aucune condition supplémentaire à ajouter. Quand il n'y a aucun
     joueur, le texte "Ajoute un joueur" du pied de page est lui-même
     cliquable pour en créer un.
     Nom par défaut "Joueur N" via `nextPlayerName()` : cherche le plus petit N
     **non utilisé** parmi les joueurs existants plutôt que `players.length+1`
     — avec ce dernier, supprimer un joueur du milieu (ex: "Joueur 1" sur 4)
     puis en rajouter un donnait un doublon ("Joueur 4" existait déjà) au lieu
     de réutiliser le nom libéré.
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
     **Piège rencontré (zone invisible qui bloquait les clics sur la grille)** :
     la colonne garde toujours la hauteur PLEINE header-à-footer (elle est
     centrée par flexbox, pas dimensionnée à son contenu) — avec peu de
     joueurs (voire aucun), la majeure partie de cette boîte est de l'espace
     vide sans rien de visible dedans, mais elle recevait quand même tous les
     clics qui y tombaient au lieu de les laisser atteindre la case de la
     grille en dessous. Fix : `pointerEvents:'none'` sur le conteneur de la
     colonne, `pointerEvents:'auto'` explicitement sur chaque carré joueur et
     sur le bouton `+` — seule la zone réellement visible reste cliquable, le
     reste laisse passer le clic vers la grille.
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
     ouvre une grande fenêtre (nom, cœur de PV, section Sorts & Énergies — affiche
     maintenant les vraies cartes équipées du joueur, cliquables pour les voir en
     grand, voir "Couche 3" plus bas) au lieu de sélectionner pour déplacement ;
     croix rouge en haut à droite pour fermer (en plus de la fermeture au clic
     extérieur, comme toute popup). Le volet "affiche le contenu détaillé d'une
     case/tuile" (contenu réel de carte, pas juste "il y a un item ici") reste à
     faire, indépendant des items eux-mêmes qui existent déjà.
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
   - **Couche 3 (items sorts/énergies sur le plateau et équipés par joueur) :
     implémentée** — voir sa propre section "Couche 3" plus haut pour le détail complet
     (pioches/défausses dédiées dans le header, pose/déplacement par appui long sur le
     plateau, équipement dans une nouvelle zone du pied de page avec emplacement
     "sort de nature", réordonnancement par glisser, fenêtre agrandie avec `‹`/`›`).
     Reste : brancher la vraie pioche dynamique depuis `data.sorts`/`data.energies`, et
     le contenu réel des cartes (toujours un simple "+" placeholder). Le contenu détaillé
     du mode Vision pour les cases/tuiles (Couche 4) : pas encore commencé. Toutes les
     actions d'items qui touchent l'état persisté (poser/déplacer/défausser/ranger dans
     une pioche/équiper/réordonner) passent par `commitBoard` comme les tuiles, donc
     déjà undoable — seul le tirage/annulation d'une pioche (`heldItem`) ne l'est pas en
     soi, même logique que pour `heldTile` (voir "Undo/redo global").
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
