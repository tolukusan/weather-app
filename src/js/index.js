// index.js

// Constants for API endpoints
const GEO_API_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';
const USE_TEST_DATA = false;

const geoCache = new Map();

// DOM Elements
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const searchForm = document.getElementById('search-form');
// const unitsDropdown = document.querySelector(".units-dropdown");
const locationElem = document.querySelector('.location');
const dateElem = document.querySelector('.date');
const temperatureElem = document.querySelector('.temperature');
const metricCards = document.querySelectorAll('.metric-card');
const feelsCard = document.querySelector('[data-metric="feels"]');
const humidityCard = document.querySelector('[data-metric="humidity"]');
const windCard = document.querySelector('[data-metric="wind"]');
const precipitationCard = document.querySelector('[data-metric="precipitation"]');
const dayCards = document.querySelectorAll('.day-card');
const daySelector = document.getElementById('select');
const hourlyCards = document.querySelectorAll('.hour-card');

// State
let currentLocation = null;
let currentUnits = { tempUnit: 'celsius', windUnit: 'kmh', precipUnit: 'mm' };

// Helper Functions
function formatTemp(value) {
    return value === null || value === undefined ? '—' : `${Math.round(value)}°`;
}

function formatPercent(value) {
    return value === null || value === undefined ? '—' : `${Math.round(value)}%`;
}

function formatWind(value) {
    return value === null || value === undefined ? '—' : `${Math.round(value)}`;
}

function formatPrecip(value) {
    return value === null || value === undefined
        ? '—'
        : `${Math.round(value * 10) / 10} ${currentUnits.precipUnit}`;
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.id = 'error-msg';
    errorDiv.setAttribute('role', 'alert');
    errorDiv.style.color = 'crimson';
    errorDiv.style.margin = '0.5rem 0';
    errorDiv.textContent = message;
    document.querySelector('.main-container').prepend(errorDiv);
}

function clearError() {
    const errorDiv = document.getElementById('error-msg');
    if (errorDiv) errorDiv.remove();
}

// API Calls
async function geocode(query) {
    if (!query) throw new Error('Please enter a city name');
    if (geoCache.has(query)) return geoCache.get(query);
    const url = `${GEO_API_URL}?name=${encodeURIComponent(query)}&count=1`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('City not found');
    const data = await response.json();
    if (!data.results || data.results.length === 0) throw new Error('City not found');
    console.log('Geo code json: ', data.results[0]);
    geoCache.set(query, data.results[0]);
    return data.results[0]; // {latitude, longitude, name, country}
}

async function fetchWeather(lat, lon, units) {
    // const tempUnit = units === "metric" ? "celsius" : "fahrenheit";
    // const windUnit = units === "metric" ? "kmh" : "mph";
    // const precipUnit = units === "metric" ? "mm" : "inch";
    const url = `${WEATHER_API_URL}?latitude=${lat}&longitude=${lon}&&daily=temperature_2m_max,temperature_2m_min,weather_code&hourly=temperature_2m,relative_humidity_2m,precipitation,weather_code,surface_pressure,wind_speed_10m,uv_index,visibility,apparent_temperature&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,surface_pressure&temperature_unit=${units.tempUnit}&precipitation_unit=${units.precipUnit}&wind_speed_unit=${units.windUnit}`;

    console.log('weather api: ', url);
    const response = await fetch(url);
    if (!response.ok) throw new Error('Weather data unavailable');
    return await response.json();
}

// Update UI
function updateUI(data) {
    const current = data.current;
    const hourly = data.hourly;
    const daily = data.daily;
    const current_units = data.current_units;
    console.log('current update ui weather info json: ', current);
    // Current Weather
    locationElem.textContent = `${currentLocation.name}, ${currentLocation.country || ''}`;
    dateElem.textContent = new Date(current.time).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    const weatherIcon = document.getElementById('weather-icon');
    weatherIcon.setAttribute('data-weather-code', current.weather_code);

    temperatureElem.textContent = formatTemp(current.temperature_2m);

    // Metrics
    // const currentHourIndex = hourly.time.findIndex(
    //     (time) => time === current.time
    // );
    feelsCard.textContent = `${formatTemp(current.apparent_temperature)}`;
    humidityCard.textContent = `${formatPercent(current.relative_humidity_2m)}`;
    windCard.textContent = `${formatWind(current.wind_speed_10m)} ${current_units.wind_speed_10m}`;
    precipitationCard.textContent = `${formatPrecip(current.precipitation)}`;

    // Update Daily Forecast
    updateDaily(daily);

    // Hourly Forecast (initially for the current day)
    daySelector.innerHTML = ''; // Clear options
    daily.time.forEach((time, i) => {
        const option = document.createElement('option');
        option.value = time;
        option.textContent = new Date(time).toLocaleDateString('en-US', {
            weekday: 'long',
        });
        daySelector.appendChild(option);
    });
    updateHourly(hourly, current.time.split('T')[0]); // Initial day from current time
}

