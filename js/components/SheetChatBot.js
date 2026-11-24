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
    src.rows.forEach(function (row) {
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
        entries.map(function (e) { return e.key + ' ' + e.value; }).join(' ')
      );
      const stemmedText = normAr(
        fullText.split(/\s+/).map(stemWord).join(' ')
      );

      records.push({
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

function formatDirectLine(rec) {
  const subj = pickField(rec, ['اسم المادة', 'subject']);
  const code = pickField(rec, ['كود المادة', 'code']);
  const year = pickField(rec, ['الفرقة', 'yearLevel']);
  const dept = pickField(rec, ['الشعبة / القسم', 'القسم', 'department']);
  const sem = pickField(rec, ['الفصل الدراسي', 'semester']);
  const lec = pickField(rec, ['ساعات المحاضرة أسبوعياً', 'ساعات المحاضرة']);
  const sec = pickField(rec, ['ساعات السكشن أسبوعياً', 'ساعات السكشن']);
  const doc = pickField(rec, ['د. المحاضرة', 'doctor']);
  const ast = pickField(rec, ['المعيدين / السكاشن', 'assistant']);
  const hall = pickField(rec, ['القاعة', 'رقم القاعة', 'اسم القاعة', 'hall', 'room']);

  if (subj) {
    const line = [];
    line.push('• ' + subj + (code ? ' (كود ' + code + ')' : ''));
    const scope = [year, dept, sem ? 'الفصل ' + sem : ''].filter(Boolean).join('، ');
    if (scope) line.push(scope);
    const hrs = [];
    if (lec) hrs.push('محاضرات: ' + lec + 'س');
    if (sec) hrs.push('سكاشن: ' + sec + 'س');
    if (hrs.length) line.push(hrs.join('، '));
    if (doc) line.push('د. ' + doc);
    if (ast) line.push('معيد: ' + ast);
    if (hall) line.push('قاعة: ' + hall);
    return line.join(' | ');
  }

  const person = pickField(rec, ['اسم الدكتور / المعيد', 'name']);
  if (person) {
    const role = pickField(rec, ['الدرجة الوظيفية', 'role']);
    const pDept = pickField(rec, ['القسم', 'department']);
    const note = pickField(rec, ['ملاحظات', 'notes']);
    return '• ' + person +
      (role ? ' — ' + role : '') +
      (pDept ? '، قسم ' + pDept : '') +
      (note ? ' (' + note + ')' : '');
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

  const pairs = rec.entries
    .filter(function (e) { return e.key.indexOf('Unnamed') !== 0; })
    .slice(0, 5)
    .map(function (e) {
      return e.key.replace(/\s*\*\s*$/, '').trim() + ': ' + e.value;
    });
  return '• ' + pairs.join(' — ');
}

export class SheetChatBot {
  constructor(api) {
    this.api = api;
    this.isOpen = false;
    this.messages = [
      {
        role: 'bot',
        text: 'اسألني مباشرة عن أي مادة، دكتور أو معيد، قاعة، فرقة، قسم، أو قاعدة.'
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
    document.head.appendChild(st);
  }

  async fetchLiveSheetData(force) {
    const shouldForce = Boolean(force);
    const cached = localStorage.getItem('sheet_cache_data');
    const cachedTime = Number(localStorage.getItem('sheet_cache_time') || 0);
    const now = Date.now();

    if (!shouldForce && cached && now - cachedTime < 120000) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed) return parsed;
      } catch (e) {}
    }

    if (this.api && typeof this.api.getData === 'function') {
      try {
        const fresh = await this.api.getData();
        if (fresh) {
          localStorage.setItem('sheet_cache_data', JSON.stringify(fresh));
          localStorage.setItem('sheet_cache_time', String(now));
          return fresh;
        }
      } catch (err) {
        console.error('ChatBot fetchLiveSheetData error:', err);
      }
    }

    if (cached) {
      try {
        return JSON.parse(cached) || {};
      } catch (e) {}
    }
    return {};
  }

  async answerQuery(rawQuery, forceRefresh) {
    const cleanQ = String(rawQuery || '').trim();
    if (!cleanQ) return 'اكتب سؤالك.';

    const data = await this.fetchLiveSheetData(Boolean(forceRefresh));
    const records = flattenSheetData(data);
    if (!records.length) return 'لا توجد بيانات متاحة حالياً.';

    const terms = extractQueryTerms(cleanQ);
    const qNorm = normAr(cleanQ);
    const wantsCount = /كم|عدد|اجمالي|إجمالي|مجموع/i.test(qNorm);

    const scored = records.map(function (rec) {
      let score = 0;
      if (qNorm.length >= 2 && rec.fullText.indexOf(qNorm) !== -1) {
        score += 12;
      }
      let matchedCount = 0;
      terms.forEach(function (t) {
        const st = stemWord(t);
        const inFull = rec.fullText.indexOf(t) !== -1;
        const inStem = st && rec.stemmedText.indexOf(st) !== -1;
        if (inFull) {
          score += 4;
          matchedCount += 1;
        } else if (inStem) {
          score += 2.5;
          matchedCount += 1;
        }
      });
      if (terms.length > 1 && matchedCount === terms.length) {
        score += 6;
      }
      return { rec: rec, score: score, matchedCount: matchedCount };
    }).filter(function (x) { return x.score > 0; })
      .sort(function (a, b) { return b.score - a.score || b.matchedCount - a.matchedCount; });

    if (!scored.length) {
      return 'لا توجد نتائج مطابقة لسؤالك.';
    }

    const lines = [];
    if (wantsCount) {
      let numSum = 0;
      scored.forEach(function (x) {
        x.rec.entries.forEach(function (e) {
          if (/سع|ساع|طلاب|عدد/i.test(e.key)) {
            numSum += toNum(e.value);
          }
        });
      });
      lines.push('• العدد: ' + scored.length + (numSum > 0 ? ' | الإجمالي الرقمي: ' + numSum.toLocaleString('en-US') : ''));
    }

    scored.slice(0, 8).forEach(function (x) {
      lines.push(formatDirectLine(x.rec));
    });

    return lines.join('\n');
  }

  mount(parentContainer) {
    const self = this;
    this.injectStyles();
    if (document.getElementById('scbRoot')) return;

    const root = document.createElement('div');
    root.id = 'scbRoot';
    root.innerHTML =
      '<button id="scbFab" class="scb-fab" type="button">💬 شات بوت الجداول</button>' +
      '<div id="scbPanel" class="scb-panel" style="display:none">' +
      '<div class="scb-head">' +
      '<h4 class="scb-title">مساعد الجداول الذكي</h4>' +
      '<div class="scb-hbtns">' +
      '<button id="scbSync" class="scb-hbtn" type="button">تحديث</button>' +
      '<button id="scbClose" class="scb-hbtn" type="button">✕</button>' +
      '</div>' +
      '</div>' +
      '<div class="scb-quick">' +
      '<button class="scb-qbtn" data-q="قواعد الكلية" type="button">قواعد الكلية</button>' +
      '<button class="scb-qbtn" data-q="ملاحظات المراجعة" type="button">ملاحظات المراجعة</button>' +
      '<button class="scb-qbtn" data-q="الفترات الزمنية" type="button">الفترات الزمنية</button>' +
      '<button class="scb-qbtn" data-q="المدرجات" type="button">المدرجات</button>' +
      '</div>' +
      '<div id="scbMsgs" class="scb-msgs"></div>' +
      '<form id="scbForm" class="scb-form">' +
      '<input id="scbInput" class="scb-input" type="text" placeholder="اكتب سؤالك..." autocomplete="off" />' +
      '<button class="scb-send" type="submit">إرسال</button>' +
      '</form>' +
      '</div>';

    (parentContainer || document.body).appendChild(root);

    const fab = document.getElementById('scbFab');
    const panel = document.getElementById('scbPanel');
    const syncBtn = document.getElementById('scbSync');
    const closeBtn = document.getElementById('scbClose');
    const form = document.getElementById('scbForm');
    const input = document.getElementById('scbInput');

    const renderMessages = function () {
      const box = document.getElementById('scbMsgs');
      if (!box) return;
      box.innerHTML = self.messages.map(function (m) {
        return '<div class="scb-msg ' + esc(m.role) + '">' + esc(m.text) + '</div>';
      }).join('');
      box.scrollTop = box.scrollHeight;
    };

    const submitQuestion = async function (text, forceRefresh) {
      const clean = String(text || '').trim();
      if (!clean) return;
      self.messages.push({ role: 'user', text: clean });
      renderMessages();

      const reply = await self.answerQuery(clean, Boolean(forceRefresh));
      self.messages.push({ role: 'bot', text: reply });
      renderMessages();
    };

    if (fab && panel) {
      fab.onclick = function () {
        self.isOpen = !self.isOpen;
        panel.style.display = self.isOpen ? 'flex' : 'none';
        if (self.isOpen) {
          renderMessages();
          if (input) input.focus();
        }
      };
    }

    if (syncBtn) {
      syncBtn.onclick = async function () {
        await self.fetchLiveSheetData(true);
        self.messages.push({ role: 'bot', text: '• تم تحديث البيانات.' });
        renderMessages();
      };
    }

    if (closeBtn && panel) {
      closeBtn.onclick = function () {
        self.isOpen = false;
        panel.style.display = 'none';
      };
    }

    root.querySelectorAll('.scb-qbtn').forEach(function (btn) {
      btn.onclick = function () {
        submitQuestion(btn.dataset.q || '', false);
      };
    });

    if (form && input) {
      form.onsubmit = function (e) {
        e.preventDefault();
        const val = input.value;
        input.value = '';
        submitQuestion(val, false);
      };
    }

    renderMessages();
  }
}
