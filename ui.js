// ui.js - Manejo de la interfaz visual totalmente actualizado

// 1. FUNCIÓN DE UTILIDAD: Calcular tiempo relativo (Hace x min, Hace x hr)
function calcularTiempoHace(fechaFirestore) {
    if (!fechaFirestore) return "Hace un momento";
    const ahora = new Date();
    const fechaSecreto = new Date(fechaFirestore.seconds * 1000);
    const diferenciaMs = ahora - fechaSecreto;
    const diferenciaMin = Math.floor(diferenciaMs / 60000);

    if (diferenciaMin < 1) return "Hace un momento";
    if (diferenciaMin < 60) return `Hace ${diferenciaMin} min`;
    
    const diferenciaHoras = Math.floor(diferenciaMin / 60);
    if (diferenciaHoras < 24) return `Hace ${diferenciaHoras} hr`;
    
    return fechaSecreto.toLocaleDateString();
}

// 2. CONTROL DE ESTADOS DE AUTENTICACIÓN (LOGIN / REGISTRO)
export function toggleAuthMode(isLogin) {
    const title = document.getElementById('auth-title');
    const extraFields = document.getElementById('extra-fields');
    const ageInput = document.getElementById('age');
    const genderInput = document.getElementById('gender');
    
    // Botones físicos fijos
    const btnRegister = document.getElementById('auth-btn-register');
    const btnLogin = document.getElementById('auth-btn-login');
    
    // Textos inferiores alternables
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

// 3. MOSTRAR APP SI ESTÁ LOGUEADO, O LOGIN SI NO LO ESTÁ
export function showAppView(user) {
    const authSection = document.getElementById('auth-section');
    const appSection = document.getElementById('app-section');
    
    // Elementos de la barra superior fija
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
        
        // Ocultamos las opciones de la navbar si no hay sesión activa
        navFilters.style.display = "none";
        navUserMenu.style.display = "none";
    }
}

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

        // Verificamos si lleva la etiqueta de alerta morbosa (NSFW)
        const etiquetaNsfw = secreto.es_nsfw ? `<span class="badge-nsfw">🌶️ NSFW</span>` : "";

        // NUEVO: Verificamos si tiene un código de Tmpy adjunto para renderizar el hipervínculo
        let enlaceTmpyHtml = "";
        if (secreto.tmpy_code && secreto.tmpy_code.trim() !== "") {
            const urlCompleta = `https://www.tmpy.net/view/${secreto.tmpy_code.trim()}`;
            enlaceTmpyHtml = `
                <div style="margin-top: 12px; background-color: #fff5f5; border: 1px dashed #ff4757; padding: 10px; border-radius: 6px; text-align: center;">
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: #555; font-weight: bold;">🖼️ Este secreto incluye contenido multimedia externo:</p>
                    <a href="${urlCompleta}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #ff4757; color: white; padding: 6px 12px; border-radius: 4px; text-decoration: none; font-size: 12px; font-weight: bold; box-shadow: 0 2px 4px rgba(255,71,87,0.2); transition: transform 0.2s;">
                        🔗 Ver Imagen en Tmpy
                    </a>
                </div>
            `;
        }

        // Calculamos dinámicamente el tiempo transcurrido
        const tiempoHace = calcularTiempoHace(secreto.fecha);

        // ui.js - Fragmento actualizado dentro de pintarSecretos

secretoCard.innerHTML = `
    <div class="secret-header" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
        <div style="display: flex; gap: 8px; align-items: center;">
            <span class="user-meta ${claseGenero}">
                ${emojiGenero} ${secreto.autor_edad || '??'} años • <small style="color: var(--text-muted); font-weight: normal;">${tiempoHace}</small>
            </span>
            ${etiquetaNsfw}
        </div>
        
        <button class="report-secret-btn" data-id="${secreto.id}" title="Denunciar este secreto" style="background: none; border: none; cursor: pointer; font-size: 12px; color: #ff4757; opacity: 0.6; padding: 4px 8px; font-weight: bold;">
            🚩 Reportar
        </button>
    </div>

    <p class="secret-text">${secreto.texto}</p>
    
    ${enlaceTmpyHtml}
    
    <div class="interactions-bar" style="margin-top: 15px;">
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
        <form class="comment-form" data-id="${secreto.id}" data-author="${secreto.autor_id || ''}" style="display: flex; margin-top: 10px;">
            <input type="text" placeholder="Escribe un comentario anónimo..." required style="flex: 1;">
            <button type="submit">Enviar</button>
        </form>
    </div>
`;
        container.appendChild(secretoCard);
    });
}