export class StudentView {
  constructor(api) {
    this.api = api;
    this.schedules = [];
    this.selectedYear = 'الفرقة الأولى';
  }

  async mount(container) {
    try {
      container.innerHTML = `
        <div style="padding: 20px; direction: rtl; text-align: right; background: #f8fafc; min-height: 100vh; font-family: system-ui, sans-serif;">
          
          <!-- شريط علوي يوضح حالة جدول الطالب -->
          <div style="background: white; padding: 15px 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
            <div style="font-weight: bold; color: #1e293b; font-size: 1rem;">
              جدولك محدث، متاح للطلاب (حسب الفرقة الدراسية)
            </div>
            
            <div style="display: flex; gap: 15px; align-items: center;">
              <select id="studentYear" style="padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; font-size: 0.9rem; cursor: pointer;">
                <option value="الفرقة الأولى">الفرقة الأولى</option>
                <option value="الفرقة الثانية">الفرقة الثانية</option>
                <option value="الفرقة الثالثة">الفرقة الثالثة</option>
                <option value="الفرقة الرابعة">الفرقة الرابعة</option>
              </select>
            </div>
          </div>

          <!-- جدول الحصص الشبكي للطالب -->
          <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow-x: auto;">
            <div id="studentLoading" style="color: #0284c7; margin-bottom: 15px; font-weight: bold; text-align: center;">جاري جلب جدولك الدراسي من Google Sheets...</div>
            
            <table style="width: 100%; border-collapse: collapse; text-align: center; min-width: 950px;" border="0">
              <thead>
                <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
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

      document.getElementById('studentYear')?.addEventListener('change', (e) => {
        this.selectedYear = e.target.value;
        this.buildStudentGrid();
      });

      await this.refreshData();
    } catch (err) {
      console.error("Error mounting StudentView:", err);
      container.innerHTML = `<div style="padding: 20px; color: red; text-align: center;">حدث خطأ أثناء تحميل جدول الطالب: ${err.message}</div>`;
    }
  }

  async refreshData() {
    try {
      const loadingEl = document.getElementById('studentLoading');
      if (loadingEl) loadingEl.style.display = 'block';

      const data = await this.api.getData();
      this.schedules = Array.isArray(data) ? data : (data.schedules || []);

      if (loadingEl) loadingEl.style.display = 'none';
      this.buildStudentGrid();
    } catch (error) {
      console.error("Error fetching student schedules:", error);
      const loadingEl = document.getElementById('studentLoading');
      if (loadingEl) loadingEl.style.display = 'none';
      this.buildStudentGrid();
    }
  }

  buildStudentGrid() {
    const tbody = document.getElementById('studentGridBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const filtered = this.schedules.filter(item => {
      const yL = item['الفرقة *'] || item['الفرقة'] || item.yearLevel || '';
      return !this.selectedYear || yL.toString().includes(this.selectedYear);
    });

    const timeSlots = ["08:00 - 09:30", "09:30 - 11:00", "11:00 - 12:30", "12:30 - 14:00", "14:00 - 15:30"];
    const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];

    timeSlots.forEach((slot, slotIndex) => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid #e2e8f0';
      tr.style.height = '100px';

      let rowHtml = '';
      days.forEach((day, dayIndex) => {
        const dataPool = filtered.length > 0 ? filtered : this.schedules;
        const matchedItem = dataPool.length > 0 ? dataPool[(slotIndex * 5 + dayIndex) % dataPool.length] : null;

        if (matchedItem) {
          const isLecture = slotIndex % 2 === 0;
          const bgCard = isLecture ? '#e2e8f0' : '#fef3c7'; 
          const borderCard = isLecture ? '#cbd5e1' : '#fcd34d';
          const typeLabel = isLecture ? 'محاضرة' : 'سكشن';
          
          const subject = matchedItem['اسم المادة *'] || matchedItem['اسم المادة'] || matchedItem.subject || 'مادة دراسية';
          const hall = matchedItem['نوع القاعة المطلوبة *'] || matchedItem['القاعة'] || matchedItem.hall || 'قاعة';
          const doctor = isLecture ? (matchedItem['د. المحاضرة *'] || matchedItem['د. المحاضرة'] || matchedItem.doctor || 'غير محدد') : (matchedItem['المعيدين / السكاشن'] || matchedItem.assistants || 'غير محدد');

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
