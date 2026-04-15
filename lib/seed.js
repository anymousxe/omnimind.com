const categories = ['Synaptic Accelerators','Bio-Cooling','Cortical GPUs','Frontal Lobe CPUs','Memory Caches','Neuro-Link PSU','Internet Chips'];

const catData = {
  'Synaptic Accelerators': {
    prefixes: ['Axon','Dendrite','Synapse','Myelin','Vesicle','Receptor','Neurotransmitter','Ion-Channel','Nernst','Hodgkin-Huxley','Saltatory','Ranvier','Schwann','Action-Potential','Threshold','Refractory','Cascade','Spike','Burst','Impulse'],
    suffixes: ['Boost X','Accel Pro','Signal+','Pulse Max','Response Ultra','Transmit HD','Fire-980','Conduct Ti','Relay GX','Velocity II','Latency Zero','Throughput EX','Bandwidth XL','Phase-Lock V2','Gain Master','Sorter Prime','Stack 500','Driver NX','Core Overdrive','Turbo Link'],
    specKeys: ['Synaptic Latency','Signal Bandwidth','Firing Rate','Conduction Velocity','Refractory Period','Spike Precision','Channel Density','Vesicle Count']
  },
  'Bio-Cooling': {
    prefixes: ['Cerebrospinal','Arachnoid','Pia-Mater','Duramater','Ventricular','Choroid','Hypothermia','Cryo','Frost','Glacial','Tundra','Arctic','Vortex','Subzero','Quantum','Entropy','NerveFrost','BrainChill','SynapFreeze','CortIce'],
    suffixes: ['Coolant Pro','Thermal X','HeatKill 360','Radiate Ultra','Frost Wave','Chill Matrix V3','Freeze Core','Ice Cap 2','Condense Array','Sublime Cell','Evaporate Tower','Dissipate Grid','Absorb Membrane','Reject Turbine','Circulate Pump X','Phase-Shift Unit','Cryo Chamber','Thermal Pad+','Bypass Valve EX','Cool Loop 900'],
    specKeys: ['Cooling Capacity','Flow Rate','Operating Temp','Thermal Resistance','Heat Dissipation','Noise Level','Efficiency Rating','Pump Pressure']
  },
  'Cortical GPUs': {
    prefixes: ['Occipital','Parietal','Temporal','Insular','Cingulate','Prefrontal','Visual','Auditory','Somatosensory','Motor','Fusiform','Angular','Supramarginal','Precuneus','Calcarine','Lingual','Parahippocampal','Visual Cortex','Auditory Cortex','Sensorium'],
    suffixes: ['RTX-9000','Vision Ultra','Pattern Pro','Depth X','Shader Max','Ray Tracer VII','Tensor Slice EX','Raster Prime','Pixel Matrix 8','Voxel Driver 3','Frame Weaver GX','Display Sync','Color HD','Edge Detect Pro','Motion Track Ultra','Holo Project','Light Map V2','Shadow Caster X','Anti-Alias 16x','Neural Render'],
    specKeys: ['Neural Cores','VRAM Capacity','Render Throughput','Tensor Operations','Ray Tracing Units','Pixel Fill Rate','Memory Bandwidth','Shader Units']
  },
  'Frontal Lobe CPUs': {
    prefixes: ['Dorsolateral','Orbitofrontal','Ventromedial','Brodmann','Betz','Pyramidal','Thalamic','Hypothalamic','Reticular','Limbic','Amygdaloid','Hippocampal','Basal Ganglia','Subthalamic','Pineal','Septal','Mammillary','Epithalamic','Extrapyramidal','Cerebellar'],
    suffixes: ['i9-Brain','Executive X5','Decision Pro','Planning Ultra','Logic VII','Reason+','Judgment Prime','Inhibition V2','Memory Hub EX','Attention Max','Sequencer 3','Predictor AI','Abstractor Pro','Categorize Ultra','Inference Core X','Strategy Engine','Forecast GX','Evaluate Prime','Resolve Master','Schedule Ultra'],
    specKeys: ['Core Count','Clock Speed','L1 Cache','L2 Cache','IPC Score','Thread Count','TDP','Fabrication Node']
  },
  'Memory Caches': {
    prefixes: ['Hippocampal','Episodic','Semantic','Procedural','Working','Explicit','Implicit','Declarative','Spatial','Recognition','Recall','Echoic','Iconic','Haptic','Priming','Prospective','Retrospective','Autobiographical','Long-Term','Short-Term'],
    suffixes: ['DDR8-32000','Storage Pro','Retention EX','Recall Ultra','Encode Max','Consolidate X','Buffer Prime','Register File+','Cache Line V4','Bank Module Ultra','Rank Unit Pro','Stack Die 3D','Persistent Hub','Flash Node GX','NVRAM Block X','PCM Unit Prime','MRAM Core 2','3D XPoint+','Optane Neural','Hybrid Cache'],
    specKeys: ['Capacity','Read Latency','Write Latency','Bandwidth','Frequency','CAS Latency','ECC Support','Channel Width']
  },
  'Neuro-Link PSU': {
    prefixes: ['Medullary','Pontine','Midbrain','Spinal','Vagal','Autonomic','Sympathetic','Parasympathetic','Enteric','Somatic','Efferent','Afferent','Ganglionic','Plexus','Nuclear','Reticular','Motor-Cortex','Sensory-Root','Inter-Neuron','Projection'],
    suffixes: ['Power 2000W','Regulator Pro','Stabilizer X','Wattage Ultra','Energy Cell V3','Reserve Prime','Surge Shield+','UPS Module EX','Deliver Engine','Distribute Hub 2','Split Rail GX','Phase Control V2','Balance Max','Efficiency Pro','Convert Matrix X','Isolate Transformer','Capacitor Bank+','Inductor Ultra','Filter Array Pro','Ground Plane EX'],
    specKeys: ['Wattage','Efficiency','Voltage Regulation','Ripple Noise','Protection Circuits','MTBF','Fan Profile','Peak Output']
  },
  'Internet Chips': {
    prefixes: ['DreamNet','REM-Link','LucidBridge','NightWave','SleepStream','DeltaWave','ThetaGate','Oneiric','Hypnagogic','SlumberCore','DeepSleep','Paradox','Circadian','Melatonin','Pineal','Somnus','Morpheus','Hypnos','NightOwl','DreamWeaver'],
    suffixes: ['Dream Pro','Fast-Dream X','REM Turbo','Lucid Engine V2','Vision Synth Ultra','Sleep Router+','Night Cache EX','Delta Mod Prime','Theta Buffer 3','Oneiric Drive','Hypna Relay GX','Slumber Core X','Deep-Sleep Ultra','Circadian Tune Pro','Dream Codec V4','Vision Stream HD','Night Protocol+','Lucid Trigger EX','REM Crystal 2','Sleep Firewall'],
    specKeys: ['Dream Throughput','REM Frequency','Lucid Clarity','Latency to Sleep','Vision Resolution','Delta Bandwidth','Theta Sync Rate','Circadian Accuracy']
  }
};

