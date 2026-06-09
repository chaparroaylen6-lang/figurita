
const figuritasDisponibles = [
    { id: 1, nombre: "JavaScript", tipo: "lenguaje", rareza: "común" },
    { id: 2, nombre: "Python", tipo: "lenguaje", rareza: "común" },
    { id: 3, nombre: "Java", tipo: "lenguaje", rareza: "común" },
    { id: 4, nombre: "C", tipo: "lenguaje", rareza: "rara" },
    { id: 5, nombre: "C++", tipo: "lenguaje", rareza: "rara" },
    { id: 6, nombre: "C#", tipo: "lenguaje", rareza: "rara" },
    { id: 7, nombre: "Go", tipo: "lenguaje", rareza: "épica" },
    { id: 8, nombre: "Rust", tipo: "lenguaje", rareza: "épica" },
    { id: 9, nombre: "Kotlin", tipo: "lenguaje", rareza: "épica" },
    { id: 10, nombre: "Swift", tipo: "lenguaje", rareza: "legendaria" },
    { id: 11, nombre: "Ada Lovelace", tipo: "programador", rareza: "legendaria" },
    { id: 12, nombre: "Linus Torvalds", tipo: "programador", rareza: "épica" },
    { id: 13, nombre: "Dennis Ritchie", tipo: "programador", rareza: "legendaria" },
    { id: 14, nombre: "Bjarne Stroustrup", tipo: "programador", rareza: "épica" },
    { id: 15, nombre: "Guido van Rossum", tipo: "programador", rareza: "legendaria" },
    { id: 16, nombre: "James Gosling", tipo: "programador", rareza: "épica" },
    { id: 17, nombre: "Brendan Eich", tipo: "programador", rareza: "rara" },
    { id: 18, nombre: "Anders Hejlsberg", tipo: "programador", rareza: "épica" },
    { id: 19, nombre: "Grace Hopper", tipo: "programador", rareza: "legendaria" },
    { id: 20, nombre: "Ken Thompson", tipo: "programador", rareza: "legendaria" }
];
  
const rutasImagenes = {
    1: "imagenes/js.png", 2: "imagenes/python.png", 3: "imagenes/java.png", 4: "imagenes/c.png", 5: "imagenes/c++.png",
    6: "imagenes/c#.png", 7: "imagenes/go.png", 8: "imagenes/rust.png", 9: "imagenes/kotlin.png", 10: "imagenes/swift.png",
    11: "imagenes/ada.png", 12: "imagenes/linus.png", 13: "imagenes/dennis.png", 14: "imagenes/bjarne.png", 15: "imagenes/guido.png",
    16: "imagenes/james.png", 17: "imagenes/brendan.png", 18: "imagenes/anders.png", 19: "imagenes/grace.png", 20: "imagenes/ken.png"
};
  
const coloresRareza = {
    "legendaria": "#D4AF37", 
    "épica": "#8A2BE2",      
    "rara": "#2E8B57",       
    "común": "#808080"       
};

function decorarTextoEspecial(texto) {
    let textoDecorado = '';
    for (let i = 0; i < texto.length; i++) {
        textoDecorado += texto[i];
        if (texto[i] === ' ') textoDecorado += '☆ ';
    }
    return ` ${textoDecorado} ✩`;
}

// --- Lógica de Modales ---
const modalPaquete = document.getElementById('modalPaquete');
const modalDetalle = document.getElementById('modalDetalle');

document.getElementById('closePaquete').onclick = () => modalPaquete.style.display = "none";
document.getElementById('closeDetalle').onclick = () => modalDetalle.style.display = "none";
window.onclick = (event) => {
    if (event.target == modalPaquete) modalPaquete.style.display = "none";
    if (event.target == modalDetalle) modalDetalle.style.display = "none";
}

