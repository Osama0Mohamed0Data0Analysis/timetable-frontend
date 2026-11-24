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

function getVal(row, keys) {
  if (!row || typeof row !== 'object') return '';
  const objKeys = Object.keys(row);
  for (const pk of keys) {
    const npk = normAr(pk);
    for (const k of objKeys) {
      if (normAr(k) === npk) {
        const v = row[k];
        if (v !== undefined && v !== null && String(v).trim() !== '' && String(v).trim() !== 'NaN') {
          return String(v).trim();
        }
      }
    }
  }
  for (const pk of keys) {
    const npk = normAr(pk);
    if (!npk) continue;
    for (const k of objKeys) {
      const nk = normAr(k);
      if (nk.includes(npk)) {
        if (npk.includes('ماده') && nk.includes('كود')) continue;
        const v = row[k];
        if (v !== undefined && v !== null && String(v).trim() !== '' && String(v).trim() !== 'NaN') {
          return String(v).trim();
        }
      }
    }
  }
  return '';
}

function flexToken(w) {
  let s = normAr(w).replace(/[^\p{L}\p{N}_-]+/gu, '');
  if (s.length > 3 && s.startsWith('ال')) s = s.slice(2);
  if (s.endsWith('ات') && s.length > 4) s = s.slice(0, -2);
  else if (s.endsWith('ين') && s.length > 4) s = s.slice(0, -2);
  else if (s.endsWith('ون') && s.length > 4) s = s.slice(0, -2);
  return s;
}

