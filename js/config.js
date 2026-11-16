// تم تفعيل الـ Backend الحقيقي (Google Apps Script)
export const CONFIG = { 
  USE_MOCK: false, 
  API_BASE: 'https://script.google.com/macros/s/AKfycbyKEAc4qs4Agsu8kZiI4jn7EabdIWIoIH36Cf5ym08e47nHIbSiugicg6LRQ6BJFLy1dQ/exec' 
};

export const DAYS = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
export const PERIODS = [['09:00', '10:00'], ['10:00', '11:00'], ['11:00', '12:00'], ['12:00', '13:00'], ['13:00', '14:00']];
export const REASONS = ['ظرف طارئ', 'مرض', 'مهمة رسمية'];
export const ROLES = [['scheduler', '1) معدّ الجداول'], ['doctor', '2) دكتور / معيد'], ['student', '3) طالب']];