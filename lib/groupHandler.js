/**
 * SHEHBAZ-MD v1.0.0 - Group Handler
 * @author Shehbaz—Dev
 * @description Group welcome, goodbye, and management features
 */

import chalk from 'chalk';

// Group settings storage
const groupSettings = new Map();

/**
 * Get group settings
 * @param {string} groupId - Group JID
 * @param {Object} defaultSettings - Default settings
 * @returns {Object}
 */
export function getGroupSettings(groupId, defaultSettings = {}) {
    return groupSettings.get(groupId) || { ...defaultSettings };
}

/**
 * Update group settings
 * @param {string} groupId - Group JID
 * @param {Object} newSettings - New settings to merge
 */
export function updateGroupSettings(groupId, newSettings) {
    const current = groupSettings.get(groupId) || {};
    groupSettings.set(groupId, { ...current, ...newSettings });
    return groupSettings.get(groupId);
}

/**
 * Set welcome message for group
 * @param {string} groupId - Group JID
 * @param {string} message - Welcome message
 */
export function setWelcomeMessage(groupId, message) {
    updateGroupSettings(groupId, { welcomeMsg: message });
}

/**
 * Set goodbye message for group
 * @param {string} groupId - Group JID
 * @param {string} message - Goodbye message
 */
export function setGoodbyeMessage(groupId, message) {
    updateGroupSettings(groupId, { goodbyeMsg: message });
}

/**
 * Enable/disable welcome in group
 * @param {string} groupId - Group JID
 * @param {boolean} enabled - Enable or disable
 */
export function setWelcomeEnabled(groupId, enabled) {
    updateGroupSettings(groupId, { welcome: enabled });
}

/**
 * Enable/disable goodbye in group
 * @param {string} groupId - Group JID
 * @param {boolean} enabled - Enable or disable
 */
export function setGoodbyeEnabled(groupId, enabled) {
    updateGroupSettings(groupId, { goodbye: enabled });
}

/**
 * Get all group settings
 * @returns {Map}
 */
export function getAllSettings() {
    return groupSettings;
}

/**
 * Clear settings for a group
 * @param {string} groupId - Group JID
 */
export function clearGroupSettings(groupId) {
    groupSettings.delete(groupId);
}

/**
 * Format welcome message
 * @param {string} template - Message template
 * @param {Object} data - Data to replace
 * @returns {string}
 */
export function formatWelcomeMessage(template, data) {
    const { user, groupName, memberCount, userJid } = data;
    
    return template
        .replace(/@user/g, `@${user}`)
        .replace(/@group/g, groupName)
        .replace(/@count/g, memberCount.toString())
        .replace(/@mention/g, `@${userJid || user}`);
}

/**
 * Format goodbye message
 * @param {string} template - Message template
 * @param {Object} data - Data to replace
 * @returns {string}
 */
export function formatGoodbyeMessage(template, data) {
    const { user, groupName, memberCount } = data;
    
    return template
        .replace(/@user/g, `@${user}`)
        .replace(/@group/g, groupName)
        .replace(/@count/g, memberCount.toString());
}

/**
 * Get default welcome message
 * @returns {string}
 */
export function getDefaultWelcome() {
    return `╭──❍ *👋 WELCOME* ❍──╮
│
├❍ @user
├❍ @group
├❍ Members: @count
│
╰──────────────────────────❍
    
> Welcome to the group! 🎉`;
}

/**
 * Get default goodbye message
 * @returns {string}
 */
export function getDefaultGoodbye() {
    return `╭──❍ *👋 GOODBYE* ❍──╮
│
├❍ @user
├❍ @group
│
╰──────────────────────────❍
    
> Sad to see you go! 👋`;
}

export default {
    getGroupSettings,
    updateGroupSettings,
    setWelcomeMessage,
    setGoodbyeMessage,
    setWelcomeEnabled,
    setGoodbyeEnabled,
    getAllSettings,
    clearGroupSettings,
    formatWelcomeMessage,
    formatGoodbyeMessage,
    getDefaultWelcome,
    getDefaultGoodbye
};