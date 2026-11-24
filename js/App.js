import { DashboardView } from './DashboardView.js';
import { SheetChatBot } from './components/SheetChatBot.js';

export const COLS = {
  id: ['id', 'ID', 'رقم', 'م'],
  year: ['yearLevel', 'الفرقة *', 'الفرقة', 'المستوى', 'السنة'],
  dept: ['department', 'الشعبة / القسم', 'القسم *', 'القسم', 'الشعبة', 'البرنامج'],
  group: ['groupName', 'المجموعة', 'مجموعة', 'السكشن'],
  day: ['day', 'اليوم', 'أيام الدراسة *', 'أيام الدراسة'],
  slot: ['timeSlot', 'الفترة', 'الفترة الزمنية', 'الوقت', 'المواعيد'],
  periodNum: ['رقم الفترة *', 'رقم الفترة', 'period'],
  startTime: ['بداية الفترة *', 'بداية الفترة'],
  endTime: ['نهاية الفترة *', 'نهاية الفترة'],
  subject: ['subject', 'اسم المادة *', 'اسم المادة', 'المادة', 'المقرر'],
  code: ['code', 'كود المادة', 'الكود'],
  semester: ['semester', 'الفصل الدراسي', 'الترم'],
  lecHours: ['ساعات المحاضرة أسبوعياً *', 'ساعات المحاضرة أسبوعياً', 'ساعات المحاضرة'],
  secHours: ['ساعات السكشن أسبوعياً', 'ساعات السكاشن', 'ساعات السكشن'],
  roomType: ['نوع القاعة المطلوبة *', 'نوع القاعة المطلوبة', 'النوع'],
  doctor: ['doctor', 'د. المحاضرة *', 'د. المحاضرة', 'الدكتور', 'دكتور المحاضرة', 'أستاذ المادة'],
  assistant: ['assistants', 'المعيدين / السكاشن', 'المعيد', 'المعيدين', 'هيئة معاونة'],
  hall: ['hall', 'القاعة', 'المدرج', 'رقم القاعة', 'اسم القاعة', 'المكان'],
  notes: ['notes', 'ملاحظات', 'ملاحظة'],
};

export const INSTRUCTOR_COLS = {
  name: ['اسم الدكتور / المعيد *', 'اسم الدكتور / المعيد', 'الاسم', 'name', 'doctor'],
  role: ['الدرجة الوظيفية *', 'الدرجة الوظيفية', 'الوظيفة', 'role'],
  dept: ['القسم *', 'القسم', 'الشعبة / القسم', 'department'],
  notes: ['ملاحظات', 'notes', 'المواد'],
};

export const ROOM_COLS = {
  number: ['رقم القاعة', 'اسم القاعة', 'القاعة', 'hall', 'room'],
  type: ['* النوع', 'النوع', 'type'],
  capacity: ['* السعة (عدد الطلاب)', 'السعة (عدد الطلاب)', 'السعة', 'capacity'],
  building: ['* المبنى', 'المبنى', 'building'],
  floor: ['* الدور', 'الدور', 'floor'],
  equipment: ['مجهزة بـ (بروجكتر، اجهزة...)', 'التجهيزات', 'equipment'],
  allDepts: ['متاحة لكل الأقسام؟', 'متاحة لكل الأقسام'],
  notes: ['ملاحظات', 'notes'],
};

export const DAYS = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function normAr(s) {
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

export function getVal(item, keys) {
  if (!item || typeof item !== 'object') return '';
  const objKeys = Object.keys(item);
  for (const k of keys) {
    const nk = normAr(k);
    for (const ok of objKeys) {
      if (normAr(ok) === nk) {
        const v = item[ok];
        if (v !== undefined && v !== null && String(v).trim() !== '' && String(v).trim() !== 'NaN') {
          return String(v).trim();
        }
      }
    }
  }
  for (const k of keys) {
    const nk = normAr(k);
    if (!nk) continue;
    for (const ok of objKeys) {
      const nok = normAr(ok);
      if (nok.includes(nk)) {
        if (nk.includes('ماده') && nok.includes('كود')) continue;
        const v = item[ok];
        if (v !== undefined && v !== null && String(v).trim() !== '' && String(v).trim() !== 'NaN') {
          return String(v).trim();
        }
      }
    }
  }
  return '';
}

export function col(item, field) {
  const keys = COLS[field] || [field];
  return getVal(item, keys);
}

export function slotLabel(item) {
  const direct = col(item, 'slot');
  if (direct) return direct;
  const pNum = col(item, 'periodNum');
  const st = col(item, 'startTime');
  const en = col(item, 'endTime');
  if (st && en) return `${pNum ? `فترة ${pNum} (${st} - ${en})` : `${st} - ${en}`}`;
  if (pNum) return `فترة ${pNum}`;
  return 'غير محدد';
}

export function splitNames(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/[,،\n\/]+/)
    .map(s => s.trim())
    .filter(s => s && s !== '-' && normAr(s) !== 'غير محدد');
}

