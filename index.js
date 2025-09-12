// index.js

// Constants for API endpoints
const GEO_API_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_API_URL = "https://api.open-meteo.com/v1/forecast";
const USE_TEST_DATA = true;

const geoCache = new Map();

// DOM Elements
const searchInput = document.querySelector(".search-input");
const searchButton = document.querySelector(".search-button");
const unitsDropdown = document.querySelector(".units-dropdown");
const locationElem = document.querySelector(".location");
const dateElem = document.querySelector(".date");
const temperatureElem = document.querySelector(".temperature");
const weatherIconElem = document.querySelector(".weather-icon");
const metricCards = document.querySelectorAll(".metric-card");
const feelsCard = document.querySelector('[data-metric="feels"]');
const humidityCard = document.querySelector('[data-metric="humidity"]');
const windCard = document.querySelector('[data-metric="wind"]');
const precipitationCard = document.querySelector(
    '[data-metric="precipitation"]'
);
const dayCards = document.querySelectorAll(".day-card");
const daySelector = document.querySelector(".day-selector");
const hourlyCards = document.querySelectorAll(".hour-card");

// State
let currentLocation = null;
let currentUnits = "metric";

// Helper Functions
function formatTemp(value) {
    return value === null || value === undefined
        ? "—"
        : `${Math.round(value)}°`;
}

function formatPercent(value) {
    return value === null || value === undefined
        ? "—"
        : `${Math.round(value)}%`;
}

function formatWind(value) {
    return value === null || value === undefined
        ? "—"
        : `${Math.round(value)} ${currentUnits === "metric" ? "km/h" : "mph"}`;
}

function formatPrecip(value) {
    return value === null || value === undefined
        ? "—"
        : `${Math.round(value * 10) / 10} ${
              currentUnits === "metric" ? "mm" : "inch"
          }`;
}

function showError(message) {
    const errorDiv = document.createElement("div");
    errorDiv.id = "error-msg";
    errorDiv.setAttribute("role", "alert");
    errorDiv.style.color = "crimson";
    errorDiv.style.margin = "0.5rem 0";
    errorDiv.textContent = message;
    document.querySelector(".main-container").prepend(errorDiv);
}

function clearError() {
    const errorDiv = document.getElementById("error-msg");
    if (errorDiv) errorDiv.remove();
}

// API Calls
async function geocode(query) {
    if (!query) throw new Error("Please enter a city name");
    if (geoCache.has(query)) return geoCache.get(query);
    const url = `${GEO_API_URL}?name=${encodeURIComponent(query)}&count=1`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("City not found");
    const data = await response.json();
    if (!data.results || data.results.length === 0)
        throw new Error("City not found");
    console.log(data.results[0]);
    geoCache.set(query, data.results[0]);
    return data.results[0]; // {latitude, longitude, name, country}
}

async function fetchWeather(lat, lon, units) {
    const tempUnit = units === "metric" ? "celsius" : "fahrenheit";
    const windUnit = units === "metric" ? "kmh" : "mph";
    const precipUnit = units === "metric" ? "mm" : "inch";

    //later import this from a different file
    const url = `${WEATHER_API_URL}?latitude=${lat}&longitude=${lon}&&daily=temperature_2m_max,temperature_2m_min,weather_code&hourly=temperature_2m,relative_humidity_2m,precipitation,weather_code,surface_pressure,wind_speed_10m,uv_index,visibility,apparent_temperature&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,surface_pressure`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Weather data unavailable");
    return await response.json();
}

// Weather Code to Description (simplified)
function getWeatherDescription(code) {
    const codes = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        61: "Slight rain",
        63: "Moderate rain",
        80: "Slight rain showers",
    };
    return codes[code] || "Unknown";
}

