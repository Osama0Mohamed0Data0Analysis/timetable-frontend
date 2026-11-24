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
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
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

function getVal(item, keys) {
  if (!item || typeof item !== 'object') return '';
  const objKeys = Object.keys(item);
  for (let i = 0; i < keys.length; i++) {
    const pk = keys[i];
    for (let j = 0; j < objKeys.length; j++) {
      const k = objKeys[j];
      if (k.trim() === pk.trim()) {
        const v = item[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
      }
    }
  }
  for (let i = 0; i < keys.length; i++) {
    const pk = keys[i];
    for (let j = 0; j < objKeys.length; j++) {
      const k = objKeys[j];
      const lk = normAr(k);
      const lpk = normAr(pk);
      if (lpk && lk.indexOf(lpk) !== -1) {
        if (lpk.indexOf('ماده') !== -1 && lk.indexOf('كود') !== -1) continue;
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

function splitNames(s) {
  return String(s || '')
    .split(/[,،]/)
    .map(function (x) { return x.trim(); })
    .filter(Boolean);
}

function itemMatchesTokens(item, tokens) {
  if (!item || typeof item !== 'object' || !tokens.length) return false;
  const hay = normAr(Object.values(item).map(function (v) { return v == null ? '' : String(v); }).join(' | '));
  return tokens.every(function (tok) { return hay.indexOf(tok) !== -1; });
}

function itemMatchesAnyToken(item, tokens) {
  if (!item || typeof item !== 'object' || !tokens.length) return false;
  const hay = normAr(Object.values(item).map(function (v) { return v == null ? '' : String(v); }).join(' | '));
  return tokens.some(function (tok) { return tok.length >= 2 && hay.indexOf(tok) !== -1; });
}

export class SheetChatBot {
  constructor(api) {
    this.api = api;
    this.isOpen = false;
    this.messages = [
      {
        role: 'bot',
        text: 'أهلاً بك! أنا متصل مباشرة ببيانات Google Sheets. اسألني أي سؤال عن المواد، الدكاترة والمعيدين، القاعات والسعات، المجموعات، الفترات الزمنية، قواعد الكلية، أو ملاحظات المراجعة.'
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
        console.error('ChatBot live fetch failed:', err);
      }
    }

    if (cached) {
      try {
        return JSON.parse(cached) || {};
      } catch (e) {}
    }
    return {};
  }

  extractMeaningfulTokens(query) {
    const stopWords = ['ما', 'هو', 'هي', 'ماهي', 'ماهو', 'كم', 'عدد', 'اين', 'أين', 'متى', 'من', 'في', 'عن', 'على', 'إلى', 'الى', 'هل', 'بكام', 'ايه', 'اللي', 'التي', 'الذي', 'كل', 'جميع', 'بيانات', 'معلومات', 'جدول', 'شيت'];
    return normAr(query)
      .replace(/[؟?!.,،:؛()\[\]"]/g, ' ')
      .split(/\s+/)
      .map(function (w) { return w.trim(); })
      .filter(function (w) { return w.length >= 2 && stopWords.indexOf(w) === -1; });
  }

  async answerQuery(rawQuery, forceRefresh) {
    const q = normAr(rawQuery);
    if (!q) return 'من فضلك اكتب سؤالك أولاً.';

    const data = await this.fetchLiveSheetData(Boolean(forceRefresh));
    const courses = pickArr(data, ['courses', 'subjects', 'materials', 'المواد', 'المواد الدراسية']);
    const faculty = pickArr(data, ['instructors', 'faculty', 'doctors', 'أعضاء هيئة التدريس']);
    const rooms = pickArr(data, ['rooms', 'halls', 'القاعات', 'المدرجات والقاعات']);
    const schedules = Array.isArray(data) ? data : pickArr(data, ['schedules', 'schedule', 'الجداول']);
    const groups = pickArr(data, ['groups', 'الفرق والمجموعات']);
    const periods = pickArr(data, ['periods', 'timeSlots', 'الفترات الزمنية', 'الفترات']);
    const rules = pickArr(data, ['rules', 'collegeRules', 'قواعد الكلية']);
    const notes = pickArr(data, ['notes', 'reviewNotes', 'ملاحظات المراجعة', 'ملاحظات']);

    const tokens = this.extractMeaningfulTokens(rawQuery);
    const searchTerms = tokens.length ? tokens : [q];
    const isCountAsk = q.indexOf('كم') !== -1 || q.indexOf('عدد') !== -1 || q.indexOf('اجمالي') !== -1 || q.indexOf('إجمالي') !== -1;

    const lines = [];

    if (isCountAsk && (q.indexOf('ماد') !== -1 || q.indexOf('مقرر') !== -1)) {
      const matchedC = itemMatchesAnyToken(courses[0] || {}, searchTerms) ? courses.filter(function (c) { return itemMatchesAnyToken(c, searchTerms); }) : courses;
      const lecHrs = matchedC.reduce(function (s, c) { return s + toNum(getVal(c, ['ساعات المحاضرة أسبوعياً *', 'ساعات المحاضرة أسبوعياً'])); }, 0);
      const secHrs = matchedC.reduce(function (s, c) { return s + toNum(getVal(c, ['ساعات السكشن أسبوعياً', 'ساعات السكاشن أسبوعياً'])); }, 0);
      lines.push('عدد صفوف المواد: ' + matchedC.length + ' (إجمالي المواد الكلي: ' + courses.length + ')');
      lines.push('إجمالي ساعات المحاضرات: ' + lecHrs + ' ساعة | إجمالي ساعات السكاشن: ' + secHrs + ' ساعة');
    }

    if (isCountAsk && (q.indexOf('دكتور') !== -1 || q.indexOf('معيد') !== -1 || q.indexOf('هيئه') !== -1 || q.indexOf('تدريس') !== -1)) {
      lines.push('إجمالي أعضاء هيئة التدريس والمعيدين في الشيت: ' + faculty.length);
    }

    if (isCountAsk && (q.indexOf('قاع') !== -1 || q.indexOf('مدرج') !== -1 || q.indexOf('معمل') !== -1 || q.indexOf('سع') !== -1)) {
      const capSum = rooms.reduce(function (s, r) { return s + toNum(getVal(r, ['* السعة (عدد الطلاب)', 'السعة (عدد الطلاب)', 'السعة', 'capacity'])); }, 0);
      lines.push('إجمالي القاعات/الأماكن: ' + rooms.length + ' | إجمالي السعة: ' + capSum.toLocaleString('en-US') + ' طالب');
    }

    if (q.indexOf('قواعد') !== -1 || q.indexOf('قاعده') !== -1 || q.indexOf('عام اكاديمي') !== -1 || q.indexOf('فصل دراسي') !== -1) {
      const rMatches = rules.filter(function (r) { return itemMatchesAnyToken(r, searchTerms); });
      const targetRules = rMatches.length ? rMatches : rules;
      if (targetRules.length) {
        lines.push('قواعد الكلية (' + targetRules.length + '):');
        targetRules.slice(0, 10).forEach(function (r) {
          const b = getVal(r, ['البند', 'item', 'rule', 'name', 'title']) || 'بند';
          const v = getVal(r, ['القيمة', 'value', 'val', 'desc']) || '-';
          const src = getVal(r, ['المصدر / ملاحظات', 'المصدر', 'source']);
          lines.push('• ' + b + ': ' + v + (src ? ' (' + src + ')' : ''));
        });
      }
    }

    if (q.indexOf('ملاحظ') !== -1 || q.indexOf('مراجعه') !== -1 || q.indexOf('تنبيه') !== -1) {
      const nMatches = notes.filter(function (n) { return itemMatchesAnyToken(n, searchTerms); });
      const targetNotes = nMatches.length ? nMatches : notes;
      if (targetNotes.length) {
        lines.push('ملاحظات المراجعة (' + targetNotes.length + '):');
        targetNotes.slice(0, 10).forEach(function (n) {
          const t = getVal(n, ['الموضوع', 'topic', 'title', 'subject']) || 'ملاحظة';
          const d = getVal(n, ['التفاصيل', 'details', 'detail', 'note', 'ملاحظات']) || '';
          const src = getVal(n, ['المصدر', 'source']);
          lines.push('• ' + t + (src ? ' [' + src + ']' : '') + ': ' + d);
        });
      }
    }

    if (q.indexOf('فتر') !== -1 || q.indexOf('وقت') !== -1 || q.indexOf('مواعيد') !== -1 || q.indexOf('يوم') !== -1) {
      const pMatches = periods.filter(function (p) { return itemMatchesAnyToken(p, searchTerms); });
      const targetPeriods = pMatches.length ? pMatches : periods;
      if (targetPeriods.length) {
        lines.push('الفترات الزمنية (' + targetPeriods.length + '):');
        targetPeriods.slice(0, 10).forEach(function (p) {
          const day = getVal(p, ['أيام الدراسة *', 'أيام الدراسة', 'اليوم', 'day']);
          const num = getVal(p, ['رقم الفترة *', 'رقم الفترة', 'period']);
          const st = getVal(p, ['بداية الفترة *', 'بداية الفترة', 'start']);
          const en = getVal(p, ['نهاية الفترة *', 'نهاية الفترة', 'end']);
          lines.push('• ' + [day, num ? 'فترة ' + num : '', (st || en) ? (st + ' - ' + en) : ''].filter(Boolean).join(' | '));
        });
      }
    }

    const fMatches = faculty.filter(function (f) {
      return itemMatchesTokens(f, tokens) || itemMatchesAnyToken(f, searchTerms);
    });
    if (fMatches.length) {
      lines.push('أعضاء هيئة التدريس المطابقون (' + fMatches.length + '):');
      fMatches.slice(0, 8).forEach(function (f) {
        const name = getVal(f, ['اسم الدكتور / المعيد *', 'اسم الدكتور / المعيد', 'name']) || 'عضو';
        const role = getVal(f, ['الدرجة الوظيفية *', 'الدرجة الوظيفية', 'role']) || '-';
        const dept = getVal(f, ['القسم *', 'القسم', 'department']) || '-';
        const note = getVal(f, ['ملاحظات', 'notes']) || '';
        const relatedCourses = courses.filter(function (c) {
          const names = splitNames(getVal(c, ['د. المحاضرة *', 'د. المحاضرة', 'doctor'])).concat(
            splitNames(getVal(c, ['المعيدين / السكاشن', 'assistant']))
          );
          return names.some(function (n) {
            const nn = normAr(n);
            const nm = normAr(name);
            return nn.indexOf(nm) !== -1 || nm.indexOf(nn) !== -1;
          });
        }).map(function (c) { return getVal(c, ['اسم المادة *', 'اسم المادة', 'subject']); }).filter(Boolean);

        lines.push(
          '• ' + name + ' | الدرجة: ' + role + ' | القسم: ' + dept +
          (note ? ' | ' + note : '') +
          (relatedCourses.length ? ' | مواد بالجدول: ' + Array.from(new Set(relatedCourses)).join('، ') : '')
        );
      });
    }

    const rMatches = rooms.filter(function (r) {
      return itemMatchesTokens(r, tokens) || itemMatchesAnyToken(r, searchTerms);
    });
    if (rMatches.length) {
      lines.push('القاعات / الأماكن المطابقة (' + rMatches.length + '):');
      rMatches.slice(0, 8).forEach(function (r) {
        const num = getVal(r, ['رقم القاعة', 'اسم القاعة', 'hall', 'room']) || '-';
        const typ = getVal(r, ['* النوع', 'النوع', 'type']) || '-';
        const cap = getVal(r, ['* السعة (عدد الطلاب)', 'السعة (عدد الطلاب)', 'السعة', 'capacity']) || '-';
        const bld = getVal(r, ['* المبنى', 'المبنى', 'building']) || '-';
        const flr = getVal(r, ['* الدور', 'الدور', 'floor']) || '-';
        lines.push('• ' + typ + ' ' + num + ' | السعة: ' + cap + ' | ' + bld + ' (' + flr + ')');
      });
    }

    const cMatches = courses.filter(function (c) {
      return itemMatchesTokens(c, tokens) || itemMatchesAnyToken(c, searchTerms);
    });
    if (cMatches.length) {
      lines.push('المواد المطابقة (' + cMatches.length + '):');
      cMatches.slice(0, 8).forEach(function (c) {
        const subj = getVal(c, ['اسم المادة *', 'اسم المادة', 'subject']) || 'مادة';
        const yr = getVal(c, ['الفرقة *', 'الفرقة', 'yearLevel']) || '-';
        const dp = getVal(c, ['الشعبة / القسم', 'القسم *', 'القسم', 'department']) || '-';
        const doc = getVal(c, ['د. المحاضرة *', 'د. المحاضرة', 'doctor']) || '-';
        const ast = getVal(c, ['المعيدين / السكاشن', 'assistant']) || '-';
        const lh = getVal(c, ['ساعات المحاضرة أسبوعياً *', 'ساعات المحاضرة أسبوعياً']) || '0';
        const sh = getVal(c, ['ساعات السكشن أسبوعياً', 'ساعات السكاشن أسبوعياً']) || '0';
        const rt = getVal(c, ['نوع القاعة المطلوبة *', 'نوع القاعة المطلوبة']) || '-';
        lines.push('• ' + subj + ' (' + yr + ' - ' + dp + ') | محاضرة: ' + lh + 'س، سكشن: ' + sh + 'س | قاعة مطلوبة: ' + rt + ' | د. ' + doc + (ast !== '-' ? ' | معيد: ' + ast : ''));
      });
    }

    const gMatches = groups.filter(function (g) {
      return itemMatchesTokens(g, tokens) || itemMatchesAnyToken(g, searchTerms);
    });
    if (gMatches.length && (q.indexOf('مجموع') !== -1 || q.indexOf('فرق') !== -1 || q.indexOf('طلاب') !== -1 || !lines.length)) {
      lines.push('الفرق والمجموعات المطابقة (' + gMatches.length + '):');
      gMatches.slice(0, 8).forEach(function (g) {
        const gy = getVal(g, ['الفرقة', 'yearLevel']) || '-';
        const gd = getVal(g, ['البرنامج / الشعبة', 'القسم', 'department']) || '-';
        const gn = getVal(g, ['المجموعة', 'group']) || '-';
        const st = getVal(g, ['عدد الطلاب', 'students']) || '-';
        const nt = getVal(g, ['ملاحظات', 'notes']) || '';
        lines.push('• ' + gy + ' - ' + gd + ' - مجموعة ' + gn + (st !== '-' ? ' (' + st + ' طالب)' : '') + (nt ? ' | ' + nt : ''));
      });
    }

    const sMatches = schedules.filter(function (s) {
      return itemMatchesTokens(s, tokens) || itemMatchesAnyToken(s, searchTerms);
    });
    if (sMatches.length && (q.indexOf('جدول') !== -1 || q.indexOf('حص') !== -1 || !lines.length)) {
      lines.push('الحصص المجدولة المطابقة (' + sMatches.length + '):');
      sMatches.slice(0, 6).forEach(function (s) {
        const subj = getVal(s, ['اسم المادة *', 'اسم المادة', 'subject']) || 'حصة';
        const day = getVal(s, ['اليوم', 'day']) || '';
        const tm = getVal(s, ['وقت البداية', 'الوقت', 'timeSlot', 'time']) || '';
        const hl = getVal(s, ['القاعة', 'رقم القاعة', 'hall']) || '';
        const yr = getVal(s, ['الفرقة *', 'الفرقة', 'yearLevel']) || '';
        lines.push('• ' + subj + (yr ? ' (' + yr + ')' : '') + (day ? ' | ' + day : '') + (tm ? ' | ' + tm : '') + (hl ? ' | قاعة: ' + hl : ''));
      });
    }

    if (!lines.length) {
      return (
        'لم أجد تطابقاً مباشراً لاستفسارك في الداتا الحالية للشيت.\n' +
        'ملخص ما هو متاح حالياً: ' +
        courses.length + ' صف مادة، ' +
        faculty.length + ' عضو هيئة تدريس، ' +
        rooms.length + ' قاعة/مكان، ' +
        groups.length + ' مجموعة، ' +
        periods.length + ' فترة، ' +
        schedules.length + ' حصة مجدولة.'
      );
    }

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
      '<h4 class="scb-title">مساعد الجداول الذكي (Google Sheets)</h4>' +
      '<div class="scb-hbtns">' +
      '<button id="scbSync" class="scb-hbtn" type="button">تحديث الداتا</button>' +
      '<button id="scbClose" class="scb-hbtn" type="button">✕</button>' +
      '</div>' +
      '</div>' +
      '<div class="scb-quick">' +
      '<button class="scb-qbtn" data-q="كم عدد المواد وإجمالي الساعات؟" type="button">عدد المواد والساعات</button>' +
      '<button class="scb-qbtn" data-q="قواعد الكلية" type="button">قواعد الكلية</button>' +
      '<button class="scb-qbtn" data-q="ملاحظات المراجعة" type="button">ملاحظات المراجعة</button>' +
      '<button class="scb-qbtn" data-q="الفترات الزمنية" type="button">الفترات الزمنية</button>' +
      '<button class="scb-qbtn" data-q="المدرجات والقاعات" type="button">القاعات والمدرجات</button>' +
      '</div>' +
      '<div id="scbMsgs" class="scb-msgs"></div>' +
      '<form id="scbForm" class="scb-form">' +
      '<input id="scbInput" class="scb-input" type="text" placeholder="اسأل أي سؤال عن بيانات الشيت..." autocomplete="off" />' +
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
      self.messages.push({ role: 'bot', text: 'جاري قراءة البيانات من Google Sheets...' });
      renderMessages();

      const reply = await self.answerQuery(clean, Boolean(forceRefresh));
      self.messages.pop();
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
        self.messages.push({ role: 'bot', text: 'تم تحديث الداتا مباشرة من Google Sheets بنجاح. اسألني الآن!' });
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
