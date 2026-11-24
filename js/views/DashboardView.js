const FACULTY_ROLE_COLS = ['الدرجة الوظيفية *', 'الدرجة الوظيفية', 'role', 'title'];
const FACULTY_DEPT_COLS = ['القسم *', 'القسم', 'department'];
const INSTRUCTOR_COLS = ['اسم الدكتور / المعيد *', 'اسم الدكتور / المعيد', 'name'];
const ROOM_COLS = ['رقم القاعة', '* النوع', 'اسم القاعة', 'hall', 'room'];
const ROOM_TYPE_COLS = ['* النوع', 'النوع', 'type'];
const ROOM_CAP_COLS = ['* السعة (عدد الطلاب)', 'السعة (عدد الطلاب)', 'السعة', 'capacity'];
const ROOM_BLDG_COLS = ['* المبنى', 'المبنى', 'building'];
const ROOM_FLOOR_COLS = ['* الدور', 'الدور', 'floor'];
const LEC_HRS_COLS = ['ساعات المحاضرة أسبوعياً *', 'ساعات المحاضرة أسبوعياً', 'ساعات المحاضرة'];
const SEC_HRS_COLS = ['ساعات السكشن أسبوعياً', 'ساعات السكاشن أسبوعياً', 'ساعات السكشن'];
const CHART_COLORS = ['#1e3a8a', '#2563eb', '#0284c7', '#0d9488', '#15803d', '#d97706', '#b4600c', '#4f46e5', '#64748b'];

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
    .trim();
}

