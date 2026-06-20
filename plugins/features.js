/**
 * SHEHBAZ-MD v4.5.6 - Feature Toggle + Utility Plugin
 */

import { cmd } from '../lib/command.js';
import config from '../setting.js';
import * as baileys from '@whiskeysockets/baileys';

const { downloadMediaMessage, getContentType } = baileys;

// ── Owner check: uses isOwner from context OR matches bot's paired number ─────
function checkOwner(sock, msg, data) {
    if (data.isOwner) return true;
    const botNum    = sock.user?.id?.split('@')[0].split(':')[0];
    const senderNum = (msg.key.participant || msg.key.remoteJid)?.split('@')[0].split(':')[0];
    return (botNum && senderNum === botNum) || msg.key.fromMe === true;
}

async function toggle(sock, msg, data, key, label) {
    if (!checkOwner(sock, msg, data)) return data.reply('❌ Only owner can use this!');
    const arg = data.args[0]?.toLowerCase();
    if (!arg || !['on', 'off'].includes(arg))
        return data.reply(`Usage: *${data.prefix}${data.command} on/off*`);
    await config.updateCloudSetting(key, arg === 'on' ? 'true' : 'false');
    await data.reply(`✅ *${label}* is now *${arg === 'on' ? 'ON 🟢' : 'OFF 🔴'}*`);
}

// ── Toggle Commands ───────────────────────────────────────────────────────────
cmd({ pattern: 'antidelete', alias: ['antidel'], category: 'owner', args: 'on/off', desc: 'Forward deleted msgs to inbox' },
    (s, m, d) => toggle(s, m, d, 'ANTI_DELETE', 'Anti-Delete'));

cmd({ pattern: 'anticall', alias: ['callblock'], category: 'owner', args: 'on/off', desc: 'Auto-reject calls' },
    (s, m, d) => toggle(s, m, d, 'ANTI_CALL', 'Anti-Call'));

cmd({ pattern: 'autoreact', alias: ['react'], category: 'owner', args: 'on/off', desc: 'Auto-react to messages' },
    (s, m, d) => toggle(s, m, d, 'AUTO_REACT', 'Auto-React'));

cmd({ pattern: 'antilink', alias: ['nolink'], category: 'owner', args: 'on/off', desc: 'Block links in groups' },
    (s, m, d) => toggle(s, m, d, 'ANTI_LINK', 'Anti-Link'));

cmd({ pattern: 'autoread', alias: ['readmsg'], category: 'owner', args: 'on/off', desc: 'Auto-read messages' },
    (s, m, d) => toggle(s, m, d, 'READ_MESSAGE', 'Auto-Read'));

cmd({ pattern: 'autostatus', alias: ['statusview'], category: 'owner', args: 'on/off', desc: 'Auto-view statuses' },
    (s, m, d) => toggle(s, m, d, 'AUTO_STATUS_SEEN', 'Auto-Status'));

cmd({ pattern: 'mode', alias: ['botmode'], category: 'owner', args: 'public/private', desc: 'Set bot mode' },
    async (sock, msg, data) => {
        if (!checkOwner(sock, msg, data)) return data.reply('❌ Only owner can use this!');
        const arg = data.args[0]?.toLowerCase();
        if (!['public', 'private'].includes(arg))
            return data.reply(`Usage: *${data.prefix}mode public/private*`);
        await config.updateCloudSetting('MODE', arg);
        await data.reply(`✅ Bot mode → *${arg === 'public' ? 'Public 🌍' : 'Private 🔐'}*`);
    });

// ── Settings ──────────────────────────────────────────────────────────────────
cmd({ pattern: 'settings', alias: ['features', 'botinfo'], category: 'owner', desc: 'View all feature statuses' },
    async (sock, msg, data) => {
        if (!checkOwner(sock, msg, data)) return data.reply('❌ Only owner can use this!');
        const s = v => v === 'true' ? '🟢 ON' : '🔴 OFF';
        await data.reply(
`╭━━━〔 *BOT SETTINGS* 〕━━━┈⊷
┃
┃ 🤖 *Mode:*   ${config.MODE === 'public' ? '🌍 Public' : '🔐 Private'}
┃ 📡 *Prefix:* [ ${config.PREFIX || '.'} ]
┃
┃ ${s(config.AUTO_REACT)}   Auto-React
┃ ${s(config.ANTI_DELETE)}  Anti-Delete
┃ ${s(config.ANTI_CALL)}    Anti-Call
┃ ${s(config.ANTI_LINK)}    Anti-Link
┃ ${s(config.READ_MESSAGE)} Auto-Read
┃ ${s(config.AUTO_STATUS_SEEN)} Auto-Status
┃
╰━━━━━━━━━━━━━━━━━━┈⊷

💡 *.antidelete on/off*  💡 *.anticall on/off*
💡 *.autoreact on/off*   💡 *.mode public/private*`);
    });

