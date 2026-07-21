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
- `src/utils.js` — helpers (`uid`, `renderText`)
- `src/data/initialData.js` — jeu de données de secours (mode local sans token)
- `src/components/` — briques UI génériques réutilisées partout (Card, Section,
  EditText, ElemGroup, LvlGroup...)
- `src/pages/` — écrans assemblés à partir des composants (HomePage,
  SoireePage, IdeeVracPage)
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
- `visuels` — références visuelles par catégorie

Chaque item a généralement un champ `statut` : Validé / Test 1 / Test 2 / Test 3 / Archivé,
avec un système de pastilles colorées dans l'UI.

## Conventions de travail — À RESPECTER
- **Ne jamais modifier un bloc de code déjà validé/confirmé.** Ajouter les nouvelles
  fonctionnalités comme des blocs séparés (nouveau composant, nouvelle fonction),
  plutôt que de retoucher ce qui marche déjà.
- Double saut de ligne dans un texte = doit créer une séparation visuelle (ligne hr) dans l'UI.
- Dans Idées en vrac, appuyer sur Entrée deux fois de suite insère directement une ligne
  séparatrice visible (── répété) au lieu d'une ligne vide invisible — plus facile à repérer
  en scannant le texte brut.
- Le mode édition permet la modification de tout texte par double-tap.
- Activer le mode édition déclenche un flash d'1s sur toute la page : la grille de fond
  (déjà visible en continu en mode édition) reçoit un glow bleu qui monte en 0.5s puis
  clignote (glitch) sur la 2ème demi-seconde, avant de disparaître. Composant partagé :
  `src/components/EditGridFlash.js` + classe CSS `.edit-grid-flash` dans `index.html`.
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

## Roadmap version jouable (multi-étapes)
1. **Version hotseat locale** — un seul écran, les joueurs passent le tour à
   tour de rôle. Objectif : valider que les mécaniques digitalisées marchent
   avant d'ajouter la couche réseau.
2. **Version en ligne entre amis (pas un vrai serveur public type .io hébergé)** —
   - Le serveur (petit backend Node.js, type Colyseus pour la gestion de salles
     de jeu multijoueur) tourne sur le PC de Gus, lancé seulement pendant les
     sessions de jeu, pas en permanence.
   - Cas simple : tous sur le même WiFi → connexion directe via IP locale.
   - Cas à distance : Gus lance un tunnel temporaire (type Cloudflare Tunnel)
     qui génère un lien public éphémère à partager. Les amis n'ont rien à
     installer, juste cliquer le lien et jouer depuis leur navigateur (mobile
     ou PC).
   - Le serveur reste sur PC en priorité (pas sur téléphone) — iOS ne permet
     pas de faire tourner un serveur en arrière-plan. En solution de secours
     quand seul le téléphone est dispo (Android uniquement) : faire tourner le
     serveur via Termux. Nécessite de désactiver l'optimisation de batterie
     pour Termux et de garder un wake lock actif, sinon Android tue le
     processus en arrière-plan. Consommation batterie/chaleur accrue si le
     même téléphone sert aussi de client de jeu en même temps.

## Fonctionnalités en attente / roadmap
- Barre de filtre rapide par statut (pastilles colorées, filtre toutes les sections en même temps)
- Déplacer le bouton Déconnexion en bas de page, après les boutons d'action principaux
- Corriger l'affichage de l'icône power sur mobile
- Rendre le bouton "Jouer WIP" plus visible
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
