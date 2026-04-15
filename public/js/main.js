document.addEventListener('DOMContentLoaded', () => {
  initChat();
  initCheckout();
  initOSInstaller();
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
            if (json.type === 'text') {
              appendToMsg(assistantEl, json.data);
            } else if (json.type === 'tool') {
              const actionEl = document.createElement('div');
              actionEl.className = 'chat-msg action-msg';
              actionEl.innerHTML = `<span class="action-icon">⚡</span> ${json.data.action === 'add_part' ? 'Manufactured custom Neural-Module' : json.data.action === 'remove_part' ? 'Decommissioned part' : json.data.action === 'lookup_compatibility' ? 'Checked compatibility' : json.data.action === 'search_parts' ? 'Searched catalog' : json.data.action}`;
              messages.appendChild(actionEl);
              messages.scrollTop = messages.scrollHeight;
            } else if (json.type === 'done') {
              assistantEl.classList.remove('streaming');
            } else if (json.type === 'error') {
              appendToMsg(assistantEl, '\n\n⚠️ ' + json.data);
            }
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

      const steps = [
        [10, 'Initiating neural handshake...'],
        [25, 'Scanning cortical topology...'],
        [40, 'Mapping synaptic pathways...'],
        [55, 'Calibrating bio-coolant levels...'],
        [70, 'Flashing neural firmware...'],
        [85, 'Verifying cortex integrity...'],
        [95, 'Establishing persistent link...'],
        [100, '✅ Neural Link Established!']
      ];

      for (const [pct, msg] of steps) {
        await new Promise(r => setTimeout(r, 400 + Math.random() * 300));
        fill.style.width = pct + '%';
        status.textContent = msg;
        if (pct === 100) status.classList.add('success');
      }

      try {
        await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: [btn.dataset.id] })
        });
      } catch(e) {}
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

      const lines = [
        `> BRAINOS NEURAL FLASH UTILITY v3.7.1`,
        `> ══════════════════════════════════════`,
        `> Target: ${name} v${version}`,
        `> Kernel: ${kernel}`,
        `> Image Size: ${(size / 1024).toFixed(1)} GB`,
        ``,
        `[SCAN]  Checking neural bus integrity... OK`,
        `[SCAN]  Verifying cortical compatibility... OK`,
        `[SCAN]  Bio-coolant thermal margin... NOMINAL`,
        ``,
        `[ERASE] Wiping existing neural pathways.......... done`,
        `[WRITE] Flashing ${name} kernel image..........`,
      ];

      for (const line of lines) {
        output.textContent += line + '\n';
        output.scrollTop = output.scrollHeight;
        await sleep(200 + Math.random() * 200);
      }

      const progressSteps = 20;
      for (let i = 0; i <= progressSteps; i++) {
        const pct = Math.round((i / progressSteps) * 100);
        const bar = '█'.repeat(Math.floor(i / 2)) + '░'.repeat(10 - Math.floor(i / 2));
        output.textContent += `[WRITE] ${bar} ${pct}%\r`;
        output.scrollTop = output.scrollHeight;
        await sleep(150 + Math.random() * 100);
      }

      const postLines = [
        ``,
        `[WRITE] Kernel image flashed successfully.`,
        `[SYNC]  Synchronizing hippocampal memory banks...`,
        `[SYNC]  Loading synaptic driver modules..........`,
        `[CONF]  Configuring ${kernel} boot sequence...`,
        `[CONF]  Setting neural clock to chrono-frequency 42.0 GHz...`,
        `[CONF]  Registering cortical services...`,
        ``,
        `[BOOT]  ╔════════════════════════════════════════╗`,
        `[BOOT]  ║  ${name.padEnd(36)}║`,
        `[BOOT]  ║  Neuro-Link ACTIVE                    ║`,
        `[BOOT]  ║  Status: OPERATIONAL                   ║`,
        `[BOOT]  ╚════════════════════════════════════════╝`,
        ``,
        `✅ ${name} v${version} successfully flashed to brain!`,
        `   Reboot your neural cortex to complete installation.`
      ];

      for (const line of postLines) {
        output.textContent += line + '\n';
        output.scrollTop = output.scrollHeight;
        await sleep(150 + Math.random() * 150);
      }
    });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