const realDistros = [
  {name:'Ubuntu Neural',version:'24.04 LTS',kernel:'BrainKernel 6.8',desc:'The people\'s neural OS. Easy setup, massive community, perfect for first-time brain installers.',size:2048,price:0},
  {name:'Arch Brain',version:'rolling',kernel:'CortexKernel 6.12',desc:'Keep it simple, keep it neural. Rolling release for power users who configure every synapse manually.',size:800,price:0},
  {name:'Mint Cerebral',version:'22.1',kernel:'BrainKernel 6.5',desc:'Comfortable neural computing. Windows-brain refugees welcome. Cinnamon desktop feels like home.',size:2400,price:0},
  {name:'Fedora Synapse',version:'41',kernel:'CortexKernel 6.11',desc:'Bleeding-edge neural tech. First to get new cortical features. Red Hat backed.',size:1800,price:0},
  {name:'Debian Thought',version:'13',kernel:'BrainKernel 6.1',desc:'The universal neural OS. Rock solid. Your grandma\'s brain runs this.',size:1600,price:0},
  {name:'Manjaro Cortex',version:'24',kernel:'CortexKernel 6.6',desc:'Arch for humans. All the neural power, none of the config headaches.',size:1200,price:0},
  {name:'Kali NeuroPen',version:'2025.1',kernel:'BrainKernel 6.8',desc:'Penetration testing for neural networks. Ethical brain hacking only.',size:3200,price:0},
  {name:'Pop!_OS Dream',version:'24.04',kernel:'BrainKernel 6.9',desc:'System76\'s neural OS. Tiling window manager for your cortex. Auto-tiling dreams.',size:2200,price:0},
  {name:'openSULSE Leap',version:'16',kernel:'BrainKernel 6.4',desc:'Enterprise neural computing made easy. YaST for brain management.',size:2000,price:0},
  {name:'CentOS Mind',version:'Stream 10',kernel:'BrainKernel 6.8',desc:'Enterprise-grade neural infrastructure. RHEL-compatible. Runs mission-critical brains.',size:1800,price:0},
  {name:'Gentoo Neural',version:'rolling',kernel:'Custom',desc:'Compile every neural pathway from source. Maximum optimization. Maximum patience required.',size:400,price:0},
  {name:'Alpine Brain',version:'3.21',kernel:'CortexKernel 6.12',desc:'Security-oriented, musl-based, tiny. Perfect for containerized neural functions.',size:150,price:0},
  {name:'NixOS Thought',version:'25.05',kernel:'BrainKernel 6.8',desc:'Reproducible brain configurations. Declarative neural state. If it works once, it works forever.',size:1600,price:0},
  {name:'Void Cortex',version:'rolling',kernel:'CortexKernel 6.12',desc:'Independent, musl/glibc, runit-init. Fast neural boot in under 2 seconds.',size:350,price:0},
  {name:'Slackware Synapse',version:'15.0',kernel:'BrainKernel 5.15',desc:'The oldest neural distro still maintained. If it ain\'t broke, don\'t fix the brain.',size:1200,price:0},
  {name:'Elementary Mind',version:'8',kernel:'BrainKernel 6.8',desc:'Beautiful neural computing. macOS-brain refugees welcome. Pantheon desktop.',size:1800,price:0},
  {name:'Zorin Cortex',version:'17.2',kernel:'BrainKernel 6.5',desc:'Designed for brain migrants. Looks like your old OS but thinks faster.',size:2400,price:0},
  {name:'EndeavourOS Neural',version:'24.1',kernel:'CortexKernel 6.12',desc:'Arch, but friendly. Community-driven neural distro with online installer.',size:1000,price:0},
  {name:'Garuda Dream',version:'rolling',kernel:'CortexKernel 6.11',desc:'Performance-first neural OS. BTRFS, Zen kernel, gaming-brain ready out of the box.',size:2800,price:0},
  {name:'Rocky Mind',version:'10',kernel:'BrainKernel 6.8',desc:'Community enterprise neural OS. RHEL-compatible, no subscription needed.',size:1800,price:0},
  {name:'Parrot Neural',version:'6.3',kernel:'BrainKernel 6.8',desc:'Security and privacy neural OS. For brain auditors and neural penetration testers.',size:2600,price:0},
  {name:'MX Cerebral',version:'23.5',kernel:'BrainKernel 6.1',desc:'Mid-weight neural OS. AntiX roots, solid tools, no systemd drama.',size:1400,price:0},
  {name:'NeuralBSD',version:'15.0',kernel:'NeuroCore 15.0',desc:'The BrainBSD experience. Ports tree for neural hardware. Pure Unix brain philosophy.',size:1200,price:0},
  {name:'FreeCortex',version:'14.2',kernel:'CortexKernel 14.2',desc:'Another BSD for brains. Jails for neural isolation. ZFS for thought storage.',size:1100,price:0},
  {name:'OpenCortex',version:'7.7',kernel:'CortexKernel 7.7',desc:'Security-first BSD brain. Code audit for every neural pathway. Libre hardware.',size:900,price:0},
  {name:'Haiku Mind',version:'R1beta5',kernel:'OpenBeOS Kernel',desc:'BeOS reborn for brains. Responsive, multimedia-focused neural computing.',size:400,price:0},
  {name:'ReactOS Brain',version:'0.5',kernel:'NT-style Kernel',desc:'Windows-compatible open source brain. Run .exe neural programs natively.',size:600,price:0},
  {name:'BrainOS Quantum Entangled',version:'1.0.0',kernel:'BrainKernel Q1.0',desc:'Quantum-entangled processing. Instantaneous cross-brain communication.',size:2048,price:499.99},
  {name:'CortexLinux ThoughtForm',version:'42.0.0',kernel:'CortexKernel 42.0',desc:'Thought-driven interface. Turns abstract ideas into compiled neural pathways.',size:4096,price:299.99},
  {name:'SynapticBSD DreamState',version:'7.0.0',kernel:'SynapseOS 7.0',desc:'Dream-state processing for subconscious computation during rest cycles.',size:8192,price:199.99},
  {name:'NeuroOS Omniscient',version:'99.9.9',kernel:'NeuroCore 99.9',desc:'Every neuron connected, every thought parallel.',size:16384,price:999.99},
  {name:'MindUnix Singularity',version:'3.14.159',kernel:'MindArch 3.14',desc:'Recursive self-improving neural loops approaching singularity.',size:32000,price:1499.99},
  {name:'CognitiveOS Enlightenment',version:'8.0.8',kernel:'ThoughtEngine 8.0',desc:'Zero-latency self-aware computation pipeline.',size:6400,price:799.99},
  {name:'Omni Wind',version:'1.0.0',kernel:'WindKernel 1.0',desc:'Custom neural breeze. The community-requested lightweight dream OS. Fast, clean, limitless.',size:512,price:49.99}
];

