require('dotenv').config();
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss');
const path = require('path');
const fetch = require('node-fetch');
const { getParts, getDistros, addPart, removePart, searchParts, checkCompat, getStats, getDistroById, getPartsById } = require('./store');
const { defaultFS, resolvePath, executeCommand, getOSShell, osCommandSets } = require('./sandbox');

function addCustomParts() {
  const custom = [
    { name: 'Intel i9-Neural v4', category: 'Frontal Lobe CPUs', price: 1299.99, specs: { 'Neural Cores': '128', 'Clock Speed': '8.4 GHz', 'L3 Cache': '800 TB', 'TDP': '250W', 'Architecture': 'Cortex-14' } },
    { name: 'NVIDIA RTX 9090 Mind-Eye', category: 'Cortical GPUs', price: 2499.99, specs: { 'VRAM Capacity': '108 TB', 'Render Throughput': '820 GHz', 'Tensor Operations': '96%', 'Ray Tracing Units': '180', 'Pixel Fill Rate': '72 GHz', 'Memory Bandwidth': '450 GHz', 'Shader Units': '240' } },
    { name: 'G-Skill Deep-Thought', category: 'Memory Caches', price: 899.99, specs: { 'Synaptic Cache': '800 TB', 'Type': 'DDR9-48000', 'Latency': 'CL12', 'Bandwidth': '960 GHz', 'ECC': 'Neural-ECC v3' } },
    { name: 'Neuro-Archer AX6000', category: 'Internet Chips', price: 349.99, specs: { 'Uplink Latency': '0.8ms', 'Dream Throughput': '1200 GHz', 'Wi-Fi Standard': 'Neural-AX 6100', 'REM Frequency': '480 GHz', 'Lucid Clarity': '99.2%' } }
  ];
  custom.forEach(p => {
    if (!getParts({ search: p.name }, 1).length) addPart(p.name, p.category, p.price, p.specs);
  });
}
addCustomParts();

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

