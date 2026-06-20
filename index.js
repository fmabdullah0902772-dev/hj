/**
 * ABDULLAH-MD v4.5.6 - Ultimate WhatsApp Multi-Device Cloud Bot
 * Simplified session handling (no session_id, no MongoDB auth)
 */

import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs-extra";
import pino from "pino";
import { createRequire } from "module";
import chalk from "chalk";
import figlet from "figlet";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

import * as baileys from '@whiskeysockets/baileys';

const {
    makeWASocket,
    DisconnectReason,
    getContentType,
    fetchLatestBaileysVersion,
    Browsers,
    delay,
    useMultiFileAuthState, // ← new: built‑in file‑based auth
    downloadMediaMessage,
    proto
} = baileys;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

import config from './setting.js';
import commandRegistry from './lib/commandRegistry.js';

const PORT = process.env.PORT || 3092;
const ownerNumbers = (process.env.OWNER_NUMBER || "923030382667").split(',');
const PREFIX = config.PREFIX || '.';
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://abdullahmalik634958_db_user:sBamZe0GI8OLTYCw@cluster0.92ew1v7.mongodb.net/?appName=Cluster0";

// Store active socket and some caches
let sock = null;
const messageCache = new Map();
const groupSettings = new Map();
const autoReplyTracker = new Map();
const REACT_EMOJIS = ['❤️','🔥','😎','⚡','🎯','💫','✨','🌟','👑','💎','🚀','🎉'];

// ========== Helper Functions ==========
function isOwner(number) {
    const cleanNumber = number.replace(/[^0-9]/g, '');
    return ownerNumbers.some(owner => owner.replace(/[^0-9]/g, '') === cleanNumber);
}

async function setupDirectories() {
    const dirs = ['lib', 'plugins', 'temp', 'logs', 'public'];
    for (const dir of dirs) {
        await fs.ensureDir(path.join(__dirname, dir));
    }
    await fs.ensureDir(path.join(__dirname, 'auth_info')); // for session files
}

async function loadGroupSettings() {
    try {
        const db = mongoose.connection.db;
        const savedData = await db.collection('group_configs').find({}).toArray();
        savedData.forEach(config => groupSettings.set(config.groupId, config.settings));
    } catch (e) {}
}

async function loadPlugins() {
    const pluginsDir = path.join(__dirname, 'plugins');
    await fs.ensureDir(pluginsDir);
    console.log(chalk.cyan(`📦 Plugins directory: ${pluginsDir}`));

    const files = (await fs.readdir(pluginsDir)).filter(f => f.endsWith('.js'));
    let loaded = 0, failed = 0;
    for (const file of files) {
        try {
            await import(`file://${path.join(pluginsDir, file)}`);
            loaded++;
        } catch (err) {
            console.error(chalk.red(`❌ Plugin load failed [${file}]:`), err.message);
            failed++;
        }
    }
    console.log(chalk.green(`✓ Loaded ${loaded} plugin(s)${failed ? chalk.red(`, ${failed} failed`) : ''}\n`));
}

