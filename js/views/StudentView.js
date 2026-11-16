export class StudentView {
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
    try {
      container.innerHTML = `
        <div style="padding: 20px; direction: rtl; text-align: right; background: #f8fafc; min-height: 100vh; font-family: system-ui, sans-serif;">
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

          <!-- جدول الطالب الشبكي -->
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
    } catch (err) {
      console.error("Error mounting StudentView:", err);
      container.innerHTML = `<div style="padding: 20px; color: red; text-align: center;">حدث خطأ أثناء تحميل صفحة الطالب: ${err.message}</div>`;
    }
  }

  async refreshData() {
    try {
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
      this.populateGroupSelect();

      if (loadingEl) loadingEl.style.display = 'none';
    } catch (error) {
      console.error("Error refreshing student data:", error);
      const loadingEl = document.getElementById('studentLoading');
      if (loadingEl) loadingEl.style.display = 'none';
    }
  }

  populateGroupSelect() {
    const select = document.getElementById('studentGroupSelect');
    if (!select) return;
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

  buildStudentGrid() {
    const tbody = document.getElementById('studentGridBody');
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
              <div style="background: ${bgCard}; border: 1px solid ${borderCard}; border-radius: 8px; padding: 12px; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                <div style="font-weight: bold; color: #1e293b; font-size: 0.95rem; margin-bottom: 4px;">${subject}</div>
                <div style="font-size: 0.85rem; color: #475569; margin-bottom: 2px;">${typeLabel} • ${hall}</div>
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
