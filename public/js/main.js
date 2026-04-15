document.addEventListener('DOMContentLoaded', () => {
  initChat();
  initCheckout();
  initOSInstaller();
  initSandbox();
});

function renderMarkdown(text) {
  let html = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h4 class="md-h">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="md-h">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="md-h">$1</h2>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="md-code">$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul class="md-list">$1</ul>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>');
  return '<p>' + html + '</p>';
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
  bubble.addEventListener('click', () => { panel.classList.remove('hidden'); bubble.style.display = 'none'; });
  close.addEventListener('click', () => { panel.classList.add('hidden'); bubble.style.display = 'flex'; });
  function addMsg(html, cls) {
    const d = document.createElement('div');
    d.className = 'chat-msg ' + cls;
    d.innerHTML = html;
    messages.appendChild(d);
    messages.scrollTop = messages.scrollHeight;
    return d;
  }
  function appendToMsg(el, text) {
    el.innerHTML = renderMarkdown(el._raw + text);
    el._raw += text;
    messages.scrollTop = messages.scrollHeight;
  }
  async function sendMsg() {
    const text = input.value.trim();
    if (!text) return;
    addMsg(text, 'user');
    history.push({ role: 'user', content: text });
    input.value = '';
    input.disabled = true;
    send.disabled = true;
    const assistantEl = document.createElement('div');
    assistantEl.className = 'chat-msg assistant streaming';
    assistantEl._raw = '';
    assistantEl.innerHTML = '<span class="typing-cursor">▌</span>';
    messages.appendChild(assistantEl);
    messages.scrollTop = messages.scrollHeight;
    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history })
      });
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const json = JSON.parse(line.slice(6));
            if (json.type === 'text') appendToMsg(assistantEl, json.data);
            else if (json.type === 'tool') {
              const actionEl = document.createElement('div');
              actionEl.className = 'chat-msg action-msg';
              actionEl.innerHTML = `<span class="action-icon">⚡</span> ${json.data.action === 'add_part' ? 'Manufactured custom Neural-Module' : json.data.action === 'remove_part' ? 'Decommissioned part' : json.data.action === 'lookup_compatibility' ? 'Checked compatibility' : json.data.action === 'search_parts' ? 'Searched catalog' : json.data.action}`;
              messages.appendChild(actionEl);
              messages.scrollTop = messages.scrollHeight;
            } else if (json.type === 'done') assistantEl.classList.remove('streaming');
            else if (json.type === 'error') appendToMsg(assistantEl, '\n\n⚠️ ' + json.data);
          } catch(_) {}
        }
      }
      assistantEl.classList.remove('streaming');
      history.push({ role: 'assistant', content: assistantEl._raw });
    } catch(e) {
      assistantEl.classList.remove('streaming');
      appendToMsg(assistantEl, '\n\n⚠️ Neural pathway disrupted.');
    }
    input.disabled = false;
    send.disabled = false;
    input.focus();
  }
  send.addEventListener('click', sendMsg);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMsg(); });
}

function initCheckout() {
  document.querySelectorAll('.sync-brain-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const progressDiv = document.getElementById('sync-progress');
      const fill = document.getElementById('progress-fill');
      const status = document.getElementById('sync-status');
      if (!progressDiv) return;
      btn.disabled = true;
      progressDiv.classList.remove('hidden');
      status.classList.remove('success');
      fill.style.width = '0%';
      const steps = [[10,'Initiating neural handshake...'],[25,'Scanning cortical topology...'],[40,'Mapping synaptic pathways...'],[55,'Calibrating bio-coolant levels...'],[70,'Flashing neural firmware...'],[85,'Verifying cortex integrity...'],[95,'Establishing persistent link...'],[100,'✅ Neural Link Established!']];
      for (const [pct, msg] of steps) {
        await new Promise(r => setTimeout(r, 400 + Math.random() * 300));
        fill.style.width = pct + '%';
        status.textContent = msg;
        if (pct === 100) status.classList.add('success');
      }
    });
  });
}

