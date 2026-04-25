import { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
// GITHUB CONFIG
// ============================================================
const GITHUB_USER = "GusBZH";
const GITHUB_REPO = "labyrinthe-organic";
const GITHUB_FILE = "data.json";

// ============================================================
// INITIAL DATA
// ============================================================
const INITIAL_DATA = {
  gameName: "Labyrinthe Organic",
  sorts: [
    { id: "s1", nom: "Grenade", element: "Feu", statut: "Validé", cout: "1 PA", limite: "1x tour", effet: "Attaque en sélectionnant une case en ligne de vue. L'attaque touche la case sélectionnée et toutes les cases à 1 de distance en ligne de vue.", quantite: 1, notes: "" },
    { id: "s2", nom: "Lance Flamme", element: "Feu", statut: "Validé", cout: "1 PA", limite: "1x tour", effet: "Attaque tous les joueurs possibles sur une ligne droite en ligne de vue.", quantite: 1, notes: "" },
    { id: "s3", nom: "Pistolet", element: "Feu", statut: "Validé", cout: "1 PA", limite: "1x tour", effet: "Attaque un joueur en ligne de vue.", quantite: 1, notes: "" },
    { id: "s4", nom: "Furie", element: "Feu", statut: "Validé", cout: "0 PA", limite: "1x tour", effet: "Après avoir gagné un combat, rejouez immédiatement un tour entier.", quantite: 1, notes: "" },
    { id: "s5", nom: "Chacal", element: "Feu", statut: "Validé", cout: "1 PA", limite: "1x tour", effet: "Posez un jeton face cachée sur une case vide. Quand un joueur arrive dessus il meurt si c'est le jeton mort. Les cases avec un jeton deviennent indestructibles.", quantite: 1, notes: "" },
    { id: "s6", nom: "Non", element: "Terre", statut: "Validé", cout: "0 PA", limite: "", effet: "Quand un joueur vous attaque, lancez un d6 : sur 4+ le combat est annulé.", quantite: 1, notes: "" },
    { id: "s7", nom: "Mercy", element: "Terre", statut: "Validé", cout: "0 PA", limite: "3x partie", effet: "Vous avez 3 compteurs. Si un autre joueur perd un combat en ligne de vue, utilisez un compteur pour annuler ce combat.", quantite: 1, notes: "" },
    { id: "s8", nom: "Pas Fantôme", element: "Air", statut: "Validé", cout: "1 PA", limite: "1x tour", effet: "Déplacez-vous d'une case en ignorant les murs.", quantite: 1, notes: "" },
    { id: "s9", nom: "Portail de Poche", element: "Air", statut: "Validé", cout: "1 PA", limite: "1x tour", effet: "Téléportez-vous instantanément sur n'importe quel portail révélé.", quantite: 1, notes: "" },
    { id: "s10", nom: "Éliotrope", element: "Eau", statut: "Validé", cout: "1 PA", limite: "4x tour", effet: "Déplacez une case Portail sur un emplacement vide.", quantite: 1, notes: "" },
    { id: "s11", nom: "Xelor", element: "Eau", statut: "Validé", cout: "0 PA", limite: "1x tour", effet: "Volez 1 PA à un joueur.", quantite: 1, notes: "" },
    { id: "s12", nom: "Lanterne des Damnés", element: "Ombre", statut: "Validé", cout: "", limite: "", effet: "Passif — Tant que vous la tenez tous les monstres lancent 2 dés.", quantite: 1, notes: "" },
    { id: "s13", nom: "Edge", element: "Ombre", statut: "Validé", cout: "", limite: "", effet: "Passif — Tous les portails sont inactifs.", quantite: 1, notes: "" },
    { id: "s14", nom: "Flux Négatif", element: "Eau", statut: "Test 1", cout: "1 PA", limite: "1x tour", effet: "Placez un compteur. À tout moment dépensez un compteur pour réduire de 1 le résultat d'un dé.", quantite: 1, notes: "" },
    { id: "s15", nom: "Cape d'Invisibilité", element: "Air", statut: "Test 1", cout: "0 PA", limite: "1x tour", effet: "Posez 3 jetons dans un carré de 2 cases autour de vous. Un jeton = vraie position, les deux autres = leurres.", quantite: 1, notes: "" },
  ],
  energies: [
    { id: "e1", nom: "Énergie Feu 1", element: "Feu", statut: "Validé", cout: "", limite: "", effet: "Pour chaque sort Feu, posez 1 marqueur +1 sur un item Feu pendant 1 tour global.", quantite: 5, notes: "" },
    { id: "e2", nom: "Énergie Feu 2", element: "Feu", statut: "Validé", cout: "", limite: "", effet: "+1 PA pour chaque sort Feu.", quantite: 1, notes: "" },
    { id: "e3", nom: "Éphémère Feu 1", element: "Feu", statut: "Validé", cout: "", limite: "", effet: "Défaussez cette énergie : jusqu'à la fin de votre tour +3 à tous vos jets de dés.", quantite: 1, notes: "" },
    { id: "e4", nom: "Énergie Eau 1", element: "Eau", statut: "Validé", cout: "", limite: "", effet: "Pour chaque sort Eau, posez 1 marqueur +1 sur un item Eau pendant 1 tour global.", quantite: 5, notes: "" },
    { id: "e5", nom: "Énergie Eau 2", element: "Eau", statut: "Validé", cout: "", limite: "", effet: "+1 PA pour chaque sort Eau.", quantite: 1, notes: "" },
    { id: "e6", nom: "Énergie Terre 1", element: "Terre", statut: "Validé", cout: "", limite: "", effet: "Pour chaque sort Terre, posez 1 marqueur +1 sur un item Terre pendant 1 tour global.", quantite: 5, notes: "" },
    { id: "e7", nom: "Énergie Air 1", element: "Air", statut: "Validé", cout: "", limite: "", effet: "Pour chaque sort Air, posez 1 marqueur +1 sur un item Air pendant 1 tour global.", quantite: 5, notes: "" },
    { id: "e8", nom: "Énergie Ombre 1", element: "Ombre", statut: "Validé", cout: "", limite: "", effet: "+1 au résultat de tous vos jets de dé pour chaque sort Ombre possédé.", quantite: 1, notes: "" },
    { id: "e9", nom: "Énergie Multi 1", element: "Multi", statut: "Validé", cout: "", limite: "", effet: "+1 PA pour chaque sort d'élément différent possédé.", quantite: 1, notes: "" },
  ],
  monstres: [
    { id: "m1", nom: "Monstre 1", lvl: "Lvl 1", statut: "Validé", effet: "En cas de victoire : posez 3 cases Map n'importe où. Un joueur choisit l'orientation.", quantite: 1, notes: "" },
    { id: "m2", nom: "Monstre 2", lvl: "Lvl 2", statut: "Validé", effet: "En cas de victoire : choisissez un joueur. Pendant tout son prochain tour, vous choisissez l'orientation des cases qu'il révèle.", quantite: 1, notes: "" },
    { id: "m3", nom: "Monstre 3", lvl: "Lvl 3", statut: "Validé", effet: "En cas de victoire : chaque joueur pioche une énergie.", quantite: 1, notes: "" },
    { id: "m4", nom: "Monstre 4", lvl: "Lvl 4", statut: "Validé", effet: "En cas de victoire : volez un sort à un joueur de votre choix.", quantite: 1, notes: "" },
    { id: "m5", nom: "Monstre 5", lvl: "Lvl 2", statut: "Test 1", effet: "En cas de victoire : retirez la case d'un ou plusieurs joueurs. Ils subissent la pénalité de mort.", quantite: 1, notes: "" },
  ],
  cases: [
    { id: "c1", nom: "Case de Départ", statut: "Validé", effet: "Là où les joueurs commencent et réapparaissent après une mort. Indestructible. Toujours un cul-de-sac (1 porte).", quantite: 10, notes: "" },
    { id: "c2", nom: "Case Instable", statut: "Validé", effet: "Se défausse dès qu'un joueur en sort. Les joueurs restants meurent.", quantite: 25, notes: "" },
    { id: "c3", nom: "Case Portail", statut: "Validé", effet: "Permet de se téléporter à n'importe quel autre portail révélé.", quantite: 20, notes: "" },
    { id: "c4", nom: "Case Énergie", statut: "Validé", effet: "La première fois par tour qu'on y entre, piocher une énergie dans la pile de son choix.", quantite: 10, notes: "" },
    { id: "c5", nom: "Case Fontaine", statut: "Validé", effet: "Restaure tous les PV quand on finit son tour dessus.", quantite: 15, notes: "" },
    { id: "c6", nom: "Case Œil", statut: "Validé", effet: "En finissant son tour dessus, peut défausser un de ses items pour défausser un item équivalent d'un autre joueur. Toujours 4 portes.", quantite: 7, notes: "" },
    { id: "c7", nom: "Case Monstre", statut: "Validé", effet: "En arrivant dessus, piocher une carte Monstre. Combat optionnel sauf dans certains modes. Toujours un cul-de-sac.", quantite: 10, notes: "" },
    { id: "c8", nom: "Case Bonus PA", statut: "Validé", effet: "La première fois par tour qu'un joueur entre sur cette case, il gagne +1 PA pour ce tour. Toujours tout droit.", quantite: 10, notes: "" },
    { id: "c9", nom: "Case Levier", statut: "Test 3", effet: "Détruit toutes les cases Instables du plateau. Les joueurs dessus meurent.", quantite: 1, notes: "" },
  ],
  regles: [
    { id: "r1", nom: "Mise en place", statut: "Validé", effet: "Chaque joueur pioche 3 sorts, en choisit 1 comme Sort de Nature et place les 2 autres en bas de la pioche. Les pioches de sorts et d'énergies sont chacune coupées en deux.", notes: "" },
    { id: "r2", nom: "Points d'Action", statut: "Validé", effet: "Chaque joueur dispose de 3 PA par tour, utilisables dans n'importe quel ordre.", notes: "" },
    { id: "r3", nom: "Explorer", statut: "Validé", effet: "1 PA — Annoncez la direction, piochez une carte Map, reliez-la et déplacez-vous dessus.", notes: "" },
    { id: "r4", nom: "Sprinter", statut: "Validé", effet: "1 PA, 1x tour — Lancez un dé et déplacez-vous jusqu'à ce nombre de cases révélées.", notes: "" },
    { id: "r5", nom: "Contrôle du labyrinthe", statut: "Validé", effet: "1x par tour, à n'importe quel moment — Retirer, tourner ou déplacer d'une case une case sans joueur dessus.", notes: "" },
    { id: "r6", nom: "Combat", statut: "Validé", effet: "Chacun lance un dé. Le plus haut résultat gagne. Le perdant perd 1 PV. On relance jusqu'à 0 PV. En cas d'égalité contre un monstre, le joueur gagne.", notes: "" },
    { id: "r7", nom: "PV — 1 ou 2 ?", statut: "Test 1", effet: "À tester : 2 PV par joueur et monstre vs one shot (1 PV). Comparer rythme et durée des combats.", notes: "" },
    { id: "r8", nom: "Mort", statut: "Validé", effet: "Lâchez un item au choix sur votre case et réapparaissez sur votre case de départ. Vous pouvez quand même effectuer votre contrôle du labyrinthe.", notes: "" },
  ],
  lexique: [
    { id: "l1", terme: "Case", definition: "Tuile physique du plateau. Peut être révélée ou non." },
    { id: "l2", terme: "Révélée", definition: "Case déjà présente et visible sur le plateau." },
    { id: "l3", terme: "Explorer", definition: "Action coûtant 1 PA : annoncer une direction, piocher une case et la poser connectée au plateau." },
    { id: "l4", terme: "Sprint", definition: "Action coûtant 1 PA (1x par tour) : lancer un dé et se déplacer de ce nombre sur des cases révélées uniquement." },
    { id: "l5", terme: "PA", definition: "Point d'Action. Ressource de base par tour. Chaque joueur en a 3 par défaut." },
    { id: "l6", terme: "PV", definition: "Point de Vie. À tester : 2 PV vs 1 PV (one shot)." },
    { id: "l7", terme: "Porté", definition: "Distance d'attaque. Permet d'attaquer un joueur sans partager sa case." },
    { id: "l8", terme: "Ligne de vue", definition: "Chemin sans mur entre deux positions. L'effet d'un vide entre deux positions est encore à définir." },
    { id: "l9", terme: "Adjacent", definition: "Case directement connectée à la vôtre par un passage ouvert." },
    { id: "l10", terme: "Lâcher", definition: "Laisser un item sur sa case actuelle. Reste sur le plateau, récupérable par d'autres." },
    { id: "l11", terme: "Défausser", definition: "Retirer définitivement un item du jeu. Il va dans la défausse de sa pioche." },
    { id: "l12", terme: "Sort", definition: "Item obtenu en battant un monstre. Effet actif. Limite : 3 sorts." },
    { id: "l13", terme: "Énergie", definition: "Item obtenu sur une case Énergie. Effet passif + effet actif déclenché par un sort du même élément. Limite : 3." },
    { id: "l14", terme: "Sort de Nature", definition: "Sort pioché en début de partie parmi 3 au choix. Indestructible et involable. Ne compte pas dans la limite." },
    { id: "l15", terme: "Ombre", definition: "Catégorie spéciale d'item. Ne compte pas dans la limite. Se lâche uniquement à la mort." },
    { id: "l16", terme: "Multi", definition: "Élément spécial qui ne compte comme aucun élément spécifique." },
    { id: "l17", terme: "Tour global", definition: "Cycle de jeu jusqu'au début de votre prochain tour." },
    { id: "l18", terme: "Item équivalent", definition: "Sort contre sort, énergie contre énergie. Pour les échanges." },
    { id: "l19", terme: "1x tour", definition: "Un sort avec cette mention ne peut être utilisé qu'une fois pendant votre tour." },
    { id: "l20", terme: "Indestructible", definition: "Ne peut pas être retirée, tournée ni déplacée." },
  ],
  modes: [
    {
      id: "mode1", nom: "Capture de Drapeau", emoji: "🚩", statut: "Validé",
      difficulte: "⭐⭐", style: "🧠 Stratégie ⚔️ Combat", joueurs: "2-10",
      contenu: `**Objectif**\nVoler le drapeau adverse et le ramener sur votre base.\n\n**Mise en place**\nDeux équipes : Rouge et Bleu. Chacune a une base indestructible avec son drapeau. Les deux bases sont placées à 7 cases de distance.\n\n**Portails d'équipe**\nQuand un joueur révèle un portail il pose un jeton de sa couleur. Un joueur bleu peut emprunter un portail rouge.\n\n**Règles**\nRamasser le drapeau coûte 0 PA. Le porteur ne peut pas sprinter. Il faut finir son tour sur sa base avec le drapeau adverse pour gagner. Si le porteur perd un combat il lâche le drapeau.\n\n**Victoire**\nRamener le drapeau ennemi sur sa propre base et y finir son tour.`,
      notes: "Tests : portails par couleur ✅\nÀ tester : distance calculée avec la boîte de jeu\nProblème : nombre impair de joueurs — idée d'un 3ème camp"
    },
    {
      id: "mode2", nom: "Keeyp", emoji: "🗝️", statut: "Validé",
      difficulte: "⭐⭐", style: "🚪 Escape", joueurs: "1-10",
      contenu: `**Objectif**\nTrouver la Clé, trouver la Porte, s'échapper du Labyrinthe.\n\n**Règles**\nRamasser la Clé coûte 0 PA. Le porteur ne peut pas sprinter. Si le porteur perd un combat la Clé retourne à son origine. Tout combat contre un monstre se déclenche automatiquement.\n\n**Victoire**\nAtteindre la Porte en portant la Clé et y finir son tour.`,
      notes: "À tester : ajouter un double monstre à battre pour finir"
    },
    {
      id: "mode3", nom: "Laboratoire", emoji: "🧪", statut: "Validé",
      difficulte: "⭐⭐⭐", style: "🚪 Escape ⚔️ Combat", joueurs: "2-10",
      contenu: `**Rôles**\nDocteur Fou — contrôle lab partout, pas sprint, pas clé, 1 sort + 1 énergie, tp fontaine 3 PA. S'il bat un Héros ce Héros devient Zombie.\nZombies — contrôle lab adjacent, pas sprint, pas clé, 1 sort + 1 énergie.\nHéros — contrôle lab adjacent, sprint, clé, 3 sorts + 3 énergies, 2 dés contre méchant.\n\n**Mise en place**\nCarré 5x5 révélé. Docteur place sa case d'abord puis Héros en sens horaire. Retirer le carré. Docteur joue en premier.\n\n**Victoire Héros**\nS'échapper par la Porte avec la Clé.\n\n**Victoire Docteur**\nTous les Héros deviennent Zombies.`,
      notes: "Priorité : mode à modifier\nÀ tester : 7x7, tp fontaine 1 PA, -1 au dé méchants\nProblème : snowball, difficile de changer de cible pour le docteur"
    },
    {
      id: "mode4", nom: "Indiana Jones", emoji: "🪨", statut: "Validé",
      difficulte: "⭐⭐⭐⭐", style: "🚪 Escape 🧠 Stratégie", joueurs: "4-8",
      contenu: `**Objectifs**\nHéros : ramasser l'artefact et atteindre la Porte.\nMéchant : écraser chaque Héros une fois avec la Boule Géante.\n\n**La Boule Géante**\nAvance en ligne droite jusqu'à un mur. Tue tout joueur traversé. Bloque passages et portails. Disparaît sur une case de départ.\n\n**Contrôle**\nMéchant : déplacer dans une direction OU faire apparaître sur une Fontaine.\nHéros : si fin de tour sur une Fontaine, contrôler la Boule à la place du Méchant.`,
      notes: "Priorité : mode à modifier\nÀ tester : case boule déplaçable, tremblement disparaît avec boule\nProblème : trop de recherche d'anti jeu"
    },
    {
      id: "mode5", nom: "Traque", emoji: "🪓", statut: "Validé",
      difficulte: "⭐⭐", style: "⚔️ Combat", joueurs: "3-5",
      contenu: `**Objectif**\nTraquer et éliminer ta cible secrète.\n\n**Mise en place**\nChaque joueur contrôle 2 personnages. Carré 7x7. Les PA sont partagés entre les 2 personnages.\n\n**Règles**\nÉliminer ta cible = 1 marque + nouvelle carte Cible.\n\n**Victoire**\nPremier à 3 marques.`,
      notes: "À tester : version rapide 1 personnage chacun"
    },
    {
      id: "mode6", nom: "Survie", emoji: "🔥", statut: "Validé",
      difficulte: "⭐", style: "⚔️ Combat", joueurs: "2-10",
      contenu: `**Objectif**\nÊtre le dernier joueur en vie.\n\n**Règles**\nChaque joueur commence avec 1 Vie. Perdre un combat = pénalité classique + perdre une vie. Activer une case Révélation = regagner sa Vie. Mourir à 0 Vie = éliminé.\n\n**Victoire**\nLe dernier joueur encore en jeu.`,
      notes: "Mode d'introduction recommandé — règles les plus simples"
    },
    {
      id: "mode7", nom: "3 Monstres", emoji: "👹", statut: "Validé",
      difficulte: "⭐", style: "⚔️ Combat", joueurs: "2-10",
      contenu: `**Objectif**\nPremier à éliminer 3 monstres.\n\n**Règles**\nBattre un monstre = 1 jeton. Cases Monstre indestructibles. Double Monstre = 2 jetons.\n\n**Victoire**\n3 jetons.`,
      notes: "À tester : fusionner avec 4 Items en un mode rush"
    },
    {
      id: "mode8", nom: "4 Items", emoji: "💎", statut: "Validé",
      difficulte: "⭐", style: "⚔️ Combat", joueurs: "2-10",
      contenu: `**Objectif**\nPremier à obtenir un 4ème item.\n\n**Règles**\nMonstres attaquent automatiquement.\n\n**Victoire**\n4 items en main = victoire instantanée.`,
      notes: "À tester : fusionner avec 3 Monstres"
    },
    {
      id: "mode9", nom: "Infection", emoji: "🦠", statut: "Validé",
      difficulte: "⭐⭐⭐", style: "🎭 Rôle Caché", joueurs: "4-8",
      contenu: `**Objectif**\nGentils : purifier tout le monde. Méchants : infecter chaque âme.\n\n**Setup**\nCartes Alignement + Cartes Infection distribuées secrètement.\n\n**Fontaines**\nEn activant, orienter secrètement une carte Infection vers Sain ou Infecté.\n\n**Compte à rebours**\nDéclencher sur une Révélation si tous ont activé au moins une Révélation. 3 tours puis révélation. Majorité gagne.`,
      notes: "À tester : nerf révélation dans ce mode"
    },
    {
      id: "mode10", nom: "Rumble in the House", emoji: "🎭", statut: "Validé",
      difficulte: "⭐", style: "🎭 Rôle Caché", joueurs: "3-10",
      contenu: `**Objectif**\nÊtre le dernier survivant.\n\n**3-5 joueurs**\nDouble de personnages, 2 jetons secrets chacun.\n\n**6-10 joueurs**\n1 personnage par joueur, 1 jeton secret chacun.\n\n**Règles**\nAu début de son tour choisir n'importe quel personnage vivant. Mort permanente. 1 item par personnage.`,
      notes: "À tester : version sorts en commun pour ce mode"
    },
    {
      id: "mode11", nom: "Sabotage", emoji: "🧩", statut: "Validé",
      difficulte: "⭐⭐", style: "🧠 Stratégie", joueurs: "4-10",
      contenu: `**Objectif**\nRestaurateurs vs Saboteurs — réparer ou saboter les Fontaines.\n\n**Règles**\nFinir son tour sur une Fontaine = choisir Réparer ou Saboter. L'action prend tout le tour suivant.\n\n**Victoire**\nAutant de Fontaines réparées/sabotées que le nombre de joueurs.`,
      notes: "À tester : variante rôles secrets"
    },
    {
      id: "mode12", nom: "Amon Gus", emoji: "👨‍🚀", statut: "Validé",
      difficulte: "⭐⭐⭐⭐", style: "🎭 Rôle Caché 🧠 Stratégie", joueurs: "4-10",
      contenu: `**Rôles**\nGentils : réparer les Fontaines et éliminer les Imposteurs.\nImposteurs : saboter en secret.\n\n**Emergency Meeting**\nDéclenchée tous les X jetons posés ou sur une Révélation. Révèle les jetons. Si majorité sabotés = victoire Imposteurs. Vote : chaque vote = -1 au dé du joueur visé.\n\n**Pouvoir Imposteur**\nUne fois : révéler son rôle pour +2 au combat jusqu'à la mort.`,
      notes: ""
    },
    {
      id: "mode13", nom: "Relique Maudite", emoji: "🪬", statut: "Validé",
      difficulte: "⭐⭐", style: "⚔️ Combat", joueurs: "3-6",
      contenu: `**Objectif**\nDécouvrir la Relique et survivre avec elle pendant 3 tours complets.\n\n**Effets**\n+2 au combat. Ne peut plus utiliser les Portails.\n\n**Victoire**\nSurvivre 3 tours complets avec la Relique.`,
      notes: ""
    },
  ],
  ideesModes: [
    { id: "im1", nom: "Mode Intro / Survie simple", pitch: "Quand tu meurs par un joueur tu reçois un jeton mort. Le dernier sans jeton gagne. Point d'entrée avant tous les autres modes." },
    { id: "im2", nom: "Mode Hunger Games / Fantômes", pitch: "Vie illimitée contre les monstres. Mort par joueur = fantôme : défausse sorts, 1 PA, passe à travers les murs." },
    { id: "im3", nom: "Mode Zombie Survie", pitch: "Zombies qui spawnent, impossible de supprimer des cases. Trouver clé et porte ou tenir un max de tours." },
    { id: "im4", nom: "Mode Backrooms", pitch: "Gouttes de survie au lieu de fontaines. Monstres autonomes qui se rapprochent. Sprint coûte une goutte." },
    { id: "im5", nom: "Mode Dofus", pitch: "Choisir un personnage avec sorts prédéfinis selon sa classe." },
    { id: "im6", nom: "Mode MOBA", pitch: "Capture de Drapeau avec lanes et objectifs secondaires." },
    { id: "im7", nom: "Mode Open World", pitch: "Verso des cartes = extérieur. Biomes, donjons, marchands. Extension séparée." },
    { id: "im8", nom: "Mode Guerre de territoire", pitch: "Avoir la plus grande zone connectée. Retirer la seule case reliant deux zones = la deuxième devient neutre." },
    { id: "im9", nom: "Mode Chasseur", pitch: "À définir." },
    { id: "im10", nom: "Mode Maze vs Players", pitch: "À définir." },
  ],
  soireesProto: [],
  ideeEnVrac: "",
  materiel: `10 personnages en carton sur bloc plastique vertical\n2 dés\n1 case Boule Géante\n2 drapeaux bleus + 2 drapeaux rouges\n1 jeton Artefact (sert aussi pour Clé et Relique)\n3 jetons Chacal / Cape d'invisibilité\n10 jetons personnages (dos : logo mort)\n20 petites pierres bleues + 20 petites pierres rouges\n\n---\n\nRecherches prix proto :\nV1 tile 2mm 51x51 et 32x32 : ~53$\nV2 tile 2mm 32x32 et 19x19 : ~32$\nDé : ~6$ pièce\nPersonnages acrylique : ~13.5$\n\nTaille cartes items : 3x3cm (très petit, à tester en impression)\nTaille cases labyrinthe : 5x5cm`,
  lexiqueNotes: "",
  materielNotes: "",
  visuels: {
    general: "Inspiration Squid Game / Liminal space coréen\nAmbiance kintsugi bioluminescent bleu\nFog volumétrique + sources de lumière kintsugi\nMurs en noir, sol en blanc pour visibilité\nTester perspective isométrique ou non\n\n---\n\nLIVRET DE RÈGLES :\nStyle journal comme dans Harry Potter\n3 échelles de typo : ultra grosse (idée), moyenne (règle précise), petite opacité diminuée (détails + exemples)\nVidéo explicative 3D inspirée Avatar: The Last Airbender – Aang's Destiny",
    boite: "Inspiration boîtes Iello — fond blanc avec beaucoup de blanc\nKintsugi bleu qui s'étend sur toute la boîte avec continuation (envers aussi)\nLe kintsugi doit être programmé pour finir au bon endroit\nPlusieurs zones avec couleur dominante par élément\nGarder 60% des zones blanches\nEffet peinture/particules magique qui sort d'un truc",
    personnages: "Acrylique transparent autour comme Rumble in the House\nCouleur distincte par joueur\nPas obligé que les magiciens soient humains — changer couleur de peau comme Hytale ou Avatar\nIdée : perso avec tissu sur les yeux (référence statue de la Justice)\nPerso référence créatures Outer Wilds Echo of the Eye (cerf cassé)\nAttention aux ambiances lumineuses du labyrinthe",
    cases: "Kintsugi par type de case :\n✅ Portail : sim 3D inspiration Dofus (kintsugi plus lumineux)\n✅ Œil : marque au sol violette très visible (kintsugi dégradé violet)\n✅ Coffre/Énergie : feu de camp (ref Outer Wilds + chamallows)\n✅ Tremblement/Instable : voronoi (kintsugi classique)\n✅ Case de départ : noir et or avec symbole géométrique\nMonstres : dégradé sombre (kintsugi dégradé noir)\nFontaine : kintsugi classique\nClé : kintsugi dégradé or très lumineux\nPorte : kintsugi dégradé or très lumineux\nEnvers des cartes : kintsugi noir et or avec léger dégradé bleu",
    items: "Illustration par élément sur le dos de la carte\nRune lumineuse dont la couleur révèle l'élément\nPierre noire avec rune or pour Multi, rune violette pour Ombre\nTexte sur la face, illustration en fond\nMarqueurs +1/-1 en cercle noir",
    monstres: "Dégradé sombre\nBoule Indiana Jones : oeil géant comme Léviathan alt236 ou Beholder DnD\nSim de roche Houdini sur un œil",
    accessoires: "Pierres de combo : rune lumineuse dont la couleur révèle l'élément\nJetons personnages avec logo mort au dos\nDrapeaux bleu et rouge pour Capture de Drapeau",
    references: "Outer Wilds — symbole infini Nomai, feu de camp\nDofus Émeraude\nAvatar Airbender\nSquid Game / Liminal space coréen\nHytale (personnages)\nIello (boîtes)\nPlayingcards.io (jeu en ligne)"
  }
};

// ============================================================
// GITHUB API
// ============================================================
async function githubGet(token) {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_FILE}`, {
    headers: { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" }
  });
  if (res.status === 404) return { data: null, sha: null };
  if (!res.ok) throw new Error("Erreur GitHub GET");
  const json = await res.json();
  const data = JSON.parse(atob(json.content.replace(/\n/g, "")));
  return { data, sha: json.sha };
}

async function githubPut(token, data, sha) {
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
  const body = { message: "Update data", content };
  if (sha) body.sha = sha;
  const res = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_FILE}`, {
    method: "PUT",
    headers: { Authorization: `token ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error("Erreur GitHub PUT");
  const json = await res.json();
  return json.content.sha;
}

// ============================================================
// HELPERS
// ============================================================
const ELEMENTS = ["Feu", "Eau", "Terre", "Air", "Ombre", "Multi"];
const STATUTS = ["Validé", "Test 1", "Test 2", "Test 3", "Archivé"];
const LVLS = ["Lvl 1", "Lvl 2", "Lvl 3", "Lvl 4"];

const ELEMENT_COLORS = {
  Feu: { bg: "rgba(220,60,40,0.15)", border: "rgba(220,60,40,0.4)", dot: "#dc3c28", emoji: "🔥" },
  Eau: { bg: "rgba(40,120,220,0.15)", border: "rgba(40,120,220,0.4)", dot: "#2878dc", emoji: "💧" },
  Terre: { bg: "rgba(120,80,40,0.15)", border: "rgba(120,80,40,0.4)", dot: "#785028", emoji: "🌍" },
  Air: { bg: "rgba(80,180,120,0.15)", border: "rgba(80,180,120,0.4)", dot: "#50b478", emoji: "💨" },
  Ombre: { bg: "rgba(120,60,180,0.15)", border: "rgba(120,60,180,0.4)", dot: "#783cb4", emoji: "🌑" },
  Multi: { bg: "rgba(200,160,40,0.15)", border: "rgba(200,160,40,0.4)", dot: "#c8a028", emoji: "🌈" },
};

const STATUT_COLORS = {
  "Validé": "#4caf50",
  "Test 1": "#ffeb3b",
  "Test 2": "#ff9800",
  "Test 3": "#f44336",
  "Archivé": "#666",
};

const LVL_REWARDS = {
  "Lvl 1": "1 énergie / -2 au dé du monstre",
  "Lvl 2": "1 sort / -1 au dé du monstre",
  "Lvl 3": "1 sort + 1 énergie / neutre",
  "Lvl 4": "2 sorts / monstre lance 2 dés",
};

function uid() { return Math.random().toString(36).slice(2); }

function separateText(text) {
  return text.split(/\n\n---\n\n|\n---\n/).map((part, i, arr) => (
    <span key={i}>{part}{i < arr.length - 1 && <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.15)", margin: "8px 0" }} />}</span>
  ));
}

// ============================================================
// COMPONENTS
// ============================================================

function StatusDot({ statut, onClick, editMode }) {
  const color = STATUT_COLORS[statut] || "#666";
  return (
    <div
      onClick={editMode ? onClick : undefined}
      style={{
        width: 10, height: 10, borderRadius: "50%",
        backgroundColor: color, flexShrink: 0,
        cursor: editMode ? "pointer" : "default",
        border: `2px solid ${color}`,
        boxShadow: `0 0 6px ${color}40`,
      }}
      title={statut}
    />
  );
}

function StatusPicker({ statut, onChange, onClose }) {
  return (
    <div style={{
      position: "absolute", zIndex: 100, background: "#1a1a1a",
      border: "1px solid #333", borderRadius: 8, padding: 8,
      display: "flex", flexDirection: "column", gap: 4, minWidth: 120,
      boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
    }}>
      {STATUTS.map(s => (
        <div key={s} onClick={() => { onChange(s); onClose(); }}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "4px 8px",
            borderRadius: 4, cursor: "pointer", fontSize: 12,
            background: s === statut ? "rgba(255,255,255,0.08)" : "transparent",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
          onMouseLeave={e => e.currentTarget.style.background = s === statut ? "rgba(255,255,255,0.08)" : "transparent"}
        >
          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: STATUT_COLORS[s] }} />
          {s}
        </div>
      ))}
    </div>
  );
}

function EditableText({ value, onChange, editMode, multiline, style = {} }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const ref = useRef();

  useEffect(() => setVal(value), [value]);

  if (!editMode) return (
    <span style={style}>{separateText(value)}</span>
  );

  if (editing) {
    const props = {
      ref, value: val, autoFocus: true,
      onChange: e => setVal(e.target.value),
      onBlur: () => { onChange(val); setEditing(false); },
      style: {
        background: "rgba(255,255,255,0.05)", border: "1px solid #444",
        borderRadius: 4, color: "#eee", padding: "4px 6px",
        width: "100%", fontFamily: "inherit", fontSize: "inherit", ...style,
        resize: multiline ? "vertical" : "none",
      }
    };
    return multiline ? <textarea {...props} rows={3} /> : <input {...props} />;
  }

  return (
    <span
      style={{ cursor: "pointer", borderBottom: "1px dashed rgba(255,255,255,0.2)", ...style }}
      onDoubleClick={() => setEditing(true)}
      title="Double-cliquer pour modifier"
    >{separateText(val) || <span style={{ color: "#555" }}>Double-cliquer pour modifier</span>}</span>
  );
}

function EditableNumber({ value, onChange, editMode }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  useEffect(() => setVal(value), [value]);

  if (!editMode) return <span style={{ fontSize: 11, color: "#888" }}>×{value}</span>;

  if (editing) return (
    <input
      type="number" value={val} autoFocus
      onChange={e => setVal(e.target.value)}
      onBlur={() => { onChange(Number(val)); setEditing(false); }}
      style={{
        width: 40, background: "rgba(255,255,255,0.05)", border: "1px solid #444",
        borderRadius: 4, color: "#eee", padding: "2px 4px", fontSize: 11, textAlign: "center"
      }}
    />
  );

  return (
    <span
      style={{ fontSize: 11, color: "#888", cursor: "pointer", borderBottom: "1px dashed #555" }}
      onDoubleClick={() => setEditing(true)}
      title="Double-cliquer pour modifier"
    >×{value}</span>
  );
}

function ItemCard({ item, onUpdate, onDelete, editMode, showElement = true, elementPicker, lvlPicker }) {
  const [showStatus, setShowStatus] = useState(false);
  const [showElem, setShowElem] = useState(false);
  const [showLvl, setShowLvl] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const elemColor = item.element ? ELEMENT_COLORS[item.element] : null;

  const cardStyle = {
    background: elemColor ? elemColor.bg : "rgba(255,255,255,0.04)",
    border: `1px solid ${elemColor ? elemColor.border : "rgba(255,255,255,0.1)"}`,
    borderRadius: 8, padding: "10px 12px", marginBottom: 8,
    position: "relative", transition: "all 0.2s",
  };

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        {editMode && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <StatusDot statut={item.statut} editMode={editMode} onClick={() => setShowStatus(!showStatus)} />
              {showStatus && (
                <div style={{ position: "absolute", left: 16, top: 0 }}>
                  <StatusPicker statut={item.statut} onChange={s => onUpdate({ ...item, statut: s })} onClose={() => setShowStatus(false)} />
                </div>
              )}
            </div>
            {showElement && elementPicker && (
              <div style={{ position: "relative" }}>
                <div
                  onClick={() => setShowElem(!showElem)}
                  style={{ fontSize: 14, cursor: "pointer" }}
                  title="Changer l'élément"
                >{elemColor?.emoji || "?"}</div>
                {showElem && (
                  <div style={{
                    position: "absolute", left: 20, top: 0, zIndex: 100,
                    background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: 8,
                    display: "flex", flexDirection: "column", gap: 4, minWidth: 120,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
                  }}>
                    {ELEMENTS.map(el => (
                      <div key={el} onClick={() => { onUpdate({ ...item, element: el }); setShowElem(false); }}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", borderRadius: 4, cursor: "pointer", fontSize: 12 }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <span>{ELEMENT_COLORS[el].emoji}</span> {el}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {lvlPicker && (
              <div style={{ position: "relative" }}>
                <div onClick={() => setShowLvl(!showLvl)} style={{ fontSize: 10, color: "#aaa", cursor: "pointer" }} title="Changer le niveau">
                  {item.lvl?.replace("Lvl ", "L")}
                </div>
                {showLvl && (
                  <div style={{
                    position: "absolute", left: 20, top: 0, zIndex: 100,
                    background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: 8,
                    display: "flex", flexDirection: "column", gap: 4, minWidth: 100,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
                  }}>
                    {LVLS.map(l => (
                      <div key={l} onClick={() => { onUpdate({ ...item, lvl: l }); setShowLvl(false); }}
                        style={{ padding: "4px 8px", borderRadius: 4, cursor: "pointer", fontSize: 12 }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >{l}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "#eee" }}>
              <EditableText value={item.nom} onChange={v => onUpdate({ ...item, nom: v })} editMode={editMode} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {item.cout && <span style={{ fontSize: 11, color: "#aaa", background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4 }}>
                <EditableText value={item.cout} onChange={v => onUpdate({ ...item, cout: v })} editMode={editMode} />
              </span>}
              {item.limite && <span style={{ fontSize: 11, color: "#888" }}>
                <EditableText value={item.limite} onChange={v => onUpdate({ ...item, limite: v })} editMode={editMode} />
              </span>}
              {item.lvl && !lvlPicker && <span style={{ fontSize: 11, color: "#aaa", background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4 }}>{item.lvl}</span>}
            </div>
          </div>

          <div style={{ fontSize: 12, color: "#bbb", lineHeight: 1.5 }}>
            <EditableText value={item.effet} onChange={v => onUpdate({ ...item, effet: v })} editMode={editMode} multiline />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {!editMode && item.element && showElement && (
                <span style={{ fontSize: 10, color: elemColor?.dot, background: elemColor?.bg, padding: "1px 6px", borderRadius: 10, border: `1px solid ${elemColor?.border}` }}>
                  {elemColor?.emoji} {item.element}
                </span>
              )}
              {!editMode && item.lvl && (
                <span style={{ fontSize: 10, color: "#aaa" }}>{item.lvl}</span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <EditableNumber value={item.quantite || 1} onChange={v => onUpdate({ ...item, quantite: v })} editMode={editMode} />
              {editMode && (
                <div
                  onClick={() => setShowNotes(!showNotes)}
                  style={{ fontSize: 10, color: "#666", cursor: "pointer", userSelect: "none" }}
                  title="Notes"
                >
                  {showNotes ? "▲" : "▼"} notes
                </div>
              )}
              {editMode && (
                <div onClick={() => onDelete(item.id)} style={{ fontSize: 10, color: "#555", cursor: "pointer" }} title="Supprimer">✕</div>
              )}
            </div>
          </div>

          {editMode && showNotes && (
            <div style={{ marginTop: 8, padding: "8px", background: "rgba(0,0,0,0.3)", borderRadius: 6, border: "1px solid #2a2a2a" }}>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 4 }}>Notes personnelles</div>
              <EditableText value={item.notes || ""} onChange={v => onUpdate({ ...item, notes: v })} editMode={editMode} multiline style={{ fontSize: 11, color: "#999", display: "block", width: "100%" }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AddButton({ onClick }) {
  return (
    <div onClick={onClick} style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      height: 40, cursor: "pointer", opacity: 0.5, transition: "opacity 0.2s",
      marginBottom: 8,
    }}
      onMouseEnter={e => e.currentTarget.style.opacity = "1"}
      onMouseLeave={e => e.currentTarget.style.opacity = "0.5"}
    >
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, color: "#000", fontWeight: 700, lineHeight: 1,
      }}>+</div>
    </div>
  );
}

function Section({ title, emoji, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ marginBottom: 6 }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
          background: "rgba(255,255,255,0.04)", borderRadius: open ? "8px 8px 0 0" : 8,
          cursor: "pointer", border: "1px solid rgba(255,255,255,0.08)",
          borderBottom: open ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(255,255,255,0.08)",
          userSelect: "none", transition: "all 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
        onMouseLeave={e => e.currentTarget.style.background = open ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.04)"}
      >
        <span style={{ fontSize: 14, transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s", display: "inline-block", color: "#888" }}>▼</span>
        <span style={{ fontSize: 16 }}>{emoji}</span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#ddd" }}>{title}</span>
      </div>
      {open && (
        <div style={{
          padding: "12px 14px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderTop: "none", borderRadius: "0 0 8px 8px",
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

function ElementGroup({ element, items, editMode, onUpdate, onDelete, onAdd, isSort }) {
  const ec = ELEMENT_COLORS[element];
  const validCount = items.filter(i => i.statut === "Validé").length;
  const [open, setOpen] = useState(false);

  const filtered = editMode
    ? [...items].sort((a, b) => STATUTS.indexOf(a.statut) - STATUTS.indexOf(b.statut))
    : items.filter(i => i.statut === "Validé");

  if (!editMode && filtered.length === 0) return null;

  return (
    <div style={{ marginBottom: 6 }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
          background: ec.bg, border: `1px solid ${ec.border}`,
          borderRadius: open ? "6px 6px 0 0" : 6, cursor: "pointer", userSelect: "none",
        }}
      >
        <span style={{ fontSize: 12, transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s", display: "inline-block", color: ec.dot }}>▼</span>
        <span style={{ fontSize: 14 }}>{ec.emoji}</span>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: ec.dot }}>{element}</span>
        <span style={{
          fontSize: 11, background: ec.border, color: ec.dot,
          padding: "1px 8px", borderRadius: 10, fontWeight: 700,
        }}>{validCount}</span>
      </div>
      {open && (
        <div style={{
          padding: "10px", background: "rgba(0,0,0,0.2)",
          border: `1px solid ${ec.border}`, borderTop: "none", borderRadius: "0 0 6px 6px",
        }}>
          {filtered.map(item => (
            <ItemCard key={item.id} item={item} onUpdate={onUpdate} onDelete={onDelete} editMode={editMode} elementPicker={isSort} />
          ))}
          {editMode && (
            <AddButton onClick={() => onAdd({ id: uid(), nom: "Nouveau", element, statut: "Test 3", cout: "", limite: "", effet: "", quantite: 1, notes: "" })} />
          )}
        </div>
      )}
    </div>
  );
}

function LvlGroup({ lvl, items, editMode, onUpdate, onDelete, onAdd }) {
  const validCount = items.filter(i => i.statut === "Validé").length;
  const [open, setOpen] = useState(false);

  const filtered = editMode
    ? [...items].sort((a, b) => STATUTS.indexOf(a.statut) - STATUTS.indexOf(b.statut))
    : items.filter(i => i.statut === "Validé");

  if (!editMode && filtered.length === 0) return null;

  return (
    <div style={{ marginBottom: 6 }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: open ? "6px 6px 0 0" : 6, cursor: "pointer", userSelect: "none",
        }}
      >
        <span style={{ fontSize: 12, transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s", display: "inline-block", color: "#888" }}>▼</span>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#ccc" }}>
          {lvl} <span style={{ fontWeight: 400, color: "#777", fontSize: 11 }}>— {LVL_REWARDS[lvl]}</span>
        </span>
        <span style={{ fontSize: 11, background: "rgba(255,255,255,0.08)", color: "#aaa", padding: "1px 8px", borderRadius: 10, fontWeight: 700 }}>{validCount}</span>
      </div>
      {open && (
        <div style={{
          padding: "10px", background: "rgba(0,0,0,0.15)",
          border: "1px solid rgba(255,255,255,0.06)", borderTop: "none", borderRadius: "0 0 6px 6px",
        }}>
          {filtered.map(item => (
            <ItemCard key={item.id} item={item} onUpdate={onUpdate} onDelete={onDelete} editMode={editMode} showElement={false} lvlPicker={editMode} />
          ))}
          {editMode && (
            <AddButton onClick={() => onAdd({ id: uid(), nom: "Nom", lvl, statut: "Test 3", effet: "", quantite: 1, notes: "" })} />
          )}
        </div>
      )}
    </div>
  );
}

function ModeSection({ mode, editMode, onUpdate }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginBottom: 6 }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: open ? "6px 6px 0 0" : 6, cursor: "pointer", userSelect: "none",
        }}
      >
        <span style={{ fontSize: 12, transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s", display: "inline-block", color: "#888" }}>▼</span>
        <span style={{ fontSize: 14 }}>{mode.emoji}</span>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#ddd" }}>{mode.nom}</span>
        {mode.difficulte && <span style={{ fontSize: 10, color: "#777" }}>{mode.difficulte}</span>}
      </div>
      {open && (
        <div style={{
          padding: "12px", background: "rgba(0,0,0,0.15)",
          border: "1px solid rgba(255,255,255,0.06)", borderTop: "none", borderRadius: "0 0 6px 6px",
        }}>
          {mode.joueurs && <div style={{ fontSize: 11, color: "#777", marginBottom: 8 }}>👥 {mode.joueurs} joueurs · {mode.style}</div>}
          <div style={{ fontSize: 12, color: "#bbb", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {editMode
              ? <EditableText value={mode.contenu} onChange={v => onUpdate({ ...mode, contenu: v })} editMode={editMode} multiline />
              : separateText(mode.contenu)}
          </div>
          {editMode && (
            <div style={{ marginTop: 10, padding: "8px", background: "rgba(0,0,0,0.3)", borderRadius: 6, border: "1px solid #2a2a2a" }}>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 4 }}>Notes de test</div>
              <EditableText value={mode.notes || ""} onChange={v => onUpdate({ ...mode, notes: v })} editMode={editMode} multiline style={{ fontSize: 11, color: "#999" }} />
            </div>
          )}
          {!editMode && mode.notes && (
            <div style={{ marginTop: 10, padding: "8px", background: "rgba(0,0,0,0.2)", borderRadius: 6, borderLeft: "2px solid #333" }}>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 4 }}>📝 Notes</div>
              <div style={{ fontSize: 11, color: "#888", whiteSpace: "pre-wrap" }}>{separateText(mode.notes)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VisuelSection({ data, editMode, onUpdate }) {
  const cats = [
    { key: "general", label: "💡 Idée générale" },
    { key: "boite", label: "📦 Boîte" },
    { key: "personnages", label: "🧑 Personnages" },
    { key: "cases", label: "🗺️ Cases" },
    { key: "items", label: "💎 Items" },
    { key: "monstres", label: "👹 Monstres" },
    { key: "accessoires", label: "🎲 Accessoires" },
    { key: "references", label: "🎨 Références" },
  ];

  return (
    <div>
      {cats.map(cat => (
        <Section key={cat.key} title={cat.label} emoji="">
          <div style={{ fontSize: 12, color: "#bbb", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {editMode
              ? <EditableText value={data[cat.key] || ""} onChange={v => onUpdate({ ...data, [cat.key]: v })} editMode={editMode} multiline />
              : separateText(data[cat.key] || "")}
          </div>
        </Section>
      ))}
    </div>
  );
}

function SoireePage({ soirees, onUpdate, onAdd, onDelete, editMode, onBack }) {
  const sortedSoirees = [...soirees].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div style={{ padding: "0 16px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0" }}>
        <button onClick={onBack} style={{
          background: "none", border: "1px solid #333", borderRadius: 6,
          color: "#aaa", padding: "6px 12px", cursor: "pointer", fontSize: 12,
        }}>← Retour</button>
        <h2 style={{ margin: 0, fontSize: 16, color: "#eee" }}>📅 Soirées Proto</h2>
      </div>

      {sortedSoirees.map(s => (
        <div key={s.id} style={{ marginBottom: 6 }}>
          <Section title={s.date || "Sans date"} emoji="📅">
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 4 }}>Participants & lieu</div>
              {editMode
                ? <EditableText value={s.meta || ""} onChange={v => onUpdate({ ...s, meta: v })} editMode={editMode} multiline />
                : <div style={{ fontSize: 12, color: "#bbb" }}>{s.meta}</div>}
            </div>
            <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)", margin: "8px 0" }} />
            <div style={{ fontSize: 10, color: "#555", marginBottom: 4 }}>Notes</div>
            {editMode
              ? <EditableText value={s.notes || ""} onChange={v => onUpdate({ ...s, notes: v })} editMode={editMode} multiline />
              : <div style={{ fontSize: 12, color: "#bbb", whiteSpace: "pre-wrap" }}>{separateText(s.notes || "")}</div>}
            {editMode && (
              <div style={{ marginTop: 8, textAlign: "right" }}>
                <button onClick={() => onDelete(s.id)} style={{
                  background: "none", border: "1px solid #333", borderRadius: 4,
                  color: "#666", padding: "2px 8px", cursor: "pointer", fontSize: 11,
                }}>Supprimer</button>
              </div>
            )}
          </Section>
        </div>
      ))}

      <AddButton onClick={() => onAdd({
        id: uid(),
        date: new Date().toLocaleDateString("fr-FR"),
        meta: "",
        notes: "",
      })} />
    </div>
  );
}

function IdeeVracPage({ value, onChange, editMode, onBack }) {
  const parts = value.split(/\n\n---\n\n|\n---\n/);

  return (
    <div style={{ padding: "0 16px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0" }}>
        <button onClick={onBack} style={{
          background: "none", border: "1px solid #333", borderRadius: 6,
          color: "#aaa", padding: "6px 12px", cursor: "pointer", fontSize: 12,
        }}>← Retour</button>
        <h2 style={{ margin: 0, fontSize: 16, color: "#eee" }}>💡 Idées en vrac</h2>
      </div>

      {editMode ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Tape tes idées ici... Double retour à la ligne crée un séparateur."
          style={{
            width: "100%", minHeight: "60vh", background: "rgba(255,255,255,0.03)",
            border: "1px solid #333", borderRadius: 8, color: "#ddd",
            padding: 12, fontFamily: "inherit", fontSize: 13, lineHeight: 1.7,
            resize: "vertical", boxSizing: "border-box",
          }}
        />
      ) : (
        <div style={{ fontSize: 13, color: "#bbb", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
          {separateText(value)}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [data, setData] = useState(null);
  const [sha, setSha] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("gh_token") || "");
  const [tokenInput, setTokenInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [page, setPage] = useState("home");
  const saveTimeout = useRef(null);

  // Load data
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    githubGet(token).then(({ data: d, sha: s }) => {
      setData(d || INITIAL_DATA);
      setSha(s);
      setLoading(false);
    }).catch(e => {
      setError(e.message);
      setLoading(false);
    });
  }, [token]);

  // Auto-save
  const save = useCallback((newData) => {
    if (!token) return;
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      setSaving(true);
      try {
        const newSha = await githubPut(token, newData, sha);
        setSha(newSha);
      } catch (e) {
        setError(e.message);
      }
      setSaving(false);
    }, 2000);
  }, [token, sha]);

  const update = useCallback((newData) => {
    setData(newData);
    save(newData);
  }, [save]);

  // Item helpers
  const updateItem = (section, item) => {
    const newItems = data[section].map(i => i.id === item.id ? item : i);
    update({ ...data, [section]: newItems });
  };
  const deleteItem = (section, id) => {
    update({ ...data, [section]: data[section].filter(i => i.id !== id) });
  };
  const addItem = (section, item) => {
    update({ ...data, [section]: [...data[section], item] });
  };

  // Token screen
  if (!token) {
    return (
      <div style={{
        minHeight: "100vh", background: "#0e0e0e", display: "flex",
        alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "system-ui",
      }}>
        <div style={{ maxWidth: 360, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🎲</div>
          <h1 style={{ color: "#eee", fontSize: 20, marginBottom: 8 }}>Labyrinthe Organic</h1>
          <p style={{ color: "#666", fontSize: 13, marginBottom: 24 }}>Entre ton token GitHub pour accéder à tes données.</p>
          <input
            type="password" value={tokenInput}
            onChange={e => setTokenInput(e.target.value)}
            placeholder="ghp_..."
            style={{
              width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid #333",
              borderRadius: 8, color: "#eee", padding: "10px 14px", fontSize: 14,
              boxSizing: "border-box", marginBottom: 12,
            }}
          />
          <button
            onClick={() => { localStorage.setItem("gh_token", tokenInput); setToken(tokenInput); }}
            style={{
              width: "100%", background: "#222", border: "1px solid #444",
              borderRadius: 8, color: "#eee", padding: "10px 14px", cursor: "pointer", fontSize: 14,
            }}
          >Connexion</button>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0e0e0e", display: "flex", alignItems: "center", justifyContent: "center", color: "#666", fontFamily: "system-ui" }}>
      Chargement...
    </div>
  );

  if (!data) return null;

  // Pages
  if (page === "soirees") return (
    <div style={{ minHeight: "100vh", background: "#0e0e0e", fontFamily: "system-ui", color: "#eee" }}>
      <SoireePage
        soirees={data.soireesProto}
        editMode={editMode}
        onBack={() => setPage("home")}
        onUpdate={s => { const arr = data.soireesProto.map(x => x.id === s.id ? s : x); update({ ...data, soireesProto: arr }); }}
        onAdd={s => update({ ...data, soireesProto: [...data.soireesProto, s] })}
        onDelete={id => update({ ...data, soireesProto: data.soireesProto.filter(s => s.id !== id) })}
      />
    </div>
  );

  if (page === "idees") return (
    <div style={{ minHeight: "100vh", background: "#0e0e0e", fontFamily: "system-ui", color: "#eee" }}>
      <IdeeVracPage
        value={data.ideeEnVrac}
        onChange={v => update({ ...data, ideeEnVrac: v })}
        editMode={editMode}
        onBack={() => setPage("home")}
      />
    </div>
  );

  // Home
  const sortsByElement = {};
  ELEMENTS.forEach(el => { sortsByElement[el] = data.sorts.filter(s => s.element === el); });

  const energiesByElement = {};
  ELEMENTS.forEach(el => { energiesByElement[el] = data.energies.filter(e => e.element === el); });

  const monstresByLvl = {};
  LVLS.forEach(l => { monstresByLvl[l] = data.monstres.filter(m => m.lvl === l); });

  const reglesFiltred = editMode ? [...data.regles].sort((a, b) => STATUTS.indexOf(a.statut) - STATUTS.indexOf(b.statut)) : data.regles.filter(r => r.statut === "Validé");

  const casesFiltred = editMode ? [...data.cases].sort((a, b) => STATUTS.indexOf(a.statut) - STATUTS.indexOf(b.statut)) : data.cases.filter(c => c.statut === "Validé");

  return (
    <div style={{
      minHeight: "100vh",
      background: editMode
        ? "repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(255,255,255,0.03) 23px, rgba(255,255,255,0.03) 24px), repeating-linear-gradient(90deg, transparent, transparent 23px, rgba(255,255,255,0.03) 23px, rgba(255,255,255,0.03) 24px), #111"
        : "#0e0e0e",
      fontFamily: "system-ui, -apple-system, sans-serif",
      color: "#eee",
      transition: "background 0.4s",
    }}>
      {/* HEADER */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: editMode ? "rgba(30,30,30,0.95)" : "rgba(14,14,14,0.95)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "12px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#eee" }}>
            <EditableText value={data.gameName} onChange={v => update({ ...data, gameName: v })} editMode={editMode} />
          </div>
          {saving && <div style={{ fontSize: 10, color: "#555" }}>Sauvegarde...</div>}
          {error && <div style={{ fontSize: 10, color: "#f44" }}>{error}</div>}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => setEditMode(!editMode)}
            style={{
              background: editMode ? "rgba(255,255,255,0.1)" : "none",
              border: `1px solid ${editMode ? "rgba(255,255,255,0.3)" : "#333"}`,
              borderRadius: 8, padding: "6px 10px", cursor: "pointer",
              color: editMode ? "#eee" : "#666", fontSize: 16,
              transition: "all 0.2s",
            }}
            title="Mode édition"
          >✏️</button>
          <button
            onClick={() => { localStorage.removeItem("gh_token"); setToken(""); }}
            style={{
              background: "none", border: "1px solid #222", borderRadius: 8,
              padding: "6px 10px", cursor: "pointer", color: "#444", fontSize: 11,
            }}
            title="Déconnexion"
          >⏻</button>
        </div>
      </div>

      <div style={{ padding: "16px 16px 100px" }}>
        {/* JOUER */}
        <div style={{
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12, padding: "16px", marginBottom: 20, textAlign: "center",
          opacity: 0.4, cursor: "not-allowed",
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#888" }}>🎮 Jouer</div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>WIP — bientôt disponible</div>
        </div>

        {/* RÈGLES DE BASE */}
        <Section title="Règles de base" emoji="📋">
          {reglesFiltred.map(r => (
            <ItemCard key={r.id} item={r} onUpdate={i => updateItem("regles", i)} onDelete={id => deleteItem("regles", id)} editMode={editMode} showElement={false} />
          ))}
          {editMode && <AddButton onClick={() => addItem("regles", { id: uid(), nom: "Nouvelle règle", statut: "Test 3", effet: "", notes: "" })} />}
          {editMode && (
            <div style={{ marginTop: 8, padding: "8px", background: "rgba(0,0,0,0.3)", borderRadius: 6, border: "1px solid #2a2a2a" }}>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 4 }}>Notes globales — Règles</div>
              <EditableText value={data.reglesNotes || ""} onChange={v => update({ ...data, reglesNotes: v })} editMode={editMode} multiline style={{ fontSize: 11, color: "#999" }} />
            </div>
          )}
        </Section>

        {/* CASES */}
        <Section title="Cases" emoji="🗺️">
          {casesFiltred.map(c => (
            <ItemCard key={c.id} item={c} onUpdate={i => updateItem("cases", i)} onDelete={id => deleteItem("cases", id)} editMode={editMode} showElement={false} />
          ))}
          {editMode && <AddButton onClick={() => addItem("cases", { id: uid(), nom: "Nouvelle case", statut: "Test 3", effet: "", quantite: 1, notes: "" })} />}
        </Section>

        {/* SORTS */}
        <Section title="Sorts" emoji="💎">
          {ELEMENTS.map(el => (
            <ElementGroup
              key={el} element={el} items={sortsByElement[el] || []}
              editMode={editMode} isSort={true}
              onUpdate={i => updateItem("sorts", i)}
              onDelete={id => deleteItem("sorts", id)}
              onAdd={i => addItem("sorts", i)}
            />
          ))}
          {editMode && (
            <div style={{ marginTop: 8, padding: "8px", background: "rgba(0,0,0,0.3)", borderRadius: 6, border: "1px solid #2a2a2a" }}>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 4 }}>Notes globales — Sorts</div>
              <EditableText value={data.sortsNotes || ""} onChange={v => update({ ...data, sortsNotes: v })} editMode={editMode} multiline style={{ fontSize: 11, color: "#999" }} />
            </div>
          )}
        </Section>

        {/* ÉNERGIES */}
        <Section title="Énergies" emoji="✨">
          {ELEMENTS.map(el => (
            <ElementGroup
              key={el} element={el} items={energiesByElement[el] || []}
              editMode={editMode} isSort={false}
              onUpdate={i => updateItem("energies", i)}
              onDelete={id => deleteItem("energies", id)}
              onAdd={i => addItem("energies", { ...i, cout: "", limite: "" })}
            />
          ))}
        </Section>

        {/* MONSTRES */}
        <Section title="Monstres" emoji="👹">
          {LVLS.map(lvl => (
            <LvlGroup
              key={lvl} lvl={lvl} items={monstresByLvl[lvl] || []}
              editMode={editMode}
              onUpdate={i => updateItem("monstres", i)}
              onDelete={id => deleteItem("monstres", id)}
              onAdd={i => addItem("monstres", i)}
            />
          ))}
          {editMode && (
            <div style={{ marginTop: 8, padding: "8px", background: "rgba(0,0,0,0.3)", borderRadius: 6, border: "1px solid #2a2a2a" }}>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 4 }}>Notes globales — Monstres</div>
              <EditableText value={data.monstresNotes || ""} onChange={v => update({ ...data, monstresNotes: v })} editMode={editMode} multiline style={{ fontSize: 11, color: "#999" }} />
            </div>
          )}
        </Section>

        {/* LEXIQUE */}
        <Section title="Lexique" emoji="📖">
          {data.lexique.map((l, i) => (
            <div key={l.id} style={{
              padding: "8px 0", borderBottom: i < data.lexique.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
              display: "flex", gap: 8,
            }}>
              <div style={{ minWidth: 100, fontSize: 12, fontWeight: 600, color: "#ccc" }}>
                <EditableText value={l.terme} onChange={v => { const arr = data.lexique.map(x => x.id === l.id ? { ...x, terme: v } : x); update({ ...data, lexique: arr }); }} editMode={editMode} />
              </div>
              <div style={{ fontSize: 12, color: "#888", flex: 1 }}>
                <EditableText value={l.definition} onChange={v => { const arr = data.lexique.map(x => x.id === l.id ? { ...x, definition: v } : x); update({ ...data, lexique: arr }); }} editMode={editMode} multiline />
              </div>
            </div>
          ))}
          {editMode && <AddButton onClick={() => update({ ...data, lexique: [...data.lexique, { id: uid(), terme: "Terme", definition: "Définition" }] })} />}
          {editMode && (
            <div style={{ marginTop: 8, padding: "8px", background: "rgba(0,0,0,0.3)", borderRadius: 6, border: "1px solid #2a2a2a" }}>
              <EditableText value={data.lexiqueNotes || ""} onChange={v => update({ ...data, lexiqueNotes: v })} editMode={editMode} multiline style={{ fontSize: 11, color: "#999" }} />
            </div>
          )}
        </Section>

        {/* MODES DE JEU */}
        <Section title="Modes de jeu" emoji="🎮">
          {data.modes.map(mode => (
            <ModeSection key={mode.id} mode={mode} editMode={editMode} onUpdate={m => { const arr = data.modes.map(x => x.id === m.id ? m : x); update({ ...data, modes: arr }); }} />
          ))}
          {editMode && <AddButton onClick={() => update({ ...data, modes: [...data.modes, { id: uid(), nom: "Nouveau mode", emoji: "🎲", statut: "Test 3", difficulte: "⭐", style: "", joueurs: "", contenu: "", notes: "" }] })} />}
          <div style={{ marginTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8 }}>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 8 }}>💡 Idées de modes</div>
            {data.ideesModes.map(im => (
              <div key={im.id} style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 6, padding: "8px 10px", marginBottom: 6,
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#ccc", marginBottom: 4 }}>
                  <EditableText value={im.nom} onChange={v => { const arr = data.ideesModes.map(x => x.id === im.id ? { ...x, nom: v } : x); update({ ...data, ideesModes: arr }); }} editMode={editMode} />
                </div>
                <div style={{ fontSize: 12, color: "#777" }}>
                  <EditableText value={im.pitch} onChange={v => { const arr = data.ideesModes.map(x => x.id === im.id ? { ...x, pitch: v } : x); update({ ...data, ideesModes: arr }); }} editMode={editMode} multiline />
                </div>
              </div>
            ))}
            {editMode && <AddButton onClick={() => update({ ...data, ideesModes: [...data.ideesModes, { id: uid(), nom: "Nouveau mode", pitch: "" }] })} />}
          </div>
        </Section>

        {/* VISUEL */}
        <Section title="Visuels" emoji="🎨">
          <VisuelSection data={data.visuels} editMode={editMode} onUpdate={v => update({ ...data, visuels: v })} />
        </Section>

        {/* MATÉRIEL */}
        <Section title="Matériel" emoji="🧰">
          <div style={{ fontSize: 12, color: "#bbb", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {editMode
              ? <EditableText value={data.materiel} onChange={v => update({ ...data, materiel: v })} editMode={editMode} multiline />
              : separateText(data.materiel)}
          </div>
          {editMode && (
            <div style={{ marginTop: 8, padding: "8px", background: "rgba(0,0,0,0.3)", borderRadius: 6, border: "1px solid #2a2a2a" }}>
              <EditableText value={data.materielNotes || ""} onChange={v => update({ ...data, materielNotes: v })} editMode={editMode} multiline style={{ fontSize: 11, color: "#999" }} />
            </div>
          )}
        </Section>

        {/* BOUTONS BAS */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
          <button onClick={() => setPage("soirees")} style={{
            width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, padding: "14px", cursor: "pointer", color: "#ccc", fontSize: 14,
            fontFamily: "inherit", fontWeight: 600,
          }}>📅 Soirées Prototype</button>
          <button onClick={() => setPage("idees")} style={{
            width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, padding: "14px", cursor: "pointer", color: "#ccc", fontSize: 14,
            fontFamily: "inherit", fontWeight: 600,
          }}>💡 Idées en vrac</button>
        </div>
      </div>
    </div>
  );
}
