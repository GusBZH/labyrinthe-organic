// Firebase Realtime Database — synchro temps réel pour la version en ligne
// (voir CLAUDE.md "Version en ligne entre amis"). Chargé comme un module ES
// natif directement depuis le CDN gstatic (mêmes URLs que celles données par
// la console Firebase) — pas de npm/bundler dans ce projet, exactement comme
// React est déjà chargé en UMD plutôt qu'en dépendance installée.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js";

// Clés publiques côté client (pas des secrets — la vraie protection vient des
// règles d'accès de la Realtime Database, pas de cacher ces valeurs).
const firebaseConfig = {
  apiKey: "AIzaSyCofHrEkkPthTAA4yJQ5o9-XHoGPtbriVc",
  authDomain: "labyrinthe-organic.firebaseapp.com",
  databaseURL: "https://labyrinthe-organic-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "labyrinthe-organic",
  storageBucket: "labyrinthe-organic.firebasestorage.app",
  messagingSenderId: "175781434547",
  appId: "1:175781434547:web:a8920c545a6957753f8cc6",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
