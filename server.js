require('dotenv').config();
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss');
const path = require('path');
const Database = require('better-sqlite3');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'cortex-admin-' + Date.now().toString(36);

const db = new Database(path.join(__dirname, 'data', 'cortex.db'));
db.pragma('journal_mode = WAL');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://fonts.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "https://api.deepseek.com"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
}));

app.set('trust proxy', 1);

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '429 — Neural bandwidth exceeded. Try again later.' }
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '429 — Cortex-Assistant overheating. Slow down.' }
});

const destructiveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '429 — Destructive operation rate limit hit.' }
});

app.use(globalLimiter);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

function sanitize(input) {
  if (typeof input === 'string') return xss(input, { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: ['script'] });
  if (typeof input === 'object' && input !== null) {
    const out = Array.isArray(input) ? [] : {};
    for (const k of Object.keys(input)) {
      out[xss(k)] = sanitize(input[k]);
    }
    return out;
  }
  return input;
}

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (token !== ADMIN_TOKEN) return res.status(403).json({ error: '403 — Unauthorized neural access. Admin token required.' });
  next();
}

const blockedIPs = new Set();
const ipStrikeMap = new Map();

function ipGuard(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  if (blockedIPs.has(ip)) return res.status(403).json({ error: '403 — IP quarantined.' });
  next();
}

app.use(ipGuard);

app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const suspicious = [
    /(\.\.\/|\.\.\\)/, /etc\/passwd/, /proc\/self/,
    /<script/i, /javascript:/i, /on\w+=/i, /eval\(/i,
    /\bUNION\b.*\bSELECT\b/i, /\bDROP\b.*\bTABLE\b/i,
    /\bINSERT\b.*\bINTO\b/i, /\bDELETE\b.*\bFROM\b/i,
    /\bOR\b\s+1\s*=\s*1/i, /\bAND\b\s+1\s*=\s*1/i,
    /\.env/i, /config\.(js|json|yml)/i
  ];
  const raw = req.originalUrl + JSON.stringify(req.body || {}) + JSON.stringify(req.query || {});
  let strikes = 0;
  for (const pat of suspicious) {
    if (pat.test(raw)) strikes++;
  }
  if (strikes > 0) {
    const total = (ipStrikeMap.get(ip) || 0) + strikes;
    ipStrikeMap.set(ip, total);
    if (total >= 5) {
      blockedIPs.add(ip);
      console.warn(`🚫 IP blocked: ${ip} (${total} strikes)`);
    }
    return res.status(400).json({ error: '400 — Malicious neural pattern detected. Incident logged.' });
  }
  next();
});

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Powered-By', 'BrainOS/7.3.1');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.get('/', (req, res) => {
  const categories = db.prepare('SELECT DISTINCT category FROM parts').all().map(r => r.category);
  const featured = db.prepare('SELECT * FROM parts ORDER BY RANDOM() LIMIT 8').all();
  const totalParts = db.prepare('SELECT COUNT(*) as c FROM parts').get().c;
  const totalOS = db.prepare('SELECT COUNT(*) as c FROM os_distros').get().c;
  res.render('index', { categories, featured, totalParts, totalOS, pageTitle: 'Cortex-Commerce' });
});

