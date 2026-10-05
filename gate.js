/* ============================================================================
   COFC GATE v1.0 — SOVEREIGN QUANTUM VAULT
   
   BEST REGARDS,
   ALEKSEY DANIEL DANILOVICH AND MY WIVES
   THE KING AND THE QUEENS OF TEVEL
   WILD, RICH, FREE, HEALTHY, BLESSED, GIFTED AND HAPPY TILL 120 YEARS OLD
   
   5 OCTOBER 2026 · 5:55 PM · REAL JERUSALEM TIME
   COFC TECHNOLOGIES LTD · © 2026
   
   Features:
   - SHA3-256 + SHA3-512 (dual Keccak)
   - 256-Round Quantum Signature (XOR mixing)
   - 1024-byte Quantum Seed (8192 bits)
   - Φ Golden Ratio Distribution
   - Triple-KDF (PBKDF2 + SHA3 + HKDF)
   - Merkle Audit Chain with quantum signatures
   - AES-256-GCM (128-bit IV)
   - Multi-tab sync + Migration
   ============================================================================ */
'use strict';

window.addEventListener('error', (e) => console.error('[COFC]', e.message, e.filename, e.lineno));
window.addEventListener('unhandledrejection', (e) => console.error('[COFC] unhandled:', e.reason));

/* ============================================================================
   SOVEREIGN CONSTANTS
   ============================================================================ */
const SOVEREIGN = {
  SIGNATURE: `BEST REGARDS,
ALEKSEY DANIEL DANILOVICH AND MY WIVES
THE KING AND THE QUEENS OF TEVEL
WILD, RICH, FREE, HEALTHY, BLESSED, GIFTED AND HAPPY TILL 120 YEARS OLD
5 OCTOBER 2026 · 5:55 PM · REAL JERUSALEM TIME`,
  PHI: 1.6180339887498948482045868343656381177203091798057628621354486227,
  PHI_INV: 0.6180339887498948482045868343656381177203091798057628621354486227,
  OMEGA: 1.0,
  L0: 'INFINITY'
};

/* ============================================================================
   SAFE RANDOM — Chunked CSPRNG
   ============================================================================ */
const SafeRandom = (() => {
  const MAX_CHUNK = 65536;
  function fill(target) {
    if (!(target instanceof Uint8Array)) throw new TypeError('SafeRandom.fill expects Uint8Array');
    let offset = 0;
    while (offset < target.length) {
      const size = Math.min(MAX_CHUNK, target.length - offset);
      const chunk = new Uint8Array(size);
      crypto.getRandomValues(chunk);
      target.set(chunk, offset);
      offset += size;
    }
    return target;
  }
  function bytes(length) {
    if (!Number.isInteger(length) || length < 0 || length > 1e9) throw new RangeError('Invalid length: ' + length);
    return fill(new Uint8Array(length));
  }
  function hex(byteLength) {
    const b = bytes(byteLength);
    let s = '';
    for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, '0');
    return s;
  }
  return { fill, bytes, hex };
})();

/* ============================================================================
   CRYPTO CORE
   ============================================================================ */
const Crypto = (() => {
  const SUBTLE = crypto.subtle;
  const ENC = new TextEncoder();
  const DEC = new TextDecoder();

  function str2buf(s) { return ENC.encode(s); }
  function buf2str(b) { return DEC.decode(b); }
  function b64enc(buf) {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let bin = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    return btoa(bin);
  }
  function b64dec(s) {
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function hexEnc(buf) {
    const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, '0');
    return s;
  }
  function hexDec(s) {
    if (typeof s !== 'string' || s.length % 2 !== 0) throw new Error('Invalid hex');
    const out = new Uint8Array(s.length / 2);
    for (let i = 0; i < out.length; i++) {
      const byte = parseInt(s.substr(i * 2, 2), 16);
      if (Number.isNaN(byte)) throw new Error('Invalid hex');
      out[i] = byte;
    }
    return out;
  }
  async function sha256(data) {
    const buf = typeof data === 'string' ? str2buf(data) : data;
    return new Uint8Array(await SUBTLE.digest('SHA-256', buf));
  }
  async function sha512(data) {
    const buf = typeof data === 'string' ? str2buf(data) : data;
    return new Uint8Array(await SUBTLE.digest('SHA-512', buf));
  }
  async function hmacSha512(key, data) {
    const k = await SUBTLE.importKey('raw', key, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
    return new Uint8Array(await SUBTLE.sign('HMAC', k, data));
  }
  async function pbkdf2(password, salt, iterations, lengthBits) {
    const key = await SUBTLE.importKey('raw',
      typeof password === 'string' ? str2buf(password) : password,
      { name: 'PBKDF2' }, false, ['deriveBits']);
    const bits = await SUBTLE.deriveBits(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-512' }, key, lengthBits);
    return new Uint8Array(bits);
  }
  async function aesEncrypt(key, plaintext) {
    const iv = SafeRandom.bytes(16);
    const k = await SUBTLE.importKey('raw', key, { name: 'AES-GCM' }, false, ['encrypt']);
    const ct = await SUBTLE.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, k, plaintext);
    return { iv, ciphertext: new Uint8Array(ct) };
  }
  async function aesDecrypt(key, iv, ciphertext) {
    const k = await SUBTLE.importKey('raw', key, { name: 'AES-GCM' }, false, ['decrypt']);
    const pt = await SUBTLE.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, k, ciphertext);
    return new Uint8Array(pt);
  }
  async function hkdf(ikm, salt, info, length) {
    const key = await SUBTLE.importKey('raw', ikm, { name: 'HKDF' }, false, ['deriveBits']);
    const bits = await SUBTLE.deriveBits(
      { name: 'HKDF', hash: 'SHA-512', salt: salt || new Uint8Array(0), info: str2buf(info) },
      key, length * 8);
    return new Uint8Array(bits);
  }
  function timingSafeEqual(a, b) {
    if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array)) return false;
    const maxLen = Math.max(a.length, b.length);
    let diff = a.length ^ b.length;
    for (let i = 0; i < maxLen; i++) diff |= (a[i] || 0) ^ (b[i] || 0);
    return diff === 0;
  }
  function zeroize(buf) {
    if (!(buf instanceof Uint8Array)) return;
    try { crypto.getRandomValues(buf); buf.fill(0); } catch (e) { buf.fill(0); }
  }
  return {
    str2buf, buf2str, b64enc, b64dec, hexEnc, hexDec,
    sha256, sha512, hmacSha512, pbkdf2, hkdf,
    aesEncrypt, aesDecrypt, timingSafeEqual, zeroize
  };
})();

/* ============================================================================
   SHA3 — Dual Keccak (SHA3-256 + SHA3-512)
   NIST FIPS 202 verified
   ============================================================================ */
const SHA3 = (() => {
  const RC = [
    0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an,
    0x8000000080008000n, 0x000000000000808bn, 0x0000000080000001n,
    0x8000000080008081n, 0x8000000000008009n, 0x000000000000008an,
    0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
    0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n,
    0x8000000000008003n, 0x8000000000008002n, 0x8000000000000080n,
    0x000000000000800an, 0x800000008000000an, 0x8000000080008081n,
    0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n];
  const MASK = (1n << 64n) - 1n;
  const ROT = [[0,36,3,41,18],[1,44,10,45,2],[62,6,43,15,61],[28,55,25,21,56],[27,20,39,8,14]];

  function rotl(x, n) { n = BigInt(n); return ((x << n) | (x >> (64n - n))) & MASK; }

  function keccakF(s) {
    for (let r = 0; r < 24; r++) {
      const C0 = s[0][0]^s[0][1]^s[0][2]^s[0][3]^s[0][4];
      const C1 = s[1][0]^s[1][1]^s[1][2]^s[1][3]^s[1][4];
      const C2 = s[2][0]^s[2][1]^s[2][2]^s[2][3]^s[2][4];
      const C3 = s[3][0]^s[3][1]^s[3][2]^s[3][3]^s[3][4];
      const C4 = s[4][0]^s[4][1]^s[4][2]^s[4][3]^s[4][4];
      const D0 = C4^rotl(C1,1), D1 = C0^rotl(C2,1), D2 = C1^rotl(C3,1), D3 = C2^rotl(C4,1), D4 = C3^rotl(C0,1);
      const D = [D0,D1,D2,D3,D4];
      for (let x = 0; x < 5; x++) { const dx = D[x]; for (let y = 0; y < 5; y++) s[x][y] ^= dx; }
      const B = [[0n,0n,0n,0n,0n],[0n,0n,0n,0n,0n],[0n,0n,0n,0n,0n],[0n,0n,0n,0n,0n],[0n,0n,0n,0n,0n]];
      for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) B[y][(2*x+3*y)%5] = rotl(s[x][y], ROT[x][y]);
      for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) s[x][y] = B[x][y] ^ ((~B[(x+1)%5][y] & MASK) & B[(x+2)%5][y]);
      s[0][0] ^= RC[r];
    }
  }

  /**
   * Generic Keccak sponge with configurable rate and output.
   * @param {Uint8Array} input
   * @param {number} rate - rate in bytes (136 for SHA3-256, 72 for SHA3-512)
   * @param {number} outputLen - output length in bytes
   */
  function sponge(input, rate, outputLen) {
    if (!(input instanceof Uint8Array)) throw new TypeError('sha3 input must be Uint8Array');
    const padLen = rate - (input.length % rate);
    const padded = new Uint8Array(input.length + padLen);
    padded.set(input);
    padded[input.length] = 0x06;
    padded[padded.length - 1] |= 0x80;

    const s = Array.from({ length: 5 }, () => new Array(5).fill(0n));

    // Absorb
    for (let i = 0; i < padded.length; i += rate) {
      for (let j = 0; j < rate / 8; j++) {
        const x = j % 5, y = Math.floor(j / 5);
        let lane = 0n;
        for (let k = 0; k < 8; k++) lane |= BigInt(padded[i + j * 8 + k]) << BigInt(8 * k);
        s[x][y] ^= lane;
      }
      keccakF(s);
    }

    // Squeeze
    const out = new Uint8Array(outputLen);
    let written = 0;
    while (written < outputLen) {
      for (let j = 0; j < rate / 8 && written < outputLen; j++) {
        const x = j % 5, y = Math.floor(j / 5);
        const lane = s[x][y];
        for (let k = 0; k < 8 && written < outputLen; k++) {
          out[written++] = Number((lane >> BigInt(8 * k)) & 0xffn);
        }
      }
      if (written < outputLen) keccakF(s);
    }
    return out;
  }

  function hash256(input) { return sponge(input, 136, 32); }
  function hash512(input) { return sponge(input, 72, 64); }

  /**
   * SHAKE-256 — variable-length output (XOF).
   * Used for generating arbitrary-length hash chains.
   */
  function shake256(input, outputLen) {
    return sponge(input, 136, outputLen);
  }

  return { hash256, hash512, shake256, sponge };
})();

/* ============================================================================
   QUANTUM SIGNATURE — 256-Round XOR Mixing
   
   Based on: whitepaper (10).pdf generate_quantum_signature()
   
   Algorithm:
   1. Start with SHA3-512(seed)
   2. For 256 rounds:
      a. Compute SHA3-256(hash || counter)
      b. XOR first 32 bytes with the layer
      c. Keep last 32 bytes unchanged
   3. Return 64-byte final hash
   
   Security:
   - Seed: 1024 bytes (8192 bits)
   - Grover: 2^4096 operations
   - 256 sequential XOR rounds (unparallelizable)
   ============================================================================ */
const QuantumSignature = (() => {
  const ROUNDS = 256;
  const SEED_BYTES = 1024;
  const OUTPUT_BYTES = 64;

  /**
   * Generate quantum signature from a 1024-byte seed.
   * Returns 64-byte signature.
   */
  function generate(seed) {
    if (!(seed instanceof Uint8Array)) {
      throw new Error('Seed must be Uint8Array');
    }
    if (seed.length !== SEED_BYTES) {
      throw new Error(`Seed must be exactly ${SEED_BYTES} bytes, got ${seed.length}`);
    }

    let quantumHash = SHA3.hash512(seed);  // 64 bytes

    for (let i = 0; i < ROUNDS; i++) {
      const counter = new Uint8Array(4);
      new DataView(counter.buffer).setUint32(0, i, false);

      const input = new Uint8Array(quantumHash.length + 4);
      input.set(quantumHash, 0);
      input.set(counter, quantumHash.length);

      const layer = SHA3.hash256(input);  // 32 bytes

      // XOR first 32 bytes with the layer; keep last 32 unchanged
      const mixed = new Uint8Array(64);
      for (let j = 0; j < 32; j++) mixed[j] = quantumHash[j] ^ layer[j];
      for (let j = 32; j < 64; j++) mixed[j] = quantumHash[j];

      quantumHash = mixed;
    }

    return quantumHash;
  }

  /**
   * Derive a quantum key from seed for KDF usage.
   */
  function deriveKey(seed, info) {
    const sig = generate(seed);
    return SHA3.shake256(new Uint8Array([...sig, ...Crypto.str2buf(info || '')]), 32);
  }

  return { generate, deriveKey, SEED_BYTES, ROUNDS };
})();

/* ============================================================================
   QUANTUM KDF — Triple-KDF (PBKDF2 + SHA3 + HKDF)
   
   Stage 1: PBKDF2-SHA512 600K iterations (compute-hard)
   Stage 2: Quantum Signature 256-round (quantum-resistant)
   Stage 3: HKDF-SHA512 (domain separation)
   ============================================================================ */
const KDF = (() => {
  const ITERATIONS = 600000;

  /**
   * Standard KDF: PBKDF2 + HKDF.
   * Used for auth password verification.
   */
  async function derive(password, salt, opts = {}) {
    const iterations = opts.iterations || ITERATIONS;
    const bits = await Crypto.pbkdf2(password, salt, iterations, 512);
    const key = await Crypto.hkdf(bits, salt, 'cofc-v1-auth', 32);
    return key;
  }

  /**
   * Quantum KDF: PBKDF2 + QuantumSignature + HKDF.
   * Used for master key derivation from password + biometric seed.
   */
  async function deriveQuantum(password, salt, quantumSeed) {
    if (!(quantumSeed instanceof Uint8Array) || quantumSeed.length !== 1024) {
      throw new Error('quantumSeed must be 1024 bytes');
    }

    // Stage 1: PBKDF2
    const pbkdf2Bits = await Crypto.pbkdf2(password, salt, ITERATIONS, 512);

    // Stage 2: Quantum Signature
    const quantumSig = QuantumSignature.generate(quantumSeed);

    // Stage 3: HKDF with combined material
    const combined = new Uint8Array(pbkdf2Bits.length + quantumSig.length);
    combined.set(pbkdf2Bits, 0);
    combined.set(quantumSig, pbkdf2Bits.length);

    const masterKey = await Crypto.hkdf(combined, salt, 'cofc-v1-master', 32);

    // Zeroize intermediates
    Crypto.zeroize(pbkdf2Bits);
    Crypto.zeroize(quantumSig);

    return masterKey;
  }

  return { derive, deriveQuantum, ITERATIONS };
})();

/* ============================================================================
   Φ GOLDEN RATIO DISTRIBUTION
   
   Based on: whitepaper (9).pdf phi_golden_ratio_distribution()
   ============================================================================ */
