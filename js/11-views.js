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
<section class="panel">
  <div class="panel-head">
    <h2>${escapeHtml(cfg.planName || 'لوحة التحكم')}</h2>
    <div class="actions no-print">
      <button class="btn" data-act="gen" type="button">توليد الوجبات</button>
      <button class="btn warn" data-act="reset" type="button">إعادة تعيين</button>
      <button class="btn ghost" data-act="export" type="button">تصدير</button>
      <button class="btn ghost" data-act="import" type="button">استيراد</button>
      <button class="btn ghost" data-act="print" type="button">طباعة / PDF</button>
    </div>
  </div>
  <div class="status-banner ${bannerClass}">${escapeHtml(bannerTitle)}${bannerList}</div>
  <div class="stats">
    <div class="stat"><span>عدد الوجبات</span><strong>${State.current.meals.length} / ${cfg.mealCount}</strong></div>
    <div class="stat"><span>إجمالي التكلفة</span><strong>${formatMoney(validation.total, cfg)}</strong><small>الهدف ${formatMoney(validation.targetTotal, cfg)}</small></div>
    <div class="stat"><span>متوسط الوجبة</span><strong>${formatMoney(validation.average, cfg)}</strong><small>الهدف ${formatMoney(cfg.targetMealAvg, cfg)}</small></div>
    <div class="stat"><span>Δ</span><strong>${formatSigned(validation.delta, cfg)}</strong><small>${formatMoney(cfg.minMealCost, cfg)} – ${formatMoney(cfg.maxMealCost, cfg)}</small></div>
    <div class="stat"><span>تغطية المكونات</span><strong>${validation.usedCount} / ${Catalog.list.length}</strong></div>
    <div class="stat"><span>وجبات سليمة</span><strong>${validCount} / ${State.current.meals.length}</strong></div>
  </div>
  <h3 style="font-size:15px;margin-top:4px">حالة الوجبات</h3>
  <div class="meal-chips">${chips}</div>
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
    const tagOptions = `<option value="">كل الوسوم</option>` + ALL_TAGS.map(t =>
      `<option value="${escapeHtml(t)}" ${ui.tagFilter === t ? 'selected' : ''}>${escapeHtml(TAG_LABELS[t])}</option>`).join('');
    const rows = list.map(g => {
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
<tr>
  <td class="muted small">${escapeHtml(g.id)}</td>
  <td><input type="text" data-field="nameAr" data-id="${escapeHtml(g.id)}" value="${escapeHtml(g.nameAr)}" style="min-width:180px"></td>
  <td class="price-cell">${g.price.toFixed(Config.get().decimalPlaces)} ${escapeHtml(Config.get().currencyLabel)}</td>
  <td><input type="text" data-field="unit" data-id="${escapeHtml(g.id)}" value="${escapeHtml(g.unit || '')}" placeholder="غير محدد"></td>
  <td><select data-field="classification" data-id="${escapeHtml(g.id)}">${clsOptions}</select></td>
  <td><input type="text" data-field="category" data-id="${escapeHtml(g.id)}" value="${escapeHtml(g.category || '')}" placeholder="غير محدد"></td>
  <td><input type="text" data-field="family" data-id="${escapeHtml(g.id)}" value="${escapeHtml(g.family || '')}" placeholder="—"></td>
  <td>
    <button class="btn ghost tiny" data-act="edit-tags" data-id="${escapeHtml(g.id)}">الوسوم (${(g.specialRules || []).length})</button>
    <div class="small muted" style="margin-top:4px">${tagsLabel}</div>
    <div class="small muted" style="margin-top:2px">${nutLabel}</div>
  </td>
  <td>${covHtml}</td>
  <td style="white-space:nowrap">
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
<section class="panel">
  <div class="panel-head">
    <h2>كتالوج المكونات</h2>
    <div class="actions no-print">
      <button class="btn" data-act="add-ing" type="button">إضافة مكوّن</button>
      <button class="btn ghost" data-act="restore-catalog" type="button">استعادة الكتالوج الأصلي</button>
      <button class="btn ghost" data-act="reset-catalog-filters" type="button">مسح الفلاتر</button>
    </div>
  </div>
  <div class="filters no-print">
    <div class="field"><label for="searchInput">بحث</label>
      <input type="search" id="searchInput" value="${escapeHtml(ui.q)}" placeholder="اكتب للبحث…"></div>
    <div class="field"><label for="classFilter">التصنيف</label>
      <select id="classFilter"><option value="">كل التصنيفات</option>
        ${CLASSIFICATIONS.filter(c => c.v !== '').map(c =>
          `<option value="${escapeHtml(c.v)}" ${ui.classFilter === c.v ? 'selected' : ''}>${escapeHtml(c.l)}</option>`).join('')}
      </select></div>
    <div class="field"><label for="tagFilter">الوسوم</label>
      <select id="tagFilter">${tagOptions}</select></div>
  </div>
  <div class="table-wrap">
    <table>
      <thead><tr><th scope="col">المعرّف</th><th scope="col">الاسم</th><th scope="col">السعر</th><th scope="col">الوحدة</th>
        <th scope="col">التصنيف</th><th scope="col">الفئة</th><th scope="col">العائلة</th>
        <th scope="col">الوسوم والتصنيف الغذائي</th><th scope="col">التغطية</th><th scope="col">إجراءات</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="10" class="empty-state">لا توجد نتائج.</td></tr>'}</tbody>
    </table>
  </div>
  <h3 style="font-size:15px;margin-top:18px">سجل تعديلات الأسعار</h3>
  <ul style="list-style:none;padding:0;margin:0">${auditRows}</ul>
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
<article class="meal-card ${r.ok ? '' : 'bad'}" id="meal-card-${mi}">
  <header>
    <h3>وجبة ${mi + 1}</h3>
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
      return `<section class="panel"><div class="panel-head"><h2>الوجبات</h2></div>
        <div class="empty-state"><p>لا توجد خطة بعد.</p>
        <button class="btn" data-act="gen" type="button">توليد الوجبات</button></div></section>`;
    }
    const cards = State.current.meals.map((m, i) => this.mealCard(m, i)).join('');
    return `
<section class="panel">
  <div class="panel-head no-print">
    <h2>الوجبات (${State.current.meals.length} من ${cfg.mealCount})</h2>
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
      const typeInfo = CUSTOM_RULE_TYPES[rule.type] || { label: rule.type, icon: '❓' };
      const sev = rule.severity || SEVERITY.ERROR;
      const sevLabel = sev === SEVERITY.ERROR ? 'خطأ' : sev === SEVERITY.WARNING ? 'تحذير' : 'معلومة';
      const sevClass = sev === SEVERITY.ERROR ? 'err' : sev === SEVERITY.WARNING ? 'warn' : 'info';
      const disabledClass = rule.enabled === false ? ' disabled' : '';
      const sevCardClass = sev === SEVERITY.ERROR ? '' : ' sev-' + sev;
      const specSummary = describeCustomRule(rule);
      return `<div class="rule-card${disabledClass}${sevCardClass}">
        <div class="rule-head"><strong>${typeInfo.icon} ${escapeHtml(rule.name || typeInfo.label)}</strong>
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
<section class="panel">
  <div class="panel-head">
    <h2>الإعدادات الشاملة</h2>
    <div class="actions no-print">
      <button class="btn ghost" data-act="export-settings" type="button">تصدير الإعدادات</button>
      <button class="btn ghost" data-act="import-settings" type="button">استيراد الإعدادات</button>
    </div>
  </div>
  <p class="small muted">كل التغييرات تُحفظ تلقائيًا. اضغط على رأس كل قسم للفتح/الإغلاق.</p>
  ${sec('🎨 هوية التطبيق والعرض', `
    <div class="settings-grid">
      ${fld('اسم التطبيق', `<input type="text" data-cfg="appName" value="${escapeHtml(c.appName)}">`)}
      ${fld('اسم الخطة', `<input type="text" data-cfg="planName" value="${escapeHtml(c.planName)}">`)}
      ${fld('رمز العملة', `<input type="text" data-cfg="currencyLabel" value="${escapeHtml(c.currencyLabel)}">`)}
      ${fld('المنازل العشرية', `<input type="number" min="0" max="4" data-cfg="decimalPlaces" value="${c.decimalPlaces}">`, '0-4')}
    </div>`, true)}
  ${sec('📋 أساسيات الخطة', `
    <div class="settings-grid">
      ${fld('عدد الوجبات', `<input type="number" min="1" max="50" data-cfg="mealCount" value="${c.mealCount}">`)}
      ${fld('الحد الأدنى للمكونات', `<input type="number" min="1" max="30" data-cfg="minIngredientsPerMeal" value="${c.minIngredientsPerMeal}">`)}
      ${fld('البذرة العشوائية', `<input type="number" data-cfg="seed" value="${c.seed}">`)}
      ${fld('تغطية كل المكونات', `<input type="checkbox" data-cfg="requireCoverage" ${c.requireCoverage ? 'checked' : ''}>`)}
    </div>`)}
  ${sec('💰 القيود المالية', `
    <div class="settings-grid">
      ${fld('الحد الأدنى للوجبة', `<input type="number" min="0" step="0.01" data-cfg="minMealCost" value="${c.minMealCost.toFixed(2)}">`)}
      ${fld('الحد الأقصى للوجبة', `<input type="number" min="0" step="0.01" data-cfg="maxMealCost" value="${c.maxMealCost.toFixed(2)}">`)}
      ${fld('المتوسط المستهدف', `<input type="number" min="0" step="0.01" data-cfg="targetMealAvg" value="${c.targetMealAvg.toFixed(2)}">`,
        `إجمالي مستهدف = ${formatMoney(c.targetMealAvg * c.mealCount, c)}`)}
    </div>`)}
  ${sec('⚙️ استراتيجية التوليد', `
    <div class="settings-grid">
      ${fld('عدد محاولات البذرة', `<input type="number" min="1" max="100" data-cfg="generation.maxSeedAttempts" value="${c.generation.maxSeedAttempts}">`)}
      ${fld('محاولات لكل وجبة', `<input type="number" min="10" max="5000" step="10" data-cfg="generation.maxMealAttempts" value="${c.generation.maxMealAttempts}">`)}
      ${fld('تكرارات ضبط الخطة', `<input type="number" min="10" max="5000" step="10" data-cfg="generation.maxTuneIterations" value="${c.generation.maxTuneIterations}">`)}
      ${fld('تفاوت الهدف', `<input type="number" min="0" max="10" step="0.01" data-cfg="generation.targetTolerance" value="${c.generation.targetTolerance}">`)}
      ${fld('احتمال الفطير', `<input type="number" min="0" max="1" step="0.05" data-cfg="generation.pastryProbability" value="${c.generation.pastryProbability}">`)}
    </div>`)}
  ${sec('🔢 إعدادات الكميات', `
    <div class="settings-grid">
      ${fld('الكمية الافتراضية', `<input type="number" min="1" max="50" data-cfg="quantityDefaults.defaultQty" value="${c.quantityDefaults.defaultQty}">`)}
      ${fld('الحد الأقصى للكمية', `<input type="number" min="1" max="50" data-cfg="quantityDefaults.maxQty" value="${c.quantityDefaults.maxQty}">`)}
    </div>`)}
  ${sec('🎛️ خيارات العرض', `
    <div class="settings-grid">
      ${fld('شرائح القواعد', `<input type="checkbox" data-cfg="display.showRuleChips" ${c.display.showRuleChips ? 'checked' : ''}>`)}
      ${fld('جدول التكلفة', `<input type="checkbox" data-cfg="display.showBreakdown" ${c.display.showBreakdown ? 'checked' : ''}>`)}
      ${fld('قائمة المخالفات', `<input type="checkbox" data-cfg="display.showViolations" ${c.display.showViolations ? 'checked' : ''}>`)}
      ${fld('الانحراف عن المتوسط', `<input type="checkbox" data-cfg="display.showDeviation" ${c.display.showDeviation ? 'checked' : ''}>`)}
    </div>`)}
  ${sec('🧭 سلوك التطبيق', `
    <div class="settings-grid">
      ${fld('الحفظ التلقائي', `<input type="checkbox" data-cfg="behavior.autoSave" ${c.behavior.autoSave ? 'checked' : ''}>`)}
      ${fld('تأكيد قبل الإجراءات المدمّرة', `<input type="checkbox" data-cfg="behavior.confirmDestructive" ${c.behavior.confirmDestructive ? 'checked' : ''}>`)}
      ${fld('الحركات والانتقالات', `<input type="checkbox" data-cfg="behavior.enableAnimations" ${c.behavior.enableAnimations ? 'checked' : ''}>`)}
      ${fld('مدة التنبيهات', `<input type="number" min="500" max="20000" step="100" data-cfg="behavior.toastDurationMs" value="${c.behavior.toastDurationMs}">`, 'مللي ثانية')}
    </div>`)}
  ${sec('🥔 الشيبسي (مطلوب في كل وجبة)', `
    <p class="small muted">الشيبسي مكوّن أساسي يظهر في كل وجبة مرة واحدة بالضبط. لا علاقة له بعبوة الشويبس (المشروب الغازي) — كل منهما مستقل تمامًا.</p>
    <div class="settings-grid">
      ${multi('مكونات الشيبسي', c.chips.ids, 'chips.ids')}
    </div>`)}
  ${sec('📊 حدود استخدام المكونات', `
    <p class="small muted">عند تحديد حد لمكوّن، لن يظهر في أكثر من هذا العدد من الوجبات. 0 = منع كامل. الشيبسي مستثنى لأنه إلزامي.</p>
    <div class="group-editor">
      ${usageRows || '<p class="muted small">لا توجد حدود محددة.</p>'}
      <button class="btn ghost tiny" type="button" data-act="add-usage-limit">+ إضافة حد</button>
    </div>`)}
  ${sec('🍞 الخبز والفطير', `
    <div class="settings-grid">
      ${single('مكوّن الخبز', c.bread.id, 'bread.id')}
      ${single('مكوّن الفطير', c.bread.pastryId, 'bread.pastryId')}
      ${fld('كمية الخبز مع الفطير', `<input type="number" min="0" max="20" data-cfg="bread.qtyWithPastry" value="${c.bread.qtyWithPastry}">`)}
      ${fld('كمية الخبز بدون فطير', `<input type="number" min="0" max="20" data-cfg="bread.qtyWithoutPastry" value="${c.bread.qtyWithoutPastry}">`)}
    </div>`)}
  ${sec('🥗 السلطة والخيار', `
    <div class="settings-grid">
      ${single('مكوّن السلطة', c.salad.id, 'salad.id')}
      ${multi('السلطة مطلوبة مع', c.salad.requiredWith, 'salad.requiredWith')}
      ${single('مكوّن الخيار والطماطم', c.cucumber.id, 'cucumber.id')}
      ${multi('الخيار ممنوع مع', c.cucumber.forbiddenWith, 'cucumber.forbiddenWith')}
      ${fld('الخيار يتطلب وجود جبن', `<input type="checkbox" data-cfg="cucumber.requiresCheese" ${c.cucumber.requiresCheese ? 'checked' : ''}>`)}
    </div>`)}
  ${sec('🧀 جبنة المثلثات', `
    <div class="settings-grid">
      ${single('مكوّن قطعة الجبنة', c.triangleCheese.id, 'triangleCheese.id')}
      ${single('مكوّن علبة المثلثات', c.triangleCheese.boxId, 'triangleCheese.boxId')}
      ${fld('الكمية المطلوبة', `<input type="number" min="0" max="20" data-cfg="triangleCheese.qty" value="${c.triangleCheese.qty}">`)}
      ${multi('تُفعَّل عند وجود', c.triangleCheese.triggers, 'triangleCheese.triggers')}
    </div>`)}
  ${sec('🫒 الطحينة', `
    <div class="settings-grid">
      ${single('مكوّن الطحينة', c.tahini.id, 'tahini.id')}
      ${single('مسموحة فقط مع', c.tahini.requiresId, 'tahini.requiresId')}
    </div>`)}
  ${sec('🧀 المكونات التي تُحتسب كجبن', `
    <div class="settings-grid">${multi('قائمة مكونات الجبن', c.cheeseIds, 'cheeseIds')}</div>`)}
  ${sec('🚫 مجموعات الاستبعاد', `
    <p class="small muted">كل مجموعة تمنع وجود أكثر من عنصر واحد منها في نفس الوجبة.</p>
    <div class="group-editor">${exclRows}
      <button class="btn ghost tiny" type="button" data-act="add-excl">+ إضافة مجموعة</button>
    </div>`)}
  ${sec('⚖️ التوازن الغذائي (سكري / مالح)', `
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
  ${sec('✨ محرك القواعد المخصصة', `
    <p class="small muted">أنشئ قواعدك الخاصة بلا حدود: مجموعات استبعاد، منع ثنائي، منع/إلزام شرطي، سماح مشروط.</p>
    <div class="actions" style="margin-bottom:12px">
      <button class="btn" type="button" data-act="add-custom-rule">+ قاعدة جديدة</button>
    </div>
    ${customRulesList || '<p class="muted small">لا توجد قواعد مخصصة.</p>'}`)}
  ${sec('🎯 تشغيل / إيقاف القواعد المدمجة', `<div class="toggle-list">${ruleToggles}</div>`)}
  ${sec('💾 البروفايلات', `
    <div class="actions" style="margin-bottom:12px">
      <button class="btn" type="button" data-act="save-profile">+ حفظ كبروفايل</button>
      <button class="btn ghost" type="button" data-act="import-profile">استيراد</button>
    </div>
    ${profileRows || '<p class="muted small">لا توجد بروفايلات.</p>'}`)}
  ${sec('🔧 محرر JSON متقدم', `
    <p class="small muted">حرّر الإعدادات مباشرة كـ JSON.</p>
    <textarea id="jsonEditor" rows="16">${escapeHtml(JSON.stringify(c, null, 2))}</textarea>
    <div class="actions" style="margin-top:10px">
      <button class="btn" type="button" data-act="save-json">حفظ</button>
      <button class="btn ghost" type="button" data-act="reload-json">إعادة تحميل</button>
      <button class="btn ghost" type="button" data-act="copy-json">نسخ</button>
    </div>`)}
  ${sec('♻️ إعادة تعيين متقدمة', `
    <div class="actions" style="flex-wrap:wrap">
      <button class="btn warn" type="button" data-act="reset-settings">استعادة الإعدادات الافتراضية</button>
      <button class="btn danger" type="button" data-act="factory-reset">إعادة تعيين شاملة</button>
    </div>`)}
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
              <span>${e.ok ? '✅ سليم' : '❌ مخالفات'}</span>
              <span class="muted small">${escapeHtml(new Date(e.ts).toLocaleString('ar-EG'))}</span>
            </div>${shown}</li>`;
        }).join('')
      : '<li class="empty-state">لا توجد عمليات تحقق مسجلة بعد.</li>';
    return `<section class="panel">
      <div class="panel-head"><h2>سجل التحقق</h2>
        <div class="actions no-print"><button class="btn ghost" data-act="clear-log" type="button">تفريغ السجل</button></div>
      </div>
      <ul class="log-list">${items}</ul></section>`;
  }
};

