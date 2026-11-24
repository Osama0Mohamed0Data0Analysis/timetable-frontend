const CACHE_DATA_KEY = 'sheet_cache_data';
const CACHE_TIME_KEY = 'sheet_cache_time';
const CACHE_TTL_MS = 600000;

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normAr(s) {
  return String(s ?? '')
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function toNum(v) {
  if (v === undefined || v === null) return 0;
  const n = parseFloat(normAr(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function stemToken(w) {
  let s = normAr(w).replace(/[^\p{L}\p{N}_-]+/gu, '');
  if (s.length > 3 && s.startsWith('ال')) s = s.slice(2);
  if (s.length > 4 && (s.startsWith('لل') || s.startsWith('بال') || s.startsWith('كال'))) {
    s = s.slice(3);
  }
  return s;
}

function getField(map, keys) {
  const mapKeys = Object.keys(map);
  for (const k of keys) {
    const nk = normAr(k);
    if (map[nk]) return map[nk];
  }
  for (const k of keys) {
    const nk = normAr(k);
    if (!nk) continue;
    for (const mk of mapKeys) {
      if (mk.includes(nk)) {
        if (nk.includes('ماده') && mk.includes('كود')) continue;
        return map[mk];
      }
    }
  }
  return '';
}

function pickArray(data, keys) {
  if (!data || typeof data !== 'object') return [];
  for (const k of keys) {
    if (Array.isArray(data[k])) return data[k];
  }
  if (data.data && typeof data.data === 'object') {
    for (const k of keys) {
      if (Array.isArray(data.data[k])) return data.data[k];
    }
  }
  return [];
}

function formatRowAnswer(row, map) {
  const subj = getField(map, ['اسم المادة', 'subject']);
  if (subj) {
    const code = getField(map, ['كود المادة', 'code']);
    const year = getField(map, ['الفرقة', 'yearLevel']);
    const dept = getField(map, ['الشعبة / القسم', 'القسم', 'department']);
    const sem = getField(map, ['الفصل الدراسي', 'semester']);
    const lec = getField(map, ['ساعات المحاضرة أسبوعياً', 'ساعات المحاضرة']);
    const sec = getField(map, ['ساعات السكشن أسبوعياً', 'ساعات السكاشن']);
    const doc = getField(map, ['د. المحاضرة', 'doctor']);
    const ast = getField(map, ['المعيدين / السكاشن', 'assistant']);
    const hall = getField(map, ['القاعة', 'رقم القاعة', 'اسم القاعة', 'hall', 'room']);

    const parts = ['• ' + subj + (code ? ' (' + code + ')' : '')];
    const scope = [year, dept, sem ? 'الفصل ' + sem : ''].filter(Boolean).join('، ');
    if (scope) parts.push(scope);
    const hrs = [];
    if (lec) hrs.push('محاضرة: ' + lec + 'س');
    if (sec) hrs.push('سكشن: ' + sec + 'س');
    if (hrs.length) parts.push(hrs.join('، '));
    if (doc) parts.push('د. ' + doc);
    if (ast) parts.push('معيد: ' + ast);
    if (hall) parts.push('قاعة: ' + hall);
    return parts.join(' | ');
  }

  const person = getField(map, ['اسم الدكتور / المعيد', 'name']);
  if (person) {
    const role = getField(map, ['الدرجة الوظيفية', 'role']);
    const pDept = getField(map, ['القسم', 'department']);
    const note = getField(map, ['ملاحظات', 'notes']);
    return '• ' + person +
      (role ? ' — ' + role : '') +
      (pDept ? '، ' + pDept : '') +
      (note ? ' (' + note + ')' : '');
  }

  const roomNum = getField(map, ['رقم القاعة', 'اسم القاعة', 'hall', 'room']);
  const roomType = getField(map, ['النوع', 'type']);
  if (roomNum || roomType) {
    const cap = getField(map, ['السعة (عدد الطلاب)', 'السعة', 'capacity']);
    const bldg = getField(map, ['المبنى', 'building']);
    const flr = getField(map, ['الدور', 'floor']);
    return '• ' + [roomType, roomNum].filter(Boolean).join(' ') +
      (cap ? ' — سعة ' + cap + ' طالب' : '') +
      ([bldg, flr].filter(Boolean).length ? ' (' + [bldg, flr].filter(Boolean).join('، ') + ')' : '');
  }

  const entries = Object.keys(row)
    .filter(k => !String(k).startsWith('Unnamed') && row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '')
    .slice(0, 5)
    .map(k => String(k).replace(/\s*\*\s*$/, '').trim() + ': ' + String(row[k]).trim());
  return '• ' + entries.join(' — ');
}

function buildSearchIndex(data) {
  const records = [];
  if (!data || typeof data !== 'object') return records;

  const root = Array.isArray(data) ? { schedules: data } : data;
  const arrays = [];

  for (const key of Object.keys(root)) {
    const val = root[key];
    if (Array.isArray(val)) {
      arrays.push(val);
    } else if (val && typeof val === 'object') {
      for (const subKey of Object.keys(val)) {
        if (Array.isArray(val[subKey])) arrays.push(val[subKey]);
      }
    }
  }

  for (const arr of arrays) {
    for (const row of arr) {
      if (!row || typeof row !== 'object') continue;
      const map = {};
      const chunks = [];
      let numSum = 0;

      for (const k of Object.keys(row)) {
        const cleanK = String(k || '').trim();
        const rawV = row[k];
        if (rawV === undefined || rawV === null) continue;
        const valStr = String(rawV).trim();
        if (!valStr || valStr === 'NaN' || valStr === 'null' || valStr === 'undefined') continue;

        map[normAr(cleanK)] = valStr;
        chunks.push(cleanK + ' ' + valStr);
        if (/سع|ساع|طلاب|عدد/i.test(cleanK)) {
          numSum += toNum(valStr);
        }
      }

      if (!chunks.length) continue;
      const fullText = normAr(chunks.join(' '));
      const stemmedText = fullText.split(/\s+/).map(stemToken).join(' ');
      records.push({
        row,
        map,
        fullText,
        stemmedText,
        numSum,
        formatted: formatRowAnswer(row, map),
      });
    }
  }

  return records;
}

export class SheetChatBot {
  constructor(api) {
    this.api = api;
    this.isOpen = false;
    this.index = [];
    this.lastDataRef = null;
    this.syncPromise = null;
    this.messages = [
      {
        role: 'bot',
        text: 'اسألني مباشرة عن أي مادة، دكتور أو معيد، قاعة، فرقة، قسم، فترة، أو قاعدة.',
      },
    ];
  }

  injectStyles() {
    if (document.getElementById('scb-styles')) return;
    const st = document.createElement('style');
    st.id = 'scb-styles';
    st.textContent = `
      .scb-fab{position:fixed;bottom:22px;left:22px;z-index:9999;background:#0f3566;color:#fff;border:2px solid #f59e0b;border-radius:999px;padding:12px 18px;font:inherit;font-weight:700;font-size:.9rem;cursor:pointer;box-shadow:0 8px 24px rgba(15,23,42,.22);display:flex;align-items:center;gap:8px}
      .scb-panel{position:fixed;bottom:78px;left:22px;z-index:9999;width:min(430px,calc(100vw - 32px));max-height:75vh;background:#fff;border:1.5px solid #cbd5e1;border-radius:14px;box-shadow:0 16px 36px rgba(15,23,42,.24);display:flex;flex-direction:column;overflow:hidden;direction:rtl;text-align:right}
      .scb-head{background:linear-gradient(135deg,#071b38 0%,#0f3566 100%);color:#fff;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;gap:8px}
      .scb-title{margin:0;font-size:.96rem;font-weight:800}
      .scb-hbtns{display:flex;gap:6px;align-items:center}
      .scb-hbtn{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:6px;padding:3px 9px;cursor:pointer;font:inherit;font-size:.76rem;font-weight:600}
      .scb-quick{display:flex;gap:6px;flex-wrap:wrap;padding:8px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0}
      .scb-qbtn{background:#eff6ff;color:#1e3a8a;border:1px solid #bfdbfe;border-radius:999px;padding:4px 10px;font:inherit;font-size:.75rem;font-weight:600;cursor:pointer}
      .scb-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px;background:#f1f5f9}
      .scb-msg{max-width:93%;padding:9px 12px;border-radius:10px;font-size:.84rem;line-height:1.58;white-space:pre-line}
      .scb-msg.bot{background:#fff;color:#0f172a;border:1px solid #dbe2ee;align-self:flex-start}
      .scb-msg.user{background:#1e3a8a;color:#fff;align-self:flex-end}
      .scb-form{display:flex;gap:8px;padding:10px;background:#fff;border-top:1px solid #e2e8f0}
      .scb-input{flex:1;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font:inherit;font-size:.86rem;color:#0f172a}
      .scb-send{background:#0f3566;color:#fff;border:none;border-radius:8px;padding:8px 14px;font:inherit;font-weight:700;cursor:pointer}
    `;
    document.head.appendChild(st);
  }

  readCachedData() {
    const raw = localStorage.getItem(CACHE_DATA_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  ensureIndex(data) {
    if (!data) return;
    if (data !== this.lastDataRef) {
      this.lastDataRef = data;
      this.index = buildSearchIndex(data);
    }
  }

  async fetchFullSheetData(force = false) {
    const cached = this.readCachedData();
    if (cached) this.ensureIndex(cached);

    const cachedTime = Number(localStorage.getItem(CACHE_TIME_KEY) || 0);
    const cacheValid = Boolean(cached) && (Date.now() - cachedTime < CACHE_TTL_MS);
    if (!force && cacheValid) return cached;

    if (this.syncPromise) return this.syncPromise;

    this.syncPromise = (async () => {
      try {
        let fresh = null;
        if (this.api && typeof this.api.getData === 'function') {
          fresh = await this.api.getData();
        } else if (this.api && typeof this.api.getSchedules === 'function') {
          const [schedules, instructors] = await Promise.all([
            this.api.getSchedules().catch(() => []),
            typeof this.api.getInstructors === 'function' ? this.api.getInstructors().catch(() => []) : [],
          ]);
          fresh = { schedules, instructors };
        }

        if (fresh) {
          localStorage.setItem(CACHE_DATA_KEY, JSON.stringify(fresh));
          localStorage.setItem(CACHE_TIME_KEY, String(Date.now()));
          this.ensureIndex(fresh);
          return fresh;
        }
      } catch (err) {
        console.error('SheetChatBot sync error:', err);
      } finally {
        this.syncPromise = null;
      }
      return cached || {};
    })();

    return this.syncPromise;
  }

  extractTerms(rawQuery) {
    const stop = new Set([
      'ما', 'ماذا', 'متي', 'اين', 'كيف', 'لماذا', 'هل', 'كم', 'من', 'في', 'عن', 'علي', 'الي',
      'ايه', 'اللي', 'التي', 'الذي', 'ده', 'دي', 'دول', 'كل', 'جميع', 'بيانات', 'معلومات',
      'داتا', 'شيت', 'جدول', 'لو', 'سمحت', 'عايز', 'اعرف', 'هات', 'قولي', 'قلي', 'ممكن', 'مين',
    ]);
    const out = new Set();
    for (const part of normAr(rawQuery).split(/[\s،,؟?!:؛()\[\]"'\/\\-]+/)) {
      if (!part || stop.has(part)) continue;
      if (part.length >= 2 || /^\d+$/.test(part)) out.add(part);
      const st = stemToken(part);
      if (st && (st.length >= 2 || /^\d+$/.test(st))) out.add(st);
    }
    return [...out];
  }

  answerQuery(rawQuery) {
    const cleanQ = String(rawQuery || '').trim();
    if (!cleanQ) return 'اكتب سؤالك.';

    const cached = this.readCachedData();
    if (cached) this.ensureIndex(cached);

    if (!this.index.length) {
      return 'لا توجد بيانات محمّلة بعد. اضغط على «تحديث» لسحب الداتا من Google Sheets.';
    }

    const qNorm = normAr(cleanQ);
    const terms = this.extractTerms(cleanQ);
    const searchTerms = terms.length ? terms : [qNorm];
    const isCount = /كم|عدد|اجمالي|إجمالي|مجموع/i.test(qNorm);

    if (isCount && searchTerms.length <= 2 && /ماد|مقرر/i.test(qNorm)) {
      const courses = pickArray(cached, ['courses', 'subjects', 'materials', 'المواد', 'المواد الدراسية']);
      const lecSum = courses.reduce((s, r) => s + toNum(r['ساعات المحاضرة أسبوعياً *'] ?? r['ساعات المحاضرة أسبوعياً'] ?? r['ساعات المحاضرة']), 0);
      const secSum = courses.reduce((s, r) => s + toNum(r['ساعات السكشن أسبوعياً'] ?? r['ساعات السكاشن']), 0);
      return `• عدد صفوف المواد: ${courses.length} | ساعات المحاضرات: ${lecSum}س | ساعات السكاشن: ${secSum}س`;
    }

    if (isCount && searchTerms.length <= 2 && /دكتور|معيد|هيئه|تدريس/i.test(qNorm)) {
      const faculty = pickArray(cached, ['instructors', 'faculty', 'doctors', 'أعضاء هيئة التدريس']);
      return `• عدد أعضاء هيئة التدريس والمعيدين: ${faculty.length}`;
    }

    if (isCount && searchTerms.length <= 2 && /قاع|مدرج|معمل|سع/i.test(qNorm)) {
      const rooms = pickArray(cached, ['rooms', 'halls', 'القاعات', 'المدرجات والقاعات']);
      const capSum = rooms.reduce((s, r) => s + toNum(r['* السعة (عدد الطلاب)'] ?? r['السعة (عدد الطلاب)'] ?? r['السعة'] ?? r.capacity), 0);
      return `• عدد القاعات والأماكن: ${rooms.length} | إجمالي السعة: ${capSum.toLocaleString('en-US')} طالب`;
    }

    const matches = [];
    for (const rec of this.index) {
      let score = 0;
      let hitCount = 0;

      if (qNorm.length >= 2 && rec.fullText.includes(qNorm)) {
        score += 12;
      }

      for (const t of searchTerms) {
        if (rec.fullText.includes(t)) {
          score += 4;
          hitCount += 1;
        } else if (rec.stemmedText.includes(t)) {
          score += 2.5;
          hitCount += 1;
        }
      }

      if (searchTerms.length > 1 && hitCount === searchTerms.length) {
        score += 6;
      }

      if (score > 0) {
        matches.push({ rec, score, hitCount });
      }
    }

    if (!matches.length) {
      return 'لا توجد نتائج مطابقة لسؤالك.';
    }

    matches.sort((a, b) => b.score - a.score || b.hitCount - a.hitCount);

    const lines = [];
    if (isCount) {
      const numTotal = matches.reduce((s, m) => s + m.rec.numSum, 0);
      lines.push(`• العدد: ${matches.length}${numTotal > 0 ? ` | الإجمالي الرقمي: ${numTotal.toLocaleString('en-US')}` : ''}`);
    }

    for (const m of matches.slice(0, 8)) {
      lines.push(m.rec.formatted);
    }

    return lines.join('\n');
  }

  mount(parentContainer) {
    this.injectStyles();
    if (document.getElementById('scbRoot')) return;

    const root = document.createElement('div');
    root.id = 'scbRoot';
    root.innerHTML = `
      <button id="scbFab" class="scb-fab" type="button">💬 شات بوت الجداول</button>
      <div id="scbPanel" class="scb-panel" style="display:none">
        <div class="scb-head">
          <h4 class="scb-title">مساعد الجداول الذكي</h4>
          <div class="scb-hbtns">
            <button id="scbSync" class="scb-hbtn" type="button">تحديث</button>
            <button id="scbClose" class="scb-hbtn" type="button">✕</button>
          </div>
        </div>
        <div class="scb-quick">
          <button class="scb-qbtn" data-q="قواعد الكلية" type="button">قواعد الكلية</button>
          <button class="scb-qbtn" data-q="ملاحظات المراجعة" type="button">ملاحظات المراجعة</button>
          <button class="scb-qbtn" data-q="الفترات الزمنية" type="button">الفترات الزمنية</button>
          <button class="scb-qbtn" data-q="المدرجات" type="button">المدرجات</button>
        </div>
        <div id="scbMsgs" class="scb-msgs"></div>
        <form id="scbForm" class="scb-form">
          <input id="scbInput" class="scb-input" type="text" placeholder="اكتب سؤالك..." autocomplete="off" />
          <button class="scb-send" type="submit">إرسال</button>
        </form>
      </div>
    `;

    (parentContainer || document.body).appendChild(root);

    const fab = document.getElementById('scbFab');
    const panel = document.getElementById('scbPanel');
    const syncBtn = document.getElementById('scbSync');
    const closeBtn = document.getElementById('scbClose');
    const form = document.getElementById('scbForm');
    const input = document.getElementById('scbInput');

    const renderMessages = () => {
      const box = document.getElementById('scbMsgs');
      if (!box) return;
      box.innerHTML = this.messages.map(m => `<div class="scb-msg ${esc(m.role)}">${esc(m.text)}</div>`).join('');
      box.scrollTop = box.scrollHeight;
    };

    const ask = async (text) => {
      const clean = String(text || '').trim();
      if (!clean) return;
      this.messages.push({ role: 'user', text: clean });

      if (!this.readCachedData()) {
        await this.fetchFullSheetData(false);
      }

      this.messages.push({ role: 'bot', text: this.answerQuery(clean) });
      renderMessages();
    };

    if (fab && panel) {
      fab.onclick = () => {
        this.isOpen = !this.isOpen;
        panel.style.display = this.isOpen ? 'flex' : 'none';
        if (this.isOpen) {
          renderMessages();
          this.fetchFullSheetData(false);
          if (input) input.focus();
        }
      };
    }

    if (syncBtn) {
      syncBtn.onclick = async () => {
        syncBtn.textContent = '...';
        await this.fetchFullSheetData(true);
        syncBtn.textContent = 'تحديث';
        const last = this.messages[this.messages.length - 1];
        if (!last || last.text !== '• تم تحديث البيانات.') {
          this.messages.push({ role: 'bot', text: '• تم تحديث البيانات.' });
          renderMessages();
        }
      };
    }

    if (closeBtn && panel) {
      closeBtn.onclick = () => {
        this.isOpen = false;
        panel.style.display = 'none';
      };
    }

    root.querySelectorAll('.scb-qbtn').forEach(btn => {
      btn.onclick = () => ask(btn.dataset.q || '');
    });

    if (form && input) {
      form.onsubmit = e => {
        e.preventDefault();
        const val = input.value;
        input.value = '';
        ask(val);
      };
    }

    const initialCache = this.readCachedData();
    if (initialCache) this.ensureIndex(initialCache);
    renderMessages();
  }
}
