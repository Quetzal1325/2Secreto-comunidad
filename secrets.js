// secrets.js - Manejo de la colección de secretos en Firestore
import { 
    collection, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    onSnapshot,
    doc,
    updateDoc,
    increment,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db, auth } from "./firebase.js";
import { pintarSecretos } from "./ui.js";

let unsubscribeFeed = null;

// 1. GUARDAR SECRETO
// secrets.js - Busca y reemplaza la función guardarSecreto:

export async function guardarSecreto(texto, esNsfw) {
    try {
        const user = auth.currentUser;
        if (!user) return alert("Debes estar logueado para publicar.");

        // NUEVO: Jalamos el documento del perfil del usuario en Firestore para saber su edad y género
        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);
        
        let edad = 18; // Valores por defecto por si acaso
        let genero = "Otro";

        if (userSnap.exists()) {
            edad = userSnap.data().edad;
            genero = userSnap.data().genero;
        }

        // Guardamos el secreto incluyendo ahora la edad y el género del autor
        await addDoc(collection(db, "secrets"), {
            texto: texto,
            es_nsfw: esNsfw,
            autor_id: user.uid,
            autor_edad: edad,       // <-- Campo nuevo
            autor_genero: genero,   // <-- Campo nuevo
            fecha: new Date(),
            reacciones: { feliz: 0, enojado: 0, triste: 0, asco: 0 }
        });

        console.log("¡Secreto publicado con éxito con su info de perfil! 🤫");
        return true;
    } catch (error) {
        console.error("Error al publicar secreto:", error);
        return false;
    }
}

// 2. ESCUCHAR FEED EN TIEMPO REAL (Filtro por tipo Normal/NSFW)
export function cargarFeed(mostrarNsfw) {
    if (unsubscribeFeed) unsubscribeFeed();

    const q = query(
        collection(db, "secrets"),
        where("es_nsfw", "==", mostrarNsfw),
        orderBy("fecha", "desc")
    );

    unsubscribeFeed = onSnapshot(q, (snapshot) => {
        const secretos = [];
        snapshot.forEach((doc) => {
            secretos.push({ id: doc.id, ...doc.data() });
        });
        pintarSecretos(secretos);
    }, (error) => {
        console.error("Error al cargar el feed:", error);
    });
}

// 3. INCREMENTAR O INTERCAMBIAR REACCIÓN POR USUARIO
export async function darReaccion(secretoId, tipoReaccion) {
    try {
        const user = auth.currentUser;
        if (!user) return alert("Debes iniciar sesión para reaccionar.");

        const uid = user.uid;
        const secretoRef = doc(db, "secrets", secretoId);
        const votoRef = doc(db, "secrets", secretoId, "user_reactions", uid);
        const votoSnap = await getDoc(votoRef);

        const actualizacionesSecreto = {};

        if (votoSnap.exists()) {
            const reaccionAnterior = votoSnap.data().tipo;

            if (reaccionAnterior === tipoReaccion) {
                actualizacionesSecreto[`reacciones.${tipoReaccion}`] = increment(-1);
                await updateDoc(secretoRef, actualizacionesSecreto);
                await setDoc(votoRef, { tipo: null });
                console.log("Voto removido.");
                return;
            }

            if (reaccionAnterior) {
                actualizacionesSecreto[`reacciones.${reaccionAnterior}`] = increment(-1);
            }
            actualizacionesSecreto[`reacciones.${tipoReaccion}`] = increment(1);
            
            await updateDoc(secretoRef, actualizacionesSecreto);
            await setDoc(votoRef, { tipo: tipoReaccion });
            console.log("Reacción cambiada con éxito.");

        } else {
            actualizacionesSecreto[`reacciones.${tipoReaccion}`] = increment(1);
            await updateDoc(secretoRef, actualizacionesSecreto);
            await setDoc(votoRef, { tipo: tipoReaccion });
            console.log("¡Voto nuevo registrado!");
        }
    } catch (error) {
        console.error("Error al procesar la reacción:", error);
    }
}

// 4. CARGAR ÚNICAMENTE LOS SECRETOS DEL USUARIO LOGUEADO
export function cargarMisSecretos() {
    const user = auth.currentUser;
    if (!user) return;

    if (unsubscribeFeed) unsubscribeFeed();

    const q = query(
        collection(db, "secrets"),
        where("autor_id", "==", user.uid),
        orderBy("fecha", "desc")
    );

    unsubscribeFeed = onSnapshot(q, (snapshot) => {
        const secretos = [];
        snapshot.forEach((doc) => {
            secretos.push({ id: doc.id, ...doc.data() });
        });
        pintarSecretos(secretos);
    }, (error) => {
        console.error("Error al cargar tus secretos:", error);
    });
}