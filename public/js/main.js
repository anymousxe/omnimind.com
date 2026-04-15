document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('chat-input')) initChat();
  if (document.querySelector('.sync-brain-btn') || document.querySelector('.pb-buy-btn')) initCheckout();
  if (document.querySelector('.os-flash-btn')) initOSInstaller();
  if (document.getElementById('sandbox-input')) initSandbox();
  if (document.getElementById('my-brain-grid')) initMyBrain();
});

function renderMarkdown(t) {
  if (!t) return '';
  var s = t
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n/g, '<br>');
  return s;
}

var INVENTORY_KEY = 'cortex_inventory';
var OS_LIST_KEY = 'cortex_os_list';

function getInventory() {
  try { return JSON.parse(localStorage.getItem(INVENTORY_KEY)) || []; }
  catch(e) { return []; }
}

function saveInventory(inv) {
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(inv));
}

function addToInventory(item) {
  var inv = getInventory();
  if (inv.some(function(i) { return String(i.id) === String(item.id); })) return false;
  inv.push({ id: item.id, name: item.name, category: item.category, price: item.price, specs: item.specs || {} });
  saveInventory(inv);
  return true;
}

function removeFromInventory(id) {
  var inv = getInventory();
  var idx = -1;
  for (var i = 0; i < inv.length; i++) {
    if (String(inv[i].id) === String(id)) { idx = i; break; }
  }
  if (idx >= 0) { inv.splice(idx, 1); saveInventory(inv); }
}

function getOSList() {
  try { return JSON.parse(localStorage.getItem(OS_LIST_KEY)) || []; }
  catch(e) { return []; }
}

function saveOSList(list) {
  localStorage.setItem(OS_LIST_KEY, JSON.stringify(list));
}

function addToOSList(name) {
  var list = getOSList();
  if (list.indexOf(name) === -1) { list.push(name); saveOSList(list); }
  return true;
}

function removeFromOSList(name) {
  var list = getOSList();
  var idx = list.indexOf(name);
  if (idx >= 0) { list.splice(idx, 1); saveOSList(list); }
}

function initChat() {
  var bubble = document.getElementById('chat-bubble');
  var panel = document.getElementById('chat-panel');
  var closeBtn = document.getElementById('chat-close');
  var msgBox = document.getElementById('chat-messages');
  var input = document.getElementById('chat-input');
  var sendBtn = document.getElementById('chat-send');
  var stopBtn = document.getElementById('chat-stop');
  var abortCtrl = null;
  var history = [];

  if (!bubble || !panel) return;

  bubble.addEventListener('click', function() {
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) input.focus();
  });
  closeBtn.addEventListener('click', function() { panel.classList.add('hidden'); });

  stopBtn.addEventListener('click', function() {
    if (abortCtrl) { abortCtrl.abort(); abortCtrl = null; }
    stopBtn.classList.add('hidden');
  });

  function addMsg(role, html) {
    var div = document.createElement('div');
    div.className = 'chat-msg ' + role;
    div.innerHTML = html;
    msgBox.appendChild(div);
    msgBox.scrollTop = msgBox.scrollHeight;
    return div;
  }

  function send() {
    var msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    addMsg('user', renderMarkdown(msg));
    history.push({ role: 'user', content: msg });
    doStream(msg);
  }

  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', function(e) { if (e.key === 'Enter') send(); });

  function doStream(msg) {
    abortCtrl = new AbortController();
    stopBtn.classList.remove('hidden');
    var assistantDiv = addMsg('assistant', '');
    var fullText = '';
    var toolLabels = [];

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, history: history.slice(-10) }),
      signal: abortCtrl.signal
    }).then(function(resp) {
      var reader = resp.body.getReader();
      var decoder = new TextDecoder();
      var buffer = '';

      function processChunk(result) {
        if (result.done) {
          stopBtn.classList.add('hidden');
          abortCtrl = null;
          history.push({ role: 'assistant', content: fullText });
          return;
        }
        buffer += decoder.decode(result.value, { stream: true });
        var lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (var i = 0; i < lines.length; i++) {
          var line = lines[i].trim();
          if (!line.startsWith('data: ')) continue;
          if (line === 'data: [DONE]') continue;
          try {
            var ev = JSON.parse(line.slice(6));
            if (ev.type === 'text') {
              fullText += ev.data;
              assistantDiv.innerHTML = renderMarkdown(fullText) + toolLabels.map(function(l) { return '<div class="tool-label">' + l + '</div>'; }).join('');
              msgBox.scrollTop = msgBox.scrollHeight;
            } else if (ev.type === 'tool') {
              toolLabels.push('\u2699 ' + ev.data.action + ': ' + (ev.data.result || ''));
              assistantDiv.innerHTML = renderMarkdown(fullText) + toolLabels.map(function(l) { return '<div class="tool-label">' + l + '</div>'; }).join('');
              msgBox.scrollTop = msgBox.scrollHeight;
            } else if (ev.type === 'sandbox_action') {
              handleSandboxAction(ev.data);
            } else if (ev.type === 'done' || ev.type === 'error') {
              stopBtn.classList.add('hidden');
              abortCtrl = null;
              if (fullText) history.push({ role: 'assistant', content: fullText });
            }
          } catch(e) {}
        }
        return reader.read().then(processChunk);
      }

      return reader.read().then(processChunk);
    }).catch(function(e) {
      if (e.name !== 'AbortError') {
        addMsg('system', 'Neural pathway disrupted.');
      }
      stopBtn.classList.add('hidden');
      abortCtrl = null;
    });
  }

  function handleSandboxAction(action) {
    if (!action) return;
    if (action.action === 'buy_and_select') {
      addToInventory({ id: action.partId, name: action.partName, category: action.category, price: action.partPrice, specs: action.partSpecs });
      if (window._sandboxSelectPart) window._sandboxSelectPart(action.category, action.partId, action.partName, action.partPrice, action.partSpecs);
    } else if (action.action === 'select_part') {
      if (window._sandboxSelectPart) window._sandboxSelectPart(action.category, action.partId, action.partName, action.partPrice, action.partSpecs);
    } else if (action.action === 'install_os') {
      if (window._sandboxInstallOS) window._sandboxInstallOS(action.osName);
    }
  }
}