// ========== Main Session ==========
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'auth_info'));
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true, // QR will be shown in console
        browser: Browsers.windows("Chrome"),
        auth: state,
        version,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 15000,
        emitOwnEvents: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
            console.log(chalk.green(`✅ Bot is ONLINE`));
            // Auto‑add bot number to owner list
            const botNum = sock.user?.id?.split(':')[0].split('@')[0];
            if (botNum && !ownerNumbers.includes(botNum)) {
                ownerNumbers.push(botNum);
                console.log(chalk.cyan(`✓ Owner auto-set: +${botNum}`));
            }
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            if (statusCode === DisconnectReason.loggedOut) {
                console.log(chalk.red(`🔴 Bot logged out, restart to re‑pair`));
            } else {
                console.log(chalk.yellow(`🔄 Connection closed, reconnecting...`));
                setTimeout(startBot, 5000);
            }
        }
    });

    // Anti‑Call
    sock.ev.on('call', async (calls) => {
        for (const call of calls) {
            if (call.status !== 'offer') continue;
            const callerNum = call.from?.split('@')[0].split(':')[0];
            const isOwnerCaller = isOwner(callerNum);

            if (config.ANTI_CALL === 'true' && !isOwnerCaller) {
                await sock.rejectCall(call.id, call.from).catch(() => {});
                const arMsg = config.AUTO_REPLY === 'true' && config.AUTO_REPLY_MSG
                    ? config.AUTO_REPLY_MSG
                    : null;
                const callText = arMsg
                    ? `📵 *Auto-Reply* (missed call)\n\n${arMsg}`
                    : `📵 *ABDULLAH-MD*\n\nCalls are not allowed!\nPlease send a message instead.`;
                await sock.sendMessage(call.from, { text: callText }).catch(() => {});
            }
        }
    });

    // Anti‑Delete
    sock.ev.on('messages.update', async (updates) => {
        if (config.ANTI_DELETE !== 'true') return;
        for (const update of updates) {
            try {
                const { key, update: msgUpdate } = update;
                if (!key || key.remoteJid === 'status@broadcast') continue;

                const isRevoke = msgUpdate?.message?.protocolMessage?.type === 0
                    || msgUpdate?.messageStubType === 1;
                if (!isRevoke) continue;

                const cached = messageCache.get(key.id);
                if (!cached) continue;

                const ownerJid = `${ownerNumbers[0]}@s.whatsapp.net`;
                const from = key.remoteJid;
                const deleter = key.participant || key.remoteJid;
                const delNum = deleter.split('@')[0].split(':')[0];
                const isGroup = from.endsWith('@g.us');
                const location = isGroup ? `Group: ${from.split('@')[0]}` : 'DM';

                const senderName = cached.pushName || delNum;
                const header = `♻️ *Anti-Delete Alert*\n👤 *Name:* ${senderName}\n📞 *Number:* +${delNum}\n📍 *From:* ${location}\n\n`;
                const msgType = getContentType(cached.message);

                if (msgType === 'conversation' || msgType === 'extendedTextMessage') {
                    const text = cached.message?.conversation
                        || cached.message?.extendedTextMessage?.text || '';
                    await sock.sendMessage(ownerJid, {
                        text: header + text,
                        mentions: [deleter]
                    }).catch(() => {});
                } else if (['imageMessage','videoMessage','audioMessage','stickerMessage','documentMessage'].includes(msgType)) {
                    try {
                        const buffer = await downloadMediaMessage(cached, 'buffer', {});
                        const mediaInfo = cached.message[msgType];
                        if (msgType === 'imageMessage') {
                            await sock.sendMessage(ownerJid, { image: buffer, caption: header + (mediaInfo.caption || '') });
                        } else if (msgType === 'videoMessage') {
                            await sock.sendMessage(ownerJid, { video: buffer, caption: header + (mediaInfo.caption || '') });
                        } else if (msgType === 'audioMessage') {
                            await sock.sendMessage(ownerJid, { audio: buffer, mimetype: mediaInfo.mimetype, ptt: mediaInfo.ptt || false });
                            await sock.sendMessage(ownerJid, { text: header + (mediaInfo.ptt ? '🎤 Voice Message' : '🎵 Audio') });
                        } else if (msgType === 'stickerMessage') {
                            await sock.sendMessage(ownerJid, { sticker: buffer });
                            await sock.sendMessage(ownerJid, { text: header + '🎴 Sticker' });
                        } else if (msgType === 'documentMessage') {
                            await sock.sendMessage(ownerJid, { document: buffer, mimetype: mediaInfo.mimetype, fileName: mediaInfo.fileName || 'file' });
                            await sock.sendMessage(ownerJid, { text: header + `📄 Document: ${mediaInfo.fileName || 'file'}` });
                        }
                    } catch {
                        await sock.sendMessage(ownerJid, {
                            text: header + `[${msgType.replace('Message','')} — could not download]`
                        }).catch(() => {});
                    }
                } else {
                    await sock.sendMessage(ownerJid, { text: header + `[${msgType || 'Unknown'}]` }).catch(() => {});
                }
            } catch (_) {}
        }
    });

    // Message Handler
    sock.ev.on('messages.upsert', async (msgUpdate) => {
        try {
            const msg = msgUpdate.messages[0];
            if (!msg || !msg.message) return;
            if (msg.key?.remoteJid === 'status@broadcast') {
                if (config.AUTO_STATUS_SEEN === 'true') {
                    await sock.readMessages([msg.key]).catch(() => {});
                }
                return;
            }

            const msgType = getContentType(msg.message);
            let body = '';
            if (msgType === 'conversation') body = msg.message.conversation || '';
            else if (msgType === 'extendedTextMessage') body = msg.message.extendedTextMessage?.text || '';
            else if (msgType === 'imageMessage') body = msg.message.imageMessage?.caption || '';
            else if (msgType === 'videoMessage') body = msg.message.videoMessage?.caption || '';

            const from = msg.key.remoteJid;
            const sender = msg.key.participant || msg.key.remoteJid;
            const senderNumber = sender.split('@')[0].split(':')[0];
            const isGroup = from.endsWith('@g.us');
            const botOwnNum = sock.user?.id?.split('@')[0].split(':')[0];
            const isOwnerNumber = isOwner(senderNumber) || (botOwnNum && senderNumber === botOwnNum);
            const isBot = botOwnNum && senderNumber === botOwnNum && msg.key.fromMe;

            // Cache for anti‑delete
            if (msg.key?.id && !isBot) {
                messageCache.set(msg.key.id, msg);
                if (messageCache.size > 200) {
                    const firstKey = messageCache.keys().next().value;
                    messageCache.delete(firstKey);
                }
            }

            // Auto‑read
            if (config.READ_MESSAGE === 'true' && !isBot) {
                await sock.readMessages([msg.key]).catch(() => {});
            }

            const isCommand = body.startsWith(PREFIX);

            // Auto‑react (skip commands & own msgs)
            if (config.AUTO_REACT === 'true'
                && !isBot
                && !isCommand
                && !msg.key.fromMe
                && msgType !== 'protocolMessage'
                && msgType !== 'senderKeyDistributionMessage') {
                const emoji = REACT_EMOJIS[Math.floor(Math.random() * REACT_EMOJIS.length)];
                await sock.sendMessage(from, {
                    react: { text: emoji, key: msg.key }
                }).catch(() => {});
            }

            // Anti‑link (groups)
            if (config.ANTI_LINK === 'true' && isGroup && !isOwnerNumber && body) {
                const linkRegex = /(https?:\/\/|www\.|chat\.whatsapp\.com)[^\s]*/i;
                if (linkRegex.test(body)) {
                    await sock.sendMessage(from, { delete: msg.key }).catch(() => {});
                    await sock.sendMessage(from, {
                        text: `⚠️ @${senderNumber} Links are not allowed in this group!`,
                        mentions: [sender]
                    }).catch(() => {});
                    return;
                }
            }

            // Auto‑Reply (DMs only)
            if (config.AUTO_REPLY === 'true'
                && config.AUTO_REPLY_MSG
                && !isGroup
                && !isOwnerNumber
                && !msg.key.fromMe
                && !isCommand) {
                const lastSent = autoReplyTracker.get(senderNumber) || 0;
                if (Date.now() - lastSent > 60000) {
                    autoReplyTracker.set(senderNumber, Date.now());
                    await sock.sendMessage(from, {
                        text: config.AUTO_REPLY_MSG
                    }, { quoted: msg }).catch(() => {});
                }
            }

            if (!isCommand) return;
            if (config.MODE === 'private' && !isOwnerNumber && !isBot) return;

            const cmdName = body.slice(PREFIX.length).split(' ')[0].toLowerCase();
            const args = body.slice(PREFIX.length + cmdName.length).trim().split(/\s+/);
            const cmdArgs = args.filter(a => a);

            const command = commandRegistry.get(cmdName);
            if (command) {
                try {
                    await command.execute(sock, msg, {
                        from,
                        reply: (text) => sock.sendMessage(from, { text }, { quoted: msg }),
                        isGroup,
                        isOwner: isOwnerNumber,
                        sender: senderNumber,
                        args: cmdArgs,
                        prefix: PREFIX,
                        command: cmdName
                    });
                } catch (err) {
                    console.error(`Command Error (${cmdName}):`, err);
                    await sock.sendMessage(from, {
                        text: `❌ Command error: ${err.message}`
                    }, { quoted: msg }).catch(() => {});
                }
            }
        } catch (error) {
            console.error('Message Handler Error:', error);
        }
    });
}

