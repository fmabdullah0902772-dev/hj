/**
 * SHEHBAZ-MD - Wikipedia Plugin
 * Search Wikipedia using PrinceTech API
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
    pattern: 'wiki',
    alias: ['wikipedia', 'search', 'w'],
    category: 'tools',
    desc: 'Search Wikipedia for any topic',
    args: '<topic>'
}, async (sock, msg, data) => {
    const { from, reply, args, prefix } = data;

    if (!args.length) {
        return reply(`Usage: *${prefix}wiki <topic>*\n\nExample:\n*${prefix}wiki Elon Musk*`);
    }

    const term = args.join(' ');
    const statusMsg = await sock.sendMessage(from, {
        text: `⏳ Searching Wikipedia for *${term}*...`
    }, { quoted: msg });

    try {
        const url = `https://api.princetechn.com/api/search/wikimedia?apikey=prince&title=${encodeURIComponent(term)}`;
        const res = await fetchWithRetry(url);
        const d = res.data;

        if (!d?.success || !d?.results) {
            await sock.sendMessage(from, { text: `❌ No results found for *${term}*.`, edit: statusMsg.key });
            return;
        }

        const r = d.results;
        let text = `╔══════════════════════╗\n║  *📚 ${r.title}*  ║\n╚══════════════════════╝\n\n`;
        if (r.description) text += `*${r.description}*\n\n`;
        text += `${r.extract.slice(0, 2000)}${r.extract.length > 2000 ? '...' : ''}\n\n`;
        text += `🔗 *Read more:* ${r.pageUrl}`;

        if (r.thumbnail?.source) {
            try {
                const img = await axios.get(r.thumbnail.source, { responseType: 'arraybuffer', timeout: 10000 });
                await sock.sendMessage(from, { image: Buffer.from(img.data), caption: text }, { quoted: msg });
                await sock.sendMessage(from, { delete: statusMsg.key }).catch(() => {});
                return;
            } catch {}
        }

        await sock.sendMessage(from, { text, edit: statusMsg.key });

    } catch (err) {
        await sock.sendMessage(from, { text: `❌ Failed: ${err.message}`, edit: statusMsg.key });
    }
});