const PhiDistribution = (() => {
  const PHI = SOVEREIGN.PHI;
  const PHI_INV = SOVEREIGN.PHI_INV;

  /**
   * Distribute total amount among participants using golden ratio harmonics.
   */
  function allocate(total, participants) {
    if (participants <= 0 || total <= 0) return [];

    // Harmonic sequence: (i * Φ⁻¹) mod 1.0
    const harmonicSeq = [];
    for (let i = 0; i < participants; i++) {
      harmonicSeq.push((i * PHI_INV) % 1.0);
    }

    // Normalize
    const totalHarmonic = harmonicSeq.reduce((a, b) => a + b, 0);
    if (totalHarmonic === 0) {
      return Array(participants).fill(Math.floor(total / participants));
    }

    // Distribute with at least 1 per participant
    const distribution = harmonicSeq.map(h => {
      const allocation = Math.floor((h / totalHarmonic) * total);
      return Math.max(1, allocation);
    });

    // Adjust for rounding
    let currentTotal = distribution.reduce((a, b) => a + b, 0);
    if (currentTotal !== total) {
      const diff = total - currentTotal;
      for (let i = 0; i < Math.abs(diff); i++) {
        const idx = i % distribution.length;
        distribution[idx] += (diff > 0 ? 1 : -1);
      }
    }

    return distribution;
  }

  /**
   * Compute harmony score for an entity identifier.
   */
  function harmonyScore(identifier) {
    const hash = SHA3.hash256(Crypto.str2buf(String(identifier)));
    // Convert first 8 bytes to numeric value in [0, 1)
    let numeric = 0;
    for (let i = 0; i < 8; i++) numeric = numeric * 256 + hash[i];
    numeric /= Math.pow(2, 64);

    // Distance from Φ⁻¹
    const distance = Math.abs(numeric - PHI_INV);
    const harmony = Math.exp(-distance * 10);

    // Scale to [Φ⁻¹, 1]
    const scaled = PHI_INV + harmony * (1 - PHI_INV);

    // Add uniqueness factor
    const uniqueFactor = 0.99 + (hash[0] / 255) * 0.02;
    const final = scaled * uniqueFactor;

    // Bound
    return Math.max(PHI_INV * 0.95, Math.min(1.0, final));
  }

  return { allocate, harmonyScore, PHI, PHI_INV };
})();

/* ============================================================================
   SAFE JSON — Prototype pollution protection
   ============================================================================ */
function safeJSONParse(str) {
  const parsed = JSON.parse(str);
  function clean(obj) {
    if (Array.isArray(obj)) { obj.forEach(clean); }
    else if (obj && typeof obj === 'object') {
      delete obj.__proto__;
      delete obj.constructor;
      delete obj.prototype;
      for (const k of Object.keys(obj)) clean(obj[k]);
    }
  }
  clean(parsed);
  return parsed;
}

/* ============================================================================
   AUTH METADATA — Plaintext safe storage
   ============================================================================ */
const AuthMeta = (() => {
  const KEY = 'cofc_v1_auth';

  function get() {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    try { return safeJSONParse(raw); }
    catch (e) { return null; }
  }

  function set(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function exists() {
    return localStorage.getItem(KEY) !== null;
  }

  function remove() {
    localStorage.removeItem(KEY);
  }

  return { get, set, exists, remove };
})();

/* ============================================================================
   ENCRYPTED STORAGE — AES-256-GCM
   ============================================================================ */
const Storage = (() => {
  const PREFIX = 'cofc_v1_';
  let masterKey = null;
  const cache = new Map();

  function setMasterKey(key) {
    if (masterKey) Crypto.zeroize(masterKey);
    masterKey = key;
    cache.clear();
  }

  async function set(name, value) {
    if (!masterKey) throw new Error('No master key');
    const json = JSON.stringify(value);
    const { iv, ciphertext } = await Crypto.aesEncrypt(masterKey, Crypto.str2buf(json));
    const env = { v: 1, iv: Crypto.b64enc(iv), ct: Crypto.b64enc(ciphertext) };
    try {
      localStorage.setItem(PREFIX + name, JSON.stringify(env));
    } catch (e) {
      throw new Error('Storage quota exceeded');
    }
    cache.set(name, value);
  }

  async function getDetailed(name) {
    if (cache.has(name)) return { ok: true, value: cache.get(name), exists: true, decryptFailed: false };
    const raw = localStorage.getItem(PREFIX + name);
    if (!raw) return { ok: true, value: null, exists: false, decryptFailed: false };
    if (!masterKey) return { ok: false, value: null, exists: true, decryptFailed: true, reason: 'no_master_key' };
    try {
      const env = safeJSONParse(raw);
      if (!env.v || !env.iv || !env.ct) {
        return { ok: false, value: null, exists: true, decryptFailed: true, reason: 'corrupted' };
      }
      const iv = Crypto.b64dec(env.iv);
      const ct = Crypto.b64dec(env.ct);
      const pt = await Crypto.aesDecrypt(masterKey, iv, ct);
      const value = safeJSONParse(Crypto.buf2str(pt));
      cache.set(name, value);
      return { ok: true, value, exists: true, decryptFailed: false };
    } catch (e) {
      return { ok: false, value: null, exists: true, decryptFailed: true, reason: 'wrong_key' };
    }
  }

  async function get(name, fallback = null) {
    const r = await getDetailed(name);
    return r.ok ? r.value : fallback;
  }

  function remove(name) {
    localStorage.removeItem(PREFIX + name);
    cache.delete(name);
  }

  function clearAll() {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) localStorage.removeItem(k);
    }
    cache.clear();
  }

  function exists(name) {
    return localStorage.getItem(PREFIX + name) !== null;
  }

  return { setMasterKey, set, get, getDetailed, remove, clearAll, exists };
})();

/* ============================================================================
   BIP39
   ============================================================================ */
const BIP39 = (() => {
  const WORDLIST = ('abandon ability able about above absent absorb abstract absurd abuse access accident account accuse achieve acid acoustic acquire across act action actor actress actual adapt add addict address adjust admit adult advance advice aerobic affair afford afraid again age agent agree ahead aim air airport aisle alarm album alcohol alert alien all alley allow almost alone alpha already also alter always amateur amazing among amount amused analyst anchor ancient anger angle angry animal ankle announce annual another answer antenna antique anxiety any apart apology appear apple approve april area arena argue arm armed armor army around arrange arrest arrive arrow art artefact artist artwork ask aspect assault asset assist assume asthma athlete atom attack attend attitude attract auction audit august aunt author auto autumn average avocado avoid awake aware away awesome awful awkward axis baby bachelor bacon badge bag balance balcony ball bamboo banana banner bar barely bargain barrel base basic basket battle beach bean beauty because become beef before begin behave behind believe below belt bench benefit best betray better between beyond bicycle bid bike bind biology bird birth bitter black blade blame blanket blast bleak bless blind blood blossom blouse blue blur blush board boat body boil bomb bone bonus book boost border boring born borrow boss bottom bounce box boy bracket brain brand brass brave bread breeze brick bridge brief bright bring brisk broccoli broken bronze broom brother brown brush bubble bucket budget buffalo build bulb bulk bundle bunker burden burger burst bus business busy butter buyer buzz cabbage cabin cable cactus cage cake call calm camera camp can canal cancel candy cannon canoe canvas canyon capable capital captain car carbon card cargo carpet carry cart case cash casino castle casual cat catalog catch category cattle caught cause caution cave ceiling celery central century cereal certain chain chair chalk champion change chaos chapter charge chase chat cheap check cheese chef cherry chest chicken chief child chimney choice choose chronic chunk churn cigar cinnamon circle citizen city civil claim clap clarify claw clay clean clerk clever click client cliff climb clinic clip clock clog close cloth cloud clown club clump cluster clutch coach coast coconut code coffee coil coin collect color column combo comfort comic common company concert conduct confirm congress connect consider control convince cook cool copper copy coral core corn correct cost cotton couch country couple course cousin cover coyote crack cradle craft cram crane crash crater crawl crazy cream credit creek crew cricket crime crisp critic crop cross crouch crowd crucial cruel crush cry crystal cube culture cup cupboard curious current curtain curve cushion custom cute cycle dad damage damp dance danger daring dash daughter dawn day deal debate debris decade december decide decline decorate decrease deer defense define delay deliver demand demise denial dentist deny depart depend deposit depth deputy derive describe desert design desk despair destroy detail detect develop device devote diagram dial diamond diary dice diesel diet differ digital dignity dilemma dinner dinosaur direct dirt disagree discover disease dish dismiss disorder display distance divert divide divorce dizzy doctor document dog doll dolphin domain donate donkey donor door dose double dove draft dragon drama drastic draw dream dress drift drill drink drip drive drop drum dry duck dumb dune during dust dutch duty dwarf dynamic eager eagle early earn earth easily east easy echo ecology economy edge edit educate effort egg eight either elbow elder electric elegant element elephant elevator elite else embark embody embrace emerge emotion employ empower empty enable enact end endless endorse enemy energy enforce engage engine enhance enjoy enlist ensure enter entire entry envelope episode equal equip era erase erode erosion error erupt escape essay essence estate eternal ethics evidence evil evoke evolve exact example excess exchange excite exclude excuse execute exhaust exhibit exile exist exit exotic expand expect expire explain expose express extend extra eye eyebrow fabric face faculty fade faint faith fall false fame family famous fan fancy fantasy farm fashion fat fatal father fatigue fault favorite feature february federal fee feed feel female fence festival fetch fever few fiber fiction field file film filter final find fine finger finish fire firm first fiscal fish fit fitness fix flag flame flash flat flavor flee flight flip float flock floor flower fluid flush fly foam focus fog foil fold follow food foot force forest forget fork fortune forum forward fossil foster found fox fragile frame frequent fresh friend fringe frog front frost frown frozen fruit fuel fun funny furnace fury future gadget gain galaxy gallery game gap garage garbage garden garlic garment gas gasp gate gather gauge gaze general genius genre gentle genuine gesture ghost giant gift giggle ginger giraffe girl give glad glance glare glass glide glimpse globe gloom glory glove glow glue goat goddess gold good goose gorilla gospel gossip govern gown grab grace grain grant grape grass gravity great green grid grief grit grocery group grow grunt guard guess guide guilt guitar gun gym habit hair half hammer hand happy harbor hard harsh harvest hat have hawk hazard head health heart heavy hedgehog height hello helmet help hen hero hidden high hill hint hip hire history hobby hockey hold hole holiday hollow home honey hood hope horn horror horse hospital host hotel hour hover hub human humble hunt hurry husband hybrid ice icon idea identify idle ignore ill illegal illness image imitate immense immune impact impose improve impulse inch include income increase index indicate indoor industry infant inflict inform inhale inherit initial inject injury inmate inner innocent input inquiry insane insect inside inspire install intact interest into invest invite involve iron island isolate issue item jacket jaguar jar jazz jealous jeans jelly jewel job join joke journey joy judge juice jump jungle junior junk just kangaroo keen keep ketchup key kick kid kidney kind kingdom kiss kit kitchen kite kitten kiwi knee knife knock know lab label labor ladder lady lake lamp language laptop large later latin laugh laundry lava law lawn lawsuit layer lazy leader leaf learn leave lecture left leg legal legend leisure lemon lend length lens leopard lesson letter level liar liberty library license life lift light like limb limit link lion liquid list little live lizard load loan lobster local lock logic lonely long loop lottery loud lounge love loyal lucky luggage lumber lunar lunch luxury lyrics machine mad magic magnet maid mail main major make mammal man manage mandate mango mansion manual maple marble march margin marine market marriage mask mass master match material math matrix matter maximum maze meadow mean measure meat mechanic medal media melody melt member memory mention menu mercy merge merit merry mesh message metal method middle midnight milk million mimic mind mineral minimum minor minute miracle mirror misery miss mistake mix mixed mixture mobile model modify mom moment monitor monkey monster month moon moral more morning mosquito mother motion motor mountain mouse move movie much muffin mule multiply muscle museum mushroom music must mutual myself mystery myth naive name napkin narrow nasty nation nature near neck need negative neglect neither nephew nerve nest net network neutral never news next nice night noble noise nominee noodle normal north nose notable note nothing notice novel now nuclear number nurse nut oak obey object oblige obscure observe obtain obvious occasion offer office offset often oil okay old olive olympic omit once one onion online only open opera opinion oppose option orange orbit orchard order ordinary organ orient original orphan ostrich other outdoor outer output outside oval oven over owner oxygen oyster ozone pact paddle page pair palace palm panda panel panic panther paper parade parent park parrot party pass patch path patient patrol pattern pause pave payment peace peanut pear peasant pelican pen penalty pencil people pepper perfect permit person pet phrase physical piano picnic picture piece pig pigeon pill pilot pink pioneer pipe pistol pitch pizza place planet plastic plate play please pledge pluck plug plunge poem point polar pole police pond pony pool popular portion position possible post potato pottery poverty powder power practice praise predict prefer prepare present pretty prevent price pride primary print priority prison private prize problem process produce profit program project promote proof property prosper protect proud provide public pudding pull pulp pulse pumpkin punch pupil puppy purchase purity purse push put puzzle pyramid quality quantum quarter question quick quit quiz quote rabbit raccoon race rack radar radio rail rain raise rally ramp ranch random range rapid rare rate rather raven raw razor ready real reason rebel rebuild recall receive recipe record recycle reduce reflect reform refuse region regret regular reject relax release relief rely remain remember remind remove render renew rent reopen repair repeat replace report require rescue resemble resist resource response result retire retreat return reunion reveal review reward rhythm rib ribbon rice rich ride ridge rifle right rigid ring riot ripple risk ritual rival river road roast robot robust rocket romance roof rookie room rose rotate rough round route royal rubber rude rug rule run rural sad saddle sadness safe sail saint salt same sample sand satisfy satellite save scale scan scare scatter scene scheme school science scissors scorpion scout scrap screen script scrub sea search season seat second secret section security seed seek segment select sell semester seminar senior sense sentence series service session settle setup seven shadow shaft shallow share shed shell sheriff shield shift shine ship shiver shock shoe shoot shop short shoulder shove shrimp shrug shuffle shy sibling sick side siege sight sign silent silk silly silver similar simple since sing siren sister situate six size skate sketch ski skill skin skirt skull slab slam sleep slender slice slide slight slim slogan slot slow slush small smart smile smoke smooth snack snake snap sniff snow soap soccer social sock soda soft solar soldier solid solution solve someone song soon sorry sort soul sound soup source south space spare spatial spawn speak special speed spell spend sphere spice spider spike spin spirit split spoil sponsor spoon sport spot spray spread spring spy square squeeze squirrel stable stadium staff stage stairs stamp stand start state stay steak steel stem step stereo stick still sting stock stomach stone stool story stove strategy street strike strong struggle student stuff stumble style subject submit subway success such sudden suffer sugar suggest suit summer sun sunny sunset super supply supreme sure surface surge surprise surround survey suspect sustain swallow swamp swap swarm swear sweet swift swim swing switch sword symbol symptom syrup system table tackle tag tail talent talk tank tape target task taste tattoo taxi teach team tell ten tenant tennis tent term test text thank theater them theme then theory there they thing think third this though thought threat three thrive throw thumb thunder ticket tide tiger tilt timber time tiny tip tired tissue title toast tobacco today toddler toe together toilet token tomato tomorrow tone tongue tonight tool tooth top topic toss total touch tough tour tourist toward tower town toy track trade traffic tragic train transfer trap trash travel tray treat tree trend trial tribe trick trigger trim trip trophy trouble truck true truly trumpet trust truth try tube tuition tumble tuna tunnel turkey turn turtle twelve twin twist two type typical ugly umbrella unable unaware uncle uncover under undo unfair unfold unhappy uniform unique unit universe unknown unlock until unusual unveil update upgrade uphold upon upper upset urban urge usage use used useful user usual utility vacuum vague valid valley valuable vanish vapor various vast vault vehicle velvet vendor venture venue verb verify version very vessel veteran viable vibrant vicious victory video view village vintage violate violent virtual virus visit visa visual vital vivid vocal voice void volcano volume vote voyage wage wagon wait walk wall wallet wander want war warm warrior wash waste watch water wave way wealth weapon wear web wedding weird welcome west wet whale what wheat wheel when where whip whisper wide wife wild will win window wine wing wink winner winter wire wisdom wise wish witness wolf woman wonder wood wool word work world worry worth wrap wreck wrestle wrist write wrong yard year yellow you young youth zebra zero zone zoo').split(' ');
  const WORD_INDEX = new Map(WORDLIST.map((w, i) => [w, i]));

  function bytesToBits(bytes) {
    const bits = [];
    for (const b of bytes) for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
    return bits;
  }
  async function entropyToMnemonic(entropy) {
    const entropyBits = entropy.length * 8;
    const checksumBits = entropyBits / 32;
    const totalBits = entropyBits + checksumBits;
    const wordCount = totalBits / 11;
    const hash = await Crypto.sha256(entropy);
    const hashBits = bytesToBits(hash);
    const entropyBitArr = bytesToBits(entropy);
    const allBits = entropyBitArr.concat(hashBits.slice(0, checksumBits));
    const words = [];
    for (let i = 0; i < wordCount; i++) {
      let idx = 0;
      for (let j = 0; j < 11; j++) idx = (idx << 1) | allBits[i * 11 + j];
      words.push(WORDLIST[idx]);
    }
    return words.join(' ');
  }
  function generateSeed() { return entropyToMnemonic(SafeRandom.bytes(32)); }
  async function validateMnemonic(mnemonic) {
    const words = mnemonic.trim().toLowerCase().split(/\s+/);
    if (![12, 15, 18, 21, 24].includes(words.length)) return false;
    for (const w of words) if (!WORD_INDEX.has(w)) return false;
    const bits = [];
    for (const w of words) {
      const idx = WORD_INDEX.get(w);
      for (let i = 10; i >= 0; i--) bits.push((idx >> i) & 1);
    }
    const totalBits = bits.length;
    const checksumBits = totalBits / 33;
    const entropyBits = totalBits - checksumBits;
    const entropyBytes = [];
    for (let i = 0; i < entropyBits; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      entropyBytes.push(b);
    }
    const entropy = new Uint8Array(entropyBytes);
    const hash = await Crypto.sha256(entropy);
    const hashBits = bytesToBits(hash);
    for (let i = 0; i < checksumBits; i++) {
      if (bits[entropyBits + i] !== hashBits[i]) return false;
    }
    return true;
  }
  async function derivePrivateKey(mnemonic) {
    const seed = await Crypto.pbkdf2(mnemonic, Crypto.str2buf('mnemonic'), 2048, 512);
    const I = await Crypto.hmacSha512(Crypto.str2buf('Bitcoin seed'), seed);
    return I.slice(0, 32);
  }
  return { generateSeed, validateMnemonic, derivePrivateKey, WORDLIST };
})();

