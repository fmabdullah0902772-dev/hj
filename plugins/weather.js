/**
 * SHEHBAZ-MD - Weather Plugin
 * Get weather for any city using OpenWeatherMap
 */

import { cmd } from '../lib/command.js';
import axios from 'axios';

const WEATHER_ICONS = {
    Clear: '☀️', Clouds: '☁️', Rain: '🌧️', Drizzle: '🌦️',
    Thunderstorm: '⛈️', Snow: '❄️', Mist: '🌫️', Fog: '🌫️',
    Haze: '🌫️', Smoke: '🌫️', Dust: '🌪️', Sand: '🌪️',
    Ash: '🌋', Squall: '💨', Tornado: '🌪️'
};

cmd({
    pattern: 'weather',
    alias: ['clima', 'mausam'],
    category: 'tools',
    desc: 'Get live weather for any city',
    args: '<city>'
}, async (sock, msg, data) => {
    const { from, reply, args, prefix } = data;

    if (!args.length) {
        return reply(`Usage: *${prefix}weather <city name>*\n\nExamples:\n• *${prefix}weather Karachi*\n• *${prefix}weather London*\n• *${prefix}weather New York*`);
    }

    const city = args.join(' ');

    try {
        const apiKey = '4902c0f2550f58298ad4146a92b65e10';
        const res = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`,
            { timeout: 10000 }
        );
        const w = res.data;
        const icon = WEATHER_ICONS[w.weather[0].main] || '🌡️';
        const windDir = ['N','NE','E','SE','S','SW','W','NW'][Math.round(w.wind.deg / 45) % 8] || 'N/A';

        await reply(
`${icon} *Weather in ${w.name}, ${w.sys.country}*

🌡️ *Temperature:* ${w.main.temp}°C (feels like ${w.main.feels_like}°C)
🌤️ *Condition:* ${w.weather[0].description}
💧 *Humidity:* ${w.main.humidity}%
👁️ *Visibility:* ${((w.visibility || 0) / 1000).toFixed(1)} km
💨 *Wind:* ${w.wind.speed} m/s ${windDir}
🏔️ *Pressure:* ${w.main.pressure} hPa
🌅 *Min/Max:* ${w.main.temp_min}°C / ${w.main.temp_max}°C

> ⚡ _Powered by SHEHBAZ-MD_`);
    } catch (err) {
        if (err.response?.status === 404) {
            await reply(`❌ City *${city}* not found. Please check the spelling.`);
        } else {
            await reply(`❌ Could not fetch weather: ${err.message}`);
        }
    }
});
