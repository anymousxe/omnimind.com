document.addEventListener('DOMContentLoaded', () => {
  initChat(); initCheckout(); initOSInstaller(); initSandbox(); initSell();
});

function renderMarkdown(t) {
  return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/^### (.+)$/gm,'<h4 class="md-h">$1</h4>').replace(/^## (.+)$/gm,'<h3 class="md-h">$1</h3>').replace(/^# (.+)$/gm,'<h2 class="md-h">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>').replace(/`([^`]+)`/g,'<code class="md-code">$1</code>')
    .replace(/^- (.+)$/gm,'<li>$1</li>').replace(/\n/g,'<br>');
}

function initChat() {
  const bubble=document.getElementById('chat-bubble'),panel=document.getElementById('chat-panel'),close=document.getElementById('chat-close'),input=document.getElementById('chat-input'),send=document.getElementById('chat-send'),messages=document.getElementById('chat-messages');
  if(!bubble)return;
  let history=[];
  bubble.onclick=()=>{panel.classList.remove('hidden');bubble.style.display='none'};
  close.onclick=()=>{panel.classList.add('hidden');bubble.style.display='flex'};
  function addMsg(h,c){const d=document.createElement('div');d.className='chat-msg '+c;d.innerHTML=h;messages.appendChild(d);messages.scrollTop=messages.scrollHeight;return d}
  function appendTo(el,t){el._raw+=t;el.innerHTML=renderMarkdown(el._raw);messages.scrollTop=messages.scrollHeight}
  async function sendMsg(){const t=input.value.trim();if(!t)return;addMsg(t,'user');history.push({role:'user',content:t});input.value='';input.disabled=true;send.disabled=true;
    const el=addMsg('','assistant streaming');el._raw='';
    try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:t,history})});
      const rd=r.body.getReader(),dc=new TextDecoder();let buf='';
      while(true){const{done,value}=await rd.read();if(done)break;buf+=dc.decode(value,{stream:true});const ls=buf.split('\n');buf=ls.pop()||'';
        for(const l of ls){if(!l.startsWith('data: '))continue;try{const j=JSON.parse(l.slice(6));
          if(j.type==='text')appendTo(el,j.data);
          else if(j.type==='tool'){const a=document.createElement('div');a.className='chat-msg action-msg';a.innerHTML=`<span class="action-icon">⚡</span> ${j.data.action==='add_part'?'Manufactured Neural-Module':j.data.action==='remove_part'?'Decommissioned part':j.data.action}`;messages.appendChild(a);messages.scrollTop=messages.scrollHeight}
          else if(j.type==='done')el.classList.remove('streaming');
        }catch(e){}}
      el.classList.remove('streaming');history.push({role:'assistant',content:el._raw});
    }catch(e){el.classList.remove('streaming');appendTo(el,'\n\n⚠️ Disrupted.')}input.disabled=false;send.disabled=false;input.focus()}
  send.onclick=sendMsg;input.onkeydown=e=>{if(e.key==='Enter')sendMsg()};
}

function initCheckout(){
  function bindSyncBtn(btn){
    btn.onclick=async()=>{
      const card=btn.closest('.part-detail, .prebuilt-card, .glass-card, body');
      const p=card?card.querySelector('.sync-progress'):document.getElementById('sync-progress');
      const f=p?p.querySelector('.progress-fill'):document.getElementById('progress-fill');
      const s=p?p.querySelector('.sync-status'):document.getElementById('sync-status');
      if(!p||!f||!s)return;
      btn.disabled=true;p.classList.remove('hidden');s.classList.remove('success');f.style.width='0%';
      for(const[pct,msg]of[[10,'Initiating neural handshake...'],[25,'Scanning cortical topology...'],[40,'Mapping synaptic pathways...'],[55,'Calibrating bio-coolant...'],[70,'Flashing neural firmware...'],[85,'Verifying cortex integrity...'],[95,'Establishing link...'],[100,'✅ Neural Link Established!']]){await new Promise(r=>setTimeout(r,400+Math.random()*300));f.style.width=pct+'%';s.textContent=msg;if(pct===100)s.classList.add('success')}
      try{await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:[btn.dataset.id||btn.dataset.name]})})}catch(e){}
    };
  }
  document.querySelectorAll('.sync-brain-btn, .pb-buy-btn').forEach(bindSyncBtn);
}