const brainDistroPrefixes = ['BrainOS','NeuroOS','CortexLinux','SynapticBSD','MindUnix','ThoughtOS','CognitiveOS','EncephalonOS','CerebralOS','PsychOS'];
const brainDistroSuffixes = ['Ultimate','Enterprise','Neural','Pro','Lite','Server','Embedded','Real-Time','Quantum','Hybrid','Cloud','Edge','Studio','Developer','Secure','Parallel','Distributed','Autonomic','Cognitive','Predictive','Ultra','Hyper','Max','Nano','Micro'];

function ri(a,b){return Math.floor(Math.random()*(b-a+1))+a}
function pick(a){return a[ri(0,a.length-1)]}

function genSpecs(cat) {
  const specs = {};
  catData[cat].specKeys.forEach(k => {
    if(k.includes('Latency')) specs[k]=(Math.random()*15+0.5).toFixed(1)+' ns';
    else if(k.includes('Bandwidth')||k.includes('Rate')||k.includes('Throughput')||k.includes('Speed')||k.includes('Frequency')) specs[k]=(Math.random()*500+50).toFixed(0)+' GHz';
    else if(k.includes('Capacity')||k.includes('VRAM')) specs[k]=ri(1,128)+' TB';
    else if(k.includes('Core')||k.includes('Count')||k.includes('Units')||k.includes('Thread')) specs[k]=ri(1,256);
    else if(k.includes('Wattage')||k.includes('TDP')||k.includes('Peak')) specs[k]=ri(50,2000)+' W';
    else if(k.includes('Efficiency')||k.includes('Accuracy')||k.includes('Clarity')) specs[k]=(Math.random()*30+70).toFixed(1)+'%';
    else if(k.includes('Temp')) specs[k]='-'+ri(10,273)+'°C';
    else if(k.includes('Noise')) specs[k]=ri(0,45)+' dB';
    else if(k.includes('Pressure')) specs[k]=ri(1,500)+' kPa';
    else if(k.includes('Fabrication')) specs[k]=ri(1,7)+' nm';
    else if(k.includes('IPC')) specs[k]=(Math.random()*10+5).toFixed(1);
    else if(k.includes('MTBF')) specs[k]=ri(100,999)+'k hrs';
    else if(k.includes('Cache')) specs[k]=ri(1,64)+' MB';
    else if(k.includes('Support')) specs[k]=Math.random()>0.5?'Yes':'No';
    else if(k.includes('Width')) specs[k]=ri(64,512)+'-bit';
    else if(k.includes('Profile')) specs[k]=pick(['Silent','Balanced','Performance']);
    else if(k.includes('Circuits')) specs[k]=pick(['OVP,OCP,SCP,OTP','Full Suite']);
    else if(k.includes('Ripple')) specs[k]=(Math.random()*100+10).toFixed(0)+' mV';
    else if(k.includes('Regulation')) specs[k]='±'+(Math.random()*3+0.5).toFixed(1)+'%';
    else if(k.includes('Resolution')) specs[k]=ri(720,16384)+'p';
    else if(k.includes('FPS')) specs[k]=ri(30,999)+' fps';
    else specs[k]=ri(85,100)+'%';
  });
  return specs;
}

