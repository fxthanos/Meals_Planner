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
      `<option value="${escapeHtml(t)}" ${r.type === t ? 'selected' : ''}>${CUSTOM_RULE_TYPES[t].icon} ${escapeHtml(CUSTOM_RULE_TYPES[t].label)}</option>`).join('');
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

