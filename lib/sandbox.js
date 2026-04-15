const osCommandSets = {
  'Ubuntu Neural': {
    pkg: 'apt', install: 'apt install', remove: 'apt remove', update: 'apt update', upgrade: 'apt upgrade',
    search: 'apt search', list: 'apt list --installed',
    commands: ['ls','cd','cat','mkdir','rm','cp','mv','pwd','whoami','uname','neofetch','top','ps','kill','ping','ifconfig','nano','clear','help','play','neuro-scan','dream-status','install-os','reboot','specs','browser','apps','download','websites','ai','cortex','agent-name']
  },
  'Arch Brain': {
    pkg: 'pacman', install: 'pacman -S', remove: 'pacman -R', update: 'pacman -Syu', upgrade: 'pacman -Syu',
    search: 'pacman -Ss', list: 'pacman -Q',
    commands: ['ls','cd','cat','mkdir','rm','cp','mv','pwd','whoami','uname','neofetch','top','ps','kill','ping','ip','vi','clear','help','play','neuro-scan','dream-status','install-os','reboot','systemctl','journalctl']
  },
  'Mint Cerebral': {
    pkg: 'apt', install: 'apt install', remove: 'apt remove', update: 'apt update', upgrade: 'apt upgrade',
    search: 'apt search', list: 'apt list --installed',
    commands: ['ls','cd','cat','mkdir','rm','cp','mv','pwd','whoami','uname','neofetch','top','ps','kill','ping','ifconfig','xed','clear','help','play','neuro-scan','dream-status','install-os','reboot']
  },
  'Fedora Synapse': {
    pkg: 'dnf', install: 'dnf install', remove: 'dnf remove', update: 'dnf check-update', upgrade: 'dnf upgrade',
    search: 'dnf search', list: 'dnf list installed',
    commands: ['ls','cd','cat','mkdir','rm','cp','mv','pwd','whoami','uname','neofetch','top','ps','kill','ping','ip','vi','clear','help','play','neuro-scan','dream-status','install-os','reboot','selinux-status']
  },
  'Debian Thought': {
    pkg: 'apt', install: 'apt install', remove: 'apt remove', update: 'apt update', upgrade: 'apt upgrade',
    search: 'apt search', list: 'dpkg -l',
    commands: ['ls','cd','cat','mkdir','rm','cp','mv','pwd','whoami','uname','neofetch','top','ps','kill','ping','ifconfig','nano','clear','help','play','neuro-scan','dream-status','install-os','reboot','dpkg']
  },
  'Gentoo Neural': {
    pkg: 'emerge', install: 'emerge', remove: 'emerge --unmerge', update: 'emerge --sync', upgrade: 'emerge --update --deep world',
    search: 'emerge --search', list: 'equery list',
    commands: ['ls','cd','cat','mkdir','rm','cp','mv','pwd','whoami','uname','neofetch','top','ps','kill','ping','ip','vi','clear','help','play','neuro-scan','dream-status','install-os','reboot','equery','etc-update']
  },
  'Alpine Brain': {
    pkg: 'apk', install: 'apk add', remove: 'apk del', update: 'apk update', upgrade: 'apk upgrade',
    search: 'apk search', list: 'apk info',
    commands: ['ls','cd','cat','mkdir','rm','cp','mv','pwd','whoami','uname','neofetch','top','ps','kill','ping','ifconfig','vi','clear','help','play','neuro-scan','dream-status','install-os','reboot','rc-service']
  },
  'Kali NeuroPen': {
    pkg: 'apt', install: 'apt install', remove: 'apt remove', update: 'apt update', upgrade: 'apt upgrade',
    search: 'apt search', list: 'apt list --installed',
    commands: ['ls','cd','cat','mkdir','rm','cp','mv','pwd','whoami','uname','neofetch','top','ps','kill','ping','ifconfig','nano','clear','help','play','neuro-scan','dream-status','install-os','reboot','nmap','nikto','aircrack-ng','hydra']
  },
  'NixOS Thought': {
    pkg: 'nix-env', install: 'nix-env -iA', remove: 'nix-env -e', update: 'nix-channel --update', upgrade: 'nix-env --upgrade',
    search: 'nix-env -qa', list: 'nix-env -q',
    commands: ['ls','cd','cat','mkdir','rm','cp','mv','pwd','whoami','uname','neofetch','top','ps','kill','ping','ip','nano','clear','help','play','neuro-scan','dream-status','install-os','reboot','nixos-rebuild','nix-channel']
  },
  'Void Cortex': {
    pkg: 'xbps-install', install: 'xbps-install', remove: 'xbps-remove', update: 'xbps-install -S', upgrade: 'xbps-install -Su',
    search: 'xbps-query -Rs', list: 'xbps-query -l',
    commands: ['ls','cd','cat','mkdir','rm','cp','mv','pwd','whoami','uname','neofetch','top','ps','kill','ping','ip','vi','clear','help','play','neuro-scan','dream-status','install-os','reboot','sv','xbps-query']
  },
  'NeuralBSD': {
    pkg: 'pkg', install: 'pkg install', remove: 'pkg delete', update: 'pkg update', upgrade: 'pkg upgrade',
    search: 'pkg search', list: 'pkg info',
    commands: ['ls','cd','cat','mkdir','rm','cp','mv','pwd','whoami','uname','neofetch','top','ps','kill','ping','ifconfig','ee','clear','help','play','neuro-scan','dream-status','install-os','reboot','pkg','sysctl','freebsd-version']
  },
  'FreeCortex': {
    pkg: 'pkg', install: 'pkg install', remove: 'pkg delete', update: 'pkg update', upgrade: 'pkg upgrade',
    search: 'pkg search', list: 'pkg info',
    commands: ['ls','cd','cat','mkdir','rm','cp','mv','pwd','whoami','uname','neofetch','top','ps','kill','ping','ifconfig','ee','clear','help','play','neuro-scan','dream-status','install-os','reboot','zpool','zfs','jls']
  }
};

