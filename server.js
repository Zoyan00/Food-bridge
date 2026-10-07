// FoodBridge Persistent Web App & Real-Time Sync Server
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const db = require('./database');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json'
};

const sseClients = new Set();

function broadcastEvent(eventName, payload) {
  const message = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

db.on('change', ({ collection, action, item, previousItem }) => {
  const eventType = 'DATA_CHANGED';
  let activity = '';

  if (collection === 'donations') {
    if (action === 'INSERT') {
      activity = `${item.donorName || 'A donor'} listed "${item.foodName}" (${item.quantity} ${item.quantityUnit})`;
    } else if (action === 'UPDATE') {
      if (previousItem && previousItem.status !== 'Accepted' && item.status === 'Accepted') {
        activity = `${item.acceptedByName || 'An NGO'} accepted & claimed "${item.foodName}"`;
      } else if (previousItem && previousItem.status !== item.status) {
        activity = `"${item.foodName}" status progressed to ${item.status}`;
      } else {
        activity = `"${item.foodName}" was updated`;
      }
    }
  }

  broadcastEvent('DATA_CHANGED', {
    type: eventType,
    collection,
    action,
    item,
    activity,
    foodName: item ? item.foodName : '',
    quantity: item ? `${item.quantity} ${item.quantityUnit}` : '',
    ngoName: item ? item.acceptedByName : '',
    newStatus: item ? item.status : '',
    timestamp: Date.now()
  });
});

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  if (pathname === '/api/health') {
    return sendJson(res, 200, {
      status: 'online',
      service: 'FoodBridge Real-Time App Server & Database Engine',
      uptimeSeconds: Math.floor(process.uptime()),
      connectedClients: sseClients.size,
      stats: db.getSystemStats(),
      timestamp: new Date().toISOString()
    });
  }

  if (pathname === '/api/realtime-stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Real-time SSE active', timestamp: Date.now() })}\n\n`);

    sseClients.add(res);
    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  if (pathname === '/api/broadcast' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      broadcastEvent(payload.event || 'DATA_CHANGED', payload.data || payload);
      return sendJson(res, 200, { success: true, clientsNotified: sseClients.size });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  if (pathname === '/api/db/donations' && req.method === 'GET') {
    let list = db.collection('donations').find();
    if (query.donorId) list = list.filter(d => d.donorId === query.donorId);
    if (query.status) list = list.filter(d => (d.status || '').toLowerCase() === query.status.toLowerCase());
    if (query.acceptedBy) list = list.filter(d => d.acceptedBy === query.acceptedBy);
    return sendJson(res, 200, list);
  }

  const donationMatch = pathname.match(/^\/api\/db\/donations\/([a-zA-Z0-9_-]+)$/);
  if (donationMatch) {
    const id = donationMatch[1];
    if (req.method === 'GET') {
      const item = db.collection('donations').findById(id);
      if (!item) return sendJson(res, 404, { error: 'Donation not found' });
      return sendJson(res, 200, item);
    }

    if (req.method === 'PUT') {
      try {
        const updates = await parseJsonBody(req);
        const updated = db.collection('donations').update(id, updates);
        if (!updated) return sendJson(res, 404, { error: 'Donation not found' });
        return sendJson(res, 200, updated);
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    if (req.method === 'DELETE') {
      const ok = db.collection('donations').delete(id);
      if (!ok) return sendJson(res, 404, { error: 'Donation not found' });
      return sendJson(res, 200, { success: true, deletedId: id });
    }
  }

  if (pathname === '/api/db/donations' && req.method === 'POST') {
    try {
      const donationData = await parseJsonBody(req);
      if (!donationData.foodName || !donationData.quantity) {
        return sendJson(res, 400, { error: 'Missing required donation fields' });
      }
      const created = db.collection('donations').insert({
        ...donationData,
        status: donationData.status || 'Available'
      });
      return sendJson(res, 201, created);
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  if (pathname === '/api/db/users' && req.method === 'GET') {
    let users = db.collection('users').find();
    if (query.role) users = users.filter(u => u.role === query.role);
    if (query.email) users = users.filter(u => u.email.toLowerCase() === query.email.toLowerCase());
    return sendJson(res, 200, users);
  }

  const userMatch = pathname.match(/^\/api\/db\/users\/([a-zA-Z0-9_-]+)$/);
  if (userMatch) {
    const uid = userMatch[1];
    if (req.method === 'GET') {
      const user = db.collection('users').findById(uid);
      if (!user) return sendJson(res, 404, { error: 'User not found' });
      return sendJson(res, 200, user);
    }

    if (req.method === 'PUT') {
      try {
        const updates = await parseJsonBody(req);
        const updated = db.collection('users').update(uid, updates);
        if (!updated) return sendJson(res, 404, { error: 'User not found' });
        return sendJson(res, 200, updated);
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }
  }

  if (pathname === '/api/db/users' && req.method === 'POST') {
    try {
      const userData = await parseJsonBody(req);
      if (!userData.email || !userData.role) {
        return sendJson(res, 400, { error: 'Email and role are required' });
      }
      const existing = db.collection('users').findOne(u => u.email.toLowerCase() === userData.email.toLowerCase());
      if (existing) {
        return sendJson(res, 409, { error: 'An account with this email already exists.' });
      }
      const created = db.collection('users').insert({
        ...userData,
        status: userData.status || 'active'
      });
      return sendJson(res, 201, created);
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  if (pathname === '/api/db/auth/login' && req.method === 'POST') {
    try {
      const { email } = await parseJsonBody(req);
      if (!email) return sendJson(res, 400, { error: 'Email is required' });

      const cleanEmail = email.trim().toLowerCase();
      const user = db.collection('users').findOne(u => u.email.toLowerCase() === cleanEmail);

      if (!user) {
        return sendJson(res, 401, { error: 'No account found with this email. Please register first.' });
      }

      if (user.status === 'deactivated') {
        return sendJson(res, 403, { error: 'Your account has been deactivated by the platform administrator.' });
      }

      return sendJson(res, 200, { success: true, user });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  if (pathname === '/api/db/stats' && req.method === 'GET') {
    return sendJson(res, 200, db.getSystemStats());
  }

  if (pathname === '/api/db/activities' && req.method === 'GET') {
    return sendJson(res, 200, db.collection('activities').find().slice(0, 30));
  }

  if (pathname === '/api/db/seed' && req.method === 'POST') {
    db.seedInitialData();
    db.saveSync();
    broadcastEvent('DATA_CHANGED', { type: 'STORE_SYNCED' });
    return sendJson(res, 200, { success: true, message: 'Demo data reseeded into database.' });
  }

  let safePath = path.normalize(pathname).replace(/^((\.\.[\\/])+)/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  let filePath = path.join(PUBLIC_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      return serveFile(filePath, res);
    }

    const htmlPath = filePath + '.html';
    fs.stat(htmlPath, (err2, stats2) => {
      if (!err2 && stats2.isFile()) {
        return serveFile(htmlPath, res);
      }

      const dirIndexPath = path.join(filePath, 'index.html');
      fs.stat(dirIndexPath, (err3, stats3) => {
        if (!err3 && stats3.isFile()) {
          return serveFile(dirIndexPath, res);
        }

        const fallbackIndex = path.join(PUBLIC_DIR, 'index.html');
        return serveFile(fallbackIndex, res);
      });
    });
  });
});

function serveFile(targetPath, res) {
  const ext = path.extname(targetPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(targetPath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error: ' + err.message);
      return;
    }

    if (ext === '.html') {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught Exception caught safely:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled Rejection caught safely:', reason);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('================================================================');
  console.log('  FOODBRIDGE - REAL-TIME DATABASE & APPLICATION SERVER');
  console.log('================================================================');
  console.log(`  [STATUS] Server & Persistent Database are online and active!`);
  console.log(`  [APP URL]      http://localhost:${PORT}`);
  console.log(`  [DATABASE API] http://localhost:${PORT}/api/db/donations`);
  console.log(`  [STATS API]    http://localhost:${PORT}/api/db/stats`);
  console.log(`  [REAL-TIME]    Server-Sent Events (SSE) active on port ${PORT}`);
  console.log('================================================================\n');
});
