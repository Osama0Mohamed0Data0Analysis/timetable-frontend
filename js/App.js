import { SheetChatBot } from './components/SheetChatBot.js';
import { DashboardView } from './views/DashboardView.js';


const styleManager = new StyleManager({ sidebarWidth: '196px' });
styleManager.inject();
const drawer = styleManager.bindDrawer();

// داخل نقر أزرار التنقل:
drawer.close();



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
  building: ['building', '* المبنى', 'المبنى'],
  floor: ['floor', '* الدور', 'الدور'],
  type: ['type', '* النوع', 'النوع'],
  notes: ['notes', 'ملاحظات', 'ملاحظة'],
};

export const INSTRUCTOR_COLS = ['اسم الدكتور / المعيد *', 'اسم الدكتور / المعيد', 'الاسم', 'name', 'doctor'];

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

export const TABLE_HEAD = `
  <thead>
    <tr>
      <th>الفترة</th>
      ${DAYS.map(d => `<th>${d}</th>`).join('')}
    </tr>
  </thead>
`;

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
  if (!item) return '';
  const list = Array.isArray(keys) ? keys : [keys];
  const objKeys = Object.keys(item);
  for (const pk of list) {
    const npk = normAr(pk);
    for (const k of objKeys) {
      if (normAr(k) === npk) {
        const v = item[k];
        if (v !== undefined && v !== null && String(v).trim() !== '' && String(v).trim() !== 'NaN') {
          return String(v).trim();
        }
      }
    }
  }
  for (const pk of list) {
    const npk = normAr(pk);
    if (!npk) continue;
    for (const k of objKeys) {
      const nk = normAr(k);
      if (nk.includes(npk)) {
        if (npk.includes('ماده') && nk.includes('كود')) continue;
        const v = item[k];
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

export function toNum(v) {
  if (v === undefined || v === null) return 0;
  const n = parseFloat(normAr(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function pickArray(data, keys) {
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

export function slotLabel(item) {
  if (typeof item === 'number') {
    const h = item;
    const h1 = String(h).padStart(2, '0') + ':00';
    const h2 = String(h + 1).padStart(2, '0') + ':00';
    return `${h1} - ${h2}`;
  }
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

function compactLogoSvg(size = 28) {
  return `
    <svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true" style="display:block;flex-shrink:0">
      <circle cx="32" cy="32" r="29" fill="#0d2a5c" stroke="#f59e0b" stroke-width="2.5" />
      <path d="M14 26 L32 16 L50 26 L32 36 Z" fill="#fbbf24" />
      <path d="M21 31 V42 C21 45 26 48 32 48 C38 48 43 45 43 42 V31" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" />
      <line x1="50" y1="26" x2="50" y2="41" stroke="#fbbf24" stroke-width="2.6" stroke-linecap="round" />
      <circle cx="50" cy="43" r="2.5" fill="#fbbf24" />
    </svg>
  `;
}

export function injectStyles() {
  if (document.getElementById('sada-refined-layout-styles')) return;
  const st = document.createElement('style');
  st.id = 'sada-refined-layout-styles';
  st.textContent = `
    .sada-app-wrap{display:flex;flex-direction:row;width:100%;max-width:100%;min-height:100vh;direction:rtl;background:#f8fafc;color:#0f172a;margin:0;padding:0;font-size:13.5px;line-height:1.45;font-family:'IBM Plex Sans Arabic','Readex Pro',system-ui,-apple-system,sans-serif}
    .sada-side-slim{width:196px;min-width:196px;max-width:196px;background:linear-gradient(180deg,#081d40 0%,#0c2858 100%);color:#fff;display:flex;flex-direction:column;position:sticky;top:0;height:100vh;z-index:200;margin-right:0;flex-shrink:0;box-shadow:-2px 0 10px rgba(15,23,42,.08)}
    .sada-side-head{padding:11px 8px;border-bottom:1px solid rgba(255,255,255,.12);display:flex;flex-direction:column;align-items:center;text-align:center;gap:4px}
    .sada-side-name{margin:0;font-size:.86rem;font-weight:800;color:#fff;letter-spacing:0}
    .sada-side-desc{margin:0;font-size:.66rem;color:#cbd5e1}
    .sada-side-nav{padding:8px 6px;display:flex;flex-direction:column;gap:3px;flex:1;overflow-y:auto}
    .sada-side-btn{width:100%;display:flex;align-items:center;gap:6px;padding:7px 9px;border:none;border-radius:7px;background:transparent;color:#e2e8f0;font:inherit;font-size:.76rem;font-weight:700;cursor:pointer;text-align:right;transition:background .15s,color .15s}
    .sada-side-btn:hover{background:rgba(255,255,255,.1);color:#fff}
    .sada-side-btn.on{background:#2563eb;color:#fff;box-shadow:0 1px 4px rgba(37,99,235,.35)}
    .sada-page-body{flex:1;min-width:0;width:100%;padding:12px 14px 28px;box-sizing:border-box}
    .sada-mob-bar{display:none;align-items:center;justify-content:space-between;padding:7px 10px;background:#0c2858;color:#fff;position:sticky;top:0;z-index:150;border-radius:8px;margin-bottom:10px}
    .sada-mob-btn{background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.28);border-radius:6px;padding:4px 9px;font:inherit;font-size:.74rem;font-weight:700;cursor:pointer}
    .sada-backdrop{display:none;position:fixed;inset:0;background:rgba(15,23,42,.42);z-index:190}

    .dash-panel{display:flex;flex-direction:column;gap:10px}
    .dash-head-card{background:#fff;border:1px solid #e2e8f0;border-radius:9px;padding:10px 13px;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px}
    .dash-kpi-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}
    .dash-kpi-box{background:#fff;border:1px solid #e2e8f0;border-radius:9px;padding:9px 11px}
    .dash-kpi-t{font-size:.7rem;color:#64748b;font-weight:600}
    .dash-kpi-v{font-size:1.05rem;font-weight:800;color:#0f172a;margin-top:2px}
    .dash-kpi-s{font-size:.66rem;color:#475569;margin-top:2px}
    .dash-2col{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:10px}
    .dash-sec{background:#fff;border:1px solid #e2e8f0;border-radius:9px;padding:10px 12px}
    .dash-sec-t{margin:0 0 8px;font-size:.82rem;font-weight:800;color:#0f172a;border-bottom:1px solid #f1f5f9;padding-bottom:5px}
    .dash-bar{margin-bottom:6px}
    .dash-bar-l{display:flex;justify-content:space-between;font-size:.72rem;font-weight:600;color:#334155;margin-bottom:2px}
    .dash-bar-tr{height:5px;background:#e2e8f0;border-radius:999px;overflow:hidden}
    .dash-bar-fl{height:100%;background:#1d4ed8;border-radius:999px}
    .dash-table{width:100%;border-collapse:collapse;font-size:.72rem}
    .dash-table th,.dash-table td{border:1px solid #e2e8f0;padding:5px 7px;text-align:right}
    .dash-table th{background:#f8fafc;color:#334155;font-weight:700}

    .tt-loading{padding:22px;text-align:center;color:#0284c7;font-weight:700;font-size:.82rem}
    .tt-filters{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;background:#fff;padding:9px 11px;border-radius:9px;border:1px solid #e2e8f0;margin-bottom:10px}
    .tt-field{display:flex;flex-direction:column;gap:3px}
    .tt-field label{font-size:.7rem;font-weight:700;color:#334155}
    .tt-sel{padding:5px 8px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;font:inherit;font-size:.76rem}
    .tt-btn{padding:5px 10px;border:1px solid #cbd5e1;border-radius:7px;background:#f8fafc;color:#0f172a;font:inherit;font-size:.74rem;font-weight:700;cursor:pointer}
    .tt-btn.on{background:#162447;color:#fff;border-color:#162447}
    .tt-wrap{background:#fff;border:1px solid #e2e8f0;border-radius:9px;padding:9px;overflow-x:auto;-webkit-overflow-scrolling:touch}
    .tt-table{width:100%;border-collapse:collapse;text-align:center;min-width:740px}
    .tt-table th,.tt-table td{border:1px solid #e2e8f0;padding:5px 6px;vertical-align:top}
    .tt-table th{background:#f1f5f9;color:#334155;font-weight:700;font-size:.74rem}
    .tt-time{font-weight:700;background:#f8fafc;white-space:nowrap;color:#334155;font-size:.72rem}
    .tt-card{background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:5px 7px;margin-bottom:4px;text-align:right}
    .tt-card.sec{background:#fef3c7;border-color:#fcd34d}
    .tt-subj{font-weight:700;color:#0f172a;font-size:.76rem;line-height:1.3}
    .tt-meta{color:#475569;font-size:.68rem;margin-top:2px;line-height:1.3}
    .tt-note{background:#fff;border:1px solid #e2e8f0;border-radius:9px;padding:8px 11px;margin-bottom:10px;color:#475569;font-size:.76rem}

    @media (max-width: 860px){
      .sada-app-wrap{font-size:12.5px}
      .sada-mob-bar{display:flex}
      .sada-side-slim{width:186px;min-width:186px;max-width:186px;position:fixed;right:-196px;top:0;bottom:0;height:100vh;transition:right .2s ease}
      .sada-side-slim.open{right:0}
      .sada-backdrop.open{display:block}
      .sada-page-body{padding:8px 8px 24px}
      .dash-kpi-row{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
      .dash-2col{grid-template-columns:1fr;gap:8px}
      .tt-filters{gap:6px;padding:8px}
      .tt-field{flex:1 1 calc(50% - 6px);min-width:120px}
      .tt-sel{width:100%;font-size:.74rem}
      .tt-table{min-width:640px}
    }
  `;
  document.head.appendChild(st);
}

export function cardHtml(item, { showYear = false, doctorExtra = null } = {}) {
  const type = col(item, 'type');
  const doc = col(item, 'doctor');
  const ast = col(item, 'assistant');
  const isSection = type ? /سكشن|عملي|معمل|section|lab/i.test(type) : (Boolean(ast) && !doc);
  const subject = col(item, 'subject') || 'مادة';
  const hall = col(item, 'hall');
  const building = col(item, 'building');
  const floor = col(item, 'floor');
  const person = isSection ? (ast || doc) : (doc || ast);
  const label = isSection ? 'سكشن' : 'محاضرة';
  const yl = col(item, 'year');
  const dept = col(item, 'dept');
  const grp = col(item, 'group');
  let hallDetails = hall ? `قاعة: ${hall}` : '';
  if (building) {
    hallDetails += ` (${building}`;
    if (floor) hallDetails += `, ${floor})`;
    else hallDetails += ')';
  }
  return `
    <div class="tt-card ${isSection ? 'sec' : ''}">
      <div class="tt-subj">${esc(subject)}</div>
      <div class="tt-meta">${label}${hallDetails ? ' · ' + esc(hallDetails) : ''}</div>
      ${person ? `<div class="tt-meta">${esc(person)}</div>` : ''}
      ${showYear && yl ? `<div class="tt-meta">${esc(yl)}${grp ? ' - مجموعة ' + esc(grp) : (dept ? ' - ' + esc(dept) : '')}</div>` : ''}
      ${doctorExtra ? doctorExtra(item, subject) : ''}
    </div>
  `;
}

export function renderGrid(tbody, items, opts = {}) {
  if (!tbody) return;
  const slots = [9, 10, 11, 12, 13, 14];
  let simpleHtml = '';
  slots.forEach((h, slotIdx) => {
    simpleHtml += `<tr><td class="tt-time">${slotLabel(h)}</td>`;
    DAYS.forEach((day, dayIdx) => {
      const idx = slotIdx * DAYS.length + dayIdx;
      const it = items[idx];
      simpleHtml += `<td>${it ? cardHtml(it, opts) : ''}</td>`;
    });
    simpleHtml += '</tr>';
  });
  tbody.innerHTML = simpleHtml;
}

function barListHtml(entries) {
  if (!entries.length) return '<div style="color:#64748b;font-size:.72rem">لا توجد بيانات.</div>';
  const maxVal = Math.max(...entries.map(e => e.value), 1);
  return entries.map(e => {
    const pct = Math.min(100, Math.round((e.value / maxVal) * 100));
    return `
      <div class="dash-bar">
        <div class="dash-bar-l"><span>${esc(e.label)}</span><span>${e.value}</span></div>
        <div class="dash-bar-tr"><div class="dash-bar-fl" style="width:${pct}%"></div></div>
      </div>
    `;
  }).join('');
}

export { DashboardView };

export class SchedulerView {
  constructor(api) {
    this.api = api;
    this.schedules = [];
    this.requests = [];
    this.filters = { year: '', dept: '', group: '', instructor: '', hall: '' };
  }

  async mount(container) {
    container.innerHTML = `
      <div class="tt-filters">
        <div class="tt-field">
          <label>الفرقة الدراسية</label>
          <select id="selYear" class="tt-sel"><option value="">-- كل الفرق --</option></select>
        </div>
        <div class="tt-field">
          <label>القسم / الشعبة</label>
          <select id="selDept" class="tt-sel"><option value="">-- كل الأقسام --</option></select>
        </div>
        <div class="tt-field">
          <label>المجموعة</label>
          <select id="selGroup" class="tt-sel"><option value="">-- كل المجموعات --</option></select>
        </div>
        <div class="tt-field">
          <label>الدكتور / المعيد</label>
          <select id="selInstructor" class="tt-sel"><option value="">-- كل الدكاترة --</option></select>
        </div>
        <div class="tt-field">
          <label>القاعة / المدرج</label>
          <select id="selHall" class="tt-sel"><option value="">-- كل القاعات --</option></select>
        </div>
        <div style="display:flex;gap:6px;margin-right:auto;flex-wrap:wrap;">
          <button id="btnRefresh" class="tt-btn" type="button">تحديث</button>
          <button id="btnGenerate" class="tt-btn on" type="button">توليد الجدول</button>
        </div>
      </div>
      <div class="tt-wrap">
        <table class="tt-table">${TABLE_HEAD}<tbody id="schBody"></tbody></table>
      </div>
    `;

    await this.refresh();

    ['selYear', 'selDept', 'selGroup', 'selInstructor', 'selHall'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.onchange = () => {
          this.filters.year = document.getElementById('selYear')?.value || '';
          this.filters.dept = document.getElementById('selDept')?.value || '';
          this.filters.group = document.getElementById('selGroup')?.value || '';
          this.filters.instructor = document.getElementById('selInstructor')?.value || '';
          this.filters.hall = document.getElementById('selHall')?.value || '';
          this.build();
        };
      }
    });

    const ref = document.getElementById('btnRefresh');
    if (ref) ref.onclick = () => this.refresh(true);

    const gen = document.getElementById('btnGenerate');
    if (gen) gen.onclick = () => this.build();
  }

  async refresh(force = false) {
    const data = await loadData(this.api, force);
    this.schedules = schedulesOf(data);
    this.requests = data?.requests || [];

    const years = new Set();
    const depts = new Set();
    const groups = new Set();
    const insts = new Set();
    const halls = new Set();

    this.schedules.forEach(it => {
      if (col(it, 'year')) years.add(col(it, 'year'));
      if (col(it, 'dept')) depts.add(col(it, 'dept'));
      if (col(it, 'group')) groups.add(col(it, 'group'));
      splitNames(col(it, 'doctor')).forEach(n => insts.add(n));
      splitNames(col(it, 'assistant')).forEach(n => insts.add(n));
      if (col(it, 'hall')) halls.add(col(it, 'hall'));
    });

    const fill = (id, list, defLabel) => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const cur = sel.value;
      sel.innerHTML = `<option value="">${defLabel}</option>`;
      list.forEach(v => sel.appendChild(new Option(v, v)));
      if (cur && list.includes(cur)) sel.value = cur;
    };

    fill('selYear', sortYears([...years]), '-- كل الفرق --');
    fill('selDept', [...depts].sort((a, b) => a.localeCompare(b, 'ar')), '-- كل الأقسام --');
    fill('selGroup', [...groups].sort((a, b) => a.localeCompare(b, 'ar', { numeric: true })), '-- كل المجموعات --');
    fill('selInstructor', [...insts].sort((a, b) => a.localeCompare(b, 'ar')), '-- كل الدكاترة --');
    fill('selHall', [...halls].sort((a, b) => a.localeCompare(b, 'ar', { numeric: true })), '-- كل القاعات --');

    this.build();
  }

  build() {
    const tbody = document.getElementById('schBody');
    if (!tbody) return;
    const items = this.schedules.filter(it => matchesFilter(it, this.filters));
    renderGrid(tbody, items, { showYear: true });
  }
}

export class DoctorView {
  constructor(api) {
    this.api = api;
    this.schedules = [];
    this.requests = [];
    this.selected = '';
    this.reason = 'ظرف طارئ';
  }

  async mount(container) {
    container.innerHTML = `
      <div class="tt-note">وضع تجريبي: يمكنك اختيار اسم عضو هيئة التدريس لعرض جدوله وإرسال طلب اعتذار أو تعديل.</div>
      <div class="tt-filters">
        <div class="tt-field">
          <label for="docSelect">اختر اسمك</label>
          <select id="docSelect" class="tt-sel" style="min-width:210px"><option value="">-- اختر الدكتور --</option></select>
        </div>
        <div class="tt-field">
          <label for="reasonSelect">سبب الاعتذار</label>
          <select id="reasonSelect" class="tt-sel">
            <option>ظرف طارئ</option>
            <option>اعتذار عن المحاضرة</option>
            <option>تعديل موعد</option>
          </select>
        </div>
      </div>
      <div class="tt-wrap">
        <table class="tt-table">${TABLE_HEAD}<tbody id="docBody"></tbody></table>
      </div>
    `;

    const docSel = document.getElementById('docSelect');
    if (docSel) {
      docSel.onchange = e => {
        this.selected = e.target.value;
        this.build();
      };
    }
    const rSel = document.getElementById('reasonSelect');
    if (rSel) {
      rSel.onchange = e => {
        this.reason = e.target.value;
      };
    }

    await this.refresh();
  }

  async refresh(force = false) {
    const data = await loadData(this.api, force);
    this.schedules = schedulesOf(data);
    this.requests = data?.requests || [];

    const inst = new Set();
    (data?.instructors || []).forEach(f => {
      const n = getVal(f, INSTRUCTOR_COLS);
      if (n) inst.add(n);
    });
    this.schedules.forEach(it => {
      splitNames(col(it, 'doctor')).forEach(n => inst.add(n));
      splitNames(col(it, 'assistant')).forEach(n => inst.add(n));
    });

    const list = [...inst].sort((a, b) => a.localeCompare(b, 'ar'));
    const sel = document.getElementById('docSelect');
    if (sel) {
      sel.innerHTML = '<option value="">-- اختر الدكتور --</option>';
      list.forEach(n => sel.appendChild(new Option(n, n)));
      if (!this.selected && list.length) this.selected = list[0];
      sel.value = this.selected;
    }

    this.build();
  }

  build() {
    const tbody = document.getElementById('docBody');
    if (!tbody) return;
    const items = this.schedules.filter(it => matchesInstructor(it, this.selected));
    renderGrid(tbody, items, {
      showYear: true,
      doctorExtra: (it, subject) => `
        <div style="margin-top:4px">
          <button type="button" class="tt-btn doc-req-btn" data-subj="${esc(subject)}" style="padding:2px 7px;font-size:.68rem">اعتذار / تعديل</button>
        </div>
      `,
    });

    tbody.querySelectorAll('.doc-req-btn').forEach(btn => {
      btn.onclick = async () => {
        const subj = btn.getAttribute('data-subj') || 'مادة';
        if (typeof this.api?.sendAction === 'function') {
          await this.api.sendAction({
            action: 'addRequest',
            doctorName: this.selected,
            details: `طلب اعتذار/تعديل مادة ${subj}`,
            reason: this.reason,
          });
        } else if (typeof this.api?.sendDoctorRequest === 'function') {
          await this.api.sendDoctorRequest({
            doctorName: this.selected,
            message: `طلب اعتذار/تعديل مادة ${subj} (${this.reason})`,
            status: 'pending',
          });
        }
        alert('تم إرسال الطلب');
      };
    });
  }
}

export class StudentView {
  constructor(api) {
    this.api = api;
    this.schedules = [];
    this.groupRows = [];
    this.year = '';
    this.group = '';
  }

  async mount(container) {
    container.innerHTML = `
      <div class="tt-filters">
        <div class="tt-field">
          <label for="stYear">الفرقة الدراسية</label>
          <select id="stYear" class="tt-sel"></select>
        </div>
        <div class="tt-field">
          <label for="stGroup">المجموعة</label>
          <select id="stGroup" class="tt-sel"></select>
        </div>
      </div>
      <div class="tt-wrap">
        <table class="tt-table">${TABLE_HEAD}<tbody id="stBody"></tbody></table>
      </div>
    `;

    const ySel = document.getElementById('stYear');
    const gSel = document.getElementById('stGroup');
    if (ySel) {
      ySel.onchange = () => {
        this.year = ySel.value;
        this.fillGroups();
        this.build();
      };
    }
    if (gSel) {
      gSel.onchange = () => {
        this.group = gSel.value;
        this.build();
      };
    }

    await this.refresh();
  }

  async refresh(force = false) {
    const data = await loadData(this.api, force);
    this.schedules = schedulesOf(data);
    this.groupRows = pickArray(data, ['groups', 'الفرق والمجموعات']).map(g => ({
      year: getVal(g, ['الفرقة', 'yearLevel']),
      group: getVal(g, ['المجموعة', 'groupName']),
    }));

    const years = new Set();
    this.groupRows.forEach(r => {
      if (r.year) years.add(r.year);
    });
    this.schedules.forEach(it => {
      if (col(it, 'year')) years.add(col(it, 'year'));
    });

    const yList = sortYears([...years]);
    const ySel = document.getElementById('stYear');
    if (ySel) {
      ySel.innerHTML = '';
      yList.forEach(y => ySel.appendChild(new Option(y, y)));
      if (!this.year || !yList.includes(this.year)) this.year = yList[0] || '';
      ySel.value = this.year;
    }

    this.fillGroups();
    this.build();
  }

  fillGroups() {
    const gSel = document.getElementById('stGroup');
    if (!gSel) return;
    const groups = this.groupRows
      .filter(r => sameYear(r.year, this.year))
      .map(r => r.group)
      .filter(Boolean);
    const uniq = [...new Set(groups)].sort((a, b) => a.localeCompare(b, 'ar', { numeric: true }));
    gSel.innerHTML = '<option value="">-- كل المجموعات --</option>';
    uniq.forEach(g => gSel.appendChild(new Option(`${this.year} - مجموعة ${g}`, g)));
    if (!this.group || !uniq.includes(this.group)) this.group = '';
    gSel.value = this.group;
  }

  build() {
    const tbody = document.getElementById('stBody');
    if (!tbody) return;
    const items = this.schedules.filter(it => matchesGroup(it, this.year, this.group));
    renderGrid(tbody, items);
  }
}

export class App {
  constructor(container, api) {
    this.container = container;
    this.api = api;
    this.chatBot = null;
  }

  async start() {
    injectStyles();

    this.container.innerHTML = `
      <div class="sada-app-wrap">
        <div id="sadaBackdrop" class="sada-backdrop"></div>
        <aside id="sadaSideSlim" class="sada-side-slim">
          <div class="sada-side-head">
            <div>${compactLogoSvg(28)}</div>
            <h1 class="sada-side-name">أكاديمية السادات</h1>
            <p class="sada-side-desc">تنظيم الجداول الدراسية</p>
          </div>
          <nav class="sada-side-nav">
            <button id="navDashboard" class="sada-side-btn" type="button">📊 الداش بورد</button>
            <button id="navScheduler" class="sada-side-btn" type="button">🗓️ 1) منسق الجداول</button>
            <button id="navDoctor" class="sada-side-btn" type="button">👨‍🏫 2) دكتور / معيد</button>
            <button id="navStudent" class="sada-side-btn" type="button">🎓 3) طالب</button>
          </nav>
        </aside>
        <div class="sada-page-body">
          <div class="sada-mob-bar">
            <div style="display:flex;align-items:center;gap:6px;font-weight:800;font-size:.8rem">
              ${compactLogoSvg(22)}
              <span>أكاديمية السادات</span>
            </div>
            <button id="sadaMobBtn" class="sada-mob-btn" type="button">☰ القائمة</button>
          </div>
          <div id="viewContainer"></div>
        </div>
      </div>
    `;

    try {
      this.chatBot = new SheetChatBot(this.api);
      this.chatBot.mount?.(this.container);
    } catch (e) {}

    const side = document.getElementById('sadaSideSlim');
    const backdrop = document.getElementById('sadaBackdrop');
    const mobBtn = document.getElementById('sadaMobBtn');

    const closeDrawer = () => {
      side?.classList.remove('open');
      backdrop?.classList.remove('open');
    };

    if (mobBtn) {
      mobBtn.onclick = () => {
        side?.classList.toggle('open');
        backdrop?.classList.toggle('open');
      };
    }
    if (backdrop) backdrop.onclick = closeDrawer;

    const btns = {
      dashboard: 'navDashboard',
      scheduler: 'navScheduler',
      doctor: 'navDoctor',
      student: 'navStudent',
    };

    Object.entries(btns).forEach(([name, id]) => {
      const b = document.getElementById(id);
      if (b) {
        b.onclick = () => {
          closeDrawer();
          this.switchView(name);
        };
      }
    });

    await this.switchView('dashboard');
  }

  async switchView(name) {
    const views = {
      dashboard: DashboardView,
      scheduler: SchedulerView,
      doctor: DoctorView,
      student: StudentView,
    };
    const target = views[name] ? name : 'dashboard';

    const btns = {
      dashboard: 'navDashboard',
      scheduler: 'navScheduler',
      doctor: 'navDoctor',
      student: 'navStudent',
    };

    Object.entries(btns).forEach(([k, id]) => {
      const b = document.getElementById(id);
      if (b) b.classList.toggle('on', k === target);
    });

    const vc = document.getElementById('viewContainer');
    if (vc) {
      vc.innerHTML = '<div class="tt-loading">جاري التحميل...</div>';
      const ViewClass = views[target];
      const view = target === 'dashboard'
        ? new ViewClass(this.api, nextView => this.switchView(nextView))
        : new ViewClass(this.api);
      await view.mount(vc);
    }
  }
}
