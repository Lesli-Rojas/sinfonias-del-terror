import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
    getFirestore, collection, addDoc, doc, setDoc, updateDoc,
    getDocs, query, where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import {
    getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
    firebaseConfig, AUTORES, AVATARES, SALUDOS, fetchDominios, sembrarDominiosSiVacio, slugify
} from "./firebase-shared.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const HISTORIAS = collection(db, "historias");
const DOMINIOS_COL = collection(db, "dominios");
const INSTALACIONES_COL = collection(db, "instalaciones");
let DOMINIOS = {};

async function recargarDominios(){
    DOMINIOS = await fetchDominios(db);
    fillSelect(document.getElementById("f-dominio"), Object.entries(DOMINIOS).map(([key, d]) => ({value: key, label: d.nombre})), "Elige un dominio");
    fillSelect(document.getElementById("i-dominio"), Object.entries(DOMINIOS).map(([key, d]) => ({value: key, label: d.nombre})), "Elige un dominio");
}

function fillSelect(select, options, placeholder){
    select.innerHTML = `<option value="">${placeholder}</option>` +
        options.map(o => `<option value="${o.value}">${o.label}</option>`).join("");
}

const loginScreen = document.getElementById("login-screen");
const editorScreen = document.getElementById("editor-screen");
const loginForm = document.getElementById("login-form");
const editorForm = document.getElementById("editor-form");
const loginError = document.getElementById("login-error");
const adminError = document.getElementById("admin-error");
const profileCircle = document.getElementById("profile-circle");
const profileMenu = document.getElementById("profile-menu");
const profileMenuName = document.getElementById("profile-menu-name");

const viewNueva = document.getElementById("view-nueva");
const viewHistorias = document.getElementById("view-mis-historias");
const viewBorradores = document.getElementById("view-borradores");
const viewNuevoDominio = document.getElementById("view-nuevo-dominio");
const viewNuevaInstalacion = document.getElementById("view-nueva-instalacion");
const gridPublicadas = document.getElementById("grid-publicadas");
const gridBorradores = document.getElementById("grid-borradores");
const bannerTitulo = document.getElementById("banner-titulo");
const bannerTagline = document.getElementById("banner-tagline");
const btnVolver = document.getElementById("btn-volver");

let vistaActual = "nueva";
let volverA = null; // a dónde regresa el botón "Volver" al editar

const TODAS_LAS_VISTAS = ["nueva", "historias", "borradores", "nuevo-dominio", "nueva-instalacion"];
const VISTA_A_EL = {
    nueva: viewNueva,
    historias: viewHistorias,
    borradores: viewBorradores,
    "nuevo-dominio": viewNuevoDominio,
    "nueva-instalacion": viewNuevaInstalacion
};

const TITULOS = {
    nueva: { tagline: "Tu espacio de escritura", titulo: "Publicar una historia nueva" },
    historias: { tagline: "Todo lo que ya viste la luz", titulo: "Mis historias publicadas" },
    borradores: { tagline: "Lo que aún no está listo", titulo: "Mis borradores" },
    "nuevo-dominio": { tagline: "Un lugar más para el mapa", titulo: "Nuevo dominio" },
    "nueva-instalacion": { tagline: "Otro rincón dentro del dominio", titulo: "Nueva instalación" }
};