function initCheckout() {
  document.querySelectorAll('.sync-brain-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var id = btn.dataset.id;
      var name = btn.dataset.name;
      if (!id || !name) return;
      btn.disabled = true;
      btn.textContent = 'Syncing...';
      fetch('/api/part-info/' + id).then(function(r) { return r.json(); }).then(function(p) {
        if (!p || !p.id) { btn.textContent = 'Error'; btn.disabled = false; return; }
        var added = addToInventory({ id: p.id, name: p.name, category: p.category, price: p.price, specs: p.specs });
        var prog = btn.closest('.part-detail').querySelector('.sync-progress');
        if (prog) {
          prog.classList.remove('hidden');
          var fill = prog.querySelector('.progress-fill');
          var stat = prog.querySelector('.sync-status');
          if (fill) fill.style.width = '100%';
          if (stat) stat.textContent = added ? '\u26A1 Neural link established! Part synced to brain.' : 'Part already in your brain.';
        }
        btn.textContent = added ? '\u2713 Synced to Brain' : 'Already in Brain';
      }).catch(function() { btn.textContent = 'Error'; btn.disabled = false; });
    });
  });

  document.querySelectorAll('.pb-buy-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var name = btn.dataset.name;
      var price = parseFloat(btn.dataset.price);
      if (!name) return;
      btn.disabled = true;
      btn.textContent = 'Syncing...';
      var card = btn.closest('.prebuilt-card');
      var partTags = card ? card.querySelectorAll('.pb-part-tag') : [];
      var partNames = [];
      partTags.forEach(function(t) { partNames.push(t.textContent); });
      var inv = getInventory();
      var newCount = 0;
      partNames.forEach(function(pn) {
        var exists = inv.some(function(item) { return item.name === pn; });
        if (!exists) {
          inv.push({ id: Date.now() + Math.floor(Math.random() * 9999), name: pn, category: 'Prebuilt', price: price / partNames.length, specs: {} });
          newCount++;
        }
      });
      saveInventory(inv);
      var prog = btn.nextElementSibling;
      if (prog && prog.classList.contains('sync-progress')) {
        prog.classList.remove('hidden');
        var fill = prog.querySelector('.progress-fill');
        var stat = prog.querySelector('.sync-status');
        if (fill) fill.style.width = '100%';
        if (stat) stat.textContent = newCount > 0 ? '\u26A1 ' + newCount + ' parts synced to brain!' : 'All parts already in brain.';
      }
      btn.textContent = '\u2713 Synced to Brain';
    });
  });
}

