// notifications.js - Escucha activa de alertas personales
import { 
    collection, 
    query, 
    where, 
    orderBy, 
    onSnapshot,
    doc,
    writeBatch,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db, auth } from "./firebase.js";

let unsubscribeNotif = null;

export function escucharNotificaciones() {
    const user = auth.currentUser;
    if (!user) return;

    if (unsubscribeNotif) unsubscribeNotif();

    const q = query(
        collection(db, "notifications"),
        where("para_usuario_id", "==", user.uid),
        orderBy("fecha", "desc")
    );

    unsubscribeNotif = onSnapshot(q, (snapshot) => {
        const listContainer = document.getElementById("notifications-list");
        const badge = document.getElementById("notif-badge");
        
        if (!listContainer) return;
        listContainer.innerHTML = "";

        let noLeidas = 0;
        const alertas = [];

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (!data.leida) noLeidas++;
            alertas.push({ id: docSnap.id, ...data });
        });

        if (noLeidas > 0) {
            badge.innerText = noLeidas;
            badge.style.display = "block";
        } else {
            badge.style.display = "none";
        }

        if (alertas.length === 0) {
            listContainer.innerHTML = "<p style='font-size: 13px; color: gray; text-align: center;'>No tienes notificaciones.</p>";
            return;
        }

        alertas.forEach((alerta) => {
            const div = document.createElement("div");
            div.style.padding = "8px";
            div.style.marginBottom = "5px";
            div.style.borderRadius = "4px";
            div.style.fontSize = "12px";
            div.style.backgroundColor = alerta.leida ? "#ffffff" : "#f1f2f6";
            div.style.borderLeft = alerta.leida ? "3px solid #ccc" : "3px solid var(--accent-color)";
            
            div.innerHTML = `
                <p style="margin: 0;">💬 Alguien comentó tu secreto:</p>
                <p style="margin: 3px 0 0 0; font-style: italic; color: #555;">"${alerta.texto_preview}"</p>
            `;
            listContainer.appendChild(div);
        });
    }, (error) => {
        console.error("Error en el oyente de notificaciones:", error);
    });
}

export async function marcarNotificacionesComoLeidas() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const q = query(
            collection(db, "notifications"),
            where("para_usuario_id", "==", user.uid),
            where("leida", "==", false)
        );
        
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);

        snapshot.forEach((docSnap) => {
            batch.update(doc(db, "notifications", docSnap.id), { leida: true });
        });

        await batch.commit();
        console.log("¡Notificaciones marcadas como leídas!");
    } catch (error) {
        console.error("Error al limpiar notificaciones:", error);
    }
}

export function apagarNotificaciones() {
    if (unsubscribeNotif) {
        unsubscribeNotif();
        unsubscribeNotif = null;
    }
}