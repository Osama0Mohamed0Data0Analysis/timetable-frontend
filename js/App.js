// =====================================================================
//  نظام الجداول — الخطوة 1 (محدث): داش بورد تفاعلية وديناميكية بالكامل
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
  lecHours:  ['ساعات المحاضرة أسبوعياً *', 'ساعات المحاضرة', 'lectureHours'],
  secHours:  ['ساعات السكشن أسبوعياً', 'ساعات السكشن', 'sectionHours'],
};
const INSTRUCTOR_COLS = ['اسم الدكتور / المعيد *', 'اسم الدكتور / المعيد', 'name'];
const FACULTY_ROLE_COLS = ['الدرجة الوظيفية *', 'الدرجة الوظيفية', 'role', 'title'];
const FACULTY_DEPT_COLS = ['القسم *', 'القسم', 'department'];
const ROOM_COLS = ['رقم القاعة', '* النوع', 'اسم القاعة', 'hall', 'room'];
const ROOM_TYPE_COLS = ['* النوع', 'النوع', 'type'];
const ROOM_CAP_COLS = ['* السعة (عدد الطلاب)', 'السعة (عدد الطلاب)', 'السعة', 'capacity'];
const ROOM_BLDG_COLS = ['* المبنى', 'المبنى', 'building'];

const DAYS = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
const CHART_COLORS = ['#1e3a8a', '#2563eb', '#0284c7', '#0d9488', '#15803d', '#d97706', '#b4600c', '#4f46e5', '#64748b'];

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

function toNum(v) {
  if (v === undefined || v === null) return 0;
  const cleaned = normAr(v).replace(/[^\d.-]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

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
    if (rowHall && normAr(rowHall) && !normAr(rowHall).includes(normAr(hall))) return false;
  }
  return true;
}

// ---------- تحميل البيانات مع الكاش ----------
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
const coursesOf = data => (data && Array.isArray(data.courses) ? data.courses : []);
const roomsOf = data => (data && Array.isArray(data.rooms) ? data.rooms : []);
const instructorsOf = data => (data && Array.isArray(data.instructors) ? data.instructors : []);

