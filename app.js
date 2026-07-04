// app.js - Versión unificada con Modo Invitado, Notificaciones y Tiempo Real
import { toggleAuthMode } from "./ui.js";
import { registrarUsuario, iniciarSesion, cerrarSesion } from "./auth.js";
import { guardarSecreto, cargarFeed } from "./secrets.js"; 
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
        if (themeToggleBtn) themeToggleBtn.innerText = "☀️";
    }

    // 2. Escuchar el evento de clic para alternar las luces
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

    // Cerrar el panel de notificaciones si hacen clic afuera
    document.addEventListener("click", (e) => {
        if (navNotifTrigger && notifContainer) {
            if (!navNotifTrigger.contains(e.target) && !notifContainer.contains(e.target)) {
                notifContainer.style.display = "none";
            }
        }
    });

    // --- EFECTO AUTO-GROW Y CONTADOR PARA LOS TEXTAREAS DE COMENTARIOS ---
    secretsContainer.addEventListener("input", (e) => {
        if (e.target.classList.contains("comment-textarea")) {
            const textarea = e.target;
            
            // 1. Auto-ajustar la altura dinámicamente
            textarea.style.height = "auto"; // Reseteamos
            textarea.style.height = textarea.scrollHeight + "px"; // Le damos la altura del contenido real

            // 2. Actualizar el contador de caracteres del formulario correspondiente
            const formulario = textarea.closest(".comment-form");
            if (formulario) {
                const contador = formulario.querySelector(".char-counter");
                if (contador) {
                    const caracteresActuales = textarea.value.length;
                    contador.innerText = `${caracteresActuales} / 500`;
                    
                    // Si se acerca al límite, lo pintamos de rojo de advertencia
                    if (caracteresActuales >= 450) {
                        contador.style.color = "#ff4757";
                    } else {
                        contador.style.color = "gray";
                    }
                }
            }
        }
    });

    // --- CONTROL DE PUBLICACIÓN (MODAL/TOGGLE CON CANDADO) ---
    if (navPublishTrigger) {
        navPublishTrigger.addEventListener("click", () => {
            if (!auth.currentUser) {
                mostrarAlertaInvitado();
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
                mostrarAlertaInvitado();
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
    // INTERACCIONES DEL FEED (REACCIONES, COMENTARIOS, RESPUESTAS Y REPORTES)
    // ==========================================================================
    if (secretsContainer) {
        secretsContainer.addEventListener("click", async (e) => {
            
            // A) Reacciones (Con candado de invitado)
            const botonReaccion = e.target.closest(".react-btn");
            if (botonReaccion) {
                if (!auth.currentUser) {
                    mostrarAlertaInvitado();
                    return;
                }
                
                const secretoId = botonReaccion.getAttribute("data-id");
                const tipoReaccion = botonReaccion.getAttribute("data-type");
                const { darReaccion } = await import("./secrets.js");
                darReaccion(secretoId, tipoReaccion);
                return;
            }

            // B) Desplegar Comentarios (PÚBLICO: Los invitados pueden leer el chisme)
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

            // E) Evento para Responder a un comentario existente (Con candado de invitado)
            const btnResponderComentario = e.target.closest(".reply-comment-btn");
            if (btnResponderComentario) {
                if (!auth.currentUser) {
                    mostrarAlertaInvitado();
                    return;
                }
                
                const secretoId = btnResponderComentario.getAttribute("data-id");
                const comentarioPadreId = btnResponderComentario.getAttribute("data-comentario-id");
                
                const contenedorComentarios = btnResponderComentario.closest(".comments-section") || btnResponderComentario.closest("[id^='comments-box-']");
                
                if (contenedorComentarios) {
                    const inputComentario = contenedorComentarios.querySelector("input");
                    const formulario = contenedorComentarios.querySelector(".comment-form");
                    
                    if (inputComentario && formulario) {
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

            // F) Denunciar Secreto Completo (Con candado de invitado)
            const btnReportarSecreto = e.target.closest(".report-secret-btn");
            if (btnReportarSecreto) {
                if (!auth.currentUser) {
                    mostrarAlertaInvitado();
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

            // D) Enviar un nuevo comentario actualizado para Textarea
        secretsContainer.addEventListener("submit", async (e) => {
            if (e.target.classList.contains("comment-form")) {
                e.preventDefault();
                
                if (!auth.currentUser) {
                    mostrarAlertaInvitado();
                    return;
                }
                
                const secretoId = e.target.getAttribute("data-id");
                const dueñoSecretoId = e.target.getAttribute("data-author"); 
                const padreId = e.target.getAttribute("data-padre-id") || null;
                
                // CORREGIDO: Buscamos la clase del textarea
                const textarea = e.target.querySelector(".comment-textarea");
                const texto = textarea.value;

                const { guardarComentario } = await import("./comments.js");
                await guardarComentario(secretoId, texto, dueñoSecretoId, padreId);
                
                // Limpiamos el texto, reseteamos la altura a una sola línea y el contador a 0
                textarea.value = "";
                textarea.style.height = "auto"; 
                e.target.removeAttribute("data-padre-id");
                
                const contador = e.target.querySelector(".char-counter");
                if (contador) contador.innerText = "0 / 500";
            }
        });
    }

    // --- ENLACES DEL PERFIL DE USUARIO ---
    if (mySecretsBtn) {
        mySecretsBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            if (feedTitle) feedTitle.innerText = "📝 Mis Secretos Publicados";
            if (tabNormal) tabNormal.classList.remove("active");
            if (tabNsfw) tabNsfw.classList.remove("active");
            
            const { matarEscuchasComentarios } = await import("./comments.js");
            matarEscuchasComentarios();
            
            const { cargarMisSecretos } = await import("./secrets.js");
            cargarMisSecretos();
        });
    }

    if (myCommentsBtn) {
        myCommentsBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            if (feedTitle) feedTitle.innerText = "💬 Mis Comentarios Realizados";
            if (tabNormal) tabNormal.classList.remove("active");
            if (tabNsfw) tabNsfw.classList.remove("active");
            
            const { matarEscuchasComentarios, cargarMisComentarios } = await import("./comments.js");
            matarEscuchasComentarios();
            
            cargarMisComentarios();
        });
    }

    // Cerrar sesión
    if (logoutBtnNav) {
        logoutBtnNav.addEventListener("click", async (e) => {
            e.preventDefault();
            const { matarEscuchasComentarios } = await import("./comments.js");
            matarEscuchasComentarios();
            
            const { apagarNotificaciones } = await import("./notifications.js");
            apagarNotificaciones();
            
            cerrarSesion();
        });
    }

    // --- OBSERVADOR DE SESIÓN DE FIREBASE (MENÚ DINÁMICO INTEGRADO) ---
    auth.onAuthStateChanged((user) => {
        const authContainer = document.getElementById("auth-container");
        const appContainer = document.getElementById("app-container");
        const dropdownContent = document.getElementById("dropdown-menu-content");
        const navNotifTrigger = document.getElementById("nav-notifications-trigger");

        if (user) {
            console.log("Usuario logueado con éxito:", user.uid);
            if (authContainer) authContainer.style.display = "none";
            if (appContainer) appContainer.style.display = "block";
            if (navNotifTrigger) navNotifTrigger.style.display = "flex"; // Mostramos campana

            // 🌟 INYECTAMOS MENÚ DE USUARIO REGISTRADO
            if (dropdownContent) {
                dropdownContent.innerHTML = `
                    <a href="#" id="my-secrets-btn">📝 Mis Secretos</a>
                    <a href="#" id="my-comments-btn">💬 Mis Comentarios</a>
                    <hr>
                    <a href="#" id="logout-btn-nav" class="logout-link">🚪 Cerrar Sesión</a>
                `;
                // Re-vinculamos los eventos a los nuevos botones inyectados
                conectarEventosMenuLogueado();
            }
            
            cargarFeed(false); 
        } else {
            console.log("Modo Invitado Activo 👀");
            if (authContainer) authContainer.style.display = "none";
            if (appContainer) appContainer.style.display = "block";
            if (navNotifTrigger) navNotifTrigger.style.display = "none"; // Ocultamos campana a invitados

            // 🌟 INYECTAMOS OPCIONES DE LOGIN / REGISTRO PARA INVITADOS
            if (dropdownContent) {
                dropdownContent.innerHTML = `
                    <a href="#" id="guest-login-btn" style="font-weight: bold; color: var(--accent-color);">🔑 Iniciar Sesión</a>
                    <a href="#" id="guest-register-btn">📝 Registrarse</a>
                `;
                // Vinculamos la acción para romper el modo invitado
                conectarEventosMenuInvitado();
            }
            
            cargarFeed(false);
        }
    });

    // --- FUNCIONES PARA RECONECTAR LOS EVENTOS DINÁMICOS ---
    function conectarEventosMenuLogueado() {
        const mySecretsBtn = document.getElementById("my-secrets-btn");
        const myCommentsBtn = document.getElementById("my-comments-btn");
        const logoutBtnNav = document.getElementById("logout-btn-nav");
        const feedTitle = document.getElementById("feed-title");
        const tabNormal = document.getElementById("tab-normal");
        const tabNsfw = document.getElementById("tab-nsfw");

        if (mySecretsBtn) {
            mySecretsBtn.addEventListener("click", async (e) => {
                e.preventDefault();
                if (feedTitle) feedTitle.innerText = "📝 Mis Secretos Publicados";
                if (tabNormal) tabNormal.classList.remove("active");
                if (tabNsfw) tabNsfw.classList.remove("active");
                const { matarEscuchasComentarios } = await import("./comments.js");
                matarEscuchasComentarios();
                const { cargarMisSecretos } = await import("./secrets.js");
                cargarMisSecretos();
            });
        }

        if (myCommentsBtn) {
            myCommentsBtn.addEventListener("click", async (e) => {
                e.preventDefault();
                if (feedTitle) feedTitle.innerText = "💬 Mis Comentarios Realizados";
                if (tabNormal) tabNormal.classList.remove("active");
                if (tabNsfw) tabNsfw.classList.remove("active");
                const { matarEscuchasComentarios, cargarMisComentarios } = await import("./comments.js");
                matarEscuchasComentarios();
                cargarMisComentarios();
            });
        }

        if (logoutBtnNav) {
            logoutBtnNav.addEventListener("click", async (e) => {
                e.preventDefault();
                const { matarEscuchasComentarios } = await import("./comments.js");
                matarEscuchasComentarios();
                const { apagarNotificaciones } = await import("./notifications.js");
                apagarNotificaciones();
                cerrarSesion();
            });
        }
    }

    function conectarEventosMenuInvitado() {
        const guestLoginBtn = document.getElementById("guest-login-btn");
        const guestRegisterBtn = document.getElementById("guest-register-btn");
        const authContainer = document.getElementById("auth-container");
        const appContainer = document.getElementById("app-container");

        if (guestLoginBtn) {
            guestLoginBtn.addEventListener("click", (e) => {
                e.preventDefault();
                isLoginMode = true;
                toggleAuthMode(true); // Activa formulario de Login
                if (appContainer) appContainer.style.display = "none";
                if (authContainer) authContainer.style.display = "block";
            });
        }

        if (guestRegisterBtn) {
            guestRegisterBtn.addEventListener("click", (e) => {
                e.preventDefault();
                isLoginMode = false;
                toggleAuthMode(false); // Activa formulario de Registro
                if (appContainer) appContainer.style.display = "none";
                if (authContainer) authContainer.style.display = "block";
            });
        }
    }

}); // <-- CIERRE CORRECTO DE DOMContentLoaded

// ==========================================================================
// FUNCIÓN GLOBAL AUXILIAR (VIVE AFUERA DEL DOM EN SANTA PAZ)
// ==========================================================================
function mostrarAlertaInvitado() {
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
}

// ==========================================================================
// 🚀 LÓGICA DE INSTALACIÓN PWA (BOTÓN FLOTANTE)
// ==========================================================================
let deferredPrompt;
const installBtn = document.getElementById('pwa-install-btn');

window.addEventListener('beforeinstallprompt', (e) => {
    // Previene que Chrome muestre el mini-infobar por defecto
    e.preventDefault();
    // Guarda el evento para poder dispararlo luego
    deferredPrompt = e;
    
    // Mostramos nuestro botón flotante elegante
    if (installBtn) {
        installBtn.style.display = 'flex';
    }
});

if (installBtn) {
    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            // Muestra el prompt nativo de instalación
            deferredPrompt.prompt();
            // Espera la respuesta del usuario
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`El usuario decidió: ${outcome}`);
            
            // Limpiamos la variable, ya no se puede usar de nuevo
            deferredPrompt = null;
            // Ocultamos el botón
            installBtn.style.display = 'none';
        }
    });
}

// Escuchamos si la app ya fue instalada con éxito
window.addEventListener('appinstalled', () => {
    console.log('¡La PWA ha sido instalada con éxito, capitán!');
    if (installBtn) installBtn.style.display = 'none';
});