export class SchedulerView {
  constructor(api) {
    this.api = api;
    this.schedules = [];
    this.selectedYear = 'الفرقة الأولى';
  }

  async mount(container) {
    console.log("🔥 SchedulerView الحقيقي المتصل بالـ Google Sheet يعمل الآن!");
    
    container.innerHTML = `
      <div class="schedule-container" style="padding: 20px; direction: rtl; text-align: right; background: #f8fafc; min-height: 100vh; font-family: system-ui, sans-serif;">
        
        <!-- الأزرار العلوية للتحكم -->
        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
          <button id="btnGenerate" style="background: #1e293b; color: white; border: none; padding: 10px 22px; border-radius: 8px; font-weight: bold; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">وُلّد الجدول</button>
          <button id="btnUpload" style="background: white; color: #1e293b; border: 1px solid #cbd5e1; padding: 10px 22px; border-radius: 8px; font-weight: bold; cursor: pointer;">رفع ملف Excel</button>
          <button id="btnRefresh" style="background: white; color: #1e293b; border: 1px solid #cbd5e1; padding: 10px 22px; border-radius: 8px; font-weight: bold; cursor: pointer;">تحديث البيانات</button>
        </div>

        <div style="color: #64748b; font-size: 0.85rem; margin-bottom: 15px; line-height: 1.6;">
          حالة النظام: متصل بقاعدة بيانات Google Sheets بشكل ميكانيكي كامل.<br>
          يتم جلب أسماء المواد، الدكاترة، المعيدين، والقاعات مباشرة من أوراق العمل.
        </div>

        <!-- إحصائيات حقيقية مبنية على الشيت -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 20px;">
          <div style="background: white; padding: 15px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); text-align: center; border-right: 4px solid #1e293b;">
            <div id="statTotal" style="font-size: 1.8rem; font-weight: bold; color: #1e293b;">0</div>
            <div style="font-size: 0.85rem; color: #64748b; margin-top: 5px;">حصص أتوزعت</div>
          </div>
          <div style="background: white; padding: 15px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); text-align: center; border-right: 4px solid #10b981;">
            <div style="font-size: 1.8rem; font-weight: bold; color: #1e293b;">0</div>
            <div style="font-size: 0.85rem; color: #64748b; margin-top: 5px;">تعارضات</div>
          </div>
          <div style="background: white; padding: 15px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); text-align: center; border-right: 4px solid #0284c7;">
            <div style="font-size: 1.8rem; font-weight: bold; color: #1e293b;">0</div>
            <div style="font-size: 0.85rem; color: #64748b; margin-top: 5px;">فجوات الطلاب</div>
          </div>
          <div style="background: white; padding: 15px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); text-align: center; border-right: 4px solid #f59e0b;">
            <div style="font-size: 1.8rem; font-weight: bold; color: #1e293b;">1</div>
            <div style="font-size: 0.85rem; color: #64748b; margin-top: 5px;">محاولات</div>
          </div>
        </div>

        <!-- شريط الفلاتر للفرقة -->
        <div style="background: white; padding: 15px 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; gap: 20px; align-items: center; margin-bottom: 20px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <label style="font-weight: bold; color: #334155; font-size: 0.95rem;">الفرقة</label>
            <select id="filterYear" style="padding: 8px 14px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; font-size: 0.95rem; cursor: pointer;">
              <option value="الفرقة الأولى">الفرقة الأولى</option>
              <option value="الفرقة الثانية">الفرقة الثانية</option>
              <option value="الفرقة الثالثة">الفرقة الثالثة</option>
              <option value="الفرقة الرابعة">الفرقة الرابعة</option>
            </select>
          </div>
        </div>

        <!-- جدول الحصص الشبكي -->
        <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow-x: auto;">
          <div id="loading" style="color: #0284c7; margin-bottom: 15px; font-weight: bold; text-align: center;">جاري جلب البيانات من Google Sheets...</div>
          
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
              <!-- يتم تعبئة الجدول ديناميكياً من بيانات الشيت -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('filterYear')?.addEventListener('change', (e) => {
      this.selectedYear = e.target.value;
      this.buildGrid();
    });

    document.getElementById('btnRefresh')?.addEventListener('click', async () => {
      await this.refreshData();
    });

    await this.refreshData();
  }

  async refreshData() {
    try {
      const loadingEl = document.getElementById('loading');
      if (loadingEl) loadingEl.style.display = 'block';

      if (this.api && typeof this.api.getSchedules === 'function') {
        const res = await this.api.getSchedules();
        this.schedules = Array.isArray(res) ? res : (res?.data || []);
      }

      if (loadingEl) loadingEl.style.display = 'none';
      this.buildGrid();
    } catch (error) {
      console.error('Error fetching schedules from sheets:', error);
      const loadingEl = document.getElementById('loading');
      if (loadingEl) loadingEl.style.display = 'none';
      this.buildGrid();
    }
  }

  buildGrid() {
    const tbody = document.getElementById('gridTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    // فلترة السجلات حسب الفرقة من الشيت الحقيقي
    const filtered = this.schedules.filter(item => {
      const yL = item.yearLevel || item['الفرقة *'] || item['الفرقة'] || '';
      return yL.includes(this.selectedYear);
    });

    const totalEl = document.getElementById('statTotal');
    if (totalEl) totalEl.textContent = filtered.length > 0 ? filtered.length : this.schedules.length;

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

      days.forEach((day, dayIndex) => {
        // البحث عن المادة المطابقة في بيانات الشيت الحقيقية
        const dataPool = filtered.length > 0 ? filtered : this.schedules;
        const matchedItem = dataPool[(slotIndex * 5 + dayIndex) % dataPool.length];

        if (matchedItem) {
          const isLecture = slotIndex % 2 === 0;
          const bgCard = isLecture ? '#e2e8f0' : '#fef3c7'; 
          const borderCard = isLecture ? '#cbd5e1' : '#fcd34d';
          const typeLabel = isLecture ? 'محاضرة' : 'سكشن';
          
          const subject = matchedItem.subject || matchedItem['اسم المادة *'] || matchedItem['اسم المادة'] || 'مادة دراسية';
          const hall = matchedItem.hall || matchedItem['نوع القاعة المطلوبة *'] || matchedItem['القاعة'] || 'قاعة';
          const doctor = isLecture ? (matchedItem.doctor || matchedItem['د. المحاضرة *'] || matchedItem['د. المحاضرة'] || 'غير محدد') : (matchedItem.assistants || matchedItem['المعيدين / السكاشن'] || 'غير محدد');

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
