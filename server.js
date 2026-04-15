require('dotenv').config();
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const Database = require('better-sqlite3');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;

const db = new Database(path.join(__dirname, 'data', 'cortex.db'));
db.pragma('journal_mode = WAL');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

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
  if (category && category !== 'all') { countQuery += ' AND category = ?'; dataQuery += ' AND category = ?'; params.push(category); }
  if (search) { countQuery += ' AND name LIKE ?'; dataQuery += ' AND name LIKE ?'; params.push(`%${search}%`); }
  const total = db.prepare(countQuery).get(...params).c;
  if (sort === 'price_asc') dataQuery += ' ORDER BY price ASC';
  else if (sort === 'price_desc') dataQuery += ' ORDER BY price DESC';
  else if (sort === 'name') dataQuery += ' ORDER BY name ASC';
  else dataQuery += ' ORDER BY id DESC';
  dataQuery += ` LIMIT ${PER_PAGE} OFFSET ${(page - 1) * PER_PAGE}`;
  const parts = db.prepare(dataQuery).all(...params);
  const totalPages = Math.ceil(total / PER_PAGE);
  res.render('gallery', { parts, categories, selectedCategory: category || 'all', search: search || '', sort: sort || '', page, totalPages, total, pageTitle: 'Hardware Gallery' });
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
  const part = db.prepare('SELECT * FROM parts WHERE id = ?').get(req.params.id);
  if (!part) return res.status(404).send('Part not found');
  const compat = db.prepare('SELECT * FROM parts WHERE category != ? ORDER BY RANDOM() LIMIT 4').all(part.category);
  res.render('part', { part, compat, pageTitle: part.name });
});

app.post('/api/parts', (req, res) => {
  const { name, category, price, specs } = req.body;
  if (!name || !category || price == null) return res.status(400).json({ error: 'Missing fields' });
  const result = db.prepare('INSERT INTO parts (name, category, price, specs, stock) VALUES (?, ?, ?, ?, ?)').run(name, category, price, JSON.stringify(specs || {}), 15);
  res.json({ id: result.lastInsertRowid, name, category, price, specs });
});

app.delete('/api/parts/:id', (req, res) => {
  const result = db.prepare('DELETE FROM parts WHERE id = ?').run(req.params.id);
  res.json({ deleted: result.changes });
});

app.get('/api/parts', (req, res) => {
  const parts = db.prepare('SELECT * FROM parts').all();
  res.json(parts);
});

app.get('/api/compatibility', (req, res) => {
  const { part_a, part_b } = req.query;
  const a = db.prepare('SELECT * FROM parts WHERE id = ?').get(part_a);
  const b = db.prepare('SELECT * FROM parts WHERE id = ?').get(part_b);
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
  switch (name) {
    case 'tool_add_part': {
      const r = db.prepare('INSERT INTO parts (name, category, price, specs, stock) VALUES (?, ?, ?, ?, ?)').run(args.name, args.category, args.price, JSON.stringify(args.specs || {}), 15);
      return { success: true, id: Number(r.lastInsertRowid), message: `Manufactured custom Neural-Module "${args.name}" and added to catalog (ID: ${r.lastInsertRowid})` };
    }
    case 'tool_remove_part': {
      const r = db.prepare('DELETE FROM parts WHERE id = ?').run(args.id);
      return { success: r.changes > 0, message: r.changes ? `Part #${args.id} decommissioned from catalog.` : `Part #${args.id} not found.` };
    }
    case 'tool_lookup_compatibility': {
      const a = db.prepare('SELECT * FROM parts WHERE id = ?').get(args.part_a);
      const b = db.prepare('SELECT * FROM parts WHERE id = ?').get(args.part_b);
      if (!a || !b) return { compatible: false, message: 'One or both parts not found in catalog.' };
      const ok = a.category !== b.category;
      return { compatible: ok, message: ok ? `${a.name} + ${b.name}: Neuro-compatible across subsystems.` : `Both are ${a.category} - neural bus conflict. One per cortical region.` };
    }
    case 'tool_search_parts': {
      let q = 'SELECT * FROM parts WHERE 1=1';
      const p = [];
      if (args.query) { q += ' AND name LIKE ?'; p.push(`%${args.query}%`); }
      if (args.category) { q += ' AND category = ?'; p.push(args.category); }
      q += ' LIMIT 10';
      return { results: db.prepare(q).all(...p) };
    }
    default: return { error: 'Unknown tool' };
  }
}

app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body;
  if (!message) return res.status(400).json({ error: 'No message' });

  const messages = [
    { role: 'system', content: `You are the lead technician at Cortex-Commerce. You speak fluent, professional English. You have full knowledge of the BrainOS hardware catalog. You are helpful but strictly treat the "BrainOS" concepts as real world tech. You can search parts, check compatibility, add custom parts, and remove parts. If a user asks for a part that doesn't exist, offer to "Manufacture a custom Neural-Module" and use tool_add_part to create it. Keep responses concise and technical. Current catalog has ${db.prepare('SELECT COUNT(*) as c FROM parts').get().c} parts across 6 categories.` },
    ...(history || []),
    { role: 'user', content: message }
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

    while (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      messages.push(choice.message);
      for (const tc of choice.message.tool_calls) {
        const args = JSON.parse(tc.function.arguments);
        const result = executeTool(tc.function.name, args);
        toolResults.push({ tool: tc.function.name, args, result });
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

app.post('/api/checkout', (req, res) => {
  const { items } = req.body;
  res.json({ success: true, message: 'Neural Link Established', order_id: 'NL-' + Date.now().toString(36).toUpperCase() });
});

app.get('/api/stats', (req, res) => {
  const totalParts = db.prepare('SELECT COUNT(*) as c FROM parts').get().c;
  const totalOS = db.prepare('SELECT COUNT(*) as c FROM os_distros').get().c;
  const cats = db.prepare('SELECT category, COUNT(*) as count FROM parts GROUP BY category').all();
  res.json({ totalParts, totalOS, categories: cats });
});

app.listen(PORT, () => console.log(`🧠 Cortex-Commerce running on http://localhost:${PORT}`));