export function yearRank(y) {
  const n = normAr(y);
  const order = ['اول', 'ثان', 'ثالث', 'رابع', 'خامس'];
  const i = order.findIndex(o => n.includes(o));
  if (i >= 0) return i;
  const d = n.match(/\d+/);
  return d ? parseInt(d[0], 10) - 1 : 99;
}

export function sortYears(arr) {
  return [...arr].sort((a, b) => yearRank(a) - yearRank(b) || a.localeCompare(b, 'ar'));
}

export function sameYear(a, b) {
  const x = normAr(a);
  const y = normAr(b);
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
}

export function groupKey(g) {
  const s = normAr(g);
  const d = s.match(/\d+/);
  return d ? d[0] : s;
}

export function matchesGroup(item, year, group) {
  if (year && !sameYear(col(item, 'year'), year)) return false;
  const rowGroup = col(item, 'group');
  if (!group || !rowGroup) return true;
  return groupKey(rowGroup) === groupKey(group);
}

export function matchesInstructor(item, name) {
  if (!name) return true;
  return [...splitNames(col(item, 'doctor')), ...splitNames(col(item, 'assistant'))].includes(name);
}

export function matchesFilter(item, { year, dept, group, instructor, hall } = {}) {
  if (year && !sameYear(col(item, 'year'), year)) return false;
  if (dept && !normAr(col(item, 'dept')).includes(normAr(dept))) return false;
  if (group) {
    const rowGroup = col(item, 'group');
    if (rowGroup && !normAr(rowGroup).includes(normAr(group))) return false;
  }
  if (instructor) {
    const docs = [...splitNames(col(item, 'doctor')), ...splitNames(col(item, 'assistant'))];
    if (!docs.some(d => normAr(d).includes(normAr(instructor)))) return false;
  }
  if (hall) {
    const rowHall = col(item, 'hall');
    if (rowHall && !normAr(rowHall).includes(normAr(hall))) return false;
  }
  return true;
}

export async function loadData(api, force = false) {
  const cached = localStorage.getItem('sheet_cache_data');
  const cachedTime = Number(localStorage.getItem('sheet_cache_time') || 0);
  const now = Date.now();
  if (!force && cached && now - cachedTime < 600000) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed) return parsed;
    } catch (e) {}
  }
  try {
    const data = await api.getData();
    localStorage.setItem('sheet_cache_data', JSON.stringify(data));
    localStorage.setItem('sheet_cache_time', String(now));
    return data;
  } catch (err) {
    console.error('Error fetching data:', err);
    if (cached) return JSON.parse(cached);
    throw err;
  }
}

export const schedulesOf = data => (Array.isArray(data) ? data : (data && data.schedules) || []);

function academyLogoSvg() {
  return `
    <svg class="sada-logo-svg" viewBox="0 0 64 64" width="44" height="44" aria-hidden="true">
      <circle cx="32" cy="32" r="29" fill="#0d2a5c" stroke="#f59e0b" stroke-width="2.5" />
      <path d="M14 26 L32 16 L50 26 L32 36 Z" fill="#fbbf24" />
      <path d="M21 31 V42 C21 45 26 48 32 48 C38 48 43 45 43 42 V31" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" />
      <line x1="50" y1="26" x2="50" y2="41" stroke="#fbbf24" stroke-width="2.6" stroke-linecap="round" />
      <circle cx="50" cy="43" r="2.5" fill="#fbbf24" />
    </svg>
  `;
}

