// secrets.js - Manejo de la colección de secretos en Firestore con Moderación Automática
import { 
    collection, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    onSnapshot,
    doc,
    updateDoc,
    increment,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db, auth } from "./firebase.js";
import { pintarSecretos } from "./ui.js";

let unsubscribeFeed = null;

// secrets.js - Función guardarSecreto ACTUALIZADA con detección automática de bandera de país
export async function guardarSecreto(texto, esNsfw, tmpyCode) { 
    try {
        const user = auth.currentUser;
        if (!user) return alert("Debes estar logueado para publicar.");

        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);
        
        let edad = 18;
        let genero = "Otro";

        if (userSnap.exists()) {
            edad = userSnap.data().edad;
            genero = userSnap.data().genero;
        }

        // 🗺️ DETECCIÓN AUTOMÁTICA DE PAÍS Y BANDERA (Nativa y sin APIs externas caras)
        let codigoPais = "UN";
        let banderaEmoji = "🏳️";
        try {
            // Captura la zona horaria del navegador (ej: "America/Mexico_City")
            const zonaHoraria = Intl.DateTimeFormat().resolvedOptions().timeZone;
            
            // Mapeo básico de zonas horarias comunes a sus banderas
            if (zonaHoraria.includes("Mexico")) { codigoPais = "MX"; banderaEmoji = "🇲🇽"; }
            else if (zonaHoraria.includes("Bogota")) { codigoPais = "CO"; banderaEmoji = "🇨🇴"; }
            else if (zonaHoraria.includes("Buenos_Aires")) { codigoPais = "AR"; banderaEmoji = "🇦🇷"; }
            else if (zonaHoraria.includes("Santiago")) { codigoPais = "CL"; banderaEmoji = "🇨🇱"; }
            else if (zonaHoraria.includes("Lima")) { codigoPais = "PE"; banderaEmoji = "🇵🇪"; }
            else if (zonaHoraria.includes("Caracas")) { codigoPais = "VE"; banderaEmoji = "🇻🇪"; }
            else if (zonaHoraria.includes("Madrid")) { codigoPais = "ES"; banderaEmoji = "🇪🇸"; }
            else if (zonaHoraria.includes("Montevideo")) { codigoPais = "UY"; banderaEmoji = "🇺🇾"; }
            else if (zonaHoraria.includes("Quito")) { codigoPais = "EC"; banderaEmoji = "🇪🇨"; }
            else if (zonaHoraria.includes("Guatemala")) { codigoPais = "GT"; banderaEmoji = "🇬🇹"; }
            else if (zonaHoraria.includes("San_Jose")) { codigoPais = "CR"; banderaEmoji = "🇨🇷"; }
            else {
                // Alternativa genérica basada en el lenguaje del navegador
                const lang = navigator.language || "es-MX";
                const parts = lang.split("-");
                if (parts.length > 1) {
                    codigoPais = parts[1].toUpperCase();
                    // Conversión matemática de letras ISO a emojis de banderas
                    banderaEmoji = String.fromCodePoint(...[...codigoPais].map(c => 127397 + c.charCodeAt(0)));
                }
            }
        } catch (e) {
            console.error("Error al detectar país:", e);
        }

        // Estructura del documento con escudo de reportes y datos de ubicación
        await addDoc(collection(db, "secrets"), {
            texto: texto,
            es_nsfw: esNsfw,
            tmpy_code: tmpyCode ? tmpyCode.trim() : "", 
            autor_id: user.uid,
            autor_edad: edad,
            autor_genero: genero,
            autor_pais: codigoPais,
            autor_bandera: banderaEmoji, // <-- NUEVO: Se guarda la bandera directo
            fecha: new Date(),
            reacciones: { feliz: 0, enojado: 0, triste: 0, asco: 0 },
            reportes: 0 
        });

        console.log("¡Secreto publicado con éxito! 🤫");
        return true;
    } catch (error) {
        console.error("Error al publicar secreto:", error);
        return false;
    }
}

