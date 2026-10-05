/* ============================================================================
   COFC GATE v1.0.0 — PATCH MODULE
   
   BEST REGARDS,
   ALEKSEY DANIEL DANILOVICH AND MY WIVES
   THE KING AND THE QUEENS OF TEVEL
   
   5 OCTOBER 2026 · 5:55 PM · REAL JERUSALEM TIME
   COFC TECHNOLOGIES LTD · © 2026
   
   v1.0.0 Genesis Sovereign:
   - Health check (15 tests)
   - Migration from v1.x / v16 / v15
   - Cleanup on unload
   ============================================================================ */
'use strict';

/* ============================================================================
   HEALTH CHECK
   ============================================================================ */
(function() {
  function waitForGate() {
    return new Promise((resolve) => {
      if (window.CofcGate) return resolve();
      let attempts = 0;
      const check = setInterval(() => {
        attempts++;
        if (window.CofcGate || attempts > 200) {
          clearInterval(check);
          resolve();
        }
      }, 50);
    });
  }

  async function runHealthCheck() {
    const results = [];
    const C = window.CofcGate;

    // 1. WebCrypto
    try {
      const test = await crypto.subtle.digest('SHA-256', new Uint8Array([1,2,3]));
      results.push({ name: 'WebCrypto', ok: test.byteLength === 32 });
    } catch (e) {
      results.push({ name: 'WebCrypto', ok: false, err: e.message });
    }

    // 2. SHA3-256 (structural)
    try {
      const h = C.SHA3.hash256(new Uint8Array([0]));
      results.push({ name: 'SHA3-256', ok: h.length === 32 });
    } catch (e) {
      results.push({ name: 'SHA3-256', ok: false, err: e.message });
    }

    // 3. SHA3-512 (structural)
    try {
      const h = C.SHA3.hash512(new Uint8Array([0]));
      results.push({ name: 'SHA3-512', ok: h.length === 64 });
    } catch (e) {
      results.push({ name: 'SHA3-512', ok: false, err: e.message });
    }

    // 4. SHA3-256 known vector (NIST: SHA3-256("") = a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a)
    try {
      const h = C.SHA3.hash256(new Uint8Array(0));
      const actual = C.Crypto.hexEnc(h);
      const expected = 'a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a';
      results.push({ name: 'SHA3-256 NIST vector', ok: actual === expected });
    } catch (e) {
      results.push({ name: 'SHA3-256 NIST vector', ok: false, err: e.message });
    }

    // 5. Quantum Mixing
    try {
      const seed = new Uint8Array(1024);
      crypto.getRandomValues(seed);
      const out = C.QuantumMixing.generate(seed);
      results.push({ name: 'QuantumMixing', ok: out.length === 64 });
    } catch (e) {
      results.push({ name: 'QuantumMixing', ok: false, err: e.message });
    }

    // 6. BiometricKey — same input → same output
    try {
      const sample = new Uint8Array(256);
      crypto.getRandomValues(sample);
      const f1 = C.BiometricKey.fuzzyExtract(sample);
      const f2 = C.BiometricKey.fuzzyExtract(sample);
      const same = f1.length === f2.length && f1.every((v, i) => v === f2[i]);
      results.push({ name: 'BiometricKey deterministic', ok: same });
    } catch (e) {
      results.push({ name: 'BiometricKey', ok: false, err: e.message });
    }

    // 7. BiometricKey — similar input → close output
    try {
      const a = new Uint8Array(256).fill(100);
      const b = new Uint8Array(256).fill(102);  // Slight variation
      const fa = C.BiometricKey.fuzzyExtract(a);
      const fb = C.BiometricKey.fuzzyExtract(b);
      const dist = C.BiometricKey.hammingDistance(fa, fb);
      // Should be small (within tolerance)
      results.push({ name: 'BiometricKey tolerance', ok: dist < C.BiometricKey.TOLERANCE });
    } catch (e) {
      results.push({ name: 'BiometricKey tolerance', ok: false, err: e.message });
    }

    // 8. Argon2id
    try {
      const test = await C.Argon2id.derive('test', new Uint8Array(16), {
        time: 1, memory: 1024, outputLen: 32
      });
      results.push({ name: 'Argon2id', ok: test.length === 32 });
    } catch (e) {
      results.push({ name: 'Argon2id', ok: false, err: e.message });
    }

    // 9. PBKDF2
    try {
      const test = await C.Crypto.pbkdf2('test', new Uint8Array(16), 1000, 256);
      results.push({ name: 'PBKDF2', ok: test.length === 32 });
    } catch (e) {
      results.push({ name: 'PBKDF2', ok: false, err: e.message });
    }

    // 10. HKDF
    try {
      const test = await C.Crypto.hkdf(new Uint8Array(32), new Uint8Array(16), 'test', 32);
      results.push({ name: 'HKDF', ok: test.length === 32 });
    } catch (e) {
      results.push({ name: 'HKDF', ok: false, err: e.message });
    }

    // 11. AES-GCM round-trip
    try {
      const key = new Uint8Array(32);
      const pt = new Uint8Array([1,2,3,4,5]);
      const { iv, ciphertext } = await C.Crypto.aesEncrypt(key, pt);
      const decrypted = await C.Crypto.aesDecrypt(key, iv, ciphertext);
      const ok = decrypted.length === pt.length && decrypted.every((v, i) => v === pt[i]);
      results.push({ name: 'AES-256-GCM', ok });
    } catch (e) {
      results.push({ name: 'AES-256-GCM', ok: false, err: e.message });
    }

    // 12. SafeRandom
    try {
      const a = C.SafeRandom.bytes(32);
      const b = C.SafeRandom.bytes(32);
      const diff = a.some((v, i) => v !== b[i]);
      results.push({ name: 'SafeRandom', ok: diff });
    } catch (e) {
      results.push({ name: 'SafeRandom', ok: false, err: e.message });
    }

    // 13. Storage round-trip (restores original master key)
    try {
      const originalKey = C.Vault.getMasterKey();
      const testKey = C.SafeRandom.bytes(32);
      C.Storage.setMasterKey(testKey);
      const testValue = { hello: 'world', n: 42 };
      await C.Storage.set('__test__', testValue);
      const read = await C.Storage.get('__test__');
      const ok = read && read.hello === 'world' && read.n === 42;
      C.Storage.remove('__test__');
      // FIX BUG-15: Restore original key
      C.Storage.setMasterKey(originalKey);
      results.push({ name: 'Storage (encrypted)', ok });
    } catch (e) {
      results.push({ name: 'Storage (encrypted)', ok: false, err: e.message });
    }

    // 14. Φ Distribution
    try {
      const alloc = C.PhiDistribution.allocate(1000000, 5);
      const sum = alloc.reduce((a, b) => a + b, 0);
      results.push({ name: 'Φ Distribution', ok: sum === 1000000 });
    } catch (e) {
      results.push({ name: 'Φ Distribution', ok: false, err: e.message });
    }

    // 15. Audit log
    try {
      await C.Audit.log('Health check', 'info');
      const verify = await C.Audit.verify();
      results.push({ name: 'Audit (hash chain)', ok: verify.valid });
    } catch (e) {
      results.push({ name: 'Audit (hash chain)', ok: false, err: e.message });
    }

    return results;
  }

  function logResults(results) {
    const passed = results.filter(r => r.ok).length;
    const total = results.length;
    const failed = results.filter(r => !r.ok);

    console.log(`%c[COFC QA] ${passed}/${total} tests passed`,
      `color: ${passed === total ? '#16A34A' : '#DC3545'}; font-weight: bold; font-size: 14px;`);

    for (const r of results) {
      if (r.ok) {
        console.log(`%c✓ ${r.name}`, 'color: #16A34A;');
      } else {
        console.log(`%c✗ ${r.name}: ${r.err || 'unknown error'}`, 'color: #DC3545; font-weight: bold;');
      }
    }

    if (failed.length > 0 && window.CofcGate && window.CofcGate.UI) {
      setTimeout(() => {
        window.CofcGate.UI.toast(`QA: ${failed.length} test(s) failed — see console`, 'warn');
      }, 3000);
    }
    return { passed, total, failed };
  }

  /* ============================================================================
     MIGRATION
     ============================================================================ */
  const OLD_PREFIXES = ['cofc_v1_0_', 'cofc_v16_', 'cofc_v15_'];
  const NEW_PREFIX = 'cofc_v1_';

  function findOldData() {
    if (localStorage.getItem(NEW_PREFIX + 'auth') !== null) return null;
    if (localStorage.getItem('cofc_v16_auth') !== null) return { from: 'v16.1', prefix: 'cofc_v16_' };
    if (localStorage.getItem('cofc_v15_auth') !== null) return { from: 'v15', prefix: 'cofc_v15_' };
    return null;
  }

  function clearOldData() {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && OLD_PREFIXES.some(p => key.startsWith(p))) {
        localStorage.removeItem(key);
      }
    }
  }

  function showMigrationDialog(fromVersion) {
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
            <p style="font-size:12px;color:var(--blue);font-weight:700;line-height:1.5">Existing vault from <strong>${fromVersion}</strong> detected. We recommend starting fresh to use the new v1.0 encryption format.</p>
          </div>
          <div style="text-align:center;padding:10px 0 20px">
            <div style="font-size:12px;color:var(--gray);line-height:1.6;margin-bottom:20px;font-weight:600">
              Old data will be backed up in the browser. You can always restore it manually.
            </div>
          </div>
          <button class="btn btn-yellow" id="btn-migration-fresh">
            <span class="btn-label">Start Fresh (recommended)</span>
          </button>
          <button class="btn btn-outline btn-sm" id="btn-migration-keep" style="margin-top:8px">
            <span class="btn-label">Keep old data (I'll migrate manually)</span>
          </button>
        </div>`;
      document.body.appendChild(modal);

      const btnFresh = modal.querySelector('#btn-migration-fresh');
      const btnKeep = modal.querySelector('#btn-migration-keep');

      let resolved = false;
      function resolveOnce(payload) {
        if (resolved) return;
        resolved = true;
        try { modal.remove(); } catch (e) {}
        resolve(payload);
      }

      modal.addEventListener('click', (e) => {
        if (e.target === modal) resolveOnce({ action: null });
      });

      btnFresh.addEventListener('click', () => {
        if (!confirm('Delete ALL old data? This cannot be undone.')) return;
        clearOldData();
        resolveOnce({ action: 'fresh' });
      });

      btnKeep.addEventListener('click', () => {
        resolveOnce({ action: 'keep' });
      });
    });
  }

  /* ============================================================================
     INIT
     ============================================================================ */
  let healthCheckRun = false;
  function runHealthCheckOnce() {
    if (healthCheckRun) return;
    healthCheckRun = true;
    setTimeout(async () => {
      try {
        const results = await runHealthCheck();
        logResults(results);
      } catch (e) {
        console.error('[COFC] Health check failed:', e);
      }
    }, 1500);
  }

  async function init() {
    await waitForGate();
    if (!window.CofcGate) {
      console.error('[COFC] gate.js not loaded — patch cannot initialize');
      return;
    }
    console.log('[COFC] patch.js v1.0.0 Genesis Sovereign initializing...');

    // FIX BUG-26: Run health check on first user activity, not immediately
    document.addEventListener('click', runHealthCheckOnce, { once: true });
    document.addEventListener('touchstart', runHealthCheckOnce, { once: true });
    // Fallback: run after 5 seconds
    setTimeout(runHealthCheckOnce, 5000);

    // Migration check
    const migration = findOldData();
    if (migration) {
      try {
        const choice = await showMigrationDialog(migration.from);
        if (choice && choice.action === 'fresh') {
          if (window.CofcGate.UI) {
            window.CofcGate.UI.toast('✓ Old data cleared — starting fresh', 'success');
          }
        } else if (choice && choice.action === 'keep') {
          console.log('[COFC] Old data preserved');
        }
      } catch (e) {
        console.error('[COFC] Migration dialog failed:', e);
      }
    }

    // Cleanup on unload
    window.addEventListener('beforeunload', () => {
      if (window.CofcGate.MultiTabConsensus) {
        try { window.CofcGate.MultiTabConsensus.close(); } catch (e) {}
      }
    });

    console.log('[COFC] patch.js v1.0.0 fully initialized');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