function initOSInstaller() {
  var btn = document.querySelector('.os-flash-btn');
  if (!btn) return;
  btn.addEventListener('click', function() {
    var osName = btn.dataset.name;
    if (!osName) return;
    btn.disabled = true;
    btn.textContent = 'Flashing...';
    addToOSList(osName);
    var prog = document.getElementById('sync-progress');
    if (prog) {
      prog.classList.remove('hidden');
      var fill = document.getElementById('progress-fill');
      var stat = document.getElementById('sync-status');
      if (fill) fill.style.width = '100%';
      if (stat) stat.textContent = '\u26A1 ' + osName + ' flashed to brain! Boot it in the Sandbox.';
    }
    btn.textContent = '\u2713 Flashed to Brain';
    var overlay = document.getElementById('terminal-overlay');
    var output = document.getElementById('terminal-output');
    var closeBtn = document.getElementById('terminal-close');
    if (overlay && output) {
      overlay.classList.remove('hidden');
      output.innerHTML = '<div class="term-line" style="color:#22c55e">$ install-os ' + osName + '</div>' +
        '<div class="term-line" style="color:#06b6d4">Downloading ' + osName + ' image...</div>' +
        '<div class="term-line" style="color:#7c3aed">Flashing neural pathways... 100%</div>' +
        '<div class="term-line" style="color:#22c55e">\u2713 ' + osName + ' installed! Run "boot ' + osName + '" in the Sandbox.</div>';
    }
    if (closeBtn) closeBtn.addEventListener('click', function() { overlay.classList.add('hidden'); });
  });
}

