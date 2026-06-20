/**
 * SHEHBAZ-MD v1.0.0 - Anti-Delete Module
 * @author Shehbaz—Dev
 * @description Detect and log deleted messages in groups and private chats
 */

import chalk from 'chalk';
import config from '../setting.js';

// Message cache for anti-delete
const messageCache = new Map();
const MAX_CACHE_SIZE = 1000;

/**
 * Cache a message for anti-delete detection
 * @param {Object} msg - Message object
 * @param {string} body - Message body/text
 * @param {string} sender - Sender JID
 * @param {string} chat - Chat JID
 * @param {boolean} isGroup - Is group chat
 */
export function cacheMessage(msg, body, sender, chat, isGroup) {
    if (!msg.key || msg.key.fromMe) return;
    if (!config.ANTI_DELETE || config.ANTI_DELETE !== 'true') return;
    
    const messageId = msg.key.id;
    
    messageCache.set(messageId, {
        id: messageId,
        body: body || '(Media/Sticker/Document)',
        sender,
        chat,
        isGroup,
        timestamp: Date.now(),
        messageType: msg.mtype || 'unknown',
        msg: msg
    });
    
    // Clean old cache
    if (messageCache.size > MAX_CACHE_SIZE) {
        const oldestKey = messageCache.keys().next().value;
        messageCache.delete(oldestKey);
    }
}

/**
 * Get cached message by ID
 * @param {string} messageId - Message ID
 * @returns {Object|null} Cached message or null
 */
export function getCachedMessage(messageId) {
    return messageCache.get(messageId) || null;
}

/**
 * Handle deleted message (protocol message with revoke)
 * @param {Object} sock - Socket connection
 * @param {Object} msg - Protocol message
 * @param {Object} config - Bot config
 * @returns {Promise<void>}
 */
export async function handleDelete(sock, msg, botConfig) {
    try {
        // Check if anti-delete is enabled
        if (botConfig.ANTI_DELETE !== 'true') return;
        
        // Get deleted message key
        const protocolMsg = msg.message?.protocolMessage;
        if (!protocolMsg || protocolMsg.type !== 0) return; // Type 0 = REVOKE
        
        const deletedKey = protocolMsg.key;
        if (!deletedKey || deletedKey.fromMe) return;
        
        const messageId = deletedKey.id;
        const chatId = deletedKey.remoteJid;
        
        // Get cached message
        const cached = messageCache.get(messageId);
        if (!cached) return;
        
        // Get owner numbers
        const ownerNumbers = botConfig.OWNER_NUMBERS || [botConfig.OWNER_NUMBER];
        
        // Format deleted message alert
        const deletedBy = msg.key?.participant || msg.key?.remoteJid || 'Unknown';
        const deletedByName = deletedBy.split('@')[0];
        const senderName = cached.sender.split('@')[0];
        
        const alertMsg = `╭──❍ *🚫 ANTI-DELETE DETECTED* ❍──╮
│
├❍ *Chat:* ${cached.isGroup ? '👥 GROUP' : '👤 PRIVATE'}
├❍ *Chat ID:* ${cached.chat.split('@')[0]}
├❍ *Deleted By:* @${deletedByName}
├❍ *Original Sender:* @${senderName}
├❍ *Message Type:* ${cached.messageType}
│
├❍ *Deleted Content:*
├❍ ─────────────────
├❍ ${cached.body}
│
╰──────────────────────────❍

> 🕒 Deleted at: ${new Date(cached.timestamp).toLocaleTimeString()}`;
        
        // Send alert based on ANTI_DELETE_TYPE
        const alertType = botConfig.ANTI_DELETE_TYPE || 'same';
        
        if (alertType === 'same') {
            // Send to same chat
            await sock.sendMessage(cached.chat, {
                text: alertMsg,
                mentions: [cached.sender, deletedBy]
            }).catch(() => {});
        } else if (alertType === 'owner') {
            // Send to owner only
            for (const owner of ownerNumbers) {
                const ownerJid = owner.includes('@') ? owner : `${owner}@s.whatsapp.net`;
                await sock.sendMessage(ownerJid, {
                    text: alertMsg,
                    mentions: [cached.sender, deletedBy]
                }).catch(() => {});
            }
        } else if (alertType === 'both') {
            // Send to both chat and owner
            await sock.sendMessage(cached.chat, {
                text: alertMsg,
                mentions: [cached.sender, deletedBy]
            }).catch(() => {});
            
            for (const owner of ownerNumbers) {
                const ownerJid = owner.includes('@') ? owner : `${owner}@s.whatsapp.net`;
                await sock.sendMessage(ownerJid, {
                    text: alertMsg,
                    mentions: [cached.sender, deletedBy]
                }).catch(() => {});
            }
        }
        
        // Log to console
        console.log(chalk.yellow(`🚫 Anti-Delete: ${cached.body.substring(0, 50)} from ${senderName}`));
        
        // Remove from cache after reporting
        messageCache.delete(messageId);
        
    } catch (error) {
        console.log(chalk.red('❌ Anti-Delete error:'), error.message);
    }
}

/**
 * Clear old cached messages (cleanup function)
 * @param {number} maxAge - Max age in milliseconds (default: 1 hour)
 */
export function cleanOldCache(maxAge = 3600000) {
    const now = Date.now();
    for (const [id, cached] of messageCache.entries()) {
        if (now - cached.timestamp > maxAge) {
            messageCache.delete(id);
        }
    }
}

/**
 * Get cache statistics
 * @returns {Object} Cache stats
 */
export function getCacheStats() {
    return {
        size: messageCache.size,
        maxSize: MAX_CACHE_SIZE,
        oldest: messageCache.size > 0 ? Math.min(...Array.from(messageCache.values()).map(m => m.timestamp)) : null,
        newest: messageCache.size > 0 ? Math.max(...Array.from(messageCache.values()).map(m => m.timestamp)) : null
    };
}

/**
 * Clear entire cache
 */
export function clearCache() {
    messageCache.clear();
}

export default {
    cacheMessage,
    getCachedMessage,
    handleDelete,
    cleanOldCache,
    getCacheStats,
    clearCache
};