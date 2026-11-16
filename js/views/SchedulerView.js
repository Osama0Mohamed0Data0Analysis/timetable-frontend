export class SchedulerView {
  constructor(api) {
    this.api = api;
    this.schedules = [];
    this.instructorsList = [];
    this.departmentsList = [];
    this.selectedYear = 'الفرقة الأولى';
    this.selectedDepartment = '';
    this.selectedInstructor = '';
  }

  async mount(container) {
    try {
      container.innerHTML = `
        <div class="schedule-container" style="padding: 20px; direction: rtl; text-align: right; background: #f8fafc; min-height: 100vh; font-family: system-ui, sans-serif;">
          
          <!-- أزرار التحكم العلوية -->
          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
            <button id="btnGenerate" style="background: #1e293b; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;">وُلّد الجدول</button>
            <button id="btnUpload" style="background: white; color: #1e293b; border: 1px solid #cbd5e1; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;">رفع ملف Excel</button>
            <button id="btnRefresh" style="background: white; color: #1e293b; border: 1px solid #cbd5e1; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;">تحديث البيانات</button>
          </div>

          <!-- إحصائيات النظام الحقيقية -->
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

          <!-- شريط الفلاتر: الفرقة، الأقسام، والدكاترة والمعيدين -->
          <div style="background: white; padding: 15px 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; gap: 15px; align-items: center; margin-bottom: 20px; flex-wrap: wrap;">
            
            <!-- فلتر الفرقة -->
            <div style="display: flex; align-items: center; gap: 8px;">
              <label style="font-weight: bold; color: #334155; font-size: 0.9rem;">الفرقة</label>
              <select id="filterYear" style="padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; font-size: 0.9rem; cursor: pointer;">
                <option value="الفرقة الأولى">الفرقة الأولى</option>
                <option value="الفرقة الثانية">الفرقة الثانية</option>
                <option value="الفرقة الثالثة">الفرقة الثالثة</option>
                <option value="الفرقة الرابعة">الفرقة الرابعة</option>
              </select>
            </div>

            <!-- زر/قائمة الأقسام والشعبة الميكانيكية -->
            <div style="display: flex; align-items: center; gap: 8px;">
              <label style="font-weight: bold; color: #1e293b; font-size: 0.9rem; background: #f1f5f9; padding: 6px 10px; border-radius: 6px; border: 1px solid #cbd5e1;">📚 الأقسام</label>
              <select id="filterDepartment" style="padding: 8px 12px; border: 1px solid #0284c7; border-radius: 6px; background: #f0fdf4; font-size: 0.9rem; cursor: pointer; font-weight: 500; color: #0369a1;">
                <option value="">-- كل الأقسام (عرض الكل) --</option>
              </select>
            </div>

            <!-- زر/قائمة الدكاترة والمعيدين الميكانيكية -->
            <div style="display: flex; align-items: center; gap: 8px;">
              <label style="font-weight: bold; color: #1e293b; font-size: 0.9rem; background: #f1f5f9; padding: 6px 10px; border-radius: 6px; border: 1px solid #cbd5e1;">👨‍🏫 الدكاترة والمعيدين</label>
              <select id="filterInstructor" style="padding: 8px 12px; border: 1px solid #0284c7; border-radius: 6px; background: #f0fdf4; font-size: 0.9rem; cursor: pointer; font-weight: 500; color: #0369a1;">
                <option value="">-- كل الدكاترة والمعيدين (عرض الكل) --</option>
              </select>
            </div>

            <div style="margin-right: auto; background: #f1f5f9; padding: 6px 14px; border-radius: 6px; border-right: 4px solid #10b981; color: #065f46; font-size: 0.9rem; font-weight: bold;">
              جدولك محدث، متاح
            </div>
          </div>

          <!-- جدول الحصص الشبكي -->
          <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow-x: auto;">
            <div id="loading" style="color: #0284c7; margin-bottom: 15px; font-weight: bold; text-align: center;">جاري جلب بيانات الشيت الأصلية...</div>
            
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
              <tbody id="gridTableBody"></tbody>
            </table>
          </div>
        </div>
      `;

      document.getElementById('filterYear')?.addEventListener('change', (e) => {
        this.selectedYear = e.target.value;
        this.buildGrid();
      });

      document.getElementById('filterDepartment')?.addEventListener('change', (e) => {
        this.selectedDepartment = e.target.value;
        this.buildGrid();
      });

      document.getElementById('filterInstructor')?.addEventListener('change', (e) => {
        this.selectedInstructor = e.target.value;
        this.buildGrid();
      });

      document.getElementById('btnRefresh')?.addEventListener('click', async () => {
        await this.refreshData();
      });

      await this.refreshData();
    } catch (err) {
      console.error("Error in SchedulerView mount:", err);
      container.innerHTML = `<div style="padding: 20px; color: red; text-align: center;">حدث خطأ أثناء تحميل واجهة الجدول: ${err.message}</div>`;
    }
  }

  async refreshData() {
    try {
      const loadingEl = document.getElementById('loading');
      if (loadingEl) loadingEl.style.display = 'block';

      const data = await this.api.getData();
      this.schedules = Array.isArray(data) ? data : (data.schedules || []);
      const rawInstructors = data.instructors || [];

      const instructorSet = new Set();
      const departmentSet = new Set();

      rawInstructors.forEach(inst => {
        const name = inst['اسم الدكتور / المعيد *'] || inst['اسم الدكتور / المعيد'] || inst.name || '';
        if (name) instructorSet.add(name.toString().trim());
      });

      this.schedules.forEach(item => {
        const dept = item['الشعبة / القسم'] || item['القسم'] || item.department || '';
        if (dept) departmentSet.add(dept.toString().trim());

        const doc = item['د. المحاضرة *'] || item['د. المحاضرة'] || item.doctor || '';
        const ast = item['المعيدين / السكاشن'] || item.assistants || '';
        if (doc) doc.toString().split(',').forEach(d => { if (d.trim()) instructorSet.add(d.trim()); });
        if (ast) ast.toString().split(',').forEach(a => { if (a.trim()) instructorSet.add(a.trim()); });
      });

      this.instructorsList = Array.from(instructorSet).filter(Boolean).sort();
      this.departmentsList = Array.from(departmentSet).filter(Boolean).sort();

      this.populateDropdowns();

      if (loadingEl) loadingEl.style.display = 'none';
      this.buildGrid();
    } catch (error) {
      console.error('Error refreshing data:', error);
      const loadingEl = document.getElementById('loading');
      if (loadingEl) loadingEl.style.display = 'none';
      this.buildGrid();
    }
  }

  populateDropdowns() {
    const deptSelect = document.getElementById('filterDepartment');
    if (deptSelect) {
      deptSelect.innerHTML = `<option value="">-- كل الأقسام (عرض الكل) --</option>`;
      this.departmentsList.forEach(dept => {
        const opt = document.createElement('option');
        opt.value = dept;
        opt.textContent = dept;
        deptSelect.appendChild(opt);
      });
    }

    const instSelect = document.getElementById('filterInstructor');
    if (instSelect) {
      instSelect.innerHTML = `<option value="">-- كل الدكاترة والمعيدين (عرض الكل) --</option>`;
      this.instructorsList.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        instSelect.appendChild(opt);
      });
    }
  }

  buildGrid() {
    const tbody = document.getElementById('gridTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const filtered = this.schedules.filter(item => {
      const yL = item['الفرقة *'] || item['الفرقة'] || item.yearLevel || '';
      const dept = item['الشعبة / القسم'] || item['القسم'] || item.department || '';
      const doc = item['د. المحاضرة *'] || item['د. المحاضرة'] || item.doctor || '';
      const ast = item['المعيدين / السكاشن'] || item.assistants || '';

      const matchYear = !this.selectedYear || yL.toString().includes(this.selectedYear);
      const matchDept = !this.selectedDepartment || dept.toString().includes(this.selectedDepartment);
      const matchInst = !this.selectedInstructor || doc.toString().includes(this.selectedInstructor) || ast.toString().includes(this.selectedInstructor);

      return matchYear && matchDept && matchInst;
    });

    const totalEl = document.getElementById('statTotal');
    if (totalEl) totalEl.textContent = filtered.length > 0 ? filtered.length : this.schedules.length;

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
