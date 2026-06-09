
import { removeBackground as imglyRemoveBackground } from "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm";

// ==========================
// REFERENCIAS HTML
// ==========================

const canvas = document.getElementById("stickerCanvas");
const ctx = canvas.getContext("2d");
const imageUpload = document.getElementById("imageUpload");
const loadingMsg = document.getElementById("loadingMsg");
const downloadBtn = document.getElementById("downloadBtn");

const cameraBtn = document.getElementById("cameraBtn");
const captureBtn = document.getElementById("captureBtn");
const cameraStream = document.getElementById("cameraStream");
const cameraContainer = document.getElementById("cameraContainer");


window.addEventListener('load', () => { setTimeout(() => { document.getElementById('pantallaCarga').classList.add('ocultar-carga'); }, 2000); });
// ==========================
// ELIMINAR FONDO CON @IMGLY
// ==========================
async function removeBackground(file) {
    try {
        const blob = await imglyRemoveBackground(file);
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error("Detalle del error:", error);
        alert("Algo falló al recortar. Abre la consola (F12) para ver más detalles.");
        throw error;
    }
}

// ==========================
// PLANTILLA
// ==========================

const plantilla = new Image();
plantilla.src = "plantilla.png";

// Dibujamos la plantilla apenas carga la página
plantilla.onload = () => {
    ctx.drawImage(plantilla, 0, 0, canvas.width, canvas.height);
};

let imagenActual = null;
let currentCameraStream = null;

// ==========================
// GENERAR FIGURITA
// ==========================

async function generarFigurita(imagenProcesada = null) {
    // Si pasamos una imagen nueva, la guardamos
    if (imagenProcesada) {
        imagenActual = imagenProcesada;
    }

    // 1. Limpiamos el canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. CAPA 1: DIBUJAR PLANTILLA (El fondo base)
    ctx.drawImage(plantilla, 0, 0, canvas.width, canvas.height);

    // 3. CAPA 2: DIBUJAR FOTO RECORTADA (Encima del fondo)
    if (imagenActual) {
        const foto = new Image();
        foto.src = imagenActual;
        await foto.decode();
        // Coordenadas ajustadas para encajar sobre el 26 y no tapar la barra de datos
        ctx.drawImage(foto, 25, 40, 400, 490);
    }

    // 4. OBTENER TEXTOS
    const nombre = document.getElementById("playerName")?.value.toUpperCase() || "";
    const apellido = document.getElementById("playerSurname")?.value.toUpperCase() || "";
    const fecha = document.getElementById("playerDob")?.value || "";
    const altura = document.getElementById("playerHeight")?.value || "";
    const peso = document.getElementById("playerWeight")?.value || "";
    const titulo = document.getElementById("playerTitle")?.value || "";

    // 5. CAPA 3: DIBUJAR TEXTOS (Encima de todo)
    ctx.fillStyle = "white";
    
    // Alineamos al centro visual del recuadro verde (X = 220)
    ctx.textAlign = "center"; 

    // Nombre y Apellido
    ctx.font = "bold 32px Arial";
    const nombreCompleto = `${nombre} ${apellido}`.trim();
    // Uso tus coordenadas Y para mantener el diseño que elegiste
    ctx.fillText(nombreCompleto, 220, 625);

    // Datos físicos (Fecha / Altura / Peso)
    ctx.font = "20px Arial";
    let datosArray = [];
    if (fecha) datosArray.push(fecha);
    if (altura) datosArray.push(altura + (altura.toLowerCase().includes('m') ? '' : 'm')); 
    if (peso) datosArray.push(peso + (peso.toLowerCase().includes('k') ? '' : 'kg')); 
    
    const datosFisicos = datosArray.join(" / ");
    ctx.fillText(datosFisicos, 215, 645);

    // Título (@Usuario)
    ctx.font = "24px Arial";
    ctx.fillText(titulo, 200, 685);
}

// ==========================
// SUBIR IMAGEN
// ==========================

imageUpload.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    loadingMsg.style.display = "block";

    try {
        const pngSinFondo = await removeBackground(file);
        await generarFigurita(pngSinFondo);
        downloadBtn.disabled = false;
    } catch (error) {
        console.error(error);
        alert("Error procesando la imagen");
    }

    loadingMsg.style.display = "none";
});

// ==========================
// CAMARA
// ==========================

cameraBtn.addEventListener("click", async () => {
    try {
        currentCameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        cameraStream.srcObject = currentCameraStream;
        cameraContainer.style.display = "block";
    } catch (error) {
        console.error(error);
        alert("No se pudo acceder a la cámara");
    }
});

// ==========================
// CAPTURA
// ==========================

captureBtn.addEventListener("click", async () => {
    try {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = cameraStream.videoWidth;
        tempCanvas.height = cameraStream.videoHeight;
        tempCanvas.getContext("2d").drawImage(cameraStream, 0, 0);

        const blob = await new Promise(resolve => tempCanvas.toBlob(resolve, "image/png"));
        const file = new File([blob], "captura.png", { type: "image/png" });

        loadingMsg.style.display = "block";

        const pngSinFondo = await removeBackground(file);
        await generarFigurita(pngSinFondo);
        downloadBtn.disabled = false;

        // Apagar cámara
        if (currentCameraStream) {
            currentCameraStream.getTracks().forEach(track => track.stop());
        }
        cameraContainer.style.display = "none";

    } catch (error) {
        console.error(error);
        alert("Error capturando foto");
    }
    loadingMsg.style.display = "none";
});

// ==========================
// DESCARGAR
// ==========================

downloadBtn.addEventListener("click", () => {
    const link = document.createElement("a");
    link.download = "figurita.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
});

// ==========================
// ACTUALIZAR AL ESCRIBIR
// ==========================

document.querySelectorAll("input").forEach(input => {
    input.addEventListener("input", async () => {
        // Ejecutamos la función de dibujo en cada letra que escribas
        await generarFigurita();
    });
});
