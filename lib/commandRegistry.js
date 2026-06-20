/**
 * SHEHBAZ-MD v4.5.6 - Command Registry
 * Fixed: get() now normalizes 'function' → 'execute' so index.js command.execute() always works,
 * whether the plugin used cmd({...}, fn) style or commandRegistry.register({execute: fn}) style.
 */

let commands = new Map();
let commandsByCategory = new Map();

export function register(cmd) {
    if (!cmd.pattern) return;

    // Normalize: support both cmd.function and cmd.execute
    if (cmd.function && !cmd.execute) {
        cmd.execute = cmd.function;
    }

    commands.set(cmd.pattern, cmd);

    if (cmd.alias && Array.isArray(cmd.alias)) {
        for (const alias of cmd.alias) {
            commands.set(alias, { ...cmd, isAlias: true, originalPattern: cmd.pattern });
        }
    }

    const category = cmd.category || 'general';
    if (!commandsByCategory.has(category)) {
        commandsByCategory.set(category, []);
    }
    commandsByCategory.get(category).push(cmd);

    return cmd;
}

export function get(name) {
    return commands.get(name) || null;
}

export function has(name) {
    return commands.has(name);
}

export function getAll() {
    return Array.from(commands.values());
}

export function getByCategory(category) {
    return commandsByCategory.get(category) || [];
}

export function getCategories() {
    return Array.from(commandsByCategory.keys());
}

export function size() {
    return commands.size;
}

export function clear() {
    commands.clear();
    commandsByCategory.clear();
}

export function registerMultiple(cmdList) {
    for (const cmd of cmdList) {
        register(cmd);
    }
}

export default {
    register,
    get,
    has,
    getAll,
    getByCategory,
    getCategories,
    size,
    clear,
    registerMultiple
};
