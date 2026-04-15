document.addEventListener('DOMContentLoaded', () => {
  initChat();
  initCheckout();
  initOSInstaller();
  initSandbox();
  initMyBrain();
});

function renderMarkdown(t) {
  return t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h4 class="md-h">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="md-h">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="md-h">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="md-code">$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n/g, '<br>');
}

function initChat() {
  const bubble = document.getElementById('chat-bubble');
  const panel = document.getElementById('chat-panel');
  const close = document.getElementById('chat-close');
  const input = document.getElementById('chat-input');
  const send = document.getElementById('chat-send');
  const messages = document.getElementById('chat-messages');
  if (!bubble) return;

  let history = [];
  let chatAbort = null;
  bubble.onclick = () => { panel.classList.remove('hidden'); bubble.style.display = 'none'; };
  close.onclick = () => { panel.classList.add('hidden'); bubble.style.display = 'flex'; };

  function addMsg(h, c) {
    const d = document.createElement('div');
    d.className = 'chat-msg ' + c;
    d.innerHTML = h;
    messages.appendChild(d);
    messages.scrollTop = messages.scrollHeight;
    return d;
  }

  function appendTo(el, t) {
    el._raw += t;
    el.innerHTML = renderMarkdown(el._raw);
    messages.scrollTop = messages.scrollHeight;
  }

  async function sendMsg() {
    const t = input.value.trim();
    if (!t) return;
    addMsg(t, 'user');
    history.push({ role: 'user', content: t });
    input.value = '';
    input.disabled = true;
    send.disabled = true;

    const stopBtn = document.getElementById('chat-stop');
    stopBtn.classList.remove('hidden');

    const el = addMsg('', 'assistant streaming');
    el._raw = '';

    chatAbort = new AbortController();

    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: t, history }),
        signal: chatAbort.signal
      });
      const rd = r.body.getReader();
      const dc = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await rd.read();
        if (done) break;
        buf += dc.decode(value, { stream: true });
        const ls = buf.split('\n');
        buf = ls.pop() || '';

        for (const l of ls) {
          if (!l.startsWith('data: ')) continue;
          try {
            const j = JSON.parse(l.slice(6));
            if (j.type === 'text') appendTo(el, j.data);
            else if (j.type === 'tool') {
              const a = document.createElement('div');
              a.className = 'chat-msg action-msg';
              let actionLabel = j.data.action;
              if (j.data.action === 'add_part') actionLabel = 'Manufactured Neural-Module';
              else if (j.data.action === 'remove_part') actionLabel = 'Decommissioned part';
              else if (j.data.action === 'select_part_for_user') actionLabel = 'Selected part for your sandbox';
              else if (j.data.action === 'install_os_for_user') actionLabel = 'Installing OS in your sandbox';
              a.innerHTML = '<span class="action-icon">&#9889;</span> ' + actionLabel;
              messages.appendChild(a);
              messages.scrollTop = messages.scrollHeight;
            }
            else if (j.type === 'sandbox_action') {
              const a = document.createElement('div');
              a.className = 'chat-msg action-msg';
              a.innerHTML = '<span class="action-icon">&#9889;</span> ' + (j.data.label || j.data.action);
              messages.appendChild(a);
              messages.scrollTop = messages.scrollHeight;
              if (j.data.action === 'buy_and_select' || j.data.action === 'select_part') {
                addToInventory({ id: j.data.partId, name: j.data.partName, price: j.data.partPrice || 0, category: j.data.category, specs: j.data.partSpecs || {}, type: 'part', boughtAt: Date.now() });
                if (window._sandboxSelectPart) window._sandboxSelectPart(j.data.category, j.data.partId, j.data.partName, j.data.partPrice, j.data.partSpecs);
                if (window._refreshSandboxSidebar) window._refreshSandboxSidebar();
              }
              if (j.data.action === 'install_os' && window._sandboxInstallOS) window._sandboxInstallOS(j.data.osName);
            }
            else if (j.type === 'done') el.classList.remove('streaming');
          } catch (e) {}
        }
      }
      el.classList.remove('streaming');
      history.push({ role: 'assistant', content: el._raw });
    } catch (e) {
      el.classList.remove('streaming');
      if (e.name !== 'AbortError') appendTo(el, '\n\nNeural pathway disrupted.');
      else appendTo(el, ' [stopped]');
    }

    chatAbort = null;
    input.disabled = false;
    send.disabled = false;
    stopBtn.classList.add('hidden');
    input.focus();
  }

  send.onclick = sendMsg;
  input.onkeydown = e => { if (e.key === 'Enter') sendMsg(); };
  const chatStopBtn = document.getElementById('chat-stop');
  if (chatStopBtn) chatStopBtn.onclick = () => { if (chatAbort) chatAbort.abort(); };
}

const INVENTORY_KEY = 'cortex-my-brain';
function getInventory() {
  try { return JSON.parse(localStorage.getItem(INVENTORY_KEY) || '[]'); } catch (e) { return []; }
}
function saveInventory(inv) { localStorage.setItem(INVENTORY_KEY, JSON.stringify(inv)); }
function addToInventory(item) {
  const inv = getInventory();
  if (!inv.find(i => i.id === item.id && i.type === item.type)) {
    inv.push(item);
    saveInventory(inv);
  }
}
function removeFromInventory(id, type) {
  const inv = getInventory().filter(i => !(String(i.id) === String(id) && i.type === type));
  saveInventory(inv);
  return inv;
}

