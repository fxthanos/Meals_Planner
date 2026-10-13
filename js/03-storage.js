'use strict';
/* =====================================================================
   §3 — STORAGE LAYER
   ===================================================================== */

const Storage = {
  read(key, fallback = null){
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch(e){ console.warn('Storage read failed:', key, e); return fallback; }
  },
  write(key, value){
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch(e){ console.error('Storage write failed:', key, e); return false; }
  },
  remove(key){ try { localStorage.removeItem(key); } catch(e){} },
  clearAll(){
    [STORAGE_KEYS.STATE, STORAGE_KEYS.CONFIG, STORAGE_KEYS.PROFILES].forEach(k => this.remove(k));
  }
};

