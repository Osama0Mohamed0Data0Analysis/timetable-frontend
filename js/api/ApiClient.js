export class ScheduleApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async getData() {
    try {
      const response = await fetch(this.baseUrl);
      const result = await response.json();
      
      // التأكد من إرجاع البيانات بالشكل الصحيح سواء كانت مصفوفة أو كائن يحتوي على الجداول
      return result;
    } catch (error) {
      console.error("خطأ في الاتصال بـ Google Sheets API:", error);
      return { schedules: [], instructors: [], rooms: [], requests: [] };
    }
  }

  async sendAction(payload) {
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      return await response.json();
    } catch (error) {
      console.error("خطأ في إرسال الطلب:", error);
      return { status: "error" };
    }
  }
}
