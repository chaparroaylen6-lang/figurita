const fetch = require('node-fetch');
const FormData = require('form-data');

exports.handler = async (event, context) => {
    // Solo permitir POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Decodificar el archivo del body (multipart form data)
        const busboy = require('busboy');
        const bb = busboy({ headers: event.headers });

        let imageBuffer;
        let filename;
        let mimetype;

        return new Promise((resolve) => {
            bb.on('file', (fieldname, file, info) => {
                const chunks = [];
                file.on('data', (data) => chunks.push(data));
                file.on('end', () => {
                    imageBuffer = Buffer.concat(chunks);
                    filename = info.filename;
                    mimetype = info.encoding;
                });
            });

            bb.on('finish', async () => {
                try {
                    if (!imageBuffer) {
                        resolve({
                            statusCode: 400,
                            body: JSON.stringify({ error: 'No file uploaded' })
                        });
                        return;
                    }

                    // Credenciales de Pixian
                    const username = 'pxz5gcancjm9sqn';
                    const password = 'akf78dme8dpggdiovaqm7a30uppuahjisden253dl8iiffcolpac';
                    const auth = Buffer.from(`${username}:${password}`).toString('base64');

                    // Crear FormData para enviar a Pixian
                    const formData = new FormData();
                    formData.append('image', imageBuffer, {
                        filename: filename || 'image.png',
                        contentType: mimetype || 'image/png'
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
                        resolve({
                            statusCode: response.status,
                            body: JSON.stringify({ 
                                error: `Pixian API error: ${response.statusText}`,
                                details: errorText 
                            })
                        });
                        return;
                    }

                    // Convertir respuesta a base64
                    const imageData = await response.buffer();
                    const base64 = imageData.toString('base64');

                    resolve({
                        statusCode: 200,
                        headers: {
                            'Content-Type': 'image/png'
                        },
                        body: base64,
                        isBase64Encoded: true
                    });

                } catch (error) {
                    console.error('Error removing background:', error);
                    resolve({
                        statusCode: 500,
                        body: JSON.stringify({ error: error.message })
                    });
                }
            });

            bb.write(event.body, event.isBase64Encoded ? 'base64' : 'binary');
            bb.end();
        });

    } catch (error) {
        console.error('Handler error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
