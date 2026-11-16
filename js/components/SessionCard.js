import { h } from '../core/dom.js';

const FLAGS = { pending: 'قيد المراجعة', rejected: 'الطلب مرفوض', approved: 'ملغاة' };

/** One session box. audience='student' hides internal review states (students only see approved cancellations). */
export class SessionCard {
  constructor(session, { detail = null, action = null, audience = 'staff' } = {}) {
    this.session = session; this.detail = detail; this.action = action; this.audience = audience;
  }
  get flagKey() {
    const k = this.session.requestStatus;
    return this.audience === 'student' && k !== 'approved' ? null : k;
  }
  render() {
    const s = this.session;
    return h('div', { class: `card ${s.kind === 'section' ? 'section' : ''} ${s.requestStatus === 'approved' ? 'cancelled' : ''}` },
      h('b', {}, s.course),
      h('small', {}, `${s.kindLabel} - ${s.room}`),
      this.detail && h('small', {}, this.detail),
      this.flagKey && h('span', { class: 'flag' }, FLAGS[this.flagKey]),
      this.action);
  }
}