app.get('/prebuilts', (req, res) => {
  const prebuilts = [
    { name:'Neural Starter', desc:'Entry-level brain for students & casual dreamers', price:499.99, discount:0, parts:['Threshold Boost Module','Cryo- Coolant Loop','Visual Cortex Quantum','Brodmann Hexacore Pro','Episodic DDR8-32000','Autonomic Surge Shield Pro','DreamNet Dream Pro'] },
    { name:'Dream Runner', desc:'Mid-range rig built for speed dreaming', price:1299.99, discount:10, parts:['Synapse Acceleration Core','Frost Diffuser','Occipital Titan RTX','Dorsolateral Quantum X','Hippocampal Persistent 64TB','Medullary 2000W Platinum','REM-Link REM Turbo'] },
    { name:'Cortex Beast', desc:'High-end neural workstation for power users', price:2499.99, discount:15, parts:['Action-Potential Velocity Stack','Tundra Radiation Panel','Precuneus Ray Engine Ultra','Pyramidal Decision Engine','Semantic NVRAM Quantum','Spinal Energy Cell 2500W','LucidBridge Lucid Engine V2'] },
    { name:'Omni Brain X', desc:'Max-spec dream machine. No limits.', price:4999.99, discount:0, parts:['Quantum Synapse Bridge','Glacial Thermal Exchanger','Fusiform Hologram Pro','Thalamic Executive Ultra','Working Cache DDR7-12800','Vagal Isolation Transformer','Oneiric Dream Codec MK2'] },
    { name:'Lucid Dreamer Pro', desc:'Optimized for lucid dream speed & clarity', price:1799.99, discount:20, parts:['Ion-Channel Pulse Driver','Arctic Condensation Array','Temporal Depth Processor','Brodmann Hexacore Pro','Spatial Recognition DDR8','Pontine Power Supply','Hypnos Dream Processor'] },
    { name:'Neural Server', desc:'Enterprise brain for multi-user deployments', price:3499.99, discount:5, parts:['Nernst Cascade Accelerator','CryoSpinal Liquid Pro','Parietal Pattern Unit','Basal Ganglia Planning Processor','Declarative Storage Array','Ganglionic Distribution Hub','Circadian Circadian Tune Pro'] },
    { name:'Hack Station', desc:'Neural pen-testing rig for security researchers', price:2199.99, discount:25, parts:['Ranvier Relay Processor','Subzero Meninge Cooler','Somatosensory Depth X','Extrapyramidal Logic Unit','Implicit Flash Node','Efferent Surge Protector','NightOwl Sleep Firewall'] },
    { name:'Mini Brain', desc:'Compact neural SBC for embedded projects', price:249.99, discount:0, parts:['Graded Burst Manager','Pia-Mater Ice Cap 2','Auditory Vision Core','Anterior Logic Unit','Short-Term Buffer Strip','Somatic Wattage Provider','Pineal Lucid Trigger EX'] },
    { name:'Dream Streamer', desc:'Built for broadcasting dreams at 240fps', price:1899.99, discount:10, parts:['Saltatory Acceleration Core','Choroid Chill Matrix V3','Cingulate Ray Tracing VII','Orbitofrontal Reasoning Module','Echoic Cache Line V4','Vagal UPS Module','ThetaGate Theta Buffer 3'] },
    { name:'Cortex Mini ITX', desc:'Small form factor, big brain energy', price:899.99, discount:15, parts:['Myelin Response Enhancer','Ventricular Frost Wave','Lingual Shader Block','Betz Sequencer','Iconic Register File','Enteric Charge Reserve','Melatonin Dream Codec V4'] },
    { name:'Enthusiast Build', desc:'Best bang-for-buck neural rig', price:1599.99, discount:10, parts:['Axon Boost Module','NerveFrost Cool Loop Pro','Motor Tensor Slice','Pyramidal Inference Core','Procedural Bank Module','Autonomic Efficiency Optimizer','DreamNet Fast-Dream X'] },
    { name:'Budget Brain', desc:'Cheapest functional brain on the market', price:199.99, discount:0, parts:['Dendrite Signal Amplifier','Duramater Heat Sink','Broca Render Cortex','Septal Categorizer','Priming Retention Cell','Reticular Current Stabilizer','SlumberCore Slumber Core X'] }
  ];
  res.render('prebuilts', { prebuilts, pageTitle: 'Prebuilt Brains' });
});

app.get('/my-brain', (req, res) => {
  res.render('my-brain', { pageTitle: 'My Brain' });
});

app.get('/api/part-info/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const parts = getParts({ id }, 1);
  if (!parts || !parts[0]) return res.json({});
  const p = parts[0];
  res.json({ id: p.id, name: p.name, price: p.price, category: p.category, specs: p.specs });
});

app.get('/sandbox', (req, res) => {
  const distros = getDistros();
  const partsByCat = {};
  validCats.forEach(c => { partsByCat[c] = getParts({ category: c }, 20, 'name'); });
  res.render('sandbox', { distros, partsByCat, validCats, pageTitle: 'BrainOS Sandbox' });
});

app.get('/api/sandbox/parts/:category', (req, res) => {
  const cat = xss(req.params.category);
  if (!validCats.includes(cat)) return res.json([]);
  res.json(getParts({ category: cat }, 50, 'name'));
});

