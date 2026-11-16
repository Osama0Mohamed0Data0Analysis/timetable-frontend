export class DoctorView {
  constructor(api) {
    this.api = api;
  }
  async mount(container) {
    container.innerHTML = `
      <div style="padding: 20px; direction: rtl; text-align: right;">
        <h2>لوحة عضو هيئة التدريس</h2>
        <p>مرحباً بك، يمكنك متابعة جدول المحاضرات وإرسال طلبات التعديل أو الاعتذار.</p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h3>إرسال طلب للمنسق</h3>
          <textarea id="docRequestMsg" placeholder="اكتب طلبك هنا..." style="width: 100%; height: 100px; padding: 10px; margin: 10px 0; border: 1px solid #cbd5e1; border-radius: 6px;"></textarea>
          <button id="sendReqBtn" style="padding: 10px 20px; background: #0284c7; color: white; border: none; border-radius: 6px; cursor: pointer;">إرسال الطلب</button>
        </div>
      </div>
    `;
    document.getElementById('sendReqBtn')?.addEventListener('click', async () => {
      const msg = document.getElementById('docRequestMsg').value;
      if (!msg) return alert('الرجاء كتابة الطلب أولاً');
      await this.api.sendDoctorRequest({ doctorName: "عضو هيئة التدريس", message: msg, status: "pending" });
      alert('تم إرسال الطلب بنجاح!');
      document.getElementById('docRequestMsg').value = '';
    });
  }
}
