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
  reste inchangé, aucune preuve qu'il soit revenu). Hypothèse retenue : le pincement est
  géré entièrement en JS (Pointer Events, voir "Pan et zoom"), et `touchAction:'pan-x
  pan-y'` sur le viewport de la grille est censé empêcher le navigateur de zoomer
  nativement par-dessus — mais Safari iOS est connu pour laisser son propre geste de zoom
  natif s'activer quand même tant que `user-scalable=no` n'est pas aussi posé sur la
  meta viewport, les deux zooms (natif + JS) se battant alors pour la même valeur, ce qui
  donnerait exactement ce genre de mouvement saccadé. Fix : `user-scalable=no` ajouté à
  la meta viewport (`index.html`).
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
