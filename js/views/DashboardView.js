const FACULTY_ROLE_COLS = ['الدرجة الوظيفية *', 'الدرجة الوظيفية', 'role', 'title'];
const FACULTY_DEPT_COLS = ['القسم *', 'القسم', 'department'];
const INSTRUCTOR_COLS = ['اسم الدكتور / المعيد *', 'اسم الدكتور / المعيد', 'name'];
const ROOM_COLS = ['رقم القاعة', '* النوع', 'اسم القاعة', 'hall', 'room'];
const ROOM_TYPE_COLS = ['* النوع', 'النوع', 'type'];
const ROOM_CAP_COLS = ['* السعة (عدد الطلاب)', 'السعة (عدد الطلاب)', 'السعة', 'capacity'];
const CHART_COLORS = ['#1e3a8a', '#2563eb', '#0284c7', '#0d9488', '#15803d', '#d97706', '#b4600c', '#4f46e5', '#64748b'];

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

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

function toNum(v) {
  if (v === undefined || v === null) return 0;
  const cleaned = normAr(v).replace(/[^\d.-]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

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

function pickArray(data, candidates) {
  if (!data || typeof data !== 'object') return [];
  for (const key of candidates) {
    if (Array.isArray(data[key])) return data[key];
  }
  if (data.data && typeof data.data === 'object') {
    for (const key of candidates) {
      if (Array.isArray(data.data[key])) return data.data[key];
    }
  }
  return [];
}

function countMapEntries(map, sortFn = null) {
  const arr = [...map.entries()].map(([label, value]) => ({ label, value }));
  if (sortFn) return arr.sort(sortFn);
  return arr.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'ar'));
}

function hBarChartHtml(entries, filterGroup) {
  if (!entries.length) return '<div class="db-empty">لا توجد بيانات مطابقة.</div>';
  const maxVal = Math.max(...entries.map(e => e.value), 1);
  return `<div class="db-hbars">${entries.map(({ label, value }) => {
    const pct = Math.max(4, Math.round((value / maxVal) * 100));
    return `
      <div class="db-hbar db-click-item" data-group="${esc(filterGroup)}" data-label="${esc(label)}">
        <span class="db-hbar-lbl" title="${esc(label)}">${esc(label)}</span>
        <div class="db-hbar-track"><div class="db-hbar-fill" style="width:${pct}%"></div></div>
        <span class="db-hbar-val">${value}</span>
      </div>`;
  }).join('')}</div>`;
}

function vBarChartHtml(entries, filterGroup) {
  if (!entries.length) return '<div class="db-empty">لا توجد بيانات مطابقة.</div>';
  const maxVal = Math.max(...entries.map(e => e.value), 1);
  return `<div class="db-vbars">${entries.map(({ label, value }) => {
    const hPct = Math.max(8, Math.round((value / maxVal) * 100));
    return `
      <div class="db-vbar-col db-click-item" data-group="${esc(filterGroup)}" data-label="${esc(label)}" title="${esc(label)}: ${value}">
        <span class="db-vbar-cnt">${value}</span>
        <div class="db-vbar-rect" style="height:${hPct}%"></div>
        <span class="db-vbar-lbl">${esc(label)}</span>
      </div>`;
  }).join('')}</div>`;
}

function donutChartHtml(entries, filterGroup) {
  if (!entries.length) return '<div class="db-empty">لا توجد بيانات قاعات.</div>';
  const total = entries.reduce((acc, e) => acc + e.value, 0) || 1;
  let cum = 0;
  const stops = entries.map((e, i) => {
    const color = CHART_COLORS[i % CHART_COLORS.length];
    const start = (cum / total) * 360;
    cum += e.value;
    const end = (cum / total) * 360;
    return `${color} ${start.toFixed(1)}deg ${end.toFixed(1)}deg`;
  });

  const legend = entries.map((e, i) => {
    const color = CHART_COLORS[i % CHART_COLORS.length];
    const pct = Math.round((e.value / total) * 100);
    return `
      <div class="db-leg-item db-click-item" data-group="${esc(filterGroup)}" data-label="${esc(e.label)}">
        <span class="db-dot" style="background:${color}"></span>
        <span><b>${esc(e.label)}</b> (${e.value} · ${pct}%)</span>
      </div>`;
  }).join('');

  return `
    <div class="db-donut-wrap">
      <div style="width:148px;height:148px;border-radius:50%;background:conic-gradient(${stops.join(',')});position:relative;display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <div style="width:86px;height:86px;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <span style="font-weight:800;font-size:1.1rem;color:#0f172a">${total}</span>
          <span style="font-size:.7rem;color:#64748b">إجمالي</span>
        </div>
      </div>
      <div class="db-donut-legend">${legend}</div>
    </div>`;
}

