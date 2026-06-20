/**
 * SHEHBAZ-MD - Broadcast Plugin
 * Send a message to all groups the bot is in (owner only)
 */

import { cmd } from '../lib/command.js';

cmd({
    pattern: 'broadcast',
    alias: ['bc', 'announce'],
    category: 'owner',
    desc: 'Broadcast message to all groups (owner only)',
    args: '<message>'
}, async (sock, msg, data) => {
    const { from, reply, isOwner, args, prefix } = data;

    if (!isOwner) return reply(`❌ Only owner can use *${prefix}broadcast*!`);
    if (!args.length) return reply(`Usage: *${prefix}broadcast <your message>*\n\nExample:\n*${prefix}broadcast Hello everyone! Bot is updated.* `);

    const message = args.join(' ');
    const broadcastText = `📢 *BROADCAST MESSAGE*\n\n${message}\n\n> ⚡ _Message from bot owner_`;

    await reply('📡 Sending broadcast...');

    let success = 0, failed = 0;

    try {
        const chats = await sock.groupFetchAllParticipating();
        const groups = Object.values(chats);

        for (const group of groups) {
            try {
                await sock.sendMessage(group.id, { text: broadcastText });
                success++;
                await new Promise(r => setTimeout(r, 500));
            } catch { failed++; }
        }

        await reply(
`✅ *Broadcast Complete!*

📤 Sent to: *${success}* groups
❌ Failed: *${failed}* groups
📊 Total: *${groups.length}* groups`);
    } catch (err) {
        await reply(`❌ Error: ${err.message}`);
    }
});
