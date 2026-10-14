'use strict';
/* =====================================================================
   §13 — UI HELPERS
   ===================================================================== */

const UI = {
  modalConfirmCallback: null,
  _lastFocus: null,
  toast(msg, type){
    const box = document.getElementById('toasts');
    while (box.children.length >= 3) box.firstChild.remove();
    const el = document.createElement('div');
    el.className = 'toast' + (type ? ' ' + type : '');
    el.textContent = msg;
    box.appendChild(el);
    const dur = Config.get()?.behavior?.toastDurationMs || 3200;
    setTimeout(() => {
      el.style.opacity = '0'; el.style.transition = 'opacity .3s';
      setTimeout(() => el.remove(), 320);
    }, dur);
  },
  showModal({ title, body, confirmLabel = 'تأكيد', cancelLabel = 'إلغاء', danger = false, onConfirm }){
    document.getElementById('modalTitle').textContent = title || '';
    document.getElementById('modalBody').innerHTML = body || '';
    const confirmBtn = document.getElementById('modalConfirm');
    const cancelBtn = document.getElementById('modalCancel');
    confirmBtn.textContent = confirmLabel;
    confirmBtn.className = 'btn' + (danger ? ' danger' : '');
    cancelBtn.textContent = cancelLabel;
    this.modalConfirmCallback = onConfirm || null;
    this._lastFocus = document.activeElement || null;
    document.getElementById('modalBackdrop').hidden = false;
    setTimeout(() => {
      const focusEl = document.querySelector('#modalBody input:not([type=checkbox]):not([type=radio]), #modalBody select, #modalBody textarea');
      if (focusEl){ focusEl.focus(); focusEl.select?.(); }
      else confirmBtn.focus();
    }, 20);
  },
  hideModal(){
    document.getElementById('modalBackdrop').hidden = true;
    this.modalConfirmCallback = null;
    /* ponytail: best-effort focus restore; no-op if a render already replaced the node */
    const lf = this._lastFocus; this._lastFocus = null;
    if (lf && document.contains?.(lf)){ try { lf.focus(); } catch(e){} }
  },
  isModalOpen(){ return !document.getElementById('modalBackdrop').hidden; },
  showLoading(show){ document.getElementById('loadingOverlay').hidden = !show; },
  logValidation(scope, result){
    State.addLog({ ts: new Date().toISOString(), scope, ok: !!result.ok,
      messages: (result.violations || []).map(v => v.messageAr) });
  },
  pickIngredients(title, selectedIds, onSave){
    if (!Catalog.list.length){ this.toast('لا توجد مكونات', 'warn'); return; }
    const body = `<p class="small muted">اختر المكونات المطلوبة ثم اضغط حفظ.</p>
      <div class="tag-grid">${Catalog.list.map(g => `
        <label class="tag-item">
          <input type="checkbox" value="${escapeHtml(g.id)}" ${selectedIds.includes(g.id) ? 'checked' : ''}>
          <span>${escapeHtml(g.nameAr)} <small class="muted">${escapeHtml(g.id)}</small></span>
        </label>`).join('')}</div>`;
    this.showModal({ title, body, confirmLabel: 'حفظ',
      onConfirm(){
        const checked = Array.from(document.querySelectorAll('#modalBody input[type=checkbox]:checked')).map(x => x.value);
        onSave(checked); UI.hideModal(); return true;
      }});
  },
  pickSingleIngredient(title, selectedId, onSave){
    if (!Catalog.list.length){ this.toast('لا توجد مكونات', 'warn'); return; }
    const body = `<p class="small muted">اختر مكوّنًا واحدًا.</p>
      <select id="singlePicker" size="12" style="min-height:220px">
        ${Catalog.list.map(g => `<option value="${escapeHtml(g.id)}" ${g.id === selectedId ? 'selected' : ''}>${escapeHtml(g.nameAr)} — ${escapeHtml(g.id)}</option>`).join('')}
      </select>`;
    this.showModal({ title, body, confirmLabel: 'حفظ',
      onConfirm(){
        const sel = document.getElementById('singlePicker');
        if (sel) onSave(sel.value);
        UI.hideModal(); return true;
      }});
  }
};


'use strict';
/* =====================================================================
   §14 — RENDERERS
   ===================================================================== */

const ROUTES = ['dashboard','catalog','meals','settings','log'];
const ui = { q:'', classFilter:'', tagFilter:'', editingMeal:null, _searchT:null };

