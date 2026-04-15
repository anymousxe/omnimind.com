const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data', 'cortex.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    specs TEXT NOT NULL,
    stock INTEGER DEFAULT 15,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS os_distros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    kernel TEXT NOT NULL,
    description TEXT NOT NULL,
    size_mb INTEGER NOT NULL,
    price REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_parts_category ON parts(category);
  CREATE INDEX IF NOT EXISTS idx_parts_name ON parts(name);
`);

const categories = [
  'Synaptic Accelerators',
  'Bio-Cooling',
  'Cortical GPUs',
  'Frontal Lobe CPUs',
  'Memory Caches',
  'Neuro-Link PSU'
];

const catSpecs = {
  'Synaptic Accelerators': {
    prefixes: ['Axon','Dendrite','Synapse','Myelin','Node of','Vesicle','Receptor','Neurotransmitter','Gap-Junction','Ion-Channel','Nernst','Hodgkin-Huxley','Saltatory','Ranvier','Schwann','Oligodendrocyte','Action-Potential','Threshold','Refractory','Graded'],
    suffixes: ['Boost Module','Acceleration Core','Signal Amplifier','Pulse Driver','Response Enhancer','Transmission Unit','Firing Optimizer','Conduction Engine','Relay Processor','Cascade Accelerator','Velocity Stack','Impulse Modulator','Latency Killer','Throughput Expander','Bandwidth Multiplier','Timing Crystallizer','Phase Locker','Gain Controller','Spike Sorter','Burst Manager'],
    specKeys: ['Synaptic Latency','Signal Bandwidth','Axon Diameter','Firing Rate','Conduction Velocity','Channel Density','Refractory Period','Vesicle Count','Neurotransmitter Yield','Spike Precision']
  },
  'Bio-Cooling': {
    prefixes: ['Cerebrospinal','Meningeal','Arachnoid','Pia-Mater','Duramater','Ventricular','Choroid','Sagittal','Hypothermia','Thermo-','Cryo-','Frost-','Glacial','Tundra-','Arctic-','Vortex-','Subzero-','Absolute-','Quantum-','Entropy-'],
    suffixes: ['Coolant Loop','Thermal Exchanger','Heat Sink','Radiation Panel','Frost Diffuser','Chill Matrix','Freeze Block','Ice Cap Unit','Condensation Array','Sublimation Core','Evaporation Cell','Convection Tower','Dissipation Grid','Absorption Membrane','Rejection Turbine','Circulation Pump','Phase-Change Unit','Cryogenic Chamber','Thermal Paste Pad','Bypass Valve'],
    specKeys: ['Cooling Capacity','Flow Rate','Operating Temp','Thermal Resistance','Pump Pressure','Coolant Volume','Heat Dissipation','Noise Level','Efficiency Rating','Ambient Delta']
  },
  'Cortical GPUs': {
    prefixes: ['Occipital','Parietal','Temporal','Insular','Cingulate','Prefrontal','Visual','Auditory','Somatosensory','Motor','Association','Broca','Wernicke','Fusiform','Angular','Supramarginal','Precuneus','Calcarine','Lingual','Parahippocampal'],
    suffixes: ['Render Cortex','Vision Core','Pattern Unit','Depth Processor','Shading Cluster','Ray Engine','Tensor Slice','Raster Module','Shader Block','Pixel Matrix','Voxel Driver','Frame Weaver','Display Synthesizer','Color Interpreter','Edge Detector','Motion Tracker','Hologram Projector','Light Mapper','Shadow Caster','Anti-Aliaser'],
    specKeys: ['Neural Cores','VRAM Capacity','Render Throughput','Tensor Operations','Ray Tracing Units','Pixel Fill Rate','Texture Rate','FP16 Performance','INT8 Throughput','Memory Bandwidth']
  },
  'Frontal Lobe CPUs': {
    prefixes: ['Dorsolateral','Orbitofrontal','Ventromedial','Anterior','Brodmann','Betz','Pyramidal','Extrapyramidal','Basal','Thalamic','Hypothalamic','Subthalamic','Epithalamic','Pineal','Reticular','Limbic','Septal','Amygdaloid','Hippocampal','Mammillary'],
    suffixes: ['Executive Core','Decision Engine','Planning Processor','Logic Unit','Reasoning Module','Judgment Array','Inhibition Controller','Working-Memory Hub','Attention Director','Sequencer','Predictor','Abstractor','Categorizer','Inference Core','Strategy Unit','Forecast Engine','Evaluation Block','Priority Router','Conflict Resolver','Goal Scheduler'],
    specKeys: ['Core Count','Clock Speed','L1 Cache','L2 Cache','L3 Cache','IPC Score','Thread Count','TDP','Instruction Set','Fabrication Node']
  },
  'Memory Caches': {
    prefixes: ['Hippocampal','Long-Term','Short-Term','Episodic','Semantic','Procedural','Priming','Working','Explicit','Implicit','Declarative','Autobiographical','Prospective','Retrospective','Spatial','Recognition','Recall','Echoic','Iconic','Haptic'],
    suffixes: ['Storage Array','Retention Cell','Recall Module','Encoding Block','Consolidation Unit','Buffer Strip','Register File','Cache Line','Bank Module','Rank Unit','Channel Stick','DIMM Array','Stack Die','3D Layer','Persistent Hub','Volatile Cell','Flash Node','NVRAM Block','PCM Unit','MRAM Core'],
    specKeys: ['Capacity','Read Latency','Write Latency','Bandwidth','Frequency','CAS Latency','Timings','ECC Support','Channel Width','Refresh Rate']
  },
  'Neuro-Link PSU': {
    prefixes: ['Medullary','Pontine','Midbrain','Spinal','Vagal','Autonomic','Sympathetic','Parasympathetic','Enteric','Somatic','Efferent','Afferent','Interneuron','Motor-Neuron','Sensory-Neuron','Ganglionic','Plexus','Nucleus','Tract','Funiculus'],
    suffixes: ['Power Supply','Voltage Regulator','Current Stabilizer','Wattage Provider','Energy Cell','Charge Reserve','Surge Protector','UPS Module','Delivery Engine','Distribution Hub','Rail Splitter','Phase Controller','Load Balancer','Efficiency Optimizer','Conversion Matrix','Isolation Transformer','Capacitor Bank','Inductor Coil','Filter Array','Ground Plane'],
    specKeys: ['Wattage','Efficiency','Voltage Regulation','Ripple Noise','Protection Circuits','MTBF','Fan Profile','Modularity','Rail Count','Peak Output']
  }
};

const osKernels = ['BrainKernel','NeuroCore','SynapseOS','CortexKernel','MindArch','ThoughtEngine','AxonCore','DendriteOS','MyelinRT','VesicleOS','CerebroKernel','EncephalonOS','GanglionCore','MeningeOS','VentricularOS','ChoroidKernel','HippocampOS','ThalamiCore','HypothalOS','ReticularOS'];

const osPrefixes = ['BrainOS','NeuroOS','CortexLinux','SynapticBSD','MindUnix','ThoughtOS','CognitiveOS','EncephalonOS','CerebralOS','PsychOS','MentalOS','NeuronOS','AxonOS','DendriteOS','MyelinOS','VesicleOS','GanglionOS','NerveOS','ReflexOS','PerceptOS'];

const osSuffixes = ['Ultimate','Enterprise','Neural','Pro','Lite','Server','Embedded','Real-Time','Quantum','Hybrid','Cloud','Edge','Studio','Developer','Secure','Parallel','Distributed','Autonomic','Cognitive','Predictive','LiteX','Ultra','Hyper','Max','Nano','Micro','Pico','Femto','Atto'];

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randChoice(arr) { return arr[randInt(0, arr.length - 1)]; }
function randPrice(cat) {
  const ranges = {
    'Synaptic Accelerators': [49, 899],
    'Bio-Cooling': [29, 599],
    'Cortical GPUs': [199, 2999],
    'Frontal Lobe CPUs': [149, 1999],
    'Memory Caches': [39, 799],
    'Neuro-Link PSU': [59, 499]
  };
  const [lo, hi] = ranges[cat];
  return +(lo + Math.random() * (hi - lo)).toFixed(2);
}

function genSpecs(cat) {
  const keys = catSpecs[cat].specKeys;
  const specs = {};
  keys.forEach(k => {
    if (k.includes('Latency')) specs[k] = (Math.random() * 15 + 0.5).toFixed(1) + ' ns';
    else if (k.includes('Bandwidth') || k.includes('Rate') || k.includes('Throughput') || k.includes('Speed') || k.includes('Frequency') || k.includes('Fill Rate')) specs[k] = (Math.random() * 500 + 50).toFixed(0) + ' GHz';
    else if (k.includes('Capacity') || k.includes('Volume') || k.includes('VRAM')) specs[k] = randInt(1, 128) + ' TB';
    else if (k.includes('Core') || k.includes('Count') || k.includes('Units') || k.includes('Rail') || k.includes('Channel')) specs[k] = randInt(1, 256);
    else if (k.includes('Wattage') || k.includes('TDP') || k.includes('Peak')) specs[k] = randInt(50, 2000) + ' W';
    else if (k.includes('Efficiency')) specs[k] = (Math.random() * 30 + 70).toFixed(1) + '%';
    else if (k.includes('Temp') || k.includes('Delta')) specs[k] = '-' + randInt(10, 273) + '°C';
    else if (k.includes('Noise')) specs[k] = randInt(0, 45) + ' dB';
    else if (k.includes('Pressure')) specs[k] = randInt(1, 500) + ' kPa';
    else if (k.includes('Fabrication')) specs[k] + randInt(1, 7) + ' nm';
    else if (k.includes('IPC')) specs[k] = (Math.random() * 10 + 5).toFixed(1);
    else if (k.includes('MTBF')) specs[k] = randInt(100, 999) + 'k hrs';
    else if (k.includes('Diameter')) specs[k] = (Math.random() * 20 + 0.5).toFixed(1) + ' μm';
    else if (k.includes('Vesicle') || k.includes('Channel Density') || k.includes('Yield')) specs[k] = randInt(100, 50000) + ' units';
    else if (k.includes('Period') || k.includes('Refresh')) specs[k] = (Math.random() * 5 + 0.1).toFixed(2) + ' ms';
    else if (k.includes('Timings')) specs[k] = `${randInt(14,36)}-${randInt(16,38)}-${randInt(16,38)}-${randInt(28,50)}`;
    else if (k.includes('Support')) specs[k] = Math.random() > 0.5 ? 'Yes' : 'No';
    else if (k.includes('Width')) specs[k] = randInt(64, 512) + '-bit';
    else if (k.includes('Modularity')) specs[k] = Math.random() > 0.5 ? 'Full' : 'Semi';
    else if (k.includes('Profile')) specs[k] = randChoice(['Silent','Balanced','Performance','Custom']);
    else if (k.includes('Circuits')) specs[k] = randChoice(['OVP,OCP,SCP,OTP','OVP,OCP,SCP','OVP,SCP,OTP','Full Suite']);
    else if (k.includes('Ripple')) specs[k] = (Math.random() * 100 + 10).toFixed(0) + ' mV';
    else if (k.includes('Regulation')) specs[k] = '±' + (Math.random() * 3 + 0.5).toFixed(1) + '%';
    else if (k.includes('Precision') || specs[k] === undefined) specs[k] = randInt(85, 100) + '%';
  });
  return specs;
}

function seedParts() {
  const insert = db.prepare('INSERT INTO parts (name, category, price, specs, stock) VALUES (?, ?, ?, ?, ?)');
  const seen = new Set();

  for (const cat of categories) {
    const { prefixes, suffixes } = catSpecs[cat];
    for (const p of prefixes) {
      for (const s of suffixes) {
        const name = `${p} ${s}`;
        if (seen.has(name)) continue;
        seen.add(name);
        const price = randPrice(cat);
        const specs = JSON.stringify(genSpecs(cat));
        const stock = randInt(0, 50);
        insert.run(name, cat, price, specs, stock);
      }
    }
  }

  const extras = [
    ['NeuroFlux X-9000','Synaptic Accelerators',1299.99],['Quantum Synapse Bridge','Synaptic Accelerators',2499.99],
    ['Ultra-Dendrite Turbo','Synaptic Accelerators',899.99],['Omega Pulse Driver Pro','Synaptic Accelerators',1599.99],
    ['CryoSpinal Liquid Array','Bio-Cooling',499.99],['ThermoNerve Frostbite 3000','Bio-Cooling',799.99],
    ['Arachnoid Vortex X','Bio-Cooling',349.99],['Subzero Meninge Cooler','Bio-Cooling',599.99],
    ['Occipital Titan RTX','Cortical GPUs',2999.99],['Fusiform Hologram Pro','Cortical GPUs',1899.99],
    ['Precuneus Ray Engine Ultra','Cortical GPUs',2299.99],['Visual Cortex Quantum','Cortical GPUs',3499.99],
    ['Dorsolateral Quantum X','Frontal Lobe CPUs',1999.99],['Brodmann Hexacore Pro','Frontal Lobe CPUs',1599.99],
    ['Pyramidal Decision Titan','Frontal Lobe CPUs',1899.99],['Thalamic Executive Ultra','Frontal Lobe CPUs',2199.99],
    ['Hippocampal Persistent 64TB','Memory Caches',799.99],['Semantic NVRAM Quantum','Memory Caches',699.99],
    ['Episodic 3D Stack 32TB','Memory Caches',549.99],['Working Cache DDR7-12800','Memory Caches',449.99],
    ['Medullary 2000W Platinum','Neuro-Link PSU',499.99],['Autonomic Surge Shield Pro','Neuro-Link PSU',399.99],
    ['Vagal Isolation Transformer','Neuro-Link PSU',449.99],['Spinal Energy Cell 2500W','Neuro-Link PSU',549.99]
  ];

  for (const [name, cat, price] of extras) {
    if (seen.has(name)) continue;
    seen.add(name);
    insert.run(name, cat, price, JSON.stringify(genSpecs(cat)), randInt(0, 50));
  }

  return seen.size;
}

function seedOS() {
  const insert = db.prepare('INSERT INTO os_distros (name, version, kernel, description, size_mb, price) VALUES (?, ?, ?, ?, ?, ?)');
  const seen = new Set();

  for (const prefix of osPrefixes) {
    for (const suffix of osSuffixes) {
      const name = `${prefix} ${suffix}`;
      if (seen.has(name)) continue;
      seen.add(name);
      const version = `${randInt(1,99)}.${randInt(0,99)}.${randInt(0,999)}`;
      const kernel = `${randChoice(osKernels)} ${randInt(1,99)}.${randInt(0,99)}.${randInt(0,999)}`;
      const descriptions = [
        `Optimized for ${suffix.toLowerCase()} neural workloads with enhanced ${prefix.toLowerCase()} integration.`,
        `Features advanced synaptic scheduling and ${suffix.toLowerCase()} memory management protocols.`,
        `Enterprise-grade ${prefix.toLowerCase()} deployment with ${suffix.toLowerCase()} resilience and auto-healing.`,
        `Real-time ${suffix.toLowerCase()} processing with ${prefix.toLowerCase()} kernel optimizations.`,
        `High-performance ${prefix.toLowerCase()} stack designed for ${suffix.toLowerCase()} compute pipelines.`,
        `Secure ${suffix.toLowerCase()} enclave architecture built on ${prefix.toLowerCase()} primitives.`,
        `Distributed ${prefix.toLowerCase()} mesh networking with ${suffix.toLowerCase()} failover support.`,
        `Lightweight ${suffix.toLowerCase()} deployment with full ${prefix.toLowerCase()} API compatibility.`
      ];
      const desc = randChoice(descriptions);
      const size = randInt(200, 15000);
      const price = +(['Free','Free','Free'].includes(suffix) ? 0 : (Math.random() * 299 + 9.99)).toFixed(2);
      insert.run(name, version, kernel, desc, size, price);
    }
  }

  const extraDistros = [
    ['BrainOS Quantum Entangled','1.0.0','BrainKernel 1.0.0','Quantum-entangled neural processing for instantaneous cross-brain communication.',2048,499.99],
    ['CortexLinux ThoughtForm','42.0.0','CortexKernel 42.0.0','Thought-driven interface layer that turns abstract ideas into compiled neural pathways.',4096,299.99],
    ['SynapticBSD DreamState','7.0.0','SynapseOS 7.0.0','Dream-state processing for subconscious neural computation during rest cycles.',8192,199.99],
    ['NeuroOS Omniscient','99.9.9','NeuroCore 99.9.9','Full omniscient mode - every neuron connected, every thought parallel.',16384,999.99],
    ['MindUnix Singularity','3.14.159','MindArch 3.14.159','Approaches technological singularity through recursive self-improving neural loops.',32000,1499.99],
    ['CognitiveOS Enlightenment','8.0.8','ThoughtEngine 8.0.8','Achieves neural enlightenment - zero-latency self-aware computation pipeline.',6400,799.99],
    ['EncephalonOS HyperCortex','2.7.182','EncephalonOS 2.7.182','Multi-cortex parallel deployment for hyper-intelligent distributed processing.',12800,599.99],
    ['CerebralOS Nirvana','4.0.4','CerebralOS 4.0.4','Nirvana state kernel - complete neural harmony and zero-conflict scheduling.',2560,349.99]
  ];

  for (const [name, ver, kernel, desc, size, price] of extraDistros) {
    if (seen.has(name)) continue;
    seen.add(name);
    insert.run(name, ver, kernel, desc, size, price);
  }

  return seen.size;
}

const partCount = seedParts();
const osCount = seedOS();
console.log(`Seeded ${partCount} parts and ${osCount} OS distros.`);
db.close();
