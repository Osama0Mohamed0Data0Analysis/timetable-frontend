/**
 * The ONLY place the UI talks to data. Implement these on the server and the
 * front end works unchanged. JSON shapes are documented in README.md.
 */
export class ApiClient {
  getMeta() { throw new Error('not implemented'); }             // { levels:[{name,groups:[]}], doctors:[] }
  getTimetable() { throw new Error('not implemented'); }        // Session[]
  getStats() { throw new Error('not implemented'); }            // { placed,total,conflicts,studentGaps,attempts }
  loadDemoData() { throw new Error('not implemented'); }
  uploadExcel(file) { throw new Error('not implemented'); }
  generate() { throw new Error('not implemented'); }
  listRequests(doctor) { throw new Error('not implemented'); }  // ChangeRequest[] (doctor optional)
  createRequest(payload) { throw new Error('not implemented'); } // { sessionId, doctor, reason }
  resolveRequest(id, decision) { throw new Error('not implemented'); } // 'approved' | 'rejected'
}
