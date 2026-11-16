export class DoctorView {
  constructor(api) {
    this.api = api;
    this.schedules = [];
    this.instructors = [];
    this.requests = [];
    this.selectedDoctor = '';
  }

  async mount(container) {
    container.innerHTML = `
      <div style="padding: 20px; direction: rtl; text-align: right; background: #f8fafc; min-height: 100vh; font-family: system-ui, sans-serif;">
        
        <div style="background: white; padding: 15px 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; gap: 15px; align-items: center; margin-bottom: 20px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <label style="font-weight: bold; color: #334155;">اختر اسمك:</label>
            <select id="doctorSelect" style="padding: 8px 14px; border: 1px solid #0284c7; border-radius: 6px; background: #f0fdf4; font-size: 0.95rem; font-weight: bold; color: #0369a1; cursor: pointer;">
              <option value="">-- اختر الدكتور أو المعيد --</option>
            </select>
          </div>
        </div>

        <!-- جدول الدكتور الشبكي -->
        <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow-x: auto; margin-bottom: 20px;">
          <div id="docLoading" style="color: #0284c7; margin-bottom: 15px; font-weight: bold; text-align: center;">جاري التحميل...</div>
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
            <tbody id="docGridBody"></tbody>
          </table>
        </div>

        <!-- قسم طلباتي -->
        <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h3 style="color: #1e293b; margin-bottom: 10px; font-size: 1.1rem;">طلباتي (سجل الاعتذارات والتعديلات)</h3>
          <ul id="myRequestsList" style="list-style: none; padding: 0; color: #475569; font-size: 0.9rem;">
            <li>لا توجد طلبات سابقة.</li>
          </ul>
        </div>
      </div>
    `;

    document.getElementById('doctorSelect')?.addEventListener('change', (e) => {
      this.selectedDoctor = e.target.value;
      this.buildDoctorGrid();
      this.renderMyRequests();
    });

    await this.refreshData();
  }

  async refreshData() {
    const data = await this.api.getData();
    this.schedules = data.schedules || [];
    this.requests = data.requests || [];

    const instructorSet = new Set();
    this.schedules.forEach(item => {
      const doc = item['د. المحاضرة *'] || item['د. المحاضرة'] || item.doctor || '';
      const ast = item['المعيدين / السكاشن'] || item.assistants || '';
      if (doc) doc.split(',').forEach(d => instructorSet.add(d.trim()));
      if (ast) ast.split(',').forEach(a => instructorSet.add(a.trim()));
    });
    this.instructors = Array.from(instructorSet).filter(Boolean);

    const select = document.getElementById('doctorSelect');
    if (select) {
      select.innerHTML = `<option value="">-- اختر الدكتور أو المعيد --</option>`;
      this.instructors.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
      });
      if (this.instructors.length > 0) {
        select.value = this.instructors[0];
        this.selectedDoctor = this.instructors[0];
      }
    }

    document.getElementById('docLoading').style.display = 'none';
    this.buildDoctorGrid();
    this.renderMyRequests();
  }

  buildDoctorGrid() {
    const tbody = document.getElementById('docGridBody');
    if (!tbody || !this.selectedDoctor) return;
    tbody.innerHTML = '';

    const filtered = this.schedules.filter(item => {
      const doc = item['د. المحاضرة *'] || item['د. المحاضرة'] || item.doctor || '';
      const ast = item['المعيدين / السكاشن'] || item.assistants || '';
      return doc.includes(this.selectedDoctor) || ast.includes(this.selectedDoctor);
    });

    const timeSlots = ["08:00 - 09:30", "09:30 - 11:00", "11:00 - 12:30", "12:30 - 14:00", "14:00 - 15:30"];
    const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];

    timeSlots.forEach((slot, slotIndex) => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid #e2e8f0';
      tr.style.height = '100px';

      let rowHtml = '';
      days.forEach((day, dayIndex) => {
        const matchedItem = filtered[(slotIndex * 5 + dayIndex) % filtered.length];

        if (matchedItem) {
          const subject = matchedItem['اسم المادة *'] || matchedItem['اسم المادة'] || 'مادة دراسية';
          const hall = matchedItem['نوع القاعة المطلوبة *'] || matchedItem['القاعة'] || 'قاعة';

          rowHtml += `
            <td style="padding: 8px; border-left: 1px solid #e2e8f0; vertical-align: middle;">
              <div style="background: #e2e8f0; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                <div style="font-weight: bold; color: #1e293b; font-size: 0.95rem; margin-bottom: 4px;">${subject}</div>
                <div style="font-size: 0.85rem; color: #475569; margin-bottom: 6px;">قاعة • ${hall}</div>
                <button class="btn-apology" data-subject="${subject}" style="background: #ef4444; color: white; border: none; padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; cursor: pointer; font-weight: bold;">اعتذار</button>
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

    // ربط زر الاعتذار
    tbody.querySelectorAll('.btn-apology').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const subj = e.target.dataset.subject;
        const reason = prompt("يرجى إدخال سبب الاعتذار أو التعديل:", "ظرف طارئ");
        if (reason) {
          const res = await this.api.sendAction({
            action: "addRequest",
            doctorName: this.selectedDoctor,
            details: `إلغاء أو تعديل محاضرة ${subj}`,
            reason: reason
          });
          alert(res.message || "تم إرسال طلب الاعتذار بنجاح");
          await this.refreshData();
        }
      });
    });
  }

  renderMyRequests() {
    const list = document.getElementById('myRequestsList');
    if (!list || !this.selectedDoctor) return;

    const myReqs = this.requests.filter(r => (r.doctorName || r['اسم الدكتور']) === this.selectedDoctor);
    if (myReqs.length === 0) {
      list.innerHTML = `<li>لا توجد طلبات سابقة لهذا الدكتور.</li>`;
      return;
    }

    list.innerHTML = '';
    myReqs.forEach(req => {
      const details = req.details || req['التفاصيل'] || '';
      const status = req.status || req['الحالة'] || 'قيد المراجعة';
      const color = status === 'تمت الموافقة' ? '#10b981' : (status === 'مرفوض' ? '#ef4444' : '#f59e0b');

      const li = document.createElement('li');
      li.style.cssText = "padding: 8px 0; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between;";
      li.innerHTML = `<span>• ${details}</span> <strong style="color: ${color};">${status}</strong>`;
      list.appendChild(li);
    });
  }
}