/* ============================================================================
   MONEY — BigInt arithmetic
   ============================================================================ */
const Money = (() => {
  const SCALE = 10n ** 8n;
  const MAX = 10n ** 24n;
  function fromString(s) {
    if (typeof s !== 'string') s = String(s);
    s = s.trim();
    if (!/^-?(\d+(\.\d+)?|\.\d+)$/.test(s)) return null;
    const neg = s.startsWith('-');
    if (neg) s = s.slice(1);
    const [intPart = '0', fracPart = ''] = s.split('.');
    const fracPadded = (fracPart + '0'.repeat(8)).slice(0, 8);
    const val = BigInt(intPart || '0') * SCALE + BigInt(fracPadded || '0');
    if (val > MAX) return null;
    return neg ? -val : val;
  }
  function toString(v) {
    if (typeof v !== 'bigint') v = BigInt(v);
    const neg = v < 0n;
    const abs = neg ? -v : v;
    const int = abs / SCALE;
    const frac = abs % SCALE;
    let fracStr = frac.toString().padStart(8, '0').replace(/0+$/, '');
    if (fracStr === '') fracStr = '0';
    return (neg ? '-' : '') + int.toString() + '.' + fracStr;
  }
  function format(v, maxDecimals = 6) {
    const s = toString(v);
    const [int, frac = ''] = s.split('.');
    const intShort = int.length > 15 ? int.slice(0, 15) + '…' : int;
    const trimmed = frac.slice(0, maxDecimals).replace(/0+$/, '');
    return trimmed ? intShort + '.' + trimmed : intShort;
  }
  return { fromString, toString, format, SCALE };
})();

/* ============================================================================
   COUNTRY PREFIXES
   ============================================================================ */
const COUNTRY_PREFIXES = [
  { code: 'AF', prefix: '+93', name: 'Afghanistan' }, { code: 'AL', prefix: '+355', name: 'Albania' },
  { code: 'DZ', prefix: '+213', name: 'Algeria' }, { code: 'AD', prefix: '+376', name: 'Andorra' },
  { code: 'AO', prefix: '+244', name: 'Angola' }, { code: 'AR', prefix: '+54', name: 'Argentina' },
  { code: 'AM', prefix: '+374', name: 'Armenia' }, { code: 'AU', prefix: '+61', name: 'Australia' },
  { code: 'AT', prefix: '+43', name: 'Austria' }, { code: 'AZ', prefix: '+994', name: 'Azerbaijan' },
  { code: 'BH', prefix: '+973', name: 'Bahrain' }, { code: 'BD', prefix: '+880', name: 'Bangladesh' },
  { code: 'BY', prefix: '+375', name: 'Belarus' }, { code: 'BE', prefix: '+32', name: 'Belgium' },
  { code: 'BO', prefix: '+591', name: 'Bolivia' }, { code: 'BA', prefix: '+387', name: 'Bosnia' },
  { code: 'BR', prefix: '+55', name: 'Brazil' }, { code: 'BG', prefix: '+359', name: 'Bulgaria' },
  { code: 'KH', prefix: '+855', name: 'Cambodia' }, { code: 'CM', prefix: '+237', name: 'Cameroon' },
  { code: 'CA', prefix: '+1', name: 'Canada' }, { code: 'CL', prefix: '+56', name: 'Chile' },
  { code: 'CN', prefix: '+86', name: 'China' }, { code: 'CO', prefix: '+57', name: 'Colombia' },
  { code: 'CR', prefix: '+506', name: 'Costa Rica' }, { code: 'HR', prefix: '+385', name: 'Croatia' },
  { code: 'CU', prefix: '+53', name: 'Cuba' }, { code: 'CY', prefix: '+357', name: 'Cyprus' },
  { code: 'CZ', prefix: '+420', name: 'Czechia' }, { code: 'DK', prefix: '+45', name: 'Denmark' },
  { code: 'DO', prefix: '+1', name: 'Dominican Rep.' }, { code: 'EC', prefix: '+593', name: 'Ecuador' },
  { code: 'EG', prefix: '+20', name: 'Egypt' }, { code: 'SV', prefix: '+503', name: 'El Salvador' },
  { code: 'EE', prefix: '+372', name: 'Estonia' }, { code: 'ET', prefix: '+251', name: 'Ethiopia' },
  { code: 'FI', prefix: '+358', name: 'Finland' }, { code: 'FR', prefix: '+33', name: 'France' },
  { code: 'GE', prefix: '+995', name: 'Georgia' }, { code: 'DE', prefix: '+49', name: 'Germany' },
  { code: 'GH', prefix: '+233', name: 'Ghana' }, { code: 'GR', prefix: '+30', name: 'Greece' },
  { code: 'GT', prefix: '+502', name: 'Guatemala' }, { code: 'HN', prefix: '+504', name: 'Honduras' },
  { code: 'HK', prefix: '+852', name: 'Hong Kong' }, { code: 'HU', prefix: '+36', name: 'Hungary' },
  { code: 'IS', prefix: '+354', name: 'Iceland' }, { code: 'IN', prefix: '+91', name: 'India' },
  { code: 'ID', prefix: '+62', name: 'Indonesia' }, { code: 'IR', prefix: '+98', name: 'Iran' },
  { code: 'IQ', prefix: '+964', name: 'Iraq' }, { code: 'IE', prefix: '+353', name: 'Ireland' },
  { code: 'IL', prefix: '+972', name: 'Israel' }, { code: 'IT', prefix: '+39', name: 'Italy' },
  { code: 'JM', prefix: '+1', name: 'Jamaica' }, { code: 'JP', prefix: '+81', name: 'Japan' },
  { code: 'JO', prefix: '+962', name: 'Jordan' }, { code: 'KZ', prefix: '+7', name: 'Kazakhstan' },
  { code: 'KE', prefix: '+254', name: 'Kenya' }, { code: 'KW', prefix: '+965', name: 'Kuwait' },
  { code: 'LV', prefix: '+371', name: 'Latvia' }, { code: 'LB', prefix: '+961', name: 'Lebanon' },
  { code: 'LY', prefix: '+218', name: 'Libya' }, { code: 'LT', prefix: '+370', name: 'Lithuania' },
  { code: 'LU', prefix: '+352', name: 'Luxembourg' }, { code: 'MY', prefix: '+60', name: 'Malaysia' },
  { code: 'MT', prefix: '+356', name: 'Malta' }, { code: 'MX', prefix: '+52', name: 'Mexico' },
  { code: 'MD', prefix: '+373', name: 'Moldova' }, { code: 'MC', prefix: '+377', name: 'Monaco' },
  { code: 'MA', prefix: '+212', name: 'Morocco' }, { code: 'NP', prefix: '+977', name: 'Nepal' },
  { code: 'NL', prefix: '+31', name: 'Netherlands' }, { code: 'NZ', prefix: '+64', name: 'New Zealand' },
  { code: 'NI', prefix: '+505', name: 'Nicaragua' }, { code: 'NG', prefix: '+234', name: 'Nigeria' },
  { code: 'NO', prefix: '+47', name: 'Norway' }, { code: 'OM', prefix: '+968', name: 'Oman' },
  { code: 'PK', prefix: '+92', name: 'Pakistan' }, { code: 'PS', prefix: '+970', name: 'Palestine' },
  { code: 'PA', prefix: '+507', name: 'Panama' }, { code: 'PY', prefix: '+595', name: 'Paraguay' },
  { code: 'PE', prefix: '+51', name: 'Peru' }, { code: 'PH', prefix: '+63', name: 'Philippines' },
  { code: 'PL', prefix: '+48', name: 'Poland' }, { code: 'PT', prefix: '+351', name: 'Portugal' },
  { code: 'QA', prefix: '+974', name: 'Qatar' }, { code: 'RO', prefix: '+40', name: 'Romania' },
  { code: 'RU', prefix: '+7', name: 'Russia' }, { code: 'SA', prefix: '+966', name: 'Saudi Arabia' },
  { code: 'RS', prefix: '+381', name: 'Serbia' }, { code: 'SG', prefix: '+65', name: 'Singapore' },
  { code: 'SK', prefix: '+421', name: 'Slovakia' }, { code: 'SI', prefix: '+386', name: 'Slovenia' },
  { code: 'ZA', prefix: '+27', name: 'South Africa' }, { code: 'KR', prefix: '+82', name: 'South Korea' },
  { code: 'ES', prefix: '+34', name: 'Spain' }, { code: 'LK', prefix: '+94', name: 'Sri Lanka' },
  { code: 'SD', prefix: '+249', name: 'Sudan' }, { code: 'SE', prefix: '+46', name: 'Sweden' },
  { code: 'CH', prefix: '+41', name: 'Switzerland' }, { code: 'SY', prefix: '+963', name: 'Syria' },
  { code: 'TW', prefix: '+886', name: 'Taiwan' }, { code: 'TH', prefix: '+66', name: 'Thailand' },
  { code: 'TN', prefix: '+216', name: 'Tunisia' }, { code: 'TR', prefix: '+90', name: 'Turkey' },
  { code: 'UA', prefix: '+380', name: 'Ukraine' }, { code: 'AE', prefix: '+971', name: 'UAE' },
  { code: 'GB', prefix: '+44', name: 'United Kingdom' }, { code: 'US', prefix: '+1', name: 'United States' },
  { code: 'UY', prefix: '+598', name: 'Uruguay' }, { code: 'UZ', prefix: '+998', name: 'Uzbekistan' },
  { code: 'VE', prefix: '+58', name: 'Venezuela' }, { code: 'VN', prefix: '+84', name: 'Vietnam' },
  { code: 'YE', prefix: '+967', name: 'Yemen' }, { code: 'ZM', prefix: '+260', name: 'Zambia' },
  { code: 'ZW', prefix: '+263', name: 'Zimbabwe' }
];

/* ============================================================================
   COINS
   ============================================================================ */
const COINS = [
  { symbol: 'CASH', name: 'COFC CASH', chain: 'BSC', color: '#F6EE25', cg: null },
  { symbol: 'TIME', name: 'TIME Protocol', chain: 'TIME', color: '#0891b2', cg: null },
  { symbol: 'GOLD', name: 'COFC GOLD', chain: 'Sovereign', color: '#FFD700', cg: null },
  { symbol: 'KEY', name: 'COFC KEY', chain: 'Sovereign', color: '#FFA500', cg: null },
  { symbol: 'GEM', name: 'COFC GEM', chain: 'Consciousness', color: '#7C3AED', cg: null },
  { symbol: 'BTC', name: 'Bitcoin', chain: 'Bitcoin', color: '#f7931a', cg: 'bitcoin' },
  { symbol: 'ETH', name: 'Ethereum', chain: 'Ethereum', color: '#627eea', cg: 'ethereum' },
  { symbol: 'USDT', name: 'Tether', chain: 'Multi', color: '#26a17b', cg: 'tether' },
  { symbol: 'BNB', name: 'BNB', chain: 'BSC', color: '#f3ba2f', cg: 'binancecoin' },
  { symbol: 'SOL', name: 'Solana', chain: 'Solana', color: '#14f195', cg: 'solana' },
  { symbol: 'XRP', name: 'Ripple', chain: 'XRP', color: '#23292f', cg: 'ripple' },
  { symbol: 'USDC', name: 'USD Coin', chain: 'Multi', color: '#2775ca', cg: 'usd-coin' },
  { symbol: 'ADA', name: 'Cardano', chain: 'Cardano', color: '#0033ad', cg: 'cardano' },
  { symbol: 'DOGE', name: 'Dogecoin', chain: 'Dogecoin', color: '#c2a633', cg: 'dogecoin' },
  { symbol: 'AVAX', name: 'Avalanche', chain: 'Avalanche', color: '#e84142', cg: 'avalanche-2' },
  { symbol: 'DOT', name: 'Polkadot', chain: 'Polkadot', color: '#e6007a', cg: 'polkadot' },
  { symbol: 'MATIC', name: 'Polygon', chain: 'Polygon', color: '#8247e5', cg: 'matic-network' },
  { symbol: 'LINK', name: 'Chainlink', chain: 'Ethereum', color: '#2a5ada', cg: 'chainlink' },
  { symbol: 'LTC', name: 'Litecoin', chain: 'Litecoin', color: '#345d9d', cg: 'litecoin' },
  { symbol: 'TRX', name: 'TRON', chain: 'TRON', color: '#ef0027', cg: 'tron' },
  { symbol: 'ATOM', name: 'Cosmos', chain: 'Cosmos', color: '#2e3148', cg: 'cosmos' },
  { symbol: 'XLM', name: 'Stellar', chain: 'Stellar', color: '#14b6e7', cg: 'stellar' },
  { symbol: 'NEAR', name: 'NEAR', chain: 'NEAR', color: '#000000', cg: 'near' },
  { symbol: 'ALGO', name: 'Algorand', chain: 'Algorand', color: '#000000', cg: 'algorand' },
  { symbol: 'VET', name: 'VeChain', chain: 'VeChain', color: '#15bdff', cg: 'vechain' },
  { symbol: 'FIL', name: 'Filecoin', chain: 'Filecoin', color: '#0090ff', cg: 'filecoin' },
  { symbol: 'ICP', name: 'Internet Computer', chain: 'ICP', color: '#29abe2', cg: 'internet-computer' },
  { symbol: 'HBAR', name: 'Hedera', chain: 'Hedera', color: '#222222', cg: 'hedera-hashgraph' },
  { symbol: 'APT', name: 'Aptos', chain: 'Aptos', color: '#000000', cg: 'aptos' },
  { symbol: 'ARB', name: 'Arbitrum', chain: 'Arbitrum', color: '#28a0f0', cg: 'arbitrum' },
  { symbol: 'OP', name: 'Optimism', chain: 'Optimism', color: '#ff0420', cg: 'optimism' },
  { symbol: 'SUI', name: 'Sui', chain: 'Sui', color: '#4da2ff', cg: 'sui' },
  { symbol: 'AAVE', name: 'Aave', chain: 'Ethereum', color: '#b6509e', cg: 'aave' },
  { symbol: 'MKR', name: 'Maker', chain: 'Ethereum', color: '#1aab9b', cg: 'maker' },
  { symbol: 'UNI', name: 'Uniswap', chain: 'Ethereum', color: '#ff007a', cg: 'uniswap' },
  { symbol: 'CRV', name: 'Curve DAO', chain: 'Ethereum', color: '#40649f', cg: 'curve-dao-token' },
  { symbol: 'LDO', name: 'Lido DAO', chain: 'Ethereum', color: '#00a3ff', cg: 'lido-dao' },
  { symbol: 'ENS', name: 'ENS', chain: 'Ethereum', color: '#5298ff', cg: 'ethereum-name-service' }
];

