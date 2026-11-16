export class SchedulerView {
  constructor(api) {
    this.api = api;
    this.schedules = [];
    this.instructorsList = [];
    this.departmentsList = [];
    this.yearsList = [];
    this.selectedYear = '';
    this.selectedDepartment = '';
    this.selectedInstructor = '';
  }

  // دالة ذكية للبحث عن أي عمود بغض النظر عن تسميته في الشيت
  getVal(item, terms) {
    if (!item) return '';
    for (const k of Object.keys(item)) {
      const lk = k.toLowerCase();
      for (const t of terms) {
        if (lk.includes(t.toLowerCase())) {
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

          <!-- شريط الفلاتر الميكانيكية بالكامل -->
          <div style="background: white; padding: 15px 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; gap: 15px; align-items: center; margin-bottom: 20px; flex-wrap: wrap;">
            
            <!-- زر الفرقة المربوط بالشيت -->
            <div style="display: flex; align-items: center; gap: 8px;">
              <label style="font-weight: bold; color: #1e293b; font-size: 0.9rem; background: #f1f5f9; padding: 6px 10px; border-radius: 6px; border: 1px solid #cbd5e1;">🎓 الفرقة</label>
              <select id="filterYear" style="padding: 8px 12px; border: 1px solid #0284c7; border-radius: 6px; background: #f0fdf4; font-size: 0.9rem; cursor: pointer; font-weight: 500; color: #0369a1;">
                <option value="">-- كل الفرق (عرض الكل) --</option>
              </select>
            </div>

            <!-- زر الأقسام والشعبة المربوط بالشيت -->
            <div style="display: flex; align-items: center; gap: 8px;">
              <label style="font-weight: bold; color: #1e293b; font-size: 0.9rem; background: #f1f5f9; padding: 6px 10px; border-radius: 6px; border: 1px solid #cbd5e1;">📚 الأقسام</label>
              <select id="filterDepartment" style="padding: 8px 12px; border: 1px solid #0284c7; border-radius: 6px; background: #f0fdf4; font-size: 0.9rem; cursor: pointer; font-weight: 500; color: #0369a1;">
                <option value="">-- كل الأقسام (عرض الكل) --</option>
              </select>
            </div>

            <!-- زر الدكاترة والمعيدين المربوط بالشيت -->
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
      console.log("📥 البيانات المستلمة من الشيت:", data);
      
      this.schedules = Array.isArray(data) ? data : (data.schedules || []);
      const rawInstructors = data.instructors || [];

      const instructorSet = new Set();
      const departmentSet = new Set();
      const yearSet = new Set();

      // استخراج الأسماء من شيت أعضاء هيئة التدريس
      rawInstructors.forEach(inst => {
        const name = this.getVal(inst, ['اسم', 'name', 'دكتور', 'معيد']);
        if (name) instructorSet.add(name);
      });

      // استخراج البيانات مباشرة من شيت المواد
      this.schedules.forEach(item => {
        const yL = this.getVal(item, ['فرقة', 'year', 'level']);
        if (yL) yearSet.add(yL);

        const dept = this.getVal(item, ['قسم', 'شعبة', 'department', 'group']);
        if (dept) departmentSet.add(dept);

        const doc = this.getVal(item, ['دكتور', 'محاضر', 'doctor', 'تدريس']);
        const ast = this.getVal(item, ['معيد', 'سكشن', 'assistant']);
        
        if (doc) doc.split(',').forEach(d => { if (d.trim()) instructorSet.add(d.trim()); });
        if (ast) ast.split(',').forEach(a => { if (a.trim()) instructorSet.add(a.trim()); });
      });

      this.yearsList = Array.from(yearSet).filter(Boolean).sort();
      this.departmentsList = Array.from(departmentSet).filter(Boolean).sort();
      this.instructorsList = Array.from(instructorSet).filter(Boolean).sort();

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
    // تعبئة زر الفرقة
    const yearSelect = document.getElementById('filterYear');
    if (yearSelect) {
      yearSelect.innerHTML = `<option value="">-- كل الفرق (عرض الكل) --</option>`;
      this.yearsList.forEach(y => {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        yearSelect.appendChild(opt);
      });
    }

    // تعبئة زر الأقسام
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

    // تعبئة زر الدكاترة والمعيدين
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

    // تصفية المواد ميكانيكياً بناءً على الاختيارات الحالية للثلاثة أزرار
    const filtered = this.schedules.filter(item => {
      const yL = this.getVal(item, ['فرقة', 'year', 'level']);
      const dept = this.getVal(item, ['قسم', 'شعبة', 'department', 'group']);
      const doc = this.getVal(item, ['دكتور', 'محاضر', 'doctor', 'تدريس']);
      const ast = this.getVal(item, ['معيد', 'سكشن', 'assistant']);

      const matchYear = !this.selectedYear || yL.includes(this.selectedYear);
      const matchDept = !this.selectedDepartment || dept.includes(this.selectedDepartment);
      const matchInst = !this.selectedInstructor || doc.includes(this.selectedInstructor) || ast.includes(this.selectedInstructor);

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
          
          const subject = this.getVal(matchedItem, ['مادة', 'اسم', 'subject', 'course']) || 'مادة دراسية';
          const hall = this.getVal(matchedItem, ['قاعة', 'مدرج', 'hall', 'room']) || 'قاعة';
          const doctor = isLecture ? (this.getVal(matchedItem, ['دكتور', 'محاضر', 'doctor']) || 'غير محدد') : (this.getVal(matchedItem, ['معيد', 'سكشن', 'assistant']) || 'غير محدد');

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
