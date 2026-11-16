import { CONFIG } from './config.js';
import { App } from './App.js';
import { MockApiClient } from './api/MockApiClient.js';
import { HttpApiClient } from './api/HttpApiClient.js';

const api = CONFIG.USE_MOCK ? new MockApiClient() : new HttpApiClient(CONFIG.API_BASE);
new App(document.getElementById('app'), api).start();
