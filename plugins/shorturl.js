/**
 * SHEHBAZ-MD - Short URL Plugin
 * Shorten long URLs using PrinceTech API
 */

import { cmd } from '../lib/command.js';
import axios from 'axios';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';

async function fetchWithRetry(url, retries = 3) {
    for (let i = 1; i <= retries; i++) {
        try {
            return await axios.get(url, { timeout: 15000, headers: { 'User-Agent': UA } });
        } catch (err) {
            if (i === retries) throw err;
            await new Promise(r => setTimeout(r, 1000 * i));
        }
    }
}

cmd({
    pattern: 'shorturl',
    alias: ['shorten', 'tinyurl', 'urlshort'],
    category: 'tools',
    desc: 'Shorten a long URL',
    args: '<url>'
}, async (sock, msg, data) => {
    const { from, reply, args, prefix } = data;

    if (!args.length) {
        return reply(`Usage: *${prefix}shorturl <url>*\n\nExample:\n*${prefix}shorturl https://very-long-url.com/path/to/something*`);
    }

    const longUrl = args[0].trim();

    try { new URL(longUrl); } catch {
        return reply('❌ Invalid URL! Please include *https://* or *http://*');
    }

    const statusMsg = await sock.sendMessage(from, { text: '⏳ Shortening URL...' }, { quoted: msg });

    try {
        const url = `https://api.princetechn.com/api/tools/tinyurl?apikey=prince&url=${encodeURIComponent(longUrl)}`;
        const res = await fetchWithRetry(url);
        const d = res.data;

        if (!d?.success || !d?.result) {
            await sock.sendMessage(from, { text: '❌ Failed to shorten URL. Try again.', edit: statusMsg.key });
            return;
        }

        await sock.sendMessage(from, {
            text:
`🔗 *URL Shortened!*

📎 *Original:*
${longUrl}

✨ *Short URL:*
${d.result}

> ⚡ _Powered by SHEHBAZ-MD_`,
            edit: statusMsg.key
        });
    } catch (err) {
        await sock.sendMessage(from, { text: `❌ Error: ${err.message}`, edit: statusMsg.key });
    }
});