function initCheckout() {
  function bindSyncBtn(btn) {
    btn.onclick = async () => {
      const card = btn.closest('.part-detail, .prebuilt-card, .glass-card, body');
      const prog = card ? card.querySelector('.sync-progress') : document.getElementById('sync-progress');
      const fill = prog ? prog.querySelector('.progress-fill') : document.getElementById('progress-fill');
      const stat = prog ? prog.querySelector('.sync-status') : document.getElementById('sync-status');
      if (!prog || !fill || !stat) return;

      btn.disabled = true;
      prog.classList.remove('hidden');
      stat.classList.remove('success');
      fill.style.width = '0%';

      const steps = [
        [10, 'Initiating neural handshake...'],
        [25, 'Scanning cortical topology...'],
        [40, 'Mapping synaptic pathways...'],
        [55, 'Calibrating bio-coolant...'],
        [70, 'Flashing neural firmware...'],
        [85, 'Verifying cortex integrity...'],
        [95, 'Establishing link...'],
        [100, 'Neural Link Established!']
      ];

      for (const [pct, msg] of steps) {
        await new Promise(r => setTimeout(r, 400 + Math.random() * 300));
        fill.style.width = pct + '%';
        stat.textContent = msg;
        if (pct === 100) stat.classList.add('success');
      }

      const itemId = btn.dataset.id;
      const itemName = btn.dataset.name;
      const itemPrice = btn.dataset.price;

      if (btn.classList.contains('sync-brain-btn') && itemId) {
        try {
          const r = await fetch('/api/part-info/' + itemId);
          const d = await r.json();
          if (d.id) {
          addToInventory({ id: d.id, name: d.name, price: d.price, category: d.category, specs: d.specs, type: 'part', boughtAt: Date.now() });
          if (window._refreshSandboxSidebar) window._refreshSandboxSidebar();
        }
      } catch (e) {}
      } else if (btn.classList.contains('pb-buy-btn') && itemName) {
        addToInventory({ id: 'pb-' + Date.now(), name: itemName, price: parseFloat(itemPrice) || 0, type: 'prebuilt', boughtAt: Date.now() });
      }

      try {
        await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: [btn.dataset.id || btn.dataset.name] })
        });
      } catch (e) {}
    };
  }
  document.querySelectorAll('.sync-brain-btn, .pb-buy-btn').forEach(bindSyncBtn);
}

function initOSInstaller() {
  const o = document.getElementById('terminal-overlay');
  const out = document.getElementById('terminal-output');
  const cl = document.getElementById('terminal-close');
  if (!o) return;
  cl.onclick = () => o.classList.add('hidden');

  document.querySelectorAll('.os-flash-btn').forEach(b => {
    b.onclick = async e => {
      e.preventDefault();
      e.stopPropagation();
      const { name: n, version: v, kernel: k, size: s } = b.dataset;
      o.classList.remove('hidden');
      out.textContent = '';

      const initLines = [
        '> BRAINOS FLASH v3.7.1',
        '> Target: ' + n + ' v' + v,
        '',
        '[SCAN] Neural bus... OK',
        '[SCAN] Compatibility... OK',
        '',
        '[WRITE] Flashing ' + n + '...'
      ];
      for (const l of initLines) {
        out.textContent += l + '\n';
        out.scrollTop = out.scrollHeight;
        await new Promise(r => setTimeout(r, 200 + Math.random() * 200));
      }

      for (let i = 0; i <= 20; i++) {
        const filled = Math.floor(i / 2);
        const empty = 10 - filled;
        out.textContent += '[WRITE] ' + '\u2588'.repeat(filled) + '\u2591'.repeat(empty) + ' ' + Math.round(i / 20 * 100) + '%\r';
        out.scrollTop = out.scrollHeight;
        await new Promise(r => setTimeout(r, 120 + Math.random() * 80));
      }

      const bootLines = [
        '',
        '[WRITE] Flashed.',
        '[BOOT] \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557',
        '[BOOT] \u2551 ' + n.padEnd(24) + '\u2551',
        '[BOOT] \u2551 Neuro-Link ACTIVE        \u2551',
        '[BOOT] \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D',
        '',
        n + ' v' + v + ' flashed!'
      ];
      for (const l of bootLines) {
        out.textContent += l + '\n';
        out.scrollTop = out.scrollHeight;
        await new Promise(r => setTimeout(r, 150 + Math.random() * 100));
      }
    };
  });
}