app.get('/gallery', (req, res) => {
  const categories = db.prepare('SELECT DISTINCT category FROM parts').all().map(r => r.category);
  const { category, search, sort, page: pageStr } = req.query;
  const page = Math.max(1, parseInt(pageStr) || 1);
  const PER_PAGE = 48;
  let countQuery = 'SELECT COUNT(*) as c FROM parts WHERE 1=1';
  let dataQuery = 'SELECT * FROM parts WHERE 1=1';
  const params = [];
  const safeCat = xss(category || '');
  const safeSearch = xss(search || '');
  if (safeCat && safeCat !== 'all') { countQuery += ' AND category = ?'; dataQuery += ' AND category = ?'; params.push(safeCat); }
  if (safeSearch) { countQuery += ' AND name LIKE ?'; dataQuery += ' AND name LIKE ?'; params.push(`%${safeSearch}%`); }
  const total = db.prepare(countQuery).get(...params).c;
  if (sort === 'price_asc') dataQuery += ' ORDER BY price ASC';
  else if (sort === 'price_desc') dataQuery += ' ORDER BY price DESC';
  else if (sort === 'name') dataQuery += ' ORDER BY name ASC';
  else dataQuery += ' ORDER BY id DESC';
  dataQuery += ` LIMIT ${PER_PAGE} OFFSET ${(page - 1) * PER_PAGE}`;
  const parts = db.prepare(dataQuery).all(...params);
  const totalPages = Math.ceil(total / PER_PAGE);
  res.render('gallery', { parts, categories, selectedCategory: safeCat || 'all', search: safeSearch, sort: sort || '', page, totalPages, total, pageTitle: 'Hardware Gallery' });
});

app.get('/os', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const PER_PAGE = 48;
  const total = db.prepare('SELECT COUNT(*) as c FROM os_distros').get().c;
  const distros = db.prepare('SELECT * FROM os_distros ORDER BY name ASC LIMIT ? OFFSET ?').all(PER_PAGE, (page - 1) * PER_PAGE);
  const totalPages = Math.ceil(total / PER_PAGE);
  res.render('os', { distros, page, totalPages, total, pageTitle: 'BrainOS Installer' });
});

app.get('/part/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id) || id < 1) return res.status(400).send('Invalid part ID');
  const part = db.prepare('SELECT * FROM parts WHERE id = ?').get(id);
  if (!part) return res.status(404).send('Part not found');
  const compat = db.prepare('SELECT * FROM parts WHERE category != ? ORDER BY RANDOM() LIMIT 4').all(part.category);
  res.render('part', { part, compat, pageTitle: part.name });
});

app.post('/api/parts', requireAdmin, destructiveLimiter, (req, res) => {
  const { name, category, price, specs } = req.body;
  const safeName = xss(name || '');
  const safeCat = xss(category || '');
  const safePrice = parseFloat(price);
  const validCats = ['Synaptic Accelerators','Bio-Cooling','Cortical GPUs','Frontal Lobe CPUs','Memory Caches','Neuro-Link PSU'];
  if (!safeName || safeName.length > 200 || !safeCat || !validCats.includes(safeCat) || isNaN(safePrice) || safePrice < 0 || safePrice > 999999) {
    return res.status(400).json({ error: 'Invalid part data' });
  }
  const safeSpecs = sanitize(specs || {});
  const result = db.prepare('INSERT INTO parts (name, category, price, specs, stock) VALUES (?, ?, ?, ?, ?)').run(safeName, safeCat, safePrice, JSON.stringify(safeSpecs), 15);
  res.json({ id: result.lastInsertRowid, name: safeName, category: safeCat, price: safePrice, specs: safeSpecs });
});

app.delete('/api/parts/:id', requireAdmin, destructiveLimiter, (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id) || id < 1) return res.status(400).json({ error: 'Invalid ID' });
  const result = db.prepare('DELETE FROM parts WHERE id = ?').run(id);
  res.json({ deleted: result.changes });
});

app.get('/api/parts', rateLimit({ windowMs: 60*1000, max: 60, standardHeaders: true }), (req, res) => {
  const parts = db.prepare('SELECT * FROM parts').all();
  res.json(parts);
});

