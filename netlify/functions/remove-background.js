const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

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

                    // Token de Replicate (desde variables de entorno de Netlify)
                    const replicateToken = process.env.REPLICATE_API_TOKEN;
                    if (!replicateToken) {
                        resolve({
                            statusCode: 500,
                            body: JSON.stringify({ error: 'REPLICATE_API_TOKEN no configurado en Netlify' })
                        });
                        return;
                    }

                    // Convertir imagen a base64
                    const imageBase64 = imageBuffer.toString('base64');
                    const imageDataUrl = `data:image/png;base64,${imageBase64}`;

                    // Ruta local de la remera
                    const shirtPath = path.join(__dirname, '../../remera.png');
                    let shirtDataUrl = null;

                    if (fs.existsSync(shirtPath)) {
                        const shirtBuffer = fs.readFileSync(shirtPath);
                        const shirtBase64 = shirtBuffer.toString('base64');
                        shirtDataUrl = `data:image/png;base64,${shirtBase64}`;
                    }

                    // Crear predicción en Replicate (virtual try-on)
                    const predictionResponse = await fetch('https://api.replicate.com/v1/predictions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Token ${replicateToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            version: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                            input: {
                                image: imageDataUrl,
                                garment: shirtDataUrl || 'https://example.com/default-shirt.png'
                            }
                        })
                    });

                    if (!predictionResponse.ok) {
                        const errorText = await predictionResponse.text();
                        console.error('Replicate API error:', predictionResponse.status, errorText);
                        resolve({
                            statusCode: predictionResponse.status,
                            body: JSON.stringify({ 
                                error: `Replicate API error: ${predictionResponse.statusText}`,
                                details: errorText 
                            })
                        });
                        return;
                    }

                    const prediction = await predictionResponse.json();
                    const predictionId = prediction.id;

                    // Esperar a que se complete la predicción
                    let completed = false;
                    let attempts = 0;
                    const maxAttempts = 60; // 5 minutos máximo

                    while (!completed && attempts < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 5000)); // Esperar 5 segundos

                        const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
                            headers: {
                                'Authorization': `Token ${replicateToken}`
                            }
                        });

                        const status = await statusResponse.json();

                        if (status.status === 'succeeded') {
                            completed = true;
                            const resultImageUrl = status.output;

                            // Descargar la imagen resultado
                            const imageResponse = await fetch(resultImageUrl);
                            const resultBuffer = await imageResponse.buffer();
                            const base64 = resultBuffer.toString('base64');

                            resolve({
                                statusCode: 200,
                                headers: {
                                    'Content-Type': 'image/png'
                                },
                                body: base64,
                                isBase64Encoded: true
                            });
                        } else if (status.status === 'failed') {
                            resolve({
                                statusCode: 500,
                                body: JSON.stringify({ 
                                    error: 'Prediction failed',
                                    details: status.error 
                                })
                            });
                            completed = true;
                        }

                        attempts++;
                    }

                    if (!completed) {
                        resolve({
                            statusCode: 504,
                            body: JSON.stringify({ error: 'Prediction timeout' })
                        });
                    }

                } catch (error) {
                    console.error('Error in try-on:', error);
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
