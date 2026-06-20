/**
 * SHEHBAZ-MD v4.5.6 - Fixed MongoDB Auth State
 * Fixes:
 *  1. saveCreds now receives updated creds from Baileys (not stale closure)
 *  2. clearSession added (was called in index.js but missing here)
 *  3. app-state-sync-key proto imported at top level (not per-call)
 */

import { BufferJSON, initAuthCreds, proto } from "@whiskeysockets/baileys";
import mongoose from "mongoose";
import chalk from "chalk";

const authSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true, index: true },
    data: { type: String, required: true }
}, {
    collection: 'sessions',
    timestamps: true
});

const AuthModel = mongoose.models.AuthMap || mongoose.model("AuthMap", authSchema);

export async function useMongoDBAuthState(sessionId) {

    const readData = async (key) => {
        try {
            const documentKey = `${sessionId}_${key}`;
            const record = await AuthModel.findOne({ id: documentKey }).lean();
            if (!record) return null;
            return JSON.parse(record.data, BufferJSON.reviver);
        } catch (error) {
            console.error(chalk.red(`❌ [MONGO READ ERR] Key (${key}):`), error.message);
            return null;
        }
    };

    const writeData = async (key, value) => {
        try {
            const documentKey = `${sessionId}_${key}`;
            if (value == null) {
                await AuthModel.deleteOne({ id: documentKey });
                return;
            }
            const serialized = JSON.stringify(value, BufferJSON.replacer);
            await AuthModel.findOneAndUpdate(
                { id: documentKey },
                { $set: { data: serialized } },
                { upsert: true, new: true }
            );
        } catch (error) {
            console.error(chalk.red(`❌ [MONGO WRITE ERR] Key (${key}):`), error.message);
        }
    };

    const clearSession = async () => {
        try {
            await AuthModel.deleteMany({ id: { $regex: `^${sessionId}_` } });
            console.log(chalk.yellow(`🗑️ Session cleared: ${sessionId}`));
        } catch (error) {
            console.error(chalk.red(`❌ [MONGO CLEAR ERR]:`), error.message);
        }
    };

    // Load or initialize creds
    let creds = await readData("creds");
    if (!creds) {
        creds = initAuthCreds();
        await writeData("creds", creds);
    }

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const result = {};
                    await Promise.all(
                        ids.map(async (id) => {
                            let value = await readData(`${type}-${id}`);
                            if (value) {
                                if (type === "app-state-sync-key") {
                                    value = proto.Message.AppStateSyncKeyData.fromObject(value);
                                }
                                result[id] = value;
                            }
                        })
                    );
                    return result;
                },
                set: async (data) => {
                    const writes = [];
                    for (const category of Object.keys(data)) {
                        for (const id of Object.keys(data[category])) {
                            writes.push(writeData(`${category}-${id}`, data[category][id]));
                        }
                    }
                    await Promise.all(writes);
                }
            }
        },

        // FIX 1: saveCreds — sock.ev.on('creds.update') se updated creds milte hain
        // index.js mein: sock.ev.on('creds.update', saveCreds)
        // Baileys saveCreds ko updated creds pass NAHI karta — wo state.creds ko mutate karta hai
        // Isliye hum state.creds reference use karte hain (same object)
        saveCreds: async () => {
            await writeData("creds", creds);
        },

        // FIX 2: clearSession — index.js mein loggedOut par call hota hai
        clearSession
    };
}
