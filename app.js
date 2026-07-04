// app.js - Versión unificada con Notificaciones y Tiempo Real
import { toggleAuthMode } from "./ui.js";
import { registrarUsuario, iniciarSesion, cerrarSesion } from "./auth.js";
import { guardarSecreto, cargarFeed } from "./secrets.js"; 
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { auth } from "./firebase.js";

document.addEventListener("DOMContentLoaded", () => {
    // ==========================================================================
    // LÓGICA COMPLETA DEL MODO OSCURO (PERSISTENTE)
    // ==========================================================================
    const themeToggleBtn = document.getElementById("theme-toggle-btn");
    
    // 1. Verificar si el usuario ya tenía una preferencia guardada en su celular/computadora
    const currentTheme = localStorage.getItem("theme");
    if (currentTheme === "dark") {
        document.body.classList.add("dark-mode");
        themeToggleBtn.innerText = "☀️"; // Si está oscuro, mostramos el sol
    }

    // 2. Escuchar el evento de clic para alternar las luces
    themeToggleBtn.addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");
        
        // Validamos si se quedó activa la clase oscura para guardarla en memoria
        if (document.body.classList.contains("dark-mode")) {
            localStorage.setItem("theme", "dark");
            themeToggleBtn.innerText = "☀️";
        } else {
            localStorage.setItem("theme", "light");
            themeToggleBtn.innerText = "🌙";
        }
    });

    let isLoginMode = false; 
    let currentFeedNsfw = false;

    // --- ELEMENTOS DEL DOM ---
    const authForm = document.getElementById("auth-form");
    const secretForm = document.getElementById("secret-form");
    const logoutBtnNav = document.getElementById("logout-btn-nav");
    const tabNormal = document.getElementById("tab-normal");
    const tabNsfw = document.getElementById("tab-nsfw");
    const feedTitle = document.getElementById("feed-title");
    
    const navPublishTrigger = document.getElementById("nav-publish-trigger");
    const publishContainer = document.getElementById("publish-container");
    const cancelPublishBtn = document.getElementById("cancel-publish-btn");
    const secretsContainer = document.getElementById("secrets-container");

    const mySecretsBtn = document.getElementById("my-secrets-btn");
    const myCommentsBtn = document.getElementById("my-comments-btn");

    // Elementos de la Campana de Alertas
    const navNotifTrigger = document.getElementById("nav-notifications-trigger");
    const notifContainer = document.getElementById("notifications-container");
    const clearNotifBtn = document.getElementById("clear-notif-btn");

    // --- MANEJO DEL PANEL DE NOTIFICACIONES ---
    navNotifTrigger.addEventListener("click", () => {
        notifContainer.style.display = notifContainer.style.display === "none" ? "block" : "none";
    });

    clearNotifBtn.addEventListener("click", async () => {
        const { marcarNotificacionesComoLeidas } = await import("./notifications.js");
        await marcarNotificacionesComoLeidas();
    });

    // Cerrar el panel de notificaciones si hacen clic afuera
    document.addEventListener("click", (e) => {
        if (!navNotifTrigger.contains(e.target) && !notifContainer.contains(e.target)) {
            notifContainer.style.display = "none";
        }
    });

    // --- CONTROL DE PUBLICACIÓN (MODAL/TOGGLE) ---
    navPublishTrigger.addEventListener("click", () => {
        publishContainer.style.display = publishContainer.style.display === "none" ? "block" : "none";
    });

    cancelPublishBtn.addEventListener("click", () => {
        publishContainer.style.display = "none";
    });

    // --- CAMBIO DE FEED DESDE LA NAVBAR ---
    tabNormal.addEventListener("click", async () => {
        currentFeedNsfw = false;
        tabNormal.classList.add("active");
        tabNsfw.classList.remove("active");
        feedTitle.innerText = "😇 Secretos Recientes";
        
        const { matarEscuchasComentarios } = await import("./comments.js");
        matarEscuchasComentarios();
        
        cargarFeed(false);
    });

    tabNsfw.addEventListener("click", async () => {
        currentFeedNsfw = true;
        tabNsfw.classList.add("active");
        tabNormal.classList.remove("active");
        feedTitle.innerText = "🌶️ Contenido NSFW / Morboso";
        
        const { matarEscuchasComentarios } = await import("./comments.js");
        matarEscuchasComentarios();
        
        cargarFeed(true);
    });

    // --- INTERCAMBIO DE VISTA LOGIN / REGISTRO ---
    document.getElementById("auth-section").addEventListener("click", (e) => {
        if (e.target.id === "go-to-login") {
            isLoginMode = true;
            toggleAuthMode(true);
        }
        if (e.target.id === "go-to-register") {
            isLoginMode = false;
            toggleAuthMode(false);
        }
    });

    // --- ENVÍO DE FORMULARIO AUTH (REGISTRO O LOGIN) ---
    authForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        if (isLoginMode) {
            iniciarSesion(email, password);
        } else {
            const age = document.getElementById("age").value;
            const gender = document.getElementById("gender").value;
            registrarUsuario(email, password, age, gender);
        }
    });

    // app.js - Actualiza el envío del formulario de secretos:
    secretForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const texto = document.getElementById("secret-text").value;
        const esNsfw = document.getElementById("secret-nsfw").checked;
        const tmpyCode = document.getElementById("secret-tmpy").value; // <-- NUEVO

        const exito = await guardarSecreto(texto, esNsfw, tmpyCode); // <-- Pasamos el código
        if (exito) {
            secretForm.reset();
            publishContainer.style.display = "none";
        }
    });

    // ==========================================================================
    // INTERACCIONES DEL FEED (REACCIONES, COMENTARIOS, DENUNCIAS Y RESPUESTAS)
    // ==========================================================================
    secretsContainer.addEventListener("click", async (e) => {
        
        // A) Reacciones
        const botonReaccion = e.target.closest(".react-btn");
        if (botonReaccion) {
            const secretoId = botonReaccion.getAttribute("data-id");
            const tipoReaccion = botonReaccion.getAttribute("data-type");
            const { darReaccion } = await import("./secrets.js");
            darReaccion(secretoId, tipoReaccion);
            return;
        }

        // B) Desplegar Comentarios
        if (e.target.classList.contains("comment-toggle-btn")) {
            const secretoId = e.target.getAttribute("data-id");
            const box = document.getElementById(`comments-box-${secretoId}`);
            
            if (box.style.display === "none") {
                box.style.display = "block";
                const { escucharComentarios } = await import("./comments.js");
                escucharComentarios(secretoId);
                e.target.innerText = "💬 Ocultar Comentarios";
            } else {
                box.style.display = "none";
                e.target.innerText = "💬 Ver Comentarios";
            }
            return;
        }

        // E) Evento para Responder a un comentario existente (Guardando el comentario_id padre)
        const btnResponderComentario = e.target.closest(".reply-comment-btn");
        if (btnResponderComentario) {
            const secretoId = btnResponderComentario.getAttribute("data-id");
            const comentarioPadreId = btnResponderComentario.getAttribute("data-comentario-id");
            
            const contenedorComentarios = btnResponderComentario.closest(".comments-section") || btnResponderComentario.closest("[id^='comments-box-']");
            
            if (contenedorComentarios) {
                const inputComentario = contenedorComentarios.querySelector("input");
                const formulario = contenedorComentarios.querySelector(".comment-form");
                
                if (inputComentario && formulario) {
                    // Guardamos temporalmente el ID del padre en el formulario para usarlo en el Submit
                    formulario.setAttribute("data-padre-id", comentarioPadreId || "");
                    
                    const mencion = "↪️ @Anónimo: ";
                    if (!inputComentario.value.includes(mencion)) {
                        inputComentario.value = mencion;
                    }
                    inputComentario.focus();
                }
            }
            return;
        }

        // app.js - Agregar dentro del eventListener de clics de secretsContainer:

        // F) NUEVO: Denunciar Secreto Completo (Moderación del Feed)
        const btnReportarSecreto = e.target.closest(".report-secret-btn");
        if (btnReportarSecreto) {
            const secretoId = btnReportarSecreto.getAttribute("data-id");
            
            Swal.fire({
                title: '¿Denunciar secreto?',
                text: "Si junta suficientes reportes se borrará permanentemente del feed principal.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ff4757',
                cancelButtonColor: '#a4b0be',
                confirmButtonText: 'Sí, denunciar',
                cancelButtonText: 'Cancelar',
                background: document.body.classList.contains('dark-mode') ? '#1e1e1e' : '#ffffff',
                color: document.body.classList.contains('dark-mode') ? '#f5f6fa' : '#333333'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    const { denunciarSecreto } = await import("./secrets.js");
                    const exito = await denunciarSecreto(secretoId);
                    if (exito) {
                        Swal.fire({
                            title: 'Secreto Reportado',
                            text: 'La comunidad está moderando el feed principal.',
                            icon: 'success',
                            background: document.body.classList.contains('dark-mode') ? '#1e1e1e' : '#ffffff',
                            color: document.body.classList.contains('dark-mode') ? '#f5f6fa' : '#333333'
                        });
                        btnReportarSecreto.style.opacity = "0.3";
                        btnReportarSecreto.disabled = true;
                        btnReportarSecreto.innerText = "🚩 Reportado";
                    }
                }
            });
            return;
        }
    });

    // D) Enviar un nuevo comentario (Guardando en la estructura anidada o de primer nivel)
    secretsContainer.addEventListener("submit", async (e) => {
        if (e.target.classList.contains("comment-form")) {
            e.preventDefault();
            
            const secretoId = e.target.getAttribute("data-id");
            const dueñoSecretoId = e.target.getAttribute("data-author"); 
            const padreId = e.target.getAttribute("data-padre-id") || null; // <-- Obtenemos el ID del padre si existe
            const input = e.target.querySelector("input");
            const texto = input.value;

            const { guardarComentario } = await import("./comments.js");
            // Pasamos el padreId como cuarto argumento
            await guardarComentario(secretoId, texto, dueñoSecretoId, padreId);
            
            // Limpiamos los inputs y el atributo temporal
            input.value = "";
            e.target.removeAttribute("data-padre-id");
        }
    });

    // --- ENLACES DEL PERFIL DE USUARIO ---
    mySecretsBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        feedTitle.innerText = "📝 Mis Secretos Publicados";
        tabNormal.classList.remove("active");
        tabNsfw.classList.remove("active");
        
        const { matarEscuchasComentarios } = await import("./comments.js");
        matarEscuchasComentarios();
        
        const { cargarMisSecretos } = await import("./secrets.js");
        cargarMisSecretos();
    });

    myCommentsBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        feedTitle.innerText = "💬 Mis Comentarios Realizados";
        tabNormal.classList.remove("active");
        tabNsfw.classList.remove("active");
        
        const { matarEscuchasComentarios, cargarMisComentarios } = await import("./comments.js");
        matarEscuchasComentarios();
        
        cargarMisComentarios();
    });

    // Cerrar sesión
    logoutBtnNav.addEventListener("click", async (e) => {
        e.preventDefault();
        const { matarEscuchasComentarios } = await import("./comments.js");
        matarEscuchasComentarios();
        
        const { apagarNotificaciones } = await import("./notifications.js");
        apagarNotificaciones();
        
        cerrarSesion();
    });

    // --- OBSERVADOR DE SESIÓN DE FIREBASE ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            cargarFeed(currentFeedNsfw);
            
            // En cuanto inicie sesión, encendemos el radar de notificaciones en tiempo real
            import("./notifications.js").then(({ escucharNotificaciones }) => {
                escucharNotificaciones();
            });
        }
    });
});