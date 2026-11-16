import { View } from '../core/View.js';
import { h, option } from '../core/dom.js';
import { Timetable, ChangeRequest } from '../models/index.js';
import { SessionCard } from '../components/SessionCard.js';
import { TimetableGrid } from '../components/TimetableGrid.js';

/** Role 1: import data, generate, review doctor requests, browse any group/doctor timetable. */
export class SchedulerView extends View {
  constructor(api) { super(api); this.grid = new TimetableGrid(); this.target = null; this.status = 'تم التوليد.'; }

  async #run(label, job) { this.status = label; await job(); await this.refresh(); }

  #toolbar() {
    const file = h('input', { type: 'file', accept: '.xlsx', hidden: true, onChange: (e) => e.target.files[0] && this.#run('تم رفع الملف.', () => this.api.uploadExcel(e.target.files[0])) });
    return h('div', { class: 'row' },
      h('button', { class: 'btn primary', onClick: () => this.#run('تم تحميل البيانات التجريبية.', () => this.api.loadDemoData()) }, 'جرّب بيانات تجريبية'),
      h('button', { class: 'btn', onClick: () => file.click() }, 'ارفع ملف Excel'), file,
      h('button', { class: 'btn', onClick: () => this.#run('تم التوليد.', () => this.api.generate()) }, 'ولّد الجدول'));
  }

  #stats(s) {
    const cell = (v, l) => h('div', { class: 'stat' }, h('b', {}, v), h('span', {}, l));
    return h('div', { class: 'stats' }, cell(`${s.placed} من ${s.total}`, 'حصص موزّعة'), cell(s.conflicts, 'تعارضات'), cell(s.studentGaps, 'فجوات الطلاب'), cell(s.attempts, 'محاولات'));
  }

  #request(r) {
    const actions = r.status === 'pending'
      ? [h('button', { class: 'btn sm', onClick: () => this.#resolve(r, 'approved') }, 'موافقة'), h('button', { class: 'btn sm', onClick: () => this.#resolve(r, 'rejected') }, 'رفض')]
      : [h('em', {}, r.statusLabel)];
    return h('div', { class: 'req' }, h('span', { class: 'txt' }, r.describe()), actions);
  }
  async #resolve(r, decision) { await this.api.resolveRequest(r.id, decision); await this.refresh(); }

  #picker(meta) {
    const groups = meta.levels.flatMap((l) => l.groups);
    return h('select', { 'aria-label': 'اختر جدولًا', onChange: (e) => { this.target = e.target.value; this.refresh(); } },
      h('optgroup', { label: 'المجموعات' }, groups.map((g) => option(`g:${g}`, g, this.target === `g:${g}`))),
      h('optgroup', { label: 'الدكاترة والمعيدين' }, meta.doctors.map((d) => option(`d:${d}`, d, this.target === `d:${d}`))));
  }

  async build() {
    const [meta, raw, stats, reqs] = await Promise.all([this.api.getMeta(), this.api.getTimetable(), this.api.getStats(), this.api.listRequests()]);
    const table = new Timetable(raw);
    const requests = reqs.map((r) => new ChangeRequest(r));
    const pending = requests.filter((r) => r.status === 'pending').length;
    this.target ??= `g:${meta.levels[0].groups[0]}`;
    const isGroup = this.target.startsWith('g:');
    const name = this.target.slice(2);
    const sessions = isGroup ? table.forGroup(name) : table.forDoctor(name);
    return [
      this.#toolbar(),
      h('p', { class: 'hint' }, this.status),
      h('p', { class: 'hint' }, 'الافتراضات: كل ساعة في الملف = فترة واحدة. المحاضرة بتجمع كل مجموعات الفرقة في مدرج واحد. السكشن بيتوزّع لكل مجموعة في قاعة.'),
      this.#stats(stats),
      h('h2', {}, `طلبات الدكاترة${pending ? ` (${pending} جديد)` : ''}`),
      requests.map((r) => this.#request(r)),
      h('div', { class: 'row' }, this.#picker(meta)),
      this.grid.render(sessions, (s) => new SessionCard(s, { detail: isGroup ? s.doctor : s.groups.join('، ') })),
      h('p', { class: 'legend' }, 'الأزرق = محاضرة، البرتقالي = سكشن.'),
    ];
  }
}
