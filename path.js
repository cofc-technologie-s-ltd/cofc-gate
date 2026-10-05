/* ============================================================================
   COFC GATE v1.0 — PATCH MODULE (FINAL)
   
   B1: Multi-tab double-spend prevention
   B2: Migration from v15/v16/v16.1
   H4: Migration modal closes on backdrop/Escape
   H5: Face challenge validation (delegated to gate.js)
   H1: Monkey-patch guard
   M1: WalletSync cleanup
   Q5: CofcGate references moved into init()
   ============================================================================ */
'use strict';

/* ============================================================================
   B1 — WALLET SYNC (Multi-tab coordination)
   ============================================================================ */
(function() {
  const CHANNEL_NAME = 'cofc-wallets-sync-v1';

  let channel = null;
  const listeners = [];

  function isSupported() {
    return typeof BroadcastChannel !== 'undefined';
  }

  function init() {
    if (!isSupported()) {
      console.warn('[COFC] BroadcastChannel not supported — multi-tab sync disabled');
      return false;
    }
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.addEventListener('message', handleMessage);
      return true;
    } catch (e) {
      console.error('[COFC] BroadcastChannel init failed:', e);
      return false;
    }
  }

  function handleMessage(event) {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'wallets-updated') {
      try {
        if (window.CofcGate && window.CofcGate.Storage) {
          window.CofcGate.Storage.remove('wallets');
        }
      } catch (e) {}
      for (const fn of listeners) {
        try { fn(data); } catch (e) { console.error('[COFC] Sync listener error:', e); }
      }
    }
  }

  function notify(type = 'wallets-updated') {
    if (!channel) return;
    try { channel.postMessage({ type, ts: Date.now() }); }
    catch (e) { console.warn('[COFC] Broadcast failed:', e); }
  }

  function onUpdate(fn) {
    if (typeof fn === 'function') listeners.push(fn);
  }

  function close() {
    if (channel) {
      try { channel.close(); } catch (e) {}
      channel = null;
    }
  }

  window.WalletSync = { init, notify, onUpdate, close, isSupported };
})();

/* ============================================================================
   B2 — MIGRATION from v15/v16/v16.1
   ============================================================================ */
