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
    .replace(/[٠-٩]/g, function (d) { return String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)); })
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
  const cleaned = normAr(v).replace(/[^\d.-]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function stemWord(w) {
  let s = normAr(w).replace(/[^\p{L}\p{N}_-]+/gu, '');
  if (s.length > 3 && s.indexOf('ال') === 0) {
    s = s.slice(2);
  }
  if (s.length > 4 && (s.indexOf('لل') === 0 || s.indexOf('بال') === 0 || s.indexOf('كال') === 0)) {
    s = s.slice(3);
  }
  return s;
}

function extractQueryTerms(rawQuery) {
  const stop = new Set([
    'ما', 'ماذا', 'متي', 'اين', 'كيف', 'لماذا', 'هل', 'كم', 'من', 'في', 'عن', 'علي', 'الي',
    'بكام', 'ايه', 'اللي', 'التي', 'الذي', 'الذين', 'ده', 'دي', 'دول', 'كل', 'جميع', 'بيانات',
    'معلومات', 'داتا', 'شيت', 'جدول', 'لو', 'سمحت', 'عايز', 'اعرف', 'هات', 'قولي', 'قلي',
    'ممكن', 'بتاع', 'بتاعه', 'بتاعت', 'الخاصه', 'الخاص', 'المتعلقه', 'المتعلق', 'بخصوص', 'مين'
  ]);
  const parts = normAr(rawQuery).split(/[\s،,؟?!:؛()\[\]"'\/\\-]+/).filter(Boolean);
  const terms = new Set();
  parts.forEach(function (p) {
    if (stop.has(p)) return;
    if (p.length >= 2 || /^\d+$/.test(p)) terms.add(p);
    const st = stemWord(p);
    if (st && (st.length >= 2 || /^\d+$/.test(st))) terms.add(st);
  });
  return Array.from(terms);
}

function flattenSheetData(data) {
  const records = [];
  if (!data || typeof data !== 'object') return records;

  const sourcesToScan = [];
  const rootObj = Array.isArray(data) ? { schedules: data } : data;

  Object.keys(rootObj).forEach(function (key) {
    const val = rootObj[key];
    if (Array.isArray(val)) {
      sourcesToScan.push({ tab: key, rows: val });
    } else if (val && typeof val === 'object') {
      Object.keys(val).forEach(function (subKey) {
        if (Array.isArray(val[subKey])) {
          sourcesToScan.push({ tab: subKey, rows: val[subKey] });
        }
      });
    }
  });

  sourcesToScan.forEach(function (src) {
    const tabLabel = src.tab;
    src.rows.forEach(function (row, idx) {
      if (!row || typeof row !== 'object') return;
      const entries = [];
      const map = {};
      Object.keys(row).forEach(function (k) {
        const cleanKey = String(k || '').trim();
        const rawVal = row[k];
        if (rawVal === undefined || rawVal === null) return;
        const valStr = String(rawVal).trim();
        if (!valStr || valStr === 'NaN' || valStr === 'null' || valStr === 'undefined') return;
        entries.push({ key: cleanKey, value: valStr });
        map[normAr(cleanKey)] = valStr;
      });
      if (!entries.length) return;

      const fullText = normAr(
        tabLabel + ' ' + entries.map(function (e) { return e.key + ' ' + e.value; }).join(' ')
      );
      const stemmedText = normAr(
        fullText.split(/\s+/).map(stemWord).join(' ')
      );

      records.push({
        tab: tabLabel,
        rowIndex: idx + 1,
        entries: entries,
        map: map,
        fullText: fullText,
        stemmedText: stemmedText
      });
    });
  });

  return records;
}

function pickField(rec, keys) {
  const entryKeys = Object.keys(rec.map);
  for (let i = 0; i < keys.length; i++) {
    const nk = normAr(keys[i]);
    if (rec.map[nk]) return rec.map[nk];
  }
  for (let i = 0; i < keys.length; i++) {
    const nk = normAr(keys[i]);
    for (let j = 0; j < entryKeys.length; j++) {
      const ek = entryKeys[j];
      if (ek.indexOf(nk) !== -1) return rec.map[ek];
    }
  }
  return '';
}

function formatNaturalRecord(rec) {
  const subj = pickField(rec, ['اسم المادة', 'subject']);
  const code = pickField(rec, ['كود المادة', 'code']);
  const year = pickField(rec, ['الفرقة', 'yearLevel']);
  const dept = pickField(rec, ['الشعبة / القسم', 'القسم', 'department']);
  const lec = pickField(rec, ['ساعات المحاضرة أسبوعياً', 'ساعات المحاضرة']);
  const sec = pickField(rec, ['ساعات السكشن أسبوعياً', 'ساعات السكشن']);
  const doc = pickField(rec, ['د. المحاضرة', 'doctor']);
  const ast = pickField(rec, ['المعيدين / السكاشن', 'assistant']);
  const hall = pickField(rec, ['القاعة', 'رقم القاعة', 'اسم القاعة', 'hall', 'room']);

  if (subj) {
    const parts = [
      '• ' + subj + (code ? ' (كود ' + code + ')' : '')
    ];
    const scope = [year, dept].filter(Boolean).join(' — ');
    if (scope) parts.push(scope);
    const hrs = [];
    if (lec) hrs.push('محاضرات: ' + lec + 'س');
    if (sec) hrs.push('سكاشن: ' + sec + 'س');
    if (hrs.length) parts.push(hrs.join('، '));
    if (doc) parts.push('د. ' + doc);
    if (ast) parts.push('معيد: ' + ast);
    if (hall) parts.push('قاعة: ' + hall);
    return parts.join(' | ');
  }

  const person = pickField(rec, ['اسم الدكتور / المعيد', 'name']);
  if (person) {
    const role = pickField(rec, ['الدرجة الوظيفية', 'role']);
    const pDept = pickField(rec, ['القسم', 'department']);
    const note = pickField(rec, ['ملاحظات', 'notes']);
    return '• ' + person +
      (role ? ' (' + role + ')' : '') +
      (pDept ? ' — قسم ' + pDept : '') +
      (note ? ' — ' + note : '');
  }

  const roomNum = pickField(rec, ['رقم القاعة', 'اسم القاعة', 'hall', 'room']);
  const roomType = pickField(rec, ['النوع', 'type']);
  if (roomNum || roomType) {
    const cap = pickField(rec, ['السعة (عدد الطلاب)', 'السعة', 'capacity']);
    const bldg = pickField(rec, ['المبنى', 'building']);
    const flr = pickField(rec, ['الدور', 'floor']);
    return '• ' + [roomType, roomNum].filter(Boolean).join(' ') +
      (cap ? ' — سعة ' + cap + ' طالب' : '') +
      ([bldg, flr].filter(Boolean).length ? ' (' + [bldg, flr].filter(Boolean).join('، ') + ')' : '');
  }

  const cleanPairs = rec.entries
    .filter(function (e) { return e.key.indexOf('Unnamed') !== 0; })
    .slice(0, 5)
    .map(function (e) {
      return e.key.replace(/\s*\*\s*$/, '').trim() + ': ' + e.value;
    });
  return '• ' + cleanPairs.join(' — ');
}

export class SheetChatBot {
  constructor(api) {
    this.api = api;
    this.isOpen = false;
    this.messages = [
      {
        role: 'bot',
        text: 'أهلاً بك! اسألني بأي أسلوب تحبه عن المواد، الدكاترة والمعيدين، القاعات والسعات، المجموعات، الفترات الزمنية، قواعد الكلية، أو ملاحظات المراجعة.'
      }
    ];
  }

  injectStyles() {
    if (document.getElementById('scb-styles')) return;
    const st = document.createElement('style');
    st.id = 'scb-styles';
    st.textContent = [
      '.scb-fab{position:fixed;bottom:22px;left:22px;z-index:9999;background:#0f3566;color:#fff;border:2px solid #f59e0b;border-radius:999px;padding:12px 18px;font:inherit;font-weight:700;font-size:.9rem;cursor:pointer;box-shadow:0 8px 24px rgba(15,23,42,.22);display:flex;align-items:center;gap:8px}',
      '.scb-panel{position:fixed;bottom:78px;left:22px;z-index:9999;width:min(435px,calc(100vw - 32px));max-height:76vh;background:#fff;border:1.5px solid #cbd5e1;border-radius:14px;box-shadow:0 16px 36px rgba(15,23,42,.24);display:flex;flex-direction:column;overflow:hidden;direction:rtl;text-align:right}',
      '.scb-head{background:linear-gradient(135deg,#071b38 0%,#0f3566 100%);color:#fff;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;gap:8px}',
      '.scb-title{margin:0;font-size:.96rem;font-weight:800}',
      '.scb-hbtns{display:flex;gap:6px;align-items:center}',
      '.scb-hbtn{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:6px;padding:3px 9px;cursor:pointer;font:inherit;font-size:.76rem;font-weight:600}',
      '.scb-quick{display:flex;gap:6px;flex-wrap:wrap;padding:8px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0}',
      '.scb-qbtn{background:#eff6ff;color:#1e3a8a;border:1px solid #bfdbfe;border-radius:999px;padding:4px 10px;font:inherit;font-size:.75rem;font-weight:600;cursor:pointer}',
      '.scb-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px;background:#f1f5f9}',
      '.scb-msg{max-width:93%;padding:10px 13px;border-radius:10px;font-size:.84rem;line-height:1.65;white-space:pre-line}',
      '.scb-msg.bot{background:#fff;color:#0f172a;border:1px solid #dbe2ee;align-self:flex-start}',
      '.scb-msg.user{background:#1e3a8a;color:#fff;align-self:flex-end}',
      '.scb-form{display:flex;gap:8px;padding:10px;background:#fff;border-top:1px solid #e2e8f0}',
      '.scb-input{flex:1;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font:inherit;font-size:.86rem;color:#0f172a}',
      '.scb-send{background:#0f3566;color:#fff;border:none;border-radius:8px;padding:8px 14px;font:inherit;font-weight:700;cursor:pointer}'
    ].join('');