function getVal(item, keys) {
  if (!item) return '';
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
      const lk = k.toLowerCase().trim();
      const lpk = pk.toLowerCase().trim();
      if (lk.indexOf(lpk) !== -1) {
        if (lpk.indexOf('مادة') !== -1 && lk.indexOf('كود') !== -1) continue;
        const v = item[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
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
  return String(s || '')
    .split(/[,،]/)
    .map(function (x) { return x.trim(); })
    .filter(Boolean);
}

function yearRank(y) {
  const n = normAr(y);
  const order = ['اول', 'ثان', 'ثالث', 'رابع', 'خامس'];
  const i = order.findIndex(function (o) { return n.indexOf(o) !== -1; });
  if (i >= 0) return i;
  const d = n.match(/\d+/);
  return d ? parseInt(d[0], 10) - 1 : 99;
}

function sortYears(arr) {
  return arr.sort(function (a, b) {
    return yearRank(a) - yearRank(b) || a.localeCompare(b, 'ar');
  });
}

function sameYear(a, b) {
  const x = normAr(a);
  const y = normAr(b);
  return Boolean(x && y && (x === y || x.indexOf(y) !== -1 || y.indexOf(x) !== -1));
}

function pickArray(data, candidates) {
  if (!data || typeof data !== 'object') return [];
  for (let i = 0; i < candidates.length; i++) {
    const key = candidates[i];
    if (Array.isArray(data[key])) return data[key];
  }
  if (data.data && typeof data.data === 'object') {
    for (let i = 0; i < candidates.length; i++) {
      const key = candidates[i];
      if (Array.isArray(data.data[key])) return data.data[key];
    }
  }
  return [];
}

function countMapEntries(map, sortFn) {
  const arr = Array.from(map.entries()).map(function (entry) {
    return { label: entry[0], value: entry[1] };
  });
  if (sortFn) return arr.sort(sortFn);
  return arr.sort(function (a, b) {
    return b.value - a.value || a.label.localeCompare(b.label, 'ar');
  });
}

function hBarChartHtml(entries, filterGroup) {
  if (!entries.length) return '<div class="db-empty">لا توجد بيانات مطابقة.</div>';
  const maxVal = Math.max.apply(null, entries.map(function (e) { return e.value; }).concat([1]));
  const rows = entries.map(function (item) {
    const pct = Math.max(4, Math.round((item.value / maxVal) * 100));
    return (
      '<div class="db-hbar db-click-item" data-group="' + esc(filterGroup) + '" data-label="' + esc(item.label) + '">' +
      '<span class="db-hbar-lbl" title="' + esc(item.label) + '">' + esc(item.label) + '</span>' +
      '<div class="db-hbar-track"><div class="db-hbar-fill" style="width:' + pct + '%"></div></div>' +
      '<span class="db-hbar-val">' + item.value + '</span>' +
      '</div>'
    );
  }).join('');
  return '<div class="db-hbars">' + rows + '</div>';
}

function vBarChartHtml(entries, filterGroup) {
  if (!entries.length) return '<div class="db-empty">لا توجد بيانات مطابقة.</div>';
  const maxVal = Math.max.apply(null, entries.map(function (e) { return e.value; }).concat([1]));
  const cols = entries.map(function (item) {
    const hPct = Math.max(8, Math.round((item.value / maxVal) * 100));
    return (
      '<div class="db-vbar-col db-click-item" data-group="' + esc(filterGroup) + '" data-label="' + esc(item.label) + '" title="' + esc(item.label) + ': ' + item.value + '">' +
      '<span class="db-vbar-cnt">' + item.value + '</span>' +
      '<div class="db-vbar-rect" style="height:' + hPct + '%"></div>' +
      '<span class="db-vbar-lbl">' + esc(item.label) + '</span>' +
      '</div>'
    );
  }).join('');
  return '<div class="db-vbars">' + cols + '</div>';
}

function donutChartHtml(entries, filterGroup) {
  if (!entries.length) return '<div class="db-empty">لا توجد بيانات قاعات.</div>';
  const total = entries.reduce(function (acc, e) { return acc + e.value; }, 0) || 1;
  let cum = 0;
  const stops = entries.map(function (e, i) {
    const color = CHART_COLORS[i % CHART_COLORS.length];
    const start = (cum / total) * 360;
    cum += e.value;
    const end = (cum / total) * 360;
    return color + ' ' + start.toFixed(1) + 'deg ' + end.toFixed(1) + 'deg';
  });

  const legend = entries.map(function (e, i) {
    const color = CHART_COLORS[i % CHART_COLORS.length];
    const pct = Math.round((e.value / total) * 100);
    return (
      '<div class="db-leg-item db-click-item" data-group="' + esc(filterGroup) + '" data-label="' + esc(e.label) + '">' +
      '<span class="db-dot" style="background:' + color + '"></span>' +
      '<span><b>' + esc(e.label) + '</b> (' + e.value + ' - ' + pct + '%)</span>' +
      '</div>'
    );
  }).join('');

  return (
    '<div class="db-donut-wrap">' +
    '<div style="width:148px;height:148px;border-radius:50%;background:conic-gradient(' + stops.join(',') + ');position:relative;display:flex;align-items:center;justify-content:center;flex-shrink:0">' +
    '<div style="width:86px;height:86px;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center">' +
    '<span style="font-weight:800;font-size:1.1rem;color:#0f172a">' + total + '</span>' +
    '<span style="font-size:.7rem;color:#64748b">إجمالي</span>' +
    '</div></div>' +
    '<div class="db-donut-legend">' + legend + '</div></div>'
  );
}

export class DashboardView {
  constructor(api, onNavigate) {
    this.api = api;
    this.onNavigate = onNavigate || null;
    this.filters = { year: '', dept: '' };
    this.inspection = null;
  }

  injectDashboardStyles() {
    if (document.getElementById('db-view-styles')) return;
    const st = document.createElement('style');
    st.id = 'db-view-styles';
    st.textContent = [
      '.db-banner{background:linear-gradient(135deg,#071b38 0%,#0f3566 100%);color:#fff;border-radius:12px;padding:18px 22px;margin-bottom:14px;border-bottom:4px solid #f59e0b;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}',
      '.db-banner-title{margin:0;font-size:1.3rem;font-weight:800}',
      '.db-banner-sub{margin:4px 0 0;font-size:.86rem;color:#cbd5e1}',
      '.db-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;background:#fff;border:1px solid #dbe2ee;border-radius:10px;padding:12px 16px;margin-bottom:14px}',
      '.db-field{display:flex;flex-direction:column;gap:5px}',
      '.db-field label{font-weight:600;font-size:.84rem;color:#64748b}',
      '.db-sel{min-width:160px;padding:8px 12px;border:1.5px solid #dbe2ee;border-radius:8px;background:#fff;font:inherit;color:#162447}',
      '.db-btn{background:#fff;color:#162447;border:1.5px solid #162447;padding:8px 15px;border-radius:8px;cursor:pointer;font:inherit;font-weight:600}',
      '.db-btn.on{background:#162447;color:#fff}',
      '.db-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:14px}',
      '.db-kpi{background:#fff;border:1px solid #dbe2ee;border-top:4px solid #2563eb;border-radius:10px;padding:16px;text-align:center;cursor:pointer}',
      '.db-kpi.g2{border-top-color:#10b981}.db-kpi.g3{border-top-color:#f59e0b}.db-kpi.g4{border-top-color:#8b5cf6}',
      '.db-kpi-lbl{font-size:.88rem;font-weight:700;color:#1e293b}',
      '.db-kpi-val{font-size:1.9rem;font-weight:800;margin:6px 0;color:#2563eb}',
      '.db-kpi.g2 .db-kpi-val{color:#059669}.db-kpi.g3 .db-kpi-val{color:#d97706}.db-kpi.g4 .db-kpi-val{color:#7c3aed}',
      '.db-kpi-sub{font-size:.78rem;color:#64748b;font-weight:600}',
      '.db-grid-3{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin-bottom:14px}',
      '.db-grid-2{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:14px;margin-bottom:14px}',
      '.db-card{background:#fff;border:1px solid #dbe2ee;border-radius:10px;padding:16px}',
      '.db-card-title{font-size:.96rem;font-weight:700;margin:0 0 12px;color:#0f172a;text-align:center}',
      '.db-hbars{display:flex;flex-direction:column;gap:10px}',
      '.db-hbar{display:grid;grid-template-columns:115px 1fr 36px;align-items:center;gap:8px;font-size:.82rem;cursor:pointer}',
      '.db-hbar-lbl{font-weight:600;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.db-hbar-track{height:18px;background:#f1f5f9;border-radius:4px;overflow:hidden}',
      '.db-hbar-fill{height:100%;background:#7da2d8;border-radius:4px}',
      '.db-hbar-val{font-weight:700;color:#1e293b;text-align:left}',
      '.db-vbars{display:flex;align-items:flex-end;justify-content:space-around;gap:8px;height:185px;padding:12px 6px 6px;border-bottom:1px solid #dbe2ee}',
      '.db-vbar-col{display:flex;flex-direction:column;align-items:center;flex:1;height:100%;justify-content:flex-end;cursor:pointer}',
      '.db-vbar-cnt{font-size:.75rem;font-weight:700;color:#334155;margin-bottom:4px}',
      '.db-vbar-rect{width:70%;max-width:34px;background:#7da2d8;border-radius:4px 4px 0 0;min-height:4px}',
      '.db-vbar-lbl{font-size:.72rem;color:#475569;margin-top:6px;text-align:center;line-height:1.2;max-height:2.4em;overflow:hidden}',
      '.db-donut-wrap{display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap;min-height:185px}',
      '.db-donut-legend{display:flex;flex-direction:column;gap:8px;font-size:.84rem}',
      '.db-leg-item{display:flex;align-items:center;gap:8px;cursor:pointer}',
      '.db-dot{width:11px;height:11px;border-radius:3px;flex-shrink:0}',
      '.db-inspector{background:#fff;border:1.5px solid #2563eb;border-radius:10px;padding:16px;margin-bottom:14px}',
      '.db-inspector-head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px}',
      '.db-inspector-title{margin:0;font-size:1rem;font-weight:700;color:#1e3a8a}',
      '.db-chip-list{display:flex;flex-wrap:wrap;gap:8px}',
      '.db-chip{background:#eff6ff;color:#1e3a8a;border:1px solid #bfdbfe;border-radius:8px;padding:6px 10px;font-size:.82rem;font-weight:600}',
      '.db-mini-list{display:flex;flex-direction:column;gap:8px}',
      '.db-mini-row{display:flex;justify-content:space-between;align-items:center;gap:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:.83rem}',
      '.db-note-item{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 12px;font-size:.82rem;color:#78350f;margin-bottom:8px}',
      '.db-note-item:last-child{margin-bottom:0}',
      '.db-empty{font-size:.85rem;color:#64748b;text-align:center;padding:12px}'
    ].join('');
    document.head.appendChild(st);
  }

  async fetchSheetData(force) {
    const shouldForce = Boolean(force);
    const cached = localStorage.getItem('sheet_cache_data');
    const cachedTime = Number(localStorage.getItem('sheet_cache_time') || 0);
    const now = Date.now();
    if (!shouldForce && cached && now - cachedTime < 600000) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed) return parsed;
      } catch (e) {}
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
    if (this.filters.dept && normAr(d).indexOf(normAr(this.filters.dept)) === -1) return false;
    return true;
  }

  async mount(container) {
    const self = this;
    this.injectDashboardStyles();
    container.innerHTML =
      '<div class="db-banner">' +
      '<div>' +
      '<h2 class="db-banner-title">نظام إدارة الجداول الأكاديمية الذكي</h2>' +
      '<p class="db-banner-sub">لوحة متابعة المواد الدراسية وأعضاء هيئة التدريس والقاعات والتحليلات الأكاديمية</p>' +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button id="dbGoSch" class="db-btn on">عرض الجدول المفلتر</button>' +
      '<button id="dbRefresh" class="db-btn">تحديث البيانات</button>' +
      '</div>' +
      '</div>' +
      '<div class="db-toolbar">' +
      '<div class="db-field">' +
      '<label>الفرقة الدراسية</label>' +
      '<select id="dbYear" class="db-sel"><option value="">-- كل الفرق --</option></select>' +
      '</div>' +
      '<div class="db-field">' +
      '<label>القسم / الشعبة</label>' +
      '<select id="dbDept" class="db-sel"><option value="">-- كل الأقسام --</option></select>' +
      '</div>' +
      '<button id="dbReset" class="db-btn" style="margin-right:auto">إعادة ضبط</button>' +
      '</div>' +
      '<div id="dbLoading" style="text-align:center;color:#0284c7;font-weight:700;padding:12px;display:none">جاري تحميل البيانات...</div>' +
      '<div id="dbBody"></div>';

    const ySel = document.getElementById('dbYear');
    const dSel = document.getElementById('dbDept');
    const rBtn = document.getElementById('dbRefresh');
    const rstBtn = document.getElementById('dbReset');
    const goBtn = document.getElementById('dbGoSch');

    if (ySel) {
      ySel.onchange = function (e) {
        self.filters.year = e.target.value;
        self.inspection = null;
        self.render(false);
      };
    }
    if (dSel) {
      dSel.onchange = function (e) {
        self.filters.dept = e.target.value;
        self.inspection = null;
        self.render(false);
      };
    }
    if (rBtn) {
      rBtn.onclick = function () {
        self.inspection = null;
        self.render(true);
      };
    }
    if (rstBtn) {
      rstBtn.onclick = function () {
        self.filters = { year: '', dept: '' };
        self.inspection = null;
        if (ySel) ySel.value = '';
        if (dSel) dSel.value = '';
        self.render(false);
      };
    }
    if (goBtn) {
      goBtn.onclick = function () {
        if (self.onNavigate) {
          self.onNavigate('scheduler', { year: self.filters.year, dept: self.filters.dept });
        }
      };
    }

    await this.render(false);
  }

  populateFilters(data) {
    const schedules = Array.isArray(data) ? data : pickArray(data, ['schedules', 'schedule', 'الجداول']);
    const courses = pickArray(data, ['courses', 'subjects', 'materials', 'المواد', 'المواد الدراسية']);
    const faculty = pickArray(data, ['instructors', 'faculty', 'doctors', 'أعضاء هيئة التدريس']);
    const years = new Set();
    const depts = new Set();

    courses.concat(schedules).forEach(function (it) {
      const y = getVal(it, ['الفرقة *', 'الفرقة', 'yearLevel']);
      const d = getVal(it, ['الشعبة / القسم', 'القسم *', 'القسم', 'department']);
      if (y) years.add(y);
      if (d) depts.add(d);
    });
    faculty.forEach(function (f) {
      const d = getVal(f, FACULTY_DEPT_COLS);
      if (d) depts.add(d);
    });

    const ySel = document.getElementById('dbYear');
    const dSel = document.getElementById('dbDept');
    const yList = sortYears(Array.from(years));
    const dList = Array.from(depts).sort(function (a, b) { return a.localeCompare(b, 'ar'); });

    if (ySel) {
      ySel.innerHTML = '<option value="">-- كل الفرق --</option>';
      yList.forEach(function (y) { ySel.appendChild(new Option(y, y)); });
      ySel.value = this.filters.year && yList.indexOf(this.filters.year) !== -1 ? this.filters.year : '';
    }
    if (dSel) {
      dSel.innerHTML = '<option value="">-- كل الأقسام --</option>';
      dList.forEach(function (d) { dSel.appendChild(new Option(d, d)); });
      dSel.value = this.filters.dept && dList.indexOf(this.filters.dept) !== -1 ? this.filters.dept : '';
    }
  }

  async render(force) {
    const self = this;
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
    const allCourses = pickArray(data, ['courses', 'subjects', 'materials', 'المواد', 'المواد الدراسية']);
    const allRooms = pickArray(data, ['rooms', 'halls', 'القاعات', 'المدرجات والقاعات']);
    const allFaculty = pickArray(data, ['instructors', 'faculty', 'doctors', 'أعضاء هيئة التدريس']);
    const allGroups = pickArray(data, ['groups', 'الفرق والمجموعات']);
    const allPeriods = pickArray(data, ['periods', 'timeSlots', 'الفترات الزمنية']);
    const allRules = pickArray(data, ['rules', 'قواعد الكلية']);
    const allNotes = pickArray(data, ['notes', 'reviewNotes', 'ملاحظات المراجعة']);

    const filteredCourses = allCourses.filter(function (c) { return self.matchItem(c); });
    const filteredSchedules = schedules.filter(function (s) { return self.matchItem(s); });
    const filteredFaculty = allFaculty.filter(function (f) {
      if (!self.filters.dept) return true;
      return normAr(getVal(f, FACULTY_DEPT_COLS)).indexOf(normAr(self.filters.dept)) !== -1;
    });

    const courseSource = filteredCourses.length ? filteredCourses : filteredSchedules;
    const uniqueSubjects = new Set(
      courseSource
        .map(function (c) { return getVal(c, ['اسم المادة *', 'اسم المادة', 'subject']); })
        .filter(Boolean)
    );
    const totalCourseRows = courseSource.length;

    const facultyNames = new Set();
    filteredFaculty.forEach(function (f) {
      const n = getVal(f, INSTRUCTOR_COLS);
      if (n) facultyNames.add(n);
    });
    if (!filteredFaculty.length) {
      filteredSchedules.forEach(function (s) {
        splitNames(getVal(s, ['د. المحاضرة *', 'د. المحاضرة', 'doctor'])).forEach(function (n) { facultyNames.add(n); });
        splitNames(getVal(s, ['المعيدين / السكاشن', 'assistant'])).forEach(function (n) { facultyNames.add(n); });
      });
    }
    const totalFaculty = filteredFaculty.length || facultyNames.size;

    let totalCapacity = 0;
    const roomTypes = new Map();
    const roomsByBuilding = new Map();
    const roomsByFloor = new Map();
    allRooms.forEach(function (r) {
      totalCapacity += toNum(getVal(r, ROOM_CAP_COLS));
      const rt = getVal(r, ROOM_TYPE_COLS) || 'غير محدد';
      const bldg = getVal(r, ROOM_BLDG_COLS) || 'غير محدد';
      const flr = getVal(r, ROOM_FLOOR_COLS) || 'غير محدد';
      roomTypes.set(rt, (roomTypes.get(rt) || 0) + 1);
      roomsByBuilding.set(bldg, (roomsByBuilding.get(bldg) || 0) + 1);
      roomsByFloor.set(flr, (roomsByFloor.get(flr) || 0) + 1);
    });

    let totalLecHours = 0;
    let totalSecHours = 0;
    let missingSectionCount = 0;
    const coursesByYear = new Map();
    const coursesByDept = new Map();
    courseSource.forEach(function (item) {
      const y = getVal(item, ['الفرقة *', 'الفرقة', 'yearLevel']) || 'غير محدد';
      const d = getVal(item, ['الشعبة / القسم', 'القسم *', 'القسم', 'department']) || 'عام';
      const lh = toNum(getVal(item, LEC_HRS_COLS));
      const sh = toNum(getVal(item, SEC_HRS_COLS));
      totalLecHours += lh;
      totalSecHours += sh;
      if (sh <= 0 && !getVal(item, ['المعيدين / السكاشن', 'assistant'])) {
        missingSectionCount += 1;
      }
      coursesByYear.set(y, (coursesByYear.get(y) || 0) + 1);
      coursesByDept.set(d, (coursesByDept.get(d) || 0) + 1);
    });

    const facultyByDept = new Map();
    const facultyByRole = new Map();
    filteredFaculty.forEach(function (f) {
      const fd = getVal(f, FACULTY_DEPT_COLS) || 'غير محدد';
      const fr = getVal(f, FACULTY_ROLE_COLS) || 'غير محدد';
      facultyByDept.set(fd, (facultyByDept.get(fd) || 0) + 1);
      facultyByRole.set(fr, (facultyByRole.get(fr) || 0) + 1);
    });

    const yearEntries = countMapEntries(coursesByYear, function (a, b) {
      return yearRank(b.label) - yearRank(a.label);
    });
    const deptCourseEntries = countMapEntries(coursesByDept);
    const roomTypeEntries = countMapEntries(roomTypes);
    const facultyDeptEntries = countMapEntries(facultyByDept);
    const facultyRoleEntries = countMapEntries(facultyByRole);
    const buildingEntries = countMapEntries(roomsByBuilding);
    const floorEntries = countMapEntries(roomsByFloor);

    let inspectorHtml = '';
    if (this.inspection) {
      const group = this.inspection.group;
      const label = this.inspection.label;
      let chips = [];
      if (group === 'courses') {
        chips = Array.from(uniqueSubjects).slice(0, 30).map(function (s) { return 'مادة: ' + s; });
      } else if (group === 'faculty') {
        chips = Array.from(facultyNames).slice(0, 30).map(function (n) { return 'عضو: ' + n; });
      } else if (group === 'rooms') {
        chips = allRooms.slice(0, 30).map(function (r) {
          return (getVal(r, ROOM_COLS) || 'مكان') + ' (' + toNum(getVal(r, ROOM_CAP_COLS)) + ' طالب)';
        });
      } else if (group === 'capacity') {
        chips = allRooms.slice(0, 25).map(function (r) {
          return (getVal(r, ROOM_COLS) || 'قاعة') + ': ' + toNum(getVal(r, ROOM_CAP_COLS)) + ' طالب';
        });
      } else if (group === 'roomType') {
        chips = allRooms.filter(function (r) { return (getVal(r, ROOM_TYPE_COLS) || 'غير محدد') === label; }).slice(0, 30).map(function (r) {
          return (getVal(r, ROOM_COLS) || 'قاعة') + ' (' + toNum(getVal(r, ROOM_CAP_COLS)) + ' طالب)';
        });
      } else if (group === 'facultyRole') {
        chips = allFaculty.filter(function (f) { return (getVal(f, FACULTY_ROLE_COLS) || 'غير محدد') === label; }).slice(0, 30).map(function (f) {
          return getVal(f, INSTRUCTOR_COLS) || 'عضو';
        });
      } else if (group === 'courseYear') {
        chips = courseSource.filter(function (c) { return (getVal(c, ['الفرقة *', 'الفرقة', 'yearLevel']) || 'غير محدد') === label; }).slice(0, 30).map(function (c) {
          return getVal(c, ['اسم المادة *', 'اسم المادة', 'subject']) || 'مادة';
        });
      } else if (group === 'facultyDept') {
        chips = allFaculty.filter(function (f) { return (getVal(f, FACULTY_DEPT_COLS) || 'غير محدد') === label; }).slice(0, 30).map(function (f) {
          return getVal(f, INSTRUCTOR_COLS) || 'عضو';
        });
      } else if (group === 'courseDept') {
        chips = courseSource.filter(function (c) { return (getVal(c, ['الشعبة / القسم', 'القسم *', 'القسم', 'department']) || 'عام') === label; }).slice(0, 30).map(function (c) {
          return getVal(c, ['اسم المادة *', 'اسم المادة', 'subject']) || 'مادة';
        });
      } else if (group === 'building') {
        chips = allRooms.filter(function (r) { return (getVal(r, ROOM_BLDG_COLS) || 'غير محدد') === label; }).slice(0, 30).map(function (r) {
          return (getVal(r, ROOM_COLS) || 'قاعة') + ' (' + (getVal(r, ROOM_FLOOR_COLS) || 'دور') + ')';
        });
      }

      inspectorHtml =
        '<div class="db-inspector">' +
        '<div class="db-inspector-head">' +
        '<h4 class="db-inspector-title">تفاصيل التحديد: ' + esc(label) + ' (' + chips.length + ')</h4>' +
        '<button id="dbCloseInsp" class="db-btn" style="padding:4px 12px;font-size:.8rem">إغلاق</button>' +
        '</div>' +
        '<div class="db-chip-list">' +
        (chips.length ? chips.map(function (ch) { return '<span class="db-chip">' + esc(ch) + '</span>'; }).join('') : '<span class="db-empty">لا توجد تفاصيل.</span>') +
        '</div></div>';
    }

    const rulesHtml = allRules.length
      ? '<div class="db-mini-list">' + allRules.slice(0, 6).map(function (item) {
          const k = getVal(item, ['البند', 'item']) || 'بند';
          const v = getVal(item, ['القيمة', 'value']) || '-';
          return '<div class="db-mini-row"><span><b>' + esc(k) + '</b></span><span>' + esc(v) + '</span></div>';
        }).join('') + '</div>'
      : '<div class="db-empty">لا توجد قواعد مسجلة في الشيت.</div>';

    const notesHtml = allNotes.length
      ? allNotes.slice(0, 5).map(function (n) {
          const topic = getVal(n, ['الموضوع', 'topic']) || 'ملاحظة';
          const det = getVal(n, ['التفاصيل', 'details']) || '';
          return '<div class="db-note-item"><b>' + esc(topic) + ':</b> ' + esc(det) + '</div>';
        }).join('')
      : '<div class="db-empty">لا توجد ملاحظات مراجعة مسجلة.</div>';

    if (!body) return;
    body.innerHTML =
      '<div class="db-kpis">' +
      '<div class="db-kpi db-click-item" data-group="courses" data-label="إجمالي المواد الدراسية">' +
      '<div class="db-kpi-lbl">إجمالي المواد الدراسية</div>' +
      '<div class="db-kpi-val">' + totalCourseRows + '</div>' +
      '<div class="db-kpi-sub">' + uniqueSubjects.size + ' مادة فريدة (' + filteredSchedules.length + ' حصة بالجدول)</div>' +
      '</div>' +
      '<div class="db-kpi g2 db-click-item" data-group="faculty" data-label="أعضاء هيئة التدريس والمعيدون">' +
      '<div class="db-kpi-lbl">أعضاء هيئة التدريس والمعيدون</div>' +
      '<div class="db-kpi-val">' + totalFaculty + '</div>' +
      '<div class="db-kpi-sub">دكتور ومعيد ومدرس مساعد</div>' +
      '</div>' +
      '<div class="db-kpi g3 db-click-item" data-group="rooms" data-label="القاعات والمدرجات والمعامل">' +
      '<div class="db-kpi-lbl">القاعات والمدرجات والمعامل</div>' +
      '<div class="db-kpi-val">' + allRooms.length + '</div>' +
      '<div class="db-kpi-sub">' + buildingEntries.length + ' مبنى · ' + floorEntries.length + ' أدوار</div>' +
      '</div>' +
      '<div class="db-kpi g4 db-click-item" data-group="capacity" data-label="السعة الإجمالية للقاعات">' +
      '<div class="db-kpi-lbl">السعة الإجمالية للقاعات</div>' +
      '<div class="db-kpi-val">' + totalCapacity.toLocaleString('en-US') + '</div>' +
      '<div class="db-kpi-sub">طالب (' + allGroups.length + ' مجموعة · ' + allPeriods.length + ' فترة)</div>' +
      '</div>' +
      '</div>' +
      inspectorHtml +
      '<div class="db-grid-3">' +
      '<div class="db-card"><h3 class="db-card-title">Room Distribution</h3>' + donutChartHtml(roomTypeEntries, 'roomType') + '</div>' +
      '<div class="db-card"><h3 class="db-card-title">Faculty Distribution by Job Title</h3>' + hBarChartHtml(facultyRoleEntries, 'facultyRole') + '</div>' +
      '<div class="db-card"><h3 class="db-card-title">Number of Courses by Academic Year.</h3>' + hBarChartHtml(yearEntries, 'courseYear') + '</div>' +
      '</div>' +
      '<div class="db-grid-2">' +
      '<div class="db-card"><h3 class="db-card-title">Faculty Members by Department</h3>' + hBarChartHtml(facultyDeptEntries, 'facultyDept') + '</div>' +
      '<div class="db-card"><h3 class="db-card-title">Courses by Department</h3>' + vBarChartHtml(deptCourseEntries, 'courseDept') + '</div>' +
      '</div>' +
      '<div class="db-grid-3">' +
      '<div class="db-card"><h3 class="db-card-title">تحليل الساعات الأسبوعية والمؤشرات</h3>' +
      '<div class="db-mini-list">' +
      '<div class="db-mini-row"><span>إجمالي ساعات المحاضرات أسبوعياً</span><b>' + totalLecHours + ' ساعة</b></div>' +
      '<div class="db-mini-row"><span>إجمالي ساعات السكاشن أسبوعياً</span><b>' + totalSecHours + ' ساعة</b></div>' +
      '<div class="db-mini-row"><span>صفوف مواد بدون سكشن/معيد مسجل</span><b>' + missingSectionCount + '</b></div>' +
      '</div></div>' +
      '<div class="db-card"><h3 class="db-card-title">توزيع القاعات حسب المبنى</h3>' + hBarChartHtml(buildingEntries, 'building') + '</div>' +
      '<div class="db-card"><h3 class="db-card-title">قواعد الكلية وملاحظات المراجعة</h3>' + rulesHtml + '<div style="margin-top:10px">' + notesHtml + '</div></div>' +
      '</div>';

    const closeBtn = document.getElementById('dbCloseInsp');
    if (closeBtn) {
      closeBtn.onclick = function () {
        self.inspection = null;
        self.render(false);
      };
    }

    body.querySelectorAll('.db-click-item').forEach(function (el) {
      el.onclick = function () {
        const grp = el.dataset.group;
        const lbl = el.dataset.label;
        self.inspection = (self.inspection && self.inspection.group === grp && self.inspection.label === lbl)
          ? null
          : { group: grp, label: lbl };
        self.render(false);
      };
    });
  }
}
