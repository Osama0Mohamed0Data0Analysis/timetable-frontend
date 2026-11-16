export class StudentView {
  constructor(api) {
    this.api = api;
  }
  async mount(container) {
    container.innerHTML = `
      <div style="padding: 20px; direction: rtl; text-align: right;">
        <h2>جدول الطالب</h2>
        <p>عرض الجداول الدراسية الخاصة بفرقتك ومجموعتك.</p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <p style="color: #64748b;">اختر الفرقة والشعبة لعرض الجدول الدراسي الخاص بك.</p>
        </div>
      </div>
    `;
  }
}
