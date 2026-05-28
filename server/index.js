import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const port = process.env.PORT || 4173;
const clientRoot = join(process.cwd(), 'dist');

const state = {
  events: [
    { id: 1, title: 'Annual Coding League', type: 'Competition', status: 'Live', entries: 128 },
    { id: 2, title: 'Design Sprint Finale', type: 'Results', status: 'Draft', entries: 42 },
    { id: 3, title: 'Campus Quiz Cup', type: 'Winners', status: 'Ready', entries: 76 },
  ],
  winners: [
    { rank: 1, name: 'Aarav Sharma', score: '98 pts', award: 'Winner' },
    { rank: 2, name: 'Maya Nair', score: '94 pts', award: 'Runner Up' },
    { rank: 3, name: 'Ishan Rao', score: '91 pts', award: 'Third Place' },
  ],
  profile: { name: 'Rankify Admin', email: 'admin@rankify.app', brand: 'Rankify' },
};

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const requestedPath = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = normalize(join(clientRoot, requestedPath));
  if (!filePath.startsWith(clientRoot)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  try {
    const file = await readFile(filePath);
    response.writeHead(200, { 'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream' });
    response.end(file);
  } catch {
    const fallback = await readFile(join(clientRoot, 'index.html'));
    response.writeHead(200, { 'Content-Type': mimeTypes['.html'] });
    response.end(fallback);
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname === '/api/health') return sendJson(response, 200, { ok: true, app: 'Rankify' });
  if (url.pathname === '/api/events' && request.method === 'GET') return sendJson(response, 200, state.events);
  if (url.pathname === '/api/winners' && request.method === 'GET') return sendJson(response, 200, state.winners);
  if (url.pathname === '/api/profile' && request.method === 'GET') return sendJson(response, 200, state.profile);

  if (url.pathname === '/api/events' && request.method === 'POST') {
    const body = await readBody(request);
    const event = {
      id: Date.now(),
      title: body.title || 'Untitled Event',
      type: body.type || 'Competition',
      status: 'Draft',
      entries: Number(body.entries || 0),
    };
    state.events.unshift(event);
    return sendJson(response, 201, event);
  }

  if (url.pathname === '/api/winners' && request.method === 'PUT') {
    state.winners = await readBody(request);
    return sendJson(response, 200, state.winners);
  }

  if (url.pathname === '/api/profile' && request.method === 'PUT') {
    state.profile = { ...state.profile, ...(await readBody(request)) };
    return sendJson(response, 200, state.profile);
  }

  if (url.pathname.startsWith('/api/')) return sendJson(response, 404, { error: 'Not found' });
  return serveStatic(request, response);
});

server.listen(port, () => {
  console.log(`Rankify server running on http://localhost:${port}`);
});
