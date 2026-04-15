const categories = ['Synaptic Accelerators','Bio-Cooling','Cortical GPUs','Frontal Lobe CPUs','Memory Caches','Neuro-Link PSU'];

const catSpecs = {
  'Synaptic Accelerators': {
    prefixes: ['Axon','Dendrite','Synapse','Myelin','Node of','Vesicle','Receptor','Neurotransmitter','Gap-Junction','Ion-Channel','Nernst','Hodgkin-Huxley','Saltatory','Ranvier','Schwann','Oligodendrocyte','Action-Potential','Threshold','Refractory','Graded'],
    suffixes: ['Boost Module','Acceleration Core','Signal Amplifier','Pulse Driver','Response Enhancer','Transmission Unit','Firing Optimizer','Conduction Engine','Relay Processor','Cascade Accelerator','Velocity Stack','Impulse Modulator','Latency Killer','Throughput Expander','Bandwidth Multiplier','Timing Crystallizer','Phase Locker','Gain Controller','Spike Sorter','Burst Manager'],
    specKeys: ['Synaptic Latency','Signal Bandwidth','Firing Rate','Conduction Velocity','Channel Density','Refractory Period','Vesicle Count','Spike Precision']
  },
  'Bio-Cooling': {
    prefixes: ['Cerebrospinal','Meningeal','Arachnoid','Pia-Mater','Duramater','Ventricular','Choroid','Sagittal','Hypothermia','Thermo-','Cryo-','Frost-','Glacial','Tundra-','Arctic-','Vortex-','Subzero-','Absolute-','Quantum-','Entropy-'],
    suffixes: ['Coolant Loop','Thermal Exchanger','Heat Sink','Radiation Panel','Frost Diffuser','Chill Matrix','Freeze Block','Ice Cap Unit','Condensation Array','Sublimation Core','Evaporation Cell','Convection Tower','Dissipation Grid','Absorption Membrane','Rejection Turbine','Circulation Pump','Phase-Change Unit','Cryogenic Chamber','Thermal Paste Pad','Bypass Valve'],
    specKeys: ['Cooling Capacity','Flow Rate','Operating Temp','Thermal Resistance','Pump Pressure','Heat Dissipation','Noise Level','Efficiency Rating']
  },
  'Cortical GPUs': {
    prefixes: ['Occipital','Parietal','Temporal','Insular','Cingulate','Prefrontal','Visual','Auditory','Somatosensory','Motor','Association','Broca','Wernicke','Fusiform','Angular','Supramarginal','Precuneus','Calcarine','Lingual','Parahippocampal'],
    suffixes: ['Render Cortex','Vision Core','Pattern Unit','Depth Processor','Shading Cluster','Ray Engine','Tensor Slice','Raster Module','Shader Block','Pixel Matrix','Voxel Driver','Frame Weaver','Display Synthesizer','Color Interpreter','Edge Detector','Motion Tracker','Hologram Projector','Light Mapper','Shadow Caster','Anti-Aliaser'],
    specKeys: ['Neural Cores','VRAM Capacity','Render Throughput','Tensor Operations','Ray Tracing Units','Pixel Fill Rate','Memory Bandwidth']
  },
  'Frontal Lobe CPUs': {
    prefixes: ['Dorsolateral','Orbitofrontal','Ventromedial','Anterior','Brodmann','Betz','Pyramidal','Extrapyramidal','Basal','Thalamic','Hypothalamic','Subthalamic','Epithalamic','Pineal','Reticular','Limbic','Septal','Amygdaloid','Hippocampal','Mammillary'],
    suffixes: ['Executive Core','Decision Engine','Planning Processor','Logic Unit','Reasoning Module','Judgment Array','Inhibition Controller','Working-Memory Hub','Attention Director','Sequencer','Predictor','Abstractor','Categorizer','Inference Core','Strategy Unit','Forecast Engine','Evaluation Block','Priority Router','Conflict Resolver','Goal Scheduler'],
    specKeys: ['Core Count','Clock Speed','L1 Cache','L2 Cache','IPC Score','Thread Count','TDP','Fabrication Node']
  },
  'Memory Caches': {
    prefixes: ['Hippocampal','Long-Term','Short-Term','Episodic','Semantic','Procedural','Priming','Working','Explicit','Implicit','Declarative','Autobiographical','Prospective','Retrospective','Spatial','Recognition','Recall','Echoic','Iconic','Haptic'],
    suffixes: ['Storage Array','Retention Cell','Recall Module','Encoding Block','Consolidation Unit','Buffer Strip','Register File','Cache Line','Bank Module','Rank Unit','Channel Stick','DIMM Array','Stack Die','3D Layer','Persistent Hub','Volatile Cell','Flash Node','NVRAM Block','PCM Unit','MRAM Core'],
    specKeys: ['Capacity','Read Latency','Write Latency','Bandwidth','Frequency','CAS Latency','ECC Support','Channel Width']
  },
  'Neuro-Link PSU': {
    prefixes: ['Medullary','Pontine','Midbrain','Spinal','Vagal','Autonomic','Sympathetic','Parasympathetic','Enteric','Somatic','Efferent','Afferent','Interneuron','Motor-Neuron','Sensory-Neuron','Ganglionic','Plexus','Nucleus','Tract','Funiculus'],
    suffixes: ['Power Supply','Voltage Regulator','Current Stabilizer','Wattage Provider','Energy Cell','Charge Reserve','Surge Protector','UPS Module','Delivery Engine','Distribution Hub','Rail Splitter','Phase Controller','Load Balancer','Efficiency Optimizer','Conversion Matrix','Isolation Transformer','Capacitor Bank','Inductor Coil','Filter Array','Ground Plane'],
    specKeys: ['Wattage','Efficiency','Voltage Regulation','Ripple Noise','Protection Circuits','MTBF','Fan Profile','Peak Output']
  }
};

