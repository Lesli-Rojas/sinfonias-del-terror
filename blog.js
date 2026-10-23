import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
    getFirestore, collection, getDocs, query, where, orderBy,
    doc, updateDoc, increment
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { firebaseConfig, SELLOS, velasHTML, fetchDominios } from "./firebase-shared.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const HISTORIAS = collection(db, "historias");
let DOMINIOS = {};

function fillSelect(select, options, placeholder){
    select.innerHTML = `<option value="">${placeholder}</option>` +
        options.map(o => `<option value="${o.value}">${o.label}</option>`).join("");
}

// ---------- Filtros ----------
const dominioSelect = document.getElementById("filtro-dominio");
const instalacionSelect = document.getElementById("filtro-instalacion");
const limpiarBtn = document.getElementById("filtro-limpiar");

function poblarDominios(){
    fillSelect(dominioSelect, Object.entries(DOMINIOS).map(([key, d]) => ({value: key, label: d.nombre})), "Todos los dominios");
}

function poblarInstalaciones(dominioKey){
    if(!dominioKey || !DOMINIOS[dominioKey]){
        fillSelect(instalacionSelect, [], "Todas las instalaciones");
        instalacionSelect.disabled = true;
        return;
    }
    instalacionSelect.disabled = false;
    fillSelect(instalacionSelect, DOMINIOS[dominioKey].instalaciones.map(i => ({value: i.nombre, label: i.nombre})), "Todas las instalaciones");
}

dominioSelect?.addEventListener("change", () => {
    poblarInstalaciones(dominioSelect.value);
    cargarHistorias();
    syncURL();
});
instalacionSelect?.addEventListener("change", () => { cargarHistorias(); syncURL(); });
limpiarBtn?.addEventListener("click", () => {
    dominioSelect.value = "";
    poblarInstalaciones("");
    cargarHistorias();
    syncURL();
});

function syncURL(){
    const params = new URLSearchParams();
    if(dominioSelect.value) params.set("dominio", dominioSelect.value);
    if(instalacionSelect.value) params.set("instalacion", instalacionSelect.value);
    history.replaceState(null, "", params.toString() ? `?${params}` : "blog.html");
}

// ---------- Cargar y pintar historias ----------
const shelf = document.getElementById("shelf");

async function cargarHistorias(){
    shelf.innerHTML = `<p class="empty-note">Buscando historias en la niebla...</p>`;

    let condiciones = [where("estado", "==", "publicado")];
    if(dominioSelect.value) condiciones.push(where("dominio", "==", dominioSelect.value));
    if(instalacionSelect.value) condiciones.push(where("instalacion", "==", instalacionSelect.value));

    let snap;
    try{
        snap = await getDocs(query(HISTORIAS, ...condiciones, orderBy("creadoEn", "desc")));
    }catch(e){
        snap = await getDocs(query(HISTORIAS, ...condiciones));
    }

    if(snap.empty){
        shelf.innerHTML = `<p class="empty-note">Todavía no hay historias publicadas aquí. Vuelve pronto.</p>`;
        return;
    }

    const porDominio = {};
    snap.forEach(d => {
        const h = { id: d.id, ...d.data() };
        const key = h.dominio || "otros";
        (porDominio[key] = porDominio[key] || []).push(h);
    });

    shelf.innerHTML = "";
    Object.entries(porDominio).forEach(([key, historias]) => {
        const nombre = DOMINIOS[key]?.nombre || "Otros relatos";
        const group = document.createElement("div");
        group.className = "shelf-group";
        group.innerHTML = `<h3>${nombre}</h3><div class="shelf-grid"></div>`;
        const grid = group.querySelector(".shelf-grid");

        historias.forEach(h => {
            const card = document.createElement("button");
            card.className = "book-card";
            const sello = SELLOS[h.sello];
            const promedio = h.calificacionCuenta ? h.calificacionSuma / h.calificacionCuenta : 0;
            card.innerHTML = `
                <div class="book-cover">
                    <img src="${h.portada || 'img/Logos/serpiente.png'}" alt="${h.titulo}">
                    ${sello ? `<div class="book-sello"><img src="${sello}" alt=""></div>` : ""}
                </div>
                <h4>${h.titulo}</h4>
                <span class="autor">${h.autor}</span>
                ${velasHTML(Math.round(promedio))}
            `;
            card.addEventListener("click", () => abrirLectura(h));
            grid.appendChild(card);
        });

        shelf.appendChild(group);
    });
}

