'use strict';
/* =====================================================================
   §15 — ROUTER
   ===================================================================== */

function currentRoute(){
  const h = location.hash.replace(/^#\/?/, '');
  return ROUTES.includes(h) ? h : 'dashboard';
}

function applyAppChrome(){
  const cfg = Config.get();
  if (!cfg) return;
  document.getElementById('appTitle').textContent = cfg.appName || 'مخطط الوجبات';
  document.title = cfg.appName || 'مخطط الوجبات';
  document.body.classList.toggle('no-anim', cfg.behavior?.enableAnimations === false);
}

function render(){
  applyAppChrome();
  const route = currentRoute();
  const view = document.getElementById('view');
  /* ponytail: preserve settings open sections across re-render */
  let openSecs = null;
  if (route === 'settings'){
    openSecs = new Set();
    view.querySelectorAll('details.cfg-section').forEach(d => {
      if (d.open) openSecs.add(d.querySelector('summary')?.textContent);
    });
  }
  let html = '';
  switch(route){
    case 'catalog':  html = Renderer.catalog(); break;
    case 'meals':    html = Renderer.meals(); break;
    case 'log':      html = Renderer.log(); break;
    case 'settings': html = Renderer.settings(); break;
    default:         html = Renderer.dashboard();
  }
  view.innerHTML = html;
  if (openSecs){
    view.querySelectorAll('details.cfg-section').forEach(d => {
      if (openSecs.has(d.querySelector('summary')?.textContent)) d.open = true;
    });
  }
  document.querySelectorAll('.tabs a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('data-nav') === route);
  });
}
window.addEventListener('hashchange', render);

/* =====================================================================
   §16 — ACTIONS
   ===================================================================== */

const Actions = {
  async generate(){
    UI.showLoading(true);
    await new Promise(r => setTimeout(r, 40));
    try {
      const result = Generation.run();
      if (!result || !result.meals?.length){
        UI.toast('تعذّر توليد خطة مطابقة. جرّب تخفيف القيود.', 'err'); return;
      }
      State.setMeals(result.meals);
      const vp = Validation.plan(result.meals);
      UI.logValidation('الخطة (توليد)', vp);
      if (result.missing.length) UI.toast(`تم التوليد مع ${result.missing.length} مكوّن غير مغطى`, 'warn');
      else UI.toast(`تم توليد ${result.meals.length} وجبة بنجاح`, 'ok');
      if (location.hash !== '#/meals') location.hash = '#/meals';
      else render();
    } catch(e){
      console.error(e);
      UI.toast('خطأ في التوليد: ' + e.message, 'err');
    } finally {
      UI.showLoading(false);
    }
  },

  export(){
    const payload = { app: 'meals-planner', version: 5, exportedAt: new Date().toISOString(),
      state: State.current, config: Config.get(), profiles: Profiles.list };
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    downloadJson(`meals-planner-${stamp}.json`, payload);
    UI.toast('تم التصدير', 'ok');
  },

  importFile(file){
    readJsonFile(file, parsed => {
      try {
        const incoming = parsed?.state || parsed;
        const incomingCfg = parsed?.config || null;
        if (!isObject(incoming) || !isArray(incoming.ingredients)){ UI.toast('ملف غير صالح', 'err'); return; }
        const ingredients = Catalog.hydrate(incoming.ingredients);
        const validIds = new Set(ingredients.map(g => g.id));
        State.current = {
          version: 2, ingredients,
          meals: sanitizeMeals(incoming.meals, validIds),
          log: isArray(incoming.log) ? incoming.log.slice(0, 200) : [],
          priceAudit: isArray(incoming.priceAudit) ? incoming.priceAudit.slice(0, 200) : []
        };
        if (isObject(incomingCfg)){ Storage.write(STORAGE_KEYS.CONFIG, incomingCfg); Config.load(); }
        State.save();
        UI.logValidation('استيراد', Validation.plan(State.current.meals));
        render();
        UI.toast('تم الاستيراد بنجاح', 'ok');
      } catch(e){ UI.toast('تعذّر قراءة الملف', 'err'); }
    }, () => UI.toast('تعذّر قراءة الملف', 'err'));
  },

  reset(){
    const run = () => {
      State.reset();
      Catalog.reset();
      ui.editingMeal = null;
      UI.hideModal();
      render();
      UI.toast('تمت إعادة التعيين', 'ok');
      return true;
    };
    confirmDestructive({ title: 'تأكيد إعادة التعيين',
      body: '<p>سيتم حذف الخطة الحالية وكل تعديلات الكتالوج.</p><p><strong>لا يمكن التراجع.</strong></p>',
      confirmLabel: 'نعم، إعادة التعيين', run });
  },

  validateAll(){
    const vp = Validation.plan(State.current.meals);
    UI.logValidation('الخطة', vp);
    render();
    if (vp.ok) UI.toast(vp.warnings.length ? 'صحيحة مع ملاحظات' : 'صحيحة', vp.warnings.length ? 'warn' : 'ok');
    else UI.toast(`بها ${vp.errors.length} مخالفة`, 'err');
  }
};

