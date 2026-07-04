// firebase.js - Inicialización única de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBWSavaadHR6_ZcsnxtcckMxa1IDmFOoBw",
  authDomain: "secreto-3b95a.firebaseapp.com",
  projectId: "secreto-3b95a",
  storageBucket: "secreto-3b95a.firebasestorage.app",
  messagingSenderId: "901415756488",
  appId: "1:901415756488:web:69e0da142680bf143bbbfd"
};

const app = initializeApp(firebaseConfig);

// Exportamos directo desde aquí
export const auth = getAuth(app);
export const db = getFirestore(app);

console.log("¡Firebase conectado con éxito! 🚀");