function velasInteractivasHTML(promedio){
    const CANDLE = '<path d="M12 2c1.6 2.1 2.1 3.4 2.1 4.4 0 1.3-.94 2.2-2.1 2.2s-2.1-.9-2.1-2.2C9.9 5.4 10.4 4.1 12 2z"/><rect x="9.9" y="9.4" width="4.2" height="12.6" rx="0.6"/>';
    let out = "";
    for(let i = 1; i <= 5; i++){
        const encendida = i <= Math.round(promedio);
        out += `<svg viewBox="0 0 24 24" fill="currentColor" class="${encendida ? "encendida" : "apagada"}" data-valor="${i}" style="cursor:pointer;">${CANDLE}</svg>`;
    }
    return out;
}

let historiaActualId = null;
let historiaActualDatos = null;

function pintarVelasLector(){
    const suma = historiaActualDatos.calificacionSuma || 0;
    const cuenta = historiaActualDatos.calificacionCuenta || 0;
    const promedio = cuenta ? suma / cuenta : 0;

    const velasEl = document.getElementById("reader-velas-lector");
    velasEl.innerHTML = velasInteractivasHTML(promedio);
    velasEl.querySelectorAll("svg").forEach(svg => {
        svg.addEventListener("click", () => calificarHistoria(Number(svg.dataset.valor)));
    });

    document.getElementById("reader-stats").textContent =
        `${cuenta} ${cuenta === 1 ? "calificación" : "calificaciones"} · ${historiaActualDatos.vistas || 0} ${(historiaActualDatos.vistas || 0) === 1 ? "lectura" : "lecturas"}`;
}

async function calificarHistoria(valor){
    if(!historiaActualId) return;
    const yaVoto = localStorage.getItem(`voto_${historiaActualId}`);
    const nota = document.getElementById("reader-voto-nota");
    if(yaVoto){
        nota.textContent = "Ya calificaste esta historia. Gracias por leer.";
        return;
    }
    try{
        await updateDoc(doc(db, "historias", historiaActualId), {
            calificacionSuma: increment(valor),
            calificacionCuenta: increment(1)
        });
        localStorage.setItem(`voto_${historiaActualId}`, String(valor));
        historiaActualDatos.calificacionSuma = (historiaActualDatos.calificacionSuma || 0) + valor;
        historiaActualDatos.calificacionCuenta = (historiaActualDatos.calificacionCuenta || 0) + 1;
        pintarVelasLector();
        nota.textContent = "¡Gracias por tu calificación!";
    }catch(e){
        nota.textContent = "No se pudo guardar tu calificación, intenta de nuevo.";
    }
}

// ---------- Vista de lectura ----------
const overlay = document.getElementById("reader-overlay");
document.getElementById("reader-close")?.addEventListener("click", cerrarLectura);

function abrirLectura(h){
    historiaActualId = h.id;
    historiaActualDatos = h;

    document.getElementById("reader-titulo").textContent = h.titulo;
    document.getElementById("reader-autor").textContent = h.autor;
    document.getElementById("reader-intro").textContent = h.introduccion || "";
    document.getElementById("reader-portada").src = h.portada || "img/Logos/serpiente.png";
    document.getElementById("reader-ubicacion").textContent =
        `${DOMINIOS[h.dominio]?.nombre || ""}${h.instalacion ? " — " + h.instalacion : ""}`;
    document.getElementById("reader-voto-nota").textContent = "";

    pintarVelasLector();

    const contenidoEl = document.getElementById("reader-contenido");
    contenidoEl.innerHTML = "";
    (h.contenido || "").split(/\n\s*\n/).forEach(parrafo => {
        if(parrafo.trim()){
            const p = document.createElement("p");
            p.textContent = parrafo.trim();
            contenidoEl.appendChild(p);
        }
    });

    overlay.classList.add("open");
    window.scrollTo(0, 0);

    // cuenta la vista (una vez por apertura)
    updateDoc(doc(db, "historias", h.id), { vistas: increment(1) }).catch(() => {});
    historiaActualDatos.vistas = (historiaActualDatos.vistas || 0) + 1;
}

function cerrarLectura(){
    overlay.classList.remove("open");
    historiaActualId = null;
    historiaActualDatos = null;
}

// ---------- Inicio ----------
async function init(){
    DOMINIOS = await fetchDominios(db);
    poblarDominios();
    const params = new URLSearchParams(window.location.search);
    const dominioParam = params.get("dominio");
    const instalacionParam = params.get("instalacion");

    if(dominioParam && DOMINIOS[dominioParam]){
        dominioSelect.value = dominioParam;
        poblarInstalaciones(dominioParam);
        if(instalacionParam) instalacionSelect.value = instalacionParam;
    }else{
        poblarInstalaciones("");
    }

    cargarHistorias();
}

init();