function initSandbox() {
  var input = document.getElementById('sandbox-input');
  var output = document.getElementById('sandbox-output');
  var promptEl = document.getElementById('sandbox-prompt');
  var osLabel = document.getElementById('sandbox-os-label');
  var cwdEl = document.getElementById('sandbox-cwd');
  var fullscreenBtn = document.getElementById('sandbox-fullscreen');

  if (!input || !output) return;

  var state = { fs: {}, cwd: '/home/neural-user', env: { parts: [], installedPkgs: [], bootTime: null, osName: null, agentName: 'Nyx' } };
  var booted = false;
  var agentName = 'Nyx';
  var currentGame = null;

  function loadCache() {
    try {
      var cached = JSON.parse(localStorage.getItem('cortex_sandbox_state'));
      if (cached && cached.env && cached.env.osName) {
        state = cached;
        booted = true;
        return true;
      }
    } catch(e) {}
    return false;
  }

  function saveCache() {
    localStorage.setItem('cortex_sandbox_state', JSON.stringify(state));
  }

  function printLine(text, className) {
    var div = document.createElement('div');
    div.className = 'term-line' + (className ? ' ' + className : '');
    div.innerHTML = text;
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
  }

  function printLines(lines, className) {
    if (!lines) return;
    lines.split('\n').forEach(function(l) {
      printLine(l.replace(/\x1b\[1;3([0-7])m/g, '<span class="ansi-bold-$1">').replace(/\x1b\[0m/g, '</span>').replace(/\x1b\[[^m]*m/g, ''), className);
    });
  }

  function updatePrompt() {
    if (booted && state.env && state.env.osName) {
      if (osLabel) osLabel.textContent = '\u{1F9E0} ' + state.env.osName;
      if (promptEl) promptEl.textContent = '\u{1F9E0} $';
      if (cwdEl) cwdEl.textContent = state.cwd.replace('/home/neural-user', '~');
    } else {
      if (osLabel) osLabel.textContent = '\u{1F9E0} BrainOS';
      if (promptEl) promptEl.textContent = '\u{1F9E0} $';
      if (cwdEl) cwdEl.textContent = '~';
    }
  }

  function loadSidebarParts() {
    var inv = getInventory();
    var rows = document.querySelectorAll('#sidebar-specs .spec-row');
    rows.forEach(function(row) {
      var cat = row.dataset.cat;
      var sel = row.querySelector('.spec-select');
      if (!sel) return;
      sel.innerHTML = '<option value="">-- None --</option>';
      inv.filter(function(item) { return item.category === cat; }).forEach(function(item) {
        var opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = item.name;
        sel.appendChild(opt);
      });
      var current = (state.env.parts || []).find(function(p) { return p.category === cat; });
      if (current) sel.value = current.id;
    });
  }

  function updatePerformanceBars() {
    var parts = state.env.parts || [];
    var cpu = parts.find(function(p) { return p.category === 'Frontal Lobe CPUs'; });
    var gpu = parts.find(function(p) { return p.category === 'Cortical GPUs'; });
    var ic = parts.find(function(p) { return p.category === 'Internet Chips'; });
    var cool = parts.find(function(p) { return p.category === 'Bio-Cooling'; });
    var pCpu = document.getElementById('perf-cpu');
    var pGpu = document.getElementById('perf-gpu');
    var pDream = document.getElementById('perf-dream');
    var pCool = document.getElementById('perf-cool');
    if (pCpu) pCpu.style.width = (cpu ? 75 + Math.floor(Math.random() * 25) : 10) + '%';
    if (pGpu) pGpu.style.width = (gpu ? 70 + Math.floor(Math.random() * 30) : 5) + '%';
    if (pDream) pDream.style.width = (ic ? 80 + Math.floor(Math.random() * 20) : 15) + '%';
    if (pCool) pCool.style.width = (cool ? 70 + Math.floor(Math.random() * 25) : 20) + '%';
  }

  function selectSidebarPart(category, partId, partName, partPrice, partSpecs) {
    if (!state.env.parts) state.env.parts = [];
    state.env.parts = state.env.parts.filter(function(p) { return p.category !== category; });
    state.env.parts.push({ category: category, id: partId, name: partName, price: partPrice, specs: partSpecs });
    saveCache();
    loadSidebarParts();
    updatePerformanceBars();
    var rows = document.querySelectorAll('#sidebar-specs .spec-row');
    rows.forEach(function(row) {
      if (row.dataset.cat === category) {
        var sel = row.querySelector('.spec-select');
        if (sel) sel.value = partId;
      }
    });
  }

  window._sandboxSelectPart = selectSidebarPart;

  window._sandboxInstallOS = function(osName) {
    addToOSList(osName);
    printLine('<span style="color:#22c55e">\u2713 ' + osName + ' downloaded to brain. Run "boot ' + osName + '" to boot it.</span>');
  };

  document.querySelectorAll('#sidebar-specs .spec-select').forEach(function(sel) {
    sel.addEventListener('change', function() {
      var row = sel.closest('.spec-row');
      var cat = row ? row.dataset.cat : '';
      if (!sel.value) {
        state.env.parts = (state.env.parts || []).filter(function(p) { return p.category !== cat; });
        saveCache();
        updatePerformanceBars();
        return;
      }
      var inv = getInventory();
      var item = inv.find(function(i) { return String(i.id) === String(sel.value) && i.category === cat; });
      if (item) selectSidebarPart(cat, item.id, item.name, item.price, item.specs);
    });
  });

  if (fullscreenBtn) fullscreenBtn.addEventListener('click', function() {
    var terminal = document.getElementById('sandbox-terminal');
    if (terminal) terminal.classList.toggle('fullscreen');
  });

  function doBoot(osName) {
    fetch('/api/sandbox/install-os', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ osName: osName, state: state })
    }).then(function(r) { return r.json(); }).then(function(data) {
      if (data.error) { printLine('<span style="color:#ef4444">Error: ' + data.error + '</span>'); return; }
      state.fs = data.state.fs;
      state.cwd = data.state.cwd || '/home/neural-user';
      state.env = data.state.env;
      state.env.osName = osName;
      state.env.bootTime = Date.now();
      booted = true;
      saveCache();
      updatePrompt();
      printLine('<span style="color:#22c55e">Booting ' + osName + '...</span>');
      printLine('<span style="color:#06b6d4">Kernel loaded. Neural pathways connected.</span>');
      printLine('<span style="color:#7c3aed">Welcome to ' + osName + '. Type "help" for commands.</span>');
    }).catch(function() { printLine('<span style="color:#ef4444">Boot failed. Neural cascade.</span>'); });
  }

  function execCommand(raw) {
    if (!raw || !raw.trim()) return;
    raw = raw.trim();

    var allowedBeforeBoot = ['help', 'install-os', 'boot', 'my-os', 'clear', 'agent-name'];
    var parts = raw.split(/\s+/);
    var cmd = parts[0];

    if (!booted && allowedBeforeBoot.indexOf(cmd) === -1) {
      printLine('<span style="color:#eab308">No OS booted. Use "install-os" to download, then "boot &lt;name&gt;" to boot.</span>');
      return;
    }

    if (cmd === 'install-os') {
      var target = parts.slice(1).join(' ');
      if (!target) {
        printLine('<span style="color:#7c3aed">Usage: install-os &lt;OS name&gt;</span>');
        return;
      }
      addToOSList(target);
      printLine('<span style="color:#22c55e">\u2713 ' + target + ' downloaded. Run "boot ' + target + '" to boot it.</span>');
      return;
    }

    if (cmd === 'boot') {
      var bootName = parts.slice(1).join(' ');
      if (!bootName) {
        var osList = getOSList();
        if (osList.length === 0) {
          printLine('<span style="color:#eab308">No OSes downloaded. Use "install-os &lt;name&gt;" first.</span>');
        } else if (osList.length === 1) {
          doBoot(osList[0]);
        } else {
          printLine('<span style="color:#06b6d4">Downloaded OSes:</span>');
          osList.forEach(function(n) { printLine('  ' + n); });
          printLine('<span style="color:#7c3aed">Usage: boot &lt;OS name&gt;</span>');
        }
        return;
      }
      var osList2 = getOSList();
      if (osList2.indexOf(bootName) === -1) {
        printLine('<span style="color:#ef4444">OS "' + bootName + '" not downloaded. Run "install-os ' + bootName + '" first.</span>');
        return;
      }
      doBoot(bootName);
      return;
    }

    if (cmd === 'my-os') {
      var osList = getOSList();
      if (osList.length === 0) {
        printLine('<span style="color:#eab308">No OSes downloaded.</span>');
      } else {
        printLine('<span style="color:#06b6d4">Downloaded OSes:</span>');
        osList.forEach(function(n) { printLine('  ' + n + (booted && state.env && state.env.osName === n ? ' <span style="color:#22c55e">(current)</span>' : '')); });
      }
      return;
    }

    if (cmd === 'clear') {
      output.innerHTML = '';
      return;
    }

    if (cmd === 'agent-name') {
      var newName = parts.slice(1).join(' ');
      if (!newName) {
        printLine('<span style="color:#06b6d4">Current agent name: ' + agentName + '</span>');
      } else {
        agentName = newName;
        if (!state.env) state.env = {};
        state.env.agentName = newName;
        saveCache();
        printLine('<span style="color:#22c55e">Agent renamed to: ' + newName + '</span>');
      }
      return;
    }

    if (cmd === 'ai') {
      var aiMsg = parts.slice(1).join(' ');
      if (!aiMsg) {
        printLine('<span style="color:#06b6d4">Usage: ai &lt;message&gt; — Talk to your brain agent (' + agentName + ')</span>');
        return;
      }
      printLine('<span style="color:#7c3aed">[' + agentName + ' thinking...]</span>');
      fetch('/api/brain-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: aiMsg, name: agentName })
      }).then(function(r) {
        var reader = r.body.getReader();
        var decoder = new TextDecoder();
        var buffer = '';
        var fullText = '';
        var replyDiv = document.createElement('div');
        replyDiv.className = 'term-line';
        output.appendChild(replyDiv);

        function processChunk(result) {
          if (result.done) return;
          buffer += decoder.decode(result.value, { stream: true });
          var lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line.startsWith('data: ')) continue;
            if (line === 'data: [DONE]') continue;
            try {
              var ev = JSON.parse(line.slice(6));
              if (ev.type === 'text') {
                fullText += ev.data;
                replyDiv.innerHTML = '<span style="color:#a855f7">[' + agentName + ']</span> ' + renderMarkdown(fullText);
                output.scrollTop = output.scrollHeight;
              }
            } catch(e) {}
          }
          return reader.read().then(processChunk);
        }
        return reader.read().then(processChunk);
      }).catch(function() { printLine('<span style="color:#ef4444">Agent disconnected.</span>'); });
      return;
    }

    if (cmd === 'cortex') {
      var cortexMsg = parts.slice(1).join(' ');
      if (!cortexMsg) {
        printLine('<span style="color:#06b6d4">Usage: cortex &lt;question&gt; — Ask the store tech</span>');
        return;
      }
      printLine('<span style="color:#06b6d4">[Cortex-Assistant thinking...]</span>');
      var specsList = (state.env.parts || []).map(function(p) { return { category: p.category, name: p.name }; });
      fetch('/api/sandbox/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: cortexMsg, osName: state.env.osName || 'BrainOS', specs: specsList })
      }).then(function(r) { return r.json(); }).then(function(data) {
        printLine('<span style="color:#06b6d4">[Cortex]</span> ' + renderMarkdown(data.reply || 'No response.'));
      }).catch(function() { printLine('<span style="color:#ef4444">Cortex offline.</span>'); });
      return;
    }

    fetch('/api/sandbox/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: raw, state: state })
    }).then(function(r) { return r.json(); }).then(function(data) {
      if (data.clear) {
        output.innerHTML = '';
        return;
      }
      if (data.game) {
        handleGame(data.game);
        return;
      }
      if (data.installOS) {
        addToOSList(data.installOS);
        printLine('<span style="color:#22c55e">\u2713 ' + data.installOS + ' downloaded. Run "boot ' + data.installOS + '" to boot.</span>');
        return;
      }
      if (data.reboot) {
        booted = false;
        state.env = { parts: [], installedPkgs: [], bootTime: null, osName: null, agentName: agentName };
        saveCache();
        updatePrompt();
        printLine('<span style="color:#eab308">Neural cortex rebooting... No OS booted.</span>');
        return;
      }
      if (data.browser) {
        openBrowser(data.browser);
        return;
      }
      if (data.output) {
        printLines(data.output);
      }
      if (data.state) {
        state.fs = data.state.fs || state.fs;
        state.cwd = data.state.cwd || state.cwd;
        if (data.state.env) {
          state.env = data.state.env;
          if (!state.env.agentName) state.env.agentName = agentName;
        }
        saveCache();
        updatePrompt();
      }
    }).catch(function() { printLine('<span style="color:#ef4444">Command failed.</span>'); });
  }

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      var val = input.value;
      input.value = '';
      printLine('<span style="color:#7c3aed">$ ' + val + '</span>');
      execCommand(val);
    }
  });

  output.addEventListener('click', function() { input.focus(); });
  input.focus();

  var cached = loadCache();
  if (cached) {
    if (state.env && state.env.agentName) agentName = state.env.agentName;
    updatePrompt();
    printLine('<span style="color:#22c55e">Restored ' + state.env.osName + ' from cache.</span>');
  } else {
    var osList = getOSList();
    if (osList.length === 1) {
      doBoot(osList[0]);
    } else if (osList.length > 1) {
      printLine('<span style="color:#06b6d4">You have downloaded OSes. Run "boot &lt;name&gt;" or "my-os" to see them.</span>');
    } else {
      printLine('<span style="color:#7c3aed">Welcome to BrainOS Sandbox. No OS installed. Type "install-os" to download one.</span>');
    }
  }

  loadSidebarParts();
  updatePerformanceBars();

  function handleGame(gameName) {
    var overlay = document.getElementById('game-overlay');
    var title = document.getElementById('game-title');
    var canvas = document.getElementById('game-canvas');
    var textOut = document.getElementById('game-text-output');
    var gameInput = document.getElementById('game-input');
    var iterBtn = document.getElementById('game-iterate');
    var quitBtn = document.getElementById('game-quit');

    if (!overlay) return;
    overlay.classList.remove('hidden');
    if (title) title.textContent = gameName;

    if (gameName === 'snake') { initSnake(canvas); return; }
    if (gameName === 'matrix') { initMatrix(canvas); return; }
    if (gameName === 'hack') { initHack(textOut); return; }
    if (gameName === 'dreams') { initDreams(canvas); return; }

    if (gameName === 'generate') {
      fetch('/api/sandbox/generate-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameName: 'random', osName: state.env.osName || 'BrainOS' })
      }).then(function(r) { return r.json(); }).then(function(data) {
        if (data.success && data.game) {
          currentGame = data.game;
          if (title) title.textContent = data.game.name || 'AI Game';
          if (textOut) textOut.innerHTML = renderMarkdown(data.game.description || '');
        } else {
          if (textOut) textOut.textContent = data.error || 'Could not generate game.';
        }
      });
      return;
    }

    if (textOut) textOut.textContent = 'Unknown game: ' + gameName + '. Try: snake, matrix, hack, dreams, generate.';

    if (quitBtn) quitBtn.onclick = function() {
      overlay.classList.add('hidden');
      currentGame = null;
    };

    if (iterBtn && gameInput) iterBtn.onclick = function() {
      if (!currentGame) return;
      var val = gameInput.value.trim();
      gameInput.value = '';
      if (val) iterateGame(val);
    };

    if (gameInput) gameInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && currentGame) {
        var val = gameInput.value.trim();
        gameInput.value = '';
        if (val) iterateGame(val);
      }
    });
  }

  function iterateGame(prompt) {
    if (!currentGame) return;
    var textOut = document.getElementById('game-text-output');
    if (textOut) textOut.innerHTML += '<br><span style="color:#7c3aed">> ' + prompt + '</span><br>Iterating...';
    fetch('/api/sandbox/generate-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameName: currentGame.name || prompt, osName: state.env.osName || 'BrainOS' })
    }).then(function(r) { return r.json(); }).then(function(data) {
      if (data.success && data.game) {
        currentGame = data.game;
        if (textOut) textOut.innerHTML += '<br>' + renderMarkdown(data.game.description || '');
      } else {
        if (textOut) textOut.innerHTML += '<br>Could not iterate.';
      }
      if (textOut) textOut.scrollTop = textOut.scrollHeight;
    });
  }

  function initSnake(canvas) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    var sz = 15;
    var snake = [{ x: 10, y: 10 }];
    var dir = { x: 1, y: 0 };
    var food = { x: 20, y: 20 };
    var score = 0;
    var running = true;

    function draw() {
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#22c55e';
      snake.forEach(function(s) { ctx.fillRect(s.x * sz, s.y * sz, sz - 1, sz - 1); });
      ctx.fillStyle = '#7c3aed';
      ctx.fillRect(food.x * sz, food.y * sz, sz - 1, sz - 1);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12px JetBrains Mono';
      ctx.fillText('Score: ' + score, 5, 15);
    }

    function step() {
      if (!running) return;
      var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (head.x < 0 || head.x >= W / sz || head.y < 0 || head.y >= H / sz) { running = false; draw(); return; }
      if (snake.some(function(s) { return s.x === head.x && s.y === head.y; })) { running = false; draw(); return; }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score++;
        food = { x: Math.floor(Math.random() * (W / sz)), y: Math.floor(Math.random() * (H / sz)) };
      } else {
        snake.pop();
      }
      draw();
      setTimeout(step, 100);
    }

    var quitBtn = document.getElementById('game-quit');
    if (quitBtn) quitBtn.onclick = function() {
      running = false;
      document.getElementById('game-overlay').classList.add('hidden');
    };

    document.addEventListener('keydown', function handler(e) {
      if (!running) { document.removeEventListener('keydown', handler); return; }
      if (e.key === 'ArrowUp' && dir.y !== 1) dir = { x: 0, y: -1 };
      else if (e.key === 'ArrowDown' && dir.y !== -1) dir = { x: 0, y: 1 };
      else if (e.key === 'ArrowLeft' && dir.x !== 1) dir = { x: -1, y: 0 };
      else if (e.key === 'ArrowRight' && dir.x !== -1) dir = { x: 1, y: 0 };
    });

    draw();
    step();
  }

  function initMatrix(canvas) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    var cols = Math.floor(W / 14);
    var drops = [];
    for (var i = 0; i < cols; i++) drops[i] = Math.random() * H;
    var running = true;

    function draw() {
      if (!running) return;
      ctx.fillStyle = 'rgba(10,10,15,0.05)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#7c3aed';
      ctx.font = '14px JetBrains Mono';
      for (var i = 0; i < drops.length; i++) {
        var text = String.fromCharCode(0x30A0 + Math.random() * 96);
        ctx.fillText(text, i * 14, drops[i]);
        if (drops[i] > H && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 14;
      }
      requestAnimationFrame(draw);
    }

    var quitBtn = document.getElementById('game-quit');
    if (quitBtn) quitBtn.onclick = function() {
      running = false;
      document.getElementById('game-overlay').classList.add('hidden');
    };

    draw();
  }

  function initHack(textOut) {
    if (!textOut) return;
    var levels = [
      { target: 'firewall', ip: '10.0.0.1', difficulty: 1 },
      { target: 'neural-cache', ip: '10.0.0.42', difficulty: 2 },
      { target: 'dream-server', ip: '192.168.1.1', difficulty: 3 }
    ];
    var lvl = 0;
    textOut.innerHTML = '<span style="color:#22c55e">NEURAL HACK SIMULATOR v3.7</span><br>' +
      '<span style="color:#06b6d4">Type "scan" to find targets, "hack &lt;ip&gt;" to attack.</span>';

    var gameInput = document.getElementById('game-input');
    var quitBtn = document.getElementById('game-quit');

    function hackInput() {
      if (!gameInput) return;
      gameInput.removeEventListener('keydown', hackHandler);
      gameInput.addEventListener('keydown', hackHandler);
    }

    function hackHandler(e) {
      if (e.key !== 'Enter') return;
      var val = gameInput.value.trim().toLowerCase();
      gameInput.value = '';
      if (val === 'scan') {
        textOut.innerHTML += '<br><span style="color:#7c3aed">[scan] Scanning network...</span>';
        levels.forEach(function(l) {
          textOut.innerHTML += '<br>  ' + l.ip + ' - ' + l.target + ' (difficulty: ' + l.difficulty + ')';
        });
      } else if (val.startsWith('hack ')) {
        var ip = val.slice(5);
        var target = levels.find(function(l) { return l.ip === ip; });
        if (!target) {
          textOut.innerHTML += '<br><span style="color:#ef4444">Target not found.</span>';
        } else {
          textOut.innerHTML += '<br><span style="color:#eab308">[hack] Attacking ' + target.target + '...</span>';
          setTimeout(function() {
            if (Math.random() > 0.3) {
              textOut.innerHTML += '<br><span style="color:#22c55e">[hack] ACCESS GRANTED - ' + target.target + ' compromised!</span>';
              lvl++;
            } else {
              textOut.innerHTML += '<br><span style="color:#ef4444">[hack] DETECTED! Intrusion blocked.</span>';
            }
            textOut.scrollTop = textOut.scrollHeight;
          }, 1500);
        }
      }
      textOut.scrollTop = textOut.scrollHeight;
    }

    if (quitBtn) quitBtn.onclick = function() {
      if (gameInput) gameInput.removeEventListener('keydown', hackHandler);
      document.getElementById('game-overlay').classList.add('hidden');
    };

    hackInput();
  }

  function initDreams(canvas) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    var running = true;
    var particles = [];
    for (var i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 3 + 1,
        dx: (Math.random() - 0.5) * 2,
        dy: (Math.random() - 0.5) * 2,
        color: ['#7c3aed', '#a855f7', '#06b6d4', '#22c55e'][Math.floor(Math.random() * 4)]
      });
    }

    function draw() {
      if (!running) return;
      ctx.fillStyle = 'rgba(10,10,15,0.1)';
      ctx.fillRect(0, 0, W, H);
      particles.forEach(function(p) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > W) p.dx *= -1;
        if (p.y < 0 || p.y > H) p.dy *= -1;
      });
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12px JetBrains Mono';
      ctx.fillText('Dream Mode: ACTIVE | FPS: 240', 5, 15);
      requestAnimationFrame(draw);
    }

    var quitBtn = document.getElementById('game-quit');
    if (quitBtn) quitBtn.onclick = function() {
      running = false;
      document.getElementById('game-overlay').classList.add('hidden');
    };

    draw();
  }

  function openBrowser(url) {
    var overlay = document.getElementById('browser-overlay');
    var urlInput = document.getElementById('browser-url');
    var content = document.getElementById('browser-content');
    var goBtn = document.getElementById('browser-go');
    var closeBtn = document.getElementById('browser-close');

    if (!overlay) return;
    overlay.classList.remove('hidden');
    if (urlInput) urlInput.value = url.startsWith('brain://') ? url : 'brain://' + url;
    loadPage(url);

    if (goBtn) goBtn.onclick = function() { loadPage(urlInput.value); };
    if (closeBtn) closeBtn.onclick = function() { overlay.classList.add('hidden'); };
  }

  function loadPage(url) {
    var content = document.getElementById('browser-content');
    if (!content) return;
    content.innerHTML = '<span style="color:#7c3aed">Loading...</span>';
    var cleanUrl = url.replace('brain://', '').replace('https://', '').replace('http://', '');
    fetch('/api/sandbox/browser?url=' + encodeURIComponent(cleanUrl)).then(function(r) { return r.json(); }).then(function(page) {
      content.innerHTML = '<h3 style="color:#7c3aed">' + (page.title || 'Page') + '</h3>' +
        '<pre style="color:#e2e8f0;font-family:JetBrains Mono,monospace;white-space:pre-wrap;font-size:0.85rem;">' + (page.content || 'Empty page.') + '</pre>';
    }).catch(function() { content.innerHTML = '<span style="color:#ef4444">Failed to load page.</span>'; });
  }
}