export class DashboardView {
  constructor(api, onNavigate = null) {
    this.api = api;
    this.onNavigate = onNavigate;
    this.filters = { year: '', dept: '' };
    this.inspection = null;
  }

  injectDashboardStyles() {
    if (document.getElementById('db-view-styles')) return;
    const st = document.createElement('style');
    st.id = 'db-view-styles';
    st.textContent = `
      .db-banner{background:linear-gradient(135deg,#071b38 0%,#0f3566 100%);color:#fff;border-radius:12px;padding:18px 22px;margin-bottom:14px;border-bottom:4px solid #f59e0b;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
      .db-banner-title{margin:0;font-size:1.3rem;font-weight:800}
      .db-banner-sub{margin:4px 0 0;font-size:.86rem;color:#cbd5e1}
      .db-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;background:#fff;border:1px solid #dbe2ee;border-radius:10px;padding:12px 16px;margin-bottom:14px}
      .db-field{display:flex;flex-direction:column;gap:5px}
      .db-field label{font-weight:600;font-size:.84rem;color:#64748b}
      .db-sel{min-width:160px;padding:8px 12px;border:1.5px solid #dbe2ee;border-radius:8px;background:#fff;font:inherit;color:#162447}
      .db-btn{background:#fff;color:#162447;border:1.5px solid #162447;padding:8px 15px;border-radius:8px;cursor:pointer;font:inherit;font-weight:600}
      .db-btn.on{background:#162447;color:#fff}
      .db-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin-bottom:14px}
      .db-kpi{background:#fff;border:1px solid #dbe2ee;border-top:4px solid #2563eb;border-radius:10px;padding:16px;text-align:center;cursor:pointer}
      .db-kpi.g2{border-top-color:#10b981}.db-kpi.g3{border-top-color:#f59e0b}.db-kpi.g4{border-top-color:#8b5cf6}
      .db-kpi-lbl{font-size:.88rem;font-weight:700;color:#1e293b}
      .db-kpi-val{font-size:1.9rem;font-weight:800;margin:6px 0;color:#2563eb}
      .db-kpi.g2 .db-kpi-val{color:#059669}.db-kpi.g3 .db-kpi-val{color:#d97706}.db-kpi.g4 .db-kpi-val{color:#7c3aed}
      .db-kpi-sub{font-size:.78rem;color:#64748b;font-weight:600}
      .db-grid-3{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin-bottom:14px}
      .db-grid-2{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:14px;margin-bottom:14px}
      .db-card{background:#fff;border:1px solid #dbe2ee;border-radius:10px;padding:16px}
      .db-card-title{font-size:.96rem;font-weight:700;margin:0 0 12px;color:#0f172a;text-align:center}
      .db-hbars{display:flex;flex-direction:column;gap:10px}
      .db-hbar{display:grid;grid-template-columns:110px 1fr 34px;align-items:center;gap:8px;font-size:.82rem;cursor:pointer}
      .db-hbar-lbl{font-weight:600;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .db-hbar-track{height:18px;background:#f1f5f9;border-radius:4px;overflow:hidden}
      .db-hbar-fill{height:100%;background:#7da2d8;border-radius:4px}
      .db-hbar-val{font-weight:700;color:#1e293b;text-align:left}
      .db-vbars{display:flex;align-items:flex-end;justify-content:space-around;gap:8px;height:185px;padding:12px 6px 6px;border-bottom:1px solid #dbe2ee}
      .db-vbar-col{display:flex;flex-direction:column;align-items:center;flex:1;height:100%;justify-content:flex-end;cursor:pointer}
      .db-vbar-cnt{font-size:.75rem;font-weight:700;color:#334155;margin-bottom:4px}
      .db-vbar-rect{width:70%;max-width:34px;background:#7da2d8;border-radius:4px 4px 0 0;min-height:4px}
      .db-vbar-lbl{font-size:.72rem;color:#475569;margin-top:6px;text-align:center;line-height:1.2;max-height:2.4em;overflow:hidden}
      .db-donut-wrap{display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap;min-height:185px}
      .db-donut-legend{display:flex;flex-direction:column;gap:8px;font-size:.84rem}
      .db-leg-item{display:flex;align-items:center;gap:8px;cursor:pointer}
      .db-dot{width:11px;height:11px;border-radius:3px;flex-shrink:0}
      .db-inspector{background:#fff;border:1.5px solid #2563eb;border-radius:10px;padding:16px;margin-bottom:14px}
      .db-inspector-head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px}
      .db-inspector-title{margin:0;font-size:1rem;font-weight:700;color:#1e3a8a}
      .db-chip-list{display:flex;flex-wrap:wrap;gap:8px}
      .db-chip{background:#eff6ff;color:#1e3a8a;border:1px solid #bfdbfe;border-radius:8px;padding:6px 10px;font-size:.82rem;font-weight:600}
      .db-empty{font-size:.85rem;color:#64748b;text-align:center;padding:12px}
    `;
    document.head.appendChild(st);
  }

