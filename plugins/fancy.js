/**
 * SHEHBAZ-MD - Fancy Text Plugin
 * Convert text to 90+ Unicode styles using PrinceTech API
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
    pattern: 'fancy',
    alias: ['fancytext', 'style', 'textstyle'],
    category: 'tools',
    desc: 'Convert text to 90+ fancy Unicode styles',
    args: '<text>'
}, async (sock, msg, data) => {
    const { from, reply, args, prefix } = data;

    if (!args.length) {
        return reply(`Usage: *${prefix}fancy <text>*\n\nExample:\n*${prefix}fancy Hello World*`);
    }

    const text = args.join(' ');
    const statusMsg = await sock.sendMessage(from, { text: '⏳ Generating fancy styles...' }, { quoted: msg });

    try {
        const url = `https://api.princetechn.com/api/tools/fancyv2?apikey=prince&text=${encodeURIComponent(text)}`;
        const res = await fetchWithRetry(url);
        const d = res.data;

        if (!d?.success || !Array.isArray(d?.results)) {
            await sock.sendMessage(from, { text: '❌ API error. Try again later.', edit: statusMsg.key });
            return;
        }

        const filtered = d.results.filter(item => item.result !== text);
        if (!filtered.length) {
            await sock.sendMessage(from, { text: '❌ No fancy styles generated.', edit: statusMsg.key });
            return;
        }

        let result = `✨ *Fancy Styles for:* _${text}_\n\n`;
        filtered.forEach((item, i) => {
            result += `${i + 1}. *${item.name}*\n${item.result}\n\n`;
        });
        result += `_Total: ${filtered.length} styles_`;

        const MAX = 4000;
        if (result.length > MAX) {
            const chunks = [];
            let chunk = '';
            for (const line of result.split('\n')) {
                if ((chunk + line + '\n').length > MAX) { chunks.push(chunk); chunk = line + '\n'; }
                else chunk += line + '\n';
            }
            if (chunk) chunks.push(chunk);
            await sock.sendMessage(from, { text: chunks[0], edit: statusMsg.key });
            for (let i = 1; i < chunks.length; i++) {
                await sock.sendMessage(from, { text: chunks[i] }, { quoted: msg });
            }
        } else {
            await sock.sendMessage(from, { text: result, edit: statusMsg.key });
        }
    } catch (err) {
        await sock.sendMessage(from, { text: `❌ Error: ${err.message}`, edit: statusMsg.key });
    }
});
