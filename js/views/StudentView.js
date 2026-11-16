export class StudentView {
  constructor(api) {
    this.api = api;
    this.schedules = [];
  }

  async mount(container) {
    container.innerHTML = `
      <div style="padding: 20px; direction: rtl; text-align: right; background: #f8fafc; min-height: 100vh; font-family: system-ui, sans-serif;">
        <div style="background: white; padding: 15px 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px; font-weight: bold; color: #1e293b;">
          جدولك محدث، متاح للطلاب (الفرقة الأولى - مجموعة 1)
        </div>
        <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow-x: auto;">
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

    const data = await this.api.getData();
    this.schedules = data.schedules || [];
    this.buildStudentGrid();
  }

  buildStudentGrid() {
    const tbody = document.getElementById('studentGridBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const timeSlots = ["08:00 - 09:30", "09:30 - 11:00", "11:00 - 12:30", "12:30 - 14:00", "14:00 - 15:30"];
    const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];

    timeSlots.forEach((slot, slotIndex) => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid #e2e8f0';
      tr.style.height = '100px';

      let rowHtml = '';
      days.forEach((day, dayIndex) => {
        const matchedItem = this.schedules[(slotIndex * 5 + dayIndex) % this.schedules.length];
        if (matchedItem) {
          const subject = matchedItem['اسم المادة *'] || matchedItem['اسم المادة'] || 'مادة دراسية';
          const hall = matchedItem['نوع القاعة المطلوبة *'] || matchedItem['القاعة'] || 'قاعة';
          const doctor = matchedItem['د. المحاضرة *'] || matchedItem['د. المحاضرة'] || 'د. طارق حسن';

          rowHtml += `
            <td style="padding: 8px; border-left: 1px solid #e2e8f0; vertical-align: middle;">
              <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                <div style="font-weight: bold; color: #1e293b; font-size: 0.95rem; margin-bottom: 4px;">${subject}</div>
                <div style="font-size: 0.85rem; color: #475569; margin-bottom: 2px;">محاضرة • ${hall}</div>
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
