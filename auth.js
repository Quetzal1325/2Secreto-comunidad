// auth.js - Lógica de autenticación y base de datos de usuarios
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { auth, db } from "./firebase.js";
import { showAppView } from "./ui.js";

// 1. REGISTRAR USUARIO (Y guardar edad/género en Firestore)
export async function registrarUsuario(email, password, age, gender) {
    try {
        // Crea el usuario en Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Guarda los datos extra en Firestore vinculados al UID del usuario
        await setDoc(doc(db, "users", user.uid), {
            edad: parseInt(age),
            genero: gender,
            uid: user.uid,
            fechaRegistro: new Date()
        });

        console.log("Usuario registrado y guardado en Firestore con éxito 🎉");
    } catch (error) {
        console.error("Error en registro:", error.message);
        alert("Error al registrar: " + error.message);
    }
}

// 2. INICIAR SESIÓN
export async function iniciarSesion(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        console.log("Sesión iniciada correctamente ✔");
    } catch (error) {
        console.error("Error en login:", error.message);
        alert("Error al iniciar sesión: " + error.message);
    }
}

// 3. CERRAR SESIÓN
export async function cerrarSesion() {
    try {
        await signOut(auth);
        console.log("Sesión cerrada.");
    } catch (error) {
        console.error("Error al cerrar sesión:", error.message);
    }
}

// 4. ESCUCHAR EL ESTADO DE LA SESIÓN (Si está logueado o no)
onAuthStateChanged(auth, (user) => {
    // Esta función de ui.js oculta o muestra el feed automáticamente
    showAppView(user);
});