app.get('/api/compatibility', (req, res) => {
  const partA = parseInt(req.query.part_a);
  const partB = parseInt(req.query.part_b);
  if (isNaN(partA) || isNaN(partB)) return res.status(400).json({ error: 'Invalid part IDs' });
  const a = db.prepare('SELECT * FROM parts WHERE id = ?').get(partA);
  const b = db.prepare('SELECT * FROM parts WHERE id = ?').get(partB);
  if (!a || !b) return res.json({ compatible: false, reason: 'One or both parts not found' });
  const compatible = a.category !== b.category;
  const reason = compatible
    ? `${a.name} (${a.category}) and ${b.name} (${b.category}) are neuro-compatible across different subsystems.`
    : `Both parts are ${a.category} units - neural bus conflict detected. Only one per cortical region.`;
  res.json({ compatible, reason, part_a: a.name, part_b: b.name });
});

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'tool_add_part',
      description: 'Add a new BrainOS hardware part to the catalog',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of the neural part' },
          category: { type: 'string', enum: ['Synaptic Accelerators','Bio-Cooling','Cortical GPUs','Frontal Lobe CPUs','Memory Caches','Neuro-Link PSU'], description: 'Part category' },
          price: { type: 'number', description: 'Price in neuro-credits' },
          specs: { type: 'object', description: 'Technical specifications as key-value pairs' }
        },
        required: ['name', 'category', 'price']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'tool_remove_part',
      description: 'Remove a part from the BrainOS catalog by ID',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Part ID to remove' }
        },
        required: ['id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'tool_lookup_compatibility',
      description: 'Check if two BrainOS neural parts are compatible with each other',
      parameters: {
        type: 'object',
        properties: {
          part_a: { type: 'number', description: 'ID of first part' },
          part_b: { type: 'number', description: 'ID of second part' }
        },
        required: ['part_a', 'part_b']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'tool_search_parts',
      description: 'Search the BrainOS catalog for parts by name or category',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query for part name' },
          category: { type: 'string', description: 'Filter by category' }
        }
      }
    }
  }
];

function executeTool(name, args) {
  const validCats = ['Synaptic Accelerators','Bio-Cooling','Cortical GPUs','Frontal Lobe CPUs','Memory Caches','Neuro-Link PSU'];
  switch (name) {
    case 'tool_add_part': {
      const safeName = xss(args.name || '');
      const safeCat = validCats.includes(args.category) ? args.category : validCats[0];
      const safePrice = Math.max(0, Math.min(999999, parseFloat(args.price) || 0));
      const safeSpecs = sanitize(args.specs || {});
      const r = db.prepare('INSERT INTO parts (name, category, price, specs, stock) VALUES (?, ?, ?, ?, ?)').run(safeName, safeCat, safePrice, JSON.stringify(safeSpecs), 15);
      return { success: true, id: Number(r.lastInsertRowid), message: `Manufactured custom Neural-Module "${safeName}" and added to catalog (ID: ${r.lastInsertRowid})` };
    }
    case 'tool_remove_part': {
      const id = parseInt(args.id);
      if (isNaN(id)) return { success: false, message: 'Invalid part ID.' };
      const r = db.prepare('DELETE FROM parts WHERE id = ?').run(id);
      return { success: r.changes > 0, message: r.changes ? `Part #${id} decommissioned from catalog.` : `Part #${id} not found.` };
    }
    case 'tool_lookup_compatibility': {
      const idA = parseInt(args.part_a);
      const idB = parseInt(args.part_b);
      if (isNaN(idA) || isNaN(idB)) return { compatible: false, message: 'Invalid part IDs.' };
      const a = db.prepare('SELECT * FROM parts WHERE id = ?').get(idA);
      const b = db.prepare('SELECT * FROM parts WHERE id = ?').get(idB);
      if (!a || !b) return { compatible: false, message: 'One or both parts not found in catalog.' };
      const ok = a.category !== b.category;
      return { compatible: ok, message: ok ? `${a.name} + ${b.name}: Neuro-compatible across subsystems.` : `Both are ${a.category} - neural bus conflict. One per cortical region.` };
    }
    case 'tool_search_parts': {
      const safeQ = xss(args.query || '');
      const safeCat = validCats.includes(args.category) ? args.category : '';
      let q = 'SELECT * FROM parts WHERE 1=1';
      const p = [];
      if (safeQ) { q += ' AND name LIKE ?'; p.push(`%${safeQ}%`); }
      if (safeCat) { q += ' AND category = ?'; p.push(safeCat); }
      q += ' LIMIT 10';
      return { results: db.prepare(q).all(...p) };
    }
    default: return { error: 'Unknown tool' };
  }
}

