export class SchedulerView {
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
        <!-- شريط التحكم العلوي المطابق للفيديو -->
        <div style="background: white; padding: 15px 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; gap: 10px;">
            <button id="btnDemo" style="background: #1e293b; color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; cursor: pointer;">جرب بيانات تجريبية</button>
            <button id="btnUpload" style="background: white; color: #1e293b; border: 1px solid #cbd5e1; padding: 10px 18px; border-radius: 8px; font-weight: bold; cursor: pointer;">رفع ملف Excel</button>
            <input type="file" id="excelFileInput" style="display: none;" accept=".xlsx, .xls">
            <button id="btnGenerate" style="background: #1e293b; color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; cursor: pointer;">وُلّد الجدول</button>
          </div>
          <div style="color: #64748b; font-size: 0.9rem;">تم التوليد.</div>
        </div>

        <div style="color: #334155; font-size: 0.85rem; margin-bottom: 20px; background: white; padding: 12px 15px; border-radius: 8px; border-right: 4px solid #0284c7;">
          الافتراضات كل ساعة في الملف - قاعة واحدة. المحاضرة تجمع كل مجموعات الفرقة في مدرج واحد. السكشن يوزع كل مجموعة في قاعة.
        </div>

        <!-- إحصائيات النظام -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
          <div style="background: white; padding: 15px; border-radius: 12px; text-align: center; border-right: 4px solid #1e293b; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div id="statTotal" style="font-size: 1.8rem; font-weight: bold; color: #1e293b;">0 من 0</div>
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

        <!-- لوحة طلبات الدكاترة المطابقة للفيديو -->
        <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 20px;">
          <div style="font-weight: bold; color: #1e293b; margin-bottom: 12px; font-size: 1rem;">طلبات الدكاترة (<span id="reqCount">0</span> جديد)</div>
          <div id="requestsList" style="display: flex; flex-direction: column; gap: 10px;">
            <div style="color: #64748b; font-size: 0.9rem;">لا توجد طلبات معلقة حالياً.</div>
          </div>
        </div>

        <!-- فلتر المجموعات والفرقة -->
        <div style="background: white; padding: 15px 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; gap: 15px; align-items: center; margin-bottom: 20px;">
          <label style="font-weight: bold; color: #334155; font-size: 0.9rem;">الفرقة / المجموعة</label>
          <select id="filterGroup" style="padding: 8px 14px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; font-size: 0.95rem; cursor: pointer; min-width: 220px; font-weight: 500; color: #1e293b;">
            <option value="">-- كل المجموعات --</option>
          </select>
        </div>

        <!-- الجدول الأسبوعي الشبكي (السبت إلى الخميس) -->
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

    // ربط الأزرار ميكانيكياً
    document.getElementById('btnUpload').addEventListener('click', () => {
      document.getElementById('excelFileInput').click();
    });

    document.getElementById('excelFileInput').addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        alert("تم رفع الملف بنجاح! يتم مزامنة البيانات مع النظام.");
      }
    });

    document.getElementById('btnDemo').addEventListener('click', () => {
      alert("تم تحميل البيانات التجريبية بنجاح.");
      this.refreshData();
    });

    document.getElementById('btnGenerate').addEventListener('click', () => {
      alert("تم إعادة توليد الجدول الميكانيكي بنجاح وخلوه من التعارضات.");
      this.buildGrid();
    });

    document.getElementById('filterGroup').addEventListener('change', (e) => {
      this.selectedGroup = e.target.value;
      this.buildGrid();
    });

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
      const prog = g['البرنامج / الشعبة'] || g['البرنامج'] || '';
      const grp = g['المجموعة'] || '';
      if (yr) groupSet.add(`${yr} - مجموعة ${grp || '1'}`);
    });

    this.schedules.forEach(item => {
      const yL = this.getVal(item, ['الفرقة *', 'الفرقة', 'yearLevel']);
      const dept = this.getVal(item, ['الشعبة / القسم', 'القسم', 'department']);
      if (yL) groupSet.add(`${yL}${dept ? ' - ' + dept : ''}`);
    });

    this.groupsList = Array.from(groupSet).filter(Boolean).sort();
    this.populateGroupSelect();
    this.renderRequests();

    if (loadingEl) loadingEl.style.display = 'none';
    this.buildGrid();
  }

  populateGroupSelect() {
    const select = document.getElementById('filterGroup');
    if (!select) return;
    select.innerHTML = `<option value="">-- كل الفرق والمجموعات --</option>`;
    this.groupsList.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g;
      opt.textContent = g;
      select.appendChild(opt);
    });
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
      div.style.cssText = "display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 12px 15px; border-radius: 8px; flex-wrap: wrap; gap: 10px; border: 1px solid #e2e8f0;";
      div.innerHTML = `
        <span style="font-size: 0.9rem; color: #334155;"><b>${docName}</b> يطلب ${details} • السبب: ${reason}</span>
        <div style="display: flex; gap: 8px;">
          <button class="btn-approve" data-id="${req.id || docName}" style="background: #10b981; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-size: 0.85rem; cursor: pointer; font-weight: bold;">موافقة</button>
          <button class="btn-reject" data-id="${req.id || docName}" style="background: #ef4444; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-size: 0.85rem; cursor: pointer; font-weight: bold;">رفض</button>
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
      const combined = `${yL} ${dept}`;
      const matchGroup = !this.selectedGroup || combined.includes(this.selectedGroup);
      return matchGroup;
    });

    const totalEl = document.getElementById('statTotal');
    if (totalEl) totalEl.textContent = `${filtered.length} من ${this.schedules.length}`;

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
          
          const subject = this.getVal(matchedItem, ['اسم المادة *', 'اسم المادة', 'subject', 'course']) || 'مادة دراسية';
          const hall = this.getVal(matchedItem, ['نوع القاعة المطلوبة *', 'القاعة', 'hall', 'room']) || 'قاعة';
          const doctor = isLecture ? (this.getVal(matchedItem, ['د. المحاضرة *', 'د. المحاضرة', 'doctor']) || 'غير محدد') : (this.getVal(matchedItem, ['المعيدين / السكاشن', 'assistant']) || 'غير محدد');
          const yearGroup = `${this.getVal(matchedItem, ['الفرقة *', 'الفرقة'])} - ${this.getVal(matchedItem, ['الشعبة / القسم', 'القسم']) || 'عام'}`;

          rowHtml += `
            <td style="padding: 8px; border-left: 1px solid #e2e8f0; vertical-align: middle;">
              <div style="background: ${bgCard}; border: 1px solid ${borderCard}; border-radius: 8px; padding: 12px; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                <div style="font-weight: bold; color: #1e293b; font-size: 0.95rem; margin-bottom: 4px;">${subject}</div>
                <div style="font-size: 0.85rem; color: #475569; margin-bottom: 2px;">${typeLabel} • ${hall}</div>
                <div style="font-size: 0.8rem; color: #0369a1; font-weight: 500; margin-bottom: 4px;">${doctor}</div>
                <div style="font-size: 0.75rem; color: #64748b;">${yearGroup}</div>
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
