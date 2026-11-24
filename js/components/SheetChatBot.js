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

export class SheetChatBot {
  constructor(api) {
    this.api = api;
    this.isOpen = false;
    this.messages = [
      {
        role: 'bot',
        text: 'أهلاً بك! أنا مساعد الجداول الذكي المرتبط بملف Google Sheets. اسألني عن أي مادة، دكتور أو معيد، قاعة أو سعة، فرقة أو قسم، أو قواعد الكلية وملاحظات المراجعة.'
      }
    ];
  }

  injectStyles() {
    if (document.getElementById('scb-styles')) return;
    const st = document.createElement('style');
    st.id = 'scb-styles';
    st.textContent = [
      '.scb-fab{position:fixed;bottom:22px;left:22px;z-index:9999;background:#0f3566;color:#fff;border:2px solid #f59e0b;border-radius:999px;padding:12px 18px;font:inherit;font-weight:700;font-size:.9rem;cursor:pointer;box-shadow:0 8px 24px rgba(15,23,42,.22);display:flex;align-items:center;gap:8px}',
      '.scb-panel{position:fixed;bottom:78px;left:22px;z-index:9999;width:min(410px,calc(100vw - 32px));max-height:72vh;background:#fff;border:1.5px solid #cbd5e1;border-radius:14px;box-shadow:0 16px 36px rgba(15,23,42,.24);display:flex;flex-direction:column;overflow:hidden;direction:rtl;text-align:right}',
      '.scb-head{background:linear-gradient(135deg,#071b38 0%,#0f3566 100%);color:#fff;padding:12px 16px;display:flex;justify-content:space-between;align-items:center}',
      '.scb-title{margin:0;font-size:.98rem;font-weight:800}',
      '.scb-close{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:6px;padding:2px 9px;cursor:pointer;font:inherit}',
      '.scb-quick{display:flex;gap:6px;flex-wrap:wrap;padding:8px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0}',
      '.scb-qbtn{background:#eff6ff;color:#1e3a8a;border:1px solid #bfdbfe;border-radius:999px;padding:4px 10px;font:inherit;font-size:.75rem;font-weight:600;cursor:pointer}',
      '.scb-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px;background:#f1f5f9}',
      '.scb-msg{max-width:90%;padding:9px 12px;border-radius:10px;font-size:.84rem;line-height:1.55;white-space:pre-line}',
      '.scb-msg.bot{background:#fff;color:#0f172a;border:1px solid #dbe2ee;align-self:flex-start}',
      '.scb-msg.user{background:#1e3a8a;color:#fff;align-self:flex-end}',
      '.scb-form{display:flex;gap:8px;padding:10px;background:#fff;border-top:1px solid #e2e8f0}',
      '.scb-input{flex:1;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font:inherit;font-size:.86rem;color:#0f172a}',
      '.scb-send{background:#0f3566;color:#fff;border:none;border-radius:8px;padding:8px 14px;font:inherit;font-weight:700;cursor:pointer}'
    ].join('');
    document.head.appendChild(st);
  }