// Update UI
function updateUI(data) {
    const current = data.current;
    const hourly = data.hourly;
    const daily = data.daily;

    // Current Weather
    locationElem.textContent = `${currentLocation.name}, ${
        currentLocation.country || ""
    }`;
    dateElem.textContent = new Date(current.time).toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
    });

    temperatureElem.textContent = formatTemp(current.temperature_2m);
    weatherIconElem.textContent = getWeatherDescription(current.weather_code); // Placeholder; use icons later

    // Metrics
    // const currentHourIndex = hourly.time.findIndex(
    //     (time) => time === current.time
    // );
    feelsCard.textContent = `Feels Like ${formatTemp(
        current.apparent_temperature
    )}`;
    humidityCard.textContent = `Humidity ${formatPercent(
        current.relative_humidity_2m
    )}`;
    windCard.textContent = `Wind ${formatWind(current.wind_speed_10m)}`;
    precipitationCard.textContent = `Precipitation ${formatPrecip(
        current.precipitation
    )}`;
    // Daily Forecast
    dayCards.forEach((card, i) => {
        if (i < daily.time.length) {
            const dayName = new Date(daily.time[i]).toLocaleDateString(
                "en-US",
                { weekday: "short" }
            );
            card.textContent = `${dayName} ${formatTemp(
                daily.temperature_2m_max[i]
            )} / ${formatTemp(daily.temperature_2m_min[i])}`;
        }
    });

    // Hourly Forecast (initially for the current day)
    daySelector.innerHTML = ""; // Clear options
    daily.time.forEach((time, i) => {
        const option = document.createElement("option");
        option.value = time;
        option.textContent = new Date(time).toLocaleDateString("en-US", {
            weekday: "long",
        });
        daySelector.appendChild(option);
    });
    updateHourly(hourly, current.time.split("T")[0]); // Initial day from current time
}

function updateHourly(hourly, selectedDate) {
    const startIndex = hourly.time.findIndex((time) =>
        time.startsWith(selectedDate)
    );
    if (startIndex === -1) return;

    hourlyCards.forEach((card, i) => {
        if (i < 24) {
            const weatherIconDiv = card.querySelector(".weather-icon");
            const timeDiv = card.querySelector(".hourly-time");
            const tempDiv = card.querySelector(".hourly-temp");

            const weatherDesc = getWeatherDescription(
                hourly.weather_code[startIndex + i]
            );
            const time = new Date(
                hourly.time[startIndex + i]
            ).toLocaleTimeString("en-US", { hour: "numeric", hour12: true });

            const hourlyTemp = formatTemp(
                hourly.temperature_2m[startIndex + i]
            );
            weatherIconDiv.textContent = weatherDesc;
            timeDiv.textContent = time;
            tempDiv.textContent = hourlyTemp;
        }
    });
}

// Event Listeners
searchButton.addEventListener("click", async () => {
    const city = searchInput.value.trim();
    if (!city) {
        showError("Please enter a city name");
        return;
    }
    clearError();
    try {
        let weatherData = null;
        if (USE_TEST_DATA) {
            const cityResponse = await fetch("./city-test-data.json");
            const sampleCityData = await cityResponse.json();
            currentLocation = sampleCityData.results[0];
            const weatherResponse = await fetch("./weather-test-data.json");
            weatherData = await weatherResponse.json();
            console.log(currentLocation, weatherData);
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

searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        searchButton.click();
    }
});

daySelector.addEventListener("change", () => {
    if (currentLocation) {
        fetchWeather(
            currentLocation.latitude,
            currentLocation.longitude,
            currentUnits
        )
            .then((data) => {
                updateHourly(data.hourly, daySelector.value);
            })
            .catch((error) => showError(error.message));
    }
});

// Units Toggle (to be implemented fully)
unitsDropdown.innerHTML = `
    <select id="units-select">
        <option value="metric">Metric (°C, km/h, mm)</option>
        <option value="imperial">Imperial (°F, mph, inch)</option>
    </select>
`;
const unitsSelect = document.querySelector("#units-select");
unitsSelect.addEventListener("change", () => {
    currentUnits = unitsSelect.value;
    if (currentLocation) {
        fetchWeather(
            currentLocation.latitude,
            currentLocation.longitude,
            currentUnits
        )
            .then((data) => {
                updateUI(data);
            })
            .catch((error) => showError(error.message));
    }
});

// Initial Load (optional)
document.addEventListener("DOMContentLoaded", () => {
    searchInput.value = "Berlin"; // Default city
    searchButton.click();
});
