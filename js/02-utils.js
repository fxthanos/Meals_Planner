'use strict';
/* =====================================================================
   §2 — UTILITIES
   ===================================================================== */

const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
function formatMoney(amount, cfg){
  const dp = cfg?.decimalPlaces ?? 2;
  const cur = cfg?.currencyLabel ?? 'ج.م';
  return round2(Number(amount) || 0).toFixed(dp) + ' ' + cur;
}
function formatSigned(amount, cfg){
  const v = round2(Number(amount) || 0);
  const dp = cfg?.decimalPlaces ?? 2;
  return (v > 0 ? '+' : '') + v.toFixed(dp);
}
function escapeHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
function rngFrom(seed){
  let a = seed | 0;
  return function(){
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const newId = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
const isObject = v => v && typeof v === 'object' && !Array.isArray(v);
const isArray = Array.isArray;
const isNum = v => typeof v === 'number' && isFinite(v);
const isStr = v => typeof v === 'string';
function clamp(n, min, max){
  const v = Number(n);
  if (!isNum(v)) return min;
  return Math.max(min, Math.min(max, v));
}
function deepClone(obj){ return JSON.parse(JSON.stringify(obj)); }
function deepMerge(target, source){
  if (!isObject(source)) return target;
  Object.keys(source).forEach(k => {
    const sv = source[k];
    if (isArray(sv)) target[k] = sv.slice();
    else if (isObject(sv)){
      if (!isObject(target[k])) target[k] = {};
      deepMerge(target[k], sv);
    } else target[k] = sv;
  });
  return target;
}
function countBy(arr, pred){ return arr.reduce((n, x) => n + (pred(x) ? 1 : 0), 0); }
function countMealsWith(meals, id){ return countBy(meals, m => m.items.some(x => x.id === id)); }
function downloadJson(filename, obj){
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function readJsonFile(file, onParsed, onError){
  const reader = new FileReader();
  reader.onload = () => {
    try { onParsed(JSON.parse(String(reader.result))); }
    catch(e){ if (onError) onError(e); }
  };
  reader.onerror = () => { if (onError) onError(new Error('read')); };
  reader.readAsText(file, 'utf-8');
}
/* ponytail: single gate for destructive confirms; respects behavior.confirmDestructive */
function confirmDestructive({ title, body, confirmLabel, danger = true, run }){
  if (Config.get().behavior.confirmDestructive === false) return void run();
  UI.showModal({ title, body, confirmLabel, danger, onConfirm: run });
}
function describeCustomRule(rule){
  const spec = rule.spec || {};
  const nm = id => Catalog.get(id)?.nameAr || id;
  if (rule.type === 'exclusiveGroup') return (spec.items || []).map(nm).join('، ') || '—';
  if (rule.type === 'forbidPair') return `«${nm(spec.a) || '؟'}» ⛔ «${nm(spec.b) || '؟'}»`;
  if (rule.type === 'forbidWith') return `«${nm(spec.target) || '؟'}» ⛔ مع ${(spec.triggers || []).map(nm).join('، ')}`;
  if (rule.type === 'requireWith') return `إذا وُجد: ${(spec.triggers || []).map(nm).join('، ')} → أضف: ${(spec.thenAdd || []).map(t => `${nm(t.id)} × ${t.qty || 1}`).join('، ')}`;
  if (rule.type === 'allowOnlyWith') return `«${nm(spec.target) || '؟'}» مسموح فقط مع ${(spec.allowedWith || []).map(nm).join('، ')}`;
  return '';
}
/* ponytail: normalize+save+log+render after any manual meal mutation */
function mutateMeal(mi, scopeLabel, fn){
  const meal = State.current.meals[mi];
  if (!meal) return;
  if (fn(meal) === false) return;
  Generation.normalizeBread(meal.items);
  State.save();
  const r = Validation.meal(meal);
  UI.logValidation(`وجبة ${mi + 1} (${scopeLabel})`, { ok: r.ok, violations: r.violations });
  render();
}

