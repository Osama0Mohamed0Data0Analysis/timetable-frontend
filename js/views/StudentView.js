import { View } from '../core/View.js';
import { h, option } from '../core/dom.js';
import { Timetable } from '../models/index.js';
import { SessionCard } from '../components/SessionCard.js';
import { TimetableGrid } from '../components/TimetableGrid.js';

/** Role 3: pick level (الفرقة) then group (المجموعة); read-only timetable. */
export class StudentView extends View {
  constructor(api) { super(api); this.grid = new TimetableGrid(); this.level = null; this.group = null; }

  #field(label, select) { return h('label', { class: 'field' }, label, select); }

  async build() {
    const [meta, raw] = await Promise.all([this.api.getMeta(), this.api.getTimetable()]);
    const level = meta.levels.find((l) => l.name === this.level) ?? meta.levels[0];
    this.level = level.name;
    if (!level.groups.includes(this.group)) this.group = level.groups[0];
    const sessions = new Timetable(raw).forGroup(this.group);

    return [
      h('div', { class: 'row' },
        this.#field('الفرقة', h('select', { onChange: (e) => { this.level = e.target.value; this.group = null; this.refresh(); } }, meta.levels.map((l) => option(l.name, l.name, l.name === this.level)))),
        this.#field('المجموعة', h('select', { onChange: (e) => { this.group = e.target.value; this.refresh(); } }, level.groups.map((g) => option(g, g, g === this.group))))),
      h('div', { class: 'notice' }, 'جدولك محدّث، مفيش تغييرات.'),
      this.grid.render(sessions, (s) => new SessionCard(s, { detail: s.doctor, audience: 'student' })),
    ];
  }
}
