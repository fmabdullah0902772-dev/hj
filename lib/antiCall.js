/**
 * SHEHBAZ-MD v1.0.0 - Anti-Call Module
 * @author Shehbaz—Dev
 * @description Detect, reject, and block incoming WhatsApp calls
 */

import chalk from 'chalk';
import config from '../setting.js';

// Call tracking for spam prevention
const callTracker = new Map();
const BLOCK_DURATION = 300000; // 5 minutes block
const MAX_CALLS_PER_MINUTE = 3;

/**
 * Check if number is owner
 * @param {string} number - Phone number
 * @param {Array} ownerNumbers - List of owner numbers
 * @returns {boolean}
 */
function isOwner(number, ownerNumbers) {
    const cleanNumber = number.replace(/[^0-9]/g, '');
    return ownerNumbers.some(owner => owner.replace(/[^0-9]/g, '') === cleanNumber);
}

/**
 * Track call for spam detection
 * @param {string} callerId - Caller JID
 * @returns {boolean} - True if should be blocked
 */
function isSpamCall(callerId) {
    const now = Date.now();
    const calls = callTracker.get(callerId) || [];
    
    // Filter calls in last minute
    const recentCalls = calls.filter(time => now - time < 60000);
    
    if (recentCalls.length >= MAX_CALLS_PER_MINUTE) {
        return true;
    }
    
    recentCalls.push(now);
    callTracker.set(callerId, recentCalls);
    
    // Clean old entries
    setTimeout(() => {
        const current = callTracker.get(callerId) || [];
        const filtered = current.filter(time => now - time < 60000);
        if (filtered.length === 0) {
            callTracker.delete(callerId);
        } else {
            callTracker.set(callerId, filtered);
        }
    }, 60000);
    
    return false;
}

/**
 * Get warning message for caller
 * @param {boolean} isSpam - Whether caller is spamming
 * @param {string} prefix - Command prefix
 * @returns {string}
 */
function getWarningMessage(isSpam, prefix) {
    if (isSpam) {
        return `╭──❍ *📞 ANTI-CALL SYSTEM* ❍──╮
│
├❍ *Warning:* ⚠️ EXCESSIVE CALLS DETECTED
├❍ *Action:* 🚫 NUMBER BLOCKED TEMPORARILY
├❍ *Duration:* 5 minutes
│
├❍ *Reason:* Multiple calls in short time
│
╰──────────────────────────❍

> Use *${prefix}unblock* to request unblock
> Contact owner: wa.me/${config.OWNER_NUMBER}`;
    }
    
    return `╭──❍ *📞 ANTI-CALL SYSTEM* ❍──╮
│
├❍ *Warning:* 📞 Calling is NOT allowed!
├❍ *Action:* 🔴 Call Rejected
├❍ *Reason:* Bot Protection Active
│
├❍ *Allowed Actions:*
├❍ • Use text commands (${prefix}help)
├❍ • Send messages normally
├❍ • Media messages allowed
│
╰──────────────────────────❍

> _Bot can't receive calls by design_
> _Use WhatsApp normally for text chats_`;
}

/**
 * Get block message for blocked number
 * @param {number} remainingTime - Remaining block time in seconds
 * @returns {string}
 */
function getBlockMessage(remainingTime) {
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    
    return `╭──❍ *🚫 ANTI-CALL SYSTEM* ❍──╮
│
├❍ *Status:* ⛔ TEMPORARILY BLOCKED
├❍ *Remaining:* ${minutes}m ${seconds}s
├❍ *Reason:* Excessive calls detected
│
├❍ *Next Steps:*
├❍ • Wait for block to expire
├❍ • Contact owner to unblock
│
╰──────────────────────────❍

> _Do not spam calls_`;
}

/**
 * Handle incoming call
 * @param {Object} sock - Socket connection
 * @param {Object} call - Call object from Baileys
 * @param {Object} botConfig - Bot configuration
 * @returns {Promise<void>}
 */