// --- 2. Abrir Paquete Diario ---
function abrirPaqueteDiario() {
    const hoy = new Date().toDateString();
    const ultimoDiaAbierto = localStorage.getItem('ultimoDiaPaquete');
    
    const tituloPaquete = document.getElementById('tituloPaquete');
    const textoPaquete = document.getElementById('textoPaquete');
    const contenedorCartas = document.getElementById('cartasGanadas');

    if (ultimoDiaAbierto === hoy) {
        // Si ya abrió el paquete hoy: cambiamos el título y ocultamos el texto confuso
        tituloPaquete.innerText = "¡Paciencia!";
        textoPaquete.style.display = "none";
        contenedorCartas.innerHTML = "<p style='font-size: 1.2rem; color: var(--dark-text); font-weight: bold;'>Ya abriste tu paquete de hoy. ¡Volvé mañana! ⏳</p>";
        
        modalPaquete.style.display = 'flex';
        return;
    }

    // Si es un paquete nuevo: nos aseguramos de que el texto y título estén correctos
    tituloPaquete.innerText = "¡Paquete Abierto!";
    textoPaquete.style.display = "block";
    textoPaquete.innerText = "Has conseguido estas figuritas:";

    let nuevasFiguritas = [];
    for(let i = 0; i < 3; i++) {
        const indexAleatorio = Math.floor(Math.random() * figuritasDisponibles.length);
        nuevasFiguritas.push(figuritasDisponibles[indexAleatorio]);
    }

    let miAlbum = JSON.parse(localStorage.getItem('miAlbum')) || [];
    miAlbum = miAlbum.concat(nuevasFiguritas);
    localStorage.setItem('miAlbum', JSON.stringify(miAlbum));
    localStorage.setItem('ultimoDiaPaquete', hoy);

    contenedorCartas.innerHTML = ''; 
    
    nuevasFiguritas.forEach((fig, index) => {
        const img = document.createElement('img');
        img.src = rutasImagenes[fig.id];
        img.classList.add('carta-ganada');
        img.style.animationDelay = `${index * 0.3}s`;

        const colorAsignado = coloresRareza[fig.rareza.toLowerCase()] || coloresRareza["común"];
        img.style.border = `4px solid ${colorAsignado}`;
        contenedorCartas.appendChild(img);
    });

    modalPaquete.style.display = 'flex';
    mostrarAlbum(); 
}
// --- 3. Pegar en Álbum y Clic ---
function pegarFiguritaEnAlbum(id) {
    const slot = document.querySelector(`.figurita-slot[data-id="${id}"]`);
    
    if (slot) {
        const img = slot.querySelector('.figurita-img');
        const info = slot.querySelector('.figurita-info');
        
        if (!img.classList.contains('obtenida')) {
            img.src = rutasImagenes[id];
            img.classList.add('obtenida');

            const datos = figuritasDisponibles.find(f => f.id === parseInt(id));

            if (datos) {
                const rareza = datos.rareza.toLowerCase();
                const colorAsignado = coloresRareza[rareza] || coloresRareza["común"];

                info.style.color = colorAsignado;

                if (rareza === "legendaria" || rareza === "épica") {
                    info.innerText = decorarTextoEspecial(datos.nombre);
                    info.style.fontWeight = "bold";
                } else {
                    info.innerText = datos.nombre;
                    info.style.fontWeight = "normal";
                }

                img.style.border = `4px solid ${colorAsignado}`; 
                img.style.borderRadius = "8px"; 

                slot.onclick = () => {
                    const imgDetalle = document.getElementById('imgDetalle');
                    const nombreDetalle = document.getElementById('nombreDetalle');
                    
                    imgDetalle.src = rutasImagenes[id];
                    imgDetalle.style.border = `6px solid ${colorAsignado}`;
                    
                    nombreDetalle.innerText = datos.nombre;
                    nombreDetalle.style.color = colorAsignado;
                    
                    modalDetalle.style.display = 'flex';
                };
            }
        }
    }
}
  
// --- 4. Mostrar el álbum en pantalla ---
function mostrarAlbum() {
    const miAlbum = JSON.parse(localStorage.getItem('miAlbum')) || [];
    const idsObtenidos = [...new Set(miAlbum.map(figurita => figurita.id))];
    idsObtenidos.forEach(id => pegarFiguritaEnAlbum(id));
}

