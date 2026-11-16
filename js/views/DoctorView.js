export class DoctorView {
  constructor(api) {
    this.api = api;
  }
  async mount(container) {
    container.innerHTML = `
      <div style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <h3 style="color: #1e293b; margin-top: 0;">بوابة عضو هيئة التدريس</h3>
        <p style="color: #64748b;">هذه الصفحة مخصصة لعرض جدول الدكتور وطلبات التعديل.</p>
      </div>
    `;
  }
}
