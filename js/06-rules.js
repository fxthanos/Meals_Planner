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