function initOSInstaller(){const o=document.getElementById('terminal-overlay'),out=document.getElementById('terminal-output'),cl=document.getElementById('terminal-close');if(!o)return;cl.onclick=()=>o.classList.add('hidden');
  document.querySelectorAll('.os-flash-btn').forEach(b=>{b.onclick=async e=>{e.preventDefault();e.stopPropagation();const{name:n,version:v,kernel:k,size:s}=b.dataset;o.classList.remove('hidden');out.textContent='';
    for(const l of[`> BRAINOS FLASH v3.7.1`,`> Target: ${n} v${v}`,``,`[SCAN] Neural bus... OK`,`[SCAN] Compatibility... OK`,''`[WRITE] Flashing ${n}...`]){out.textContent+=l+'\n';out.scrollTop=out.scrollHeight;await new Promise(r=>setTimeout(r,200+Math.random()*200))}
    for(let i=0;i<=20;i++){out.textContent+=`[WRITE] ${'█'.repeat(Math.floor(i/2))}${'░'.repeat(10-Math.floor(i/2))} ${Math.round(i/20*100)}%\r`;out.scrollTop=out.scrollHeight;await new Promise(r=>setTimeout(r,120+Math.random()*80))}
    for(const l of[``,`[WRITE] Flashed.`,`[BOOT] ╔════════════════════════════╗`,`[BOOT] ║ ${n.padEnd(24)}║`,`[BOOT] ║ Neuro-Link ACTIVE        ║`,`[BOOT] ╚════════════════════════════╝`,'',`✅ ${n} v${v} flashed!`]){out.textContent+=l+'\n';out.scrollTop=out.scrollHeight;await new Promise(r=>setTimeout(r,150+Math.random()*100))}}})}

