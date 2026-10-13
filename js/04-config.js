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
    if (this.current.behavior?.autoSave === false) return;
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

