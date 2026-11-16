export class SchedulerView {
  constructor(api) {
    this.api = api;
    this.schedules = [];
  }

  async mount(container) {
    container.innerHTML = `
      <div class="schedule-container" style="padding: 20px; direction: rtl; text-align: right;">
        <h2>جدول المحاضرات والسكاشن</h2>
        <div id="loading" style="color: #666; margin: 10px 0;">جاري تحميل البيانات من Google Sheets...</div>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px; background: white;" border="1">
            <thead>
              <tr style="background: #f4f4f4;">
                <th style="padding: 10px;">كود المادة</th>
                <th style="padding: 10px;">اسم المادة</th>
                <th style="padding: 10px;">الفرقة</th>
                <th style="padding: 10px;">الشعبة / القسم</th>
                <th style="padding: 10px;">الفصل الدراسي</th>
                <th style="padding: 10px;">نوع القاعة</th>
                <th style="padding: 10px;">د. المحاضرة</th>
                <th style="padding: 10px;">المعيدين</th>
              </tr>
            </thead>
            <tbody id="scheduleTableBody">
              <tr><td colspan="8" style="text-align: center; padding: 20px;">لا توجد بيانات متاحة حالياً</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    await this.refresh();
  }

  async refresh() {
    try {
      const loadingEl = document.getElementById('loading');
      if (loadingEl) loadingEl.style.display = 'block';

      // جلب البيانات من الـ API
      const result = await this.api.getSchedules();
      this.schedules = Array.isArray(result) ? result : (result?.data || []);

      if (loadingEl) loadingEl.style.display = 'none';
      this.build();
    } catch (error) {
      console.error('خطأ في جلب الجداول:', error);
      const loadingEl = document.getElementById('loading');
      if (loadingEl) loadingEl.innerText = 'حدث خطأ أثناء تحميل البيانات.';
    }
  }

  build() {
    const tbody = document.getElementById('scheduleTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!this.schedules || this.schedules.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px;">لا توجد بيانات مطابقة</td></tr>`;
      return;
    }

    // بناء الصفوف بأمان تامة لتجنب أي أخطاء undefined
    this.schedules.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="padding: 8px;">${item.code || item['كود المادة'] || ''}</td>
        <td style="padding: 8px;">${item.subject || item['اسم المادة *'] || item['اسم المادة'] || ''}</td>
        <td style="padding: 8px;">${item.yearLevel || item['الفرقة *'] || item['الفرقة'] || ''}</td>
        <td style="padding: 8px;">${item.department || item['الشعبة / القسم'] || ''}</td>
        <td style="padding: 8px;">${item.semester || item['الفصل الدراسي'] || ''}</td>
        <td style="padding: 8px;">${item.hall || item['نوع القاعة المطلوبة *'] || ''}</td>
        <td style="padding: 8px;">${item.doctor || item['د. المحاضرة *'] || ''}</td>
        <td style="padding: 8px;">${item.assistants || item['المعيدين / السكاشن'] || ''}</td>
      `;
      tbody.appendChild(tr);
    });
  }
}