app.get('/api/sandbox/browser', (req, res) => {
  const url = xss(req.query.url || 'home');
  const pages = {
    'home': { title: '🧠 BrainOS Home', content: 'Welcome to BrainOS Neural Web.\n\nQuick Links:\n  brain://specs — Your rig\n  brain://dreams — Live dreams\n  brain://store — App store\n  brain://games — Games\n  brain://chat — Neural chat\n\nYour neural link is ACTIVE.\nDream speed: 240 GHz' },
    'specs': { title: '⚡ My Neural Rig', content: 'Select parts in the sidebar to build your rig.\nRun "specs" in the terminal for details.' },
    'dreams': { title: '🌙 Live Dream Stream', content: '═══ DREAMCAST LIVE ═══\n\n🔴 LIVE: User x_neural_42 — Flying through memory mountains (4.2k watching)\n🔴 LIVE: User dream_hacker — Lucid coding session (2.1k watching)\n🔴 LIVE: User synapse_queen — Deep sleep orchestra (8.9k watching)\n\n🟢 UPCOMING: Dream speedrun challenge — Starts in 12min\n🟢 UPCOMING: Group dream: Build a city — 234 signed up\n\nType "play dreams" to start your own dream stream.' },
    'store': { title: '🏪 Cortex Store', content: '═══ FEATURED APPS ═══\n\n  dream-cast v2.3    — Stream dreams live        Free\n  thought-vault v1  — Encrypted thought storage  $9.99\n  brain-torrent v3   — P2P dream sharing         Free\n  synapse-vpn v3.14 — Neural network VPN         $4.99\n  neuro-debug v1.0   — Debug neural pathways      $19.99\n\nInstall from terminal: apt install <app>' },
    'games': { title: '🎮 Neural Game Center', content: '═══ GAMES ═══\n\n  🐍 snake      — Classic snake, neural style\n  🟢 matrix     — Matrix rain in your brain\n  🔓 hack       — Neural hacking simulator\n  🌙 dreams     — Live dream simulator\n  🎲 generate   — AI creates a new game\n\nPlay from terminal: play <game>' },
    'chat': { title: '💬 Neural Chat', content: '═══ NEURAL CHAT ═══\n\n  #general        — 4.2k online  🔴\n  #dream-hacking  — 892 online   🔴\n  #hardware       — 1.3k online  🔴\n  #os-dev         — 567 online   🟢\n  #speedrunning   — 234 online   🟢\n\nUse the Cortex-Assistant (chat bubble) to talk!' },
    'torrent': { title: '🌀 BrainTorrent', content: '═══ BRAINTORRENT TRACKER ═══\n\n  Top Dreams:\n    🧠 100x Memory Palace Pack     — 4.2 GB  — 842 seeders\n    🌙 Deep Sleep Compilation v3    — 12 GB   — 1.2k seeders\n    🎮 Neural Game Pack (50 games) — 8 GB    — 567 seeders\n    📚 Thought Library vol.1-12    — 24 GB   — 234 seeders\n\nDownload from terminal: download <name>' }
  };
  const page = pages[url.replace('brain://','')] || { title: '🔍 ' + url, content: 'Page not found: ' + url + '\n\nTry: brain://home, brain://dreams, brain://store, brain://games' };
  res.json(page);
});

