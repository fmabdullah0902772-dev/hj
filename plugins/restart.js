/**
 * SHEHBAZ-MD - Restart Plugin
 * Restart bot process (owner only)
 */

import { cmd } from '../lib/command.js';
import { spawn } from 'child_process';

cmd({
    pattern: 'restart',
    alias: ['reboot', 'reload'],
    category: 'owner',
    desc: 'Restart the bot (owner only)'
}, async (sock, msg, data) => {
    const { reply, isOwner, prefix } = data;
    if (!isOwner) return reply(`❌ Only owner can use *${prefix}restart*!`);

    await reply('🔁 *Restarting bot...*\n\n⏳ Please wait a moment...');

    setTimeout(() => {
        const child = spawn(process.argv[0], process.argv.slice(1), {
            cwd: process.cwd(),
            detached: true,
            stdio: 'ignore',
            env: process.env
        });
        child.unref();
        process.exit(0);
    }, 1500);
});
