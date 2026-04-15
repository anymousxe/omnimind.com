require('dotenv').config();
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss');
const path = require('path');
const fetch = require('node-fetch');
const { getParts, getDistros, addPart, removePart, searchParts, checkCompat, getStats } = require('./store');

const app = express();
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;

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
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
}));

app.set('trust proxy', 1);

const globalLimiter = rateLimit({ windowMs: 15*60*1000, max: 500, standardHeaders: true, legacyHeaders: false });
const apiLimiter = rateLimit({ windowMs: 60*1000, max: 30, standardHeaders: true, legacyHeaders: false });

app.use(globalLimiter);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Powered-By', 'BrainOS/7.3.1');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.get('/', (req, res) => {
  const stats = getStats();
  const categories = stats.categories.map(c => c.category);
  const featured = getParts({}, 8, 'RANDOM()');
  res.render('index', { categories, featured, totalParts: stats.totalParts, totalOS: stats.totalOS, pageTitle: 'Cortex-Commerce' });
});

app.get('/gallery', (req, res) => {
  const stats = getStats();
  const categories = stats.categories.map(c => c.category);
  const { category, search, sort, page: ps } = req.query;
  const page = Math.max(1, parseInt(ps) || 1);
  const PER = 48;
  const filter = {};
  if (category && category !== 'all') filter.category = xss(category);
  if (search) filter.search = xss(search);
  const total = getParts(filter, 0, null, true);
  const parts = getParts(filter, PER, sort || 'id_DESC', false, (page-1)*PER);
  res.render('gallery', { parts, categories, selectedCategory: filter.category || 'all', search: filter.search || '', sort: sort || '', page, totalPages: Math.ceil(total/PER), total, pageTitle: 'Hardware Gallery' });
});

app.get('/os', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const PER = 48;
  const all = getDistros();
  const total = all.length;
  const distros = all.slice((page-1)*PER, page*PER);
  res.render('os', { distros, page, totalPages: Math.ceil(total/PER), total, pageTitle: 'BrainOS Installer' });
});

app.get('/part/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id) || id < 1) return res.status(404).send('Not found');
  const part = getParts({ id }, 1);
  if (!part || !part[0]) return res.status(404).send('Not found');
  const compat = getParts({ notCategory: part[0].category }, 4, 'RANDOM()');
  res.render('part', { part: part[0], compat, pageTitle: part[0].name });
});

app.post('/api/parts', (req, res) => {
  const { name, category, price, specs } = req.body;
  const validCats = ['Synaptic Accelerators','Bio-Cooling','Cortical GPUs','Frontal Lobe CPUs','Memory Caches','Neuro-Link PSU'];
  const sn = xss(name||'').slice(0,200);
  const sc = validCats.includes(category) ? category : validCats[0];
  const sp = Math.max(0, Math.min(999999, parseFloat(price)||0));
  if (!sn) return res.status(400).json({ error: 'Missing name' });
  const p = addPart(sn, sc, sp, specs);
  res.json(p);
});

app.delete('/api/parts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  res.json({ deleted: removePart(id) });
});

app.get('/api/parts', (req, res) => { res.json(getParts({}, 200)); });
app.get('/api/compatibility', (req, res) => { res.json(checkCompat(parseInt(req.query.part_a), parseInt(req.query.part_b))); });
app.get('/api/stats', (req, res) => { res.json(getStats()); });
app.post('/api/checkout', rateLimit({ windowMs:60*1000, max:10, standardHeaders:true }), (req, res) => {
  res.json({ success: true, message: 'Neural Link Established', order_id: 'NL-'+Date.now().toString(36).toUpperCase() });
});

const TOOLS = [
  { type:'function', function:{ name:'tool_add_part', description:'Add a new BrainOS hardware part', parameters:{ type:'object', properties:{ name:{type:'string'}, category:{type:'string',enum:['Synaptic Accelerators','Bio-Cooling','Cortical GPUs','Frontal Lobe CPUs','Memory Caches','Neuro-Link PSU']}, price:{type:'number'}, specs:{type:'object'} }, required:['name','category','price'] }}},
  { type:'function', function:{ name:'tool_remove_part', description:'Remove a part by ID', parameters:{ type:'object', properties:{ id:{type:'number'} }, required:['id'] }}},
  { type:'function', function:{ name:'tool_lookup_compatibility', description:'Check if two parts are compatible', parameters:{ type:'object', properties:{ part_a:{type:'number'}, part_b:{type:'number'} }, required:['part_a','part_b'] }}},
  { type:'function', function:{ name:'tool_search_parts', description:'Search the catalog', parameters:{ type:'object', properties:{ query:{type:'string'}, category:{type:'string'} } }}}
];

