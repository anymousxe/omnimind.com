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

var PACKAGES_KEY = 'cortex_packages';
var CUSTOM_OS_KEY = 'cortex_custom_os';
var UPLOADED_KEY = 'cortex_uploaded_pkgs';

function getPackages() {
  try { return JSON.parse(localStorage.getItem(PACKAGES_KEY)) || []; }
  catch(e) { return []; }
}

function savePackages(pkgs) {
  localStorage.setItem(PACKAGES_KEY, JSON.stringify(pkgs));
}

function addPackage(pkg) {
  var pkgs = getPackages();
  var idx = pkgs.findIndex(function(p) { return p.name === pkg.name; });
  if (idx >= 0) pkgs[idx] = pkg;
  else pkgs.push(pkg);
  savePackages(pkgs);
  return true;
}

function removePackage(name) {
  var pkgs = getPackages();
  pkgs = pkgs.filter(function(p) { return p.name !== name; });
  savePackages(pkgs);
}

function getUploadedPkgs() {
  try { return JSON.parse(localStorage.getItem(UPLOADED_KEY)) || []; }
  catch(e) { return []; }
}

function addUploadedPkg(pkg) {
  var up = getUploadedPkgs();
  if (!up.some(function(p) { return p.name === pkg.name; })) { up.push({ name: pkg.name, type: pkg.type, description: pkg.description || '', version: pkg.version || '1.0.0' }); }
  localStorage.setItem(UPLOADED_KEY, JSON.stringify(up));
}

function getCustomOSList() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_OS_KEY)) || []; }
  catch(e) { return []; }
}

