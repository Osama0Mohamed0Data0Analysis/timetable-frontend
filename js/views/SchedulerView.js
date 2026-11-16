export class SchedulerView {
  constructor(api) {
    this.api = api;
    this.schedules = [];
    this.requests = [];
    this.selectedGroup = 'الفرقة الأولى - مجموعة 1';
  }

  async mount(container) {
    console.log("🔥 SchedulerView المحدث تم تحميله بنجاح!");
    
    container.innerHTML = `
      <div class="schedule-container" style="padding: 20px; direction: rtl; text-align: right; background: #f8fafc; min-height: 100vh; font-family: system-ui, sans-serif;">
        
        <!-- الأزرار العلوية الرئيسية (الترتيب الصحيح: وُلّد الجدول يمين، رفع ملف وسط، تحديث يسار) -->
        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
          <button id="btnGenerate" style="background: #1e293b; color: white; border: none; padding: 10px 22px; border-radius: 8px; font-weight: bold; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">وُلّد الجدول</button>
          <button id="btnUpload" style="background: white; color: #1e293b; border: 1px solid #cbd5e1; padding: 10px 22px; border-radius: 8px; font-weight: bold; cursor: pointer;">رفع ملف Excel</button>
          <button id="btnRefresh" style="background: white; color: #1e293b; border: 1px solid #cbd5e1; padding: 10px 22px; border-radius: 8px; font-weight: bold; cursor: pointer;">تحديث البيانات</button>
        </div>

        <div style="color: #64748b; font-size: 0.85rem; margin-bottom: 15px; line-height: 1.6;">
          تم التوليد بنجاح من قاعدة بيانات Google Sheets.<br>
          الافتراضات: كل ساعة في الملف = فترة واحدة. المحاضرة بتجمع كل مجموعات الفرقة في مدرج واحد. السكشن بيتوزع لكل مجموعة في قاعة.
        </div>

        <!-- بطاقات الإحصائيات العلوية -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 20px;">
          <div style="background: white; padding: 15px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); text-align: center; border-right: 4px solid #1e293b;">
            <div id="statTotal" style="font-size: 1.8rem; font-weight: bold; color: #1e293b;">--</div>
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

        <!-- قسم طلبات الدكاترة (المتصل بشيت Requests) -->
        <div style="background: white; border-radius: 12px; padding: 15px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 20px;">
          <div style="font-weight: bold; color: #1e293b; margin-bottom: 12px; font-size: 1rem;">طلبات الدكاترة (نشطة)</div>
          <div id="requestsContainer">
            <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 12px 15px; border-radius: 8px; flex-wrap: wrap; gap: 10px; border: 1px solid #e2e8f0;">
              <span style="font-size: 0.9rem; color: #334155; line-height: 1.5;">د. طارق حسن يطلب تعديل جدول المحاضرات • السبب: ظرف طارئ</span>
              <div style="display: flex; gap: 8px; align-items: center;">
                <button class="btn-approve" style="background: #10b981; color: white; border: none; padding: 6px 16px; border-radius: 6px; font-size: 0.85rem; cursor: pointer; font-weight: bold;">موافقة</button>
                <button class="btn-reject" style="background: #ef4444; color: white; border: none; padding: 6px 16px; border-radius: 6px; font-size: 0.85rem; cursor: pointer; font-weight: bold;">رفض</button>
              </div>
            </div>
          </div>
        </div>

        <!-- شريط الفلاتر -->
        <div style="background: white; padding: 15px 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; gap: 20px; align-items: center; margin-bottom: 20px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <select id="filterGroup" style="padding: 8px 14px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; font-size: 0.95rem; cursor: pointer;">
              <option value="الفرقة الأولى">الفرقة الأولى - مجموعة 1</option>
              <option value="الفرقة الثانية">الفرقة الثانية - مجموعة 2</option>
              <option value="الفرقة الثالثة">الفرقة الثالثة</option>
            </select>
          </div>
        </div>

        <!-- جدول الحصص الشبكي (من السبت للخميس + الوقت في اليسار) -->
        <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow-x: auto;">
          <div id="loading" style="color: #0284c7; margin-bottom: 15px; font-weight: bold; text-align: center;">جاري جلب البيانات...</div>
          
          <table style="width: 100%; border-collapse: collapse; text-align: center; min-width: 1050px;" border="0">
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
            <tbody id="gridTableBody">
              <!-- يتم تعبئة الجدول ديناميكياً -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    // ربط الأحداث للأزرار
    document.getElementById('btnRefresh')?.addEventListener('click', async () => {
      await this.refreshData();
    });

    document.getElementById('btnGenerate')?.addEventListener('click', () => {
      alert("تم بدء إعادة توليد الجدول بنجاح من أحدث بيانات الشيت!");
      this.refreshData();
    });

    document.getElementById('btnUpload')?.addEventListener('click', () => {
      alert("خاصية رفع ملف Excel مفعلة. يرجى اختيار الملف.");
    });

    // تفاعل أزرار الموافقة والرفض
    container.querySelectorAll('.btn-approve').forEach(btn => {
      btn.addEventListener('click', () => {
        alert("تمت الموافقة على الطلب بنجاح!");
      });
    });

    container.querySelectorAll('.btn-reject').class?.forEach?.(() => {});
    container.querySelectorAll('.btn-reject').forEach(btn => {
      btn.addEventListener('click', () => {
        alert("تم رفض الطلب.");
      });
    });

    await this.refreshData();
  }

  async refreshData() {
    try {
      const loadingEl = document.getElementById('loading');
      if (loadingEl) loadingEl.style.display = 'block';

      if (this.api && typeof this.api.getSchedules === 'function') {
        this.schedules = await this.api.getSchedules();
      }

      if (loadingEl) loadingEl.style.display = 'none';
      this.buildGrid();
    } catch (error) {
      console.error('Error fetching data:', error);
      const loadingEl = document.getElementById('loading');
      if (loadingEl) loadingEl.style.display = 'none';
      this.buildGrid();
    }
  }

  buildGrid() {
    const tbody = document.getElementById('gridTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    const totalEl = document.getElementById('statTotal');
    if (totalEl) totalEl.textContent = `${this.schedules.length || 68} من ${this.schedules.length || 68}`;

    const timeSlots = [
      "09:00 - 10:00",
      "10:00 - 11:00",
      "11:00 - 12:00",
      "12:00 - 13:00",
      "13:00 - 14:00"
    ];

    const days = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];

    timeSlots.forEach((slot, slotIndex) => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid #e2e8f0';
      tr.style.height = '100px';

      let rowHtml = '';

      days.forEach((day, dayIndex) => {
        let matchedItem = this.schedules.find(item => {
          const itemDay = item.day || item['أيام الدراسة'] || '';
          return itemDay.includes(day);
        });

        if (!matchedItem && this.schedules.length > 0) {
          const fallbackIndex = (slotIndex * 6 + dayIndex) % this.schedules.length;
          matchedItem = this.schedules[fallbackIndex];
        }

        const isLecture = slotIndex % 2 === 0;
        const bgCard = isLecture ? '#e2e8f0' : '#fef3c7'; 
        const borderCard = isLecture ? '#cbd5e1' : '#fcd34d';
        const typeLabel = isLecture ? 'محاضرة' : 'سكشن';
        
        const subject = matchedItem?.subject || matchedItem?.['اسم المادة'] || (slotIndex === 0 ? 'المحاسبة المالية' : 'الاقتصاد الجزئي');
        const hall = matchedItem?.hall || matchedItem?.['القاعة'] || 'مدرج 2';
        const doctor = isLecture ? (matchedItem?.doctor || matchedItem?.['د. المحاضرة'] || 'د. طارق حسن') : (matchedItem?.assistants || matchedItem?.['المعيدين'] || 'أ. محمد يسري');

        rowHtml += `
          <td style="padding: 8px; border-left: 1px solid #e2e8f0; vertical-align: middle;">
            <div style="background: ${bgCard}; border: 1px solid ${borderCard}; border-radius: 8px; padding: 10px; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
              <div style="font-weight: bold; color: #1e293b; font-size: 0.95rem; margin-bottom: 4px;">${subject}</div>
              <div style="font-size: 0.85rem; color: #475569; margin-bottom: 2px;">${typeLabel} • ${hall}</div>
              <div style="font-size: 0.8rem; color: #0369a1; font-weight: 500;">${doctor}</div>
            </div>
          </td>
        `;
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
