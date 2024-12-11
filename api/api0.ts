import { IncomingMessage, ServerResponse } from 'http';
// import fetch from 'node-fetch';
import { pipeline } from 'stream';
import { promisify } from 'util';

const pipelineAsync = promisify(pipeline);

export default async function handler(req: IncomingMessage, res: ServerResponse) {
    const setHeaders = () => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    }

    setHeaders();
    if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
    }

    const url = req.url!.split('/').slice(2).join('/');

    if (!url) {
        res.statusCode = 400;
        res.end('URL is required');
        return;
    }

    try {
        const response = await fetch(`https://${url}`, {
            headers: {
                ...Object.fromEntries(Object.entries(req.headers).filter(([key]) => !['host', 'connection', 'accept-encoding', 'origin'].includes(key))) as any,
            }
        });

        if (!response.ok) {
            res.statusCode = response.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: `Failed to fetch the file: ${response.statusText} (${response.status})` }));
            return;
        }

        // Copy the headers from the response to the server response eg for caching
        for (const [key, value] of response.headers.entries()) {
            res.setHeader(key, value);
        }

        setHeaders();

        await pipelineAsync(response.body!, res);
    } catch (error) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: `Internal Server Error: ${error.message}` }));
    }
}
