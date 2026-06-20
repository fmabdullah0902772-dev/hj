/**
 * SHEHBAZ-MD v4.5.6 - Session Manager (MongoDB-backed)
 * Fixed: Uses MongoDB instead of local filesystem so registry survives restarts.
 */

import mongoose from 'mongoose';
import chalk from 'chalk';

const registrySchema = new mongoose.Schema({
    number: { type: String, required: true, unique: true, index: true },
    status: { type: String, default: 'pending' },
    name: { type: String, default: '' },
    createdAt: { type: Number, default: () => Date.now() },
    lastSeen: { type: Number, default: () => Date.now() }
}, { collection: 'session_registry' });

const RegistryModel =
    mongoose.models.SessionRegistry ||
    mongoose.model('SessionRegistry', registrySchema);

let sessions = new Map();

export async function load() {
    try {
        const docs = await RegistryModel.find({}).lean();
        sessions = new Map(docs.map(d => [d.number, d]));
        console.log(chalk.green(`✓ Loaded ${sessions.size} sessions from registry`));
    } catch (e) {
        console.log(chalk.yellow('⚠️ Failed to load session registry:', e.message));
    }
    return sessions;
}

export async function register(number, status = 'pending') {
    try {
        const existing = sessions.get(number);
        const doc = await RegistryModel.findOneAndUpdate(
            { number },
            {
                $set: { status, lastSeen: Date.now() },
                $setOnInsert: { createdAt: Date.now(), name: existing?.name || '' }
            },
            { upsert: true, new: true }
        ).lean();
        sessions.set(number, doc);
        console.log(chalk.green(`✓ Session registered: +${number} (${status})`));
    } catch (e) {
        sessions.set(number, {
            number, status,
            lastSeen: Date.now(),
            createdAt: Date.now(),
            name: ''
        });
        console.log(chalk.yellow(`⚠️ Session in-memory only: +${number} (${e.message})`));
    }
}

export async function updateStatus(number, status) {
    try {
        if (sessions.has(number)) {
            await RegistryModel.findOneAndUpdate(
                { number },
                { $set: { status, lastSeen: Date.now() } }
            );
            const sess = sessions.get(number);
            sess.status = status;
            sess.lastSeen = Date.now();
            sessions.set(number, sess);
        }
    } catch (e) {
        console.log(chalk.yellow('⚠️ Failed to update session status:', e.message));
    }
}

export function getAll() {
    return Array.from(sessions.values());
}

export function get(number) {
    return sessions.get(number) || null;
}

export async function remove(number) {
    try {
        await RegistryModel.deleteOne({ number });
        sessions.delete(number);
        console.log(chalk.yellow(`🗑️ Session removed: +${number}`));
    } catch (e) {
        sessions.delete(number);
    }
}

export function has(number) {
    return sessions.has(number);
}

export const initSessionManager = load;
export const registerSession = register;
export const updateSessionStatus = updateStatus;
export const getAllSessions = getAll;
export const getSession = get;
export const removeSession = remove;
export const hasSession = has;

export default {
    load, register, updateStatus, getAll, get, remove, has,
    initSessionManager: load,
    registerSession: register,
    updateSessionStatus: updateStatus,
    getAllSessions: getAll,
    getSession: get,
    removeSession: remove,
    hasSession: has
};
