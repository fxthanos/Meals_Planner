'use strict';
/* =====================================================================
   §18 — EVENT DELEGATION
   ===================================================================== */

document.addEventListener('click', function(e){
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const act = btn.getAttribute('data-act');

  switch (act) {
    case 'modal-confirm': {
      if (typeof UI.modalConfirmCallback === 'function'){
        const res = UI.modalConfirmCallback();
        if (res === false) return;
      }
      UI.hideModal(); return;
    }
    case 'modal-cancel': UI.hideModal(); return;

    case 'gen': Actions.generate(); return;
    case 'reset': Actions.reset(); return;
    case 'export': Actions.export(); return;
    case 'import': { const inp = document.getElementById('importFile'); inp.value = ''; inp.click(); return; }
    case 'print': window.print(); return;
    case 'validate-all': Actions.validateAll(); return;

    case 'edit-tags': Modals.tags(btn.getAttribute('data-id')); return;
    case 'edit-price': Modals.price(btn.getAttribute('data-id')); return;
    case 'add-ing': Modals.addIngredient(); return;
    case 'delete-ing': Modals.deleteIngredient(btn.getAttribute('data-id')); return;
    case 'restore-catalog': Modals.restoreCatalog(); return;
    case 'reset-catalog-filters': ui.q = ''; ui.classFilter = ''; ui.tagFilter = ''; render(); return;

    case 'toggle-edit': {
      const mi = parseInt(btn.getAttribute('data-meal'), 10);
      ui.editingMeal = (ui.editingMeal === mi) ? null : mi;
      render(); return;
    }
    case 'remove-ing': {
      const mi = parseInt(btn.getAttribute('data-meal'), 10);
      const ii = parseInt(btn.getAttribute('data-i'), 10);
      mutateMeal(mi, 'تعديل', meal => { meal.items.splice(ii, 1); });
      return;
    }
    case 'qty-inc':
    case 'qty-dec': {
      const mi = parseInt(btn.getAttribute('data-meal'), 10);
      const ii = parseInt(btn.getAttribute('data-i'), 10);
      const maxQ = Config.get().quantityDefaults.maxQty;
      const it = State.current.meals[mi]?.items[ii];
      if (!it) return;
      const next = it.qty + (act === 'qty-inc' ? 1 : -1);
      if (next < 1 || next > maxQ) return;
      mutateMeal(mi, 'كمية', meal => { meal.items[ii].qty = next; });
      return;
    }
    case 'add-ing-meal': {
      const mi = parseInt(btn.getAttribute('data-meal'), 10);
      const sel = document.getElementById(`addSelect-${mi}`);
      if (!sel || !sel.value) return;
      const meal = State.current.meals[mi];
      if (!meal) return;
      if (meal.items.some(x => x.id === sel.value)){ UI.toast('موجود بالفعل', 'warn'); return; }
      const qty = Config.get().quantityDefaults.defaultQty || 1;
      const id = sel.value;
      mutateMeal(mi, 'إضافة', meal => { meal.items.push({ id, qty }); });
      return;
    }

    case 'clear-log': State.current.log = []; State.save(); render(); UI.toast('تم التفريغ', 'ok'); return;

    case 'pick-single': {
      const path = btn.getAttribute('data-target');
      const parts = path.split('.');
      let cur = Config.get();
      for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
      const current = cur[parts[parts.length - 1]];
      UI.pickSingleIngredient('اختر مكوّنًا', current, (val) => { Config.set(path, val); render(); });
      return;
    }
    case 'pick-multi': {
      const path = btn.getAttribute('data-target');
      const parts = path.split('.');
      let cur = Config.get();
      for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
      const current = cur[parts[parts.length - 1]];
      UI.pickIngredients('اختر المكونات', current.slice(), (val) => { Config.set(path, val); render(); });
      return;
    }

    case 'edit-excl': {
      const i = parseInt(btn.getAttribute('data-index'), 10);
      const current = (Config.get().exclusiveGroups[i] || []).slice();
      UI.pickIngredients('تعديل المجموعة', current, (val) => {
        Config.get().exclusiveGroups[i] = val;
        Config.save(); render();
      });
      return;
    }
    case 'delete-excl': {
      const i = parseInt(btn.getAttribute('data-index'), 10);
      Config.get().exclusiveGroups.splice(i, 1);
      Config.save(); render();
      UI.toast('تم الحذف', 'ok');
      return;
    }
    case 'add-excl': {
      UI.pickIngredients('مجموعة جديدة', [], (val) => {
        Config.get().exclusiveGroups.push(val);
        Config.save(); render();
      });
      return;
    }

    case 'add-usage-limit': {
      UI.pickSingleIngredient('اختر مكوّنًا', '', (id) => {
        if (!id) return;
        const cfg = Config.get();
        if (!cfg.ingredientUsageLimits) cfg.ingredientUsageLimits = {};
        if (cfg.ingredientUsageLimits[id] == null) cfg.ingredientUsageLimits[id] = 1;
        Config.save(); render();
        UI.toast('تمت الإضافة', 'ok');
      });
      return;
    }
    case 'delete-usage-limit': {
      const id = btn.getAttribute('data-id');
      delete Config.get().ingredientUsageLimits[id];
      Config.save(); render();
      UI.toast('تم الحذف', 'ok');
      return;
    }

    case 'add-custom-rule': Modals.customRule(null); return;
    case 'edit-custom-rule': Modals.customRule(btn.getAttribute('data-rule-id')); return;
    case 'duplicate-custom-rule': {
      const id = btn.getAttribute('data-rule-id');
      const r = (Config.get().customRules || []).find(x => x.id === id);
      if (!r) return;
      const copy = deepClone(r);
      copy.id = newId('cr');
      copy.name = (copy.name || 'قاعدة') + ' (نسخة)';
      Config.get().customRules.push(copy);
      Config.save(); render();
      UI.toast('تم النسخ', 'ok');
      return;
    }
    case 'delete-custom-rule': {
      const id = btn.getAttribute('data-rule-id');
      const r = (Config.get().customRules || []).find(x => x.id === id);
      if (!r) return;
      const run = () => {
        Config.get().customRules = Config.get().customRules.filter(x => x.id !== id);
        Config.save(); UI.hideModal(); render();
        UI.toast('تم الحذف', 'ok');
        return true;
      };
      confirmDestructive({ title: 'حذف القاعدة', body: `<p>سيتم حذف «${escapeHtml(r.name || r.type)}» نهائيًا.</p>`,
        confirmLabel: 'حذف', run });
      return;
    }

    case 'save-profile': Modals.saveProfile(); return;
    case 'load-profile': Modals.loadProfile(btn.getAttribute('data-profile-id')); return;
    case 'rename-profile': Modals.renameProfile(btn.getAttribute('data-profile-id')); return;
    case 'delete-profile': Modals.deleteProfile(btn.getAttribute('data-profile-id')); return;
    case 'export-profile': Modals.exportProfile(btn.getAttribute('data-profile-id')); return;
    case 'import-profile': { const inp = document.getElementById('importProfileFile'); inp.value = ''; inp.click(); return; }

    case 'save-json': {
      const ta = document.getElementById('jsonEditor');
      if (!ta) return;
      try {
        const parsed = JSON.parse(ta.value);
        if (!isObject(parsed)) throw new Error('ليس كائنًا');
        Config.current = normalizeConfig(parsed);
        Config.save(); render();
        UI.toast('تم الحفظ', 'ok');
      } catch(e){ UI.toast('JSON غير صالح: ' + e.message, 'err'); }
      return;
    }
    case 'reload-json': { const ta = document.getElementById('jsonEditor'); if (ta) ta.value = JSON.stringify(Config.get(), null, 2); UI.toast('تم إعادة التحميل', 'ok'); return; }
    case 'copy-json': {
      const ta = document.getElementById('jsonEditor');
      if (!ta) return;
      if (!navigator.clipboard?.writeText){ UI.toast('تعذّر النسخ', 'err'); return; }
      navigator.clipboard.writeText(ta.value).then(
        () => UI.toast('تم النسخ', 'ok'),
        () => UI.toast('تعذّر النسخ', 'err'));
      return;
    }

    case 'reset-settings': {
      const run = () => {
        Config.current = buildDefaultConfig();
        Config.save(); UI.hideModal(); render();
        UI.toast('تمت الاستعادة', 'ok');
        return true;
      };
      confirmDestructive({ title: 'استعادة الإعدادات الافتراضية',
        body: '<p>سيتم استرجاع القيم الافتراضية مع الحفاظ على الكتالوج والوجبات.</p>',
        confirmLabel: 'استعادة', run });
      return;
    }
    case 'factory-reset': {
      const run = () => {
        Storage.clearAll();
        Config.current = buildDefaultConfig();
        State.current = buildDefaultState();
        Catalog.reset();
        Profiles.list = [];
        UI.hideModal(); render();
        UI.toast('تمت إعادة التعيين الشاملة', 'ok');
        return true;
      };
      confirmDestructive({ title: 'إعادة تعيين شاملة',
        body: '<p>سيتم حذف الإعدادات والكتالوج والوجبات والبروفايلات — كل شيء.</p><p><strong>لا يمكن التراجع.</strong></p>',
        confirmLabel: 'نعم، شاملة', run });
      return;
    }

    case 'export-settings': Modals.exportSettings(); return;
    case 'import-settings': { const inp = document.getElementById('importSettingsFile'); inp.value = ''; inp.click(); return; }
  }
});

