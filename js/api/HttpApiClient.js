import { ApiClient } from './ApiClient.js';

export class HttpApiClient extends ApiClient {
  constructor(baseUrl) { 
    super(); 
    this.baseUrl = baseUrl; 
  }

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
        console.warn(`API warning in ${action}:`, result.message);
        return null;
      }
    } catch (error) {
      console.error(`Error in ${action}:`, error);
      return null;
    }
  }

  async getMeta() {
    return {
      academicYears: ['2026/2027'],
      semesters: ['الفصل الدراسى الأول', 'الفصل الدراسى الثاني'],
      yearLevels: ['الفرقة الأولى', 'الفرقة الثانية', 'الفرقة الثالثة', 'الفرقة الرابعة'],
      departments: ['إدارة الأعمال', 'المحاسبة', 'الاقتصاد', 'العلوم السياسية'],
      days: ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']
    };
  }

  async getTimetable() { 
    const data = await this.#sendGas('getSchedules', 'GET');
    return Array.isArray(data) ? data : []; 
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
    return { success: true }; 
  }

  async generate() { 
    return { success: true }; 
  }

  async uploadExcel(file) { 
    return { success: true }; 
  }

  async listRequests(doctor) { 
    const requests = await this.#sendGas('getRequests', 'GET');
    const list = Array.isArray(requests) ? requests : [];
    if (doctor) {
      return list.filter(req => req.doctorName === doctor);
    }
    return list;
  }

  async createRequest(payload) { 
    return await this.s#sendGas ? await this.#sendGas('addRequest', 'POST', { action: 'addRequest', data: payload }) : { success: true }; 
  }

  async resolveRequest(id, decision) { 
    return await this.#sendGas('updateRequestStatus', 'POST', { 
      action: 'updateRequestStatus', 
      requestId: id, 
      status: decision 
    }); 
  }
}