// 2. ESCUCHAR FEED EN TIEMPO REAL (CON FILTRO DE REPORTES)
export function cargarFeed(mostrarNsfw) {
    if (unsubscribeFeed) unsubscribeFeed();

    const q = query(
        collection(db, "secrets"),
        where("es_nsfw", "==", mostrarNsfw),
        orderBy("fecha", "desc")
    );

    unsubscribeFeed = onSnapshot(q, (snapshot) => {
        const secretos = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            
            // 🛡️ FILTRO DE BANEO SUAVE: Si el secreto tiene 5 o más reportes, se ignora del feed
            if (data.reportes >= 5) return;

            secretos.push({ id: doc.id, ...data });
        });
        pintarSecretos(secretos);
    }, (error) => {
        console.error("Error al cargar el feed:", error);
    });
}

// 3. INCREMENTAR O INTERCAMBIAR REACCIÓN POR USUARIO
export async function darReaccion(secretoId, tipoReaccion) {
    try {
        const user = auth.currentUser;
        if (!user) return alert("Debes iniciar sesión para reaccionar.");

        const uid = user.uid;
        const secretoRef = doc(db, "secrets", secretoId);
        const votoRef = doc(db, "secrets", secretoId, "user_reactions", uid);
        const votoSnap = await getDoc(votoRef);

        const actualizacionesSecreto = {};

        if (votoSnap.exists()) {
            const reaccionAnterior = votoSnap.data().tipo;

            if (reaccionAnterior === tipoReaccion) {
                actualizacionesSecreto[`reacciones.${tipoReaccion}`] = increment(-1);
                await updateDoc(secretoRef, actualizacionesSecreto);
                await setDoc(votoRef, { tipo: null });
                console.log("Voto removido.");
                return;
            }

            if (reaccionAnterior) {
                actualizacionesSecreto[`reacciones.${reaccionAnterior}`] = increment(-1);
            }
            actualizacionesSecreto[`reacciones.${tipoReaccion}`] = increment(1);
            
            await updateDoc(secretoRef, actualizacionesSecreto);
            await setDoc(votoRef, { tipo: tipoReaccion });
            console.log("Reacción cambiada con éxito.");

        } else {
            actualizacionesSecreto[`reacciones.${tipoReaccion}`] = increment(1);
            await updateDoc(secretoRef, actualizacionesSecreto);
            await setDoc(votoRef, { tipo: tipoReaccion });
            console.log("¡Voto nuevo registrado!");
        }
    } catch (error) {
        console.error("Error al procesar la reacción:", error);
    }
}

// 4. CARGAR ÚNICAMENTE LOS SECRETOS DEL USUARIO LOGUEADO (CON FILTRO DE REPORTES)
export function cargarMisSecretos() {
    const user = auth.currentUser;
    if (!user) return;

    if (unsubscribeFeed) unsubscribeFeed();

    const q = query(
        collection(db, "secrets"),
        where("autor_id", "==", user.uid),
        orderBy("fecha", "desc")
    );

    unsubscribeFeed = onSnapshot(q, (snapshot) => {
        const secretos = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            
            // También filtramos en tus secretos si ya fue tumbado por reportes
            if (data.reportes >= 5) return;

            secretos.push({ id: doc.id, ...data });
        });
        pintarSecretos(secretos);
    }, (error) => {
        console.error("Error al cargar tus secretos:", error);
    });
}

// 5. EJECUTAR DENUNCIA DE UN SECRETO COMPLETO
export async function denunciarSecreto(secretoId) {
    try {
        const secretoRef = doc(db, "secrets", secretoId);
        
        // increment(1) sube el contador directo en el servidor de Firebase de forma segura
        await updateDoc(secretoRef, {
            reportes: increment(1)
        });
        
        console.log(`Secreto ${secretoId} reportado con éxito.`);
        return true;
    } catch (error) {
        console.error("Error al registrar denuncia del secreto:", error);
        return false;
    }
}