function randPrice(cat) {
  const r={'Synaptic Accelerators':[49,899],'Bio-Cooling':[29,599],'Cortical GPUs':[199,2999],'Frontal Lobe CPUs':[149,1999],'Memory Caches':[39,799],'Neuro-Link PSU':[59,499],'Internet Chips':[79,1299]};
  const[lo,hi]=r[cat]; return +(lo+Math.random()*(hi-lo)).toFixed(2);
}

function generateParts() {
  const parts = [];
  let id = 1;
  const seen = new Set();
  for (const cat of categories) {
    const{prefixes,suffixes}=catData[cat];
    for(const p of prefixes){
      for(const s of suffixes){
        const n=`${p} ${s}`;
        if(seen.has(n))continue;seen.add(n);
        parts.push({id:id++,name:n,category:cat,price:randPrice(cat),specs:genSpecs(cat),stock:ri(0,50)});
      }
    }
  }
  const extras=[
    ['NeuroFlux X-9000','Synaptic Accelerators',1299.99],['Quantum Synapse Bridge','Synaptic Accelerators',2499.99],
    ['CryoSpinal Liquid Pro','Bio-Cooling',499.99],['ThermoNerve Frostbite 3000','Bio-Cooling',799.99],
    ['Occipital Titan RTX-9000','Cortical GPUs',2999.99],['Fusiform Hologram Pro','Cortical GPUs',1899.99],
    ['Dorsolateral Quantum X','Frontal Lobe CPUs',1999.99],['Brodmann Hexacore i9','Frontal Lobe CPUs',1599.99],
    ['Hippocampal Persistent 64TB','Memory Caches',799.99],['Semantic NVRAM Quantum','Memory Caches',699.99],
    ['Medullary 2000W Platinum','Neuro-Link PSU',499.99],['Autonomic Surge Shield Pro','Neuro-Link PSU',399.99],
    ['DreamNet Lucid Engine X','Internet Chips',1299.99],['REM-Link Vision Synth Pro','Internet Chips',899.99],
    ['LucidBridge Theta Ultra','Internet Chips',749.99],['Oneiric Dream Codec MK2','Internet Chips',599.99],
    ['Omni Wind Chip','Internet Chips',349.99]
  ];
  for(const[n,c,p] of extras){
    if(seen.has(n))continue;seen.add(n);
    parts.push({id:id++,name:n,category:c,price:p,specs:genSpecs(c),stock:ri(0,50)});
  }
  return parts;
}

