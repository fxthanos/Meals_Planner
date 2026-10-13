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

