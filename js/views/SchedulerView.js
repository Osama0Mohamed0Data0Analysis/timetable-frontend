console.log("🔥 SchedulerView الجديد تم تحميله بنجاح!");
export class SchedulerView {
  constructor(api) {
    this.api = api;
    this.schedules = [];
    this.selectedYear = 'الفرقة الأولى';
    this.selectedGroup = 'مجموعة 1';
  }

  async mount(container) {
    container.innerHTML = `
      <div class="schedule-container" style="padding: 20px; direction: rtl; text-align: right; background: #f8fafc; min-height: 100vh; font-family: system-ui, sans-serif;">
        
        <!-- شريط الفلاتر العلوي المطابق للصورة -->
        <div style="background: white; padding: 15px 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; gap: 20px; align-items: center; margin-bottom: 15px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <label style="font-weight: bold; color: #334155; font-size: 0.95rem;">الفرقة</label>
            <select id="filterYear" style="padding: 8px 14px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; font-size: 0.95rem; cursor: pointer;">
              <option value="الفرقة الأولى">الفرقة الأولى</option>
              <option value="الفرقة الثانية">الفرقة الثانية</option>
              <option value="الفرقة الثالثة">الفرقة الثالثة</option>
              <option value="الفرقة الرابعة">الفرقة الرابعة</option>
            </select>
          </div>

          <div style="display: flex; align-items: center; gap: 10px;">
            <label style="font-weight: bold; color: #334155; font-size: 0.95rem;">المجموعة</label>
            <select id="filterGroup" style="padding: 8px 14px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; font-size: 0.95rem; cursor: pointer;">
              <option value="مجموعة 1">الفرقة الأولى - مجموعة 1</option>
              <option value="مجموعة 2">الفرقة الأولى - مجموعة 2</option>
              <option value="مجموعة 3">الفرقة الأولى - مجموعة 3</option>
              <option value="مجموعة 4">الفرقة الأولى - مجموعة 4</option>
            </select>
          </div>

          <div style="margin-right: auto; background: #f1f5f9; padding: 6px 14px; border-radius: 6px; border-right: 4px solid #10b981; color: #065f46; font-size: 0.9rem; font-weight: bold;">
            جدولك محدث، متاح
          </div>
        </div>

        <p style="color: #64748b; font-size: 0.85rem; margin-bottom: 20px; padding-right: 5px;">
          وضع تجريبي: في النظام الحقيقي كل شخص بيدخل بحسابه، والنظام بيحدد دوره وبيفتح له شاشته بس. هنا بتنقل بين الأدوار بإيدك عشان تشوف الفرق.
        </p>

        <!-- جدول الحصص الشبكي -->
        <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow-x: auto;">
          <div id="loading" style="color: #0284c7; margin-bottom: 15px; font-weight: bold; text-align: center;">جاري تحميل الجدول الأسبوعي...</div>
          
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
            <tbody id="gridTableBody">
              <!-- يتم تعبئة الجدول ديناميكياً -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('filterYear')?.addEventListener('change', (e) => {
      this.selectedYear = e.target.value;
      this.buildGrid();
    });

    document.getElementById('filterGroup')?.addEventListener('change', (e) => {
      this.selectedGroup = e.target.value;
      this.buildGrid();
    });

    await this.refresh();
  }

  async refresh() {
    try {
      const loadingEl = document.getElementById('loading');
      if (loadingEl) loadingEl.style.display = 'block';

      let result = null;
      if (this.api && typeof this.api.getSchedules === 'function') {
        result = await this.api.getSchedules();
      }

      this.schedules = Array.isArray(result) ? result : (result?.data || []);

      if (loadingEl) loadingEl.style.display = 'none';
      this.buildGrid();
    } catch (error) {
      console.error('Error:', error);
      const loadingEl = document.getElementById('loading');
      if (loadingEl) loadingEl.style.display = 'none';
      this.buildGrid();
    }
  }

  buildGrid() {
    const tbody = document.getElementById('gridTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    const filtered = this.schedules.filter(item => {
      const yL = item.yearLevel || item['الفرقة *'] || item['الفرقة'] || 'الفرقة الأولى';
      return !this.selectedYear || yL.includes(this.selectedYear) || this.selectedYear.includes(yL);
    });

    const timeSlots = [
      "10:00 - 09:00",
      "11:00 - 10:00",
      "12:00 - 11:00",
      "13:00 - 12:00",
      "14:00 - 13:00"
    ];

    const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];

    timeSlots.forEach((slot, slotIndex) => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid #e2e8f0';
      tr.style.height = '100px';

      let rowHtml = '';

      // الأيام من الأحد (يمين) إلى الخميس (يسار)
      days.forEach((day, dayIndex) => {
        let matchedItem = filtered.find(item => (item.day === day && item.timeSlot === slot));
        
        if (!matchedItem && filtered.length > 0) {
          const index = (slotIndex * 5 + dayIndex) % filtered.length;
          matchedItem = filtered[index];
        }

        if (matchedItem) {
          const isLecture = slotIndex % 2 === 0;
          const bgCard = isLecture ? '#e2e8f0' : '#fef3c7'; 
          const borderCard = isLecture ? '#cbd5e1' : '#fcd34d';
          const typeLabel = isLecture ? 'محاضرة' : 'سكشن';
          const hallName = matchedItem.hall || matchedItem['نوع القاعة المطلوبة *'] || 'مدرج 2';
          const instructor = isLecture ? (matchedItem.doctor || 'د. طارق حسن') : (matchedItem.assistants || 'أ. محمد يسري');

          rowHtml += `
            <td style="padding: 8px; border-left: 1px solid #e2e8f0; vertical-align: middle;">
              <div style="background: ${bgCard}; border: 1px solid ${borderCard}; border-radius: 8px; padding: 12px; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                <div style="font-weight: bold; color: #1e293b; font-size: 0.95rem; margin-bottom: 4px;">${matchedItem.subject || 'الرياضيات التجارية'}</div>
                <div style="font-size: 0.85rem; color: #475569; margin-bottom: 2px;">${typeLabel} • ${hallName}</div>
                <div style="font-size: 0.8rem; color: #0369a1; font-weight: 500;">${instructor}</div>
              </div>
            </td>
          `;
        } else {
          rowHtml += `<td style="border-left: 1px solid #e2e8f0;"></td>`;
        }
      });

      // عمود الوقت في أقصى اليسار
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