function generateDistros() {
  const d = [];
  let id = 1;
  for(const rd of realDistros){
    d.push({id:id++,name:rd.name,version:rd.version,kernel:rd.kernel,description:rd.desc,size_mb:rd.size,price:rd.price});
  }
  const seen = new Set(realDistros.map(r=>r.name));
  for(const prefix of brainDistroPrefixes){
    for(const suffix of brainDistroSuffixes){
      const n=`${prefix} ${suffix}`;
      if(seen.has(n))continue;seen.add(n);
      d.push({id:id++,name:n,version:`${ri(1,99)}.${ri(0,99)}.${ri(0,999)}`,kernel:`${pick(['BrainKernel','NeuroCore','SynapseOS','CortexKernel','MindArch'])} ${ri(1,99)}.${ri(0,99)}.${ri(0,999)}`,description:pick([
        `Optimized for ${suffix.toLowerCase()} neural workloads with enhanced ${prefix.toLowerCase()} integration.`,
        `Advanced synaptic scheduling and ${suffix.toLowerCase()} memory management.`,
        `Enterprise-grade ${prefix.toLowerCase()} deployment with ${suffix.toLowerCase()} resilience and auto-healing.`,
        `Real-time ${suffix.toLowerCase()} processing with ${prefix.toLowerCase()} kernel optimizations.`,
        `High-performance ${prefix.toLowerCase()} stack for ${suffix.toLowerCase()} compute pipelines.`
      ]),size_mb:ri(200,15000),price:pick(['Free','Pro','Lite','Server','Developer'].includes(suffix)?0:+(Math.random()*299+9.99).toFixed(2))});
    }
  }
  return d;
}

module.exports = { generateParts, generateDistros };
