/**
 * SHEHBAZ-MD v4.5.6 - Menu Plugin (Bold Unicode Format)
 */

import { cmd } from '../lib/command.js';
import commandRegistry from '../lib/commandRegistry.js';
import config from '../setting.js';

const MENU_IMAGE = process.env.MAIN_IMG || config.MAIN_IMG || 'https://files.catbox.moe/x9rntx.png';
const CHANNEL    = process.env.CHANNEL_LINK || config.CHANNEL_LINK
    || 'https://whatsapp.com/channel/0029VbD4UbdCRs1mNQPRZt2F';

// ── Unicode Bold Sans-Serif converter ────────────────────────────────────────
const BL = ['𝗮','𝗯','𝗰','𝗱','𝗲','𝗳','𝗴','𝗵','𝗶','𝗷','𝗸','𝗹','𝗺','𝗻','𝗼','𝗽','𝗾','𝗿','𝘀','𝘁','𝘂','𝘃','𝘄','𝘅','𝘆','𝘇'];
const BU = ['𝗔','𝗕','𝗖','𝗗','𝗘','𝗙','𝗚','𝗛','𝗜','𝗝','𝗞','𝗟','𝗠','𝗡','𝗢','𝗣','𝗤','𝗥','𝗦','𝗧','𝗨','𝗩','𝗪','𝗫','𝗬','𝗭'];
const LOW = 'abcdefghijklmnopqrstuvwxyz';
const UPP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function bold(str) {
    return [...String(str)].map(c => {
        const li = LOW.indexOf(c); if (li !== -1) return BL[li];
        const ui = UPP.indexOf(c); if (ui !== -1) return BU[ui];
        return c;
    }).join('');
}

// ── Category display names ────────────────────────────────────────────────────
const CAT_LABEL = {
    owner:    'OWNER CMDS',
    admin:    'ADMIN CMDS',
    user:     'USER CMDS',
    group:    'GROUP CMDS',
    media:    'MEDIA',
    tools:    'TOOLS',
    fun:      'FUN',
    general:  'GENERAL',
    download: 'DOWNLOAD',
};

function buildBox(label, lines) {
    if (!lines.length) return '';
    const header = `╭━━━〔 ${bold(label)} 〕━━━┈⊷`;
    const body   = lines.map(l => `┃ ⋄ ${l}`).join('\n');
    const footer = `╰━━━━━━━━━━━━━━━━━━┈⊷`;
    return `${header}\n${body}\n${footer}`;
}

function getUptime() {
    const s = Math.floor(process.uptime());
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

cmd({
    pattern: 'menu',
    alias: ['help', 'cmds'],
    category: 'info',
    desc: 'Bot command menu'
}, async (sock, msg, data) => {
    const { from, reply, sender, prefix } = data;
    const p        = prefix || config.PREFIX || '.';
    const botName  = config.BOT_NAME || 'SHEHBAZ MD';
    const mode     = config.MODE === 'private' ? `${bold('Private')} 🔐` : `${bold('Public')} 🌍`;
    const userName = msg.pushName || sender || 'User';

    // Build category boxes
    const allCats  = commandRegistry.getCategories().filter(c => c !== 'info');
    const order    = ['owner', 'admin', 'user', 'group', 'media', 'download', 'tools', 'fun', 'general'];
    const sorted   = [...order.filter(c => allCats.includes(c)), ...allCats.filter(c => !order.includes(c))];

    let boxes = '';
    for (const cat of sorted) {
        const cmds = commandRegistry.getByCategory(cat).filter(c => !c.isAlias);
        if (!cmds.length) continue;
        const label = CAT_LABEL[cat] || cat.toUpperCase();
        const lines = cmds.map(c => {
            const name  = bold(c.pattern);
            const aStr  = c.args ? ` ${bold('[' + c.args + ']')}` : '';
            return `.${name}${aStr}`;
        });
        boxes += buildBox(label, lines) + '\n\n';
    }

    const fi = v => v === 'true' ? '✅' : '❌';

    const menuText =
`╭━━━〔 *${botName}* 〕━━━┈⊷
┃ 👤 ${bold('User')}: ${userName}
┃ 🤖 ${bold('Status')}: ${bold('Online')} ✅
┃ ⚙️ ${bold('Mode')}: ${mode}
┃ ⏱️ ${bold('Uptime')}: ${getUptime()}
╰━━━━━━━━━━━━━━━━━━┈⊷

${boxes}🤖 ${bold('Active Feature')}:
• ${bold('Auto-React')}: ${fi(config.AUTO_REACT)}
• ${bold('Anti-Delete')}: ${fi(config.ANTI_DELETE)}
• ${bold('Anti-Call')}: ${fi(config.ANTI_CALL)}
• ${bold('Anti-Link')}: ${fi(config.ANTI_LINK)}
• ${bold('Auto-Status')}: ${fi(config.AUTO_STATUS_SEEN)}

🔗 ${bold('CHANNEL')}:
> ${CHANNEL}
⚡ ${bold('POWERED BY')}: *Shehbaz—Dev*`;

    try {
        await sock.sendMessage(from, {
            image: { url: MENU_IMAGE },
            caption: menuText,
            contextInfo: {
                mentionedJid: [sender + '@s.whatsapp.net'],
                forwardingScore: 999,
                isForwarded: true
            }
        });
    } catch {
        await reply(menuText);
    }
});