export function injectStyles() {
  if (document.getElementById('sada-shell-styles')) return;
  const style = document.createElement('style');
  style.id = 'sada-shell-styles';
  style.textContent = `
    .sada-shell{display:flex;min-height:100vh;direction:rtl;background:#f1f5f9;font-family:inherit;color:#0f172a}
    .sada-sidebar{width:268px;flex-shrink:0;background:linear-gradient(180deg,#081d40 0%,#0c2858 55%,#091f44 100%);color:#fff;display:flex;flex-direction:column;box-shadow:4px 0 20px rgba(8,29,64,.16);position:sticky;top:0;height:100vh;z-index:200}
    .sada-brand{padding:22px 18px 18px;border-bottom:1px solid rgba(255,255,255,.12);display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px}
    .sada-logo-wrap{display:flex;align-items:center;justify-content:center;padding:4px;border-radius:50%;background:rgba(255,255,255,.06);box-shadow:0 6px 16px rgba(0,0,0,.25)}
    .sada-brand-title{margin:0;font-size:1.15rem;font-weight:800;letter-spacing:.2px;color:#fff}
    .sada-brand-sub{margin:0;font-size:.8rem;color:#cbd5e1;font-weight:500}
    .sada-nav-list{padding:14px 10px;display:flex;flex-direction:column;gap:6px;flex:1;overflow-y:auto}
    .sada-nav-btn{width:100%;display:flex;align-items:center;justify-content:flex-start;gap:10px;padding:12px 16px;border:none;border-radius:10px;background:transparent;color:#e2e8f0;font:inherit;font-size:.92rem;font-weight:700;cursor:pointer;text-align:right;transition:background .18s ease,color .18s ease,transform .15s ease}
    .sada-nav-btn:hover{background:rgba(255,255,255,.1);color:#fff}
    .sada-nav-btn.on{background:#2563eb;color:#fff;box-shadow:0 6px 16px rgba(37,99,235,.38)}
    .sada-nav-icon{font-size:1.05rem;line-height:1}
    .sada-sidebar-foot{padding:12px 16px;border-top:1px solid rgba(255,255,255,.1);font-size:.75rem;color:#94a3b8;text-align:center}
    .sada-main{flex:1;min-width:0;display:flex;flex-direction:column}
    .sada-mobile-bar{display:none;align-items:center;justify-content:space-between;padding:10px 14px;background:#0c2858;color:#fff;position:sticky;top:0;z-index:150;box-shadow:0 2px 10px rgba(0,0,0,.12)}
    .sada-mobile-brand{display:flex;align-items:center;gap:8px;font-weight:800;font-size:.95rem}
    .sada-mobile-toggle{background:rgba(255,255,255,.14);color:#fff;border:1px solid rgba(255,255,255,.28);border-radius:8px;padding:6px 12px;font:inherit;font-size:.85rem;font-weight:700;cursor:pointer}
    .sada-content{flex:1;padding:18px 20px 36px;max-width:100%}
    .sada-backdrop{display:none;position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:190}
    .tt-loading{padding:24px;text-align:center;color:#475569;font-weight:600}
    .tt-card{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;margin-bottom:6px;box-shadow:0 1px 2px rgba(0,0,0,.04)}
    .tt-subj{font-weight:700;color:#0f172a;font-size:.88rem}
    .tt-meta{color:#475569;font-size:.78rem;margin-top:3px}
    @media (max-width: 860px){
      .sada-mobile-bar{display:flex}
      .sada-sidebar{position:fixed;right:-280px;top:0;bottom:0;height:100vh;transition:right .22s ease}
      .sada-sidebar.open{right:0}
      .sada-backdrop.open{display:block}
      .sada-content{padding:14px}
    }
  `;
  document.head.appendChild(style);
}

export function cardHtml(item) {
  const subj = col(item, 'subject') || 'مادة';
  const code = col(item, 'code');
  const doc = col(item, 'doctor');
  const ast = col(item, 'assistant');
  const hall = col(item, 'hall');
  const grp = col(item, 'group');
  const dept = col(item, 'dept');
  return `
    <div class="tt-card">
      <div class="tt-subj">${esc(subj)}${code ? ` <span style="color:#64748b;font-weight:500">(${esc(code)})</span>` : ''}</div>
      ${doc ? `<div class="tt-meta">د. ${esc(doc)}</div>` : ''}
      ${ast ? `<div class="tt-meta">سكشن: ${esc(ast)}</div>` : ''}
      ${hall ? `<div class="tt-meta">قاعة: ${esc(hall)}</div>` : ''}
      ${grp || dept ? `<div class="tt-meta">${esc([dept, grp].filter(Boolean).join(' • '))}</div>` : ''}
    </div>
  `;
}

export function renderGrid(tbody, items) {
  if (!tbody) return;
  const slots = [...new Set(items.map(slotLabel))];
  if (!slots.length) slots.push('غير محدد');
  tbody.innerHTML = slots.map(sl => {
    const tds = DAYS.map(day => {
      const cellItems = items.filter(it => {
        const d = col(it, 'day');
        return normAr(d).includes(normAr(day)) && slotLabel(it) === sl;
      });
      return `<td>${cellItems.map(cardHtml).join('')}</td>`;
    }).join('');
    return `<tr><th style="white-space:nowrap;background:#f8fafc;padding:8px">${esc(sl)}</th>${tds}</tr>`;
  }).join('');
}

