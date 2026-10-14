'use strict';
/* =====================================================================
   §1 — CONSTANTS & TYPES
   ===================================================================== */

const STORAGE_KEYS = Object.freeze({
  STATE:    'mealsPlanner.state.v2',
  CONFIG:   'mealsPlanner.config.v5',
  PROFILES: 'mealsPlanner.profiles.v1'
});

const SEED_DATA = Object.freeze([
  ['i01','باكو شورتي ساده', 11.00],
  ['i02','باتيه', 7.20],
  ['i03','بار حلاوه 40 جرام', 4.31],
  ['i04','بسكويت 4 قطع', 3.50],
  ['i05','بسكويت شاتو', 22.10],
  ['i06','بورشن طحينه', 4.20],
  ['i07','تمر', 9.00],
  ['i08','تونه قطع 185جرام', 65.00],
  ['i09','جبن اسبريد', 31.00],
  ['i10','جبنه دومتي (طبيعى) 250 جرام', 40.00],
  ['i11','جبنه دومتي (نباتى) 125 جرام', 10.95],
  ['i12','جبنه رومي 50 جرام', 13.50],
  ['i13','جبنه قريش 100 جرام', 10.00],
  ['i14','حلاوه اسبريد', 25.00],
  ['i15','حلاوه البوادى', 21.00],
  ['i16','خبز', 2.00],
  ['i17','خيار + طماطم', 5.00],
  ['i18','زبادو 200 مللى', 12.32],
  ['i19','زبادو 400 مللى', 20.68],
  ['i20','سلطه', 7.00],
  ['i21','عبوه شويبس 240 مللى', 11.59],
  ['i22','عسل ابيض 225 جرام', 40.37],
  ['i23','عسل أسود 350 جرام', 20.27],
  ['i24','عصير بيتى 200 ملم', 5.33],
  ['i25','علبه بسكويت 46 جرام', 27.30],
  ['i26','علبه جبنه مثلثات (8 قطع)', 29.36],
  ['i27','فطير 350 جرام', 19.00],
  ['i28','فول 400 جرام', 15.17],
  ['i29','قطعه جبنه مثلثات', 3.67],
  ['i30','كيس شيبسي', 5.00],
  ['i31','مربى 230 جرام', 23.10],
  ['i32','مربي 100 جرام', 6.34],
  ['i33','هوهوز كيك', 40.00]
]);

/* i21 = مشروب غازي مستقل. i30 = كيس شيبسي مطلوب في كل وجبة. */
const SEED_META = Object.freeze({
  i01:{ classification:'snack',     category:'بسكويت مالح',     unit:'باكو',           family:'',               specialRules:[],                                                nutrition:{sugar:'low',sodium:'high'} },
  i02:{ classification:'pastry',    category:'معجنات',          unit:'قطعة',           family:'',               specialRules:[],                                                nutrition:{sugar:'low',sodium:'high'} },
  i03:{ classification:'sweet',     category:'حلويات',          unit:'بار 40 جرام',    family:'',               specialRules:[],                                                nutrition:{sugar:'high',sodium:'low'} },
  i04:{ classification:'sweet',     category:'بسكويت',          unit:'كيس 4 قطع',      family:'biscuit',        specialRules:['biscuit_family'],                                nutrition:{sugar:'medium',sodium:'low'} },
  i05:{ classification:'sweet',     category:'بسكويت',          unit:'باكو',           family:'biscuit',        specialRules:['biscuit_family'],                                nutrition:{sugar:'high',sodium:'low'} },
  i06:{ classification:'other',     category:'طحينة',           unit:'بورشن',          family:'',               specialRules:['tahini_only_with_black_honey'],                  nutrition:{sugar:'low',sodium:'low'} },
  i07:{ classification:'fruit',     category:'فواكه',           unit:'حصة',            family:'',               specialRules:[],                                                nutrition:{sugar:'high',sodium:'low'} },
  i08:{ classification:'protein',   category:'معلبات',          unit:'علبة 185 جرام',  family:'',               specialRules:[],                                                nutrition:{sugar:'low',sodium:'high'} },
  i09:{ classification:'dairy',     category:'جبن مطحون',       unit:'برطمان',         family:'',               specialRules:[],                                                nutrition:{sugar:'low',sodium:'high'} },
  i10:{ classification:'dairy',     category:'جبن طبيعي',       unit:'علبة 250 جرام',  family:'',               specialRules:[],                                                nutrition:{sugar:'low',sodium:'high'} },
  i11:{ classification:'dairy',     category:'جبن نباتي',       unit:'علبة 125 جرام',  family:'',               specialRules:[],                                                nutrition:{sugar:'low',sodium:'high'} },
  i12:{ classification:'dairy',     category:'جبن رومي',        unit:'قطعة 50 جرام',   family:'',               specialRules:[],                                                nutrition:{sugar:'low',sodium:'high'} },
  i13:{ classification:'dairy',     category:'جبن قريش',        unit:'علبة 100 جرام',  family:'',               specialRules:[],                                                nutrition:{sugar:'low',sodium:'medium'} },
  i14:{ classification:'sweet',     category:'حلاوة طحينية',    unit:'برطمان',         family:'',               specialRules:[],                                                nutrition:{sugar:'high',sodium:'low'} },
  i15:{ classification:'sweet',     category:'حلاوة طحينية',    unit:'علبة',           family:'',               specialRules:[],                                                nutrition:{sugar:'high',sodium:'low'} },
  i16:{ classification:'bread',     category:'خبز',             unit:'رغيف',           family:'bread',          specialRules:['bread_family'],                                  nutrition:{sugar:'low',sodium:'medium'} },
  i17:{ classification:'vegetable', category:'خضروات طازجة',    unit:'حصة',            family:'',               specialRules:[],                                                nutrition:{sugar:'low',sodium:'low'} },
  i18:{ classification:'beverage',  category:'مشروب زبادي',     unit:'علبة 200 مل',    family:'yogurt',         specialRules:['yogurt_family'],                                 nutrition:{sugar:'medium',sodium:'low'} },
  i19:{ classification:'beverage',  category:'مشروب زبادي',     unit:'علبة 400 مل',    family:'yogurt',         specialRules:['yogurt_family'],                                 nutrition:{sugar:'medium',sodium:'low'} },
  i20:{ classification:'vegetable', category:'سلطة',            unit:'علبة',           family:'',               specialRules:['required_with_beans','required_with_tuna'],      nutrition:{sugar:'low',sodium:'medium'} },
  /* شويبس: مشروب غازي مستقل تمامًا — لا علاقة له بالشيبسي */
  i21:{ classification:'beverage',  category:'مشروب غازي',      unit:'عبوة 240 مل',    family:'',               specialRules:[],                                                nutrition:{sugar:'medium',sodium:'high'} },
  i22:{ classification:'sweet',     category:'عسل أبيض',        unit:'برطمان 225 جرام',family:'honey',          specialRules:['honey_family'],                                  nutrition:{sugar:'high',sodium:'low'} },
  i23:{ classification:'sweet',     category:'عسل أسود',        unit:'برطمان 350 جرام',family:'honey',          specialRules:['honey_family'],                                  nutrition:{sugar:'high',sodium:'low'} },
  i24:{ classification:'beverage',  category:'عصير',            unit:'علبة 200 مل',    family:'juice',          specialRules:['juice_family'],                                  nutrition:{sugar:'high',sodium:'low'} },
  i25:{ classification:'sweet',     category:'بسكويت',          unit:'علبة 46 جرام',   family:'biscuit',        specialRules:['biscuit_family'],                                nutrition:{sugar:'high',sodium:'low'} },
  i26:{ classification:'dairy',     category:'جبن مثلثات',      unit:'علبة 8 قطع',     family:'triangle_cheese',specialRules:['counts_as_cheese'],                              nutrition:{sugar:'low',sodium:'high'} },
  i27:{ classification:'pastry',    category:'فطير',            unit:'علبة 350 جرام',  family:'pastry',         specialRules:['pastry_family'],                                 nutrition:{sugar:'low',sodium:'high'} },
  i28:{ classification:'protein',   category:'بقوليات',         unit:'علبة 400 جرام',  family:'',               specialRules:[],                                                nutrition:{sugar:'low',sodium:'high'} },
  i29:{ classification:'dairy',     category:'جبن مثلثات',      unit:'قطعة',           family:'triangle_cheese',specialRules:['counts_as_cheese','required_with_beans','required_with_tuna','required_with_jam'], nutrition:{sugar:'low',sodium:'high'} },
  /* شيبسي: مقرمشات — مطلوب في كل وجبة. لا علاقة له بالشويبس. */
  i30:{ classification:'snack',     category:'شيبسي',           unit:'كيس',            family:'',               specialRules:[],                                                nutrition:{sugar:'low',sodium:'high'} },
  i31:{ classification:'sweet',     category:'مربى',            unit:'برطمان 230 جرام',family:'jam',            specialRules:['jam_family'],                                    nutrition:{sugar:'high',sodium:'low'} },
  i32:{ classification:'sweet',     category:'مربى',            unit:'برطمان 100 جرام',family:'jam',            specialRules:['jam_family'],                                    nutrition:{sugar:'high',sodium:'low'} },
  i33:{ classification:'sweet',     category:'كيك',             unit:'قطعة',           family:'',               specialRules:[],                                                nutrition:{sugar:'high',sodium:'low'} }
});

