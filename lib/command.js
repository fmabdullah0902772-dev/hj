/**
 * SHEHBAZ-MD v4.5.6 - Command Helper (Plugin Interface)
 * Fixed: cmd() now registers directly into commandRegistry so index.js can find commands.
 * Previously plugins used a separate local array — they were invisible to the bot.
 */

import commandRegistry from './commandRegistry.js';

/**
 * Register a plugin command.
 * Usage in plugins:
 *   import { cmd } from '../lib/command.js';
 *   cmd({ pattern: 'ping', category: 'general', desc: 'Ping bot' }, async (sock, msg, ctx) => {
 *       await ctx.reply('Pong!');
 *   });
 */
export function cmd(info, func) {
    if (!info || !info.pattern) return;
    info.execute = func;
    commandRegistry.register(info);
    return info;
}

export default { cmd };