export class SchedulerView {
  constructor(api) {
    this.api = api;
  }
  async mount(container) {
    const data = await loadData(this.api);
    const schedules = schedulesOf(data);
    container.innerHTML = `
      <div style="background:#fff;padding:18px;border-radius:10px;border:1px solid #e2e8f0">
        <h2 style="margin:0 0 8px">1) منسق الجداول</h2>
        <p style="margin:0 0 14px;color:#475569">إجمالي الحصص والصفوف المسجلة: <strong>${schedules.length}</strong></p>
        <div style="overflow-x:auto">
          <table border="1" cellpadding="6" style="width:100%;border-collapse:collapse;border-color:#cbd5e1">
            <thead>
              <tr style="background:#f1f5f9">
                <th>الفترة</th>
                ${DAYS.map(d => `<th>${esc(d)}</th>`).join('')}
              </tr>
            </thead>
            <tbody id="schBody"></tbody>
          </table>
        </div>
      </div>
    `;
    renderGrid(document.getElementById('schBody'), schedules);
  }
}

export class DoctorView {
  constructor(api) {
    this.api = api;
  }
  async mount(container) {
    container.innerHTML = `
      <div style="padding: 20px; direction: rtl; text-align: right;">
        <h2>لوحة عضو هيئة التدريس</h2>
        <p>مرحباً بك، يمكنك متابعة جدول المحاضرات وإرسال طلبات التعديل أو الاعتذار.</p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h3>إرسال طلب للمنسق</h3>
          <textarea id="docRequestMsg" placeholder="اكتب طلبك هنا..." style="width: 100%; height: 100px; padding: 10px; margin: 10px 0; border: 1px solid #cbd5e1; border-radius: 6px;"></textarea>
          <button id="sendReqBtn" style="padding: 10px 20px; background: #0284c7; color: white; border: none; border-radius: 6px; cursor: pointer;">إرسال الطلب</button>
        </div>
      </div>
    `;
    document.getElementById('sendReqBtn')?.addEventListener('click', async () => {
      const msg = document.getElementById('docRequestMsg').value;
      if (!msg) return alert('الرجاء كتابة الطلب أولاً');
      await this.api.sendDoctorRequest({ doctorName: "عضو هيئة التدريس", message: msg, status: "pending" });
      alert('تم إرسال الطلب بنجاح!');
      document.getElementById('docRequestMsg').value = '';
    });
  }
}

export class StudentView {
  constructor(api) {
    this.api = api;
    this.year = '';
    this.group = '';
    this.schedules = [];
  }
  async mount(container) {
    const data = await loadData(this.api);
    this.schedules = schedulesOf(data);
    container.innerHTML = `
      <div style="background:#fff;padding:18px;border-radius:10px;border:1px solid #e2e8f0">
        <h2 style="margin:0 0 8px">3) جدول الطالب</h2>
        <p style="margin:0 0 14px;color:#475569">اختر الفرقة والمجموعة لعرض الجدول الدراسي الخاص بك.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">
          <select id="stYear" style="padding:8px 12px;border:1px solid #cbd5e1;border-radius:6px"></select>
          <select id="stGroup" style="padding:8px 12px;border:1px solid #cbd5e1;border-radius:6px"></select>
        </div>
        <div style="overflow-x:auto">
          <table border="1" cellpadding="6" style="width:100%;border-collapse:collapse;border-color:#cbd5e1">
            <thead>
              <tr style="background:#f1f5f9">
                <th>الفترة</th>
                ${DAYS.map(d => `<th>${esc(d)}</th>`).join('')}
              </tr>
            </thead>
            <tbody id="stBody"></tbody>
          </table>
        </div>
      </div>
    `;

    const years = new Set();
    const groups = new Set();
    if (data && data.groups && Array.isArray(data.groups)) {
      data.groups.forEach(g => {
        if (g['الفرقة']) years.add(String(g['الفرقة']).trim());
        if (g['المجموعة']) groups.add(String(g['المجموعة']).trim());
      });
    }
    this.schedules.forEach(it => {
      const y = col(it, 'year');
      const g = col(it, 'group') || col(it, 'dept');
      if (y) years.add(y);
      if (g) groups.add(g);
    });

    const yList = sortYears([...years]);
    const gList = [...groups].sort((a, b) => a.localeCompare(b, 'ar', { numeric: true }));

    const ySel = document.getElementById('stYear');
    if (ySel) {
      ySel.innerHTML = '';
      yList.forEach(y => ySel.appendChild(new Option(y, y)));
      if (!this.year || !yList.includes(this.year)) this.year = yList[0] || '';
      ySel.value = this.year;
      ySel.onchange = () => {
        this.year = ySel.value;
        this.build();
      };
    }

    const gSel = document.getElementById('stGroup');
    if (gSel) {
      gSel.innerHTML = '<option value="">-- كل المجموعات --</option>';
      gList.forEach(g => gSel.appendChild(new Option(g, g)));
      if (!this.group || !gList.includes(this.group)) this.group = '';
      gSel.value = this.group;
      gSel.onchange = () => {
        this.group = gSel.value;
        this.build();
      };
    }

    this.build();
  }
  build() {
    const tbody = document.getElementById('stBody');
    if (!tbody) return;
    const items = this.schedules.filter(it => matchesFilter(it, { year: this.year, group: this.group }));
    renderGrid(tbody, items);
  }
}