const osKernels = ['BrainKernel','NeuroCore','SynapseOS','CortexKernel','MindArch','ThoughtEngine','AxonCore','DendriteOS','MyelinRT','VesicleOS','CerebroKernel','EncephalonOS','GanglionCore','MeningeOS','VentricularOS','ChoroidKernel','HippocampOS','ThalamiCore','HypothalOS','ReticularOS'];
const osPrefixes = ['BrainOS','NeuroOS','CortexLinux','SynapticBSD','MindUnix','ThoughtOS','CognitiveOS','EncephalonOS','CerebralOS','PsychOS','MentalOS','NeuronOS','AxonOS','DendriteOS','MyelinOS','VesicleOS','GanglionOS','NerveOS','ReflexOS','PerceptOS'];
const osSuffixes = ['Ultimate','Enterprise','Neural','Pro','Lite','Server','Embedded','Real-Time','Quantum','Hybrid','Cloud','Edge','Studio','Developer','Secure','Parallel','Distributed','Autonomic','Cognitive','Predictive','LiteX','Ultra','Hyper','Max','Nano','Micro','Pico','Femto','Atto'];

function ri(a,b){return Math.floor(Math.random()*(b-a+1))+a}
function pick(a){return a[ri(0,a.length-1)]}

function genSpecs(cat) {
  const specs = {};
  catSpecs[cat].specKeys.forEach(k => {
    if(k.includes('Latency')) specs[k]=(Math.random()*15+0.5).toFixed(1)+' ns';
    else if(k.includes('Bandwidth')||k.includes('Rate')||k.includes('Throughput')||k.includes('Speed')||k.includes('Frequency')||k.includes('Fill Rate')) specs[k]=(Math.random()*500+50).toFixed(0)+' GHz';
    else if(k.includes('Capacity')||k.includes('VRAM')) specs[k]=ri(1,128)+' TB';
    else if(k.includes('Core')||k.includes('Count')||k.includes('Units')||k.includes('Thread')) specs[k]=ri(1,256);
    else if(k.includes('Wattage')||k.includes('TDP')||k.includes('Peak')) specs[k]=ri(50,2000)+' W';
    else if(k.includes('Efficiency')) specs[k]=(Math.random()*30+70).toFixed(1)+'%';
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
    else specs[k]=ri(85,100)+'%';
  });
  return specs;
}

