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

