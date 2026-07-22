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
- Les popups de sélection (statut/élément/niveau sur une carte) se ferment en cliquant/
  tapant n'importe où en dehors — pas besoin de recliquer le même bouton. Géré une seule
  fois dans `src/components/Popup.js` via un `anchorRef` fourni par l'appelant : le ref
  doit englober à la fois le bouton et la popup, sinon cliquer le bouton pour la fermer
  la rouvrirait aussitôt (l'ancien onClick du bouton et le nouveau listener global
  entreraient en conflit).
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
Bouton "œil" en bas à droite de l'écran. Une fois activé, toute sélection (case, perso,
monstre, item) affiche le texte complet de la carte en grand plutôt que d'exécuter
l'action normale associée à la sélection — ex: sélectionner un monstre en mode Vision
affiche ses stats et récompenses en plein écran, au lieu du menu d'action habituel.
Direction esthétique : overlay bleuté, effet glitch/matrix, inspiré du mode édition
existant (réutiliser si possible la base de l'effet `useEditFlash` / classes
`gridflash-in`/`gridflash-out` dans `index.html` plutôt que repartir de zéro — cohérence
visuelle avec le glitch du mode édition, portails, sortie "Matrix").

### Pan et zoom
- Mobile : glisser (tap qui traverse plusieurs cases, cf. seuils ci-dessus) pour
  déplacer la vue ; pincer à deux doigts pour zoomer/dézoomer.
- PC : cliquer-glisser pour déplacer la vue ; molette ou geste trackpad pour zoomer.

## Roadmap version jouable (multi-étapes)
1. **Version hotseat locale** — un seul écran, les joueurs passent le tour à
   tour de rôle. Objectif : valider que les mécaniques digitalisées marchent
   avant d'ajouter la couche réseau. Voir section "Système de jeu — plateau
   interactif" ci-dessus pour le détail complet du design validé.
   - **Couche 1 (grille + sélection/déplacement perso) : implémentée**, page
     `src/pages/PlateauPage.js`, accessible depuis le bouton "🎮 Jouer" de la
     home page (n'est plus un WIP désactivé). Grille configurable (défaut 9×9,
     steppers +/-), joueurs ajoutés à la volée (nom + couleur auto-assignée
     depuis une palette fixe), sélection par tap/clic simple (glow bleu),
     second tap = déplacement libre sans limite ni calcul de coût, PV manuel
     par joueur (+1/-1, y compris sur un autre joueur), bouton dé (d6).
     Volontairement **pas de multi-sélection par case pour l'instant** (si
     plusieurs joueurs sont sur la même case, le tap simple sélectionne le
     premier trouvé) — la fenêtre de choix joueurs/monstres décrite dans
     "Système de sélection par geste" est prévue pour la Couche 3, pas encore
     codée. État de partie (joueurs, position, PV, taille de grille) persisté
     en **`localStorage`** (clé `labyrinthe_organic_plateau_v1`), volontairement
     **hors `data.json`** : c'est un état de session de jeu local à l'appareil
     (hotseat = un seul écran), pas une donnée de catalogue partagée via
     GitHub — évite de spammer des commits à chaque déplacement/tir de dé et
     évite les conflits si data.json est édité en parallèle. Pas encore de
     visuels de personnages (roster à venir avec un visuel par personnage,
     images à uploader dans le repo) : simple rond de couleur avec initiale
     en attendant.
   - Couches 2 à 5 (pioche/pose de tuiles, items/multi-sélection, mode
     Vision, pan/zoom + undo/redo global) : pas encore commencées.
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
