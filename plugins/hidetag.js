/**
 * SHEHBAZ-MD - HideTag Plugin
 * Silently tag all group members (no visible list)
 */

import { cmd } from '../lib/command.js';
import * as baileys from '@whiskeysockets/baileys';

const { downloadMediaMessage } = baileys;

cmd({
    pattern: 'hidetag',
    alias: ['htag', 'stag', 'tag'],
    category: 'group',
    desc: 'Silently tag all group members (admin only)'
}, async (sock, msg, data) => {
    const { from, reply, isGroup, isOwner, sender, args, prefix } = data;

    if (!isGroup) return reply('❌ Groups only!');

    let meta;
    try { meta = await sock.groupMetadata(from); } catch { return reply('❌ Could not get group info.'); }

    const botId = sock.user?.id?.split(':')[0].split('@')[0];
    const admins = meta.participants.filter(p => p.admin).map(p => p.id);
    const isSenderAdmin = isOwner || admins.some(a => a.startsWith(sender));
    if (!isSenderAdmin) return reply(`❌ Only admins can use *${prefix}hidetag*!`);

    const isBotAdmin = admins.some(a => a.startsWith(botId));
    if (!isBotAdmin) return reply('❌ Bot needs to be admin!');

    const mentions = meta.participants.map(p => p.id);

    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const quotedMsg = ctx?.quotedMessage;
    const text = args.join(' ') || ' ';

    if (quotedMsg) {
        const fakeMsg = {
            key: { remoteJid: from, id: ctx.stanzaId, participant: ctx.participant, fromMe: false },
            message: quotedMsg
        };

        const mediaType = quotedMsg.imageMessage ? 'imageMessage'
            : quotedMsg.videoMessage ? 'videoMessage'
            : null;

        if (mediaType) {
            try {
                const buffer = await downloadMediaMessage(fakeMsg, 'buffer', {});
                const caption = args.join(' ')
                    || quotedMsg[mediaType]?.caption || '';

                await sock.sendMessage(from, {
                    [mediaType === 'imageMessage' ? 'image' : 'video']: buffer,
                    caption,
                    mentions
                }, { quoted: msg });
                return;
            } catch { }
        }

        const quotedText = quotedMsg.conversation
            || quotedMsg.extendedTextMessage?.text
            || text;
        await sock.sendMessage(from, { text: quotedText, mentions }, { quoted: msg });
    } else {
        await sock.sendMessage(from, { text, mentions }, { quoted: msg });
    }
});
