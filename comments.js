// comments.js - Gestión de comentarios con hilos agrupados (Sin sistema de reportes)
import { 
    collection, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    onSnapshot,
    getDocs,
    doc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db, auth } from "./firebase.js";

let unsubscribeComments = null;

// 1. ESCUCHAR COMENTARIOS EN TIEMPO REAL Y AGRUPARLOS POR HILOS
export function escucharComentarios(secretoId) {
    const listContainer = document.getElementById(`comments-list-${secretoId}`);
    if (!listContainer) return;

    matarEscuchasComentarios();

    const q = query(
        collection(db, "comments"),
        where("secreto_id", "==", secretoId),
        orderBy("fecha", "asc")
    );

    unsubscribeComments = onSnapshot(q, (snapshot) => {
        listContainer.innerHTML = "";

        if (snapshot.empty) {
            listContainer.innerHTML = "<p style='font-size: 13px; color: gray; font-style: italic; margin: 5px 0;'>Nadie ha comentado aún... Sé el primero.</p>";
            return;
        }

        const principales = [];
        const respuestas = [];

        snapshot.forEach((docSnap) => {
            const comentario = { id: docSnap.id, ...docSnap.data() };
            if (comentario.padre_id) {
                respuestas.push(comentario);
            } else {
                principales.push(comentario);
            }
        });

        // Función auxiliar para renderizar un comentario en el HTML (Sin botón de reportar)
        function crearElementoComentario(comentario, esRespuesta = false) {
            const div = document.createElement("div");
            div.style.padding = "8px 0";
            div.style.borderBottom = "1px solid var(--border-color)";
            div.style.fontSize = "13.5px";
            
            if (esRespuesta) {
                div.style.marginLeft = "25px";
                div.style.paddingLeft = "10px";
                div.style.borderLeft = "2px solid var(--accent-color)";
                div.style.backgroundColor = "rgba(196, 113, 237, 0.03)"; 
            }

            div.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 10px;">
                    <span style="color: var(--text-main); word-break: break-word;">
                        <strong style="color: var(--text-main);">Anónimo:</strong> ${comentario.texto}
                    </span>
                    <button class="reply-comment-btn" data-id="${secretoId}" data-comentario-id="${esRespuesta ? comentario.padre_id : comentario.id}" style="background: none; border: none; cursor: pointer; font-size: 11px; color: var(--accent-color); opacity: 0.8; padding: 2px 5px; white-space: nowrap; font-weight: bold;">
                        💬 Responder
                    </button>
                </div>
            `;
            return div;
        }

        principales.forEach((principal) => {
            listContainer.appendChild(crearElementoComentario(principal, false));

            const respuestasDelPadre = respuestas.filter(r => r.padre_id === principal.id);
            respuestasDelPadre.forEach((respuesta) => {
                listContainer.appendChild(crearElementoComentario(respuesta, true));
            });
        });

    }, (error) => {
        console.error("Error al escuchar comentarios:", error);
    });
}

// 2. GUARDAR UN NUEVO COMENTARIO
export async function guardarComentario(secretoId, texto, dueñoSecretoId, padreId = null) {
    try {
        const user = auth.currentUser;
        if (!user) return alert("Inicia sesión para comentar.");

        await addDoc(collection(db, "comments"), {
            secreto_id: secretoId,
            texto: texto,
            autor_id: user.uid,
            fecha: new Date(),
            padre_id: padreId 
        });

        if (dueñoSecretoId && dueñoSecretoId !== user.uid) {
            await addDoc(collection(db, "notifications"), {
                para_usuario_id: dueñoSecretoId,
                secreto_id: secretoId,
                texto_preview: texto.substring(0, 40) + "...",
                leida: false,
                fecha: new Date()
            });
        }
    } catch (error) {
        console.error("Error al procesar el comentario:", error);
    }
}

// 3. CARGAR HISTORIAL ESTÁTICO DE MIS COMENTARIOS
export async function cargarMisComentarios() {
    const container = document.getElementById("secrets-container");
    container.innerHTML = "<p class='loading'>Cargando tus comentarios realizados...</p>";

    try {
        const user = auth.currentUser;
        if (!user) return;

        const q = query(
            collection(db, "comments"),
            where("autor_id", "==", user.uid),
            orderBy("fecha", "desc")
        );

        const snapshot = await getDocs(q);
        container.innerHTML = "";

        if (snapshot.empty) {
            container.innerHTML = "<p class='no-secrets'>No has realizado ningún comentario todavía.</p>";
            return;
        }

        snapshot.forEach((docSnap) => {
            const comentario = docSnap.data();
            const card = document.createElement("div");
            card.className = "secret-card";
            card.style.borderLeft = "4px solid var(--accent-color)";

            card.innerHTML = `
                <p style="font-size: 12px; color: gray; margin: 0 0 5px 0;">Comentaste en un secreto:</p>
                <p class="secret-text" style="font-style: italic; color: #444;">"${comentario.texto}"</p>
                <div style="margin-top: 10px; text-align: right;">
                    <a href="#" class="view-linked-secret" data-id="${comentario.secreto_id}" style="font-size: 12px; color: var(--accent-color); text-decoration: none; font-weight: bold;">🔍 Ver Secreto Completo</a>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        container.innerHTML = "<p class='no-secrets'>Error al mapear tu historial.</p>";
    }
}

export function matarEscuchasComentarios() {
    if (unsubscribeComments) {
        unsubscribeComments();
        unsubscribeComments = null;
    }
}