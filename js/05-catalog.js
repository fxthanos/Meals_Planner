'use strict';
/* =====================================================================
   §5 — CATALOG MANAGER
   ===================================================================== */

function buildSeedIngredients(){
  return SEED_DATA.map(([id, nameAr, price]) => {
    const meta = SEED_META[id] || {};
    return {
      id, nameAr, price,
      unit: meta.unit || '', classification: meta.classification || '',
      category: meta.category || '',
      specialRules: (meta.specialRules || []).slice(),
      family: meta.family || '',
      nutrition: meta.nutrition ? { ...meta.nutrition } : { sugar:'low', sodium:'low' }
    };
  });
}

function sanitizeMeals(meals, validIds){
  if (!isArray(meals)) return [];
  const maxQ = Config.get()?.quantityDefaults?.maxQty ?? 20;
  return meals.filter(m => isObject(m) && isArray(m.items)).map((m, idx) => ({
    id: isStr(m.id) ? m.id : `meal-${idx}`,
    nameAr: `وجبة ${idx + 1}`,
    items: m.items.filter(it => isObject(it) && validIds.has(it.id))
      .map(it => ({ id: it.id, qty: clamp(parseInt(it.qty, 10) || 1, 1, maxQ) }))
  }));
}

const Catalog = {
  list: [], index: new Map(),
  rebuild(){ this.index = new Map(); this.list.forEach(i => this.index.set(i.id, i)); },
  get(id){ return this.index.get(id); },
  has(id){ return this.index.has(id); },

  hydrate(savedList){
    const seeded = buildSeedIngredients();
    if (!isArray(savedList)) { this.list = seeded; this.rebuild(); return this.list; }

    const savedMap = new Map();
    savedList.forEach(x => { if (isObject(x) && x.id) savedMap.set(x.id, x); });

    const merged = seeded.map(s => {
      const p = savedMap.get(s.id);
      if (!p) return s;
      /* للشيبسي والشويبس: احترم البذرة دائمًا (لأن التصنيف مهم) */
      const forceSeed = (s.id === 'i21' || s.id === 'i30');
      const family = forceSeed ? s.family : ((isStr(p.family) && p.family) || s.family);
      const classification = (isStr(p.classification) && p.classification) || s.classification;
      const category = (isStr(p.category) && p.category) || s.category;
      const unit = (isStr(p.unit) && p.unit) || s.unit;
      const savedRules = isArray(p.specialRules)
        ? p.specialRules.filter(t => ALL_TAGS.indexOf(t) !== -1) : [];
      const mergedRules = forceSeed
        ? s.specialRules.slice()
        : [...new Set([...savedRules, ...s.specialRules])];
      const nutrition = isObject(p.nutrition) ? { ...s.nutrition, ...p.nutrition } : { ...s.nutrition };
      return {
        id: s.id, nameAr: isStr(p.nameAr) ? p.nameAr : s.nameAr,
        price: isNum(p.price) ? round2(p.price) : s.price,
        unit, classification, category,
        specialRules: mergedRules, family, nutrition
      };
    });

    savedList.forEach(p => {
      if (!isObject(p) || !p.id) return;
      if (seeded.some(s => s.id === p.id)) return;
      merged.push({
        id: String(p.id),
        nameAr: isStr(p.nameAr) ? p.nameAr : `مكوّن ${p.id}`,
        price: isNum(p.price) ? round2(p.price) : 0,
        unit: isStr(p.unit) ? p.unit : '',
        classification: isStr(p.classification) ? p.classification : '',
        category: isStr(p.category) ? p.category : '',
        specialRules: isArray(p.specialRules) ? p.specialRules.filter(t => ALL_TAGS.indexOf(t) !== -1) : [],
        family: isStr(p.family) ? p.family : '',
        nutrition: isObject(p.nutrition) ? p.nutrition : { sugar:'low', sodium:'low' }
      });
    });

    this.list = merged;
    this.rebuild();
    return this.list;
  },

  add(ingredient){
    if (!isObject(ingredient) || !ingredient.id) return false;
    if (this.has(ingredient.id)) return false;
    this.list.push(ingredient);
    this.rebuild();
    return true;
  },
  remove(id){
    const before = this.list.length;
    this.list = this.list.filter(i => i.id !== id);
    this.rebuild();
    const lims = Config.get()?.ingredientUsageLimits;
    if (lims && id in lims) delete lims[id];
    return this.list.length < before;
  },
  reset(){ this.list = buildSeedIngredients(); this.rebuild(); },
  nextId(){
    let maxN = 0;
    this.list.forEach(g => {
      const m = String(g.id).match(/^i(\d+)$/);
      if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
    });
    return 'i' + String(maxN + 1).padStart(2, '0');
  }
};

/* =====================================================================
   §6 — DERIVATIONS
   ===================================================================== */

function effectiveFamily(ing){
  if (!ing) return '';
  if (ing.family) return ing.family;
  for (const tag of (ing.specialRules || [])){
    if (FAMILY_FROM_TAG[tag]) return FAMILY_FROM_TAG[tag];
  }
  return '';
}

function isCheese(id){
  const cfg = Config.get();
  if (cfg.cheeseIds.includes(id)) return true;
  const ing = Catalog.get(id);
  return !!ing && ing.specialRules.includes('counts_as_cheese');
}

/* الشيبسي: يُعرَّف عبر cfg.chips.ids فقط. لا علاقة له بالشويبس. */
function isChips(id){
  const cfg = Config.get();
  return cfg.chips.ids.includes(id);
}

function getUsageLimit(id){
  const cfg = Config.get();
  const v = cfg.ingredientUsageLimits?.[id];
  if (v == null) return Infinity;
  const n = Number(v);
  if (!isNum(n) || n < 0) return Infinity;
  return Math.floor(n);
}

function itemCost(item){
  const ing = Catalog.get(item.id);
  return ing ? ing.price * item.qty : 0;
}
function itemsCost(items){ return round2(items.reduce((s, it) => s + itemCost(it), 0)); }

