document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('stickerCanvas');
    const ctx = canvas.getContext('2d');
    const imageUpload = document.getElementById('imageUpload');
    const cameraBtn = document.getElementById('cameraBtn');
    const cameraContainer = document.getElementById('cameraContainer');
    const cameraStream = document.getElementById('cameraStream');
    const captureBtn = document.getElementById('captureBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const loadingMsg = document.getElementById('loadingMsg');
    
    const inputs = ['playerName', 'playerDob', 'playerHeight', 'playerWeight'];
    inputs.forEach(id => document.getElementById(id).addEventListener('input', drawCanvas));

    let templateImg = new Image();
    let userPhoto = null;
    let stream = null;

    templateImg.onload = () => drawCanvas();
    templateImg.src = 'plantilla.png'; 

    // --- Subir Foto Directa ---
    imageUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            // Le pasamos el ARCHIVO directo a la IA para evitar el error de red
            processImageBlob(file, URL.createObjectURL(file));
        }
    });

    // --- Cámara ---
    cameraBtn.addEventListener('click', async () => {
        cameraContainer.style.display = 'block';
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            cameraStream.srcObject = stream;
        } catch (err) {
            alert("No se pudo acceder a la cámara.");
        }
    });

    captureBtn.addEventListener('click', () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = cameraStream.videoWidth;
        tempCanvas.height = cameraStream.videoHeight;
        tempCanvas.getContext('2d').drawImage(cameraStream, 0, 0);
        
        // Convertimos la captura a Blob seguro
        tempCanvas.toBlob((blob) => {
            stream.getTracks().forEach(track => track.stop());
            cameraContainer.style.display = 'none';
            processImageBlob(blob, URL.createObjectURL(blob));
        }, 'image/png');
    });
// --- CONEXIÓN A LA API DE PIXIAN (A TRAVÉS DE NETLIFY FUNCTIONS) ---
    async function quitarFondoConPixian(archivoImagen) {
        const formData = new FormData();
        formData.append('image', archivoImagen);

        try {
            // En desarrollo: http://localhost:8888/.netlify/functions/remove-background
            // En producción: https://tudominio.netlify.app/.netlify/functions/remove-background
            const endpoint = window.location.hostname === 'localhost' 
                ? 'http://localhost:8888/.netlify/functions/remove-background'
                : '/.netlify/functions/remove-background';

            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const blob = await response.blob();
                console.log("✅ Imagen sin fondo recibida correctamente");
                return URL.createObjectURL(blob); 
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error("❌ Error en la API:", response.status, errorData);
                return null;
            }
        } catch (error) {
            console.error("❌ Error de conexión:", error);
            alert("❌ Error al procesar la imagen. Intenta de nuevo.");
            return null;
        }
    }
    // --- COMPRIMIR IMAGEN ANTES DE ENVIAR ---
    function comprimirImagen(blob, callback) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Reducir tamaño si es muy grande
                if (width > 1200 || height > 1200) {
                    const ratio = Math.min(1200 / width, 1200 / height);
                    width *= ratio;
                    height *= ratio;
                }
                
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                
                // Convertir a blob comprimido (JPEG con 85% calidad)
                canvas.toBlob(callback, 'image/jpeg', 0.85);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(blob);
    }

    // --- NUEVO PROCESAMIENTO CON REPLICATE API ---
    async function processImageBlob(blobFile, fallbackUrl) {
        loadingMsg.textContent = "🤖 Comprimiendo imagen...";
        loadingMsg.style.display = 'block';
        downloadBtn.disabled = true;

        // Comprimir imagen primero
        comprimirImagen(blobFile, async (imagenComprimida) => {
            loadingMsg.textContent = "👕 Aplicando remera de la Selección...";
            
            // Llamamos a la función con la imagen comprimida
            const urlConRemera = await quitarFondoConPixian(imagenComprimida);

            if (urlConRemera) {
                // Si la API funcionó, usamos la imagen con remera
                userPhoto = new Image();
                userPhoto.src = urlConRemera;
                userPhoto.onload = () => {
                    loadingMsg.style.display = 'none';
                    downloadBtn.disabled = false;
                    drawCanvas(); // Dibujamos la figurita
                };
            } else {
                // Si la API falla, usamos la foto original con fondo
                userPhoto = new Image();
                userPhoto.src = fallbackUrl;
                userPhoto.onload = () => {
                    loadingMsg.style.display = 'none';
                    downloadBtn.disabled = false;
                    drawCanvas();
                };
            }
        });
    }

 // --- Dibujar Canvas ---
    function drawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Fondo
        if (templateImg.complete && templateImg.naturalWidth !== 0) {
            ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);
        }

        // Foto Jugador
        if (userPhoto) {
            const photoWidth = 360; 
            const photoHeight = (userPhoto.height / userPhoto.width) * photoWidth;
            const x = (canvas.width - photoWidth) / 2;
            const y = 40; 
            ctx.drawImage(userPhoto, x, y, photoWidth, photoHeight);
        }

        // Obtener Textos
        let rawName = document.getElementById('playerName').value.trim().toUpperCase();
        let dob = document.getElementById('playerDob').value.trim();
        let height = document.getElementById('playerHeight').value.trim().replace(/m/gi, '').trim();
        let weight = document.getElementById('playerWeight').value.trim().replace(/kg/gi, '').trim();

        let statsRow = "";
        if(dob || height || weight) {
            statsRow = `${dob}  |  ${height ? height + ' m' : ''}  |  ${weight ? weight + ' kg' : ''}`;
        }

        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFFFFF';

        // =========================================================
        // EL SECRETO: Un centro exclusivo para las cajas oscuras.
        // Como la caja no llega al borde derecho, el centro es menor a 250.
        const centroCajaX = 220; 
        // =========================================================

        // --- 1. TÍTULOS (Nombre y Apellido) ---
        const nombreY = 615; // Lo bajé un poquito
        
        if (rawName) {
            let words = rawName.split(" ");
            if (words.length > 1) {
                let lastName = words.pop(); 
                let firstName = words.join(" ");

                ctx.font = '22px Arial'; 
                let firstNameWidth = ctx.measureText(firstName + " ").width;
                ctx.font = 'bold 22px Arial'; 
                let lastNameWidth = ctx.measureText(lastName).width;
                
                let totalWidth = firstNameWidth + lastNameWidth;
                
                // Usamos el centro de la caja, no del canvas
                let startX = centroCajaX - (totalWidth / 2);

                ctx.font = '22px Arial';
                ctx.textAlign = 'left';
                ctx.fillText(firstName + " ", startX, nombreY); 
                
                ctx.font = 'bold 22px Arial';
                ctx.fillText(lastName, startX + firstNameWidth, nombreY);
            } else {
                ctx.font = 'bold 22px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(rawName, centroCajaX, nombreY);
            }
        }

        // --- 2. ESTADÍSTICAS ---
        ctx.textAlign = 'center';
        ctx.font = '14px Arial'; 
        ctx.fillStyle = '#E0E0E0';
        const statsY = 642; // Bajado un poquito para que respire
        // Usamos el mismo centro visual
        ctx.fillText(statsRow, centroCajaX, statsY);

        // --- 3. EQUIPO (La Scaloneta) ---
        ctx.font = 'bold 15px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left'; 
        // X ajustado a 75, y bajado a 685 para centrarlo en su recuadro
        ctx.fillText('LA SCALONETA (ARG)', 75, 685); 
    }

    downloadBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = 'mi-figurita.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });

});