function initSandbox() {
  const terminal = document.getElementById('sandbox-terminal');
  const osLabel = document.getElementById('sandbox-os-label');
  const fullscreenBtn = document.getElementById('sandbox-fullscreen');
  const output = document.getElementById('sandbox-output');
  const input = document.getElementById('sandbox-input');
  const cwdLabel = document.getElementById('sandbox-cwd');
  const promptLabel = document.getElementById('sandbox-prompt');
  if (!terminal) return;

  let state = null;
  const CK = 'cortex-sandbox-state';
  const SPECS_KEY = 'cortex-rig-specs';
  const OS_INV_KEY = 'cortex-os-inventory';
  let rigSpecs = loadRigSpecs();
  let booted = false;

  function loadRigSpecs() {
    try { const s = localStorage.getItem(SPECS_KEY); return s ? JSON.parse(s) : {}; } catch (e) { return {}; }
  }
  function saveRigSpecs() {
    try { localStorage.setItem(SPECS_KEY, JSON.stringify(rigSpecs)); } catch (e) {}
  }
  function loadCache() {
    try { const c = localStorage.getItem(CK); if (c) { const parsed = JSON.parse(c); if (parsed && parsed.env) { state = parsed; return true; } } } catch (e) {}
    return false;
  }
  function saveCache() {
    try { localStorage.setItem(CK, JSON.stringify(state)); } catch (e) {}
  }
  function getOSInventory() {
    try { return JSON.parse(localStorage.getItem(OS_INV_KEY) || '[]'); } catch (e) { return []; }
  }
  function addOSToInventory(name) {
    const inv = getOSInventory();
    if (!inv.find(o => o.name === name)) { inv.push({ name, downloadedAt: Date.now() }); localStorage.setItem(OS_INV_KEY, JSON.stringify(inv)); }
  }

  function updatePrompt() {
    if (!state) { cwdLabel.textContent = ''; promptLabel.textContent = '\uD83E\uDDE0 $'; return; }
    const s = state.cwd.replace('/home/neural-user', '~') || '/';
    cwdLabel.textContent = s;
    promptLabel.textContent = '\uD83E\uDDE0 ' + s + ' $';
  }
  function writeOut(t, c) {
    const d = document.createElement('div');
    d.className = c || 'output-line-out';
    d.textContent = t;
    output.appendChild(d);
    output.scrollTop = output.scrollHeight;
  }
  function setOSLabel() {
    if (state && state.env && state.env.osName) {
      osLabel.textContent = '\uD83E\uDDE0 ' + state.env.osName;
      booted = true;
    } else {
      osLabel.textContent = '\uD83E\uDDE0 BrainOS';
      booted = false;
    }
    updatePrompt();
  }

  function loadSidebarParts() {
    const cats = ['Frontal Lobe CPUs', 'Cortical GPUs', 'Memory Caches', 'Internet Chips', 'Bio-Cooling', 'Synaptic Accelerators', 'Neuro-Link PSU'];
    const inv = getInventory();
    for (const cat of cats) {
      const row = document.querySelector('.spec-row[data-cat="' + cat + '"]');
      if (!row) continue;
      const sel = row.querySelector('.spec-select');
      sel.innerHTML = '<option value="">-- None --</option>';
      const catParts = inv.filter(i => i.category === cat && i.type === 'part');
      catParts.forEach(p => {
        const o = document.createElement('option');
        o.value = JSON.stringify({ id: p.id, name: p.name, category: p.category, price: p.price, specs: p.specs || {} });
        o.textContent = p.name + ' -- $' + (p.price || 0).toFixed(2);
        sel.appendChild(o);
      });
      if (rigSpecs[cat]) {
        const match = catParts.find(p => p.id === rigSpecs[cat].id);
        if (match) sel.value = JSON.stringify({ id: match.id, name: match.name, category: match.category, price: match.price, specs: match.specs || {} });
      }
      sel.onchange = () => {
        const v = sel.value;
        if (v) { rigSpecs[cat] = JSON.parse(v); } else { delete rigSpecs[cat]; }
        saveRigSpecs();
        updatePerfBars();
        if (state && state.env) state.env.parts = Object.values(rigSpecs);
      };
    }
    updatePerfBars();
  }

  function updatePerfBars() {
    const score = (cat, base) => rigSpecs[cat] ? base + Math.floor(Math.random() * (100 - base)) : 5;
    document.getElementById('perf-cpu').style.width = score('Frontal Lobe CPUs', 70) + '%';
    document.getElementById('perf-gpu').style.width = score('Cortical GPUs', 65) + '%';
    document.getElementById('perf-dream').style.width = score('Internet Chips', 75) + '%';
    document.getElementById('perf-cool').style.width = score('Bio-Cooling', 60) + '%';
  }

  loadSidebarParts();
  window._refreshSandboxSidebar = () => { loadSidebarParts(); };

  setOSLabel();

  if (loadCache() && state && state.env && state.env.osName) {
    addOSToInventory(state.env.osName);
    setOSLabel();
    writeOut('Restored session: ' + state.env.osName, 'output-line-info');
    writeOut('Type "help" for commands.', 'output-line-info');
  } else {
    writeOut('BrainOS Sandbox v3.7.2', 'output-line-info');
    writeOut('No OS booted. Type "install-os <name>" to download one, then "boot <name>" to boot it.', 'output-line-info');
    writeOut('Type "help" for all commands.', 'output-line-info');
  }

  fullscreenBtn.onclick = () => terminal.classList.toggle('fullscreen');
  document.onkeydown = e => { if (e.key === 'Escape' && terminal.classList.contains('fullscreen')) terminal.classList.remove('fullscreen'); };
  output.onclick = () => input.focus();
  input.focus();

  input.onkeydown = async e => {
    if (e.key !== 'Enter') return;
    const cmd = input.value.trim();
    if (!cmd) return;
    input.value = '';
    writeOut(promptLabel.textContent + ' ' + cmd, 'output-line-cmd');

    const parts = cmd.split(/\s+/);
    const mainCmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (mainCmd === 'install-os') {
      const osName = args.join(' ');
      if (!osName) { writeOut('Usage: install-os <OS name>', 'output-line-err'); writeOut('Available: Ubuntu Neural, Arch Brain, Mint Cerebral, Fedora Synapse, Debian Thought, Gentoo Neural, Alpine Brain, Kali NeuroPen, NixOS Thought, Void Cortex, NeuralBSD', 'output-line-info'); return; }
      writeOut('Downloading ' + osName + '...', 'output-line-info');
      try {
        const r = await fetch('/api/sandbox/install-os', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ osName, state: { env: { parts: Object.values(rigSpecs) } } }) });
        const d = await r.json();
        if (d.success) {
          addOSToInventory(d.osName);
          writeOut(d.osName + ' downloaded! Package manager: ' + d.shell, 'output-line-info');
          writeOut('Type "boot ' + d.osName + '" to boot it.', 'output-line-info');
          const osInv = getOSInventory();
          if (osInv.length === 1) {
            writeOut('Auto-booting only OS...', 'output-line-info');
            doBoot(d.osName);
          }
        } else {
          writeOut('OS not found. Check the name.', 'output-line-err');
        }
      } catch (e) { writeOut('Download failed.', 'output-line-err'); }
      return;
    }

    if (mainCmd === 'boot') {
      const osName = args.join(' ');
      if (!osName) {
        const osInv = getOSInventory();
        if (!osInv.length) { writeOut('No OS downloaded. Type "install-os <name>" first.', 'output-line-err'); }
        else if (osInv.length === 1) { doBoot(osInv[0].name); }
        else { writeOut('Downloaded OSes:', 'output-line-info'); osInv.forEach(o => writeOut('  ' + o.name, 'output-line-info')); writeOut('Usage: boot <OS name>', 'output-line-info'); }
        return;
      }
      const osInv = getOSInventory();
      if (!osInv.find(o => o.name === osName)) { writeOut('You haven\'t downloaded ' + osName + '. Type "install-os ' + osName + '" first.', 'output-line-err'); return; }
      doBoot(osName);
      return;
    }

    if (mainCmd === 'my-os') {
      const osInv = getOSInventory();
      if (!osInv.length) { writeOut('No OS downloaded. Type "install-os <name>".', 'output-line-info'); }
      else { writeOut('Downloaded OSes:', 'output-line-info'); osInv.forEach(o => writeOut('  ' + o.name + (state?.env?.osName === o.name ? ' (running)' : ''), 'output-line-info')); }
      return;
    }

    if (!booted && mainCmd !== 'help' && mainCmd !== 'install-os' && mainCmd !== 'my-os' && mainCmd !== 'boot' && mainCmd !== 'clear') {
      writeOut('No OS booted. Type "install-os <name>" then "boot <name>" first.', 'output-line-err');
      return;
    }

    try {
      const r = await fetch('/api/sandbox/exec', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command: cmd, state }) });
      const d = await r.json();
      if (d.output) d.output.split('\n').forEach(l => {
        const s = l.replace(/\x1b\[[0-9;]*m/g, '');
        if (/\x1b\[31m|\x1b\[1;31m/.test(l)) writeOut(s, 'output-line-err');
        else if (/\x1b\[36m|\x1b\[1;36m/.test(l)) writeOut(s, 'output-line-info');
        else writeOut(s);
      });
      if (d.clear) output.innerHTML = '';
      if (d.game) startGame(d.game);
      else if (d.reboot) {
        writeOut('Rebooting...', 'output-line-info');
        await new Promise(r => setTimeout(r, 2000));
        output.innerHTML = '';
        writeOut('Rebooted.', 'output-line-info');
      }
      else if (d.browser) openBrowser(d.browser);
      else if (d.ai) {
        const agentName = localStorage.getItem('cortex-agent-name') || state?.env?.agentName || 'Nyx';
        writeOut(agentName + ' is thinking...', 'output-line-info');
        try {
          const ar = await fetch('/api/brain-agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: d.ai, history: [], name: agentName }) });
          const rd = ar.body.getReader(); const dc = new TextDecoder(); let buf = '', reply = '';
          while (true) { const { done, value } = await rd.read(); if (done) break; buf += dc.decode(value, { stream: true }); const ls = buf.split('\n'); buf = ls.pop() || '';
            for (const l of ls) { if (!l.startsWith('data: ')) continue; try { const j = JSON.parse(l.slice(6)); if (j.type === 'text') reply += j.data; } catch (e) {} } }
          writeOut('');
          reply.split('\n').forEach(l => writeOut(l.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/`([^`]+)`/g, '$1'), 'output-line-info'));
        } catch (e) { writeOut('Agent offline.', 'output-line-err'); }
      }
      else if (d.cortex) {
        writeOut('Cortex-Assistant thinking...', 'output-line-info');
        try {
          const ar = await fetch('/api/sandbox/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: d.cortex, osName: state?.env?.osName || 'BrainOS', specs: Object.values(rigSpecs) }) });
          const ad = await ar.json();
          writeOut('');
          ad.reply.split('\n').forEach(l => writeOut(l.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/`([^`]+)`/g, '$1'), 'output-line-info'));
        } catch (e) { writeOut('Cortex offline.', 'output-line-err'); }
      }
      if (d.state) { state = d.state; state.env.parts = Object.values(rigSpecs); saveCache(); updatePrompt(); }
    } catch (e) { writeOut('Error: disrupted.', 'output-line-err'); }
  };

  async function doBoot(osName) {
    writeOut('Booting ' + osName + '...', 'output-line-info');
    try {
      const r = await fetch('/api/sandbox/install-os', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ osName, state: { env: { parts: Object.values(rigSpecs) } } }) });
      const d = await r.json();
      if (d.success) {
        state = d.state;
        state.env.parts = Object.values(rigSpecs);
        saveCache();
        setOSLabel();
        writeOut(d.osName + ' booted! Package manager: ' + d.shell, 'output-line-info');
        writeOut('Type "help" for commands.', 'output-line-info');
      } else { writeOut('Boot failed.', 'output-line-err'); }
    } catch (e) { writeOut('Boot failed.', 'output-line-err'); }
  }

  window._sandboxSelectPart = (category, partId, partName, partPrice, partSpecs) => {
    const row = document.querySelector('.spec-row[data-cat="' + category + '"]');
    if (!row) return;
    const sel = row.querySelector('.spec-select');
    if (!sel) return;
    const partData = { id: partId, name: partName, category: category, price: partPrice || 0, specs: partSpecs || {} };
    const val = JSON.stringify(partData);
    let found = false;
    for (const opt of sel.options) { try { const v = JSON.parse(opt.value); if (String(v.id) === String(partId)) { found = true; break; } } catch (e) {} }
    if (!found) { const o = document.createElement('option'); o.value = val; o.textContent = partName + ' -- $' + (partPrice || 0).toFixed(2); sel.appendChild(o); }
    sel.value = val;
    sel.dispatchEvent(new Event('change'));
  };

  window._sandboxInstallOS = (osName) => {
    addOSToInventory(osName);
    doBoot(osName);
  };
  function saveRigSpecs() {
    try { localStorage.setItem(SPECS_KEY, JSON.stringify(rigSpecs)); } catch (e) {}
  }
  function loadCache() {
    try { const c = localStorage.getItem(CK); if (c) { state = JSON.parse(c); return true; } } catch (e) {}
    return false;
  }
  function saveCache() {
    try { localStorage.setItem(CK, JSON.stringify(state)); } catch (e) {}
  }

  function showTerminal() {
    setup.classList.add('hidden');
    terminal.classList.remove('hidden');
    osLabel.textContent = '\uD83E\uDDE0 ' + (state.env.osName || 'Ubuntu Neural');
    updatePrompt();
    input.focus();
  }
  function updatePrompt() {
    const s = state.cwd.replace('/home/neural-user', '~') || '/';
    cwdLabel.textContent = s;
    promptLabel.textContent = '\uD83E\uDDE0 ' + s + ' $';
  }
  function writeOut(t, c) {
    const d = document.createElement('div');
    d.className = c || 'output-line-out';
    d.textContent = t;
    output.appendChild(d);
    output.scrollTop = output.scrollHeight;
  }

  function loadSidebarParts() {
    const cats = ['Frontal Lobe CPUs', 'Cortical GPUs', 'Memory Caches', 'Internet Chips', 'Bio-Cooling', 'Synaptic Accelerators', 'Neuro-Link PSU'];
    const inv = getInventory();
    for (const cat of cats) {
      const row = document.querySelector('.spec-row[data-cat="' + cat + '"]');
      if (!row) continue;
      const sel = row.querySelector('.spec-select');
      sel.innerHTML = '<option value="">-- None --</option>';
      const catParts = inv.filter(i => i.category === cat && i.type === 'part');
      catParts.forEach(p => {
        const o = document.createElement('option');
        o.value = JSON.stringify({ id: p.id, name: p.name, category: p.category, price: p.price, specs: p.specs || {} });
        o.textContent = p.name + ' -- $' + (p.price || 0).toFixed(2);
        sel.appendChild(o);
      });
      if (rigSpecs[cat]) {
        const match = catParts.find(p => p.id === rigSpecs[cat].id);
        if (match) sel.value = JSON.stringify({ id: match.id, name: match.name, category: match.category, price: match.price, specs: match.specs || {} });
      }
      sel.onchange = () => {
        const v = sel.value;
        if (v) { rigSpecs[cat] = JSON.parse(v); } else { delete rigSpecs[cat]; }
        saveRigSpecs();
        updatePerfBars();
        if (state && state.env) state.env.parts = Object.values(rigSpecs);
      };
    }
    updatePerfBars();
  }

  loadSidebarParts();

  window._refreshSandboxSidebar = () => { loadSidebarParts(); };

  const osSearch = document.getElementById('sandbox-os-search');
  if (osSearch) osSearch.oninput = () => {
    const q = osSearch.value.toLowerCase();
    osSelect.querySelectorAll('option').forEach(o => {
      o.style.display = o.value.toLowerCase().includes(q) || o.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  };

  if (loadCache() && state.env && state.env.osName) {
    showTerminal();
    writeOut('Restored neural sandbox session.', 'output-line-info');
    writeOut('Type "help" for commands.', 'output-line-info');
  }

  installBtn.onclick = async () => {
    const osName = osSelect.value;
    installBtn.disabled = true;
    writeOut('Installing ' + osName + '...', 'output-line-info');
    try {
      const r = await fetch('/api/sandbox/install-os', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ osName, state: { env: { parts: Object.values(rigSpecs) } } })
      });
      const d = await r.json();
      if (d.success) {
        state = d.state;
        state.env.parts = Object.values(rigSpecs);
        saveCache();
        showTerminal();
        writeOut(d.osName + ' installed! Package manager: ' + d.shell, 'output-line-info');
        writeOut('Type "help" for commands.', 'output-line-info');
      }
    } catch (e) { writeOut('Installation failed.', 'output-line-err'); }
    installBtn.disabled = false;
  };

  fullscreenBtn.onclick = () => terminal.classList.toggle('fullscreen');
  document.onkeydown = e => { if (e.key === 'Escape' && terminal.classList.contains('fullscreen')) terminal.classList.remove('fullscreen'); };

  input.onkeydown = async e => {
    if (e.key !== 'Enter') return;
    const cmd = input.value.trim();
    if (!cmd) return;
    input.value = '';
    writeOut(promptLabel.textContent + ' ' + cmd, 'output-line-cmd');
    try {
      const r = await fetch('/api/sandbox/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd, state })
      });
      const d = await r.json();
      if (d.output) d.output.split('\n').forEach(l => {
        const s = l.replace(/\x1b\[[0-9;]*m/g, '');
        if (/\x1b\[31m|\x1b\[1;31m/.test(l)) writeOut(s, 'output-line-err');
        else if (/\x1b\[36m|\x1b\[1;36m/.test(l)) writeOut(s, 'output-line-info');
        else writeOut(s);
      });
      if (d.clear) output.innerHTML = '';
      if (d.game) startGame(d.game);
      else if (d.installOS) {
        writeOut('Installing ' + d.installOS + '...', 'output-line-info');
        try {
          const ir = await fetch('/api/sandbox/install-os', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ osName: d.installOS, state })
          });
          const id = await ir.json();
          if (id.success) {
            state = id.state;
            state.env.parts = Object.values(rigSpecs);
            saveCache();
            updatePrompt();
            osLabel.textContent = '\uD83E\uDDE0 ' + id.osName;
            writeOut(id.osName + ' installed! Pkg: ' + id.shell, 'output-line-info');
          } else {
            writeOut('OS not found. Type "install-os" for list.', 'output-line-err');
          }
        } catch (e) { writeOut('Install failed.', 'output-line-err'); }
      }
      else if (d.reboot) {
        writeOut('Rebooting...', 'output-line-info');
        await new Promise(r => setTimeout(r, 2000));
        output.innerHTML = '';
        writeOut('Rebooted.', 'output-line-info');
      }
      else if (d.browser) openBrowser(d.browser);
      else if (d.ai) {
        const agentName = localStorage.getItem('cortex-agent-name') || 'Nyx';
        writeOut(agentName + ' is thinking...', 'output-line-info');
        try {
          const ar = await fetch('/api/brain-agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: d.ai, history: [], name: agentName })
          });
          const rd = ar.body.getReader();
          const dc = new TextDecoder();
          let buf = '', reply = '';
          while (true) {
            const { done, value } = await rd.read();
            if (done) break;
            buf += dc.decode(value, { stream: true });
            const ls = buf.split('\n');
            buf = ls.pop() || '';
            for (const l of ls) {
              if (!l.startsWith('data: ')) continue;
              try {
                const j = JSON.parse(l.slice(6));
                if (j.type === 'text') reply += j.data;
              } catch (e) {}
            }
          }
          writeOut('');
          reply.split('\n').forEach(l => writeOut(l.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/`([^`]+)`/g, '$1'), 'output-line-info'));
        } catch (e) { writeOut('Agent offline.', 'output-line-err'); }
      }
      else if (d.cortex) {
        writeOut('Cortex-Assistant thinking...', 'output-line-info');
        try {
          const ar = await fetch('/api/sandbox/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: d.cortex, osName: state?.env?.osName || 'BrainOS', specs: Object.values(rigSpecs) })
          });
          const ad = await ar.json();
          writeOut('');
          ad.reply.split('\n').forEach(l => writeOut(l.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/`([^`]+)`/g, '$1'), 'output-line-info'));
        } catch (e) { writeOut('Cortex offline.', 'output-line-err'); }
      }
      if (d.state) {
        state = d.state;
        state.env.parts = Object.values(rigSpecs);
        saveCache();
        updatePrompt();
      }
    } catch (e) { writeOut('Error: disrupted.', 'output-line-err'); }
  };

  const gameOverlay = document.getElementById('game-overlay');
  const gameCanvas = document.getElementById('game-canvas');
  const gameTitle = document.getElementById('game-title');
  const gameQuit = document.getElementById('game-quit');
  const gameText = document.getElementById('game-text-output');
  const gameInputRow = document.getElementById('game-input-row');
  const gameInput = document.getElementById('game-input');
  const gameIterate = document.getElementById('game-iterate');
  let gameLoop = null, currentGameName = null, gameCode = null;

  gameQuit.onclick = () => {
    gameOverlay.classList.add('hidden');
    if (gameLoop) { clearInterval(gameLoop); gameLoop = null; }
    input.focus();
  };
  gameIterate.onclick = async () => { if (gameInput.value.trim()) await iterateGame(gameInput.value.trim()); gameInput.value = ''; };
  gameInput.onkeydown = async e => { if (e.key === 'Enter') { const v = gameInput.value.trim(); if (v) await iterateGame(v); gameInput.value = ''; } };

  function writeGameText(t) {
    const d = document.createElement('div');
    d.textContent = t;
    gameText.appendChild(d);
    gameText.scrollTop = gameText.scrollHeight;
  }

  function startGame(name) {
    gameOverlay.classList.remove('hidden');
    const ctx = gameCanvas.getContext('2d');
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, 480, 360);
    gameText.innerHTML = '';
    currentGameName = name;
    const games = { snake: initSnake, matrix: initMatrix, hack: initHack, dreams: initDreams, generate: generateGame };
    (games[name] || showGameMenu)(ctx, gameCanvas, gameText);
  }

  function showGameMenu() {
    gameTitle.textContent = 'Games';
    writeGameText('BrainOS Game Center');
    writeGameText('');
    writeGameText('  snake    -- Classic snake');
    writeGameText('  matrix   -- Matrix rain');
    writeGameText('  hack     -- Neural hack sim');
    writeGameText('  dreams   -- Live dream stream');
    writeGameText('  generate -- AI creates a new game');
    writeGameText('');
    writeGameText('Type: play <game>');
  }

  function initSnake(ctx) {
    gameTitle.textContent = 'Snake';
    const W = 480, H = 360, SZ = 12, cols = W / SZ, rows = H / SZ;
    let snake = [{ x: 20, y: 15 }], dir = { x: 1, y: 0 };
    let food = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
    let score = 0, alive = true;

    function draw() {
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, W, H);
      snake.forEach((s, i) => {
        ctx.fillStyle = i === 0 ? '#7c3aed' : '#22c55e';
        ctx.fillRect(s.x * SZ, s.y * SZ, SZ - 1, SZ - 1);
      });
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(food.x * SZ, food.y * SZ, SZ - 1, SZ - 1);
      ctx.fillStyle = '#a855f7';
      ctx.font = '12px monospace';
      ctx.fillText('Score: ' + score, 8, 16);
      if (!alive) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ef4444';
        ctx.font = '24px monospace';
        ctx.fillText('GAME OVER', W / 2 - 72, H / 2);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px monospace';
        ctx.fillText('Score: ' + score, W / 2 - 36, H / 2 + 24);
      }
    }

    function tick() {
      if (!alive) return;
      const h = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (h.x < 0 || h.x >= cols || h.y < 0 || h.y >= rows || snake.some(s => s.x === h.x && s.y === h.y)) {
        alive = false;
        draw();
        return;
      }
      snake.unshift(h);
      if (h.x === food.x && h.y === food.y) {
        score += 10;
        food = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
      } else {
        snake.pop();
      }
      draw();
    }

    const handleKey = e => {
      if (gameOverlay.classList.contains('hidden')) { document.removeEventListener('keydown', handleKey); return; }
      const m = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 } };
      const nd = m[e.key];
      if (nd && !(nd.x === -dir.x && nd.y === -dir.y)) dir = nd;
    };
    document.addEventListener('keydown', handleKey);
    gameLoop = setInterval(tick, 100);
    draw();
  }

  function initMatrix(ctx) {
    gameTitle.textContent = 'Matrix';
    const W = 480, H = 360, cols = Math.floor(W / 14);
    const drops = Array(cols).fill(0);
    const ch = '01\u30A2\u30A4\u30A6\u30A8\u30AA\u30AB\u30AD\u30AF\u30B1\u30B3\u30B5\u30B7\u30B9\u30BB\u30BD';
    gameLoop = setInterval(() => {
      ctx.fillStyle = 'rgba(5,5,16,0.1)';
      ctx.fillRect(0, 0, W, H);
      ctx.font = '14px monospace';
      for (let i = 0; i < cols; i++) {
        ctx.fillStyle = Math.random() > 0.95 ? '#fff' : '#22c55e';
        ctx.fillText(ch[Math.floor(Math.random() * ch.length)], i * 14, drops[i] * 14);
        if (drops[i] * 14 > H && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    }, 50);
  }

  function initHack(ctx) {
    gameTitle.textContent = 'Hack';
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, 480, 360);
    const lines = [
      'Scanning neural network...',
      'Found 7 vulnerable synapses',
      'Attempting handshake on 31337...',
      'Bypassing neuro-firewall... 80%',
      'Bypassing neuro-firewall... 100%',
      'Access granted!',
      'Injecting dream-packet...',
      'Root acquired!',
      '',
      'NEURAL HACK COMPLETE'
    ];
    let i = 0;
    gameLoop = setInterval(() => {
      if (i < lines.length) writeGameText(lines[i++]);
      else { clearInterval(gameLoop); gameLoop = null; }
    }, 600);
  }

  function initDreams(ctx) {
    gameTitle.textContent = 'Dreams';
    const W = 480, H = 360;
    const scenes = [
      { n: 'Night City', c: ['#1a0533', '#2d1b69', '#7c3aed'] },
      { n: 'Ocean of Thoughts', c: ['#0a1628', '#0e4d6e', '#06b6d4'] },
      { n: 'Memory Mountains', c: ['#1a0a0a', '#4a1a1a', '#ef4444'] },
      { n: 'Cosmic Brain', c: ['#0a0a1a', '#1a1a4a', '#a855f7'] }
    ];
    let ps = [], si = 0;
    function spawn() {
      ps = Array.from({ length: 50 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
        r: Math.random() * 4 + 1,
        c: scenes[si].c[Math.floor(Math.random() * 3)],
        l: Math.random() * 200 + 50
      }));
    }
    spawn();
    gameLoop = setInterval(() => {
      const s = scenes[si];
      ctx.fillStyle = s.c[0] + '20';
      ctx.fillRect(0, 0, W, H);
      ps.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.l--;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.c;
        ctx.fill();
      });
      ps = ps.filter(p => p.l > 0);
      if (ps.length < 25) spawn();
      ctx.fillStyle = '#a855f7';
      ctx.font = '16px monospace';
      ctx.fillText(s.n, 10, 24);
    }, 50);
    setInterval(() => {
      if (gameOverlay.classList.contains('hidden')) return;
      si = (si + 1) % scenes.length;
      spawn();
    }, 5000);
  }

  async function generateGame() {
    gameTitle.textContent = 'AI Game Gen';
    writeGameText('Generating game with AI...');
    try {
      const r = await fetch('/api/sandbox/generate-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameName: currentGameName === 'generate' ? 'random' : currentGameName, osName: state?.env?.osName || 'BrainOS' })
      });
      const d = await r.json();
      if (d.success && d.game) {
        gameCode = d.game;
        writeGameText(d.game.name);
        writeGameText(d.game.description);
        if (d.game.commands) d.game.commands.forEach(c => writeGameText('  ' + c.cmd + ' -- ' + c.desc));
        writeGameText('Type prompts to iterate on this game. Press Iterate.');
        gameInputRow.classList.remove('hidden');
        gameInput.focus();
      } else {
        writeGameText('Could not generate. Try again.');
      }
    } catch (e) { writeGameText('Error. Try again.'); }
  }

  async function iterateGame(prompt) {
    writeGameText('[iterating: ' + prompt + ']');
    try {
      const r = await fetch('/api/sandbox/generate-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameName: gameCode ? gameCode.name + ' ' + prompt : prompt, osName: state?.env?.osName || 'BrainOS' })
      });
      const d = await r.json();
      if (d.success && d.game) {
        gameCode = d.game;
        writeGameText('Updated: ' + d.game.name);
        writeGameText(d.game.description);
        if (d.game.commands) d.game.commands.forEach(c => writeGameText('  ' + c.cmd + ' -- ' + c.desc));
      } else {
        writeGameText('Iteration failed.');
      }
    } catch (e) { writeGameText('Error iterating.'); }
  }

  const browserOverlay = document.getElementById('browser-overlay');
  const browserUrl = document.getElementById('browser-url');
  const browserContent = document.getElementById('browser-content');
  const browserGo = document.getElementById('browser-go');
  const browserClose = document.getElementById('browser-close');

  browserClose.onclick = () => browserOverlay.classList.add('hidden');
  browserGo.onclick = () => loadPage(browserUrl.value);
  browserUrl.onkeydown = e => { if (e.key === 'Enter') loadPage(browserUrl.value); };

  function openBrowser(url) {
    browserOverlay.classList.remove('hidden');
    browserUrl.value = url.startsWith('brain://') ? url : 'brain://' + url;
    loadPage(url);
  }

  async function loadPage(url) {
    const clean = url.replace('brain://', '').replace('https://', '');
    browserContent.textContent = 'Loading...';
    try {
      const r = await fetch('/api/sandbox/browser?url=' + encodeURIComponent(clean));
      const d = await r.json();
      browserContent.innerHTML = '<div style="color:var(--accent2);font-weight:bold;margin-bottom:0.5rem">' + d.title + '</div><pre style="white-space:pre-wrap;color:var(--green)">' + d.content + '</pre>';
    } catch (e) { browserContent.textContent = 'Failed to load: ' + url; }
  }

  window._sandboxSelectPart = (category, partId, partName, partPrice, partSpecs) => {
    const row = document.querySelector('.spec-row[data-cat="' + category + '"]');
    if (!row) return;
    const sel = row.querySelector('.spec-select');
    if (!sel) return;
    const partData = { id: partId, name: partName, category: category, price: partPrice || 0, specs: partSpecs || {} };
    const val = JSON.stringify(partData);
    let found = false;
    for (const opt of sel.options) {
      try {
        const v = JSON.parse(opt.value);
        if (String(v.id) === String(partId)) { found = true; break; }
      } catch (e) {}
    }
    if (!found) {
      const o = document.createElement('option');
      o.value = val;
      o.textContent = partName + ' -- $' + (partPrice || 0).toFixed(2);
      sel.appendChild(o);
    }
    sel.value = val;
    sel.dispatchEvent(new Event('change'));
  };

  window._sandboxBuyAndSelect = (category, partId, partName, partPrice, partSpecs) => {
    addToInventory({ id: partId, name: partName, price: partPrice || 0, category: category, specs: partSpecs || {}, type: 'part', boughtAt: Date.now() });
    window._sandboxSelectPart(category, partId, partName, partPrice, partSpecs);
    if (window._refreshSandboxSidebar) window._refreshSandboxSidebar();
  };

  window._sandboxInstallOS = (osName) => {
    if (!state) {
      const opts = osSelect.querySelectorAll('option');
      for (const opt of opts) { if (opt.value === osName) { osSelect.value = osName; installBtn.click(); return; } }
    }
  };
}

