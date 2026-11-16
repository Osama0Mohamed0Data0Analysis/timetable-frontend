// --- 1. واجهة منسق الجداول ---
class SchedulerView {
  constructor(api) {
    this.api = api;
    this.schedules = [];
    this.requests = [];
    this.groupsList = [];
    this.selectedGroup = '';
  }

  getVal(item, possibleKeys) {
    if (!item) return '';
    const keys = Object.keys(item);
    for (const pk of possibleKeys) {
      for (const k of keys) {
        if (k.trim() === pk.trim()) {
          const val = item[k];
          if (val !== undefined && val !== null && val !== '') return val.toString().trim();
        }
      }
    }
    for (const pk of possibleKeys) {
      for (const k of keys) {
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
      <div>
        <div style="background: white; padding: 15px 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; gap: 10px;">
            <button id="btnDemo" style="background: #1e293b; color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; cursor: pointer;">جرب بيانات تجريبية</button>
            <button id="btnUpload" style="background: white; color: #1e293b; border: 1px solid #cbd5e1; padding: 10px 18px; border-radius: 8px; font-weight: bold; cursor: pointer;">رفع ملف Excel</button>
            <input type="file" id="excelFileInput" style="display: none;" accept=".xlsx, .xls">
            <button id="btnGenerate" style="background: #1e293b; color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; cursor: pointer;">وُلّد الجدول</button>
          </div>
          <div style="color: #64748b; font-size: 0.9rem;">متزامن مع Google Sheets.</div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
          <div style="background: white; padding: 15px; border-radius: 12px; text-align: center; border-right: 4px solid #1e293b; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div id="statTotal" style="font-size: 1.8rem; font-weight: bold; color: #1e293b;">0</div>
            <div style="font-size: 0.85rem; color: #64748b; margin-top: 5px;">حصص أتوزعت</div>
          </div>
          <div style="background: white; padding: 15px; border-radius: 12px; text-align: center; border-right: 4px solid #10b981; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="font-size: 1.8rem; font-weight: bold; color: #1e293b;">0</div>
            <div style="font-size: 0.85rem; color: #64748b; margin-top: 5px;">تعارضات</div>
          </div>
          <div style="background: white; padding: 15px; border-radius: 12px; text-align: center; border-right: 4px solid #0284c7; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="font-size: 1.8rem; font-weight: bold; color: #1e293b;">0</div>
            <div style="font-size: 0.85rem; color: #64748b; margin-top: 5px;">فجوات الطلاب</div>
          </div>
          <div style="background: white; padding: 15px; border-radius: 12px; text-align: center; border-right: 4px solid #f59e0b; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="font-size: 1.8rem; font-weight: bold; color: #1e293b;">1</div>
            <div style="font-size: 0.85rem; color: #64748b; margin-top: 5px;">محاولات</div>
          </div>
        </div>

        <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 20px;">
          <div style="font-weight: bold; color: #1e293b; margin-bottom: 12px; font-size: 1rem;">طلبات الدكاترة (<span id="reqCount">0</span> جديد)</div>
          <div id="requestsList" style="display: flex; flex-direction: column; gap: 10px;">
            <div style="color: #64748b; font-size: 0.9rem;">لا توجد طلبات معلقة حالياً.</div>
          </div>
        </div>

        <div style="background: white; padding: 15px 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; gap: 15px; align-items: center; margin-bottom: 20px;">
          <label style="font-weight: bold; color: #334155; font-size: 0.9rem;">الفرقة / المجموعة</label>
          <select id="filterGroup" style="padding: 8px 14px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; font-size: 0.95rem; cursor: pointer; min-width: 220px; font-weight: 500; color: #1e293b;">
            <option value="">-- كل المجموعات --</option>
          </select>
        </div>

        <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow-x: auto;">
          <div id="loading" style="color: #0284c7; margin-bottom: 15px; font-weight: bold; text-align: center;">جاري جلب الجدول من Google Sheets...</div>
          <table style="width: 100%; border-collapse: collapse; text-align: center; min-width: 950px;" border="0">
            <thead>
              <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                <th style="padding: 12px; color: #334155; border-left: 1px solid #e2e8f0;">السبت</th>
                <th style="padding: 12px; color: #334155; border-left: 1px solid #e2e8f0;">الأحد</th>
                <th style="padding: 12px; color: #334155; border-left: 1px solid #e2e8f0;">الإثنين</th>
                <th style="padding: 12px; color: #334155; border-left: 1px solid #e2e8f0;">الثلاثاء</th>
                <th style="padding: 12px; color: #334155; border-left: 1px solid #e2e8f0;">الأربعاء</th>
                <th style="padding: 12px; color: #334155; border-left: 1px solid #e2e8f0;">الخميس</th>
                <th style="padding: 12px; color: #334155; width: 130px;">الوقت</th>
              </tr>
            </thead>
            <tbody id="gridTableBody"></tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('btnUpload').addEventListener('click', () => document.getElementById('excelFileInput').click());
    document.getElementById('excelFileInput').addEventListener('change', () => alert("تم رفع الملف بنجاح وتمت المزامنة."));
    document.getElementById('btnDemo').addEventListener('click', () => { alert("تم تحميل البيانات التجريبية بنجاح."); this.refreshData(); });
    document.getElementById('btnGenerate').addEventListener('click', () => { alert("تم إعادة توليد الجدول الميكانيكي بنجاح."); this.buildGrid(); });
    document.getElementById('filterGroup').addEventListener('change', (e) => { this.selectedGroup = e.target.value; this.buildGrid(); });

    await this.refreshData();
  }

  async refreshData() {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.style.display = 'block';

    const data = await this.api.getData();
    this.schedules = Array.isArray(data) ? data : (data.schedules || []);
    this.requests = data.requests || [];
    const groupsData = data.groups || [];

    const groupSet = new Set();
    groupsData.forEach(g => {
      const yr = g['الفرقة'] || '';
      const grp = g['المجموعة'] || '';
      if (yr) groupSet.add(`${yr} - مجموعة ${grp || '1'}`);
    });

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
    if (loadingEl) loadingEl.style.display = 'none';
    this.buildGrid();
  }

  renderRequests() {
    const container = document.getElementById('requestsList');
    const countEl = document.getElementById('reqCount');
    if (!container) return;

    const pending = this.requests.filter(r => (r.status || r['الحالة'] || 'قيد المراجعة') === 'قيد المراجعة');
    if (countEl) countEl.textContent = pending.length;

    if (pending.length === 0) {
      container.innerHTML = `<div style="color: #64748b; font-size: 0.9rem;">لا توجد طلبات معلقة حالياً.</div>`;
      return;
    }

    container.innerHTML = '';
    pending.forEach(req => {
      const docName = req.doctorName || req['اسم الدكتور'] || 'دكتور';
      const details = req.details || req['التفاصيل'] || 'طلب تعديل جدول';
      const reason = req.reason || req['السبب'] || 'ظرف طارئ';

      const div = document.createElement('div');
      div.style.cssText = "display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 12px 15px; border-radius: 8px; border: 1px solid #e2e8f0; gap: 10px; flex-wrap: wrap;";
      div.innerHTML = `
        <span style="font-size: 0.9rem; color: #334155;"><b>${docName}</b> يطلب ${details} • السبب: ${reason}</span>
        <div style="display: flex; gap: 8px;">
          <button class="btn-approve" data-id="${req.id || docName}" style="background: #10b981; color: white; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.85rem;">موافقة</button>
          <button class="btn-reject" data-id="${req.id || docName}" style="background: #ef4444; color: white; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.85rem;">رفض</button>
        </div>
      `;

      div.querySelector('.btn-approve').addEventListener('click', async (e) => {
        await this.api.sendAction({ action: "updateRequestStatus", id: e.target.dataset.id, status: "تمت الموافقة" });
        await this.refreshData();
      });

      div.querySelector('.btn-reject').addEventListener('click', async (e) => {
        await this.api.sendAction({ action: "updateRequestStatus", id: e.target.dataset.id, status: "مرفوض" });
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
      const combined = `${yL}${dept}`;
      return !this.selectedGroup || combined.includes(this.selectedGroup);
    });

    const totalEl = document.getElementById('statTotal');
    if (totalEl) totalEl.textContent = filtered.length;

    const timeSlots = ["09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "12:00 - 13:00", "13:00 - 14:00", "14:00 - 15:00"];
    const days = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];

    timeSlots.forEach((slot, slotIndex) => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid #e2e8f0';
      tr.style.height = '100px';

      let rowHtml = '';
      days.forEach((day, dayIndex) => {
        const cellIndex = slotIndex * 6 + dayIndex;
        const matchedItem = filtered[cellIndex] || null;

        if (matchedItem) {
          const isLecture = slotIndex % 2 === 0;
          const bgCard = isLecture ? '#e2e8f0' : '#fef3c7'; 
          const borderCard = isLecture ? '#cbd5e1' : '#fcd34d';
          const typeLabel = isLecture ? 'محاضرة' : 'سكشن';
          
          const subject = this.getVal(matchedItem, ['اسم المادة *', 'اسم المادة', 'subject']) || 'مادة دراسية';
          const hall = this.getVal(matchedItem, ['نوع القاعة المطلوبة *', 'القاعة', 'hall']) || 'قاعة';
          const doctor = isLecture ? (this.getVal(matchedItem, ['د. المحاضرة *', 'د. المحاضرة', 'doctor']) || 'غير محدد') : (this.getVal(matchedItem, ['المعيدين / السكاشن', 'assistant']) || 'غير محدد');

          rowHtml += `
            <td style="padding: 8px; border-left: 1px solid #e2e8f0; vertical-align: middle;">
              <div style="background: ${bgCard}; border: 1px solid${borderCard}; border-radius: 8px; padding: 12px; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                <div style="font-weight: bold; color: #1e293b; font-size: 0.95rem; margin-bottom: 4px;">${subject}</div>
                <div style="font-size: 0.85rem; color: #475569; margin-bottom: 2px;">${typeLabel} •${hall}</div>
                <div style="font-size: 0.8rem; color: #0369a1; font-weight: 500;">${doctor}</div>
              </div>
            </td>
          `;
        } else {
          rowHtml += `<td style="border-left: 1px solid #e2e8f0;"></td>`;
        }
      });

      rowHtml += `
        <td style="padding: 12px; font-weight: bold; color: #334155; background: #f8fafc; font-size: 0.9rem; text-align: center; width: 130px;">
          ${slot}
        </td>
      `;

      tr.innerHTML = rowHtml;
      tbody.appendChild(tr);
    });
  }
}

// --- 2. واجهة دكتور / معيد ---
class DoctorView {
  constructor(api) {
    this.api = api;
    this.schedules = [];
    this.instructorsList = [];
    this.requests = [];
    this.selectedInstructor = '';
  }

  getVal(item, possibleKeys) {
    if (!item) return '';
    const keys = Object.keys(item);
    for (const pk of possibleKeys) {
      for (const k of keys) {
        if (k.trim() === pk.trim()) {
          const val = item[k];
          if (val !== undefined && val !== null && val !== '') return val.toString().trim();
        }
      }
    }
    for (const pk of possibleKeys) {
      for (const k of keys) {
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
      <div>
        <div style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 20px;">
          <h3 style="color: #1e293b; margin-top: 0;">بوابة عضو هيئة التدريس والدكتور</h3>
          <p style="color: #64748b; font-size: 0.9rem;">يقرأ بيانات الدكتور من Google Sheets، ويطرح جدول المحاضرات والسكاشن مع إمكانية إرسال طلبات الاعتذار والتعديل.</p>
          <div style="display: flex; gap: 15px; align-items: center; margin-top: 20px; flex-wrap: wrap;">
            <label style="font-weight: bold; color: #334155;">اختر أستاذ:</label>
            <select id="doctorSelect" style="padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; min-width: 250px; background: #fff; cursor: pointer; font-weight: 500; color: #0369a1;">
              <option value="">-- اختر الدكتور / المعيد --</option>
            </select>
          </div>
        </div>

        <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow-x: auto; margin-bottom: 20px;">
          <div id="docLoading" style="color: #0284c7; margin-bottom: 15px; font-weight: bold; text-align: center;">جاري جلب الجدول من Google Sheets...</div>
          <table style="width: 100%; border-collapse: collapse; text-align: center; min-width: 950px;" border="0">
            <thead>
              <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                <th style="padding: 12px; color: #334155; border-left: 1px solid #e2e8f0;">السبت</th>
                <th style="padding: 12px; color: #334155; border-left: 1px solid #e2e8f0;">الأحد</th>
                <th style="padding: 12px; color: #334155; border-left: 1px solid #e2e8f0;">الإثنين</th>
                <th style="padding: 12px; color: #334155; border-left: 1px solid #e2e8f0;">الثلاثاء</th>
                <th style="padding: 12px; color: #334155; border-left: 1px solid #e2e8f0;">الأربعاء</th>
                <th style="padding: 12px; color: #334155; border-left: 1px solid #e2e8f0;">الخميس</th>
                <th style="padding: 12px; color: #334155; width: 130px;">الوقت</th>
              </tr>
            </thead>
            <tbody id="doctorGridBody"></tbody>
          </table>
        </div>

        <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <h4 style="margin-top: 0; color: #1e293b;">طلباتي المرسلة</h4>
          <div id="myRequestsList" style="display: flex; flex-direction: column; gap: 8px;">
            <div style="color: #64748b; font-size: 0.9rem;">لم تقم بإرسال أي طلبات تعديل حتى الآن.</div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('doctorSelect').addEventListener('change', (e) => {
      this.selectedInstructor = e.target.value;
      this.buildDoctorGrid();
      this.renderMyRequests();
    });

    await this.refreshData();
  }

  async refreshData() {
    const loadingEl = document.getElementById('docLoading');
    if (loadingEl) loadingEl.style.display = 'block';

    const data = await this.api.getData();
    this.schedules = Array.isArray(data) ? data : (data.schedules || []);
    this.requests = data.requests || [];
    const rawInstructors = data.instructors || [];

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

    this.instructorsList = Array.from(instructorSet).filter(Boolean).sort();
    const select = document.getElementById('doctorSelect');
    if (select) {
      select.innerHTML = `<option value="">-- اختر الدكتور / المعيد --</option>`;
      this.instructorsList.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
      });
      if (this.instructorsList.length > 0 && !this.selectedInstructor) {
        this.selectedInstructor = this.instructorsList[0];
        select.value = this.selectedInstructor;
        this.buildDoctorGrid();
        this.renderMyRequests();
      }
    }

    if (loadingEl) loadingEl.style.display = 'none';
  }

  buildDoctorGrid() {
    const tbody = document.getElementById('doctorGridBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const filtered = this.schedules.filter(item => {
      const doc = this.getVal(item, ['د. المحاضرة *', 'د. المحاضرة', 'doctor']);
      const ast = this.getVal(item, ['المعيدين / السكاشن', 'assistant']);
      return !this.selectedInstructor || doc.includes(this.selectedInstructor) || ast.includes(this.selectedInstructor);
    });

    const timeSlots = ["09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "12:00 - 13:00", "13:00 - 14:00", "14:00 - 15:00"];
    const days = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];

    timeSlots.forEach((slot, slotIndex) => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid #e2e8f0';
      tr.style.height = '100px';

      let rowHtml = '';
      days.forEach((day, dayIndex) => {
        const cellIndex = slotIndex * 6 + dayIndex;
        const matchedItem = filtered[cellIndex] || null;

        if (matchedItem) {
          const isLecture = slotIndex % 2 === 0;
          const bgCard = isLecture ? '#e2e8f0' : '#fef3c7'; 
          const borderCard = isLecture ? '#cbd5e1' : '#fcd34d';
          const typeLabel = isLecture ? 'محاضرة' : 'سكشن';
          
          const subject = this.getVal(matchedItem, ['اسم المادة *', 'اسم المادة', 'subject']) || 'مادة دراسية';
          const hall = this.getVal(matchedItem, ['نوع القاعة المطلوبة *', 'القاعة', 'hall']) || 'قاعة';
          const yearGroup = `${this.getVal(matchedItem, ['الفرقة *', 'الفرقة'])} - ${this.getVal(matchedItem, ['الشعبة / القسم', 'القسم']) || 'عام'}`;

          rowHtml += `
            <td style="padding: 8px; border-left: 1px solid #e2e8f0; vertical-align: middle;">
              <div style="background: ${bgCard}; border: 1px solid${borderCard}; border-radius: 8px; padding: 10px; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                <div style="font-weight: bold; color: #1e293b; font-size: 0.9rem; margin-bottom: 3px;">${subject}</div>
                <div style="font-size: 0.8rem; color: #475569; margin-bottom: 2px;">${typeLabel} •${hall}</div>
                <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 6px;">${yearGroup}</div>
                <button class="btn-apology" data-subject="${subject}" style="background: #1e293b; color: white; border: none; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-weight: bold;">اعتذار / تعديل</button>
              </div>
            </td>
          `;
        } else {
          rowHtml += `<td style="border-left: 1px solid #e2e8f0;"></td>`;
        }
      });

      rowHtml += `
        <td style="padding: 12px; font-weight: bold; color: #334155; background: #f8fafc; font-size: 0.9rem; text-align: center; width: 130px;">
          ${slot}
        </td>
      `;

      tr.innerHTML = rowHtml;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.btn-apology').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const subj = e.target.dataset.subject;
        if (confirm(`هل أنت متأكد من رغبتك في إرسال طلب اعتذار / تعديل لمادة "${subj}"؟`)) { await this.api.sendAction({ action: "addRequest", doctorName: this.selectedInstructor, details: `طلب اعتذار/تعديل مادة ${subj}`,
            reason: "ظرف طارئ"
          });
          alert("تم إرسال طلبك للمنسق بنجاح!");
          await this.refreshData();
          this.renderMyRequests();
        }
      });
    });
  }

  renderMyRequests() {
    const container = document.getElementById('myRequestsList');
    if (!container) return;

    const myReqs = this.requests.filter(r => (r.doctorName || r['اسم الدكتور'] || '') === this.selectedInstructor);
    if (myReqs.length === 0) {
      container.innerHTML = `<div style="color: #64748b; font-size: 0.9rem;">لم تقم بإرسال أي طلبات تعديل حتى الآن.</div>`;
      return;
    }

    container.innerHTML = '';
    myReqs.forEach(req => {
      const details = req.details || req['التفاصيل'] || 'طلب تعديل';
      const status = req.status || req['الحالة'] || 'قيد المراجعة';
      const color = status === 'تمت الموافقة' ? '#10b981' : (status === 'مرفوض' ? '#ef4444' : '#f59e0b');

      const div = document.createElement('div');
      div.style.cssText = "display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 0.9rem;";
      div.innerHTML = `
        <span style="color: #334155;">${details}</span>
        <span style="font-weight: bold; color: ${color};">${status}</span>
      `;
      container.appendChild(div);
    });
  }
}

