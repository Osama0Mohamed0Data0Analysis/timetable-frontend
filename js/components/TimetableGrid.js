import { h } from '../core/dom.js';
import { DAYS, PERIODS } from '../config.js';

/** Weekly grid: rows = periods, columns = days. Cards come from a factory so every role can style cells its own way. */
export class TimetableGrid {
  render(sessions, cardFactory) {
    const head = h('tr', {}, h('th'), DAYS.map((d) => h('th', {}, d)));
    const rows = PERIODS.map(([from, to], p) => h('tr', {},
      h('td', { class: 'time' }, h('span', { dir: 'ltr' }, `${from}–${to}`)),
      DAYS.map((_, d) => h('td', {}, sessions.filter((s) => s.day === d && s.period === p).map((s) => cardFactory(s).render())))));
    return h('div', { class: 'grid-wrap' }, h('table', { class: 'grid' }, h('thead', {}, head), h('tbody', {}, rows)));
  }
}