(function() {
  const OLD_PREFIXES = ['cofc_v16_', 'cofc_v15_'];
  const NEW_PREFIX = 'cofc_v1_';

  function findOldData() {
    let detected = null;
    if (localStorage.getItem('cofc_v16_auth') !== null) {
      detected = { from: 'v16.1', prefix: 'cofc_v16_' };
    } else if (localStorage.getItem('cofc_v15_auth') !== null) {
      detected = { from: 'v15', prefix: 'cofc_v15_' };
    }
    return detected;
  }

  function hasNewData() {
    return localStorage.getItem(NEW_PREFIX + 'auth') !== null;
  }

  function collectOldData(prefix) {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const shortKey = key.substring(prefix.length);
        data[shortKey] = localStorage.getItem(key);
      }
    }
    return data;
  }

  function clearOldData() {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && OLD_PREFIXES.some(p => key.startsWith(p))) {
        localStorage.removeItem(key);
      }
    }
  }

  function showDialog(fromVersion) {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'modal active';
      modal.id = 'modal-migration';
      modal.style.zIndex = '10002';
      modal.innerHTML = `
        <div class="modal-content" style="max-width:520px">
          <div class="modal-header">
            <div class="modal-title">🔄 Vault Upgrade Detected</div>
          </div>
          <div style="background:rgba(37,99,235,.05);border:1px solid rgba(37,99,235,.2);padding:14px 16px;border-radius:12px;margin-bottom:18px;display:flex;gap:10px;align-items:flex-start">
            <svg style="color:var(--blue);flex-shrink:0;margin-top:2px;width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            <p style="font-size:12px;color:var(--blue);font-weight:700;line-height:1.5">Existing vault from <strong>${fromVersion}</strong> detected. Enter your existing password to preserve your wallets.</p>
          </div>
          <div style="text-align:center;padding:10px 0 20px">
            <div style="font-size:12px;color:var(--gray);line-height:1.6;margin-bottom:20px;font-weight:600">
              Your wallets will be preserved. Your password stays the same.
            </div>
            <input type="password" class="form-input" id="migration-password" placeholder="Existing password" autocomplete="current-password" style="text-align:center;font-size:16px">
            <div class="form-hint" id="migration-hint" style="min-height:20px"></div>
          </div>
          <button class="btn btn-yellow" id="btn-migration-confirm">
            <span class="btn-label">Migrate Vault</span>
          </button>
          <button class="btn btn-outline btn-sm" id="btn-migration-fresh" style="margin-top:8px">
            <span class="btn-label">Start Fresh (delete old data)</span>
          </button>
        </div>`;
      document.body.appendChild(modal);

      const input = modal.querySelector('#migration-password');
      const hint = modal.querySelector('#migration-hint');
      const btnConfirm = modal.querySelector('#btn-migration-confirm');
      const btnFresh = modal.querySelector('#btn-migration-fresh');

      setTimeout(() => { try { input.focus(); } catch (e) {} }, 100);

      let resolved = false;
      function resolveOnce(payload) {
        if (resolved) return;
        resolved = true;
        try { modal.remove(); } catch (e) {}
        document.removeEventListener('keydown', handleEsc, true);
        resolve(payload);
      }

      modal.addEventListener('click', (e) => {
        if (e.target === modal) resolveOnce({ action: null, password: null });
      });

      function handleEsc(e) {
        if (e.key === 'Escape' && !resolved) {
          e.preventDefault();
          e.stopPropagation();
          resolveOnce({ action: null, password: null });
        }
      }
      document.addEventListener('keydown', handleEsc, true);

      btnConfirm.addEventListener('click', () => {
        const pwd = input.value;
        if (!pwd) {
          hint.textContent = 'Enter your existing password';
          hint.className = 'form-hint error';
          return;
        }
        resolveOnce({ action: 'migrate', password: pwd });
      });

      btnFresh.addEventListener('click', () => {
        if (!confirm('Delete ALL old data? This cannot be undone.')) return;
        resolveOnce({ action: 'fresh', password: null });
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') btnConfirm.click();
      });
    });
  }

  async function performMigration(oldData, fromVersion, password) {
    const C = window.CofcGate.Crypto;
    const KDF = window.CofcGate.KDF;
    const Storage = window.CofcGate.Storage;
    const AuthMeta = window.CofcGate.AuthMeta;
    const Vault = window.CofcGate.Vault;

    const safeParse = (window.CofcGate && typeof window.CofcGate.safeJSONParse === 'function')
      ? window.CofcGate.safeJSONParse
      : JSON.parse;

    let oldAuth;
    try {
      oldAuth = safeParse(oldData.auth);
    } catch (e) {
      throw new Error('Old auth data is corrupted');
    }

    if (!oldAuth.salt || !oldAuth.pwdHash) {
      throw new Error('Old auth data is missing required fields');
    }

    const oldIterations = fromVersion === 'v16.1' ? 600000 : 300000;
    const oldSalt = C.b64dec(oldAuth.salt);
    let oldMasterKey = await KDF.derive(password, oldSalt, { iterations: oldIterations });

    let oldWallets = null;
    let decryptOk = false;

    if (oldData.wallets) {
      try {
        const walletBlob = safeParse(oldData.wallets);
        if (walletBlob.iv && walletBlob.ct) {
          const iv = C.b64dec(walletBlob.iv);
          const ct = C.b64dec(walletBlob.ct);
          const pt = await C.aesDecrypt(oldMasterKey, iv, ct);
          oldWallets = safeParse(C.buf2str(pt));
          decryptOk = true;
        }
      } catch (e) {
        C.zeroize(oldMasterKey);
        throw new Error('Wrong password for old vault');
      }
    } else {
      decryptOk = true;
    }

    if (!decryptOk) {
      C.zeroize(oldMasterKey);
      throw new Error('Could not decrypt old vault');
    }

    const newSalt = window.SafeRandom.bytes(32);
    const newMasterKey = await KDF.derive(password, newSalt, { iterations: 600000 });

    Vault.setMasterKey(newMasterKey);

    const pwdSalt = window.SafeRandom.bytes(32);
    const pwdHash = await C.pbkdf2(password, pwdSalt, 600000, 256);
    AuthMeta.set({
      salt: C.b64enc(newSalt),
      pwdSalt: C.b64enc(pwdSalt),
      pwdHash: C.hexEnc(pwdHash),
      migratedFrom: fromVersion,
      migratedAt: Date.now(),
      createdAt: oldAuth.createdAt || Date.now()
    });

    if (oldWallets && typeof oldWallets === 'object') {
      await Storage.set('wallets', oldWallets);
    }

    if (oldData.profile) {
      try {
        const p = safeParse(oldData.profile);
        if (p.iv && p.ct) {
          const profilePt = await C.aesDecrypt(oldMasterKey, C.b64dec(p.iv), C.b64dec(p.ct));
          await Storage.set('profile', safeParse(C.buf2str(profilePt)));
        }
      } catch (e) {}
    }

    if (oldData.settings) {
      try {
        const s = safeParse(oldData.settings);
        if (s.iv && s.ct) {
          const settingsPt = await C.aesDecrypt(oldMasterKey, C.b64dec(s.iv), C.b64dec(s.ct));
          await Storage.set('settings', safeParse(C.buf2str(settingsPt)));
        }
      } catch (e) {}
    }

    C.zeroize(oldMasterKey);
    clearOldData();

    return {
      walletCount: oldWallets ? Object.keys(oldWallets).length : 0,
      from: fromVersion
    };
  }

  window.Migration = {
    findOldData,
    hasNewData,
    collectOldData,
    clearOldData,
    showDialog,
    performMigration,
    check() {
      if (hasNewData()) return null;
      const old = findOldData();
      if (!old) return null;
      return {
        from: old.from,
        prefix: old.prefix,
        data: collectOldData(old.prefix)
      };
    }
  };
})();

