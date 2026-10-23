// ---------- Menú móvil ----------
function showMenu(){
    document.getElementById("navLinks").classList.add("open");
}
function hideMenu(){
    document.getElementById("navLinks").classList.remove("open");
}

// ---------- Carrusel de testimonios ----------
function initCarousel(rootId){
    const root = document.getElementById(rootId);
    if(!root) return;
    const track = root.querySelector(".carousel-track");
    const slides = root.querySelectorAll(".carousel-slide");
    const dotsWrap = root.querySelector(".carousel-dots");
    let index = 0;

    slides.forEach((_, i) => {
        const dot = document.createElement("button");
        if(i === 0) dot.classList.add("active");
        dot.addEventListener("click", () => goTo(i));
        dotsWrap.appendChild(dot);
    });

    function goTo(i){
        index = i;
        track.style.transform = `translateX(-${index * 100}%)`;
        dotsWrap.querySelectorAll("button").forEach((d, di) => {
            d.classList.toggle("active", di === index);
        });
    }

    let timer = setInterval(() => goTo((index + 1) % slides.length), 6000);
    root.addEventListener("mouseenter", () => clearInterval(timer));
    root.addEventListener("mouseleave", () => {
        timer = setInterval(() => goTo((index + 1) % slides.length), 6000);
    });
}

// ---------- Pestañas de Campus ----------
function initCampusTabs(){
    const tabs = document.querySelectorAll(".campus-tab");
    const panels = document.querySelectorAll(".campus-panel");
    if(!tabs.length) return;

    function activate(name){
        tabs.forEach(t => t.classList.toggle("active", t.dataset.campus === name));
        panels.forEach(p => p.classList.toggle("active", p.dataset.campus === name));
        history.replaceState(null, "", `#${name}`);
    }

    tabs.forEach(tab => {
        tab.addEventListener("click", () => activate(tab.dataset.campus));
    });

    const fromHash = window.location.hash.replace("#", "");
    const fromQuery = new URLSearchParams(window.location.search).get("ciudad");
    const initial = fromHash || fromQuery || tabs[0].dataset.campus;
    activate(initial);
}

document.addEventListener("DOMContentLoaded", () => {
    initCarousel("testimonios-carousel");
    initCampusTabs();
});