function addCustomOS(osData) {
  var list = getCustomOSList();
  var idx = list.findIndex(function(o) { return o.name === osData.name; });
  if (idx >= 0) list[idx] = osData;
  else list.push(osData);
  localStorage.setItem(CUSTOM_OS_KEY, JSON.stringify(list));
  addToOSList(osData.name);
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

  function formatToolBadge(action, data) {
    var icon = '\u2699';
    var label = action;
    var detail = '';
    var statusClass = 'tool-status-ok';

    if (typeof data === 'string') {
      detail = data;
    } else if (data && typeof data === 'object') {
      if (data.message) {
        detail = data.message;
      } else if (data.results && Array.isArray(data.results)) {
        detail = data.results.length + ' result' + (data.results.length === 1 ? '' : 's') + ' found';
        if (data.results.length > 0) {
          var names = data.results.slice(0, 3).map(function(r) { return r.name || 'Part #' + (r.id || '?'); });
          detail += ' \u2014 ' + names.join(', ') + (data.results.length > 3 ? ' +' + (data.results.length - 3) + ' more' : '');
        }
      } else if (data.success === false) {
        statusClass = 'tool-status-fail';
        detail = data.message || data.error || 'Failed';
      } else {
        detail = data.message || JSON.stringify(data).slice(0, 120);
      }
    }

    var actionIcons = {
      'add_part': '\U0001f527',
      'remove_part': '\U0001f5d1',
      'search_parts': '\U0001f50d',
      'lookup_compatibility': '\U0001f517',
      'set_price': '\U0001f4b0',
      'set_stock': '\U0001f4e6',
      'create_sale': '\U0001f525',
      'select_part_for_user': '\u26a1',
      'buy_and_select_part': '\U0001f6d2',
      'install_os_for_user': '\U0001f4be'
    };
    var actionLabels = {
      'add_part': 'Manufacturing Part',
      'remove_part': 'Decommissioning Part',
      'search_parts': 'Searching Catalog',
      'lookup_compatibility': 'Checking Compatibility',
      'set_price': 'Adjusting Price',
      'set_stock': 'Updating Stock',
      'create_sale': 'Creating Sale',
      'select_part_for_user': 'Selecting Part',
      'buy_and_select_part': 'Buying & Selecting',
      'install_os_for_user': 'Installing OS'
    };

    icon = actionIcons[action] || icon;
    label = actionLabels[action] || action;

    return '<div class="tool-badge"><div class="tool-badge-header"><span class="tool-badge-icon">' + icon + '</span><span class="tool-badge-label">' + label + '</span><span class="' + statusClass + '">' + (data && data.success === false ? '\u2717' : '\u2713') + '</span></div>' + (detail ? '<div class="tool-badge-detail">' + detail + '</div>' : '') + '</div>';
  }

  function doStream(msg) {
    abortCtrl = new AbortController();
    stopBtn.classList.remove('hidden');
    var assistantDiv = addMsg('assistant', '');
    var fullText = '';
    var toolBadges = [];

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
              assistantDiv.innerHTML = renderMarkdown(fullText) + toolBadges.join('');
              msgBox.scrollTop = msgBox.scrollHeight;
            } else if (ev.type === 'tool') {
              toolBadges.push(formatToolBadge(ev.data.action, ev.data.result));
              assistantDiv.innerHTML = renderMarkdown(fullText) + toolBadges.join('');
              msgBox.scrollTop = msgBox.scrollHeight;
            } else if (ev.type === 'sandbox_action') {
              handleSandboxAction(ev.data);
              if (ev.data.label) {
                toolBadges.push('<div class="tool-badge tool-badge-action"><div class="tool-badge-header"><span class="tool-badge-icon">\u26a1</span><span class="tool-badge-label">' + ev.data.label + '</span><span class="tool-status-ok">\u2713</span></div></div>');
                assistantDiv.innerHTML = renderMarkdown(fullText) + toolBadges.join('');
                msgBox.scrollTop = msgBox.scrollHeight;
              }
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
    var customOSList = getCustomOSList();
    var customOS = customOSList.find(function(o) { return o.name === osName; });

    if (customOS) {
      state.fs = JSON.parse(JSON.stringify(defaultFS));
      state.cwd = '/home/neural-user';
      state.env = { osName: osName, bootTime: Date.now(), installedPkgs: ['brain-core', 'dream-daemon', 'neuro-utils'], parts: state.env.parts || [], agentName: agentName };
      state.env.customShell = {
        pkg: customOS.pkg || 'custom-pkg',
        install: customOS.install || 'custom-pkg install',
        remove: customOS.remove || 'custom-pkg remove',
        update: customOS.update || 'custom-pkg update',
        upgrade: customOS.upgrade || 'custom-pkg upgrade',
        search: customOS.search || 'custom-pkg search',
        list: customOS.list || 'custom-pkg list'
      };
      state.env.exclusiveCommands = customOS.exclusive_commands || [];
      booted = true;
      saveCache();
      updatePrompt();
      if (customOS.boot_message) {
        customOS.boot_message.split('\n').forEach(function(l) { printLine('<span style="color:#7c3aed">' + l + '</span>'); });
      } else {
        printLine('<span style="color:#22c55e">Booting ' + osName + '...</span>');
        printLine('<span style="color:#06b6d4">Kernel loaded. Neural pathways connected.</span>');
      }
      printLine('<span style="color:#7c3aed">Welcome to ' + osName + '. Type "help" for commands.</span>');
      if (customOS.exclusive_commands && customOS.exclusive_commands.length) {
        printLine('<span style="color:#06b6d4">Exclusive commands: ' + customOS.exclusive_commands.map(function(c) { return c.cmd; }).join(', ') + '</span>');
      }
      return;
    }

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

    var allowedBeforeBoot = ['help', 'install-os', 'boot', 'my-os', 'clear', 'agent-name', 'pkg-create', 'pkg-list', 'create-os'];
    var parts = raw.split(/\s+/);
    var cmd = parts[0];

    if (cmd === 'pkg' && parts[1]) {
      var sub = parts[1];
      if (['create', 'upload', 'list', 'run', 'remove'].indexOf(sub) >= 0) {
        cmd = 'pkg-' + sub;
        parts = [cmd].concat(parts.slice(2));
      }
    }

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

    if (cmd === 'pkg-create') {
      var pkgType = parts[1] || '';
      var pkgName = parts.slice(2).join(' ');
      var validTypes = ['game', 'malware', 'browser', 'engine', 'app', 'tool'];
      if (!pkgType || !validTypes.indexOf(pkgType) === -1 || !pkgName) {
        printLine('<span style="color:#eab308">Usage: pkg-create &lt;type&gt; &lt;name&gt;</span>');
        printLine('<span style="color:#94a3b8">Types: game, malware, browser, engine, app, tool</span>');
        return;
      }
      printLine('<span style="color:#7c3aed">[AI] Generating ' + pkgType + ' package "' + pkgName + '"...</span>');
      fetch('/api/sandbox/create-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: pkgName, type: pkgType, osName: state.env.osName || 'BrainOS' })
      }).then(function(r) { return r.json(); }).then(function(data) {
        if (data.success && data.package) {
          addPackage(data.package);
          printLine('<span style="color:#22c55e">\u2713 Package "' + pkgName + '" created! Run "pkg-run ' + pkgName + '" or "pkg-upload ' + pkgName + '".</span>');
          printLine('<span style="color:#94a3b8">' + (data.package.description || '').slice(0, 120) + '</span>');
        } else {
          printLine('<span style="color:#ef4444">Failed to create package: ' + (data.error || 'Unknown error') + '</span>');
        }
      }).catch(function() { printLine('<span style="color:#ef4444">Package creation failed.</span>'); });
      return;
    }

    if (cmd === 'pkg-upload') {
      var uploadName = parts.slice(1).join(' ');
      if (!uploadName) { printLine('<span style="color:#eab308">Usage: pkg-upload &lt;name&gt;</span>'); return; }
      var pkgs = getPackages();
      var found = pkgs.find(function(p) { return p.name === uploadName; });
      if (!found) { printLine('<span style="color:#ef4444">Package "' + uploadName + '" not found locally. Create it first with pkg-create.</span>'); return; }
      addUploadedPkg(found);
      printLine('<span style="color:#22c55e">\u2713 "' + uploadName + '" uploaded to neural repository! Others can install it.</span>');
      return;
    }

    if (cmd === 'pkg-list') {
      var pkgs = getPackages();
      var uploaded = getUploadedPkgs();
      if (pkgs.length === 0 && uploaded.length === 0) {
        printLine('<span style="color:#94a3b8">No packages installed. Use pkg-create or apt install.</span>');
        return;
      }
      printLine('<span style="color:#06b6d4">Installed Packages:</span>');
      pkgs.forEach(function(p) {
        var typeIcon = { game: '\U0001f3ae', malware: '\u2620', browser: '\U0001f310', engine: '\U0001f50d', app: '\U0001f4e6', tool: '\U0001f527' };
        printLine('  ' + (typeIcon[p.type] || '\U0001f4e6') + ' ' + p.name + ' v' + (p.version || '1.0.0') + ' <span style="color:#94a3b8">(' + p.type + ')</span>');
      });
      if (uploaded.length > 0) {
        printLine('');
        printLine('<span style="color:#7c3aed">Uploaded to Repository:</span>');
        uploaded.forEach(function(p) {
          printLine('  \u2601 ' + p.name + ' v' + (p.version || '1.0.0') + ' <span style="color:#94a3b8">(' + p.type + ')</span>');
        });
      }
      return;
    }

    if (cmd === 'pkg-run') {
      var runName = parts.slice(1).join(' ');
      if (!runName) { printLine('<span style="color:#eab308">Usage: pkg-run &lt;name&gt;</span>'); return; }
      var pkgs = getPackages();
      var pkg = pkgs.find(function(p) { return p.name === runName; });
      if (!pkg) { printLine('<span style="color:#ef4444">Package "' + runName + '" not installed. Use apt install ' + runName + ' or pkg-create.</span>'); return; }
      runPackageAction(pkg);
      return;
    }

    if (cmd === 'pkg-remove') {
      var rmName = parts.slice(1).join(' ');
      if (!rmName) { printLine('<span style="color:#eab308">Usage: pkg-remove &lt;name&gt;</span>'); return; }
      var pkgs = getPackages();
      var found = pkgs.find(function(p) { return p.name === rmName; });
      if (!found) { printLine('<span style="color:#ef4444">Package "' + rmName + '" not found.</span>'); return; }
      removePackage(rmName);
      if (state.env.installedPkgs) state.env.installedPkgs = state.env.installedPkgs.filter(function(p) { return p !== rmName; });
      saveCache();
      printLine('<span style="color:#22c55e">\u2713 Package "' + rmName + '" removed.</span>');
      return;
    }

    if (cmd === 'create-os') {
      var cosName = parts.slice(1).join(' ');
      if (!cosName) { printLine('<span style="color:#eab308">Usage: create-os &lt;name&gt;</span>'); return; }
      printLine('<span style="color:#7c3aed">[AI] Generating custom OS "' + cosName + '"...</span>');
      fetch('/api/sandbox/create-os', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cosName })
      }).then(function(r) { return r.json(); }).then(function(data) {
        if (data.success && data.os) {
          addCustomOS(data.os);
          printLine('<span style="color:#22c55e">\u2713 Custom OS "' + cosName + '" created! v' + (data.os.version || '1.0') + '</span>');
          printLine('<span style="color:#94a3b8">' + (data.os.description || '').slice(0, 150) + '</span>');
          if (data.os.exclusive_commands && data.os.exclusive_commands.length) {
            printLine('<span style="color:#06b6d4">Exclusive commands:</span>');
            data.os.exclusive_commands.forEach(function(c) { printLine('  \u26a1 ' + c.cmd + ' — ' + c.desc); });
          }
          printLine('<span style="color:#7c3aed">Run "boot ' + cosName + '" to boot it.</span>');
        } else {
          printLine('<span style="color:#ef4444">Failed to create OS: ' + (data.error || 'Unknown error') + '</span>');
        }
      }).catch(function() { printLine('<span style="color:#ef4444">OS creation failed.</span>'); });
      return;
    }

    var exclusiveCommands = (state.env && state.env.exclusiveCommands) || [];
    var exclusiveMatch = exclusiveCommands.find(function(c) { return c.cmd === cmd; });
    if (exclusiveMatch) {
      printLine('<span style="color:#06b6d4">\u26a1 ' + exclusiveMatch.cmd + '</span>');
      printLine('<span style="color:#94a3b8">' + exclusiveMatch.desc + '</span>');
      if (exclusiveMatch.output) {
        exclusiveMatch.output.split('\n').forEach(function(l, idx) {
          setTimeout(function() { printLine(l); }, idx * 150);
        });
      }
      return;
    }

    function runPackageAction(pkg) {
      if (pkg.type === 'malware') {
        printLine('<span style="color:#ef4444">\u2620 EXECUTING MALWARE PAYLOAD: ' + pkg.name + '</span>');
        printLine('<span style="color:#eab308">\u2620 Threat Level: ' + (pkg.threat_level || 'UNKNOWN') + '</span>');
        if (pkg.payload) {
          var lines = pkg.payload.split('\n');
          lines.forEach(function(line, idx) {
            setTimeout(function() { printLine('<span style="color:#ef4444">' + line + '</span>'); }, idx * 200);
          });
        }
        if (pkg.antidote) {
          setTimeout(function() {
            printLine('');
            printLine('<span style="color:#06b6d4">\U0001f48a Antidote available: ' + pkg.antidote + '</span>');
            printLine('<span style="color:#94a3b8">Run "pkg-remove ' + pkg.name + '" to neutralize.</span>');
          }, (pkg.payload ? pkg.payload.split('\n').length : 1) * 200 + 500);
        }
        return;
      }
      if (pkg.type === 'browser') {
        openBrowser('home', pkg);
        return;
      }
      if (pkg.type === 'game') {
        handleGame(pkg.name);
        return;
      }
      if (pkg.type === 'engine') {
        openBrowser('home', null, pkg);
        return;
      }
      if (pkg.content) {
        printLine('<span style="color:#06b6d4">\U0001f4e6 ' + pkg.name + ' v' + (pkg.version || '1.0.0') + '</span>');
        pkg.content.split('\n').forEach(function(l) { printLine(l); });
      }
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
      if (data.createPackage) {
        var cp = data.createPackage;
        printLine('<span style="color:#7c3aed">[AI] Generating ' + cp.type + ' package "' + cp.name + '"...</span>');
        fetch('/api/sandbox/create-package', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: cp.name, type: cp.type, osName: state.env.osName || 'BrainOS' })
        }).then(function(r2) { return r2.json(); }).then(function(d2) {
          if (d2.success && d2.package) {
            addPackage(d2.package);
            printLine('<span style="color:#22c55e">\u2713 Package "' + cp.name + '" created! Run "pkg-run ' + cp.name + '" or "pkg-upload ' + cp.name + '".</span>');
            printLine('<span style="color:#94a3b8">' + (d2.package.description || '').slice(0, 120) + '</span>');
          } else {
            printLine('<span style="color:#ef4444">Failed: ' + (d2.error || 'Unknown error') + '</span>');
          }
        }).catch(function() { printLine('<span style="color:#ef4444">Package creation failed.</span>'); });
        return;
      }
      if (data.createOS) {
        printLine('<span style="color:#7c3aed">[AI] Generating custom OS "' + data.createOS + '"...</span>');
        fetch('/api/sandbox/create-os', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: data.createOS })
        }).then(function(r2) { return r2.json(); }).then(function(d2) {
          if (d2.success && d2.os) {
            addCustomOS(d2.os);
            printLine('<span style="color:#22c55e">\u2713 Custom OS "' + data.createOS + '" created!</span>');
            printLine('<span style="color:#94a3b8">' + (d2.os.description || '').slice(0, 150) + '</span>');
            if (d2.os.exclusive_commands && d2.os.exclusive_commands.length) {
              printLine('<span style="color:#06b6d4">Exclusive commands:</span>');
              d2.os.exclusive_commands.forEach(function(c) { printLine('  \u26a1 ' + c.cmd + ' — ' + c.desc); });
            }
            printLine('<span style="color:#7c3aed">Run "boot ' + data.createOS + '" to boot it.</span>');
          } else {
            printLine('<span style="color:#ef4444">Failed: ' + (d2.error || 'Unknown error') + '</span>');
          }
        }).catch(function() { printLine('<span style="color:#ef4444">OS creation failed.</span>'); });
        return;
      }
      if (data.uploadPackage) {
        var pkgs = getPackages();
        var found = pkgs.find(function(p) { return p.name === data.uploadPackage; });
        if (found) {
          addUploadedPkg(found);
          printLine('<span style="color:#22c55e">\u2713 "' + data.uploadPackage + '" uploaded to neural repository!</span>');
        } else {
          printLine('<span style="color:#ef4444">Package "' + data.uploadPackage + '" not found locally.</span>');
        }
        return;
      }
      if (data.listPackages) {
        var pkgs = getPackages();
        var uploaded = getUploadedPkgs();
        if (pkgs.length === 0 && uploaded.length === 0) {
          printLine('<span style="color:#94a3b8">No packages installed.</span>');
        } else {
          printLine('<span style="color:#06b6d4">Installed Packages:</span>');
          pkgs.forEach(function(p) {
            var typeIcon = { game: '\U0001f3ae', malware: '\u2620', browser: '\U0001f310', engine: '\U0001f50d', app: '\U0001f4e6', tool: '\U0001f527' };
            printLine('  ' + (typeIcon[p.type] || '\U0001f4e6') + ' ' + p.name + ' v' + (p.version || '1.0.0') + ' <span style="color:#94a3b8">(' + p.type + ')</span>');
          });
          if (uploaded.length) {
            printLine('<span style="color:#7c3aed">Uploaded:</span>');
            uploaded.forEach(function(p) { printLine('  \u2601 ' + p.name + ' <span style="color:#94a3b8">(' + p.type + ')</span>'); });
          }
        }
        return;
      }
      if (data.runPackage) {
        var pkgs = getPackages();
        var pkg = pkgs.find(function(p) { return p.name === data.runPackage; });
        if (pkg) runPackageAction(pkg);
        else printLine('<span style="color:#ef4444">Package "' + data.runPackage + '" not installed.</span>');
        return;
      }
      if (data.removePackage) {
        removePackage(data.removePackage);
        if (state.env.installedPkgs) state.env.installedPkgs = state.env.installedPkgs.filter(function(p) { return p !== data.removePackage; });
        saveCache();
        printLine('<span style="color:#22c55e">\u2713 Package "' + data.removePackage + '" removed.</span>');
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

  var currentEngine = null;
  var currentBrowserPkg = null;

  function openBrowser(url, browserPkg, enginePkg) {
    var overlay = document.getElementById('browser-overlay');
    var urlInput = document.getElementById('browser-url');
    var content = document.getElementById('browser-content');
    var goBtn = document.getElementById('browser-go');
    var closeBtn = document.getElementById('browser-close');

    if (!overlay) return;
    overlay.classList.remove('hidden');
    currentBrowserPkg = browserPkg || null;
    currentEngine = enginePkg || null;

    var themeColor = '#7c3aed';
    if (browserPkg && browserPkg.theme) themeColor = browserPkg.theme.primary || themeColor;

    var bar = overlay.querySelector('.browser-bar');
    if (bar) bar.style.background = themeColor + '22';

    if (urlInput) urlInput.value = (browserPkg && browserPkg.homepage) ? browserPkg.homepage : (url.startsWith('brain://') ? url : 'brain://' + url);

    if (enginePkg) {
      renderSearchHome(enginePkg);
    } else if (url) {
      loadPage(url);
    } else {
      renderSearchHome(null);
    }

    if (goBtn) goBtn.onclick = function() { handleBrowserNav(urlInput.value); };
    if (urlInput) urlInput.onkeydown = function(e) { if (e.key === 'Enter') handleBrowserNav(urlInput.value); };
    if (closeBtn) closeBtn.onclick = function() { overlay.classList.add('hidden'); };
  }

  function handleBrowserNav(val) {
    if (!val) return;
    if (val.startsWith('brain://') || val.includes('://')) {
      loadPage(val);
    } else {
      doSearch(val);
    }
  }

  function renderSearchHome(enginePkg) {
    var content = document.getElementById('browser-content');
    if (!content) return;
    var engineName = enginePkg ? enginePkg.name : 'BrainSearch';
    var style = enginePkg ? (enginePkg.style || 'neural') : 'neural';
    var primaryColor = '#7c3aed';
    var accentColor = '#06b6d4';
    if (currentBrowserPkg && currentBrowserPkg.theme) {
      primaryColor = currentBrowserPkg.theme.primary || primaryColor;
      accentColor = currentBrowserPkg.theme.accent || accentColor;
    }

    var categoriesHtml = '';
    if (enginePkg && enginePkg.categories) {
      categoriesHtml = '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:1rem;">';
      enginePkg.categories.forEach(function(cat) {
        categoriesHtml += '<span style="background:' + accentColor + '22;color:' + accentColor + ';padding:0.2rem 0.6rem;border-radius:4px;font-size:0.75rem;cursor:pointer;" onclick="document.getElementById(\'browser-url\').value=\'' + cat + '\';document.getElementById(\'browser-go\').click();">' + cat + '</span>';
      });
      categoriesHtml += '</div>';
    }

    var bookmarksHtml = '';
    if (currentBrowserPkg && currentBrowserPkg.bookmarks) {
      bookmarksHtml = '<div style="margin-top:1rem;"><span style="color:var(--text-dim);font-size:0.75rem;">Bookmarks:</span><div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.3rem;">';
      currentBrowserPkg.bookmarks.forEach(function(bm) {
        bookmarksHtml += '<span style="background:rgba(255,255,255,0.06);padding:0.2rem 0.5rem;border-radius:4px;font-size:0.75rem;cursor:pointer;" onclick="document.getElementById(\'browser-url\').value=\'' + bm.url + '\';document.getElementById(\'browser-go\').click();">' + bm.title + '</span>';
      });
      bookmarksHtml += '</div></div>';
    }

    content.innerHTML = '<div style="text-align:center;padding:2rem 1rem;">' +
      '<div style="font-size:2.5rem;margin-bottom:0.5rem;">' + (style === 'hacker' ? '\u2620' : style === 'retro' ? '\U0001f4bb' : style === 'corporate' ? '\U0001f3e2' : '\U0001f310') + '</div>' +
      '<h2 style="color:' + primaryColor + ';font-size:1.5rem;margin-bottom:0.3rem;">' + engineName + '</h2>' +
      '<p style="color:var(--text-dim);font-size:0.8rem;">' + (enginePkg ? enginePkg.description || 'Custom search engine' : 'Neural web search') + '</p>' +
      '<div style="margin-top:1rem;max-width:400px;margin-left:auto;margin-right:auto;">' +
      '<input id="browser-search-input" type="text" placeholder="Search ' + engineName + '..." style="width:100%;background:rgba(255,255,255,0.06);border:1px solid ' + primaryColor + '44;color:var(--text);padding:0.6rem 1rem;border-radius:20px;font-size:0.9rem;outline:none;" onkeydown="if(event.key===\'Enter\'){document.getElementById(\'browser-url\').value=this.value;document.getElementById(\'browser-go\').click();}">' +
      '</div>' +
      categoriesHtml + bookmarksHtml +
      '</div>';
  }

  function doSearch(query) {
    var content = document.getElementById('browser-content');
    if (!content) return;
    var engineName = currentEngine ? currentEngine.name : 'BrainSearch';
    content.innerHTML = '<div style="padding:1rem;"><span style="color:#7c3aed">Searching ' + engineName + ' for "' + query + '"...</span></div>';
    fetch('/api/sandbox/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query, engine: engineName, osName: state.env.osName || 'BrainOS' })
    }).then(function(r) { return r.json(); }).then(function(data) {
      var results = data.results || [];
      if (results.length === 0) {
        content.innerHTML = '<div style="padding:1rem;"><h3 style="color:#7c3aed">' + engineName + '</h3><p style="color:var(--text-dim);">No results for "' + query + '"</p></div>';
        return;
      }
      var html = '<div style="padding:1rem;"><h3 style="color:#7c3aed;margin-bottom:0.5rem;">' + engineName + ' — ' + results.length + ' results for "' + query + '"</h3>';
      results.forEach(function(r) {
        html += '<div style="margin-bottom:0.8rem;padding:0.5rem 0.7rem;background:rgba(255,255,255,0.03);border-radius:6px;border-left:3px solid #7c3aed;">' +
          '<div style="color:#06b6d4;font-size:0.75rem;">' + (r.url || '#') + '</div>' +
          '<a style="color:#e2e8f0;font-size:0.9rem;font-weight:600;cursor:pointer;text-decoration:none;" onclick="document.getElementById(\'browser-url\').value=\'' + (r.url || '') + '\';document.getElementById(\'browser-go\').click();">' + (r.title || 'Untitled') + '</a>' +
          '<div style="color:#94a3b8;font-size:0.8rem;margin-top:0.2rem;">' + (r.snippet || '') + '</div>' +
          (r.category ? '<span style="background:rgba(124,58,237,0.15);color:#a855f7;padding:0.1rem 0.4rem;border-radius:3px;font-size:0.7rem;margin-top:0.2rem;display:inline-block;">' + r.category + '</span>' : '') +
          '</div>';
      });
      html += '</div>';
      content.innerHTML = html;
    }).catch(function() { content.innerHTML = '<div style="padding:1rem;color:#ef4444;">Search failed.</div>'; });
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
