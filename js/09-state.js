'use strict';
/* =====================================================================
   §11 — STATE MANAGER
   ===================================================================== */

function buildDefaultState(){
  return { version: 2, ingredients: buildSeedIngredients(), meals: [], log: [], priceAudit: [] };
}

const State = {
  current: null,
  load(){
    const stored = Storage.read(STORAGE_KEYS.STATE);
    if (!isObject(stored) || !isArray(stored.ingredients)){
      this.current = buildDefaultState();
      return this.current;
    }
    const ingredients = Catalog.hydrate(stored.ingredients);
    const validIds = new Set(ingredients.map(g => g.id));
    this.current = {
      version: 2, ingredients,
      meals: sanitizeMeals(stored.meals, validIds),
      log: isArray(stored.log) ? stored.log.slice(0, 200) : [],
      priceAudit: isArray(stored.priceAudit) ? stored.priceAudit.slice(0, 200) : []
    };
    return this.current;
  },
  save(){
    if (!this.current) return;
    const cfg = Config.get();
    if (cfg?.behavior?.autoSave === false) return;
    Storage.write(STORAGE_KEYS.STATE, this.current);
  },
  get(){ return this.current; },
  setMeals(meals){ this.current.meals = meals; this.save(); },
  addLog(entry){
    this.current.log.unshift(entry);
    if (this.current.log.length > 200) this.current.log.length = 200;
    this.save();
  },
  addPriceAudit(entry){
    this.current.priceAudit.unshift(entry);
    if (this.current.priceAudit.length > 200) this.current.priceAudit.length = 200;
    this.save();
  },
  reset(){
    this.current = buildDefaultState();
    Catalog.hydrate(this.current.ingredients);
    this.save();
  }
};

/* =====================================================================
   §12 — PROFILES
   ===================================================================== */

const Profiles = {
  list: [],
  load(){ this.list = Storage.read(STORAGE_KEYS.PROFILES, []) || []; return this.list; },
  save(){ Storage.write(STORAGE_KEYS.PROFILES, this.list); },
  add(name){
    const p = { id: newId('p'), name, createdAt: new Date().toISOString(), config: deepClone(Config.get()) };
    this.list.push(p); this.save(); return p;
  },
  remove(id){ this.list = this.list.filter(p => p.id !== id); this.save(); },
  get(id){ return this.list.find(p => p.id === id); },
  rename(id, name){ const p = this.get(id); if (p){ p.name = name; this.save(); } },
  loadIntoConfig(id){
    const p = this.get(id);
    if (!p) return false;
    Config.current = normalizeConfig(deepClone(p.config));
    Config.save();
    return true;
  }
};

