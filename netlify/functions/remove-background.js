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

                    // Token de Replicate
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

                    // Prompt para remera argentina
                    const prompt = "A person wearing the official Argentina national football team jersey. The shirt features wide light blue and white vertical stripes. Black crew neck collar. Gold Adidas logo on right chest, FIFA World Champions 2022 badge in center, AFA crest with three stars on left. Large black number 10 in center. Photorealistic, detailed fabric, 8k quality.";

                    console.log('Creating prediction with Replicate...');

                    // Crear predicción
                    const predictionResponse = await fetch('https://api.replicate.com/v1/predictions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Token ${replicateToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            version: '435bea2dcad1d1e0962cebdc56a0427f3f37ddf3189a10c5c0bd54f6c1a8ffce',
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
                        console.error('Replicate error:', predictionResponse.status, errorText);
                        resolve({
                            statusCode: 500,
                            body: JSON.stringify({ error: 'Replicate error', details: errorText })
                        });
                        return;
                    }

                    const prediction = await predictionResponse.json();
                    const predictionId = prediction.id;

                    console.log('Prediction ID:', predictionId);

                    // Polling hasta completarse
                    let completed = false;
                    let attempts = 0;
                    let resultImageUrl = null;

                    while (!completed && attempts < 240) { // 20 minutos max
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        attempts++;

                        const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
                            headers: { 'Authorization': `Token ${replicateToken}` }
                        });

                        const status = await statusResponse.json();
                        console.log(`Attempt ${attempts}: Status = ${status.status}`);

                        if (status.status === 'succeeded') {
                            completed = true;
                            resultImageUrl = status.output?.[0] || status.output;
                            console.log('Prediction succeeded! URL:', resultImageUrl);
                        } else if (status.status === 'failed') {
                            console.error('Prediction failed:', status.error);
                            resolve({
                                statusCode: 500,
                                body: JSON.stringify({ error: 'Prediction failed', details: status.error })
                            });
                            return;
                        }
                    }

                    if (!completed) {
                        console.error('Prediction timeout after 20 minutes');
                        resolve({
                            statusCode: 504,
                            body: JSON.stringify({ error: 'Prediction timeout' })
                        });
                        return;
                    }

                    if (!resultImageUrl) {
                        console.error('No image URL in output');
                        resolve({
                            statusCode: 500,
                            body: JSON.stringify({ error: 'No image URL returned' })
                        });
                        return;
                    }

                    // Descargar la imagen final
                    console.log('Downloading image from:', resultImageUrl);
                    const imageResponse = await fetch(resultImageUrl);
                    
                    if (!imageResponse.ok) {
                        console.error('Failed to download image:', imageResponse.status);
                        resolve({
                            statusCode: 500,
                            body: JSON.stringify({ error: 'Failed to download image' })
                        });
                        return;
                    }

                    const resultBuffer = await imageResponse.buffer();
                    const base64 = resultBuffer.toString('base64');

                    console.log('Image downloaded successfully, size:', resultBuffer.length);

                    resolve({
                        statusCode: 200,
                        headers: { 'Content-Type': 'image/png' },
                        body: base64,
                        isBase64Encoded: true
                    });

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
