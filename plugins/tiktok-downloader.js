// plugins/tiktok.js

import { cmd } from '../lib/command.js';
import axios from 'axios';

async function downloadTikTok(url) {
    try {
        const response = await axios.get(`https://apisaqib.vercel.app/api/v1/1053?url=${encodeURIComponent(url)}`, { 
            timeout: 15000 
        });
        
        console.log("TikTok API Response:", response.data);
        
        // Handle different response formats
        if (response.data && response.data.code === 0 && response.data.data) {
            const videoUrl = response.data.data.play || response.data.data.wmplay || response.data.data.video;
            if (videoUrl) {
                return { success: true, url: videoUrl, title: response.data.data.title || "TikTok Video" };
            }
        }
        
        // Try alternative API if first fails
        const altResponse = await axios.get(`https://api.siputzx.my.id/api/download/tiktok?url=${encodeURIComponent(url)}`, {
            timeout: 15000
        });
        
        if (altResponse.data && altResponse.data.status && altResponse.data.data) {
            const videoUrl = altResponse.data.data.play || altResponse.data.data.video;
            if (videoUrl) {
                return { success: true, url: videoUrl, title: "TikTok Video" };
            }
        }
        
        return { success: false, error: "No video found in response" };
    } catch (error) {
        console.error("TikTok download error:", error.message);
        return { success: false, error: error.message };
    }
}

cmd({
    pattern: "tiktok",
    alias: ["tt", "tiktokdl", "ttdl"],
    desc: "Download TikTok video without watermark",
    category: "download",
    react: "📱",
    use: ".tiktok <url>"
},
async (sock, msg, ctx) => {
    const { from, reply, q } = ctx;
    
    if (!q) {
        return reply(`╭━━━━━━━━━━━━━━━━━━━━╮
┃   📱 *TIKTOK DOWNLOADER*   
╰━━━━━━━━━━━━━━━━━━━━╯

◈━━━━━━━━━━━━━━━━━━◈
📌 *Usage:* 
   .tiktok <url>

📝 *Example:* 
   .tiktok https://vm.tiktok.com/xxxx

⚡ *SHEHBAZ-MD*`);
    }

    await reply("⏳ *Downloading TikTok video...*");

    const result = await downloadTikTok(q);
    
    if (result.success && result.url) {
        // Send video with caption
        await sock.sendMessage(from, {
            video: { url: result.url },
            caption: `✅ *Video Downloaded!*\n\n📱 *Platform:* TikTok\n📝 *Title:* ${result.title}\n⚡ *SHEHBAZ-MD*`,
            mimetype: 'video/mp4'
        }, { quoted: msg });
    } else {
        await reply(`❌ *Download Failed!*\n\n📛 *Error:* ${result.error}\n\n💡 *Try:*\n• Check if URL is correct\n• Make sure video exists\n• Try another video`);
    }
});

