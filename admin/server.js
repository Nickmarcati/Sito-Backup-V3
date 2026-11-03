const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data', 'prodotti.json');
const MEDIA = path.join(ROOT, 'images-store');
const PORT = 8090;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const send = (res, code, dati) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', ...CORS });
  res.end(JSON.stringify(dati));
};

const readBody = (req) => new Promise((resolve, reject) => {
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  req.on('error', reject);
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const p = url.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    return res.end();
  }

  try {
    if (req.method === 'GET' && p === '/api/prodotti') {
      return send(res, 200, JSON.parse(fs.readFileSync(DATA, 'utf8')));
    }

    if (req.method === 'GET' && p === '/api/media') {
      const files = fs.readdirSync(MEDIA).filter(f => /\.(jpe?g|png|webp|gif)$/i.test(f));
      return send(res, 200, { files });
    }

    if (req.method === 'POST' && p === '/api/prodotti') {
      const dati = JSON.parse(await readBody(req));
      if (!dati || !Array.isArray(dati.prodotti)) return send(res, 400, { error: 'Dati non validi' });
      fs.writeFileSync(DATA, JSON.stringify(dati, null, 2), 'utf8');
      return send(res, 200, { ok: true });
    }

    if (req.method === 'POST' && p === '/api/upload') {
      const dati = JSON.parse(await readBody(req));
      const nome = path.basename(String(dati.nome || ''))
        .replace(/[^\w\d.\-() àèéìòù]+/gi, '')
        .trim();
      if (!nome || !dati.base64) return send(res, 400, { error: 'File non valido' });
      fs.writeFileSync(path.join(MEDIA, nome), Buffer.from(dati.base64, 'base64'));
      return send(res, 200, { ok: true, path: `images-store/${nome}` });
    }

    send(res, 404, { error: 'Non trovato' });
  } catch (e) {
    send(res, 500, { error: 'Errore del server admin' });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Admin Marcati Teloni attivo su http://127.0.0.1:${PORT}`);
});
