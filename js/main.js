import { App } from './App.js';
import { ScheduleApiClient } from './js/api/api.js';

// رابط الـ Web App الخاص بك على Google Apps Script
const API_URL = "https://script.google.com/macros/s/AKfycbyKEAc4qs4Agsu8kZiI4jn7EabdIWIoIH36Cf5ym08e47nHIbSiugicg6LRQ6BJFLy1dQ/exec";

document.addEventListener('DOMContentLoaded', async () => {
  const api = new ScheduleApiClient(API_URL);
  const rootElement = document.getElementById('app') || document.body;

  if (rootElement) {
    const app = new App(rootElement, api);
    await app.start();
  } else {
    console.error("لم يتم العثور على العنصر الجذري في الصفحة!");
  }
});
