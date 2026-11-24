import { DashboardView } from './js/views/DashboardView.js';
import { SchedulerView } from './js/views/SchedulerView.js';
import { DoctorView } from './js/views/DoctorView.js';
import { StudentView } from './js/views/StudentView.js';

export class App {
  constructor(container, api) {
    this.container = container;
    this.api = api;
    this.currentView = 'dashboard';
  }

  async start() {
    this.renderLayout();
    await this.switchView('dashboard');
  }

  renderLayout() {
    this.container.innerHTML = `
      <div style="background:#f8fafc;min-height:100vh;font-family:'IBM Plex Sans Arabic','Readex Pro',system-ui,sans-serif;direction:rtl;text-align:right;padding:20px;">
        <div style="background:#ffffff;padding:18px 20px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.06);margin-bottom:18px;border:1px solid #e2e8f0;">
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
            <button id="navDashboard" class="app-nav-btn" data-view="dashboard">الداش بورد</button>
            <button id="navScheduler" class="app-nav-btn" data-view="scheduler">1) منسق الجداول</button>
            <button id="navDoctor" class="app-nav-btn" data-view="doctor">2) دكتور / معيد</button>
            <button id="navStudent" class="app-nav-btn" data-view="student">3) طالب</button>
          </div>
        </div>
        <div id="viewContainer"></div>
      </div>
    `;

    this.container.querySelectorAll('.app-nav-btn').forEach(btn => {
      btn.style.padding = '8px 16px';
      btn.style.borderRadius = '8px';
      btn.style.fontWeight = '700';
      btn.style.cursor = 'pointer';
      btn.style.fontFamily = 'inherit';
      btn.style.transition = '0.15s';
      btn.addEventListener('click', () => this.switchView(btn.dataset.view));
    });
  }

  updateNavActiveState(activeName) {
    this.container.querySelectorAll('.app-nav-btn').forEach(btn => {
      const isActive = btn.dataset.view === activeName;
      btn.style.background = isActive ? '#162447' : '#f1f5f9';
      btn.style.color = isActive ? '#ffffff' : '#334155';
      btn.style.border = isActive ? '1.5px solid #162447' : '1.5px solid #cbd5e1';
    });
  }

  async switchView(viewName, extraState = null) {
    const validViews = ['dashboard', 'scheduler', 'doctor', 'student'];
    const targetName = validViews.includes(viewName) ? viewName : 'dashboard';
    this.currentView = targetName;
    this.updateNavActiveState(targetName);

    const viewContainer = document.getElementById('viewContainer');
    if (!viewContainer) return;

    viewContainer.innerHTML = `<div style="text-align:center;padding:32px;color:#0284c7;font-weight:700;">جاري التحميل...</div>`;

    try {
      if (targetName === 'dashboard') {
        const view = new DashboardView(this.api, (nextView, state) => this.switchView(nextView, state));
        await view.mount(viewContainer);
        return;
      }

      const viewsMap = {
        scheduler: SchedulerView,
        doctor: DoctorView,
        student: StudentView,
      };
      const ViewClass = viewsMap[targetName];
      const view = new ViewClass(this.api, extraState);
      await view.mount(viewContainer);
    } catch (err) {
      console.error('Error switching view:', err);
      viewContainer.innerHTML = `<div style="background:#fff;border:1px solid #fecaca;color:#b91c1c;padding:18px;border-radius:10px;text-align:center;">حدث خطأ أثناء تحميل الشاشة: ${err.message}</div>`;
    }
  }
}
