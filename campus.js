import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { firebaseConfig, fetchDominios } from "./firebase-shared.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const tabsEl = document.getElementById("campus-tabs");
const panelsEl = document.getElementById("campus-panels");

function activar(slug){
    tabsEl.querySelectorAll(".campus-tab").forEach(t => t.classList.toggle("active", t.dataset.campus === slug));
    panelsEl.querySelectorAll(".campus-panel").forEach(p => p.classList.toggle("active", p.dataset.campus === slug));
    history.replaceState(null, "", `#${slug}`);
}

async function init(){
    const dominios = await fetchDominios(db);
    const slugs = Object.keys(dominios);

    if(!slugs.length){
        panelsEl.innerHTML = `<p class="empty-note" style="padding:80px 0;">Todavía no hay dominios cargados. Entra al Panel de Conductores para crear el primero.</p>`;
        return;
    }

    tabsEl.innerHTML = slugs.map(slug =>
        `<button class="campus-tab" data-campus="${slug}">${dominios[slug].nombre}</button>`
    ).join("");

    panelsEl.innerHTML = slugs.map((slug, i) => {
        const d = dominios[slug];
        const instalaciones = d.instalaciones.map(inst => `
            <a class="installation-card" href="blog.html?dominio=${encodeURIComponent(slug)}&instalacion=${encodeURIComponent(inst.nombre)}">
                <div class="frame"><img src="${inst.imagen || 'img/Logos/serpiente.png'}" alt="${inst.nombre}"></div>
                <h3>${inst.nombre}</h3>
                <p>${inst.descripcion || ""}</p>
                <span class="ver-historias">Ver historias →</span>
            </a>
        `).join("");

        return `
            <section class="campus-panel ${i % 2 === 0 ? "section-dark" : "section-darker"}" data-campus="${slug}">
                <div class="container">
                    <div class="campus-panel-intro">
                        <span class="tagline">${d.tagline || ""}</span>
                        <h2 class="section-title">${d.nombre}</h2>
                        <p>${d.descripcion || ""}</p>
                    </div>
                    <div class="installations">
                        ${instalaciones || `<p class="empty-note">Este dominio todavía no tiene instalaciones.</p>`}
                    </div>
                </div>
            </section>
        `;
    }).join("");

    tabsEl.querySelectorAll(".campus-tab").forEach(tab => {
        tab.addEventListener("click", () => activar(tab.dataset.campus));
    });

    const fromHash = window.location.hash.replace("#", "");
    const fromQuery = new URLSearchParams(window.location.search).get("ciudad");
    activar(slugs.includes(fromHash) ? fromHash : (slugs.includes(fromQuery) ? fromQuery : slugs[0]));
}

init();
