/**
 * SHEHBAZ-MD - TikTok Downloader Plugin
 * Fixed: downloads buffer with proper headers before sending
 */

import { cmd } from '../lib/command.js';
import axios from 'axios';

const MAX_SIZE_BYTES = 60 * 1024 * 1024; // 60 MB limit

async function fetchTikTokInfo(url) {
    try {
        const response = await axios.get(
            `https://apisaqib.vercel.app/api/v1/1053?url=${encodeURIComponent(url)}`,
            { timeout: 20000 }
        );

        if (response.data?.code === 0 && response.data?.data) {
            const d = response.data.data;
            return {
                success: true,
                // play = no watermark, wmplay = with watermark
                videoUrl: d.play || d.wmplay,
                audioUrl: d.music,
                title: d.title || 'TikTok Video',
                duration: d.duration || 0,
                size: d.size || 0,
                cover: d.cover || d.origin_cover
            };
        }
        return { success: false, error: 'No video data in response' };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

async function downloadBuffer(url) {
    const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 60000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://www.tiktok.com/',
            'Accept': '*/*'
        }
    });
    return Buffer.from(res.data);
}

cmd({
    pattern: 'tiktok',
    alias: ['tt', 'tiktokdl', 'ttdl'],
    desc: 'Download TikTok video without watermark',
    category: 'download',
    use: '.tiktok <url>'
}, async (sock, msg, ctx) => {
    const { from, reply, args } = ctx;

    const url = args.join(' ').trim();

    if (!url || url.length < 10 || !url.startsWith('http')) {
        return reply(
`📱 *TIKTOK DOWNLOADER*

📌 *Usage:* .tiktok <url>
📝 *Example:* .tiktok https://vt.tiktok.com/xxxxx`);
    }

    const statusMsg = await sock.sendMessage(from, {
        text: '⏳ *Fetching TikTok video info...*'
    }, { quoted: msg });

    const info = await fetchTikTokInfo(url);

    if (!info.success || !info.videoUrl) {
        await sock.sendMessage(from, {
            text: `❌ *Failed to fetch video!*\n\n📛 *Error:* ${info.error}\n\n💡 Make sure the TikTok link is correct and the video is public.`,
            edit: statusMsg.key
        });
        return;
    }

    if (info.size > MAX_SIZE_BYTES) {
        await sock.sendMessage(from, {
            text: `❌ *Video too large!*\n\n📦 Size: ${(info.size / 1024 / 1024).toFixed(1)}MB\n⚠️ Limit: 60MB\n\n💡 Try a shorter TikTok video.`,
            edit: statusMsg.key
        });
        return;
    }

    await sock.sendMessage(from, {
        text: `⬇️ *Downloading video...*\n📦 Size: ~${(info.size / 1024 / 1024).toFixed(1)}MB`,
        edit: statusMsg.key
    });

    try {
        const buffer = await downloadBuffer(info.videoUrl);

        await sock.sendMessage(from, { delete: statusMsg.key }).catch(() => {});

        await sock.sendMessage(from, {
            video: buffer,
            mimetype: 'video/mp4',
            caption:
`🎵 *${info.title.slice(0, 100)}*

⏱️ Duration: ${info.duration}s
📱 Downloaded via *SHEHBAZ-MD*
> ⚡ _Powered by Shehbaz—Dev_`
        }, { quoted: msg });

    } catch (err) {
        await sock.sendMessage(from, {
            text: `❌ *Download failed!*\n\n📛 ${err.message}\n\n💡 The video might be too large or unavailable.`,
            edit: statusMsg.key
        });
    }
});