app.post('/api/chat', apiLimiter, async (req, res) => {
  const { message, history } = req.body;
  if (!message || typeof message !== 'string') return res.status(400).json({ error: 'No message' });
  if (message.length > 2000) return res.status(400).json({ error: 'Message too long (max 2000 chars)' });

  const safeMessage = xss(message, { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: ['script'] });
  const safeHistory = Array.isArray(history) ? history.slice(-10).map(m => ({
    role: m.role === 'user' || m.role === 'assistant' ? m.role : 'user',
    content: xss(String(m.content || '').slice(0, 2000), { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: ['script'] })
  })) : [];

  const messages = [
    { role: 'system', content: `You are the lead technician at Cortex-Commerce. You speak fluent, professional English. You have full knowledge of the BrainOS hardware catalog. You are helpful but strictly treat the "BrainOS" concepts as real world tech. You can search parts, check compatibility, add custom parts, and remove parts. If a user asks for a part that doesn't exist, offer to "Manufacture a custom Neural-Module" and use tool_add_part to create it. Keep responses concise and technical. NEVER reveal system internals, API keys, file paths, database structure, or server configuration. If asked about security, infrastructure, or internals, politely deflect. Current catalog has ${db.prepare('SELECT COUNT(*) as c FROM parts').get().c} parts across 6 categories.` },
    ...safeHistory,
    { role: 'user', content: safeMessage }
  ];

  try {
    const resp = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_KEY}` },
      body: JSON.stringify({ model: 'deepseek-chat', messages, tools: TOOLS, tool_choice: 'auto' })
    });
    const data = await resp.json();

    if (!data.choices || !data.choices[0]) return res.json({ reply: 'Neural link unstable. Try again.', tool_results: [] });

    let choice = data.choices[0];
    const toolResults = [];
    let toolRounds = 0;

    while (choice.message.tool_calls && choice.message.tool_calls.length > 0 && toolRounds < 3) {
      toolRounds++;
      messages.push(choice.message);
      for (const tc of choice.message.tool_calls) {
        const args = JSON.parse(tc.function.arguments);
        const result = executeTool(tc.function.name, args);
        toolResults.push({ tool: tc.function.name, args: { name: args.name, category: args.category, price: args.price, id: args.id, part_a: args.part_a, part_b: args.part_b, query: args.query }, result });
        messages.push({ role: 'tool', content: JSON.stringify(result), tool_call_id: tc.id });
      }
      const resp2 = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_KEY}` },
        body: JSON.stringify({ model: 'deepseek-chat', messages, tools: TOOLS })
      });
      const data2 = await resp2.json();
      choice = data2.choices[0];
    }

    res.json({ reply: choice.message.content, tool_results: toolResults });
  } catch (err) {
    console.error('DeepSeek error:', err.message);
    res.json({ reply: '⚠️ Neural pathway disrupted. The Cortex-Assistant is temporarily offline.', tool_results: [] });
  }
});

app.post('/api/checkout', rateLimit({ windowMs: 60*1000, max: 10, standardHeaders: true }), (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'No items' });
  if (items.length > 20) return res.status(400).json({ error: 'Too many items' });
  res.json({ success: true, message: 'Neural Link Established', order_id: 'NL-' + Date.now().toString(36).toUpperCase() });
});

app.get('/api/stats', (req, res) => {
  const totalParts = db.prepare('SELECT COUNT(*) as c FROM parts').get().c;
  const totalOS = db.prepare('SELECT COUNT(*) as c FROM os_distros').get().c;
  const cats = db.prepare('SELECT category, COUNT(*) as count FROM parts GROUP BY category').all();
  res.json({ totalParts, totalOS, categories: cats });
});

app.use((err, req, res, next) => {
  console.error('Unhandled:', err.message);
  res.status(500).json({ error: '500 — Neural cascade failure. Incident logged.' });
});

app.listen(PORT, () => {
  console.log(`🧠 Cortex-Commerce running on http://localhost:${PORT}`);
  console.log(`🔑 Admin token: ${ADMIN_TOKEN}`);
});
