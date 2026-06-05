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

const createStatusUpdater = (statusEl) => (message) => {
  if (statusEl) statusEl.textContent = message;
};

const fetchJson = async (url, errorMessage) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(errorMessage);
  }
  return response.json();
};

const getCurrentPosition = () => new Promise((resolve, reject) => {
  navigator.geolocation.getCurrentPosition(resolve, reject, {
    timeout: 30000,
    maximumAge: 600000,
    enableHighAccuracy: false
  });
});

export function initWeather() {
  const iconEl = document.getElementById('weather-icon');
  const tempEl = document.getElementById('weather-temp');
  const descEl = document.getElementById('weather-desc');
  const noteEl = document.getElementById('weather-note');
  const actionBtn = document.getElementById('weather-action');
  const statusEl = document.getElementById('weather-status');
  const updateStatus = createStatusUpdater(statusEl);

  const updateWeather = ({ emoji, label, temperature, note = '' }) => {
    if (iconEl) iconEl.textContent = emoji;
    if (tempEl) tempEl.textContent = temperature;
    if (descEl) descEl.textContent = label;
    if (noteEl) noteEl.textContent = note;
  };

  const showError = (message) => {
    updateWeather({ emoji: '⚠️', label: message, temperature: '--' });
    updateStatus(`Weather error: ${message}`);
  };

  const setActionButton = (label, visible) => {
    if (!actionBtn) return;
    actionBtn.textContent = label;
    actionBtn.style.display = visible ? 'inline-flex' : 'none';
    actionBtn.disabled = !visible;
    updateStatus(label ? `Weather action: ${label}` : 'Weather ready');
  };

  const getWeatherLabel = (weathercode) => weatherCodes[weathercode] || { label: 'Current conditions', emoji: '🌥️' };

  const renderWeather = (current) => {
    const weather = getWeatherLabel(current.weathercode);
    updateWeather({
      emoji: weather.emoji,
      label: weather.label,
      temperature: `${Math.round(current.temperature)}°F`,
      note: `As of ${new Date(current.time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    });
    setActionButton('', false);
    updateStatus('Weather loaded');
  };

  const fetchWeather = async (latitude, longitude) => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&temperature_unit=fahrenheit&timezone=auto`;
    const data = await fetchJson(url, 'Weather service unavailable');
    if (!data.current_weather) {
      throw new Error('No current weather data');
    }
    renderWeather(data.current_weather);
  };

  const fetchLocationFromIp = async () => {
    updateStatus('Using approximate location based on IP...');
    const data = await fetchJson('https://ipapi.co/json/', 'IP geolocation service unavailable');
    const latitude = parseFloat(data.latitude || data.lat);
    const longitude = parseFloat(data.longitude || data.lon);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      throw new Error('IP location data invalid');
    }
    if (descEl) descEl.textContent = `Using approximate location from IP (${data.city || 'unknown'})`;
    await fetchWeather(latitude, longitude);
  };

  const requestLocation = async () => {
    setActionButton('Requesting…', true);
    if (descEl) descEl.textContent = 'Waiting for location permission...';
    try {
      const position = await getCurrentPosition();
      await fetchWeather(position.coords.latitude, position.coords.longitude);
      setActionButton('', false);
    } catch (error) {
      const message = error.code === error.PERMISSION_DENIED
        ? 'Location denied. Using approximate location instead.'
        : 'Unable to retrieve location. Using approximate location instead.';
      showError(message);
      try {
        await fetchLocationFromIp();
      } catch (fallbackError) {
        console.error('weather: fallback failed', fallbackError);
        showError('Unable to determine approximate location. Please try again.');
        setActionButton('Retry location', true);
      }
    }
  };

  if ('geolocation' in navigator) {
    setActionButton('Allow location', true);
    actionBtn?.addEventListener('click', requestLocation);

    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          requestLocation();
        }
        result.onchange = () => {
          if (result.state === 'granted') requestLocation();
        };
      }).catch(() => {
        /* Permission query unsupported */
      });
    }
  } else {
    showError('Geolocation not supported.');
    setActionButton('', false);
  }
}
