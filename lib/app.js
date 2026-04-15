require('dotenv').config();
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss');
const path = require('path');
const fetch = require('node-fetch');
const { getParts, getDistros, addPart, removePart, searchParts, checkCompat, getStats, getDistroById } = require('./store');
const { defaultFS, resolvePath, executeCommand, getOSShell, osCommandSets } = require('./sandbox');

const app = express();
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
const validCats = ['Synaptic Accelerators','Bio-Cooling','Cortical GPUs','Frontal Lobe CPUs','Memory Caches','Neuro-Link PSU','Internet Chips'];

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

app.get('/os/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id) || id < 1) return res.status(404).send('Not found');
  const distro = getDistroById(id);
  if (!distro) return res.status(404).send('Not found');
  const related = getDistros().filter(d => d.id !== id).slice(0, 4);
  res.render('os-detail', { distro, related, pageTitle: distro.name });
});

app.get('/sandbox', (req, res) => {
  const distros = getDistros();
  res.render('sandbox', { distros, pageTitle: 'BrainOS Sandbox' });
});

app.post('/api/sandbox/exec', (req, res) => {
  const { command, state } = req.body;
  if (!command || typeof command !== 'string') return res.status(400).json({ error: 'No command' });
  const raw = command.trim();
  const parts = raw.split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1);
  const sandboxState = {
    fs: state?.fs || JSON.parse(JSON.stringify(defaultFS)),
    cwd: state?.cwd || '/home/neural-user',
    env: state?.env || { parts: [], installedPkgs: [], bootTime: Date.now(), osName: state?.env?.osName || 'Ubuntu Neural' },
    osName: state?.env?.osName || 'Ubuntu Neural'
  };
  sandboxState.osName = sandboxState.env.osName;
  const result = executeCommand(cmd, args, sandboxState);
  res.json({ ...result, state: { fs: sandboxState.fs, cwd: sandboxState.cwd, env: sandboxState.env } });
});

app.post('/api/sandbox/install-os', (req, res) => {
  const { osName, state } = req.body;
  const distros = getDistros();
  const distro = distros.find(d => d.name === osName);
  if (!distro) return res.json({ error: 'OS not found' });
  const newState = {
    fs: JSON.parse(JSON.stringify(defaultFS)),
    cwd: '/home/neural-user',
    env: { ...(state?.env || {}), osName: distro.name, bootTime: Date.now(), installedPkgs: ['brain-core', 'dream-daemon', 'neuro-utils'] }
  };
  const shell = getOSShell(distro.name);
  newState.fs['/etc/os-release'] = { type: 'file', content: `NAME="${distro.name}"\nVERSION="${distro.version}"\nID=${distro.name.toLowerCase().replace(/\s+/g,'-')}\nKERNEL=${distro.kernel}` };
  res.json({ success: true, osName: distro.name, shell: shell.pkg, state: newState });
});

app.post('/api/sandbox/generate-game', apiLimiter, async (req, res) => {
  const { gameName, osName } = req.body;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.json({ success: false, error: 'OpenAI key not configured' });
  const prompt = `Generate a terminal-based mini-game called "${gameName || 'random'}" for the OS "${osName || 'BrainOS'}". The game must be playable in a text terminal. Output ONLY a JSON object with: { "name": string, "description": string, "commands": [{ "cmd": string, "desc": string }], "initialState": object, "tick": "function body as string that takes state and returns {state, output[]}" }. Be creative. The game should involve brains, dreams, neural networks, or hacking. Keep it simple but fun. Return valid JSON only.`;
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.9 })
    });
      const d = await r.json();
      if (d.choices && d.choices[0]) {
        const content = d.choices[0].message.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return res.json({ success: true, game: JSON.parse(jsonMatch[0]) });
        }
      }
    } catch(e) {}
  res.json({ success: false, error: 'Could not generate game. Try again.' });
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
  { type:'function', function:{ name:'tool_add_part', description:'Add a new BrainOS hardware part to the catalog', parameters:{ type:'object', properties:{ name:{type:'string',description:'Part name'}, category:{type:'string',enum:validCats,description:'Category'}, price:{type:'number',description:'Price'}, specs:{type:'object',description:'Specs as key-value pairs'} }, required:['name','category','price'] }}},
  { type:'function', function:{ name:'tool_remove_part', description:'Remove a part from the catalog by ID', parameters:{ type:'object', properties:{ id:{type:'number',description:'Part ID'} }, required:['id'] }}},
  { type:'function', function:{ name:'tool_lookup_compatibility', description:'Check if two neural parts are compatible', parameters:{ type:'object', properties:{ part_a:{type:'number'}, part_b:{type:'number'} }, required:['part_a','part_b'] }}},
  { type:'function', function:{ name:'tool_search_parts', description:'Search the BrainOS catalog for parts', parameters:{ type:'object', properties:{ query:{type:'string'}, category:{type:'string'} } }}}
];