// --- 5. Inicializar el Libro (4 por página: 2x2) ---
function inicializarLibro() {
    const flipbook = document.getElementById('flipbook');
    const figuritasPorPagina = 4; 
    let htmlPaginas = '';
    
    // Generar hojas internas
    for (let i = 0; i < figuritasDisponibles.length; i += figuritasPorPagina) {
        const grupo = figuritasDisponibles.slice(i, i + figuritasPorPagina);
        
        htmlPaginas += `<div class="page"><div class="page-content">`;
        
        grupo.forEach(fig => {
            htmlPaginas += `
                <div class="figurita-slot" data-id="${fig.id}">
                    <div class="slot-back">${fig.id}</div>
                    <img src="" alt="${fig.nombre}" class="figurita-img">
                    <div class="figurita-info">${fig.nombre}</div>
                </div>
            `;
        });
        
        htmlPaginas += `</div></div>`;
    }

    // Inyectar tapas con IMÁGENES
    flipbook.innerHTML = `
        <div class="hard cover" style="background-image: url('imagenes/tapa.png'); background-size: cover; background-position: center; border-radius: 0 10px 10px 0; border: none;">
            </div>
        
        
        ${htmlPaginas}
        
        
        <div class="hard cover" style="background-image: url('imagenes/contratapa.png'); background-size: cover; background-position: center; border-radius: 10px 0 0 10px; border: none;">
        </div>
    `;

    // Iniciar librería Turn.js
    let esCelular = window.innerWidth <= 768;
    $(flipbook).turn({
        width: esCelular ? window.innerWidth * 0.9 : 800,
        height: 550,
        autoCenter: false,  
        display: esCelular ? 'single' : 'double',
        elevation: 50,
        gradients: true,
        duration: 1000
    });

    // --- MAGIA DEL CENTRADO MANUAL Y ANIMADO ---
    flipbook.style.transition = "transform 0.6s ease-in-out"; 
    
    function ajustarDesplazamiento(pagina) {
        esCelular = window.innerWidth <= 768;
        const totalPags = $(flipbook).turn('pages');
        
        if (!esCelular) {
            if (pagina === 1) {
                flipbook.style.transform = "translateX(-200px)";
            } else if (pagina === totalPags) {
                flipbook.style.transform = "translateX(200px)";
            } else {
                flipbook.style.transform = "translateX(0px)";
            }
        } else {
            flipbook.style.transform = "translateX(0px)"; // En celular no se desplaza
        }
    }

    // Centrado inicial
    ajustarDesplazamiento(1);

    // --- LÓGICA DE BOTONES INTELIGENTES ---
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');

    btnPrev.classList.add('btn-disabled');

    // Evento: Se dispara cada vez que pasamos una página
    $(flipbook).bind('turning', function(event, page, view) {
        const totalPags = $(this).turn('pages');

        // 1. Apagar/Prender botones
        if (page === 1) btnPrev.classList.add('btn-disabled');
        else btnPrev.classList.remove('btn-disabled');

        if (page === totalPags) btnNext.classList.add('btn-disabled');
        else btnNext.classList.remove('btn-disabled');

        // 2. Animación de desplazamiento
        ajustarDesplazamiento(page);
    });

    // --- ¡NUEVO!: OPTIMIZACIÓN RESPONSIVE DINÁMICA ---
    // Detecta cuando giran el celu o cambian el tamaño de pantalla
    window.addEventListener('resize', () => {
        esCelular = window.innerWidth <= 768;
        const nuevoAncho = esCelular ? window.innerWidth * 0.9 : 800;
        
        // Forzamos a Turn.js a redimensionar el libro y cambiar el modo de vista
        $(flipbook).turn('size', nuevoAncho, 550);
        $(flipbook).turn('display', esCelular ? 'single' : 'double');
        
        // Corregimos la posición del libro en pantalla
        const paginaActual = $(flipbook).turn('page');
        ajustarDesplazamiento(paginaActual);
    });

    btnPrev.addEventListener('click', () => {
        if (!btnPrev.classList.contains('btn-disabled')) {
            $('#flipbook').turn('previous');
        }
    });
    
    btnNext.addEventListener('click', () => {
        if (!btnNext.classList.contains('btn-disabled')) {
            $('#flipbook').turn('next');
        }
    });
}
// --- 6. Evento Principal de Carga ---
document.addEventListener("DOMContentLoaded", () => {
    const btnAbrir = document.getElementById('btnAbrirPaquete');
    if (btnAbrir) btnAbrir.addEventListener('click', abrirPaqueteDiario);
    
    inicializarLibro();
    mostrarAlbum();
});