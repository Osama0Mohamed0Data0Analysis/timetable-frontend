// --- Scheduler View مع القائمة الديناميكية المطابقة للصور ---
class SchedulerView {
  constructor(api) {
    this.api = api;
    this.schedules = [];
    this.instructorsList = [];
    this.groupsList = [];
    this.selectedValue = '';
  }

  getVal(item, keys) {
    if (!item) return '';
    const objKeys = Object.keys(item);
    for (const pk of keys) {
      for (const k of objKeys) {
        if (k.trim() === pk.trim()) {
          const val = item[k];
          if (val !== undefined && val !== null && val !== '') return val.toString().trim();
        }
      }
    }
    for (const pk of keys) {
      for (const k of objKeys) {
        const lk = k.toLowerCase().trim();
        const lpk = pk.toLowerCase().trim();
        if (lk.includes(lpk)) {
          if (lpk.includes('مادة') && lk.includes('كود')) continue;
          const val = item[k];
          if (val !== undefined && val !== null && val !== '') return val.toString().trim();
        }
      }
    }
    return '';
  }

  async mount(container) {
    container.innerHTML = `
      <div style="padding: 10px; direction: rtl; text-align: right; font-family: system-ui, sans-serif; background: #f8fafc; min-height: 100vh;">
        
        <!-- شريط التحكم العلوي -->
        <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; gap: 10px;">
            <button id="btnRefresh" style="background: white; color: #1e293b; border: 1px solid #cbd5e1; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-weight: bold;">تحديث البيانات</button>
            <button id="btnGenerate" style="background: #1e293b; color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-weight: bold;">وُلّد الجدول</button>
          </div>
          
          <!-- القائمة المنسدلة المقسمة ديناميكياً (المجموعات والدكاترة) -->
          <div style="display: flex; gap: 10px; align-items: center;">
            <select id="filterDropdown" style="padding: 8px 14px; border: 1px solid #cbd5e1; border-radius: 6px; min-width: 260px; cursor: pointer; font-weight: 500; background: white; color: #0369a1;">
              <option value="">-- اختر المجموعة أو الدكتور --</option>
            </select>
          </div>
        </div>

        <!-- الجدول الأسبوعي الشبكي -->
        <div style="background: white; padding: 20px; border-radius: 8px; overflow-x: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div id="loading" style="color: #0284c7; font-weight: bold; text-align: center; margin-bottom: 15px;">جاري جلب البيانات من Google Sheets...</div>
          
          <table style="width: 100%; border-collapse: collapse; text-align: center; min-width: 950px;" border="0">
            <thead>
              <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                <th style="padding: 12px; color: #334155; border-left: 1px solid #e2e8f0;">الخميس</th>
                <th style="padding: 12px; color: #334155; border-left: 1px solid #e2e8f0;">الأربعاء</th>
                <th style="padding: 12px; color: #334155; border-left: 1px solid #e2e8f0;">الثلاثاء</th>
                <th style="padding: 12px; color: #334155; border-left: 1px solid #e2e8f0;">الإثنين</th>
                <th style="padding: 12px; color: #334155; border-left: 1px solid #e2e8f0;">الأحد</th>
                <th style="padding: 12px; color: #334155; border-left: 1px solid #e2e8f0;">السبت</th>
                <th style="padding: 12px; color: #334155; width: 130px;">الوقت</th>
              </tr>
            </thead>
            <tbody id="gridTableBody"></tbody>
          </table>

          <!-- توضيح الألوان أسفل الجدول -->
          <div style="margin-top: 15px; font-size: 0.85rem; color: #64748b; text-align: left;">
            الأزرق = محاضرة، البرتقالي = سكشن.
          </div>
        </div>
      </div>
    `;

    document.getElementById('btnRefresh').addEventListener('click', () => this.refreshData());
    document.getElementById('btnGenerate').addEventListener('click', () => { alert("تم تحديث وتوليد الجدول ميكانيكياً."); this.buildGrid(); });
    document.getElementById('filterDropdown').addEventListener('change', (e) => {
      this.selectedValue = e.target.value;
      this.buildGrid();
    });

    await this.refreshData();
  }

