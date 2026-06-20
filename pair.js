import express from "express";
import fs from "fs";
import pino from "pino";
import {
    makeWASocket,
    useMultiFileAuthState,
    delay,
    Browsers,
    jidNormalizedUser,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason,
} from "@whiskeysockets/baileys";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

function rm(p) {
    try { 
        if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true }); 
    } catch(e) {}
}

const activePairings = new Map();

router.get("/", async (req, res) => {
    let num = (req.query.number || "").replace(/[^0-9]/g, "");
    if (!num || num.length < 10) {
        return res.status(400).json({ error: "Valid number required" });
    }

    if (activePairings.has(num)) {
        return res.status(429).json({ error: "Pairing already in progress. Wait 30 seconds." });
    }

    const sessionDir = join(__dirname, "temp_" + num + "_" + Date.now());
    rm(sessionDir);
    
    let pairingCodeSent = false;
    let sessionGenerated = false;
    let responseSent = false;
    let retryCount = 0;
    const maxRetries = 2;
    
    activePairings.set(num, true);
    
    const cleanupTimer = setTimeout(() => {
        if (!sessionGenerated) {
            console.log(`⏰ Pairing timeout for +${num}`);
            activePairings.delete(num);
            rm(sessionDir);
            if (!responseSent) {
                responseSent = true;
                if (!res.headersSent) {
                    res.status(408).json({ error: "Pairing timeout. Try again." });
                }
            }
        }
    }, 60000);

    const start = async () => {
        try {
            const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
            const { version } = await fetchLatestBaileysVersion();
            const logger = pino({ level: "fatal" }); 

            const sock = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, logger), 
                },
                logger: logger,
                browser: Browsers.windows("Chrome"),
                printQRInTerminal: false,
                markOnlineOnConnect: true,
                syncFullHistory: false,
                downloadHistoryCategories: [],
                maxChatSyncMessages: 0,
                connectTimeoutMs: 30000,
                defaultQueryTimeoutMs: 30000,
                keepAliveIntervalMs: 15000,
                generateHighQualityLinkPreview: false,
                waitForAppStateSync: false,
                // 🛠️ CRITICAL FIX: patchMessageBeforeSending ko completely remove kar diya hai taake internal crash na ho
            });

            sock.ev.on("messaging-history.set", () => {});

            sock.ev.on("creds.update", async () => {
                console.log(`💾 Creds saved for +${num}`);
                await saveCreds();
            });

            sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
                console.log(`[${num}] State: ${connection}`);
                
                if (connection === "open" && !sessionGenerated) {
                    sessionGenerated = true;
                    clearTimeout(cleanupTimer);
                    activePairings.delete(num);
                    
                    console.log(`✅ Connected! Processing token bytes for +${num}`);
                    
                    try {
                        // 4 seconds buffer stability delay
                        await delay(4000); 
                        
                        const credsPath = join(sessionDir, 'creds.json');
                        if (!fs.existsSync(credsPath)) {
                            throw new Error("creds.json not found");
                        }
                        
                        const credsData = fs.readFileSync(credsPath, 'utf-8');
                        const base64Creds = Buffer.from(credsData).toString('base64');
                        const sessionId = `ABDULLAH-MD!${base64Creds}`;
                        
                        // JID normalized routing check
                        const targetJid = jidNormalizedUser(num + "@s.whatsapp.net");
                        
                        console.log(`📤 Dispatched session string packet to target inbox.`);

                        // 📋 Send main session token
                        await sock.sendMessage(targetJid, { 
                            text: `${sessionId}`
                        });
                        
                        await delay(2000);
                        
                        // 🎉 Send success template
                        await sock.sendMessage(targetJid, { 
                            text: `✅ *SUCCESSFULLY CONNECTED!*\n\n*ABDULLAH-MD* automation core structure is fully operational.\n\nGo back to your hosting dashboard, paste the session token ID, and boot the main terminal script.`
                        });
                        
                        await delay(3000);
                        
                        // Clean socket streams switch-off without wipe-out
                        sock.end();
                        rm(sessionDir);
                        
                        console.log(`🎉 Complete clean execution cycle for +${num}`);
                        
                    } catch (err) {
                        console.error(`❌ Error delivering session via chat buffer:`, err);
                        rm(sessionDir);
                        sock.end();
                    }
                }
                
                if (connection === "close") {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    const errorMsg = lastDisconnect?.error?.message || "";
                    
                    console.log(`[${num}] Closed, code: ${statusCode}, msg: ${errorMsg.substring(0, 50)}`);
                    
                    if (statusCode === DisconnectReason.loggedOut) {
                        console.log(`Session logged out for +${num}`);
                        activePairings.delete(num);
                        rm(sessionDir);
                    } else if (statusCode === 401 || statusCode === 403) {
                        console.log(`Auth failed for +${num}`);
                        activePairings.delete(num);
                        rm(sessionDir);
                    } else if (!sessionGenerated && retryCount < maxRetries) {
                        retryCount++;
                        console.log(`Retry ${retryCount}/${maxRetries} for +${num}`);
                        await delay(5000);
                        start();
                    } else {
                        activePairings.delete(num);
                        rm(sessionDir);
                    }
                }
            });

            if (!state.creds.registered && !pairingCodeSent) {
                pairingCodeSent = true;
                await delay(2000);
                
                try {
                    console.log(`📱 Requesting pairing code matrix for +${num}`);
                    let code = await sock.requestPairingCode(num);
                    code = code?.match(/.{1,4}/g)?.join("-") || code;
                    
                    if (!responseSent && !res.headersSent) {
                        responseSent = true;
                        res.json({ 
                            success: true, 
                            code: code,
                            message: "Enter this code in WhatsApp Linked Devices" 
                        });
                    }
                    console.log(`🔑 Generated Code for +${num}: ${code}`);
                    
                } catch(err) {
                    console.error(`Pairing error for +${num}:`, err.message);
                    if (!responseSent && !res.headersSent) {
                        responseSent = true;
                        res.status(503).json({ 
                            success: false, 
                            error: err.message || "Failed to get pairing code" 
                        });
                    }
                    activePairings.delete(num);
                    rm(sessionDir);
                }
            }
        } catch (err) {
            console.error(`Start error:`, err.message);
            activePairings.delete(num);
            rm(sessionDir);
            if (!responseSent && !res.headersSent) {
                responseSent = true;
                res.status(500).json({ error: err.message });
            }
        }
    };

    start();
});

setInterval(() => {
    const tempDir = __dirname;
    const files = fs.readdirSync(tempDir);
    for (const file of files) {
        if (file.startsWith("temp_") && fs.statSync(join(tempDir, file)).mtimeMs < Date.now() - 120000) {
            rm(join(tempDir, file));
        }
    }
}, 120000);

process.on("uncaughtException", (err) => {
    if (err.message?.includes("conflict") || err.message?.includes("Stream Errored")) return;
    console.error("Uncaught:", err.message);
});

export default router;
