/**
 * SHEHBAZ-MD - Promote/Demote Plugin
 * Promote or demote group members
 */

import { cmd } from '../lib/command.js';

async function getTarget(msg, sock, from) {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const mentioned = ctx?.mentionedJid || [];
    if (mentioned.length > 0) return mentioned[0];
    if (ctx?.participant && ctx.stanzaId && ctx.quotedMessage) return ctx.participant;
    return null;
}

async function isAdmin(sock, from, senderNum, isOwner) {
    try {
        const meta = await sock.groupMetadata(from);
        const admins = meta.participants.filter(p => p.admin).map(p => p.id);
        return isOwner || admins.some(a => a.startsWith(senderNum));
    } catch { return isOwner; }
}

cmd({
    pattern: 'promote',
    alias: ['makeadmin', 'addadmin'],
    category: 'group',
    desc: 'Promote member to group admin',
    args: '@user'
}, async (sock, msg, data) => {
    const { from, reply, isGroup, isOwner, sender, prefix } = data;
    if (!isGroup) return reply('❌ Groups only!');

    const botId = sock.user?.id?.split(':')[0].split('@')[0];
    let meta;
    try { meta = await sock.groupMetadata(from); } catch { return reply('❌ Could not get group info.'); }

    const admins = meta.participants.filter(p => p.admin).map(p => p.id);
    const isSenderAdmin = isOwner || admins.some(a => a.startsWith(sender));
    if (!isSenderAdmin) return reply(`❌ Only admins can use *${prefix}promote*!`);

    const isBotAdmin = admins.some(a => a.startsWith(botId));
    if (!isBotAdmin) return reply('❌ Bot needs to be admin!');

    const target = await getTarget(msg, sock, from);
    if (!target) return reply(`❌ Mention or reply to the user.\nUsage: *${prefix}promote @user*`);

    const targetNum = target.split('@')[0].split(':')[0];
    const isAlreadyAdmin = admins.some(a => a.startsWith(targetNum));
    if (isAlreadyAdmin) return reply('❌ This user is already an admin!');

    try {
        await sock.groupParticipantsUpdate(from, [target], 'promote');
        await sock.sendMessage(from, {
            text: `✅ @${targetNum} has been promoted to admin! 👑`,
            mentions: [target]
        }, { quoted: msg });
    } catch (err) {
        await reply(`❌ Failed to promote: ${err.message}`);
    }
});

cmd({
    pattern: 'demote',
    alias: ['removeadmin'],
    category: 'group',
    desc: 'Demote admin to member',
    args: '@user'
}, async (sock, msg, data) => {
    const { from, reply, isGroup, isOwner, sender, prefix } = data;
    if (!isGroup) return reply('❌ Groups only!');

    const botId = sock.user?.id?.split(':')[0].split('@')[0];
    let meta;
    try { meta = await sock.groupMetadata(from); } catch { return reply('❌ Could not get group info.'); }

    const admins = meta.participants.filter(p => p.admin).map(p => p.id);
    const isSenderAdmin = isOwner || admins.some(a => a.startsWith(sender));
    if (!isSenderAdmin) return reply(`❌ Only admins can use *${prefix}demote*!`);

    const isBotAdmin = admins.some(a => a.startsWith(botId));
    if (!isBotAdmin) return reply('❌ Bot needs to be admin!');

    const target = await getTarget(msg, sock, from);
    if (!target) return reply(`❌ Mention or reply to the user.\nUsage: *${prefix}demote @user*`);

    const targetNum = target.split('@')[0].split(':')[0];
    const isTargetAdmin = admins.some(a => a.startsWith(targetNum));
    if (!isTargetAdmin) return reply('❌ This user is not an admin!');

    try {
        await sock.groupParticipantsUpdate(from, [target], 'demote');
        await sock.sendMessage(from, {
            text: `✅ @${targetNum} has been removed from admin!`,
            mentions: [target]
        }, { quoted: msg });
    } catch (err) {
        await reply(`❌ Failed to demote: ${err.message}`);
    }
});