document.addEventListener('change', function(e){
  const el = e.target;

  if (el.id === 'importFile'){ if (el.files?.[0]) Actions.importFile(el.files[0]); return; }
  if (el.id === 'importSettingsFile'){ if (el.files?.[0]) Modals.importSettingsFile(el.files[0]); return; }
  if (el.id === 'importProfileFile'){ if (el.files?.[0]) Modals.importProfileFile(el.files[0]); return; }

  if (el.id === 'classFilter'){ ui.classFilter = el.value; render(); return; }
  if (el.id === 'tagFilter'){ ui.tagFilter = el.value; render(); return; }

  if (el.getAttribute('data-act') === 'toggle-tag'){
    const id = el.getAttribute('data-id');
    const tag = el.getAttribute('data-tag');
    const g = Catalog.get(id);
    if (!g) return;
    const idx = g.specialRules.indexOf(tag);
    if (el.checked){ if (idx === -1) g.specialRules.push(tag); }
    else { if (idx !== -1) g.specialRules.splice(idx, 1); }
    State.save(); render();
    UI.toast('تم التحديث', 'ok');
    return;
  }

  if (el.getAttribute('data-field')){
    const field = el.getAttribute('data-field');
    const id = el.getAttribute('data-id');
    const g = Catalog.get(id);
    if (!g) return;
    g[field] = el.value;
    State.save();
    /* ponytail: re-render only for SELECT (classification) — text inputs skip render
       because change fires on blur and render would destroy the click target mid-click */
    if (el.tagName === 'SELECT'){
      render();
      const again = Array.from(document.querySelectorAll('[data-field]'))
        .find(x => x.getAttribute('data-field') === field && x.getAttribute('data-id') === id);
      if (again) again.focus();
    }
    UI.toast('تم الحفظ', 'ok');
    return;
  }

  if (el.getAttribute('data-usage-limit')){
    const id = el.getAttribute('data-usage-limit');
    const val = parseInt(el.value, 10);
    if (!isNum(val) || val < 0){ UI.toast('قيمة غير صالحة', 'err'); render(); return; }
    const cfg = Config.get();
    if (!cfg.ingredientUsageLimits) cfg.ingredientUsageLimits = {};
    cfg.ingredientUsageLimits[id] = clamp(val, 0, 50);
    Config.save();
    UI.toast('تم التحديث', 'ok');
    return;
  }

  if (el.getAttribute('data-act') === 'toggle-custom-rule'){
    const id = el.getAttribute('data-rule-id');
    const r = (Config.get().customRules || []).find(x => x.id === id);
    if (!r) return;
    r.enabled = el.checked;
    Config.save(); render();
    return;
  }

  if (el.getAttribute('data-cfg')){
    const path = el.getAttribute('data-cfg');
    let val;
    if (el.type === 'checkbox') val = el.checked;
    else if (el.type === 'number') val = parseFloat(el.value);
    else val = el.value;
    if (el.type === 'number'){
      if (!isNum(val)){ UI.toast('قيمة غير صالحة', 'err'); render(); return; }
      if (path === 'mealCount') val = clamp(val, 1, 50);
      if (path === 'minIngredientsPerMeal') val = clamp(val, 1, 30);
      if (path === 'decimalPlaces') val = clamp(val, 0, 4);
      if (path === 'generation.maxSeedAttempts') val = clamp(val, 1, 100);
      if (path === 'generation.maxMealAttempts') val = clamp(val, 10, 5000);
      if (path === 'generation.maxTuneIterations') val = clamp(val, 10, 5000);
      if (path === 'generation.pastryProbability') val = clamp(val, 0, 1);
      if (path === 'generation.targetTolerance') val = clamp(val, 0, 10);
      if (path === 'quantityDefaults.defaultQty') val = clamp(val, 1, 50);
      if (path === 'quantityDefaults.maxQty') val = clamp(val, 1, 50);
      if (path === 'behavior.toastDurationMs') val = clamp(val, 500, 20000);
      if (path === 'bread.qtyWithPastry' || path === 'bread.qtyWithoutPastry') val = clamp(val, 0, 20);
      if (path === 'triangleCheese.qty') val = clamp(val, 0, 20);
      if (path === 'nutritionBalance.perMeal.maxHighSugar' || path === 'nutritionBalance.perMeal.maxHighSodium') val = clamp(val, 0, 10);
      if (path === 'nutritionBalance.planWide.minRatio' || path === 'nutritionBalance.planWide.maxRatio') val = Math.max(0, val);
      if (['minMealCost','maxMealCost','targetMealAvg'].includes(path)) val = Math.max(0, round2(val));
      if (path === 'minMealCost' && val > Config.get().maxMealCost){ UI.toast('الحد الأدنى أكبر من الأقصى', 'err'); render(); return; }
      if (path === 'maxMealCost' && val < Config.get().minMealCost){ UI.toast('الحد الأقصى أصغر من الأدنى', 'err'); render(); return; }
    }
    Config.set(path, val);
    render();
    const again = Array.from(document.querySelectorAll('[data-cfg]')).find(x => x.getAttribute('data-cfg') === path);
    if (again){
      again.focus();
      if (again.type === 'text' || again.type === 'number' || again.tagName === 'TEXTAREA'){
        try { again.select(); } catch(e){}
      }
    }
    UI.toast('تم الحفظ', 'ok');
    return;
  }

  if (el.getAttribute('data-rule')){
    const rid = el.getAttribute('data-rule');
    Config.get().rulesEnabled[rid] = el.checked;
    Config.save();
    UI.toast('تم التحديث', 'ok');
    return;
  }
});

