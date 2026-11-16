import { h } from './core/dom.js';
import { ROLES } from './config.js';
import { SchedulerView } from './views/SchedulerView.js';
import { DoctorView } from './views/DoctorView.js';
import { StudentView } from './views/StudentView.js';

const VIEWS = { scheduler: SchedulerView, doctor: DoctorView, student: StudentView };

/** Shell: header, role switcher (demo only - the real role must come from the logged-in account) and the active view. */
export class App {
  constructor(root, api) { 
    this.root = root; 
    this.api = api; 
    this.role = 'scheduler'; 
    this.views = {}; 
  }

  async start() {
    this.body = h('div');
    this.switcher = h('div', { class: 'row' });
    this.root.replaceChildren(
      h('h1', {}, 'مولّد الجداول الأكاديمية'),
      h('p', { class: 'tagline' }, 'نموذج أولي: يقرأ بيانات الكلية، ويوزّع المحاضرات والسكاشن من غير تعارضات.'),
      this.switcher,
      h('p', { class: 'hint' }, 'وضع تجريبي: في النظام الحقيقي كل شخص بيدخل بحسابه، والنظام بيحدد دوره وبيفتح له شاشته بس. هنا بنبدّل بين الأدوار بس، عشان نشوف الفرق.'),
      this.body
    );
    await this.show(this.role);
  }

  async show(role) {
    this.role = role;
    this.switcher.replaceChildren(...ROLES.map(([key, label]) =>
      h('button', { class: `btn ${key === role ? 'on' : ''}`, onClick: () => this.show(key) }, label)
    ));
    this.views[role] ??= new VIEWS[role](this.api);
    await this.views[role].mount(this.body);
  }
}