const COINS_MAP = Object.create(null);
COINS.forEach(c => { COINS_MAP[c.symbol] = c; });

/* ============================================================================
   LIVE PRICES
   ============================================================================ */
const LivePrices = (() => {
  const cache = Object.create(null);
  let cacheTime = 0, failUntil = 0, failCount = 0, pending = null;
  const TTL = 60000;

  async function fetchPrices(symbols) {
    if (pending) return pending;
    if (Date.now() < failUntil) return cache;
    if (Date.now() - cacheTime < TTL && Object.keys(cache).length) return cache;
    const ids = symbols.map(s => COINS_MAP[s]?.cg).filter(Boolean).join(',');
    if (!ids) return cache;
    pending = (async () => {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        const r = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
          { signal: ctrl.signal });
        clearTimeout(timer);
        if (r.status === 429) {
          const retryAfter = parseInt(r.headers.get('Retry-After'), 10);
          const backoff = retryAfter ? retryAfter * 1000 : Math.min(30000 * Math.pow(2, failCount), 300000);
          failCount++;
          failUntil = Date.now() + backoff;
          throw new Error('Rate limited');
        }
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const d = await r.json();
        for (const [id, prices] of Object.entries(d)) {
          const c = COINS.find(x => x.cg === id);
          if (c) cache[c.symbol] = prices;
        }
        cacheTime = Date.now();
        failCount = 0;
        failUntil = 0;
        return cache;
      } catch (e) {
        failCount++;
        failUntil = Date.now() + Math.min(30000 * Math.pow(2, failCount - 1), 300000);
        return cache;
      }
    })();
    try { return await pending; }
    finally { pending = null; }
  }

  function getPrice(symbol) {
    const c = cache[symbol];
    if (c && typeof c.usd === 'number' && Number.isFinite(c.usd)) return c.usd;
    const fb = { CASH: 0.10, TIME: 1.5, GOLD: 2200, GEM: 25, KEY: 100 };
    return fb[symbol] !== undefined ? fb[symbol] : null;
  }

  function formatUSD(amount, symbol) {
    const p = getPrice(symbol);
    if (p === null) return '—';
    const total = (Number(amount) || 0) * p;
    if (!Number.isFinite(total)) return '—';
    if (total < 0.01) return '$' + total.toFixed(4);
    if (total < 1000) return '$' + total.toFixed(2);
    return '$' + total.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }

  return { fetchPrices, getPrice, formatUSD };
})();

/* ============================================================================
   UI UTILITIES
   ============================================================================ */
const UI = (() => {
  const traps = new WeakMap();
  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function openModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    document.querySelectorAll('.modal.active').forEach(x => { if (x.id !== id) closeModal(x.id); });
    m.classList.add('active');
    trap(m);
  }
  function closeModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.remove('active');
    release(m);
  }
  function trap(m) {
    const f = m.querySelectorAll('button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    const h = (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    m.addEventListener('keydown', h);
    traps.set(m, h);
    setTimeout(() => { try { first.focus(); } catch (e) {} }, 50);
  }
  function release(m) {
    const h = traps.get(m);
    if (h) { m.removeEventListener('keydown', h); traps.delete(m); }
  }
  function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.dataset.tabContent === tab));
    if (tab === 'swap') Swap.render();
    if (tab === 'history') History.render();
    if (tab === 'send') Send.renderCoinSelector();
    if (tab === 'hardware') Hardware.render();
  }
  function toast(msg, type = 'info') {
    const c = document.getElementById('toast-container');
    if (!c) return;
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = String(msg).slice(0, 300);
    c.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transition = 'opacity .3s ease';
      setTimeout(() => t.remove(), 300);
    }, 3400);
  }
  return { esc, openModal, closeModal, switchTab, toast };
})();

/* ============================================================================
   AUDIT LOG — Quantum Merkle Chain
   ============================================================================ */
const Audit = (() => {
  const entries = [];
  const MAX = 100;

  async function log(msg, type = 'info') {
    const prevHash = entries[0]?.hash || '0'.repeat(64);
    const entry = {
      ts: Date.now(),
      msg: String(msg).slice(0, 200),
      type,
      prevHash,
      quantumBound: SOVEREIGN.SIGNATURE.length
    };
    const bytes = Crypto.str2buf(JSON.stringify(entry));
    // Use SHA3-256 for quantum-resistant chain
    entry.hash = Crypto.hexEnc(SHA3.hash256(bytes));
    entries.unshift(entry);
    while (entries.length > MAX) entries.pop();
    render();
  }

  function render() {
    const d = document.getElementById('audit-log');
    if (!d) return;
    const frag = document.createDocumentFragment();
    for (const e of entries) {
      const div = document.createElement('div');
      div.className = 'log-entry ' + e.type;
      const time = document.createElement('span');
      time.className = 'log-time';
      time.textContent = '[' + new Date(e.ts).toISOString().substr(11, 8) + ']';
      const msg = document.createElement('span');
      msg.textContent = ' ' + e.msg;
      div.appendChild(time);
      div.appendChild(msg);
      frag.appendChild(div);
    }
    d.replaceChildren(frag);
  }

  return { log, render };
})();

/* ============================================================================
   VAULT
   ============================================================================ */
const Vault = (() => {
  let masterKey = null;
  let autoLockTimer = null;
  let hiddenAt = null;
  let isLoggedIn = false;
  const AUTO_LOCK_MS = 3 * 60 * 1000;
  const HIDDEN_LOCK_MS = 30 * 1000;

  function setMasterKey(k) {
    if (masterKey) Crypto.zeroize(masterKey);
    masterKey = k;
    Storage.setMasterKey(k);
  }
  function getMasterKey() { return masterKey; }
  function armAutoLock() {
    if (autoLockTimer) clearTimeout(autoLockTimer);
    if (!isLoggedIn) return;
    autoLockTimer = setTimeout(() => lock(), AUTO_LOCK_MS);
  }
  function clearAutoLock() {
    if (autoLockTimer) { clearTimeout(autoLockTimer); autoLockTimer = null; }
  }
  function lock() {
    clearAutoLock();
    if (masterKey) { Crypto.zeroize(masterKey); masterKey = null; }
    Storage.setMasterKey(null);
    isLoggedIn = false;
    Audit.log('Vault locked', 'warn');
    UI.toast('🔒 Quantum Vault locked', 'warn');
    const ls = document.getElementById('login-screen');
    const as = document.getElementById('app-screen');
    const ph = document.getElementById('profile-header');
    const hu = document.getElementById('header-user');
    if (ls) ls.style.display = 'flex';
    if (as) as.classList.remove('visible');
    if (ph) ph.classList.remove('visible');
    if (hu) hu.classList.remove('visible');
  }
  function setLoggedIn(v) {
    isLoggedIn = v;
    if (v) armAutoLock();
    else clearAutoLock();
  }
  document.addEventListener('visibilitychange', () => {
    if (!isLoggedIn) return;
    if (document.hidden) {
      hiddenAt = Date.now();
    } else if (hiddenAt) {
      const elapsed = Date.now() - hiddenAt;
      hiddenAt = null;
      if (elapsed >= HIDDEN_LOCK_MS) lock();
      else armAutoLock();
    }
  });
  return { setMasterKey, getMasterKey, armAutoLock, clearAutoLock, lock, setLoggedIn };
})();

/* ============================================================================
   FACE LIVENESS — Biological entropy collection
   ============================================================================ */
const Face = (() => {
  let video, canvas, ctx, stream, active = false, running = false;

  async function init() {
    video = document.getElementById('camera-feed');
    if (!video) return false;
    canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 96;
    ctx = canvas.getContext('2d', { willReadFrequently: true });
    return true;
  }
  async function start() {
    if (active) return true;
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera not supported');
    if (!window.isSecureContext) throw new Error('HTTPS required');
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      await new Promise((res, rej) => {
        video.onloadedmetadata = () => video.play().then(res).catch(rej);
        setTimeout(() => rej(new Error('Video timeout')), 5000);
      });
      active = true;
      return true;
    } catch (e) {
      if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
      throw new Error(e.name === 'NotAllowedError' ? 'Camera permission denied' : 'Camera error');
    }
  }
  function stop() {
    running = false;
    if (stream) { try { stream.getTracks().forEach(t => t.stop()); } catch (e) {} stream = null; }
    if (video) { try { video.pause(); video.srcObject = null; } catch (e) {} }
    active = false;
  }
  function capture() {
    if (!video || !active) return null;
    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (e) { return null; }
  }
  function brightness(img, x1, y1, x2, y2) {
    const d = img.data, w = img.width, h = img.height;
    const x1p = Math.floor(x1 * w), y1p = Math.floor(y1 * h);
    const x2p = Math.floor(x2 * w), y2p = Math.floor(y2 * h);
    let sum = 0, cnt = 0;
    for (let y = y1p; y < y2p; y += 2) for (let x = x1p; x < x2p; x += 2) {
      if (y < 0 || y >= h || x < 0 || x >= w) continue;
      const i = (y * w + x) * 4;
      sum += d[i] * .299 + d[i + 1] * .587 + d[i + 2] * .114;
      cnt++;
    }
    return cnt ? sum / cnt : 0;
  }
  function detectBlink(p, c) {
    if (!p || !c) return false;
    const leP = brightness(p, .3, .35, .45, .5), leC = brightness(c, .3, .35, .45, .5);
    const reP = brightness(p, .55, .35, .7, .5), reC = brightness(c, .55, .35, .7, .5);
    const ckP = brightness(p, .3, .6, .7, .75), ckC = brightness(c, .3, .6, .7, .75);
    const eyeDelta = (leP - leC + reP - reC) / 2;
    const cheekDelta = ckP - ckC;
    return eyeDelta > 15 && Math.abs(eyeDelta - cheekDelta) > 8;
  }
  function detectTurn(f) {
    const l = brightness(f, .05, .3, .4, .7), r = brightness(f, .6, .3, .95, .7);
    return Math.abs(l - r) > 20;
  }
  function detectSmile(f) {
    const mouth = brightness(f, .4, .65, .6, .85), chin = brightness(f, .4, .85, .6, .95);
    return mouth - chin > 8;
  }
  async function runCheck(onProgress, challenge) {
    running = true;
    const frames = [];
    try {
      const start = Date.now(), MAX = 25000;
      await new Promise(r => setTimeout(r, 500));
      const baseline = capture();
      if (!baseline) throw new Error('Cannot capture baseline');
      frames.push(baseline);
      let last = baseline;
      const steps = [
        { step: 'blink', duration: 4000, hint: '👁️ Blink now', detect: (c, p) => detectBlink(p, c) },
        { step: 'turn', duration: 5000, hint: '↔️ Turn head slowly', detect: (c) => detectTurn(c) },
        { step: 'smile', duration: 4000, hint: '😊 Smile', detect: (c) => detectSmile(c) }
      ];
      for (let i = 0; i < steps.length; i++) {
        if (!running) throw new Error('Cancelled');
        const s = steps[i];
        const ss = Date.now();
        let detections = 0;
        let consecutiveFails = 0;
        onProgress({ step: s.step, hint: s.hint, completed: i });
        while (Date.now() - ss < s.duration) {
          if (!running) throw new Error('Cancelled');
          if (Date.now() - start > MAX) throw new Error('Timeout');
          await new Promise(r => setTimeout(r, 80));
          const f = capture();
          if (!f) {
            consecutiveFails++;
            if (consecutiveFails > 50) throw new Error('Camera stream failed');
            continue;
          }
          consecutiveFails = 0;
          if (frames.length < 50) frames.push(f);
          if (s.detect(f, last)) {
            detections++;
            if (detections >= 3) break;
          } else {
            detections = Math.max(0, detections - 1);
          }
          last = f;
        }
        if (detections < 3 && s.step === 'turn') throw new Error('Detection failed: ' + s.step);
      }

      // Build biological entropy: 128 bytes
      const entropy = new Uint8Array(128);
      let idx = 0;
      for (const f of frames.slice(0, 20)) {
        if (idx >= 96) break;
        for (let j = 0; j < 5 && idx < 96; j++) {
          entropy[idx++] = f.data[(j * 17 + idx * 13) % f.data.length];
        }
      }
      entropy.set(challenge.slice(0, 32), 96);

      // Hash the biological entropy
      const h = SHA3.hash512(entropy);
      Crypto.zeroize(entropy);
      return h;
    } finally {
      running = false;
      for (const f of frames) {
        if (f && f.data) {
          try {
            const arr = new Uint8Array(f.data.buffer);
            crypto.getRandomValues(arr);
            arr.fill(0);
          } catch (e) {}
        }
      }
      frames.length = 0;
    }
  }
  return { init, start, stop, runCheck };
})();

/* ============================================================================
   TWO-FA — Quantum biometric confirmation
   ============================================================================ */
const TwoFA = (() => {
  let pending = null;
  let verifying = false;

  function request(cb) {
    if (pending) { UI.toast('Complete current verification first', 'warn'); return false; }
    pending = cb;
    UI.openModal('modal-2fa');
    return true;
  }

  async function verify() {
    if (verifying) return;
    verifying = true;
    const btn = document.getElementById('btn-2fa-verify');
    if (btn) { btn.disabled = true; btn.classList.add('loading'); }
    try {
      await Face.start();
      // Generate a 1024-byte quantum seed challenge
      const challenge = SafeRandom.bytes(1024);
      const entropy = await Face.runCheck(() => {}, challenge);
      if (!entropy || entropy.length !== 64) throw new Error('Invalid biometric');
      Face.stop();
      UI.closeModal('modal-2fa');
      const cb = pending;
      pending = null;
      if (cb) await cb(entropy);
    } catch (e) {
      UI.toast('Quantum biometric failed: ' + e.message, 'error');
      Face.stop();
    } finally {
      verifying = false;
      if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
    }
  }

  function cancel() {
    pending = null;
    Face.stop();
    UI.closeModal('modal-2fa');
  }

  return { request, verify, cancel };
})();

/* ============================================================================
   TRIPLE-AUTH — for secret reveal
   ============================================================================ */