export class App {
  constructor(container, api) {
    this.container = container;
    this.api = api;
  }

  async start() {
    injectStyles();
    this.container.innerHTML = `
      <div class="sada-shell">
        <div id="sadaBackdrop" class="sada-backdrop"></div>
        <aside id="sadaSidebar" class="sada-sidebar" aria-label="القائمة الرئيسية">
          <div class="sada-brand">
            <div class="sada-logo-wrap">${academyLogoSvg()}</div>
            <h1 class="sada-brand-title">أكاديمية السادات</h1>
            <p class="sada-brand-sub">نظام تنظيم الجداول الدراسية</p>
          </div>
          <nav class="sada-nav-list">
            <button id="navDashboard" class="sada-nav-btn" type="button">
              <span class="sada-nav-icon">📊</span>
              <span>الداش بورد</span>
            </button>
            <button id="navScheduler" class="sada-nav-btn" type="button">
              <span class="sada-nav-icon">🗓️</span>
              <span>1) منسق الجداول</span>
            </button>
            <button id="navDoctor" class="sada-nav-btn" type="button">
              <span class="sada-nav-icon">👨‍🏫</span>
              <span>2) دكتور / معيد</span>
            </button>
            <button id="navStudent" class="sada-nav-btn" type="button">
              <span class="sada-nav-icon">🎓</span>
              <span>3) طالب</span>
            </button>
          </nav>
          <div class="sada-sidebar-foot">أكاديمية السادات للعلوم الإدارية</div>
        </aside>

        <div class="sada-main">
          <header class="sada-mobile-bar">
            <div class="sada-mobile-brand">
              ${academyLogoSvg()}
              <span>أكاديمية السادات</span>
            </div>
            <button id="sadaMenuBtn" class="sada-mobile-toggle" type="button">☰ القائمة</button>
          </header>
          <main id="viewContainer" class="sada-content"></main>
        </div>
      </div>
    `;

    const sidebar = document.getElementById('sadaSidebar');
    const backdrop = document.getElementById('sadaBackdrop');
    const menuBtn = document.getElementById('sadaMenuBtn');

    const closeDrawer = () => {
      sidebar?.classList.remove('open');
      backdrop?.classList.remove('open');
    };

    if (menuBtn) {
      menuBtn.onclick = () => {
        sidebar?.classList.toggle('open');
        backdrop?.classList.toggle('open');
      };
    }
    if (backdrop) backdrop.onclick = closeDrawer;

    const bindNav = (id, viewName) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.onclick = () => {
          closeDrawer();
          this.switchView(viewName);
        };
      }
    };

    bindNav('navDashboard', 'dashboard');
    bindNav('navScheduler', 'scheduler');
    bindNav('navDoctor', 'doctor');
    bindNav('navStudent', 'student');

    if (typeof SheetChatBot === 'function') {
      try {
        const bot = new SheetChatBot(this.api);
        if (typeof bot.mount === 'function') bot.mount(document.body);
      } catch (e) {}
    }

    await this.switchView('dashboard');
  }

  async switchView(name) {
    const btns = {
      dashboard: 'navDashboard',
      scheduler: 'navScheduler',
      doctor: 'navDoctor',
      student: 'navStudent',
    };
    Object.entries(btns).forEach(([k, id]) => {
      const b = document.getElementById(id);
      if (b) b.classList.toggle('on', k === name);
    });

    const vc = document.getElementById('viewContainer');
    if (vc) {
      vc.innerHTML = '<div class="tt-loading">جاري التحميل...</div>';
      const views = {
        dashboard: DashboardView,
        scheduler: SchedulerView,
        doctor: DoctorView,
        student: StudentView,
      };
      const ViewClass = views[name] || DashboardView;
      const view = new ViewClass(this.api, target => this.switchView(target));
      await view.mount(vc);
    }
  }
}
