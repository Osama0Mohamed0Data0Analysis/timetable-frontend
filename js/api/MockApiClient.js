import { ApiClient } from './ApiClient.js';

const LEVELS = [['الفرقة الأولى', 3], ['الفرقة الثانية', 3], ['الفرقة الثالثة', 2], ['الفرقة الرابعة', 2]];
const DOCTORS = ['د. هبة فؤاد', 'د. طارق حسن', 'د. نادية رمضان', 'د. خالد عبد الله', 'د. منى السيد', 'د. عمر شريف',
  'د. أحمد محمود', 'د. سلمى إبراهيم', 'م. كريم سمير', 'م. سارة علي', 'م. دينا كمال', 'م. محمد يوسف'];
const grp = (l, n) => `${LEVELS[l - 1][0]} - مجموعة ${n}`;
const all = (l) => Array.from({ length: LEVELS[l - 1][1] }, (_, i) => grp(l, i + 1));
// [course, kind, room, doctor, groups, day, period]
const SEED = [
  ['الرياضيات التجارية', 'lecture', 'مدرج 2', 'د. طارق حسن', all(1), 0, 0],
  ['الرياضيات التجارية', 'lecture', 'مدرج 2', 'د. طارق حسن', all(1), 0, 1],
  ['مبادئ التسويق', 'lecture', 'مدرج 2', 'د. هبة فؤاد', all(1), 4, 1],
  ['مبادئ الاقتصاد', 'lecture', 'مدرج 2', 'د. خالد عبد الله', all(1), 4, 2],
  ['مبادئ المحاسبة', 'lecture', 'مدرج 2', 'د. أحمد محمود', all(1), 1, 3],
  ['مبادئ الإدارة', 'section', 'قاعة 2', 'م. محمد يوسف', [grp(1, 1)], 5, 0],
  ['مبادئ الاقتصاد', 'section', 'قاعة 2', 'م. دينا كمال', [grp(1, 1)], 4, 0],
  ['الإدارة المالية', 'lecture', 'مدرج 1', 'د. طارق حسن', all(3), 4, 1],
  ['الإدارة المالية', 'lecture', 'مدرج 1', 'د. طارق حسن', all(3), 4, 3],
  ['المحاسبة المتقدمة', 'lecture', 'مدرج 2', 'د. خالد عبد الله', all(3), 2, 0],
  ['نظم المعلومات', 'section', 'قاعة 1', 'م. محمد يوسف', [grp(3, 1)], 3, 1],
  ['ريادة الأعمال', 'lecture', 'مدرج 1', 'د. خالد عبد الله', all(4), 3, 0],
  ['التمويل الدولي', 'lecture', 'مدرج 1', 'د. منى السيد', all(4), 2, 1],
  ['الإدارة الاستراتيجية', 'section', 'قاعة 1', 'م. سارة علي', [grp(4, 2)], 0, 0],
];

/** In-memory fake backend so the UI runs standalone. Replace with HttpApiClient. */
export class MockApiClient extends ApiClient {
  #sessions = []; #requests = []; #nextReq = 1;
  constructor() { super(); this.#seed(); }

  #reply(v) { return new Promise((r) => setTimeout(() => r(structuredClone(v)), 120)); }
  #seed() {
    this.#sessions = SEED.map(([course, kind, room, doctor, groups, day, period], i) =>
      ({ id: i + 1, course, kind, room, doctor, groups, day, period, requestStatus: null }));
    this.#requests = []; this.#nextReq = 1;
    this.#addRequest({ sessionId: 1, doctor: 'د. طارق حسن', reason: 'ظرف طارئ' });
  }
  #addRequest({ sessionId, doctor, reason }) {
    const session = this.#sessions.find((s) => s.id === sessionId);
    session.requestStatus = 'pending';
    const req = { id: this.#nextReq++, doctor, reason, status: 'pending', session };
    this.#requests.push(req);
    return req;
  }

  getMeta() { return this.#reply({ levels: LEVELS.map(([name], i) => ({ name, groups: all(i + 1) })), doctors: DOCTORS }); }
  getTimetable() { return this.#reply(this.#sessions); }
  getStats() { return this.#reply({ placed: 68, total: 68, conflicts: 0, studentGaps: 0, attempts: 1 }); }
  loadDemoData() { this.#seed(); return this.#reply({ ok: true }); }
  generate() { this.#seed(); return this.#reply({ ok: true }); }
  uploadExcel() { return this.#reply({ ok: true }); } // real parsing is a backend job
  listRequests(doctor) { return this.#reply(this.#requests.filter((r) => !doctor || r.doctor === doctor)); }
  createRequest(payload) { return this.#reply(this.#addRequest(payload)); }
  resolveRequest(id, decision) {
    const req = this.#requests.find((r) => r.id === id);
    req.status = decision;
    req.session.requestStatus = decision; // approved => cancelled, rejected => "الطلب مرفوض"
    return this.#reply(req);
  }
}
