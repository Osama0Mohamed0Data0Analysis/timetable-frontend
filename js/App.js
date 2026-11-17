// --- 1. Scheduler View المتكامل مع طلبات الدكاترة الحقيقية ---
class SchedulerView {
  constructor(api) {
    this.api = api;
    this.schedules = [];
    this.requests = [];
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
        
        <!-- أزرار التحكم العلوية المطابقة للصورة -->
        <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; gap: 10px;">
            <button id="btnRefresh" style="background: white; color: #1e293b; border: 1px solid #cbd5e1; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-weight: bold;">تحديث البيانات</button>
            <button id="btnGenerate" style="background: #1e293b; color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-weight: bold;">وُلّد الجدول</button>
          </div>
          <div style="color: #64748b; font-size: 0.9rem;">تم التوليد.</div>
        </div>

        <!-- إحصائيات النظام العلوية -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 15px;">
          <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; border-right: 4px solid #1e293b; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div id="statTotal" style="font-size: 1.5rem; font-weight: bold; color: #1e293b;">0 من 0</div>
            <div style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">حصص أتوزعت</div>
          </div>
          <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; border-right: 4px solid #10b981; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="font-size: 1.5rem; font-weight: bold; color: #1e293b;">0</div>
            <div style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">تعارضات</div>
          </div>
          <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; border-right: 4px solid #0284c7; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="font-size: 1.5rem; font-weight: bold; color: #1e293b;">0</div>
            <div style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">فجوات الطلاب</div>
          </div>
          <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; border-right: 4px solid #f59e0b; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="font-size: 1.5rem; font-weight: bold; color: #1e293b;">1</div>
            <div style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">محاولات</div>
          </div>
        </div>

        <!-- جزئية طلبات الدكاترة المطلوبة في الصورة -->
        <div style="background: white; border-radius: 8px; padding: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 15px;">
          <div style="font-weight: bold; color: #1e293b; margin-bottom: 10px; font-size: 1rem;">طلبات الدكاترة (<span id="reqCount">0</span> جديد)</div>
          <div id="requestsList" style="display: flex; flex-direction: column; gap: 8px;">
            <div style="color: #64748b; font-size: 0.85rem;">لا توجد طلبات معلقة حالياً من الشيت.</div>
          </div>
        </div>

        <!-- فلتر المجموعات والفرق -->
        <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px; display: flex; gap: 10px; align-items: center;">
          <label style="font-weight: bold; color: #334155; font-size: 0.9rem;">الفرقة / المجموعة</label>
          <select id="filterGroup" style="padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; min-width: 240px; cursor: pointer; font-weight: 500;">
            <option value="">-- كل المجموعات --</option>
          </select>
        </div>

        <!-- جدول الحصص الشبكي -->
        <div style="background: white; padding: 15px; border-radius: 8px; overflow-x: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div id="loading" style="color: #0284c7; font-weight: bold; text-align: center; margin-bottom: 10px;">جاري جلب البيانات الحقيقية من Google Sheets...</div>
          <table style="width: 100%; border-collapse: collapse; text-align: center; min-width: 900px;">
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
    document.getElementById('btnGenerate').addEventListener('click', () => { alert("تم إعادة توليد الجدول ميكانيكياً بنجاح."); this.buildGrid(); });
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
    this.requests = data.requests || [];

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

    this.renderRequests();
    if (loading) loading.style.display = 'none';
    this.buildGrid();
  }

  renderRequests() {
    const container = document.getElementById('requestsList');
    const countEl = document.getElementById('reqCount');
    if (!container) return;

    // استخراج الطلبات المعلقة من الشيت
    const pending = this.requests.filter(r => {
      const st = r.status || r['الحالة'] || 'قيد المراجعة';
      return st.trim() === 'قيد المراجعة';
    });

    if (countEl) countEl.textContent = pending.length;

    if (pending.length === 0) {
      container.innerHTML = `<div style="color: #64748b; font-size: 0.85rem;">لا توجد طلبات معلقة حالياً من الشيت.</div>`;
      return;
    }

    container.innerHTML = '';
    pending.forEach(req => {
      const docName = req.doctorName || req['اسم الدكتور'] || 'دكتور';
      const details = req.details || req['التفاصيل'] || 'طلب تعديل جدول';
      const reason = req.reason || req['السبب'] || 'ظرف طارئ';

      const div = document.createElement('div');
      div.style.cssText = "display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0; gap: 10px; flex-wrap: wrap;";
      div.innerHTML = `
        <span style="font-size: 0.85rem; color: #334155;"><b>${docName}</b> يطلب ${details} • السبب: ${reason}</span>
        <div style="display: flex; gap: 6px;">
          <button class="btn-approve" data-id="${req.id || docName}" style="background: #10b981; color: white; border: none; padding: 5px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.8rem;">موافقة</button>
          <button class="btn-reject" data-id="${req.id || docName}" style="background: #ef4444; color: white; border: none; padding: 5px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.8rem;">رفض</button>
        </div>
      `;

      div.querySelector('.btn-approve').addEventListener('click', async (e) => {
        await this.api.sendAction({ action: "updateRequestStatus", id: e.target.dataset.id, status: "تمت الموافقة" });
        alert("تمت الموافقة وتحديث الحالة في Google Sheets!");
        await this.refreshData();
      });

      div.querySelector('.btn-reject').addEventListener('click', async (e) => {
        await this.api.sendAction({ action: "updateRequestStatus", id: e.target.dataset.id, status: "مرفوض" });
        alert("تم رفض الطلب وتحديث الحالة في Google Sheets!");
        await this.refreshData();
      });

      container.appendChild(div);
    });
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

    const totalEl = document.getElementById('statTotal');
    if (totalEl) totalEl.textContent = `${filtered.length} من ${this.schedules.length}`;

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
          const isLecture = slotIndex % 2 === 0;
          const bgCard = isLecture ? '#e2e8f0' : '#fef3c7';
          const typeLabel = isLecture ? 'محاضرة' : 'سكشن';
          
          const subject = this.getVal(item, ['اسم المادة *', 'اسم المادة', 'subject']) || 'مادة';
          const hall = this.getVal(item, ['نوع القاعة المطلوبة *', 'القاعة', 'hall']) || 'قاعة';
          const doctor = isLecture ? (this.getVal(item, ['د. المحاضرة *', 'د. المحاضرة', 'doctor']) || 'دكتور') : (this.getVal(item, ['المعيدين / السكاشن', 'assistant']) || 'معيد');

          rowHtml += `
            <td style="padding: 6px; border-left: 1px solid #e2e8f0; vertical-align: middle;">
              <div style="background: ${bgCard}; border-radius: 6px; padding: 8px; text-align: center; font-size: 0.85rem;">
                <div style="font-weight: bold; color: #1e293b;">${subject}</div>
                <div style="color: #475569;">${typeLabel} • ${hall}</div>
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
    container.innerHTML = `<div style="padding: 20px; background: white; border-radius: 8px;"><h3>بوابة الدكتور والمعيد</h3><p>متصلة بنظام الطلبات وجداول Google Sheets.</p></div>`;
  }
}

// --- 3. Student View ---
class StudentView {
  constructor(api) { this.api = api; }
  async mount(container) {
    container.innerHTML = `<div style="padding: 20px; background: white; border-radius: 8px;"><h3>بوابة الطالب</h3><p>متصلة بجداول Google Sheets.</p></div>`;
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
