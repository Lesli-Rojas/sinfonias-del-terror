export const firebaseConfig = {
    apiKey: "AIzaSyCSZoDoqTecNETfFP0Z7b_0gENrsSKGnQ0",
    authDomain: "sinfonias-del-terror.firebaseapp.com",
    projectId: "sinfonias-del-terror",
    storageBucket: "sinfonias-del-terror.firebasestorage.app",
    messagingSenderId: "242891845784",
    appId: "1:242891845784:web:caa0644534f7f7b9bb60ed"
};

import {
    collection, getDocs, query, orderBy, doc, setDoc, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// Datos iniciales: se usan solo una vez, para sembrar Firestore si la
// colección "dominios" todavía está vacía (ver sembrarDominiosSiVacio).
export const DOMINIOS_SEED = {
    londres: {
        nombre: "Londres",
        imagen: "img/campus/londres/portada.jpg",
        tagline: "Niebla, tinta y música vieja",
        descripcion: "Aquí todo empieza y termina en la escritura. Entre estanterías imposibles y salones que nadie recuerda haber construido, nuestros conductores encontraron las primeras historias que dieron origen a Sinfonías del Terror.",
        instalaciones: [
            { nombre: "Biblioteca Sepultada", imagen: "img/campus/londres/biblioteca-sepultada.jpg", descripcion: "Una cueva de varios niveles donde los libros son más antiguos que las paredes que los rodean. Nadie sabe quién los escribió." },
            { nombre: "Coliseo Suspendido", imagen: "img/campus/londres/coliseo-suspendido.jpg", descripcion: "Un anfiteatro de piedra flotando sobre la niebla del bosque. Se dice que ahí se resuelven las disputas entre los que no pueden mentir." },
            { nombre: "Posada del Musgo", imagen: "img/campus/londres/posada-musgo.jpg", descripcion: "Una casa junto al arroyo donde el tiempo pasa distinto. Todos los que se han quedado a dormir cuentan la misma pesadilla." },
            { nombre: "Salón de las Confesiones", imagen: "img/campus/londres/alcoba-mansion.jpg", descripcion: "Un cuarto donde cada historia que se cuenta en voz alta queda escrita sola en las paredes, aunque nadie sostenga la pluma." },
            { nombre: "Salón de Música", imagen: "img/campus/londres/salon-musica.jpg", descripcion: "Un piano suena solo cuando alguien está a punto de contar la verdad. Nadie ha podido detenerlo a la mitad de una canción." }
        ]
    },
    italia: {
        nombre: "Italia",
        imagen: "img/campus/italia/portada.jpg",
        tagline: "Un castillo, una escalinata infinita, un bosque que no perdona",
        descripcion: "Sobre la cima de la montaña se alza el castillo, pero nadie que ha subido la escalinata completa recuerda cómo llegó al final. El verdadero dominio está en el bosque que lo rodea.",
        instalaciones: [
            { nombre: "Altar de los Susurros", imagen: "img/campus/italia/altar-susurros.jpg", descripcion: "Una estatua entre columnas en ruinas que sangra cuando alguien hace una promesa que no piensa cumplir." },
            { nombre: "Salón del Jaque Eterno", imagen: "img/campus/italia/salon-jaque-eterno.jpg", descripcion: "Dos figuras coronadas juegan la misma partida desde hace siglos. Dicen que cuando termine, algo en el mundo cambiará para siempre." },
            { nombre: "Pantano de las Almas", imagen: "img/campus/italia/pantano-almas.jpg", descripcion: "Las aguas más profundas del bosque, donde habita algo que solo se deja ver por quienes ya no tienen nada que perder." },
            { nombre: "Espejo del Bosque", imagen: "img/campus/italia/espejo-bosque.jpg", descripcion: "Un espejo antiguo que no refleja a quien lo mira, sino el rincón exacto del bosque donde va a morir." }
        ]
    },
    suecia: {
        nombre: "Suecia",
        imagen: "img/campus/suecia/portada-rivendel.jpg",
        tagline: "Silencio, hielo y una reina que no ha envejecido",
        descripcion: "El frío aquí no se siente en la piel, se siente en la memoria. Un reino tallado en hielo donde cada instalación guarda algo que fue enterrado en vida.",
        instalaciones: [
            { nombre: "Trono de las Ruinas", imagen: "img/campus/suecia/trono-ruinas.jpg", descripcion: "Entre columnas caídas y nieve eterna, una figura de negro observa a quien se atreve a acercarse, siempre acompañada de su ciervo." },
            { nombre: "Balcón de Hielo", imagen: "img/campus/suecia/balcon-hielo.jpg", descripcion: "Un puente congelado dentro del palacio, con ventanas encendidas que nadie ha visto apagarse en cien años." },
            { nombre: "Biblioteca de las Manos", imagen: "img/campus/suecia/biblioteca-manos.jpg", descripcion: "Un tomo gigante sostenido por decenas de manos que emergen de la piedra. Nadie ha logrado leer más de una página completa." },
            { nombre: "Círculo de Fuego", imagen: "img/campus/suecia/circulo-fuego.jpg", descripcion: "Un anillo de llamas que arde sobre el lago congelado sin derretir jamás el hielo debajo. Solo aparece cuando alguien está a punto de hacer un pacto." },
            { nombre: "Valle Carmesí", imagen: "img/campus/suecia/valle-carmesi.jpg", descripcion: "Un río rojo corta la nieve entre las montañas. Nadie ha podido explicar por qué nunca se congela, ni de dónde viene." }
        ]
    }
};

export function slugify(texto){
    return texto.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

// Lee dominios + instalaciones reales desde Firestore.
// Devuelve el mismo formato que usaban blog.js / panel.js con DOMINIOS.
export async function fetchDominios(db){
    const dominios = {};
    const snapD = await getDocs(query(collection(db, "dominios"), orderBy("creadoEn")));
    snapD.forEach(d => {
        const data = d.data();
        dominios[d.id] = {
            nombre: data.nombre,
            imagen: data.imagen || "",
            tagline: data.tagline || "",
            descripcion: data.descripcion || "",
            instalaciones: []
        };
    });

    const snapI = await getDocs(collection(db, "instalaciones"));
    snapI.forEach(d => {
        const data = d.data();
        if(dominios[data.dominioSlug]){
            dominios[data.dominioSlug].instalaciones.push({
                id: d.id,
                nombre: data.nombre,
                imagen: data.imagen || "",
                descripcion: data.descripcion || ""
            });
        }
    });

    return dominios;
}

// Siembra Londres/Italia/Suecia en Firestore una sola vez, si la colección
// "dominios" todavía está vacía. Requiere estar autenticado (lo llama panel.js).
export async function sembrarDominiosSiVacio(db){
    const existentes = await getDocs(collection(db, "dominios"));
    if(!existentes.empty) return false;

    for(const [slug, dominio] of Object.entries(DOMINIOS_SEED)){
        await setDoc(doc(db, "dominios", slug), {
            nombre: dominio.nombre,
            imagen: dominio.imagen,
            tagline: dominio.tagline,
            descripcion: dominio.descripcion,
            creadoEn: serverTimestamp()
        });
        for(const inst of dominio.instalaciones){
            await addDoc(collection(db, "instalaciones"), {
                dominioSlug: slug,
                nombre: inst.nombre,
                imagen: inst.imagen,
                descripcion: inst.descripcion,
                creadoEn: serverTimestamp()
            });
        }
    }
    return true;
}

export const AUTORES = {
    "sinfonista@sinfoniasdelterror.com": "La Sinfonista del Miedo",
    "hechicera@sinfoniasdelterror.com": "La Hechicera de la Oscuridad",
    "azrael@sinfoniasdelterror.com": "Azrael el Desterrado"
};

export const SALUDOS = {
    "sinfonista@sinfoniasdelterror.com": "Bienvenida",
    "hechicera@sinfoniasdelterror.com": "Bienvenida",
    "azrael@sinfoniasdelterror.com": "Bienvenido"
};

export const AVATARES = {
    "sinfonista@sinfoniasdelterror.com": "img/equipo/sinfonista-del-miedo.jpg",
    "hechicera@sinfoniasdelterror.com": "img/equipo/hechicera-de-la-oscuridad.jpg",
    "azrael@sinfoniasdelterror.com": "img/equipo/azrael-el-desterrado.jpg"
};

export const SELLOS = {
    "": null,
    "pocion": "img/Logos/pocion.png",
    "veneno": "img/Logos/veneno.png",
    "craneo": "img/Logos/craneo.png",
    "gato-negro": "img/Logos/gato-negro.png",
    "bola-de-cristal": "img/Logos/bola-de-cristal.png",
    "caldera": "img/Logos/caldera.png",
    "vispera": "img/Logos/vispera-de-todos-los-santos.png"
};

export function velasHTML(n){
    const CANDLE = '<svg viewBox="0 0 24 24" fill="currentColor" class="{cls}"><path d="M12 2c1.6 2.1 2.1 3.4 2.1 4.4 0 1.3-.94 2.2-2.1 2.2s-2.1-.9-2.1-2.2C9.9 5.4 10.4 4.1 12 2z"/><rect x="9.9" y="9.4" width="4.2" height="12.6" rx="0.6"/></svg>';
    let out = "";
    for(let i = 0; i < 5; i++){
        out += CANDLE.replace("{cls}", i < n ? "encendida" : "apagada");
    }
    return `<div class="velas">${out}</div>`;
}