export class SheetChatBot {
  constructor(api) {
    this.api = api;
    this.isOpen = false;
    this.syncing = false;
    this.messages = [
      {
        role: 'bot',
        text: 'اسألني عن أعضاء هيئة التدريس، الأقسام والشعب، المواد، القاعات والسعات، الفترات، قواعد الكلية، أو ملاحظات المراجعة.',
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

  readData() {
    const raw = localStorage.getItem(CACHE_DATA_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async syncData(force = false) {
    if (this.syncing) return this.readData() || {};
    const cached = this.readData();
    const t = Number(localStorage.getItem(CACHE_TIME_KEY) || 0);
    if (!force && cached && (Date.now() - t < CACHE_TTL_MS)) return cached;

    this.syncing = true;
    try {
      if (this.api && typeof this.api.getData === 'function') {
        const fresh = await this.api.getData();
        if (fresh) {
          localStorage.setItem(CACHE_DATA_KEY, JSON.stringify(fresh));
          localStorage.setItem(CACHE_TIME_KEY, String(Date.now()));
          return fresh;
        }
      }
    } catch (e) {
      console.error('SheetChatBot sync error:', e);
    } finally {
      this.syncing = false;
    }
    return cached || {};
  }

  answerQuery(rawQuery) {
    const cleanQ = String(rawQuery || '').trim();
    if (!cleanQ) return 'اكتب سؤالك.';

    const data = this.readData();
    if (!data) {
      return 'لا توجد بيانات محمّلة بعد. اضغط على «تحديث».';
    }

    const q = normAr(cleanQ);
    const isCount = /كم|عدد|اجمالي|إجمالي|مجموع/i.test(q);

    const courses = pickArray(data, ['courses', 'subjects', 'materials', 'المواد', 'المواد الدراسية']);
    const faculty = pickArray(data, ['instructors', 'faculty', 'doctors', 'أعضاء هيئة التدريس']);
    const rooms = pickArray(data, ['rooms', 'halls', 'القاعات', 'المدرجات والقاعات']);
    const groups = pickArray(data, ['groups', 'الفرق والمجموعات']);
    const periods = pickArray(data, ['periods', 'timeSlots', 'الفترات الزمنية', 'الفترات']);
    const rules = pickArray(data, ['rules', 'collegeRules', 'قواعد الكلية']);
    const notes = pickArray(data, ['notes', 'reviewNotes', 'ملاحظات المراجعة', 'ملاحظات']);
    const schedules = Array.isArray(data) ? data : pickArray(data, ['schedules', 'schedule', 'الجداول']);

    // 1) أعضاء هيئة التدريس / الدكاترة / المعيدين
    if (/هيئه|تدريس|دكتور|دكاتر|معيد|معيدي|اعضاء/i.test(q)) {
      if (!faculty.length) return 'لا توجد بيانات لأعضاء هيئة التدريس في الشيت الحالي.';
      const roleWords = new Set(['اعضاء', 'هيئه', 'تدريس', 'دكتور', 'دكاتره', 'معيد', 'معيدين', 'كم', 'عدد', 'مين', 'من', 'اسماء', 'قائمه', 'قائمة']);
      const extraTokens = q.split(/[\s،,؟?!:؛()\[\]"'\/\\-]+/)
        .map(flexToken)
        .filter(t => t && t.length >= 2 && !roleWords.has(t));

      const filtered = extraTokens.length
        ? faculty.filter(f => {
            const txt = normAr(Object.values(f).join(' '));
            return extraTokens.some(t => txt.includes(t));
          })
        : faculty;

      const list = filtered.length ? filtered : faculty;
      const head = isCount || !extraTokens.length ? [`• العدد: ${list.length}`] : [];
      return head.concat(list.slice(0, 12).map(f => {
        const name = getVal(f, ['اسم الدكتور / المعيد *', 'اسم الدكتور / المعيد', 'name']) || 'عضو';
        const role = getVal(f, ['الدرجة الوظيفية *', 'الدرجة الوظيفية', 'role']);
        const dept = getVal(f, ['القسم *', 'القسم', 'department']);
        const note = getVal(f, ['ملاحظات', 'notes']);
        return `• ${name}${role ? ` — ${role}` : ''}${dept ? `، ${dept}` : ''}${note ? ` (${note})` : ''}`;
      })).join('\n');
    }

    // 2) الأقسام / الشعب / البرامج (بدون تكرار)
    if (/قسم|اقسام|شعب|شعبه|برنامج|برامج/i.test(q)) {
      const uniqueMap = new Map();
      const addDept = raw => {
        const clean = String(raw || '').trim();
        if (!clean || clean === 'NaN') return;
        const key = normAr(clean);
        if (!uniqueMap.has(key)) uniqueMap.set(key, clean);
      };

      courses.forEach(r => addDept(getVal(r, ['الشعبة / القسم', 'القسم', 'department'])));
      groups.forEach(r => addDept(getVal(r, ['البرنامج / الشعبة', 'الشعبة', 'القسم', 'department'])));
      faculty.forEach(r => addDept(getVal(r, ['القسم *', 'القسم', 'department'])));

      const list = [...uniqueMap.values()].sort((a, b) => a.localeCompare(b, 'ar'));
      if (!list.length) return 'لا توجد أقسام أو شعب مسجلة.';

      const head = isCount ? [`• العدد: ${list.length}`] : [];
      return head.concat(list.map(d => {
        const nDept = normAr(d);
        const cCount = courses.filter(c => normAr(getVal(c, ['الشعبة / القسم', 'القسم', 'department'])) === nDept).length;
        const fCount = faculty.filter(f => normAr(getVal(f, ['القسم *', 'القسم', 'department'])) === nDept).length;
        const info = [];
        if (cCount) info.push(`${cCount} مادة`);
        if (fCount) info.push(`${fCount} عضو هيئة تدريس`);
        return `• ${d}${info.length ? ` (${info.join('، ')})` : ''}`;
      })).join('\n');
    }

    // 3) القاعات / المدرجات / المعامل / السعات
    if (/قاع|مدرج|معمل|مبن|دور|سع/i.test(q)) {
      if (!rooms.length) return 'لا توجد قاعات مسجلة.';
      const capTotal = rooms.reduce((s, r) => s + toNum(getVal(r, ['* السعة (عدد الطلاب)', 'السعة (عدد الطلاب)', 'السعة', 'capacity'])), 0);
      const filtered = rooms.filter(r => {
        const txt = normAr(Object.values(r).join(' '));
        return txt.includes(q) || /قاع|مدرج|معمل|سع/i.test(q);
      });
      const target = filtered.length ? filtered : rooms;
      const head = isCount || /سع|اجمالي|إجمالي/i.test(q)
        ? [`• العدد: ${target.length} | إجمالي السعة: ${capTotal.toLocaleString('en-US')} طالب`]
        : [];
      return head.concat(target.slice(0, 10).map(r => {
        const num = getVal(r, ['رقم القاعة', 'اسم القاعة', 'hall', 'room']) || '-';
        const typ = getVal(r, ['* النوع', 'النوع', 'type']) || 'قاعة';
        const cap = getVal(r, ['* السعة (عدد الطلاب)', 'السعة (عدد الطلاب)', 'السعة', 'capacity']);
        const bld = getVal(r, ['* المبنى', 'المبنى', 'building']);
        const flr = getVal(r, ['* الدور', 'الدور', 'floor']);
        return `• ${typ} ${num}${cap ? ` — سعة ${cap} طالب` : ''}${[bld, flr].filter(Boolean).length ? ` (${[bld, flr].filter(Boolean).join('، ')})` : ''}`;
      })).join('\n');
    }

    // 4) قواعد الكلية
    if (/قاعد|قواعد|عام اكاديمي|فصل دراسي/i.test(q)) {
      if (!rules.length) return 'لا توجد قواعد مسجلة.';
      return rules.slice(0, 12).map(r => {
        const b = getVal(r, ['البند', 'item', 'title']) || 'بند';
        const v = getVal(r, ['القيمة', 'value', 'desc']) || '-';
        return `• ${b}: ${v}`;
      }).join('\n');
    }

    // 5) ملاحظات المراجعة
    if (/ملاحظ|مراجع|تنبيه/i.test(q)) {
      if (!notes.length) return 'لا توجد ملاحظات مراجعة مسجلة.';
      return notes.slice(0, 12).map(n => {
        const t = getVal(n, ['الموضوع', 'topic', 'title']) || 'ملاحظة';
        const d = getVal(n, ['التفاصيل', 'details', 'note']) || '';
        return `• ${t}${d ? `: ${d}` : ''}`;
      }).join('\n');
    }

    // 6) الفترات الزمنية
    if (/فتر|وقت|مواعيد/i.test(q)) {
      if (!periods.length) return 'لا توجد فترات زمنية مسجلة.';
      return periods.slice(0, 12).map(p => {
        const day = getVal(p, ['أيام الدراسة *', 'أيام الدراسة', 'اليوم', 'day']);
        const num = getVal(p, ['رقم الفترة *', 'رقم الفترة', 'period']);
        const st = getVal(p, ['بداية الفترة *', 'بداية الفترة', 'start']);
        const en = getVal(p, ['نهاية الفترة *', 'نهاية الفترة', 'end']);
        return `• ${[day, num ? `فترة ${num}` : '', (st || en) ? `${st} - ${en}` : ''].filter(Boolean).join(' | ')}`;
      }).join('\n');
    }

    // 7) بحث عام في المواد والجدول والمجموعات
    const tokens = q.split(/[\s،,؟?!:؛()\[\]"'\/\\-]+/)
      .map(flexToken)
      .filter(t => t && (t.length >= 2 || /^\d+$/.test(t)));

    const allItems = [
      ...courses.map(r => ({ kind: 'course', r })),
      ...faculty.map(r => ({ kind: 'faculty', r })),
      ...groups.map(r => ({ kind: 'group', r })),
      ...schedules.map(r => ({ kind: 'schedule', r })),
    ];

    const hits = allItems
      .map(entry => {
        const txt = normAr(Object.values(entry.r).filter(v => v !== undefined && v !== null).join(' '));
        let score = 0;
        if (q.length >= 2 && txt.includes(q)) score += 10;
        for (const t of tokens) {
          if (txt.includes(t)) score += 3;
        }
        return { ...entry, score };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    if (!hits.length) {
      return 'لا توجد نتائج مطابقة لسؤالك.';
    }

    return hits.map(h => {
      const r = h.r;
      if (h.kind === 'course') {
        const subj = getVal(r, ['اسم المادة *', 'اسم المادة', 'subject']) || 'مادة';
        const yr = getVal(r, ['الفرقة *', 'الفرقة', 'yearLevel']);
        const dept = getVal(r, ['الشعبة / القسم', 'القسم *', 'القسم', 'department']);
        const doc = getVal(r, ['د. المحاضرة *', 'د. المحاضرة', 'doctor']);
        const ast = getVal(r, ['المعيدين / السكاشن', 'assistant']);
        return `• ${subj}${[yr, dept].filter(Boolean).length ? ` (${[yr, dept].filter(Boolean).join(' - ')})` : ''}${doc ? ` | د. ${doc}` : ''}${ast ? ` | معيد: ${ast}` : ''}`;
      }
      if (h.kind === 'faculty') {
        const name = getVal(r, ['اسم الدكتور / المعيد *', 'اسم الدكتور / المعيد', 'name']) || 'عضو';
        const role = getVal(r, ['الدرجة الوظيفية *', 'الدرجة الوظيفية', 'role']);
        const dept = getVal(r, ['القسم *', 'القسم', 'department']);
        const note = getVal(r, ['ملاحظات', 'notes']);
        return `• ${name}${role ? ` (${role})` : ''}${dept ? ` - ${dept}` : ''}${note ? ` | ${note}` : ''}`;
      }
      const vals = Object.keys(r)
        .filter(k => !String(k).startsWith('Unnamed') && r[k] !== undefined && r[k] !== null && String(r[k]).trim() !== '' && String(r[k]).trim() !== 'NaN')
        .slice(0, 5)
        .map(k => String(r[k]).trim());
      return `• ${vals.join(' | ')}`;
    }).join('\n');
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
          <button class="scb-qbtn" data-q="أعضاء هيئة التدريس" type="button">هيئة التدريس</button>
          <button class="scb-qbtn" data-q="الأقسام" type="button">الأقسام</button>
          <button class="scb-qbtn" data-q="قواعد الكلية" type="button">قواعد الكلية</button>
          <button class="scb-qbtn" data-q="ملاحظات المراجعة" type="button">ملاحظات المراجعة</button>
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

    const ask = async text => {
      const clean = String(text || '').trim();
      if (!clean) return;
      this.messages.push({ role: 'user', text: clean });
      if (!this.readData()) {
        await this.syncData(false);
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
          this.syncData(false);
          if (input) input.focus();
        }
      };
    }

    if (syncBtn) {
      syncBtn.onclick = async () => {
        syncBtn.textContent = '...';
        await this.syncData(true);
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

    renderMessages();
  }
}
