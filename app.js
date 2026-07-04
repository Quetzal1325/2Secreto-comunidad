// app.js - Versión unificada con Modo Invitado, Notificaciones y Tiempo Real (Limpiado y Optimizado)
import { toggleAuthMode } from "./ui.js";
import { registrarUsuario, iniciarSesion, cerrarSesion } from "./auth.js";
import { guardarSecreto, cargarFeed } from "./secrets.js"; 
import { auth } from "./firebase.js";

// 🌟 EXPONEMOS LA FUNCIÓN DE ALERTA AL OBJETO GLOBAL WINDOW
// Esto permite que comments.js la invoque directamente con los candados de invitado
window.mostrarAlertaInvitado = function() {
    Swal.fire({
        title: '¡Únete a la comunidad! 🤫',
        text: 'Necesitas una cuenta anónima para poder publicar, comentar o reaccionar a los secretos.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#c471ed',
        cancelButtonColor: '#a4b0be',
        confirmButtonText: 'Crear cuenta / Login',
        cancelButtonText: 'Seguir leyendo',
        background: document.body.classList.contains('dark-mode') ? '#1e1e1e' : '#ffffff',
        color: document.body.classList.contains('dark-mode') ? '#f5f6fa' : '#333333'
    }).then((result) => {
        if (result.isConfirmed) {
            const authContainer = document.getElementById("auth-container");
            const appContainer = document.getElementById("app-container");
            
            if (appContainer) appContainer.style.display = "none";
            if (authContainer) authContainer.style.display = "block";
        }
    });
};