const ALL_TAGS = Object.freeze([
  'forbidden_with_fasting','required_with_beans','required_with_tuna','required_with_jam',
  'tahini_only_with_black_honey','counts_as_cheese','honey_family',
  'jam_family','yogurt_family','bread_family','pastry_family','biscuit_family','juice_family'
]);

const TAG_LABELS = Object.freeze({
  forbidden_with_fasting:'ممنوع مع الصيام', required_with_beans:'مطلوب مع الفول',
  required_with_tuna:'مطلوب مع التونة', required_with_jam:'مطلوب مع المربى',
  tahini_only_with_black_honey:'طحينة مع العسل الأسود فقط', counts_as_cheese:'يُحتسب كجبن',
  honey_family:'عائلة العسل', jam_family:'عائلة المربى',
  yogurt_family:'عائلة مشروب الزبادي', bread_family:'عائلة الخبز', pastry_family:'عائلة المعجنات',
  biscuit_family:'عائلة البسكويت', juice_family:'عائلة العصير'
});

const FAMILY_FROM_TAG = Object.freeze({
  honey_family:'honey', jam_family:'jam',
  yogurt_family:'yogurt', bread_family:'bread', pastry_family:'pastry',
  biscuit_family:'biscuit', juice_family:'juice'
});

const CLASSIFICATIONS = Object.freeze([
  {v:'',l:'غير محدد – يتطلب إدخال المستخدم'},
  {v:'protein',l:'بروتين'},{v:'carb',l:'كربوهيدرات'},{v:'dairy',l:'ألبان'},
  {v:'sweet',l:'حلويات'},{v:'snack',l:'سناكس'},{v:'vegetable',l:'خضروات'},
  {v:'fruit',l:'فواكه'},{v:'beverage',l:'مشروبات'},{v:'bread',l:'خبز'},
  {v:'pastry',l:'معجنات'},{v:'other',l:'أخرى'}
]);

const RULE_NAMES = Object.freeze({
  R1:'التكوين', R2:'التغطية', R3:'الشيبسي', R4:'الخبز/الفطير',
  R5:'مجموعات الاستبعاد', R6:'السلطة/الخيار', R7:'جبنة المثلثات',
  R8:'الطحينة', F1:'التكلفة', F2:'الهدف', NUT:'التوازن'
});

const MEAL_RULE_ORDER = Object.freeze(['R1','R3','R4','R5','R6','R7','R8','NUT','F1']);

const CUSTOM_RULE_TYPES = Object.freeze({
  exclusiveGroup:{ label:'مجموعة استبعاد', hint:'لا يجتمع أكثر من عنصر واحد من هذه المجموعة' },
  forbidPair:{ label:'منع ثنائي', hint:'عنصران لا يجتمعان أبدًا' },
  forbidWith:{ label:'منع شرطي', hint:'عنصر ممنوع عند وجود أي من المُشغِّلات' },
  requireWith:{ label:'إلزام شرطي', hint:'عند وجود أي من المُشغِّلات، تُضاف العناصر المطلوبة' },
  allowOnlyWith:{ label:'سماح مشروط', hint:'عنصر مسموح فقط مع عناصر محددة' }
});

const SEVERITY = Object.freeze({ ERROR:'error', WARNING:'warning', INFO:'info' });


'use strict';
/* =====================================================================
   §2 — UTILITIES
   ===================================================================== */

