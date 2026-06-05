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
  console.debug('weather: elements', { iconEl, tempEl, descEl, noteEl, actionBtn });

  function updateWeather({ emoji, label, temperature, note = '' }) {
    if (iconEl) iconEl.textContent = emoji;
    if (tempEl) tempEl.textContent = temperature;
    if (descEl) descEl.textContent = label;
    if (noteEl) noteEl.textContent = note;
  }

  function showError(message) {
    updateWeather({ emoji: '⚠️', label: message, temperature: '--' });
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
            ? 'Location denied. Please enable location access in your browser.'
            : 'Unable to retrieve location. Try again.';
          showError(message);
          setActionButton('Retry location', true);
        },
        { timeout: 10000 }
      );
    } catch (e) {
      console.error('weather: navigator.geolocation.getCurrentPosition threw', e);
      showError('Unable to retrieve location.');
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