document.addEventListener("DOMContentLoaded", () => {
    // ==========================================================================
    // LÓGICA COMPLETA DEL MODO OSCURO (PERSISTENTE)
    // ==========================================================================
    const themeToggleBtn = document.getElementById("theme-toggle-btn");
    
    const currentTheme = localStorage.getItem("theme");
    if (currentTheme === "dark") {
        document.body.classList.add("dark-mode");
        if (themeToggleBtn) themeToggleBtn.innerText = "☀️";
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener("click", () => {
            document.body.classList.toggle("dark-mode");
            if (document.body.classList.contains("dark-mode")) {
                localStorage.setItem("theme", "dark");
                themeToggleBtn.innerText = "☀️";
            } else {
                localStorage.setItem("theme", "light");
                themeToggleBtn.innerText = "🌙";
            }
        });
    }

    let isLoginMode = false; 
    let currentFeedNsfw = false;

    // --- ELEMENTOS DEL DOM ---
    const authForm = document.getElementById("auth-form");
    const secretForm = document.getElementById("secret-form");
    const tabNormal = document.getElementById("tab-normal");
    const tabNsfw = document.getElementById("tab-nsfw");
    const feedTitle = document.getElementById("feed-title");
    
    const navPublishTrigger = document.getElementById("nav-publish-trigger");
    const publishContainer = document.getElementById("publish-container");
    const cancelPublishBtn = document.getElementById("cancel-publish-btn");
    const secretsContainer = document.getElementById("secrets-container");

    const navNotifTrigger = document.getElementById("nav-notifications-trigger");
    const notifContainer = document.getElementById("notifications-container");
    const clearNotifBtn = document.getElementById("clear-notif-btn");

    // --- MANEJO DEL PANEL DE NOTIFICACIONES ---
    if (navNotifTrigger) {
        navNotifTrigger.addEventListener("click", () => {
            notifContainer.style.display = notifContainer.style.display === "none" ? "block" : "none";
        });
    }

    if (clearNotifBtn) {
        clearNotifBtn.addEventListener("click", async () => {
            const { marcarNotificacionesComoLeidas } = await import("./notifications.js");
            await marcarNotificacionesComoLeidas();
        });
    }

    document.addEventListener("click", (e) => {
        if (navNotifTrigger && notifContainer) {
            if (!navNotifTrigger.contains(e.target) && !notifContainer.contains(e.target)) {
                notifContainer.style.display = "none";
            }
        }
    });

    // --- CONTROL DE PUBLICACIÓN (MODAL/TOGGLE CON CANDADO) ---
    if (navPublishTrigger) {
        navPublishTrigger.addEventListener("click", () => {
            if (!auth.currentUser) {
                window.mostrarAlertaInvitado();
                return;
            }
            publishContainer.style.display = publishContainer.style.display === "none" ? "block" : "none";
        });
    }

    if (cancelPublishBtn) {
        cancelPublishBtn.addEventListener("click", () => {
            publishContainer.style.display = "none";
        });
    }

    // --- CAMBIO DE FEED DESDE LA NAVBAR ---
    if (tabNormal) {
        tabNormal.addEventListener("click", async () => {
            currentFeedNsfw = false;
            tabNormal.classList.add("active");
            if (tabNsfw) tabNsfw.classList.remove("active");
            if (feedTitle) feedTitle.innerText = "😇 Secretos Recientes";
            
            const { matarEscuchasComentarios } = await import("./comments.js");
            matarEscuchasComentarios();
            cargarFeed(false);
        });
    }

    if (tabNsfw) {
        tabNsfw.addEventListener("click", async () => {
            currentFeedNsfw = true;
            tabNsfw.classList.add("active");
            if (tabNormal) tabNormal.classList.remove("active");
            if (feedTitle) feedTitle.innerText = "🌶️ Contenido NSFW / Morboso";
            
            const { matarEscuchasComentarios } = await import("./comments.js");
            matarEscuchasComentarios();
            cargarFeed(true);
        });
    }

    // --- INTERCAMBIO DE VISTA LOGIN / REGISTRO ---
    const authSection = document.getElementById("auth-section");
    if (authSection) {
        authSection.addEventListener("click", (e) => {
            if (e.target.id === "go-to-login") {
                isLoginMode = true;
                toggleAuthMode(true);
            }
            if (e.target.id === "go-to-register") {
                isLoginMode = false;
                toggleAuthMode(false);
            }
        });
    }

    // --- ENVÍO DE FORMULARIO AUTH (REGISTRO O LOGIN) ---
    if (authForm) {
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
    }

    // --- ENVÍO DE FORMULARIO DE SECRETOS ---
    if (secretForm) {
        secretForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!auth.currentUser) {
                window.mostrarAlertaInvitado();
                return;
            }

            const texto = document.getElementById("secret-text").value;
            const esNsfw = document.getElementById("secret-nsfw").checked;
            const tmpyCode = document.getElementById("secret-tmpy").value; 

            const exito = await guardarSecreto(texto, esNsfw, tmpyCode); 
            if (exito) {
                secretForm.reset();
                publishContainer.style.display = "none";
            }
        });
    }

    // ==========================================================================
    // INTERACCIONES DEL FEED (REACCIONES, DESPLIEGUE DE COMENTARIOS Y REPORTES)
    // ==========================================================================
    if (secretsContainer) {
        secretsContainer.addEventListener("click", async (e) => {
            
            // A) Reacciones (Con candado de invitado)
            const botonReaccion = e.target.closest(".react-btn");
            if (botonReaccion) {
                if (!auth.currentUser) {
                    window.mostrarAlertaInvitado();
                    return;
                }
                const secretoId = botonReaccion.getAttribute("data-id");
                const tipoReaccion = botonReaccion.getAttribute("data-type");
                const { darReaccion } = await import("./secrets.js");
                darReaccion(secretoId, tipoReaccion);
                return;
            }

            // B) Desplegar Comentarios (Los invitados pueden leer el chisme)
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

            // C) Denunciar Secreto Completo
            const btnReportarSecreto = e.target.closest(".report-secret-btn");
            if (btnReportarSecreto) {
                if (!auth.currentUser) {
                    window.mostrarAlertaInvitado();
                    return;
                }
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
    }

    // ==========================================================================
    // ESCUCHADOR DE NAVEGACIÓN DE MENÚS CON FILTRO DE DELEGACIÓN ÚNICO
    // ==========================================================================
    document.addEventListener("click", async (e) => {
        const id = e.target.id;
        
        if (id === "my-secrets-btn") {
            e.preventDefault();
            if (feedTitle) feedTitle.innerText = "📝 Mis Secretos Publicados";
            if (tabNormal) tabNormal.classList.remove("active");
            if (tabNsfw) tabNsfw.classList.remove("active");
            
            const { matarEscuchasComentarios } = await import("./comments.js");
            matarEscuchasComentarios();
            const { cargarMisSecretos } = await import("./secrets.js");
            cargarMisSecretos();
        }

        if (id === "my-comments-btn") {
            e.preventDefault();
            if (feedTitle) feedTitle.innerText = "💬 Mis Comentarios Realizados";
            if (tabNormal) tabNormal.classList.remove("active");
            if (tabNsfw) tabNsfw.classList.remove("active");
            
            const { matarEscuchasComentarios, cargarMisComentarios } = await import("./comments.js");
            matarEscuchasComentarios();
            cargarMisComentarios();
        }

        if (id === "logout-btn-nav") {
            e.preventDefault();
            const { matarEscuchasComentarios } = await import("./comments.js");
            matarEscuchasComentarios();
            const { apagarNotificaciones } = await import("./notifications.js");
            apagarNotificaciones();
            cerrarSesion();
        }

        if (id === "guest-login-btn") {
            e.preventDefault();
            isLoginMode = true;
            toggleAuthMode(true);
            document.getElementById("app-container").style.display = "none";
            document.getElementById("auth-container").style.display = "block";
        }

        if (id === "guest-register-btn") {
            e.preventDefault();
            isLoginMode = false;
            toggleAuthMode(false);
            document.getElementById("app-container").style.display = "none";
            document.getElementById("auth-container").style.display = "block";
        }
    });

    // --- OBSERVADOR DE SESIÓN DE FIREBASE (MENÚ DINÁMICO) ---
    auth.onAuthStateChanged((user) => {
        const authContainer = document.getElementById("auth-container");
        const appContainer = document.getElementById("app-container");
        const dropdownContent = document.getElementById("dropdown-menu-content");
        const navNotifTrigger = document.getElementById("nav-notifications-trigger");

        if (user) {
            console.log("Usuario logueado con éxito:", user.uid);
            if (authContainer) authContainer.style.display = "none";
            if (appContainer) appContainer.style.display = "block";
            if (navNotifTrigger) navNotifTrigger.style.display = "flex";

            if (dropdownContent) {
                dropdownContent.innerHTML = `
                    <a href="#" id="my-secrets-btn">📝 Mis Secretos</a>
                    <a href="#" id="my-comments-btn">💬 Mis Comentarios</a>
                    <hr>
                    <a href="#" id="logout-btn-nav" class="logout-link">🚪 Cerrar Sesión</a>
                `;
            }
            cargarFeed(false); 
        } else {
            console.log("Modo Invitado Activo 👀");
            if (authContainer) authContainer.style.display = "none";
            if (appContainer) appContainer.style.display = "block";
            if (navNotifTrigger) navNotifTrigger.style.display = "none";

            if (dropdownContent) {
                dropdownContent.innerHTML = `
                    <a href="#" id="guest-login-btn" style="font-weight: bold; color: var(--accent-color);">🔑 Iniciar Sesión</a>
                    <a href="#" id="guest-register-btn">📝 Registrarse</a>
                `;
            }
            cargarFeed(false);
        }
    });

}); // <-- CIERRE DOMContentLoaded

// ==========================================================================
// 🚀 LÓGICA DE INSTALACIÓN PWA (BOTÓN FLOTANTE)
// ==========================================================================
let deferredPrompt;
const installBtn = document.getElementById('pwa-install-btn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.style.display = 'flex';
});

if (installBtn) {
    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`El usuario decidió: ${outcome}`);
            deferredPrompt = null;
            installBtn.style.display = 'none';
        }
    });
}

window.addEventListener('appinstalled', () => {
    console.log('¡La PWA ha sido instalada con éxito, capitán!');
    if (installBtn) installBtn.style.display = 'none';
});