// comments.js - Gestión de comentarios con hilos agrupados, corregida y blindada contra duplicados
import { 
    collection, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    onSnapshot,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db, auth } from "./firebase.js";

let unsubscribeComments = null;

// 1. ESCUCHAR COMENTARIOS EN TIEMPO REAL Y AGRUPARLOS POR HILOS
export function escucharComentarios(secretoId) {
    const listContainer = document.getElementById(`comments-list-${secretoId}`);
    const boxContainer = document.getElementById(`comments-box-${secretoId}`);
    if (!listContainer || !boxContainer) return;

    matarEscuchasComentarios();

    const tarjetaPadre = boxContainer.closest(".secret-card");
    const dueñoSecretoId = tarjetaPadre ? tarjetaPadre.getAttribute("data-author") : null;

    const q = query(
        collection(db, "comments"),
        where("secreto_id", "==", secretoId),
        orderBy("fecha", "asc")
    );

    unsubscribeComments = onSnapshot(q, (snapshot) => {
        listContainer.innerHTML = "";

        if (snapshot.empty) {
            listContainer.innerHTML = "<p style='font-size: 13px; color: gray; font-style: italic; margin: 5px 0;'>Nadie ha comentado aún... Sé el primero.</p>";
        } else {
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

            // Función auxiliar para renderizar un comentario en el HTML (BLINDADA)
            function crearElementoComentario(comentario, esRespuesta = false) {
                // 🛡️ CONTROL ANTI-DUPLICADO DE DOM: Si el ID ya existe en la caja, no hagas nada
                if (listContainer.querySelector(`[data-comment-id="${comentario.id}"]`)) {
                    return null; 
                }

                const div = document.createElement("div");
                div.setAttribute("data-comment-id", comentario.id); // Guardamos el ID único para rastrearlo
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
                            <strong style="color: var(--text-main);">${esRespuesta ? '↪️ Respuesta' : '👤 Anónimo'}:</strong> ${comentario.texto}
                        </span>
                        <button class="reply-comment-btn" data-id="${secretoId}" data-comentario-id="${esRespuesta ? comentario.padre_id : comentario.id}" style="background: none; border: none; cursor: pointer; font-size: 11px; color: var(--accent-color); opacity: 0.8; padding: 2px 5px; white-space: nowrap; font-weight: bold;">
                            💬 Responder
                        </button>
                    </div>
                `;
                return div;
            }

            // 🌟 RENDERIZADO ÚNICO CORREGIDO: Eliminamos el bloque duplicado que causaba el doble envío visual
            principales.forEach((principal) => {
                const elemPrincipal = crearElementoComentario(principal, false);
                if (elemPrincipal) listContainer.appendChild(elemPrincipal);

                const respuestasDelPadre = respuestas.filter(r => r.padre_id === principal.id);
                respuestasDelPadre.forEach((respuesta) => {
                    const elemRespuesta = crearElementoComentario(respuesta, true);
                    if (elemRespuesta) listContainer.appendChild(elemRespuesta);
                });
            });
        }

        let formularioExistente = boxContainer.querySelector(".comment-form-container");
        if (!formularioExistente) {
            const formDiv = document.createElement("div");
            formDiv.className = "comment-form-container";
            formDiv.innerHTML = `
                <form class="comment-form" data-id="${secretoId}" data-author="${dueñoSecretoId || ''}" data-padre-id="" style="display: flex; flex-direction: column; gap: 5px; width: 100%; margin-top: 15px; border-top: 1px dashed var(--border-color); padding-top: 10px;">
                    <div style="display: flex; gap: 8px; align-items: flex-end; width: 100%;">
                        <textarea class="comment-textarea" rows="1" maxlength="500" placeholder="Escribe un comentario..." required style="flex-grow: 1; padding: 10px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 13.5px; resize: none; overflow-y: hidden; box-sizing: border-box; background: var(--bg-card); color: var(--text-main); font-family: inherit; line-height: 1.4; max-height: 120px;"></textarea>
                        <button type="submit" class="submit-comment-btn" style="background-color: var(--accent-color); color: white; border: none; border-radius: 8px; padding: 0 15px; font-weight: bold; font-size: 13.5px; cursor: pointer; height: 38px; white-space: nowrap;">Enviar</button>
                    </div>
                    <span class="char-counter" style="font-size: 11px; color: gray; text-align: right; margin-right: 5px; margin-top: 2px;">0 / 500</span>
                </form>
            `;
            boxContainer.appendChild(formDiv);
        }
    }, (error) => {
        console.error("Error al escuchar comentarios:", error);
    });
}

// 🛡️ --- CONTROL DE ESCUCHADORES GLOBALES CON FILTRO ANTI-DUPLICADO ---
if (!window.comentariosListenersActivos) {
    window.comentariosListenersActivos = true;

    // 2. ESCUCHADOR DE CLICS PARA SELECCIONAR RESPUESTAS (Con candado de invitado integrado)
    document.addEventListener("click", (e) => {
        if (e.target && e.target.classList.contains("reply-comment-btn")) {
            
            // 🛡️ Si no hay usuario logueado, disparamos la función global de alerta
            if (!auth.currentUser) {
                if (typeof window.mostrarAlertaInvitado === "function") {
                    window.mostrarAlertaInvitado();
                } else {
                    alert("Necesitas una cuenta anónima para poder responder.");
                }
                return;
            }

            const secretoId = e.target.getAttribute("data-id");
            const comentarioId = e.target.getAttribute("data-comentario-id");
            
            const boxContainer = document.getElementById(`comments-box-${secretoId}`);
            if (!boxContainer) return;
            
            const formulario = boxContainer.querySelector(".comment-form");
            const textarea = boxContainer.querySelector(".comment-textarea");
            
            if (formulario && textarea) {
                formulario.setAttribute("data-padre-id", comentarioId);
                textarea.placeholder = "Escribe tu respuesta al comentario...";
                textarea.focus();
            }
        }
    });

    // 3. ESCUCHADOR PARA ENVIAR EL FORMULARIO (Comentario o Respuesta)
    document.addEventListener("submit", async (e) => {
        if (e.target && e.target.classList.contains("comment-form")) {
            e.preventDefault();
            const formulario = e.target;
            const secretoId = formulario.getAttribute("data-id");
            const dueñoSecretoId = formulario.getAttribute("data-author");
            const padreId = formulario.getAttribute("data-padre-id") || null;
            
            const textarea = formulario.querySelector(".comment-textarea");
            const texto = textarea.value.trim();
            if (!texto) return;

            const btn = formulario.querySelector(".submit-comment-btn");
            if (btn) btn.disabled = true;

            await guardarComentario(secretoId, texto, dueñoSecretoId, padreId);
            
            // Restaurar estado original limpio
            textarea.value = "";
            textarea.style.height = "auto";
            formulario.setAttribute("data-padre-id", "");
            textarea.placeholder = "Escribe un comentario...";
            
            const counter = formulario.querySelector(".char-counter");
            if (counter) counter.innerText = "0 / 500";
            if (btn) btn.disabled = false;
        }
    });

    // 4. ESCUCHADOR PARA EFECTO AUTO-GROW Y CONTADOR DE CARACTERES
    document.addEventListener("input", (e) => {
        if (e.target && e.target.classList.contains("comment-textarea")) {
            const textarea = e.target;
            textarea.style.height = "auto";
            textarea.style.height = textarea.scrollHeight + "2px";
            
            const form = textarea.closest("form");
            if (form) {
                const counter = form.querySelector(".char-counter");
                if (counter) {
                    counter.innerText = `${textarea.value.length} / 500`;
                }
            }
        }
    });
}

// 5. GUARDAR UN NUEVO COMENTARIO EN FIRESTORE
export async function guardarComentario(secretoId, texto, dueñoSecretoId, padreId = null) {
    try {
        const user = auth.currentUser;
        if (!user) return;

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

// 6. CARGAR HISTORIAL ESTÁTICO DE MIS COMENTARIOS
export async function cargarMisComentarios() {
    const container = document.getElementById("secrets-container");
    if (!container) return;
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
                <p class="secret-text" style="font-style: italic; color: var(--text-main);">"${comentario.texto}"</p>
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

// 7. DESCONECTAR ESCUCHAS EN TIEMPO REAL
export function matarEscuchasComentarios() {
    if (unsubscribeComments) {
        unsubscribeComments();
        unsubscribeComments = null;
    }
}