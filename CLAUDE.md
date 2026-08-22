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
  `src/utils.js`). Inclut désormais `application` (voir "Vocabulaire des notes" plus bas).
- `<section>Notes` (`reglesNotes`, `sortsNotes`, `energiesNotes`, `monstresNotes`,
  `lexiqueNotes`, `materielNotes`, `casesNotes`, `modesNotes`, `visuelsNotes`,
  `applicationNotes`) — la "note globale" de chaque grande catégorie (voir "Vocabulaire
  des notes" plus bas), rendue par `NotesBlock`.

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

## Bugs iPhone/Safari (Plateau) — correctifs posés, PAS vérifiés sur vrai appareil
Gus a remonté 4 problèmes en testant le Plateau sur iPhone, absents ailleurs (donc
propres à Safari/iOS). **Aucun outil de test disponible dans cet environnement
n'émule Safari/iOS** (le seul navigateur Playwright installé ici est Chromium — pas de
build WebKit) : les correctifs ci-dessous s'appuient sur des comportements connus et
documentés de Safari iOS pour ces symptômes précis, mais n'ont pu être vérifiés qu'en
non-régression sur Chromium (aucune erreur, comportement desktop inchangé) — **pas
confirmés comme résolus sur un vrai iPhone**. À valider par Gus, à revenir dessus s'il
signale que ça persiste.
- **Zoom glitché/saccadé, "comme au tout début"** (référence au bug de rebond de scroll
  déjà corrigé une fois via `useLayoutEffect`, voir plus bas dans "Pan et zoom" — celui-là
  reste inchangé, aucune preuve qu'il soit revenu). **Premier correctif (`user-scalable=
  no` sur la meta viewport) confirmé insuffisant par Gus après test réel** — persiste
  malgré ça. Hypothèse corrigée : `user-scalable=no`/`maximum-scale` sont ignorés par
  Safari iOS pour SON PROPRE zoom natif depuis iOS 10 (choix d'accessibilité délibéré
  d'Apple), donc ce premier correctif n'a probablement jamais eu d'effet. Le zoom natif
  de Safari est piloté par ses évènements propriétaires `gesturestart`/`gesturechange`/
  `gestureend` (indépendants des Pointer Events, `touch-action` n'a aucun effet dessus)
  — nouveau fix : `preventDefault()` sur ces 3 évènements, posé sur le viewport de la
  grille (voir "Pan et zoom" pour le détail). Toujours non vérifié sur un vrai appareil.
- **Impossible de sélectionner un joueur/monstre au sein du picker multi-entités en mode
  Vision** — **régression confirmée par Gus, causée par un correctif précédent de cette
  même section** ("depuis ta modif par rapport à l'iPhone, je peux plus afficher la
  fenêtre d'info des personnages... si il y a plusieurs personnages sur la même case").
  Le premier passage posait `WebkitTouchCallout:'none', WebkitUserSelect:'none',
  userSelect:'none'` sur le conteneur RACINE de `PlateauPage`, hérité par tout le
  sous-arbre — y compris `cellPicker` et toutes les autres popups/modales, qui ne sont
  pourtant que des SIBLINGS du header/de la grille/du pied de page dans le rendu (pas
  des descendants) : rien n'obligeait à leur appliquer ce style, seuls les endroits avec
  de vraies cibles d'appui long (pioches/défausses du header, items/tuiles de la grille,
  cartes équipées du pied de page) en ont besoin. Fix : le style est descendu du
  conteneur racine vers CES TROIS zones précises (header, viewport de la grille, pied de
  page) séparément — les popups (qui ne sont nichées dans AUCUNE des trois) n'héritent
  plus jamais de la suppression, donc leurs taps redeviennent normaux, y compris sur
  iPhone (hypothèse : WebKit iOS a un comportement connu de mauvaise interaction entre
  `-webkit-touch-callout`/`user-select:none` et la remontée des évènements tactiles sur
  des éléments imbriqués/`position:fixed`, expliquant pourquoi Chromium ne montrait
  jamais ce symptôme en non-régression).
- **Rester appuyé déclenche la sélection de texte / le menu contextuel natif d'iOS**
  (Gus : "chiant quand on veut sélectionner un truc comme les items ou les options de la
  pioche") — cause quasi certaine du point précédent, dans sa version corrigée : le menu
  de sélection natif interfère avec/annule le geste tactile que l'app essaie de gérer
  elle-même. `WebkitTouchCallout:'none', WebkitUserSelect:'none', userSelect:'none'`
  reste posé, mais scopé (voir ci-dessus) sur le header, le viewport de la grille et le
  pied de page uniquement — jamais sur la racine ni sur une popup — pour garder l'effet
  recherché sans casser les popups. Le reste de l'app (HomePage) n'est de toute façon pas
  concerné, son texte reste normalement sélectionnable (ex: copier une règle).
- **Un glisser démarré depuis le header ou le pied de page fait bouger toute la page** —
  ces deux zones vivent hors du viewport scrollable de la grille (qui, lui, a son propre
  `overflow:'auto'` indépendant), donc rien de l'app elle-même ne devrait bouger — mais
  le rebond ("rubber-band") natif d'iOS peut quand même faire bouger la PAGE ENTIÈRE
  (body/html) même sans contenu réellement scrollable dessous. Fix : `overscroll-
  behavior:none` sur `html,body` (`index.html`) — propriété moderne (Safari 16+), pas
  d'équivalent nécessaire pour les navigateurs desktop qui n'ont pas ce comportement de
  rebond de toute façon.

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

**Délai de 250ms supprimé — désambiguïsation par état plutôt que par timer (idée de
Gus)** : le correctif ci-dessus retardait quand même CHAQUE clic simple de 250ms avant
de l'exécuter, le temps de vérifier qu'un second clic n'allait pas arriver (auquel cas
`onContentDoubleClick` prenait le relais à la place). Gus a proposé de supprimer
totalement ce lag : au lieu d'attendre pour savoir si un clic simple ou double est en
train de se produire, chaque clic s'exécute maintenant immédiatement, et c'est **l'état
courant** (ce qui est déjà sélectionné) qui détermine l'action, plus un minuteur.
Concrètement, pour le cas qui justifiait le délai à l'origine (joueur vs. la tuile
en dessous) : 1er tap sélectionne le joueur (immédiat) ; 2ème tap sur la MÊME case
fait maintenant basculer la sélection sur la tuile plutôt que désélectionner (voir
`selectTileIgnoringOccupancy`, nouvelle fonction qui reprend `selectTileAt` mais sans
son vérificateur d'occupation — ce dernier reste là pour un double-clic "accidentel"
classique, mais ce re-tap délibéré est un signal explicite qui justifie de l'ignorer) ;
un 3ème tap sur la même case retombe gratuitement sur la règle déjà existante
"re-taper une tuile sélectionnée sur sa propre case désélectionne". Un vrai double-clic
rapide déclenche de toute façon TOUJOURS deux évènements `click` natifs avant le
`dblclick` lui-même, donc cette même séquence à deux temps le gère automatiquement,
sans cas particulier à coder. `clickTimerRef` (le `setTimeout` de 250ms) est
entièrement supprimé ; `lastClickCellRef`/`sameCellStreakRef` restent inchangés (leur
rôle — rejeter un `dblclick` natif "parasite" entre deux clics sur des cases
DIFFÉRENTES vu que la grille entière est un seul élément DOM — est indépendant du
délai supprimé). Portée volontairement limitée aux joueurs (pas les monstres/
marqueurs) : `selectTileAt` ne bloquait déjà que sur la présence d'un **joueur**, donc
une tuile sous un monstre ou un marqueur n'a jamais été bloquée par l'occupation —
rien à corriger là pour ce cas précis.

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

**Règle globale : cliquer un endroit où la sélection en cours n'a aucune action valide
l'annule simplement — généralisée à TOUTE sélection (tuile/item/défausse/footer/joueur/
monstre) et TOUT contrôle du header/pied de page** (Gus : "dès que je sélectionne quelque
chose et que je clique à un endroit où il ne peut rien y faire, ça annule juste la
sélection" — un premier passage n'avait couvert que joueurs/monstres + pioches/défausses ;
Gus a ensuite signalé que ça manquait encore pour tuiles/items sur les pioches/défausses,
pour n'importe quelle sélection sur un carré joueur, et pour n'importe quelle sélection sur
+cœur/dé/œil/undo/redo/reset). Une sélection (quelle qu'elle soit) n'a que deux actions
valides : agir sur la grille (déplacer/poser) ou se re-taper pour se désélectionner — tout
le reste (pioches, défausses, zone d'équipement du pied de page, carrés joueurs, dé, PV,
mode Vision, Undo/Redo, Reset, bouton `+`) est un "cul-de-sac" pour elle.
- **`hasAnySelection()`** — unique source de vérité : vrai si `selectedId`,
  `selectedMonsterId`, `selectedTileId` (hors mode `'placed'`, qui garde sa propre règle
  de désélection-au-moindre-tap déjà en place), `selectedItemId`, `selectedDiscardCardId`
  ou `selectedFooterItem` est posé.
- **`guardedBySelection(fn)`** — enveloppe un handler de clic : si `hasAnySelection()`,
  annule via `clearCardSelection()` au lieu d'appeler `fn`. Câblée sur tout ce qui n'a
  structurellement AUCUN rapport avec une sélection de carte/entité : `+`/`−` de PV, dé,
  `‹`/`›` de joueur courant, bouton Mode Vision, Undo, Redo, bouton Reset (juste l'ouverture
  de sa popup de confirmation — cliquer Oui/Non n'est de toute façon plus atteignable une
  fois cette popup bloquée par une sélection active), `onOpenInfo`/`onRemove` d'un carré
  joueur, bouton `+`/lien "Ajoute un joueur". Pas utilisée pour les pioches/défausses
  (elles, ont une action légitime quand la sélection correspond à leur propre type — un
  wrap générique les aurait cassées, voir plus bas).
- **`clearCardSelection`** — désélectionne aussi `selectedId`/`selectedMonsterId` en plus
  des sélections de carte, donc cliquer le fond du header/pied de page (l'unique cas qui
  remonte naturellement jusque-là par bulle) désélectionne correctement un joueur/monstre
  ("je peux pas déselectionner en cliquant dans le vide", corrigé).
- **Pioches/défausses** : `drawFromPileOrCancelSelection`/`toggleSelectDiscardCardOrCancelSelection`
  enveloppent `drawFromPile`/`toggleSelectDiscardCard` — si `hasAnySelection()` (n'importe
  quel type, pas seulement joueur/monstre), elles annulent au lieu de piocher/sélectionner.
  Passées comme `onDraw`/`onToggleSelect` aux 4 `PileGroup` à la place des fonctions nues —
  aucun changement dans `PileStack`/`DiscardSlot` eux-mêmes. Ces deux fonctions ne sont
  atteintes QUE quand `PileStack`/`DiscardSlot` ont déjà vérifié que la sélection en cours
  NE correspond PAS au type de cette pioche/défausse précise (`hasSelectedCard`/
  `hasSelectedTile`, calculés par type) — donc toute sélection qui arrive jusque-là est
  par définition un type différent, `hasAnySelection()` seul suffit comme condition.
  - **Piège rencontré (défausse vide)** : une défausse VIDE ne relayait jamais le clic à
    `onToggleSelect` du tout (`if (topCard) onToggleSelect(topCard.id)` — rien à faire s'il
    n'y a pas de carte du dessus), donc une sélection non-correspondante ne se faisait
    jamais annuler en cliquant une défausse vide. Fix : appel systématique,
    `onToggleSelect(topCard ? topCard.id : null)` — `toggleSelectDiscardCardOrCancelSelection`
    traite `cardId` nul comme "rien à faire" SEULEMENT si `hasAnySelection()` est déjà faux.
  - **Piège rencontré (pioche monstre)** : continuait de piocher malgré l'enveloppe.
    Cause : `hasSelectedCardOfType('monstre')` (pilote le menu Dessus/Dessous) renvoyait
    `true` dès que `selectedMonsterId` était posé — hérité d'une session précédente qui
    avait généralisé "insérer une carte sélectionnée dans une pioche" à `selectedMonsterId`
    par souci de symétrie avec tuiles/items. `PileStack.handleClick` vérifie `hasSelectedCard`
    AVANT d'appeler `onDraw`, donc le menu absorbait le clic avant que l'enveloppe ne
    s'exécute jamais. Fix : `hasSelectedCardOfType('monstre')` ne regarde plus que
    `discardSelType === 'monstre'` (une carte monstre sélectionnée DANS la défausse, un état
    différent qui reste légitime pour ce menu) — un monstre sélectionné SUR LE PLATEAU
    (`selectedMonsterId`) n'y donne plus accès du tout, cohérent avec le fait qu'un joueur
    sélectionné n'a jamais eu cette possibilité non plus. La branche `insertSelectedCardIntoPile`
    correspondante (devenue inatteignable) a été supprimée plutôt que laissée en code mort.
    `hasSelectedForDiscardOfType('monstre')` (besoin différent : la défausse monstre
    elle-même, cliquée AVEC un monstre sélectionné, doit le défausser directement — flux de
    combat documenté plus haut) garde volontairement son check `!!selectedMonsterId` intact :
    ce chemin s'exécute avant même d'atteindre `onToggleSelect`, aucun conflit.
- **Zone d'équipement du pied de page** : `onClickCapture` (déjà utilisée pour équiper une
  carte tenue/sélectionnée avant que le clic n'atteigne une carte déjà équipée) intercepte
  maintenant `hasAnySelection()` en général (pas seulement joueur/monstre) — n'importe
  quelle sélection + un clic dans cette zone annule au lieu de laisser la carte cliquée
  s'agrandir.
  - **Piège rencontré (la sélection d'un item du footer s'annulait elle-même
    instantanément)** : sélectionner un item du footer par appui long (voir plus bas) puis
    cliquer ailleurs DEVAIT annuler cette sélection comme tout le reste — mais la sélectionner
    elle-même ne fonctionnait plus du tout une fois ce check ajouté : `selectFooterItem`
    posait bien `selectedFooterItem`, mais le clic natif qui suit TOUJOURS le relâchement
    d'un appui long (même mécanisme que `suppressNextClickRef` sur la grille, voir sa propre
    note) remontait jusqu'à CE MÊME `onClickCapture`, qui voyait `hasAnySelection()`
    maintenant vrai (à cause de la sélection tout juste posée par ce geste) et l'annulait
    aussitôt. Fix : `suppressNextEquipClickRef`, posé par `selectFooterItem` au moment même
    de la sélection, consommé par CE clic suivant précis dans la zone d'équipement (`if
    (suppressNextEquipClickRef.current) { ...; e.stopPropagation(); return; }`, AVANT le
    check `hasAnySelection()`) — le `stopPropagation()` est nécessaire ici (pas juste un
    `return`) : sans lui, le clic continue de remonter en bulle jusqu'au `onClick`
    du pied de page LUI-MÊME (`clearCardSelection`), qui annule quand même la sélection une
    bulle plus loin.
  - **Piège rencontré (le bouton croix de désélection s'annulait lui-même)** : une fois le
    piège ci-dessus réglé, cliquer la croix ✕ (voir plus bas) échouait encore — cette fois
    parce que `hasAnySelection()` est VRAI au moment même où on clique CETTE croix
    (puisqu'elle n'existe que pour une sélection active), donc le check générique
    l'annulait avant que son propre `onClick` (`onDiscard`) n'ait la moindre chance de
    s'exécuter — la phase de capture s'exécute AVANT que l'événement n'atteigne sa cible
    réelle. Fix : la croix porte une `className:'footer-item-discard-btn'`, vérifiée en
    premier dans `onClickCapture` (`if (e.target.closest('.footer-item-discard-btn'))
    return;`) — seule exception explicite à la règle générale dans cette zone, puisque
    c'est la SEULE action valide pour une sélection de footer item.

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

### Monstres traités comme des "joueurs" — implémenté
Les monstres suivent le même système de sélection/déplacement que les joueurs (pas de
mécanique séparée codée pour eux — confirmé en pratique : quasiment tout le mécanisme
pioche/pose/sélection/défausse existant a été réutilisé tel quel). Flux d'une rencontre :
1. Le joueur arrive sur une case monstre.
2. Il clique sur la pioche monstre (4ème groupe du header, à droite des énergies, type
   `'monstre'` — générique via `PileGroup`/`PileStack`/`DiscardSlot`, qui ne savaient déjà
   pas ce qu'était un "type" avant celui-ci, donc aucun changement là-bas), puis sur sa
   propre case → le monstre apparaît sur la case, en tant qu'entité **séparée** des
   joueurs (`monsters`, tableau à côté de `players`, même forme minimale `{id, row, col}`
   — pas de nom/couleur/dé/PV, un simple jeton).
3. Le joueur lance le dé (bouton dé existant, rien de spécifique aux monstres).
4. S'il gagne, il sélectionne le monstre (clic simple, comme un joueur — si la case
   contient plusieurs entités, le `cellPicker` s'ouvre, voir plus bas) puis clique sur la
   défausse monstre pour le défausser (`discardSelectedMonster`, même schéma que
   `discardSelectedTile`/`discardSelectedItem`).

**État séparé, pas fusionné dans `players`** : `selectedMonsterId` à côté de `selectedId`
plutôt qu'un seul id générique — évite de toucher tout le code déjà validé qui suppose
`selectedId`/`players[currentIndex]` = un joueur (sidebar, dé, PV, zone d'équipement du
footer). Toute mutation (`heldItem` tenant un monstre, déplacement, défausse, insertion
Dessus/Dessous dans la pioche) passe par `commitBoard({monsters:...})` exactement comme
les autres tableaux persistés — undoable pour rien de plus à écrire, `monsters` a
simplement rejoint la liste des clés de snapshot (`commitBoard`/`applySnapshot`/
`currentSnapshot`, + `localStorage`).

**Piocher/tenir/poser un monstre réutilise `heldItem` tel quel** (`itemType:'monstre'`) :
`drawFromPile` ne distingue déjà que `pile.type === 'case'` vs le reste (voir son propre
commentaire) — un monstre suit donc EXACTEMENT le même cycle pioche/annule qu'un sort ou
une énergie, sans rien à modifier dans `drawFromPile`. Seule la étape finale de POSE
diffère : `handleSingleClick` regarde `heldItem.itemType` et route vers `monsters`
(nouvelle entité `{id, row, col}`) au lieu de `boardItems` quand c'est un monstre — aucune
vérification d'occupation (comme les joueurs, plusieurs entités peuvent partager une
case ; c'est même le cas normal, un monstre apparaît sur la case du joueur qui l'a
rencontré). Même chose pour reposer un monstre depuis sa défausse
(`selectedDiscardCardId` avec `dcard.type === 'monstre'`, nouvelle branche à côté du
`'case'` déjà existant) et pour le ranger Dessus/Dessous dans une pioche
(`insertSelectedCardIntoPile`, branche `selectedMonsterId` ajoutée au même endroit que
`selectedItemId`).

**Jeton sur le plateau — FUSIONNÉ avec le rendu des joueurs** ("le monstre doit être
vraiment considéré comme un joueur sur le plateau", Gus — remplace un premier essai qui
donnait aux monstres leur propre clustering en coin de case, façon items, pour éviter
qu'ils se superposent au joueur qui vient de les rencontrer) : `cellGroups` regroupe
maintenant `players` ET `monsters` ensemble (chaque entrée taguée `kind:'player'` ou
`kind:'monstre'`), donc un monstre seul sur une case est centré exactement comme un
joueur seul, et un monstre qui partage sa case avec un joueur (le cas normal — il apparaît
sur la case du joueur qui l'a rencontré) se répartit le MÊME jitter que plusieurs joueurs
entre eux, au lieu de se caler sur un coin séparé. Rendu (couleur/glyphe différents selon
`kind`) toujours dans le même bloc JSX, donc toujours entre les items et rien d'autre —
plus besoin de bloc de rendu séparé. Glow de sélection en rouge (`0 0 10px 3px #f66`)
plutôt que le bleu habituel, pour distinguer au premier coup d'œil "un monstre est
sélectionné" de "un joueur/une carte est sélectionné(e)".

**`cellPicker` généralisé en deux colonnes quand des monstres partagent la case** (CLAUDE.md
prévoyait déjà cette évolution avant même l'existence des monstres — "la fenêtre de choix
joueurs/monstres (deux colonnes)") : `cellPicker` porte maintenant `playerIds`/
`monsterIds` séparément (au lieu d'un seul `ids`). Tant qu'une case n'a que des joueurs,
le picker reste EXACTEMENT le rendu à une colonne déjà validé (`Popup` en mode `items`,
grandes cibles de tap) — dès qu'un monstre rejoint la case, il bascule en mode `children`
à deux colonnes (même schéma que `itemCellPicker` pour sorts/énergies) : joueurs à gauche
(nom + pastille de couleur), monstres à droite ("👹 Monstre" répété par entrée, cartes
placeholder identiques pour l'instant). Vérifié qu'aucune régression n'affecte le cas
"plusieurs joueurs, aucun monstre" (toujours 220px, une seule colonne).

**Voir la carte d'un monstre en grand, avec `‹`/`›` pour parcourir les autres monstres de
la même case — implémenté, deux points d'entrée** (Gus : "en mode vision, quand on clique
sur le monstre, ça affiche sa carte en grand... et si il y a plusieurs monstres... les
< et > en bas") :
- **Mode Vision, clic direct sur une case monstre-seule (sans joueur dessus)** : ouvre
  `enlargedMonster` (`{monsterIds, index}` — tous les monstres de CETTE case, pour que
  `‹`/`›` les parcoure) directement, sans passer par le `cellPicker` — il n'y a aucune
  ambiguïté de TYPE à lever (pas de joueur à départager), contrairement à une case mixte
  joueur+monstre(s) ou plusieurs joueurs, qui elle ouvre toujours le picker comme avant
  (choisir un monstre dans le picker en mode Vision ouvre aussi `enlargedMonster`).
- **Mode normal, bouton "œil" sur un monstre sélectionné** (voir juste en dessous) — même
  fenêtre `enlargedMonster`, réutilisée telle quelle : pas de fenêtre séparée à maintenir
  pour les deux entrées.
- `enlargedMonster` n'est donc PAS exclusif au mode Vision malgré son nom (même schéma
  multi-point-d'entrée que `enlargedItem`, déjà utilisable depuis le pied de page ET la
  fenêtre Vision joueur) — rendu identique à `visionPeekItem` (fond plein écran, carte
  `CardFace` de 140px, flèches qui bouclent puisque rien dans la demande n'exigeait un
  arrêt en bout de liste ici, contrairement à la défausse ci-dessous).

**Sélectionner un monstre en mode normal affiche deux boutons au croisement de la
grille, comme les tuiles** (Gus : "deux options placées au croisement de la grille
(comme les cartes map)... en haut à droite un œil... en haut à gauche une croix rouge") :
même style de bouton flottant que les contrôles de tuile (`inGridBtnStyle`, positionnés
sur les COINS de la case plutôt que sur ses arêtes, pour la même raison qu'eux — voir
"Pioche et pose de tuiles" plus bas), juste 2 boutons au lieu de 3 puisqu'il n'y a rien à
tourner/retourner ici : `EyeIcon` (nouveau, même traitement SVG trait fin que
Rotate/Flip/Target — un glyph emoji 👁️ n'est pas centré pareil selon la police) en haut
à droite ouvre `enlargedMonster` sur tous les monstres de cette case ; ✕ rouge en haut à
gauche appelle `discardSelectedMonster` — un second point d'entrée pour le même geste que
cliquer la défausse monstre pendant que le monstre est sélectionné (les deux cohabitent
sans conflit).

**Même paire œil/croix ajoutée pour un item sélectionné** (sort/énergie sur le plateau,
Gus : "avoir l'oeil et la croix quand on sélectionne c'est une bonne idée, tu peux aussi
ajouter ça pour les items ?") : l'œil réutilise directement `visionPeekItem` (déjà conçu
pour afficher une carte en grand avec `‹`/`›` scopés à la case — voir Couche 3 plus bas),
donc AUCUNE nouvelle fenêtre à créer, juste une nouvelle façon de l'ouvrir ; la croix
appelle `discardSelectedItem` (déjà existante). `visionPeekItem` n'est donc plus, lui non
plus, exclusif au mode Vision malgré son nom — même remarque que `enlargedMonster`
ci-dessus.

**Mode Vision et pioches/défausses — implémenté** (Gus : "pas pouvoir cliquer sur les
pioches (que ça fasse rien)... par contre si on clique sur la défausse... afficher la
carte en grand avec des < et > en bas pour faire défiler toutes les cartes") :
- **Pioches (les 4 types) : totalement inertes en mode Vision.** Le contenu d'une pioche
  est face cachée/inconnu tant qu'on n'a pas pioché — rien de sensé à prévisualiser, donc
  Gus a demandé qu'un clic ne fasse RIEN. `PileGroup` calcule maintenant
  `pileClickDisabled = visionMode ? true : (disabled && !allowPileDraw)` — le `visionMode
  ? true` prime toujours sur `allowPileDraw` (qui, lui, ne sert qu'à laisser passer le
  clic pendant le mode tuile `'placed'`, un état qui ne peut de toute façon jamais
  coexister avec le mode Vision — l'entrée en Vision vide déjà toute sélection de tuile).
  L'armement par appui long (Diviser/Mélanger) est bloqué de la même façon
  (`pileArmBlocked = visionMode || disabled`, passé en `blockArm`).
- **Défausses : le clic est totalement REPENSÉ plutôt que bloqué** — sa carte du dessus
  est déjà connue/face visible, donc au lieu d'être inerte comme les pioches, cliquer une
  défausse en mode Vision ouvre `visionDiscardPeek` (`{type, index}`) à la place du
  comportement normal (sélection/fusion/dépôt) : `DiscardSlot` reçoit une prop
  `visionMode` et vérifie ce cas tout en haut de son `handleClick`, avant même de
  regarder `disabled` — l'armement par appui long reste lui bloqué comme pour les pioches
  (`onPointerDown` retourne si `disabled || visionMode`).
- **`discardBrowseList(type)`** = `discardCards` filtré par type puis INVERSÉ, pour lire
  du plus RÉCENT (la carte du dessus, déjà affichée normalement) vers le plus ANCIEN —
  index 0 = la carte du dessus. **Délibérément SANS boucle** (Gus : "il faut pas de
  loop... la première carte... il y a que un >... la dernière carte... il y a que un <"),
  contrairement à TOUS les autres carrousels `‹`/`›` de l'app (`shiftEnlarged`,
  `shiftVisionPeek`, `shiftEnlargedMonster`, tous à modulo/bouclage) — `shiftDiscardPeek`
  clampe au lieu de boucler (`if (next < 0 || next >= list.length) return prev;`), et le
  rendu ne montre `‹`/`›` que si `index > 0` / `index < list.length-1` respectivement, au
  lieu du `list.length > 1` inconditionnel des autres fenêtres.

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
- Deck : généré depuis le vrai catalogue (`data.cases`, statut Validé, un exemplaire par
  unité de `quantite`/ligne de détails) — voir "Pioches dynamiques depuis le catalogue"
  ci-dessous pour le détail complet (remplace l'ancien deck de 100 cartes identiques).
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
- **Suspecté : diviser une pioche qui a débordé sur une 2ème ligne du header ne
  fonctionnait plus sur Android** (Gus, testant sur téléphone Android : "je ne peux
  plus diviser les pioches qui sont sur une nouvelle ligne (la 3ème et 4ème pioche des
  sorts par exemple)") — non reproduit en simulation souris/Chromium malgré plusieurs
  essais (le clic/appui long fonctionne à l'identique quelle que soit la ligne dans ce
  cadre de test), donc pas de confirmation directe possible dans cet environnement
  (aucun WebKit/Chrome mobile réel disponible ici, même limite que les bugs iPhone déjà
  documentés plus haut). Hypothèse retenue, appuyée sur un bug de MÊME NATURE déjà
  rencontré et corrigé ailleurs dans l'app (voir "Réordonnancement des items équipés du
  pied de page ne fonctionnait pas en pratique" plus haut) : la rangée du header qui
  contient les pioches a `overflowX:'auto'` (scroll horizontal natif) — sur un
  navigateur tactile, un appui qui reste posé dans un conteneur scrollable peut être
  interprété par le navigateur comme le début d'un geste de scroll, qui annule le
  `pointerdown` en cours via un `pointercancel` avant que le minuteur de 500ms de
  l'appui long n'ait eu le temps de se déclencher — plus il y a de pioches/de lignes
  dans cette rangée, plus il y a de "surface scrollable" dans laquelle le navigateur
  peut chercher à interpréter le geste comme tel. Fix (même remède déjà validé pour le
  pied de page) : `touchAction:'none'` posé sur le carré cliquable de `PileStack` ET de
  `DiscardSlot` (les deux vivent dans cette même rangée) — indique au navigateur que
  l'élément gère lui-même ses propres gestes, sans empêcher le scroll HORIZONTAL de la
  rangée elle-même porté par le CONTENEUR parent (qui n'a pas cette propriété). Pas
  vérifié sur un vrai appareil Android — à confirmer par Gus, à revenir dessus si le
  symptôme persiste.
- **Ces popups peuvent quand même sortir de l'écran (bord droit surtout) — clampées
  maintenant** (Gus : "possible de vérifier si la fenêtre a la place pour s'ouvrir
  avant ? et si non qu'elle se déplace un peu") : `clampPopupPos(left, top, width,
  height)` (fonction pure, en haut du fichier) borne la position calculée pour
  qu'aucun bord ne dépasse l'écran (marge de 8px). Comme ces fenêtres s'ouvrent
  AVANT leur premier rendu (rien à mesurer dans le DOM à ce moment-là), largeur/
  hauteur sont estimées plutôt que mesurées — précis maintenant que ces menus sont
  tous emoji-only (voir juste en dessous), donc de taille prévisible. `pickerDims
  (colACount, colBCount, twoColumn)` calcule cette estimation pour `cellPicker`/
  `itemCellPicker` à partir du nombre d'entrées de chaque colonne ; les menus de
  pioche/défausse (Diviser/Mélanger/Dessus/Dessous) utilisent des tailles fixes
  (peu d'entrées, toujours 1-2 lignes). Vérifié qu'un menu qui déborderait à droite
  se recale bien à gauche plutôt que de dépasser (testé en réduisant la largeur de
  la fenêtre jusqu'à forcer le débordement).
- **Menus/pickers passés en emoji seul, sans le texte** (Gus : "enlève les noms des
  fenêtres pour choisir différentes choses sur une même case, garde juste les
  emoji... pareil pour les pioches quand on veut mélanger, diviser, mettre au
  dessus ou en dessous") : "✂️ Diviser"/"🔀 Mélanger"/"⬆️ Dessus"/"⬇️ Dessous" →
  juste l'emoji ; "👹 Monstre" (colonne monstres de `cellPicker`) → "👹" ; "🪄
  Sort"/"🔥 Énergie" (`itemCellPicker`) → juste l'emoji. Les joueurs dans
  `cellPicker` gardent leur nom + pastille de couleur (aucun emoji ne les
  représente, et le nom est la seule info qui les distingue réellement — contrairement
  aux entrées monstre/sort/énergie, identiques entre elles, où le texte répété
  n'apportait rien).

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
- **Mini-animation quand un paquet se divise** (Gus : "si tu peux faire une mini
  animation du paquet qui se déplace vers sa nouvelle position quand on le divise c'est
  cool") — un petit FLIP (First-Last-Invert-Play) : `splitPile` mesure le rectangle
  écran du paquet ORIGINAL (via un attribut `data-pile-id` posé sur la racine de chaque
  `PileStack`, seul moyen pour cette fonction — qui n'a accès à aucune ref de composant
  individuel — de retrouver son DOM) juste **avant** de committer la coupe, puis passe ce
  rectangle au nouveau paquet (2ème moitié) via une prop `spawnFromRect`. Ce nouveau
  paquet, une fois monté à sa vraie position CSS grid (destination), se "replaque"
  instantanément sur le rectangle d'origine (`transition:'none'`, `transform:translate(dx,
  dy) scale(.85)`, `opacity:.5`), force un reflow, puis réactive les transitions et
  efface le décalage — le navigateur anime alors visuellement le glissement+grossissement
  de l'ancienne position vers la nouvelle. `splitAnim` (state de `PlateauPage`) est un
  **tableau** de `{pileId, fromRect}` plutôt qu'un objet unique — Reset (voir plus bas)
  peut faire naître 2 paquets à la fois (sorts + énergies), chacun doit pouvoir jouer son
  animation indépendamment ; chaque `PileStack` retire sa propre entrée via
  `onSpawnAnimDone(pile.id)` une fois son animation terminée (~400ms).
  - **Bug corrigé (impossible de diviser une pioche au-delà de la première d'un type,
    fenêtre Diviser/Mélanger quasi hors écran sur la 2ème, invisible sur la 3ème)** —
    Gus : "à part la première pioche d'un type de carte, je ne peux pas les diviser...
    la fenêtre pour diviser ou mélanger est quasi à l'extérieur de l'écran et quand j'en
    fais une 3ème je ne vois pas du tout la fenêtre". Cause : une fois la transition FLIP
    "posée" (transform `translate(0,0) scale(1)`, valeur identité donc visuellement
    invisible), ce style inline **restait pour de bon** sur la racine `anchorRef` du
    paquet concerné — seul `spawnFromRect` (la prop qui déclenche l'effet, donc
    seulement pour un paquet NÉ d'une division, jamais le tout premier paquet d'un
    type) en héritait, ce qui explique très exactement le symptôme "sauf le premier".
    Or un `transform` autre que `none` sur un ancêtre — même une valeur identité —
    fait de CET ancêtre le bloc de référence ("containing block") pour tout
    descendant `position:'fixed'`, à la place du viewport (règle CSS). Le menu
    Diviser/Mélanger est justement rendu en `position:'fixed'`, avec un `left`/`top`
    calculés en coordonnées VIEWPORT par `menuPosNow()` — une fois le bloc de
    référence détourné vers le petit carré de la pioche (au lieu du viewport), ces
    mêmes coordonnées se retrouvaient interprétées relativement à ce petit carré,
    projetant le menu très loin de sa position voulue (pire à chaque pioche issue
    d'une division supplémentaire, chacune portant sa propre valeur détournée). Fix :
    le `setTimeout` qui marque la fin de l'animation (~400ms) efface maintenant
    entièrement `transition`/`transform`/`opacity` (chaînes vides) au lieu de les
    laisser à leur valeur "posée" — l'ancêtre redevient `transform:none`, rendant le
    viewport comme bloc de référence normal pour le menu `position:'fixed'`. Vérifié
    en Playwright : diviser une pioche 3 fois de suite, le menu Diviser/Mélanger de
    chaque pioche (la toute première, la 2ème, la 3ème) reste entièrement dans les
    limites de l'écran à chaque fois.
- **Reset mélange déjà toutes les pioches (rien à faire) et divise maintenant sorts +
  énergies + monstres en 2 chacune, avec la même animation jouée dans l'ordre gauche à
  droite** (Gus : "quand on reset une partie tu peux mélanger toutes les pioches ? puis
  diviser en 2 les pioches sorts, énergie... et si quand on reset on peut voir
  l'animation des paquets qui se divise juste après c'est top", puis dans un second
  temps : "il faut aussi mélanger puis diviser la pioche de monstre" et "l'animation de
  division tu peux faire dans l'ordre gauche à droite ? sort, énergie puis monstre") —
  chaque deck frais est déjà rebrassé à sa construction (`buildSortCards`/
  `buildEnergieCards`/`buildMonstreCards` finissent tous par `shuffle()`), donc
  "mélanger" ne demandait aucun code nouveau. `resetBoard` coupe en plus les paquets
  `sort`/`energie`/`monstre` fraîchement construits en deux (même logique que
  `splitPile`) avant de committer. Contrairement à une division manuelle, Reset n'a
  **aucun DOM préexistant** à mesurer pour une origine FLIP classique (l'ancien paquet
  n'existe déjà plus) — solution : un state dédié `pendingResetSplitAnim`
  (`{sort:{firstId,secondId}, energie:{...}, monstre:{...}}`), posé juste après le
  `commitBoard` du reset, déclenche un `useLayoutEffect` séparé qui mesure la position
  de la PREMIÈRE moitié (déjà montée à sa position naturelle par le rendu qui vient de
  se produire) et l'utilise comme origine `fromRect` pour la SECONDE — le tout premier
  groupe (`sort`) le fait de façon synchrone à l'intérieur du layout effect (donc avant
  la peinture écran, aucun flash visible même si la 2ème moitié est techniquement déjà
  affichée à sa position finale une fraction de rendu plus tôt) ; `énergie` et `monstre`
  sont ensuite décalés via `setTimeout` (échelonnés de 180ms) pour obtenir la cascade
  gauche-à-droite demandée, un flash minime au démarrage de chacun étant cette fois
  attendu (c'est littéralement l'effet "cascade" recherché).
  - **Piège rencontré (les animations décalées ne jouaient jamais, seule la première
    partait)** : `setPendingResetSplitAnim(null)` était appelé juste après avoir
    programmé les `setTimeout` de la cascade, dans l'idée de "consommer" l'état une
    fois traité — mais cet appel change la dépendance de CE MÊME `useLayoutEffect`
    (`[pendingResetSplitAnim]`), donc React exécute son cleanup (`timers.forEach
    (clearTimeout)`) immédiatement, avant même que le premier timer n'ait eu la chance
    de se déclencher — confirmé en ajoutant des logs temporaires (`fire()` n'était
    appelé qu'une seule fois, jamais pour `énergie`/`monstre`). Fix : ne plus annuler
    `pendingResetSplitAnim` du tout après usage — le laisser en place ne pose aucun
    problème puisqu'un futur Reset construit de toute façon un objet flambant neuf
    (nouvelle identité), qui re-déclenche l'effet indépendamment de la valeur
    précédente.
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

### Pioches dynamiques depuis le catalogue — implémenté
**Bug corrigé (images cassées après un Reset suivi d'un Undo)** : Gus, précisant un
premier rapport trop vague ("j'ai oublié de préciser, c'est quand je fais un reset puis
un undo") — pas reproductible en cherchant juste "après un Reset" seul (voir la 1ère
tentative ci-dessous, gardée pour mémoire), mais évident une fois le bon scénario en
tête. Cause : `resetBoard` faisait `cardCatalogRef.current = {}` avant de repeupler la
table avec les nouvelles cartes — logique en apparence ("les anciens ids ont disparu
pour de bon puisque Reset vide piles/placedTiles/discardCards/etc, autant repartir
propre plutôt que laisser la table grossir sans limite à chaque reset") mais faux depuis
que Reset lui-même est devenu annulable (voir "Undo/redo global" plus haut) : le
`commitBoard` du reset pousse l'état PRÉ-reset (piles/placedTiles/discardCards/
boardItems, avec les anciens ids) dans l'historique, et Undo peut le restaurer — sauf
que la table venait justement d'effacer les entrées de ces mêmes anciens ids. Résultat :
toute carte déjà posée avant le Reset retombe sur le glyphe/couleur générique de repli
après un Undo, plus jamais sur sa vraie image/texte. Fix : ne plus jamais vider la
table, seulement y ajouter (`registerDeckCards` ne fait déjà que poser des clés
individuelles, jamais un vidage) — une table qui grossit un peu à chaque reset d'une
longue session ne pèse rien face à perdre silencieusement l'art des cartes à l'Undo.
- **1ère tentative (non concluante)** : sans le détail "+ undo", cherché en testant
  "après un Reset" seul en Playwright — requêtes réseau et `backgroundImage` calculés
  tous corrects immédiatement après Reset (rien à voir avec le split automatique
  sorts/énergies/monstres ajouté la même session, cette piste a été vérifiée et
  écartée : `registerDeckCards` tourne sur `freshPiles`, AVANT la coupe en 2, donc
  chaque carte est bien enregistrée avant `commitBoard`). Le bug ne pouvait pas
  apparaître dans ce scénario puisqu'il ne se déclenche qu'à l'Undo qui suit.

Les 100 cartes identiques placeholder sont remplacées par de vraies pioches générées
depuis le catalogue (`data.cases`/`sorts`/`energies`/`monstres`, uniquement statut
**Validé**, un exemplaire de carte par unité de `quantite`) — modifier le catalogue et
faire Reset change directement la composition de la pioche, sans code à toucher.
`makeInitialPiles(catalog)` (`PlateauPage.js`) construit les 5 decks :
- **Cases** : `buildCaseCards` — un exemplaire par **ligne de détails** (`item.details[]`,
  voir "Détails d'un bloc Cases" plus haut), pas par bloc entier, puisqu'un bloc comme
  "Case Portail" recouvre plusieurs fichiers visuellement différents. La ligne dont le
  `fichier` vaut exactement `Case_de_Depart.png` est explicitement exclue de ce deck-là —
  elle alimente `buildDepartCards` à la place (pioche 'depart' séparée, "pas case map
  classique"). Repli si un bloc Validé n'a encore aucune ligne de détails : génère quand
  même `quantite` cartes, juste sans image de face spécifique (glyphe générique de
  `CardFront`), plutôt que de faire disparaître silencieusement tout le bloc de la pioche.
- **Sorts/Énergies/Monstres** : `buildSortCards`/`buildEnergieCards`/`buildMonstreCards`
  (`expandByQuantite` commun) — chaque carte reçoit son `back` (fichier image du dos)
  calculé une fois à la construction, AVANT le mélange (`shuffle` mélange l'ordre de
  pioche, jamais le dos déjà assigné à chaque carte).
- **Énergies catégorie "Commun" — clonées en 4 (une par élément) SEULEMENT dans la
  pioche du Plateau, jamais dans le catalogue affiché** (Gus : "toutes les énergies
  sauf ombre et multi vont dans la catégorie commune, donc commune il doit en ajouter
  un exemplaire dans chaque élément (eau feu air et terre), pas visible dans l'appli...
  mais à ajouter quand même pour le jeu" — confirmé via `AskUserQuestion` : génération
  côté Plateau plutôt que dupliquer des entrées dans `data.json`) : `expandCommunEnergies`
  (`PlateauPage.js`), appelée par `buildEnergieCards` avant `expandByQuantite`, remplace
  chaque entrée catalogue `element:'Commun'` par 4 clones (`COMMUN_ELEMENTS = ['Eau',
  'Feu', 'Air', 'Terre']`), chacun avec `element` réécrit et donc son propre dos réel
  (`energyBackFor`) — une entrée Commun à `quantite:2` donne 8 cartes physiques au
  total (2 par élément). La page Énergies de l'app (catalogue) ne voit jamais ces clones
  — `data.energies` garde une seule entrée "Commun" par effet, comme voulu.

**Table de correspondance id → données du catalogue (`cardCatalogRef`)** — pièce
centrale de toute cette fonctionnalité : chaque transition d'état (piocher/poser/
défausser/équiper) reconstruit un objet minimal (`{id, type, row, col, ...}`), **jamais**
les champs du catalogue (nom/effet/élément/etc.) — confirmé en lisant `drawFromPile` :
annuler une pioche remet la carte dans `pile.cards` sous la forme `{id:cardId}` seul, dos
et tout le reste perdus. Threader `fichier`/`nom`/`effet`/... à travers chacun de ces
~15 sites de reconstruction aurait été fragile (un seul oublié = donnée perdue). Solution
retenue : une table `cardCatalogRef.current` (`useRef`, PAS un state React), remplie
**une seule fois** à la création de chaque pioche (`registerDeckCards`, appelée dans
l'initialiseur de `useState(piles)` et dans `resetBoard`), qui associe chaque `id` de
carte à ses données complètes (`{kind, ...champs du catalogue}`) — persiste tant que la
partie tourne, jamais mutée après coup. **Chaque site de rendu d'une `CardFace` résout
`data` via `cardCatalogRef.current[cetIdLà]`** plutôt que de faire confiance à l'objet
d'état qui le porte. Persistée dans le même blob `localStorage` que `players`/`piles`/etc.
(clé `cardCatalog`) pour survivre à un rechargement de page — sans ça, un id chargé depuis
une session sauvegardée ne retrouverait plus ses données après un `F5`. Pas incluse dans
l'historique undo/redo : elle ne fait que grandir (nouvelles pioches au Reset), donc
revenir en arrière sur le reste de l'état ne rend jamais orphelin un id qui y est encore.
**Cas particulier du "tenir" (`heldTile`/`heldItem`)** : au moment où une carte est
piochée, elle est retirée de `pile.cards` — la case/pioche qui l'affichait "en main"
(`PileStack`, voir plus bas) ne peut donc plus la retrouver via `pile.cards`, seul le
`cardId` transite (`heldTile.cardId`/`heldItem.cardId`) ; `holding` (objet passé à
`PileGroup`) gagne un champ `cardId` en plus de `pileId` pour ça, relayé à `PileStack`
sous le nom `heldCardId`.

**Dos et faces des cartes** (`cardAssets.js` + `CardFace`/`CardFront` dans
`PlateauPage.js`) — mapping donné par Gus :
- **Cases** : dos toujours `Case_Map_Back.jpg` (identique pour toutes, seule la face
  change) ; face = l'image du fichier de la ligne de détails correspondante, affichée
  telle quelle (`object-fit:cover`), **aucun texte ajouté par-dessus**.
- **Cases de départ** : face ET dos = `Case_de_Depart.png` (même image des deux côtés,
  "recto verso identique") — codé en dur pour `kind:'depart'`, aucune donnée par carte
  nécessaire.
- **Sorts** : dos = `Sort_Back_<Élément>.jpg`, SAUF Ombre — pas de dos dédié (et jamais
  `Sort_Back_Multi.jpg` non plus, exclu explicitement par Gus) : `sortBackFor` fait
  alterner Feu→Eau→Terre→Air→Feu... dans l'ordre du catalogue (`ombreIndex`, incrémenté
  uniquement pour les sorts Ombre, AVANT le mélange du deck — l'ordre "physique" de
  pioche est aléatoire, mais l'assignation du dos reste stable par position catalogue).
- **Énergies** : dos = `Energy_Back_<Élément>.jpg`, SAUF Ombre ET Multi qui partagent
  tous les deux `Energy_Back_Multi.jpg` (`energyBackFor`).
- **Monstres** : dos = `Monstre_<N>.jpg` où `N` = le numéro du niveau (`Lvl 2` →
  `Monstre_2.jpg`), pas l'élément (les monstres n'en ont pas) — `monsterBackFor`.
- **Faces des sorts/énergies/monstres** : pas d'image de face fournie, texte composité
  par-dessus un fond blanc uni (`CardFront`, un seul composant à 3 branches par `kind`) :
  - Sort : 🔮 élément en haut-gauche, nom en haut-centre, `effet` au centre, `cout`+
    `limite` en bas (ex: "1 PA, 1x tour").
  - Énergie : élément en haut-gauche, `effet` centré-haut, et en bas le **bonus naturel
    fixe par élément** (pas une donnée du catalogue, une constante `ENERGY_BONUS` dans
    `cardAssets.js`) : Multi/Ombre/Eau/Air → "+1 PA", Feu/Terre → "+1 PV".
  - Monstre : niveau en haut-gauche, nom en haut-centre, **`LR[lvl]`** (config.js, déjà
    utilisé ailleurs pour "1 énergie / -2 au dé" etc. — c'est l'exemple que Gus a donné
    lui-même dans sa demande) centré au milieu, `effet` ("Victoire : ...") en bas.
    **`MONSTER_PV_BONUS` ("2 PV")** affiché sur sa propre ligne juste en dessous de
    `LR[lvl]`, identique pour tous les niveaux (Gus : "rajouter '2 PV' pour tous les
    monstres... écrit à la ligne sur la carte et sans '+'") — une constante séparée
    dans `config.js` plutôt que concaténée dans le texte `LR` (un essai précédent
    avait fait `LR[lvl] + " + 2 PV"`, rejeté par Gus car sur la même ligne avec un
    "+").
  - Toutes les tailles de police sont dérivées de `size` (la taille réelle de la carte à
    l'écran, de 22px sur le plateau à 140px en grand) via un facteur `base = size/140` —
    le texte rétrécit avec la carte mais **ne change jamais ses dimensions** (`overflow:
    hidden`, `position:absolute inset:0`), quelle que soit la longueur du texte — exigence
    explicite de Gus ("fait bien attention que le texte que tu ajoutes ne déplace pas la
    taille de la carte"). Repli générique (glyphe `+`/🪄/🔥/👹 d'origine) si `data` est
    vide (carte inconnue de `cardCatalogRef`, ex: session sauvegardée avant cette
    fonctionnalité).

#### Retouches après premier retour de Gus sur les vrais visuels (même session)
- **Fond au lieu d'`<img>` — évite le "télécharger l'image ?" mobile** (Gus : "problème
  sur les pioches quand je reste appuyé ça me propose de télécharger l'image") : les deux
  faces de `CardFace` sont passées de `<img src=...>` à `backgroundImage` CSS sur le
  `div` lui-même (`background-size:cover`) — un `<img>` reste un élément natif que le
  navigateur mobile propose toujours de sauvegarder/partager sur un appui long, quel que
  soit `draggable:false` (qui n'empêche que le DRAG desktop, pas ce menu-là) ; un simple
  fond CSS n'est pas une "image" pour le navigateur au sens de ce menu contextuel, donc
  le problème disparaît structurellement plutôt que par un correctif CSS supplémentaire
  à ajouter en plus.
- **Items (sorts/énergies) affichés dos visible sur le plateau** (Gus : "les items
  doivent être côté dos sur le plateau") — `showBack:true` (au lieu de `false`) au site
  de rendu de `boardItems` sur la grille ; leur contenu reste consultable via l'appui
  long (Vision) ou en les reprenant en main, exactement comme le dos d'une pioche reste
  caché jusqu'au tirage. Ne concerne que ce site précis (pile/main/défausse/agrandi
  restent face visible comme avant).
- **Aperçu Vision d'un item seul sur une case : se fermait instantanément** (Gus,
  précisé : "uniquement si y a qu'un seul item sur une case") — l'ancien design ("reste
  appuyé pour prévisualiser, disparaît au relâchement") fermait la fenêtre dès que le
  doigt se soulevait, ce qui arrive quasi immédiatement après avoir perçu la carte en
  pratique (pas le temps de la lire). Remplacé par le même comportement persistant que le
  picker multi-items (`visionPeekItem` reste ouvert jusqu'à un tap en dehors) — l'appui
  long ouvre directement la fenêtre pour un item seul (sans passer par le picker,
  puisqu'il n'y a aucune ambiguïté à lever), au lieu de nécessiter un maintien continu.
  `peekingRef`/le cas `'peek'` de `handleItemLongPress` (devenus inutiles) supprimés.
- **Tailles/positions de texte ajustées sur `CardFront`** (retours visuels de Gus après
  avoir vu les premières cartes en jeu) : titre des sorts/monstres décalé un peu plus bas
  (`marginTop` ajouté, il touchait presque le bord haut) ; texte de récompense de niveau
  des monstres (`LR[lvl]`, ex: "1 sort / -1 au dé") agrandi ; texte de coin (niveau /
  emoji élément, `cornerStyle`) agrandi ; bonus naturel des énergies (`+1 PA`/`+1 PV`)
  agrandi. Toujours dérivé de `size` (jamais une taille fixe), donc le texte reste
  proportionnel à la carte à toutes les échelles malgré ces augmentations.
- **Réordonnancement des items équipés dans le pied de page ne fonctionnait pas en
  pratique** (Gus : "j'arrive pas à déplacer les items entre eux dans le footer") —
  `useFooterItemGestures` exigeait un maintien parfaitement immobile pendant 500ms avant
  d'armer le glisser ; le moindre mouvement pendant cette fenêtre annulait le timer
  entièrement (`clearTimeout`) sans jamais armer quoi que ce soit, or un vrai geste de
  glisser commence quasiment toujours à bouger bien avant 500ms — la fenêtre "d'appui
  immobile" requise n'était donc quasiment jamais atteignable en usage réel. Fix : dans
  `onMove`, un mouvement détecté AVANT que le timer n'ait eu le temps de se déclencher
  arme maintenant le glisser immédiatement (`armHold`) au lieu de simplement annuler —
  le mouvement lui-même sert de signal "c'est un glisser", plus besoin d'attendre les
  500ms d'immobilité complète en plus. Le tap court (→ agrandir) et l'appui long SANS
  bouger (→ sélectionner pour déplacer) restent inchangés, seul le cas "bouge presque
  tout de suite" change de comportement (annulé silencieusement avant → arme le glisser
  maintenant).

#### Deuxième passage de retouches (même session)
- **Bug corrigé (fenêtre d'infos joueur en mode Vision inatteignable, uniquement quand
  un monstre partage la case)** : Gus a précisé le symptôme signalé la fois précédente —
  ça marchait pour plusieurs joueurs SEULS sur une case, mais cassait dès qu'un monstre
  (donc le picker à 2 colonnes) s'ajoutait. Cause trouvée : le `onClick` de la colonne
  joueurs, dans la branche 2/3-colonnes de `cellPicker` (déclenchée dès qu'un monstre ou
  marqueur partage la case), ne vérifiait JAMAIS `cellPicker.forVision` — contrairement
  à la branche à une seule colonne (joueurs seuls) juste au-dessus, qui le faisait déjà
  correctement. Il appelait donc toujours `setSelectedId` (mode normal), jamais
  `setVisionPlayerId` (mode Vision). Fix : même garde `if (cellPicker.forVision) {...}
  else setSelectedId(id)` ajoutée à cette branche aussi.
- **`‹`/`›` ajoutés dans la fenêtre d'infos joueur pour parcourir les joueurs de LA MÊME
  CASE** (Gus : "ça peut être cool les <> si plusieurs joueurs même case") — remplace
  l'ancien booléen `visionPlayerFromSidebar` par `visionPlayerCycleIds` (tableau d'ids à
  parcourir, ou `null` = pas de flèches) : `null` pour un tap direct sur un jeton seul en
  mode Vision (aucune ambiguïté, "pas besoin de <>") ; tous les joueurs (ordre sidebar)
  pour une ouverture depuis la colonne latérale ; désormais aussi `cellPicker.playerIds`
  (juste les colocataires de la case, pas tous les joueurs de la partie) pour une
  ouverture depuis le picker multi-entités, qu'il soit à une ou plusieurs colonnes.
  `shiftVisionPlayer` parcourt maintenant cette liste au lieu de toujours `players`.
- **Réordonnancement des items du pied de page : la correction précédente ("armer au
  moindre mouvement") ne suffisait pas** — Gus : "ça rend grisé l'item mais c'est tout".
  Cause différente cette fois : la ligne d'items équipés garde `overflowX:'auto'` en
  filet de sécurité (au cas où plus de ~3 cartes) — un glisser démarré SUR une carte peut
  se faire happer par ce scroll natif à mi-geste, et le navigateur envoie alors un
  `pointercancel` plutôt qu'un `pointerup` normal. Seul `pointerup` était écouté : un
  `pointercancel` laissait `dragIndex` bloqué indéfiniment (carte grisée à vie, plus
  aucun `pointerup` à venir pour le libérer). Fix à deux niveaux : `touchAction:'none'`
  posé sur chaque carte équipée (empêche le navigateur de RECONNAÎTRE ce geste comme un
  scroll dès le départ, plutôt que corriger après coup) + un vrai gestionnaire
  `pointercancel` (`onCancel`, séparé de `onUp` — ne valide PAS de réordonnancement,
  la position suivie pourrait être périmée au moment où le navigateur interrompt,
  contrairement à un relâchement normal) qui réinitialise proprement l'état au lieu de
  rester bloqué.
- **Zoom iPhone toujours saccadé malgré `user-scalable=no`** — hypothèse probablement
  fausse depuis le début : Safari iOS **ignore `user-scalable=no`/`maximum-scale` pour
  son propre zoom natif depuis iOS 10**, choix d'accessibilité délibéré d'Apple (l'utilisateur
  doit toujours pouvoir zoomer) — donc ce correctif n'a probablement jamais rien empêché.
  Le zoom natif de Safari n'est de toute façon pas piloté par les évènements tactiles
  standards mais par ses propres évènements propriétaires `gesturestart`/`gesturechange`/
  `gestureend` (aucun équivalent standard, `touch-action` n'a aucun effet dessus) —
  totalement indépendants des Pointer Events déjà utilisés ici pour le pincement JS
  maison (`pointersRef`/`pinchRef`). Nouveau fix : `preventDefault()` sur ces 3
  évènements, posé sur le viewport de la grille uniquement (pas tout le document, pour
  ne pas gêner un pincement au-dessus du header/pied de page/popups) — méthode
  documentée pour désactiver le pincement natif de Safari et laisser le zoom JS de
  l'appli seul aux commandes. Ces évènements n'existant que sous Safari, ce fix est un
  no-op silencieux sur tous les autres navigateurs. Toujours **non vérifié sur un vrai
  appareil** (aucun WebKit disponible dans cet environnement) — à confirmer par Gus.
- **Retirer un item du pied de page va maintenant sur la case du joueur, pas la
  défausse** (Gus : "au lieu d'aller à la défausse, ça aille plutôt sur la case qui
  correspond au footer sur lequel on est") — `discardSelectedItem`, branche
  `selectedFooterItem` : au lieu d'ajouter la carte à `discardCards`, elle rejoint
  `boardItems` aux coordonnées `row`/`col` actuelles du joueur concerné (`sel.playerId`).
  Ne concerne QUE ce chemin précis (déséquiper un item déjà porté par un joueur) —
  délibérément inchangé pour `removePlayer` (supprimer un joueur entier envoie toujours
  son équipement dans les défausses, Gus l'a explicitement confirmé : "si on delete un
  joueur depuis les carrés de la barre verticale, là ça va quand même à la défausse") ni
  pour `selectedItemId` (un item déjà posé sur le plateau, défaussé depuis la grille,
  continue d'aller en défausse comme avant).

#### Troisième passage de retouches (même session)
- **Bug corrigé (100 → 110 cases map, une carte affichait encore le "+" placeholder)** :
  `buildCaseCards` vérifiait `details.length === 0` (le tableau APRÈS avoir retiré la
  ligne "Case de Départ") pour décider s'il fallait générer des cartes de repli sans
  image — mais pour le bloc "Case de Départ" lui-même (dont l'UNIQUE ligne de détails
  est justement celle-là), ce filtrage laissait `details` vide, donc le code croyait à
  tort que ce bloc n'avait "aucun détail renseigné" et générait 10 cartes de repli
  (glyphe "+") en plus dans la pioche normale — d'où 100 vraies + 10 fantômes = 110.
  Fix : vérifier `allDetails.length === 0` (AVANT le filtrage du départ) pour distinguer
  "bloc sans aucun détail" (repli légitime) de "bloc dont les détails sont uniquement le
  départ" (ne doit contribuer aucune carte ici, il alimente `buildDepartCards` à part).
- **Bug corrigé (options rotation/flip/défausse absentes sur une tuile sélectionnée via
  le nouveau re-tap)** : les 3 boutons de contrôle de la tuile sélectionnée
  (`RotateIcon`/`FlipIcon`/✕) étaient gardés par `selectedTileObj && !selectedTileOccupied`
  — un reliquat de l'ancien monde où une tuile occupée par un joueur ne pouvait
  structurellement jamais être sélectionnée (`selectTileAt` bloquait ça en amont), donc
  cette garde ne pouvait jamais se déclencher. Le nouveau geste de re-tap
  (`selectTileIgnoringOccupancy`) rend cet état désormais courant et légitime — la garde
  masquait donc les boutons précisément dans ce nouveau cas. Fix : condition supprimée,
  `selectedTileOccupied` retiré (plus utilisé nulle part ailleurs).
- **Bug corrigé (fermer la fenêtre agrandie d'un monstre/item par un clic dans le vide ne
  désélectionnait pas)** : ouvrir `enlargedMonster`/`visionPeekItem` via l'œil d'un
  monstre/item déjà sélectionné (mode normal) laissait `selectedMonsterId`/
  `selectedItemId` intacts après la fermeture de la fenêtre — le glow de sélection et les
  boutons œil/croix restaient visibles derrière. Fix : le `onClick` du fond (clic
  extérieur) de ces deux fenêtres désélectionne maintenant aussi en plus de fermer la
  fenêtre — sans effet dans les deux AUTRES façons de les ouvrir (tap direct en mode
  Vision, sélection via `itemCellPicker`/`cellPicker` en mode Vision), qui ne posent
  jamais ces ids de sélection normale de toute façon.
- **Bug PAS résolu malgré une première tentative (poser un item déjà sélectionné demande
  systématiquement 2 taps)** : Gus, très précis — "le premier tap quand l'item est
  sélectionné... c'est le tap d'après qui va déplacer l'item". Première hypothèse
  (session précédente) : un appui long qui tient parfaitement immobile pendant 500ms est
  en pratique presque impossible (main ou doigt réel) — un léger tremblement pendant la
  tenue dépasse souvent le seuil de 3px du détecteur de glisser-panoramique
  (`onViewportPointerDown`, complètement séparé du système d'appui long des items) sans
  dépasser le seuil de 6px qui annulerait l'appui long lui-même — l'appui long réussit
  donc (l'item se sélectionne bien) mais `wasDraggingRef` se retrouve à `true` en plus.
  Le clic natif qui suit systématiquement le relâchement d'un appui long était déjà
  absorbé via `suppressNextClickRef` — mais ce court-circuit `return`ait AVANT
  d'atteindre la vérification/remise-à-zéro de `wasDraggingRef` juste en dessous,
  laissant ce drapeau `true` fuiter jusqu'au tap SUIVANT (le vrai tap de pose) qui se
  faisait alors avaler à sa place, croyant conclure un glisser. Fix appliqué :
  `wasDraggingRef.current` est aussi remis à `false` au moment où `suppressNextClickRef`
  est consommé — **mais Gus a confirmé que le bug persiste** identique après ce fix, et a
  explicitement écarté l'hypothèse du tremblement ("je pense que ça n'a rien à voir avec
  le doigt qui bouge quand on sélectionne, parce que même très zoomé le problème est
  quand même là"). Détails précisés par Gus : sur téléphone Android, le premier tap
  "dans le vide" (sur une case libre du plateau) ne produit RIEN de visible (pas de
  changement d'apparence de l'item tenu), et ça arrive SYSTÉMATIQUEMENT, pas de façon
  intermittente. Non reproduit malgré plusieurs scénarios testés en Playwright (appui
  immobile, appui quasi instantané, sélection via `itemCellPicker`) — cause réelle
  encore non identifiée, à revoir avec plus de détails/logs si possible côté Gus.
- **Noms des monstres/items ajoutés dans les fenêtres de choix multi-entités** (Gus :
  "essaie d'ajouter les noms des items et des monstres... réduire la taille de la police
  si trop grand") — colonne monstres de `cellPicker` et les deux colonnes de
  `itemCellPicker` affichent maintenant le nom (`cardCatalogRef.current[id].nom`) à côté
  de l'emoji (élément pour les items, 👹 fixe pour les monstres). `pickerNameSize(name)`
  (nouvelle fonction, à côté de `pickerDims`) réduit la taille de police par palier selon
  la longueur du nom (14px normal → 12px au-delà de 14 caractères → 10px au-delà de 20)
  plutôt que de tronquer avec une ellipse, pour garder le nom entier lisible. Les
  marqueurs restent icône-seule (pas de "nom" à proprement parler pour eux, portée
  volontairement limitée aux items/monstres comme demandé).

### Cases de départ + marqueurs + extension du header — implémenté (dernier ajout, "on a fini la version locale !")
Dernière couche avant la fin de la version locale hotseat : un petit bouton `+`/`−` en
bas à droite du header (positionné pour ne jamais chevaucher la défausse monstre, qui
est décalée vers l'intérieur de sa propre colonne plutôt que collée au bord de l'écran)
ouvre/ferme une extension du header (`headerExtOpen`, purement de l'UI, pas persisté ni
undoable) contenant deux choses nouvelles :

- **Cases de départ** : un 5ème type de pioche de tuile (`pile.type:'depart'`), 10 cartes
  seulement (`makeDeck('depart', 10)` — `makeDeck` prend maintenant un `count` en second
  paramètre, 100 par défaut pour ne rien changer aux 4 pioches existantes) plutôt que le
  placeholder à 100. Mécaniquement **identique à une case normale** (pioche/défausse/
  rotation/flip/déplacement/défausse, un seul geste de sélection par double-clic, mode
  `'placed'` rotate-only après la pose...) : réutilise tout le système de tuiles existant
  sans nouveau code de geste, simplement en donnant à `placedTiles` un champ `type` qu'il
  n'avait pas avant (implicitement toujours `'case'` jusqu'ici) — threadé à travers
  `heldTile` (nouveau champ `tileType`, posé par `drawFromPile` depuis `pile.type`),
  la pose (`placedTiles` retient `type:heldTile.tileType||'case'`), le rendu de la tuile
  (`CardFace` reçoit `kind:t.type||'case'`), `discardTile` (relit le type de la tuile
  plutôt que de forcer `'case'` en dur comme avant) et la branche de pose depuis la
  défausse (`dcard.type === 'case' || dcard.type === 'depart'`). `drawFromPile` route
  maintenant `'case'` ET `'depart'` vers la branche `heldTile` (`pile.type !== 'case' &&
  pile.type !== 'depart'` décide qui va dans `heldItem` à la place). `BACK_ACCENT`/
  `FRONT_GLYPH` gagnent une entrée `depart` (bordure verte, glyphe "D" placeholder).
  **Mélange interdit avec les cases normales** ("pas possible de mélanger une case de
  départ et une case map dans les pioches") : ne demande aucun code dédié — comme chaque
  pioche a déjà son propre `pile.type`, `mergeArmedInto` (qui refuse déjà toute fusion
  entre deux types différents) bloque la fusion pour la même raison qu'il empêche déjà
  case/sort/énergie/monstre de se mélanger. Seule subtilité : `hasSelectedCardOfType`/
  `hasSelectedForDiscardOfType` comparaient auparavant juste "y a-t-il une tuile
  sélectionnée" pour le type `'case'` — puisque `case` et `depart` partagent maintenant
  le même état `selectedTileId`, ces deux fonctions regardent maintenant aussi le
  `type` réel de la tuile sélectionnée (`selectedTileObj?.type`) pour départager, sinon
  sélectionner une case de départ aurait pu ouvrir le menu Dessus/Dessous de la pioche
  de cases normales (et vice versa).
- **Marqueurs** : 5 jetons/drapeaux à quantité **illimitée** ("je peux en prendre en
  remettre comme je veux") — donc PAS de pioche ni de défausse, juste un tableau
  `markers` (`{id, row, col, type}`) et un bouton dédié par type (`MarkerButton`, pas un
  `PileStack`) dans l'ordre exact donné par Gus : 🔵 jeton bleu, drapeau bleu, drapeau
  rouge, 🔴 jeton rouge, 🪨 roche (placeholder "en attendant"). Les deux drapeaux
  partagent un même composant `FlagIcon` (SVG trait, coloré par prop) plutôt qu'un emoji
  — aucun emoji Unicode ne rend un "drapeau bleu" simple, et mélanger un emoji pour l'un
  et un SVG pour l'autre aurait été visuellement incohérent.
  **Réagissent "exactement comme les monstres, considérés comme un joueur"** : cliquer
  un bouton marqueur "tient" un marqueur fraîchement `uid()`-é (`heldMarker`, même cycle
  que `drawFromPile` mais sans pioche source — recliquer le MÊME bouton annule, cliquer
  un AUTRE bouton pendant qu'on en tient un ne fait rien, mêmes règles qu'une pioche),
  un tap sur la grille le pose ; une fois posé, un simple tap le sélectionne
  (`selectedMarkerId`), un second tap ailleurs le déplace. Rejoint le MÊME clustering de
  case que joueurs/monstres (`cellGroups`, tag `kind:'marker'`) plutôt qu'un système de
  coin séparé comme les items — un marqueur seul se centre comme un joueur seul, un
  marqueur qui partage sa case avec d'autres entités se répartit le même jitter. Glow de
  sélection bleu (comme une tuile), pas rouge comme un monstre — la forme de l'icône
  suffit déjà à distinguer les types entre eux, pas besoin d'une couleur dédiée. Un
  marqueur sélectionné n'affiche qu'une croix ✕ (pas d'œil : il n'y a pas de contenu de
  carte à agrandir, l'icône EST son apparence). Défausser un marqueur (`discardSelectedMarker`)
  le supprime simplement du plateau — pas de défausse à alimenter, il peut être recréé
  gratuitement à tout moment depuis son bouton. `MarkerButton` est bloqué (comme les 4
  pioches) pendant le mode `'placed'` d'une tuile (`pilesDisabled`) et pendant le mode
  Vision (`visionMode`, même esprit que "pioches totalement inertes en mode Vision" —
  même si un marqueur n'est pas une pioche à proprement parler, l'idée "aucune nouvelle
  entité tant que Vision inspecte" reste cohérente).
  **Mode Vision volontairement scopé de côté** : contrairement aux monstres, les
  marqueurs ne sont PAS rassemblés dans la branche Vision de `handleSingleClick` — taper
  une case avec seulement un marqueur (sans joueur/monstre) en mode Vision ne fait donc
  rien, exactement comme avant l'ajout des marqueurs. Pas de contenu de carte à afficher
  en grand pour un marqueur de toute façon.
  **Attention aux problèmes de sélection déjà rencontrés avec joueurs/monstres/items**
  (Gus a explicitement demandé d'y faire attention) : `selectedMarkerId` a été ajouté
  partout où `selectedMonsterId` l'était déjà — `hasAnySelection()`, `clearCardSelection()`,
  `liveRef`, `commitBoard`/`applySnapshot`/`currentSnapshot` (pour `markers` lui-même,
  comme `monsters`), la persistance `localStorage`, et TOUS les sites "une seule chose
  sélectionnée à la fois" (`toggleSelectDiscardCard`, `insertSelectedCardIntoPile`,
  `selectFooterItem`, `handleItemLongPress`, les deux branches de `drawFromPile`,
  `selectTileAt`, `resetBoard`, `toggleVisionMode`, `drawMarker` lui-même). `MarkerButton`
  a sa propre enveloppe `drawMarkerOrCancelSelection` (mirroring `drawFromPileOrCancelSelection`)
  puisque ce n'est ni un `PileStack` ni un `DiscardSlot` — pas de prop `hasSelectedCard`
  à lui passer, donc un `hasAnySelection()` direct suffit. Vérifié explicitement :
  cliquer un AUTRE bouton marqueur (ou n'importe quel autre contrôle guardedBySelection)
  pendant qu'un marqueur est sélectionné annule la sélection au lieu d'en tenir un
  nouveau ; un marqueur partageant une case avec un joueur ouvre bien le `cellPicker` à
  colonnes multiples (voir juste en dessous) ; l'undo/redo restaure bien un marqueur
  défaussé.
- **`cellPicker` étendu à 3 colonnes** : portait déjà `playerIds`/`monsterIds` séparément
  (voir "Monstres traités comme des 'joueurs'") — gagne maintenant `markerIds`. Le mode
  liste à une seule colonne (cas d'origine, toujours intact) ne s'active que si NI
  monstre NI marqueur ne partage la case ; dès que l'un des deux est présent, bascule en
  mode `children` à colonnes — la colonne monstres reste toujours rendue dans ce mode
  (même si vide, comportement hérité identique à avant les marqueurs), la colonne
  marqueurs ne s'ajoute que si `markerIds.length > 0`. `pickerDims` a été généralisé en
  conséquence : prend maintenant `(counts:number[], columns:1|2|3)` au lieu de
  `(colACount, colBCount, twoColumn:boolean)`, pour calculer une largeur à 3 paliers
  (220/260/320) plutôt que 2.
- **Popups de pioche (Diviser/Mélanger/Dessus/Dessous) rétrécies** : depuis leur passage
  en emoji-only (voir plus haut), elles réservaient encore la largeur `130`/`150px`
  d'origine, pensée pour du texte — largeur ramenée à `56px`. Piège : la classe CSS
  partagée `.popup` impose `min-width:130px`, un plancher qu'un `width` inline seul ne
  peut pas franchir (la spécificité CSS ne joue pas ici, `min-width` prime) — il faut
  aussi un `minWidth:56` inline pour l'emporter sur cette règle de classe.
- **Bug corrigé (impossible de double-tap une case pour sélectionner la tuile quand
  plusieurs joueurs/monstres/marqueurs la partagent)** : Gus — "one tape ouvre
  instantanément la fenêtre de sélection... impossible de double taper pour
  sélectionner la case". Cause : le premier tap d'un vrai double-clic déclenche déjà
  `onContentClick`/`handleSingleClick` immédiatement (aucun délai depuis la refonte
  "désambiguïsation par état", voir plus haut) — sur une case à plusieurs entités, ça
  ouvrait `cellPicker` sur-le-champ, et cette fenêtre (son propre listener
  `pointerdown` sur `document`, voir `Popup.js`) interceptait le second tap avant que
  le navigateur n'ait la moindre chance de reconnaître un vrai `dblclick` natif sur la
  grille. Fix (proposé par Gus lui-même) : `scheduleCellPicker(args)` remplace les deux
  appels directs à `setCellPicker` dans `handleSingleClick` — au lieu d'ouvrir le picker
  immédiatement, il programme son ouverture 300ms plus tard (`cellPickerTimerRef`).
  `onContentDoubleClick` annule ce minuteur dès qu'un vrai double-clic sur la même case
  est confirmé (avant d'appeler `selectTileAt`), donc le picker n'a jamais l'occasion de
  s'afficher pour une séquence de double-clic authentique — seul un tap simple, sans
  second tap dans la fenêtre des 300ms, laisse le minuteur aller au bout et ouvrir le
  picker. `handleSingleClick` annule aussi ce minuteur en tout début d'exécution (avant
  de décider quoi faire pour CE tap), pour qu'un tap sans rapport sur une autre case
  n'hérite jamais d'un picker resté programmé pour une case précédente. Portée
  volontairement étroite : seule l'ouverture du picker passe par ce délai, le reste de
  `handleSingleClick` garde son exécution immédiate voulue par la refonte "état plutôt
  que timer" — la règle d'occupation tuile/joueur (`selectTileAt` refuse toujours si un
  joueur est présent) reste inchangée, ce fix ne fait que laisser le geste natif
  `dblclick` avoir sa chance d'être détecté, pas de la contourner.
- L'extension ne participe PAS au calcul `naturalHeaderWidth`/`headerScale` de la rangée
  principale (cases/sorts/énergies/monstres) — c'est une "petite extension" optionnelle,
  pas un 5ème groupe dans le budget de rétrécissement ; elle a son propre `overflowX:'auto'`
  comme filet de sécurité, et réutilise `headerBoxSize` déjà calculé juste pour rester
  visuellement cohérente avec la rangée du dessus.

#### Retouches après premier retour de Gus (même session)
- **Cases de départ : finalement PAS de défausse** ("pas besoin de défausse pour les
  cases de départ") — `PileGroup` gagne une prop `hideDiscard` (ne rend pas son
  `DiscardSlot`), passée uniquement au groupe `'depart'`. `discardTile` ne pousse plus
  dans `discardCards` quand `t.type === 'depart'` : la tuile disparaît juste (toujours
  undoable comme toute mutation `commitBoard`, seulement pas récupérable via une
  défausse). Tout le reste (pioche/pose/rotation/flip/Dessus-Dessous vers la pioche
  départ elle-même) reste inchangé — la défausse était la seule chose de trop.
- **Marqueurs, fond transparent au lieu d'un bouton en cercle** (Gus : "je préfère que
  ce soit pas dans un bouton en cercle mais que le fond soit transparent... on voit
  strictement le drapeau et rien d'autre") — `MarkerButton` (header) et le jeton sur le
  plateau perdent tous les deux leur cercle de fond/bordure ; seule l'icône reste
  visible. Le glow bleu "tenu"/sélectionné, qui vivait sur `boxShadow`/`outline` d'un
  cercle maintenant inexistant, devient un `filter:drop-shadow(...)` posé directement
  sur l'icône — même langage visuel (bleu, ~même intensité), sans boîte derrière.
- **Sélectionner un marqueur puis cliquer le bouton dont il vient le supprime** (Gus :
  "quand je sélectionne les nouveaux marqueurs... puis que je clique sur la 'pioche'
  d'où il vient il faut qu'il soit delete") — les marqueurs n'ayant pas de défausse, leur
  propre `MarkerButton` joue ce rôle de "sélectionner puis taper sa source = défausser
  directement", déjà en place pour les tuiles/items/monstres via leur défausse
  (`hasSelectedForDiscardOfType`/`discardSelectedMonster`). `markerButtonClick(type)` :
  si un marqueur est sélectionné ET que son `type` correspond exactement au bouton
  cliqué → `discardSelectedMarker()` direct ; sinon retombe sur
  `drawMarkerOrCancelSelection` comme avant (annule toute AUTRE sélection, ou tient un
  marqueur neuf si rien n'était sélectionné).
- **Dé caché quand la partie n'a aucun joueur, et déplacé à côté de `‹`** ("le miroir du
  bouton vision quoi" — 👁️ vit juste à côté de `›`) : le pied de page passe de
  `current ? <Dé> : <Dé grisé désactivé>` à `current && <Dé>` (absent, pas juste
  désactivé, quand il n'y a personne) et le `DiceButton` a migré du groupe central
  (PV/dé ensemble) vers le groupe de gauche, juste après `‹` — miroir exact de
  `[👁️, ›]` à droite. Le groupe central ne contient plus que PV (ou le lien "Ajoute un
  joueur" si personne).
- **Opacité réduite sur tout ce qui est POSÉ sur le plateau, sauf les tuiles
  elles-mêmes** (Gus : "si il y a plusieurs joueurs sur une case on peut pas voir du
  tout les tuiles ni la case... est-ce qu'on pourrait pas faire des opacité réduite
  pour voir les items si ya des monstres et joueurs dessus ? Et même items pour voir
  la carte en dessous ?") — appliquée aux jetons joueur/monstre/marqueur (`cellGroups`)
  et aux items posés (`boardItems`), jamais aux cases/tuiles elles-mêmes (`placedTiles`,
  qui restent la couche "fond" de référence, toujours pleinement opaque) — **ni aux
  mêmes cartes affichées dans une fenêtre** (agrandie, pied de page, modale Vision
  joueur...) : la baisse d'opacité ne touche que les 4 sites de rendu DANS le conteneur
  de grille transformé, jamais les `CardFace` rendues ailleurs dans l'app, qui restent à
  100%. `pointerEvents:'none'` sur tous ces jetons (déjà le cas avant) donc la baisse
  d'opacité ne change rien à la détection de clic, qui passe par les coordonnées du
  clic sur le conteneur `content`, pas par un hit-test DOM par élément.
  **Devenue conditionnelle au mode Vision plutôt qu'une constante fixe** (Gus, après
  avoir testé un premier passage à une valeur fixe — 85% puis 66% — en vrai jeu : "100%
  en mode normal et 50% en mode vision !") — `boardTokenOpacity` (calculé une fois par
  rendu depuis `visionMode`, `BOARD_TOKEN_OPACITY_NORMAL = 1` / `BOARD_TOKEN_OPACITY_VISION
  = 0.5`) remplace l'ancienne constante fixe aux 4 mêmes sites de rendu. Cohérent avec le
  rôle du mode Vision ("voir ce qu'il y a en dessous") : les pièces se lisent le mieux à
  100% en jeu normal, et c'est justement en mode Vision qu'on veut voir à travers la pile.

#### Étagère à marqueurs libre dans le pied de page — implémenté (quatrième passage,
remplace la version header du passage précédent)
Un premier essai avait placé cette étagère dans la rangée de pioches du HEADER — Gus a
corrigé son propre message juste après ("ah je me suis trompé entre le footer et le
header désolé !!") : la bonne cible est le PIED DE PAGE, "là où il y a les sorts et
énergie" — la zone d'équipement du joueur courant (nature/sorts/énergies). Reprend
exactement la même mécanique (dépôt libre, sélection/déplacement/défausse), juste
déplacée vers cette zone, avec deux règles supplémentaires précisées par Gus :
"one tap sur le marqueur pour le sélectionner et quand on le sélectionne on peut pas
sélectionner les items (pour pouvoir les poser par-dessus comme ils sont affichés devant
les items) et en sélectionnant le marqueur je peux sélectionner la pioche d'où il vient
pour défausser."
- **`markerShelf` (tableau de `{id, type, x, y}`, fractions 0..1 de la boîte de la zone
  d'équipement) — vit maintenant SUR le joueur courant** (`player.markerShelf`, à côté de
  `natureSort`/`sorts`/`energies`), voir la retouche "lié au footer du joueur" plus bas
  pour le détail complet — d'abord implémenté comme un état global unique, changé après
  coup. `selectedShelfMarkerId` reste local, un simple id (l'étagère n'affiche jamais que
  le joueur courant, pas d'ambiguïté possible). `markerShelfRef` pointe sur le conteneur
  de la zone d'équipement, visible seulement s'il y a un joueur courant — `current &&
  h('div', {...})` — donc l'étagère n'existe que quand cette zone existe elle-même,
  cohérent avec "là où il y a les sorts et énergie".
- **Rendu par-dessus la zone d'équipement, "devant les items"** : les jetons de
  l'étagère sont rendus en DERNIER (après le slot nature et les 2 lignes sorts/énergies),
  donc visuellement au-dessus malgré le même conteneur (`position:'relative'` ajouté à ce
  conteneur) — même logique déjà validée pour le header, juste transposée.
- **"Quand on le sélectionne on ne peut pas sélectionner les items" — implémenté au
  niveau de l'`onClickCapture` déjà existant de la zone** (celui qui gère "peu importe où
  je clique dans cette zone avec un item... équipe/annule la sélection", voir "Équiper un
  item sur un joueur" plus haut) : la logique de l'étagère est insérée EN TOUT DÉBUT de ce
  handler, avant la logique d'équipement existante — `heldMarker` (le dépose ici) et
  `selectedShelfMarkerId` (le déplace ici) interceptent et `stopPropagation()`
  systématiquement AVANT que la logique d'équipement/`hasAnySelection()` plus bas n'ait la
  moindre chance de s'exécuter. Concrètement : tant qu'un marqueur est tenu ou sélectionné,
  TOUT tap dans cette zone (même visuellement sur une carte équipée) déplace/dépose le
  marqueur au lieu d'ouvrir/équiper la carte en dessous — exactement le comportement
  demandé. Deux classes (`.marker-shelf-token`/`.marker-shelf-discard-btn`) laissent
  passer les clics sur le jeton lui-même ou sa croix vers LEUR PROPRE `onClick` (phase de
  bulle, pas interceptée par la capture), même exception que `.footer-item-discard-btn`
  déjà en place juste en dessous dans ce même handler.
- **`markerShelfFraction(clientX, clientY)`** (renommé depuis `pileRowFraction`) convertit
  des coordonnées écran en fraction 0..1 relative à `markerShelfRef`, `clamp01` pour ne
  jamais sortir de la boîte.
- **"En sélectionnant le marqueur je peux sélectionner la pioche d'où il vient pour
  défausser"** : `markerButtonClick(markerType)` (header extension, boutons d'origine)
  gagne une branche `selectedShelfMarkerId` en plus de celle déjà existante pour
  `selectedMarkerId` (marqueur sur le plateau) — même schéma "select it, tap its origin,
  it's gone" déjà en place, juste étendu au cas où le marqueur sélectionné est celui de
  l'étagère plutôt que celui posé sur la grille.
- **Envoi vers la grille inchangé** : la branche de `handleSingleClick` qui retire un
  marqueur de `markerShelf` pour l'ajouter à `markers` aux coordonnées tapées n'a pas eu
  besoin d'être modifiée — elle ne dépend que de `selectedShelfMarkerId`/`markerShelf`,
  indépendamment de l'endroit où l'étagère est affichée à l'écran.
- Testé en Playwright de bout en bout dans la nouvelle zone : bouton marqueur → dépôt
  dans la zone d'équipement (y compris en plein sur une carte déjà équipée) → sélection
  (croix visible) → tap sur cette même carte équipée à nouveau → déplace le marqueur SANS
  ouvrir la fenêtre agrandie de la carte ni la perturber → re-sélection → défausse par
  croix ou par tap sur le bouton marqueur d'origine → `markerShelf` vidé dans les deux
  cas, aucune erreur console.
- **Icône réduite de moitié dans cette zone uniquement** (Gus : "que quand ils sont dans
  le footer ils fassent la moitié de leur taille (avant et après ils sont à leur taille
  normale)") — nouvelle constante `MARKER_SHELF_ICON_SIZE = 11` (moitié des 22px de
  `MarkerButton`, sa taille "normale" partout ailleurs : le bouton d'origine dans
  l'extension du header, et une fois posé sur le plateau) passée au `MarkerIcon` de
  CE site de rendu précis — `MarkerButton` et le rendu sur la grille (`cellGroups`)
  gardent leurs propres tailles (22px/18px) inchangées. Vérifié en Playwright
  (`fontSize` calculé du glyphe : 11px dans l'étagère, 22px sur le bouton d'origine).
- **Étagère liée au joueur, pas globale** (Gus : "il faut que les marqueurs soient liés
  au footer du joueur, si je change de joueurs via le footer les marqueurs change aussi,
  et si j'affiche les infos d'un joueur sur une fenêtre les marqueurs s'affichent aussi")
  — un premier passage gardait `markerShelf` comme UN SEUL état global partagé : changer
  de joueur courant (‹/›) n'affectait jamais ce qui s'affichait dans l'étagère, et la
  fenêtre d'infos joueur ne montrait aucun marqueur du tout. Fix : `markerShelf` migre
  de `useState` global vers un champ `player.markerShelf`, exactement comme `natureSort`/
  `sorts`/`energies` le sont déjà. Conséquences en cascade :
  - `markerShelf`/`setMarkerShelf` retirés partout où l'ancien état global était plombé
    (`liveRef`, `commitBoard`/`applySnapshot`/`currentSnapshot`, l'effet de synchro
    localStorage/Firebase, `initialBoard` à la création de room, `resetBoard`) — sans
    RIEN perdre : `players` était déjà suivi à tous ces endroits, donc `markerShelf`
    imbriqué dedans en hérite gratuitement (undo/redo, persistance, synchro en ligne).
  - Toutes les fonctions de l'étagère (`selectShelfMarker` inchangée, `discardShelfMarker`,
    le drop/déplacement dans l'`onClickCapture` du pied de page, l'envoi vers la grille
    dans `handleSingleClick`, le fast-discard dans `markerButtonClick`) lisent/écrivent
    maintenant `(current ou cur ou p).markerShelf` via `players.map(p => p.id===cur.id ?
    {...p, markerShelf:...} : p)` enveloppé dans `commitBoard({players:...})`, plutôt
    qu'un `commitBoard({markerShelf:...})` direct.
  - **Affichage dans la fenêtre d'infos joueur** (`visionPlayerId`, purement consultatif
    — cette fenêtre peut montrer N'IMPORTE QUEL joueur, pas seulement le courant) : une
    simple rangée d'icônes `MarkerIcon` (taille normale 22px, pas la demi-taille du
    footer — voir `MARKER_SHELF_ICON_SIZE`, qui ne s'applique qu'à la zone d'équipement
    du pied de page) ajoutée sous les sorts/énergies de `p`, affichée seulement si
    `p.markerShelf` a au moins une entrée.
  - Testé en Playwright : 2 joueurs, marqueur déposé pour le joueur courant (joueur 1) →
    visible dans l'étagère (1 jeton) → passage au joueur 2 via `›` → étagère vide (0
    jeton) → retour au joueur 1 via `‹` → jeton réapparaît → ouverture de la fenêtre
    d'infos du joueur 1 (carré de la sidebar) → l'icône du marqueur y apparaît aussi.

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
sorts/énergies) ; l'inspection détaillée d'une case/tuile/monstre reste à faire (les
monstres existent maintenant sur le plateau — voir "Monstres traités comme des
'joueurs'" — mais le mode Vision les ignore volontairement pour l'instant, faute de
contenu réel de carte monstre à afficher). L'**ambiance visuelle du toggle est
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
- **Cartes case alignées sur la même taille que les cartes sort/énergie dans le
  header** (Gus : "mets les cartes map à la même taille que les items") : l'ancienne
  constante séparée `CASE_BOX` (56px) est supprimée, les 3 groupes du header (cases,
  sorts, énergies) partagent maintenant tous `HEADER_ITEM_BOX` — un seul
  `headerBoxSize` (issu de `HEADER_ITEM_BOX * headerScale`) remplace les deux
  variables `caseBoxSize`/`itemBoxSize` d'avant, passé identiquement aux 3
  `PileGroup`. N'affecte que le header — les tuiles posées sur la grille et tenues en
  main gardent leur taille `CELL` habituelle, inchangée.
- **Cliquer la pioche de cases pendant qu'une tuile est en mode `'placed'` désélectionne
  ET pioche directement une nouvelle carte, en un seul clic** (Gus : "c'est le truc
  qu'on va faire le plus souvent, ça évite un clic dans le vide avant de devoir
  repiocher") — avant ce fix, un clic sur la pioche en mode `'placed'` ne faisait rien
  (bloqué comme n'importe quelle pioche/défausse pendant ce mode, voir plus haut).
  `PileStack` sépare maintenant deux gardes distincts au lieu d'un seul `disabled` :
  `blockArm` protège toujours l'armement par appui long (Diviser/Mélanger, inchangé),
  tandis que `disabled` ne protège plus QUE le clic simple — `PileGroup` reçoit une
  nouvelle prop `allowPileDraw` (passée `true` uniquement pour le groupe **cases**,
  pas sorts/énergies) qui calcule `pileClickDisabled = disabled && !allowPileDraw` :
  pendant le mode `'placed'`, `blockArm` reste `disabled` (le long-press reste
  bloqué) mais le clic simple passe à travers normalement, retombant sur `onDraw`.
  Comme `drawFromPile` appelle déjà `clearTileSelection()` à chaque pioche normale, il
  n'y avait rien de plus à écrire pour obtenir "désélectionne + pioche" en un geste —
  seul le blocage en amont empêchait ce chemin d'exister. La défausse (`DiscardSlot`)
  n'est pas concernée (garde le comportement bloqué inchangé) : ranger une carte
  dedans reste un choix explicite (bouton ✕ ou clic défausse), jamais un clic "perdu".

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
  `itemCellPicker` (même esprit que le `cellPicker` multi-joueurs). Positionnée 40px
  SOUS le point d'appui plutôt qu'exactement dessus : le popup s'ouvre pendant que le
  doigt/la souris est encore appuyé(e) (au seuil des 500ms, comme le menu Diviser/
  Mélanger d'une pioche) — la placer pile sous le pointeur encore actif aurait risqué
  que le relâchement qui suit tombe directement sur une des options et la sélectionne
  par accident.
  - **Deux colonnes, sorts à gauche / énergies à droite** (Gus : "à gauche les sorts
    sur une colonne et à droite les énergies") plutôt qu'une seule liste verticale
    mélangée : `itemCellPicker` utilise le mode `children` (libre) de `Popup` plutôt
    que son mode `items` (qui ne rend jamais qu'une seule colonne) — un `<div>` flex
    avec deux sous-colonnes, chacune filtrant `itemCellPicker.items` par type. Chaque
    ligne partage la classe `.popup-item` (mêmes styles que le mode `items`) mais
    ferme le picker elle-même (`setItemCellPicker(null)` dans son propre `onClick`,
    puisque le mode `children` de `Popup` ne le fait plus automatiquement pour nous
    contrairement au mode `items`).
- **Mode Vision = aperçu en grand en restant appuyé** ("je dois être capable d'afficher
  le sort sur le plateau en restant appuyé") : contrairement aux autres gestes de carte,
  l'appui long sur un item N'EST PAS bloqué en mode Vision — il affiche `visionPeekItem`
  (la carte en grand) tant que le doigt/la souris reste appuyé(e), refermé
  automatiquement au relâchement (`peekingRef`, vérifié dans `onContentPointerUp`). Sur
  une case à items multiples en mode Vision, le picker ci-dessus s'ouvre à la place — le
  choisir affiche alors le même aperçu, mais cette fois comme une fenêtre normale
  (fermeture au tap extérieur) puisque le geste d'appui a déjà pris fin avant que le
  choix ne soit fait.
  - **`‹`/`›` pour parcourir les AUTRES items de la même case** (Gus : "il y ait les
    flèches pour afficher les autres items présents sur cette case uniquement") :
    `visionPeekItem` est passé de "un item" à `{items, index}` — `items` est la liste
    complète des items du picker (ou `[item]` seul dans le cas "rester appuyé" sur une
    case à un seul item, d'où l'absence de flèches dans ce cas précis, `items.length`
    valant alors 1), `index` la position actuelle. `shiftVisionPeek(dir)` fait défiler
    en boucle, même mécanique que `shiftEnlarged` pour la fenêtre agrandie des items
    équipés d'un joueur, mais volontairement une fonction séparée : les deux carrousels
    parcourent des listes de nature différente (items d'UNE case du plateau vs. items
    équipés d'UN joueur), aucune raison de les faire dépendre l'un de l'autre. La
    carte + les flèches stoppent la propagation de leur clic (`e.stopPropagation()`) —
    sans ça, cliquer une flèche remonterait jusqu'au fond plein écran qui ferme la
    fenêtre, empêchant tout parcours.

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
  - **Bug corrigé (une carte monstre tenue depuis la pioche devenait une énergie pour
    de bon si on tapait le pied de page)** : Gus — "si de la pioche je tape ensuite
    dans le footer, la carte monstre devient un item et est considérée comme un item
    tout le temps (sur le plateau et impossible de la mettre dans la défausse
    monstre)". Cause : un monstre tenu depuis sa pioche réutilise `heldItem` tel quel
    (`itemType:'monstre'`, voir "Monstres traités comme des 'joueurs'"), mais la
    condition qui déclenche `equipHeldOrSelectedItem()` ne vérifiait que
    `live.heldItem` sans regarder son `itemType` — un monstre tenu déclenchait donc
    l'équipement, et `equipHeldOrSelectedItem` (qui ne teste que `itemType==='sort'`,
    tout le reste retombant dans sa branche `energies` par défaut) le rangeait dans
    `player.energies` comme si c'était une énergie, pour de bon. Fix : la condition ne
    relaie vers `equipHeldOrSelectedItem` que pour un `heldItem` de type sort/énergie —
    tenir un monstre ici tombe maintenant dans la branche générique plus bas (aucune
    action valide dans cette zone), le monstre reste simplement tenu, exactement comme
    taper n'importe quel autre endroit sans rapport avec lui.
- **Retirer un item équipé** : `selectedFooterItem` (`{playerId, slot, cardId}`) mirrore
  `selectedDiscardCardId`/`selectedItemId` — reste "en place" (glow) dans le tableau du
  joueur jusqu'à un tap ailleurs (case du plateau, pioche/défausse assortie) qui le
  déplace réellement. `removeFooterItem()` centralise le retrait (nature/sorts/
  énergies) pour `insertSelectedCardIntoPile`/`discardSelectedItem`/le tap sur la grille.
  **Croix de défausse directe sur la carte sélectionnée** (Gus, en écho aux boutons
  œil/croix du plateau pour monstres/items : "avoir la croix qui s'affiche en haut à
  droite, et la croix permet de défausser l'item") : `FooterItemRow` accepte un `onDiscard`
  optionnel — quand la carte de CETTE ligne est celle sélectionnée (`selectedId===it.id`),
  un petit badge ✕ rouge flotte sur son coin haut-droit (`position:absolute`, pas de
  coordonnées de grille disponibles ici contrairement au plateau, donc calé directement sur
  la carte elle-même plutôt que sur un coin de case). Câblé sur les 3 lignes du pied de page
  du joueur COURANT (nature/sorts/énergies) vers `discardSelectedItem` (déjà existante,
  gère `selectedFooterItem` nativement) — pas sur les lignes de la fenêtre Vision joueur
  (`onSelectForMove` y est un no-op, cette fenêtre est purement consultable, jamais rien
  n'y est sélectionnable pour commencer). Pièges de mise en place documentés juste au-dessus
  (règle globale de désélection).
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

**Dos/face des cartes sort/énergie** : remplacé depuis par le vrai système d'assets —
voir "Pioches dynamiques depuis le catalogue" (dos = vraie image par élément/niveau,
face = texte composité par `CardFront`). `FRONT_GLYPH`/`BACK_ACCENT` ne servent plus que
de repli si une carte est inconnue de `cardCatalogRef`.

**Fenêtre `visionPlayerId` (sidebar + mode Vision) — mise en page revue** : nom + cœur
de PV en HAUT (une rangée horizontale), sorts/énergies équipés EN DESSOUS, disposés
exactement comme dans le pied de page (même emplacement nature + mêmes lignes en
pointillés, `FooterItemRow` réutilisé avec `onReorder`/`onSelectForMove` en no-op —
cette fenêtre peut afficher N'IMPORTE QUEL joueur, pas seulement le joueur courant,
donc rien n'y est équipable/réordonnable, seulement consultable en cliquant une carte
pour l'agrandir), à une taille réduite (`VISION_ITEM_SIZE`) pour tenir dans la largeur
de la fenêtre.
- **`VISION_ITEM_SIZE` doublé (28 → 56px)** (Gus : "agrandir du double la taille des
  items, comme ça on peut lire sans forcément agrandir l'item... essaye de garder le
  nom et le cœur à la même taille") : seule la constante `VISION_ITEM_SIZE` change —
  `VISION_ROW_HEIGHT`/`VISION_ROW_WIDTH` en dérivent déjà automatiquement (paramétrés
  depuis une session précédente), rien à retoucher côté calcul.
- **Nom+cœur et la croix passés en rangée du HAUT, items en dessous — remplace le
  layout "nom+cœur à gauche, items à droite"** (Gus : "la fenêtre... est trop grande
  par rapport à mon écran, mets nom et cœur en haut, même hauteur toute à droite la
  croix, et en bas les items... tu déplaces juste les éléments et la fenêtre tient sur
  le tel") : la largeur nécessaire pour caser nom+cœur ET tous les items CÔTE À CÔTE
  (comme avant, la largeur avait dû être portée à `min(95vw,560px)` pour ça) ne rentrait
  plus sur un écran de téléphone. Empiler les deux zones au lieu de les juxtaposer ramène
  la largeur requise à celle de la SEULE zone d'items (la plus large des deux) — la
  `Popup` revient donc à `min(95vw,420px)` (sa largeur d'avant l'élargissement de la
  session précédente). Rien ne change de TAILLE (ni `VISION_ITEM_SIZE`, ni les polices
  nom/cœur) — uniquement l'agencement : une rangée `flex` (nom+cœur à gauche, ✕ à
  droite, `justifyContent:'space-between'`) au-dessus d'une rangée d'items en
  `flexWrap:'wrap'` pleine largeur, au lieu de deux colonnes côte à côte. La croix
  n'est plus `position:'absolute'` (elle avait besoin de flotter tant que nom+cœur et
  items partageaient la même rangée) — elle est maintenant un troisième élément flex de
  la rangée du haut, `flexShrink:0`.
- **`‹`/`›` pour changer de joueur, mais seulement depuis la barre latérale** ("la
  fenêtre... ce serait cool d'avoir en bas les <> pour passer de joueurs en joueur...
  mais en mode vision et qu'on clique sur un joueur pas besoin de <>") : nouveau state
  `visionPlayerFromSidebar` (booléen), mis à `true` uniquement par `PlayerSquare.onOpenInfo`
  (le carré dans la sidebar) et à `false` par les deux chemins d'ouverture depuis le
  plateau en mode Vision (tap direct sur un jeton, ou `cellPicker` si plusieurs joueurs
  partagent la case) — les flèches (`shiftVisionPlayer`, cycle sur `players` dans le même
  ordre que la sidebar) ne s'affichent que si ce flag est vrai.

**Piège rencontré (fenêtres empilées — la fenêtre du DESSOUS se fermait au lieu de celle
du DESSUS)** : ouvrir la fenêtre agrandie (`enlargedItem`) par-dessus la fenêtre joueur
(`visionPlayerId`) exposait un angle mort du mécanisme "ferme au clic extérieur" de
`Popup` — chaque `Popup` écoute `pointerdown` sur `document` et compare la cible à SON
PROPRE `anchorRef`, sans savoir qu'une AUTRE fenêtre pourrait flotter par-dessus elle.
Résultat : cliquer les flèches `‹`/`›` de la fenêtre agrandie (technique­ment "en dehors"
de l'ancre de la fenêtre joueur, puisque les deux fenêtres sont des sous-arbres DOM
totalement séparés) fermait la fenêtre joueur du dessous au lieu de rien faire ; et un
clic dans le vide fermait la fenêtre joueur en premier plutôt que la fenêtre agrandie
qui est pourtant au-dessus visuellement. Fix : le `onClose` de la `Popup` de la fenêtre
joueur est maintenant gardé — `()=>{ if (!enlargedItem) setVisionPlayerId(null); }` —
tant que `enlargedItem` est ouverte, elle ignore tout clic extérieur ; la fenêtre
agrandie, elle, n'a pas besoin de garde (son ancre contient déjà correctement ses
propres `‹`/`›`/✕). Un clic dans le vide ferme donc maintenant la fenêtre du DESSUS en
premier, comme attendu, et les flèches ne ferment plus jamais la fenêtre du dessous.

### Sixième passage de retouches (retours après plusieurs parties test complètes)
Gus, après avoir enfin pu tester plusieurs parties de bout en bout : "c'est parfait ! j'ai
pu tester plusieurs parties et ça fonctionne très bien !", suivi d'une liste de 7 points.
- **Nom de l'énergie ajouté sur la carte, comme les sorts** (Gus : "un peu comme les
  sorts, en haut au milieu un peu en dessous de l'image de l'élément") — la branche
  `énergie` de `CardFront` n'affichait jusqu'ici que l'élément (coin), l'effet et le bonus
  naturel, sans jamais le `nom` du catalogue. Ajoute la même ligne `data.nom` que la
  branche `sort` (même taille/position, juste sous l'emoji élément), et simplifie au
  passage l'alignement du bloc `effet` en dessous pour reprendre le même layout centré
  que les sorts (l'ancien `paddingTop` compensait l'absence de cette ligne de nom, devenu
  inutile une fois la ligne ajoutée).
- **Cases map jointives visuellement, coins toujours arrondis** (Gus : "que les côtés des
  cases se touchent... garder les bords arrondis c'est très bien") — les tuiles posées sur
  la grille étaient rendues à `CELL-4` avec un décalage de `+2px` de chaque côté (pensé à
  l'origine pour laisser les lignes de la grille visibles autour de chaque tuile), ce qui
  laissait un espace visible entre deux tuiles adjacentes. Passé à `size:CELL` et
  `left/top:` sans décalage — les tuiles remplissent maintenant toute la case, leurs côtés
  droits se touchent exactement ; `CardFace` garde son `borderRadius:6` interne inchangé,
  donc seuls les coins gardent un tout petit espace (l'arrondi), jamais les côtés. Vérifié
  en Playwright : deux tuiles posées sur des cases adjacentes, le bord droit de la
  première (`left+width`) correspond exactement au bord gauche de la seconde.
- **Défausse repliée à côté de la pioche "en trop" plutôt qu'en dessous** (Gus : "quand il
  y a 3 pioches parce qu'on a divisé une fois... ce serait bien si la défausse soit juste
  à droite de la 3ème pioche, ça éviterait de créer une nouvelle ligne de header") — la
  grille CSS 2 colonnes de `PileGroup` laisse une case vide dans sa dernière ligne dès que
  le nombre de pioches est impair et ≥ 3 (3, 5, 7...) : `discardFitsInGrid` détecte
  exactement ce cas (`groupPiles.length >= 2 && groupPiles.length % 2 === 1` — 1 pioche
  utilise déjà une grille à 1 seule colonne, donc rien à exploiter ; 2/4/6 remplissent
  chaque ligne pile, donc rien de vide non plus) et glisse la défausse comme DERNIER
  élément de cette même grille au lieu de la centrer en dessous — tout autre cas garde le
  comportement d'origine (défausse sous la grille), inchangé. Vérifié en Playwright :
  diviser une pioche 2 fois de suite (3 pioches au total), la grille de la pioche cases
  contient bien 4 éléments (3 piles + défausse), la défausse alignée exactement à côté de
  la 3ème pioche, aucune ligne supplémentaire créée.
- **Nom du joueur courant affiché en haut à gauche du pied de page, éditable par
  double-tap** (Gus : "marquer en haut à gauche du footer le nom du joueur sur qui on est
  et si on double tap dessus on peut edit le nom") — nouvelle ligne tout en haut du pied
  de page (avant même la zone d'équipement), visible seulement s'il y a un joueur courant,
  `h(EditText, {value:current.nom, onChange:v=>renamePlayer(current.id, v), editMode:true})`
  — même convention double-tap déjà utilisée partout ailleurs (`PlayerSquare` de la
  sidebar, notamment). `onClick:e=>e.stopPropagation()` sur son conteneur pour ne pas
  laisser le double-tap remonter jusqu'au `onClick={clearCardSelection}` du pied de page.
  **Même retouche pour la fenêtre d'infos joueur** (Gus : "pouvoir modifier le nom d'un
  joueur en double cliquant sur le nom dans la fenêtre d'info des joueurs") — le nom, qui
  n'était qu'un `<div>` texte simple dans `visionPlayerId`, est enveloppé dans le même
  `EditText` (`onChange:v=>renamePlayer(p.id, v)`) — `p` pouvant être N'IMPORTE QUEL
  joueur affiché dans cette fenêtre, pas seulement le courant, contrairement au footer.
- **Marqueurs de la fenêtre d'infos joueur repositionnés comme dans le pied de page**
  (Gus : "pas bien visible... ce serait bien que les marqueurs soient positionnés de la
  même manière que le footer") — remplace la simple rangée `flexWrap` d'icônes ajoutée au
  passage précédent par le MÊME positionnement libre en fractions `x`/`y` que l'étagère du
  pied de page, rendu par-dessus les mêmes zones nature/sorts/énergies (déjà
  `position:'relative'`) — cohérent visuellement avec l'endroit d'où ces marqueurs
  viennent réellement, et bien plus visible qu'une rangée compacte en bas de fenêtre.
  Purement consultatif ici (aucun geste de sélection/déplacement), comme avant.
- **Marqueurs : le plateau vers le pied de page, implémenté** (Gus : "les marqueurs ne
  peuvent pas aller du plateau à notre footer et il faudrait que ce soit le cas") — seul
  le sens étagère→plateau existait jusqu'ici. Nouvelle branche dans l'`onClickCapture` de
  la zone d'équipement, juste après celle qui gère `selectedShelfMarkerId` : si un
  marqueur du PLATEAU est sélectionné (`selectedMarkerId`) et qu'on tape la zone
  d'équipement, il est retiré de `markers` (le tableau partagé du plateau) et ajouté à
  `markerShelf` du joueur courant, à la fraction `x`/`y` tapée — miroir exact du sens
  inverse déjà en place. Sans cette branche, taper la zone pendant qu'un marqueur du
  plateau était sélectionné retombait sur la règle générique `hasAnySelection()` plus bas
  (annule juste la sélection, ne bougeait jamais rien) — exactement le symptôme signalé.
  Testé en Playwright : marqueur posé sur une case libre → sélectionné → tap sur la zone
  d'équipement → disparaît de `markers`, réapparaît dans `markerShelf` du joueur courant à
  la bonne position.
- **Item non résolu, en attente de précisions (Gus a explicitement demandé de signaler un
  doute plutôt que de deviner)** : "Révéler la première carte d'une pioche empêche de
  révéler une autre carte d'une autre pioche en même temps (ça fonctionne partout sauf
  pour les cases map)". Réaudité en détail : `heldTile` (cases/départ) et `heldItem`
  (sorts/énergies/monstres) sont TOUS LES DEUX exclus symétriquement du blob partagé
  Firebase et jamais réécrits depuis l'abonnement (voir "Cartes tenues en main : locales,
  jamais synchronisées" plus haut) — aucune différence de traitement trouvée entre les
  deux catégories dans le code actuel qui expliquerait que l'une fonctionne et l'autre
  non. Hypothèse la plus probable (non confirmée) : le test réel comparait des pioches de
  TYPES différents (ex: sort vs énergie, jamais en conflit de toute façon puisque
  différents types) plutôt que deux pioches CASES entre elles (issues d'une division du
  même deck, qui elles partagent bien le même `heldTile` par appareil — un comportement
  voulu, identique à deux pioches sorts/énergies/monstres entre elles). À reprendre avec
  Gus si le scénario exact de reproduction (2 pioches du MÊME type, sur 2 appareils
  différents, quel type précisément) peut être précisé.
  **Piste probable trouvée depuis (voir "Bug corrigé (gros crash..." dans "Version en
  ligne entre amis")** : la boucle d'écho locale infinie entre la synchro sortante et
  l'abonnement Firebase repoussait en continu un instantané de `piles` potentiellement
  périmé — deux tirages rapprochés sur des pioches du même type pouvaient donc voir
  l'un écraser l'autre au gré de la course entre l'écho et l'action réelle, un symptôme
  cohérent avec "ça fonctionne parfois, pas toujours, spécifiquement sous charge". Pas
  reconfirmé avec ce scénario exact, mais probablement résolu par le même fix
  (`applyingRemoteRef`) plutôt qu'un bug séparé propre aux pioches de cases.

### Septième passage de retouches (après confirmation que le crash Firebase est résolu)
Gus, une fois le crash confirmé corrigé ("parfait tout fonctionne bravo !"), a enchaîné
avec 6 nouvelles demandes.
- **Item de la défausse équipable directement dans le footer** (Gus : "je dois pouvoir
  faire passer un item de la défausse directement dans le footer") — `equipHeldOrSelectedItem`
  ne gérait que `heldItem` (fraîchement pioché) et `selectedItemId` (déjà sur le plateau).
  Ajoute une 3ème branche `selectedDiscardCardId` (sort/énergie uniquement — une case/un
  monstre sélectionné dans la défausse n'est pas équipable, retombe sur l'annulation
  générique) qui retire la carte de `discardCards` au lieu de `boardItems`. Le
  `onClickCapture` de la zone d'équipement gagne le même filtre de type
  (`discardSelIsEquippable`) pour déclencher cette branche.
- **Défausse cliquée avec un item du footer sélectionné → défausse maintenant, au lieu
  d'aller sur la case du joueur** (Gus : "si en sélectionnant on clique sur sa petite
  croix, ça va sur la case où est le joueur ça c'est bon [inchangé] mais si en
  sélectionnant on clique sur la défausse il faut que ça aille dans la défausse") —
  `hasSelectedForDiscardOfType` incluait déjà `footerSelType === type`, donc cliquer la
  défausse avec un item du footer sélectionné appelait déjà `onDiscardSelectedTile`, mais
  celui-ci (`discardSelectedItem`) envoyait TOUJOURS sur la case du joueur, y compris
  pour ce chemin — le même comportement servait à la fois à la croix ✕ ET au clic
  défausse, qui ont maintenant besoin de destinations différentes. Nouvelle fonction
  `discardSelectedItemViaDiscardPile` (un `selectedItemId` retombe sur
  `discardSelectedItem` inchangé ; un `selectedFooterItem` va dans `discardCards` au lieu
  de `boardItems`), câblée comme `onDiscardSelectedTile` des `PileGroup` sort/énergie
  uniquement — la croix ✕ du pied de page reste câblée sur `discardSelectedItem` telle
  quelle, comportement inchangé.
- **Marqueur "clé" ajouté, UNIQUE (un seul exemplaire possible)** — 6ème marqueur,
  emoji 🔑 seul pour l'instant (`MARKER_EMOJI.cle`), ajouté en dernier dans `MARKER_ORDER`.
  Réutilise tout le mécanisme générique des marqueurs (pioche infinie/tenir/poser/
  sélectionner/étagère/défausser) sans code dédié, SAUF sa contrainte d'unicité :
  `keyMarkerExistsElsewhere()` (vérifie `markers`, et le `markerShelf` de CHAQUE joueur)
  fait un no-op de `drawMarker('cle')` si une clé existe déjà n'importe où (plateau OU
  étagère d'un joueur) — testé en Playwright : une 2ème tentative de tirage n'ajoute
  jamais de doublon.
  **Surbrillance jaune/orange sur le pion du joueur qui porte la clé (ou un drapeau) dans
  son footer** (Gus : "quand elle est dans le footer d'un joueur elle apparait en
  surbrillance... également sur le pion du personnage. [...] il faudrait aussi faire ça
  quand un joueur a le drapeau dans son footer") — `HIGHLIGHT_SHELF_MARKER_TYPES =
  ['cle', 'drapeau_bleu', 'drapeau_rouge']` (pas les jetons ni la roche) et
  `hasHighlightShelfMarker(shelf)`, consultés au rendu du jeton joueur dans `cellGroups`
  (`e.markerShelf`, déjà présent puisque le jeton reçoit l'objet joueur complet) — glow
  `#fb3` (jaune/orange) si non sélectionné, le glow bleu de sélection reste prioritaire
  si le joueur est aussi sélectionné.
- **Nouvelle option "récupérer tout" sur le menu Diviser/Mélanger d'une pioche (appui
  long)** (Gus : "récupérer dans cette pioche toutes les cartes présentes sur le plateau,
  dans la défausse et sur les footer, en gros reset la pioche") — 3ème item du menu
  (`📥`, à côté de `✂️`/`🔀`), `onRecallAll` threadé `PlateauPage → PileGroup → PileStack`.
  `recallAllToPile(pileId)` ramène dans CETTE pioche précise (mélangée) toutes les cartes
  de son type sorties d'une pioche — jamais les AUTRES pioches déjà existantes du même
  type (issues d'une division), seulement ce qui a été posé/défaussé/équipé : `placedTiles`
  pour case/depart, `monsters` pour monstre, `boardItems` + `natureSort`/`sorts`/
  `energies` de CHAQUE joueur pour sort/énergie, et `discardCards` dans tous les cas.
  Nettoie aussi toute sélection (tuile/item/carte-défausse/footer) qui pointerait vers une
  carte tout juste balayée, sans toucher à une sélection d'un AUTRE type. Hauteur estimée
  du popup (`menuPosNow`) relevée de 90 à 130 pour ce 3ème item.
- **Bug corrigé (double-tap impossible pour sélectionner une tuile quand 2+ entités —
  joueurs/monstres/marqueurs — partagent la case)** — Gus : "je peux plus sélectionner
  cette case map en double tap". Cause : `onContentDoubleClick` appelait `selectTileAt`
  (avec son vérificateur d'occupation, qui bloque dès qu'UN SEUL joueur est sur la case)
  — sans conséquence pour une case à UN SEUL joueur, puisque ce cas se résout déjà avant
  même qu'un vrai `dblclick` natif se déclenche (1er tap sélectionne le joueur, 2e tap —
  retap sur sa propre case — bascule déjà vers la tuile via `selectTileIgnoringOccupancy`,
  qui ignore l'occupation). Mais dès que 2+ entités partagent la case, AUCUN des deux
  clics ne sélectionne quoi que ce soit directement (chacun programme `cellPicker` via
  `scheduleCellPicker` à la place) — le double-clic natif devient alors le SEUL chemin
  vers la sélection de tuile, et c'est justement celui qui utilisait la version AVEC
  vérificateur. Fix : `onContentDoubleClick` appelle maintenant `selectTileIgnoringOccupancy`
  — un vrai `dblclick` confirmé (`sameCellStreakRef`) est par définition un geste
  délibéré, comme le retap, donc n'a pas besoin du filet de l'occupation. `selectTileAt`
  (devenue sans appelant) supprimée plutôt que laissée en code mort. Vérifié en
  Playwright : 2 joueurs + 1 tuile sur la même case, double-clic sélectionne bien la tuile
  (`selectedTileId` posé), alors que ça échouait silencieusement avant le fix.
- **Mode Vision : sélectionner une carte de défausse en fermant l'aperçu, pour pouvoir la
  déplacer malgré tout** (Gus : "quand on clique sur une défausse on peut voir une par une
  toutes les cartes... quand on clique dans le vide à ce moment-là ce serait cool que la
  carte qu'on regardait soit sélectionnée. Donc si ensuite on clique sur le plateau, sur
  la pioche qui correspond ou sur un footer (uniquement si c'est un item) on puisse la
  déplacer [...] si on clique à un endroit où elle peut pas aller, ça desélectionne") —
  le clic extérieur qui ferme `visionDiscardPeek` pose maintenant aussi
  `selectedDiscardCardId` sur la carte affichée à cet instant, EN PLUS de fermer
  l'aperçu — mais le mode Vision est délibérément conçu comme "aucune carte ne bouge tant
  qu'il est actif" (`handleSingleClick` retourne tout en haut si `visionMode`), donc
  cette nouvelle sélection serait normalement inerte. Exception ciblée : la garde devient
  `if (live.visionMode && !live.selectedDiscardCardId)` — une tuile sélectionnée ne peut
  structurellement jamais coexister avec `visionMode` (toujours effacée à l'entrée en
  Vision), donc cette condition ne laisse passer QUE la nouvelle sélection de défausse,
  rien d'autre du mode Vision n'est affaibli. Même exception pour les PIOCHES
  (`PileGroup`'s `pileClickDisabled`, normalement totalement inertes en Vision) :
  devient `(visionMode && !hasSelectedCard) ? true : ...` — `hasSelectedCard` inclut déjà
  `discardSelType === type`, donc cliquer la pioche DU MÊME TYPE ouvre bien Dessus/Dessous
  au lieu de rester inerte. Le footer n'a besoin d'aucun changement : son
  `onClickCapture` ne teste déjà `visionMode` nulle part, donc le fix précédent
  (défausse → footer) y fonctionne déjà tel quel. "Cliquer où elle ne peut pas aller
  désélectionne" reste géré par le `hasAnySelection()`/`guardedBySelection` déjà en
  place, indépendant de Vision. Vérifié en Playwright de bout en bout : entrer en Vision,
  ouvrir l'aperçu défausse, cliquer dans le vide (carte sélectionnée, Vision toujours
  actif), cliquer une case vide du plateau → carte déplacée dans `boardItems` ; même
  scénario mais en cliquant la pioche correspondante → menu Dessus/Dessous, "⬆️" remet
  bien la carte dans la pioche — Vision reste actif du début à la fin des deux scénarios.

### Huitième passage de retouches
Gus, content du rendu ("très cool !"), a enchaîné avec 4 demandes plus courtes.
- **Carrés des joueurs (barre latérale) réduits une nouvelle fois** — même facteur ×0.8
  que la réduction précédente (`SIDEBAR_DEFAULT_SIZE` 51→41, `SIDEBAR_MIN_SIZE` 40→32).
  Aucun autre changement : `PlayerSquare` dérive déjà toutes ses tailles internes
  proportionnellement (`scale = size/64`), donc rien à retoucher côté composant.
- **"1x tour" → "1/tour" partout dans data.json** (Gus a explicitement autorisé à modifier
  data.json directement pour cette demande) — remplacement texte brut sur l'intégralité du
  fichier (52 occurrences, y compris dans une note de brainstorm d'Idée en vrac qui
  mentionnait elle-même cette tâche à faire — laissée telle quelle, effet secondaire
  attendu et sans conséquence d'un remplacement "partout" pris au pied de la lettre).
- **Léger contour blanc sur les cœurs de PV** — nouvelle constante `HEART_OUTLINE`
  (`text-shadow` à 4 décalages cardinaux de 1px, blanc) appliquée aux 3 endroits où un
  cœur ❤️ affiche des PV : `PlayerSquare` (barre latérale), la fenêtre d'infos joueur, et
  la ligne dé/PV du pied de page. `-webkit-text-stroke` n'a pas d'effet fiable sur un
  glyphe emoji couleur (bitmap/vecteur déjà coloré, le navigateur ignore le trait) —
  `text-shadow`, lui, se dessine bien derrière n'importe quel glyphe.
- **Mise en page "tel à l'horizontale"** (Gus : "avoir la map sur la moitié de droite de
  notre écran et sur la moitié de gauche, le header en haut et le footer en bas") —
  implémentée en CSS pur, sans changement de structure DOM : le conteneur racine du
  Plateau (`className:'plateau-root'`, déjà en `display:flex; flex-direction:column` par
  défaut — desktop/portrait inchangés) bascule en `display:grid` uniquement sous
  `@media (orientation:landscape) and (max-height:500px)` (`index.html`) — la limite de
  hauteur cible spécifiquement un téléphone tourné sur le côté, pas une tablette ni une
  fenêtre desktop large-mais-haute. `grid-template-areas` répète le nom de zone
  `"viewport"` sur ses 3 lignes (`"header viewport" ". viewport" "footer viewport"`) pour
  que la grille du jeu (`className:'plateau-viewport'`) s'étende sur toute la hauteur de
  sa colonne (moitié droite), pendant que header/footer (`className:'plateau-header'`/
  `'plateau-footer'`) s'empilent dans l'autre colonne — le nom de zone via `className` est
  sans effet en `display:flex` (mode normal), donc ajouté sans condition, seule la racine
  bascule réellement de mode. Popups/panneau joueurs restent `position:fixed`, donc
  insensibles à ce `display:grid` de leur parent (leur bloc de référence reste le viewport
  du navigateur, pas ce conteneur — `display:grid` seul ne crée pas de nouveau bloc de
  référence pour `position:fixed`).
  - **Bouton recentrer, seul élément à corriger** : ancré sur `left:8` (fixe), il
    supposait implicitement que le coin bas-gauche de la grille correspond à celui de
    l'écran — vrai en portrait (grille pleine largeur) mais plus en paysage tel (grille
    = moitié droite seulement). `sidebarBounds` (déjà mesuré via `ResizeObserver` sur
    `viewportRef` pour `top`/`bottom`) gagne un 3ème champ `left` ; le bouton utilise
    `sidebarBounds.left+8` au lieu du `8` fixe.
  - **Largeur du header ajustée en paysage tel** : `availHeaderWidth` (qui pilote le
    rétrécissement des pioches pour ne jamais avoir besoin de scroll horizontal) se
    basait sur `window.innerWidth` PLEIN écran — en paysage tel, le header n'occupe plus
    que la moitié gauche, donc sans correctif il n'aurait pas assez rétréci et aurait
    débordé dans son `overflowX:'auto'` (filet de sécurité existant, mais pas le résultat
    voulu). `isLandscapePhone` (même condition exacte que la media query CSS, via
    `window.matchMedia`) divise cette largeur disponible par 2 dans ce cas précis.
  - Le reste s'adapte automatiquement sans code dédié : la colonne des joueurs
    (`squareSize`, dérivée de `sidebarBounds.top`/`.bottom`) hérite déjà de la vraie
    hauteur mesurée de la grille (pleine hauteur en paysage, puisque `viewport` s'étend
    sur les 3 lignes) ; le panneau lui-même reste ancré `right:8` (bord droit de l'écran =
    bord droit de la grille dans les deux modes, rien à changer).
  - Vérifié en Playwright avec un vrai viewport paysage court (667×375, simulant un
    téléphone courant tourné) : `getComputedStyle` confirme `display:grid` activé, la
    grille occupe exactement la moitié droite sur toute la hauteur (333.5–667px × 0–375px),
    header/footer empilés dans la moitié gauche, bouton recentrer positionné au bon
    endroit (coin bas-gauche de la grille, pas de l'écran) ; tirer/poser une tuile
    fonctionne normalement dans ce mode. Contrôle de non-régression en portrait
    (400×800) : `display:flex` toujours actif, disposition identique à avant.

### Pan et zoom
- **Bouton recentrer** (`centerView()`, cible SVG discrète `TargetIcon`) : en bas à
  gauche, `position:fixed` ancré sur `sidebarBounds.bottom` (déjà mesuré pour la
  sidebar) donc toujours pile au coin bas-gauche de la grille, juste au-dessus du pied
  de page — jamais affecté par le pan/zoom puisqu'il est hors du conteneur transformé,
  comme le header/pied de page eux-mêmes. Recentre la vue sur le milieu du plateau au
  zoom par défaut (même logique que Reset utilisait déjà pour ça, extraite dans
  `centerView()` et réutilisée par les deux plutôt que dupliquée).
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
     par geste" est maintenant implémentée — voir "Monstres traités comme des
     'joueurs'" plus bas pour le détail (bascule en deux colonnes uniquement
     quand un monstre partage la case, sinon reste la liste à une colonne
     ci-dessus, inchangée).
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
     **Taille de base réduite ×0.8** (Gus : "réduire la taille de base des carrés
     des joueurs de un cinquième... scale x0.8") : `SIDEBAR_DEFAULT_SIZE` passe de
     64 à 51px. `PlayerSquare` calcule déjà `scale = size/64` en interne pour
     dériver proportionnellement toutes ses tailles internes (polices, badges,
     border-radius) à partir de la taille reçue — avec le nouveau défaut de 51,
     `scale` vaut de lui-même ≈0.8, donc rien à retoucher dans `PlayerSquare`.
     Plancher (`SIDEBAR_MIN_SIZE`, 40px) laissé inchangé.
     **Piège rencontré (`sidebarBounds` figé après coup — les carrés
     repassaient derrière le header, le pied de page débordait en bas)** :
     `sidebarBounds` n'était re-mesuré que sur l'évènement `resize` de la
     fenêtre — ça ratait tous les cas où le HEADER ou le PIED DE PAGE
     changent de hauteur sans que la fenêtre elle-même ne redimensionne :
     diviser une pioche jusqu'à faire passer le header sur une 2ème ligne
     (Couche 3), ou le premier joueur ajouté qui fait apparaître la zone
     d'équipement du pied de page. Résultat signalé par Gus : les carrés
     joueurs se retrouvaient visuellement DERRIÈRE le header (plus grand
     qu'avant mais `sidebarBounds.top` encore basé sur son ancienne hauteur,
     plus petite), et le pied de page débordait en bas de l'écran pour la
     même raison côté `sidebarBounds.bottom`. Fix : un `ResizeObserver` sur
     `viewportRef` lui-même (la grille, qui occupe déjà tout l'espace
     restant entre header et footer) en plus de l'écouteur `resize` — il se
     déclenche sur N'IMPORTE QUEL changement de la boîte de la grille, donc
     couvre "le header a grandi" et "le footer a grandi" par la même
     mécanique générale plutôt que d'être recâblé à chaque nouvelle cause
     possible.
     **Piège rencontré (le fix ResizeObserver réglait le pied de page mais pas le
     header — joueur 1 restait caché derrière, même une fois la colonne devenue
     scrollable)** : Gus a signalé que le débordement en bas était bien corrigé mais
     qu'en haut, au-delà d'environ 8 joueurs (colonne qui a atteint son plancher
     `SIDEBAR_MIN_SIZE` et bascule en scroll), le premier joueur (parfois le second)
     restait inatteignable derrière le header, scroll ou pas. Cause différente du
     bug `sidebarBounds` ci-dessus (déjà réglé) : la colonne utilisait
     `justifyContent:'center'` en permanence, y compris une fois son contenu réel
     plus haut que l'espace disponible (`overflowY:'auto'`) — combiner un
     `justifyContent:'center'` avec un contenu qui déborde crée un "piège de scroll" :
     le débordement se répartit symétriquement au-dessus ET en dessous de la boîte,
     mais la plage de scroll par défaut du navigateur pour un contenu centré ne
     remonte pas jusqu'à la portion qui dépasse EN HAUT — elle reste inatteignable
     quel que soit l'ancrage `sidebarBounds`, même parfaitement à jour. Rien à voir
     avec le fix ResizeObserver (qui règle le RE-mesurage de l'espace disponible, pas
     ce problème d'alignement interne). Fix : nouveau calcul `sidebarWillOverflow`
     (compare la hauteur désirée au plancher `SIDEBAR_MIN_SIZE` à l'espace mesuré
     réellement disponible) qui bascule `justifyContent` en `'flex-start'` dès que ça
     déborde — le scroll par défaut atteint alors bien le tout début du contenu.
     Centré (`'center'`) reste le comportement par défaut tant que tout tient.
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
     **Animation de lancer** (`DiceButton`, Gus : "l'emoji du dé se met à
     trembler pendant une seconde... puis le chiffre apparaît... si le chiffre
     peut être représenté comme les points noirs d'un dé c'est mieux") : état
     local `phase` (`idle`/`shrinking`/`shaking`/`growing`), purement de la
     présentation — `rollDice` (génération de la valeur, toujours pas suivie
     par l'undo, voir son propre commentaire) et `guardedBySelection` restent
     inchangés, juste appelés au bon moment dans la séquence. Clic sur un dé
     "à froid" (aucun résultat affiché) : `shaking` (emoji 🎲 tremble ~1s via
     la classe CSS `.dice-shake`, mouvement irrégulier par petits paliers de
     keyframes) → à la fin, `rollDice()` génère la valeur puis `growing`
     (carré blanc avec les points du dé, `DiceFace`, qui grandit très petit
     jusqu'à sa taille pleine — légèrement plus grand que l'emoji pour bien
     le cacher dessous) → `idle`. Relancer alors qu'un résultat est déjà
     affiché ajoute une étape `shrinking` AVANT le tremblement (le carré du
     résultat précédent rétrécit pour révéler l'emoji), tout le reste de la
     séquence est identique. `DiceFace` place les points selon la disposition
     standard d'un dé (grille 3×3, table `DICE_PIPS` par valeur 1-6) plutôt
     qu'un simple chiffre.
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
     Pioche dynamique depuis le catalogue et contenu réel des cartes (texte composité) :
     implémentés, voir "Pioches dynamiques depuis le catalogue". Le contenu détaillé
     du mode Vision pour les cases/tuiles (Couche 4) : pas encore commencé. Toutes les
     actions d'items qui touchent l'état persisté (poser/déplacer/défausser/ranger dans
     une pioche/équiper/réordonner) passent par `commitBoard` comme les tuiles, donc
     déjà undoable — seul le tirage/annulation d'une pioche (`heldItem`) ne l'est pas en
     soi, même logique que pour `heldTile` (voir "Undo/redo global").
   - **Cases de départ + marqueurs (voir "Cases de départ + marqueurs + extension du
     header" plus haut) : implémentés.** Gus a signalé cet ajout comme le dernier avant
     de considérer la version locale hotseat terminée ("on a fini la version locale !").
     Pioches dynamiques depuis le catalogue et vrai contenu des cartes (assets uploadés
     par Gus, back par élément/niveau, face texte-composité) : implémentés, voir "Pioches
     dynamiques depuis le catalogue". Reste, non-bloquant : le contenu détaillé du mode
     Vision pour les cases/tuiles (Couche 4, jamais commencé).
2. **Version en ligne entre amis** — nouveau choix d'archi (remplace boardgame.io,
   voir ci-dessous pourquoi), discuté et validé avec Gus : synchronisation directe
   via **Firebase Realtime Database** (ou Supabase Realtime), sans librairie de
   jeu tour par tour — juste un document JSON partagé, synchronisé en live entre
   les clients connectés à la même partie.
   - **boardgame.io abandonné** (Gus : "au final les joueurs sont 100% responsable,
     pas besoin de principe de tour etc..") — boardgame.io existe pour arbitrer un
     jeu (tours, phases, validation de coups), exactement ce que cette app refuse
     de faire depuis le début ("aide visuelle de confort, jamais un arbitre de
     règles", voir "Système de jeu" plus haut). L'intégrer aurait soit forcé un
     modèle de tours qu'on ne veut pas, soit demandé de le contourner entièrement
     pour rien. Un simple document partagé (piles/placedTiles/boardItems/players/
     monsters/markers — exactement les clés déjà persistées par `commitBoard` en
     solo) synchronisé par Firebase/Supabase suffit largement.
   - Avantage décisif par rapport à un serveur perso : tourne dans le cloud,
     aucun appareil (PC ou téléphone) de Gus à garder allumé pendant la partie.
   - **Séparation état partagé (synchronisé) / état local (jamais synchronisé)** —
     règle de confidentialité de Gus ("je sélectionne un truc, les autres ne
     voient pas ma sélection, ils voient uniquement le changement sur le
     plateau : déplacer un personnage, récupérer, supprimer une carte, afficher
     la première carte d'une pioche...") :
     - **Partagé** : exactement les clés déjà persistées par `commitBoard` en
       solo (`players`, `piles`, `discardCards`, `placedTiles`, `boardItems`,
       `monsters`, `markers`) — piocher retire déjà la carte de `pile.cards`
       dans le code actuel, donc "révéler le dessus d'une pioche" est déjà une
       vraie mutation de plateau, pas une sélection, et rentre naturellement
       dans la règle de Gus sans changement de logique.
     - **Local uniquement** (jamais écrit dans la base partagée) : tout ce qui
       est déjà un state React séparé des clés persistées —
       `selectedId`/`selectedTileId`/`selectedItemId`/`selectedMonsterId`/
       `selectedMarkerId`/`selectedDiscardCardId`, `cellPicker`/
       `itemCellPicker`, `armedPileId`, et toute fenêtre/popup (infos joueur,
       menu Diviser/Mélanger, Vision peek, carte agrandie).
   - **Joueur courant (`currentIndex`, pied de page) devient local par appareil**
     (Gus : "il faut que le footer du joueur en bas soit indépendant aussi...
     que le joueur 1 puisse se mettre sur joueur 1 etc") — chaque appareil
     retient localement (son propre `localStorage`) quel joueur il regarde/
     contrôle, complètement découplé de l'état de partie partagé — même
     principe que la séparation ci-dessus, juste appliqué à `currentIndex`.
   - **Conflits simultanés (2 joueurs sur la même tuile)** — discuté avec Gus,
     conclusion : pas de verrouillage/résolution de conflit à construire.
     Comme la sélection reste locale et que chaque action résout **par id
     contre l'état live actuel** (jamais une position figée au moment de la
     sélection — déjà vrai dans le code solo), le cas normal se règle tout
     seul : si le joueur 2 a sélectionné une tuile que le joueur 1 vient de
     déplacer, la synchro met à jour la position affichée chez le joueur 2,
     et son prochain tap agit sur la position À JOUR (pas une position
     périmée). Seul le cas de vraie simultanéité (deux écritures avant que
     l'un ou l'autre ait reçu la mise à jour de l'autre) reste un vrai
     conflit : on accepte simplement "dernière écriture gagne" (la BDD
     tranche par ordre d'arrivée), sans mécanisme de verrouillage — cohérent
     avec la philosophie "l'app n'arbitre rien", comme deux joueurs qui
     attrapent la même carte IRL. Amélioration possible plus tard (pas
     bloquante) : si la tuile sélectionnée bouge sous vos yeux suite à
     l'action d'un autre joueur, désélectionner automatiquement plutôt que
     garder un glow périmé.
   - Chaque action d'un joueur sur le plateau (déplacement, pose de tuile, etc.)
     est propagée en live à tous les autres joueurs connectés à la même partie.
   - Contrôle total conservé : ce n'est pas un site externe auquel on adapte le
     jeu, c'est une brique technique intégrée à l'app existante (même repo,
     même design, même data.json).
   - Modifications de `data.json` (cartes, règles) : s'appliquent immédiatement
     à toutes les *nouvelles* parties lancées après la modif. Pas besoin de
     figer les règles par partie en cours — Gus a confirmé qu'il ne changera
     jamais les règles pendant qu'une partie est en cours, donc pas de
     mécanisme de verrouillage à développer pour l'instant (noté dans les
     notes de soirée proto si besoin futur).
   - Ancienne piste abandonnée : serveur Node.js perso (Colyseus) sur PC/tunnel
     Cloudflare — remplacée par l'approche cloud ci-dessus, plus simple et sans
     contrainte de disponibilité matérielle.
   - **Firebase choisi (pas Supabase)** — confirmé par Gus via `AskUserQuestion` :
     Realtime Database colle exactement au besoin ("un document JSON partagé qui
     se synchronise tout seul"), pas besoin des capacités relationnelles de
     Supabase/Postgres pour ce cas d'usage.
   - **Projet Firebase créé par Gus lui-même** (compte Google personnel, pas
     quelque chose qu'un agent peut créer à sa place) — Realtime Database en
     région `europe-west1`, mode test au départ (règles d'accès ouvertes,
     expirent au bout de 30 jours — verrouillé depuis par des règles
     permanentes, voir "Règles de sécurité Firebase verrouillées" plus bas).
     SDK ajouté en tant qu'app Web via balise
     `<script type="module">` (pas npm — le projet n'a toujours aucun bundler,
     voir plus haut) — config (clés publiques, pas des secrets) dans
     `src/firebase.js`. Connexion vérifiée avec une page de diagnostic jetable
     (écrit puis relit une valeur test, supprimée une fois confirmée).
   - **Import DYNAMIQUE de `multiplayer.js`/`firebase.js`, jamais statique** —
     piège identifié avant même de commencer : un `import` statique du CDN
     gstatic.com échouerait au chargement de TOUTE la page si ce CDN est
     injoignable (bloqueur de pub, pare-feu, panne Google...), cassant même le
     mode solo/hotseat qui n'a rien à voir avec Firebase. `PlateauPage.js` et
     `OnlineLobbyPage.js` chargent donc `multiplayer.js` via `await
     import("../multiplayer.js")` uniquement au moment où on essaie vraiment
     de créer/rejoindre une partie — un échec (CDN bloqué, etc.) reste localisé
     à cette action précise (message d'erreur affiché, bouton Retour), sans
     jamais toucher au reste de l'app.
   - **`rooms/<code>` (Firebase) — un noeud par partie, deux enfants** :
     `board` (exactement les clés déjà persistées par `commitBoard` en solo —
     `players`/`piles`/`discardCards`/`placedTiles`/`heldTile`/`boardItems`/
     `heldItem`/`monsters`/`markers`/`heldMarker` — SANS `currentIndex`, voir
     plus bas) et `cardCatalog` (la table id→données du catalogue, voir
     `cardCatalogRef` — ne grossit jamais que par le haut, un simple merge
     suffit). `src/multiplayer.js` expose `roomExists`/`createRoom`/
     `subscribeToRoom`/`pushBoardUpdate`/`pushCardCatalogEntries` — aucune
     sémantique de jeu, juste lire/écrire/observer ce blob JSON.
   - **Stratégie de synchro sortante : un seul `useEffect` générique plutôt que
     d'intercepter chaque site de mutation** — piège évité de justesse en
     concevant : `commitBoard`/`applySnapshot` ne sont PAS les seuls endroits
     qui mutent l'état partagé — `drawFromPile` (et son équivalent marqueurs)
     appelle `setPiles`/`setHeldTile`/`setHeldItem` **directement**, sans
     passer par `commitBoard`, par choix assumé ("piocher n'est pas undoable
     en soi"). Intercepter individuellement chaque site aurait été fragile
     (facile d'en oublier un). Solution retenue : exactement le même principe
     que l'`useEffect` de persistance `localStorage` déjà existant (qui,
     lui aussi, se contente d'observer les valeurs d'état, sans se soucier de
     QUELLE fonction les a changées) — un seul effet avec un tableau de
     dépendances listant tout l'état partagé (players/piles/discardCards/
     placedTiles/heldTile/boardItems/heldItem/monsters/markers/heldMarker),
     qui pousse tout vers Firebase à chaque changement, quelle qu'en soit la
     source. En ligne, cet effet remplace entièrement l'écriture
     `localStorage` (qui n'a plus de sens multi-appareils) ; en solo,
     `localStorage` continue exactement comme avant.
   - **Piège de course évité : ne jamais pousser avant le premier instantané
     reçu** — ce même effet se déclenche dès le tout premier rendu, avant même
     que l'abonnement Firebase n'ait eu le temps de répondre. Sans garde, un
     joueur qui REJOINT une partie existante écraserait la partie de tout le
     monde avec un plateau vide dès son premier rendu (`piles:[]` par défaut).
     Fix : un flag `onlineReady` (posé par le tout premier callback de
     `subscribeToRoom`, que ce soit en créant ou en rejoignant) bloque cet
     effet tant qu'il n'est pas vrai — et tant qu'il ne l'est pas, la page
     entière affiche juste "Connexion à la partie…" (rien n'est encore rendu,
     donc rien n'est cliquable, double protection).
   - **`currentIndex` exclu du blob partagé, jamais construit depuis
     `data.json`/localStorage classique en ligne** — conformément à "le
     footer doit être indépendant par appareil" : sa propre clé localStorage
     scopée par code de partie (`labyrinthe_organic_online_currentIndex_
     <code>`), jamais lu/écrit dans `rooms/<code>/board`. Le reste du
     mécanisme (flèches ‹/›, undo/redo qui restaure aussi "quel joueur je
     regardais") continue de passer par `commitBoard`/`applySnapshot`
     exactement comme en solo — seule la valeur SORTANTE vers Firebase
     l'exclut.
   - **Le deck n'est construit qu'une seule fois, par le créateur** — piège
     identifié dès la conception : `makeInitialPiles`/`shuffle` génèrent des
     ids et un ordre ALÉATOIRES, donc si chaque appareil appelait sa propre
     `makeInitialPiles(data)` indépendamment, chaque joueur verrait un deck
     complètement différent. Le `piles` initial vaut donc toujours `[]` en
     ligne (créateur inclus) — seul le créateur, dans l'effet de mise en
     place de la room, construit le deck une fois et le pousse via
     `createRoom` ; tout le monde (créateur compris) ne reçoit ses piles que
     par l'abonnement, jamais par une construction locale. Même raisonnement
     pour `cardCatalogRef` : vide au départ en ligne, rempli uniquement par
     ce que la room renvoie (`Object.assign` sur les entrées reçues).
   - **`OnlineLobbyPage.js`** (nouvelle page, accessible depuis un second
     bouton "🌐 Jouer en ligne" sur la home, à côté du "🎮 Jouer" solo
     inchangé) : Créer (code choisi librement par le créateur, ex: "GAME" ou
     "1234" — sanitisé en majuscules sans caractères interdits par Firebase)
     ou Rejoindre (code existant). Créer sur un code déjà pris affiche un
     avertissement et demande un second clic explicite pour écraser. Cette
     page ne fait QUE choisir/valider le code (`roomExists`) et naviguer —
     toute la construction du deck reste dans `PlateauPage`.
   - **Undo/redo en ligne — limite connue, pas résolue** : `pastRef`/
     `futureRef` restent un historique 100% LOCAL à chaque appareil ; annuler
     restaure un instantané complet (via `applySnapshot`) qui écrase l'état
     PARTAGÉ actuel, y compris les actions d'autres joueurs survenues entre
     temps. Accepté comme comportement pour l'instant (cohérent avec "dernière
     écriture gagne", pas de verrouillage) mais pas encore signalé/confirmé
     avec Gus — à surveiller au premier test réel.
   - **Pas encore testé en conditions réelles (multi-client)** : le bac à
     sable de cet agent bloque les connexions sortantes vers gstatic.com et
     le domaine Firebase (politique réseau de l'environnement, confirmé via
     `curl`/le statut du proxy) — impossible de tester la synchro moi-même.
     Testé indirectement : le mode solo/hotseat n'est pas affecté (suite de
     tests Playwright existante toujours verte), l'import dynamique ne se
     déclenche jamais sans clic explicite sur "Jouer en ligne", et l'échec de
     connexion (attendu dans ce bac à sable) affiche bien un message d'erreur
     propre au lieu de planter. La vraie synchro multi-appareils reste à
     confirmer par Gus.
   - **Le stockage Firebase ne s'auto-supprime jamais** — question de Gus
     ("la partie est supprimée au bout d'un moment ou reste stockée quelque
     part ?") : une room `rooms/<code>` reste en base indéfiniment tant que
     personne ne la supprime explicitement (aucun code ne le fait
     actuellement). Seul le **mode test** des règles d'accès expirait au bout
     de 30 jours (bloquait l'accès, ne supprimait pas les données) —
     verrouillé depuis par des règles permanentes, voir plus bas ("Règles de
     sécurité Firebase verrouillées").
   - **Bugs corrigés (grille qui démarre en haut à gauche, bouton recentrer
     disparu, zoom qui semblait pivoter n'importe où)** — les 3 symptômes
     avaient la MÊME cause : plusieurs `useEffect`/`useLayoutEffect` à
     dépendances vides (`[]`) qui lisent `viewportRef.current` s'exécutent
     UNE SEULE FOIS au montage — mais en ligne, la vraie grille n'est montée
     qu'une fois `onlineReady` vrai (voir le early-return "Connexion à la
     partie…" plus haut), donc au tout premier montage `viewportRef.current`
     valait encore `null` : l'effet de centrage de la vue ne faisait rien et
     ne se redéclenchait jamais une fois la grille réellement montée (d'où
     le départ en haut à gauche, et le zoom qui pivotait bizarrement autour
     de cette position jamais centrée) ; l'effet qui mesure `sidebarBounds`
     via `ResizeObserver` s'arrêtait pareil avant même d'attacher
     l'observateur, laissant `sidebarBounds` bloqué à `{top:0, bottom:0}`
     pour de bon — le bouton recentrer (ancré sur `sidebarBounds.bottom+8`)
     se retrouvait plaqué tout en bas de l'écran, cachée derrière le pied de
     page. Fix : `onlineReady` ajouté au tableau de dépendances des 3 effets
     concernés (centrage de la vue, mesure de `sidebarBounds`, prévention du
     pinch natif Safari) — les rejoue une fois la grille réellement montée,
     sans rien changer en solo (`onlineReady` y vaut déjà `true` dès le
     départ, donc même comportement qu'avant).
   - **Nouvelle partie en ligne : les pioches se divisent maintenant aussi
     en 2 dès la création** (Gus : "quand on démarre la première fois une
     game les pioches doivent se diviser en deux comme quand on reset") —
     `splitFreshDeckPiles(freshPiles)` (nouvelle fonction, à côté de
     `makeInitialPiles`) extrait exactement la logique déjà utilisée par
     `resetBoard`, réutilisée telle quelle par l'effet de création de room :
     construit le deck, le divise, puis pousse le résultat déjà divisé vers
     Firebase. `resetBoard` a été mis à jour pour appeler ce même helper
     plutôt que de dupliquer la logique de découpe en ligne. Pas d'animation
     de split jouée à la création (pas de DOM préexistant à ce moment-là,
     contrairement à Reset) — `splitInfo` retourné par le helper est
     simplement ignoré dans ce cas précis.
   - **Bug corrigé (révéler une carte d'une pioche empêchait de révéler une
     carte d'une autre pioche en même temps, en ligne)** — Gus : "Révéler la
     première carte d'une pioche empêche de révéler une autre carte d'une
     autre pioche en même temps". Cause : `heldTile`/`heldItem`/`heldMarker`
     (la carte actuellement "tenue en main", entre le tirage et la pose)
     faisaient partie du blob `board` PARTAGÉ poussé vers Firebase — un seul
     emplacement par catégorie (case/depart d'un côté, sort/energie/monstre
     de l'autre), déjà vrai en solo mais sans conséquence là où il n'y a
     qu'un seul joueur actif à la fois. En ligne, ça veut dire qu'un SEUL
     joueur qui pioche/tient une carte bloque TOUS les autres joueurs de la
     même catégorie jusqu'à ce qu'il la pose ou l'annule — deux joueurs ne
     pouvaient jamais avoir chacun une carte en main simultanément. Fix : ces
     trois clés sont maintenant LOCALES à chaque appareil, jamais
     synchronisées — même traitement que `currentIndex`, déjà exclu du blob
     partagé pour la même raison de fond ("propre à cet appareil, pas à la
     partie"). Concrètement : la callback de `subscribeToRoom` n'appelle plus
     `setHeldTile`/`setHeldItem`/`setHeldMarker` depuis les données reçues (un
     autre joueur ne peut donc plus écraser ce que CET appareil tient), et
     l'effet de synchro sortante ne les inclut plus dans l'objet passé à
     `pushBoardUpdate`. Reste correct malgré ça : la pile elle-même (déjà
     privée de sa carte du dessus au moment du tirage) reste synchronisée,
     donc "voir que la pioche a diminué / que la défausse a une nouvelle
     carte" reste bien visible de tous les joueurs — seule la carte
     TRANSITOIREMENT tenue en main cesse d'être un état de partie partagé.
     Sans impact en solo (l'historique undo/redo local capturait déjà
     `heldTile`/`heldItem` séparément de ce qui part vers Firebase/
     localStorage, voir `commitBoard`).
   - **Bug corrigé (gros crash "écran noir", room qui devient inaccessible/
     vide — boucle d'écho locale infinie entre synchro sortante et
     abonnement Firebase)** : Gus (et son ami, aussi développeur) a signalé
     un crash reproductible "quand n'importe quelle pile arrive à zéro ou
     proche de zéro", pire avec plusieurs joueurs connectés, laissant la
     room inaccessible/vide ensuite ; l'ami a suggéré "un souci d'attribut
     ou variable qui passe à -1" côté dernière carte d'un paquet. Vidage
     exhaustif d'une pioche (10 cartes de départ) jusqu'à 0 en solo dans ce
     bac à sable : **aucun crash reproduit** — piste "index/-1 sur la
     dernière carte" écartée pour le code de pioche lui-même (déjà bien
     gardé : `pile.cards.length===0` vérifié avant toute lecture dans
     `drawFromPile`/`PileStack`/`DiscardSlot`). Cause réelle trouvée en
     auditant la synchro EN LIGNE plutôt que la mécanique de pioche : l'effet
     de synchro SORTANTE (`pushBoardUpdate`, déclenché par un `useEffect` sur
     `[players, piles, discardCards, placedTiles, boardItems, monsters,
     markers, ...]`) et le callback de `subscribeToRoom` (qui appelle
     `setPlayers`/`setPiles`/etc. à chaque changement REÇU de Firebase)
     partagent exactement les mêmes clés d'état — et Firebase répercute
     l'écriture d'un client vers CE MÊME client (écho local "optimiste"),
     pas seulement vers les autres. Résultat : recevoir un instantané (donc
     de nouveaux tableaux désérialisés, nouvelles références même à contenu
     identique) redéclenchait l'effet de synchro sortante, qui le repoussait
     aussitôt vers Firebase, dont l'écho redéclenchait le callback, qui
     rappelait les mêmes setState... un aller-retour qui s'auto-entretient
     indéfiniment, amplifié par chaque client connecté en plus (chacun
     relance la boucle des autres). Vérifié empiriquement dans ce bac à
     sable avec un faux module `multiplayer.js` (simule l'écho local d'une
     vraie base Firebase, sans réseau) : **avant fix, une seule action
     (ajouter un joueur) déclenchait déjà 763 pushes en 3 secondes et
     continuait de grimper sans jamais se stabiliser** ; après fix, la même
     action ne déclenche qu'un seul push, stable. Vider entièrement la
     pioche de départ (10 tirages + poses) en ligne avec le fix : 22 pushes
     au total (proportionnel aux 22 actions réelles), aucune erreur, aucun
     crash. Ce défaut structurel touchait N'IMPORTE QUELLE mutation en
     ligne, pas spécifiquement les pioches vides — la coïncidence avec "la
     dernière carte d'une pioche" vient probablement du fait que vider une
     pioche déclenche une salve de changements rapprochés (tirage + pose +
     répétition), rendant la boucle assez massive pour devenir visible/
     bloquante, alors qu'elle tournait déjà en sourdine à chaque action
     depuis le début de la partie en ligne. Explique aussi pourquoi
     `ErrorBoundary` (voir plus bas) n'attrapait pas le crash pour Gus alors
     qu'il fonctionnait pour son ami sur un autre appareil : un tourbillon
     de re-renders/écritures réseau qui rame/gèle l'onglet n'est pas une
     exception JS à proprement parler (rien ne "throw"), donc rien à
     attraper pour un Error Boundary React — seule une vraie erreur de rendu
     qui en résulterait chez un AUTRE client (ex: recevant un état
     entre-temps devenu incohérent à cause de deux clients qui s'écrasent
     mutuellement avec des données déjà périmées) serait, elle, catchable.
     Fix : `applyingRemoteRef` (`PlateauPage.js`), posé à `true` juste avant
     que le callback de `subscribeToRoom` n'appelle ses `setPlayers`/
     `setPiles`/etc., et consommé une seule fois par l'effet de synchro
     sortante (qui saute alors son propre push et réarme le flag à `false`)
     — une mise à jour REÇUE de Firebase ne repart donc plus jamais vers
     Firebase ; seule une mutation VRAIMENT locale (qui ne pose jamais ce
     flag) continue de déclencher un push normalement. Pas de risque de
     rater un push légitime : la fenêtre de course où une action locale
     interviendrait exactement entre la pose du flag et sa consommation par
     l'effet (tous deux synchrones dans le même commit React) est
     structurellement impossible en JS single-thread.
   - **Bug de crash RÉEL trouvé et corrigé (le fix ci-dessus n'était pas la
     bonne cause pour CE crash précis — Gus a confirmé après déploiement que
     ça persistait)** : une fois `applyingRemoteRef` déployé et confirmé en
     ligne (`version.json` vérifié par Gus), le crash "quand il reste une
     carte dans n'importe quelle pioche et que je clique dessus" persistait
     à l'identique, ErrorBoundary affichant bien "Un problème est survenu" —
     et Gus a confirmé que **lui tout seul, en ligne, sur un seul appareil**
     suffit à le déclencher (pas besoin d'un second joueur, contrairement à
     l'hypothèse "boucle d'écho" ci-dessus, qui elle ne levait jamais de
     vraie exception). Cause réelle, différente : **Firebase Realtime
     Database ne stocke jamais un tableau ou objet VIDE** — un noeud dont
     tous les enfants disparaissent est supprimé du document, pas laissé à
     `[]`/`{}`. Piocher la DERNIÈRE carte d'une pioche produit localement
     `cards:[]` (`pile.cards.slice(0,-1)` sur un tableau à 1 élément) ; une
     fois poussé vers Firebase puis reçu en écho (même en solo — la synchro
     sortante pousse quand même vers Firebase et re-reçoit sa propre
     écriture, voir le bug d'écho ci-dessus, désormais sans boucle mais
     l'aller-retour simple reste normal et voulu), ce `cards:[]` revient
     comme `cards` ABSENT (`undefined`), jamais `cards:[]`. Or `pile.cards`
     est lu directement (`.length`, `[...]`, `.slice`, `.forEach`, `.map`)
     à une quinzaine d'endroits dans `PlateauPage.js` (`drawFromPile`,
     `PileStack`, `splitPile`, `mergeArmedInto`, `registerDeckCards`...)
     sans aucun filet — le tout premier re-rendu qui lit `pile.cards.length`
     sur cette pioche plante avec "Cannot read properties of undefined",
     une vraie exception de RENDU React, cette fois bien catchable par
     `ErrorBoundary` (contrairement à la boucle d'écho, qui ne "throw"
     jamais) — cohérent avec le message exact que Gus a vu. **Reproduit
     empiriquement dans ce bac à sable** avec un faux module `multiplayer.js`
     qui simule fidèlement ce comportement Firebase précis (tableaux/objets
     vides récursivement supprimés lors de l'écho, pas juste un
     `JSON.parse(JSON.stringify(...))` qui ne le reproduit PAS) : vider une
     pioche de 10 cartes jusqu'à 1 puis interagir avec elle (armer le menu
     Diviser/Mélanger par appui long) déclenche exactement
     `TypeError: Cannot read properties of undefined (reading 'length') at
     PileStack`, capturé par `ErrorBoundary` — confirmé absent une fois le
     fix appliqué, dans le même scénario exact. Fix : le callback de
     `subscribeToRoom` normalise maintenant chaque pile reçue
     (`b.piles.map(p => ({...p, cards: Array.isArray(p.cards) ? p.cards :
     []}))`) avant `setPiles` — le `Array.isArray(b.piles) ? b.piles : []`
     déjà en place protégeait le tableau `piles` LUI-MÊME, mais pas les
     `cards` NICHÉS dans chaque pile qu'il contient. Vérifié qu'aucune autre
     structure imbriquée synchronisée n'a le même trou : `player.sorts`/
     `energies`/`markerShelf` (aussi susceptibles de devenir `[]` puis
     disparaître) sont déjà lus partout avec un filet `(p.sorts||[])` etc.
     (`playerCardList`, tous les sites `markerShelf`) — seule `pile.cards`
     manquait ce filet, câblé directement à ~15 endroits sans jamais passer
     par un helper commun.
   - **Item en cours d'investigation, non résolu (Gus a demandé une nouvelle
     piste)** : Gus signale un tap qui "ne fait rien" en déplaçant un item
     déjà posé sur le plateau (le item est sélectionné via appui long, un
     premier tap sur la case de destination ne fait visiblement rien, le tap
     suivant déplace enfin l'item) — bug déjà signalé plusieurs fois cette
     session, jamais reproduit malgré de nombreux essais Playwright (souris),
     hypothèse du tremblement du doigt explicitement écartée deux fois par
     Gus lui-même. Nouvelle piste suggérée par Gus cette fois : un des
     "blocages" (`hasAnySelection()`/`guardedBySelection`/`disabled` sur les
     pioches-défausses/`onClickCapture` du pied de page) ajoutés cette
     session serait-il responsable ? Réaudité ligne par ligne : ces 4
     mécanismes ne sont câblés QUE sur les contrôles du header/pied de page/
     pioches/défausses/zone d'équipement — jamais sur `onContentClick`/
     `handleSingleClick` (le tap sur la grille elle-même), qui ne les
     consulte à aucun moment. Hypothèse donc écartée avec certitude pour ce
     chemin précis. Pas de cause alternative confirmée à ce stade — piste la
     plus plausible restante (non vérifiée, nécessiterait un vrai appareil
     Android comme les bugs iPhone déjà documentés) : une interaction entre
     le timer d'appui long de 500ms (`itemPressTimerRef`) et la façon dont
     Chrome Android gère un tap qui suit immédiatement un appui long sur une
     surface nativement "pannable" (`touchAction:'pan-x pan-y'` sur le
     viewport de la grille) — pourrait faire que le `click` natif attendu
     après ce tap-là soit retardé/perdu par le navigateur lui-même, en dehors
     du contrôle du code JS. Pas de correctif appliqué cette fois — un
     changement à ce niveau toucherait le système de gestes clic/double-clic/
     appui long déjà fragile documenté plus haut, sans pouvoir le vérifier
     dans ce bac à sable (aucun appareil Android réel disponible). À
     reprendre avec Gus si des détails de reproduction supplémentaires
     deviennent disponibles.
   - **Règles de sécurité Firebase verrouillées avant l'expiration du mode
     test à 30 jours** (Gus : "on peut faire le truc pour le serveur test qui
     ferme dans 30 jours comme ça c'est fait ?") — remplace les règles de
     mode test (ouvertes, expirent au bout de 30 jours) par des règles
     explicites, permanentes : accès refusé à la racine par défaut, lecture/
     écriture ouvertes uniquement sous `rooms/<code>` (le code de la partie
     reste le seul "secret" de contrôle d'accès, conforme au design déjà
     confirmé par Gus — pas de couche d'authentification supplémentaire).
     Ne peut pas être fait depuis cet environnement (aucun accès à la console
     Firebase de Gus) — livré comme un snippet JSON à coller soi-même dans
     Firebase Console → Realtime Database → onglet Rules → Publier :
     ```json
     {
       "rules": {
         ".read": false,
         ".write": false,
         "rooms": {
           "$roomCode": {
             ".read": true,
             ".write": true
           }
         }
       }
     }
     ```

## Vocabulaire des notes — à retenir (termes donnés par Gus)
- **Catégorie principale** : un onglet déroulant de la home page (Règles de base, Cases,
  Sorts, Énergies, Monstres, Lexique, Modes de jeu, Visuels, Matériel, Application) —
  techniquement une `EditableSection` dans `sectionContent` (`src/pages/HomePage.js`),
  pilotée par `data.sectionOrder`.
- **Sous-catégorie** : un onglet déroulant imbriqué DANS une catégorie principale — pas
  besoin d'une deuxième `EditableSection` (renommable/réordonnable), un `Section`
  simple (`src/components/Section.js`, titre+emoji fixes) suffit tant que Gus donne le
  nom exact et qu'il n'y a pas besoin de renommer/réordonner cette sous-catégorie
  précise. Exemple : les deux sous-catégories de la catégorie principale Application
  (voir plus bas).
- **Bloc** : la plus petite entité d'une catégorie principale — une carte individuelle
  (un sort, une énergie, une case, un monstre, une règle — tout ce qui passe par
  `Card.js`). PAS un mode de jeu (`ModeCard.js` a son propre système de notes, resté
  simple, voir plus bas) ni une entrée de lexique.
- **Note des blocs** : le champ `notes` d'un bloc individuel (`item.notes` dans
  `Card.js`). Contrairement à la note globale, **visible dans les DEUX modes**
  (Gus : "j'aimerais que la pastille et les notes des blocs soient visibles même sans
  le mode édition") — le toggle `▼/▲ notes` n'est plus caché par `editMode &&` comme
  avant. En mode édition, le panneau est un `BlockEditor` (double entrée) ; hors édition,
  un rendu lecture seule via `renderText` (même contenu, mêmes dividers, juste pas
  éditable).
- **Note globale** : le champ `data.<section>Notes` d'une catégorie principale entière
  (`NotesBlock`, ex: `data.sortsNotes`) — sert à noter des idées générales sur toute la
  catégorie, pas un bloc précis. **Reste édit-mode-only** (`if (!editMode) return null`
  dans `NotesBlock.js`, comportement inchangé) — contrairement à la note des blocs,
  Gus n'a pas demandé à la rendre visible hors édition.
- **Double entrée** : le système de `BlockEditor.js` — Entrée deux fois de suite scinde
  le texte en un nouveau bloc séparé par un vrai `<hr>` (déjà utilisé dans Idée en vrac
  et Visuels avant cette session). Gus : "j'adore ce système et j'aimerais l'appliquer
  sur tous les bloc note de l'appli" — **toutes** les notes globales (`NotesBlock`) et
  toutes les notes des blocs (`Card.js`) utilisent maintenant `BlockEditor` au lieu d'un
  simple `EditText multiline`. `BlockEditor` a gagné une **croix rouge en haut à droite
  de chaque mini note** (bloc individuel du double entrée) pour la supprimer directement
  — en plus du réordonnancement par glisser déjà existant (poignée `⠿` à gauche) et du
  fusionnement par Backspace-en-début-de-bloc. Comme `BlockEditor` est un composant
  partagé, cette croix profite aussi à Idée en vrac/Visuels/Matériel sans rien y changer.
  Une pastille rouge de notification (`countNoteBlocks` dans `src/utils.js`, compte les
  segments `\n\n` non vides) affiche le nombre de mini notes à côté du toggle `▼ notes`
  d'un bloc — rien si 0, sinon le chiffre dans un petit cercle rouge plein.
- **Catégorie principale Application (🤖)** : nouvelle catégorie créée cette session,
  avec deux sous-catégories `Section` : 📜 Note et 👾 Jeu (vides pour l'instant, à
  remplir plus tard — pas de contenu demandé pour l'instant, juste la structure). Sa
  propre note globale (`data.applicationNotes`) est déjà branchée. `application` a été
  ajouté à `SECTION_ORDER_DEFAULT`/`SECTION_LABELS_DEFAULT` (`src/config.js`) — la
  migration existante (`migrateSectionOrder`) l'injecte automatiquement pour les
  data.json déjà existants, sans script de migration manuel. Chacune des deux
  sous-catégories a aussi gagné son propre espace note (`data.applicationNoteNotes`/
  `data.applicationJeuNotes`, distincts de `data.applicationNotes`) — trois espaces de
  notes indépendants au total dans cette seule catégorie principale.

## Cartes catalogue (`src/components/Card.js`) — retouches de mise en page
Deux ajustements demandés par Gus sur la ligne du bas de chaque carte (règles/cases/
sorts/énergies/monstres, tous via ce composant partagé) :
- **Badge de quantité (`×N`) recentré** : vivait dans le même groupe flex `gap:8` que
  la croix `✕` de suppression, tout en bas à droite — Gus les trouvait trop proches
  l'un de l'autre. La ligne du bas est passée en `position:'relative'`, et le badge en
  `position:'absolute', left:'50%', transform:'translateX(-50%)'` — centré dans la
  ligne quel que soit la largeur des deux groupes flex de part et d'autre (gauche :
  emoji élément / niveau / toggle notes ; droite : juste la croix maintenant).
  **Devenu éditable par double-tap** (retouche suivante, Gus : "j'aimerais pouvoir
  modifier le chiffre en faisant double tap en mode édition") — enveloppé dans un
  `EditText` (même convention double-tap que partout ailleurs dans l'app), reparsé en
  entier positif au blur (`parseInt`, repli sur `1` si non numérique/≤0, même filet de
  sécurité que l'ancien affichage `||1`).
  **Bug corrigé (le double-tap ne marchait qu'une fois sur dix)** : le "×" vivait comme
  simple texte, frère de la `div` d'`EditText` mais EN DEHORS d'elle — `onDoubleClick`
  vit uniquement sur cette `div`, un évènement déclenché sur un nœud frère ne peut
  jamais l'atteindre (la bulle ne remonte que vers les ANCÊTRES, jamais latéralement
  vers une fratrie). Un double-tap tombant sur le "×" (à peu près la moitié de la
  largeur visible d'un badge aussi court que "×1") ne faisait donc rigoureusement rien —
  seuls les taps tombant précisément sur le(s) chiffre(s) fonctionnaient, d'où le "1 fois
  sur 10" observé. Fix : le "×" fait maintenant partie de la valeur éditée elle-même
  (`value:'×'+quantite`, `v.replace(/[^\d]/g,'')` au blur pour retirer la ponctuation
  avant de reparser l'entier) — même principe déjà utilisé pour `item.cout`/
  `item.limite` juste au-dessus (texte complet édité tel quel, pas de préfixe séparé) —
  toute la zone "×N" devient un seul élément, donc une seule cible de double-tap.
- **Emoji élément (sorts/énergies) déplacé du haut-gauche vers le bas-gauche** :
  vivait empilé directement sous la pastille de couleur (`StatusDot`) dans la colonne
  d'édition à gauche de la carte, à seulement 4px d'écart — Gus les trouvait trop
  proches. Déplacé dans le groupe flex du bas-gauche, au même endroit que le sélecteur
  de niveau (`withLvl`) des monstres occupe déjà pour ses propres cartes (ces deux
  props sont mutuellement exclusives selon le type de carte, donc pas de collision
  possible). Reste strictement édit-mode-only comme avant ; la pastille élément
  affichée en lecture seule (`!editMode && showElem`) n'a pas bougé, elle était déjà au
  bon endroit.
- **Notes des blocs** : voir "Vocabulaire des notes" plus haut pour le détail complet
  (double entrée, visible hors édition, pastille de comptage).

## Modes de jeu (`src/components/ModeCard.js`) — difficulté et joueurs éditables
Gus : "j'aimerais aussi pouvoir modifier le nombre d'emoji étoiles et le nombre de
joueurs". `mode.difficulte` (ex: `"⭐⭐⭐"`, texte libre — l'utilisateur tape lui-même le
nombre d'étoiles voulu, pas de sélecteur dédié) et `mode.joueurs` (ex: `"2-10"`) étaient
de simples `<span>` d'affichage dans l'en-tête toujours-visible de la carte (même repliée)
— maintenant chacun enveloppé dans un `EditText` double-tap. **Piège** : cet en-tête a son
propre `onClick` (plier/déplier la carte) — double-tapper `difficulte`/`joueurs` pour
éditer déclenchait aussi ce toggle par bulle d'événement. Fix : chaque span enveloppant
son `EditText` a `onClick:e=>e.stopPropagation()`, même garde que la croix ✕ de
suppression juste à côté. `joueurs` passe d'un affichage conditionnel (`mode.joueurs &&`)
à `(editMode || mode.joueurs) &&` pour rester éditable même vide (pouvoir en ajouter un
là où il n'y en avait pas).

## Détails d'un bloc Cases (`src/components/DetailsEditor.js`) — variantes non identiques
Gus : "il y a 20 cases portails par exemple, mais les 20 ne sont pas identiques, certains
sont une case d'un couloir tout droit, certains en forme de T" — le simple badge `×N`
("nombre d'exemplaires") ne suffisait pas à distinguer les différentes variantes visuelles
d'un même type de case. Nouveau panneau **"▼ détails"** sur chaque carte Cases uniquement
(`withDetails:true`, prop ajoutée seulement au `Card` rendu dans `sectionContent.cases` de
`HomePage.js` — Gus a explicitement dit ne pas en avoir besoin sur Sorts/Énergies/Monstres,
"tu auras juste le dos de cartes et tu devras marquer les informations de chaque item/
monstre sur la face" à la place), même emplacement/style que le toggle "▼ notes" juste à
côté (pastille de comptage bleue plutôt que rouge, pour les distinguer au premier coup
d'œil). `item.details` = tableau de `{id, fichier, quantite}` — un "+ ajouter une ligne"
en bas du panneau ajoute une ligne (`fichier:''`, `quantite:1`), chaque ligne a son propre
✕ de suppression. Pas de glisser-déposer pour réordonner ces lignes (pas demandé par Gus,
contrairement à `BlockEditor` — liste courte, l'ordre n'a pas d'importance ici).
- **Le badge `×N` devient calculé automatiquement dès qu'il y a au moins une ligne de
  détails** (somme des `quantite` de chaque ligne, ex: 12+8=20) — Gus a explicitement
  choisi cette option plutôt que de laisser les deux champs indépendants ("j'ai pas
  compris tu peux réexpliquer" puis, après un second essai d'explication avec exemple
  concret : "option a auto ça me va très bien"), pour ne jamais laisser le total et la
  somme des variantes se désynchroniser silencieusement. Concrètement : `derivedQuantite`
  (dans `Card.js`) vaut `null` tant qu'il n'y a aucune ligne de détails (le badge reste
  alors un `EditText` éditable par double-tap, comportement inchangé) ; dès qu'il y a au
  moins une ligne, le badge devient un simple `<span>` non éditable affichant la somme.
  Supprimer la dernière ligne de détails rend le badge de nouveau éditable, en conservant
  la dernière valeur connue (pas de retour silencieux à `1`).
  **`item.quantite` lui-même reste à jour, pas seulement l'affichage** : à chaque
  modification des lignes (ajout/suppression/changement de quantité), le `onChange` du
  `DetailsEditor` recalcule la somme et l'écrit aussi dans `item.quantite` (pas seulement
  dans une variable locale d'affichage) — pour que tout futur code lisant `item.quantite`
  directement (ex: la "vraie pioche dynamique depuis le catalogue" prévue, un exemplaire
  de carte par unité de `quantite`) voie déjà le bon total sans avoir besoin de connaître
  `details`.
- Undoable comme toute modification de `data.cases` : passe par `onUpdate` →
  `updArr('cases', ...)` → `upd(...)` dans `App.js`, exactement le même chemin que
  `notes`/`nom`/`effet` — aucun câblage undo/redo séparé à écrire.

## Neuvième passage de retouches (application générale, hors Plateau)
Gus, après avoir validé le rendu précédent : "parfait, merci !", suivi de 7 petites demandes
sur l'application de note/catalogue en général (pas le Plateau).
- **Auto-scroll indésirable pendant l'édition/le glisser dans `BlockEditor`** (Gus : "ça
  scroll un peu tout seul comme pour essayer de recentrer le contenu sur mon écran... pour
  déplacer des notes ça sort de l'écran... quand j'édite une note pareil, ça scroll pour
  sortir de l'écran et je vois pas ce que j'écris") — deux mécanismes de scroll automatique
  du navigateur identifiés comme causes plausibles (non vérifiables empiriquement en
  sandbox headless, comportement de scroll fin non observable de façon fiable sans un vrai
  appareil — même limite que les bugs iPhone/Android déjà documentés) : (1) `el.focus()`
  (appelé après Entrée-deux-fois ou Retour-arrière-en-début-de-bloc pour refocaliser le
  bon `<textarea>`) déclenche par défaut le comportement natif "scroller l'élément focalisé
  dans la vue", qui se recalcule souvent mal juste après un `autoGrow()` (la hauteur du
  `<textarea>` vient de changer) — passé à `el.focus({preventScroll:true})` ; (2) le "scroll
  anchoring" natif du navigateur (activé par défaut) réajuste automatiquement le scroll
  quand du contenu AU-DESSUS de la position actuelle change de taille — exactement ce qui
  arrive à chaque frappe (`autoGrow`) et à chaque étape d'un glisser (les blocs changent de
  hauteur relative) — désactivé via `style:{overflowAnchor:'none'}` sur le conteneur racine
  de `BlockEditor`. **Best-effort, à confirmer par Gus** : les deux fixes sont sûrs et sans
  effet de bord (ils ne font que désactiver un comportement automatique du navigateur), mais
  impossibles à vérifier visuellement dans ce bac à sable.
- **Écran de token : "Mode local" en premier et mis en avant** (Gus, pour les invités sans
  token : "ce serait bien que le bouton continuer sans token en mode local arrive en premier
  et en évidence (surbrillance ou autre) et tu peux juste écrire mode local") — `App.js`
  réordonne l'écran d'accueil (token) : le bouton (renommé "Mode local", auparavant
  "Continuer sans token (mode local)") passe AVANT le champ token, avec un style en
  évidence (fond/bordure/glow bleu clair), suivi d'un séparateur "— ou avec un token
  GitHub —" puis le champ token + bouton "Connexion GitHub" inchangés en dessous.
- **Statistiques de monstre éditables individuellement, par carte** (Gus : "pouvoir indiquer
  individuellement les caractéristiques du mob (PV, -1 au dé, récompense...)") — deux
  nouveaux champs optionnels sur chaque item de `data.monstres`, `item.recompense` et
  `item.pvBonus`, rendus dans `Card.js` (nouvelle prop `withMonsterStats`, passée uniquement
  par `LvlGroup.js`) juste sous l'effet, visibles seulement si non vides ou si `editMode` :
  quand renseignés, ils REMPLACENT respectivement le texte de récompense partagé du niveau
  (`LR[lvl]`/`data.lvlRewards[lvl]`, voir juste en dessous) et le bonus PV commun
  (`MONSTER_PV_BONUS`) pour CETTE carte précise uniquement lors de la construction du deck
  physique (`buildMonstreCards` dans `PlateauPage.js`, résolution en cascade `item.recompense
  || lvlRewards[item.lvl] || LR[item.lvl] || ''`, pareil pour `pvBonus`) — les autres
  monstres du même niveau gardent le texte partagé. Résolu UNE SEULE FOIS à la construction
  du deck (pas à chaque rendu de `CardFront`), même raisonnement déjà documenté pour
  `cardCatalogRef` : évite de threader `data.lvlRewards` en profondeur jusqu'au rendu de la
  carte physique.
- **Ligne à côté du niveau (récompense partagée) rendue éditable** (Gus : "pouvoir modifier
  la ligne à côté des niveaux du monstre (les lvl au niveau de la catégorie avant d'ouvrir
  l'onglet déroulant)") — le texte `LR[lvl]` ("1 énergie / -2 au dé" etc.) était jusqu'ici
  une constante figée dans `config.js`, jamais éditable. Migré vers un nouveau champ
  `data.lvlRewards` (objet `{[lvl]: texte}`), migration douce `migrateLvlRewards` (dans
  `src/utils.js`, appelée depuis `withMigrations` comme les autres migrations) qui seed
  chaque niveau depuis `LR[lvl]` (config.js) si absent — donc un `data.json` existant
  récupère automatiquement les valeurs d'origine comme point de départ éditable, aucune
  modification manuelle requise. `LvlGroup.js` (en-tête de chaque groupe de niveau, TOUJOURS
  visible même onglet fermé — c'est exactement l'endroit demandé par Gus) affiche maintenant
  ce texte via un `EditText` double-tap (`h('span', {onClick:e=>e.stopPropagation()}, ...)`
  — le `stopPropagation` évite que le double-tap d'édition ne déclenche aussi le
  plier/déplier de l'accordéon, même garde déjà utilisée ailleurs dans l'app pour ce genre
  de collision). `LR`/`MONSTER_PV_BONUS` (config.js) restent importés dans `PlateauPage.js`
  comme replis ultimes (une vieille carte déjà dans `cardCatalogRef` avant cette
  fonctionnalité, ou un niveau absent de `data.lvlRewards`).
- **Soirées Proto n'avait pas le système double-entrée** (Gus : "Soirée proto n'a pas le
  système divider double entrée") — le champ "Notes" de chaque soirée (`SoireePage.js`)
  passe de `EditText multiline` à `BlockEditor`, même convention que Idée en vrac/Visuels/
  Matériel/notes globales/notes des blocs. Le champ "Participants & lieu" reste un simple
  `EditText` (texte court, une seule ligne d'info — pas un besoin de "prise de notes" au
  sens où Gus l'entendait pour ce point précis).
- **Notes des 2 sous-catégories d'Application visibles hors mode édition** (Gus : "Notes des
  2 sous catégories de application doivent être visible sans le mode edit") — `NotesBlock.js`
  gagne un paramètre `alwaysVisible` qui contourne le `if (!editMode) return null` d'origine
  et affiche, hors édition, un rendu lecture seule via `renderText` (même contenu, mêmes
  séparateurs, juste pas éditable) — exactement le même schéma déjà utilisé pour "note des
  blocs" dans `Card.js`. Câblé uniquement sur `data.applicationNoteNotes`/
  `data.applicationJeuNotes` (les 2 sous-onglets 📜 Note / 👾 Jeu) dans `HomePage.js` — la
  note globale de la catégorie principale Application elle-même (`data.applicationNotes`)
  reste édit-mode-only comme toutes les autres notes globales, Gus n'ayant demandé que les
  2 sous-catégories.
- **Champs PA/tour (`cout`/`limite`) des sorts/énergies pas éditables quand vides** (Gus :
  "Pas possible de rajouter les pa xtour sur les items. ce serait bien de pouvoir edit cette
  partie") — dans `Card.js`, ces deux `<span>` n'étaient rendus QUE si déjà non-vides
  (`item.cout &&`/`item.limite &&`), donc un sort/énergie sans coût renseigné n'avait
  simplement aucun moyen d'en ajouter un depuis l'UI. Passé à `(editMode || item.cout) &&`/
  `(editMode || item.limite) &&` — même convention déjà en place pour `joueurs` sur
  `ModeCard.js` ("pour rester éditable même vide, pouvoir en ajouter un là où il n'y en
  avait pas") — les deux champs restent invisibles hors édition tant qu'ils sont vides
  (comportement de lecture inchangé), mais apparaissent comme cibles double-tap vides dès
  que `editMode` est actif.
- Vérifié en Playwright (les 4 points testables sans device réel) : le bouton "Mode local"
  apparaît bien en premier avec le style en évidence ; les champs coût/limite vides
  affichent bien le placeholder "Double-cliquer…" en mode édition ; les nouveaux champs
  "Récompense (remplace..."/"PV (remplace..." apparaissent bien sur une carte monstre
  dépliée, et éditer le texte à côté de "Lvl 1" (double-tap sur la ligne d'en-tête) se
  répercute immédiatement dans le DOM ; `BlockEditor` (avec sa poignée de glisser `⠿`) est
  bien présent sur le champ Notes d'une Soirée Proto ; taper dans les `BlockEditor` des
  sous-onglets Note/Jeu d'Application puis désactiver le mode édition laisse bien le texte
  visible. Contrôle de non-régression : navigation Plateau (solo) sans erreur console après
  ces changements, y compris le rendu d'une carte monstre physique (résolution
  `recompense`/`pvBonus` en cascade).

## Compteur de PA (points d'action) — pied de page du Plateau
Gus : "ce serait bien d'avoir un compteur de PA juste à droite du cœur, même principe mais
avec une étoile bleue, même léger trait contour blanc, bouton - à gauche, bouton + à
droite, et c'est de base à 3". Deuxième compteur par joueur, à côté du PV dans le groupe
central du pied de page (`player.pa`, nouveau champ à côté de `pv` — même position dans
l'objet joueur, donc hérite gratuitement de tout ce qui traite déjà `players` comme un
bloc : undo/redo (`commitBoard`/`applySnapshot`), persistance `localStorage`, synchro
Firebase en ligne — aucune plomberie séparée à écrire, exactement le même raisonnement
déjà documenté pour `natureSort`/`markerShelf`).
- **`DEFAULT_PA = 3`** (à côté de `DEFAULT_PV`), posé sur chaque nouveau joueur par
  `addPlayer`. **Repli `p.pa ?? DEFAULT_PA`** à la fois dans `updatePa` (lecture ET
  écriture) et à l'affichage : un joueur créé AVANT cette fonctionnalité n'a encore aucun
  champ `pa` du tout dans son objet (contrairement à une migration `data.json`, ceci est
  un état de session/partie, jamais rétro-rempli) — sans ce repli, le tout premier clic
  sur -/+ d'un tel joueur partirait de `undefined + delta` (`NaN`) au lieu de démarrer à 3.
  Vérifié en Playwright avec un joueur injecté directement en `localStorage` sans champ
  `pa` : affiche bien 3 par défaut, et un clic sur "−" donne bien 2 (pas `NaN`).
- **Étoile bleue plutôt qu'un emoji** : aucun emoji "étoile bleue" n'existe en Unicode
  (contrairement au cœur ❤️ pour le PV) — glyphe texte `★` coloré via CSS
  (`color:'#4fa3ff'`, le même bleu d'accent déjà utilisé partout dans l'app, ex. le glow
  du mode Vision) à la place. Même `HEART_OUTLINE` (contour blanc en `text-shadow`,
  4 décalages cardinaux de 1px) réutilisé tel quel — le commentaire de la constante a été
  mis à jour pour refléter qu'elle sert maintenant aux deux glyphes, pas seulement au cœur.
- **Structure du groupe central du pied de page** : le bloc PV existant (−/❤️/+) et le
  nouveau bloc PA (−/★/+) sont maintenant frères dans un même conteneur flex partagé
  (`gap:14`) à la place du seul bloc PV d'avant — le PA apparaît donc "juste à droite du
  cœur" comme demandé, sans toucher au fallback "Ajoute un joueur" (toujours affiché seul
  quand `current` est `null`, structure de la branche ternaire inchangée).
- **Boutons œil/dé/‹/› légèrement réduits** (Gus : "tu peux légèrement réduire la taille
  des boutons oeil, dé, < , > pour que tout soit à peu près de la même taille") — pour
  garder un pied de page visuellement cohérent maintenant qu'il y a un 4ème groupe de
  contrôles. `navBtnStyle` (‹/›) : 40×40 → 36×36, police 26 → 22. Bouton Vision (👁️) :
  40×40 → 36×36, police 18 → 16. `DiceButton` : 44×34 → 40×32, `DICE_EMOJI_SIZE` 20 → 18,
  `DICE_RESULT_SIZE` 27 → 24 (les deux constantes de taille du résultat du dé ajustées
  ensemble pour rester proportionnées). Aucun changement sur les boutons −/+ eux-mêmes
  (`pvBtnStyle`, 24×24, déjà les plus petits du groupe et non mentionnés par Gus).
  Vérifié en Playwright : ‹/›/👁️ mesurent maintenant 36×36, le dé 40×32 — un gabarit
  nettement plus homogène qu'avant (40×40/40×40/44×34).
- Vérifié en Playwright de bout en bout : PA affiché à 3 par défaut sur un nouveau joueur,
  indépendant du PV (bouton + du PA ne touche jamais au PV et vice-versa), indépendant par
  joueur (bump le PA du joueur 1 à 5, passer au joueur 2 via › affiche bien 3, pas 5),
  aucune erreur console.

### Retouches après premier retour de Gus sur le compteur de PA (même fonctionnalité)
Gus, après avoir vu le premier rendu : "pas mal ! il faudrait réduire un tout petit peu...
les autres boutons... et avoir une distance égale entre chaque bouton (là les boutons +
et- touchent un peu les boutons dé et œil)... sans rien changer d'autres il faudrait
augmenter la taille de l'étoile (genre 2 fois plus grande)... et sinon les pa doivent être
visible également à côté des cœurs quand on clique sur un joueur sur la barre des carrés
des joueurs à droite. ainsi que quand on clique sur un joueur en mode vision".
- **Distance égale entre CHAQUE bouton, pas seulement entre les 3 gros groupes** — la
  structure à 3 groupes imbriqués (chacun avec son propre `gap` interne — 4/8/14px selon
  le groupe — le tout espacé par `justifyContent:'space-between'` sur le conteneur
  parent) laissait `space-between` répartir l'espace RESTANT uniquement entre les 3
  groupes eux-mêmes, sans aucun plancher garanti — dès que leur largeur cumulée
  approchait celle du pied de page, cet espace restant tombait à quasi zéro, collant les
  boutons voisins de deux groupes différents (le symptôme signalé : `−`/`+` du PA
  touchant 🎲/👁️) tout en gardant les `gap` internes fixes à l'intérieur de chaque
  groupe — deux règles de distance différentes selon qu'on regarde entre ou dans un
  groupe. Fix : tous les boutons/éléments de la ligne aplatis en enfants DIRECTS d'un
  seul conteneur flex avec un seul `gap:10` — ce `gap` devient alors un plancher garanti
  entre CHAQUE paire d'éléments adjacents quelle que soit la largeur totale, et
  `justifyContent:'space-between'` continue de répartir tout espace EN PLUS de ce
  plancher de façon rigoureusement égale entre les n-1 intervalles (propriété native de
  la spec flexbox : `space-between` distribue toujours l'espace restant à parts égales
  entre tous les intervalles, pas seulement entre les enfants directs visibles comme
  "groupes") — `‹`/`›` restent ancrés aux extrémités comme avant, mais maintenant TOUS
  les intervalles intermédiaires (dé↔PV, PV↔PA, PA↔œil, et chaque `−`/glyphe/`+` à
  l'intérieur) partagent la même distance. Vérifié en Playwright : les 9 intervalles
  entre les 10 enfants de la ligne mesurent tous exactement le même écart en pixels.
- **Boutons ‹/›/👁️/🎲 réduits une nouvelle fois, très légèrement** ("un tout petit peu,
  vraiment pas beaucoup") : `navBtnStyle` 36×36→34×34 (police 22→20), bouton Vision
  36×36→34×34 (police 16→15), `DiceButton` 40×32→38×30 (`DICE_EMOJI_SIZE` 18→17,
  `DICE_RESULT_SIZE` 24→23). Les boutons `−`/`+` (`pvBtnStyle`) restent inchangés (jamais
  mentionnés par Gus, déjà les plus petits du lot).
- **Étoile agrandie (~2×), même boîte 34×34 inchangée** — Gus a explicitement demandé de
  ne "rien changer d'autre" que la taille : `fontSize` de l'étoile 26→52 (exactement le
  facteur 2× suggéré), tout le reste (position de la boîte, contour, taille du chiffre
  par-dessus) intact. Cause du problème d'origine : le glyphe texte `★` occupe beaucoup
  moins sa boîte de caractère que l'emoji `❤️` à taille de police ÉGALE — doubler
  seulement la police du glyphe suffit à obtenir une taille VISUELLE comparable au cœur,
  sans agrandir la boîte de positionnement 34×34 elle-même (`position:absolute` sans
  `overflow:hidden` laisse simplement le glyphe déborder visuellement de sa boîte tout en
  restant centré — déjà le cas pour le cœur lui-même à 30px dans une boîte de 34px,
  aucune retouche structurelle nécessaire). Le chiffre par-dessus (`position:relative`,
  peint après le glyphe `absolute` dans le même contexte d'empilement — z-index implicite
  par ordre du DOM) reste bien lisible par-dessus l'étoile agrandie, vérifié visuellement
  par capture d'écran.
- **PA maintenant visible dans la fenêtre `visionPlayerId`** — cette fenêtre est LA SEULE
  et MÊME fenêtre pour les deux points d'entrée cités par Gus (cliquer un carré de la
  barre latérale via `onOpenInfo`, ou cliquer un jeton en mode Vision — voir "Mode
  Vision" et le commentaire de `visionPlayerId` plus haut dans ce fichier), donc une
  seule modification couvre les deux cas. Étoile ajoutée juste après le cœur existant
  dans la rangée du haut (nom + cœur + étoile + ✕), même schéma que dans le pied de page
  mais à l'échelle de cette fenêtre (boîte 40×40 comme le cœur qui l'y voisine, police
  d'étoile 64 pour obtenir le même ratio visuel cœur/étoile que dans le pied de page —
  36px de cœur dans cette fenêtre contre 30px dans le pied de page, donc l'étoile suit
  proportionnellement : 64 contre 52). Purement consultatif (aucun bouton −/+ ici, cette
  fenêtre n'affiche jamais le joueur COURANT de façon exclusive — n'importe quel joueur
  de la partie peut y être affiché).
- Vérifié en Playwright (capture d'écran + mesures DOM) : cœur et étoile visuellement
  comparables en taille dans le pied de page ET dans la fenêtre `visionPlayerId` (ouverte
  via un clic sur le carré de la barre latérale, chemin partagé avec le mode Vision),
  chiffre du PA lisible par-dessus l'étoile dans les deux cas, les 9 écarts entre les 10
  boutons/éléments du pied de page tous égaux, aucune régression sur PV/dé/Vision/undo.

### Deuxième retouche sur le compteur de PA — étoile SVG + carré du dé
Gus, encore : "la taille du carré du bouton de oeil et dé sont pas identiques, possible de
faire en sorte que ce soit la même taille de bouton... bon pour l'étoile c'est pas encore
ça, le centre de l'étoile n'est pas centré par rapport au chiffre, du coup on voit
toujours pas bien le chiffre et elle dépasse vers le bas, possible de faire une étoile
beaucoup plus arrondie sur les pics ?".
- **`DiceButton` devient un carré 34×34 identique au bouton œil**, au lieu du rectangle
  38×30 d'avant (même `borderRadius:8` que les autres boutons du groupe pour un jeu de
  boutons visuellement assorti). `DICE_EMOJI_SIZE`/`DICE_RESULT_SIZE` réajustés (16/24)
  pour rester bien proportionnés dans la nouvelle boîte carrée, un peu plus petite en
  largeur qu'avant.
- **Étoile remplacée par une icône SVG dessinée (`StarIcon`), plus un glyphe de police
  `★`** — cause des deux symptômes signalés : un glyphe de caractère n'est ni centré ni à
  la même hauteur dans sa boîte selon la police/OS (même raison déjà documentée pour
  `RotateIcon`/`FlipIcon`/`TargetIcon`/`EyeIcon`, tous des SVG pour cette même raison —
  l'étoile aurait dû suivre ce même schéma dès le début plutôt que rester le seul glyphe
  de police du lot). `STAR_PATH` (constante de module, jamais recalculée) est un chemin à
  5 branches PRÉ-ARRONDI : chaque sommet (pointe extérieure ET creux intérieur) est
  remplacé par une courbe quadratique qui "coupe le coin" à 34% de la longueur de chaque
  arête au lieu de rejoindre le sommet en angle vif — la seule façon d'obtenir des pointes
  franchement arrondies sur une forme en étoile (un simple `border-radius` CSS ne
  s'applique qu'à un rectangle). `StarIcon({size, color})` rend ce chemin rempli en bleu
  (`fill`, prop `color`, défaut `#4fa3ff`) avec un fin contour blanc (`stroke:'#fff'`,
  `strokeLinejoin:'round'` pour que le contour lui-même épouse l'arrondi des pointes) —
  même esprit que `HEART_OUTLINE` pour le cœur, porté par le SVG plutôt qu'un
  `text-shadow` puisque ce n'est plus un glyphe de police. Positionné en `position:
  'absolute'` dans la même boîte 34×34 (pied de page) / 40×40 (fenêtre `visionPlayerId`)
  qu'avant — un `<svg>` centré par le flex du parent se comporte exactement comme le
  faisait le `<div>` de texte, donc le chiffre par-dessus (`position:'relative'`, peint
  après dans le même contexte d'empilement) reste bien visible sans rien retoucher à cette
  partie-là.
- Vérifié en Playwright : capture d'écran de l'étoile isolée (rendu HTML autonome, avant
  intégration) pour valider visuellement la forme arrondie avant de la câbler dans l'app ;
  bouton dé et bouton œil mesurent maintenant tous les deux exactement 34×34 ; chiffre du
  PA lisible en zoomant sur la boîte (pied de page ET fenêtre `visionPlayerId`) ; aucune
  régression sur les clics PV/PA/dé/Vision/carré joueur, aucune erreur console.

### Troisième retouche sur le compteur de PA — taille égale au cœur + pointes seules arrondies
Gus, une nouvelle fois précis : "c'est quasiment parfait... la taille est redevenu petite,
tu peux pas faire sorte que ce soit comme le cœur ? que le haut du coeur soit à la même
hauteur que le haut de l'étoile, le bas du coeur à la même hauteur que le bas de
l'étoile... uniquement les pics extérieur de l'étoile qui sont arrondis, si on peut garder
les angles proche de l'intérieur de l'étoile bien sharp (les coins à la base des pics)".
- **`STAR_PATH` régénéré : SEULS les 5 sommets EXTÉRIEURS (les pointes) sont arrondis,
  les 5 sommets INTÉRIEURS (les creux en V à la base de chaque pointe) restent des angles
  droits** — la version précédente arrondissait les deux types de sommet uniformément.
  Concrètement : dans la boucle qui construit le chemin SVG, seuls les sommets d'indice
  pair (`i%2===0`, les pointes) passent par la coupe-de-coin + courbe quadratique déjà
  utilisée ; les sommets d'indice impair (les creux) sont désormais rejoints par une
  simple ligne droite (`L`) directement au sommet, sans coupe ni courbe — produit
  exactement le look "étoile pleine aux pointes rondes mais aux creux nets" demandé
  (proche d'un badge/étoile de récompense classique). Rayon extérieur aussi élargi
  (10.5→11.3 sur 24 unités de viewBox) pour remplir un peu mieux la boîte disponible.
- **Taille calculée dynamiquement pour égaler la hauteur RÉELLEMENT RENDUE du cœur voisin,
  pas une valeur choisie à l'œil** — une étoile, contrairement à un cercle ou un carré, ne
  remplit jamais toute sa boîte carrée (des coins vides entre les pointes) : agrandir sa
  police/sa taille de police d'un simple facteur "×2" (comme la retouche précédente
  l'avait fait) ne suffit pas à l'aligner visuellement sur un glyphe qui, lui, remplit
  différemment sa propre boîte. Mesuré empiriquement (`getBoundingClientRect` sur le
  `<path>` rendu dans un banc d'essai HTML autonome) : le chemin de `STAR_PATH` ne remplit
  que ~73.5% de la hauteur de son `<svg>` conteneur — `STAR_FILL_RATIO = 0.735`, constante
  de module. `StarIcon` prend maintenant une prop `targetHeight` (la hauteur RÉELLE en
  pixels que l'étoile doit occuper à l'écran, mesurée directement sur le cœur voisin à cet
  endroit précis — 35 dans le pied de page, 42 dans la fenêtre `visionPlayerId`, deux
  tailles de cœur différentes selon l'endroit) plutôt qu'une taille de boîte SVG brute
  (`size`) — et calcule elle-même la taille de `<svg>` nécessaire
  (`size = targetHeight / STAR_FILL_RATIO`) pour que l'étoile RENDUE fasse exactement
  `targetHeight` de haut, quel que soit l'endroit où elle est utilisée.
- **Recentrage vertical du chemin lui-même** — une étoile à 5 branches pointe-en-haut n'a
  pas son encre centrée sur le centre géométrique de son propre viewBox par nature (la
  pointe du haut dépasse plus au-dessus du centre que les deux jambes du bas n'en
  dépassent en-dessous) : générée autour de `(12, 12)`, l'étoile apparaissait bien de la
  bonne HAUTEUR une fois `targetHeight` appliqué, mais décalée d'environ 2px vers le HAUT
  par rapport au cœur malgré une hauteur identique. Corrigé en régénérant le chemin autour
  d'un centre `(12, 12.885)` (décalé vers le bas) — affiné par deux itérations de mesure/
  ajustement (`getBoundingClientRect` du cœur vs de l'étoile aux tailles réelles utilisées
  dans l'app, pas seulement sur le banc d'essai isolé) jusqu'à un écart résiduel
  sous-pixel (<0.2px) entre le haut/bas du cœur et le haut/bas de l'étoile, dans le pied
  de page ET la fenêtre `visionPlayerId`. Recentré une fois pour toutes dans la constante
  elle-même — aucun décalage à gérer aux sites d'appel.
- Vérifié en Playwright (mesures DOM précises + captures d'écran) : hauteur de l'étoile
  et hauteur du cœur identiques à ~0.02px près dans les deux endroits ; haut/bas alignés à
  moins de 0.2px d'écart ; chiffre du PA parfaitement lisible par-dessus ; pointes
  nettement arrondies, creux entre les pointes bien nets ; aucune régression sur les
  clics PV/PA/dé/Vision, aucune erreur console.

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

**IMPORTANT — bump obligatoire à chaque déploiement** : incrémenter `APP_VERSION`
dans `src/config.js` ET la valeur `version` dans `version.json` (racine du repo),
ensemble, à chaque commit poussé sur `main` — voir "Vérification de version"
ci-dessous pour pourquoi. Un format simple `AAAA-MM-JJ.N` (N = quantième déploiement
du jour) suffit, aucune signification particulière n'est attendue au-delà de
"différent du précédent".

### Vérification de version (bug corrigé : un onglet resté ouvert tournait une
vieille version du jeu, cassant les parties en ligne)
Gus a signalé un crash grave en ligne (écran noir, room bloquée) accompagné de deux
symptômes très parlants : "si quelqu'un d'autre crée une partie ils ont une vieille
version du jeu, avec plus de 100 cartes maps, pas tous les monstres" (exactement ce
que produisait l'ancien deck placeholder, avant "Pioches dynamiques depuis le
catalogue") et "les cases map de face n'ont plus l'image dans assets" côté les autres
joueurs, jamais côté Gus. Cause quasi certaine : ce projet n'a ni build ni cache-busting
sur ses balises `<script>`/imports ES — un onglet ouvert avant un déploiement continue
de faire tourner indéfiniment le JS chargé à ce moment-là, sans jamais savoir qu'une
version plus récente existe, tant qu'il n'est pas rechargé. Un joueur sur un onglet
ancien qui crée/rejoint une partie pousse alors vers Firebase une forme de données
(deck, `cardCatalog`, structure des joueurs...) incompatible avec ce que les clients à
jour attendent — d'où les images de cases manquantes chez "les autres" uniquement, et
très probablement la cause du crash lui-même (une pile/un joueur dans une forme
inattendue, plus surprenant à mesure que la partie avance, d'où l'impression fausse que
ça arrive "quand une pile arrive à zéro").
- **`VersionBanner`** (`src/components/VersionBanner.js`) : au montage puis toutes les
  5 minutes, va chercher `version.json` avec `cache:'no-store'` + un paramètre `?t=`
  (cette requête précise ignore tout cache, contrairement aux modules JS déjà chargés)
  et compare au `APP_VERSION` importé de `config.js` — celui-ci, lui, fait partie du JS
  potentiellement PÉRIMÉ de cet onglet, donc une différence signifie que CET onglet
  tourne une vieille version. Affiche un simple bandeau bleu fixe en haut de l'écran
  ("Une nouvelle version est disponible" + bouton Recharger) sans jamais recharger
  automatiquement (un reload forcé en pleine partie serait pire qu'un onglet obsolète
  laissé tel quel). Monté en frère de `<App/>` dans `main.js` (pas à l'intérieur), pour
  ne toucher à aucune branche de retour existante d'`App()`.
  **Limite connue** : ne protège qu'à partir de CE déploiement — un onglet déjà ouvert
  AVANT que cette fonctionnalité n'existe ne peut évidemment pas exécuter le code qui la
  détecterait ; un premier rechargement manuel de tout le monde reste nécessaire une
  bonne fois pour que le mécanisme prenne le relais ensuite.
- **`ErrorBoundary`** (`src/components/ErrorBoundary.js`, classe React `Component`
  minimale — `Component` ajouté aux exports de `react.js`) : enveloppe `<App/>` dans
  `main.js`, capture n'importe quel crash de rendu en dessous et affiche un écran de
  récupération ("Un problème est survenu" + bouton Recharger) au lieu d'un écran noir
  irrécupérable — répond directement à "ça crash vraiment, c'est écran noir et on peut
  plus revenir dans la room". Recharger suffit à s'en sortir même dans ce cas précis :
  ni `page` ni `onlineRoom` (App.js) ne survivent à un rechargement, donc on retombe
  toujours sur l'accueil plutôt que de retenter automatiquement de rejoindre la MÊME
  room cassée en boucle.
- **`Array.isArray` au lieu de `|| []` sur les données reçues d'une room Firebase**
  (`subscribeToRoom`, dans `PlateauPage.js`) : un `|| []` protège contre `undefined`/
  `null` mais pas contre une clé qui serait un objet au lieu d'un tableau (une vieille
  version pourrait théoriquement écrire une forme différente) — `Array.isArray(x) ? x
  : []` protège aussi contre ce cas, pour `players`/`piles`/`discardCards`/
  `placedTiles`/`boardItems`/`monsters`/`markers`.
- Vérifié en Playwright : bandeau absent quand la version locale correspond à
  `version.json`, présent quand on les désaccorde volontairement ; `ErrorBoundary`
  affiche bien l'écran de récupération face à un composant qui lève une exception
  volontairement, sans laisser fuiter d'erreur non interceptée au niveau de la page.
- **Hypothèse "onglet resté ouvert sur une vieille version" INVALIDÉE par Gus, cause
  réelle trouvée ailleurs** : Gus a signalé ensuite que les deux problèmes persistaient
  malgré `VersionBanner`/`ErrorBoundary`, avec un détail qui écarte directement
  l'hypothèse ci-dessus — "il avait jamais chargé une version du jeu ancienne donc c'est
  pas ça" (l'ami en question testait sur un appareil neuf, jamais ouvert avant ce
  déploiement) — et un second détail clé : "le message d'erreur en cas de crash à
  fonctionné sur le téléphone d'un ami... mais pas sur le mien", suggérant que le crash
  de Gus lui-même ne passe pas par une exception de rendu React (seule chose
  qu'`ErrorBoundary` peut attraper). Deux causes réelles distinctes trouvées :
  - **"Version incomplète" = `INIT` (`src/data/initialData.js`), pas un cache
    navigateur.** Ce fichier est un instantané figé de `data.json` créé tôt dans le
    projet et jamais remis à jour depuis (vérifié : 39 sorts, ~25 énergies, 11 monstres
    contre 28 aujourd'hui, et surtout ses 9 entrées `cases` n'ont AUCUNE ligne
    `details`/`fichier` — `buildCaseCards` retombe alors sur son repli "aucun détail
    renseigné" pour chacune, generant des cartes génériques sans image de face ; le
    total de leurs `quantite` fait 108, quasi pile "plus de 100 cartes maps" signalé).
    Seul point d'usage : le bouton "Continuer sans token (mode local)" (`App.js`) —
    n'importe quel ami SANS token GitHub personnel qui crée/rejoint une partie en ligne
    construit donc son deck depuis ce catalogue périmé, complètement différent de celui
    des joueurs qui ONT un token (qui lisent le vrai `data.json` via `ghGet`). Rien à
    voir avec un onglet resté ouvert : un appareil flambant neuf tombe pile dans ce cas
    dès son tout premier chargement. Fix : `fetchPublicData()` (nouvelle fonction dans
    `src/github.js`) va chercher `data.json` en direct par un simple `fetch('data.json',
    {cache:'no-store'})` — même origine, aucune authentification nécessaire pour lire un
    fichier d'un dépôt public (contrairement à l'API GitHub contents/ qu'utilise `ghGet`,
    qui elle exige un token) ; `data.json` est de toute façon déjà servi tel quel à côté
    d'`index.html` sur GitHub Pages. Le bouton "Continuer sans token" l'appelle
    maintenant en premier, ne retombant sur `INIT` qu'en tout dernier recours (réseau
    vraiment indisponible) — même message d'erreur "Mode local — GitHub non disponible"
    déjà utilisé pour ce cas de repli ailleurs. Vérifié en Playwright (serveur de test
    local servant le vrai `data.json`) : le deck construit par ce bouton contient bien
    100 cartes cases et 28 cartes monstres (au lieu des ~108/11 de l'ancien `INIT`).
  - **Le "crash à la dernière carte", et pourquoi `ErrorBoundary` ne l'attrapait pas
    chez Gus** : voir "Bug corrigé (gros crash... boucle d'écho locale infinie...)" dans
    "Version en ligne entre amis" plus bas pour la cause réelle (rien à voir avec un
    index négatif sur la dernière carte, malgré l'hypothèse de l'ami de Gus) — une
    boucle de re-renders/écritures Firebase qui s'auto-entretient sans jamais lever
    d'exception JS, ce qui explique précisément pourquoi `ErrorBoundary` (qui n'attrape
    QUE les erreurs de rendu React) ne réagissait pas de façon cohérente d'un appareil à
    l'autre — un crash sans "throw" n'a simplement rien à attraper.
- **Rooms Firebase de test déjà créées, pas supprimées** (Gus : "on a testé en créant
  plusieurs room donc tu peux supprimer les rooms existante ?") — impossible depuis cet
  environnement (aucun accès à la console Firebase de Gus, voir plus haut). Pas
  bloquant : une room orpheline ne coûte rien et n'interfère avec aucune autre (chaque
  code de partie est un chemin Firebase indépendant, voir "Plusieurs parties en ligne en
  même temps possible") — le plus simple est de choisir un NOUVEAU code à chaque partie
  de test plutôt que de chercher à nettoyer les anciennes. Si Gus veut quand même les
  supprimer, ça se fait à la main dans Firebase Console → Realtime Database → clic droit
  sur le noeud `rooms/<code>` → Supprimer.

## Comment travailler avec Gus
- Communique de façon directe et itérative, apprécie les avis honnnêtes sur les
  choix de design.
- A de bonnes intuitions de design — ne pas pousser des simplifications ou
  changements de nom sans raison solide.
- Préfère un rythme de jeu fluide (ex: a rejeté plusieurs cases neutres au profit
  d'une seule, pour garder le tempo).