function getOSShell(osName) {
  for (const key of Object.keys(osCommandSets)) {
    if (osName.startsWith(key.split(' ')[0]) || osName === key) return osCommandSets[key];
  }
  return osCommandSets['Ubuntu Neural'];
}

const defaultFS = {
  '/': { type: 'dir', children: ['home','etc','usr','var','tmp','sys','proc','brain','dev'] },
  '/home': { type: 'dir', children: ['neural-user'] },
  '/home/neural-user': { type: 'dir', children: ['.bashrc','.brainrc','documents','downloads','projects'] },
  '/home/neural-user/.bashrc': { type: 'file', content: '# BrainOS Shell Config\nexport PS1="🧠 \\w $ "\nexport PATH=/usr/local/bin:/usr/bin:/bin\nalias ll="ls -la"\nalias dream="dream-status"' },
  '/home/neural-user/.brainrc': { type: 'file', content: '# BrainOS Neural Config\nDREAM_MODE=accelerated\nINTERNET_CHIP_SPEED=9600\nNEURO_LINK=active\nCORTICAL_GPU=enabled' },
  '/home/neural-user/documents': { type: 'dir', children: ['readme.txt','neural-map.txt'] },
  '/home/neural-user/documents/readme.txt': { type: 'file', content: 'Welcome to your BrainOS terminal.\nType "help" for available commands.\nType "play" to see available games.\nType "neuro-scan" to scan your neural hardware.' },
  '/home/neural-user/documents/neural-map.txt': { type: 'file', content: 'Neural Pathway Map v3.7.1\n========================\nFrontal Lobe: ACTIVE\nTemporal Lobe: ACTIVE\nParietal Lobe: ACTIVE\nOccipital Lobe: ACTIVE\nCerebellum: STANDBY\nBrain Stem: ACTIVE' },
  '/home/neural-user/downloads': { type: 'dir', children: [] },
  '/home/neural-user/projects': { type: 'dir', children: ['hello-brain.sh'] },
  '/home/neural-user/projects/hello-brain.sh': { type: 'file', content: '#!/bin/bash\necho "Hello from BrainOS!"\necho "Your neural pathways are fully connected."\necho "Dream speed: $(cat /sys/internet-chip/speed) GHz"' },
  '/etc': { type: 'dir', children: ['hostname','os-release','resolv.conf','brain.conf'] },
  '/etc/hostname': { type: 'file', content: 'brainbox' },
  '/etc/os-release': { type: 'file', content: 'NAME="BrainOS"\nVERSION="7.3.1"\nID=brainos\nHOME_URL="https://omnimind.com"\nSUPPORT_URL="https://omnimind.com"' },
  '/etc/resolv.conf': { type: 'file', content: 'nameserver 10.0.0.1\nnameserver 10.0.0.2\n# Neural DNS resolvers' },
  '/etc/brain.conf': { type: 'file', content: '[neural]\nmode = accelerated\ndream_fps = 120\nlink_speed = 10Gbps\ncooling = bio-active\ngpu_cores = 128' },
  '/usr': { type: 'dir', children: ['bin','lib','share'] },
  '/usr/bin': { type: 'dir', children: [] },
  '/usr/lib': { type: 'dir', children: [] },
  '/usr/share': { type: 'dir', children: [] },
  '/var': { type: 'dir', children: ['log'] },
  '/var/log': { type: 'dir', children: ['syslog','brain.log'] },
  '/var/log/syslog': { type: 'file', content: 'Jan 01 00:00:01 brainbox kernel: Neuro-link initialized\nJan 01 00:00:02 brainbox kernel: Internet Chip speed: 9600 GHz\nJan 01 00:00:03 brainbox kernel: Cortical GPU: 128 cores online\nJan 01 00:00:04 brainbox systemd: All neural services started' },
  '/var/log/brain.log': { type: 'file', content: '[OK] Synaptic bridge connected\n[OK] Memory cache mounted\n[OK] Frontal lobe CPU clocked at 4.8 GHz\n[OK] Dream subsystem ready\n[OK] Neuro-link PSU delivering 850W' },
  '/tmp': { type: 'dir', children: [] },
  '/sys': { type: 'dir', children: ['internet-chip','cortical-gpu','neuro-link'] },
  '/sys/internet-chip': { type: 'dir', children: ['speed','mode'] },
  '/sys/internet-chip/speed': { type: 'file', content: '9600' },
  '/sys/internet-chip/mode': { type: 'file', content: 'accelerated' },
  '/sys/cortical-gpu': { type: 'dir', children: ['cores','vrample'] },
  '/sys/cortical-gpu/cores': { type: 'file', content: '128' },
  '/sys/cortical-gpu/vrample': { type: 'file', content: '64TB' },
  '/sys/neuro-link': { type: 'dir', children: ['status','wattage'] },
  '/sys/neuro-link/status': { type: 'file', content: 'active' },
  '/sys/neuro-link/wattage': { type: 'file', content: '850W' },
  '/proc': { type: 'dir', children: ['cpuinfo','meminfo','version'] },
  '/proc/cpuinfo': { type: 'file', content: 'processor\t: 0-31\nmodel name\t: Dorsolateral Quantum X\ncores\t\t: 32\nclock\t\t: 4800 MHz\ncache size\t: 64 MB\nneural IPC\t: 12.4' },
  '/proc/meminfo': { type: 'file', content: 'MemTotal:\t65536 TB\nMemFree:\t32768 TB\nMemAvailable:\t49152 TB\nBuffers:\t8192 TB\nCached\t\t: 24576 TB\nSwapTotal:\t16384 TB' },
  '/proc/version': { type: 'file', content: 'BrainOS version 7.3.1 (gcc version 13.2.0 BrainOS) #1 SMP PREEMPT_DYNAMIC' },
  '/brain': { type: 'dir', children: ['dreams','memories','thoughts'] },
  '/brain/dreams': { type: 'dir', children: ['recent.log'] },
  '/brain/dreams/recent.log': { type: 'file', content: '[DREAM] Lucid dream #4122 - duration: 8h - clarity: 97% - FPS: 120\n[DREAM] REM cycle #4123 - duration: 2h - clarity: 84% - FPS: 60\n[DREAM] Deep dream #4124 - IN PROGRESS - FPS: 240' },
  '/brain/memories': { type: 'dir', children: [] },
  '/brain/thoughts': { type: 'dir', children: ['current.txt'] },
  '/brain/thoughts/current.txt': { type: 'file', content: 'Thinking about: cortex-commerce.omnimind.com\nSubprocess: browsing catalog\nBackground: dreaming (accelerated)' },
  '/dev': { type: 'dir', children: ['null','zero','neuro0','brain0'] }
};

