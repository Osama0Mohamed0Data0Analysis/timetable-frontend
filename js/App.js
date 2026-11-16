export class ScheduleApiClient {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
  }

  async getSchedules() {
    try {
      const response = await fetch(`${this.apiUrl}?action=getSchedules`);
      const result = await response.json();
      if (result.status === 'success') return result.data;
      return [];
    } catch (error) {
      console.error('Error fetching schedules:', error);
      return [];
    }
  }

  async getInstructors() {
    try {
      const response = await fetch(`${this.apiUrl}?action=getInstructors`);
      const result = await response.json();
      if (result.status === 'success') return result.data;
      return [];
    } catch (error) {
      console.error('Error fetching instructors:', error);
      return [];
    }
  }

  async getRequests() {
    try {
      const response = await fetch(`${this.apiUrl}?action=getRequests`);
      const result = await response.json();
      if (result.status === 'success') return result.data;
      return [];
    } catch (error) {
      return [];
    }
  }

  async sendDoctorRequest(requestData) {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'addRequest', data: requestData })
      });
      return await response.json();
    } catch (error) {
      throw error;
    }
  }
}
