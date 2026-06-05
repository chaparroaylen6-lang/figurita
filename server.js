const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Configurar multer para recibir archivos
const upload = multer({ storage: multer.memoryStorage() });

// Servir archivos estáticos (HTML, CSS, JS)
app.use(express.static(__dirname));

// Endpoint para quitar fondo
app.post('/remove-background', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Credenciales de Pixian
        const username = 'pxz5gcancjm9sqn';
        const password = 'akf78dme8dpggdiovaqm7a30uppuahjisden253dl8iiffcolpac';
        const auth = Buffer.from(`${username}:${password}`).toString('base64');

        // Crear FormData para enviar a Pixian
        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('image', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });

        // Solicitud a Pixian.ai
        const response = await fetch('https://api.pixian.ai/api/v2/remove-background', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Pixian API error:', response.status, errorText);
            return res.status(response.status).json({ 
                error: `Pixian API error: ${response.statusText}`,
                details: errorText 
            });
        }

        // Enviar la imagen sin fondo al cliente
        const imageBuffer = await response.buffer();
        res.set('Content-Type', 'image/png');
        res.send(imageBuffer);

    } catch (error) {
        console.error('Error removing background:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Servidor ejecutándose en http://localhost:${PORT}`);
    console.log('📸 Listo para procesar imágenes');
});