// ── Ping ──────────────────────────────────────────────────────────────────────
cmd({ pattern: 'ping', alias: ['speed'], category: 'user', desc: 'Check bot response speed' },
    async (sock, msg, data) => {
        const start = Date.now();
        await data.reply(`🏓 *Pong!*\n⚡ Speed: *${Date.now() - start}ms*\n✅ Bot is online!`);
    });

// ── Owner Info ────────────────────────────────────────────────────────────────
cmd({ pattern: 'owner', alias: ['dev'], category: 'user', desc: 'Bot owner contact' },
    async (sock, msg, data) => {
        const { from } = data;
        const ownerNum = config.OWNER_NUMBERS?.[0] || config.OWNER_NUMBER || '923212844383';
        await sock.sendMessage(from, {
            text: `👑 *Bot Owner*\n\n*Name:* ${config.OWNER_NAME || 'Shehbaz'}\n*Contact:* wa.me/${ownerNum}\n\n> ⚡ _Powered by Shehbaz—Dev_`,
            contextInfo: {
                mentionedJid: [`${ownerNum}@s.whatsapp.net`]
            }
        }, { quoted: msg });
    });

// ── View Once Bypass ──────────────────────────────────────────────────────────
cmd({ pattern: 'vv', alias: ['viewonce', 'view'], category: 'user', desc: 'Reveal view-once media' },
    async (sock, msg, data) => {
        const { from, reply } = data;

        // Support reply from text message
        const ctxInfo = msg.message?.extendedTextMessage?.contextInfo
            || msg.message?.imageMessage?.contextInfo
            || msg.message?.videoMessage?.contextInfo
            || msg.message?.audioMessage?.contextInfo;

        if (!ctxInfo?.quotedMessage) {
            return reply('❌ Reply to a view-once message and type *.vv*');
        }

        const quoted = ctxInfo.quotedMessage;

        // Find view-once wrapper (multiple Baileys versions)
        const voContent = quoted.viewOnceMessage?.message
            || quoted.viewOnceMessageV2?.message
            || quoted.viewOnceMessageV2Extension?.message;

        if (!voContent) return reply('❌ That message is not a view-once.');

        const mediaType = getContentType(voContent);
        if (!mediaType) return reply('❌ Could not detect media type.');

        // Reconstruct WAMessage for download
        const fakeMsg = {
            key: {
                remoteJid: from,
                id:        ctxInfo.stanzaId || msg.key.id,
                participant: ctxInfo.participant,
                fromMe:    false
            },
            message: voContent
        };

        try {
            const buffer = await downloadMediaMessage(fakeMsg, 'buffer', {});

            if (mediaType === 'imageMessage') {
                await sock.sendMessage(from, {
                    image:   buffer,
                    caption: `👁️ *View-Once Revealed*\n${voContent.imageMessage?.caption || ''}`
                }, { quoted: msg });

            } else if (mediaType === 'videoMessage') {
                await sock.sendMessage(from, {
                    video:   buffer,
                    caption: `👁️ *View-Once Revealed*\n${voContent.videoMessage?.caption || ''}`
                }, { quoted: msg });

            } else if (mediaType === 'audioMessage') {
                await sock.sendMessage(from, {
                    audio:   buffer,
                    mimetype: voContent.audioMessage?.mimetype || 'audio/ogg; codecs=opus',
                    ptt:     voContent.audioMessage?.ptt || false
                }, { quoted: msg });

            } else {
                await reply(`❌ Unsupported type: ${mediaType}`);
            }
        } catch (err) {
            await reply(`❌ Failed to reveal: ${err.message}`);
        }
    });
