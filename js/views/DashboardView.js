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
  return '<div class="db-hbars">' + entries.map(({ label, value }) => {
    const pct = Math.max(4, Math.round((value / maxVal) * 100));
    return (
      '<div class="db-hbar db-click-item" data-group="' + esc(filterGroup) + '" data-label="' + esc(label) + '">' +
      '<span class="db-hbar-lbl" title="' + esc(label) + '">' + esc(label) + '</span>' +
      '<div class="db-hbar-track"><div class="db-hbar-fill" style="width:' + pct + '%"></div></div>' +
      '<span class="db-hbar-val">' + value + '</span>' +
      '</div>'
    );
  }).join('') + '</div>';
}

function vBarChartHtml(entries, filterGroup) {
  if (!entries.length) return '<div class="db-empty">لا توجد بيانات مطابقة.</div>';
  const maxVal = Math.max(...entries.map(e => e.value), 1);
  return '<div class="db-vbars">' + entries.map(({ label, value }) => {
    const hPct = Math.max(8, Math.round((value / maxVal) * 100));
    return (
      '<div class="db-vbar-col db-click-item" data-group="' + esc(filterGroup) + '" data-label="' + esc(label) + '" title="' + esc(label) + ': ' + value + '">' +
      '<span class="db-vbar-cnt">' + value + '</span>' +
      '<div class="db-vbar-rect" style="height:' + hPct + '%"></div>' +
      '<span class="db-vbar-lbl">' + esc(label) + '</span>' +
      '</div>'
    );
  }).join('') + '</div>';
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
    return color + ' ' + start.toFixed(1) + 'deg ' + end.toFixed(1) + 'deg';
  });

  const legend = entries.map((e, i) => {
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
      .db-vbar-cnt{font-size:.75rem;font-weight:700;color:#334