function mostrarVista(nombre, opciones = {}){
    vistaActual = nombre;
    TODAS_LAS_VISTAS.forEach(v => { VISTA_A_EL[v].style.display = v === nombre ? "block" : "none"; });

    if(opciones.tituloPersonalizado){
        bannerTagline.textContent = opciones.taglinePersonalizado || "";
        bannerTitulo.textContent = opciones.tituloPersonalizado;
    }else{
        bannerTagline.textContent = TITULOS[nombre].tagline;
        bannerTitulo.textContent = TITULOS[nombre].titulo;
    }

    btnVolver.style.display = (nombre === "nueva" && volverA) ? "inline-block" : "none";

    // deja la vista en el historial del navegador para que la flecha de regresar
    // navegue entre vistas en vez de sacarte del panel
    history.pushState({ vista: nombre }, "", `#${nombre}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
}

window.addEventListener("popstate", (e) => {
    const vista = e.state?.vista || "nueva";
    if(!currentUser) return;
    if(vista === "historias"){ cargarGrid(gridPublicadas, "publicado"); }
    if(vista === "borradores"){ cargarGrid(gridBorradores, "borrador"); }
    if(vista === "nueva"){ volverA = null; }
    vistaActual = vista;
    TODAS_LAS_VISTAS.forEach(v => { VISTA_A_EL[v].style.display = v === vista ? "block" : "none"; });
    bannerTagline.textContent = TITULOS[vista].tagline;
    bannerTitulo.textContent = TITULOS[vista].titulo;
    btnVolver.style.display = "none";
});

btnVolver?.addEventListener("click", () => {
    const destino = volverA;
    volverA = null;
    limpiarFormulario();
    if(destino === "borradores"){
        mostrarVista("borradores");
        cargarGrid(gridBorradores, "borrador");
    }else{
        mostrarVista("historias");
        cargarGrid(gridPublicadas, "publicado");
    }
});

profileCircle?.addEventListener("click", (e) => {
    e.stopPropagation();
    profileMenu.classList.toggle("open");
});

document.addEventListener("click", (e) => {
    if(!profileMenu.contains(e.target) && e.target !== profileCircle){
        profileMenu.classList.remove("open");
    }
});

document.querySelector('[data-action="mis-historias"]')?.addEventListener("click", () => {
    profileMenu.classList.remove("open");
    mostrarVista("historias");
    cargarGrid(gridPublicadas, "publicado");
});

document.querySelector('[data-action="mis-borradores"]')?.addEventListener("click", () => {
    profileMenu.classList.remove("open");
    mostrarVista("borradores");
    cargarGrid(gridBorradores, "borrador");
});

document.querySelector('[data-action="nueva-historia"]')?.addEventListener("click", () => {
    profileMenu.classList.remove("open");
    volverA = null;
    limpiarFormulario();
    mostrarVista("nueva");
});

document.querySelector('[data-action="nuevo-dominio"]')?.addEventListener("click", async () => {
    profileMenu.classList.remove("open");
    mostrarVista("nuevo-dominio");
    const seedNote = document.getElementById("seed-note");
    seedNote.style.display = Object.keys(DOMINIOS).length === 0 ? "block" : "none";
});

document.querySelector('[data-action="nueva-instalacion"]')?.addEventListener("click", () => {
    profileMenu.classList.remove("open");
    mostrarVista("nueva-instalacion");
});

document.getElementById("btn-sembrar")?.addEventListener("click", async () => {
    const btn = document.getElementById("btn-sembrar");
    btn.textContent = "Cargando...";
    btn.disabled = true;
    await sembrarDominiosSiVacio(db);
    await recargarDominios();
    document.getElementById("seed-note").style.display = "none";
    document.getElementById("dominio-error").style.color = "#c98a3a";
    document.getElementById("dominio-error").textContent = "Listo, ya están cargados Londres, Italia y Suecia.";
});

document.getElementById("form-dominio")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = document.getElementById("dominio-error");
    err.style.color = "#c96a6a";
    const nombre = document.getElementById("d-nombre").value.trim();
    if(!nombre){ err.textContent = "Ponle un nombre al dominio."; return; }
    const slug = slugify(nombre);
    if(DOMINIOS[slug]){ err.textContent = "Ya existe un dominio con ese nombre."; return; }

    try{
        await setDoc(doc(db, "dominios", slug), {
            nombre,
            tagline: document.getElementById("d-tagline").value.trim(),
            imagen: document.getElementById("d-imagen").value.trim(),
            descripcion: document.getElementById("d-descripcion").value.trim(),
            creadoEn: serverTimestamp()
        });
        await recargarDominios();
        document.getElementById("form-dominio").reset();
        err.style.color = "#c98a3a";
        err.textContent = `"${nombre}" se creó. Ya puedes agregarle instalaciones.`;
    }catch(e2){
        err.textContent = "Hubo un problema al crear el dominio. Intenta de nuevo.";
    }
});

document.getElementById("form-instalacion")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = document.getElementById("instalacion-error");
    err.style.color = "#c96a6a";
    const dominioSlug = document.getElementById("i-dominio").value;
    const nombre = document.getElementById("i-nombre").value.trim();
    if(!dominioSlug || !nombre){ err.textContent = "Elige un dominio y ponle nombre a la instalación."; return; }

    try{
        await addDoc(INSTALACIONES_COL, {
            dominioSlug,
            nombre,
            imagen: document.getElementById("i-imagen").value.trim(),
            descripcion: document.getElementById("i-descripcion").value.trim(),
            creadoEn: serverTimestamp()
        });
        await recargarDominios();
        document.getElementById("form-instalacion").reset();
        err.style.color = "#c98a3a";
        err.textContent = `"${nombre}" se agregó a ${DOMINIOS[dominioSlug]?.nombre || dominioSlug}.`;
    }catch(e2){
        err.textContent = "Hubo un problema al crear la instalación. Intenta de nuevo.";
    }
});

loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.textContent = "";
    const email = document.getElementById("login-email").value.trim();
    const pass = document.getElementById("login-pass").value;
    try{
        await signInWithEmailAndPassword(auth, email, pass);
    }catch(err){
        loginError.textContent = "No se pudo iniciar sesión. Revisa tu correo y contraseña.";
    }
});

document.getElementById("logout-btn")?.addEventListener("click", () => signOut(auth));

const welcomeScreen = document.getElementById("welcome-screen");
const welcomeSlide1 = document.getElementById("welcome-slide-1");
const welcomeSlide2 = document.getElementById("welcome-slide-2");
const welcomeTitulo = document.getElementById("welcome-titulo");

document.getElementById("btn-welcome-continuar")?.addEventListener("click", () => {
    welcomeSlide1.classList.remove("active");
    welcomeSlide2.classList.add("active");
});

document.querySelectorAll("#welcome-slide-2 [data-ir]").forEach(btn => {
    btn.addEventListener("click", () => {
        const destino = btn.dataset.ir;
        welcomeScreen.classList.remove("open");
        welcomeSlide2.classList.remove("active");
        welcomeSlide1.classList.add("active");
        editorScreen.style.display = "block";
        if(destino === "historias"){
            mostrarVista("historias");
            cargarGrid(gridPublicadas, "publicado");
        }else if(destino === "borradores"){
            mostrarVista("borradores");
            cargarGrid(gridBorradores, "borrador");
        }else{
            limpiarFormulario();
            mostrarVista("nueva");
        }
    });
});

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if(user){
        loginScreen.style.display = "none";
        profileCircle.style.backgroundImage = `url(${AVATARES[user.email] || "img/Logos/serpiente.png"})`;
        profileMenuName.textContent = AUTORES[user.email] || user.email;
        welcomeTitulo.textContent = SALUDOS[user.email] || "Bienvenido";
        await recargarDominios();
        editorScreen.style.display = "none";
        welcomeScreen.classList.add("open");
    }else{
        loginScreen.style.display = "flex";
        editorScreen.style.display = "none";
        welcomeScreen.classList.remove("open");
    }
});

let editandoId = null;

function limpiarFormulario(){
    editandoId = null;
    editorForm.reset();
    document.getElementById("editor-submit-label").textContent = "publicar una historia nueva";
    document.getElementById("btn-publicar").textContent = "Publicar";
    document.getElementById("btn-nueva").style.display = "";
    adminError.textContent = "";
}

editorForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await guardarHistoria("publicado");
});

document.getElementById("btn-borrador")?.addEventListener("click", () => guardarHistoria("borrador"));
document.getElementById("btn-nueva")?.addEventListener("click", limpiarFormulario);

async function guardarHistoria(estado){
    if(!currentUser) return;
    adminError.textContent = "";
    const data = {
        titulo: document.getElementById("f-titulo").value.trim(),
        dominio: document.getElementById("f-dominio").value,
        instalacion: document.getElementById("f-instalacion").value,
        portada: document.getElementById("f-portada").value.trim(),
        introduccion: document.getElementById("f-introduccion").value.trim(),
        contenido: document.getElementById("f-contenido").value.trim(),
        velas: Number(document.getElementById("f-velas").value) || 0,
        sello: document.getElementById("f-sello").value,
        estado,
        autor: AUTORES[currentUser.email] || currentUser.email,
        autorUid: currentUser.uid,
        creadoEn: serverTimestamp()
    };

    if(!data.titulo || !data.dominio){
        adminError.textContent = "El título y el dominio son obligatorios.";
        return;
    }

    try{
        if(editandoId){
            await updateDoc(doc(db, "historias", editandoId), data);
        }else{
            await addDoc(HISTORIAS, { ...data, vistas: 0, calificacionSuma: 0, calificacionCuenta: 0 });
        }
        const veniaDe = volverA;
        volverA = null;
        limpiarFormulario();
        if(veniaDe === "borradores" && estado === "borrador"){
            mostrarVista("borradores");
            cargarGrid(gridBorradores, "borrador");
        }else if(veniaDe){
            mostrarVista("historias");
            cargarGrid(gridPublicadas, "publicado");
        }else{
            adminError.textContent = estado === "borrador"
                ? "Borrador guardado. Lo encuentras en Mis borradores."
                : "Historia publicada. Ya aparece en el Blog.";
            adminError.style.color = "#c98a3a";
        }
    }catch(err){
        adminError.style.color = "#c96a6a";
        adminError.textContent = "Hubo un problema al guardar. Intenta de nuevo.";
    }
}

const fDominio = document.getElementById("f-dominio");
const fInstalacion = document.getElementById("f-instalacion");
fDominio?.addEventListener("change", () => {
    if(!DOMINIOS[fDominio.value]){
        fillSelect(fInstalacion, [], "Instalación");
        return;
    }
    fillSelect(fInstalacion, DOMINIOS[fDominio.value].instalaciones.map(i => ({value: i.nombre, label: i.nombre})), "Instalación");
});

async function cargarGrid(contenedor, estado){
    if(!currentUser) return;
    contenedor.innerHTML = `<p class="empty-note">Cargando...</p>`;

    let snap;
    try{
        snap = await getDocs(query(
            HISTORIAS,
            where("autorUid", "==", currentUser.uid),
            where("estado", "==", estado),
            orderBy("creadoEn", "desc")
        ));
    }catch(e){
        snap = await getDocs(query(
            HISTORIAS,
            where("autorUid", "==", currentUser.uid),
            where("estado", "==", estado)
        ));
    }

    if(snap.empty){
        contenedor.innerHTML = `<p class="empty-note">${
            estado === "borrador"
                ? "No tienes borradores guardados."
                : "Aún no has publicado ninguna historia."
        }</p>`;
        return;
    }

    contenedor.innerHTML = "";
    snap.forEach(d => {
        const h = { id: d.id, ...d.data() };
        const promedio = h.calificacionCuenta ? (h.calificacionSuma / h.calificacionCuenta).toFixed(1) : "—";

        const card = document.createElement("div");
        card.className = "book-card static-card";
        card.innerHTML = `
            <div class="book-cover">
                <img src="${h.portada || 'img/Logos/serpiente.png'}" alt="${h.titulo}">
            </div>
            <h4>${h.titulo}</h4>
            <span class="autor">${DOMINIOS[h.dominio]?.nombre || ""}${h.instalacion ? " — " + h.instalacion : ""}</span>
            ${estado === "borrador"
                ? `<span class="estado">borrador</span>`
                : `<span style="color:var(--mist); font-size:11px; display:block;">${h.vistas || 0} lecturas · ${promedio} de calificación (${h.calificacionCuenta || 0})</span>`}
            <div class="card-actions">
                <button type="button" data-ver>Ver historia</button>
                <button type="button" data-editar>Editar</button>
            </div>
        `;
        card.querySelector("[data-ver]").addEventListener("click", () => abrirLectura(h));
        card.querySelector("[data-editar]").addEventListener("click", () => cargarEnFormulario(h, estado));
        contenedor.appendChild(card);
    });
}

// ---------- Ventana emergente de lectura ----------
const overlay = document.getElementById("reader-overlay");
document.getElementById("reader-close")?.addEventListener("click", () => overlay.classList.remove("open"));

function abrirLectura(h){
    document.getElementById("reader-titulo").textContent = h.titulo;
    document.getElementById("reader-autor").textContent = h.autor;
    document.getElementById("reader-intro").textContent = h.introduccion || "";
    document.getElementById("reader-portada").src = h.portada || "img/Logos/serpiente.png";
    document.getElementById("reader-ubicacion").textContent =
        `${DOMINIOS[h.dominio]?.nombre || ""}${h.instalacion ? " — " + h.instalacion : ""}`;

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
}

function cargarEnFormulario(h, origen){
    editandoId = h.id;
    volverA = origen === "borrador" ? "borradores" : "historias";
    document.getElementById("f-titulo").value = h.titulo || "";
    document.getElementById("f-dominio").value = h.dominio || "";
    fDominio.dispatchEvent(new Event("change"));
    setTimeout(() => { fInstalacion.value = h.instalacion || ""; }, 0);
    document.getElementById("f-portada").value = h.portada || "";
    document.getElementById("f-introduccion").value = h.introduccion || "";
    document.getElementById("f-contenido").value = h.contenido || "";
    document.getElementById("f-velas").value = h.velas || 3;
    document.getElementById("f-sello").value = h.sello || "";
    document.getElementById("editor-submit-label").textContent = "";
    document.getElementById("btn-publicar").textContent = h.estado === "borrador" ? "Publicar" : "Guardar cambios";
    document.getElementById("btn-nueva").style.display = "none";
    adminError.textContent = "";
    mostrarVista("nueva", {
        taglinePersonalizado: "Editando",
        tituloPersonalizado: h.titulo
    });
}
