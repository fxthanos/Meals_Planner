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
      const ratio = sodium > 0 ? sugar / sodium : Infinity;
      const { minRatio, maxRatio } = cfg.nutritionBalance.planWide;
      if (ratio < minRatio) v.push({ code:'NUT_RATIO_LOW', ruleId:'NUT', severity:SEVERITY.WARNING,
        messageAr:`نسبة السكري/الصوديوم ${ratio.toFixed(2)} أقل من الحد ${minRatio}` });
      else if (ratio > maxRatio) v.push({ code:'NUT_RATIO_HIGH', ruleId:'NUT', severity:SEVERITY.WARNING,
        messageAr:`نسبة السكري/الصوديوم ${ratio.toFixed(2)} أعلى من الحد ${maxRatio}` });
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