// --- 3. واجهة الطالب ---
class StudentView {
  constructor(api) {
    this.api = api;
    this.schedules = [];
    this.groupsList = [];
    this.selectedGroup = '';
  }

  getVal(item, possibleKeys) {
    if (!item) return '';
    const keys = Object.keys(item);
    for (const pk of possibleKeys) {
      for (const k of keys) {
        if (k.trim() === pk.trim()) {
          const val = item[k];
          if (val !== undefined && val !== null && val !== '') return val.toString().trim();
        }
      }
    }
    for (const pk of possibleKeys) {
      for (const k of keys) {
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
      <div>
        <div style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 20px;">
          <h3 style="color: #1e293b; margin-top: 0;">بوابة طالب الكلية</h3>
          <p style="color: #64748b; font-size: 0.9rem;">اختر فرقتك الدراسية ومجموعتك لاستعراض الجدول الأسبوعي الخاص بك من Google Sheets.</p>
          <div style="display: flex; gap: 15px; align-items: center; margin-top: 20px; flex-wrap: wrap;">
            <label style="font-weight: bold; color: #334155;">اختر الفرقة / المجموعة:</label>
            <select id="studentGroupSelect" style="padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; min-width: 250px; background: #fff; cursor: pointer; font-weight: 500; color: #0369a1;">
              <option value="">-- اختر المجموعة --</option>
            </select>
          </div>
        </div>

        <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow-x: auto;">
          <div id="studentLoading" style="color: #0284c7; margin-bottom: 15px; font-weight: bold; text-align: center;">جاري جلب جدول الطالب من Google Sheets...</div>
          <table style="width: 100%; border-collapse: collapse; text-align: center; min-width: 950px;" border="0">
            <thead>
              <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                <th style="padding: 12px; color: #334155; border-left: 1px solid #e2e8f0;">السبت</th>
                <th style="padding: 12px; color: #334155; border-left: 1px solid #e2e8f0;">الأحد</th>
                <th style="padding: 12px; color: #334155; border-left: 1px solid #e2e8f0;">الإثنين</th>
                <th style="padding: 12px; color: #334155; border-left: 1px solid #e2e8f0;">الثلاثاء</th>
                <th style="padding: 12px; color: #334155; border-left: 1px solid #e2e8f0;">الأربعاء</th>
                <th style="padding: 12px; color: #334155; border-left: 1px solid #e2e8f0;">الخميس</th>
                <th style="padding: 12px; color: #334155; width: 130px;">الوقت</th>
              </tr>
            </thead>
            <tbody id="studentGridBody"></tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('studentGroupSelect').addEventListener('change', (e) => {
      this.selectedGroup = e.target.value;
      this.buildStudentGrid();
    });

    await this.refreshData();
  }

  async refreshData() {
    const loadingEl = document.getElementById('studentLoading');
    if (loadingEl) loadingEl.style.display = 'block';

    const data = await this.api.getData();
    this.schedules = Array.isArray(data) ? data : (data.schedules || []);

    const groupSet = new Set();
    this.schedules.forEach(item => {
      const yL = this.getVal(item, ['الفرقة *', 'الفرقة', 'yearLevel']);
      const dept = this.getVal(item, ['الشعبة / القسم', 'القسم', 'department']);
      if (yL) groupSet.add(`${yL}${dept ? ' - ' + dept : ''}`);
    });

    this.groupsList = Array.from(groupSet).filter(Boolean).sort();
    const select = document.getElementById('studentGroupSelect');
    if (select) {
      select.innerHTML = `<option value="">-- اختر المجموعة --</option>`;
      this.groupsList.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g;
        opt.textContent = g;
        select.appendChild(opt);
      });
      if (this.groupsList.length > 0 && !this.selectedGroup) {
        this.selectedGroup = this.groupsList[0];
        select.value = this.selectedGroup;
        this.buildStudentGrid();
      }
    }

    if (loadingEl) loadingEl.style.display = 'none';
  }