document.addEventListener('input', function(e){
  const el = e.target;
  if (el.id !== 'searchInput') return;
  clearTimeout(ui._searchT);
  ui._searchT = setTimeout(() => {
    ui.q = el.value; render();
    const s = document.getElementById('searchInput');
    if (s){ s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
  }, 150);
});

document.addEventListener('keydown', function(e){
  if (e.key === 'Escape' && UI.isModalOpen()){ e.preventDefault(); UI.hideModal(); return; }
  if (e.key === 'Tab' && UI.isModalOpen()){
    const f = Array.from(document.querySelectorAll('#modalBackdrop button, #modalBackdrop input, #modalBackdrop select, #modalBackdrop textarea')).filter(el => !el.disabled);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    return;
  }
  if (e.key === 'Enter' && UI.isModalOpen() && !e.shiftKey){
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'textarea') return;
    if (e.target.id === 'modalConfirm' || e.target.id === 'modalCancel') return;
    e.preventDefault();
    document.getElementById('modalConfirm')?.click();
  }
});

let printOpen = null;
window.addEventListener('beforeprint', function(){
  printOpen = new Set();
  document.querySelectorAll('#view details.cfg-section').forEach(d => {
    if (d.open) printOpen.add(d.querySelector('summary')?.textContent);
    d.open = true;
  });
});
window.addEventListener('afterprint', function(){
  if (!printOpen) return;
  const keep = printOpen; printOpen = null;
  document.querySelectorAll('#view details.cfg-section').forEach(d => {
    d.open = keep.has(d.querySelector('summary')?.textContent);
  });
});

/* =====================================================================
   §19 — BOOT
   ===================================================================== */

function boot(){
  Config.load();
  State.load();
  if (!Catalog.list.length) Catalog.hydrate(State.current.ingredients);
  Profiles.load();
  State.current.ingredients = Catalog.list;
  if (!location.hash) location.hash = '#/dashboard';
  render();
  const unclassified = Catalog.list.filter(g => !g.classification).length;
  if (unclassified > 0){
    setTimeout(() => UI.toast(`يوجد ${unclassified} مكوّنًا بدون تصنيف`, 'warn'), 700);
  }
}

document.addEventListener('DOMContentLoaded', boot);
