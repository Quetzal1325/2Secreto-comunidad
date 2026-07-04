// ui.js - Manejo de la interfaz visual

// ui.js - Función limpia de intercambio
// ui.js - Control limpio de estados de autenticación
export function toggleAuthMode(isLogin) {
    const title = document.getElementById('auth-title');
    const extraFields = document.getElementById('extra-fields');
    const ageInput = document.getElementById('age');
    const genderInput = document.getElementById('gender');
    
    // Botones físicos
    const btnRegister = document.getElementById('auth-btn-register');
    const btnLogin = document.getElementById('auth-btn-login');
    
    // Textos inferiores
    const toggleToLogin = document.getElementById('toggle-to-login');
    const toggleToRegister = document.getElementById('toggle-to-register');

    if (isLogin) {
        title.innerText = "Iniciar Sesión";
        extraFields.style.display = "none"; 
        ageInput.removeAttribute('required');
        genderInput.removeAttribute('required');
        
        btnRegister.style.display = "none";
        btnLogin.style.display = "block";
        
        toggleToLogin.style.display = "none";
        toggleToRegister.style.display = "block";
    } else {
        title.innerText = "Crear Cuenta Anónima";
        extraFields.style.display = "block"; 
        ageInput.setAttribute('required', '');
        genderInput.setAttribute('required', '');
        
        btnRegister.style.display = "block";
        btnLogin.style.display = "none";
        
        toggleToLogin.style.display = "block";
        toggleToRegister.style.display = "none";
    }
}

// Muestra la app si está logueado, o el login si no lo está
// ui.js - Actualiza la función showAppView
export function showAppView(user) {
    const authSection = document.getElementById('auth-section');
    const appSection = document.getElementById('app-section');
    
    // Nuevos elementos de la barra superior
    const navFilters = document.getElementById('nav-filters');
    const navUserMenu = document.getElementById('nav-user-menu');

    if (user) {
        authSection.style.display = "none";
        appSection.style.display = "block";
        
        // Mostramos las opciones de la navbar
        navFilters.style.display = "flex";
        navUserMenu.style.display = "flex";
    } else {
        authSection.style.display = "block";
        appSection.style.display = "none";
        
        // Ocultamos las opciones de la navbar si no hay sesión
        navFilters.style.display = "none";
        navUserMenu.style.display = "none";
    }
}

// ui.js - (Añadir al final de lo que ya tienes)

// ui.js - Actualiza la función pintarSecretos
// ui.js - Reemplaza la función pintarSecretos:

export function pintarSecretos(secretos) {
    const container = document.getElementById("secrets-container");
    container.innerHTML = ""; 

    if (secretos.length === 0) {
        container.innerHTML = "<p class='no-secrets'>No hay secretos por aquí todavía...</p>";
        return;
    }

    secretos.forEach((secreto) => {
        const secretoCard = document.createElement("div");
        secretoCard.className = "secret-card";
        
        // Determinamos el emoji del género y la clase CSS para el color
        let emojiGenero = "👤";
        let claseGenero = "genero-otro";
        const genero = secreto.autor_genero || "Otro";

        if (genero === "Hombre") {
            emojiGenero = "🚹";
            claseGenero = "genero-hombre";
        } else if (genero === "Mujer") {
            emojiGenero = "🚺";
            claseGenero = "genero-mujer";
        }

        // Verificamos si lleva la etiqueta roja de NSFW
        const etiquetaNsfw = secreto.es_nsfw ? `<span class="badge-nsfw">🌶️ NSFW</span>` : "";

        secretoCard.innerHTML = `
            <div class="secret-header">
                <span class="user-meta ${claseGenero}">
                    ${emojiGenero} ${secreto.autor_edad || '??'} años
                </span>
                ${etiquetaNsfw}
            </div>

            <p class="secret-text">${secreto.texto}</p>
            
            <div class="interactions-bar">
                <button class="react-btn" data-id="${secreto.id}" data-type="feliz">
                    😊 <span class="count">${secreto.reacciones?.feliz || 0}</span>
                </button>
                <button class="react-btn" data-id="${secreto.id}" data-type="enojado">
                    😡 <span class="count">${secreto.reacciones?.enojado || 0}</span>
                </button>
                <button class="react-btn" data-id="${secreto.id}" data-type="triste">
                    😢 <span class="count">${secreto.reacciones?.triste || 0}</span>
                </button>
                <button class="react-btn" data-id="${secreto.id}" data-type="asco">
                    🤢 <span class="count">${secreto.reacciones?.asco || 0}</span>
                </button>

                <button class="comment-toggle-btn" data-id="${secreto.id}">
                    💬 Ver Comentarios
                </button>
            </div>

            <div class="comments-section" id="comments-box-${secreto.id}" style="display: none; margin-top: 15px;">
                <div class="comments-list" id="comments-list-${secreto.id}"></div>
                <form class="comment-form" data-id="${secreto.id}" style="display: flex; margin-top: 10px;">
                    <input type="text" placeholder="Escribe un comentario anónimo..." required style="flex: 1;">
                    <button type="submit">Enviar</button>
                </form>
            </div>
        `;
        container.appendChild(secretoCard);
    });
}