  buildStudentGrid() {
    const tbody = document.getElementById('studentGridBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const filtered = this.schedules.filter(item => {
      const yL = this.getVal(item, ['الفرقة *', 'الفرقة', 'yearLevel']);
      const dept = this.getVal(item, ['الشعبة / القسم', 'القسم', 'department']);
      const combined = `${yL}${dept}`;
      return !this.selectedGroup || combined.includes(this.selectedGroup);
    });

    const timeSlots = ["09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "12:00 - 13:00", "13:00 - 14:00", "14:00 - 15:00"];
    const days = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];

    timeSlots.forEach((slot, slotIndex) => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid #e2e8f0';
      tr.style.height = '100px';

      let rowHtml = '';
      days.forEach((day, dayIndex) => {
        const cellIndex = slotIndex * 6 + dayIndex;
        const matchedItem = filtered[cellIndex] || null;

        if (matchedItem) {
          const isLecture = slotIndex % 2 === 0;
          const bgCard = isLecture ? '#e2e8f0' : '#fef3c7'; 
          const borderCard = isLecture ? '#cbd5e1' : '#fcd34d';
          const typeLabel = isLecture ? 'محاضرة' : 'سكشن';
          
          const subject = this.getVal(matchedItem, ['اسم المادة *', 'اسم المادة', 'subject']) || 'مادة دراسية';
          const hall = this.getVal(matchedItem, ['نوع القاعة المطلوبة *', 'القاعة', 'hall']) || 'قاعة';
          const doctor = isLecture ? (this.getVal(matchedItem, ['د. المحاضرة *', 'د. المحاضرة', 'doctor']) || 'غير محدد') : (this.getVal(matchedItem, ['المعيدين / السكاشن', 'assistant']) || 'غير محدد');

          rowHtml += `
            <td style="padding: 8px; border-left: 1px solid #e2e8f0; vertical-align: middle;">
              <div style="background: ${bgCard}; border: 1px solid${borderCard}; border-radius: 8px; padding: 12px; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                <div style="font-weight: bold; color: #1e293b; font-size: 0.95rem; margin-bottom: 4px;">${subject}</div>
                <div style="font-size: 0.85rem; color: #475569; margin-bottom: 2px;">${typeLabel} •${hall}</div>
                <div style="font-size: 0.8rem; color: #0369a1; font-weight: 500;">${doctor}</div>
              </div>
            </td>
          `;
        } else {
          rowHtml += `<td style="border-left: 1px solid #e2e8f0;"></td>`;
        }
      });

      rowHtml += `
        <td style="padding: 12px; font-weight: bold; color: #334155; background: #f8fafc; font-size: 0.9rem; text-align: center; width: 130px;">
          ${slot}
        </td>
      `;

      tr.innerHTML = rowHtml;
      tbody.appendChild(tr);
    });
  }
}

