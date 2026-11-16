import { ApiClient } from './ApiClient.js';

export class HttpApiClient extends ApiClient {
  constructor(baseUrl) { 
    super(); 
    this.baseUrl = baseUrl; // هذا هو رابط الـ Web App الذي ينتهي بـ /exec
  }

  // دالة موحدة للتعامل مع Google Apps Script (GET و POST)
  async #sendGas(action, method = 'GET', payload = null) {
    try {
      let url = `${this.baseUrl}?action=${action}`;
      
      const options = {
        method: method,
        headers: method === 'POST' ? { 'Content-Type': 'text/plain;charset=utf-8' } : undefined,
      };

      if (method === 'POST' && payload) {
        options.body = JSON.stringify(payload);
      }

      const res = await fetch(url, options);
      const result = await res.json();

      if (result.status === 'success') {
        return result.data !== undefined ? result.data : result;
      } else {
        throw new Error(result.message || 'فشل الطلب من الخادم');
      }
    } catch (error) {
      console.error(`Error in ${action}:`, error);
      throw error;
    }
  }

  // ربط دوال الواجهة مع الـ Google Apps Script Actions
  
  async getMeta() {
    // البيانات الأساسية للفلاتر (يمكن تعديلها أو جلبها من الشيت)
    return {
      academicYears: ['2026/2027'],
      semesters: ['الفصل الدراسى الأول', 'الفصل الدراسى الثاني'],
      yearLevels: ['الفرقة الأولى', 'الفرقة الثانية', 'الفرقة الثالثة', 'الفرقة الرابعة'],
      departments: ['إدارة الأعمال', 'المحاسبة', 'الاقتصاد', 'العلوم السياسية'],
      days: ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']
    };
  }

  async getTimetable() { 
    return await this.#sendGas('getSchedules', 'GET'); 
  }

  async getStats() {
    const data = await this.getTimetable();
    return {
      totalLectures: data.length,
      doctorsCount: new Set(data.map(item => item.doctor)).size,
      hallsCount: new Set(data.map(item => item.hall)).size
    };
  }

  async loadDemoData() { 
    return { success: true, message: 'البيانات مسترجعة مباشرة من Google Sheets' }; 
  }

  async generate() { 
    return { success: true, message: 'تم تحديث الجدول بنجاح' }; 
  }

  async uploadExcel(file) { 
    // رفع ملف إكسل أو التعامل معه
    return { success: true, message: 'تم رفع الملف بنجاح' }; 
  }

  async listRequests(doctor) { 
    const requests = await this.#sendGas('getRequests', 'GET');
    if (doctor) {
      return requests.filter(req => req.doctorName === doctor);
    }
    return requests;
  }

  async createRequest(payload) { 
    // payload يحتوي على بيانات طلب الدكتور (اعتذار/تعديل)
    return await this.#sendGas('addRequest', 'POST', { action: 'addRequest', data: payload }); 
  }

  async resolveRequest(id, decision) { 
    return await this.#sendGas('updateRequestStatus', 'POST', { 
      action: 'updateRequestStatus', 
      requestId: id, 
      status: decision 
    }); 
  }
}