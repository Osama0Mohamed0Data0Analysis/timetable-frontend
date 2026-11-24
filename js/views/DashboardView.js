const FACULTY_ROLE_COLS = ['الدرجة الوظيفية *', 'الدرجة الوظيفية', 'role', 'title'];
const FACULTY_DEPT_COLS = ['القسم *', 'القسم', 'department'];
const FACULTY_NOTES_COLS = ['ملاحظات', 'notes'];
const INSTRUCTOR_COLS = ['اسم الدكتور / المعيد *', 'اسم الدكتور / المعيد', 'name'];
const ROOM_COLS = ['رقم القاعة', '* النوع', 'اسم القاعة', 'hall', 'room'];
const ROOM_TYPE_COLS = ['* النوع', 'النوع', 'type'];
const ROOM_CAP_COLS = ['* السعة (عدد الطلاب)', 'السعة (عدد الطلاب)', 'السعة', 'capacity'];
const ROOM_BLDG_COLS = ['* المبنى', 'المبنى', 'building'];
const ROOM_FLOOR_COLS = ['* الدور', 'الدور', 'floor'];
const ROOM_REQ_TYPE_COLS = ['نوع القاعة المطلوبة *', 'نوع القاعة المطلوبة', 'roomType'];
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
      const lk = normAr(k.toLowerCase());
      const lpk = normAr(pk.toLowerCase());
      if (lpk && lk.indexOf(lpk) !== -1) {
        if (lpk.indexOf('ماده') !== -1 && lk.indexOf('كود') !== -1) continue;
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

function sameText(a, b) {
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

function hBarChartHtml(entries, filterGroup, activeVal) {
  if (!entries.length) return '<div class="db-empty">لا توجد بيانات مطابقة.</div>';
  const maxVal = Math.max.apply(null, entries.map(function (e) { return e.value; }).concat([1]));
  const rows = entries.map(function (item) {
    const pct = Math.max(4, Math.round((item.value / maxVal) * 100));
    const isActive = Boolean(activeVal && sameText(item.label, activeVal));
    return (
      '<div class="db-hbar db-click-item' + (isActive ? ' active' : '') + '" data-group="' + esc(filterGroup) + '" data-label="' + esc(item.label) + '">' +
      '<span class="db-hbar-lbl" title="' + esc(item.label) + '">' + esc(item.label) + '</span>' +
      '<div class="db-hbar-track"><div class="db-hbar-fill" style="width:' + pct + '%"></div></div>' +
      '<span class="db-hbar-val">' + item.value + '</span>' +
      '</div>'
    );
  }).join('');
  return '<div class="db-hbars">' + rows + '</div>';
}

function vBarChartHtml(entries, filterGroup, activeVal) {
  if (!entries.length) return '<div class="db-empty">لا توجد بيانات مطابقة.</div>';
  const maxVal = Math.max.apply(null, entries.map(function (e) { return e.value; }).concat([1]));
  const cols = entries.map(function (item) {
    const hPct = Math.max(8, Math.round((item.value / maxVal) * 100));
    const isActive = Boolean(activeVal && sameText(item.label, activeVal));
    return (
      '<div class="db-vbar-col db-click-item' + (isActive ? ' active' : '') + '" data-group="' + esc(filterGroup) + '" data-label="' + esc(item.label) + '" title="' + esc(item.label) + ': ' + item.value + '">' +
      '<span class="db-vbar-cnt">' + item.value + '</span>' +
      '<div class="db-vbar-rect" style="height:' + hPct + '%"></div>' +
      '<span class="db-vbar-lbl">' + esc(item.label) + '</span>' +
      '</div>'
    );
  }).join('');
  return '<div class="db-vbars">' + cols + '</div>';
}

function donutChartHtml(entries, filterGroup, activeVal) {
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
    const isActive = Boolean(activeVal && sameText(e.label, activeVal));
    return (
      '<div class="db-leg-item db-click-item' + (isActive ? ' active' : '') + '" data-group="' + esc(filterGroup) + '" data-label="' + esc(e.label) + '">' +
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
    this.filters = {
      year: '',
      dept: '',
      role: '',
      roomType: '',
      building: '',
      floor: '',
      instructor: ''
    };
    this.inspection = null;
    this.showAllChips = false;
  }

  injectDashboardStyles() {
    if (document.getElementById('db-view-styles')) return;
    const st = document.createElement('style');
    st.id = 'db-view-styles';
    st.textContent = [
      '.db-banner{background:linear-gradient(135deg,#071b38 0%,#0f3566 100%);color:#fff;border-radius:12px;padding:18px 22px;margin-bottom:14px;border-bottom:4px solid #f59e0b;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}',
      '.db-banner-title{margin:0;font-size:1.3rem;font-weight:800}',
      '.db-banner-sub{margin:4px 0 0;font-size:.86rem;color:#cbd5e1}',
      '.db-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;background:#fff;border:1px solid #dbe2ee;border-radius:10px;padding:12px 16px;margin-bottom:12px}',
      '.db-active-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px 14px;margin-bottom:14px}',
      '.db-tag{display:inline-flex;align-items:center;gap:6px;background:#1e3a8a;color:#fff;border-radius:999px;padding:4px 12px;font-size:.8rem;font-weight:600;cursor:pointer}',
      '.db-field{display:flex;flex-direction:column;gap:5px}',
      '.db-field label{font-weight:600;font-size:.84rem;color:#64748b}',
      '.db-sel{min-width:160px;padding:8px 12px;border:1.5px solid #dbe2ee;border-radius:8px;background:#fff;font:inherit;color:#162447}',
      '.db-btn{background:#fff;color:#162447;border:1.5px solid #162447;padding:8px 15px;border-radius:8px;cursor:pointer;font:inherit;font-weight:600}',
      '.db-btn.on{background:#162447;color:#fff}',
      '.db-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:14px}',
      '.db-kpi{background:#fff;border:1px solid #dbe2ee;border-top:4px solid #2563eb;border-radius:10px;padding:16px;text-align:center;cursor:pointer;transition:transform .12s}',
      '.db-kpi:hover{transform:translateY(-2px)}',
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
      '.db-hbar{display:grid;grid-template-columns:115px 1fr 36px;align-items:center;gap:8px;font-size:.82rem;cursor:pointer;padding:2px 4px;border-radius:6px}',
      '.db-hbar:hover,.db-hbar.active{background:#eff6ff;outline:1.5px solid #2563eb}',
      '.db-hbar-lbl{font-weight:600;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.db-hbar-track{height:18px;background:#f1f5f9;border-radius:4px;overflow:hidden}',
      '.db-hbar-fill{height:100%;background:#7da2d8;border-radius:4px}',
      '.db-hbar.active .db-hbar-fill{background:#1d4ed8}',
      '.db-hbar-val{font-weight:700;color:#1e293b;text-align:left}',
      '.db-vbars{display:flex;align-items:flex-end;justify-content:space-around;gap:8px;height:185px;padding:12px 6px 6px;border-bottom:1px solid #dbe2ee}',
      '.db-vbar-col{display:flex;flex-direction:column;align-items:center;flex:1;height:100%;justify-content:flex-end;cursor:pointer;padding:2px;border-radius:6px}',
      '.db-vbar-col:hover,.db-vbar-col.active{background:#eff6ff;outline:1.5px solid #2563eb}',
      '.db-vbar-cnt{font-size:.75rem;font-weight:700;color:#334155;margin-bottom:4px}',
      '.db-vbar-rect{width:70%;max-width:34px;background:#7da2d8;border-radius:4px 4px 0 0;min-height:4px}',
      '.db-vbar-col.active .db-vbar-rect{background:#1d4ed8}',
      '.db-vbar-lbl{font-size:.72rem;color:#475569;margin-top:6px;text-align:center;line-height:1.2;max-height:2.4em;overflow:hidden}',
      '.db-donut-wrap{display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap;min-height:185px}',
      '.db-donut-legend{display:flex;flex-direction:column;gap:8px;font-size:.84rem}',
      '.db-leg-item{display:flex;align-items:center;gap:8px;cursor:pointer;padding:2px 6px;border-radius:6px}',
      '.db-leg-item:hover,.db-leg-item.active{background:#eff6ff;outline:1.5px solid #2563eb}',
      '.db-dot{width:11px;height:11px;border-radius:3px;flex-shrink:0}',
      '.db-inspector{background:#fff;border:1.5px solid #2563eb;border-radius:10px;padding:16px;margin-bottom:14px}',
      '.db-inspector-head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px}',
      '.db-inspector-title{margin:0;font-size:1rem;font-weight:700;color:#1e3a8a}',
      '.db-chip-list{display:flex;flex-wrap:wrap;gap:8px}',
      '.db-chip{background:#eff6ff;color:#1e3a8a;border:1px solid #bfdbfe;border-radius:8px;padding:6px 10px;font-size:.82rem;font-weight:600;cursor:pointer}',
      '.db-chip:hover,.db-chip.active{background:#1e3a8a;color:#fff;border-color:#1e3a8a}',
      '.db-member-card{margin-top:12px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:12px;font-size:.84rem}',
      '.db-mini-list{display:flex;flex-direction:column;gap:8px}',
      '.db-mini-row{display:flex;justify-content:space-between;align-items:center;gap:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:.83rem}',
      '.db-sub-head{font-size:.85rem;font-weight:700;color:#1e293b;margin:10px 0 6px}',
      '.db-note-item{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 12px;font-size:.81rem;color:#78350f;margin-bottom:6px}',
      '.db-note-item:last-child{margin-bottom:0}',
      '.db-empty{font-size:.85rem;color:#64748b;text-align:center;padding:10px}'
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

  matchCourse(item) {
    const y = getVal(item, ['الفرقة *', 'الفرقة', 'yearLevel']);
    const d = getVal(item, ['الشعبة / القسم', 'القسم *', 'القسم', 'department']);
    const rt = getVal(item, ROOM_REQ_TYPE_COLS);
    const doc = getVal(item, ['د. المحاضرة *', 'د. المحاضرة', 'doctor']);
    const ast = getVal(item, ['المعيدين / السكاشن', 'assistant']);

    if (this.filters.year && !sameYear(y, this.filters.year)) return false;
    if (this.filters.dept && !sameText(d, this.filters.dept)) return false;
    if (this.filters.roomType && rt && !sameText(rt, this.filters.roomType)) return false;
    if (this.filters.instructor) {
      const names = splitNames(doc).concat(splitNames(ast));
      const found = names.some(function (n) { return sameText(n, this.filters.instructor); }.bind(this));
      if (!found) return false;
    }
    return true;
  }

  matchFaculty(item) {
    const d = getVal(item, FACULTY_DEPT_COLS);
    const r = getVal(item, FACULTY_ROLE_COLS);
    const n = getVal(item, INSTRUCTOR_COLS);
    if (this.filters.dept && !sameText(d, this.filters.dept)) return false;
    if (this.filters.role && !sameText(r, this.filters.role)) return false;
    if (this.filters.instructor && !sameText(n, this.filters.instructor)) return false;
    return true;
  }

  matchRoom(item) {
    const rt = getVal(item, ROOM_TYPE_COLS);
    const b = getVal(item, ROOM_BLDG_COLS);
    const fl = getVal(item, ROOM_FLOOR_COLS);
    if (this.filters.roomType && !sameText(rt, this.filters.roomType)) return false;
    if (this.filters.building && !sameText(b, this.filters.building)) return false;
    if (this.filters.floor && !sameText(fl, this.filters.floor)) return false;
    return true;
  }

  resetAllFilters() {
    this.filters = {
      year: '',
      dept: '',
      role: '',
      roomType: '',
      building: '',
      floor: '',
      instructor: ''
    };
    this.inspection = null;
    this.showAllChips = false;
  }

  applyDynamicSelection(group, label) {
    if (!group || !label) return;

    if (group === 'courseYear') {
      this.filters.year = sameYear(this.filters.year, label) ? '' : label;
      this.inspection = this.filters.year ? { group: group, label: label } : null;
    } else if (group === 'courseDept' || group === 'facultyDept') {
      this.filters.dept = sameText(this.filters.dept, label) ? '' : label;
      this.inspection = this.filters.dept ? { group: group, label: label } : null;
    } else if (group === 'facultyRole') {
      this.filters.role = sameText(this.filters.role, label) ? '' : label;
      this.inspection = this.filters.role ? { group: group, label: label } : null;
    } else if (group === 'roomType') {
      this.filters.roomType = sameText(this.filters.roomType, label) ? '' : label;
      this.inspection = this.filters.roomType ? { group: group, label: label } : null;
    } else if (group === 'building') {
      this.filters.building = sameText(this.filters.building, label) ? '' : label;
      this.inspection = this.filters.building ? { group: group, label: label } : null;
    } else if (group === 'floor') {
      this.filters.floor = sameText(this.filters.floor, label) ? '' : label;
      this.inspection = this.filters.floor ? { group: group, label: label } : null;
    } else if (group === 'instructor') {
      this.filters.instructor = sameText(this.filters.instructor, label) ? '' : label;
      this.inspection = { group: 'instructor', label: label };
    } else {
      this.inspection = (this.inspection && this.inspection.group === group && this.inspection.label === label)
        ? null
        : { group: group, label: label };
    }
    this.showAllChips = false;
  }

  async mount(container) {
    const self = this;
    this.injectDashboardStyles();
    container.innerHTML =
      '<div class="db-banner">' +
      '<div>' +
      '<h2 class="db-banner-title">نظام إدارة الجداول الأكاديمية الذكي</h2>' +
      '<p class="db-banner-sub">لوحة متابعة ديناميكية للمواد الدراسية وأعضاء هيئة التدريس والقاعات والتحليلات الأكاديمية</p>' +
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
      '<button id="dbReset" class="db-btn" style="margin-right:auto">إعادة ضبط الكل</button>' +
      '</div>' +
      '<div id="dbActiveFilters"></div>' +
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
        self.resetAllFilters();
        if (ySel) ySel.value = '';
        if (dSel) dSel.value = '';
        self.render(false);
      };
    }
    if (goBtn) {
      goBtn.onclick = function () {
        if (self.onNavigate) {
          self.onNavigate('scheduler', {
            year: self.filters.year,
            dept: self.filters.dept,
            instructor: self.filters.instructor
          });
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

  renderActiveFilterTags() {
    const bar = document.getElementById('dbActiveFilters');
    if (!bar) return;

    const tags = [];
    if (this.filters.year) tags.push({ key: 'year', label: 'الفرقة: ' + this.filters.year });
    if (this.filters.dept) tags.push({ key: 'dept', label: 'القسم/الشعبة: ' + this.filters.dept });
    if (this.filters.role) tags.push({ key: 'role', label: 'الدرجة: ' + this.filters.role });
    if (this.filters.roomType) tags.push({ key: 'roomType', label: 'نوع المكان: ' + this.filters.roomType });
    if (this.filters.building) tags.push({ key: 'building', label: 'المبنى: ' + this.filters.building });
    if (this.filters.floor) tags.push({ key: 'floor', label: 'الدور: ' + this.filters.floor });
    if (this.filters.instructor) tags.push({ key: 'instructor', label: 'عضو هيئة التدريس: ' + this.filters.instructor });

    if (!tags.length) {
      bar.innerHTML = '';
      return;
    }

    const self = this;
    bar.innerHTML =
      '<div class="db-active-bar">' +
      '<span style="font-size:.82rem;font-weight:700;color:#1e3a8a">فلاتر نشطة (اضغط على أي فلتر لإزالته):</span>' +
      tags.map(function (t) {
        return '<span class="db-tag db-clear-tag" data-key="' + esc(t.key) + '">' + esc(t.label) + ' ×</span>';
      }).join('') +
      '</div>';

    bar.querySelectorAll('.db-clear-tag').forEach(function (el) {
      el.onclick = function () {
        const k = el.dataset.key;
        self.filters[k] = '';
        if (self.inspection && self.inspection.group === k) {
          self.inspection = null;
        }
        self.render(false);
      };
    });
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
    this.renderActiveFilterTags();

    const schedules = Array.isArray(data) ? data : pickArray(data, ['schedules', 'schedule', 'الجداول']);
    const allCourses = pickArray(data, ['courses', 'subjects', 'materials', 'المواد', 'المواد الدراسية']);
    const allRooms = pickArray(data, ['rooms', 'halls', 'القاعات', 'المدرجات والقاعات']);
    const allFaculty = pickArray(data, ['instructors', 'faculty', 'doctors', 'أعضاء هيئة التدريس']);
    const allGroups = pickArray(data, ['groups', 'الفرق والمجموعات']);
    const allPeriods = pickArray(data, ['periods', 'timeSlots', 'الفترات الزمنية', 'الفترات']);
    const allRules = pickArray(data, ['rules', 'collegeRules', 'قواعد الكلية']);
    const allNotes = pickArray(data, ['notes', 'reviewNotes', 'ملاحظات المراجعة', 'ملاحظات']);

    const filteredCourses = allCourses.filter(function (c) { return self.matchCourse(c); });
    const filteredSchedules = schedules.filter(function (s) { return self.matchCourse(s); });
    const filteredFaculty = allFaculty.filter(function (f) { return self.matchFaculty(f); });
    const filteredRooms = allRooms.filter(function (r) { return self.matchRoom(r); });

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
    if (!filteredFaculty.length && !this.filters.role) {
      courseSource.forEach(function (s) {
        splitNames(getVal(s, ['د. المحاضرة *', 'د. المحاضرة', 'doctor'])).forEach(function (n) { facultyNames.add(n); });
        splitNames(getVal(s, ['المعيدين / السكاشن', 'assistant'])).forEach(function (n) { facultyNames.add(n); });
      });
    }
    const totalFaculty = filteredFaculty.length || facultyNames.size;

    let totalCapacity = 0;
    const roomTypes = new Map();
    const roomsByBuilding = new Map();
    const roomsByFloor = new Map();
    filteredRooms.forEach(function (r) {
      totalCapacity += toNum(getVal(r, ROOM_CAP_COLS));
      const rt = getVal(r, ROOM_TYPE_COLS) || 'غير محدد';
      const bldg = getVal(r, ROOM_BLDG_COLS) || 'غير محدد';
      const flr = getVal(r, ROOM_FLOOR_COLS) || 'غير محدد';
      roomTypes.set(rt, (roomTypes.get(rt) || 0) + 1);
      roomsByBuilding.set(bldg, (roomsByBuilding.get(bldg) || 0) + 1);
      roomsByFloor.set(flr, (roomsByFloor.get(flr) || 0) + 1);
    });

    const avgCapacity = filteredRooms.length ? Math.round(totalCapacity / filteredRooms.length) : 0;

    let totalLecHours = 0;
    let totalSecHours = 0;
    let rowsWithSections = 0;
    let missingSectionCount = 0;
    const coursesByYear = new Map();
    const coursesByDept = new Map();
    courseSource.forEach(function (item) {
      const y = getVal(item, ['الفرقة *', 'الفرقة', 'yearLevel']) || 'غير محدد';
      const d = getVal(item, ['الشعبة / القسم', 'القسم *', 'القسم', 'department']) || 'عام';
      const lh = toNum(getVal(item, LEC_HRS_COLS));
      const sh = toNum(getVal(item, SEC_HRS_COLS));
      const assistants = getVal(item, ['المعيدين / السكاشن', 'assistant']);
      totalLecHours += lh;
      totalSecHours += sh;
      if (sh > 0 || assistants) {
        rowsWithSections += 1;
      } else {
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
      let rawChips = [];

      if (group === 'courses') {
        rawChips = Array.from(uniqueSubjects).map(function (s) {
          return { text: 'مادة: ' + s, actionGroup: '', actionLabel: '' };
        });
      } else if (group === 'faculty' || group === 'facultyRole' || group === 'facultyDept' || group === 'instructor') {
        const list = (group === 'facultyRole')
          ? allFaculty.filter(function (f) {
              return sameText(getVal(f, FACULTY_ROLE_COLS) || 'غير محدد', label) &&
                (!self.filters.dept || sameText(getVal(f, FACULTY_DEPT_COLS), self.filters.dept));
            })
          : (group === 'facultyDept')
          ? allFaculty.filter(function (f) {
              return sameText(getVal(f, FACULTY_DEPT_COLS) || 'غير محدد', label) &&
                (!self.filters.role || sameText(getVal(f, FACULTY_ROLE_COLS), self.filters.role));
            })
          : filteredFaculty;

        rawChips = list.map(function (f) {
          const name = getVal(f, INSTRUCTOR_COLS) || 'عضو';
          const dept = getVal(f, FACULTY_DEPT_COLS);
          return {
            text: name + (dept ? ' (' + dept + ')' : ''),
            actionGroup: 'instructor',
            actionLabel: name
          };
        });
      } else if (group === 'rooms' || group === 'capacity' || group === 'roomType' || group === 'building' || group === 'floor') {
        rawChips = filteredRooms.map(function (r) {
          const rName = getVal(r, ROOM_COLS) || 'قاعة';
          const rCap = toNum(getVal(r, ROOM_CAP_COLS));
          const rType = getVal(r, ROOM_TYPE_COLS);
          return {
            text: rName + ' · ' + (rType || 'مكان') + ' (' + rCap + ' طالب)',
            actionGroup: '',
            actionLabel: ''
          };
        });
      } else if (group === 'courseYear') {
        rawChips = courseSource.filter(function (c) {
          return sameYear(getVal(c, ['الفرقة *', 'الفرقة', 'yearLevel']) || 'غير محدد', label);
        }).map(function (c) {
          return { text: getVal(c, ['اسم المادة *', 'اسم المادة', 'subject']) || 'مادة', actionGroup: '', actionLabel: '' };
        });
      } else if (group === 'courseDept') {
        rawChips = courseSource.filter(function (c) {
          return sameText(getVal(c, ['الشعبة / القسم', 'القسم *', 'القسم', 'department']) || 'عام', label);
        }).map(function (c) {
          return { text: getVal(c, ['اسم المادة *', 'اسم المادة', 'subject']) || 'مادة', actionGroup: '', actionLabel: '' };
        });
      }

      const visibleChips = this.showAllChips ? rawChips : rawChips.slice(0, 30);
      const hasMore = rawChips.length > 30;

      let memberCardHtml = '';
      if (this.filters.instructor) {
        const targetName = this.filters.instructor;
        const memberObj = allFaculty.find(function (f) {
          return sameText(getVal(f, INSTRUCTOR_COLS), targetName);
        });
        const assignedCourses = allCourses.filter(function (c) {
          const names = splitNames(getVal(c, ['د. المحاضرة *', 'د. المحاضرة', 'doctor'])).concat(
            splitNames(getVal(c, ['المعيدين / السكاشن', 'assistant']))
          );
          return names.some(function (n) { return sameText(n, targetName); });
        });
        const subjNames = Array.from(new Set(assignedCourses.map(function (c) {
          return getVal(c, ['اسم المادة *', 'اسم المادة', 'subject']);
        }).filter(Boolean)));

        memberCardHtml =
          '<div class="db-member-card">' +
          '<div><b>العضو المحدد:</b> ' + esc(targetName) + '</div>' +
          (memberObj ? '<div><b>الدرجة الوظيفية:</b> ' + esc(getVal(memberObj, FACULTY_ROLE_COLS) || '-') + ' | <b>القسم:</b> ' + esc(getVal(memberObj, FACULTY_DEPT_COLS) || '-') + '</div>' : '') +
          (memberObj && getVal(memberObj, FACULTY_NOTES_COLS) ? '<div><b>ملاحظات الشيت:</b> ' + esc(getVal(memberObj, FACULTY_NOTES_COLS)) + '</div>' : '') +
          '<div><b>المواد المرتبطة في جدول المواد (' + subjNames.length + '):</b> ' + (subjNames.length ? esc(subjNames.join('، ')) : 'غير مدرج بالاسم الصريح في جدول المواد') + '</div>' +
          '</div>';
      }

      inspectorHtml =
        '<div class="db-inspector">' +
        '<div class="db-inspector-head">' +
        '<h4 class="db-inspector-title">تفاصيل التحديد: ' + esc(label) + ' (' + rawChips.length + ')</h4>' +
        '<div style="display:flex;gap:8px">' +
        (hasMore ? '<button id="dbToggleChips" class="db-btn" style="padding:4px 12px;font-size:.8rem">' + (this.showAllChips ? 'عرض أقل' : 'عرض الكل (' + rawChips.length + ')') + '</button>' : '') +
        '<button id="dbCloseInsp" class="db-btn" style="padding:4px 12px;font-size:.8rem">إغلاق</button>' +
        '</div>' +
        '</div>' +
        '<div class="db-chip-list">' +
        (visibleChips.length
          ? visibleChips.map(function (ch) {
              const isChipActive = Boolean(ch.actionLabel && self.filters.instructor && sameText(ch.actionLabel, self.filters.instructor));
              return (
                '<span class="db-chip' + (isChipActive ? ' active' : '') + '"' +
                (ch.actionGroup ? ' data-group="' + esc(ch.actionGroup) + '" data-label="' + esc(ch.actionLabel) + '"' : '') +
                '>' + esc(ch.text) + '</span>'
              );
            }).join('')
          : '<span class="db-empty">لا توجد تفاصيل.</span>') +
        '</div>' +
        memberCardHtml +
        '</div>';
    }

    const validRules = allRules.filter(function (item) {
      const k = getVal(item, ['البند', 'item', 'rule', 'name', 'title']);
      const v = getVal(item, ['القيمة', 'value', 'val', 'desc']);
      return Boolean(k || v);
    });

    const rulesHtml = validRules.length
      ? '<div class="db-mini-list">' + validRules.slice(0, 6).map(function (item) {
          const k = getVal(item, ['البند', 'item', 'rule', 'name', 'title']) || 'بند';
          const v = getVal(item, ['القيمة', 'value', 'val', 'desc']) || '-';
          const src = getVal(item, ['المصدر / ملاحظات', 'المصدر', 'source', 'notes']);
          return (
            '<div class="db-mini-row">' +
            '<span><b>' + esc(k) + '</b>' + (src ? ' <small style="color:#64748b">(' + esc(src) + ')</small>' : '') + '</span>' +
            '<span>' + esc(v) + '</span>' +
            '</div>'
          );
        }).join('') + '</div>'
      : '<div class="db-empty">لا توجد قواعد مسجلة في الشيت.</div>';

    const validNotes = allNotes.filter(function (n) {
      const topic = getVal(n, ['الموضوع', 'topic', 'title', 'subject', 'البند']);
      const det = getVal(n, ['التفاصيل', 'details', 'detail', 'note', 'ملاحظات', 'القيمة']);
      return Boolean(topic || det);
    });

    const notesHtml = validNotes.length
      ? validNotes.slice(0, 6).map(function (n) {
          const topic = getVal(n, ['الموضوع', 'topic', 'title', 'subject', 'البند']) || 'ملاحظة';
          const det = getVal(n, ['التفاصيل', 'details', 'detail', 'note', 'ملاحظات', 'القيمة']) || '';
          const src = getVal(n, ['المصدر', 'source']);
          return (
            '<div class="db-note-item">' +
            '<b>' + esc(topic) + (src ? ' [' + esc(src) + ']' : '') + ':</b> ' + esc(det) +
            '</div>'
          );
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
      '<div class="db-kpi-val">' + filteredRooms.length + '</div>' +
      '<div class="db-kpi-sub">' + buildingEntries.length + ' مبنى · ' + floorEntries.length + ' أدوار (متوسط ' + avgCapacity + ' طالب)</div>' +
      '</div>' +
      '<div class="db-kpi g4 db-click-item" data-group="capacity" data-label="السعة الإجمالية للقاعات">' +
      '<div class="db-kpi-lbl">السعة الإجمالية للقاعات</div>' +
      '<div class="db-kpi-val">' + totalCapacity.toLocaleString('en-US') + '</div>' +
      '<div class="db-kpi-sub">طالب (' + allGroups.length + ' مجموعة · ' + allPeriods.length + ' فترة)</div>' +
      '</div>' +
      '</div>' +
      inspectorHtml +
      '<div class="db-grid-3">' +
      '<div class="db-card"><h3 class="db-card-title">Room Distribution</h3>' + donutChartHtml(roomTypeEntries, 'roomType', this.filters.roomType) + '</div>' +
      '<div class="db-card"><h3 class="db-card-title">Faculty Distribution by Job Title</h3>' + hBarChartHtml(facultyRoleEntries, 'facultyRole', this.filters.role) + '</div>' +
      '<div class="db-card"><h3 class="db-card-title">Number of Courses by Academic Year.</h3>' + hBarChartHtml(yearEntries, 'courseYear', this.filters.year) + '</div>' +
      '</div>' +
      '<div class="db-grid-2">' +
      '<div class="db-card"><h3 class="db-card-title">Faculty Members by Department</h3>' + hBarChartHtml(facultyDeptEntries, 'facultyDept', this.filters.dept) + '</div>' +
      '<div class="db-card"><h3 class="db-card-title">Courses by Department</h3>' + vBarChartHtml(deptCourseEntries, 'courseDept', this.filters.dept) + '</div>' +
      '</div>' +
      '<div class="db-grid-3">' +
      '<div class="db-card"><h3 class="db-card-title">تحليل الساعات الأسبوعية والمؤشرات</h3>' +
      '<div class="db-mini-list">' +
      '<div class="db-mini-row"><span>إجمالي ساعات المحاضرات أسبوعياً</span><b>' + totalLecHours + ' ساعة</b></div>' +
      '<div class="db-mini-row"><span>إجمالي ساعات السكاشن أسبوعياً</span><b>' + totalSecHours + ' ساعة</b></div>' +
      '<div class="db-mini-row"><span>صفوف مواد بسكشن/معيد مسجل</span><b>' + rowsWithSections + '</b></div>' +
      '<div class="db-mini-row"><span>صفوف مواد بدون سكشن/معيد مسجل</span><b>' + missingSectionCount + '</b></div>' +
      '</div></div>' +
      '<div class="db-card"><h3 class="db-card-title">توزيع القاعات حسب المبنى والدور</h3>' +
      hBarChartHtml(buildingEntries, 'building', this.filters.building) +
      '<div class="db-sub-head">توزيع القاعات حسب الدور</div>' +
      hBarChartHtml(floorEntries, 'floor', this.filters.floor) +
      '</div>' +
      '<div class="db-card"><h3 class="db-card-title">قواعد الكلية وملاحظات المراجعة</h3>' +
      '<div class="db-sub-head">قواعد الكلية</div>' + rulesHtml +
      '<div class="db-sub-head">ملاحظات المراجعة</div>' + notesHtml +
      '</div>' +
      '</div>';

    const closeBtn = document.getElementById('dbCloseInsp');
    if (closeBtn) {
      closeBtn.onclick = function () {
        self.inspection = null;
        self.filters.instructor = '';
        self.render(false);
      };
    }

    const toggleBtn = document.getElementById('dbToggleChips');
    if (toggleBtn) {
      toggleBtn.onclick = function () {
        self.showAllChips = !self.showAllChips;
        self.render(false);
      };
    }

    body.querySelectorAll('.db-click-item, .db-chip[data-group]').forEach(function (el) {
      el.onclick = function (ev) {
        ev.stopPropagation();
        const grp = el.dataset.group;
        const lbl = el.dataset.label;
        if (!grp || !lbl) return;
        self.applyDynamicSelection(grp, lbl);
        self.render(false);
      };
    });
  }
}
