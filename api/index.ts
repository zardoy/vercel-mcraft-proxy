import { IncomingMessage, ServerResponse } from 'http';
// import fetch from 'node-fetch';
import { pipeline } from 'stream';
import { promisify } from 'util';

const pipelineAsync = promisify(pipeline);

export default async function handler(req: IncomingMessage, res: ServerResponse) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.end();
        return;
    }

    // const url = new URL(req.url!, `http://${req.headers.host}`).pathname.split('/').slice(1).join('/')
    const url = req.url!.split('/').slice(2).join('/')

    if (!url) {
        res.statusCode = 400;
        res.end('URL is required');
        return;
    }

    try {
        const response = await fetch(url, {
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

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        await pipelineAsync(response.body!, res);
    } catch (error) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: `Internal Server Error: ${error.message}` }));
    }
}
