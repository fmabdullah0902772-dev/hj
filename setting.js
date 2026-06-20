/**
 * ABDULLAH-MD v4.5.0 - Cloud Configuration Manager
 * @author Shehbaz—Dev [Cyber Security Researcher]
 * @description Centralized cloud configuration with dynamic MongoDB fallbacks
 */

import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chalk from 'chalk';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load local environment variables as absolute structural boot override
const envPaths = ['./config.env', './.env', join(__dirname, 'config.env'), join(__dirname, '.env')];
for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        break;
    }
}

// Global Runtime Memory Settings Cache Buffer
const cloudConfigCache = new Map();

// Helper parsing controllers
function toBoolean(text) {
    if (typeof text === 'boolean') return text;
    if (typeof text === 'string') {
        const lower = text.toLowerCase().trim();
        return lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on';
    }
    return false;
}

function getEnv(key, defaultValue, type = 'string') {
    const value = process.env[key];
    if (value === undefined || value === '') return defaultValue;
    switch (type) {
        case 'number': const num = Number(value); return isNaN(num) ? defaultValue : num;
        case 'boolean': return toBoolean(value);
        case 'array': return value.split(',').map(v => v.trim()).filter(v => v);
        default: return value;
    }
}

// Cache absolute owner layers
const rawOwnerNumbers = getEnv('OWNER_NUMBER', '923030382667', 'string');
const OWNER_NUMBERS = rawOwnerNumbers.split(',').map(n => n.trim());