function randPrice(cat) {
  const r={'Synaptic Accelerators':[49,899],'Bio-Cooling':[29,599],'Cortical GPUs':[199,2999],'Frontal Lobe CPUs':[149,1999],'Memory Caches':[39,799],'Neuro-Link PSU':[59,499]};
  const[lo,hi]=r[cat]; return +(lo+Math.random()*(hi-lo)).toFixed(2);
}

function generateParts() {
  const parts = [];
  let id = 1;
  const seen = new Set();
  for (const cat of categories) {
    const{prefixes,suffixes}=catSpecs[cat];
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
    ['CryoSpinal Liquid Array','Bio-Cooling',499.99],['ThermoNerve Frostbite 3000','Bio-Cooling',799.99],
    ['Occipital Titan RTX','Cortical GPUs',2999.99],['Fusiform Hologram Pro','Cortical GPUs',1899.99],
    ['Dorsolateral Quantum X','Frontal Lobe CPUs',1999.99],['Brodmann Hexacore Pro','Frontal Lobe CPUs',1599.99],
    ['Hippocampal Persistent 64TB','Memory Caches',799.99],['Semantic NVRAM Quantum','Memory Caches',699.99],
    ['Medullary 2000W Platinum','Neuro-Link PSU',499.99],['Autonomic Surge Shield Pro','Neuro-Link PSU',399.99]
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
  const seen = new Set();
  for(const prefix of osPrefixes){
    for(const suffix of osSuffixes){
      const n=`${prefix} ${suffix}`;
      if(seen.has(n))continue;seen.add(n);
      d.push({id:id++,name:n,version:`${ri(1,99)}.${ri(0,99)}.${ri(0,999)}`,kernel:`${pick(osKernels)} ${ri(1,99)}.${ri(0,99)}.${ri(0,999)}`,description:pick([
        `Optimized for ${suffix.toLowerCase()} neural workloads with enhanced ${prefix.toLowerCase()} integration.`,
        `Advanced synaptic scheduling and ${suffix.toLowerCase()} memory management protocols.`,
        `Enterprise-grade ${prefix.toLowerCase()} deployment with ${suffix.toLowerCase()} resilience and auto-healing.`,
        `Real-time ${suffix.toLowerCase()} processing with ${prefix.toLowerCase()} kernel optimizations.`,
        `High-performance ${prefix.toLowerCase()} stack for ${suffix.toLowerCase()} compute pipelines.`,
        `Secure ${suffix.toLowerCase()} enclave architecture on ${prefix.toLowerCase()} primitives.`
      ]),size_mb:ri(200,15000),price:pick(['Free','Pro','Lite','Server','Developer'].includes(suffix)?0:+(Math.random()*299+9.99).toFixed(2))});
    }
  }
  const extra=[
    ['BrainOS Quantum Entangled','1.0.0','BrainKernel 1.0.0','Quantum-entangled neural processing for instantaneous cross-brain communication.',2048,499.99],
    ['CortexLinux ThoughtForm','42.0.0','CortexKernel 42.0.0','Thought-driven interface that turns abstract ideas into compiled neural pathways.',4096,299.99],
    ['SynapticBSD DreamState','7.0.0','SynapseOS 7.0.0','Dream-state processing for subconscious computation during rest cycles.',8192,199.99],
    ['NeuroOS Omniscient','99.9.9','NeuroCore 99.9.9','Every neuron connected, every thought parallel.',16384,999.99],
    ['MindUnix Singularity','3.14.159','MindArch 3.14.159','Recursive self-improving neural loops approaching singularity.',32000,1499.99],
    ['CognitiveOS Enlightenment','8.0.8','ThoughtEngine 8.0.8','Zero-latency self-aware computation pipeline.',6400,799.99]
  ];
  for(const[n,v,k,desc,sz,p] of extra){if(seen.has(n))continue;seen.add(n);d.push({id:id++,name:n,version:v,kernel:k,description:desc,size_mb:sz,price:p});}
  return d;
}

module.exports = { generateParts, generateDistros };
