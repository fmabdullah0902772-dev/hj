/**
 * SHEHBAZ-MD v1.0.0 - Message Serializer & Media Downloader
 * @author Shehbaz—Dev
 * @description WhatsApp message parser with helper methods
 */

import { 
    proto, 
    downloadContentFromMessage, 
    getContentType 
} from '@whiskeysockets/baileys';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

// ===============================
// 📥 MEDIA DOWNLOADER
// ===============================

/**
 * Download media from message
 * @param {Object} m - Message object
 * @param {string} filename - Output filename (optional)
 * @returns {Promise<Buffer>} Downloaded media buffer
 */
export const downloadMediaMessage = async (m, filename) => {
    try {
        // Handle viewOnce messages
        let messageType = m.type;
        let messageContent = m.msg;
        
        if (messageType === 'viewOnceMessage') {
            messageContent = m.msg?.message;
            messageType = getContentType(messageContent);
            messageContent = messageContent[messageType];
        }

        const save = async (stream, filePath) => {
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            if (filePath) {
                await fs.writeFile(filePath, buffer);
            }
            return buffer;
        };

        let mediaType = '';
        let ext = '';
        let outputPath = null;

        if (filename) {
            outputPath = path.isAbsolute(filename) ? filename : path.join('./temp', filename);
            await fs.ensureDir(path.dirname(outputPath));
        }

        if (messageType === 'imageMessage') {
            mediaType = 'image';
            ext = '.jpg';
        } else if (messageType === 'videoMessage') {
            mediaType = 'video';
            ext = '.mp4';
        } else if (messageType === 'audioMessage') {
            mediaType = 'audio';
            ext = '.mp3';
        } else if (messageType === 'stickerMessage') {
            mediaType = 'sticker';
            ext = '.webp';
        } else if (messageType === 'documentMessage') {
            mediaType = 'document';
            ext = messageContent.fileName?.split('.').pop() || '.bin';
            if (!ext.startsWith('.')) ext = '.' + ext;
        } else {
            return null;
        }

        const stream = await downloadContentFromMessage(messageContent, mediaType);
        const finalPath = outputPath || `${filename || 'file'}${ext}`;
        
        return await save(stream, finalPath);
        
    } catch (error) {
        console.log(chalk.red('❌ Media download error:'), error.message);
        return null;
    }
};

// ===============================
// 💬 MESSAGE SERIALIZER
// ===============================

/**
 * Serialize WhatsApp message with helper methods
 * @param {Object} conn - Socket connection
 * @param {Object} m - Raw message
 * @param {Object} store - Message store (optional)
 * @returns {Object} Enhanced message object
 */
export const sms = (conn, m, store = null) => {
    if (!m) return m;
    
    const M = proto.WebMessageInfo;

    // ========== BASIC INFO ==========
    if (m.key) {
        m.id = m.key.id;
        m.chat = m.key.remoteJid;
        m.fromMe = m.key.fromMe;
        m.isGroup = m.chat?.endsWith('@g.us') || false;
        m.isStatus = m.chat === 'status@broadcast';
        
        m.sender = m.fromMe
            ? conn.user.id?.split(':')[0] + '@s.whatsapp.net'
            : m.isGroup
            ? m.key.participant
            : m.chat;
    }

    // ========== MESSAGE CONTENT ==========
    if (m.message) {
        m.mtype = getContentType(m.message);
        
        // Handle viewOnce messages
        if (m.mtype === 'viewOnceMessage') {
            const viewOnceMsg = m.message[m.mtype];
            if (viewOnceMsg?.message) {
                const innerType = getContentType(viewOnceMsg.message);
                m.msg = viewOnceMsg.message[innerType];
                m.mtype = innerType;
            }
        } else {
            m.msg = m.message[m.mtype];
        }

        // Extract text body
        let rawBody = '';
        
        if (m.mtype === 'conversation') {
            rawBody = m.message.conversation || '';
        } else if (m.mtype === 'imageMessage') {
            rawBody = m.msg?.caption || '';
        } else if (m.mtype === 'videoMessage') {
            rawBody = m.msg?.caption || '';
        } else if (m.mtype === 'extendedTextMessage') {
            rawBody = m.msg?.text || '';
        } else if (m.mtype === 'buttonsResponseMessage') {
            rawBody = m.msg?.selectedButtonId || '';
        } else if (m.mtype === 'listResponseMessage') {
            rawBody = m.msg?.singleSelectReply?.selectedRowId || '';
        } else if (m.mtype === 'templateButtonReplyMessage') {
            rawBody = m.msg?.selectedId || '';
        }

        m.body = typeof rawBody === 'string' ? rawBody : '';

        // ========== QUOTED MESSAGE ==========
        const contextInfo = m.msg?.contextInfo;
        m.quoted = contextInfo?.quotedMessage || null;
        m.mentionedJid = contextInfo?.mentionedJid || [];

        if (m.quoted) {
            const quotedType = getContentType(m.quoted);
            let quotedMsg = m.quoted[quotedType];
            
            if (typeof quotedMsg === 'string') {
                quotedMsg = { text: quotedMsg };
            }
            
            m.quoted = {
                ...quotedMsg,
                mtype: quotedType,
                id: contextInfo.stanzaId,
                chat: contextInfo.remoteJid || m.chat,
                sender: contextInfo.participant,
                fromMe: contextInfo.participant === conn.user.id,
                text: quotedMsg?.text || quotedMsg?.caption || quotedMsg?.conversation || quotedMsg?.selectedDisplayText || ''
            };
        }
    }

    // ========== SAFE TEXT EXTRACTION ==========
    m.text = m.msg?.text || 
             m.msg?.caption || 
             m.message?.conversation || 
             m.msg?.selectedDisplayText || 
             m.msg?.title || 
             '';

    // ========== HELPER METHODS ==========
    
    /**
     * Reply to message
     * @param {string} text - Reply text
     * @returns {Promise} Send message promise
     */
    m.reply = (text) => {
        if (!text || typeof text !== 'string') return;
        return conn.sendMessage(m.chat, { text }, { quoted: m });
    };

    /**
     * React to message with emoji
     * @param {string} emoji - Emoji to react with
     * @returns {Promise} React promise
     */
    m.react = (emoji) => {
        return conn.sendMessage(m.chat, { 
            react: { text: emoji, key: m.key } 
        });
    };

    /**
     * Forward message
     * @param {string} jid - Target JID
     * @param {boolean} force - Force forward
     * @returns {Promise} Forward promise
     */
    m.forward = (jid = m.chat, force = false) => {
        return conn.copyNForward(jid, m, force);
    };

    /**
     * Download media from message
     * @param {string} filename - Output filename
     * @returns {Promise<Buffer>} Media buffer
     */
    if (m.msg?.url || ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage'].includes(m.mtype)) {
        m.download = (filename) => downloadMediaMessage(m, filename);
    }

    /**
     * Get message timestamp
     * @returns {Date} Message date
     */
    m.timestamp = () => {
        return new Date((m.messageTimestamp || Date.now()) * 1000);
    };

    /**
     * Check if message has media
     * @returns {boolean}
     */
    m.hasMedia = () => {
        return ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage'].includes(m.mtype);
    };

    return m;
};

// ===============================
// DEFAULT EXPORT
// ===============================
export default { sms, downloadMediaMessage };
