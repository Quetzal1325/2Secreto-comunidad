// comments.js - Gestión de comentarios y moderación automática en tiempo real
import { 
    collection, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    onSnapshot,
    getDocs,
    doc,         // Para apuntar al comentario específico
    updateDoc,   // Para actualizar los campos del comentario
    increment    // Para subir el contador de reportes de 1 en 1 de forma segura
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db, auth } from "./firebase.js";

let unsubscribeComments = null; // Almacena el desuscribidor activo

// 1. ESCUCHAR COMENTARIOS EN TIEMPO REAL (CON FILTRO DE MODERACIÓN)
export function escucharComentarios(secretoId) {
    const listContainer = document.getElementById(`comments-list-${secretoId}`);
    if (!listContainer) return;

    // Matamos cualquier escucha activa previa para no duplicar sockets
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

        snapshot.forEach((docSnap) => {
            const comentario = docSnap.data();
            
            // 🛡️ FILTRO DE BANEO SUAVE: Si el comentario ya juntó 5 o más reportes, se oculta del feed
            if (comentario.reportes >= 5) return;

            const div = document.createElement("div");
            div.style.padding = "8px 0";
            div.style.borderBottom = "1px solid #f1f2f6";
            div.style.fontSize = "13.5px";
            
            // Renderizamos el texto del comentario junto con su botón discreto de reporte (banderita 🚩)
            div.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 10px;">
                    <span style="color: var(--text-main); word-break: break-word;">
                        <strong style="color: #333;">Anónimo:</strong> ${comentario.texto}
                    </span>
                    <button class="report-comment-btn" data-id="${docSnap.id}" title="Denunciar comentario inapropiado" style="background: none; border: none; cursor: pointer; font-size: 11px; color: #ff4757; opacity: 0.6; padding: 2px 5px; white-space: nowrap; transition: opacity 0.2s;">
                        🚩 Reportar
                    </button>
                </div>
            `;
            listContainer.appendChild(div);
        });
    }, (error) => {
        console.error("Error al escuchar comentarios en tiempo real:", error);
    });
}

// 2. GUARDAR UN NUEVO COMENTARIO (CON ALERTA AL DUEÑO)
export async function guardarComentario(secretoId, texto, dueñoSecretoId) {
    try {
        const user = auth.currentUser;
        if (!user) return alert("Inicia sesión para comentar.");

        // Guardamos el comentario con el campo de reportes inicializado en 0
        await addDoc(collection(db, "comments"), {
            secreto_id: secretoId,
            texto: texto,
            autor_id: user.uid,
            fecha: new Date(),
            reportes: 0 // Todos los comentarios nacen limpios
        });

        // Si el que comenta NO es el dueño del secreto, le disparamos una notificación flotante
        if (dueñoSecretoId && dueñoSecretoId !== user.uid) {
            await addDoc(collection(db, "notifications"), {
                para_usuario_id: dueñoSecretoId,
                secreto_id: secretoId,
                texto_preview: texto.substring(0, 40) + "...",
                leida: false,
                fecha: new Date()
            });
        }

        console.log("Comentario y validación de alerta procesados!");
    } catch (error) {
        console.error("Error al procesar el comentario:", error);
    }
}

// 3. EJECUTAR DENUNCIA DE UN COMENTARIO (INCREMENTAR REPORTES)
export async function denunciarComentario(comentarioId) {
    try {
        const comentarioRef = doc(db, "comments", comentarioId);
        
        // increment(1) actualiza el valor atómicamente directo en los servidores de Firebase
        await updateDoc(comentarioRef, {
            reportes: increment(1)
        });
        
        console.log(`Comentario ${comentarioId} reportado exitosamente.`);
        return true;
    } catch (error) {
        console.error("Error al registrar denuncia del comentario:", error);
        return false;
    }
}

// 4. CARGAR HISTORIAL ESTÁTICO DE MIS COMENTARIOS
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
            
            // Ignoramos también en tu historial si por alguna razón fue baneado masivamente
            if (comentario.reportes >= 5) return;

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
        console.error("Error al cargar el historial de comentarios:", error);
        container.innerHTML = "<p class='no-secrets'>Error al mapear tu historial de comentarios.</p>";
    }
}

// 5. APAGAR LOS SOCKETS ACTIVOS DE COMENTARIOS
export function matarEscuchasComentarios() {
    if (unsubscribeComments) {
        unsubscribeComments();
        unsubscribeComments = null;
    }
}