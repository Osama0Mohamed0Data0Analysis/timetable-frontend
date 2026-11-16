export class ScheduleApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async getData() {
    try {
      const response = await fetch(this.baseUrl);
      return await response.json();
    } catch (error) {
      console.error("API Error:", error);
      return { status: "error", schedules: [], instructors: [], rooms: [], requests: [] };
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
      console.error("POST Error:", error);
      return { status: "error" };
    }
  }
}
