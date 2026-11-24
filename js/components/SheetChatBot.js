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
  const n = parseFloat(normAr(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function getVal(item, keys) {
  if (!item || typeof item !== 'object') return '';
  const objKeys = Object.keys(item);
  for (let i = 0; i < keys.length; i++) {
    const target = normAr(keys[i]);
    for (let j = 0; j < objKeys.length; j++) {
      const k = objKeys[j];
      if (normAr(k) === target) {
        const v = item[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
      }
    }
  }
  for (let i = 0; i < keys.length; i++) {
    const target = normAr(keys[i]);
    if (!target) continue;
    for (let j = 0; j < objKeys.length; j++) {
      const k = objKeys[j];
      const nk = normAr(k);
      if (nk.indexOf(target) !== -1) {
        if (target.indexOf('ماده') !== -1 && nk.indexOf('كود') !== -1) continue;
        const v = item[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
      }
    }
  }
  return '';
}

function pickArr(data, keys) {
  if (!data || typeof data !== 'object') return [];
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (Array.isArray(data[k])) return data[k];
  }
  if (data.data && typeof data.data === 'object') {
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (Array.isArray(data.data[k])) return data.data[k];
    }
  }
  return [];
}

function rowText(row) {
  if (!row || typeof row !== 'object') return '';
  return normAr(
    Object.keys(row)
      .filter(function (k) { return String(k).indexOf('Unnamed') !== 0; })
      .map(function (k) { return k + ' ' + (row[k] ?? ''); })
      .join(' ')
  );
}

function extractKeywords(q) {
  const ignore = new Set([
    'ما', 'ماذا', 'متي', 'اين', 'كيف', 'لماذا', 'هل', 'كم', 'من', 'في', 'عن', 'علي', 'الي',
    'ايه', 'اللي', 'التي', 'الذي', 'ده', 'دي', 'دول', 'كل', 'جميع', 'بيانات', 'معلومات',
    'داتا', 'شيت', 'جدول', 'لو', 'سمحت', 'عايز', 'اعرف', 'هات', 'قولي', 'قلي', 'ممكن', 'مين'
  ]);
  return normAr(q)
    .split(/[\s،,؟?!:؛()\[\]"'\/\\-]+/)
    .map(function (w) {
      let s = w.trim();
      if (s.length > 3 && s.indexOf('ال') === 0) s = s.slice(2);
      return s;
    })
    .filter(function (w) { return w && !ignore.has(w) && (w.length >= 2 || /^\d+$/.test(w)); });
}

export class SheetChatBot {
  constructor(api) {
    this.api = api;
    this.isOpen = false;
    this.syncing = false;
    this.messages = [
      {
        role: 'bot',
        text: 'أهلاً بك! اسألني عن المواد، الدكاترة والمعيدين، القاعات والسعات، المجموعات، الفترات، قواعد الكلية، أو ملاحظات المراجعة.'
      }
    ];
  }

  injectStyles() {
    if (document.getElementById('scb-styles')) return;
    const st = document.createElement('style');
    st.id = 'scb-styles';
    st.textContent = [
      '.scb-fab{position:fixed;bottom:22px;left:22px;z-index:9999;background:#0f3566;color:#fff;border:2px solid #f59e0b;border-radius:999px;padding:12px 18px;font:inherit;font-weight:700;font-size:.9rem;cursor:pointer;box-shadow:0 8px 24px rgba(15,23,42,.22);display:flex;align-items:center;gap:8px}',
      '.scb-panel{position:fixed;bottom:78px;left:22px;z-index:9999;width:min(420px,calc(100vw - 32px));max-height:74vh;background:#fff;border:1.5px solid #cbd5e1;border-radius:14px;box-shadow:0 16px 36px rgba(15,23,42,.24);display:flex;flex-direction:column;overflow:hidden;direction:rtl;text-align:right}',
      '.scb-head{background:linear-gradient(135deg,#071b38 0%,#0f3566 100%);color:#fff;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;gap:8px}',
      '.scb-title{margin:0;font-size:.96rem;font-weight:800}',
      '.scb-hbtns{display:flex;gap:6px;align-items:center}',
      '.scb-hbtn{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:6px;padding:3px 9px;cursor:pointer;font:inherit;font-size:.76rem;font-weight:600}',
      '.scb-quick{display:flex;gap:6px;flex-wrap:wrap;padding:8px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0}',
      '.scb-qbtn{background:#eff6ff;color:#1e3a8a;border:1px solid #bfdbfe;border-radius:999px;padding:4px 10px;font:inherit;font-size:.75rem;font-weight:600;cursor:pointer}',
      '.scb-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px;background:#f1f5f9}',
      '.scb-msg{max-width:92%;padding:9px 12px;border-radius:10px;font-size:.84rem;line-height:1.55;white-space:pre-line}',
      '.scb-msg.bot{background:#fff;color:#0f172a;border:1px solid #dbe2ee;align-self:flex-start}',
      '.scb-msg.user{background:#1e3a8a;color:#fff;align-self:flex-end}',
      '.scb-form{display:flex;gap:8px;padding:10px;background:#fff;border-top:1px solid #e2e8f0}',
      '.scb-input{flex:1;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font:inherit;font-size:.86rem;color:#0f172a}',
      '.scb-send{background:#0f3566;color:#fff;border:none;border-radius:8px;padding:8px 14px;font:inherit;font-weight:700;cursor:pointer}'
    ].join('');
    document.head.appendChild(st);
  }

  getFastData() {
    const cached = localStorage.getItem('sheet_cache_data');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed) return parsed;
      } catch (e) {}
    }
    return null;
  }

  async syncNow() {
    if (this.syncing) return this.getFastData() || {};
    this.syncing = true;
    try {
      if (this.api && typeof this.api.getData === 'function') {
        const fresh = await this.api.getData();
        if (fresh) {
          localStorage.setItem('sheet_cache_data', JSON.stringify(fresh));
          localStorage.setItem('sheet_cache_time', String(Date.now()));
          return fresh;
        }
      }
    } catch (e) {
      console.error('ChatBot sync error:', e);
    } finally {
      this.syncing = false;
    }
    return this.getFastData() || {};
  }

  answerQuery(rawQuery) {
    const cleanQ = String(rawQuery || '').trim();
    if (!cleanQ) return 'اكتب سؤالك.';

    const data = this.getFastData();
    if (!data) {
      return 'لا توجد بيانات محمّلة بعد. اضغط على «تحديث» مرة واحدة لتحميل البيانات.';
    }

    const q = normAr(cleanQ);
    const keys = extractKeywords(cleanQ);
    const isCount = /كم|عدد|اجمالي|إجمالي|مجموع/i.test(q);

    const courses = pickArr(data, ['courses', 'subjects', 'materials', 'المواد', 'المواد الدراسية']);
    const faculty = pickArr(data, ['instructors', 'faculty', 'doctors', 'أعضاء هيئة التدريس']);
    const rooms = pickArr(data, ['rooms', 'halls', 'القاعات', 'المدرجات والقاعات']);
    const schedules = Array.isArray(data) ? data : pickArr(data, ['schedules', 'schedule', 'الجداول']);
    const groups = pickArr(data, ['groups', 'الفرق والمجموعات']);
    const periods = pickArr(data, ['periods', 'timeSlots', 'الفترات الزمنية', 'الفترات']);
    const rules = pickArr(data, ['rules', 'collegeRules', 'قواعد الكلية']);
    const notes = pickArr(data, ['notes', 'reviewNotes', 'ملاحظات المراجعة', 'ملاحظات']);

    if (isCount && /ماد|مقرر/i.test(q) && keys.length <= 2) {
      const lec = courses.reduce(function (s, c) { return s + toNum(getVal(c, ['ساعات المحاضرة أسبوعياً', 'ساعات المحاضرة'])); }, 0);
      const sec = courses.reduce(function (s, c) { return s + toNum(getVal(c, ['ساعات السكشن أسبوعياً', 'ساعات السكاشن'])); }, 0);
      return '• عدد صفوف المواد: ' + courses.length + ' | ساعات المحاضرات: ' + lec + 'س | ساعات السكاشن: ' + sec + 'س';
    }

    if (isCount && /دكتور|معيد|هيئه|تدريس/i.test(q) && keys.length <= 2) {
      return '• عدد أعضاء هيئة التدريس والمعيدين: ' + faculty.length;
    }

    if (isCount && /قاع|مدرج|معمل|سع/i.test(q) && keys.length <= 2) {
      const cap = rooms.reduce(function (s, r) { return s + toNum(getVal(r, ['السعة (عدد الطلاب)', 'السعة', 'capacity'])); }, 0);
      return '• عدد القاعات والأماكن: ' + rooms.length + ' | إجمالي السعة: ' + cap.toLocaleString('en-US') + ' طالب';
    }

    const pool = []
      .concat(courses.map(function (r) { return { kind: 'course', row: r, txt: rowText(r) }; }))
      .concat(faculty.map(function (r) { return { kind: 'faculty', row: r, txt: rowText(r) }; }))
      .concat(rooms.map(function (r) { return { kind: 'room', row: r, txt: rowText(r) }; }))
      .concat(rules.map(function (r) { return { kind: 'rule', row: r, txt: rowText(r) }; }))
      .concat(notes.map(function (r) { return { kind: 'note', row: r, txt: rowText(r) }; }))
      .concat(periods.map(function (r) { return { kind: 'period', row: r, txt: rowText(r) }; }))
      .concat(groups.map(function (r) { return { kind: 'group', row: r, txt: rowText(r) }; }))
      .concat(schedules.map(function (r) { return { kind: 'schedule', row: r, txt: rowText(r) }; }));

    const terms = keys.length ? keys : [q];
    const matches = pool
      .map(function (item) {
        let score = 0;
        if (item.txt.indexOf(q) !== -1) score += 10;
        terms.forEach(function (t) {
          if (item.txt.indexOf(t) !== -1) score += 3;
        });
        return { item: item, score: score };
      })
      .filter(function (x) { return x.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 8)
      .map(function (x) { return x.item; });

    if (!matches.length) {
      return 'لم أجد نتيجة مطابقة في البيانات الحالية.';
    }

    return matches.map(function (m) {
      const r = m.row;
      if (m.kind === 'course') {
        const subj = getVal(r, ['اسم المادة', 'subject']) || 'مادة';
        const yr = getVal(r, ['الفرقة', 'yearLevel']);
        const dept = getVal(r, ['الشعبة / القسم', 'القسم', 'department']);
        const lec = getVal(r, ['ساعات المحاضرة أسبوعياً', 'ساعات المحاضرة']);
        const sec = getVal(r, ['ساعات السكشن أسبوعياً', 'ساعات السكاشن']);
        const doc = getVal(r, ['د. المحاضرة', 'doctor']);
        const ast = getVal(r, ['المعيدين / السكاشن', 'assistant']);
        return '• ' + subj +
          ([yr, dept].filter(Boolean).length ? ' (' + [yr, dept].filter(Boolean).join(' - ') + ')' : '') +
          (lec || sec ? ' | محاضرة: ' + (lec || 0) + 'س، سكشن: ' + (sec || 0) + 'س' : '') +
          (doc ? ' | د. ' + doc : '') +
          (ast ? ' | معيد: ' + ast : '');
      }
      if (m.kind === 'faculty') {
        const name = getVal(r, ['اسم الدكتور / المعيد', 'name']) || 'عضو';
        const role = getVal(r, ['الدرجة الوظيفية', 'role']);
        const dept = getVal(r, ['القسم', 'department']);
        const note = getVal(r, ['ملاحظات', 'notes']);
        return '• ' + name + (role ? ' (' + role + ')' : '') + (dept ? ' - ' + dept : '') + (note ? ' | ' + note : '');
      }
      if (m.kind === 'room') {
        const num = getVal(r, ['رقم القاعة', 'اسم القاعة', 'hall', 'room']);
        const typ = getVal(r, ['النوع', 'type']);
        const cap = getVal(r, ['السعة (عدد الطلاب)', 'السعة', 'capacity']);
        const bld = getVal(r, ['المبنى', 'building']);
        const flr = getVal(r, ['الدور', 'floor']);
        return '• ' + [typ, num].filter(Boolean).join(' ') + (cap ? ' — سعة ' + cap + ' طالب' : '') + ([bld, flr].filter(Boolean).length ? ' (' + [bld, flr].filter(Boolean).join('، ') + ')' : '');
      }
      if (m.kind === 'rule') {
        const b = getVal(r, ['البند', 'item', 'title']) || 'بند';
        const v = getVal(r, ['القيمة', 'value', 'desc']) || '';
        return '• ' + b + (v ? ': ' + v : '');
      }
      if (m.kind === 'note') {
        const t = getVal(r, ['الموضوع', 'topic', 'title']) || 'ملاحظة';
        const d = getVal(r, ['التفاصيل', 'details', 'note']) || '';
        return '• ' + t + (d ? ': ' + d : '');
      }
      const vals = Object.keys(r)
        .filter(function (k) { return String(k).indexOf('Unnamed') !== 0 && r[k] !== undefined && r[k] !== null && String(r[k]).trim() !== ''; })
        .slice(0, 5)
        .map(function (k) { return String(r[k]).trim(); });
      return '• ' + vals.join(' | ');
    }).join('\n');
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

    if (fab && panel) {
      fab.onclick = function () {
        self.isOpen = !self.isOpen;
        panel.style.display = self.isOpen ? 'flex' : 'none';
        if (self.isOpen) {
          if (!self.getFastData() && self.api && typeof self.api.getData === 'function') {
            self.syncNow().then(renderMessages);
          }
          renderMessages();
          if (input) input.focus();
        }
      };
    }

    if (syncBtn) {
      syncBtn.onclick = async function () {
        syncBtn.textContent = '...';
        await self.syncNow();
        syncBtn.textContent = 'تحديث';
        const lastMsg = self.messages[self.messages.length - 1];
        if (!lastMsg || lastMsg.text !== '• تم تحديث البيانات.') {
          self.messages.push({ role: 'bot', text: '• تم تحديث البيانات.' });
          renderMessages();
        }
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
        const qText = btn.dataset.q || '';
        if (!qText) return;
        self.messages.push({ role: 'user', text: qText });
        self.messages.push({ role: 'bot', text: self.answerQuery(qText) });
        renderMessages();
      };
    });

    if (form && input) {
      form.onsubmit = function (e) {
        e.preventDefault();
        const val = input.value.trim();
        input.value = '';
        if (!val) return;
        self.messages.push({ role: 'user', text: val });
        self.messages.push({ role: 'bot', text: self.answerQuery(val) });
        renderMessages();
      };
    }

    renderMessages();
  }
}