const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
function formatMoney(amount, cfg){
  const dp = cfg?.decimalPlaces ?? 2;
  const cur = cfg?.currencyLabel ?? 'ج.م';
  return round2(Number(amount) || 0).toFixed(dp) + ' ' + cur;
}
function formatSigned(amount, cfg){
  const v = round2(Number(amount) || 0);
  const dp = cfg?.decimalPlaces ?? 2;
  return (v > 0 ? '+' : '') + v.toFixed(dp);
}
function escapeHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
function rngFrom(seed){
  let a = seed | 0;
  return function(){
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const newId = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
const isObject = v => v && typeof v === 'object' && !Array.isArray(v);
const isArray = Array.isArray;
const isNum = v => typeof v === 'number' && isFinite(v);
const isStr = v => typeof v === 'string';
function clamp(n, min, max){
  const v = Number(n);
  if (!isNum(v)) return min;
  return Math.max(min, Math.min(max, v));
}
function deepClone(obj){ return JSON.parse(JSON.stringify(obj)); }
function deepMerge(target, source){
  if (!isObject(source)) return target;
  Object.keys(source).forEach(k => {
    /* ponytail: block prototype pollution from imported JSON */
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') return;
    const sv = source[k];
    if (isArray(sv)) target[k] = sv.slice();
    else if (isObject(sv)){
      if (!isObject(target[k])) target[k] = {};
      deepMerge(target[k], sv);
    } else target[k] = sv;
  });
  return target;
}
function countBy(arr, pred){ return arr.reduce((n, x) => n + (pred(x) ? 1 : 0), 0); }
function countMealsWith(meals, id){ return countBy(meals, m => m.items.some(x => x.id === id)); }
function downloadJson(filename, obj){
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function readJsonFile(file, onParsed, onError){
  const reader = new FileReader();
  reader.onload = () => {
    try { onParsed(JSON.parse(String(reader.result))); }
    catch(e){ if (onError) onError(e); }
  };
  reader.onerror = () => { if (onError) onError(new Error('read')); };
  reader.readAsText(file, 'utf-8');
}
/* ponytail: single gate for destructive confirms; respects behavior.confirmDestructive */
function confirmDestructive({ title, body, confirmLabel, danger = true, run }){
  if (Config.get().behavior.confirmDestructive === false) return void run();
  UI.showModal({ title, body, confirmLabel, danger, onConfirm: run });
}
function describeCustomRule(rule){
  const spec = rule.spec || {};
  const nm = id => Catalog.get(id)?.nameAr || id;
  if (rule.type === 'exclusiveGroup') return (spec.items || []).map(nm).join('، ') || '—';
  if (rule.type === 'forbidPair') return `«${nm(spec.a) || '؟'}» غير متوافق مع «${nm(spec.b) || '؟'}»`;
  if (rule.type === 'forbidWith') return `«${nm(spec.target) || '؟'}» غير متوافق مع ${(spec.triggers || []).map(nm).join('، ')}`;
  if (rule.type === 'requireWith') return `إذا وُجد: ${(spec.triggers || []).map(nm).join('، ')} → أضف: ${(spec.thenAdd || []).map(t => `${nm(t.id)} × ${t.qty || 1}`).join('، ')}`;
  if (rule.type === 'allowOnlyWith') return `«${nm(spec.target) || '؟'}» مسموح فقط مع ${(spec.allowedWith || []).map(nm).join('، ')}`;
  return '';
}
/* ponytail: normalize+save+log+render after any manual meal mutation */
function mutateMeal(mi, scopeLabel, fn){
  const meal = State.current.meals[mi];
  if (!meal) return;
  if (fn(meal) === false) return;
  Generation.normalizeBread(meal.items);
  State.save();
  const r = Validation.meal(meal);
  UI.logValidation(`وجبة ${mi + 1} (${scopeLabel})`, { ok: r.ok, violations: r.violations });
  render();
}


'use strict';
/* =====================================================================
   §3 — STORAGE LAYER
   ===================================================================== */

const Storage = {
  read(key, fallback = null){
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch(e){ console.warn('Storage read failed:', key, e); return fallback; }
  },
  write(key, value){
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch(e){ console.error('Storage write failed:', key, e); return false; }
  },
  remove(key){ try { localStorage.removeItem(key); } catch(e){} },
  clearAll(){
    [STORAGE_KEYS.STATE, STORAGE_KEYS.CONFIG, STORAGE_KEYS.PROFILES].forEach(k => this.remove(k));
  }
};


'use strict';
/* =====================================================================
   §4 — CONFIG MANAGER
   ===================================================================== */

function buildDefaultConfig(){
  return {
    version: 5,
    appName: 'مخطط الوجبات', planName: 'الخطة',
    currencyLabel: 'ج.م', decimalPlaces: 2,
    mealCount: 12, minIngredientsPerMeal: 7, seed: 1234567, requireCoverage: true,
    minMealCost: 72.00, maxMealCost: 144.40, targetMealAvg: 114.40,
    generation: {
      maxSeedAttempts: 16, maxMealAttempts: 400,
      maxTuneIterations: 600,
      targetTolerance: 0.01, pastryProbability: 0.15
    },
    quantityDefaults: { defaultQty: 1, maxQty: 20 },
    behavior: {
      autoSave: true, confirmDestructive: true,
      enableAnimations: true, toastDurationMs: 3200
    },
    rulesEnabled: {
      R1:true, R2:true, R3:true, R4:true, R5:true, R6:true,
      R7:true, R8:true, F1:true, NUT:true
    },
    bread: { id:'i16', pastryId:'i27', qtyWithPastry:2, qtyWithoutPastry:4 },
    /* الشيبسي: مطلوب في كل وجبة، عنصر واحد بالضبط. لا علاقة له بالشويبس. */
    chips: { ids:['i30'], required:true, exactlyOne:true },
    salad: { id:'i20', requiredWith:['i28','i08'] },
    cucumber: { id:'i17', forbiddenWith:['i28','i08'], requiresCheese:true },
    triangleCheese: { id:'i29', boxId:'i26', qty:2, triggers:['i28','i08','i31','i32'] },
    tahini: { id:'i06', requiresId:'i23' },
    cheeseIds: ['i26','i29'],
    exclusiveGroups: [
      ['i28','i08','i22','i23'],
      ['i31','i32','i22','i23'],
      ['i27','i28','i08'],
      ['i04','i05','i25'],
      ['i14','i15','i22','i23']
    ],
    ingredientUsageLimits: { 'i27': 1, 'i08': 1, 'i28': 1 },
    nutritionBalance: {
      enabled: true,
      /* ponytail: caps 1 made target 114 unreachable (verified: null plan); 2 left tuna/beans uncovered; 3 = full green */
      perMeal: { enabled: true, maxHighSugar: 3, maxHighSodium: 3 },
      planWide: { enabled: true, minRatio: 0.8, maxRatio: 1.2 },
      noDuplicateTopCategory: true
    },
    customRules: [],
    display: {
      showRuleChips: true, showBreakdown: true, showViolations: true,
      showDeviation: true
    }
  };
}

const REQUIRED_EXCLUSIVE_GROUPS = [['i04','i05','i25'], ['i14','i15','i22','i23']];

/* فرض قائمة الشيبسي: فقط i30 (بدون i21 الشويبس) + تفعيل R3 */
function enforceChipsInvariant(cfg){
  if (!isObject(cfg.chips)) cfg.chips = { ids:['i30'], required:true, exactlyOne:true };
  if (!isArray(cfg.chips.ids)) cfg.chips.ids = ['i30'];
  cfg.chips.ids = cfg.chips.ids.filter(id => id !== 'i21');
  if (!cfg.chips.ids.includes('i30')) cfg.chips.ids.push('i30');
  cfg.chips.required = true;
  cfg.chips.exactlyOne = true;
  if (cfg.rulesEnabled) cfg.rulesEnabled.R3 = true;
  return cfg;
}

function normalizeConfig(stored){
  const def = buildDefaultConfig();
  if (!isObject(stored)) return def;
  const merged = deepMerge(deepClone(def), stored);

  delete merged.pastryProbability;
  delete merged.maxMealsWithPastry;

  merged.mealCount = clamp(merged.mealCount, 1, 50);
  merged.minIngredientsPerMeal = clamp(merged.minIngredientsPerMeal, 1, 30);
  merged.decimalPlaces = clamp(merged.decimalPlaces, 0, 4);
  merged.minMealCost = Math.max(0, round2(Number(merged.minMealCost) || 0));
  merged.maxMealCost = Math.max(merged.minMealCost, round2(Number(merged.maxMealCost) || 0));
  merged.targetMealAvg = Math.max(0, round2(Number(merged.targetMealAvg) || 0));

  const g = merged.generation;
  g.maxSeedAttempts = clamp(g.maxSeedAttempts, 1, 100);
  g.maxMealAttempts = clamp(g.maxMealAttempts, 10, 5000);
  g.maxTuneIterations = clamp(g.maxTuneIterations, 10, 5000);
  g.pastryProbability = clamp(g.pastryProbability, 0, 1);
  g.targetTolerance = clamp(g.targetTolerance, 0, 10);

  merged.quantityDefaults.defaultQty = clamp(merged.quantityDefaults.defaultQty, 1, 50);
  merged.quantityDefaults.maxQty = clamp(merged.quantityDefaults.maxQty, 1, 50);
  merged.behavior.toastDurationMs = clamp(merged.behavior.toastDurationMs, 500, 20000);

  merged.bread.qtyWithPastry = clamp(merged.bread.qtyWithPastry, 0, 20);
  merged.bread.qtyWithoutPastry = clamp(merged.bread.qtyWithoutPastry, 0, 20);
  merged.triangleCheese.qty = clamp(merged.triangleCheese.qty, 0, 20);
  merged.nutritionBalance.perMeal.maxHighSugar = clamp(merged.nutritionBalance.perMeal.maxHighSugar, 0, 10);
  merged.nutritionBalance.perMeal.maxHighSodium = clamp(merged.nutritionBalance.perMeal.maxHighSodium, 0, 10);
  merged.nutritionBalance.planWide.minRatio = Math.max(0, Number(merged.nutritionBalance.planWide.minRatio) || 0);
  merged.nutritionBalance.planWide.maxRatio = Math.max(merged.nutritionBalance.planWide.minRatio, Number(merged.nutritionBalance.planWide.maxRatio) || 0);

  enforceChipsInvariant(merged);

  if (!isArray(merged.exclusiveGroups)) merged.exclusiveGroups = def.exclusiveGroups.map(g => g.slice());
  REQUIRED_EXCLUSIVE_GROUPS.forEach(bg => {
    const exists = merged.exclusiveGroups.some(g =>
      isArray(g) && g.length === bg.length && bg.every(id => g.indexOf(id) !== -1));
    if (!exists) merged.exclusiveGroups.push(bg.slice());
  });

  if (!isArray(merged.customRules)) merged.customRules = [];
  if (!isArray(merged.cheeseIds)) merged.cheeseIds = def.cheeseIds.slice();
  if (!isObject(merged.ingredientUsageLimits)) merged.ingredientUsageLimits = {};

  return merged;
}

const Config = {
  current: null,
  load(){
    const stored = Storage.read(STORAGE_KEYS.CONFIG);
    this.current = normalizeConfig(stored);
    return this.current;
  },
  save(){
    if (!this.current) return;
    /* ponytail: settings edits are explicit — always persist (incl. the autoSave
       toggle itself). autoSave gates State/Profiles auto-writes only. */
    if (!Storage.write(STORAGE_KEYS.CONFIG, this.current)) UI.toast('تعذّر حفظ البيانات', 'err');
  },
  get(){ return this.current; },
  set(path, value){
    const parts = path.split('.');
    let obj = this.current;
    for (let i = 0; i < parts.length - 1; i++){
      if (!isObject(obj[parts[i]])) obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;
    enforceChipsInvariant(this.current);
    this.save();
  },
  reset(){ this.current = buildDefaultConfig(); this.save(); }
};


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


'use strict';
/* =====================================================================
   §7 — RULES REGISTRY
   ===================================================================== */

const BUILTIN_RULES = {
  R1_COMPOSITION: {
    id: 'R1',
    validate(meal, ctx){
      if (!ctx.config.rulesEnabled.R1) return [];
      const v = [];
      const items = meal.items;
      const cfg = ctx.config;
      if (items.length < cfg.minIngredientsPerMeal){
        v.push({ code:'R1_COUNT', ruleId:'R1', severity:SEVERITY.ERROR,
          messageAr:`عدد المكونات ${items.length} أقل من الحد الأدنى ${cfg.minIngredientsPerMeal}` });
      }
      const ids = items.map(i => i.id);
      if (new Set(ids).size !== ids.length){
        v.push({ code:'R1_DUP', ruleId:'R1', severity:SEVERITY.ERROR, messageAr:'يوجد مكوّن مكرر داخل الوجبة' });
      }
      const seen = new Map();
      items.forEach(it => {
        const ing = Catalog.get(it.id);
        if (!ing) return;
        const f = effectiveFamily(ing);
        if (!f) return;
        if (seen.has(f)) v.push({ code:'R1_FAMILY', ruleId:'R1', severity:SEVERITY.ERROR,
          messageAr:`تعارض عائلات: «${seen.get(f)}» مع «${ing.nameAr}»` });
        else seen.set(f, ing.nameAr);
      });
      return v;
    },
    canAdd(itemId, items, ctx){
      if (!ctx.config.rulesEnabled.R1) return true;
      const f = effectiveFamily(Catalog.get(itemId));
      if (!f) return true;
      return !items.some(it => {
        const g = Catalog.get(it.id);
        return g && effectiveFamily(g) === f;
      });
    }
  },

  /* R3 — الشيبسي: واحد بالضبط من cfg.chips.ids في كل وجبة.
     لا علاقة له بالشويبس (i21) لأنه ليس ضمن chips.ids. */
  R3_CHIPS: {
    id: 'R3',
    validate(meal, ctx){
      if (!ctx.config.rulesEnabled.R3) return [];
      const v = [];
      const chipsIds = ctx.config.chips.ids;
      const chipsItems = meal.items.filter(it => chipsIds.includes(it.id));
      if (ctx.config.chips.required && chipsItems.length === 0){
        const names = chipsIds.map(id => Catalog.get(id)?.nameAr || id).join('، ');
        v.push({ code:'R3_MISSING', ruleId:'R3', severity:SEVERITY.ERROR,
          messageAr:`لا يوجد «${names}» — مطلوب واحد بالضبط في كل وجبة` });
      }
      if (ctx.config.chips.exactlyOne && chipsItems.length > 1){
        v.push({ code:'R3_MULTI', ruleId:'R3', severity:SEVERITY.ERROR,
          messageAr:`عدد أكياس الشيبسي ${chipsItems.length} والمطلوب واحد بالضبط` });
      }
      return v;
    },
    canAdd(itemId, items, ctx){
      if (!ctx.config.chips.ids.includes(itemId)) return true;
      return !items.some(it => ctx.config.chips.ids.includes(it.id));
    }
  },

  R4_BREAD: {
    id: 'R4',
    validate(meal, ctx){
      if (!ctx.config.rulesEnabled.R4) return [];
      const cfg = ctx.config.bread;
      const breadItem = meal.items.find(it => it.id === cfg.id);
      const breadQty = breadItem ? breadItem.qty : 0;
      const hasPastry = meal.items.some(it => it.id === cfg.pastryId);
      const expected = hasPastry ? cfg.qtyWithPastry : cfg.qtyWithoutPastry;
      if (breadQty !== expected){
        const breadName = Catalog.get(cfg.id)?.nameAr || cfg.id;
        return [{ code:'R4_BREAD', ruleId:'R4', severity:SEVERITY.ERROR,
          messageAr:`كمية «${breadName}» يجب أن تكون ${expected}${hasPastry ? ' مع الفطير' : ' بدون فطير'} (الحالي ${breadQty})` }];
      }
      return [];
    }
  },

  R5_EXCLUSIVE_GROUPS: {
    id: 'R5',
    validate(meal, ctx){
      if (!ctx.config.rulesEnabled.R5) return [];
      const v = [];
      const ids = meal.items.map(i => i.id);
      ctx.config.exclusiveGroups.forEach((grp, i) => {
        if (!isArray(grp)) return;
        const present = grp.filter(id => ids.includes(id));
        if (present.length > 1){
          const names = present.map(id => Catalog.get(id)?.nameAr || id);
          v.push({ code:`R5_GRP${i}`, ruleId:'R5', severity:SEVERITY.ERROR,
            messageAr:`لا يجوز الجمع بين أكثر من واحد من: ${names.join('، ')}` });
        }
      });
      return v;
    },
    canAdd(itemId, items, ctx){
      for (const grp of ctx.config.exclusiveGroups){
        if (!isArray(grp)) continue;
        if (grp.includes(itemId) && items.some(it => grp.includes(it.id))) return false;
      }
      return true;
    }
  },

  R6_SALAD_CUCUMBER: {
    id: 'R6',
    validate(meal, ctx){
      if (!ctx.config.rulesEnabled.R6) return [];
      const v = [];
      const ids = meal.items.map(i => i.id);
      const cfg = ctx.config;
      const hasBeansOrTuna = cfg.salad.requiredWith.some(id => ids.includes(id));
      if (hasBeansOrTuna){
        if (!ids.includes(cfg.salad.id)) v.push({ code:'R6_SALAD', ruleId:'R6', severity:SEVERITY.ERROR,
          messageAr:'السلطة مطلوبة عند وجود الفول أو التونة' });
        if (ids.includes(cfg.cucumber.id)) v.push({ code:'R6_CUCUMBER', ruleId:'R6', severity:SEVERITY.ERROR,
          messageAr:'«خيار + طماطم» ممنوع عند وجود الفول أو التونة' });
      } else if (cfg.cucumber.requiresCheese && ids.includes(cfg.cucumber.id)){
        const hasCheese = meal.items.some(it => isCheese(it.id));
        if (!hasCheese) v.push({ code:'R6_NO_CHEESE', ruleId:'R6', severity:SEVERITY.ERROR,
          messageAr:'«خيار + طماطم» مسموح فقط عند وجود جبن' });
      }
      return v;
    },
    canAdd(itemId, items, ctx){
      const cfg = ctx.config;
      const ids = items.map(it => it.id);
      if (itemId === cfg.cucumber.id){
        if (cfg.cucumber.forbiddenWith.some(fid => ids.includes(fid))) return false;
        if (cfg.cucumber.requiresCheese && !items.some(it => isCheese(it.id))) return false;
      }
      return true;
    }
  },

  R7_TRIANGLE_CHEESE: {
    id: 'R7',
    validate(meal, ctx){
      if (!ctx.config.rulesEnabled.R7) return [];
      const cfg = ctx.config.triangleCheese;
      const triPiece = meal.items.find(it => it.id === cfg.id);
      const triggered = cfg.triggers.some(id => meal.items.some(it => it.id === id));
      const name = Catalog.get(cfg.id)?.nameAr || cfg.id;
      if (triggered){
        if (!triPiece) return [{ code:'R7_MISSING', ruleId:'R7', severity:SEVERITY.ERROR,
          messageAr:`مطلوب ${cfg.qty} من «${name}»` }];
        if (triPiece.qty !== cfg.qty) return [{ code:'R7_QTY', ruleId:'R7', severity:SEVERITY.ERROR,
          messageAr:`كمية «${name}» يجب أن تكون ${cfg.qty} بالضبط (الحالي ${triPiece.qty})` }];
      }
      return [];
    },
    canAdd(itemId, items, ctx){
      const cfg = ctx.config.triangleCheese;
      if (cfg.triggers.includes(itemId) && items.some(it => it.id === cfg.boxId)) return false;
      if (itemId === cfg.boxId && items.some(it => cfg.triggers.includes(it.id))) return false;
      return true;
    }
  },

  R8_TAHINI: {
    id: 'R8',
    validate(meal, ctx){
      if (!ctx.config.rulesEnabled.R8) return [];
      const cfg = ctx.config.tahini;
      const ids = meal.items.map(i => i.id);
      if (ids.includes(cfg.id) && !ids.includes(cfg.requiresId)){
        const tName = Catalog.get(cfg.id)?.nameAr || cfg.id;
        const rName = Catalog.get(cfg.requiresId)?.nameAr || cfg.requiresId;
        return [{ code:'R8_TAHINI', ruleId:'R8', severity:SEVERITY.ERROR,
          messageAr:`«${tName}» مسموح فقط مع «${rName}»` }];
      }
      return [];
    },
    canAdd(itemId, items, ctx){
      const cfg = ctx.config.tahini;
      if (itemId === cfg.id && !items.some(it => it.id === cfg.requiresId)) return false;
      return true;
    }
  },

  NUT_BALANCE: {
    id: 'NUT',
    /* perMeal يعدّ high فقط؛ planWide يعدّ high+medium — مقصود: صرامة داخل الوجبة، تسامح على مستوى الخطة */
    validate(meal, ctx){
      const nb = ctx.config.nutritionBalance;
      if (!nb?.enabled || !nb.perMeal?.enabled || !ctx.config.rulesEnabled.NUT) return [];
      const v = [];
      const items = meal.items.map(it => Catalog.get(it.id)).filter(Boolean);
      const highSugar = items.filter(i => i.nutrition?.sugar === 'high');
      const highSodium = items.filter(i => i.nutrition?.sodium === 'high');
      if (highSugar.length > nb.perMeal.maxHighSugar){
        v.push({ code:'NUT_SUGAR', ruleId:'NUT', severity:SEVERITY.WARNING,
          messageAr:`عدد المكونات عالية السكر ${highSugar.length} يتجاوز الحد ${nb.perMeal.maxHighSugar}` });
      }
      if (highSodium.length > nb.perMeal.maxHighSodium){
        v.push({ code:'NUT_SODIUM', ruleId:'NUT', severity:SEVERITY.WARNING,
          messageAr:`عدد المكونات عالية الصوديوم ${highSodium.length} يتجاوز الحد ${nb.perMeal.maxHighSodium}` });
      }
      if (nb.noDuplicateTopCategory){
        if (highSugar.length > 1) v.push({ code:'NUT_SUGAR_DUP', ruleId:'NUT', severity:SEVERITY.WARNING,
          messageAr:`لا يجتمع أكثر من سكري عالٍ: ${highSugar.map(i => i.nameAr).join('، ')}` });
        if (highSodium.length > 1) v.push({ code:'NUT_SODIUM_DUP', ruleId:'NUT', severity:SEVERITY.WARNING,
          messageAr:`لا يجتمع أكثر من مالح عالٍ: ${highSodium.map(i => i.nameAr).join('، ')}` });
      }
      return v;
    },
    canAdd(itemId, items, ctx){
      const nb = ctx.config.nutritionBalance;
      if (!nb?.enabled || !nb.perMeal?.enabled) return true;
      const ing = Catalog.get(itemId);
      if (!ing?.nutrition) return true;
      if (ing.nutrition.sugar === 'high'){
        const count = countBy(items, it => Catalog.get(it.id)?.nutrition?.sugar === 'high');
        if (count >= nb.perMeal.maxHighSugar) return false;
      }
      if (ing.nutrition.sodium === 'high'){
        const count = countBy(items, it => Catalog.get(it.id)?.nutrition?.sodium === 'high');
        if (count >= nb.perMeal.maxHighSodium) return false;
      }
      return true;
    }
  },

  F1_COST: {
    id: 'F1',
    validate(meal, ctx){
      const cfg = ctx.config;
      const cost = itemsCost(meal.items);
      if (cost < cfg.minMealCost) return [{ code:'F1_BELOW', ruleId:'F1', severity:SEVERITY.ERROR,
        messageAr:`تكلفة الوجبة ${formatMoney(cost, cfg)} أقل من الحد الأدنى ${formatMoney(cfg.minMealCost, cfg)}` }];
      if (cost > cfg.maxMealCost) return [{ code:'F1_ABOVE', ruleId:'F1', severity:SEVERITY.ERROR,
        messageAr:`تكلفة الوجبة ${formatMoney(cost, cfg)} تتجاوز الحد الأقصى ${formatMoney(cfg.maxMealCost, cfg)}` }];
      return [];
    }
  }
};

/* =====================================================================
   §8 — CUSTOM RULES ENGINE
   ===================================================================== */

const CustomRules = {
  active(){ return (Config.get().customRules || []).filter(r => r.enabled !== false); },
  all(){ return Config.get().customRules || []; },

  blocks(items, candidateId){
    const has = id => items.some(x => x.id === id);
    for (const rule of this.active()){
      const spec = rule.spec || {};
      if (rule.type === 'exclusiveGroup'){
        const list = isArray(spec.items) ? spec.items : [];
        if (list.includes(candidateId) && list.some(id => has(id))) return true;
      }
      if (rule.type === 'forbidPair'){
        if (spec.a === candidateId && has(spec.b)) return true;
        if (spec.b === candidateId && has(spec.a)) return true;
      }
      if (rule.type === 'forbidWith'){
        const triggers = isArray(spec.triggers) ? spec.triggers : [];
        if (spec.target === candidateId && triggers.some(id => has(id))) return true;
        if (triggers.includes(candidateId) && has(spec.target)) return true;
      }
      if (rule.type === 'allowOnlyWith'){
        if (spec.target === candidateId){
          const allowedWith = isArray(spec.allowedWith) ? spec.allowedWith : [];
          if (allowedWith.length && !allowedWith.some(id => has(id))) return true;
        }
      }
    }
    return false;
  },

  requiredAdditions(items, candidateId){
    const has = id => items.some(x => x.id === id);
    const additions = [];
    for (const rule of this.active()){
      if (rule.type !== 'requireWith') continue;
      const spec = rule.spec || {};
      const triggers = isArray(spec.triggers) ? spec.triggers : [];
      const thenAdd = isArray(spec.thenAdd) ? spec.thenAdd : [];
      const fired = triggers.includes(candidateId) || triggers.some(id => has(id));
      if (!fired) continue;
      thenAdd.forEach(t => {
        if (!t?.id) return;
        const qty = Math.max(1, parseInt(t.qty, 10) || 1);
        if (!items.some(x => x.id === t.id) && !additions.some(a => a.id === t.id)){
          additions.push({ id: t.id, qty });
        }
      });
    }
    return additions;
  },

  violations(items){
    const out = [];
    const has = id => items.some(x => x.id === id);
    const nameOf = id => Catalog.get(id)?.nameAr || `؟ ${id}`;

    this.all().forEach(rule => {
      if (rule.enabled === false) return;
      const severity = rule.severity || SEVERITY.ERROR;
      const rname = rule.name || CUSTOM_RULE_TYPES[rule.type]?.label || rule.type;
      const spec = rule.spec || {};

      if (rule.type === 'exclusiveGroup'){
        const present = (spec.items || []).filter(id => has(id));
        if (present.length > 1) out.push({ code:`CR_${rule.id}`, ruleId:'CUSTOM', severity,
          messageAr:`[${rname}] لا يجوز الجمع بين أكثر من واحد من: ${present.map(nameOf).join('، ')}` });
      }
      if (rule.type === 'forbidPair'){
        if (has(spec.a) && has(spec.b)) out.push({ code:`CR_${rule.id}`, ruleId:'CUSTOM', severity,
          messageAr:`[${rname}] «${nameOf(spec.a)}» و«${nameOf(spec.b)}» لا يجتمعان` });
      }
      if (rule.type === 'forbidWith'){
        const triggers = (spec.triggers || []).filter(id => has(id));
        if (triggers.length && has(spec.target)) out.push({ code:`CR_${rule.id}`, ruleId:'CUSTOM', severity,
          messageAr:`[${rname}] «${nameOf(spec.target)}» ممنوع مع: ${triggers.map(nameOf).join('، ')}` });
      }
      if (rule.type === 'requireWith'){
        const triggers = (spec.triggers || []).filter(id => has(id));
        if (triggers.length){
          const missing = (spec.thenAdd || []).filter(t => !has(t.id));
          if (missing.length) out.push({ code:`CR_${rule.id}`, ruleId:'CUSTOM', severity,
            messageAr:`[${rname}] مطلوب عند وجود ${triggers.map(nameOf).join('، ')}: ${missing.map(m => `${nameOf(m.id)} × ${m.qty || 1}`).join('، ')}` });
        }
      }
      if (rule.type === 'allowOnlyWith'){
        if (has(spec.target)){
          const allowedWith = (spec.allowedWith || []).filter(id => has(id));
          if (allowedWith.length === 0) out.push({ code:`CR_${rule.id}`, ruleId:'CUSTOM', severity,
            messageAr:`[${rname}] «${nameOf(spec.target)}» مسموح فقط مع: ${(spec.allowedWith || []).map(nameOf).join('، ')}` });
        }
      }
    });
    return out;
  }
};


'use strict';
/* =====================================================================
   §9 — VALIDATION ENGINE
   ===================================================================== */

const Validation = {
  meal(meal){
    const cfg = Config.get();
    const v = [];
    meal.items.forEach(it => {
      if (!Catalog.has(it.id)) v.push({ code:'MISSING', ruleId:'DATA', severity:SEVERITY.ERROR,
        messageAr:`مكوّن غير موجود في الكتالوج: ${it.id}` });
    });
    Object.values(BUILTIN_RULES).forEach(rule => {
      if (!rule.validate) return;
      if (!cfg.rulesEnabled[rule.id]) return;
      v.push(...rule.validate(meal, { config: cfg, catalog: Catalog }));
    });
    v.push(...CustomRules.violations(meal.items));

    const cost = itemsCost(meal.items);
    const costStatus = cost < cfg.minMealCost ? 'below' : cost > cfg.maxMealCost ? 'above' : 'within';
    const breakdown = meal.items.map(it => {
      const ing = Catalog.get(it.id);
      if (!ing) return null;
      return { ingredientId: it.id, nameAr: ing.nameAr, unitPrice: ing.price, qty: it.qty,
        lineTotal: round2(ing.price * it.qty) };
    }).filter(Boolean);

    return { ok: v.filter(x => x.severity === SEVERITY.ERROR).length === 0,
      violations: v, cost, costStatus, breakdown };
  },

  plan(meals){
    const cfg = Config.get();
    const v = [];
    if (meals.length !== cfg.mealCount){
      v.push({ code:'PLAN_COUNT', ruleId:'R1', severity:SEVERITY.ERROR,
        messageAr:`عدد الوجبات ${meals.length} والمطلوب ${cfg.mealCount}` });
    }
    meals.forEach((m, i) => {
      const r = this.meal(m);
      r.violations.forEach(x => v.push({ ...x, messageAr:`وجبة ${i+1}: ${x.messageAr}` }));
    });
    const used = new Set();
    meals.forEach(m => m.items.forEach(it => used.add(it.id)));
    let missing = [];
    if (cfg.requireCoverage && cfg.rulesEnabled.R2){
      missing = Catalog.list.filter(g => !used.has(g.id));
      if (missing.length) v.push({ code:'R2_COVERAGE', ruleId:'R2', severity:SEVERITY.ERROR,
        messageAr:`مكونات غير مغطاة (${missing.length}): ${missing.map(m => m.nameAr).join('، ')}` });
    }
    const counts = {};
    meals.forEach(m => m.items.forEach(it => { counts[it.id] = (counts[it.id] || 0) + 1; }));
    Object.keys(cfg.ingredientUsageLimits || {}).forEach(id => {
      const limit = getUsageLimit(id);
      if (limit === Infinity) return;
      const c = counts[id] || 0;
      if (c > limit) v.push({ code:`LIMIT_${id}`, ruleId:'R1', severity:SEVERITY.WARNING,
        messageAr:`«${Catalog.get(id)?.nameAr || id}» يظهر في ${c} وجبة والحد الأقصى ${limit}` });
    });
    if (cfg.nutritionBalance?.enabled && cfg.nutritionBalance.planWide?.enabled && cfg.rulesEnabled.NUT){
      let sugar = 0, sodium = 0;
      meals.forEach(m => m.items.forEach(it => {
        const ing = Catalog.get(it.id);
        if (!ing?.nutrition) return;
        if (['high','medium'].includes(ing.nutrition.sugar)) sugar++;
        if (['high','medium'].includes(ing.nutrition.sodium)) sodium++;
      }));
      if (sugar || sodium){
        const ratio = sodium > 0 ? sugar / sodium : Infinity;
        const { minRatio, maxRatio } = cfg.nutritionBalance.planWide;
        if (ratio < minRatio) v.push({ code:'NUT_RATIO_LOW', ruleId:'NUT', severity:SEVERITY.WARNING,
          messageAr:`نسبة السكري/الصوديوم ${ratio.toFixed(2)} أقل من الحد ${minRatio}` });
        else if (ratio > maxRatio) v.push({ code:'NUT_RATIO_HIGH', ruleId:'NUT', severity:SEVERITY.WARNING,
          messageAr:`نسبة السكري/الصوديوم ${ratio.toFixed(2)} أعلى من الحد ${maxRatio}` });
      }
    }
    const total = round2(meals.reduce((s, m) => s + itemsCost(m.items), 0));
    const average = meals.length ? round2(total / meals.length) : 0;
    const targetTotal = round2(cfg.targetMealAvg * cfg.mealCount);
    const delta = round2(total - targetTotal);
    if (meals.length === cfg.mealCount && Math.abs(delta) > (cfg.generation.targetTolerance || 0.01)){
      v.push({ code:'F2_DELTA', ruleId:'F2', severity:SEVERITY.WARNING,
        messageAr:`الفرق عن الهدف ${formatMoney(targetTotal, cfg)} هو ${formatSigned(delta, cfg)}` });
    }
    const errors = v.filter(x => x.severity === SEVERITY.ERROR);
    return { ok: errors.length === 0, violations: v, errors,
      warnings: v.filter(x => x.severity === SEVERITY.WARNING),
      total, average, delta, targetTotal, usedCount: used.size, missing };
  }
};


'use strict';
/* =====================================================================
   §10 — GENERATION ENGINE
   ===================================================================== */

/* ponytail: generation heuristics — tune only with real plans; global RNG/attempts stay in config.
// O(seeds × meals × attempts × catalog) worst case; early-exit keeps typical runs <500ms. */
const TUNING = Object.freeze({
  seedStride: 7919, scoreMissing: 1000, scoreInvalid: 200, earlyExit: 0.5,
  pastryForceAfterRatio: 0.4, exclUncoveredBias: 0.8, exclAnyBias: 0.75,
  tahiniFollow: 0.85, costJitter: 9, fillGuard: 80,
  uncoveredBias: 0.65, closestPick: 3
});

const Generation = {
  planAddition(items, id, qty = 1){
    if (!Catalog.has(id)) return null;
    if (items.some(x => x.id === id)) return null;
    const cfg = Config.get();
    const additions = [];

    const canPlace = (itemId, itemQty, currentItems) => {
      const ing = Catalog.get(itemId);
      if (!ing) return false;
      if (currentItems.some(x => x.id === itemId)) return true;
      for (const rule of Object.values(BUILTIN_RULES)){
        if (rule.canAdd && !rule.canAdd(itemId, currentItems, { config: cfg })) return false;
      }
      if (CustomRules.blocks(currentItems, itemId)) return false;
      const projectedCost = itemsCost(currentItems) + ing.price * itemQty;
      if (projectedCost > cfg.maxMealCost + 1e-9) return false;
      return true;
    };

    const sim = items.map(x => ({ id: x.id, qty: x.qty }));
    if (!canPlace(id, qty, sim)) return null;
    sim.push({ id, qty });
    additions.push({ id, qty });

    const tc = cfg.triangleCheese;
    if (cfg.rulesEnabled.R7 && tc.triggers.includes(id)){
      if (!sim.some(x => x.id === tc.id)){
        if (!canPlace(tc.id, tc.qty, sim)) return null;
        sim.push({ id: tc.id, qty: tc.qty });
        additions.push({ id: tc.id, qty: tc.qty });
      }
    }
    const salad = cfg.salad;
    if (cfg.rulesEnabled.R6 && salad.requiredWith.includes(id)){
      if (!sim.some(x => x.id === salad.id)){
        if (!canPlace(salad.id, 1, sim)) return null;
        sim.push({ id: salad.id, qty: 1 });
        additions.push({ id: salad.id, qty: 1 });
      }
    }
    const custom = CustomRules.requiredAdditions([...items, ...additions], id);
    for (const c of custom){
      if (!sim.some(x => x.id === c.id)){
        if (!canPlace(c.id, c.qty, sim)) return null;
        sim.push({ id: c.id, qty: c.qty });
        additions.push({ id: c.id, qty: c.qty });
      }
    }
    return additions;
  },

  normalizeBread(items){
    const cfg = Config.get();
    if (!cfg.rulesEnabled.R4) return;
    const b = items.find(x => x.id === cfg.bread.id);
    if (!b) return;
    const hasPastry = items.some(x => x.id === cfg.bread.pastryId);
    b.qty = hasPastry ? cfg.bread.qtyWithPastry : cfg.bread.qtyWithoutPastry;
  },

  commit(items, additions){
    additions.forEach(a => {
      const ex = items.find(x => x.id === a.id);
      if (ex) ex.qty = a.qty;
      else items.push({ id: a.id, qty: a.qty });
    });
    this.normalizeBread(items);
  },

  buildMeal(index, covered, rng, usageCounts){
    const cfg = Config.get();
    const MAX_ATTEMPTS = cfg.generation.maxMealAttempts;
    const pastryId = cfg.bread.pastryId;
    const pastryLimit = getUsageLimit(pastryId);
    const pastryCount = usageCounts[pastryId] || 0;
    const pastryAllowed = pastryLimit === Infinity || pastryCount < pastryLimit;
    const forcePastry = pastryAllowed && !covered.has(pastryId) && index >= Math.floor(cfg.mealCount * TUNING.pastryForceAfterRatio);
    const canUse = id => { const lim = getUsageLimit(id); return lim === Infinity || (usageCounts[id] || 0) < lim; };

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++){
      const items = [];
      let failed = false;
      const add = (id, qty = 1) => {
        const adds = this.planAddition(items, id, qty);
        if (!adds){ failed = true; return false; }
        this.commit(items, adds);
        return true;
      };

      /* 1. قرار الفطير */
      let wantPastry = false;
      if (pastryAllowed){
        if (forcePastry) wantPastry = true;
        else if (rng() < cfg.generation.pastryProbability) wantPastry = true;
      }
      if (wantPastry) add(pastryId, 1);
      if (failed) continue;

      /* 2. الخبز */
      add(cfg.bread.id, wantPastry ? cfg.bread.qtyWithPastry : cfg.bread.qtyWithoutPastry);
      if (failed) continue;

      /* 3. الشيبسي (إلزامي، واحد بالضبط، من cfg.chips.ids)
         لا علاقة له بالشويبس — الشويبس يمكن أن يأتي لاحقًا بشكل مستقل. */
      if (cfg.chips.ids.length && cfg.chips.required && cfg.rulesEnabled.R3){
        const eligibleChips = cfg.chips.ids.filter(canUse);
        if (eligibleChips.length){
          let chipsId = eligibleChips[index % eligibleChips.length];
          const uncoveredChips = eligibleChips.filter(id => !covered.has(id));
          if (uncoveredChips.length) chipsId = uncoveredChips[0];
          add(chipsId, 1);
          if (failed) continue;
        }
      }

      /* 4. العنصر الحصري */
      const allExcl = [...new Set(cfg.exclusiveGroups.flat())];
      let eligibleExcl = allExcl.filter(canUse);
      if (items.some(x => x.id === pastryId)){
        eligibleExcl = eligibleExcl.filter(id =>
          !cfg.exclusiveGroups.some(g => isArray(g) && g.includes(id) && g.includes(pastryId)));
      }
      const uncoveredExcl = eligibleExcl.filter(id => !covered.has(id));
      const roll = rng();
      let pick = null;
      if (uncoveredExcl.length && roll < TUNING.exclUncoveredBias) pick = uncoveredExcl[Math.floor(rng() * uncoveredExcl.length)];
      else if (roll < TUNING.exclAnyBias && eligibleExcl.length) pick = eligibleExcl[Math.floor(rng() * eligibleExcl.length)];
      if (pick){
        add(pick, 1);
        if (failed) continue;
        if (pick === cfg.tahini.requiresId && !covered.has(cfg.tahini.id)
            && canUse(cfg.tahini.id) && rng() < TUNING.tahiniFollow){
          add(cfg.tahini.id, 1);
          if (failed) continue;
        }
      }

      /* 5. حلقة الملء */
      const targetCost = cfg.targetMealAvg + (rng() * TUNING.costJitter * 2 - TUNING.costJitter);
      let guard = 0;
      while ((items.length < cfg.minIngredientsPerMeal || itemsCost(items) < targetCost) && guard++ < TUNING.fillGuard){
        const hasPastryInMeal = items.some(x => x.id === pastryId);
        const currentCost = itemsCost(items);
        const feasible = [];
        for (const g of Catalog.list){
          if (g.id === pastryId && !hasPastryInMeal) continue;
          if (!canUse(g.id)) continue;
          const adds = this.planAddition(items, g.id, 1);
          if (!adds) continue;
          const delta = adds.reduce((s, a) => s + (Catalog.get(a.id)?.price || 0) * a.qty, 0);
          feasible.push({ ing: g, adds, newCost: currentCost + delta });
        }
        if (!feasible.length) break;
        const uncovered = feasible.filter(f => !covered.has(f.ing.id));
        const pool = (uncovered.length && rng() < TUNING.uncoveredBias) ? uncovered : feasible;
        pool.sort((a, b) => Math.abs(targetCost - a.newCost) - Math.abs(targetCost - b.newCost));
        const chosen = pool[Math.floor(rng() * Math.min(pool.length, TUNING.closestPick))];
        this.commit(items, chosen.adds);
      }

      this.normalizeBread(items);
      if (items.length < cfg.minIngredientsPerMeal) continue;
      const c = itemsCost(items);
      if (c < cfg.minMealCost - 1e-9 || c > cfg.maxMealCost + 1e-9) continue;

      const meal = { id:`meal-${index}`, nameAr:`وجبة ${index + 1}`, items };
      if (!Validation.meal(meal).ok) continue;
      return meal;
    }
    return null;
  },

  enforceUsageLimits(meals){
    const cfg = Config.get();
    Object.keys(cfg.ingredientUsageLimits || {}).forEach(id => {
      const limit = getUsageLimit(id);
      if (limit === Infinity) return;
      /* لا نفرض الحد على الشيبسي لأنه إلزامي في كل وجبة */
      if (cfg.chips.ids.includes(id) && cfg.chips.required) return;
      const indices = [];
      meals.forEach((m, i) => { if (m.items.some(it => it.id === id)) indices.push(i); });
      if (indices.length <= limit) return;
      let excess = indices.length - limit;
      for (let k = indices.length - 1; k >= 0 && excess > 0; k--){
        const mi = indices[k];
        const m = meals[mi];
        const idx = m.items.findIndex(it => it.id === id);
        if (idx === -1) continue;
        const snapshot = m.items.map(x => ({ ...x }));
        m.items.splice(idx, 1);
        this.normalizeBread(m.items);
        if (!Validation.meal({ id:m.id, nameAr:m.nameAr, items:m.items }).ok){
          m.items = snapshot;
          continue;
        }
        excess--;
      }
    });
  },

  tunePlan(meals, rng){
    const cfg = Config.get();
    const targetTotal = round2(cfg.targetMealAvg * cfg.mealCount);
    const tolerance = cfg.generation.targetTolerance;
    const pastryId = cfg.bread.pastryId;
    let guard = 0;

    while (guard++ < cfg.generation.maxTuneIterations){
      const costs = meals.map(m => itemsCost(m.items));
      const total = round2(costs.reduce((s, c) => s + c, 0));
      const diff = round2(targetTotal - total);
      if (Math.abs(diff) < tolerance) break;
      if (diff > 0){
        let best = null;
        meals.forEach((m, mi) => {
          const hasPastryInMeal = m.items.some(x => x.id === pastryId);
          Catalog.list.forEach(g => {
            if (g.id === pastryId && !hasPastryInMeal) return;
            const lim = getUsageLimit(g.id);
            if (lim !== Infinity && !(cfg.chips.ids.includes(g.id) && cfg.chips.required)){
              const cnt = countMealsWith(meals, g.id);
              if (cnt >= lim) return;
            }
            const adds = this.planAddition(m.items, g.id, 1);
            if (!adds) return;
            const delta = adds.reduce((s, a) => s + (Catalog.get(a.id)?.price || 0) * a.qty, 0);
            const nd = Math.abs(diff - delta);
            if (!best || nd < best.nd) best = { nd, mi, adds };
          });
        });
        if (!best || best.nd >= Math.abs(diff)) break;
        this.commit(meals[best.mi].items, best.adds);
      } else {
        let best = null;
        meals.forEach((m, mi) => {
          if (m.items.length <= cfg.minIngredientsPerMeal) return;
          const oldCost = costs[mi];
          m.items.forEach((it, ii) => {
            if (it.id === pastryId) return;
            /* لا تحذف الشيبسي */
            if (cfg.chips.ids.includes(it.id) && cfg.chips.required) return;
            const cnt = countMealsWith(meals, it.id);
            if (cnt <= 1) return;
            const trial = m.items.filter((_, k) => k !== ii);
            this.normalizeBread(trial);
            const vr = Validation.meal({ id:m.id, nameAr:m.nameAr, items:trial });
            if (!vr.ok) return;
            const delta = round2(vr.cost - oldCost);
            const nd = Math.abs(diff - delta);
            if (!best || nd < best.nd) best = { nd, mi, ii };
          });
        });
        if (!best || best.nd >= Math.abs(diff)) break;
        meals[best.mi].items.splice(best.ii, 1);
        this.normalizeBread(meals[best.mi].items);
      }
    }
  },

  attempt(rng){
    const cfg = Config.get();
    const meals = [];
    const covered = new Set();
    const usageCounts = {};
    for (let i = 0; i < cfg.mealCount; i++){
      const m = this.buildMeal(i, covered, rng, usageCounts);
      if (!m) return null;
      meals.push(m);
      m.items.forEach(it => { covered.add(it.id); usageCounts[it.id] = (usageCounts[it.id] || 0) + 1; });
    }
    if (cfg.requireCoverage && cfg.rulesEnabled.R2){
      const missing = Catalog.list.filter(g => !covered.has(g.id));
      missing.forEach(g => {
        const lim = getUsageLimit(g.id);
        if (lim !== Infinity && lim < 1) return;
        const order = meals.map((_, i) => i).sort((a, b) => itemsCost(meals[a].items) - itemsCost(meals[b].items));
        for (const idx of order){
          const adds = this.planAddition(meals[idx].items, g.id, 1);
          if (adds){
            this.commit(meals[idx].items, adds);
            meals[idx].items.forEach(it => { covered.add(it.id); usageCounts[it.id] = (usageCounts[it.id] || 0) + 1; });
            return;
          }
        }
      });
    }
    this.enforceUsageLimits(meals);
    this.tunePlan(meals, rng);
    this.enforceUsageLimits(meals);
    let invalid = 0;
    meals.forEach(m => { if (!Validation.meal(m).ok) invalid++; });
    const total = round2(meals.reduce((s, m) => s + itemsCost(m.items), 0));
    const cov = new Set();
    meals.forEach(m => m.items.forEach(it => cov.add(it.id)));
    const stillMissing = Catalog.list.filter(g => !cov.has(g.id));
    return { meals, total, delta: round2(total - cfg.targetMealAvg * cfg.mealCount), invalid, missing: stillMissing };
  },

  run(){
    const cfg = Config.get();
    let best = null;
    for (let i = 0; i < cfg.generation.maxSeedAttempts; i++){
      const rng = rngFrom((cfg.seed || 1234567) + i * TUNING.seedStride);
      let result = null;
      try { result = this.attempt(rng); }
      catch(e){ console.error('Generation error:', e); result = null; }
      if (!result) continue;
      const score = result.missing.length * TUNING.scoreMissing + result.invalid * TUNING.scoreInvalid + Math.abs(result.delta);
      if (!best || score < best.score) best = { score, ...result };
      if (score < TUNING.earlyExit) break;
    }
    return best;
  }
};


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
    if (!Storage.write(STORAGE_KEYS.STATE, this.current)) UI.toast('تعذّر حفظ البيانات', 'err');
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
  load(){ const v = Storage.read(STORAGE_KEYS.PROFILES, []); this.list = isArray(v) ? v.filter(isObject) : []; return this.list; },
  save(){ if (!Storage.write(STORAGE_KEYS.PROFILES, this.list)) UI.toast('تعذّر حفظ البيانات', 'err'); },
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

