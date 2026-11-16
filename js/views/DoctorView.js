import { View } from '../core/View.js';
import { h, option } from '../core/dom.js';
import { REASONS } from '../config.js';
import { Timetable, ChangeRequest } from '../models/index.js';
import { SessionCard } from '../components/SessionCard.js';
import { TimetableGrid } from '../components/TimetableGrid.js';

/** Role 2: see own timetable, send a cancel request with a reason, track "طلباتي". */
export class DoctorView extends View {
  constructor(api) { super(api); this.grid = new TimetableGrid(); this.doctor = null; this.reason = REASONS[0]; }

  #field(label, ...kids) { return h('label', { class: 'field' }, label, kids); }

  async #apologize(session) {
    await this.api.createRequest({ sessionId: session.id, doctor: this.doctor, reason: this.reason });
    await this.refresh();
  }

  async build() {
    const meta = await this.api.getMeta();
    this.doctor ??= meta.doctors.find((d) => d.includes('طارق')) ?? meta.doctors[0];
    const [raw, reqs] = await Promise.all([this.api.getTimetable(), this.api.listRequests(this.doctor)]);
    const sessions = new Timetable(raw).forDoctor(this.doctor);
    const mine = reqs.map((r) => new ChangeRequest(r));
    const canApologize = (s) => s.requestStatus !== 'pending' && s.requestStatus !== 'approved';

    return [
      h('div', { class: 'row' },
        this.#field('اختر اسمك', h('select', { onChange: (e) => { this.doctor = e.target.value; this.refresh(); } }, meta.doctors.map((d) => option(d, d, d === this.doctor)))),
        this.#field('سبب الاعتذار', h('select', { onChange: (e) => { this.reason = e.target.value; } }, REASONS.map((r) => option(r, r, r === this.reason))))),
      this.grid.render(sessions, (s) => new SessionCard(s, {
        detail: s.groups.join('، '),
        action: canApologize(s) ? h('button', { class: 'btn sm', onClick: () => this.#apologize(s) }, 'اعتذار') : null,
      })),
      h('h2', {}, 'طلباتي'),
      mine.length ? h('ul', { class: 'mine' }, mine.map((r) => h('li', {}, `${r.session.course} (${r.slot()}): ${r.statusLabel}`))) : h('p', { class: 'hint' }, 'لسه مبعتّش أي طلب.'),
    ];
  }
}
