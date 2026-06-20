/**
 * SHEHBAZ-MD - Calculator Plugin
 */

import { cmd } from '../lib/command.js';

cmd({
    pattern: 'calc',
    alias: ['calculate', 'math', 'eval'],
    category: 'tools',
    desc: 'Evaluate math expressions',
    args: '<expression>'
}, async (sock, msg, data) => {
    const { reply, args, prefix } = data;

    if (!args.length) {
        return reply(
`🧮 *Calculator*

Usage: *${prefix}calc <expression>*

Examples:
• *${prefix}calc 5 + 3 * 2*
• *${prefix}calc (100 / 4) * 3*
• *${prefix}calc 2 ** 10*`);
    }

    const expression = args.join(' ');

    if (!/^[0-9+\-*/(). %**]+$/.test(expression)) {
        return reply('❌ Invalid expression! Only numbers and operators (+, -, *, /, %, **, parentheses) allowed.');
    }

    try {
        const result = Function('"use strict"; return (' + expression + ')')();
        if (result === undefined || result === null || !isFinite(result)) {
            return reply('❌ Invalid mathematical expression!');
        }
        await reply(
`🧮 *Calculator*

📝 *Expression:* \`${expression}\`
✅ *Result:* \`${result}\``);
    } catch {
        await reply('❌ Invalid expression! Could not evaluate.');
    }
});