function initMyBrain() {
  const grid = document.getElementById('my-brain-grid');
  const empty = document.getElementById('my-brain-empty');
  const totalEl = document.getElementById('brain-total');
  if (!grid) return;

  function render() {
    const inv = getInventory();
    if (totalEl) totalEl.textContent = '$' + inv.reduce((s, i) => s + (i.price || 0), 0).toFixed(2);

    if (!inv.length) {
      grid.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');

    grid.innerHTML = inv.map((item, idx) => {
      const isPb = item.type === 'prebuilt';
      return '<div class="brain-item glass-card" data-idx="' + idx + '">' +
        '<div class="bi-header"><h3>' + item.name + '</h3><span class="bi-type">' + (isPb ? 'Prebuilt' : 'Part') + '</span></div>' +
        (item.category ? '<span class="bi-cat">' + item.category + '</span>' : '') +
        '<div class="bi-price">$' + item.price.toFixed(2) + '</div>' +
        '<button class="btn btn-danger btn-sm brain-sell-btn" data-idx="' + idx + '">Remove from Brain</button>' +
        '</div>';
    }).join('');

    grid.querySelectorAll('.brain-sell-btn').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.idx);
        const inv = getInventory();
        if (idx >= 0 && idx < inv.length) {
          inv.splice(idx, 1);
          saveInventory(inv);
        }
        const card = btn.closest('.brain-item');
        card.style.transition = 'opacity 0.3s, transform 0.3s';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';
        setTimeout(() => render(), 300);
      };
    });
  }
  render();
}