function updateDaily(dailyData) {
    const dayCards = document.querySelectorAll('.day-card');

    dayCards.forEach((card, i) => {
        if (i < dailyData.time.length) {
            const weekdayElem = card.querySelector('.weekday');
            const weatherIconElem = card.querySelector('.weather-icon');
            const dailyHighLowElem = card.querySelector('.daily-high-low');

            const dayName = new Date(dailyData.time[i]).toLocaleDateString('en-US', {
                weekday: 'short',
            });
            const highTemp = formatTemp(dailyData.temperature_2m_max[i]);
            const lowTemp = formatTemp(dailyData.temperature_2m_min[i]);

            weekdayElem.textContent = dayName;
            weatherIconElem.setAttribute('data-weather-code', dailyData.weather_code[i]);

            const highTempDiv = document.createElement('div');
            const lowTempDiv = document.createElement('div');

            highTempDiv.textContent = `${highTemp}`;
            lowTempDiv.textContent = `${lowTemp}`;
            while (dailyHighLowElem.firstChild) {
                dailyHighLowElem.removeChild(dailyHighLowElem.firstChild);
            }
            dailyHighLowElem.appendChild(highTempDiv);
            dailyHighLowElem.appendChild(lowTempDiv);
        }
    });
}

function updateHourly(hourly, selectedDate) {
    const startIndex = hourly.time.findIndex(time => time.startsWith(selectedDate));
    if (startIndex === -1) return;

    hourlyCards.forEach((card, i) => {
        if (i < 24) {
            const weatherIconElem = card.querySelector('.weather-icon');
            const timeDiv = card.querySelector('.hourly-time');
            const tempDiv = card.querySelector('.hourly-temp');

            const time = new Date(hourly.time[startIndex + i]).toLocaleTimeString('en-US', {
                hour: 'numeric',
                hour12: true,
            });
            const hourlyTemp = formatTemp(hourly.temperature_2m[startIndex + i]);

            weatherIconElem.setAttribute('data-weather-code', hourly.weather_code[startIndex + i]);
            timeDiv.textContent = time;
            tempDiv.textContent = hourlyTemp;
        }
    });
}

// Event Listeners
searchForm.addEventListener('submit', async e => {
    e.preventDefault();
    const city = searchInput.value.trim();
    if (!city) {
        showError('Please enter a city name');
        return;
    }
    clearError();
    try {
        let weatherData = null;
        if (USE_TEST_DATA) {
            const cityResponse = await fetch('/data/city-test-data.json');
            const sampleCityData = await cityResponse.json();
            currentLocation = sampleCityData.results[0];
            const weatherResponse = await fetch('/data/weather-test-data.json');
            weatherData = await weatherResponse.json();
        } else {
            currentLocation = await geocode(city);
            weatherData = await fetchWeather(
                currentLocation.latitude,
                currentLocation.longitude,
                currentUnits
            );
        }
        updateUI(weatherData);
    } catch (error) {
        showError(error.message);
    }
});

searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        e.preventDefault();
        searchButton.click();
    }
});

daySelector.addEventListener('change', () => {
    if (currentLocation) {
        fetchWeather(currentLocation.latitude, currentLocation.longitude, currentUnits)
            .then(data => {
                updateHourly(data.hourly, daySelector.value);
            })
            .catch(error => showError(error.message));
    }
});

// Units Toggle

const dropdownButton = document.querySelector('.dropdown-button');
const dropdownContent = document.querySelector('.dropdown-content');
const unitOptions = document.querySelectorAll('.unit-option');

// Toggle dropdown visibility
dropdownButton.addEventListener('click', e => {
    dropdownContent.classList.toggle('active');
    e.stopPropagation(); // Prevents click from bubbling up to the document
});

// Hide dropdown when clicking outside
document.addEventListener('click', e => {
    if (!dropdownContent.contains(e.target) && !dropdownButton.contains(e.target)) {
        dropdownContent.classList.remove('show');
    }
});

// Handle unit selection
unitOptions.forEach(option => {
    option.addEventListener('click', async () => {
        const unitType = option.dataset.unitType;
        const unitValue = option.dataset.unitValue;

        if (unitType && unitValue) {
            // Update the global currentUnits object
            currentUnits[unitType] = unitValue;
        }
        const currentSelected = document.querySelector(
            `.unit-option.selected[data-unit-type="${unitType}"]`
        );

        // Remove 'selected' class from the previous selection
        if (currentSelected) {
            currentSelected.classList.remove('selected');
        }

        // Add 'selected' class to the clicked option
        option.classList.add('selected');

        const weatherData = await fetchWeather(
            currentLocation.latitude,
            currentLocation.longitude,
            currentUnits
        );
        updateUI(weatherData);
    });
});

// Initial Load (optional)
document.addEventListener('DOMContentLoaded', () => {
    searchInput.value = 'Berlin'; // Default city
    searchButton.click();
});
