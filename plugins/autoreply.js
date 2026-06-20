/**
 * SHEHBAZ-MD v4.5.6 - Auto-Reply Plugin
 * .autoreply on <message>  → enable with custom message
 * .autoreply off           → disable
 * .autoreply msg <text>    → update message only
 * .autoreply delay <secs>  → cooldown between replies per person (default 60s)
 * .autoreply status        → view current settings
 */

import { cmd } from '../lib/command.js';
import config from '../setting.js';

cmd({
    pattern: 'autoreply',
    alias: ['away', 'ar'],
    category: 'owner',
    args: 'on/off/msg/delay/status',
    desc: 'Auto-reply to DMs and calls'
}, async (sock, msg, data) => {
    const { reply, args, prefix } = data;

    // Owner-only
    const botNum    = sock.user?.id?.split('@')[0].split(':')[0];
    const senderNum = (msg.key.participant || msg.key.remoteJid)?.split('@')[0].split(':')[0];
    if (!data.isOwner && senderNum !== botNum && !msg.key.fromMe)
        return reply('❌ Only owner can use this command!');

    const sub = args[0]?.toLowerCase();

    // ── .autoreply on [message] ───────────────────────────────────────────────
    if (sub === 'on') {
        const message = args.slice(1).join(' ').trim();
        if (!message)
            return reply(`Usage: *${prefix}autoreply on <your away message>*\n\nExample:\n*${prefix}autoreply on Hi! I'm busy right now, will reply soon. 😊*`);
        await config.updateCloudSetting('AUTO_REPLY', 'true');
        await config.updateCloudSetting('AUTO_REPLY_MSG', message);
        await reply(
`✅ *Auto-Reply ENABLED* 🟢

📝 *Message:*
_${message}_

⏱️ Cooldown: *${config.AUTO_REPLY_DELAY || 60}s* per person
_(Use *${prefix}autoreply delay <secs>* to change)_`);
        return;
    }

    // ── .autoreply off ────────────────────────────────────────────────────────
    if (sub === 'off') {
        await config.updateCloudSetting('AUTO_REPLY', 'false');
        autoReplyCache.clear();
        return reply('❌ *Auto-Reply DISABLED* 🔴');
    }

    // ── .autoreply msg <text> ─────────────────────────────────────────────────
    if (sub === 'msg') {
        const message = args.slice(1).join(' ').trim();
        if (!message) return reply(`Usage: *${prefix}autoreply msg <new message>*`);
        await config.updateCloudSetting('AUTO_REPLY_MSG', message);
        return reply(`✅ *Auto-Reply message updated!*\n\n📝 _${message}_`);
    }

    // ── .autoreply delay <seconds> ────────────────────────────────────────────
    if (sub === 'delay') {
        const secs = parseInt(args[1]);
        if (isNaN(secs) || secs < 10)
            return reply(`Usage: *${prefix}autoreply delay <seconds>*\nMinimum: 10 seconds`);
        await config.updateCloudSetting('AUTO_REPLY_DELAY', String(secs));
        return reply(`✅ *Cooldown set to ${secs} seconds* per person`);
    }

    // ── .autoreply status ─────────────────────────────────────────────────────
    if (!sub || sub === 'status') {
        const isOn  = config.AUTO_REPLY === 'true';
        const msg_  = config.AUTO_REPLY_MSG || '_(not set)_';
        const delay = config.AUTO_REPLY_DELAY || 60;
        return reply(
`╭━━━〔 *AUTO-REPLY STATUS* 〕━━━┈⊷
┃
┃ 📡 *Status:*   ${isOn ? '🟢 ON' : '🔴 OFF'}
┃ ⏱️ *Cooldown:* ${delay}s per person
┃
┃ 📝 *Message:*
┃ _${msg_}_
┃
╰━━━━━━━━━━━━━━━━━━┈⊷

💡 *Commands:*
• *${prefix}autoreply on <message>*
• *${prefix}autoreply off*
• *${prefix}autoreply msg <new text>*
• *${prefix}autoreply delay <seconds>*`);
    }

    return reply(`Usage:\n• *${prefix}autoreply on <message>*\n• *${prefix}autoreply off*\n• *${prefix}autoreply msg <text>*\n• *${prefix}autoreply delay <secs>*\n• *${prefix}autoreply status*`);
});
