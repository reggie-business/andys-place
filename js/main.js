import { initAuth } from './auth.js';
import { initWeather } from './weather.js';
import { initUI } from './ui.js';

window.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initUI();
  initWeather();
});
