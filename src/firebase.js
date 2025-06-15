// src/firebase.js
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics"; // Si lo necesitas para el frontend directamente
// import { getMessaging } from "firebase/messaging"; // Si vas a usar Cloud Messaging para notificaciones push

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID // Solo si usas Google Analytics JS SDK
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Exporta la instancia de la app y otros servicios que necesites
// export const analytics = getAnalytics(app); // Si vas a usar Google Analytics directamente en el frontend
// export const messaging = getMessaging(app); // Si vas a usar Cloud Messaging para notificaciones push

export default app;