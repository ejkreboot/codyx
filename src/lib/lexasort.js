class LexaOrderKey {
  static DEFAULT_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'; 

  constructor(alphabet = LexaOrderKey.DEFAULT_ALPHABET) {
    const uniq = new Set(alphabet);
    if (!alphabet || uniq.size !== alphabet.length) {
      throw new Error('Alphabet must contain unique, non-empty characters');
    }
    this.alphabet = alphabet;
    this.base = alphabet.length;
    this._idx = new Map([...alphabet].map((ch, i) => [ch, i]));
  }

  _getCharIndex(ch) { 
    return this._idx.get(ch) ?? -1; 
  }

  _isValidKey(key) { 
    return typeof key === 'string' && [...key].every(ch => this._getCharIndex(ch) !== -1); 
  }

  first() { 
    return this.alphabet[0]; 
  }

  mid() { 
    return this.alphabet[Math.floor(this.base / 2)]; 
  }

  last() { 
    return this.alphabet[this.base - 1]; 
  }

  between(before, after) {
    const L = before ?? '';
    const U = after ?? '';

    if (before != null && !this._isValidKey(L)) {
      throw new Error(`Invalid before key: ${before}`);
    }
    if (after != null && !this._isValidKey(U)) {
      throw new Error(`Invalid after key: ${after}`);
    }
    if (L && U && L >= U) {
      throw new Error(`Before key must be < after key: ${before} >= ${after}`);
    }

    let pos = 0, out = '';
    
    while (true) {
      const lv = pos < L.length ? this._getCharIndex(L[pos]) : -1;
      const uv = pos < U.length ? this._getCharIndex(U[pos]) : this.base;
      
      if (lv + 1 < uv) {
        return out + this.alphabet[Math.floor((lv + uv) / 2)];
      }
      
      if (lv + 1 === uv && lv === -1 && uv === 0) {
        throw new Error(`No lexicographic space between "${before}" and "${after}"`);
      }
      
      out += lv === -1 ? this.alphabet[0] : L[pos];
      pos++;
    }
  }
   
  generateKeys(before, after, count) {
    if (!Number.isInteger(count) || count < 1) {
      throw new Error('Count must be a positive integer');
    }
    if (count === 1) return [this.between(before, after)];
    
    const keys = [];
    let cur = before;
    for (let i = 0; i < count; i++) {
      const k = this.between(cur, after);
      keys.push(k);
      cur = k;
    }
    return keys;
  }

  static sortByOrderKey(items, keyProperty = 'orderKey') {
    return [...items].sort((x, y) => 
      (x[keyProperty] ?? '').localeCompare(y[keyProperty] ?? '', 'en')
    );
  }
}

const LexaKey = new LexaOrderKey();

export { LexaOrderKey, LexaKey };