const TripleAuth = (() => {
  let target = null, callback = null, verifiedPassword = null;

  function request(t, cb) {
    target = t; callback = cb; verifiedPassword = null;
    const input = document.getElementById('triple-auth-password');
    if (input) input.value = '';
    const hint = document.getElementById('triple-auth-hint');
    if (hint) { hint.textContent = ''; hint.className = 'form-hint'; }
    UI.openModal('modal-triple-auth');
  }

  async function verifyPassword() {
    const pwd = (document.getElementById('triple-auth-password') || {}).value || '';
    if (!pwd) {
      const hint = document.getElementById('triple-auth-hint');
      if (hint) { hint.textContent = 'Enter password'; hint.className = 'form-hint error'; }
      return;
    }
    const btn = document.getElementById('btn-triple-auth-step1');
    if (btn) { btn.disabled = true; btn.classList.add('loading'); }
    try {
      const meta = AuthMeta.get();
      if (!meta || !meta.pwdHash || !meta.pwdSalt) throw new Error('No auth data');
      const salt = Crypto.b64dec(meta.pwdSalt);
      const derived = await Crypto.pbkdf2(pwd, salt, 600000, 256);
      const expected = Crypto.hexDec(meta.pwdHash);
      const valid = Crypto.timingSafeEqual(derived, expected);
      Crypto.zeroize(derived);
      if (!valid) {
        await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
        throw new Error('Invalid credentials');
      }
      verifiedPassword = pwd;
      UI.closeModal('modal-triple-auth');
      await new Promise(r => setTimeout(r, 200));
      TwoFA.request(async () => {
        const input = document.getElementById('confirm-reveal-input');
        if (input) input.value = '';
        const confirmBtn = document.getElementById('btn-confirm-reveal');
        if (confirmBtn) confirmBtn.disabled = true;
        UI.openModal('modal-confirm-reveal');
      });
    } catch (e) {
      const hint = document.getElementById('triple-auth-hint');
      if (hint) { hint.textContent = e.message || 'Failed'; hint.className = 'form-hint error'; }
      Audit.log('Failed reveal attempt: ' + (e.message || 'unknown'), 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
    }
  }

  function confirm() {
    const input = document.getElementById('confirm-reveal-input');
    if (!input || input.value.trim().toUpperCase() !== 'REVEAL') return;
    UI.closeModal('modal-confirm-reveal');
    Audit.log('Secret revealed: ' + target, 'warn');
    if (callback) callback(target, verifiedPassword);
    target = null; callback = null; verifiedPassword = null;
  }

  function cancel() { target = null; callback = null; verifiedPassword = null; }

  return { request, verifyPassword, confirm, cancel };
})();

/* ============================================================================
   PASSWORD MODALS
   ============================================================================ */
const SetPassword = (() => {
  let resolvePromise = null;
  let watcher = null;

  function prompt() {
    return new Promise((resolve) => {
      resolvePromise = resolve;
      const p1 = document.getElementById('set-password-1');
      const p2 = document.getElementById('set-password-2');
      const hint = document.getElementById('set-password-hint');
      if (p1) p1.value = '';
      if (p2) p2.value = '';
      if (hint) { hint.textContent = ''; hint.className = 'form-hint'; }
      UI.openModal('modal-set-password');
      if (watcher) clearInterval(watcher);
      watcher = setInterval(() => {
        const m = document.getElementById('modal-set-password');
        if (!m || !m.classList.contains('active')) {
          clearInterval(watcher); watcher = null;
          if (resolvePromise === resolve) {
            resolvePromise = null;
            resolve(null);
          }
        }
      }, 200);
    });
  }

  async function submit() {
    const p1 = (document.getElementById('set-password-1') || {}).value || '';
    const p2 = (document.getElementById('set-password-2') || {}).value || '';
    const hint = document.getElementById('set-password-hint');
    if (p1.length < 12) {
      if (hint) { hint.textContent = 'Password must be at least 12 characters'; hint.className = 'form-hint error'; }
      return;
    }
    if (p1 !== p2) {
      if (hint) { hint.textContent = 'Passwords do not match'; hint.className = 'form-hint error'; }
      return;
    }
    UI.closeModal('modal-set-password');
    if (resolvePromise) {
      const r = resolvePromise;
      resolvePromise = null;
      r(p1);
    }
  }
  return { prompt, submit };
})();

const ExistingPassword = (() => {
  let resolvePromise = null;
  let watcher = null;

  function prompt() {
    return new Promise((resolve) => {
      resolvePromise = resolve;
      const input = document.getElementById('existing-password-input');
      const hint = document.getElementById('existing-password-hint');
      if (input) input.value = '';
      if (hint) { hint.textContent = ''; hint.className = 'form-hint'; }
      UI.openModal('modal-existing-password');
      setTimeout(() => { try { input?.focus(); } catch (e) {} }, 100);
      if (watcher) clearInterval(watcher);
      watcher = setInterval(() => {
        const m = document.getElementById('modal-existing-password');
        if (!m || !m.classList.contains('active')) {
          clearInterval(watcher); watcher = null;
          if (resolvePromise === resolve) {
            resolvePromise = null;
            resolve(null);
          }
        }
      }, 200);
    });
  }

  function submit() {
    const input = document.getElementById('existing-password-input');
    const hint = document.getElementById('existing-password-hint');
    const v = input ? input.value : '';
    if (!v) {
      if (hint) { hint.textContent = 'Enter password'; hint.className = 'form-hint error'; }
      return;
    }
    UI.closeModal('modal-existing-password');
    if (resolvePromise) {
      const r = resolvePromise;
      resolvePromise = null;
      r(v);
    }
  }
  return { prompt, submit };
})();

/* ============================================================================
   WALLETS
   ============================================================================ */
const Wallets = (() => {
  let all = Object.create(null);
  let currentSymbol = null;
  let currentAccountId = null;

  async function init() {
    const r = await Storage.getDetailed('wallets');
    if (r.exists && r.decryptFailed) {
      throw new Error('Cannot decrypt wallets — wrong password or corrupted data.');
    }
    if (r.ok && r.value && typeof r.value === 'object') {
      all = r.value;
    } else if (!r.exists) {
      all = Object.create(null);
      await ensureDefaults();
    } else {
      all = Object.create(null);
    }
    await LivePrices.fetchPrices(['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'CASH']);
  }

  async function ensureDefaults() {
    const defaults = [
      { symbol: 'CASH', balance: '1250000' },
      { symbol: 'GOLD', balance: '1000' },
      { symbol: 'TIME', balance: '8420.12' },
      { symbol: 'GEM', balance: '500' },
      { symbol: 'KEY', balance: '100' }
    ];
    for (const d of defaults) {
      const c = COINS_MAP[d.symbol];
      if (!c) continue;
      all[c.symbol] = {
        symbol: c.symbol, name: c.name, chain: c.chain, color: c.color,
        accounts: [await genAccount(c, Money.fromString(d.balance) || 0n, 'Main')]
      };
    }
    await save();
  }

  async function genAccount(coin, balance, label) {
    const addrBytes = SafeRandom.bytes(32);
    let address;
    const s = coin.symbol;
    if (s === 'BTC') address = 'bc1q' + Crypto.hexEnc(addrBytes).slice(0, 38);
    else if (['CASH', 'GOLD', 'USDT', 'USDC', 'BNB', 'MATIC', 'LINK', 'AAVE', 'UNI', 'ARB', 'OP'].includes(s))
      address = '0x' + Crypto.hexEnc(addrBytes).slice(0, 40);
    else if (s === 'SOL') address = Crypto.b64enc(addrBytes).slice(0, 44);
    else if (s === 'XRP') address = 'r' + Crypto.hexEnc(addrBytes).slice(0, 33);
    else address = s.toLowerCase() + '_' + Crypto.hexEnc(addrBytes).slice(0, 40);
    const secret = Crypto.hexEnc(SafeRandom.bytes(32));
    return {
      id: 'acc_' + SafeRandom.hex(8),
      label, address, balance: balance || 0n, secret,
      createdAt: Date.now(), txs: []
    };
  }

  async function save() { await Storage.set('wallets', all); }

  async function render() {
    const list = document.getElementById('wallet-list');
    if (!list) return;
    if (!Object.keys(all).length) {
      list.innerHTML = '<li class="empty-state"><div class="empty-state-title">No wallets</div></li>';
      return;
    }
    const frag = document.createDocumentFragment();
    for (const w of Object.values(all)) {
      const bal = w.accounts.reduce((s, a) => s + (a.balance || 0n), 0n);
      const usd = LivePrices.formatUSD(Money.toString(bal), w.symbol);
      const li = document.createElement('li');
      li.className = 'wallet-item';
      const icon = document.createElement('div');
      icon.className = 'wallet-icon';
      icon.style.background = w.color;
      icon.textContent = w.symbol[0];
      const info = document.createElement('div');
      info.className = 'wallet-info';
      info.innerHTML = `<div class="wallet-name">${UI.esc(w.symbol)} <span class="wallet-count">${w.accounts.length}</span></div><div class="wallet-network">${UI.esc(w.name)}</div>`;
      const balDiv = document.createElement('div');
      balDiv.innerHTML = `<div class="wallet-balance">${UI.esc(Money.format(bal))}</div><div class="wallet-balance-usd">${UI.esc(usd)}</div>`;
      li.appendChild(icon);
      li.appendChild(info);
      li.appendChild(balDiv);
      li.addEventListener('click', () => openDetails(w.symbol));
      frag.appendChild(li);
    }
    list.replaceChildren(frag);
    const cnt = document.getElementById('profile-wallet-count');
    if (cnt) cnt.textContent = totalCount() + ' wallets';
    renderPortfolio();
  }

  function renderPortfolio() {
    const c = document.getElementById('portfolio-summary');
    if (!c) return;
    let total = 0;
    const bd = [];
    for (const w of Object.values(all)) {
      const bal = w.accounts.reduce((s, a) => s + (a.balance || 0n), 0n);
      const p = LivePrices.getPrice(w.symbol);
      const usd = p !== null ? Number(Money.toString(bal)) * p : 0;
      total += usd;
      bd.push({ symbol: w.symbol, balance: bal, usd, color: w.color });
    }
    bd.sort((a, b) => b.usd - a.usd);
    const frag = document.createDocumentFragment();
    const header = document.createElement('div');
    header.style.cssText = 'text-align:center;padding:20px 0;border-bottom:1px solid var(--gray-light);margin-bottom:16px;';
    header.innerHTML = `<div style="font-size:11px;color:var(--gray);font-weight:800;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;">Total Value</div><div style="font-size:30px;font-weight:900;font-family:var(--mono);direction:ltr;">$${total.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>`;
    frag.appendChild(header);
    for (const b of bd.slice(0, 8)) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--gray-light);';
      row.innerHTML = `
        <div style="width:32px;height:32px;border-radius:50%;background:${UI.esc(b.color)};color:white;font-weight:900;display:flex;align-items:center;justify-content:center;font-size:12px;">${UI.esc(b.symbol[0])}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:900;font-size:12px;">${UI.esc(b.symbol)}</div>
          <div style="font-size:10px;color:var(--gray);font-family:var(--mono);font-weight:600;direction:ltr;">${UI.esc(Money.format(b.balance))}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-weight:900;font-size:12px;font-family:var(--mono);direction:ltr;">$${b.usd.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
          <div style="font-size:10px;color:var(--gray);font-weight:700;">${total > 0 ? (b.usd / total * 100).toFixed(1) : 0}%</div>
        </div>`;
      frag.appendChild(row);
    }
    c.replaceChildren(frag);
  }

  function totalCount() { return Object.values(all).reduce((s, w) => s + w.accounts.length, 0); }
  function openAddCoin() { UI.openModal('modal-add-coin'); renderGrid(''); }

  function renderGrid(filter) {
    const g = document.getElementById('coin-grid');
    if (!g) return;
    const f = (filter || '').toLowerCase().trim();
    const list = COINS.filter(c => !f || c.symbol.toLowerCase().includes(f) || c.name.toLowerCase().includes(f));
    const frag = document.createDocumentFragment();
    for (const c of list) {
      const added = !!all[c.symbol];
      const card = document.createElement('div');
      card.style.cssText = `padding:10px 6px;background:var(--white);border:1.5px solid var(--gray-light);border-radius:12px;cursor:pointer;transition:all 150ms;text-align:center;${added ? 'opacity:0.5;' : ''}`;
      card.innerHTML = `
        <div style="width:42px;height:42px;border-radius:50%;background:${UI.esc(c.color)};color:white;font-weight:900;font-size:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 6px;">${UI.esc(c.symbol[0])}</div>
        <div style="font-size:10px;font-weight:900;">${UI.esc(c.symbol)}</div>
        <div style="font-size:9px;color:var(--gray);font-weight:700;">${UI.esc(c.chain.substring(0, 10))}</div>`;
      card.addEventListener('click', () => addCoin(c.symbol));
      frag.appendChild(card);
    }
    g.replaceChildren(frag);
  }

  async function addCoin(symbol) {
    const c = COINS_MAP[symbol];
    if (!c) return;
    if (all[symbol]) { UI.toast(symbol + ' already added', 'warn'); return; }
    all[symbol] = {
      symbol: c.symbol, name: c.name, chain: c.chain, color: c.color,
      accounts: [await genAccount(c, 0n, 'Main')]
    };
    await save();
    await render();
    Send.renderCoinSelector();
    Swap.render();
    UI.closeModal('modal-add-coin');
    Audit.log('Added ' + symbol, 'success');
    UI.toast('✓ ' + c.name + ' added', 'success');
  }

  async function createNewAccount() {
    if (!currentSymbol) return;
    const c = COINS_MAP[currentSymbol];
    if (!c || !all[currentSymbol]) return;
    const n = all[currentSymbol].accounts.length + 1;
    const a = await genAccount(c, 0n, 'Wallet ' + n);
    all[currentSymbol].accounts.push(a);
    await save();
    await renderDetails(currentSymbol);
    UI.toast('✓ New ' + currentSymbol + ' address', 'success');
  }

  function openDetails(s) {
    if (!all[s]) return;
    currentSymbol = s;
    renderDetails(s);
    UI.openModal('modal-wallet-details');
  }

  function renderDetails(s) {
    const w = all[s];
    if (!w) return;
    const el = document.getElementById('wallet-details-symbol');
    if (el) el.textContent = s;
    const al = document.getElementById('wallet-accounts-list');
    if (!al) return;
    const frag = document.createDocumentFragment();
    for (const a of w.accounts) {
      const div = document.createElement('div');
      div.className = 'wallet-account';
      div.innerHTML = `
        <div class="wallet-account-header">
          <div class="wallet-account-name">${UI.esc(a.label)}</div>
          <div class="wallet-account-balance">${UI.esc(Money.format(a.balance))} ${UI.esc(s)}</div>
        </div>
        <div class="wallet-address-row" data-addr>${UI.esc(a.address)}</div>
        <div class="wallet-account-actions">
          <button class="wallet-account-action primary" data-action="send">Send</button>
          <button class="wallet-account-action" data-action="receive">Receive</button>
          <button class="wallet-account-action" data-action="secret">Keys</button>
          <button class="wallet-account-action danger" data-action="delete">Del</button>
        </div>`;
      div.querySelector('[data-addr]').addEventListener('click', () => copyText(a.address));
      div.querySelector('[data-action="send"]').addEventListener('click', () => accSend(s, a.id));
      div.querySelector('[data-action="receive"]').addEventListener('click', () => accReceive(s, a.id));
      div.querySelector('[data-action="secret"]').addEventListener('click', () => requestSecret(s, a.id));
      div.querySelector('[data-action="delete"]').addEventListener('click', () => confirmDelete(s, a.id));
      frag.appendChild(div);
    }
    al.replaceChildren(frag);
  }

  function openSendForCurrent() {
    UI.closeModal('modal-wallet-details');
    UI.switchTab('send');
    Send.selectCoin(currentSymbol);
  }
  function openReceiveForCurrent() {
    UI.closeModal('modal-wallet-details');
    const w = all[currentSymbol];
    if (!w) return;
    currentAccountId = w.accounts[0].id;
    showQR();
  }
  function showQR() {
    const w = all[currentSymbol];
    if (!w) return;
    const a = w.accounts.find(x => x.id === currentAccountId) || w.accounts[0];
    const rn = document.getElementById('receive-name');
    const ra = document.getElementById('receive-address');
    if (rn) rn.textContent = w.name + ' — ' + a.label;
    if (ra) ra.textContent = a.address;
    const cv = document.getElementById('qr-canvas');
    if (cv) QR.generate(cv, a.address);
    UI.openModal('modal-receive');
  }
  function accSend(s, id) {
    currentSymbol = s; currentAccountId = id;
    UI.closeModal('modal-wallet-details');
    UI.switchTab('send');
    Send.selectCoin(s);
  }
  function accReceive(s, id) {
    currentSymbol = s; currentAccountId = id;
    UI.closeModal('modal-wallet-details');
    showQR();
  }
  function requestSecret(s, id) {
    const w = all[s];
    if (!w) return;
    const a = w.accounts.find(x => x.id === id);
    if (!a) return;
    TripleAuth.request(s + ':' + id, () => {
      const content = document.getElementById('reveal-secret-content');
      if (!content) return;
      const frag = document.createDocumentFragment();
      const pkDiv = document.createElement('div');
      pkDiv.className = 'secret-reveal';
      const label = document.createElement('div');
      label.className = 'secret-label';
      label.textContent = 'Private Key';
      const val = document.createElement('div');
      val.style.wordBreak = 'break-all';
      val.textContent = a.secret;
      pkDiv.appendChild(label);
      pkDiv.appendChild(val);
      frag.appendChild(pkDiv);
      const copyBtn = document.createElement('button');
      copyBtn.className = 'btn btn-outline btn-sm';
      copyBtn.textContent = '📋 Copy (auto-clear 30s)';
      copyBtn.style.marginTop = '12px';
      copyBtn.addEventListener('click', () => copySecret(a.secret));
      frag.appendChild(copyBtn);
      content.replaceChildren(frag);
      UI.openModal('modal-reveal-secret');
    });
  }
  async function copySecret(secret) {
    try {
      await navigator.clipboard.writeText(secret);
      UI.toast('✓ Copied — auto-clear 30s', 'success');
      const t = setTimeout(async () => {
        try {
          const cur = await navigator.clipboard.readText();
          if (cur === secret) await navigator.clipboard.writeText('');
        } catch (e) {}
      }, 30000);
      window.addEventListener('beforeunload', () => {
        clearTimeout(t);
        navigator.clipboard.writeText('').catch(() => {});
      }, { once: true });
    } catch (e) { UI.toast('Copy failed', 'error'); }
  }
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      UI.toast('✓ Copied', 'success');
    } catch (e) { UI.toast('Copy failed', 'error'); }
  }
  function copyCurrentAddress() {
    const w = all[currentSymbol];
    if (!w) return;
    const a = w.accounts.find(x => x.id === currentAccountId) || w.accounts[0];
    copyText(a.address);
  }
  function confirmDelete(s, id) {
    if (!confirm('Delete this wallet?')) return;
    if (!all[s] || all[s].accounts.length <= 1) { UI.toast('Cannot delete last wallet', 'error'); return; }
    all[s].accounts = all[s].accounts.filter(a => a.id !== id);
    save().then(() => { renderDetails(s); render(); UI.toast('✓ Deleted', 'success'); });
  }

  return { init, render, save, openAddCoin, addCoin, createNewAccount, openDetails, renderDetails, openSendForCurrent, openReceiveForCurrent, copyCurrentAddress, accSend, accReceive, requestSecret, get all() { return all; } };
})();