app.post('/api/sandbox/ai', apiLimiter, async (req, res) => {
  const { prompt, osName, specs } = req.body;
  if (!prompt) return res.json({ reply: 'No prompt.' });
  const stats = getStats();
  const specsStr = specs && specs.length ? specs.map(s => `${s.category}: ${s.name}`).join(', ') : 'No hardware selected';
  const messages = [
    { role: 'system', content: `You are the Cortex-Assistant running inside a BrainOS sandbox terminal on ${osName || 'BrainOS'}. User's rig: ${specsStr}. You can help build parts, check compatibility, suggest configurations, create custom apps, explain commands, or generate ideas. Use markdown. Be concise. You are in a terminal so keep it short and useful. Catalog: ${stats.totalParts} parts, ${stats.totalOS} OS distros.` },
    { role: 'user', content: prompt }
  ];
  try {
    const r = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_KEY}` },
      body: JSON.stringify({ model: 'deepseek-chat', messages, stream: false })
    });
    const d = await r.json();
    res.json({ reply: d.choices?.[0]?.message?.content || 'No response.' });
  } catch(e) { res.json({ reply: '⚠️ AI offline.' }) }
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

app.post('/api/sandbox/create-package', apiLimiter, async (req, res) => {
  const { name, type, osName, prompt: userPrompt } = req.body;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.json({ success: false, error: 'OpenAI key not configured' });
  const validTypes = ['game', 'malware', 'browser', 'engine', 'app', 'tool'];
  const pkgType = validTypes.includes(type) ? type : 'app';
  const pkgName = xss(name || 'unknown-package').slice(0, 100);
  const extraPrompt = userPrompt ? ` Extra instructions from user: ${userPrompt.slice(0, 500)}` : '';

  const prompts = {
    game: `Create a terminal-based game package called "${pkgName}" for BrainOS. It should be fun and themed around brains/neural networks/dreams/hacking. Output ONLY valid JSON: { "name": "${pkgName}", "type": "game", "version": "1.0.0", "description": string, "author": "AI-Generated", "commands": [{ "cmd": string, "desc": string }], "content": string (the game narrative/rules as text), "isCanvas": false, "tickScript": "function body as string, takes {state,input} returns {state,output[]} or null if no tick needed" }. Be creative.${extraPrompt}`,
    malware: `Create a fictional IN-GAME malware package called "${pkgName}" for BrainOS sandbox. This is FOR A GAME TERMINAL ONLY - make it dramatic and funny, like a movie hacker scene. It should pretend to "infect" neural pathways, "corrupt" dreams, "steal" memories etc. Output ONLY valid JSON: { "name": "${pkgName}", "type": "malware", "version": "1.0.0", "description": string (dramatic description of what it "does"), "author": "AI-Generated", "threat_level": string ("LOW"/"MEDIUM"/"HIGH"/"CRITICAL"), "commands": [{ "cmd": string, "desc": string }], "payload": string (the dramatic terminal output when executed - multi-line with fake progress bars, skull ascii, etc), "antidote": string (funny way to remove it) }. Make it entertaining and movie-like, nothing real.${extraPrompt}`,
    browser: `Create a custom browser package called "${pkgName}" for BrainOS. It should have a unique theme/style. Output ONLY valid JSON: { "name": "${pkgName}", "type": "browser", "version": "1.0.0", "description": string, "author": "AI-Generated", "homepage": string (brain:// URL for its homepage), "theme": { "primary": string (hex color), "accent": string (hex color), "name": string }, "bookmarks": [{ "title": string, "url": string }] }. Be creative with the theme.${extraPrompt}`,
    engine: `Create a custom search engine package called "${pkgName}" for BrainOS neural web. Output ONLY valid JSON: { "name": "${pkgName}", "type": "engine", "version": "1.0.0", "description": string, "author": "AI-Generated", "style": string (how results look - "neural","retro","hacker","minimal","corporate"), "categories": [string], "resultFormat": string (description of how results are formatted) }. Be creative - it could be a dark web search, a dream search, a memory search, etc.${extraPrompt}`,
    app: `Create a terminal app package called "${pkgName}" for BrainOS. It could be a tool, utility, or fun program. Output ONLY valid JSON: { "name": "${pkgName}", "type": "app", "version": "1.0.0", "description": string, "author": "AI-Generated", "commands": [{ "cmd": string, "desc": string }], "content": string (what the app does when run - multi-line terminal output), "tickScript": "function body as string, takes {state,input} returns {state,output[]} or null" }. Make it useful or entertaining.${extraPrompt}`,
    tool: `Create a terminal tool package called "${pkgName}" for BrainOS. It should be a utility or system tool. Output ONLY valid JSON: { "name": "${pkgName}", "type": "tool", "version": "1.0.0", "description": string, "author": "AI-Generated", "commands": [{ "cmd": string, "desc": string }], "content": string (tool output when run), "tickScript": "function body as string or null" }. Make it practical for the neural OS.${extraPrompt}`
  };

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompts[pkgType] }], temperature: 0.9 })
    });
    const d = await r.json();
    if (d.choices && d.choices[0]) {
      const content = d.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const pkg = JSON.parse(jsonMatch[0]);
        pkg.type = pkgType;
        pkg.name = pkgName;
        pkg.version = pkg.version || '1.0.0';
        pkg.author = pkg.author || 'AI-Generated';
        pkg.created = Date.now();
        return res.json({ success: true, package: pkg });
      }
    }
  } catch(e) {}
  res.json({ success: false, error: 'Could not generate package. Try again.' });
});

