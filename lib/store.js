const { generateParts, generateDistros } = require('./seed');

let parts = [];
let distros = [];
let nextPartId = 1;
let nextDistroId = 1;
let ready = false;

function init() {
  if (ready) return;
  parts = generateParts();
  distros = generateDistros();
  nextPartId = parts.length + 1;
  nextDistroId = distros.length + 1;
  ready = true;
}

function getParts(filter, limit, sort, countOnly, offset) {
  init();
  let results = [...parts];
  if (filter.id) return results.filter(p => p.id === filter.id);
  if (filter.category) results = results.filter(p => p.category === filter.category);
  if (filter.notCategory) results = results.filter(p => p.category !== filter.notCategory);
  if (filter.search) {
    const s = filter.search.toLowerCase();
    results = results.filter(p => p.name.toLowerCase().includes(s));
  }
  if (countOnly) return results.length;
  if (sort === 'price_asc') results.sort((a,b) => a.price - b.price);
  else if (sort === 'price_desc') results.sort((a,b) => b.price - a.price);
  else if (sort === 'name') results.sort((a,b) => a.name.localeCompare(b.name));
  else if (sort === 'RANDOM()') { for(let i=results.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[results[i],results[j]]=[results[j],results[i]];} }
  else results.sort((a,b) => b.id - a.id);
  if (offset) results = results.slice(offset);
  if (limit) results = results.slice(0, limit);
  return results;
}

function getDistros() { init(); return distros; }
function getDistroById(id) { init(); return distros.find(d => d.id === id); }

function addPart(name, category, price, specs) {
  init();
  const p = { id: nextPartId++, name, category, price, specs: specs||{}, stock:15 };
  parts.push(p);
  return p;
}

function removePart(id) {
  init();
  const i = parts.findIndex(p => p.id === id);
  if (i === -1) return false;
  parts.splice(i, 1);
  return true;
}

function searchParts(query, category) {
  return getParts({ search: query, category }, 10);
}

function checkCompat(idA, idB) {
  init();
  const a = parts.find(p => p.id === idA);
  const b = parts.find(p => p.id === idB);
  if (!a || !b) return { compatible:false, message:'One or both parts not found.' };
  const ok = a.category !== b.category;
  return { compatible:ok, message:ok?`${a.name} + ${b.name}: Neuro-compatible across subsystems.`:`Both are ${a.category} — neural bus conflict. One per cortical region.` };
}

function getStats() {
  init();
  const cats = {};
  parts.forEach(p => { cats[p.category] = (cats[p.category]||0)+1; });
  return { totalParts: parts.length, totalOS: distros.length, categories: Object.entries(cats).map(([category,count])=>({category,count})) };
}

function getPartsById(id) { init(); return parts.find(p => p.id === id) || null; }

module.exports = { getParts, getDistros, getDistroById, getPartsById, addPart, removePart, searchParts, checkCompat, getStats };