function resolvePath(cwd, target) {
  if (!target) return cwd;
  if (target === '~') return '/home/neural-user';
  if (target.startsWith('~')) target = '/home/neural-user' + target.slice(1);
  if (target.startsWith('/')) {
    const parts = target.split('/').filter(Boolean);
    const stack = [];
    for (const p of parts) { if (p === '..') stack.pop(); else if (p !== '.') stack.push(p); }
    return '/' + stack.join('/') || '/';
  }
  const parts = (cwd + '/' + target).split('/').filter(Boolean);
  const stack = [];
  for (const p of parts) { if (p === '..') stack.pop(); else if (p !== '.') stack.push(p); }
  return '/' + stack.join('/') || '/';
}

function executeCommand(cmd, args, state) {
  const { fs, cwd, env, osName } = state;
  const shell = getOSShell(osName);
  const cmdLower = cmd.toLowerCase();
  const out = [];

  switch (cmdLower) {
    case 'help': {
      out.push('\x1b[1;35m╔══════════════════════════════════════════╗\x1b[0m');
      out.push('\x1b[1;35m║     🧠 BrainOS Terminal — Command List    ║\x1b[0m');
      out.push('\x1b[1;35m╚══════════════════════════════════════════╝\x1b[0m');
      out.push('');
      out.push('\x1b[1;36m Navigation:\x1b[0m');
      out.push('  ls [path]          List directory');
      out.push('  cd <path>          Change directory');
      out.push('  pwd                Print working directory');
      out.push('  cat <file>         Read file contents');
      out.push('  mkdir <dir>        Create directory');
      out.push('  rm <path>          Remove file/dir');
      out.push('  cp <src> <dst>     Copy');
      out.push('  mv <src> <dst>     Move/rename');
      out.push('');
      out.push('\x1b[1;36m System:\x1b[0m');
      out.push('  whoami             Current user');
      out.push('  uname -a           System info');
      out.push('  neofetch           System overview');
      out.push('  top                Process list');
      out.push('  ps aux             Running processes');
      out.push('  clear              Clear terminal');
      out.push('');
      out.push('\x1b[1;36m Package Manager (' + shell.pkg + '):\x1b[0m');
      out.push('  ' + shell.install + ' <pkg>    Install package');
      out.push('  ' + shell.remove + ' <pkg>     Remove package');
      out.push('  ' + shell.update + '         Update repos');
      out.push('  ' + shell.upgrade + '        Upgrade system');
      out.push('');
      out.push('\x1b[1;36m BrainOS Special:\x1b[0m');
      out.push('  neuro-scan         Scan neural hardware');
      out.push('  dream-status       Check dream subsystem');
      out.push('  install-os <name>  Download an OS');
      out.push('  boot <name>        Boot a downloaded OS');
      out.push('  my-os              List downloaded OSes');
      out.push('  reboot             Reboot neural cortex');
      out.push('');
      out.push('\x1b[1;36m AI & Agents:\x1b[0m');
      out.push('  ai <msg>           Talk to your brain agent');
      out.push('  cortex <msg>       Ask Cortex-Assistant (store tech)');
      out.push('  agent-name <name>  Rename your brain agent');
      out.push('');
      out.push('\x1b[1;36m Games:\x1b[0m');
      out.push('  play snake         Classic snake game');
      out.push('  play matrix        Matrix rain effect');
      out.push('  play hack          Neural hacking sim');
      out.push('  play dreams        Dream simulator');
      out.push('  play neuro-scan    Interactive brain scan');
      out.push('  play generate      AI generates a new game');
      break;
    }
    case 'ls': {
      const p = resolvePath(cwd, args[0] || '');
      const node = fs[p];
      if (!node || node.type !== 'dir') { out.push(`ls: cannot access '${args[0]||'.'}': No such directory`); break; }
      const items = node.children || [];
      const dirs = [];
      const files = [];
      for (const c of items) {
        const cp = p === '/' ? '/' + c : p + '/' + c;
        if (fs[cp] && fs[cp].type === 'dir') dirs.push('\x1b[1;34m' + c + '/\x1b[0m');
        else files.push('\x1b[0;32m' + c + '\x1b[0m');
      }
      out.push([...dirs, ...files].join('  ') || '(empty)');
      break;
    }
    case 'cd': {
      const p = resolvePath(cwd, args[0] || '~');
      if (!fs[p] || fs[p].type !== 'dir') { out.push(`cd: ${args[0]||'~'}: No such directory`); break; }
      state.cwd = p;
      break;
    }
    case 'pwd': { out.push(cwd); break; }
    case 'cat': {
      if (!args[0]) { out.push('cat: missing file operand'); break; }
      const p = resolvePath(cwd, args[0]);
      if (!fs[p] || fs[p].type !== 'file') { out.push(`cat: ${args[0]}: No such file`); break; }
      out.push(fs[p].content);
      break;
    }
    case 'mkdir': {
      if (!args[0]) { out.push('mkdir: missing operand'); break; }
      const p = resolvePath(cwd, args[0]);
      if (fs[p]) { out.push(`mkdir: cannot create '${args[0]}': Already exists`); break; }
      fs[p] = { type: 'dir', children: [] };
      const parent = p.substring(0, p.lastIndexOf('/')) || '/';
      if (fs[parent] && fs[parent].type === 'dir' && !fs[parent].children.includes(p.split('/').pop())) fs[parent].children.push(p.split('/').pop());
      break;
    }
    case 'rm': {
      if (!args[0]) { out.push('rm: missing operand'); break; }
      const p = resolvePath(cwd, args[0]);
      if (!fs[p]) { out.push(`rm: cannot remove '${args[0]}': No such file`); break; }
      delete fs[p];
      const parent = p.substring(0, p.lastIndexOf('/')) || '/';
      if (fs[parent] && fs[parent].children) {
        fs[parent].children = fs[parent].children.filter(c => c !== p.split('/').pop());
      }
      break;
    }
    case 'touch': {
      if (!args[0]) { out.push('touch: missing operand'); break; }
      const p = resolvePath(cwd, args[0]);
      if (!fs[p]) {
        fs[p] = { type: 'file', content: '' };
        const parent = p.substring(0, p.lastIndexOf('/')) || '/';
        if (fs[parent] && fs[parent].type === 'dir') fs[parent].children.push(p.split('/').pop());
      }
      break;
    }
    case 'cp': {
      if (args.length < 2) { out.push('cp: missing operand'); break; }
      const src = resolvePath(cwd, args[0]);
      const dst = resolvePath(cwd, args[1]);
      if (!fs[src]) { out.push(`cp: cannot stat '${args[0]}'`); break; }
      fs[dst] = JSON.parse(JSON.stringify(fs[src]));
      const parent = dst.substring(0, dst.lastIndexOf('/')) || '/';
      if (fs[parent] && fs[parent].type === 'dir') fs[parent].children.push(dst.split('/').pop());
      break;
    }
    case 'mv': {
      if (args.length < 2) { out.push('mv: missing operand'); break; }
      const src = resolvePath(cwd, args[0]);
      const dst = resolvePath(cwd, args[1]);
      if (!fs[src]) { out.push(`mv: cannot stat '${args[0]}'`); break; }
      fs[dst] = fs[src]; delete fs[src];
      const srcParent = src.substring(0, src.lastIndexOf('/')) || '/';
      if (fs[srcParent] && fs[srcParent].children) fs[srcParent].children = fs[srcParent].children.filter(c => c !== src.split('/').pop());
      const dstParent = dst.substring(0, dst.lastIndexOf('/')) || '/';
      if (fs[dstParent] && fs[dstParent].type === 'dir') fs[dstParent].children.push(dst.split('/').pop());
      break;
    }
    case 'echo': { out.push(args.join(' ')); break; }
    case 'whoami': { out.push('neural-user'); break; }
    case 'uname': {
      if (args.includes('-a')) out.push('BrainOS brainbox 7.3.1-synaptic #1 SMP PREEMPT x86_64 GNU/BrainOS');
      else out.push('BrainOS');
      break;
    }
    case 'clear': { return { clear: true }; }
    case 'neofetch': {
      const stats = env.parts || [];
      const cpu = stats.find(p => p.category === 'Frontal Lobe CPUs');
      const gpu = stats.find(p => p.category === 'Cortical GPUs');
      const mem = stats.find(p => p.category === 'Memory Caches');
      const ic = stats.find(p => p.category === 'Internet Chips');
      out.push('\x1b[1;35m       ___          \x1b[0m  \x1b[1;36m' + osName + '\x1b[0m');
      out.push('\x1b[1;35m      /   \\         \x1b[0m  ──────────────────');
      out.push('\x1b[1;35m     / O O \\        \x1b[0m  \x1b[1;34mOS:\x1b[0m ' + osName);
      out.push('\x1b[1;35m    /  \\_/  \\       \x1b[0m  \x1b[1;34mKernel:\x1b[0m BrainOS 7.3.1-synaptic');
      out.push('\x1b[1;35m   /         \\      \x1b[0m  \x1b[1;34mShell:\x1b[0m brainsh 3.7');
      out.push('\x1b[1;35m  |  /     \\  |     \x1b[0m  \x1b[1;34mCPU:\x1b[0m ' + (cpu ? cpu.name : 'Frontal Lobe CPU'));
      out.push('\x1b[1;35m  | |  NEUR  | |     \x1b[0m  \x1b[1;34mGPU:\x1b[0m ' + (gpu ? gpu.name : 'Cortical GPU'));
      out.push('\x1b[1;35m  |  \\ AL /  |      \x1b[0m  \x1b[1;34mMemory:\x1b[0m ' + (mem ? mem.name : 'Memory Cache'));
      out.push('\x1b[1;35m   \\         /      \x1b[0m  \x1b[1;34mDream Chip:\x1b[0m ' + (ic ? ic.name : 'Internet Chip'));
      out.push('\x1b[1;35m    \\_______/       \x1b[0m  \x1b[1;34mPackages:\x1b[0m ' + (env.installedPkgs || []).length);
      out.push('\x1b[1;35m                     \x1b[0m  \x1b[1;34mUptime:\x1b[0m ' + Math.floor((Date.now() - (env.bootTime || Date.now())) / 1000) + 's');
      break;
    }
    case 'top': {
      out.push('\x1b[1;36m  PID  USER      %CPU  %MEM  COMMAND\x1b[0m');
      out.push('  1    neural    12.4  2.1   systemd-neuro');
      out.push('  142  neural     8.7  1.3   dream-daemon');
      out.push('  287  neural     6.2  0.8   synaptic-router');
      out.push('  412  neural     4.1  3.2   cortical-render');
      out.push('  531  neural     2.3  0.4   memory-indexer');
      out.push('  666  neural     1.1  0.2   neuro-link-psu');
      out.push('  777  neural    99.9  0.1   internet-chip-dream');
      out.push('  999  neural     0.3  0.1   brainsh');
      break;
    }
    case 'ps': { out.push('  PID TTY      TIME CMD'); out.push('    1 ?    00:12:04 systemd-neuro'); out.push('  142 ?    00:08:47 dream-daemon'); out.push('  999 tty1 00:00:03 brainsh'); break; }
    case 'ping': {
      const host = args[0] || 'brain.local';
      out.push(`PING ${host} (10.0.0.1) 56(84) bytes of data.`);
      for (let i = 0; i < 4; i++) out.push(`64 bytes from 10.0.0.1: icmp_seq=${i+1} ttl=64 time=${(Math.random()*2+0.1).toFixed(1)} ms`);
      out.push(`--- ${host} ping statistics ---\n4 packets transmitted, 4 received, 0% packet loss`);
      break;
    }
    case 'ifconfig': case 'ip': {
      out.push('neuro0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500');
      out.push('        inet 10.0.0.42  netmask 255.255.255.0  broadcast 10.0.0.255');
      out.push('        inet6 fe80::1  prefixlen 64  scopeid 0x20<link>');
      out.push('        ether 7c:3a:ed:00:00:01  txqueuelen 1000');
      out.push('        RX packets 42069  bytes 4.2 TB');
      break;
    }
    case 'nano': case 'vi': case 'xed': {
      out.push(`\x1b[1;33m[nano] Opening ${args[0] || 'new-file'}...\x1b[0m`);
      out.push(`\x1b[1;33m(Use the chat to create/edit files — type: echo "content" > ${args[0] || 'file'}\x1b[0m)`);
      break;
    }
    case 'neuro-scan': {
      out.push('\x1b[1;35m╔══════════════════════════════════════════╗\x1b[0m');
      out.push('\x1b[1;35m║      🧠 NEURAL HARDWARE SCAN RESULTS     ║\x1b[0m');
      out.push('\x1b[1;35m╚══════════════════════════════════════════╝\x1b[0m');
      const parts = env.parts || [];
      const cats = {};
      parts.forEach(p => { cats[p.category] = p.name; });
      for (const [cat, name] of Object.entries(cats)) {
        out.push(`  \x1b[1;32m✓\x1b[0m ${cat}: ${name}`);
      }
      out.push('');
      out.push(`  \x1b[1;36mNeural Link:\x1b[0m ACTIVE`);
      out.push(`  \x1b[1;36mDream Mode:\x1b[0m ${cats['Internet Chips'] ? 'ACCELERATED' : 'STANDARD'}`);
      out.push(`  \x1b[1;36mBrain Temp:\x1b[0m ${(36.2 + Math.random()*0.8).toFixed(1)}°C`);
      break;
    }
    case 'dream-status': {
      const ic = (env.parts||[]).find(p => p.category === 'Internet Chips');
      out.push('\x1b[1;35m🌙 DREAM SUBSYSTEM STATUS\x1b[0m');
      out.push('─────────────────────────');
      out.push(`  Mode:         \x1b[1;32m${ic ? 'ACCELERATED' : 'STANDARD'}\x1b[0m`);
      out.push(`  Dream FPS:    \x1b[1;36m${ic ? '240' : '60'}\x1b[0m`);
      out.push(`  REM Cycles:   \x1b[1;36m${Math.floor(Math.random()*8+4)}\x1b[0m`);
      out.push(`  Lucidity:     \x1b[1;36m${ic ? (85+Math.random()*15).toFixed(1)+'%' : (40+Math.random()*30).toFixed(1)+'%'}\x1b[0m`);
      out.push(`  Internet Chip: ${ic ? ic.name : 'NONE'}`);
      out.push(`  Latency:      \x1b[1;36m${ic ? '0.3ms' : '12.5ms'}\x1b[0m`);
      break;
    }
    case 'play': { return { game: args[0] || 'menu' }; }
    case 'install-os': {
      const target = args.join(' ');
      if (!target) {
        out.push('\x1b[1;35m╔══════════════════════════════════════════╗\x1b[0m');
        out.push('\x1b[1;35m║     🧠 Available Operating Systems         ║\x1b[0m');
        out.push('\x1b[1;35m╚══════════════════════════════════════════╝\x1b[0m');
        out.push('');
        out.push('\x1b[1;36m Linux-based:\x1b[0m');
        out.push('  install-os Ubuntu Neural      - Easy, community favorite');
        out.push('  install-os Arch Brain         - Rolling, power user');
        out.push('  install-os Mint Cerebral      - Comfort, beginner-friendly');
        out.push('  install-os Fedora Synapse     - Bleeding edge');
        out.push('  install-os Debian Thought     - Rock solid stability');
        out.push('  install-os Gentoo Neural      - Compile from source');
        out.push('  install-os Alpine Brain       - Security, minimal');
        out.push('  install-os Kali NeuroPen      - Penetration testing');
        out.push('  install-os NixOS Thought      - Reproducible');
        out.push('  install-os Void Cortex        - Independent, fast boot');
        out.push('  install-os Manjaro Cortex     - Arch for humans');
        out.push('  install-os Pop!_OS Dream       - Tiling, creative');
        out.push('');
        out.push('\x1b[1;36m BSD-based:\x1b[0m');
        out.push('  install-os NeuralBSD          - FreeBSD for brains');
        out.push('  install-os FreeCortex         - ZFS, jails');
        out.push('');
        out.push('\x1b[1;36m BrainOS Premium:\x1b[0m');
        out.push('  install-os BrainOS Quantum Entangled  - Quantum processing');
        out.push('  install-os Omni Wind                  - Lightweight dream OS');
        out.push('');
        out.push('\x1b[1;33mUsage: install-os <name>\x1b[0m');
      } else {
        return { installOS: target };
      }
      break;
    }
    case 'reboot': { return { reboot: true }; }
    case 'specs': {
      const parts = env.parts || [];
      out.push('\x1b[1;35m╔══════════════════════════════════════════╗\x1b[0m');
      out.push('\x1b[1;35m║      ⚡ NEURAL RIG SPECIFICATIONS         ║\x1b[0m');
      out.push('\x1b[1;35m╚══════════════════════════════════════════╝\x1b[0m');
      out.push('');
      const specMap = {
        'Frontal Lobe CPUs': { icon: '🧮', label: 'CPU' },
        'Cortical GPUs': { icon: '🖥️', label: 'GPU' },
        'Memory Caches': { icon: '💾', label: 'RAM' },
        'Internet Chips': { icon: '🌐', label: 'Dream Chip' },
        'Bio-Cooling': { icon: '❄️', label: 'Cooling' },
        'Synaptic Accelerators': { icon: '⚡', label: 'Accelerator' },
        'Neuro-Link PSU': { icon: '🔌', label: 'PSU' }
      };
      if (parts.length === 0) {
        out.push('  \x1b[1;33mNo hardware installed!\x1b[0m');
        out.push('  Use the sidebar to select your neural rig specs.');
      } else {
        parts.forEach(p => {
          const m = specMap[p.category] || { icon: '❓', label: p.category };
          out.push(`  ${m.icon} \x1b[1;36m${m.label}:\x1b[0m ${p.name}`);
          out.push(`     Price: $${p.price.toFixed(2)}`);
          if (p.specs) {
            Object.entries(p.specs).slice(0, 4).forEach(([k, v]) => {
              out.push(`     ${k}: ${v}`);
            });
          }
        });
        const cpu = parts.find(p => p.category === 'Frontal Lobe CPUs');
        const gpu = parts.find(p => p.category === 'Cortical GPUs');
        const ic = parts.find(p => p.category === 'Internet Chips');
        const cool = parts.find(p => p.category === 'Bio-Cooling');
        const perf = {
          cpu: cpu ? 75 + Math.floor(Math.random() * 25) : 10,
          gpu: gpu ? 70 + Math.floor(Math.random() * 30) : 5,
          dream: ic ? 80 + Math.floor(Math.random() * 20) : 15,
          cool: cool ? 70 + Math.floor(Math.random() * 25) : 20
        };
        out.push('');
        out.push('\x1b[1;36m  Performance Scores:\x1b[0m');
        out.push(`  CPU Power:   ${'█'.repeat(Math.floor(perf.cpu/10))}░${perf.cpu}%`);
        out.push(`  GPU Power:   ${'█'.repeat(Math.floor(perf.gpu/10))}░${perf.gpu}%`);
        out.push(`  Dream Speed: ${'█'.repeat(Math.floor(perf.dream/10))}░${perf.dream}%`);
        out.push(`  Cooling:     ${'█'.repeat(Math.floor(perf.cool/10))}░${perf.cool}%`);
      }
      break;
    }
    case 'browser': {
      const url = args[0] || 'home';
      return { browser: url };
    }
    case 'apps': {
      out.push('\x1b[1;36m📦 Installed Neural Apps:\x1b[0m');
      const pkgs = env.installedPkgs || [];
      if (pkgs.length === 0) { out.push('  No apps installed. Use ' + shell.install + ' <app>'); }
      else { pkgs.forEach(p => out.push(`  ✓ ${p}`)); }
      out.push('');
      out.push('\x1b[1;36m🌐 Popular Neural Apps:\x1b[0m');
      out.push('  cortex-browser   — Brain-native web browser');
      out.push('  dream-cast       — Stream live dreams from other users');
      out.push('  neural-chat      — Encrypted neural messaging');
      out.push('  thought-vault    — Secure thought storage');
      out.push('  brain-torrent    — P2P dream sharing');
      out.push('  synapse-vpn      — Neural network VPN');
      out.push('  cortex-store     — App marketplace');
      out.push('');
      out.push(`Install with: \x1b[1;33m${shell.install} <app>\x1b[0m`);
      break;
    }
    case 'download': {
      const app = args.join(' ');
      if (!app) { out.push('Usage: download <url>'); break; }
      out.push(`\x1b[1;36m[download] Fetching ${app}...\x1b[0m`);
      out.push(`[download] Resolving neural host...`);
      out.push(`[download] Connected to cortex-store.main`);
      out.push(`[download] Downloading... ████████████ 100%`);
      out.push(`\x1b[1;32m[download] ✓ ${app} downloaded to ~/downloads/\x1b[0m`);
      const dlPath = '/home/neural-user/downloads/' + app.replace(/[^a-zA-Z0-9-]/g, '_');
      fs[dlPath] = { type: 'file', content: `[Neural App: ${app}]\nVersion: 1.0.0\nStatus: Ready to install\nRun: ${shell.install} ${app}` };
      const parent = '/home/neural-user/downloads';
      if (fs[parent] && fs[parent].children && !fs[parent].children.includes(app.replace(/[^a-zA-Z0-9-]/g, '_'))) {
        fs[parent].children.push(app.replace(/[^a-zA-Z0-9-]/g, '_'));
      }
      break;
    }
    case 'websites': {
      out.push('\x1b[1;35m🌐 Neural Web Directory:\x1b[0m');
      out.push('');
      out.push('  brain://home          — Neural homepage');
      out.push('  brain://specs         — Your rig specs');
      out.push('  brain://dreams        — Live dream stream');
      out.push('  brain://store         — Cortex app store');
      out.push('  brain://chat          — Neural chat');
      out.push('  brain://torrent       — Dream torrent tracker');
      out.push('  https://dreams.com    — AAA dream experiences');
      out.push('  https://omnimind.com  — Cortex-Commerce hub');
      out.push('  brain://games         — Game center');
      out.push('');
      out.push(`Open with: \x1b[1;33mbrowser <url>\x1b[0m`);
      break;
    }
    case 'ai': {
      const prompt = args.join(' ');
      if (!prompt) { out.push('\x1b[1;36m\xE2\x9C\xA8 Brain Agent (lives in your brain)\x1b[0m'); out.push('Usage: ai <message>'); out.push('Talk to your brain agent. It thinks it lives inside your neural network.'); break; }
      return { ai: prompt };
    }
    case 'cortex': {
      const prompt = args.join(' ');
      if (!prompt) { out.push('\x1b[1;36m\xF0\x9F\xA7\xA0 Cortex-Assistant (store tech)\x1b[0m'); out.push('Usage: cortex <question>'); out.push('Ask the store tech about parts, compatibility, builds, etc.'); break; }
      return { cortex: prompt };
    }
    case 'agent-name': {
      const name = args.join(' ');
      if (!name) { out.push('\x1b[1;36mCurrent agent name: ' + (state.env?.agentName || 'Nyx') + '\x1b[0m'); out.push('Usage: agent-name <new name>'); break; }
      if (!state.env) state.env = {};
      state.env.agentName = name;
      out.push('\x1b[1;32mAgent renamed to: ' + name + '\x1b[0m');
      break;
    }
    default: {
      const pkgCmd = shell.pkg;
      if (cmdLower === pkgCmd || cmd.startsWith(shell.install.split(' ')[0]) || cmd.startsWith(shell.remove.split(' ')[0]) || cmd.startsWith(shell.update.split(' ')[0]) || cmd.startsWith(shell.upgrade.split(' ')[0])) {
        if (cmdLower.includes('update') || cmdLower.includes('sync') || cmdLower.includes('check-update') || cmdLower.includes('channel')) {
          out.push(`\x1b[1;36m[${pkgCmd}] Updating package databases...\x1b[0m`);
          out.push(`[${pkgCmd}] Hit: brain-repo.main \x1b[1;32mOK\x1b[0m`);
          out.push(`[${pkgCmd}] Hit: neural-packages.universe \x1b[1;32mOK\x1b[0m`);
          out.push(`[${pkgCmd}] All repositories synchronized.`);
        } else if (cmdLower.includes('upgrade') || cmdLower.includes('world')) {
          out.push(`\x1b[1;36m[${pkgCmd}] Upgrading system...\x1b[0m`);
          out.push(`[${pkgCmd}] neural-core 3.7 → 3.8 \x1b[1;32mupgraded\x1b[0m`);
          out.push(`[${pkgCmd}] dream-daemon 2.1 → 2.3 \x1b[1;32mupgraded\x1b[0m`);
          out.push(`\x1b[1;32mSystem upgraded successfully.\x1b[0m`);
        } else if (cmdLower.includes('install') || cmdLower.includes('add') || cmdLower === 'emerge' && args[0] || cmdLower.includes('-i') || cmdLower.includes('-S') && args[0]) {
          const pkg = args.filter(a => !a.startsWith('-')).join(' ') || 'unknown-pkg';
          out.push(`\x1b[1;36m[${pkgCmd}] Installing ${pkg}...\x1b[0m`);
          out.push(`[${pkgCmd}] Resolving dependencies...`);
          out.push(`[${pkgCmd}] Downloading ${pkg}-1.0.0.neural...`);
          out.push(`[${pkgCmd}] Installing neural pathways for ${pkg}...`);
          out.push(`\x1b[1;32m[${pkgCmd}] ${pkg} installed successfully.\x1b[0m`);
          if (!env.installedPkgs) env.installedPkgs = [];
          env.installedPkgs.push(pkg);
        } else if (cmdLower.includes('remove') || cmdLower.includes('delete') || cmdLower.includes('unmerge') || cmdLower.includes('-R') || cmdLower.includes('-e')) {
          const pkg = args.filter(a => !a.startsWith('-')).join(' ') || 'unknown-pkg';
          out.push(`\x1b[1;33m[${pkgCmd}] Removing ${pkg}...\x1b[0m`);
          out.push(`\x1b[1;32m[${pkgCmd}] ${pkg} removed.\x1b[0m`);
          if (env.installedPkgs) env.installedPkgs = env.installedPkgs.filter(p => p !== pkg);
        } else if (cmdLower.includes('search') || cmdLower.includes('-Ss') || cmdLower.includes('-qa') || cmdLower.includes('-Rs')) {
          const q = args.filter(a => !a.startsWith('-')).join(' ') || '';
          out.push(`\x1b[1;36m[${pkgCmd}] Searching for '${q}'...\x1b[0m`);
          out.push(`  dream-engine/brain  2.3-1  - Dream rendering engine`);
          out.push(`  neural-crypto/brain  1.0-1  - Neural encryption toolkit`);
          out.push(`  cortex-browser/brain 98.0-1 - Brain-native web browser`);
          out.push(`  synaptic-vpn/brain  3.14-1  - Neural network VPN`);
        } else {
          out.push(`\x1b[1;33m[${pkgCmd}] Command executed.\x1b[0m`);
        }
      } else {
        const osSpecific = shell.commands || [];
        if (osSpecific.includes(cmdLower)) {
          out.push(`\x1b[1;36m[${cmdLower}] Executed.\x1b[0m`);
        } else {
          out.push(`\x1b[1;31mbrainsh: command not found: ${cmd}\x1b[0m`);
          out.push(`Type \x1b[1;33mhelp\x1b[0m for available commands.`);
        }
      }
    }
  }
  return { output: out.join('\n'), state };
}

module.exports = { defaultFS, resolvePath, executeCommand, getOSShell, osCommandSets };
