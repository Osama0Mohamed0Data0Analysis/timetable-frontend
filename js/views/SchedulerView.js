export class SchedulerView {
  constructor(api) {
    this.api = api;
    this.schedules = [];
  }

  async mount(container) {
    container.innerHTML = `
      <div class="schedule-container" style="padding: 20px; direction: rtl; text-align: right; background: #f8fafc; min-height: 100vh;">
        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
          <button id="btnFetchDemo" style="padding: 10px 20px; background: #1e293b; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">تحديث البيانات</button>
        </div>

        <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div id="loading" style="color: #0284c7; margin-bottom: 15px; font-weight: bold;">جاري تحميل الجدول...</div>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: right;" border="0">
              <thead>
                <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                  <th style="padding: 12px; color: #475569;">كود المادة</th>
                  <th style="padding: 12px; color: #475569;">اسم المادة</th>
                  <th style="padding: 12px; color: #475569;">الفرقة</th>
                  <th style="padding: 12px; color: #475569;">الشعبة / القسم</th>
                  <th style="padding: 12px; color: #475569;">الفصل الدراسي</th>
                  <th style="padding: 12px; color: #475569;">القاعة</th>
                  <th style="padding: 12px; color: #475569;">د. المحاضرة</th>
                  <th style="padding: 12px; color: #475569;">المعيدين</th>
                </tr>
              </thead>
              <tbody id="scheduleTableBody">
                <tr><td colspan="8" style="text-align: center; padding: 30px; color: #94a3b8;">لا توجد بيانات متاحة حالياً</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btnFetchDemo')?.addEventListener('click', () => this.refresh());
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
      this.build();
    } catch (error) {
      console.error('Error:', error);
      const loadingEl = document.getElementById('loading');
      if (loadingEl) loadingEl.style.display = 'none';
      this.build();
    }
  }

  build() {
    const tbody = document.getElementById('scheduleTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!this.schedules || this.schedules.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 30px; color: #94a3b8;">لا توجد بيانات مطابقة</td></tr>`;
      return;
    }

    this.schedules.forEach(item => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid #f1f5f9';
      tr.innerHTML = `
        <td style="padding: 12px; color: #334155;">${item.code || ''}</td>
        <td style="padding: 12px; color: #334155; font-weight: 500;">${item.subject || ''}</td>
        <td style="padding: 12px; color: #334155;">${item.yearLevel || ''}</td>
        <td style="padding: 12px; color: #334155;">${item.department || ''}</td>
        <td style="padding: 12px; color: #334155;">${item.semester || ''}</td>
        <td style="padding: 12px; color: #334155;">${item.hall || ''}</td>
        <td style="padding: 12px; color: #334155; font-weight: 500; color: #0284c7;">${item.doctor || ''}</td>
        <td style="padding: 12px; color: #334155;">${item.assistants || ''}</td>
      `;
      tbody.appendChild(tr);
    });
  }
}