function initOSInstaller() {
  const overlay = document.getElementById('terminal-overlay');
  const output = document.getElementById('terminal-output');
  const closeBtn = document.getElementById('terminal-close');
  if (!overlay) return;
  closeBtn.addEventListener('click', () => { overlay.classList.add('hidden'); });
  document.querySelectorAll('.os-flash-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const { name, version, kernel, size } = btn.dataset;
      overlay.classList.remove('hidden');
      output.textContent = '';
      const lines = [`> BRAINOS NEURAL FLASH UTILITY v3.7.1`,`> ══════════════════════════════════════`,`> Target: ${name} v${version}`,`> Kernel: ${kernel}`,`> Image Size: ${(size / 1024).toFixed(1)} GB`,``,`[SCAN]  Checking neural bus integrity... OK`,`[SCAN]  Verifying cortical compatibility... OK`,`[SCAN]  Bio-coolant thermal margin... NOMINAL`,``,`[ERASE] Wiping existing neural pathways.......... done`,`[WRITE] Flashing ${name} kernel image..........`];
      for (const line of lines) { output.textContent += line + '\n'; output.scrollTop = output.scrollHeight; await sleep(200 + Math.random() * 200); }
      for (let i = 0; i <= 20; i++) { const pct = Math.round((i/20)*100); output.textContent += `[WRITE] ${'█'.repeat(Math.floor(i/2))}${'░'.repeat(10-Math.floor(i/2))} ${pct}%\r`; output.scrollTop = output.scrollHeight; await sleep(150+Math.random()*100); }
      const post = [``,`[WRITE] Kernel image flashed successfully.`,`[SYNC]  Synchronizing hippocampal memory banks...`,`[SYNC]  Loading synaptic driver modules..........`,`[CONF]  Configuring ${kernel} boot sequence...`,`[CONF]  Setting neural clock to chrono-frequency 42.0 GHz...`,`[CONF]  Registering cortical services...`,``,`[BOOT]  ╔════════════════════════════════════════╗`,`[BOOT]  ║  ${name.padEnd(36)}║`,`[BOOT]  ║  Neuro-Link ACTIVE                    ║`,`[BOOT]  ║  Status: OPERATIONAL                   ║`,`[BOOT]  ╚════════════════════════════════════════╝`,``,`✅ ${name} v${version} successfully flashed to brain!`,`   Reboot your neural cortex to complete installation.`];
      for (const line of post) { output.textContent += line + '\n'; output.scrollTop = output.scrollHeight; await sleep(150+Math.random()*150); }
    });
  });
}