// ===============================
// 🗄️ CORE CONFIGURATION SCHEMA LAYER
// ===============================
const config = {
    // Session Server Variables
    SESSION_ID: process.argv[2] || getEnv('SESSION_ID', 'ABDULLAH-MD!eyJub2lzZUtleSI6eyJwcml2YXRlIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiQVBsYjJVUDZSNnc0TVNhNWlIZmVPb3kxSGIwRVA0bmx5cXAycmRiK2RFOD0ifSwicHVibGljIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiNUl1T1ByVU1aRW9vNjkyQ1BydXRrVXQ2RWxCNU1qUkpZZWE5SWhDWWpVMD0ifX0sInBhaXJpbmdFcGhlbWVyYWxLZXlQYWlyIjp7InByaXZhdGUiOnsidHlwZSI6IkJ1ZmZlciIsImRhdGEiOiJrTlpEandqQkMvaUFpMUYvWXQvaVdGenJtbW5XdDE4ZHREdXgvQzgzZm1rPSJ9LCJwdWJsaWMiOnsidHlwZSI6IkJ1ZmZlciIsImRhdGEiOiJUL1RYOUtZMldJZGc4dk16b3N2aXFzR3NLenVIbjJDVnNMRDBwcVZFUnkwPSJ9fSwic2lnbmVkSWRlbnRpdHlLZXkiOnsicHJpdmF0ZSI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6Ik1DSFBXNlVTaFl0eUZSRXg5UEIvTmc3eEVsVjNteDF1QThhWEJ4d0U2MFE9In0sInB1YmxpYyI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6ImFEOWVWWDNJd0hOM1Rsc2lRcEtsRGczaEh6QXpoUy92MHY2VFcwTjdpMFU9In19LCJzaWduZWRQcmVLZXkiOnsia2V5UGFpciI6eyJwcml2YXRlIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiNk5rWGtGK3p6Zm1TNlpkcHdwM0VNMWljbXI1K3JBS3gvcEJIV3lndmkwQT0ifSwicHVibGljIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiMUlpT0hNNTN4ZnRyaE9PZ0dVK21BMGpLMTZvajg3bVk2WHFsMHVpbUhBcz0ifX0sInNpZ25hdHVyZSI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6IndKRTNiVCtaNVFHRVFvcHdROFE3OHU3YlAyTWEreFJOT0hxZ1pSSnJEZHBsTzh0MWFTZ2xKMWpkNm1NWXNnUkZkWDIxSkxMOEpoOXd6WTJzbFF6SkF3PT0ifSwia2V5SWQiOjF9LCJyZWdpc3RyYXRpb25JZCI6MTQ2LCJhZHZTZWNyZXRLZXkiOiI4aUUycEFIZFlYNytEUUtZSkxaOXdDVFQ5U0IvUi95bHpFajlnUXQzL3N3PSIsInByb2Nlc3NlZEhpc3RvcnlNZXNzYWdlcyI6W3sia2V5Ijp7InJlbW90ZUppZCI6IjkyMzI0NTU3NjMyNEBzLndoYXRzYXBwLm5ldCIsImZyb21NZSI6dHJ1ZSwiaWQiOiIzQUM5MUNCQUVCRjM5Q0Y1NjBDQSIsInBhcnRpY2lwYW50IjoiIiwiYWRkcmVzc2luZ01vZGUiOiJwbiJ9LCJtZXNzYWdlVGltZXN0YW1wIjoxNzgxOTgwOTU1fSx7ImtleSI6eyJyZW1vdGVKaWQiOiI5MjMyNDU1NzYzMjRAcy53aGF0c2FwcC5uZXQiLCJmcm9tTWUiOnRydWUsImlkIjoiM0FEMEYxQjk3QkUyRTFDRDNGNTIiLCJwYXJ0aWNpcGFudCI6IiIsImFkZHJlc3NpbmdNb2RlIjoicG4ifSwibWVzc2FnZVRpbWVzdGFtcCI6MTc4MTk4MDk1N30seyJrZXkiOnsicmVtb3RlSmlkIjoiOTIzMjQ1NTc2MzI0QHMud2hhdHNhcHAubmV0IiwiZnJvbU1lIjp0cnVlLCJpZCI6IjNBRTEyQTU2NEM0RkUxNUNBOERGIiwicGFydGljaXBhbnQiOiIiLCJhZGRyZXNzaW5nTW9kZSI6InBuIn0sIm1lc3NhZ2VUaW1lc3RhbXAiOjE3ODE5ODA5NTl9XSwibmV4dFByZUtleUlkIjo4MTMsImZpcnN0VW51cGxvYWRlZFByZUtleUlkIjo4MTMsImFjY291bnRTeW5jQ291bnRlciI6MSwiYWNjb3VudFNldHRpbmdzIjp7InVuYXJjaGl2ZUNoYXRzIjpmYWxzZX0sInJlZ2lzdGVyZWQiOnRydWUsInBhaXJpbmdDb2RlIjoiQzZEWExXREUiLCJtZSI6eyJpZCI6IjkyMzI0NTU3NjMyNDoyQHMud2hhdHNhcHAubmV0IiwibGlkIjoiMTQ1OTg2Njc2NjIxNDY5OjJAbGlkIiwibmFtZSI6ImFiZHVsbGFoIn0sImFjY291bnQiOnsiZGV0YWlscyI6IkNQYS83dnNIRUpHKzI5RUdHQUVnQUNnQSIsImFjY291bnRTaWduYXR1cmVLZXkiOiJlK3ByK1l4K2V5ekNoVnNyTkJvNnFaUHhHSkx6K1RWRFhSYjFFVXBxeUZNPSIsImFjY291bnRTaWduYXR1cmUiOiJZdjlYTzFoVWhrZ3kreDB0VzB0K1krNXh3d1BhdkZuaW5TV1l5SXdKYUtsVHZvV3ZYQnc4YXNDRjNadW9mQng2ZmFKSzIwbHdXb0tFYXdyTkkxN3pqdz09IiwiZGV2aWNlU2lnbmF0dXJlIjoiaUdUOXgxbFJ1NGc0TDZmcHdHK3hIN1d2MHN3NEliUmNPRjZIaGJlMy9jVlpPUE0vN0pvczJnN2w1V1RsdkEyY0Njc0NhUUNmdHdGNjE2dVJtS253REE9PSJ9LCJzaWduYWxJZGVudGl0aWVzIjpbeyJpZGVudGlmaWVyIjp7Im5hbWUiOiIxNDU5ODY2NzY2MjE0Njk6MkBsaWQiLCJkZXZpY2VJZCI6MH0sImlkZW50aWZpZXJLZXkiOnsidHlwZSI6IkJ1ZmZlciIsImRhdGEiOiJCWHZxYS9tTWZuc3N3b1ZiS3pRYU9xbVQ4UmlTOC9rMVExMFc5UkZLYXNoVCJ9fV0sInBsYXRmb3JtIjoiaXBob25lIiwicm91dGluZ0luZm8iOnsidHlwZSI6IkJ1ZmZlciIsImRhdGEiOiJDQTBJQWdnUyJ9LCJsYXN0QWNjb3VudFN5bmNUaW1lc3RhbXAiOjE3ODE5ODA5NTQsImxhc3RQcm9wSGFzaCI6IjRUdGlVeiIsIm15QXBwU3RhdGVLZXlJZCI6IkFBQUFBTmdWIn0=', 'string'),
    PORT: getEnv('PORT', 3092, 'number'),
    
    // Core Parameters
    PREFIX: getEnv('PREFIX', '.', 'string'),
    BOT_NAME: getEnv('BOT_NAME', 'ABDULLAH-MD', 'string'),
    STICKER_NAME: getEnv('STICKER_NAME', 'ABDULLAH-MD', 'string'),
    MODE: getEnv('MODE', 'public', 'string').toLowerCase(),
    
    // Owner Ecosystem
    OWNER_NUMBERS: OWNER_NUMBERS,
    OWNER_NAME: getEnv('OWNER_NAME', 'TECH ABDULLAH(AY BHATTI)', 'string'),
    
    // Cloud Security Protocols (Stored as String or Boolean mapping fallbacks)
    ANTI_CALL: getEnv('ANTI_CALL', 'true', 'string'),
    ANTI_DELETE: getEnv('ANTI_DELETE', 'true', 'string'),
    ANTI_LINK: getEnv('ANTI_LINK', 'true', 'string'),
    ANTI_BAD: getEnv('ANTI_BAD', 'false', 'string'),
    ANTI_BOT: getEnv('ANTI_BOT', 'true', 'string'),
    ANTI_VV: getEnv('ANTI_VV', 'true', 'string'),
    
    // Automation Pipeline Tracking Matrix
    AUTO_STATUS_SEEN: getEnv('AUTO_STATUS_SEEN', 'true', 'string'),
    READ_MESSAGE: getEnv('READ_MESSAGE', 'true', 'string'),
    SEND_WELCOME: getEnv('SEND_WELCOME', 'false', 'string'),
    GOODBYE: getEnv('GOODBYE', 'false', 'string'),
    AUTO_REACT: getEnv('AUTO_REACT', 'true', 'string'),

    // Auto-Reply
    AUTO_REPLY:       getEnv('AUTO_REPLY',       'false', 'string'),
    AUTO_REPLY_MSG:   getEnv('AUTO_REPLY_MSG',   '',      'string'),
    AUTO_REPLY_DELAY: getEnv('AUTO_REPLY_DELAY', '60',    'string'),
    
    // Dynamic Cloud Operations Link Engine Protocols
    async reloadFromCloud() {
        try {
            if (mongoose.connection.readyState !== 1) return;
            const db = mongoose.connection.db;
            const collection = db.collection('global_system_configs');
            
            const systemSettingsDoc = await collection.findOne({ configId: "GLOBAL_MATRIX" });
            if (systemSettingsDoc && systemSettingsDoc.settings) {
                Object.keys(systemSettingsDoc.settings).forEach(key => {
                    config[key] = systemSettingsDoc.settings[key];
                    cloudConfigCache.set(key, systemSettingsDoc.settings[key]);
                });
                console.log(chalk.green(`✓ [CLOUD CONFIG] Global System Parameters Synced via Live Cluster Cluster.`));
            }
        } catch (err) {
            console.log(chalk.yellow(`⚠️ Cloud sync skipped during runtime handshake initializing. Using process env.`));
        }
    },
    
    async updateCloudSetting(key, value) {
        try {
            config[key] = value;
            cloudConfigCache.set(key, value);
            if (mongoose.connection.readyState === 1) {
                const db = mongoose.connection.db;
                const collection = db.collection('global_system_configs');
                const updatedSettings = Object.fromEntries(cloudConfigCache);
                
                await collection.findOneAndUpdate(
                    { configId: "GLOBAL_MATRIX" },
                    { $set: { settings: updatedSettings, lastUpdated: Date.now() } },
                    { upsert: true }
                );
            }
            return true;
        } catch (e) {
            return false;
        }
    }
};

// Auto-validation logging layer 
if (process.env.NODE_ENV !== 'production') {
    console.log(chalk.dim('📋 Processing Deployment Environmental Layout Layer...'));
}

export default config;
