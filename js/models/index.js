import { DAYS } from '../config.js';

export class Session {
  constructor(data) { Object.assign(this, data); }
  get kindLabel() { return this.kind === 'lecture' ? 'محاضرة' : 'سكشن'; }
  get dayName() { return DAYS[this.day]; }
  involvesGroup(group) { return this.groups.includes(group); }
  involvesDoctor(name) { return this.doctor === name; }
}

export class Timetable {
  constructor(rawSessions) { this.sessions = rawSessions.map((s) => new Session(s)); }
  forGroup(group) { return this.sessions.filter((s) => s.involvesGroup(group)); }
  forDoctor(name) { return this.sessions.filter((s) => s.involvesDoctor(name)); }
}

export const STATUS_LABEL = { pending: 'قيد المراجعة', approved: 'تمت الموافقة', rejected: 'مرفوض' };

export class ChangeRequest {
  constructor(data) { Object.assign(this, data); this.session = new Session(data.session); }
  get statusLabel() { return STATUS_LABEL[this.status]; }
  slot() { return `${this.session.dayName} الفترة ${this.session.period + 1}`; }
  describe() {
    const s = this.session;
    return `${this.doctor} يطلب إلغاء ${s.course} (${s.kindLabel} - ${s.groups.join('، ')}) يوم ${this.slot()}. السبب: ${this.reason}`;
  }
}