function initSandbox(){
  const setup=document.getElementById('sandbox-setup'),terminal=document.getElementById('sandbox-terminal'),osSelect=document.getElementById('sandbox-os-select'),installBtn=document.getElementById('sandbox-install-btn'),osLabel=document.getElementById('sandbox-os-label'),fullscreenBtn=document.getElementById('sandbox-fullscreen'),output=document.getElementById('sandbox-output'),input=document.getElementById('sandbox-input'),cwdLabel=document.getElementById('sandbox-cwd'),promptLabel=document.getElementById('sandbox-prompt');
  if(!setup)return;
  let state=null;const CK='cortex-sandbox-state';const SPECS_KEY='cortex-rig-specs';
  let rigSpecs=loadRigSpecs();

  function loadRigSpecs(){try{const s=localStorage.getItem(SPECS_KEY);return s?JSON.parse(s):{}}catch(e){return{}}}
  function saveRigSpecs(){try{localStorage.setItem(SPECS_KEY,JSON.stringify(rigSpecs))}catch(e){}}
  function loadCache(){try{const c=localStorage.getItem(CK);if(c){state=JSON.parse(c);return true}}catch(e){}return false}
  function saveCache(){try{localStorage.setItem(CK,JSON.stringify(state))}catch(e){}}

  function showTerminal(){setup.classList.add('hidden');terminal.classList.remove('hidden');osLabel.textContent='🧠 '+(state.env.osName||'Ubuntu Neural');updatePrompt();input.focus()}
  function updatePrompt(){const s=state.cwd.replace('/home/neural-user','~')||'/';cwdLabel.textContent=s;promptLabel.textContent='🧠 '+s+' $'}
  function writeOut(t,c){const d=document.createElement('div');d.className=c||'output-line-out';d.textContent=t;output.appendChild(d);output.scrollTop=output.scrollHeight}

  // Sidebar: load parts into selects
  async function loadSidebarParts(){
    const cats=['Frontal Lobe CPUs','Cortical GPUs','Memory Caches','Internet Chips','Bio-Cooling','Synaptic Accelerators','Neuro-Link PSU'];
    for(const cat of cats){
      const row=document.querySelector(`.spec-row[data-cat="${cat}"]`);
      if(!row)continue;
      const sel=row.querySelector('.spec-select');
      try{const r=await fetch(`/api/sandbox/parts/${encodeURIComponent(cat)}`);const parts=await r.json();
        sel.innerHTML='<option value="">— None —</option>';
        parts.forEach(p=>{const o=document.createElement('option');o.value=JSON.stringify({id:p.id,name:p.name,category:p.category,price:p.price,specs:p.specs});o.textContent=p.name+' — ₿'+p.price.toFixed(2);sel.appendChild(o)});
        if(rigSpecs[cat]){const match=parts.find(p=>p.id===rigSpecs[cat].id);if(match)sel.value=JSON.stringify(match)}
      }catch(e){}
      sel.onchange=()=>{const v=sel.value;if(v){rigSpecs[cat]=JSON.parse(v)}else{delete rigSpecs[cat]}saveRigSpecs();updatePerfBars();if(state&&state.env)state.env.parts=Object.values(rigSpecs)}
    }
    updatePerfBars();
  }

  function updatePerfBars(){
    const score=(cat,base)=>rigSpecs[cat]?base+Math.floor(Math.random()*(100-base)):5;
    document.getElementById('perf-cpu').style.width=score('Frontal Lobe CPUs',70)+'%';
    document.getElementById('perf-gpu').style.width=score('Cortical GPUs',65)+'%';
    document.getElementById('perf-dream').style.width=score('Internet Chips',75)+'%';
    document.getElementById('perf-cool').style.width=score('Bio-Cooling',60)+'%';
  }

  loadSidebarParts();

  // OS search
  const osSearch=document.getElementById('sandbox-os-search');
  if(osSearch)osSearch.oninput=()=>{const q=osSearch.value.toLowerCase();osSelect.querySelectorAll('option').forEach(o=>{o.style.display=o.value.toLowerCase().includes(q)||o.textContent.toLowerCase().includes(q)?'':'none'})};

  // Restore cached session
  if(loadCache()&&state.env&&state.env.osName){showTerminal();writeOut('Restored neural sandbox session.','output-line-info');writeOut('Type "help" for commands.\n','output-line-info')}

  // Install OS button
  installBtn.onclick=async()=>{const osName=osSelect.value;installBtn.disabled=true;writeOut('Installing '+osName+'...','output-line-info');
    try{const r=await fetch('/api/sandbox/install-os',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({osName,state:{env:{parts:Object.values(rigSpecs)}}})});
      const d=await r.json();if(d.success){state=d.state;state.env.parts=Object.values(rigSpecs);saveCache();showTerminal();writeOut(`🧠 ${d.osName} installed! Package manager: ${d.shell}`,'output-line-info');writeOut('Type "help" for commands.\n','output-line-info')}
    }catch(e){writeOut('Installation failed.','output-line-err')}installBtn.disabled=false};

  fullscreenBtn.onclick=()=>terminal.classList.toggle('fullscreen');
  document.onkeydown=e=>{if(e.key==='Escape'&&terminal.classList.contains('fullscreen'))terminal.classList.remove('fullscreen')};

  // Terminal input
  input.onkeydown=async e=>{if(e.key!=='Enter')return;const cmd=input.value.trim();if(!cmd)return;input.value='';writeOut(promptLabel.textContent+' '+cmd,'output-line-cmd');
    try{const r=await fetch('/api/sandbox/exec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({command:cmd,state})});const d=await r.json();
      if(d.output)d.output.split('\n').forEach(l=>{const s=l.replace(/\x1b\[[0-9;]*m/g,'');if(/\x1b\[31m|\x1b\[1;31m/.test(l))writeOut(s,'output-line-err');else if(/\x1b\[36m|\x1b\[1;36m/.test(l))writeOut(s,'output-line-info');else writeOut(s)});
      if(d.clear)output.innerHTML='';
      if(d.game)startGame(d.game);
      else if(d.installOS){writeOut('Installing '+d.installOS+'...','output-line-info');
        try{const ir=await fetch('/api/sandbox/install-os',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({osName:d.installOS,state})});const id=await ir.json();
          if(id.success){state=id.state;state.env.parts=Object.values(rigSpecs);saveCache();updatePrompt();osLabel.textContent='🧠 '+id.osName;writeOut('✓ '+id.osName+' installed! Pkg: '+id.shell,'output-line-info')}
          else writeOut('OS not found. Type "install-os" for list.','output-line-err')
        }catch(e){writeOut('Install failed.','output-line-err')}}
      else if(d.reboot){writeOut('🔄 Rebooting...','output-line-info');await new Promise(r=>setTimeout(r,2000));output.innerHTML='';writeOut('🧠 Rebooted.','output-line-info')}
      else if(d.browser)openBrowser(d.browser);
      else if(d.ai){writeOut('🧠 Thinking...','output-line-info');
        try{const ar=await fetch('/api/sandbox/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:d.ai,osName:state?.env?.osName||'BrainOS',specs:Object.values(rigSpecs)})});const ad=await ar.json();
          writeOut('','');ad.reply.split('\n').forEach(l=>writeOut(l.replace(/\*\*(.+?)\*\*/g,'$1').replace(/\*(.+?)\*/g,'$1').replace(/`([^`]+)`/g,'$1')),'output-line-info')}
        catch(e){writeOut('AI offline.','output-line-err')}}
      if(d.state){state=d.state;state.env.parts=Object.values(rigSpecs);saveCache();updatePrompt()}
    }catch(e){writeOut('Error: disrupted.','output-line-err')}};

  // Games
  const gameOverlay=document.getElementById('game-overlay'),gameCanvas=document.getElementById('game-canvas'),gameTitle=document.getElementById('game-title'),gameQuit=document.getElementById('game-quit'),gameText=document.getElementById('game-text-output'),gameInputRow=document.getElementById('game-input-row'),gameInput=document.getElementById('game-input'),gameIterate=document.getElementById('game-iterate');
  let gameLoop=null,currentGameName=null,gameCode=null;
  gameQuit.onclick=()=>{gameOverlay.classList.add('hidden');if(gameLoop){clearInterval(gameLoop);gameLoop=null}input.focus()};
  gameIterate.onclick=async()=>{if(gameInput.value.trim())await iterateGame(gameInput.value.trim());gameInput.value=''};
  gameInput.onkeydown=async e=>{if(e.key==='Enter'){const v=gameInput.value.trim();if(v)await iterateGame(v);gameInput.value=''}};

  function writeGameText(t){const d=document.createElement('div');d.textContent=t;gameText.appendChild(d);gameText.scrollTop=gameText.scrollHeight}

  function startGame(name){gameOverlay.classList.remove('hidden');const ctx=gameCanvas.getContext('2d');ctx.fillStyle='#050510';ctx.fillRect(0,0,480,360);gameText.innerHTML='';currentGameName=name;
    const games={snake:initSnake,matrix:initMatrix,hack:initHack,dreams:initDreams,generate:generateGame};
    (games[name]||showGameMenu)(ctx,gameCanvas,gameText)}

  function showGameMenu(){gameTitle.textContent='🎮 Games';
    writeGameText('🎮 BrainOS Game Center');writeGameText('');writeGameText('  snake    — Classic snake');writeGameText('  matrix   — Matrix rain');writeGameText('  hack     — Neural hack sim');writeGameText('  dreams   — Live dream stream');writeGameText('  generate — AI creates a new game');writeGameText('');writeGameText('Type: play <game>')}

  function initSnake(ctx){gameTitle.textContent='🐍 Snake';const W=480,H=360,SZ=12,cols=W/SZ,rows=H/SZ;let snake=[{x:20,y:15}],dir={x:1,y:0},food={x:Math.floor(Math.random()*cols),y:Math.floor(Math.random()*rows)},score=0,alive=true;
    function draw(){ctx.fillStyle='#050510';ctx.fillRect(0,0,W,H);snake.forEach((s,i)=>{ctx.fillStyle=i===0?'#7c3aed':'#22c55e';ctx.fillRect(s.x*SZ,s.y*SZ,SZ-1,SZ-1)});ctx.fillStyle='#06b6d4';ctx.fillRect(food.x*SZ,food.y*SZ,SZ-1,SZ-1);ctx.fillStyle='#a855f7';ctx.font='12px monospace';ctx.fillText('Score: '+score,8,16);
      if(!alive){ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#ef4444';ctx.font='24px monospace';ctx.fillText('GAME OVER',W/2-72,H/2);ctx.fillStyle='#94a3b8';ctx.font='14px monospace';ctx.fillText('Score: '+score,W/2-36,H/2+24)}}
    function tick(){if(!alive)return;const h={x:snake[0].x+dir.x,y:snake[0].y+dir.y};if(h.x<0||h.x>=cols||h.y<0||h.y>=rows||snake.some(s=>s.x===h.x&&s.y===h.y)){alive=false;draw();return}snake.unshift(h);if(h.x===food.x&&h.y===food.y){score+=10;food={x:Math.floor(Math.random()*cols),y:Math.floor(Math.random()*rows)}}else snake.pop();draw()}
    const h=e=>{if(gameOverlay.classList.contains('hidden')){document.removeEventListener('keydown',h);return}const m={ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1},ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0},w:{x:0,y:-1},s:{x:0,y:1},a:{x:-1,y:0},d:{x:1,y:0}};const d=m[e.key];if(d&&!(d.x===-dir.x&&d.y===-dir.y))dir=d};
    document.addEventListener('keydown',h);gameLoop=setInterval(tick,100);draw()}

  function initMatrix(ctx){gameTitle.textContent='🟢 Matrix';const W=480,H=360,cols=Math.floor(W/14),drops=Array(cols).fill(0),ch='01アイウエオカキクケコサシスセソ';
    gameLoop=setInterval(()=>{ctx.fillStyle='rgba(5,5,16,0.1)';ctx.fillRect(0,0,W,H);ctx.font='14px monospace';for(let i=0;i<cols;i++){ctx.fillStyle=Math.random()>0.95?'#fff':'#22c55e';ctx.fillText(ch[Math.floor(Math.random()*ch.length)],i*14,drops[i]*14);if(drops[i]*14>H&&Math.random()>0.975)drops[i]=0;drops[i]++}},50)}

  function initHack(ctx){gameTitle.textContent='🔓 Hack';ctx.fillStyle='#050510';ctx.fillRect(0,0,480,360);
    const lines=['Scanning neural network...','Found 7 vulnerable synapses','Attempting handshake on 31337...','Bypassing neuro-firewall... ████████░░ 80%','Bypassing neuro-firewall... ██████████ 100%','Access granted!','Injecting dream-packet...','Root acquired: 🧠','','NEURAL HACK COMPLETE'];let i=0;
    gameLoop=setInterval(()=>{if(i<lines.length)writeGameText(lines[i++]);else{clearInterval(gameLoop);gameLoop=null}},600)}

  function initDreams(ctx){gameTitle.textContent='🌙 Dreams';const W=480,H=360;const scenes=[{n:'🌃 Night City',c:['#1a0533','#2d1b69','#7c3aed']},{n:'🌊 Ocean of Thoughts',c:['#0a1628','#0e4d6e','#06b6d4']},{n:'🏔️ Memory Mountains',c:['#1a0a0a','#4a1a1a','#ef4444']},{n:'🌌 Cosmic Brain',c:['#0a0a1a','#1a1a4a','#a855f7']}];
    let ps=[],si=0;function spawn(){ps=Array.from({length:50},()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-0.5)*2,vy:(Math.random()-0.5)*2,r:Math.random()*4+1,c:scenes[si].c[Math.floor(Math.random()*3)],l:Math.random()*200+50}))}spawn();
    gameLoop=setInterval(()=>{const s=scenes[si];ctx.fillStyle=s.c[0]+'20';ctx.fillRect(0,0,W,H);ps.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.l--;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=p.c;ctx.fill()});ps=ps.filter(p=>p.l>0);if(ps.length<25)spawn();ctx.fillStyle='#a855f7';ctx.font='16px monospace';ctx.fillText(s.n,10,24)},50);
    setInterval(()=>{if(gameOverlay.classList.contains('hidden'))return;si=(si+1)%scenes.length;spawn()},5000)}

  async function generateGame(){gameTitle.textContent='🎲 AI Game Gen';writeGameText('Generating game with AI...');
    try{const r=await fetch('/api/sandbox/generate-game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({gameName:currentGameName==='generate'?'random':currentGameName,osName:state?.env?.osName||'BrainOS'})});const d=await r.json();
      if(d.success&&d.game){gameCode=d.game;writeGameText(`🎮 ${d.game.name}`);writeGameText(d.game.description);if(d.game.commands)d.game.commands.forEach(c=>writeGameText(`  ${c.cmd} — ${c.desc}`));writeGameText('\nType prompts to iterate on this game. Press 🔄 Iterate.');gameInputRow.classList.remove('hidden');gameInput.focus()}
      else writeGameText('Could not generate. Try again.')
    }catch(e){writeGameText('Error. Try again.')}}

  async function iterateGame(prompt){writeGameText(`\n[iterating: ${prompt}]`);try{const r=await fetch('/api/sandbox/generate-game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({gameName:gameCode?gameCode.name+' '+prompt:prompt,osName:state?.env?.osName||'BrainOS'})});const d=await r.json();
      if(d.success&&d.game){gameCode=d.game;writeGameText(`🎮 Updated: ${d.game.name}`);writeGameText(d.game.description);if(d.game.commands)d.game.commands.forEach(c=>writeGameText(`  ${c.cmd} — ${c.desc}`))}
      else writeGameText('Iteration failed.')
    }catch(e){writeGameText('Error iterating.')}}

  // Browser
  const browserOverlay=document.getElementById('browser-overlay'),browserUrl=document.getElementById('browser-url'),browserContent=document.getElementById('browser-content'),browserGo=document.getElementById('browser-go'),browserClose=document.getElementById('browser-close');
  browserClose.onclick=()=>browserOverlay.classList.add('hidden');
  browserGo.onclick=()=>loadPage(browserUrl.value);
  browserUrl.onkeydown=e=>{if(e.key==='Enter')loadPage(browserUrl.value)};

  function openBrowser(url){browserOverlay.classList.remove('hidden');browserUrl.value=url.startsWith('brain://')?url:'brain://'+url;loadPage(url)}

  async function loadPage(url){const clean=url.replace('brain://','').replace('https://','');browserContent.textContent='Loading...';
    try{const r=await fetch(`/api/sandbox/browser?url=${encodeURIComponent(clean)}`);const d=await r.json();browserContent.innerHTML=`<div style="color:var(--accent2);font-weight:bold;margin-bottom:0.5rem">${d.title}</div><pre style="white-space:pre-wrap;color:var(--green)">${d.content}</pre>`}
    catch(e){browserContent.textContent='Failed to load: '+url}}
}

function initSell(){
  const btn=document.getElementById('sell-submit'),result=document.getElementById('sell-result');
  if(!btn)return;
  btn.onclick=async()=>{
    const name=document.getElementById('sell-name').value.trim();
    const category=document.getElementById('sell-category').value;
    const price=parseFloat(document.getElementById('sell-price').value);
    const specsRaw=document.getElementById('sell-specs').value.trim();
    if(!name||!price){result.className='sell-result error';result.classList.remove('hidden');result.textContent='Name and price required.';return}
    const specs={};specsRaw.split('\n').forEach(l=>{const[k,v]=l.split(':').map(s=>s.trim());if(k&&v)specs[k]=v});
    btn.disabled=true;btn.textContent='Listing...';
    try{const r=await fetch('/api/sell',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,category,price,specs})});const d=await r.json();
      if(d.success){result.className='sell-result success';result.classList.remove('hidden');result.innerHTML=`✅ Listed! <strong>${d.part.name}</strong> (ID: ${d.part.id}) — ₿${d.part.price.toFixed(2)} is now on the marketplace. <a href="/gallery?category=${encodeURIComponent(d.part.category)}" style="color:var(--cyan)">View in Gallery →</a>`;document.getElementById('sell-name').value='';document.getElementById('sell-price').value='';document.getElementById('sell-specs').value=''}
      else{result.className='sell-result error';result.classList.remove('hidden');result.textContent=d.error||'Failed to list.'}
    }catch(e){result.className='sell-result error';result.classList.remove('hidden');result.textContent='Server error.'}
    btn.disabled=false;btn.textContent='🛒 List on Marketplace'};
}
