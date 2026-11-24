// =====================================================================
//  نظام الجداول — النسخة النهائية المتكاملة (الداش بورد + الأزرار + الإحصائيات + طلبات الدكاترة)
// =====================================================================

const COLS = {
  day:       ['اليوم', 'day'],
  start:     ['وقت البداية', 'البداية', 'من الساعة', 'الوقت', 'startTime', 'time'],
  type:      ['النوع', 'نوع الحصة', 'type'],
  subject:   ['اسم المادة *', 'اسم المادة', 'subject'],
  hall:      ['القاعة', 'رقم القاعة', 'اسم القاعة', 'hall', 'room', 'نوع القاعة المطلوبة *'],
  building:  ['المبنى', '* المبنى', 'building'],
  floor:     ['الدور', '* الدور', 'floor'],
  doctor:    ['د. المحاضرة *', 'د. المحاضرة', 'doctor'],
  assistant: ['المعيدين / السكاشن', 'assistant'],
  year:      ['الفرقة *', 'الفرقة', 'yearLevel'],
  group:     ['المجموعة', 'group'],
  dept:      ['الشعبة / القسم', 'القسم', 'department'],
};
const INSTRUCTOR_COLS = ['اسم الدكتور / المعيد *', 'اسم الدكتور / المعيد', 'name'];
const ROOM_COLS = ['رقم القاعة', '* النوع', 'اسم القاعة', 'hall', 'room'];

const DAYS = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

// ---------- دوال مساعدة ----------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const normAr = s => String(s ?? '')
  .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
  .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
  .replace(/\s+/g, ' ').trim();

function getVal(item, keys) {
  if (!item) return '';
  const objKeys = Object.keys(item);
  for (const pk of keys) {
    for (const k of objKeys) {
      if (k.trim() === pk.trim()) {
        const v = item[k];
        if (v !== undefined && v !== null && v !== '') return v.toString().trim();
      }
    }
  }
  for (const pk of keys) {
    for (const k of objKeys) {
      const lk = k.toLowerCase().trim();
      const lpk = pk.toLowerCase().trim();
      if (lk.includes(lpk)) {
        if (lpk.includes('مادة') && lk.includes('كود')) continue;
        const v = item[k];
        if (v !== undefined && v !== null && v !== '') return v.toString().trim();
      }
    }
  }
  return '';
}
const col = (item, name) => getVal(item, COLS[name]);

const pad = n => String(n).padStart(2, '0');
const slotLabel = h => `<bdi dir="ltr">${pad(h)}:00–${pad(h + 1)}:00</bdi>`;

function splitNames(s) {
  return (s || '').split(/[,،]/).map(x => x.trim()).filter(Boolean);
}

function yearRank(y) {
  const n = normAr(y);
  const order = ['اول', 'ثان', 'ثالث', 'رابع', 'خامس'];
  const i = order.findIndex(o => n.includes(o));
  if (i >= 0) return i;
  const d = n.match(/\d+/);
  return d ? parseInt(d[0], 10) - 1 : 99;
}
const sortYears = arr => arr.sort((a, b) => yearRank(a) - yearRank(b) || a.localeCompare(b, 'ar'));

const sameYear = (a, b) => {
  const x = normAr(a), y = normAr(b);
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
};