const Renderer = {
  dashboard(){
    const cfg = Config.get();
    const validation = Validation.plan(State.current.meals);
    const mealResults = State.current.meals.map(m => Validation.meal(m));
    const validCount = mealResults.filter(r => r.ok).length;
    let bannerClass = 'ok', bannerTitle = 'الخطة صحيحة';
    if (State.current.meals.length === 0){ bannerClass = 'warn'; bannerTitle = 'لا توجد خطة بعد — اضغط «توليد الوجبات»'; }
    else if (!validation.ok){ bannerClass = 'err'; bannerTitle = 'الخطة غير صحيحة'; }
    else if (validation.warnings.length){ bannerClass = 'warn'; bannerTitle = 'الخطة صحيحة مع ملاحظات'; }
    const shown = validation.violations.slice(0, 12);
    const bannerList = shown.length
      ? `<ul>${shown.map(v => `<li>${escapeHtml(v.messageAr)}</li>`).join('')}</ul>` +
        (validation.violations.length > shown.length ? `<div class="small" style="margin-top:6px">و${validation.violations.length - shown.length} ملاحظة أخرى…</div>` : '')
      : '';
    const chips = State.current.meals.length
      ? State.current.meals.map((m, i) => {
          const r = mealResults[i];
          return `<a class="meal-chip ${r.ok ? 'ok' : 'bad'}" href="#/meals">وجبة ${i+1} — ${formatMoney(r.cost, cfg)}</a>`;
        }).join('')
      : '<span class="muted">لم تُولَّد أي وجبات بعد.</span>';
    return `
<section class="panel dashboard-panel">
  <div class="workspace-head">
    <div>
      <span class="workspace-eyebrow">ملخص مباشر</span>
      <h2>${escapeHtml(cfg.planName || 'لوحة التحكم')}</h2>
      <p>تابع جاهزية الخطة وتكلفتها وتغطية المكونات من نقطة واحدة.</p>
    </div>
    <div class="actions no-print">
      <button class="btn" data-act="gen" type="button">توليد الوجبات</button>
      <button class="btn warn" data-act="reset" type="button">إعادة تعيين</button>
      <button class="btn ghost" data-act="export" type="button">تصدير</button>
      <button class="btn ghost" data-act="import" type="button">استيراد</button>
      <button class="btn ghost" data-act="print" type="button">طباعة / PDF</button>
    </div>
  </div>
  <div class="status-banner ${bannerClass}">${escapeHtml(bannerTitle)}${bannerList}</div>
  <div class="stats dashboard-stats">
    <div class="stat stat-primary"><span>عدد الوجبات</span><strong>${State.current.meals.length} <small>/ ${cfg.mealCount}</small></strong><small>الحالة الحالية للخطة</small></div>
    <div class="stat"><span>إجمالي التكلفة</span><strong>${formatMoney(validation.total, cfg)}</strong><small>الهدف ${formatMoney(validation.targetTotal, cfg)}</small></div>
    <div class="stat"><span>متوسط الوجبة</span><strong>${formatMoney(validation.average, cfg)}</strong><small>الهدف ${formatMoney(cfg.targetMealAvg, cfg)}</small></div>
    <div class="stat"><span>Δ</span><strong>${formatSigned(validation.delta, cfg)}</strong><small>${formatMoney(cfg.minMealCost, cfg)} – ${formatMoney(cfg.maxMealCost, cfg)}</small></div>
    <div class="stat"><span>تغطية المكونات</span><strong>${validation.usedCount} / ${Catalog.list.length}</strong></div>
    <div class="stat"><span>وجبات سليمة</span><strong>${validCount} / ${State.current.meals.length}</strong></div>
  </div>
  <div class="dashboard-meals"><div><span class="workspace-eyebrow">حالة التنفيذ</span><h3>حالة الوجبات</h3></div><div class="meal-chips">${chips}</div></div>
</section>`;
  },

  catalog(){
    const coverage = {};
    State.current.meals.forEach(m => m.items.forEach(it => { coverage[it.id] = (coverage[it.id] || 0) + 1; }));
    const q = ui.q.trim();
    const list = Catalog.list.filter(g => {
      if (ui.classFilter && (g.classification || '') !== ui.classFilter) return false;
      if (ui.tagFilter && !(g.specialRules || []).includes(ui.tagFilter)) return false;
      if (q){
        const hay = g.nameAr + ' ' + (g.category || '') + ' ' + (g.unit || '');
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const coveredCount = Catalog.list.filter(g => coverage[g.id] > 0).length;
    const activeFilters = [q, ui.classFilter, ui.tagFilter].filter(Boolean).length;
    const tagOptions = `<option value="">كل الوسوم</option>` + ALL_TAGS.map(t =>
      `<option value="${escapeHtml(t)}" ${ui.tagFilter === t ? 'selected' : ''}>${escapeHtml(TAG_LABELS[t])}</option>`).join('');
    const rows = list.map((g, index) => {
      const clsOptions = CLASSIFICATIONS.map(c =>
        `<option value="${escapeHtml(c.v)}" ${(g.classification || '') === c.v ? 'selected' : ''}>${escapeHtml(c.l)}</option>`).join('');
      const cnt = coverage[g.id] || 0;
      const limit = getUsageLimit(g.id);
      const isChipsItem = Config.get().chips.ids.includes(g.id);
      const limitTag = limit !== Infinity && !isChipsItem ? ` <span class="rule-chip fail">حد: ${limit}</span>` : '';
      const chipsTag = isChipsItem ? ` <span class="rule-chip pass">مطلوب في كل وجبة</span>` : '';
      const covHtml = cnt > 0 ? `<span class="rule-chip pass">في ${cnt} وجبة</span>${limitTag}${chipsTag}` : `<span class="rule-chip fail">غير مستخدم</span>${limitTag}${chipsTag}`;
      const tagsLabel = (g.specialRules || []).length ? (g.specialRules || []).map(t => escapeHtml(TAG_LABELS[t] || t)).join('، ') : '<span class="muted">لا يوجد</span>';
      const nutLabel = g.nutrition ? `<span class="rule-chip">سكر: ${g.nutrition.sugar}</span> <span class="rule-chip">ملح: ${g.nutrition.sodium}</span>` : '';
      return `
<tr style="animation-delay:${Math.min(index, 12) * 35}ms">
  <td class="catalog-id"><span>${escapeHtml(g.id)}</span></td>
  <td class="catalog-name"><input type="text" aria-label="اسم ${escapeHtml(g.nameAr)}" data-field="nameAr" data-id="${escapeHtml(g.id)}" value="${escapeHtml(g.nameAr)}"></td>
  <td class="price-cell catalog-price">${g.price.toFixed(Config.get().decimalPlaces)} <small>${escapeHtml(Config.get().currencyLabel)}</small></td>
  <td><input type="text" data-field="unit" data-id="${escapeHtml(g.id)}" value="${escapeHtml(g.unit || '')}" placeholder="غير محدد"></td>
  <td><select data-field="classification" data-id="${escapeHtml(g.id)}">${clsOptions}</select></td>
  <td><input type="text" data-field="category" data-id="${escapeHtml(g.id)}" value="${escapeHtml(g.category || '')}" placeholder="غير محدد"></td>
  <td><input type="text" data-field="family" data-id="${escapeHtml(g.id)}" value="${escapeHtml(g.family || '')}" placeholder="—"></td>
  <td class="catalog-attributes">
    <button class="btn ghost tiny" data-act="edit-tags" data-id="${escapeHtml(g.id)}">الوسوم (${(g.specialRules || []).length})</button>
    <div class="catalog-tags">${tagsLabel}</div>
    <div class="catalog-nutrition">${nutLabel}</div>
  </td>
  <td class="catalog-coverage">${covHtml}</td>
  <td class="catalog-actions">
    <button class="btn ghost tiny" data-act="edit-price" data-id="${escapeHtml(g.id)}">السعر</button>
    <button class="btn danger tiny" data-act="delete-ing" data-id="${escapeHtml(g.id)}">حذف</button>
  </td>
</tr>`;
    }).join('');
    const auditRows = State.current.priceAudit.length
      ? State.current.priceAudit.slice(0, 20).map(a =>
          `<li class="small">${escapeHtml(new Date(a.ts).toLocaleString('ar-EG'))} — ${escapeHtml(a.nameAr)}: من ${formatMoney(a.oldPrice, Config.get())} إلى ${formatMoney(a.newPrice, Config.get())}</li>`).join('')
      : '<li class="small muted">لا توجد تعديلات مسجلة.</li>';
    return `
<section class="panel catalog-panel">
  <div class="catalog-head">
    <div class="catalog-title-block">
      <span class="catalog-eyebrow"><span class="catalog-live-dot" aria-hidden="true"></span>مصدر الخطة</span>
      <h2>كتالوج المكونات</h2>
      <p>حرّر الأسعار والتصنيف وقواعد كل مكوّن من مساحة عمل واحدة.</p>
    </div>
    <div class="actions no-print">
      <button class="btn" data-act="add-ing" type="button">إضافة مكوّن</button>
      <button class="btn ghost" data-act="restore-catalog" type="button">استعادة الكتالوج الأصلي</button>
      <button class="btn ghost" data-act="reset-catalog-filters" type="button">مسح الفلاتر</button>
    </div>
  </div>
  <div class="catalog-signal" aria-label="ملخص الكتالوج">
    <div><span>إجمالي المكونات</span><strong>${Catalog.list.length}</strong></div>
    <div><span>مغطاة في الخطة</span><strong>${coveredCount}<small> / ${Catalog.list.length}</small></strong></div>
    <div><span>المعروض الآن</span><strong>${list.length}</strong>${activeFilters ? `<small>${activeFilters} فلتر مفعّل</small>` : ''}</div>
  </div>
  <div class="catalog-filters no-print">
    <div class="field catalog-search"><label for="searchInput">بحث في الكتالوج</label>
      <input type="search" id="searchInput" value="${escapeHtml(ui.q)}" placeholder="اكتب للبحث…"></div>
    <div class="field"><label for="classFilter">التصنيف</label>
      <select id="classFilter"><option value="">كل التصنيفات</option>
        ${CLASSIFICATIONS.filter(c => c.v !== '').map(c =>
          `<option value="${escapeHtml(c.v)}" ${ui.classFilter === c.v ? 'selected' : ''}>${escapeHtml(c.l)}</option>`).join('')}
      </select></div>
    <div class="field"><label for="tagFilter">الوسوم</label>
      <select id="tagFilter">${tagOptions}</select></div>
  </div>
  <div class="catalog-table-wrap">
    <div class="catalog-table-note"><span>تحرير مباشر</span><span>${list.length} من ${Catalog.list.length} مكوّن</span></div>
    <div class="table-wrap">
    <table class="catalog-table">
      <thead><tr><th scope="col">المعرّف</th><th scope="col">الاسم</th><th scope="col">السعر</th><th scope="col">الوحدة</th>
        <th scope="col">التصنيف</th><th scope="col">الفئة</th><th scope="col">العائلة</th>
        <th scope="col">الوسوم والتصنيف الغذائي</th><th scope="col">التغطية</th><th scope="col">إجراءات</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="10" class="empty-state">لا توجد نتائج.</td></tr>'}</tbody>
    </table>
    </div>
  </div>
  <section class="catalog-audit">
    <div><span class="catalog-eyebrow">سجل المراجعة</span><h3>تعديلات الأسعار</h3></div>
    <ul>${auditRows}</ul>
  </section>
</section>`;
  },

  mealCard(meal, mi){
    const cfg = Config.get();
    const r = Validation.meal(meal);
    const isEditing = ui.editingMeal === mi;
    const disp = cfg.display || {};
    const ruleChips = disp.showRuleChips === false ? '' : MEAL_RULE_ORDER.map(rid => {
      const enabled = cfg.rulesEnabled[rid] !== false;
      const failed = r.violations.some(v => v.ruleId === rid);
      let cls = failed ? 'fail' : 'pass';
      let mark = failed ? ' ✗' : ' ✓';
      if (!enabled){ cls = ''; mark = ' (معطّل)'; }
      return `<span class="rule-chip ${cls}">${escapeHtml(RULE_NAMES[rid] || rid)}${mark}</span>`;
    }).join('');
    const breakdownRows = r.breakdown.map(b =>
      `<tr><td>${escapeHtml(b.nameAr)}</td><td>${b.unitPrice.toFixed(cfg.decimalPlaces)}</td><td>${b.qty}</td><td>${b.lineTotal.toFixed(cfg.decimalPlaces)}</td></tr>`).join('');
    const dev = round2(r.cost - cfg.targetMealAvg);
    const violationItems = disp.showViolations === false ? '' : r.violations.map(v =>
      `<li class="${v.severity === 'warning' ? 'warn' : v.severity === 'info' ? 'info' : ''}">${escapeHtml(v.messageAr)}</li>`).join('');
    const costClass = (r.costStatus === 'within') ? '' : ' bad';
    let editor = '';
    if (isEditing){
      const itemsHtml = meal.items.map((it, ii) => {
        const g = Catalog.get(it.id);
        const nm = g ? g.nameAr : it.id;
        return `<li><span class="name">${escapeHtml(nm)}</span>
          <span class="qty">
            <button type="button" data-act="qty-dec" data-meal="${mi}" data-i="${ii}">−</button>
            <b>${it.qty}</b>
            <button type="button" data-act="qty-inc" data-meal="${mi}" data-i="${ii}">+</button>
          </span>
          <button class="btn danger tiny" type="button" data-act="remove-ing" data-meal="${mi}" data-i="${ii}">إزالة</button>
        </li>`;
      }).join('');
      const available = Catalog.list.filter(g => !meal.items.some(x => x.id === g.id));
      const options = available.map(g =>
        `<option value="${escapeHtml(g.id)}">${escapeHtml(g.nameAr)} — ${g.price.toFixed(cfg.decimalPlaces)} ${escapeHtml(cfg.currencyLabel)}</option>`).join('');
      editor = `
<div class="editor no-print">
  <h4 style="font-size:13.5px;margin:0">تعديل الوجبة (تحقق فوري)</h4>
  <ul>${itemsHtml}</ul>
  <div class="add-row">
    <select id="addSelect-${mi}">${options || '<option value="">لا توجد مكونات متاحة</option>'}</select>
    <button class="btn tiny" type="button" data-act="add-ing-meal" data-meal="${mi}">إضافة</button>
  </div>
</div>`;
    }
    return `
<article class="meal-card ${r.ok ? '' : 'bad'}" id="meal-card-${mi}" style="animation-delay:${Math.min(mi, 12) * 45}ms">
  <header>
    <div><span class="meal-index">وجبة ${String(mi + 1).padStart(2, '0')}</span><h3>تفاصيل الوجبة</h3></div>
    <span class="cost-badge${costClass}">${formatMoney(r.cost, cfg)}</span>
  </header>
  ${ruleChips ? `<div class="rule-chips">${ruleChips}</div>` : ''}
  ${disp.showBreakdown === false ? '' : `
  <table class="breakdown">
    <thead><tr><th scope="col">المكوّن</th><th scope="col">سعر الوحدة</th><th scope="col">الكمية</th><th scope="col">الإجمالي</th></tr></thead>
    <tbody>${breakdownRows}</tbody>
    <tfoot>
      <tr><td colspan="3">إجمالي الوجبة</td><td>${r.cost.toFixed(cfg.decimalPlaces)}</td></tr>
      ${disp.showDeviation === false ? '' : `<tr><td colspan="3">Δ عن ${cfg.targetMealAvg.toFixed(cfg.decimalPlaces)}</td><td>${formatSigned(dev, cfg)}</td></tr>`}
    </tfoot>
  </table>`}
  ${violationItems ? `<ul class="violations">${violationItems}</ul>` : ''}
  <div class="no-print">
    <button class="btn ghost tiny" type="button" data-act="toggle-edit" data-meal="${mi}">${isEditing ? 'إغلاق المحرر' : 'تعديل'}</button>
  </div>
  ${editor}
</article>`;
  },

  meals(){
    const cfg = Config.get();
    if (!State.current.meals.length){
      return `<section class="panel meals-panel meal-empty"><div class="workspace-head"><div><span class="workspace-eyebrow">مساحة التخطيط</span><h2>الوجبات</h2><p>تظهر هنا تفاصيل كل وجبة بعد إنشاء الخطة.</p></div></div>
        <div class="empty-state"><span class="empty-kicker">الخطة غير مولّدة</span><h3>ابدأ بتوليد أول خطة</h3><p>سيتم توزيع المكونات والتحقق من القيود تلقائيًا.</p>
        <button class="btn" data-act="gen" type="button">توليد الوجبات</button></div></section>`;
    }
    const cards = State.current.meals.map((m, i) => this.mealCard(m, i)).join('');
    return `
<section class="panel meals-panel">
  <div class="workspace-head no-print">
    <div><span class="workspace-eyebrow">خطة العمل</span><h2>الوجبات</h2><p>${State.current.meals.length} من ${cfg.mealCount} وجبة جاهزة للمراجعة والتعديل.</p></div>
    <div class="actions">
      <button class="btn" data-act="validate-all" type="button">تحقق شامل</button>
      <button class="btn ghost" data-act="print" type="button">طباعة / PDF</button>
    </div>
  </div>
  <div class="meals-grid">${cards}</div>
</section>`;
  },

  settings(){
    const c = Config.get();
    const sec = (title, body, open = false) =>
      `<details class="cfg-section" ${open ? 'open' : ''}><summary>${escapeHtml(title)}</summary><div class="cfg-body">${body}</div></details>`;
    let fldN = 0;
    /* ponytail: associate label with control via data-cfg path (unique per field) */
    const fld = (label, input, hint = '') => {
      const m = /data-cfg="([^"]+)"/.exec(input);
      const fid = 'f-' + (m ? m[1].replace(/[^a-zA-Z0-9]+/g, '-') : 'x' + (fldN++));
      const tagged = input.replace(/<(input|select|textarea)(?=[\s>])/, '<$1 id="' + fid + '"');
      return `<div class="setting-row"><label for="${fid}">${escapeHtml(label)}</label>${tagged}${hint ? `<small>${escapeHtml(hint)}</small>` : ''}</div>`;
    };
    const single = (label, id, path) => {
      const name = id ? (Catalog.get(id)?.nameAr || id) : '— لم يُحدَّد —';
      return `<div class="setting-row"><label>${escapeHtml(label)}</label>
        <div class="picker"><span class="chosen">${escapeHtml(name)}</span>
        <button class="btn ghost tiny" type="button" data-act="pick-single" data-target="${escapeHtml(path)}">تغيير</button></div></div>`;
    };
    const multi = (label, ids, path) => {
      const name = ids?.length ? ids.map(id => Catalog.get(id)?.nameAr || id).join('، ') : '— لا شيء —';
      return `<div class="setting-row"><label>${escapeHtml(label)}</label>
        <div class="picker"><span class="chosen">${escapeHtml(name)}</span>
        <button class="btn ghost tiny" type="button" data-act="pick-multi" data-target="${escapeHtml(path)}">تعديل</button></div></div>`;
    };

    const usageRows = Object.keys(c.ingredientUsageLimits || {}).map(id => {
      const g = Catalog.get(id);
      return `<div class="group-row">
        <div class="names">${escapeHtml(g ? g.nameAr : `؟ ${id}`)} <small class="muted">${escapeHtml(id)}</small></div>
        <input type="number" min="0" max="50" data-usage-limit="${escapeHtml(id)}" value="${c.ingredientUsageLimits[id]}">
        <button class="btn danger tiny" type="button" data-act="delete-usage-limit" data-id="${escapeHtml(id)}">حذف</button>
      </div>`;
    }).join('');

    const exclRows = c.exclusiveGroups.map((grp, i) => {
      const names = isArray(grp) && grp.length ? grp.map(id => Catalog.get(id)?.nameAr || id).join('، ') : '— فارغة —';
      return `<div class="group-row"><div class="names">${escapeHtml(names)}</div>
        <button class="btn ghost tiny" type="button" data-act="edit-excl" data-index="${i}">تعديل</button>
        <button class="btn danger tiny" type="button" data-act="delete-excl" data-index="${i}">حذف</button></div>`;
    }).join('');

    const customRulesList = (c.customRules || []).map(rule => {
      const typeInfo = CUSTOM_RULE_TYPES[rule.type] || { label: rule.type };
      const sev = rule.severity || SEVERITY.ERROR;
      const sevLabel = sev === SEVERITY.ERROR ? 'خطأ' : sev === SEVERITY.WARNING ? 'تحذير' : 'معلومة';
      const sevClass = sev === SEVERITY.ERROR ? 'err' : sev === SEVERITY.WARNING ? 'warn' : 'info';
      const disabledClass = rule.enabled === false ? ' disabled' : '';
      const sevCardClass = sev === SEVERITY.ERROR ? '' : ' sev-' + sev;
      const specSummary = describeCustomRule(rule);
      return `<div class="rule-card${disabledClass}${sevCardClass}">
        <div class="rule-head"><strong>${escapeHtml(rule.name || typeInfo.label)}</strong>
          <div class="rule-actions">
            <span class="rule-badge">${escapeHtml(typeInfo.label)}</span>
            <span class="rule-badge ${sevClass}">${escapeHtml(sevLabel)}</span>
            <label class="small"><input type="checkbox" data-act="toggle-custom-rule" data-rule-id="${escapeHtml(rule.id)}" ${rule.enabled !== false ? 'checked' : ''}> مُفعّلة</label>
            <button class="btn ghost tiny" type="button" data-act="edit-custom-rule" data-rule-id="${escapeHtml(rule.id)}">تعديل</button>
            <button class="btn ghost tiny" type="button" data-act="duplicate-custom-rule" data-rule-id="${escapeHtml(rule.id)}">نسخ</button>
            <button class="btn danger tiny" type="button" data-act="delete-custom-rule" data-rule-id="${escapeHtml(rule.id)}">حذف</button>
          </div>
        </div>
        <div class="rule-spec">${escapeHtml(specSummary)}</div>
      </div>`;
    }).join('');

    /* ponytail: R3 is forced on by enforceChipsInvariant — no toggle, it would be a lie */
    const ruleToggles = Object.keys(c.rulesEnabled).filter(rid => rid !== 'R3').map(rid =>
      `<label><input type="checkbox" data-rule="${escapeHtml(rid)}" ${c.rulesEnabled[rid] !== false ? 'checked' : ''}>
      <span>${escapeHtml(RULE_NAMES[rid] || rid)}</span></label>`).join('');

    const profileRows = Profiles.list.map(p => `
<div class="profile-row">
  <div class="pname">${escapeHtml(p.name)}</div>
  <div class="pdate">${escapeHtml(new Date(p.createdAt).toLocaleString('ar-EG'))}</div>
  <button class="btn ghost tiny" type="button" data-act="load-profile" data-profile-id="${escapeHtml(p.id)}">تحميل</button>
  <button class="btn ghost tiny" type="button" data-act="export-profile" data-profile-id="${escapeHtml(p.id)}">تصدير</button>
  <button class="btn ghost tiny" type="button" data-act="rename-profile" data-profile-id="${escapeHtml(p.id)}">تسمية</button>
  <button class="btn danger tiny" type="button" data-act="delete-profile" data-profile-id="${escapeHtml(p.id)}">حذف</button>
</div>`).join('');

    return `
<section class="panel settings-panel">
  <div class="workspace-head">
    <div><span class="workspace-eyebrow">مساحة الضبط</span><h2>الإعدادات الشاملة</h2><p>تُحفظ التغييرات فورًا وتُطبّق في التوليد والتحقق التاليين.</p></div>
    <div class="actions no-print">
      <button class="btn ghost" data-act="export-settings" type="button">تصدير الإعدادات</button>
      <button class="btn ghost" data-act="import-settings" type="button">استيراد الإعدادات</button>
    </div>
  </div>
  <p class="small muted">كل التغييرات تُحفظ تلقائيًا. اضغط على رأس كل قسم للفتح/الإغلاق.</p>
  <div class="settings-sections">
  ${sec('هوية التطبيق والعرض', `
    <div class="settings-grid">
      ${fld('اسم التطبيق', `<input type="text" data-cfg="appName" value="${escapeHtml(c.appName)}">`)}
      ${fld('اسم الخطة', `<input type="text" data-cfg="planName" value="${escapeHtml(c.planName)}">`)}
      ${fld('رمز العملة', `<input type="text" data-cfg="currencyLabel" value="${escapeHtml(c.currencyLabel)}">`)}
      ${fld('المنازل العشرية', `<input type="number" min="0" max="4" data-cfg="decimalPlaces" value="${c.decimalPlaces}">`, '0-4')}
    </div>`, true)}
  ${sec('أساسيات الخطة', `
    <div class="settings-grid">
      ${fld('عدد الوجبات', `<input type="number" min="1" max="50" data-cfg="mealCount" value="${c.mealCount}">`)}
      ${fld('الحد الأدنى للمكونات', `<input type="number" min="1" max="30" data-cfg="minIngredientsPerMeal" value="${c.minIngredientsPerMeal}">`)}
      ${fld('البذرة العشوائية', `<input type="number" data-cfg="seed" value="${c.seed}">`)}
      ${fld('تغطية كل المكونات', `<input type="checkbox" data-cfg="requireCoverage" ${c.requireCoverage ? 'checked' : ''}>`)}
    </div>`)}
  ${sec('القيود المالية', `
    <div class="settings-grid">
      ${fld('الحد الأدنى للوجبة', `<input type="number" min="0" step="0.01" data-cfg="minMealCost" value="${c.minMealCost.toFixed(2)}">`)}
      ${fld('الحد الأقصى للوجبة', `<input type="number" min="0" step="0.01" data-cfg="maxMealCost" value="${c.maxMealCost.toFixed(2)}">`)}
      ${fld('المتوسط المستهدف', `<input type="number" min="0" step="0.01" data-cfg="targetMealAvg" value="${c.targetMealAvg.toFixed(2)}">`,
        `إجمالي مستهدف = ${formatMoney(c.targetMealAvg * c.mealCount, c)}`)}
    </div>`)}
  ${sec('استراتيجية التوليد', `
    <div class="settings-grid">
      ${fld('عدد محاولات البذرة', `<input type="number" min="1" max="100" data-cfg="generation.maxSeedAttempts" value="${c.generation.maxSeedAttempts}">`)}
      ${fld('محاولات لكل وجبة', `<input type="number" min="10" max="5000" step="10" data-cfg="generation.maxMealAttempts" value="${c.generation.maxMealAttempts}">`)}
      ${fld('تكرارات ضبط الخطة', `<input type="number" min="10" max="5000" step="10" data-cfg="generation.maxTuneIterations" value="${c.generation.maxTuneIterations}">`)}
      ${fld('تفاوت الهدف', `<input type="number" min="0" max="10" step="0.01" data-cfg="generation.targetTolerance" value="${c.generation.targetTolerance}">`)}
      ${fld('احتمال الفطير', `<input type="number" min="0" max="1" step="0.05" data-cfg="generation.pastryProbability" value="${c.generation.pastryProbability}">`)}
    </div>`)}
  ${sec('إعدادات الكميات', `
    <div class="settings-grid">
      ${fld('الكمية الافتراضية', `<input type="number" min="1" max="50" data-cfg="quantityDefaults.defaultQty" value="${c.quantityDefaults.defaultQty}">`)}
      ${fld('الحد الأقصى للكمية', `<input type="number" min="1" max="50" data-cfg="quantityDefaults.maxQty" value="${c.quantityDefaults.maxQty}">`)}
    </div>`)}
  ${sec('خيارات العرض', `
    <div class="settings-grid">
      ${fld('شرائح القواعد', `<input type="checkbox" data-cfg="display.showRuleChips" ${c.display.showRuleChips ? 'checked' : ''}>`)}
      ${fld('جدول التكلفة', `<input type="checkbox" data-cfg="display.showBreakdown" ${c.display.showBreakdown ? 'checked' : ''}>`)}
      ${fld('قائمة المخالفات', `<input type="checkbox" data-cfg="display.showViolations" ${c.display.showViolations ? 'checked' : ''}>`)}
      ${fld('الانحراف عن المتوسط', `<input type="checkbox" data-cfg="display.showDeviation" ${c.display.showDeviation ? 'checked' : ''}>`)}
    </div>`)}
  ${sec('سلوك التطبيق', `
    <div class="settings-grid">
      ${fld('الحفظ التلقائي', `<input type="checkbox" data-cfg="behavior.autoSave" ${c.behavior.autoSave ? 'checked' : ''}>`)}
      ${fld('تأكيد قبل الإجراءات المدمّرة', `<input type="checkbox" data-cfg="behavior.confirmDestructive" ${c.behavior.confirmDestructive ? 'checked' : ''}>`)}
      ${fld('الحركات والانتقالات', `<input type="checkbox" data-cfg="behavior.enableAnimations" ${c.behavior.enableAnimations ? 'checked' : ''}>`)}
      ${fld('مدة التنبيهات', `<input type="number" min="500" max="20000" step="100" data-cfg="behavior.toastDurationMs" value="${c.behavior.toastDurationMs}">`, 'مللي ثانية')}
    </div>`)}
  ${sec('الشيبسي (مطلوب في كل وجبة)', `
    <p class="small muted">الشيبسي مكوّن أساسي يظهر في كل وجبة مرة واحدة بالضبط. لا علاقة له بعبوة الشويبس (المشروب الغازي) — كل منهما مستقل تمامًا.</p>
    <div class="settings-grid">
      ${multi('مكونات الشيبسي', c.chips.ids, 'chips.ids')}
    </div>`)}
  ${sec('حدود استخدام المكونات', `
    <p class="small muted">عند تحديد حد لمكوّن، لن يظهر في أكثر من هذا العدد من الوجبات. 0 = منع كامل. الشيبسي مستثنى لأنه إلزامي.</p>
    <div class="group-editor">
      ${usageRows || '<p class="muted small">لا توجد حدود محددة.</p>'}
      <button class="btn ghost tiny" type="button" data-act="add-usage-limit">+ إضافة حد</button>
    </div>`)}
  ${sec('الخبز والفطير', `
    <div class="settings-grid">
      ${single('مكوّن الخبز', c.bread.id, 'bread.id')}
      ${single('مكوّن الفطير', c.bread.pastryId, 'bread.pastryId')}
      ${fld('كمية الخبز مع الفطير', `<input type="number" min="0" max="20" data-cfg="bread.qtyWithPastry" value="${c.bread.qtyWithPastry}">`)}
      ${fld('كمية الخبز بدون فطير', `<input type="number" min="0" max="20" data-cfg="bread.qtyWithoutPastry" value="${c.bread.qtyWithoutPastry}">`)}
    </div>`)}
  ${sec('السلطة والخيار', `
    <div class="settings-grid">
      ${single('مكوّن السلطة', c.salad.id, 'salad.id')}
      ${multi('السلطة مطلوبة مع', c.salad.requiredWith, 'salad.requiredWith')}
      ${single('مكوّن الخيار والطماطم', c.cucumber.id, 'cucumber.id')}
      ${multi('الخيار ممنوع مع', c.cucumber.forbiddenWith, 'cucumber.forbiddenWith')}
      ${fld('الخيار يتطلب وجود جبن', `<input type="checkbox" data-cfg="cucumber.requiresCheese" ${c.cucumber.requiresCheese ? 'checked' : ''}>`)}
    </div>`)}
  ${sec('جبنة المثلثات', `
    <div class="settings-grid">
      ${single('مكوّن قطعة الجبنة', c.triangleCheese.id, 'triangleCheese.id')}
      ${single('مكوّن علبة المثلثات', c.triangleCheese.boxId, 'triangleCheese.boxId')}
      ${fld('الكمية المطلوبة', `<input type="number" min="0" max="20" data-cfg="triangleCheese.qty" value="${c.triangleCheese.qty}">`)}
      ${multi('تُفعَّل عند وجود', c.triangleCheese.triggers, 'triangleCheese.triggers')}
    </div>`)}
  ${sec('الطحينة', `
    <div class="settings-grid">
      ${single('مكوّن الطحينة', c.tahini.id, 'tahini.id')}
      ${single('مسموحة فقط مع', c.tahini.requiresId, 'tahini.requiresId')}
    </div>`)}
  ${sec('المكونات التي تُحتسب كجبن', `
    <div class="settings-grid">${multi('قائمة مكونات الجبن', c.cheeseIds, 'cheeseIds')}</div>`)}
  ${sec('مجموعات الاستبعاد', `
    <p class="small muted">كل مجموعة تمنع وجود أكثر من عنصر واحد منها في نفس الوجبة.</p>
    <div class="group-editor">${exclRows}
      <button class="btn ghost tiny" type="button" data-act="add-excl">+ إضافة مجموعة</button>
    </div>`)}
  ${sec('التوازن الغذائي (سكري / مالح)', `
    <p class="small muted">يضمن هذا القسم توزيعًا متوازنًا بين المكونات السكرية والمالحة. داخل الوجبة تُحتسب الفئة العالية فقط، وعلى مستوى الخطة تُحتسب العالية والمتوسطة معًا.</p>
    <div class="settings-grid">
      ${fld('تفعيل نظام التوازن', `<input type="checkbox" data-cfg="nutritionBalance.enabled" ${c.nutritionBalance.enabled ? 'checked' : ''}>`)}
      ${fld('توازن داخل الوجبة', `<input type="checkbox" data-cfg="nutritionBalance.perMeal.enabled" ${c.nutritionBalance.perMeal.enabled ? 'checked' : ''}>`)}
      ${fld('الحد الأقصى للسكريات العالية', `<input type="number" min="0" max="5" data-cfg="nutritionBalance.perMeal.maxHighSugar" value="${c.nutritionBalance.perMeal.maxHighSugar}">`)}
      ${fld('الحد الأقصى للأملاح العالية', `<input type="number" min="0" max="5" data-cfg="nutritionBalance.perMeal.maxHighSodium" value="${c.nutritionBalance.perMeal.maxHighSodium}">`)}
      ${fld('منع تكرار الفئة العليا', `<input type="checkbox" data-cfg="nutritionBalance.noDuplicateTopCategory" ${c.nutritionBalance.noDuplicateTopCategory ? 'checked' : ''}>`)}
      ${fld('توازن على مستوى الخطة', `<input type="checkbox" data-cfg="nutritionBalance.planWide.enabled" ${c.nutritionBalance.planWide.enabled ? 'checked' : ''}>`)}
      ${fld('الحد الأدنى للنسبة', `<input type="number" min="0" max="5" step="0.1" data-cfg="nutritionBalance.planWide.minRatio" value="${c.nutritionBalance.planWide.minRatio}">`)}
      ${fld('الحد الأقصى للنسبة', `<input type="number" min="0" max="5" step="0.1" data-cfg="nutritionBalance.planWide.maxRatio" value="${c.nutritionBalance.planWide.maxRatio}">`)}
    </div>`)}
  ${sec('محرك القواعد المخصصة', `
    <p class="small muted">أنشئ قواعدك الخاصة بلا حدود: مجموعات استبعاد، منع ثنائي، منع/إلزام شرطي، سماح مشروط.</p>
    <div class="actions" style="margin-bottom:12px">
      <button class="btn" type="button" data-act="add-custom-rule">+ قاعدة جديدة</button>
    </div>
    ${customRulesList || '<p class="muted small">لا توجد قواعد مخصصة.</p>'}`)}
  ${sec('تشغيل / إيقاف القواعد المدمجة', `<div class="toggle-list">${ruleToggles}</div>`)}
  ${sec('البروفايلات', `
    <div class="actions" style="margin-bottom:12px">
      <button class="btn" type="button" data-act="save-profile">+ حفظ كبروفايل</button>
      <button class="btn ghost" type="button" data-act="import-profile">استيراد</button>
    </div>
    ${profileRows || '<p class="muted small">لا توجد بروفايلات.</p>'}`)}
  ${sec('محرر JSON متقدم', `
    <p class="small muted">حرّر الإعدادات مباشرة كـ JSON.</p>
    <textarea id="jsonEditor" rows="16">${escapeHtml(JSON.stringify(c, null, 2))}</textarea>
    <div class="actions" style="margin-top:10px">
      <button class="btn" type="button" data-act="save-json">حفظ</button>
      <button class="btn ghost" type="button" data-act="reload-json">إعادة تحميل</button>
      <button class="btn ghost" type="button" data-act="copy-json">نسخ</button>
    </div>`)}
  ${sec('إعادة تعيين متقدمة', `
    <div class="actions" style="flex-wrap:wrap">
      <button class="btn warn" type="button" data-act="reset-settings">استعادة الإعدادات الافتراضية</button>
      <button class="btn danger" type="button" data-act="factory-reset">إعادة تعيين شاملة</button>
    </div>`)}
  </div>
</section>`;
  },

  log(){
    /* ponytail: tolerate foreign/legacy log entries — never crash the log view */
    const entries = (isArray(State.current.log) ? State.current.log : []).filter(isObject);
    const items = entries.length
      ? entries.map(e => {
          const msgs = isArray(e.messages) ? e.messages : [];
          const shown = msgs.length
            ? `<ul>${msgs.slice(0, 8).map(m => `<li>${escapeHtml(m)}</li>`).join('')}${msgs.length > 8 ? `<li>و${msgs.length - 8} رسالة أخرى…</li>` : ''}</ul>`
            : '<div class="small muted" style="margin-top:4px">لا توجد مخالفات.</div>';
          return `<li class="log-item ${e.ok ? 'ok' : 'bad'}">
            <div class="log-head">
              <strong>${escapeHtml(e.scope)}</strong>
              <span>${e.ok ? 'سليم' : 'مخالفات'}</span>
              <span class="muted small">${escapeHtml(new Date(e.ts).toLocaleString('ar-EG'))}</span>
            </div>${shown}</li>`;
        }).join('')
      : '<li class="empty-state">لا توجد عمليات تحقق مسجلة بعد.</li>';
    return `<section class="panel log-panel">
      <div class="workspace-head"><div><span class="workspace-eyebrow">سجل تشغيلي</span><h2>سجل التحقق</h2><p>${entries.length ? `${entries.length} عملية تحقق محفوظة للمراجعة.` : 'ستظهر هنا نتائج التحقق من الخطط والتعديلات.'}</p></div>
        <div class="actions no-print"><button class="btn ghost" data-act="clear-log" type="button">تفريغ السجل</button></div>
      </div>
      <ul class="log-list">${items}</ul></section>`;
  }
};


'use strict';
/* =====================================================================
   §17 — MODAL EDITORS
   ===================================================================== */

const Modals = {
  tags(ingId){
    const g = Catalog.get(ingId);
    if (!g) return;
    const body = `<p class="small muted">حدّد الوسوم الخاصة بـ «${escapeHtml(g.nameAr)}».</p>
      <div class="tag-grid">${ALL_TAGS.map(t => `
        <label class="tag-item">
          <input type="checkbox" data-act="toggle-tag" data-id="${escapeHtml(g.id)}" data-tag="${escapeHtml(t)}" ${(g.specialRules || []).includes(t) ? 'checked' : ''}>
          <span>${escapeHtml(TAG_LABELS[t])}</span>
        </label>`).join('')}</div>`;
    UI.showModal({ title: 'الوسوم الخاصة', body, confirmLabel: 'تم',
      onConfirm(){ UI.hideModal(); render(); return true; } });
  },

  price(ingId){
    const g = Catalog.get(ingId);
    if (!g) return;
    const cfg = Config.get();
    const body = `<p>السعر الحالي لـ «${escapeHtml(g.nameAr)}» هو <strong>${formatMoney(g.price, cfg)}</strong>.</p>
      <label class="small"><strong>السعر الجديد</strong></label>
      <input type="number" id="priceInput" min="0" step="0.01" value="${g.price.toFixed(2)}" style="margin-top:6px">`;
    UI.showModal({ title: 'تأكيد تعديل السعر', body, confirmLabel: 'تأكيد', danger: true,
      onConfirm(){
        const val = parseFloat(document.getElementById('priceInput')?.value);
        if (!isNum(val) || val < 0){ UI.toast('قيمة غير صالحة', 'err'); return false; }
        const newPrice = round2(val);
        if (newPrice === g.price){ UI.toast('لم يتغير', 'warn'); UI.hideModal(); return true; }
        State.addPriceAudit({ ts: new Date().toISOString(), id: g.id, nameAr: g.nameAr, oldPrice: g.price, newPrice });
        g.price = newPrice;
        State.save();
        UI.hideModal();
        render();
        UI.logValidation(`تعديل سعر: ${g.nameAr}`, Validation.plan(State.current.meals));
        UI.toast('تم تعديل السعر', 'ok');
        return true;
      }});
  },

  addIngredient(){
    const newId = Catalog.nextId();
    const clsOpts = CLASSIFICATIONS.map(c => `<option value="${escapeHtml(c.v)}">${escapeHtml(c.l)}</option>`).join('');
    const tagChecks = ALL_TAGS.map(t => `<label class="tag-item"><input type="checkbox" data-newtag="${escapeHtml(t)}"><span>${escapeHtml(TAG_LABELS[t])}</span></label>`).join('');
    const body = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">
        <div><label class="small"><strong>المعرّف</strong></label><input type="text" id="newId" value="${escapeHtml(newId)}"></div>
        <div><label class="small"><strong>الاسم</strong></label><input type="text" id="newName"></div>
        <div><label class="small"><strong>السعر</strong></label><input type="number" id="newPrice" min="0" step="0.01" value="0.00"></div>
        <div><label class="small"><strong>الوحدة</strong></label><input type="text" id="newUnit"></div>
        <div><label class="small"><strong>التصنيف</strong></label><select id="newClass">${clsOpts}</select></div>
        <div><label class="small"><strong>الفئة</strong></label><input type="text" id="newCategory"></div>
        <div><label class="small"><strong>العائلة</strong></label><input type="text" id="newFamily"></div>
      </div>
      <p class="small muted" style="margin-top:12px">الوسوم الخاصة:</p>
      <div class="tag-grid">${tagChecks}</div>`;
    UI.showModal({ title: 'إضافة مكوّن جديد', body, confirmLabel: 'إضافة',
      onConfirm(){
        const id = document.getElementById('newId').value.trim();
        const nameAr = document.getElementById('newName').value.trim();
        const price = parseFloat(document.getElementById('newPrice').value);
        if (!id){ UI.toast('المعرّف مطلوب', 'err'); return false; }
        if (!nameAr){ UI.toast('الاسم مطلوب', 'err'); return false; }
        if (!isNum(price) || price < 0){ UI.toast('سعر غير صالح', 'err'); return false; }
        if (Catalog.has(id)){ UI.toast('المعرّف مستخدم', 'err'); return false; }
        const tags = Array.from(document.querySelectorAll('#modalBody input[data-newtag]:checked')).map(x => x.getAttribute('data-newtag'));
        const ok = Catalog.add({ id, nameAr, price: round2(price),
          unit: document.getElementById('newUnit').value.trim(),
          classification: document.getElementById('newClass').value,
          category: document.getElementById('newCategory').value.trim(),
          family: document.getElementById('newFamily').value.trim(),
          specialRules: tags, nutrition: { sugar:'low', sodium:'low' } });
        if (!ok){ UI.toast('تعذّرت الإضافة', 'err'); return false; }
        State.current.ingredients = Catalog.list;
        State.save();
        UI.hideModal(); render();
        UI.toast('تمت الإضافة', 'ok');
        return true;
      }});
  },

  deleteIngredient(id){
    const g = Catalog.get(id);
    if (!g) return;
    const usage = State.current.meals.reduce((n, m) => n + m.items.filter(it => it.id === id).length, 0);
    const run = () => {
      State.current.ingredients = State.current.ingredients.filter(x => x.id !== id);
      State.current.meals.forEach(m => { m.items = m.items.filter(it => it.id !== id); });
      Catalog.remove(id);
      Config.save();
      State.save();
      UI.hideModal(); render();
      UI.toast('تم الحذف', 'ok');
      return true;
    };
    confirmDestructive({ title: 'تأكيد الحذف',
      body: `<p>سيتم حذف «${escapeHtml(g.nameAr)}».</p>${usage ? `<p class="small">يظهر في ${usage} وجبة.</p>` : ''}`,
      confirmLabel: 'حذف', run });
  },

  restoreCatalog(){
    const run = () => {
      Catalog.reset();
      State.current.ingredients = Catalog.list;
      State.current.meals.forEach(m => { m.items = m.items.filter(it => Catalog.has(it.id)); });
      State.save();
      UI.hideModal(); render();
      UI.toast('تمت الاستعادة', 'ok');
      return true;
    };
    confirmDestructive({ title: 'استعادة الكتالوج الأصلي',
      body: '<p>سيتم حذف كل المكونات المخصصة والعودة للـ 33 الأصلية.</p>',
      confirmLabel: 'استعادة', run });
  },

  customRule(ruleId){
    const existing = ruleId ? (Config.get().customRules || []).find(r => r.id === ruleId) : null;
    const isNew = !existing;
    const r = existing ? deepClone(existing) : { id: newId('cr'), name: '', type: 'exclusiveGroup', enabled: true, severity: SEVERITY.ERROR, spec: {} };
    if (!r.spec) r.spec = {};
    const typeOpts = Object.keys(CUSTOM_RULE_TYPES).map(t =>
      `<option value="${escapeHtml(t)}" ${r.type === t ? 'selected' : ''}>${escapeHtml(CUSTOM_RULE_TYPES[t].label)}</option>`).join('');
    const sevOpts = [SEVERITY.ERROR,SEVERITY.WARNING,SEVERITY.INFO].map(s => {
      const lbl = s === SEVERITY.ERROR ? 'خطأ (يمنع)' : s === SEVERITY.WARNING ? 'تحذير' : 'معلومة';
      return `<option value="${s}" ${(r.severity || SEVERITY.ERROR) === s ? 'selected' : ''}>${lbl}</option>`;
    }).join('');
    const body = `<div class="settings-grid" style="margin-bottom:12px">
      <div><label class="small"><strong>اسم القاعدة</strong></label><input type="text" id="crName" value="${escapeHtml(r.name || '')}"></div>
      <div><label class="small"><strong>النوع</strong></label><select id="crType">${typeOpts}</select></div>
      <div><label class="small"><strong>الشدة</strong></label><select id="crSeverity">${sevOpts}</select></div>
      <div><label class="small"><strong>مُفعّلة</strong></label><input type="checkbox" id="crEnabled" ${r.enabled !== false ? 'checked' : ''} style="transform:scale(1.15);margin-top:6px"></div>
    </div><div id="crSpecArea"></div>`;
    UI.showModal({ title: isNew ? 'قاعدة مخصصة جديدة' : 'تعديل القاعدة', body, confirmLabel: 'حفظ',
      onConfirm(){
        const name = document.getElementById('crName').value.trim();
        const type = document.getElementById('crType').value;
        const severity = document.getElementById('crSeverity').value;
        const enabled = document.getElementById('crEnabled').checked;
        const spec = Modals._collectCustomSpec(type);
        if (!name){ UI.toast('الاسم مطلوب', 'err'); return false; }
        const v = Modals._validateCustomSpec(type, spec);
        if (!v.ok){ UI.toast(v.msg, 'err'); return false; }
        const finalRule = { id: r.id, name, type, severity, enabled, spec };
        const rules = Config.get().customRules;
        if (isNew) rules.push(finalRule);
        else { const idx = rules.findIndex(x => x.id === r.id); if (idx !== -1) rules[idx] = finalRule; }
        Config.save();
        UI.hideModal(); render();
        UI.toast(isNew ? 'تمت الإضافة' : 'تم التعديل', 'ok');
        return true;
      }});
    setTimeout(() => {
      Modals._renderCustomSpec(r.type, r.spec || {});
      const tsel = document.getElementById('crType');
      if (tsel) tsel.onchange = () => Modals._renderCustomSpec(tsel.value, {});
    }, 20);
  },

  _renderCustomSpec(type, spec){
    const area = document.getElementById('crSpecArea');
    if (!area) return;
    spec = spec || {};
    const multiHtml = (id, selected) => `<div class="tag-grid" id="${id}">${Catalog.list.map(g => `
      <label class="tag-item"><input type="checkbox" value="${escapeHtml(g.id)}" ${(selected || []).includes(g.id) ? 'checked' : ''}>
      <span>${escapeHtml(g.nameAr)}</span></label>`).join('')}</div>`;
    const singleHtml = (id, selected) => `<select id="${id}"><option value="">— اختر —</option>
      ${Catalog.list.map(g => `<option value="${escapeHtml(g.id)}" ${selected === g.id ? 'selected' : ''}>${escapeHtml(g.nameAr)}</option>`).join('')}</select>`;
    let html = '<p class="small muted">' + escapeHtml(CUSTOM_RULE_TYPES[type]?.hint || '') + '</p>';
    if (type === 'exclusiveGroup') html += '<label class="small"><strong>عناصر المجموعة:</strong></label>' + multiHtml('crSpecItems', spec.items || []);
    else if (type === 'forbidPair') html += `<div class="settings-grid"><div><label class="small"><strong>A</strong></label>${singleHtml('crSpecA', spec.a)}</div><div><label class="small"><strong>B</strong></label>${singleHtml('crSpecB', spec.b)}</div></div>`;
    else if (type === 'forbidWith') html += `<div style="margin-bottom:10px"><label class="small"><strong>الممنوع</strong></label>${singleHtml('crSpecTarget', spec.target)}</div><label class="small"><strong>يُمنع عند وجود:</strong></label>${multiHtml('crSpecTriggers', spec.triggers || [])}`;
    else if (type === 'requireWith') html += `<label class="small"><strong>يُفعَّل عند وجود:</strong></label>${multiHtml('crSpecTriggers', spec.triggers || [])}<label class="small" style="margin-top:10px;display:block"><strong>المطلوبة عند التفعيل:</strong></label><div id="crThenAddList"></div><button class="btn ghost tiny" type="button" id="crAddThenAdd" style="margin-top:6px">+ عنصر مطلوب</button>`;
    else if (type === 'allowOnlyWith') html += `<div style="margin-bottom:10px"><label class="small"><strong>المشروط</strong></label>${singleHtml('crSpecTarget', spec.target)}</div><label class="small"><strong>مسموح فقط مع:</strong></label>${multiHtml('crSpecAllowedWith', spec.allowedWith || [])}`;
    area.innerHTML = html;
    if (type === 'requireWith'){
      const list = document.getElementById('crThenAddList');
      const initial = isArray(spec.thenAdd) ? spec.thenAdd.slice() : [];
      const renderThenAdd = () => {
        if (!list) return;
        list.innerHTML = initial.map((t, i) => `<div class="group-row" style="margin-bottom:6px">
          <select data-then-id="${i}" style="flex:1 1 auto"><option value="">— اختر —</option>
            ${Catalog.list.map(g => `<option value="${escapeHtml(g.id)}" ${t.id === g.id ? 'selected' : ''}>${escapeHtml(g.nameAr)}</option>`).join('')}
          </select>
          <input type="number" min="1" max="50" value="${t.qty || 1}" data-then-qty="${i}" style="width:80px">
          <button class="btn danger tiny" type="button" data-then-del="${i}">حذف</button></div>`).join('');
        list.querySelectorAll('[data-then-id]').forEach(sel => {
          sel.onchange = e => { initial[parseInt(sel.getAttribute('data-then-id'), 10)].id = e.target.value; };
        });
        list.querySelectorAll('[data-then-qty]').forEach(inp => {
          inp.onchange = e => { initial[parseInt(inp.getAttribute('data-then-qty'), 10)].qty = Math.max(1, parseInt(e.target.value, 10) || 1); };
        });
        list.querySelectorAll('[data-then-del]').forEach(btn => {
          btn.onclick = () => { initial.splice(parseInt(btn.getAttribute('data-then-del'), 10), 1); renderThenAdd(); };
        });
      };
      renderThenAdd();
      const addBtn = document.getElementById('crAddThenAdd');
      if (addBtn) addBtn.onclick = () => { initial.push({ id: '', qty: 1 }); renderThenAdd(); };
      area._thenAddData = initial;
    }
  },

  _collectCustomSpec(type){
    const spec = {};
    if (type === 'exclusiveGroup') spec.items = Array.from(document.querySelectorAll('#crSpecItems input:checked')).map(x => x.value);
    if (type === 'forbidPair'){ spec.a = document.getElementById('crSpecA')?.value || ''; spec.b = document.getElementById('crSpecB')?.value || ''; }
    if (type === 'forbidWith'){ spec.target = document.getElementById('crSpecTarget')?.value || ''; spec.triggers = Array.from(document.querySelectorAll('#crSpecTriggers input:checked')).map(x => x.value); }
    if (type === 'requireWith'){ spec.triggers = Array.from(document.querySelectorAll('#crSpecTriggers input:checked')).map(x => x.value);
      const initial = document.getElementById('crSpecArea')?._thenAddData || [];
      spec.thenAdd = initial.filter(t => t.id).map(t => ({ id: t.id, qty: Math.max(1, parseInt(t.qty, 10) || 1) })); }
    if (type === 'allowOnlyWith'){ spec.target = document.getElementById('crSpecTarget')?.value || ''; spec.allowedWith = Array.from(document.querySelectorAll('#crSpecAllowedWith input:checked')).map(x => x.value); }
    return spec;
  },

  _validateCustomSpec(type, spec){
    if (type === 'exclusiveGroup' && (!spec.items || spec.items.length < 2)) return { ok:false, msg:'تحتاج عنصرين على الأقل' };
    if (type === 'forbidPair'){ if (!spec.a || !spec.b) return { ok:false, msg:'اختر العنصرين' }; if (spec.a === spec.b) return { ok:false, msg:'لا يمكن منع عنصر مع نفسه' }; }
    if (type === 'forbidWith'){ if (!spec.target) return { ok:false, msg:'اختر العنصر الممنوع' }; if (!spec.triggers?.length) return { ok:false, msg:'اختر مُشغِّلًا واحدًا على الأقل' }; }
    if (type === 'requireWith'){ if (!spec.triggers?.length) return { ok:false, msg:'اختر مُشغِّلًا واحدًا' }; if (!spec.thenAdd?.length) return { ok:false, msg:'أضف عنصرًا مطلوبًا واحدًا' }; }
    if (type === 'allowOnlyWith'){ if (!spec.target) return { ok:false, msg:'اختر العنصر المشروط' }; if (!spec.allowedWith?.length) return { ok:false, msg:'اختر عنصرًا مُجيزًا' }; }
    return { ok:true };
  },

  saveProfile(){
    const body = '<label class="small"><strong>اسم البروفايل</strong></label><input type="text" id="profileName" placeholder="مثال: خطة رمضان" style="margin-top:6px">';
    UI.showModal({ title: 'حفظ الإعدادات كبروفايل', body, confirmLabel: 'حفظ',
      onConfirm(){
        const name = document.getElementById('profileName').value.trim();
        if (!name){ UI.toast('الاسم مطلوب', 'err'); return false; }
        Profiles.add(name);
        UI.hideModal(); render();
        UI.toast('تم الحفظ', 'ok');
        return true;
      }});
  },

  loadProfile(id){
    const p = Profiles.get(id);
    if (!p) return;
    const run = () => {
      Profiles.loadIntoConfig(id);
      UI.hideModal(); render();
      UI.toast('تم التحميل', 'ok');
      return true;
    };
    confirmDestructive({ title: 'تحميل البروفايل', body: `<p>سيتم استبدال الإعدادات بـ «${escapeHtml(p.name)}».</p>`,
      confirmLabel: 'تحميل', run });
  },

  renameProfile(id){
    const p = Profiles.get(id);
    if (!p) return;
    UI.showModal({ title: 'إعادة تسمية', body: `<input type="text" id="profileName" value="${escapeHtml(p.name)}">`,
      confirmLabel: 'حفظ',
      onConfirm(){
        const name = document.getElementById('profileName').value.trim();
        if (!name){ UI.toast('الاسم مطلوب', 'err'); return false; }
        Profiles.rename(id, name);
        UI.hideModal(); render();
        return true;
      }});
  },

  deleteProfile(id){
    const p = Profiles.get(id);
    if (!p) return;
    const run = () => {
      Profiles.remove(id);
      UI.hideModal(); render();
      UI.toast('تم الحذف', 'ok');
      return true;
    };
    confirmDestructive({ title: 'حذف البروفايل', body: `<p>سيتم حذف «${escapeHtml(p.name)}» نهائيًا.</p>`,
      confirmLabel: 'حذف', run });
  },

  exportProfile(id){
    const p = Profiles.get(id);
    if (!p) return;
    downloadJson(`profile-${p.name.replace(/\s+/g,'-')}.json`, { app:'meals-planner-profile', profile: p });
    UI.toast('تم التصدير', 'ok');
  },

  importProfileFile(file){
    readJsonFile(file, parsed => {
      try {
        const p = parsed?.profile || parsed;
        if (!isObject(p) || !p.config){ UI.toast('ملف غير صالح', 'err'); return; }
        Profiles.list.push({ id: newId('p'), name: p.name || 'بروفايل مستورد', createdAt: new Date().toISOString(), config: p.config });
        Profiles.save(); render();
        UI.toast('تم الاستيراد', 'ok');
      } catch(e){ UI.toast('تعذّر القراءة', 'err'); }
    }, () => UI.toast('تعذّر القراءة', 'err'));
  },

  exportSettings(){
    downloadJson('meals-planner-config.json', Config.get());
    UI.toast('تم التصدير', 'ok');
  },

  importSettingsFile(file){
    readJsonFile(file, parsed => {
      try {
        if (!isObject(parsed)) throw new Error('ليس كائنًا');
        Config.current = normalizeConfig(parsed);
        Config.save(); render();
        UI.toast('تم الاستيراد', 'ok');
      } catch(e){ UI.toast('ملف غير صالح', 'err'); }
    }, () => UI.toast('ملف غير صالح', 'err'));
  }
};