// ---------- الستايل ----------
function injectStyles() {
  if (document.getElementById('tt-styles')) return;
  const st = document.createElement('style');
  st.id = 'tt-styles';
  st.textContent = `
  .tt{--bg:#eef1f6;--ink:#162447;--mute:#64748b;--line:#dbe2ee;--head:#f1f5f9;
      --lec-bg:#e4e9f9;--lec-bd:#1e3a8a;--sec-bg:#fce8d5;--sec-bd:#b4600c;--ok:#15803d;--accent:#1d4ed8;
      direction:rtl;text-align:right;background:var(--bg);color:var(--ink);min-height:100vh;padding:14px;
      font-family:'IBM Plex Sans Arabic','Readex Pro',system-ui,-apple-system,'Segoe UI',Tahoma,sans-serif}
  .tt *{box-sizing:border-box}
  .tt-nav{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
  .tt-btn{background:#fff;color:var(--ink);border:1.5px solid var(--ink);padding:8px 16px;border-radius:8px;
          cursor:pointer;font:inherit;font-weight:600;transition:.15s}
  .tt-btn:hover{background:#f8fafc}
  .tt-btn.on{background:var(--ink);color:#fff}
  .tt-note{font-size:.85rem;color:var(--mute);margin:4px 2px 14px}
  .tt-filters{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:14px;background:#fff;padding:15px;border-radius:10px;border:1px solid var(--line)}
  .tt-field{display:flex;flex-direction:column;gap:5px}
  .tt-field label{font-weight:600;font-size:0.85rem;color:var(--mute)}
  .tt-sel{min-width:150px;padding:8px 12px;border:1.5px solid var(--line);border-radius:8px;background:#fff;
          font:inherit;color:var(--ink);cursor:pointer;font-size:0.9rem}
  .tt-loading{text-align:center;color:#0284c7;font-weight:700;padding:12px;display:none}

  /* Interactive Dashboard Styles */
  .db-banner{background:linear-gradient(135deg,#071b38 0%,#0f3566 100%);color:#fff;border-radius:12px;padding:18px 22px;margin-bottom:14px;border-bottom:4px solid #f59e0b;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
  .db-banner-title{margin:0;font-size:1.35rem;font-weight:800;letter-spacing:-.2px}
  .db-banner-sub{margin:4px 0 0;font-size:.88rem;color:#cbd5e1}
  .db-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;background:#fff;border:1px solid var(--line);border-radius:10px;padding:12px 16px;margin-bottom:14px}
  .db-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin-bottom:14px}
  .db-kpi{background:#fff;border:1px solid var(--line);border-top:4px solid #2563eb;border-radius:10px;padding:16px;text-align:center;cursor:pointer;transition:transform .15s,box-shadow .15s}
  .db-kpi:hover{transform:translateY(-2px);box-shadow:0 6px 16px rgba(15,23,42,.08)}
  .db-kpi.g2{border-top-color:#10b981}
  .db-kpi.g3{border-top-color:#f59e0b}
  .db-kpi.g4{border-top-color:#8b5cf6}
  .db-kpi-lbl{font-size:.9rem;font-weight:700;color:#1e293b}
  .db-kpi-val{font-size:2rem;font-weight:800;margin:6px 0;color:#2563eb}
  .db-kpi.g2 .db-kpi-val{color:#059669}
  .db-kpi.g3 .db-kpi-val{color:#d97706}
  .db-kpi.g4 .db-kpi-val{color:#7c3aed}
  .db-kpi-sub{font-size:.8rem;color:var(--mute);font-weight:600}

  .db-grid-3{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin-bottom:14px}
  .db-grid-2{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:14px;margin-bottom:14px}
  .db-card{background:#fff;border:1px solid var(--line);border-radius:10px;padding:16px;box-shadow:0 1px 3px rgba(15,23,42,.04)}
  .db-card-title{font-size:.98rem;font-weight:700;margin:0 0 12px;color:#0f172a;text-align:center}

  .db-hbars{display:flex;flex-direction:column;gap:10px}
  .db-hbar{display:grid;grid-template-columns:110px 1fr 34px;align-items:center;gap:8px;font-size:.82rem;cursor:pointer;padding:3px 4px;border-radius:6px}
  .db-hbar:hover{background:#f8fafc}
  .db-hbar-lbl{font-weight:600;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .db-hbar-track{height:18px;background:#f1f5f9;border-radius:4px;overflow:hidden;position:relative}
  .db-hbar-fill{height:100%;background:#7da2d8;border-radius:4px;transition:width .25s ease}
  .db-hbar-val{font-weight:700;color:#1e293b;text-align:left}

  .db-vbars{display:flex;align-items:flex-end;justify-content:space-around;gap:8px;height:185px;padding:12px 6px 6px;border-bottom:1px solid var(--line)}
  .db-vbar-col{display:flex;flex-direction:column;align-items:center;flex:1;height:100%;justify-content:flex-end;cursor:pointer;border-radius:6px;padding:2px}
  .db-vbar-col:hover{background:#f8fafc}
  .db-vbar-cnt{font-size:.75rem;font-weight:700;color:#334155;margin-bottom:4px}
  .db-vbar-rect{width:70%;max-width:34px;background:#7da2d8;border-radius:4px 4px 0 0;min-height:4px;transition:height .25s ease}
  .db-vbar-lbl{font-size:.72rem;color:#475569;margin-top:6px;text-align:center;line-height:1.2;max-height:2.4em;overflow:hidden}

  .db-donut-wrap{display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap;min-height:185px}
  .db-donut-legend{display:flex;flex-direction:column;gap:8px;font-size:.84rem}
  .db-leg-item{display:flex;align-items:center;gap:8px;cursor:pointer;padding:3px 6px;border-radius:6px}
  .db-leg-item:hover{background:#f8fafc}
  .db-dot{width:11px;height:11px;border-radius:3px;flex-shrink:0}

  .db-inspector{background:#fff;border:1.5px solid #2563eb;border-radius:10px;padding:16px;margin-bottom:14px}
  .db-inspector-head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px}
  .db-inspector-title{margin:0;font-size:1rem;font-weight:700;color:#1e3a8a}
  .db-chip-list{display:flex;flex-wrap:wrap;gap:8px}
  .db-chip{background:#eff6ff;color:#1e3a8a;border:1px solid #bfdbfe;border-radius:8px;padding:6px 10px;font-size:.82rem;font-weight:600}
  .db-empty{font-size:.85rem;color:var(--mute);text-align:center;padding:12px}

  .tt-stats{display:flex;background:#fff;border:1px solid var(--line);border-radius:10px;padding:16px;margin-bottom:16px;justify-content:space-around;text-align:center;flex-wrap:wrap;gap:12px}
  .tt-stat-item{display:flex;align-items:center;gap:15px;border-left:2px solid var(--line);padding-left:30px}
  .tt-stat-item:last-child{border-left:none;padding-left:0}
  .tt-stat-num{font-size:1.6rem;font-weight:800;color:var(--ink)}
  .tt-stat-lbl{font-size:.85rem;color:var(--mute);font-weight:600}
  .tt-requests-box{background:#fff;border:1px solid var(--line);border-radius:10px;padding:16px;margin-bottom:16px}
  .tt-requests-title{font-weight:700;font-size:1.05rem