  async fetchSheetData(force = false) {
    const cached = localStorage.getItem('sheet_cache_data');
    const cachedTime = Number(localStorage.getItem('sheet_cache_time') || 0);
    const now = Date.now();
    if (!force && cached && now - cachedTime < 600000) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed) return parsed;
      } catch (_) {}
    }
    if (this.api && typeof this.api.getData === 'function') {
      const fresh = await this.api.getData();
      localStorage.setItem('sheet_cache_data', JSON.stringify(fresh));
      localStorage.setItem('sheet_cache_time', String(now));
      return fresh;
    }
    return cached ? JSON.parse(cached) : {};
  }

  matchItem(item) {
    const y = getVal(item, ['الفرقة *', 'الفرقة', 'yearLevel']);
    const d = getVal(item, ['الشعبة / القسم', 'القسم *', 'القسم', 'department']);
    if (this.filters.year && !sameYear(y, this.filters.year)) return false;
    if (this.filters.dept && !normAr(d).includes(normAr(this.filters.dept))) return false;
    return true;
  }

  async mount(container) {
    this.injectDashboardStyles();
    container.innerHTML = `
      <div class="db-banner">
        <div>
          <h2 class="db-banner-title">نظام إدارة الجداول الأكاديمية الذكي</h2>
          <p class="db-banner-sub">لوحة متابعة المواد الدراسية وأعضاء هيئة التدريس والقاعات</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button id="dbGoSch" class="db-btn on">عرض الجدول المفلتر</button>
          <button id="dbRefresh" class="db-btn">تحديث البيانات</button>
        </div>
      </div>

      <div class="db-toolbar">
        <div class="db-field">
          <label>الفرقة الدراسية</label>
          <select id="dbYear" class="db-sel"><option value="">-- كل الفرق --</option></select>
        </div>
        <div class="db-field">
          <label>القسم / الشعبة</label>
          <select id="dbDept" class="db-sel"><option value="">-- كل الأقسام --</option></select>
        </div>
        <button id="dbReset" class="db-btn" style="margin-right:auto">إعادة ضبط</button>
      </div>

      <div id="dbLoading" style="text-align:center;color:#0284c7;font-weight:700;padding:12px;display:none">جاري تحميل البيانات...</div>
      <div id="dbBody"></div>`;

    const ySel = document.getElementById('dbYear');
    const dSel = document.getElementById('dbDept');
    const rBtn = document.getElementById('dbRefresh');
    const rstBtn = document.getElementById('dbReset');
    const goBtn = document.getElementById('dbGoSch');

    if (ySel) ySel.onchange = e => { this.filters.year = e.target.value; this.inspection = null; this.render(false); };
    if (dSel) dSel.onchange = e => { this.filters.dept = e.target.value; this.inspection = null; this.render(false); };
    if (rBtn) rBtn.onclick = () => { this.inspection = null; this.render(true); };
    if (rstBtn) rstBtn.onclick = () => {
      this.filters = { year: '', dept: '' };
      this.inspection = null;
      if (ySel) ySel.value = '';
      if (dSel) dSel.value = '';
      this.render(false);
    };
    if (goBtn) goBtn.onclick = () => {
      if (this.onNavigate) this.onNavigate('scheduler', { ...this.filters });
    };

    await this.render(false);
  }

  populateFilters(data) {
    const schedules = Array.isArray(data) ? data : pickArray(data, ['schedules', 'schedule', 'الجداول']);
    const courses = pickArray(data, ['courses', 'subjects', 'المواد', 'المواد الدراسية']);
    const faculty = pickArray(data, ['instructors', 'faculty', 'doctors', 'أعضاء هيئة التدريس']);
    const years = new Set();
    const depts = new Set();

    [...courses, ...schedules].forEach(it => {
      const y = getVal(it, ['الفرقة *', 'الفرقة', 'yearLevel']);
      const d = getVal(it, ['الشعبة / القسم', 'القسم *', 'القسم', 'department']);
      if (y) years.add(y);
      if (d) depts.add(d);
    });
    faculty.forEach(f => {
      const d = getVal(f, FACULTY_DEPT_COLS);
      if (d) depts.add(d);
    });

    const ySel = document.getElementById('dbYear');
    const dSel = document.getElementById('dbDept');
    const yList = sortYears([...years]);
    const dList = [...depts].sort((a, b) => a.localeCompare(b, 'ar'));

    if (ySel) {
      ySel.innerHTML = '<option value="">-- كل الفرق --</option>';
      yList.forEach(y => ySel.appendChild(new Option(y, y)));
      ySel.value = this.filters.year && yList.includes(this.filters.year) ? this.filters.year : '';
    }
    if (dSel) {
      dSel.innerHTML = '<option value="">-- كل الأقسام --</option>';
      dList.forEach(d => dSel.appendChild(new Option(d, d)));
      dSel.value = this.filters.dept && dList.includes(this.filters.dept) ? this.filters.dept : '';
    }
  }

  async render(force = false) {
    const loading = document.getElementById('dbLoading');
    const body = document.getElementById('dbBody');
    if (loading) loading.style.display = 'block';

    let data;
    try {
      data = await this.fetchSheetData(force);
    } finally {
      if (loading) loading.style.display = 'none';
    }

    this.populateFilters(data);

    const schedules = Array.isArray(data) ? data : pickArray(data, ['schedules', 'schedule', 'الجداول']);
    const allCourses = pickArray(data, ['courses', 'subjects', 'المواد', 'المواد الدراسية']);
    const allRooms = pickArray(data, ['rooms', 'halls', 'القاعات', 'المدرجات والقاعات']);
    const allFaculty = pickArray(data, ['instructors', 'faculty', 'doctors', 'أعضاء هيئة التدريس']);

    const filteredCourses = allCourses.filter(c => this.matchItem(c));
    const filteredSchedules = schedules.filter(s => this.matchItem(s));
    const filteredFaculty = allFaculty.filter(f => {
      if (!this.filters.dept) return true;
      return normAr(getVal(f, FACULTY_DEPT_COLS)).includes(normAr(this.filters.dept));
    });

    const courseSource = filteredCourses.length ? filteredCourses : filteredSchedules;
    const uniqueSubjects = new Set(courseSource.map(c => getVal(c, ['اسم المادة *', 'اسم المادة', 'subject'])).filter(Boolean));
    const totalCourses = filteredCourses.length || uniqueSubjects.size;

    const facultyNames = new Set();
    filteredFaculty.forEach(f => {
      const n = getVal(f, INSTRUCTOR_COLS);
      if (n) facultyNames.add(n);
    });
    if (!filteredFaculty.length) {
      filteredSchedules.forEach(s => {
        splitNames(getVal(s, ['د. المحاضرة *', 'د. المحاضرة', 'doctor'])).forEach(n => facultyNames.add(n));
        splitNames(getVal(s, ['المعيدين / السكاشن', 'assistant'])).forEach(n => facultyNames.add(n));
      });
    }
    const totalFaculty = filteredFaculty.length || facultyNames.size;

    let totalCapacity = 0;
    const roomTypes = new Map();
    allRooms.forEach(r => {
      totalCapacity += toNum(getVal(r, ROOM_CAP_COLS));
      const rt = getVal(r, ROOM_TYPE_COLS) || 'غير محدد';
      roomTypes.set(rt, (roomTypes.get(rt) || 0) + 1);
    });

    const coursesByYear = new Map();
    const coursesByDept = new Map();
    courseSource.forEach(item => {
      const y = getVal(item, ['الفرقة *', 'الفرقة', 'yearLevel']) || 'غير محدد';
      const d = getVal(item, ['الشعبة / القسم', 'القسم *', 'القسم', 'department']) || 'عام';
      coursesByYear.set(y, (coursesByYear.get(y) || 0) + 1);
      coursesByDept.set(d, (coursesByDept.get(d) || 0) + 1);
    });

    const facultyByDept = new Map();
    const facultyByRole = new Map();
    filteredFaculty.forEach(f => {
      const fd = getVal(f, FACULTY_DEPT_COLS) || 'غير محدد';
      const fr = getVal(f, FACULTY_ROLE_COLS) || 'غير محدد';
      facultyByDept.set(fd, (facultyByDept.get(fd) || 0) + 1);
      facultyByRole.set(fr, (facultyByRole.get(fr) || 0) + 1);
    });

    const yearEntries = countMapEntries(coursesByYear, (a, b) => yearRank(b.label) - yearRank(a.label));
    const deptCourseEntries = countMapEntries(coursesByDept);
    const roomTypeEntries = countMapEntries(roomTypes);
    const facultyDeptEntries = countMapEntries(facultyByDept);
    const facultyRoleEntries = countMapEntries(facultyByRole);

    let inspectorHtml = '';
    if (this.inspection) {
      const { group, label } = this.inspection;
      let chips = [];
      if (group === 'courses') chips = [...uniqueSubjects].slice(0, 30).map(s => `مادة: ${s}`);
      else if (group === 'faculty') chips = [...facultyNames].slice(0, 30).map(n => `عضو: ${n}`);
      else if (group === 'rooms') chips = allRooms.slice(0, 30).map(r => `${getVal(r, ROOM_COLS) || 'مكان'} (${toNum(getVal(r, ROOM_CAP_COLS))} طالب)`);
      else if (group === 'capacity') chips = allRooms.slice(0, 25).map(r => `${getVal(r, ROOM_COLS) || 'قاعة'}: ${toNum(getVal(r, ROOM_CAP_COLS))} طالب`);
      else if (group === 'roomType') chips = allRooms.filter(r => (getVal(r, ROOM_TYPE_COLS) || 'غير محدد') === label).slice(0, 30).map(r => `${getVal(r, ROOM_COLS) || 'قاعة'} (${toNum(getVal(r, ROOM_CAP_COLS))} طالب)`);
      else if (group === 'facultyRole') chips = allFaculty.filter(f => (getVal(f, FACULTY_ROLE_COLS) || 'غير محدد') === label).slice(0, 30).map(f => getVal(f, INSTRUCTOR_COLS) || 'عضو');
      else if (group === 'courseYear') chips = courseSource.filter(c => (getVal(c, ['الفرقة *', 'الفرقة', 'yearLevel']) || 'غير محدد') === label).slice(0, 30).map(c => getVal(c, ['اسم المادة *', 'اسم المادة', 'subject']) || 'مادة');
      else if (group === 'facultyDept') chips = allFaculty.filter(f => (getVal(f, FACULTY_DEPT_COLS) || 'غير محدد') === label).slice(0, 30).map(f => getVal(f, INSTRUCTOR_COLS) || 'عضو');
      else if (group === 'courseDept') chips = courseSource.filter(c => (getVal(c, ['الشعبة / القسم', 'القسم *', 'القسم', 'department']) || 'عام') === label).slice(0, 30).map(c => getVal(c, ['اسم المادة *', 'اسم المادة', 'subject']) || 'مادة');

      inspectorHtml = `
        <div class="db-inspector">
          <div class="db-inspector-head">
            <h4 class="db-inspector-title">تفاصيل التحديد: ${esc(label)} (${chips.length})</h4>
            <button id="dbCloseInsp" class="db-btn" style="padding:4px 12px;font-size:.8rem">إغلاق</button>
          </div>
          <div class="db-chip-list">
            ${chips.length ? chips.map(ch => `<span class="db-chip">${esc(ch)}</span>`).join('') : '<span class="db-empty">لا توجد تفاصيل.</span>'}
          </div>
        </div>`;
    }

    if (!body) return;
    body.innerHTML = `
      <div class="db-kpis">
        <div class="db-kpi db-click-item" data-group="courses" data-label="إجمالي المواد الدراسية">
          <div class="db-kpi-lbl">إجمالي المواد الدراسية</div>
          <div class="db-kpi-val">${totalCourses}</div>
          <div class="db-kpi-sub">مادة مسجلة (${filteredSchedules.length} حصة بالجدول)</div>
        </div>
        <div class="db-kpi g2 db-click-item" data-group="faculty" data-label="أعضاء هيئة التدريس والمعيدون">
          <div class="db-kpi-lbl">أعضاء هيئة التدريس والمعيدون</div>
          <div class="db-kpi-val">${totalFaculty}</div>
          <div class="db-kpi-sub">دكتور ومعيد</div>
        </div>
        <div class="db-kpi g3 db-click-item" data-group="rooms" data-label="القاعات والمدرجات والمعامل">
          <div class="db-kpi-lbl">القاعات والمدرجات والمعامل</div>
          <div class="db-kpi-val">${allRooms.length}</div>
          <div class="db-kpi-sub">مكان للتدريس</div>
        </div>
        <div class="db-kpi g4 db-click-item" data-group="capacity" data-label="السعة الإجمالية للقاعات">
          <div class="db-kpi-lbl">السعة الإجمالية للقاعات</div>
          <div class="db-kpi-val">${totalCapacity.toLocaleString('en-US')}</div>
          <div class="db-kpi-sub">طالب</div>
        </div>
      </div>

      ${inspectorHtml}

      <div class="db-grid-3">
        <div class="db-card">
          <h3 class="db-card-title">Room Distribution</h3>
          ${donutChartHtml(roomTypeEntries, 'roomType')}
        </div>
        <div class="db-card">
          <h3 class="db-card-title">Faculty Distribution by Job Title</h3>
          ${hBarChartHtml(facultyRoleEntries, 'facultyRole')}
        </div>
        <div class="db-card">
          <h3 class="db-card-title">Number of Courses by Academic Year.</h3>
          ${hBarChartHtml(yearEntries, 'courseYear')}
        </div>
      </div>

      <div class="db-grid-2">
        <div class="db-card">
          <h3 class="db-card-title">Faculty Members by Department</h3>
          ${hBarChartHtml(facultyDeptEntries, 'facultyDept')}
        </div>
        <div class="db-card">
          <h3 class="db-card-title">Courses by Department</h3>
          ${vBarChartHtml(deptCourseEntries, 'courseDept')}
        </div>
      </div>`;

    const closeBtn = document.getElementById('dbCloseInsp');
    if (closeBtn) closeBtn.onclick = () => { this.inspection = null; this.render(false); };

    body.querySelectorAll('.db-click-item').forEach(el => {
      el.onclick = () => {
        const grp = el.dataset.group;
        const lbl = el.dataset.label;
        this.inspection = (this.inspection && this.inspection.group === grp && this.inspection.label === lbl)
          ? null
          : { group: grp, label: lbl };
        this.render(false);
      };
    });
  }
}