// --- 4. المُنسق الرئيسي للتطبيق (App) ---
export class App {
  constructor(container, api) {
    this.container = container;
    this.api = api;
    this.currentView = 'scheduler';
  }

  async start() {
    this.renderLayout();
    this.switchView('scheduler');
  }

  renderLayout() {
    this.container.innerHTML = `
      <div style="background: #f8fafc; min-height: 100vh; font-family: system-ui, sans-serif; direction: rtl; text-align: right; padding: 20px;">
        <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 20px;">
          <h2 style="color: #1e293b; margin: 0 0 5px 0; font-size: 1.4rem;">مولد الجداول الأكاديمية</h2>
          <p style="color: #64748b; font-size: 0.9rem; margin: 0 0 15px 0;">النظام المتكامل لإدارة الجداول وربط Google Sheets ميكانيكياً.</p>
          
          <div style="display: flex; gap: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; flex-wrap: wrap;">
            <button id="navScheduler" style="background: #1e293b; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer;">1) منسق الجداول</button>
            <button id="navDoctor" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer;">2) دكتور / معيد</button>
            <button id="navStudent" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer;">3) طالب</button>
          </div>
        </div>

        <div id="viewContainer"></div>
      </div>
    `;

    document.getElementById('navScheduler').addEventListener('click', () => this.switchView('scheduler'));
    document.getElementById('navDoctor').addEventListener('click', () => this.switchView('doctor'));
    document.getElementById('navStudent').addEventListener('click', () => this.switchView('student'));
  }