// ========== Express Setup ==========
const app = express();
app.use(cors({ origin: "*" }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Stats endpoints (no pairing)
app.get("/api/stats", (req, res) => {
    res.json({
        success: true,
        status: sock ? 'connected' : 'disconnected',
        uptime: process.uptime()
    });
});

// ========== Database (only for group settings) ==========
async function connectDatabase() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log(chalk.green(`✓ MongoDB Connected (for group configs)`));
    } catch (err) {
        console.error(chalk.red(`❌ MongoDB Error:`), err.message);
        // Non‑critical, continue without DB
    }
}

// ========== Banner ==========
async function showUltimateBanner() {
    console.clear();
    console.log(chalk.green.bold(figlet.textSync('ABDULLAH-MD', { font: 'ANSI Shadow' })));
    console.log(chalk.dim('═'.repeat(80)));
    console.log(chalk.white(`├ ${chalk.green('✓')} Version:       ${chalk.yellow('4.5.6 Simplified')}`));
    console.log(chalk.white(`├ ${chalk.green('✓')} Auth:          ${chalk.green('Local Files')}`));
    console.log(chalk.white(`├ ${chalk.green('✓')} Pairing:       ${chalk.green('Terminal QR')}`));
    console.log(chalk.white(`└ ${chalk.green('✓')} Status:        ${chalk.green('STARTING')}`));
    console.log(chalk.dim('═'.repeat(80)));
    console.log();
}

// ========== Start ==========
async function start() {
    await showUltimateBanner();
    await connectDatabase();       // optional for group settings
    await setupDirectories();
    await loadPlugins();
    await loadGroupSettings();     // from MongoDB if available

    // Start the WhatsApp socket
    await startBot();

    // Start Express server
    app.listen(PORT, () => {
        console.log(chalk.green(`\n✓ Server on port ${PORT}`));
        console.log(chalk.white.bold(`\n⚡ ABDULLAH-MD ACTIVE! ⚡\n`));
        console.log(chalk.yellow(`📱 Scan the QR code above to connect your WhatsApp`));
    });
}

process.on('SIGINT', async () => {
    if (sock) sock.end();
    process.exit(0);
});

start().catch(console.error);

export default app;
