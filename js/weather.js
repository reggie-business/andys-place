const weatherCodes = {
  0: { label: 'Clear skies', emoji: '☀️' },
  1: { label: 'Mainly clear', emoji: '☀️' },
  2: { label: 'Partly cloudy', emoji: '⛅' },
  3: { label: 'Overcast', emoji: '☁️' },
  45: { label: 'Foggy', emoji: '🌫️' },
  48: { label: 'Foggy', emoji: '🌫️' },
  51: { label: 'Light drizzle', emoji: '🌧️' },
  53: { label: 'Drizzle', emoji: '🌧️' },
  55: { label: 'Rain shower', emoji: '🌧️' },
  56: { label: 'Freezing drizzle', emoji: '🌧️' },
  57: { label: 'Freezing drizzle', emoji: '🌧️' },
  61: { label: 'Rain', emoji: '🌧️' },
  63: { label: 'Rain', emoji: '🌧️' },
  65: { label: 'Heavy rain', emoji: '🌧️' },
  66: { label: 'Freezing rain', emoji: '🌧️' },
  67: { label: 'Freezing rain', emoji: '🌧️' },
  71: { label: 'Snow', emoji: '❄️' },
  73: { label: 'Snow', emoji: '❄️' },
  75: { label: 'Snow', emoji: '❄️' },
  77: { label: 'Snow pellets', emoji: '❄️' },
  80: { label: 'Rain showers', emoji: '🌧️' },
  81: { label: 'Rain showers', emoji: '🌧️' },
  82: { label: 'Heavy showers', emoji: '🌧️' },
  85: { label: 'Snow showers', emoji: '❄️' },
  86: { label: 'Snow showers', emoji: '❄️' },
  95: { label: 'Thunderstorm', emoji: '⛈️' },
  96: { label: 'Thunderstorm', emoji: '⛈️' },
  99: { label: 'Thunderstorm', emoji: '⛈️' }
};

export function initWeather() {
  console.debug('weather: initWeather()');
  const iconEl = document.getElementById('weather-icon');
  const tempEl = document.getElementById('weather-temp');
  const descEl = document.getElementById('weather-desc');
  const noteEl = document.getElementById('weather-note');
  const actionBtn = document.getElementById('weather-action');
  const statusEl = document.getElementById('weather-status');
  console.debug('weather: elements', { iconEl, tempEl, descEl, noteEl, actionBtn, statusEl });
  if (statusEl) statusEl.textContent = 'Weather module loaded';

  function updateWeather({ emoji, label, temperature, note = '' }) {
    if (iconEl) iconEl.textContent = emoji;
    if (tempEl) tempEl.textContent = temperature;
    if (descEl) descEl.textContent = label;
    if (noteEl) noteEl.textContent = note;
  }

  function showError(message) {
    updateWeather({ emoji: '⚠️', label: message, temperature: '--' });
    if (statusEl) statusEl.textContent = `Weather error: ${message}`;
  }

  function fetchWeather(latitude, longitude) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&temperature_unit=fahrenheit&timezone=auto`;
    console.debug('weather: fetching url', url);
    fetch(url)
      .then((response) => {
        console.debug('weather: fetch response', response.status);
        if (!response.ok) throw new Error('Weather service unavailable');
        return response.json();
      })
      .then((data) => {
        console.debug('weather: fetch data', data);
        const current = data.current_weather;
        if (!current) throw new Error('No current weather data');
        const weather = weatherCodes[current.weathercode] || { label: 'Current conditions', emoji: '🌥️' };
        updateWeather({
          emoji: weather.emoji,
          label: weather.label,
          temperature: `${Math.round(current.temperature)}°F`,
          note: `As of ${new Date(current.time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
        });
      })
      .catch((error) => {
        console.error('weather: fetch error', error);
        showError('Unable to load weather');
        if (noteEl) noteEl.textContent = 'Try again later or allow location access.';
      });
  }

  function setActionButton(label, visible) {
    if (!actionBtn) return;
    actionBtn.textContent = label;
    actionBtn.style.display = visible ? 'inline-flex' : 'none';
    actionBtn.disabled = !visible;
    if (statusEl) statusEl.textContent = label ? `Weather action: ${label}` : 'Weather ready';
  }

  function fetchLocationFromIp() {
    console.debug('weather: fetching IP-based location fallback');
    if (statusEl) statusEl.textContent = 'Falling back to approximate location...';
    fetch('https://ipapi.co/json/')
      .then((response) => {
        if (!response.ok) throw new Error('IP geolocation service unavailable');
        return response.json();
      })
      .then((data) => {
        console.debug('weather: ip location data', data);
        const latitude = parseFloat(data.latitude || data.lat);
        const longitude = parseFloat(data.longitude || data.lon);
        if (isNaN(latitude) || isNaN(longitude)) throw new Error('IP location data invalid');
        if (descEl) descEl.textContent = `Using approximate location from IP (${data.city || 'unknown'})`;
        fetchWeather(latitude, longitude);
      })
      .catch((error) => {
        console.error('weather: IP fallback failed', error);
        showError('Unable to determine location. Please try again.');
        setActionButton('Retry location', true);
      });
  }

  function requestLocation() {
    console.debug('weather: requestLocation()');
    setActionButton('Requesting…', true);
    if (descEl) descEl.textContent = 'Waiting for location permission...';
    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.debug('weather: got position', position.coords);
          setActionButton('', false);
          fetchWeather(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.warn('weather: geolocation error', error);
          const message = error.code === error.PERMISSION_DENIED
            ? 'Location denied. Using approximate location instead.'
            : 'Unable to retrieve location. Using approximate location instead.';
          showError(message);
          fetchLocationFromIp();
        },
        { timeout: 30000, maximumAge: 600000, enableHighAccuracy: false }
      );
    } catch (e) {
      console.error('weather: navigator.geolocation.getCurrentPosition threw', e);
      showError('Unable to retrieve location. Using approximate location instead.');
      fetchLocationFromIp();
    }
  }

  if ('geolocation' in navigator) {
    setActionButton('Allow location', true);
    if (actionBtn) actionBtn.addEventListener('click', requestLocation);
    else console.warn('weather: action button not found; user cannot trigger location request');

    // Normal behavior: user triggers via the visible action button.

    // If permission already granted, request location immediately
    if (navigator.permissions && navigator.permissions.query) {
      try {
        navigator.permissions.query({ name: 'geolocation' }).then((result) => {
          console.debug('weather: geolocation permission state', result.state);
          if (result.state === 'granted') {
            requestLocation();
          }
          result.onchange = () => {
            console.debug('weather: permission changed to', result.state);
            if (result.state === 'granted') requestLocation();
          };
        }).catch((e) => console.warn('weather: permissions.query failed', e));
      } catch (e) {
        // ignore
      }
    }
    // Development helper: add a temporary debug button that forces a request and logs details
    try {
      const dbgId = 'weather-dev-trigger';
      if (!document.getElementById(dbgId)) {
        const btn = document.createElement('button');
        btn.id = dbgId;
        btn.textContent = 'Debug: request location';
        btn.style.position = 'fixed';
        btn.style.right = '1rem';
        btn.style.top = '1rem';
        btn.style.zIndex = 1200;
        btn.addEventListener('click', () => {
          console.debug('weather: debug button clicked');
          requestLocation();
        });
        document.body.appendChild(btn);
      }
    } catch (e) {
      console.warn('weather: failed to add debug trigger', e);
    }
  } else {
    showError('Geolocation not supported.');
    setActionButton('', false);
  }
}