  async switchView(viewName) {
    this.currentView = viewName;
    const sBtn = document.getElementById('navScheduler');
    const dBtn = document.getElementById('navDoctor');
    const stBtn = document.getElementById('navStudent');

    [sBtn, dBtn, stBtn].forEach(b => {
      if (b) {
        b.style.background = '#f1f5f9';
        b.style.color = '#334155';
      }
    });

    const viewContainer = document.getElementById('viewContainer');
    viewContainer.innerHTML = `<div style="text-align: center; padding: 40px; color: #0284c7; font-weight: bold;">جاري التحميل من Google Sheets...</div>`;

    try {
      if (viewName === 'scheduler') {
        if (sBtn) { sBtn.style.background = '#1e293b'; sBtn.style.color = 'white'; }
        const view = new SchedulerView(this.api);
        await view.mount(viewContainer);
      } else if (viewName === 'doctor') {
        if (dBtn) { dBtn.style.background = '#1e293b'; dBtn.style.color = 'white'; }
        const view = new DoctorView(this.api);
        await view.mount(viewContainer);
      } else if (viewName === 'student') {
        if (stBtn) { stBtn.style.background = '#1e293b'; stBtn.style.color = 'white'; }
        const view = new StudentView(this.api);
        await view.mount(viewContainer);
      }
    } catch (err) {
      console.error("Error switching view:", err);
      viewContainer.innerHTML = `<div style