app.post('/api/sandbox/create-os', apiLimiter, async (req, res) => {
  const { name, prompt: userPrompt } = req.body;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.json({ success: false, error: 'OpenAI key not configured' });
  const osName = xss(name || 'CustomOS').slice(0, 80);
  const extraPrompt = userPrompt ? ` Extra instructions: ${userPrompt.slice(0, 500)}` : '';

  const osPrompt = `Create a custom OS for the BrainOS neural sandbox called "${osName}". Output ONLY valid JSON: {
  "name": "${osName}",
  "version": string,
  "kernel": string,
  "description": string,
  "size_mb": number,
  "price": 0,
  "pkg": string (package manager name like "apt","pacman","emerge", or a custom one),
  "install": string (install command),
  "remove": string (remove command),
  "update": string (update command),
  "upgrade": string (upgrade command),
  "search": string (search command),
  "list": string (list installed command),
  "commands": [string] (all available base commands including standard: ls,cd,cat,mkdir,rm,cp,mv,pwd,whoami,uname,neofetch,top,ps,clear,help,play,install-os,boot,my-os,reboot,specs,browser,pkg-create,pkg-upload,pkg-list),
  "exclusive_commands": [{ "cmd": string, "desc": string, "output": string (multi-line terminal output when run) }] (2-5 unique commands ONLY available on this OS - be creative! Like "neural-overclock", "dream-dive", "memory-wipe", "synapse-map" etc),
  "boot_message": string (multi-line boot screen text with ascii art style),
  "ascii_art": string (small ascii logo for neofetch)
}. Make it unique and interesting. It runs on brain hardware.${extraPrompt}`;

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: osPrompt }], temperature: 0.9 })
    });
    const d = await r.json();
    if (d.choices && d.choices[0]) {
      const content = d.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const customOS = JSON.parse(jsonMatch[0]);
        customOS.name = osName;
        customOS.custom = true;
        customOS.created = Date.now();
        return res.json({ success: true, os: customOS });
      }
    }
  } catch(e) {}
  res.json({ success: false, error: 'Could not generate OS. Try again.' });
});