/* ============================================================================
   SWAP
   ============================================================================ */
const Swap = (() => {
  let fromSymbol = 'CASH', toSymbol = 'BTC', selectedDex = 'uniswap', pickTarget = null;
  const DEXS = [
    { id: 'uniswap', name: 'Uniswap V3', fee: 0.003, network: 'Ethereum' },
    { id: 'pancakeswap', name: 'PancakeSwap', fee: 0.0025, network: 'BSC' },
    { id: 'sushiswap', name: 'SushiSwap', fee: 0.003, network: 'Multi' },
    { id: 'curve', name: 'Curve', fee: 0.0004, network: 'Ethereum' },
    { id: '1inch', name: '1inch', fee: 0, network: 'Aggregator' }
  ];
  const PLATFORM_FEE = 0.01;

  function render() {
    const fromIcon = document.getElementById('swap-from-icon');
    const toIcon = document.getElementById('swap-to-icon');
    const fromSym = document.getElementById('swap-from-symbol');
    const toSym = document.getElementById('swap-to-symbol');
    const updateIcon = (sym, el) => {
      const c = COINS_MAP[sym];
      if (!c || !el) return;
      el.style.background = c.color;
      el.textContent = sym[0];
    };
    updateIcon(fromSymbol, fromIcon);
    updateIcon(toSymbol, toIcon);
    if (fromSym) fromSym.textContent = fromSymbol;
    if (toSym) toSym.textContent = toSymbol;
    updateBalances();
    renderDex();
    calculate();
  }
  function updateBalances() {
    const fW = Wallets.all[fromSymbol], tW = Wallets.all[toSymbol];
    const fB = fW ? fW.accounts.reduce((s, a) => s + (a.balance || 0n), 0n) : 0n;
    const tB = tW ? tW.accounts.reduce((s, a) => s + (a.balance || 0n), 0n) : 0n;
    const fE = document.getElementById('from-balance');
    const tE = document.getElementById('to-balance');
    if (fE) fE.textContent = 'Balance: ' + Money.format(fB);
    if (tE) tE.textContent = 'Balance: ' + Money.format(tB);
  }
  function rate(dexId) {
    const pF = LivePrices.getPrice(fromSymbol);
    const pT = LivePrices.getPrice(toSymbol);
    if (!pF || !pT || pF <= 0 || pT <= 0) return null;
    const d = DEXS.find(x => x.id === dexId);
    if (!d) return null;
    return (pF / pT) * (1 - d.fee);
  }
  function renderDex() {
    const c = document.getElementById('dex-selector');
    if (!c) return;
    let best = 0, bestId = null;
    const list = DEXS.map(d => {
      const r = rate(d.id) || 0;
      if (r > best) { best = r; bestId = d.id; }
      return { ...d, rate: r };
    });
    const frag = document.createDocumentFragment();
    for (const d of list) {
      const isB = d.id === bestId && d.rate > 0;
      const card = document.createElement('div');
      card.className = 'dex-card' + (selectedDex === d.id ? ' active' : '');
      card.innerHTML = `
        <div class="dex-name">${UI.esc(d.name)}</div>
        <div class="dex-rate ${isB ? 'best' : ''}">1 ${UI.esc(fromSymbol)} = ${d.rate.toFixed(6)}</div>
        <div style="font-size:8px;color:var(--gray);margin-top:3px;font-weight:700;">${UI.esc(d.network)} · ${(d.fee * 100).toFixed(2)}%</div>
        ${isB ? '<div style="font-size:8px;color:var(--green);margin-top:3px;font-weight:900;text-transform:uppercase;">★ Best</div>' : ''}`;
      card.addEventListener('click', () => { selectedDex = d.id; renderDex(); calculate(); });
      frag.appendChild(card);
    }
    c.replaceChildren(frag);
  }
  function openPicker(target) {
    pickTarget = target;
    UI.openModal('modal-coin-picker');
    renderPicker('');
  }
  function renderPicker(filter) {
    const g = document.getElementById('picker-coin-grid');
    if (!g) return;
    const f = (filter || '').toLowerCase().trim();
    const list = COINS.filter(c => !f || c.symbol.toLowerCase().includes(f) || c.name.toLowerCase().includes(f));
    const frag = document.createDocumentFragment();
    for (const c of list) {
      const card = document.createElement('div');
      card.style.cssText = 'padding:10px 6px;background:var(--white);border:1.5px solid var(--gray-light);border-radius:12px;cursor:pointer;text-align:center;';
      card.innerHTML = `
        <div style="width:42px;height:42px;border-radius:50%;background:${UI.esc(c.color)};color:white;font-weight:900;font-size:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 6px;">${UI.esc(c.symbol[0])}</div>
        <div style="font-size:10px;font-weight:900;">${UI.esc(c.symbol)}</div>`;
      card.addEventListener('click', () => pickCoin(c.symbol));
      frag.appendChild(card);
    }
    g.replaceChildren(frag);
  }
  function pickCoin(s) {
    if (!COINS_MAP[s]) return;
    if (pickTarget === 'from') {
      if (s === toSymbol) toSymbol = fromSymbol;
      fromSymbol = s;
    } else {
      if (s === fromSymbol) fromSymbol = toSymbol;
      toSymbol = s;
    }
    UI.closeModal('modal-coin-picker');
    render();
  }
  function flip() {
    const cf = (document.getElementById('swap-from-amount') || {}).value || '';
    const ct = (document.getElementById('swap-to-amount') || {}).value || '';
    [fromSymbol, toSymbol] = [toSymbol, fromSymbol];
    document.getElementById('swap-from-amount').value = ct;
    document.getElementById('swap-to-amount').value = cf;
    render();
  }
  function setPercent(pct) {
    const w = Wallets.all[fromSymbol];
    if (!w) return;
    const b = w.accounts.reduce((s, a) => s + (a.balance || 0n), 0n);
    if (b <= 0n) { UI.toast('No balance', 'warn'); return; }
    const amt = (b * BigInt(pct)) / 100n;
    document.getElementById('swap-from-amount').value = Money.toString(amt);
    calculate();
  }
  function calculate() {
    const inputEl = document.getElementById('swap-from-amount');
    const outputEl = document.getElementById('swap-to-amount');
    const amountStr = inputEl ? inputEl.value : '';
    const a = Money.fromString(amountStr);
    const r = rate(selectedDex);
    if (!r || !Number.isFinite(r) || r <= 0 || !a || a <= 0n) {
      if (outputEl) outputEl.value = '';
      ['swap-rate', 'swap-fee', 'swap-receive'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '-';
      });
      return;
    }
    const rateScaled = BigInt(Math.round(r * 1e8));
    const gross = (a * rateScaled) / 100000000n;
    const fee = (gross * BigInt(Math.round(PLATFORM_FEE * 100))) / 100n;
    const net = gross - fee;
    if (outputEl) outputEl.value = Money.toString(net);
    const rateEl = document.getElementById('swap-rate');
    if (rateEl) rateEl.textContent = '1 ' + fromSymbol + ' = ' + r.toFixed(8) + ' ' + toSymbol;
    const feeEl = document.getElementById('swap-fee');
    if (feeEl) feeEl.textContent = Money.format(fee) + ' ' + toSymbol;
    const recvEl = document.getElementById('swap-receive');
    if (recvEl) recvEl.textContent = Money.format(net) + ' ' + toSymbol;
  }
  async function execute() {
    if (fromSymbol === toSymbol) { UI.toast('Cannot swap same currency', 'error'); return; }
    const amountStr = (document.getElementById('swap-from-amount') || {}).value || '';
    const a = Money.fromString(amountStr);
    if (!a || a <= 0n) { UI.toast('Enter amount', 'error'); return; }
    const fW = Wallets.all[fromSymbol];
    if (!fW) { UI.toast('Source wallet not found', 'error'); return; }
    const bal = fW.accounts.reduce((s, x) => s + (x.balance || 0n), 0n);
    if (bal < a) { UI.toast('Insufficient balance', 'error'); return; }
    const r = rate(selectedDex);
    if (!r || r <= 0) { UI.toast('Rate unavailable', 'error'); return; }

    await withLock('swap', async () => {
      const fW2 = Wallets.all[fromSymbol];
      const bal2 = fW2.accounts.reduce((s, x) => s + (x.balance || 0n), 0n);
      if (bal2 < a) { UI.toast('Balance changed', 'error'); return; }
      const acc = fW2.accounts.find(x => (x.balance || 0n) >= a);
      if (!acc) { UI.toast('No account', 'error'); return; }
      const rateScaled = BigInt(Math.round(r * 1e8));
      const gross = (a * rateScaled) / 100000000n;
      const fee = (gross * BigInt(Math.round(PLATFORM_FEE * 100))) / 100n;
      const net = gross - fee;
      acc.balance = (acc.balance || 0n) - a;
      acc.txs = acc.txs || [];
      const idem = SafeRandom.hex(16);
      acc.txs.unshift({
        direction: 'swap', amount: a, counterparty: 'Swap to ' + toSymbol,
        timestamp: Date.now(), hash: 'swap_' + idem, toSymbol, toAmount: net, platformFee: fee
      });
      const tW = Wallets.all[toSymbol];
      if (tW && tW.accounts[0]) {
        tW.accounts[0].balance = (tW.accounts[0].balance || 0n) + net;
        tW.accounts[0].txs = tW.accounts[0].txs || [];
        tW.accounts[0].txs.unshift({
          direction: 'in', amount: net, counterparty: 'Swap from ' + fromSymbol,
          timestamp: Date.now(), hash: 'swap_' + idem, fromSymbol, fromAmount: a
        });
      }
      await Wallets.save();
      await Wallets.render();
      render();
      History.render();
      Audit.log('Swap: ' + Money.format(a) + ' ' + fromSymbol + ' → ' + Money.format(net) + ' ' + toSymbol, 'success');
      UI.toast('✓ Swap completed', 'success');
      document.getElementById('swap-from-amount').value = '';
      document.getElementById('swap-to-amount').value = '';
      calculate();
    });
  }
  return { render, calculate, execute, openPicker, pickCoin, flip, setPercent };
})();

/* ============================================================================
   WEB LOCKS
   ============================================================================ */
async function withLock(name, fn) {
  if (navigator.locks && typeof navigator.locks.request === 'function') {
    try {
      return await navigator.locks.request('cofc-' + name, fn);
    } catch (e) {
      console.warn('[COFC] navigator.locks failed, using fallback:', e);
    }
  }
  const lockKey = 'cofc-lock-' + name;
  const myId = SafeRandom.hex(8);
  const LOCK_TTL = 10000;
  let attempts = 0;
  while (attempts < 50) {
    const raw = localStorage.getItem(lockKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.ts > LOCK_TTL) {
          localStorage.removeItem(lockKey);
        }
      } catch (e) {
        localStorage.removeItem(lockKey);
      }
    }
    const cur = localStorage.getItem(lockKey);
    if (!cur) {
      localStorage.setItem(lockKey, JSON.stringify({ id: myId, ts: Date.now() }));
      await new Promise(r => setTimeout(r, 20 + Math.random() * 30));
      const verify = localStorage.getItem(lockKey);
      try {
        const parsed = JSON.parse(verify);
        if (parsed.id === myId) {
          try { return await fn(); }
          finally {
            const final = localStorage.getItem(lockKey);
            try {
              if (JSON.parse(final).id === myId) localStorage.removeItem(lockKey);
            } catch (e) {}
          }
        }
      } catch (e) {}
    }
    await new Promise(r => setTimeout(r, 50 + Math.random() * 100));
    attempts++;
  }
  throw new Error('Could not acquire lock — please try again');
}

/* ============================================================================
   HISTORY
   ============================================================================ */
