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
    SESSION_ID: process.argv[2] || getEnv('SESSION_ID', '', 'string'),
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
