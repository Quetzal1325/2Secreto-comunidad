// ui.js - Manejo de la interfaz visual con soporte de autenticación, bordes de género y banderas

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
    
    const btnRegister = document.getElementById('auth-btn-register');
    const btnLogin = document.getElementById('auth-btn-login');
    
    const toggleToLogin = document.getElementById('toggle-to-login');
    const toggleToRegister = document.getElementById('toggle-to-register');

    if (isLogin) {
        if (title) title.innerText = "Iniciar Sesión";
        if (extraFields) extraFields.style.display = "none"; 
        if (ageInput) ageInput.removeAttribute('required');
        if (genderInput) genderInput.removeAttribute('required');
        
        if (btnRegister) btnRegister.style.display = "none";
        if (btnLogin) btnLogin.style.display = "block";
        
        if (toggleToLogin) toggleToLogin.style.display = "none";
        if (toggleToRegister) toggleToRegister.style.display = "block";
    } else {
        if (title) title.innerText = "Crear Cuenta Anónima";
        if (extraFields) extraFields.style.display = "block"; 
        if (ageInput) ageInput.setAttribute('required', '');
        if (genderInput) genderInput.setAttribute('required', '');
        
        if (btnRegister) btnRegister.style.display = "block";
        if (btnLogin) btnLogin.style.display = "none";
        
        if (toggleToLogin) toggleToLogin.style.display = "block";
        if (toggleToRegister) toggleToRegister.style.display = "none";
    }
}

// 3. MOSTRAR LA VISTA DE LA APP
export function showAppView(user) {
    const authSection = document.getElementById('auth-section');
    const appSection = document.getElementById('app-section');
    
    const navFilters = document.getElementById('nav-filters');
    const navUserMenu = document.getElementById('nav-user-menu');

    if (navFilters) navFilters.style.display = "flex";
    if (navUserMenu) navUserMenu.style.display = "flex";

    if (user) {
        if (authSection) authSection.style.display = "none";
        if (appSection) appSection.style.display = "block";
    } else {
        if (authSection) authSection.style.display = "none";
        if (appSection) appSection.style.display = "block";
    }
}

// 4. RENDERIZAR LAS TARJETAS DE SECRETOS EN EL FEED (CON BORDES Y BANDERAS)
export function pintarSecretos(secretos) {
    const container = document.getElementById("secrets-container");
    if (!container) return;
    container.innerHTML = ""; 

    if (secretos.length === 0) {
        container.innerHTML = "<p class='no-secrets'>No hay secretos por aquí todavía...</p>";
        return;
    }

    secretos.forEach((secreto) => {
        const secretoCard = document.createElement("div");
        
        // 🎨 CLASE DINÁMICA DE GÉNERO
        let emojiGenero = "👤"; 
        let claseGenero = "genero-otro";
        let claseBordeColor = "card-otro"; 
        const genero = secreto.autor_genero || "Otro";

        if (genero === "Hombre") {
            emojiGenero = "🚹";
            claseGenero = "genero-hombre";
            claseBordeColor = "card-hombre"; 
        } else if (genero === "Mujer") {
            emojiGenero = "🚺";
            claseGenero = "genero-mujer";
            claseBordeColor = "card-mujer"; 
        } else {
            emojiGenero = "🥷";
            claseGenero = "genero-otro";
            claseBordeColor = "card-otro"; 
        }

        secretoCard.className = `secret-card ${claseBordeColor}`;
        secretoCard.setAttribute("data-author", secreto.autor_id || "");
        
        // 🇲🇽 Bandera de país por defecto si es viejo o el nuevo valor detectado
        const bandera = secreto.autor_bandera || "🇲🇽"; 
        const etiquetaNsfw = secreto.es_nsfw ? `<span class="badge-nsfw">🌶️ NSFW</span>` : "";

        // Filtro Tmpy
        let enlaceTmpyHtml = "";
        if (secreto.tmpy_code && secreto.tmpy_code.trim() !== "") {
            const ahora = new Date();
            const fechaSecreto = new Date(secreto.fecha.seconds * 1000);
            const diferenciaMs = ahora - fechaSecreto;
            const minutosTranscurridos = Math.floor(diferenciaMs / 60000);

            if (minutosTranscurridos < 60) {
                const urlCompleta = `https://www.tmpy.net/view/${secreto.tmpy_code.trim()}`;
                enlaceTmpyHtml = `
                    <div class="tmpy-container" style="margin-top: 12px; background-color: #fff5f5; border: 1px dashed #ff4757; padding: 10px; border-radius: 6px; text-align: center;">
                        <p style="margin: 0 0 8px 0; font-size: 12px; color: #555; font-weight: bold;">🖼️ Este secreto incluye contenido multimedia externo:</p>
                        <a href="${urlCompleta}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #ff4757; color: white; padding: 6px 12px; border-radius: 4px; text-decoration: none; font-size: 12px; font-weight: bold; box-shadow: 0 2px 4px rgba(255,71,87,0.2); transition: transform 0.2s;">
                            🔗 Ver Imagen en Tmpy
                        </a>
                        <p style="margin: 5px 0 0 0; font-size: 10px; color: #ff4757; font-style: italic;">⏱️ Este enlace caducará pronto (Máx. 60 min desde su publicación)</p>
                    </div>
                `;
            }
        }

        const tiempoHace = calcularTiempoHace(secreto.fecha);
        const totalReacciones = (secreto.reacciones?.feliz || 0) + 
                                (secreto.reacciones?.enojado || 0) + 
                                (secreto.reacciones?.triste || 0) + 
                                (secreto.reacciones?.asco || 0);

        secretoCard.innerHTML = `
            <div class="secret-header" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <div style="display: flex; gap: 8px; align-items: center;">
                    <span class="user-meta ${claseGenero}" style="display: flex; align-items: center; gap: 5px;">
                        <span style="font-size: 15px;" title="País de origen">${bandera}</span> 
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
            
            <div class="interactions-bar" style="margin-top: 15px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                <div style="display: flex; gap: 8px;">
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
                </div>

                <span class="total-reactions-badge" style="font-size: 11.5px; font-weight: bold; color: var(--accent-color); background: rgba(196, 113, 237, 0.07); padding: 4px 10px; border-radius: 12px; border: 1px dashed rgba(196, 113, 237, 0.25); white-space: nowrap;">
                    ✨ ${totalReacciones} ${totalReacciones === 1 ? 'reacción' : 'reacciones'}
                </span>

                <button class="comment-toggle-btn" data-id="${secreto.id}" style="margin-left: auto;">
                    💬 Ver Comentarios
                </button>
            </div>

            <div class="comments-section" id="comments-box-${secreto.id}" style="display: none; margin-top: 15px;">
                <div class="comments-list" id="comments-list-${secreto.id}"></div>
            </div>
        `;
        container.appendChild(secretoCard);
    });
}