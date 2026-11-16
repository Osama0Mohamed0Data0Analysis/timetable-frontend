// --- 1. Scheduler View ---
class SchedulerView {
  constructor(api) {
    this.api = api;
    this.schedules = [];
    this.groupsList = [];
    this.selectedGroup = '';
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
      <div style="padding: 10px; direction: rtl; text-align: right; font-family: system-ui, sans-serif;">
        <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
          <button id="btnDemo" style="background: #1e293b; color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-weight: bold;">بيانات تجريبية</button>
          <button id="btnRefresh" style="background: white; color: #1e293b; border: 1px solid #cbd5e1; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-weight: bold;">تحديث البيانات</button>
        </div>
        
        <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px; display: flex; gap: 10px; align-items: center;">
          <label style="font-weight: bold; color: #334155;">الفرقة / المجموعة:</label>
          <select id="filterGroup" style="padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; min-width: 200px; cursor: pointer;">
            <option value="">-- كل المجموعات --</option>
          </select>
        </div>

        <div style="background: white; padding: 15px; border-radius: 8px; overflow-x: auto;">
          <div id="loading" style="color: #0284c7; font-weight: bold; text-align: center; margin-bottom: 10px;">جاري التحميل من Google Sheets...</div>
          <table style="width: 100%; border-collapse: collapse; text-align: center; min-width: 800px;">
            <thead>
              <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                <th style="padding: 10px; border-left: 1px solid #e2e8f0;">السبت</th>
                <th style="padding: 10px; border-left: 1px solid #e2e8f0;">الأحد</th>
                <th style="padding: 10px; border-left: 1px solid #e2e8f0;">الإثنين</th>
                <th style="padding: 10px; border-left: 1px solid #e2e8f0;">الثلاثاء</th>
                <th style="padding: 10px; border-left: 1px solid #e2e8f0;">الأربعاء</th>
                <th style="padding: 10px; border-left: 1px solid #e2e8f0;">الخميس</th>
                <th style="padding: 10px; width: 120px;">الوقت</th>
              </tr>
            </thead>
            <tbody id="gridTableBody"></tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('btnRefresh').addEventListener('click', () => this.refreshData());
    document.getElementById('btnDemo').addEventListener('click', () => { alert("تم تحميل البيانات التجريبية."); this.refreshData(); });
    document.getElementById('filterGroup').addEventListener('change', (e) => {
      this.selectedGroup = e.target.value;
      this.buildGrid();
    });

    await this.refreshData();
  }

  async refreshData() {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'block';

    const data = await this.api.getData();
    this.schedules = Array.isArray(data) ? data : (data.schedules || []);

    const groupSet = new Set();
    this.schedules.forEach(item => {
      const yL = this.getVal(item, ['الفرقة *', 'الفرقة', 'yearLevel']);
      const dept = this.getVal(item, ['الشعبة / القسم', 'القسم', 'department']);
      if (yL) groupSet.add(`${yL}${dept ? ' - ' + dept : ''}`);
    });

    this.groupsList = Array.from(groupSet).filter(Boolean).sort();
    const select = document.getElementById('filterGroup');
    if (select) {
      select.innerHTML = `<option value="">-- كل المجموعات --</option>`;
      this.groupsList.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g;
        opt.textContent = g;
        select.appendChild(opt);
      });
    }

    if (loading) loading.style.display = 'none';
    this.buildGrid();
  }

  buildGrid() {
    const tbody = document.getElementById('gridTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const filtered = this.schedules.filter(item => {
      const yL = this.getVal(item, ['الفرقة *', 'الفرقة', 'yearLevel']);
      const dept = this.getVal(item, ['الشعبة / القسم', 'القسم', 'department']);
      const combined = `${yL} ${dept}`;
      return !this.selectedGroup || combined.includes(this.selectedGroup);
    });

    const timeSlots = ["09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "12:00 - 13:00", "13:00 - 14:00", "14:00 - 15:00"];
    const days = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];

    timeSlots.forEach((slot, slotIndex) => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid #e2e8f0';
      tr.style.height = '80px';

      let rowHtml = '';
      days.forEach((day, dayIndex) => {
        const item = filtered[slotIndex * 6 + dayIndex] || null;
        if (item) {
          const subject = this.getVal(item, ['اسم المادة *', 'اسم المادة', 'subject']) || 'مادة';
          const hall = this.getVal(item, ['نوع القاعة المطلوبة *', 'القاعة', 'hall']) || 'قاعة';
          const doctor = this.getVal(item, ['د. المحاضرة *', 'د. المحاضرة', 'doctor']) || 'دكتور';
          rowHtml += `
            <td style="padding: 6px; border-left: 1px solid #e2e8f0; vertical-align: middle;">
              <div style="background: #e2e8f0; border-radius: 6px; padding: 8px; text-align: center; font-size: 0.85rem;">
                <div style="font-weight: bold; color: #1e293b;">${subject}</div>
                <div style="color: #475569;">${hall}</div>
                <div style="color: #0369a1;">${doctor}</div>
              </div>
            </td>
          `;
        } else {
          rowHtml += `<td style="border-left: 1px solid #e2e8f0;"></td>`;
        }
      });

      rowHtml += `<td style="padding: 10px; font-weight: bold; color: #334155; background: #f8fafc; font-size: 0.85rem;">${slot}</td>`;
      tr.innerHTML = rowHtml;
      tbody.appendChild(tr);
    });
  }
}

// --- 2. Doctor View ---
class DoctorView {
  constructor(api) { this.api = api; }
  async mount(container) {
    container.innerHTML = `<div style="padding: 20px; background: white; border-radius: 8px;"><h3>بوابة الدكتور والمعيد</h3><p>قريباً جداً.</p></div>`;
  }
}

// --- 3. Student View ---
class StudentView {
  constructor(api) { this.api = api; }
  async mount(container) {
    container.innerHTML = `<div style="padding: 20px; background: white; border-radius: 8px;"><h3>بوابة الطالب</h3><p>قريباً جداً.</p></div>`;
  }
}

// --- 4. Main App ---
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
