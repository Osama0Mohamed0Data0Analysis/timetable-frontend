export class DoctorView {
  constructor(api) {
    this.api = api;
    this.schedules = [];
    this.instructorsList = [];
    this.requests = [];
    this.selectedInstructor = '';
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
            <h3 style="color: #1e293b; margin-top: 0;">بوابة عضو هيئة التدريس والدكتور</h3>
            <p style="color: #64748b; font-size: 0.9rem;">يقرأ بيانات الدكتور من Google Sheets، ويطرح جدول المحاضرات والسكاشن مع إمكانية إرسال طلبات الاعتذار والتعديل.</p>
            
            <div style="display: flex; gap: 15px; align-items: center; margin-top: 20px; flex-wrap: wrap;">
              <label style="font-weight: bold; color: #334155;">اختر أستاذ:</label>
              <select id="doctorSelect" style="padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; min-width: 250px; background: #fff; cursor: pointer; font-weight: 500; color: #0369a1;">
                <option value="">-- اختر الدكتور / المعيد --</option>
              </select>
            </div>
          </div>

          <!-- جدول الدكتور الشبكي -->
          <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow-x: auto; margin-bottom: 20px;">
            <div id="docLoading" style="color: #0284c7; margin-bottom: 15px; font-weight: bold; text-align: center;">جاري جلب الجدول من Google Sheets...</div>
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
              <tbody id="doctorGridBody"></tbody>
            </table>
          </div>

          <!-- قسم طلباتي (My Requests) -->
          <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <h4 style="margin-top: 0; color: #1e293b;">طلباتي المرسلة</h4>
            <div id="myRequestsList" style="display: flex; flex-direction: column; gap: 8px;">
              <div style="color: #64748b; font-size: 0.9rem;">لم تقم بإرسال أي طلبات تعديل حتى الآن.</div>
            </div>
          </div>
        </div>
      `;

      document.getElementById('doctorSelect').addEventListener('change', (e) => {
        this.selectedInstructor = e.target.value;
        this.buildDoctorGrid();
        this.renderMyRequests();
      });

      await this.refreshData();
    } catch (err) {
      console.error("Error mounting DoctorView:", err);
      container.innerHTML = `<div style="padding: 20px; color: red; text-align: center;">حدث خطأ أثناء تحميل صفحة الدكتور: ${err.message}</div>`;
    }
  }

  async refreshData() {
    try {
      const loadingEl = document.getElementById('docLoading');
      if (loadingEl) loadingEl.style.display = 'block';

      const data = await this.api.getData();
      this.schedules = Array.isArray(data) ? data : (data.schedules || []);
      this.requests = data.requests || [];
      const rawInstructors = data.instructors || [];

      const instructorSet = new Set();
      rawInstructors.forEach(inst => {
        const name = this.getVal(inst, ['اسم الدكتور / المعيد *', 'اسم الدكتور / المعيد', 'name']);
        if (name) instructorSet.add(name);
      });

      this.schedules.forEach(item => {
        const doc = this.getVal(item, ['د. المحاضرة *', 'د. المحاضرة', 'doctor']);
        const ast = this.getVal(item, ['المعيدين / السكاشن', 'assistant']);
        if (doc) doc.split(',').forEach(d => { if (d.trim()) instructorSet.add(d.trim()); });
        if (ast) ast.split(',').forEach(a => { if (a.trim()) instructorSet.add(a.trim()); });
      });

      this.instructorsList = Array.from(instructorSet).filter(Boolean).sort();
      this.populateInstructorSelect();

      if (loadingEl) loadingEl.style.display = 'none';
    } catch (error) {
      console.error("Error refreshing doctor data:", error);
      const loadingEl = document.getElementById('docLoading');
      if (loadingEl) loadingEl.style.display = 'none';
    }
  }

  populateInstructorSelect() {
    const select = document.getElementById('doctorSelect');
    if (!select) return;
    select.innerHTML = `<option value="">-- اختر الدكتور / المعيد --</option>`;
    this.instructorsList.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
    if (this.instructorsList.length > 0 && !this.selectedInstructor) {
      this.selectedInstructor = this.instructorsList[0];
      select.value = this.selectedInstructor;
      this.buildDoctorGrid();
      this.renderMyRequests();
    }
  }

  buildDoctorGrid() {
    const tbody = document.getElementById('doctorGridBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const filtered = this.schedules.filter(item => {
      const doc = this.getVal(item, ['د. المحاضرة *', 'د. المحاضرة', 'doctor']);
      const ast = this.getVal(item, ['المعيدين / السكاشن', 'assistant']);
      return !this.selectedInstructor || doc.includes(this.selectedInstructor) || ast.includes(this.selectedInstructor);
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
          const yearGroup = `${this.getVal(matchedItem, ['الفرقة *', 'الفرقة'])} - ${this.getVal(matchedItem, ['الشعبة / القسم', 'القسم']) || 'عام'}`;

          rowHtml += `
            <td style="padding: 8px; border-left: 1px solid #e2e8f0; vertical-align: middle;">
              <div style="background: ${bgCard}; border: 1px solid ${borderCard}; border-radius: 8px; padding: 10px; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                <div style="font-weight: bold; color: #1e293b; font-size: 0.9rem; margin-bottom: 3px;">${subject}</div>
                <div style="font-size: 0.8rem; color: #475569; margin-bottom: 2px;">${typeLabel} • ${hall}</div>
                <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 6px;">${yearGroup}</div>
                <button class="btn-apology" data-subject="${subject}" style="background: #1e293b; color: white; border: none; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-weight: bold;">اعتذار / تعديل</button>
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

    tbody.querySelectorAll('.btn-apology').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const subj = e.target.dataset.subject;
        if (confirm(`هل أنت متأكد من رغبتك في إرسال طلب اعتذار / تعديل لمادة "${subj}"؟`)) {
          await this.api.sendAction({
            action: "addRequest",
            doctorName: this.selectedInstructor,
            details: `طلب اعتذار/تعديل مادة ${subj}`,
            reason: "ظرف طارئ"
          });
          alert("تم إرسال طلبك للمنسق بنجاح!");
          await this.refreshData();
          this.renderMyRequests();
        }
      });
    });
  }

  renderMyRequests() {
    const container = document.getElementById('myRequestsList');
    if (!container) return;

    const myReqs = this.requests.filter(r => (r.doctorName || r['اسم الدكتور'] || '') === this.selectedInstructor);
    if (myReqs.length === 0) {
      container.innerHTML = `<div style="color: #64748b; font-size: 0.9rem;">لم تقم بإرسال أي طلبات تعديل حتى الآن.</div>`;
      return;
    }

    container.innerHTML = '';
    myReqs.forEach(req => {
      const details = req.details || req['التفاصيل'] || 'طلب تعديل';
      const status = req.status || req['الحالة'] || 'قيد المراجعة';
      const color = status === 'تمت الموافقة' ? '#10b981' : (status === 'مرفوض' ? '#ef4444' : '#f59e0b');

      const div = document.createElement('div');
      div.style.cssText = "display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 0.9rem;";
      div.innerHTML = `
        <span style="color: #334155;">${details}</span>
        <span style="font-weight: bold; color: ${color};">${status}</span>
      `;
      container.appendChild(div);
    });
  }
}
