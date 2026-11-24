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
const DEFAULT_FIRST_HOUR = 9;
const DEFAULT_LAST_HOUR = 14;

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

function parseHour(v) {
  if (v === undefined || v === null) return null;
  const s = normAr(v);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const d = new Date(s);
    return isNaN(d) ? null : Math.round(d.getHours() + d.getMinutes() / 60);
  }
  const m = s.match(/(\d{1,2})(?::(\d{2}))?\s*(ص|م|am|pm)?/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const suf = (m[3] || '').toLowerCase();
  if ((suf === 'م' || suf === 'pm') && h < 12) h += 12;
  else if ((suf === 'ص' || suf === 'am') && h === 12) h = 0;
  else if (!suf && h < 8) h += 12;
  return h;
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
  .db-box-title{margin:0 0 12px;font-size:.96rem;font-weight:70