function initSandbox() {
  const setup = document.getElementById('sandbox-setup');
  const terminal = document.getElementById('sandbox-terminal');
  const osSelect = document.getElementById('sandbox-os-select');
  const installBtn = document.getElementById('sandbox-install-btn');
  const installProgress = document.getElementById('install-progress');
  const installFill = document.getElementById('install-fill');
  const installStatus = document.getElementById('install-status');
  const osLabel = document.getElementById('sandbox-os-label');
  const changeOsBtn = document.getElementById('sandbox-change-os');
  const fullscreenBtn = document.getElementById('sandbox-fullscreen');
  const output = document.getElementById('sandbox-output');
  const input = document.getElementById('sandbox-input');
  const cwdLabel = document.getElementById('sandbox-cwd');
  const promptLabel = document.getElementById('sandbox-prompt');

  if (!setup) return;

  let state = null;
  const CACHE_KEY = 'cortex-sandbox-state';

  const osSearch = document.getElementById('sandbox-os-search');
  const osOptions = osSelect.querySelectorAll('option');
  if (osSearch) {
    osSearch.addEventListener('input', () => {
      const q = osSearch.value.toLowerCase();
      osOptions.forEach(opt => {
        opt.style.display = opt.value.toLowerCase().includes(q) || opt.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }

  function loadCache() {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        state = JSON.parse(cached);
        return true;
      }
    } catch(e) {}
    return false;
  }

  function saveCache() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(state)); } catch(e) {}
  }

  function showTerminal() {
    setup.classList.add('hidden');
    terminal.classList.remove('hidden');
    osLabel.textContent = '🧠 ' + (state.env.osName || 'Ubuntu Neural');
    updatePrompt();
    input.focus();
  }

  function updatePrompt() {
    const short = state.cwd.replace('/home/neural-user', '~') || '/';
    cwdLabel.textContent = short;
    promptLabel.textContent = '🧠 ' + short + ' $';
  }

  function writeOutput(text, cls) {
    const div = document.createElement('div');
    div.className = cls || 'output-line-out';
    div.textContent = text;
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
  }

  function writeHTML(html) {
    const div = document.createElement('div');
    div.className = 'output-line-out';
    div.innerHTML = html;
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
  }

  if (loadCache()) {
    showTerminal();
    writeOutput('Restored neural sandbox session.', 'output-line-info');
    writeOutput('Type "help" for commands.\n', 'output-line-info');
  }

  installBtn.addEventListener('click', async () => {
    const osName = osSelect.value;
    installBtn.disabled = true;
    installProgress.classList.remove('hidden');
    const steps = [[10,'Formatting neural pathways...'],[25,'Writing boot sector...'],[50,'Installing kernel...'],[75,'Configuring dream subsystem...'],[90,'Setting up synaptic drivers...'],[100,'✅ Installation complete!']];
    for (const [pct, msg] of steps) {
      await sleep(300 + Math.random() * 400);
      installFill.style.width = pct + '%';
      installStatus.textContent = msg;
    }
    await sleep(500);
    try {
      const r = await fetch('/api/sandbox/install-os', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ osName, state: { env: {} } })
      });
      const d = await r.json();
      if (d.success) {
        state = d.state;
        saveCache();
        showTerminal();
        writeOutput(`\n🧠 ${d.osName} installed successfully!`, 'output-line-info');
        writeOutput(`Package manager: ${d.shell}`, 'output-line-info');
        writeOutput('Type "help" for commands.\n', 'output-line-info');
      }
    } catch(e) {
      writeOutput('Installation failed.', 'output-line-err');
    }
    installBtn.disabled = false;
    installProgress.classList.add('hidden');
    installFill.style.width = '0%';
  });

  changeOsBtn.addEventListener('click', () => {
    terminal.classList.add('hidden');
    setup.classList.remove('hidden');
  });

  fullscreenBtn.addEventListener('click', () => {
    terminal.classList.toggle('fullscreen');
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && terminal.classList.contains('fullscreen')) terminal.classList.remove('fullscreen');
  });

  input.addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter') return;
    const cmd = input.value.trim();
    if (!cmd) return;
    input.value = '';
    writeOutput(promptLabel.textContent + ' ' + cmd, 'output-line-cmd');

    try {
      const r = await fetch('/api/sandbox/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd, state })
      });
      const d = await r.json();

      if (d.clear) { output.innerHTML = ''; }
      if (d.output) {
        d.output.split('\n').forEach(line => {
          const stripped = line.replace(/\x1b\[[0-9;]*m/g, '');
          const hasCyan = /\x1b\[1;36m|\x1b\[36m/.test(line);
          const hasRed = /\x1b\[31m|\x1b\[1;31m/.test(line);
          if (hasRed) writeOutput(stripped, 'output-line-err');
          else if (hasCyan) writeOutput(stripped, 'output-line-info');
          else writeOutput(stripped, 'output-line-out');
        });
      }
      if (d.game) { startGame(d.game); }
      else if (d.installOS) {
        writeOutput('\x1b[1;36m[install-os] Installing ' + d.installOS + '...\x1b[0m', 'output-line-info');
        try {
          const ir = await fetch('/api/sandbox/install-os', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ osName: d.installOS, state })
          });
          const id = await ir.json();
          if (id.success) {
            state = id.state;
            saveCache();
            updatePrompt();
            osLabel.textContent = '🧠 ' + id.osName;
            writeOutput('\x1b[1;32m[install-os] ✓ ' + id.osName + ' installed! Package manager: ' + id.shell + '\x1b[0m', 'output-line-info');
            writeOutput('Type "help" for commands.\n', 'output-line-info');
          } else {
            writeOutput('\x1b[1;31m[install-os] OS not found. Type "install-os" to see available options.\x1b[0m', 'output-line-err');
          }
        } catch(e) {
          writeOutput('\x1b[1;31m[install-os] Installation failed.\x1b[0m', 'output-line-err');
        }
      }
      else if (d.reboot) {
        writeOutput('\n🔄 Rebooting neural cortex...', 'output-line-info');
        await sleep(2000);
        output.innerHTML = '';
        writeOutput('🧠 Neural cortex rebooted.', 'output-line-info');
        writeOutput('Type "help" for commands.\n', 'output-line-info');
        if (state.env) state.env.bootTime = Date.now();
      }
      if (d.state) { state = d.state; saveCache(); updatePrompt(); }
    } catch(e) {
      writeOutput('Error: neural pathway disrupted.', 'output-line-err');
    }
  });

  const gameOverlay = document.getElementById('game-overlay');
  const gameCanvas = document.getElementById('game-canvas');
  const gameTitle = document.getElementById('game-title');
  const gameQuit = document.getElementById('game-quit');
  const gameTextOutput = document.getElementById('game-text-output');
  const gameInputRow = document.getElementById('game-input-row');
  const gameInput = document.getElementById('game-input');
  let gameLoop = null;
  let gameState = null;

  gameQuit.addEventListener('click', () => {
    gameOverlay.classList.add('hidden');
    if (gameLoop) { clearInterval(gameLoop); gameLoop = null; }
    input.focus();
  });

  function startGame(gameName) {
    gameOverlay.classList.remove('hidden');
    const ctx = gameCanvas.getContext('2d');
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, 480, 360);
    gameTextOutput.innerHTML = '';

    const games = {
      snake: initSnake,
      matrix: initMatrix,
      hack: initHack,
      dreams: initDreams,
      menu: showGameMenu,
      generate: generateGame
    };

    const fn = games[gameName] || games.menu;
    fn(ctx, gameCanvas, gameTextOutput);
  }

  function showGameMenu(ctx, canvas, tout) {
    gameTitle.textContent = '🎮 Games';
    tout.innerHTML = '';
    writeGameText('\x1b[1;35m🎮 BrainOS Game Center\x1b[0m\n');
    writeGameText('Available games:\n');
    writeGameText('  \x1b[1;36msnake\x1b[0m    — Classic snake, neural style\n');
    writeGameText('  \x1b[1;36mmatrix\x1b[0m   — Matrix rain in your brain\n');
    writeGameText('  \x1b[1;36mhack\x1b[0m     — Neural hacking simulator\n');
    writeGameText('  \x1b[1;36mdreams\x1b[0m   — Live dream simulator\n');
    writeGameText('  \x1b[1;36mgenerate\x1b[0m — AI generates a new game\n');
    writeGameText('\nType: play <game>');
  }

  function writeGameText(text) {
    const stripped = text.replace(/\x1b\[[0-9;]*m/g, '');
    const div = document.createElement('div');
    div.textContent = stripped;
    div.style.color = text.includes('1;36') ? '#06b6d4' : text.includes('1;35') ? '#a855f7' : text.includes('1;32') ? '#22c55e' : '#94a3b8';
    gameTextOutput.appendChild(div);
    gameTextOutput.scrollTop = gameTextOutput.scrollHeight;
  }

  function initSnake(ctx, canvas) {
    gameTitle.textContent = '🐍 Snake — Neural Edition';
    const W = 480, H = 360, SZ = 12;
    const cols = W / SZ, rows = H / SZ;
    let snake = [{ x: 20, y: 15 }];
    let dir = { x: 1, y: 0 };
    let food = spawnFood();
    let score = 0;
    let alive = true;

    function spawnFood() {
      return { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
    }

    function draw() {
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#22c55e';
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
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows || snake.some(s => s.x === head.x && s.y === head.y)) {
        alive = false;
        draw();
        return;
      }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score += 10;
        food = spawnFood();
      } else {
        snake.pop();
      }
      draw();
    }

    const handler = (e) => {
      if (gameOverlay.classList.contains('hidden')) { document.removeEventListener('keydown', handler); return; }
      const map = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 } };
      const d = map[e.key];
      if (d && !(d.x === -dir.x && d.y === -dir.y)) dir = d;
    };
    document.addEventListener('keydown', handler);
    gameLoop = setInterval(tick, 100);
    draw();
  }

  function initMatrix(ctx, canvas) {
    gameTitle.textContent = '🟢 Matrix Rain';
    const W = 480, H = 360;
    const cols = Math.floor(W / 14);
    const drops = Array(cols).fill(0);
    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';

    gameLoop = setInterval(() => {
      ctx.fillStyle = 'rgba(5,5,16,0.1)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#22c55e';
      ctx.font = '14px monospace';
      for (let i = 0; i < cols; i++) {
        const c = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillStyle = Math.random() > 0.95 ? '#fff' : '#22c55e';
        ctx.fillText(c, i * 14, drops[i] * 14);
        if (drops[i] * 14 > H && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    }, 50);
  }

  function initHack(ctx, canvas) {
    gameTitle.textContent = '🔓 Neural Hack Simulator';
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, 480, 360);
    ctx.fillStyle = '#22c55e';
    ctx.font = '12px monospace';
    const lines = [
      'Scanning neural network...',
      'Found 7 vulnerable synapses',
      'Attempting handshake on port 31337...',
      'Bypassing neuro-firewall... ████████░░ 80%',
      'Bypassing neuro-firewall... ██████████ 100%',
      'Access granted to synaptic gateway',
      'Injecting dream-packet...',
      'Root access acquired: 🧠',
      '',
      'NEURAL HACK COMPLETE',
      'You now have root access to the dream subsystem.',
      'Type anything to continue...'
    ];
    let i = 0;
    gameLoop = setInterval(() => {
      if (i < lines.length) {
        writeGameText(lines[i] + '\n');
        i++;
      } else {
        clearInterval(gameLoop);
        gameLoop = null;
      }
    }, 600);
  }

  function initDreams(ctx, canvas) {
    gameTitle.textContent = '🌙 Live Dream Stream';
    const W = 480, H = 360;
    const dreams = [
      { scene: '🌃 Night City', colors: ['#1a0533','#2d1b69','#7c3aed'] },
      { scene: '🌊 Ocean of Thoughts', colors: ['#0a1628','#0e4d6e','#06b6d4'] },
      { scene: '🏔️ Memory Mountains', colors: ['#1a0a0a','#4a1a1a','#ef4444'] },
      { scene: '🌌 Cosmic Brain', colors: ['#0a0a1a','#1a1a4a','#a855f7'] },
      { scene: '🌺 Dream Garden', colors: ['#0a1a0a','#1a4a1a','#22c55e'] }
    ];
    let particles = [];
    let currentDream = 0;

    function spawnParticles() {
      const d = dreams[currentDream];
      particles = Array.from({ length: 60 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
        r: Math.random() * 4 + 1, color: d.colors[Math.floor(Math.random() * d.colors.length)],
        life: Math.random() * 200 + 50
      }));
    }

    spawnParticles();

    gameLoop = setInterval(() => {
      const d = dreams[currentDream];
      ctx.fillStyle = d.colors[0] + '20';
      ctx.fillRect(0, 0, W, H);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.life--;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });
      particles = particles.filter(p => p.life > 0);
      if (particles.length < 30) spawnParticles();
      ctx.fillStyle = '#a855f7';
      ctx.font = '16px monospace';
      ctx.fillText(d.scene, 10, 24);
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.fillText(`Dream FPS: ${Math.floor(120 + Math.random() * 120)} | Lucidity: ${(80 + Math.random() * 20).toFixed(1)}%`, 10, 340);
    }, 50);

    setInterval(() => {
      if (gameOverlay.classList.contains('hidden')) return;
      currentDream = (currentDream + 1) % dreams.length;
      spawnParticles();
    }, 5000);
  }

  async function generateGame() {
    gameTitle.textContent = '🎲 AI Game Generator';
    writeGameText('Generating a new game with AI...\n');
    try {
      const r = await fetch('/api/sandbox/generate-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameName: 'random', osName: state?.env?.osName || 'BrainOS' })
      });
      const d = await r.json();
      if (d.success && d.game) {
        writeGameText(`\n🎮 Generated: ${d.game.name}\n`);
        writeGameText(`${d.game.description}\n\n`);
        if (d.game.commands) {
          writeGameText('Commands:\n');
          d.game.commands.forEach(c => writeGameText(`  ${c.cmd} — ${c.desc}\n`));
        }
        writeGameText('\n(Game logic ready — full canvas rendering coming soon)');
      } else {
        writeGameText('Could not generate game. Try again.\n');
      }
    } catch(e) {
      writeGameText('Error generating game.\n');
    }
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
