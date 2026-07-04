// comments.js - Manejo de comentarios en Firestore
import { 
    collection, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    onSnapshot,
    getDocs // <-- Agregamos getDocs para el historial estático
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db, auth } from "./firebase.js";

// Guardamos los limpiadores de escuchas activas por cada caja de comentarios abierta
let activasEscuchas = {};

// 1. GUARDAR UN COMENTARIO NUEVO
export async function guardarComentario(secretoId, texto) {
    try {
        const user = auth.currentUser;
        if (!user) return alert("Inicia sesión para comentar.");

        await addDoc(collection(db, "comments"), {
            secreto_id: secretoId,
            texto: texto,
            autor_id: user.uid,
            fecha: new Date()
        });
        console.log("Comentario publicado!");
    } catch (error) {
        console.error("Error al guardar comentario:", error);
    }
}

// 2. ESCUCHAR COMENTARIOS DE UN SECRETO ESPECÍFICO
export function escucharComentarios(secretoId) {
    if (activasEscuchas[secretoId]) return;

    const q = query(
        collection(db, "comments"),
        where("secreto_id", "==", secretoId),
        orderBy("fecha", "asc")
    );

    // Guardamos la función de desuscripción que devuelve onSnapshot
    activasEscuchas[secretoId] = onSnapshot(q, (snapshot) => {
        const listContainer = document.getElementById(`comments-list-${secretoId}`);
        if (!listContainer) return;

        listContainer.innerHTML = "";

        if (snapshot.empty) {
            listContainer.innerHTML = "<p style='font-size: 12px; color: gray;'>Nadie ha comentado... Aún.</p>";
            return;
        }

        snapshot.forEach((doc) => {
            const comentario = doc.data();
            const p = document.createElement("p");
            p.style.fontSize = "13px";
            p.style.margin = "5px 0";
            p.innerHTML = `<strong>Anónimo:</strong> ${comentario.texto}`;
            listContainer.appendChild(p);
        });
    }, (error) => {
        console.error("Error en comentarios snapshot:", error);
    });
}

// --- NUEVO: 3. MATAR TODAS LAS ESCUCHAS ACTIVAS DE COMENTARIOS ---
export function matarEscuchasComentarios() {
    Object.keys(activasEscuchas).forEach((secretoId) => {
        if (typeof activasEscuchas[secretoId] === "function") {
            activasEscuchas[secretoId](); // Cerramos la conexión con Firestore
        }
    });
    activasEscuchas = {}; // Vaciamos el objeto
    console.log("💥 Todas las escuchas de comentarios fueron eliminadas.");
}

// --- NUEVO: 4. CARGAR EL HISTORIAL DE MIS COMENTARIOS ---
export async function cargarMisComentarios() {
    const user = auth.currentUser;
    if (!user) return;

    const container = document.getElementById("secrets-container");
    container.innerHTML = "<p class='no-secrets'>Cargando tu historial de respuestas...</p>";

    try {
        // Buscamos en la colección de comentarios los que pertenezcan al UID del usuario
        const q = query(
            collection(db, "comments"),
            where("autor_id", "==", user.uid),
            orderBy("fecha", "desc")
        );

        const querySnapshot = await getDocs(q);
        container.innerHTML = "";

        if (querySnapshot.empty) {
            container.innerHTML = "<p class='no-secrets'>No has comentado ningún secreto todavía.</p>";
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const comentario = docSnap.data();
            const commentCard = document.createElement("div");
            commentCard.className = "secret-card"; // Reutilizamos el estilo de tarjeta chula
            commentCard.style.borderLeft = "4px solid var(--accent-color)"; // Distintivo para comentarios
            
            // Pintamos el comentario y la fecha formateada de forma sencilla
            const fechaFormato = comentario.fecha ? new Date(comentario.fecha.seconds * 1000).toLocaleDateString() : '';
            
            commentCard.innerHTML = `
                <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 5px;">💬 Tu comentario el ${fechaFormato}:</p>
                <p class="secret-text" style="font-size: 16px; margin-bottom: 10px;">"${comentario.texto}"</p>
                <p style="font-size: 11px; color: gray;">Asociado al Secreto ID: ${comentario.secreto_id}</p>
            `;
            container.appendChild(commentCard);
        });
    } catch (error) {
        console.error("Error al obtener tu historial de comentarios:", error);
        // Si pide índice compuesto en la consola (autor_id + fecha desc), ya sabes qué hacer
    }
}