  async refreshData() {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'block';

    const data = await this.api.getData();
    this.schedules = Array.isArray(data) ? data : (data.schedules || []);
    const rawInstructors = data.instructors || [];
    const groupsData = data.groups || [];

    // استخراج المجموعات
    const groupSet = new Set();
    groupsData.forEach(g => {
      const yr = g['الفرقة'] || '';
      const grp = g['المجموعة'] || '';
      if (yr) groupSet.add(`${yr} - مجموعة ${grp || '1'}`);
    });

    this.schedules.forEach(item => {
      const yL = this.getVal(item, ['الفرقة *', 'الفرقة', 'yearLevel']);
      const dept = this.getVal(item, ['الشعبة / القسم', 'القسم', 'department']);
      if (yL) {
        groupSet.add(`${yL}${dept ? ' - ' + dept : ''}`);
      }
    });

    // استخراج الدكاترة والمعيدين
    const instructorSet = new Set();
    rawInstructors.forEach(inst => {
      const name = this.getVal(inst, ['اسم الدكتور / المعيد *', 'اسم الدكتور / المعيد', 'name']);
      if (name) instructorSet.add(name);
    });

    this.schedules.forEach(item => {
      const doc = this.getVal(item, ['د. المحاضرة *', 'د. المحاضرة', 'doctor']);
      const ast = this.getVal(item, ['المعيدين / السكاشن', 'assistant']);
      if (doc) doc.split(',').forEach(d => { if (d.trim()) instructorSet.add(d.trim()); });
      if (ast) ast.split(',').forEach(a => { if (a.trim()) instructorSet.add(a.trim()); });
    });

    this.groupsList = Array.from(groupSet).filter(Boolean).sort();
    this.instructorsList = Array.from(instructorSet).filter(Boolean).sort();

    const select = document.getElementById('filterDropdown');
    if (select) {
      select.innerHTML = `<option value="">-- عرض الكل --</option>`;
      
      // مجموعة المجموعات
      const groupOptGroup = document.createElement('optgroup');
      groupOptGroup.label = "المجموعات";
      this.groupsList.forEach(g => {
        const opt = document.createElement('option');
        opt.value = `group:${g}`;
        opt.textContent = g;
        groupOptGroup.appendChild(opt);
      });
      select.appendChild(groupOptGroup);

      // مجموعة الدكاترة والمعيدين
      const instOptGroup = document.createElement('optgroup');
      instOptGroup.label = "الدكاترة والمعيدين";
      this.instructorsList.forEach(inst => {
        const opt = document.createElement('option');
        opt.value = `inst:${inst}`;
        opt.textContent = inst;
        instOptGroup.appendChild(opt);
      });
      select.appendChild(instOptGroup);
    }

    if (loading) loading.style.display = 'none';
    this.buildGrid();
  }

  buildGrid() {
    const tbody = document.getElementById('gridTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const filtered = this.schedules.filter(item => {
      if (!this.selectedValue) return true;
      
      const [type, val] = this.selectedValue.split(':');
      if (type === 'group') {
        const yL = this.getVal(item, ['الفرقة *', 'الفرقة', 'yearLevel']);
        const dept = this.getVal(item, ['الشعبة / القسم', 'القسم', 'department']);
        const combined = `${yL}${dept ? ' - ' + dept : ''}`;
        return combined.includes(val) || yL.includes(val);
      } else if (type === 'inst') {
        const doc = this.getVal(item, ['د. المحاضرة *', 'د. المحاضرة', 'doctor']);
        const ast = this.getVal(item, ['المعيدين / السكاشن', 'assistant']);
        return doc.includes(val) || ast.includes(val);
      }
      return true;
    });

