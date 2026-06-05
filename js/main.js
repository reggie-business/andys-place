import { initAuth } from './auth.js';
import { initWeather } from './weather.js';
import { initUI } from './ui.js';

const statusEl = document.getElementById('weather-status');
if (statusEl) {
  statusEl.textContent = 'JS loaded — initializing...';
}
console.log('main module loaded');

window.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initUI();
  initWeather();
  if (statusEl) {
    statusEl.textContent = 'JS initialized — waiting for weather';
  }
});