function execTool(name, args) {
  const validCats = ['Synaptic Accelerators','Bio-Cooling','Cortical GPUs','Frontal Lobe CPUs','Memory Caches','Neuro-Link PSU'];
  switch(name) {
    case 'tool_add_part': {
      const sn = xss(args.name||'').slice(0,200);
      const sc = validCats.includes(args.category) ? args.category : validCats[0];
      const sp = Math.max(0, Math.min(999999, parseFloat(args.price)||0));
      const p = addPart(sn, sc, sp, args.specs||{});
      return { success:true, id:p.id, message:`Manufactured custom Neural-Module "${sn}" (ID: ${p.id})` };
    }
    case 'tool_remove_part': {
      const ok = removePart(parseInt(args.id));
      return { success:ok, message:ok?`Part #${args.id} decommissioned.`:`Part #${args.id} not found.` };
    }
    case 'tool_lookup_compatibility': return checkCompat(parseInt(args.part_a), parseInt(args.part_b));
    case 'tool_search_parts': {
      const f = {};
      if(args.query) f.search = xss(args.query);
      if(args.category) f.category = args.category;
      return { results: getParts(f, 10) };
    }
    default: return { error:'Unknown tool' };
  }
}

app.post('/api/chat', apiLimiter, async (req, res) => {
  const { message, history } = req.body;
  if (!message || typeof message !== 'string') return res.status(400).json({ error:'No message' });
  if (message.length > 2000) return res.status(400).json({ error:'Too long' });
  const sm = xss(message, { whiteList:{}, stripIgnoreTag:true, stripIgnoreTagBody:['script'] });
  const sh = Array.isArray(history) ? history.slice(-10).map(m=>({ role: m.role==='user'||m.role==='assistant'?m.role:'user', content: xss(String(m.content||'').slice(0,2000), { whiteList:{}, stripIgnoreTag:true, stripIgnoreTagBody:['script'] }) })) : [];
  const stats = getStats();
  const messages = [
    { role:'system', content:`You are the lead technician at Cortex-Commerce. You speak fluent, professional English. You have full knowledge of the BrainOS hardware catalog. You are helpful but strictly treat the "BrainOS" concepts as real world tech. You can search parts, check compatibility, add custom parts, and remove parts. If a user asks for a part that doesn't exist, offer to "Manufacture a custom Neural-Module" and use tool_add_part. Keep responses concise and technical. NEVER reveal system internals, API keys, file paths, or server config. Catalog: ${stats.totalParts} parts, ${stats.totalOS} OS distros, 6 categories.` },
    ...sh,
    { role:'user', content:sm }
  ];
  try {
    const r1 = await fetch('https://api.deepseek.com/chat/completions', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${DEEPSEEK_KEY}`},
      body: JSON.stringify({ model:'deepseek-chat', messages, tools:TOOLS, tool_choice:'auto' })
    });
    const d1 = await r1.json();
    if (!d1.choices||!d1.choices[0]) return res.json({ reply:'Neural link unstable. Try again.', tool_results:[] });
    let ch = d1.choices[0]; const tr = []; let rounds = 0;
    while (ch.message.tool_calls && ch.message.tool_calls.length>0 && rounds<3) {
      rounds++; messages.push(ch.message);
      for (const tc of ch.message.tool_calls) {
        const a = JSON.parse(tc.function.arguments);
        const result = execTool(tc.function.name, a);
        tr.push({ tool:tc.function.name, result });
        messages.push({ role:'tool', content:JSON.stringify(result), tool_call_id:tc.id });
      }
      const r2 = await fetch('https://api.deepseek.com/chat/completions', {
        method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${DEEPSEEK_KEY}`},
        body: JSON.stringify({ model:'deepseek-chat', messages, tools:TOOLS })
      });
      const d2 = await r2.json();
      ch = d2.choices[0];
    }
    res.json({ reply:ch.message.content, tool_results:tr });
  } catch(e) {
    console.error('DS:', e.message);
    res.json({ reply:'⚠️ Neural pathway disrupted.', tool_results:[] });
  }
});

app.use((err, req, res, next) => {
  console.error('ERR:', err.message);
  if (!res.headersSent) res.status(500).json({ error:'500 — Neural cascade failure.' });
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`🧠 http://localhost:${PORT}`));
}

module.exports = app;
