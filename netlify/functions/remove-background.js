const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    // Solo permitir POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Decodificar el archivo del body
        const busboy = require('busboy');
        const bb = busboy({ headers: event.headers });

        let imageBuffer;

        return new Promise((resolve) => {
            bb.on('file', (fieldname, file, info) => {
                const chunks = [];
                file.on('data', (data) => chunks.push(data));
                file.on('end', () => {
                    imageBuffer = Buffer.concat(chunks);
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

                    // Token de Replicate (desde variables de entorno)
                    const replicateToken = process.env.REPLICATE_API_TOKEN;
                    if (!replicateToken) {
                        resolve({
                            statusCode: 500,
                            body: JSON.stringify({ error: 'REPLICATE_API_TOKEN no configurado' })
                        });
                        return;
                    }

                    // Convertir imagen a base64
                    const imageBase64 = imageBuffer.toString('base64');
                    const imageDataUrl = `data:image/png;base64,${imageBase64}`;

                    // Prompt para generar el usuario con la remera argentina
                    const prompt = "A person wearing the official Argentina national football team jersey. The shirt features wide light blue and white vertical stripes. Black crew neck collar, black trim on cuffs. Gold Adidas logo on right chest, FIFA World Champions 2022 badge in center, AFA crest with three stars on left. Large black number 10 in center. Photorealistic, detailed fabric texture, 8k quality.";

                    // Crear predicción con Stable Diffusion
                    const predictionResponse = await fetch('https://api.replicate.com/v1/predictions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Token ${replicateToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            version: '435bea2dcad1d1e0962cebdc56a0427f3f37ddf3189a10c5c0bd54f6c1a8ffce', // Stable Diffusion 3.5 Large
                            input: {
                                prompt: prompt,
                                image: imageDataUrl,
                                strength: 0.7,
                                cfg: 4.5
                            }
                        })
                    });

                    if (!predictionResponse.ok) {
                        const errorText = await predictionResponse.text();
                        console.error('Replicate API error:', predictionResponse.status, errorText);
                        resolve({
                            statusCode: predictionResponse.status,
                            body: JSON.stringify({ error: 'Replicate API error', details: errorText })
                        });
                        return;
                    }

                    const prediction = await predictionResponse.json();
                    const predictionId = prediction.id;

                    // Esperar a que se complete
                    let completed = false;
                    let attempts = 0;

                    while (!completed && attempts < 120) {
                        await new Promise(resolve => setTimeout(resolve, 5000));

                        const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
                            headers: { 'Authorization': `Token ${replicateToken}` }
                        });

                        const status = await statusResponse.json();

                        if (status.status === 'succeeded') {
                            completed = true;
                            const resultImageUrl = status.output[0];

                            const imageResponse = await fetch(resultImageUrl);
                            const resultBuffer = await imageResponse.buffer();
                            const base64 = resultBuffer.toString('base64');

                            resolve({
                                statusCode: 200,
                                headers: { 'Content-Type': 'image/png' },
                                body: base64,
                                isBase64Encoded: true
                            });
                        } else if (status.status === 'failed') {
                            resolve({
                                statusCode: 500,
                                body: JSON.stringify({ error: 'Prediction failed', details: status.error })
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
                    console.error('Error:', error);
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