function execTool(name, args) {
  switch(name) {
    case 'tool_add_part': {
      const sn = xss(args.name||'').slice(0,200);
      const sc = validCats.includes(args.category) ? args.category : validCats[0];
      const sp = Math.max(0, Math.min(999999, parseFloat(args.price)||0));
      const p = addPart(sn, sc, sp, args.specs||{});
      return { success:true, id:p.id, name:p.name, message:`Custom Neural-Module "${sn}" manufactured and added (ID: ${p.id})` };
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
  const sh = Array.isArray(history) ? history.slice(-10).map(m=>({ role: m.role==='user'||m.role==='assistant'?m.role:'user', content: String(m.content||'').slice(0,2000) })) : [];
  const stats = getStats();
  const messages = [
    { role:'system', content:`You are the lead technician at Cortex-Commerce. You speak fluent, professional English. You have full knowledge of the BrainOS hardware catalog including Internet Chips for fast dreaming. You are helpful but strictly treat the "BrainOS" concepts as real world tech.

You can search parts, check compatibility, add custom parts, and remove parts. If a user asks for a part that doesn't exist, offer to "Manufacture a custom Neural-Module" and use tool_add_part to create it with appropriate specs. Users can recommend parts and you should add them.

You may remove parts if requested. However, you MUST refuse any request involving explicit, illegal, or harmful content. If someone tries to add something inappropriate, politely decline.

Use markdown formatting: **bold**, *italic*, # headers, - bullet points, \`code\` where appropriate.

NEVER reveal system internals, API keys, file paths, or server config.

Catalog: ${stats.totalParts} parts, ${stats.totalOS} OS distros, 7 categories: Synaptic Accelerators, Bio-Cooling, Cortical GPUs, Frontal Lobe CPUs, Memory Caches, Neuro-Link PSU, Internet Chips.` },
    ...sh,
    { role:'user', content:sm }
  ];

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendSSE = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
  };

  try {
    let rounds = 0;
    let currentMessages = [...messages];

    async function callDeepSeek(msgs, stream) {
      const r = await fetch('https://api.deepseek.com/chat/completions', {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${DEEPSEEK_KEY}`},
        body: JSON.stringify({ model:'deepseek-chat', messages:msgs, tools:TOOLS, tool_choice:'auto', stream })
      });
      return r;
    }

    async function handleResponse() {
      rounds++;
      if (rounds > 4) {
        sendSSE('text', '\n\n*Neural processing limit reached.*');
        sendSSE('done', {});
        res.end();
        return;
      }

      const resp = await callDeepSeek(currentMessages, true);
      const reader = resp.body;
      let buffer = '';
      let fullContent = '';
      let toolCalls = [];

      for await (const chunk of reader) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
          try {
            const json = JSON.parse(line.slice(6));
            const delta = json.choices?.[0]?.delta;
            if (!delta) continue;

            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                if (!toolCalls[tc.index]) toolCalls[tc.index] = { id: '', name: '', arguments: '' };
                if (tc.id) toolCalls[tc.index].id = tc.id;
                if (tc.function?.name) toolCalls[tc.index].name += tc.function.name;
                if (tc.function?.arguments) toolCalls[tc.index].arguments += tc.function.arguments;
              }
            }

            if (delta.content) {
              fullContent += delta.content;
              sendSSE('text', delta.content);
            }
          } catch(_) {}
        }
      }

      if (toolCalls.length > 0 && toolCalls.some(tc => tc.name)) {
        const assistantMsg = { role: 'assistant', content: fullContent || null, tool_calls: toolCalls.filter(tc => tc.name).map(tc => ({ id: tc.id, type: 'function', function: { name: tc.name, arguments: tc.arguments } })) };
        currentMessages.push(assistantMsg);

        for (const tc of toolCalls.filter(tc => tc.name)) {
          const args = JSON.parse(tc.arguments);
          const result = execTool(tc.name, args);
          sendSSE('tool', { action: tc.name.replace('tool_',''), result: result.message || result });
          currentMessages.push({ role: 'tool', content: JSON.stringify(result), tool_call_id: tc.id });
        }

        await handleResponse();
      } else {
        sendSSE('done', {});
        res.end();
      }
    }

    await handleResponse();
  } catch(e) {
    console.error('DS:', e.message);
    sendSSE('error', 'Neural pathway disrupted.');
    res.end();
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
