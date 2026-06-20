/**
 * SHEHBAZ-MD - Kick Plugin
 * Remove mentioned or replied user from group
 */

import { cmd } from '../lib/command.js';

cmd({
    pattern: 'kick',
    alias: ['remove', 'ban'],
    category: 'group',
    desc: 'Kick a member from group (admin only)',
    args: '@user'
}, async (sock, msg, data) => {
    const { from, reply, isGroup, isOwner, sender, args, prefix } = data;

    if (!isGroup) return reply('❌ This command is for groups only!');

    let groupMetadata;
    try {
        groupMetadata = await sock.groupMetadata(from);
    } catch {
        return reply('❌ Could not fetch group info.');
    }

    const botId = sock.user?.id?.split(':')[0].split('@')[0];
    const participants = groupMetadata.participants;
    const admins = participants.filter(p => p.admin).map(p => p.id);
    const senderJid = sender + '@s.whatsapp.net';
    const isSenderAdmin = admins.includes(senderJid)
        || admins.some(a => a.startsWith(sender))
        || isOwner;

    if (!isSenderAdmin) return reply(`❌ Only admins can use *${prefix}kick*!`);

    const isBotAdmin = admins.some(a => a.startsWith(botId));
    if (!isBotAdmin) return reply('❌ Bot needs to be admin to kick members!');

    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const mentioned = ctx?.mentionedJid || [];
    let targets = [];

    if (mentioned.length > 0) targets = mentioned;
    else if (ctx?.participant && ctx.stanzaId && ctx.quotedMessage) targets = [ctx.participant];

    if (targets.length === 0) return reply(`❌ Mention or reply to the user you want to kick.\nUsage: *${prefix}kick @user*`);

    const botJid = botId + '@s.whatsapp.net';
    if (targets.includes(botJid) || targets.some(t => t.startsWith(botId + ':'))) {
        return reply('❌ I cannot kick myself!');
    }

    try {
        await sock.groupParticipantsUpdate(from, targets, 'remove');
        const names = targets.map(j => `@${j.split('@')[0]}`).join(', ');
        await sock.sendMessage(from, {
            text: `✅ ${names} has been kicked!`,
            mentions: targets
        }, { quoted: msg });
    } catch (err) {
        await reply(`❌ Failed to kick: ${err.message}`);
    }
});