export async function handleCall(sock, call, botConfig) {
    try {
        // Check if anti-call is enabled
        if (botConfig.ANTI_CALL !== 'true') return;
        
        const callerId = call.from;
        const callerNumber = callerId.split('@')[0];
        const ownerNumbers = botConfig.OWNER_NUMBERS || [botConfig.OWNER_NUMBER];
        const prefix = botConfig.PREFIX || '.';
        
        // Don't block owner calls
        if (isOwner(callerNumber, ownerNumbers)) {
            console.log(chalk.cyan(`📞 Owner ${callerNumber} is calling (not blocking)`));
            return;
        }
        
        // Check for spam
        const isSpam = isSpamCall(callerId);
        
        // Check if number is already blocked
        const blockedKey = `blocked_${callerNumber}`;
        const blockExpiry = callTracker.get(blockedKey);
        
        if (blockExpiry && Date.now() < blockExpiry) {
            const remainingSeconds = Math.ceil((blockExpiry - Date.now()) / 1000);
            const blockMsg = getBlockMessage(remainingSeconds);
            await sock.sendMessage(callerId, { text: blockMsg }).catch(() => {});
            console.log(chalk.red(`🚫 Blocked call from ${callerNumber} (still blocked)`));
            return;
        } else if (blockExpiry) {
            callTracker.delete(blockedKey);
        }
        
        // Block if spamming
        if (isSpam) {
            callTracker.set(blockedKey, Date.now() + BLOCK_DURATION);
            const warningMsg = getWarningMessage(true, prefix);
            await sock.sendMessage(callerId, { text: warningMsg }).catch(() => {});
            console.log(chalk.red(`🚫 Spam call from ${callerNumber}, blocking for 5 minutes`));
        }
        
        // Reject the call
        if (call.status === 'offer') {
            await sock.rejectCall(call.id, call.from);
            
            // Send warning message (only once per call burst)
            if (!isSpam) {
                const warningMsg = getWarningMessage(false, prefix);
                await sock.sendMessage(callerId, { text: warningMsg }).catch(() => {});
            }
            
            console.log(chalk.yellow(`📞 Call rejected from ${callerNumber}`));
        }
        
    } catch (error) {
        console.log(chalk.red('❌ Anti-call error:'), error.message);
    }
}

/**
 * Handle multiple calls
 * @param {Object} sock - Socket connection
 * @param {Array} calls - Array of call objects
 * @param {Object} botConfig - Bot configuration
 * @returns {Promise<void>}
 */
export async function handleCalls(sock, calls, botConfig) {
    if (!calls || calls.length === 0) return;
    if (botConfig.ANTI_CALL !== 'true') return;
    
    for (const call of calls) {
        await handleCall(sock, call, botConfig);
    }
}

/**
 * Unblock a number manually
 * @param {string} number - Phone number to unblock
 * @returns {boolean} - True if unblocked
 */
export function unblockNumber(number) {
    const cleanNumber = number.replace(/[^0-9]/g, '');
    const blockedKey = `blocked_${cleanNumber}`;
    
    if (callTracker.has(blockedKey)) {
        callTracker.delete(blockedKey);
        console.log(chalk.green(`✓ Unblocked number: ${cleanNumber}`));
        return true;
    }
    return false;
}

/**
 * Get call statistics
 * @returns {Object} Call stats
 */
export function getCallStats() {
    let blockedCount = 0;
    let callCount = 0;
    
    for (const [key, value] of callTracker.entries()) {
        if (key.startsWith('blocked_')) {
            if (Date.now() < value) blockedCount++;
        } else if (Array.isArray(value)) {
            callCount += value.length;
        }
    }
    
    return {
        totalTrackedCallers: callTracker.size,
        blockedNumbers: blockedCount,
        totalCallsTracked: callCount,
        blockDurationMinutes: BLOCK_DURATION / 60000
    };
}

/**
 * Clear all blocks
 */
export function clearBlocks() {
    for (const [key] of callTracker.entries()) {
        if (key.startsWith('blocked_')) {
            callTracker.delete(key);
        }
    }
    console.log(chalk.green('✓ All blocks cleared'));
}

export default {
    handleCall,
    handleCalls,
    unblockNumber,
    getCallStats,
    clearBlocks
};