  async getSheetSnapshot() {
    const cached = localStorage.getItem('sheet_cache_data');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed) return parsed;
      } catch (e) {}
    }
    if (this.api && typeof this.api.getData === 'function') {
      const fresh = await this.api.getData();
      localStorage.setItem('sheet_cache_data', JSON.stringify(fresh));
      localStorage.setItem('sheet_cache_time', String(Date.now()));
      return fresh;
    }
    return {};
  }

  async answerQuery(rawQuery) {
    const q = normAr(rawQuery);
    if (!q) return 'من فضلك اكتب استفسارك أولاً.';

    const data = await this.getSheetSnapshot();
    const courses = pickArr(data, ['courses', 'subjects', 'materials', 'المواد', 'المواد الدراسية']);
    const faculty = pickArr(data, ['instructors', 'faculty', 'doctors', 'أعضاء هيئة التدريس']);
    const rooms = pickArr(data, ['rooms', 'halls', 'القاعات', 'المدرجات والقاعات']);
    const schedules = Array.isArray(data) ? data : pickArr(data, ['schedules', 'schedule', 'الجداول']);
    const groups = pickArr(data, ['groups', 'الفرق والمجموعات']);
    const periods = pickArr(data, ['periods', 'timeSlots', 'الفترات الزمنية', 'الفترات']);
    const rules = pickArr(data, ['rules', 'collegeRules', 'قواعد الكلية']);
    const notes = pickArr(data, ['notes', 'reviewNotes', 'ملاحظات المراجعة', 'ملاحظات']);

    const lines = [];

    if (q.indexOf('قواعد') !== -1 || q.indexOf('قاعده') !== -1 || q.indexOf('عام دراسي') !== -1 || q.indexOf('فصل دراسي') !== -1) {
      const matchedRules = rules.filter(function (r) {
        const txt = normAr(JSON.stringify(r));
        return q.indexOf('قواعد') !== -1 || txt.indexOf(q) !== -1;
      });
      const targetRules = matchedRules.length ? matchedRules : rules;
      if (targetRules.length) {
        lines.push('قواعد الكلية المسجلة في الشيت (' + targetRules.length + '):');
        targetRules.slice(0, 8).forEach(function (r) {
          const item = getVal(r, ['البند', 'item', 'rule', 'name', 'title']) || 'بند';
          const val = getVal(r, ['القيمة', 'value', 'val', 'desc']) || '-';
          const src = getVal(r, ['المصدر / ملاحظات', 'المصدر', 'source']);
          lines.push('• ' + item + ': ' + val + (src ? ' (' + src + ')' : ''));
        });
      } else {
        lines.push('لا توجد قواعد مسجلة في بيانات الشيت الحالية.');
      }
    }

    if (q.indexOf('ملاحظ') !== -1 || q.indexOf('مراجعه') !== -1 || q.indexOf('تنبيه') !== -1) {
      if (notes.length) {
        lines.push('ملاحظات المراجعة المسجلة في الشيت (' + notes.length + '):');
        notes.slice(0, 8).forEach(function (n) {
          const topic = getVal(n, ['الموضوع', 'topic', 'title', 'subject']) || 'ملاحظة';
          const det = getVal(n, ['التفاصيل', 'details', 'detail', 'note', 'ملاحظات']) || '';
          const src = getVal(n, ['المصدر', 'source']);
          lines.push('• ' + topic + (src ? ' [' + src + ']' : '') + ': ' + det);
        });
      } else {
        lines.push('لا توجد ملاحظات مراجعة مسجلة في بيانات الشيت الحالية.');
      }
    }

    if (q.indexOf('فتر') !== -1 || q.indexOf('وقت') !== -1 || q.indexOf('مواعيد') !== -1) {
      if (periods.length) {
        lines.push('الفترات الزمنية المسجلة في الشيت (' + periods.length + ' فترة):');
        periods.slice(0, 8).forEach(function (p) {
          const day = getVal(p, ['أيام الدراسة *', 'أيام الدراسة', 'اليوم', 'day']) || '';
          const num = getVal(p, ['رقم الفترة *', 'رقم الفترة', 'period']) || '';
          const start = getVal(p, ['بداية الفترة *', 'بداية الفترة', 'start']) || '';
          const end = getVal(p, ['نهاية الفترة *', 'نهاية الفترة', 'end']) || '';
          lines.push('• ' + [day, num ? 'فترة ' + num : '', (start || end) ? (start + ' - ' + end) : ''].filter(Boolean).join(' | '));
        });
      } else {
        lines.push('لا توجد فترات زمنية مسجلة في بيانات الشيت الحالية.');
      }
    }

    const matchedFaculty = faculty.filter(function (f) {
      const name = normAr(getVal(f, ['اسم الدكتور / المعيد *', 'اسم الدكتور / المعيد', 'name']));
      const dept = normAr(getVal(f, ['القسم *', 'القسم', 'department']));
      const role = normAr(getVal(f, ['الدرجة الوظيفية *', 'الدرجة الوظيفية', 'role']));
      const fNote = normAr(getVal(f, ['ملاحظات', 'notes']));
      return name.indexOf(q) !== -1 || q.indexOf(name) !== -1 || dept.indexOf(q) !== -1 || role.indexOf(q) !== -1 || fNote.indexOf(q) !== -1;
    });

    if (matchedFaculty.length && (q.indexOf('دكتور') !== -1 || q.indexOf('معيد') !== -1 || q.indexOf('هيئه') !== -1 || q.indexOf('استاذ') !== -1 || matchedFaculty.length <= 6)) {
      lines.push('أعضاء هيئة التدريس المطابقون (' + matchedFaculty.length + '):');
      matchedFaculty.slice(0, 6).forEach(function (f) {
        const name = getVal(f, ['اسم الدكتور / المعيد *', 'اسم الدكتور / المعيد', 'name']) || 'عضو';
        const role = getVal(f, ['الدرجة الوظيفية *', 'الدرجة الوظيفية', 'role']) || '-';
        const dept = getVal(f, ['القسم *', 'القسم', 'department']) || '-';
        const fNote = getVal(f, ['ملاحظات', 'notes']) || '';
        const relatedCourses = courses.filter(function (c) {
          const allNames = splitNames(getVal(c, ['د. المحاضرة *', 'د. المحاضرة', 'doctor'])).concat(
            splitNames(getVal(c, ['المعيدين / السكاشن', 'assistant']))
          );
          return allNames.some(function (n) { return normAr(n).indexOf(normAr(name)) !== -1 || normAr(name).indexOf(normAr(n)) !== -1; });
        }).map(function (c) { return getVal(c, ['اسم المادة *', 'اسم المادة', 'subject']); }).filter(Boolean);

        lines.push('• ' + name + ' — ' + role + ' (القسم: ' + dept + ')' +
          (fNote ? ' | ' + fNote : '') +
          (relatedCourses.length ? ' | مواد بالجدول: ' + Array.from(new Set(relatedCourses)).join('، ') : ''));
      });
    }

    const matchedRooms = rooms.filter(function (r) {
      const rNum = normAr(getVal(r, ['رقم القاعة', '* النوع', 'اسم القاعة', 'hall', 'room']));
      const rType = normAr(getVal(r, ['* النوع', 'النوع', 'type']));
      const rBldg = normAr(getVal(r, ['* المبنى', 'المبنى', 'building']));
      const rFloor = normAr(getVal(r, ['* الدور', 'الدور', 'floor']));
      const rCap = normAr(getVal(r, ['* السعة (عدد الطلاب)', 'السعة (عدد الطلاب)', 'السعة', 'capacity']));
      return rNum.indexOf(q) !== -1 || rType.indexOf(q) !== -1 || rBldg.indexOf(q) !== -1 || rFloor.indexOf(q) !== -1 || rCap.indexOf(q) !== -1;
    });

    if (matchedRooms.length && (q.indexOf('قاع') !== -1 || q.indexOf('مدرج') !== -1 || q.indexOf('معمل') !== -1 || q.indexOf('سع') !== -1 || q.indexOf('مبن') !== -1 || q.indexOf('دور') !== -1)) {
      lines.push('القاعات / الأماكن المطابقة (' + matchedRooms.length + '):');
      matchedRooms.slice(0, 8).forEach(function (r) {
        const rNum = getVal(r, ['رقم القاعة', 'اسم القاعة', 'hall', 'room']) || '-';
        const rType = getVal(r, ['* النوع', 'النوع', 'type']) || '-';
        const rCap = getVal(r, ['* السعة (عدد الطلاب)', 'السعة (عدد الطلاب)', 'السعة', 'capacity']) || '-';
        const rBldg = getVal(r, ['* المبنى', 'المبنى', 'building']) || '-';
        const rFloor = getVal(r, ['* الدور', 'الدور', 'floor']) || '-';
        lines.push('• ' + rType + ' ' + rNum + ' — السعة: ' + rCap + ' | ' + rBldg + ' (' + rFloor + ')');
      });
    }

    const matchedCourses = courses.filter(function (c) {
      const subj = normAr(getVal(c, ['اسم المادة *', 'اسم المادة', 'subject']));
      const yr = normAr(getVal(c, ['الفرقة *', 'الفرقة', 'yearLevel']));
      const dept = normAr(getVal(c, ['الشعبة / القسم', 'القسم *', 'القسم', 'department']));
      const doc = normAr(getVal(c, ['د. المحاضرة *', 'د. المحاضرة', 'doctor']));
      const ast = normAr(getVal(c, ['المعيدين / السكاشن', 'assistant']));
      return subj.indexOf(q) !== -1 || yr.indexOf(q) !== -1 || dept.indexOf(q) !== -1 || doc.indexOf(q) !== -1 || ast.indexOf(q) !== -1;
    });

    if (matchedCourses.length && !lines.length) {
      lines.push('المواد المطابقة لاستفسارك (' + matchedCourses.length + '):');
      matchedCourses.slice(0, 8).forEach(function (c) {
        const subj = getVal(c, ['اسم المادة *', 'اسم المادة', 'subject']) || 'مادة';
        const yr = getVal(c, ['الفرقة *', 'الفرقة', 'yearLevel']) || '-';
        const dept = getVal(c, ['الشعبة / القسم', 'القسم *', 'القسم', 'department']) || '-';
        const doc = getVal(c, ['د. المحاضرة *', 'د. المحاضرة', 'doctor']) || '-';
        const ast = getVal(c, ['المعيدين / السكاشن', 'assistant']) || '-';
        const lh = getVal(c, ['ساعات المحاضرة أسبوعياً *', 'ساعات المحاضرة أسبوعياً']) || '0';
        const sh = getVal(c, ['ساعات السكشن أسبوعياً', 'ساعات السكاشن أسبوعياً']) || '0';
        lines.push('• ' + subj + ' (' + yr + ' - ' + dept + ') | محاضرة: ' + lh + 'س، سكشن: ' + sh + 'س | د. ' + doc + (ast !== '-' ? ' | معيد: ' + ast : ''));
      });
    }

    if (!lines.length && (q.indexOf('مجموع') !== -1 || q.indexOf('فرق') !== -1 || q.indexOf('طلاب') !== -1)) {
      if (groups.length) {
        lines.push('الفرق والمجموعات المسجلة (' + groups.length + '):');
        groups.slice(0, 8).forEach(function (g) {
          const gy = getVal(g, ['الفرقة', 'yearLevel']) || '-';
          const gd = getVal(g, ['البرنامج / الشعبة', 'القسم', 'department']) || '-';
          const gn = getVal(g, ['المجموعة', 'group']) || '-';
          const gNote = getVal(g, ['ملاحظات', 'notes']) || '';
          lines.push('• ' + gy + ' - ' + gd + ' - مجموعة ' + gn + (gNote ? ' (' + gNote + ')' : ''));
        });
      }
    }

    if (!lines.length) {
      lines.push(
        'ملخص البيانات المتاحة حالياً في الشيت:\n' +
        '• المواد: ' + courses.length + ' صف\n' +
        '• أعضاء هيئة التدريس: ' + faculty.length + ' عضو\n' +
        '• القاعات والمدرجات والمعامل: ' + rooms.length + ' مكان\n' +
        '• المجموعات: ' + groups.length + ' مجموعة | الفترات: ' + periods.length + ' فترة | الحصص المجدولة: ' + schedules.length + '\n' +
        'اكتب اسم مادة، اسم دكتور/معيد، رقم/نوع قاعة، فرقة دراسية، أو اسأل عن "قواعد الكلية" أو "ملاحظات المراجعة".'
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
      '<button id="scbClose" class="scb-close" type="button">✕</button>' +
      '</div>' +
      '<div class="scb-quick">' +
      '<button class="scb-qbtn" data-q="قواعد الكلية" type="button">قواعد الكلية</button>' +
      '<button class="scb-qbtn" data-q="ملاحظات المراجعة" type="button">ملاحظات المراجعة</button>' +
      '<button class="scb-qbtn" data-q="الفترات الزمنية" type="button">الفترات الزمنية</button>' +
      '<button class="scb-qbtn" data-q="مدرج" type="button">المدرجات</button>' +
      '<button class="scb-qbtn" data-q="محاسبة" type="button">مواد المحاسبة</button>' +
      '</div>' +
      '<div id="scbMsgs" class="scb-msgs"></div>' +
      '<form id="scbForm" class="scb-form">' +
      '<input id="scbInput" class="scb-input" type="text" placeholder="اكتب سؤالك عن الداتا في الشيت..." autocomplete="off" />' +
      '<button class="scb-send" type="submit">إرسال</button>' +
      '</form>' +
      '</div>';

    (parentContainer || document.body).appendChild(root);

    const fab = document.getElementById('scbFab');
    const panel = document.getElementById('scbPanel');
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

    const submitQuestion = async function (text) {
      const clean = String(text || '').trim();
      if (!clean) return;
      self.messages.push({ role: 'user', text: clean });
      renderMessages();
      const reply = await self.answerQuery(clean);
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

    if (closeBtn && panel) {
      closeBtn.onclick = function () {
        self.isOpen = false;
        panel.style.display = 'none';
      };
    }

    root.querySelectorAll('.scb-qbtn').forEach(function (btn) {
      btn.onclick = function () {
        submitQuestion(btn.dataset.q || '');
      };
    });

    if (form && input) {
      form.onsubmit = function (e) {
        e.preventDefault();
        const val = input.value;
        input.value = '';
        submitQuestion(val);
      };
    }

    renderMessages();
  }
}
