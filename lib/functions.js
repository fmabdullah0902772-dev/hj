/**
 * SHEHBAZ-MD v1.0.0 - Utility Functions
 * @author Shehbaz—Dev
 * @description Common utility functions for the bot
 */

import axios from 'axios';
import chalk from 'chalk';

// ===============================
// 📥 BUFFER DOWNLOADER
// ===============================
export const getBuffer = async (url, options = {}) => {
    try {
        const res = await axios({
            method: 'get',
            url,
            headers: {
                'DNT': 1,
                'Upgrade-Insecure-Request': 1
            },
            ...options,
            responseType: 'arraybuffer'
        });
        return res.data;
    } catch (e) {
        console.log(chalk.red('❌ Buffer download error:'), e.message);
        return null;
    }
};

// ===============================
// 👥 GET GROUP ADMINS
// ===============================
export const getGroupAdmins = (participants) => {
    const admins = [];
    for (const participant of participants) {
        if (participant.admin === 'admin' || participant.admin === 'superadmin') {
            admins.push(participant.id);
        }
    }
    return admins;
};

// ===============================
// 🎲 RANDOM STRING GENERATOR
// ===============================
export const getRandom = (ext) => {
    return `${Math.floor(Math.random() * 10000)}${ext}`;
};

// ===============================
// 📊 NUMBER FORMATTER (1000 = 1K)
// ===============================
export const h2k = (number) => {
    const units = ['', 'K', 'M', 'B', 'T', 'P', 'E'];
    const magnitude = Math.floor(Math.log10(Math.abs(number)) / 3);
    
    if (magnitude === 0) return number;
    
    const unit = units[magnitude];
    const scale = Math.pow(10, magnitude * 3);
    let scaled = number / scale;
    let formatted = scaled.toFixed(1);
    
    if (/\.0$/.test(formatted)) {
        formatted = formatted.substr(0, formatted.length - 2);
    }
    
    return formatted + unit;
};

// ===============================
// 🔗 URL VALIDATOR
// ===============================
export const isUrl = (url) => {
    const pattern = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%.+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%+.~#?&/=]*)/gi;
    return pattern.test(url);
};

// ===============================
// 📋 JSON FORMATTER
// ===============================
export const formatJson = (data) => {
    return JSON.stringify(data, null, 2);
};

// ===============================
// ⏱️ RUNTIME FORMATTER (seconds to readable)
// ===============================
export const runtime = (seconds) => {
    seconds = Number(seconds);
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor(seconds % (3600 * 24) / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const secs = Math.floor(seconds % 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
    if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
    if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
    if (secs > 0) parts.push(`${secs} ${secs === 1 ? 'second' : 'seconds'}`);
    
    return parts.join(', ') || '0 seconds';
};

// ===============================
// 😴 SLEEP/DELAY FUNCTION
// ===============================
export const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

// ===============================
// 🌐 FETCH JSON FROM URL
// ===============================
export const fetchJson = async (url, options = {}) => {
    try {
        const res = await axios({
            method: 'GET',
            url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            ...options
        });
        return res.data;
    } catch (err) {
        console.log(chalk.red('❌ Fetch error:'), err.message);
        return null;
    }
};

// ===============================
// ✨ ADDITIONAL USEFUL FUNCTIONS
// ===============================

// Format file size
export const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

// Format timestamp to readable date
export const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
};

// Check if user is admin in group
export const isAdmin = (participants, userId) => {
    const participant = participants.find(p => p.id === userId);
    return participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
};

// Random item from array
export const randomItem = (arr) => {
    return arr[Math.floor(Math.random() * arr.length)];
};

// Truncate string
export const truncate = (str, length = 50) => {
    if (str.length <= length) return str;
    return str.substring(0, length) + '...';
};

// ===============================
// DEFAULT EXPORT (Backward compatible)
// ===============================
export default {
    getBuffer,
    getGroupAdmins,
    getRandom,
    h2k,
    isUrl,
    formatJson,
    runtime,
    sleep,
    fetchJson,
    formatSize,
    formatTime,
    isAdmin,
    randomItem,
    truncate
};