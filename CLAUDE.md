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
Une case peut contenir simultanément : un ou plusieurs joueurs/monstres, une ou
plusieurs cartes/items au sol, et la case du labyrinthe elle-même. Le geste détermine
quelle couche on sélectionne, trié par fréquence d'usage (le plus fréquent = le geste
le plus simple) :

**Mobile :**
- Tap simple → sélectionne les joueurs/monstres présents sur la case
- Tap prolongé (maintenu) → sélectionne un item au sol (sorts/énergies)
- Double-tap → sélectionne la case/tuile du labyrinthe

**PC :**
- Clic simple → joueurs/monstres
- Clic droit → item au sol
- Double-clic → case/tuile

Seuil de précision géré nativement par la grille (pas de calcul pixel arbitraire) :
- Rester sur la même case > 1 seconde → geste "prolongé"
- Relâcher sans changer de case → tap/clic simple
- Traverser plusieurs cases pendant le contact → interprété comme un pan/déplacement de
  vue, pas une sélection. Cas ambigu accepté : en dézoomé avec petites cases, un léger
  glissement peut être confondu avec un pan — jugé acceptable car l'intention réelle du
  joueur dans ce contexte (dézoomé) est justement de naviguer, pas d'agir précisément ;
  et quand precision est recherchée, le joueur est zoomé, donc les cases sont grandes et
  le seuil d'une case entière est facile à respecter.

**S'il y a plusieurs entités de la couche sélectionnée sur la même case** (ex: 2 joueurs,
ou plusieurs items), une fenêtre de choix s'ouvre :
- Pour joueurs/monstres : **joueurs à gauche, monstres à droite**
- Pour items : **sorts à gauche, énergies à droite**
- Fermeture de n'importe quelle fenêtre : cliquer/tap ailleurs, ou sélectionner autre chose

### Monstres traités comme des "joueurs"
Les monstres suivent le même système de sélection/déplacement que les joueurs (pas de
mécanique séparée à coder). Flux d'une rencontre :
1. Le joueur arrive sur une case monstre.
2. Il clique sur la pioche monstre, puis sur sa propre case → le monstre apparaît sur
   la case (traité désormais comme une entité "joueur" sélectionnable dessus).
3. Le joueur lance le dé (bouton dé).
4. S'il gagne, il fait une sélection prolongée sur la case pour cibler le monstre, puis
   clique sur la défausse pour le défausser.

### Pioche et pose de tuiles (labyrinthe)
1. Cliquer sur la pioche → la carte du dessus se retourne (reste visuellement sur la
   pioche, marquée comme "tuile actuellement choisie").
2. Cliquer sur un emplacement de grille vide → pose la tuile à cet endroit (encore
   tournable/validable, cf. étape 3).
3. Un petit menu apparaît avec deux boutons ronds :
   - Flèche circulaire (à droite) → rotation horaire 90°, cliquable/spammable jusqu'à
     obtenir l'orientation voulue
   - Coche/validation (à gauche) → valide la tuile dans son état actuel
4. Ce même menu (rotation + validation) réapparaît si on resélectionne plus tard une
   tuile déjà posée — permet aussi, à ce moment, de : tourner, valider, défausser (clic
   sur la défausse), ou déplacer (clic sur une autre case).
- Les tuiles déjà posées mais vides (pas de joueur dessus) sont aussi sélectionnables
  pour les tourner ou les défausser via le même mécanisme.
- Une tuile du labyrinthe ne peut être manipulée que si aucun joueur n'est dessus.

### Pioches et défausses (mécanique générique, s'applique à toute pioche/défausse du jeu)
- Appui long / clic maintenu sur une pioche → la divise en deux (mécanique de jeu à
  part entière, pas juste un utilitaire d'affichage). Une fois divisée, les deux
  moitiés doivent être mélangées séparément (chacune re-brassée après la division,
  pas juste coupée en deux paquets ordonnés).
- Double-tap / double-clic sur une pioche OU une défausse → mélange.

### Undo/redo global
Boutons retour/avancer pour annuler des actions accidentelles (ex: mélange non
désiré). Réutiliser si possible le composant `UndoRedo` déjà construit pour le mode
édition (`src/components/UndoRedo.js`) plutôt que redévelopper un système d'historique
séparé — à évaluer techniquement selon la nature des actions de jeu (probablement un
historique distinct de celui du mode édition, mais même pattern UI/logique réutilisable).

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
     sélection avec glow bleu, second tap = déplacement libre). Volontairement
     **pas de multi-sélection par case pour l'instant** (si plusieurs joueurs
     sont sur la même case, le tap simple sélectionne le premier trouvé) — la
     fenêtre de choix joueurs/monstres de "Système de sélection par geste" est
     prévue pour la Couche 3, pas encore codée.
     Barre des joueurs façon "groupe Dofus" : colonne sticky collée à **droite**
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
   - Mode Vision : **ambiance visuelle du toggle implémentée** en avance sur la
     Couche 4 (overlay bleu + glitch), mais le volet "affiche le contenu détaillé
     d'une carte/entité sélectionnée" attend les items de la Couche 3.
   - Couches 2 à 4 (pioche/pose de tuiles, items/multi-sélection par case, contenu
     du mode Vision) et undo/redo global (au-delà de celui déjà en place pour les
     joueurs/PV/déplacements) : pas encore commencées.
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
