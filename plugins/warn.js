/**
 * SHEHBAZ-MD - Warn Plugin
 * Warning system with JSON file persistence
 * Max 3 warnings → auto kick
 */

import { cmd } from '../lib/command.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WARN_FILE = path.join(__dirname, '../temp/warnings.json');

const MAX_WARN = 3;

function loadWarns() {
    try {
        if (fs.existsSync(WARN_FILE)) return JSON.parse(fs.readFileSync(WARN_FILE, 'utf8'));
    } catch {}
    return {};
}

function saveWarns(data) {
    try {
        fs.ensureDirSync(path.dirname(WARN_FILE));
        fs.writeFileSync(WARN_FILE, JSON.stringify(data, null, 2));
    } catch {}
}

function addWarn(groupId, userId, reason) {
    const data = loadWarns();
    if (!data[groupId]) data[groupId] = {};
    if (!data[groupId][userId]) data[groupId][userId] = [];
    data[groupId][userId].push({ reason, time: Date.now() });
    saveWarns(data);
    return data[groupId][userId].length;
}

function getWarns(groupId, userId) {
    const data = loadWarns();
    return data[groupId]?.[userId] || [];
}

function clearWarn(groupId, userId) {
    const data = loadWarns();
    if (data[groupId]) delete data[groupId][userId];
    saveWarns(data);
}

cmd({
    pattern: 'warn',
    alias: ['warning', 'w'],
    category: 'group',
    desc: 'Warn a group member (admin only)',
    args: '@user [reason]'
}, async (sock, msg, data) => {
    const { from, reply, isGroup, isOwner, sender, args, prefix } = data;
    if (!isGroup) return reply('❌ Groups only!');

    let meta;
    try { meta = await sock.groupMetadata(from); } catch { return reply('❌ Could not get group info.'); }

    const botId = sock.user?.id?.split(':')[0].split('@')[0];
    const admins = meta.participants.filter(p => p.admin).map(p => p.id);
    const isSenderAdmin = isOwner || admins.some(a => a.startsWith(sender));
    if (!isSenderAdmin) return reply(`❌ Only admins can use *${prefix}warn*!`);

    const isBotAdmin = admins.some(a => a.startsWith(botId));

    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const mentioned = ctx?.mentionedJid || [];
    let target = mentioned[0] || (ctx?.participant && ctx?.stanzaId ? ctx.participant : null);
    if (!target) return reply(`❌ Mention or reply to the user.\nUsage: *${prefix}warn @user [reason]*`);

    const targetNum = target.split('@')[0].split(':')[0];
    const isTargetAdmin = admins.some(a => a.startsWith(targetNum));
    if (isTargetAdmin) return reply('❌ Cannot warn an admin!');

    const reason = args.slice(mentioned.length > 0 ? 1 : 0).join(' ') || 'No reason specified';
    const count = addWarn(from, targetNum, reason);

    let text = `⚠️ *WARNING ISSUED*\n\n👤 User: @${targetNum}\n📝 Reason: ${reason}\n⚠️ Warnings: *${count}/${MAX_WARN}*\n\n`;

    if (count >= MAX_WARN) {
        text += `❌ Max warnings reached! Removing user...`;
        await sock.sendMessage(from, { text, mentions: [target] }, { quoted: msg });
        if (isBotAdmin) {
            await sock.groupParticipantsUpdate(from, [target], 'remove').catch(() => {});
            clearWarn(from, targetNum);
        }
    } else {
        text += `⚠️ ${MAX_WARN - count} warning(s) left before removal!`;
        await sock.sendMessage(from, { text, mentions: [target] }, { quoted: msg });
    }
});

cmd({
    pattern: 'resetwarn',
    alias: ['clearwarn', 'warnreset'],
    category: 'group',
    desc: 'Clear warnings for a user',
    args: '@user'
}, async (sock, msg, data) => {
    const { from, reply, isGroup, isOwner, sender, prefix } = data;
    if (!isGroup) return reply('❌ Groups only!');

    let meta;
    try { meta = await sock.groupMetadata(from); } catch { return reply('❌ Could not get group info.'); }

    const admins = meta.participants.filter(p => p.admin).map(p => p.id);
    const isSenderAdmin = isOwner || admins.some(a => a.startsWith(sender));
    if (!isSenderAdmin) return reply(`❌ Only admins can use *${prefix}resetwarn*!`);

    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const mentioned = ctx?.mentionedJid || [];
    let target = mentioned[0] || (ctx?.participant && ctx?.stanzaId ? ctx.participant : null);
    if (!target) return reply(`❌ Mention or reply to the user.\nUsage: *${prefix}resetwarn @user*`);

    const targetNum = target.split('@')[0].split(':')[0];
    clearWarn(from, targetNum);
    await sock.sendMessage(from, {
        text: `✅ Warnings cleared for @${targetNum}!`,
        mentions: [target]
    }, { quoted: msg });
});

cmd({
    pattern: 'warnlist',
    alias: ['warnings'],
    category: 'group',
    desc: 'View all warnings in group'
}, async (sock, msg, data) => {
    const { from, reply, isGroup, isOwner, sender, prefix } = data;
    if (!isGroup) return reply('❌ Groups only!');

    let meta;
    try { meta = await sock.groupMetadata(from); } catch { return reply('❌ Could not get group info.'); }

    const admins = meta.participants.filter(p => p.admin).map(p => p.id);
    const isSenderAdmin = isOwner || admins.some(a => a.startsWith(sender));
    if (!isSenderAdmin) return reply(`❌ Only admins can use *${prefix}warnlist*!`);

    const data2 = loadWarns();
    const groupWarns = data2[from] || {};
    const entries = Object.entries(groupWarns).filter(([, w]) => w.length > 0);

    if (entries.length === 0) return reply('✅ No warnings in this group!');

    let text = `⚠️ *Warning List*\n\n`;
    entries.forEach(([num, warns]) => {
        text += `👤 *${num}*: ${warns.length}/${MAX_WARN} warnings\n`;
        warns.forEach((w, i) => text += `  ${i + 1}. ${w.reason}\n`);
        text += '\n';
    });

    await reply(text);
});