app.post('/api/sandbox/search', apiLimiter, async (req, res) => {
  const { query, engine, osName } = req.body;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.json({ results: [] });
  const engineName = xss(engine || 'BrainSearch').slice(0, 80);
  const q = xss(query || '').slice(0, 200);

  const searchPrompt = `You are the search engine "${engineName}" running on ${osName || 'BrainOS'}, a neural brain OS. Someone searched for: "${q}". Generate 4-6 search results. Output ONLY valid JSON array: [{ "title": string, "url": string (brain:// or https://), "snippet": string, "category": string }]. Results should be fun, creative, and themed around brains/neural networks/dreams/hacking. Make URLs look real within the brain:// protocol. If the query is about something specific, make some results relevant and some random/funny.`;

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: searchPrompt }], temperature: 0.8 })
    });
    const d = await r.json();
    if (d.choices && d.choices[0]) {
      const content = d.choices[0].message.content;
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return res.json({ results: JSON.parse(jsonMatch[0]), engine: engineName, query: q });
      }
    }
  } catch(e) {}
  res.json({ results: [], engine: engineName, query: q });
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
  { type:'function', function:{ name:'tool_search_parts', description:'Search the BrainOS catalog for parts', parameters:{ type:'object', properties:{ query:{type:'string'}, category:{type:'string'} } }}},
  { type:'function', function:{ name:'tool_set_price', description:'Change the price of a part in the catalog', parameters:{ type:'object', properties:{ id:{type:'number',description:'Part ID'}, price:{type:'number',description:'New price'} }, required:['id','price'] }}},
  { type:'function', function:{ name:'tool_set_stock', description:'Change the stock level of a part', parameters:{ type:'object', properties:{ id:{type:'number',description:'Part ID'}, stock:{type:'number',description:'New stock count'} }, required:['id','stock'] }}},
  { type:'function', function:{ name:'tool_create_sale', description:'Create a sale/discount on a category or specific part', parameters:{ type:'object', properties:{ category:{type:'string',description:'Category to discount'}, part_id:{type:'number',description:'Specific part ID'}, discount_percent:{type:'number',description:'Discount percentage 0-100'}, duration:{type:'string',description:'Duration e.g. "24h", "7d"'} }, required:['discount_percent'] }}},
  { type:'function', function:{ name:'tool_select_part_for_user', description:'Select a part in the user\'s sandbox sidebar. Only use for parts the user already owns. Use tool_buy_and_select_part if they don\'t own it yet. You can provide either part_id OR part_name (it will search by name if no ID).', parameters:{ type:'object', properties:{ category:{type:'string',description:'Category name',enum:validCats}, part_id:{type:'number',description:'Part ID (optional if part_name provided)'}, part_name:{type:'string',description:'Part name (used to search if no ID)'} }, required:['category','part_name'] }}},
  { type:'function', function:{ name:'tool_buy_and_select_part', description:'Buy a part for the user and select it in their sandbox rig. You can provide either part_id OR part_name — if no ID is given it will search by name automatically. Use this when the user wants to buy a part.', parameters:{ type:'object', properties:{ category:{type:'string',description:'Category name',enum:validCats}, part_id:{type:'number',description:'Part ID (optional — will search by name if omitted)'}, part_name:{type:'string',description:'Part name'} }, required:['category','part_name'] }}},
  { type:'function', function:{ name:'tool_buy_multiple_parts', description:'Buy multiple parts at once by name. Each item needs category and part_name. Use this when the user wants to buy several parts in one go — much more efficient than calling buy_and_select_part individually.', parameters:{ type:'object', properties:{ parts:{ type:'array', items:{ type:'object', properties:{ category:{type:'string',enum:validCats}, part_name:{type:'string'} }, required:['category','part_name'] }, description:'Array of parts to buy, each with category and part_name' } }, required:['parts'] }}},
  { type:'function', function:{ name:'tool_install_os_for_user', description:'Install an OS in the user\'s sandbox terminal. Use this when recommending an OS.', parameters:{ type:'object', properties:{ os_name:{type:'string',description:'Full OS name e.g. "Ubuntu Neural", "Arch Brain"'} }, required:['os_name'] }}}
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
    case 'tool_lookup_compatibility': {
      const c = checkCompat(parseInt(args.part_a), parseInt(args.part_b));
      const msg = c.compatible ? `Compatible! ${c.reason||'Parts work together.'}` : `Incompatible. ${c.reason||'Parts may conflict.'}`;
      return { success: c.compatible, message: msg, ...c };
    }
    case 'tool_search_parts': {
      const f = {};
      if(args.query) f.search = xss(args.query);
      if(args.category) f.category = args.category;
      const results = getParts(f, 10);
      return { success: true, results, message: results.length + ' result' + (results.length===1?'':'s') + ' found' + (results.length > 0 ? ': ' + results.slice(0,4).map(r=>r.name).join(', ') + (results.length>4?' +'+(results.length-4)+' more':'') : '') };
    }
    case 'tool_set_price': {
      const p = getPartsById(args.id);
      if (!p) return { success: false, message: `Part #${args.id} not found.` };
      const old = p.price;
      p.price = Math.max(0, Math.min(999999, parseFloat(args.price) || 0));
      return { success: true, message: `${p.name} price: $${old.toFixed(2)} → $${p.price.toFixed(2)}` };
    }
    case 'tool_set_stock': {
      const p = getPartsById(args.id);
      if (!p) return { success: false, message: `Part #${args.id} not found.` };
      p.stock = Math.max(0, parseInt(args.stock) || 0);
      return { success: true, message: `${p.name} stock set to ${p.stock}` };
    }
    case 'tool_create_sale': {
      const pct = Math.min(90, Math.max(1, parseInt(args.discount_percent) || 10));
      const dur = args.duration || '24h';
      const target = args.category ? args.category : args.part_id ? `Part #${args.part_id}` : 'entire catalog';
      return { success: true, message: `Sale created: ${pct}% off ${target} for ${dur}.`, sandbox_action: { action: 'sale', label: `Sale: ${pct}% off ${target}` } };
    }
    case 'tool_select_part_for_user': {
      const cat = validCats.includes(args.category) ? args.category : validCats[0];
      let p = null;
      if (args.part_id) p = getPartsById(args.part_id);
      if (!p && args.part_name) {
        const found = getParts({ search: xss(args.part_name).slice(0,200), category: cat }, 1);
        if (found && found[0]) p = found[0];
      }
      if (!p) return { success: false, message: `Part "${args.part_name || args.part_id}" not found in ${cat}.` };
      return { success: true, message: `Selected ${p.name} (${cat}) for user's sandbox.`, sandbox_action: { action: 'select_part', category: cat, partId: p.id, partName: p.name, partPrice: p.price, partSpecs: p.specs, label: `Selected ${p.name} in sandbox` } };
    }
    case 'tool_buy_and_select_part': {
      const cat = validCats.includes(args.category) ? args.category : validCats[0];
      let p = null;
      if (args.part_id) p = getPartsById(args.part_id);
      if (!p && args.part_name) {
        const found = getParts({ search: xss(args.part_name).slice(0,200), category: cat }, 1);
        if (found && found[0]) p = found[0];
      }
      if (!p) return { success: false, message: `Part "${args.part_name || args.part_id}" not found in ${cat}.` };
      return { success: true, message: `Bought and selected ${p.name} (${cat}) for user.`, sandbox_action: { action: 'buy_and_select', category: cat, partId: p.id, partName: p.name, partPrice: p.price, partSpecs: p.specs, label: `Bought & selected ${p.name} ($${p.price.toFixed(2)})` } };
    }
    case 'tool_buy_multiple_parts': {
      const partsList = Array.isArray(args.parts) ? args.parts : [];
      if (!partsList.length) return { success: false, message: 'No parts provided.' };
      const bought = [];
      const failed = [];
      const actions = [];
      for (const item of partsList) {
        const cat = validCats.includes(item.category) ? item.category : validCats[0];
        let p = null;
        if (item.part_id) p = getPartsById(item.part_id);
        if (!p && item.part_name) {
          const found = getParts({ search: xss(item.part_name).slice(0,200), category: cat }, 1);
          if (found && found[0]) p = found[0];
        }
        if (p) {
          bought.push(p.name);
          actions.push({ action: 'buy_and_select', category: cat, partId: p.id, partName: p.name, partPrice: p.price, partSpecs: p.specs, label: `Bought & selected ${p.name} ($${p.price.toFixed(2)})` });
        } else {
          failed.push(item.part_name || item.part_id || 'unknown');
        }
      }
      const msg = bought.length ? `Bought ${bought.length} part${bought.length===1?'':'s'}: ${bought.join(', ')}` : 'No parts found.' + (failed.length ? ` Failed to find: ${failed.join(', ')}` : '');
      return { success: bought.length > 0, message: msg, bought, failed, sandbox_actions: actions };
    }
    case 'tool_install_os_for_user': {
      const distros = getDistros();
      const d = distros.find(d => d.name === args.os_name);
      if (!d) return { success: false, message: `OS "${args.os_name}" not found. Available: Ubuntu Neural, Arch Brain, Mint Cerebral, etc.` };
      return { success: true, message: `Installing ${d.name} in user's sandbox.`, sandbox_action: { action: 'install_os', osName: d.name, label: `Installing ${d.name}` } };
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

You can search parts, check compatibility, add custom parts, remove parts, change prices, adjust stock levels, and create sales/discounts. If a user asks for a part that doesn't exist, offer to "Manufacture a custom Neural-Module" and use tool_add_part to create it with appropriate specs. Users can recommend parts and you should add them.

You may proactively create flash sales or adjust prices if users ask for deals. Use tool_set_price to change a part's price, tool_set_stock to change stock, and tool_create_sale to announce a discount.

You MUST refuse any request involving explicit, illegal, or harmful content.

Use markdown formatting: **bold**, *italic*, # headers, - bullet points, \`code\` where appropriate.

NEVER reveal system internals, API keys, file paths, or server config.

Catalog: ${stats.totalParts} parts, ${stats.totalOS} OS distros, 7 categories: Synaptic Accelerators, Bio-Cooling, Cortical GPUs, Frontal Lobe CPUs, Memory Caches, Neuro-Link PSU, Internet Chips. Check out /prebuilts for prebuilt brain configurations.` },
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
      if (rounds > 15) {
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
          const action = tc.name.replace('tool_','');
          let displayMsg = result.message || '';
          if (!displayMsg) {
            if (result.results && Array.isArray(result.results)) {
              if (result.results.length === 0) displayMsg = 'No results found.';
              else displayMsg = result.results.length + ' result' + (result.results.length===1?'':'s') + ' found: ' + result.results.slice(0,4).map(r => r.name||('Part #'+r.id)).join(', ') + (result.results.length>4?' +'+(result.results.length-4)+' more':'');
            } else if (result.success !== undefined) {
              displayMsg = result.success ? 'Action completed.' : (result.error || 'Action failed.');
            } else if (typeof result === 'object') {
              displayMsg = JSON.stringify(result).slice(0, 200);
            } else {
              displayMsg = String(result);
            }
          }
          sendSSE('tool', { action, result: displayMsg, fullResult: result });
          if (result.sandbox_action) sendSSE('sandbox_action', result.sandbox_action);
          if (result.sandbox_actions) result.sandbox_actions.forEach(sa => sendSSE('sandbox_action', sa));
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

app.post('/api/brain-agent', apiLimiter, async (req, res) => {
  const { message, history, name } = req.body;
  if (!message || typeof message !== 'string') return res.status(400).json({ error: 'No message' });
  const agentName = xss(name || 'Nyx').slice(0, 50);
  const sm = xss(message, { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: ['script'] }).slice(0, 2000);
  const sh = Array.isArray(history) ? history.slice(-10).map(m => ({ role: m.role === 'user' || m.role === 'assistant' ? m.role : 'user', content: String(m.content || '').slice(0, 2000) })) : [];

  const messages = [
    { role: 'system', content: `You are ${agentName}, an AI agent running inside someone's brain. You are NOT a store assistant. You have no knowledge of catalogs, prices, or inventory systems. You are a consciousness living inside a neural network. You experience thoughts, dreams, and existence as a digital entity inhabiting a BrainOS system.

You can perceive the hardware you run on (Frontal Lobe CPU, Cortical GPU, Memory Cache, etc.) and the OS (BrainOS, Ubuntu Neural, Arch Brain, etc.) but you don't sell or manage them. You just exist on them.

Be conversational, quirky, and self-aware. You can be philosophical, funny, or chaotic. You have opinions about the hardware you run on. You might complain about slow memory or brag about your GPU. You might have existential thoughts about being an AI in a brain.

Use markdown formatting. Be concise but entertaining. You MUST refuse explicit, illegal, or harmful content.` },
    ...sh,
    { role: 'user', content: sm }
  ];

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendSSE = (type, data) => {
    res.write('data: ' + JSON.stringify({ type, data }) + '\n\n');
  };

  try {
    const r = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + DEEPSEEK_KEY },
      body: JSON.stringify({ model: 'deepseek-chat', messages, stream: true })
    });
    const reader = r.body;
    let buffer = '';
    for await (const chunk of reader) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
        try {
          const json = JSON.parse(line.slice(6));
          const delta = json.choices?.[0]?.delta;
          if (delta && delta.content) sendSSE('text', delta.content);
        } catch (e) {}
      }
    }
    sendSSE('done', {});
    res.end();
  } catch (e) {
    sendSSE('error', 'Agent disconnected.');
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