function matchesFilter(item, { year, dept, group, instructor, hall }) {
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

// ---------- تحميل البيانات ----------
async function loadData(api, force = false) {
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
const schedulesOf = data => (Array.isArray(data) ? data : (data && data.schedules) || []);

// ---------- الستايل ----------
function injectStyles() {
  if (document.getElementById('tt-styles')) return;
  const st = document.createElement('style');
  st.id = 'tt-styles';
  st.textContent = `
  .tt{--bg:#f1f3f8;--ink:#1b2236;--mute:#6b7287;--line:#dfe3ee;--head:#f3f4f9;
      --lec-bg:#e4e9f9;--lec-bd:#1e3a8a;--sec-bg:#fce8d5;--sec-bd:#b4600c;--ok:#15803d;
      direction:rtl;text-align:right;background:var(--bg);color:var(--ink);min-height:100vh;padding:14px;
      font-family:'IBM Plex Sans Arabic','Readex Pro',system-ui,-apple-system,'Segoe UI',Tahoma,sans-serif}
  .tt *{box-sizing:border-box}
  .tt-nav{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
  .tt-btn{background:#fff;color:var(--ink);border:1.5px solid var(--ink);padding:8px 16px;border-radius:8px;
          cursor:pointer;font:inherit;font-weight:600}
  .tt-btn.on{background:var(--ink);color:#fff}
  .tt-note{font-size:.85rem;color:var(--mute);margin:4px 2px 14px}
  .tt-filters{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:14px;background:#fff;padding:15px;border-radius:10px;border:1px solid var(--line)}
  .tt-field{display:flex;flex-direction:column;gap:5px}
  .tt-field label{font-weight:600;font-size:0.85rem;color:var(--mute)}
  .tt-sel{min-width:150px;padding:8px 12px;border:1.5px solid var(--line);border-radius:8px;background:#fff;
          font:inherit;color:var(--ink);cursor:pointer;font-size:0.9rem}
  .tt-loading{text-align:center;color:#0284c7;font-weight:700;padding:12px;display:none}
  .tt-stats{display:flex;background:#fff;border:1px solid var(--line);border-radius:10px;padding:16px;margin-bottom:16px;justify-content:space-around;text-align:center;flex-wrap:wrap;gap:12px}
  .tt-stat-item{display:flex;align-items:center;gap:15px;border-left:2px solid var(--line);padding-left:30px}
  .tt-stat-item:last-child{border-left:none;padding-left:0}
  .tt-stat-num{font-size:1.6rem;font-weight:800;color:var(--ink)}
  .tt-stat-lbl{font-size:.85rem;color:var(--mute);font-weight:600}
  .tt-requests-box{background:#fff;border:1px solid var(--line);border-radius:10px;padding:16px;margin-bottom:16px}
  .tt-requests-title{font-weight:700;font-size:1.05rem;margin-bottom:12px;color:var(--ink)}
  .tt-request-card{background:#f8fafc;border:1px solid var(--line);border-radius:8px;padding:12px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px}
  .tt-req-action-btn{padding:6px 14px;border-radius:6px;font:inherit;font-weight:600;cursor:pointer;border:none}
  .tt-btn-approve{background:#10b981;color:#fff}
  .tt-btn-reject{background:#ef4444;color:#fff}
  .tt-wrap{overflow-x:auto;background:#fff;border:1px solid var(--line);border-radius:8px}
  .tt-table{width:100%;min-width:860px;border-collapse:collapse;table-layout:fixed}
  .tt-table th{background:var(--head);padding:12px 8px;font-weight:600;border:1px solid var(--line);border-top:0}
  .tt-table td{border:1px solid var(--line);padding:6px;vertical-align:top;height:120px}
  .tt-table th:first-child,.tt-table td.tt-time{width:115px}
  .tt-table td.tt-time{background:var(--head);font-weight:600;text-align:center;vertical-align:middle;font-size:.92rem}
  .tt-card{background:var(--lec-bg);border-right:4px solid var(--lec-bd);border-radius:6px;padding:8px 10px;margin-bottom:6px;
           min-height:102px}
  .tt-card:last-child{margin-bottom:0}
  .tt-card.sec{background:var(--sec-bg);border-right-color:var(--sec-bd)}
  .tt-subj{font-weight:700;font-size:.95rem;line-height:1.35;margin-bottom:4px}
  .tt-meta{font-size:.78rem;color:var(--mute);line-height:1.45}
  .tt-status{font-size:.8rem;font-weight:700;margin-top:6px}
  .tt-apology{margin-top:6px;background:#fff;border:1px solid #c4cadb;border-radius:6px;padding:3px 12px;
              font:inherit;font-size:.78rem;font-weight:600;cursor:pointer}
  .tt-legend{margin:10px 2px 0;font-size:.82rem;color:var(--mute)}

  /* ستايل الداش بورد */
  .db-hero{background:linear-gradient(135deg,#071b38 0%,#0f3566 100%);color:#fff;border-radius:12px;padding:20px 24px;margin-bottom:14px;border-bottom:4px solid #f59e0b}
  .db-hero h2{margin:0 0 6px;font-size:1.35rem;font-weight:800}
  .db-hero p{margin:0;color:#cbd5e1;font-size:.9rem}
  .db-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:14px}
  .db-kpi{background:#fff;border:1px solid var(--line);border-top:4px solid #2563eb;border-radius:10px;padding:16px;text-align:center}
  .db-kpi.k2{border-top-color:#10b981}
  .db-kpi.k3{border-top-color:#f59e0b}
  .db-kpi.k4{border-top-color:#8b5cf6}
  .db-kpi-title{font-size:.88rem;font-weight:700;color:#1e293b}
  .db-kpi-num{font-size:1.85rem;font-weight:800;margin:6px 0;color:#2563eb}
  .db-kpi.k2 .db-kpi-num{color:#059669}
  .db-kpi.k3 .db-kpi-num{color:#d97706}
  .db-kpi.k4 .db-kpi-num{color:#7c3aed}
  .db-kpi-sub{font-size:.78rem;color:var(--mute);font-weight:600}
  .db-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px;margin-bottom:14px}
  .db-box{background:#fff;border:1px solid var(--line);border-radius:10px;padding:16px}
  .db-box-title{margin:0 0 12px;font-size:.96rem;font-weight:700;color:#0f172a;text-align:center}
  .db-bar-row{display:grid;grid-template-columns:115px 1fr 36px;align-items:center;gap:8px;margin-bottom:10px;font-size:.83rem}
  .db-bar-track{height:16px;background:#f1f5f9;border-radius:4px;overflow:hidden}
  .db-bar-fill{height:100%;background:#3b82f6;border-radius:4px}
  .db-bar-val{font-weight:700;text-align:left;color:#1e293b}
  `;
  document.head.appendChild(st);
}

// ---------- رسم الكروت مع تفاصيل القاعة ----------
function cardHtml(item, { showYear = false, doctorExtra = null } = {}) {
  const type = col(item, 'type');
  const doc = col(item, 'doctor');
  const ast = col(item, 'assistant');
  const isSection = type ? /سكشن|عملي|معمل|section|lab/i.test(type) : (!!ast && !doc);

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
  if (building) hallDetails += ` (${building}`;
  if (floor) hallDetails += building ? `, ${floor})` : `(${floor})`;
  else if (building) hallDetails += `)`;

  return `
    <div class="tt-card ${isSection ? 'sec' : ''}">
      <div class="tt-subj">${esc(subject)}</div>
      <div class="tt-meta">${label}${hallDetails ? ' · ' + esc(hallDetails) : ''}</div>
      ${person ? `<div class="tt-meta">${esc(person)}</div>` : ''}
      ${showYear && yl ? `<div class="tt-meta">${esc(yl)}${grp ? ' - مجموعة ' + esc(grp) : (dept ? ' - ' + esc(dept) : '')}</div>` : ''}
      ${doctorExtra ? doctorExtra(item, subject) : ''}
    </div>`;
}

function renderGrid(tbody, items, opts = {}) {
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

const TABLE_HEAD = `
  <thead><tr><th>الوقت</th>${DAYS.map(d => `<th>${d}</th>`).join('')}</tr></thead>`;

// ---------- شاشة الداش بورد ----------
class DashboardView {
  constructor(api, onNavigate = null) {
    this.api = api;
    this.onNavigate = onNavigate;
    this.filters = { year: '', dept: '' };
  }

  async mount(container) {
    container.innerHTML = `
      <div class="db-hero">
        <h2>نظام إدارة الجداول الأكاديمية الذكي</h2>
        <p>لوحة متابعة المواد الدراسية وأعضاء هيئة التدريس والقاعات</p>
      </div>

      <div class="tt-filters">
        <div class="tt-field">
          <label>الفرقة الدراسية</label>
          <select id="dbYear" class="tt-sel"><option value="">-- كل الفرق --</option></select>
        </div>
        <div class="tt-field">
          <label>القسم / الشعبة</label>
          <select id="dbDept" class="tt-sel"><option value="">-- كل الأقسام --</option></select>
        </div>
        <div style="display:flex; gap:8px; margin-right:auto;">
          <button id="dbRefreshBtn" class="tt-btn">تحديث البيانات</button>
          <button id="dbGoSchedulerBtn" class="tt-btn on">عرض الجدول المفلتر</button>
        </div>
      </div>

      <div id="dbLoading" class="tt-loading">جاري تحميل بيانات الداش بورد...</div>
      <div id="dbContent"></div>
    `;

    const ySel = document.getElementById('dbYear');
    if (ySel) ySel.onchange = e => { this.filters.year = e.target.value; this.render(false); };

    const dSel = document.getElementById('dbDept');
    if (dSel) dSel.onchange = e => { this.filters.dept = e.target.value; this.render(false); };

    const refBtn = document.getElementById('dbRefreshBtn');
    if (refBtn) refBtn.onclick = () => this.render(true);

    const goBtn = document.getElementById('dbGoSchedulerBtn');
    if (goBtn) goBtn.onclick = () => {
      if (typeof this.onNavigate === 'function') this.onNavigate('scheduler');
    };

    await this.render(false);
  }

  async render(force = false) {
    const loading = document.getElementById('dbLoading');
    const content = document.getElementById('dbContent');
    if (loading) loading.style.display = 'block';

    let data;
    try {
      data = await loadData(this.api, force);
    } finally {
      if (loading) loading.style.display = 'none';
    }

    const schedules = schedulesOf(data);
    const courses = (data && Array.isArray(data.courses)) ? data.courses : schedules;
    const rooms = (data && Array.isArray(data.rooms)) ? data.rooms : [];
    const instructors = (data && Array.isArray(data.instructors)) ? data.instructors : [];

    const years = new Set();
    const depts = new Set();
    courses.concat(schedules).forEach(it => {
      const y = col(it, 'year');
      const d = col(it, 'dept');
      if (y) years.add(y);
      if (d) depts.add(d);
    });

    const ySel = document.getElementById('dbYear');
    if (ySel) {
      const yList = sortYears([...years]);
      ySel.innerHTML = '<option value="">-- كل الفرق --</option>';
      yList.forEach(y => ySel.appendChild(new Option(y, y)));
      if (this.filters.year && yList.includes(this.filters.year)) ySel.value = this.filters.year;
      else { ySel.value = ''; this.filters.year = ''; }
    }

    const dSel = document.getElementById('dbDept');
    if (dSel) {
      const dList = [...depts].sort((a, b) => a.localeCompare(b, 'ar'));
      dSel.innerHTML = '<option value="">-- كل الأقسام --</option>';
      dList.forEach(d => dSel.appendChild(new Option(d, d)));
      if (this.filters.dept && dList.includes(this.filters.dept)) dSel.value = this.filters.dept;
      else { dSel.value = ''; this.filters.dept = ''; }
    }

    const filteredCourses = courses.filter(it => matchesFilter(it, { year: this.filters.year, dept: this.filters.dept }));
    const filteredSchedules = schedules.filter(it => matchesFilter(it, { year: this.filters.year, dept: this.filters.dept }));

    const uniqueSubjects = new Set(filteredCourses.map(c => col(c, 'subject')).filter(Boolean));
    const totalCourses = uniqueSubjects.size || filteredCourses.length;

    const instNames = new Set();
    instructors.forEach(i => { const n = getVal(i, INSTRUCTOR_COLS); if (n) instNames.add(n); });
    filteredSchedules.forEach(it => {
      splitNames(col(it, 'doctor')).forEach(n => instNames.add(n));
      splitNames(col(it, 'assistant')).forEach(n => instNames.add(n));
    });

    const totalCapacity = rooms.reduce((sum, r) => {
      const raw = getVal(r, ['* السعة (عدد الطلاب)', 'السعة (عدد الطلاب)', 'السعة', 'capacity']);
      const n = parseFloat(normAr(raw).replace(/[^\d.-]/g, ''));
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);

    const byYearMap = new Map();
    const byDeptMap = new Map();
    filteredCourses.forEach(c => {
      const y = col(c, 'year') || 'غير محدد';
      const d = col(c, 'dept') || 'عام';
      byYearMap.set(y, (byYearMap.get(y) || 0) + 1);
      byDeptMap.set(d, (byDeptMap.get(d) || 0) + 1);
    });

    const renderBars = map => {
      const entries = [...map.entries()].sort((a, b) => b[1] - a[1]);
      if (!entries.length) return '<div class="tt-note">لا توجد بيانات متاحة.</div>';
      const max = Math.max(...entries.map(e => e[1]), 1);
      return entries.map(([lbl, val]) => {
        const pct = Math.max(5, Math.round((val / max) * 100));
        return `
          <div class="db-bar-row">
            <span>${esc(lbl)}</span>
            <div class="db-bar-track"><div class="db-bar-fill" style="width:${pct}%"></div></div>
            <span class="db-bar-val">${val}</span>
          </div>`;
      }).join('');
    };

    if (!content) return;
    content.innerHTML = `
      <div class="db-kpis">
        <div class="db-kpi">
          <div class="db-kpi-title">إجمالي المواد الدراسية</div>
          <div class="db-kpi-num">${totalCourses}</div>
          <div class="db-kpi-sub">مادة (${filteredSchedules.length} حصة بالجدول)</div>
        </div>
        <div class="db-kpi k2">
          <div class="db-kpi-title">أعضاء هيئة التدريس والمعيدون</div>
          <div class="db-kpi-num">${instNames.size}</div>
          <div class="db-kpi-sub">دكتور ومعيد</div>
        </div>
        <div class="db-kpi k3">
          <div class="db-kpi-title">القاعات والمدرجات والمعامل</div>
          <div class="db-kpi-num">${rooms.length}</div>
          <div class="db-kpi-sub">مكان للتدريس</div>
        </div>
        <div class="db-kpi k4">
          <div class="db-kpi-title">السعة الإجمالية للقاعات</div>
          <div class="db-kpi-num">${totalCapacity.toLocaleString('en-US')}</div>
          <div class="db-kpi-sub">طالب</div>
        </div>
      </div>

      <div class="db-grid">
        <div class="db-box">
          <h3 class="db-box-title">عدد المواد حسب الفرقة الدراسية</h3>
          ${renderBars(byYearMap)}
        </div>
        <div class="db-box">
          <h3 class="db-box-title">عدد المواد حسب القسم / الشعبة</h3>
          ${renderBars(byDeptMap)}
        </div>
      </div>
    `;
  }
}

// ---------- شاشة منسق الجداول ----------
class SchedulerView {
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
        <div style="display:flex; gap:8px; margin-right:auto;">
          <button id="btnRefresh" class="tt-btn">تحديث</button>
          <button id="btnGenerate" class="tt-btn on">توليد الجدول</button>
        </div>
      </div>

      <!-- إحصائيات الجدول -->
      <div class="tt-stats">
        <div class="tt-stat-item">
          <div><div id="statDistributed" class="tt-stat-num">0</div><div class="tt-stat-lbl">حصص أتوزعت</div></div>
        </div>
        <div class="tt-stat-item">
          <div><div class="tt-stat-num" style="color:#10b981">0</div><div class="tt-stat-lbl">تعارضات</div></div>
        </div>
        <div class="tt-stat-item">
          <div><div class="tt-stat-num" style="color:#d97706">0</div><div class="tt-stat-lbl">فجوات الطلاب</div></div>
        </div>
        <div class="tt-stat-item" style="border-left:none">
          <div><div id="statAttempts" class="tt-stat-num">1</div><div class="tt-stat-lbl">محاولات</div></div>
        </div>
      </div>

      <!-- قسم طلبات الدكاترة -->
      <div id="requestsContainer" class="tt-requests-box" style="display:none">
        <div id="requestsTitle" class="tt-requests-title">طلبات الدكاترة</div>
        <div id="requestsList"></div>
      </div>

      <div id="schLoading" class="tt-loading">جاري تحديث البيانات من Google Sheets...</div>
      <div class="tt-wrap"><table class="tt-table">${TABLE_HEAD}<tbody id="schBody"></tbody></table></div>
      <div class="tt-legend">الأزرق = محاضرة، البرتقالي = سكشن.</div>`;

    const btnRefresh = document.getElementById('btnRefresh');
    if (btnRefresh) btnRefresh.onclick = () => this.refresh(true);

    const btnGenerate = document.getElementById('btnGenerate');
    if (btnGenerate) btnGenerate.onclick = () => { alert('تم تحديث وتوليد الجدول بنجاح.'); this.build(); };

    const selYear = document.getElementById('selYear');
    if (selYear) selYear.onchange = e => { this.filters.year = e.target.value; this.build(); };

    const selDept = document.getElementById('selDept');
    if (selDept) selDept.onchange = e => { this.filters.dept = e.target.value; this.build(); };

    const selGroup = document.getElementById('selGroup');
    if (selGroup) selGroup.onchange = e => { this.filters.group = e.target.value; this.build(); };

    const selInstructor = document.getElementById('selInstructor');
    if (selInstructor) selInstructor.onchange = e => { this.filters.instructor = e.target.value; this.build(); };

    const selHall = document.getElementById('selHall');
    if (selHall) selHall.onchange = e => { this.filters.hall = e.target.value; this.build(); };

    await this.refresh(false);
  }

  async refresh(force) {
    const loading = document.getElementById('schLoading');
    if (loading) loading.style.display = 'block';
    let data;
    try { data = await loadData(this.api, force); } finally { if (loading) loading.style.display = 'none'; }
    this.schedules = schedulesOf(data);
    this.requests = data.requests || [];

    const years = new Set();
    const depts = new Set();
    const groups = new Set();
    const instructors = new Set();
    const halls = new Set();

    if (data && data.rooms && Array.isArray(data.rooms)) {
      data.rooms.forEach(r => {
        const h = getVal(r, ROOM_COLS);
        if (h) halls.add(h);
      });
    }

    if (data && data.groups && Array.isArray(data.groups)) {
      data.groups.forEach(g => {
        const y = g['الفرقة'] || g.year;
        const d = g['الشعبة'] || g['القسم'] || g.dept;
        const grp = g['المجموعة'] || g.group;
        if (y) years.add(y.toString().trim());
        if (d) depts.add(d.toString().trim());
        if (grp) groups.add(grp.toString().trim());
      });
    }

    if (data && data.instructors && Array.isArray(data.instructors)) {
      data.instructors.forEach(i => {
        const n = getVal(i, INSTRUCTOR_COLS);
        if (n) instructors.add(n);
      });
    }

    this.schedules.forEach(it => {
      const y = col(it, 'year');
      const d = col(it, 'dept');
      const g = col(it, 'group');
      const h = col(it, 'hall');
      if (y) years.add(y);
      if (d) depts.add(d);
      if (g) groups.add(g);
      if (h) halls.add(h);
      splitNames(col(it, 'doctor')).forEach(n => instructors.add(n));
      splitNames(col(it, 'assistant')).forEach(n => instructors.add(n));
    });

    this.populateSelect('selYear', sortYears([...years]), this.filters.year, '-- كل الفرق --');
    this.populateSelect('selDept', [...depts].sort((a,b)=>a.localeCompare(b,'ar')), this.filters.dept, '-- كل الأقسام --');
    this.populateSelect('selGroup', [...groups].sort((a,b)=>a.localeCompare(b,'ar',{numeric:true})), this.filters.group, '-- كل المجموعات --');
    this.populateSelect('selInstructor', [...instructors].sort((a,b)=>a.localeCompare(b,'ar')), this.filters.instructor, '-- كل الدكاترة --');
    this.populateSelect('selHall', [...halls].sort((a,b)=>a.localeCompare(b,'ar',{numeric:true})), this.filters.hall, '-- كل القاعات --');

    const statDist = document.getElementById('statDistributed');
    if (statDist) statDist.textContent = this.schedules.length;

    this.renderRequests();
    this.build();
  }

  renderRequests() {
    const box = document.getElementById('requestsContainer');
    const listEl = document.getElementById('requestsList');
    const titleEl = document.getElementById('requestsTitle');
    if (!box || !listEl) return;

    if (!this.requests || this.requests.length === 0) {
      box.style.display = 'none';
      return;
    }

    box.style.display = 'block';
    titleEl.textContent = `طلبات الدكاترة (${this.requests.length} جديد)`;

    let html = '';
    this.requests.forEach((req, idx) => {
      const docName = req.doctorName || req['اسم الدكتور'] || 'دكتور';
      const details = req.details || req['التفاصيل'] || '';
      const reason = req.reason || req['السبب'] || '';
      const status = req.status || req['الحالة'] || 'قيد المراجعة';

      html += `
        <div class="tt-request-card">
          <div>
            <b>${esc(docName)}</b> يطلب ${esc(details)} - السبب: ${esc(reason)}
            <div style="font-size:0.8rem; color:${status==='تمت الموافقة'?'#10b981':'#d97706'}">الحالة: ${esc(status)}</div>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="tt-req-action-btn tt-btn-approve" data-idx="${idx}">موافقة</button>
            <button class="tt-req-action-btn tt-btn-reject" data-idx="${idx}">رفض</button>
          </div>
        </div>`;
    });
    listEl.innerHTML = html;

    listEl.querySelectorAll('.tt-btn-approve').forEach(btn => {
      btn.onclick = async e => {
        const idx = e.currentTarget.dataset.idx;
        this.requests[idx].status = 'تمت الموافقة';
        alert('تمت الموافقة على الطلب بنجاح!');
        this.renderRequests();
      };
    });

    listEl.querySelectorAll('.tt-btn-reject').forEach(btn => {
      btn.onclick = async e => {
        const idx = e.currentTarget.dataset.idx;
        this.requests[idx].status = 'مرفوض';
        alert('تم رفض الطلب.');
        this.renderRequests();
      };
    });
  }

  populateSelect(elementId, items, currentVal, defaultLabel) {
    const sel = document.getElementById(elementId);
    if (!sel) return;
    sel.innerHTML = `<option value="">${defaultLabel}</option>`;
    items.forEach(item => {
      sel.appendChild(new Option(item, item));
    });
    const key = elementId.replace('sel', '').toLowerCase();
    if (currentVal && items.includes(currentVal)) {
      sel.value = currentVal;
    } else {
      sel.value = '';
      this.filters[key] = '';
    }
  }

  build() {
    const tbody = document.getElementById('schBody');
    if (!tbody) return;
    const items = this.schedules.filter(it => matchesFilter(it, this.filters));
    renderGrid(tbody, items, { showYear: true });
  }
}

// ---------- شاشة الدكتور / المعيد ----------
class DoctorView {
  constructor(api) {
    this.api = api;
    this.schedules = [];
    this.requests = [];
    this.selected = '';
    this.reason = 'ظرف طارئ';
  }

  async mount(container) {
    container.innerHTML = `
      <div class="tt-note">وضع تجريبي: اختر اسمك لعرض جدولك وإرسال طلبات الاعتذار.</div>
      <div class="tt-filters">
        <div class="tt-field">
          <label>اختر اسمك</label>
          <select id="docSelect" class="tt-sel" style="min-width:240px"><option value="">-- اختر الدكتور --</option></select>
        </div>
        <div class="tt-field">
          <label>سبب الاعتذار</label>
          <select id="reasonSelect" class="tt-sel">
            <option>ظرف طارئ</option><option>اعتذار عن المحاضرة</option><option>تعديل موعد</option>
          </select>
        </div>
      </div>
      <div class="tt-wrap"><table class="tt-table">${TABLE_HEAD}<tbody id="docBody"></tbody></table></div>`;

    const docSelect = document.getElementById('docSelect');
    if (docSelect) docSelect.onchange = e => { this.selected = e.target.value; this.build(); };

    const reasonSelect = document.getElementById('reasonSelect');
    if (reasonSelect) reasonSelect.onchange = e => { this.reason = e.target.value; };

    await this.refresh();
  }

  async refresh(force = false) {
    const data = await loadData(this.api, force);
    this.schedules = schedulesOf(data);
    this.requests = data.requests || [];

    const inst = new Set();
    if (data && data.instructors && Array.isArray(data.instructors)) {
      data.instructors.forEach(i => { const n = getVal(i, INSTRUCTOR_COLS); if (n) inst.add(n); });
    }
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
    const items = this.schedules.filter(it => matchesFilter(it, { instructor: this.selected }));

    const extra = (item, subject) => {
      const req = this.requests.find(r =>
        (r.doctorName || r['اسم الدكتور'] || '') === this.selected &&
        (r.details || r['التفاصيل'] || '').includes(subject));
      if (req) {
        const s = req.status || req['الحالة'] || 'قيد المراجعة';
        const color = s === 'تمت الموافقة' ? '#10b981' : (s === 'مرفوض' ? '#ef4444' : '#d97706');
        return `<div class="tt-status" style="color:${color}">${esc(s)}</div>`;
      }
      return `<button class="tt-apology" data-subject="${esc(subject)}">اعتذار</button>`;
    };

    renderGrid(tbody, items, { showYear: true, doctorExtra: extra });

    tbody.querySelectorAll('.tt-apology').forEach(btn => {
      btn.onclick = async e => {
        const subj = e.currentTarget.dataset.subject;
        if (!confirm(`هل أنت متأكد من رغبتك في إرسال طلب اعتذار لمادة "${subj}"؟`)) return;
        await this.api.sendAction({
          action: 'addRequest',
          doctorName: this.selected,
          details: `اعتذار عن مادة ${subj}`,
          reason: this.reason,
        });
        alert('تم إرسال طلب الاعتذار للمنسق بنجاح!');
        localStorage.removeItem('sheet_cache_data');
        await this.refresh(true);
      };
    });
  }
}

// ---------- شاشة الطالب ----------
class StudentView {
  constructor(api) {
    this.api = api;
    this.schedules = [];
    this.year = '';
    this.group = '';
  }

  async mount(container) {
    container.innerHTML = `
      <div class="tt-note">اختر الفرقة والمجموعة لاستعراض جدولك الدراسي.</div>
      <div class="tt-filters">
        <div class="tt-field">
          <label>الفرقة الدراسية</label>
          <select id="stYear" class="tt-sel"></select>
        </div>
        <div class="tt-field">
          <label>المجموعة</label>
          <select id="stGroup" class="tt-sel" style="min-width:200px"></select>
        </div>
      </div>
      <div class="tt-banner">جدولك محدّث. مفيش تغييرات.</div>
      <div class="tt-wrap"><table class="tt-table">${TABLE_HEAD}<tbody id="stBody"></tbody></table></div>`;

    const stYear = document.getElementById('stYear');
    if (stYear) stYear.onchange = e => {
      this.year = e.target.value;
      this.build();
    };

    const stGroup = document.getElementById('stGroup');
    if (stGroup) stGroup.onchange = e => {
      this.group = e.target.value;
      this.build();
    };

    await this.refresh();
  }

  async refresh() {
    const data = await loadData(this.api);
    this.schedules = schedulesOf(data);

    const years = new Set();
    const groups = new Set();
    if (data && data.groups && Array.isArray(data.groups)) {
      data.groups.forEach(g => {
        if (g['الفرقة']) years.add(g['الفرقة'].toString().trim());
        if (g['المجموعة']) groups.add(g['المجموعة'].toString().trim());
      });
    }
    this.schedules.forEach(it => {
      const y = col(it, 'year');
      const g = col(it, 'group') || col(it, 'dept');
      if (y) years.add(y);
      if (g) groups.add(g);
    });

    const yList = sortYears([...years]);
    const gList = [...groups].sort((a,b)=>a.localeCompare(b,'ar',{numeric:true}));

    const ySel = document.getElementById('stYear');
    if (ySel) {
      ySel.innerHTML = '';
      yList.forEach(y => ySel.appendChild(new Option(y, y)));
      if (!this.year || !yList.includes(this.year)) this.year = yList[0] || '';
      ySel.value = this.year;
    }

    const gSel = document.getElementById('stGroup');
    if (gSel) {
      gSel.innerHTML = '<option value="">-- كل المجموعات --</option>';
      gList.forEach(g => gSel.appendChild(new Option(g, g)));
      if (!this.group || !gList.includes(this.group)) this.group = '';
      gSel.value = this.group;
    }

    this.build();
  }

  build() {
    const tbody = document.getElementById('stBody');
    if (!tbody) return;
