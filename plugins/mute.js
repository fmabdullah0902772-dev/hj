/**
 * SHEHBAZ-MD - Mute/Unmute Plugin
 * Lock or unlock group chat
 */

import { cmd } from '../lib/command.js';

cmd({
    pattern: 'mute',
    alias: ['lockgroup', 'close', 'lock'],
    category: 'group',
    desc: 'Lock group (only admins can message)',
    args: 'on/off'
}, async (sock, msg, data) => {
    const { from, reply, isGroup, isOwner, sender, args, prefix } = data;
    if (!isGroup) return reply('❌ Groups only!');

    let meta;
    try { meta = await sock.groupMetadata(from); } catch { return reply('❌ Could not get group info.'); }

    const botId = sock.user?.id?.split(':')[0].split('@')[0];
    const admins = meta.participants.filter(p => p.admin).map(p => p.id);
    const isSenderAdmin = isOwner || admins.some(a => a.startsWith(sender));
    if (!isSenderAdmin) return reply(`❌ Only admins can use *${prefix}mute*!`);

    const isBotAdmin = admins.some(a => a.startsWith(botId));
    if (!isBotAdmin) return reply('❌ Bot needs to be admin!');

    const sub = args[0]?.toLowerCase() || 'on';

    if (sub === 'on' || sub === 'lock') {
        await sock.groupSettingUpdate(from, 'announcement');
        await reply('🔒 *Group Locked!*\n\nOnly admins can send messages now.');
    } else if (sub === 'off' || sub === 'unlock') {
        await sock.groupSettingUpdate(from, 'not_announcement');
        await reply('🔓 *Group Unlocked!*\n\nAll members can send messages now.');
    } else {
        await reply(`Usage:\n• *${prefix}mute on* — lock group\n• *${prefix}mute off* — unlock group`);
    }
});

cmd({
    pattern: 'unmute',
    alias: ['unlockgroup', 'open', 'unlock'],
    category: 'group',
    desc: 'Unlock group (all members can message)'
}, async (sock, msg, data) => {
    const { from, reply, isGroup, isOwner, sender, prefix } = data;
    if (!isGroup) return reply('❌ Groups only!');

    let meta;
    try { meta = await sock.groupMetadata(from); } catch { return reply('❌ Could not get group info.'); }

    const botId = sock.user?.id?.split(':')[0].split('@')[0];
    const admins = meta.participants.filter(p => p.admin).map(p => p.id);
    const isSenderAdmin = isOwner || admins.some(a => a.startsWith(sender));
    if (!isSenderAdmin) return reply(`❌ Only admins can use *${prefix}unmute*!`);

    const isBotAdmin = admins.some(a => a.startsWith(botId));
    if (!isBotAdmin) return reply('❌ Bot needs to be admin!');

    await sock.groupSettingUpdate(from, 'not_announcement');
    await reply('🔓 *Group Unlocked!*\n\nAll members can send messages now.');
});