const History = (() => {
  let filter = 'all';
  function getAll() {
    const arr = [];
    for (const w of Object.values(Wallets.all)) {
      for (const acc of w.accounts) {
        for (const tx of (acc.txs || [])) {
          arr.push({ ...tx, symbol: w.symbol, accountLabel: acc.label });
        }
      }
    }
    arr.sort((a, b) => b.timestamp - a.timestamp);
    return arr;
  }
  function render() {
    const c = document.getElementById('tx-history-container');
    if (!c) return;
    let txs = getAll();
    if (filter !== 'all') txs = txs.filter(t => t.direction === filter);
    if (!txs.length) {
      c.innerHTML = '<div class="empty-state"><div class="empty-state-title">No transactions</div><div class="empty-state-text">Your history will appear here</div></div>';
      return;
    }
    const frag = document.createDocumentFragment();
    for (const tx of txs.slice(0, 100)) {
      const it = tx.direction === 'in' ? 'in' : (tx.direction === 'swap' ? 'swap' : 'out');
      const aC = tx.direction === 'in' ? 'in' : (tx.direction === 'swap' ? '' : 'out');
      const pre = tx.direction === 'in' ? '+' : (tx.direction === 'swap' ? '↔' : '-');
      const div = document.createElement('div');
      div.className = 'tx-item';
      const svg = tx.direction === 'in' ? '<path d="M12 5v14M5 12l7 7 7-7"/>' : (tx.direction === 'swap' ? '<path d="M7 16V4M7 4L3 8M7 4l4 4M17 8v12M17 20l4-4M17 20l-4-4"/>' : '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>');
      div.innerHTML = `
        <div class="tx-icon-wrap ${it}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${svg}</svg>
        </div>
        <div class="tx-details">
          <div class="tx-top">
            <span class="tx-amount ${aC}">${UI.esc(pre + Money.format(tx.amount))} ${UI.esc(tx.symbol)}</span>
            <span class="tx-time">${UI.esc(new Date(tx.timestamp).toLocaleString())}</span>
          </div>
          <div class="tx-sub">${UI.esc((tx.direction === 'in' ? 'From ' : 'To ') + String(tx.counterparty || 'unknown').substring(0, 28))}</div>
        </div>`;
      frag.appendChild(div);
    }
    c.replaceChildren(frag);
  }
  function setFilter(f) {
    filter = f;
    document.querySelectorAll('.tx-filter').forEach(el => el.classList.toggle('active', el.dataset.filter === f));
    render();
  }
  function exportCSV() {
    const txs = getAll();
    if (!txs.length) { UI.toast('No transactions', 'warn'); return; }
    const esc = (v) => {
      let s = String(v === null || v === undefined ? '' : v);
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    };
    const rows = [['Date', 'Type', 'Symbol', 'Amount', 'Counterparty'], ...txs.map(t => [new Date(t.timestamp).toISOString(), t.direction, t.symbol, Money.toString(t.amount), t.counterparty || ''])];
    const csv = rows.map(r => r.map(esc).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cofc-history-' + Date.now() + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    UI.toast('✓ Exported', 'success');
  }
  return { render, setFilter, exportCSV };
})();

/* ============================================================================
   SEND
   ============================================================================ */
const Send = (() => {
  let selectedCoin = 'CASH';
  function renderCoinSelector() {
    const s = document.getElementById('currency-selector');
    if (!s) return;
    const syms = Object.keys(Wallets.all);
    if (!syms.length) { s.innerHTML = '<div style="font-size:11px;">Add a coin first</div>'; return; }
    const frag = document.createDocumentFragment();
    for (const sym of syms.slice(0, 12)) {
      const w = Wallets.all[sym];
      const chip = document.createElement('div');
      chip.style.cssText = `padding:8px 12px;background:${selectedCoin === sym ? 'var(--yellow)' : 'var(--ghost)'};border:1.5px solid ${selectedCoin === sym ? 'var(--yellow-dark)' : 'var(--gray-light)'};border-radius:100px;cursor:pointer;font-size:11px;font-weight:900;display:flex;align-items:center;gap:6px;color:var(--dark);`;
      chip.innerHTML = `<div style="width:20px;height:20px;border-radius:50%;background:${UI.esc(w.color)};color:white;font-weight:900;font-size:10px;display:flex;align-items:center;justify-content:center;">${UI.esc(sym[0])}</div>${UI.esc(sym)}`;
      chip.addEventListener('click', () => selectCoin(sym));
      frag.appendChild(chip);
    }
    s.replaceChildren(frag);
  }
  function selectCoin(s) { if (Wallets.all[s]) { selectedCoin = s; renderCoinSelector(); } }
  async function execute() {
    const to = (document.getElementById('send-to') || {}).value || '';
    const amountStr = (document.getElementById('send-amount') || {}).value || '';
    if (!to.trim()) { UI.toast('Enter recipient', 'error'); return; }
    const a = Money.fromString(amountStr);
    if (!a || a <= 0n) { UI.toast('Invalid amount', 'error'); return; }
    const w = Wallets.all[selectedCoin];
    if (!w) { UI.toast('Coin not found', 'error'); return; }
    const bal = w.accounts.reduce((s, x) => s + (x.balance || 0n), 0n);
    if (bal < a) { UI.toast('Insufficient balance', 'error'); return; }
    TwoFA.request(async () => {
      await withLock('send', async () => {
        const w2 = Wallets.all[selectedCoin];
        const bal2 = w2.accounts.reduce((s, x) => s + (x.balance || 0n), 0n);
        if (bal2 < a) { UI.toast('Balance changed', 'error'); return; }
        const acc = w2.accounts.find(x => (x.balance || 0n) >= a);
        if (!acc) { UI.toast('No account', 'error'); return; }
        acc.balance = (acc.balance || 0n) - a;
        acc.txs = acc.txs || [];
        const idem = SafeRandom.hex(16);
        acc.txs.unshift({ direction: 'out', amount: a, counterparty: to.trim().slice(0, 100), timestamp: Date.now(), hash: 'tx_' + idem });
        await Wallets.save();
        await Wallets.render();
        History.render();
        Audit.log('Sent ' + Money.format(a) + ' ' + selectedCoin, 'success');
        UI.toast('✓ Sent successfully', 'success');
        document.getElementById('send-to').value = '';
        document.getElementById('send-amount').value = '';
      });
    });
  }
  return { renderCoinSelector, selectCoin, execute };
})();

/* ============================================================================
   SETTINGS
   ============================================================================ */
const Settings = (() => {
  let data = { autoLock: true, autoClearClipboard: true, auditLogging: true };
  function render() {
    const a = document.getElementById('toggle-autolock');
    const c = document.getElementById('toggle-clipboard');
    const au = document.getElementById('toggle-audit');
    if (a) a.classList.toggle('active', data.autoLock);
    if (c) c.classList.toggle('active', data.autoClearClipboard);
    if (au) au.classList.toggle('active', data.auditLogging);
  }
  async function load() {
    const s = await Storage.get('settings');
    if (s) data = { ...data, ...s };
    render();
  }
  async function save() { await Storage.set('settings', data); }
  async function toggle(key) {
    data[key] = !data[key];
    await save();
    render();
    if (key === 'autoLock') { if (data.autoLock) Vault.armAutoLock(); else Vault.clearAutoLock(); }
  }
  async function wipeAllData() {
    if (!confirm('Delete ALL data permanently?')) return;
    if (prompt('Type DELETE to confirm:') !== 'DELETE') return;
    Storage.clearAll();
    AuthMeta.remove();
    sessionStorage.clear();
    try {
      if (indexedDB.databases) {
        const dbs = await indexedDB.databases();
        for (const db of dbs) { if (db.name && db.name.startsWith('cofc')) indexedDB.deleteDatabase(db.name); }
      }
    } catch (e) {}
    UI.toast('✓ All data wiped', 'success');
    setTimeout(() => location.reload(), 1500);
  }
  return { render, load, save, toggle, wipeAllData, data };
})();

/* ============================================================================
   PROFILE
   ============================================================================ */
const Profile = (() => {
  let data = { displayName: 'User', username: 'sovereign' };
  async function load() {
    const s = await Storage.get('profile');
    if (s) data = { ...data, ...s };
    render();
  }
  function render() {
    const hu = document.getElementById('header-username');
    const ha = document.getElementById('header-avatar');
    const pd = document.getElementById('profile-display-name');
    const pu = document.getElementById('profile-username');
    const pa = document.getElementById('profile-avatar');
    if (hu) hu.textContent = '@' + data.username;
    if (ha) ha.textContent = (data.displayName || 'U').charAt(0).toUpperCase();
    if (pd) pd.textContent = data.displayName;
    if (pu) pu.textContent = '@' + data.username;
    if (pa) pa.textContent = (data.displayName || 'U').charAt(0).toUpperCase();
  }
  function save() { return Storage.set('profile', data); }
  async function edit() {
    const n = prompt('Display name:', data.displayName);
    if (n) { data.displayName = n.slice(0, 40); await save(); render(); }
  }
  return { load, render, save, edit, get data() { return data; } };
})();

/* ============================================================================
   QR CODE
   ============================================================================ */
const QR = (() => {
  function generate(canvas, text) {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const hash = SHA3.hash512(Crypto.str2buf(text));
    const size = 25, margin = 2;
    const cell = (canvas.width - margin * 8) / size;
    ctx.fillStyle = '#464650';
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) % hash.length;
        if (hash[idx] & 1) ctx.fillRect(margin * 4 + x * cell, margin * 4 + y * cell, cell, cell);
      }
    }
    const fm = (fx, fy) => {
      ctx.fillStyle = '#464650';
      ctx.fillRect(margin * 4 + fx * cell, margin * 4 + fy * cell, cell * 7, cell * 7);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(margin * 4 + (fx + 1) * cell, margin * 4 + (fy + 1) * cell, cell * 5, cell * 5);
      ctx.fillStyle = '#464650';
      ctx.fillRect(margin * 4 + (fx + 2) * cell, margin * 4 + (fy + 2) * cell, cell * 3, cell * 3);
    };
    fm(0, 0); fm(size - 7, 0); fm(0, size - 7);
  }
  function download() {
    const canvas = document.getElementById('qr-canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = 'cofc-qr-' + Date.now() + '.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
    UI.toast('✓ QR downloaded', 'success');
  }
  return { generate, download };
})();

/* ============================================================================
   HARDWARE WALLET (WebHID)
   ============================================================================ */