function initMyBrain() {
  var grid = document.getElementById('my-brain-grid');
  var emptyMsg = document.getElementById('my-brain-empty');
  var totalEl = document.getElementById('brain-total');
  if (!grid) return;

  function render() {
    var inv = getInventory();
    grid.innerHTML = '';
    if (inv.length === 0) {
      if (emptyMsg) emptyMsg.style.display = '';
      if (totalEl) totalEl.textContent = '$ 0.00';
      return;
    }
    if (emptyMsg) emptyMsg.style.display = 'none';
    var total = 0;
    inv.forEach(function(item, idx) {
      total += item.price || 0;
      var card = document.createElement('div');
      card.className = 'part-card glass-card';
      card.innerHTML = '<div class="part-cat-badge">' + (item.category || '') + '</div>' +
        '<h3 class="part-name">' + (item.name || 'Unknown') + '</h3>' +
        '<div class="part-price">$ ' + (item.price || 0).toFixed(2) + '</div>' +
        '<button class="btn btn-secondary btn-sm brain-remove-btn" data-idx="' + idx + '" data-id="' + item.id + '">Remove from Brain</button>';
      grid.appendChild(card);
    });
    if (totalEl) totalEl.textContent = '$ ' + total.toFixed(2);

    grid.querySelectorAll('.brain-remove-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = btn.dataset.id;
        removeFromInventory(id);
        render();
      });
    });
  }

  render();
}