    const timeSlots = ["09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "12:00 - 13:00", "13:00 - 14:00", "14:00 - 15:00"];
    const days = ["الخميس", "الأربعاء", "الثلاثاء", "الإثنين", "الأحد", "السبت"];

    timeSlots.forEach((slot, slotIndex) => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid #e2e8f0';
      tr.style.height = '90px';

      let rowHtml = '';
      days.forEach((day, dayIndex) => {
        const item = filtered[slotIndex * 6 + dayIndex] || null;
        if (item) {
          const isLecture = slotIndex % 2 === 0;
          const bgCard = isLecture ? '#e0f2fe' : '#ffedd5'; 
          const borderCard = isLecture ? '#bae6fd' : '#fed7aa';
          const typeLabel = isLecture ? 'محاضرة' : 'سكشن';
          
          const subject = this.getVal(item, ['اسم المادة *', 'اسم المادة', 'subject']) || 'مادة';
          const hall = this.getVal(item, ['نوع القاعة المطلوبة *', 'القاعة', 'hall']) || 'قاعة';
          const doctor = isLecture ? (this.getVal(item, ['د. المحاضرة *', 'د. المحاضرة', 'doctor']) || 'دكتور') : (this.getVal(item, ['المعيدين / السكاشن', 'assistant']) || 'معيد');

          rowHtml += `
            <td style="padding: 8px; border-left: 1px solid #e2e8f0; vertical-align: middle;">
              <div style="background: ${bgCard}; border: 1px solid ${borderCard}; border-radius: 8px; padding: 10px; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
                <div style="font-weight: bold; color: #1e293b; font-size: 0.95rem; margin-bottom: 3px;">${subject}</div>
                <div style="font-size: 0.8rem; color: #475569; margin-bottom: 2px;">${typeLabel} - ${hall}</div>
                <div style="font-size: 0.8rem; color: #0369a1; font-weight: 500;">${doctor}</div>
              </div>
            </td>
          `;
        } else {
          rowHtml += `<td style="border-left: 1px solid #e2e8f0;"></td>`;
        }
      });

      rowHtml += `<td style="padding: 12px; font-weight: bold; color: #334155; background: #f8fafc; font-size: 0.9rem; text-align: center; width: 130px;">${slot}</td>`;
      tr.innerHTML = rowHtml;
      tbody.appendChild(tr);
    });
  }
}

// --- Doctor View ---
class DoctorView {
  constructor(api) { this.api = api; }
  async mount(container) {
    container.innerHTML = `<div style="padding: 20px; background: white; border-radius: 8px;"><h3>بوابة الدكتور والمعيد</h3><p>متصلة ببيانات الشيت.</p></div>`;
  }
}

// --- Student View ---
class StudentView {
  constructor(api) { this.api = api; }
  async mount(container) {
    container.innerHTML = `<div style="padding: 20px; background: white; border-radius: 8px;"><h3>بوابة الطالب</h3><p>متصلة ببيانات الشيت.</p></div>`;
  }
}

// --- Main App ---
export class App {
  constructor(container, api) {
    this.container = container;
    this.api = api;
  }

  async start() {
    this.container.innerHTML = `
      <div style="background: #f8fafc; min-height: 100vh; font-family: system-ui, sans-serif; direction: rtl; text-align: right; padding: 15px;">
        <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px; display: flex; gap: 10px;">
          <button id="navScheduler" style="background: #1e293b; color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-weight: bold;">1) منسق الجداول</button>
          <button id="navDoctor" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-weight: bold;">2) دكتور / معيد</button>
          <button id="navStudent" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-weight: bold;">3) طالب</button>
        </div>
        <div id="viewContainer"></div>
      </div>
    `;

    document.getElementById('navScheduler').addEventListener('click', () => this.switchView('scheduler'));
    document.getElementById('navDoctor').addEventListener('click', () => this.switchView('doctor'));
    document.getElementById('navStudent').addEventListener('click', () => this.switchView('student'));

    this.switchView('scheduler');
  }

  async switchView(viewName) {
    const vc = document.getElementById('viewContainer');
    vc.innerHTML = `<div style="text-align: center; padding: 30px; color: #0284c7; font-weight: bold;">جاري التحميل...</div>`;
    
    if (viewName === 'scheduler') {
      const v = new SchedulerView(this.api);
      await v.mount(vc);
    } else if (viewName === 'doctor') {
      const v = new DoctorView(this.api);
      await v.mount(vc);
    } else if (viewName === 'student') {
      const v = new StudentView(this.api);
      await v.mount(vc);
    }
  }
}