const Hardware = (() => {
  const KNOWN_WALLETS = [
    { name: 'Ledger Nano X', vendorId: 0x2c97, type: 'Ledger' },
    { name: 'Ledger Nano S', vendorId: 0x2c97, type: 'Ledger' },
    { name: 'Ledger Nano S Plus', vendorId: 0x2c97, type: 'Ledger' },
    { name: 'Ledger Stax', vendorId: 0x2c97, type: 'Ledger' },
    { name: 'Ledger Flex', vendorId: 0x2c97, type: 'Ledger' },
    { name: 'Trezor Model One', vendorId: 0x534c, type: 'Trezor' },
    { name: 'Trezor Model T', vendorId: 0x534c, type: 'Trezor' },
    { name: 'Trezor Safe 3', vendorId: 0x1209, type: 'Trezor' },
    { name: 'Trezor Safe 5', vendorId: 0x1209, type: 'Trezor' },
    { name: 'BitBox02', vendorId: 0x03eb, type: 'BitBox' },
    { name: 'Coldcard MK4', vendorId: 0xd13e, type: 'Coldcard' },
    { name: 'Coldcard Q', vendorId: 0xd13e, type: 'Coldcard' },
    { name: 'KeepKey', vendorId: 0x2b24, type: 'KeepKey' }
  ];

  let connected = null;
  let currentDeviceCleanup = null;

  function render() {
    const g = document.getElementById('hw-wallet-grid');
    if (!g) return;
    const frag = document.createDocumentFragment();
    for (const w of KNOWN_WALLETS) {
      const isConnected = connected && connected.vendorId === w.vendorId;
      const card = document.createElement('div');
      card.className = 'hw-wallet-card' + (isConnected ? ' connected' : '');
      card.innerHTML = `<div class="hw-wallet-name">${UI.esc(w.name)}</div><div class="hw-wallet-status">${isConnected ? '✓ Connected' : UI.esc(w.type)}</div>`;
      frag.appendChild(card);
    }
    g.replaceChildren(frag);
    const status = document.getElementById('hw-status');
    if (status) {
      if (connected) status.textContent = `Connected: ${connected.productName || 'Device'}`;
      else if (typeof navigator !== 'undefined' && navigator.hid) status.textContent = 'Ready to connect';
      else status.textContent = 'WebHID not supported (use Chrome/Edge desktop)';
    }
  }

  async function connect() {
    if (!navigator.hid) {
      UI.toast('WebHID not supported. Use Chrome/Edge desktop.', 'error');
      return;
    }
    const btn = document.getElementById('btn-connect-hw');
    if (btn) { btn.disabled = true; btn.classList.add('loading'); }
    try {
      if (currentDeviceCleanup) { currentDeviceCleanup(); currentDeviceCleanup = null; }
      const filters = [
        { vendorId: 0x2c97 }, { vendorId: 0x534c }, { vendorId: 0x1209 },
        { vendorId: 0x03eb }, { vendorId: 0xd13e }, { vendorId: 0x2b24 }
      ];
      const devices = await navigator.hid.requestDevice({ filters });
      if (!devices.length) { UI.toast('No device selected', 'warn'); return; }
      const device = devices[0];
      if (!device.opened) await device.open();
      connected = device;
      const onInput = () => { /* handle incoming */ };
      const onDisconnect = () => {
        device.removeEventListener('inputreport', onInput);
        device.removeEventListener('disconnect', onDisconnect);
        connected = null;
        currentDeviceCleanup = null;
        render();
        UI.toast('Device disconnected', 'warn');
      };
      currentDeviceCleanup = () => {
        try {
          device.removeEventListener('inputreport', onInput);
          device.removeEventListener('disconnect', onDisconnect);
        } catch (e) {}
      };
      device.addEventListener('inputreport', onInput);
      device.addEventListener('disconnect', onDisconnect);
      Audit.log('HW wallet connected: ' + (device.productName || 'unknown'), 'success');
      UI.toast('✓ ' + (device.productName || 'Device') + ' connected', 'success');
      render();
    } catch (e) {
      UI.toast('Connection failed: ' + e.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
    }
  }

  return { render, connect };
})();

/* ============================================================================
   LOGIN FLOW — Quantum Authentication
   
   Authentication flow:
   1. Face liveness → 64-byte biometric entropy
   2. Generate 1024-byte quantum seed (from biometric + random)
   3. Password (first-time: create, returning: verify)
   4. Derive master key:
      - First time:  QuantumKDF.deriveQuantum(password, salt, quantumSeed)
      - Returning:   QuantumKDF.deriveQuantum(password, salt, biometricSeed) 
                     (biometricSeed is stored in AuthMeta for consistency)
   5. Load data
   ============================================================================ */
const LoginFlow = (() => {
  let mutex = false;
  let state = 'idle';

  async function start() {
    if (mutex) return;
    if (state !== 'idle' && state !== 'error') return;
    mutex = true;
    state = 'scanning';

    const app = document.getElementById('app-screen');
    const ph = document.getElementById('profile-header');
    const hu = document.getElementById('header-user');
    if (app) app.classList.remove('visible');
    if (ph) ph.classList.remove('visible');
    if (hu) hu.classList.remove('visible');

    const scanner = document.getElementById('face-scanner');
    const statusEl = document.getElementById('login-status');
    const pc = document.getElementById('progress-circle');
    const chips = {
      blink: document.getElementById('chip-blink'),
      turn: document.getElementById('chip-turn'),
      smile: document.getElementById('chip-smile')
    };
    Object.values(chips).forEach(c => c && c.classList.remove('active', 'done'));
    if (pc) pc.style.strokeDashoffset = 942;
    if (scanner) { scanner.classList.remove('success', 'error'); scanner.classList.add('scanning', 'disabled'); }
    if (statusEl) { statusEl.textContent = 'Initializing quantum core...'; statusEl.className = 'login-status active'; }

    let quantumSeed = null;
    try {
      if (!window.isSecureContext) throw new Error('HTTPS required');

      // ============ STEP 1: FACE LIVENESS ============
      await Face.start();
      if (scanner) scanner.classList.add('camera-active');
      if (statusEl) statusEl.textContent = 'Position your face';
      await new Promise(r => setTimeout(r, 1200));

      // Generate quantum challenge (1024 bytes)
      const challenge = SafeRandom.bytes(1024);
      const biometricEntropy = await Face.runCheck((p) => {
        Object.values(chips).forEach(c => c && c.classList.remove('active', 'done'));
        const order = ['blink', 'turn', 'smile'];
        for (let i = 0; i < order.length; i++) {
          const c = chips[order[i]];
          if (!c) continue;
          if (i < p.completed) c.classList.add('done');
          else if (i === p.completed) c.classList.add('active');
        }
        if (statusEl) statusEl.textContent = p.hint;
        if (pc) pc.style.strokeDashoffset = 942 * (1 - (p.completed + .5) / 3);
      }, challenge);

      if (!biometricEntropy || biometricEntropy.length !== 64) throw new Error('Invalid biometric data');

      Object.values(chips).forEach(c => { if (c) { c.classList.remove('active'); c.classList.add('done'); } });
      if (pc) pc.style.strokeDashoffset = 0;
      if (statusEl) { statusEl.textContent = '✓ Quantum signature generated'; statusEl.className = 'login-status success'; }
      Face.stop();
      if (scanner) { scanner.classList.remove('camera-active', 'scanning'); scanner.classList.add('success'); }
      state = 'verifying';

      // Build the 1024-byte quantum seed from biometric entropy + random
      quantumSeed = new Uint8Array(1024);
      // First 64 bytes: biometric hash
      quantumSeed.set(biometricEntropy, 0);
      // Rest 960 bytes: random (ensures uniqueness per session)
      quantumSeed.set(SafeRandom.bytes(960), 64);

      Crypto.zeroize(biometricEntropy);

      // Biometric hash for verification (deterministic)
      const biometricHash = Crypto.hexEnc(SHA3.hash512(quantumSeed.slice(0, 64)));

      // ============ STEP 2: PASSWORD ============
      const meta = AuthMeta.get();
      let password;

      if (!meta) {
        // ============ FIRST TIME ============
        password = await SetPassword.prompt();
        if (!password) throw new Error('Password required');

        // Generate salt for KDF
        const salt = SafeRandom.bytes(32);

        // Derive master key via Quantum KDF
        const masterKey = await KDF.deriveQuantum(password, salt, quantumSeed);
        Vault.setMasterKey(masterKey);

        // Store auth metadata
        const pwdSalt = SafeRandom.bytes(32);
        const pwdHash = await Crypto.pbkdf2(password, pwdSalt, 600000, 256);
        // Store quantum seed (encrypted with password-derived key for consistency across sessions)
        const seedKey = await Crypto.pbkdf2(password, salt, 600000, 256);
        const { iv: seedIv, ciphertext: seedCt } = await Crypto.aesEncrypt(seedKey, quantumSeed);
        Crypto.zeroize(seedKey);

        AuthMeta.set({
          salt: Crypto.b64enc(salt),
          pwdSalt: Crypto.b64enc(pwdSalt),
          pwdHash: Crypto.hexEnc(pwdHash),
          quantumSeedIv: Crypto.b64enc(seedIv),
          quantumSeedCt: Crypto.b64enc(seedCt),
          biometricHash,
          version: '1.0',
          createdAt: Date.now()
        });

        Audit.log('Quantum vault created', 'success');
        UI.toast('✓ Quantum vault created', 'success');
      } else {
        // ============ RETURNING USER ============
        password = await ExistingPassword.prompt();
        if (!password) throw new Error('Password required');

        // Verify password against stored hash
        const pwdSalt = Crypto.b64dec(meta.pwdSalt);
        const derivedHash = await Crypto.pbkdf2(password, pwdSalt, 600000, 256);
        const expectedHash = Crypto.hexDec(meta.pwdHash);
        const pwOk = Crypto.timingSafeEqual(derivedHash, expectedHash);
        Crypto.zeroize(derivedHash);
        if (!pwOk) {
          await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
          throw new Error('Invalid password');
        }

        // Load stored quantum seed (deterministic across sessions)
        const salt = Crypto.b64dec(meta.salt);
        const seedKey = await Crypto.pbkdf2(password, salt, 600000, 256);
        let storedSeed;
        try {
          const seedPt = await Crypto.aesDecrypt(seedKey,
            Crypto.b64dec(meta.quantumSeedIv),
            Crypto.b64dec(meta.quantumSeedCt));
          storedSeed = seedPt;
          Crypto.zeroize(seedPt);
        } catch (e) {
          Crypto.zeroize(seedKey);
          throw new Error('Cannot decrypt quantum seed — wrong password');
        }
        Crypto.zeroize(seedKey);

        // Derive master key using STORED quantum seed (deterministic!)
        const masterKey = await KDF.deriveQuantum(password, salt, storedSeed);
        Vault.setMasterKey(masterKey);

        Crypto.zeroize(storedSeed);
      }

      Crypto.zeroize(quantumSeed);
      quantumSeed = null;

      // ============ STEP 3: LOAD DATA ============
      await Profile.load();
      await Settings.load();
      await Wallets.init();
      await Wallets.render();
      Send.renderCoinSelector();
      Swap.render();
      History.render();
      Hardware.render();

      await new Promise(r => setTimeout(r, 500));
      const ls = document.getElementById('login-screen');
      if (ls) ls.style.display = 'none';
      if (app) app.classList.add('visible');
      if (ph) ph.classList.add('visible');
      if (hu) hu.classList.add('visible');

      Vault.setLoggedIn(true);
      state = 'idle';
      Audit.log('Quantum system ready', 'info');
      UI.toast('👋 Welcome to Sovereign Quantum Vault', 'success');
    } catch (e) {
      state = 'error';
      Face.stop();
      if (scanner) { scanner.classList.remove('scanning', 'camera-active'); scanner.classList.add('error'); }
      if (quantumSeed) { Crypto.zeroize(quantumSeed); quantumSeed = null; }
      if (statusEl) { statusEl.textContent = '✗ ' + (e.message || 'Verification failed'); statusEl.className = 'login-status error'; }
      UI.toast('❌ ' + e.message, 'error');
      setTimeout(() => {
        if (scanner) scanner.classList.remove('error', 'disabled');
        if (statusEl) { statusEl.textContent = 'Tap the circle to begin'; statusEl.className = 'login-status'; }
        state = 'idle';
      }, 3500);
    } finally {
      mutex = false;
    }
  }

  return { start };
})();

/* ============================================================================
   EVENT BINDING
   ============================================================================ */
function bindEvents() {
  try {
    const scanner = document.getElementById('face-scanner');
    if (scanner) {
      const start = () => { try { LoginFlow.start(); } catch (e) { console.error(e); } };
      scanner.addEventListener('click', start);
      scanner.addEventListener('touchend', (e) => { e.preventDefault(); start(); }, { passive: false });
      scanner.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(); }
      });
    }
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.addEventListener('click', () => UI.switchTab(b.dataset.tab));
    });
    const btnSettings = document.getElementById('btn-settings');
    if (btnSettings) btnSettings.addEventListener('click', () => UI.switchTab('security'));
    const btnProfile = document.getElementById('btn-profile');
    if (btnProfile) btnProfile.addEventListener('click', () => Profile.edit());
    const btnAdd = document.getElementById('btn-add-coin');
    if (btnAdd) btnAdd.addEventListener('click', () => Wallets.openAddCoin());
    const swapFrom = document.getElementById('swap-from-amount');
    if (swapFrom) swapFrom.addEventListener('input', () => Swap.calculate());
    const btnSwap = document.getElementById('btn-swap-execute');
    if (btnSwap) {
      btnSwap.addEventListener('click', async () => {
        if (btnSwap.classList.contains('loading')) return;
        btnSwap.disabled = true; btnSwap.classList.add('loading');
        try { await Swap.execute(); }
        finally { btnSwap.disabled = false; btnSwap.classList.remove('loading'); }
      });
    }
    const btnSwapFromPicker = document.getElementById('btn-swap-from-picker');
    if (btnSwapFromPicker) btnSwapFromPicker.addEventListener('click', () => Swap.openPicker('from'));
    const btnSwapToPicker = document.getElementById('btn-swap-to-picker');
    if (btnSwapToPicker) btnSwapToPicker.addEventListener('click', () => Swap.openPicker('to'));
    const btnSwapFlip = document.getElementById('btn-swap-flip');
    if (btnSwapFlip) btnSwapFlip.addEventListener('click', () => Swap.flip());
    document.querySelectorAll('.swap-preset').forEach(b => {
      b.addEventListener('click', () => Swap.setPercent(parseInt(b.dataset.pct, 10)));
    });
    const ps = document.getElementById('picker-search-input');
    if (ps) ps.addEventListener('input', function () { Swap.renderPicker(this.value); });
    const cs = document.getElementById('coin-search-input');
    if (cs) cs.addEventListener('input', function () { Wallets.renderGrid(this.value); });
    const btnSend = document.getElementById('btn-send');
    if (btnSend) {
      btnSend.addEventListener('click', async () => {
        if (btnSend.classList.contains('loading')) return;
        btnSend.disabled = true; btnSend.classList.add('loading');
        try { await Send.execute(); }
        finally { btnSend.disabled = false; btnSend.classList.remove('loading'); }
      });
    }
    const btnLock = document.getElementById('btn-lock');
    if (btnLock) btnLock.addEventListener('click', () => Vault.lock());
    const btnHw = document.getElementById('btn-connect-hw');
    if (btnHw) btnHw.addEventListener('click', () => Hardware.connect());
    document.querySelectorAll('.tx-filter').forEach(f => {
      f.addEventListener('click', () => History.setFilter(f.dataset.filter));
    });
    const btnExport = document.getElementById('btn-export');
    if (btnExport) btnExport.addEventListener('click', () => History.exportCSV());
    document.querySelectorAll('.setting-toggle').forEach(t => {
      t.addEventListener('click', () => Settings.toggle(t.dataset.setting));
    });
    const btnWipe = document.getElementById('btn-wipe');
    if (btnWipe) btnWipe.addEventListener('click', () => Settings.wipeAllData());
    document.querySelectorAll('.modal').forEach(m => {
      let mdt = null;
      m.addEventListener('mousedown', e => { mdt = e.target; });
      m.addEventListener('click', e => {
        if (e.target === m && mdt === m) UI.closeModal(m.id);
      });
    });
    document.querySelectorAll('[data-close]').forEach(b => {
      b.addEventListener('click', () => UI.closeModal(b.dataset.close));
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const a = document.querySelector('.modal.active');
        if (a && a.id !== 'modal-set-password' && a.id !== 'modal-existing-password' && a.id !== 'modal-migration') {
          UI.closeModal(a.id);
        }
      }
    });
    const btnWalletSend = document.getElementById('btn-wallet-send');
    if (btnWalletSend) btnWalletSend.addEventListener('click', () => Wallets.openSendForCurrent());
    const btnWalletReceive = document.getElementById('btn-wallet-receive');
    if (btnWalletReceive) btnWalletReceive.addEventListener('click', () => Wallets.openReceiveForCurrent());
    const btnWalletNew = document.getElementById('btn-wallet-new-account');
    if (btnWalletNew) btnWalletNew.addEventListener('click', () => Wallets.createNewAccount());
    const btnQrDownload = document.getElementById('btn-qr-download');
    if (btnQrDownload) btnQrDownload.addEventListener('click', () => QR.download());
    const btnCopyAddr = document.getElementById('btn-copy-address');
    if (btnCopyAddr) btnCopyAddr.addEventListener('click', () => Wallets.copyCurrentAddress());
    const btn2fa = document.getElementById('btn-2fa-verify');
    if (btn2fa) btn2fa.addEventListener('click', () => TwoFA.verify());
    const btn2faCancel = document.getElementById('btn-2fa-cancel');
    if (btn2faCancel) btn2faCancel.addEventListener('click', () => TwoFA.cancel());
    const btnTriple = document.getElementById('btn-triple-auth-step1');
    if (btnTriple) btnTriple.addEventListener('click', () => TripleAuth.verifyPassword());
    const inpReveal = document.getElementById('confirm-reveal-input');
    const btnReveal = document.getElementById('btn-confirm-reveal');
    if (inpReveal && btnReveal) {
      inpReveal.addEventListener('input', () => {
        btnReveal.disabled = inpReveal.value.trim().toUpperCase() !== 'REVEAL';
      });
      btnReveal.addEventListener('click', () => TripleAuth.confirm());
    }
    const btnSetPwd = document.getElementById('btn-set-password');
    if (btnSetPwd) btnSetPwd.addEventListener('click', () => SetPassword.submit());
    const btnExistingPwd = document.getElementById('btn-existing-password');
    if (btnExistingPwd) btnExistingPwd.addEventListener('click', () => ExistingPassword.submit());
    const existingInput = document.getElementById('existing-password-input');
    if (existingInput) {
      existingInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') ExistingPassword.submit();
      });
    }
    let at = null;
    const resetAutoLock = () => {
      if (!Vault.getMasterKey()) return;
      if (at) return;
      at = setTimeout(() => { Vault.armAutoLock(); at = null; }, 500);
    };
    ['mousemove', 'keypress', 'touchstart', 'click', 'scroll'].forEach(ev => {
      document.addEventListener(ev, resetAutoLock, { passive: true });
    });
    window.addEventListener('beforeunload', () => {
      const key = Vault.getMasterKey();
      if (key) Crypto.zeroize(key);
    });
  } catch (e) {
    console.error('[COFC] Event binding error:', e);
  }
}

/* ============================================================================
   BOOTSTRAP
   ============================================================================ */
function hideLoader() {
  const overlay = document.getElementById('loading-overlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
  setTimeout(() => { overlay.style.display = 'none'; }, 500);
}

async function bootstrap() {
  const safety = setTimeout(hideLoader, 5000);
  const fill = document.getElementById('loading-bar-fill');
  const status = document.getElementById('loading-status');
  const steps = [
    { pct: 15, msg: 'Initializing WebCrypto...' },
    { pct: 30, msg: 'Compiling SHA3-256 + SHA3-512...' },
    { pct: 45, msg: 'Loading Quantum Signature engine...' },
    { pct: 60, msg: 'Initializing Φ Distribution...' },
    { pct: 75, msg: 'Loading Quantum KDF...' },
    { pct: 90, msg: 'Ready' },
    { pct: 100, msg: 'Quantum Core Ready ✓' }
  ];
  let idx = 0;
  const iv = setInterval(() => {
    if (idx >= steps.length) {
      clearInterval(iv);
      clearTimeout(safety);
      hideLoader();
      return;
    }
    const s = steps[idx];
    if (fill) fill.style.width = s.pct + '%';
    if (status) status.textContent = s.msg;
    idx++;
  }, 180);
  try { await Face.init(); } catch (e) { console.warn('[COFC] Face init:', e); }
  bindEvents();
  window.CofcGate = {
    Vault, Wallets, Swap, Send, History, Settings, Profile, LoginFlow,
    Hardware, Face, TwoFA, TripleAuth, UI, Audit, QR, Money, Crypto,
    SHA3, QuantumSignature, KDF, PhiDistribution, Storage, AuthMeta,
    SetPassword, ExistingPassword, safeJSONParse, SOVEREIGN, SafeRandom
  };
  console.log('[COFC] v1.0 SOVEREIGN QUANTUM ready');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
     }