/* ============================================================================
   AUTO-INITIALIZATION
   ============================================================================ */
(function() {
  function waitForGate() {
    return new Promise((resolve) => {
      if (window.CofcGate) return resolve();
      let attempts = 0;
      const check = setInterval(() => {
        attempts++;
        if (window.CofcGate || attempts > 100) {
          clearInterval(check);
          resolve();
        }
      }, 50);
    });
  }

  async function init() {
    await waitForGate();

    if (!window.CofcGate) {
      console.error('[COFC] gate.js not loaded — patch cannot initialize');
      return;
    }

    // FIX Q5: Update CofcGate references HERE (after gate.js is loaded)
    if (window.WalletSync) window.CofcGate.WalletSync = window.WalletSync;
    if (window.Migration) window.CofcGate.Migration = window.Migration;

    // FIX M1: WalletSync cleanup on unload
    window.addEventListener('beforeunload', () => {
      if (window.WalletSync) {
        try { window.WalletSync.close(); } catch (e) {}
      }
    });

    // MIGRATION CHECK FIRST
    const migration = window.Migration.check();
    if (migration) {
      try {
        const userChoice = await window.Migration.showDialog(migration.from);
        if (userChoice && userChoice.action === 'migrate') {
          try {
            const result = await window.Migration.performMigration(
              migration.data,
              migration.from,
              userChoice.password
            );
            if (window.CofcGate.UI && window.CofcGate.UI.toast) {
              window.CofcGate.UI.toast(
                `✓ Migrated ${result.walletCount} wallets from ${migration.from}`,
                'success'
              );
            }
          } catch (e) {
            console.error('[COFC] Migration failed:', e);
            if (window.CofcGate.UI && window.CofcGate.UI.toast) {
              window.CofcGate.UI.toast('Migration failed: ' + e.message, 'error');
            }
          }
        } else if (userChoice && userChoice.action === 'fresh') {
          window.Migration.clearOldData();
        }
      } catch (e) {
        console.error('[COFC] Migration dialog failed:', e);
      }
    }

    // MULTI-TAB SYNC
    if (window.WalletSync) {
      const ok = window.WalletSync.init();
      if (ok) {
        window.WalletSync.onUpdate(async () => {
          try {
            const r = await window.CofcGate.Storage.getDetailed('wallets');
            if (r.ok && r.value) {
              if (window.CofcGate.Wallets && typeof window.CofcGate.Wallets.init === 'function') {
                if (window.CofcGate.Vault && window.CofcGate.Vault.getMasterKey()) {
                  const allRef = window.CofcGate.Wallets.all;
                  if (allRef) {
                    Object.keys(allRef).forEach(k => delete allRef[k]);
                    Object.assign(allRef, r.value);
                  }
                  if (document.querySelector('[data-tab-content="wallets"].active')) {
                    await window.CofcGate.Wallets.render();
                  }
                }
              }
            }
          } catch (e) {
            console.error('[COFC] Sync reload error:', e);
          }
        });
      }
    }

    // FIX H1: HOOK Wallets.save WITH GUARD
    if (window.CofcGate.Wallets && window.WalletSync) {
      const Wallets = window.CofcGate.Wallets;
      const originalSave = Wallets.save;

      if (typeof originalSave === 'function') {
        if (originalSave.__cofc_patched) {
          console.warn('[COFC] Wallets.save already patched — skipping');
        } else {
          Wallets.save = async function() {
            const result = await originalSave.call(Wallets);
            if (window.WalletSync) window.WalletSync.notify();
            return result;
          };
          Wallets.save.__cofc_patched = true;
        }
      }
    }

    console.log('[COFC] patch.js v1.0 FINAL fully initialized');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
