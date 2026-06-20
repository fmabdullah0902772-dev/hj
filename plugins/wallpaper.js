import { cmd } from '../lib/command.js';
import axios from 'axios';

cmd({
    pattern: "wallpaper",
    alias: ["wp", "wall", "hdwall"],
    desc: "Find HD wallpapers",
    category: "tools",
    react: "🖼️",
    use: ".wallpaper <query> <count>"
},
async (sock, msg, ctx) => {
    try {
        const { from, reply, args, q } = ctx;
        
        if (!q) {
            return reply(`╭━━━━━━━━━━━━━━━━━━━━╮
┃   🖼️ *WALLPAPER*   
╰━━━━━━━━━━━━━━━━━━━━╯

◈━━━━━━━━━━━━━━━━━━◈
📌 *Usage:* 
   .wallpaper <query> <count>

📝 *Examples:* 
   .wallpaper car 1
   .wallpaper nature 5
   .wallpaper anime 10

⚡ *SHEHBAZ-MD*`);
        }

        // Parse query and count
        let query = q;
        let count = 1;
        
        const words = q.trim().split(' ');
        const lastWord = words[words.length - 1];
        if (!isNaN(lastWord) && parseInt(lastWord) > 0) {
            count = parseInt(lastWord);
            query = words.slice(0, -1).join(' ');
        }
        
        if (count > 20) count = 20;
        if (count < 1) count = 1;

        await reply(`⏳ *Searching ${count} wallpaper(s) for "${query}"...*`);

        const response = await axios.get(`https://apisaqib.vercel.app/api/v1/1089?q=${encodeURIComponent(query)}`, {
            timeout: 15000
        });

        if (response.data && response.data.status === true && response.data.data && response.data.data.length > 0) {
            const wallpapers = response.data.data;
            const totalFound = wallpapers.length;
            const toSend = wallpapers.slice(0, count);
            
            for (let i = 0; i < toSend.length; i++) {
                await sock.sendMessage(from, {
                    image: { url: toSend[i] }
                }, { quoted: msg });
                await new Promise(r => setTimeout(r, 800));
            }
            
            await reply(`✅ *Sent ${toSend.length} wallpaper(s)*\n🔍 Query: ${query}\n📦 Total found: ${totalFound}\n⚡ SHEHBAZ-MD`);
            
        } else {
            reply(`❌ *No wallpapers found for "${query}"*\n\nTry different keyword.`);
        }

    } catch (error) {
        console.error("Wallpaper error:", error);
        reply(`❌ *Error:* ${error.message}`);
    }
});