import { SchedulerView } from './js/views/SchedulerView.js';

export class App {
  constructor(container, api) {
    this.container = container;
    this.api = api;
    this.currentView = 'scheduler';
  }

  async start() {
    this.renderLayout();
    this.switchView('scheduler');
  }

  renderLayout() {
    this.container.innerHTML = `
      <div style="background: #f8fafc; min-height: 100vh; font-family: system-ui, sans-serif; direction: rtl; text-align: right; padding: 20px;">
        
        <!-- الهيدر العلوي -->
        <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 20px;">
          <h2 style="color: #1e293b; margin: 0 0 5px 0; font-size: 1.4rem;">مولد الجداول الأكاديمية</h2>
          <p style="color: #64748b; font-size: 0.9rem; margin: 0 0 15px 0;">النظام المتكامل لإدارة الجداول وربط Google Sheets ميكانيكياً.</p>
          
          <!-- أزرار التنقل بين الصفحات الثلاث -->
          <div style="display: flex; gap: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; flex-wrap: wrap;">
            <button id="navScheduler" style="background: #1e293b; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer;">1) منسق الجداول</button>
            <button id="navDoctor" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer;">2) دكتور / معيد</button>
            <button id="navStudent" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer;">3) طالب</button>
          </div>
        </div>

        <!-- حاوية المحتوى -->
        <div id="viewContainer"></div>
      </div>
    `;

    document.getElementById('navScheduler').addEventListener('click', () => this.switchView('scheduler'));
    document.getElementById('navDoctor').addEventListener('click', () => this.switchView('doctor'));
    document.getElementById('navStudent').addEventListener('click', () => this.switchView('student'));
  }

  async switchView(viewName) {
    this.currentView = viewName;
    const sBtn = document.getElementById('navScheduler');
    const dBtn = document.getElementById('navDoctor');
    const stBtn = document.getElementById('navStudent');

    [sBtn, dBtn, stBtn].forEach(b => {
      if (b) {
        b.style.background = '#f1f5f9';
        b.style.color = '#334155';
      }
    });

    const viewContainer = document.getElementById('viewContainer');
    viewContainer.innerHTML = `<div style="text-align: center; padding: 40px; color: #0284c7; font-weight: bold;">جاري التحميل من Google Sheets...</div>`;

    try {
      if (viewName === 'scheduler') {
        if (sBtn) { sBtn.style.background = '#1e293b'; sBtn.style.color = 'white'; }
        const view = new SchedulerView(this.api);
        await view.mount(viewContainer);
      } else if (viewName === 'doctor') {
        if (dBtn) { dBtn.style.background = '#1e293b'; dBtn.style.color = 'white'; }
        // تحميل صفحة الدكتور بسلام
        const { DoctorView } = await import('./js/views/DoctorView.js').catch(() => ({ DoctorView: null }));
        if (DoctorView) {
          const view = new DoctorView(this.api);
          await view.mount(viewContainer);
        } else {
          viewContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: #64748b;">صفحة الدكتور قيد التفعيل، جارِ العمل عليها.</div>`;
        }
      } else if (viewName === 'student') {
        if (stBtn) { stBtn.style.background = '#1e293b'; stBtn.style.color = 'white'; }
        // تحميل صفحة الطالب بسلام
        const { StudentView } = await import('./js/views/StudentView.js').catch(() => ({ StudentView: null }));
        if (StudentView) {
          const view = new StudentView(this.api);
          await view.mount(viewContainer);
        } else {
          viewContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: #64748b;">صفحة الطالب قيد التفعيل، جارِ العمل عليها.</div>`;
        }
      }
    } catch (err) {
      console.error("Error switching view:", err);
      viewContainer.innerHTML = `<div style="padding: 20px; color: red; text-align: center;">حدث خطأ في عرض الصفحة: ${err.message}</div>`;
    }
  }
}
