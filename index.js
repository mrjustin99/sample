/*
 CODE BY KEITH TECH
 */
require('./settings')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const os = require('os')
const chalk = require('chalk')
const FileType = require('file-type')
const path = require('path')
const axios = require('axios')
const { getPrefixes, setPrefixes, addPrefix, removePrefix } = require('./lib/prefixManager')
const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main');
const PhoneNumber = require('awesome-phonenumber')
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./lib/exif')
const { File } = require('megajs')
const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetch, await, sleep, reSize } = require('./lib/myfunc')
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    generateForwardMessageContent,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    generateMessageID,
    downloadContentFromMessage,
    jidDecode,
    proto,
    jidNormalizedUser,
    makeCacheableSignalKeyStore,
    delay
} = require("@whiskeysockets/baileys")
const NodeCache = require("node-cache")
const pino = require("pino")
const readline = require("readline")
const { parsePhoneNumber } = require("libphonenumber-js")
const { PHONENUMBER_MCC } = require('@whiskeysockets/baileys/lib/Utils/generics')
const { rmSync, existsSync } = require('fs')
const { join } = require('path')

// Import lightweight store
const store = require('./lib/lightweight_store')

// Initialize store
store.readFromFile()
const settings = require('./settings')
setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000)

// Memory optimization - Force garbage collection if available
setInterval(() => {
    if (global.gc) {
        global.gc()
    }
}, 60_000) // every 1 minute

// Memory monitoring - Restart if RAM gets too high
setInterval(() => {
    const used = process.memoryUsage().rss / 1024 / 1024
    if (used > 400) {
        console.log(chalk.yellow('⚠️  RAM too high [ 400MB ], restarting bot...'))
        process.exit(1) // Panel will auto-restart
    }
}, 30_000) // check every 30 seconds

let phoneNumber = `${settings.ownerNumber || ''}`.replace(/[^0-9]/g, '');
const _ownRaw = fs.existsSync('./data/owner.json') ? fs.readFileSync('./data/owner.json', 'utf8').trim() : '';
let owner = _ownRaw ? JSON.parse(_ownRaw) : [];

global.botname = "Moon-X"
const CUSTOM_CODE = "MRKEITHX"
const prefix = `${settings.Prefix}`
global.themeemoji = ""
const pairingCode = !!phoneNumber || process.argv.includes("--pairing-code")
const useMobile = process.argv.includes("--mobile")

// Session directory setup
const sessionDir = path.join(__dirname, 'session');
const credsPath = path.join(sessionDir, 'creds.json');

// Only create readline interface if we're in an interactive environment
const rl = process.stdin.isTTY ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null
const question = (text) => {
    if (rl) {
        return new Promise((resolve) => rl.question(text, resolve))
    } else {
        return Promise.resolve(settings.ownerNumber || phoneNumber)
    }
}

// SESSION ID FUNCTIONS

async function downloadSessionData() {
    try {
        await fs.promises.mkdir(sessionDir, { recursive: true });

        if (!fs.existsSync(credsPath)) {
            if (!settings.SESSION_ID) {
                console.log(`${chalk.hex('#218895')('[ MOON-X ]')} ${chalk.red('⚠️ Session ID not found in .env!')}`);
                console.log(`${chalk.hex('#218895')('[ MOON-X ]')} ${chalk.red('⚠️ creds.json not found in session folder!')}`);
                console.log(`${chalk.hex('#218895')('[ MOON-X ]')} ${chalk.red('Will use pairing code instead...')}`);
                return false;
            }

            // Check if it's a KnightBot! format session
            if (settings.SESSION_ID.startsWith('KeithTech')) {
                try {
                    console.log(`${chalk.cyan('[ MOON-X ]')} ${chalk.yellow('🔰 Processing MoonX session...')}`);
                    
                    const [header, b64data] = settings.SESSION_ID.split('~');

                    if (header !== 'KeithTech' || !b64data) {
                        throw new Error("❌ Invalid session format. Expected 'KeithTech!.....'");
                    }

                    const cleanB64 = b64data.replace('...', '');
                    const compressedData = Buffer.from(cleanB64, 'base64');
                    const decompressedData = require('zlib').gunzipSync(compressedData);

                    // Write decompressed session data to creds.json
                    fs.writeFileSync(credsPath, decompressedData, 'utf8');
                    console.log(`${chalk.hex('#218895')('[ MOON-X ]')} ${chalk.green('✅ Session retrieved from Moon-X Session!')}`);
                    return true;

                } catch (e) {
                    console.log(`${chalk.hex('#218895')('[ MOON-X ]')} ${chalk.red('❌ Error processing Moon-X session:')} ${e.message}`);
                    console.log(`${chalk.hex('#218895')('[ MOON-X ]')} ${chalk.yellow('⚠️ Invalid session format or corrupted data')}`);
                    return false;
                }
            } else {
                console.log(`${chalk.hex('#218895')('[ MOON-X ]')} ${chalk.red('❌ Invalid session format!')}`);
                console.log(`${chalk.hex('#218895')('[ MOON-X ]')} ${chalk.yellow('⚠️ Session ID must start with "KeithTech!"')}`);
                return false;
            }
        } else {
            console.log(`${chalk.hex('#218895')('[ MOON-X ]')} ${chalk.green('✅ Using existing creds.json')}`);
            return true;
        } 
    } catch (error) {
        console.error(`${chalk.hex('#218895')('[ MOON-X ]')} ${chalk.red('❌ Error processing session data:')} ${error.message}`);
        return false;
    }
}

async function startKeithTech() {
    try {
        console.log(chalk.green('Connecting to MOON-X...'));
        console.log('');

        // Try to download session data first
        const sessionDownloaded = await downloadSessionData();

        let { version, isLatest } = await fetchLatestBaileysVersion()
        const { state, saveCreds } = await useMultiFileAuthState(`./session`)
        const msgRetryCounterCache = new NodeCache()

        const KeithTech = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: !pairingCode,
            browser: ["Ubuntu", "Chrome", "20.0.04"],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
            },
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            retryRequestDelayMs: 10000,
            transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 3000 },
            maxMsgRetryCount: 15,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 30000,
            emitOwnEvents: true,
            fireInitQueries: true,
            generateHighQualityLinkPreview: true,
            syncFullHistory: true,
            markOnlineOnConnect: true,
            getMessage: async (key) => {
                let jid = jidNormalizedUser(key.remoteJid)
                let msg = await store.loadMessage(jid, key.id)
                return msg?.message || ""
            },
            msgRetryCounterCache,
            defaultQueryTimeoutMs: 60000,
        })

        // Save credentials when they update
        KeithTech.ev.on('creds.update', saveCreds)

        store.bind(KeithTech.ev)

        // ── ANTIEDIT: listen for message edits (messages.update) ──────────
        KeithTech.ev.on('messages.update', async (updates) => {
            try {
                const { isAntieditEnabled, getAntieditMode, getOriginalMessage } = require('./lib/antiedit');
                if (!isAntieditEnabled()) return;
                for (const update of updates) {
                    try {
                        if (!update.update?.message) continue;
                        const chatId = update.key.remoteJid;
                        const messageId = update.key.id;
                        const sender = update.key.participant || update.key.remoteJid;

                        // Extract edited text
                        let editedContent = '';
                        const editedMsg = update.update.message;
                        if (editedMsg?.protocolMessage?.editedMessage?.conversation) {
                            editedContent = editedMsg.protocolMessage.editedMessage.conversation;
                        } else if (editedMsg?.protocolMessage?.editedMessage?.extendedTextMessage?.text) {
                            editedContent = editedMsg.protocolMessage.editedMessage.extendedTextMessage.text;
                        } else if (editedMsg?.editedMessage?.message?.conversation) {
                            editedContent = editedMsg.editedMessage.message.conversation;
                        } else if (editedMsg?.editedMessage?.message?.extendedTextMessage?.text) {
                            editedContent = editedMsg.editedMessage.message.extendedTextMessage.text;
                        }
                        if (!editedContent) continue;

                        const originalMsg = getOriginalMessage(chatId, messageId);
                        if (!originalMsg) continue;
                        if (editedContent === originalMsg.content) continue;

                        const mode = getAntieditMode();
                        const isGroup = chatId.endsWith('@g.us');

                        const alertText = `
⚠️ *ANTI-EDIT!*
                        
👤 *Sender:* @${sender.split('@')[0]}
                        ${isGroup ? `📍 *
                       
Chat:* ${chatId.split('@')[0]}\n` : ''}📝 *

Original:*
${originalMsg.content}

✏️ *Edited To:*
${editedContent}

⏰ *Time:* ${new Date().toLocaleString()}

> ᴘᴏᴡᴇʀᴇᴅ ʙʏ Mᴏᴏɴ X`;

                        if (mode === 'private') {
                            const ownerJid = settings.ownerNumber + '@s.whatsapp.net';
                            await KeithTech.sendMessage(ownerJid, { text: alertText, mentions: [sender] }).catch(() => {});
                        } else {
                            await KeithTech.sendMessage(chatId, { text: alertText, mentions: [sender], }).catch(() => {});
                        }
                    } catch (innerErr) { console.error('Antiedit inner error:', innerErr.message); }
                }
            } catch (e) { console.error('Antiedit messages.update error:', e.message); }
        });

        // Message handling
        KeithTech.ev.on('messages.upsert', async chatUpdate => {
            try {
                const mek = chatUpdate.messages[0]
                if (!mek.message) return
                mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
                if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                    await handleStatus(KeithTech, chatUpdate);
                    return;
                }
                if (!KeithTech.public && !mek.key.fromMe && chatUpdate.type === 'notify') {
                    const isGroup = mek.key?.remoteJid?.endsWith('@g.us')
                    if (!isGroup) return
                }
                if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return

                if (KeithTech?.msgRetryCounterCache) {
                    KeithTech.msgRetryCounterCache.clear()
                }

                try {
                    await handleMessages(KeithTech, chatUpdate, true)
                } catch (err) {
                    console.error("❌ Error in handleMessages:", err)
                    if (mek.key && mek.key.remoteJid) {
                        await KeithTech.sendMessage(mek.key.remoteJid, {
                            text: '❌ An error occurred while processing your message.',
                            contextInfo: {
                                forwardingScore: 1,
                                isForwarded: true,
                                forwardedNewsletterMessageInfo: {
                                    newsletterJid: '120363417440480101@newsletter',
                                    newsletterName: 'Moon-X',
                                    serverMessageId: -1
                                }
                            }
                        }).catch(console.error);
                    }
                }
            } catch (err) {
                console.error("❌ Error in messages.upsert:", err)
            }
        })

        KeithTech.decodeJid = (jid) => {
            if (!jid) return jid
            if (/:\d+@/gi.test(jid)) {
                let decode = jidDecode(jid) || {}
                return decode.user && decode.server && decode.user + '@' + decode.server || jid
            } else return jid
        }

        KeithTech.ev.on('contacts.update', update => {
            for (let contact of update) {
                let id = KeithTech.decodeJid(contact.id)
                if (store && store.contacts) store.contacts[id] = { id, name: contact.notify }
            }
        })

        KeithTech.getName = (jid, withoutContact = false) => {
            id = KeithTech.decodeJid(jid)
            withoutContact = KeithTech.withoutContact || withoutContact
            let v
            if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
                v = store.contacts[id] || {}
                if (!(v.name || v.subject)) v = KeithTech.groupMetadata(id) || {}
                resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'))
            })
            else v = id === '0@s.whatsapp.net' ? {
                id,
                name: 'WhatsApp'
            } : id === KeithTech.decodeJid(KeithTech.user.id) ?
                KeithTech.user :
                (store.contacts[id] || {})
            return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
        }

        KeithTech.public = true
        KeithTech.serializeM = (m) => smsg(KeithTech, m, store)

        // Handle pairing code - only if no session exists
        if (pairingCode && !KeithTech.authState.creds.registered) {
            if (useMobile) throw new Error('[ Moon-X ] Cannot use pairing code')

            let phoneNumber
            if (!!global.phoneNumber) {
                phoneNumber = global.phoneNumber
            } else if (settings.ownerNumber && settings.ownerNumber.toString().replace(/[^0-9]/g,'').length >= 7) {
                phoneNumber = settings.ownerNumber.toString().replace(/[^0-9]/g, '');
                console.log(chalk.green(`Using owner number: ${phoneNumber}`));
            } else {
                console.log(chalk.red('No OWNER_NUMBER set in .env! Please enter your number to get pair code.'));
                phoneNumber = await question(chalk.bgBlack(chalk.greenBright(`Enter WhatsApp number (e.g. 2637xxxxxxx): `)))
            }

            phoneNumber = phoneNumber.replace(/[^0-9]/g, '')

            const pn = require('awesome-phonenumber');
            if (!pn('+' + phoneNumber).isValid()) {
                console.log(chalk.red('[ Moon-X ] ❌ Invalid phone number format!'));
                process.exit(1);
            }

            setTimeout(async () => {
                try {
                    let code = await KeithTech.requestPairingCode(phoneNumber,CUSTOM_CODE)
                    code = code?.match(/.{1,4}/g)?.join("-") || code
                    
                    console.log('');
                    console.log(chalk.cyan('╔════════════════════════╗'));
                    console.log(chalk.green('║'));
                    console.log(chalk.green('║           PAIRING CODE SYSTEM'));
                    console.log(chalk.green('║'));
                    console.log(chalk.green('╚═══════════════════════╝'));
                    console.log('');
                    console.log(chalk.greenBright('  Your Pairing Code: ') + chalk.white.bold(code));
                    console.log('');
                    console.log(chalk.yellow('   Enter this code in WhatsApp:'));
                    console.log(chalk.yellow('     1. Open WhatsApp'));
                    console.log(chalk.yellow('     2. Settings > Linked Devices'));
                    console.log(chalk.yellow('     3. Link a Device'));
                    console.log(chalk.yellow('     4. Enter the code above'));
                    console.log('');
                } catch (error) {
                    console.error(chalk.red('❌ Error requesting pairing code:'), error.message)
                }
            }, 3000)
        }

        // Connection handling with better reconnection logic
        KeithTech.ev.on('connection.update', async (s) => {
            const { connection, lastDisconnect, qr } = s
            
            if (connection === 'close') {
                const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
                
                if (reason === DisconnectReason.badSession) {
  console.log(`${chalk.hex('#218895')('[ MOON-X ]')} ${chalk.red('❌ Bad Session File, Please Delete Session and Scan Again')}`);
  process.exit(0);
} else if (reason === DisconnectReason.connectionClosed) {
  console.log(`${chalk.hex('#218895')('[ MOON-X ]')} ${chalk.yellow('⚠️ Connection closed, reconnecting...')}`);
  await delay(3000);
  startKeithTech();
} else if (reason === DisconnectReason.connectionLost) {
  console.log(`${chalk.hex('#218895')('[ MOON-X ]')} ${chalk.yellow('⚠️ Connection Lost from Server, reconnecting...')}`);
  await delay(3000);
  startKeithTech();
} else if (reason === DisconnectReason.connectionReplaced) {
  console.log(`${chalk.hex('#218895')('[ MOON-X ]')} ${chalk.red('❌ Connection Replaced, Another New Session Opened')}`);
  process.exit(1);
} else if (reason === DisconnectReason.loggedOut) {
  console.log(`${chalk.hex('#218895')('[ MOON-X ]')} ${chalk.red('❌ Device Logged Out, Please Delete Session and Scan Again.')}`);
  try { rmSync('./session', { recursive: true, force: true }); } catch {}
  process.exit(1);
} else if (reason === DisconnectReason.restartRequired) {
  console.log(`${chalk.hex('#218895')('[ MOON-X ]')} ${chalk.yellow('⚠️ Restart Required, Restarting...')}`);
  await delay(2000);
  startKeithTech();
} else if (reason === DisconnectReason.timedOut) {
  console.log(`${chalk.hex('#218895')('[ MOON-X ]')} ${chalk.yellow('⚠️ Connection TimedOut, Reconnecting...')}`);
  await delay(3000);
  startKeithTech();
} else {
  console.log(`${chalk.hex('#218895')('[ MOON-X ]')} ${chalk.red(`❌ Unknown DisconnectReason: ${reason}|${connection}`)}`);
  await delay(3000);
  startKeithTech();
}
} else if (connection === 'open') {
  console.log('');
  console.log(`${chalk.hex('#218895')('[ MOON-X ]')} ${chalk.green('✅ Connected Successfully!')}`);
  
                console.log('');
                console.log(chalk.cyan(''));
                console.log(chalk.cyan(''));
                console.log(chalk.cyan(''));
                console.log('');
                console.log(chalk.yellow(`
=============================>
>> Owner: ${KeithTech.user.id.split(':')[0]}
=============================>
>> Date: ${new Date().toLocaleDateString()}
=============================>
>> Time: ${new Date().toLocaleTimeString()}
=============================>
>> Version: ${settings.version}
=============================>`));
                console.log('');

                try {
                    const botNumber = KeithTech.user.id.split(':')[0] + '@s.whatsapp.net';
                    
                      
 await KeithTech.sendMessage(botNumber, {
                        text: `
✅ MOON-X Connected Successfully!

_Bot loaded with cool features_

🤖 *Bot:* ${settings.botName}
👑 *Owner:* ${KeithTech.user.id.split(':')[0]}
👨‍💻 *Platform:* ${getPlatform()}
🔧 *Mode:* ${settings.commandMode}
🛠 *Prefix:* [ ${prefix} ] 
⏰ *Time:* ${new Date().toLocaleTimeString()}

> © ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴋᴇɪᴛʜ`,
                        contextInfo: {
                            forwardingScore: 1,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: '120363417440480101@newsletter',
                                newsletterName: 'Moon-X',
                                serverMessageId: -1
                            }
                        }
                    });
                } catch (error) {
                    console.error(chalk.red('[ Moon-X ] Error sending connection message:'), error.message)
                }
                
                // Start autobio and presence manager after connection
                if (global.startAutoBio) global.startAutoBio(KeithTech);
                if (global.startPresenceManager) global.startPresenceManager(KeithTech);
                // Also start from command module if autobio is on
                try {
                    delete require.cache[require.resolve('./settings')];
                    const _s = require('./settings');
                    if ((_s.autoBio || 'off').toLowerCase() === 'on') {
                        const autobioMod = require('./commands/autobio');
                        if (autobioMod.startAutoBio) autobioMod.startAutoBio(KeithTech);
                    }
                } catch (_) {}
            }
        })

        // Track recently-notified callers to avoid spamming messages
        const antiCallNotified = new Set();

        KeithTech.ev.on('call', async (calls) => {
            try {
                const { readState: readAnticallState } = require('./commands/anticall');
                const state = readAnticallState();
                if (!state.enabled) return;
                for (const call of calls) {
                    const callerJid = call.from || call.peerJid || call.chatId;
                    if (!callerJid) continue;
                    try {
                        try {
                            if (typeof KeithTech.rejectCall === 'function' && call.id) {
                                await KeithTech.rejectCall(call.id, callerJid);
                            } else if (typeof KeithTech.sendCallOfferAck === 'function' && call.id) {
                                await KeithTech.sendCallOfferAck(call.id, callerJid, 'reject');
                            }
                        } catch {}

                        if (!antiCallNotified.has(callerJid)) {
                            antiCallNotified.add(callerJid);
                            setTimeout(() => antiCallNotified.delete(callerJid), 60000);
                            await KeithTech.sendMessage(callerJid, { text: '📵 *Call rejected! , calls not allowed!*' });
                        }
                    } catch {}
                    setTimeout(async () => {
                        try { await KeithTech.updateBlockStatus(callerJid, 'block'); } catch {}
                    }, 800);
                }
            } catch (e) {}
        });

        KeithTech.ev.on('group-participants.update', async (update) => {
            await handleGroupParticipantUpdate(KeithTech, update);
        });

        KeithTech.ev.on('messages.upsert', async (m) => {
            if (m.messages[0].key && m.messages[0].key.remoteJid === 'status@broadcast') {
                await handleStatus(KeithTech, m);
            }
        });

        KeithTech.ev.on('status.update', async (status) => {
            await handleStatus(KeithTech, status);
        });

        KeithTech.ev.on('messages.reaction', async (status) => {
            await handleStatus(KeithTech, status);
        });

        return KeithTech
    } catch (error) {
        console.error(chalk.red('❌ Error:'), error.message)
        await delay(5000)
        startKeithTech()
    }
}

// Start the bot with error handling
startKeithTech().catch(error => {
    console.error(chalk.red('❌ Fatal error:'), error)
    process.exit(1)
})

process.on('uncaughtException', (err) => {
    console.error(chalk.red('Uncaught Exception:'), err)
})

process.on('unhandledRejection', (err) => {
    console.error(chalk.red('Unhandled Rejection:'), err)
})

// COMMAND CATEGORIES for menu
const COMMAND_CATEGORIES = {
    ADMIN: ['ban', 'promote', 'demote', 'mute', 'unmute', 'delete', 'del', 'kick', 'warnings', 'warn', 'antilink', 'antibadword', 'clear', 'tag', 'tagall', 'tagnoadmin', 'hidetag', 'chatbot', 'resetlink', 'antitag', 'welcome', 'goodbye', 'setdesc', 'setgname', 'setgpp'],
    ANIME: ['nom', 'poke', 'cry', 'kiss', 'pat', 'hug', 'wink', 'facepalm', 'garl', 'waifu', 'neko', 'megumin', 'maid', 'awoo', 'animegirl', 'anime', 'anime1', 'anime2', 'anime3', 'anime4', 'anime5', 'dog'],
OWNER: ['mode', 'setprefix', 'botimg', 'setbotimg', 'botname', 'setbotname', 'block', 'unblock', 'clearsession', 'antidelete', 'antiedit', 'cleartmp', 'update', 'settings', 'setpp', 'autoreact', 'autostatus', 'autotyping', 'autoread', 'anticall', 'pmblocker', 'setmention', 'mention', 'leave', 'totalcmds', 'autobio', 'alwaysonline', 'alwaysoffline', 'setowner', 'setownername', 'setownernumber', 'setmenustyle', 'setgstatus', 'setgcname', 'addsudo', 'delsudo', 'listsudo', 'restart', 'kickall', 'joinapproval', 'setbio'],

GENERAL: ['menu', 'ping', 'alive', 'tts', 'owner', 'joke', 'qoute', 'fact', 'weather', 'news', 'attp', 'lyrics', '8ball', 'groupinfo', 'staff', 'admins', 'vv', 'trt', 'ss', 'jid','bible', 'tiny', 'tinyurl', 'send', 'url', 'getpp', 'tutorial', 'totalcmds', 'commands'],

    IMAGE_STICKER: ['blur', 'simage', 'sticker', 'removebg', 'remini', 'crop', 'tgsticker', 'meme', 'take', 'emojimix', 'igs', 'igsc'],
    PIES: ['pies', 'china', 'indonesia', 'japan', 'korea', 'hijab'],
    GAME: ['tictactoe', 'hangman', 'guess', 'trivia', 'answer', 'truth', 'dare'],
    AI: ['gpt', 'gemini', 'image', 'flux', 'sora', 'claude', 'deepseek' , 'qwen'],
    FUN: ['compliment', 'insult', 'flirt', 'shayari', 'goodnight', 'roseday', 'character', 'wasted', 'ship', 'simp', 'stupid'],
    TEXTMAKER: ['metalic', 'ice', 'snow', 'impressive', 'matrix', 'light', 'neon', 'devil', 'purple', 'thunder', 'leaves', '1977', 'arena', 'hacker', 'sand', 'blackpink', 'glitch', 'fire'],
    DOWNLOADER: ['play', 'song', 'spotify', 'apk', 'app', 'instagram', 'facebook', 'tiktok', 'video', 'ytmp4'],
    MISC: ['hear', 'horny', 'circlr', 'lgbt', 'lolice', 'its-so-stupid', 'namecard', 'oogway', 'tweet', 'ytcomment', 'comrade', 'gay', 'glass', 'jail', 'passed', 'triggered'],
    GITHUB: ['script', 'gitclone', 'cid', 'id', 'channelid', 'vcard', 'repo']
};

// Function to get RAM usage with visual bar
function getRAMUsage() {
    const totalRAM = os.totalmem();
    const freeRAM = os.freemem();
    const usedRAM = totalRAM - freeRAM;
    
    const usedMB = (usedRAM / 1024 / 1024).toFixed(2);
    const totalGB = (totalRAM / 1024 / 1024 / 1024).toFixed(2);
    const percentage = ((usedRAM / totalRAM) * 100).toFixed(1);
    
    const filledBlocks = Math.round((usedRAM / totalRAM) * 8);
    const emptyBlocks = 8 - filledBlocks;
    const bar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
    
    return {
        bar: bar,
        text: `${usedMB} MB / ${totalGB} GB`,
        percentage: percentage
    };
}


// Function to detect platform
function getPlatform() {
    const env = process.env;
    
    if (env.DYNO || env.HEROKU_APP_DIR || env.HEROKU_SLUG_COMMIT) return 'Heroku';
    if (env.RAILWAY_ENVIRONMENT || env.RAILWAY_PROJECT_ID) return 'Railway';
    if (env.RENDER || env.RENDER_EXTERNAL_URL) return 'Render';
    if (env.KOYEB_PUBLIC_DOMAIN || env.KOYEB_APP_ID) return 'Koyeb';
    if (env.REPL_ID || env.REPL_SLUG) return 'Replit';
    if (env.TERMUX_VERSION || env.PREFIX?.includes('com.termux') || process.platform === 'android') return 'Termux';
    
    const hostname = os.hostname().toLowerCase();
    if (hostname.includes('panel') || env.PANEL_URL || env.PTERODACTYL) return 'Panel';
    
    const platform = os.platform();
    if (platform === 'linux') {
        // Check for Android/Termux via /proc/version
        try {
            const proc = require('fs').readFileSync('/proc/version', 'utf8').toLowerCase();
            if (proc.includes('android')) return 'Termux';
        } catch (_) {}
        return 'Linux';
    }
    if (platform === 'win32') return 'Windows';
    if (platform === 'darwin') return 'MacOS';
    return 'Linux';
}


// Function to get total commands
function getTotalCommands() {
    return Object.values(COMMAND_CATEGORIES).reduce((total, commands) => total + commands.length, 0);
}

// Function to get pushname
function getPushname(message) {
    return message.pushName || message.key.participant?.split('@')[0] || 'No Name';
}

// Function to format commands for menu
function formatCommands(commands) {
    const prefixes = getPrefixes ? getPrefixes() : (Array.isArray(settings.Prefix) ? settings.Prefix : [settings.Prefix]);
    const primaryPrefix = prefixes[0];
    return commands.map(cmd => `┃${primaryPrefix}${cmd}`).join('\n');
}

// Export helper functions
global.menuHelpers = {
    getPrefixes,
    COMMAND_CATEGORIES,
    getRAMUsage,
    getPlatform,
    getTotalCommands,
    getPushname,
    formatCommands
};

// ============================================================
// AUTO BIO - updates WhatsApp bio periodically
// ============================================================
let _autoBioInterval = null;

function startAutoBio(sock) {
    if (_autoBioInterval) clearInterval(_autoBioInterval);
    
    function updateBio() {
        try {
            delete require.cache[require.resolve('./settings')];
            const s = require('./settings');
            if ((s.autoBio || 'off').toLowerCase() !== 'on') return;
            
            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: s.timezone });
            const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: s.timezone });
            
            const bioText = (s.autoBioText || `🤖 ${s.botName} | ⏰ ${timeStr} | 📅 ${dateStr}`)
                .replace(/{botName}/g, s.botName || 'MOON-X')
                .replace(/{time}/g, timeStr)
                .replace(/{date}/g, dateStr);
            
            sock.updateProfileStatus(bioText).catch(() => {});
        } catch (e) {
            console.error('AutoBio error:', e.message);
        }
    }
    
    updateBio(); // Run immediately
    _autoBioInterval = setInterval(updateBio, 5 * 60 * 1000); // Every 5 mins
}

// ============================================================
// ALWAYS ONLINE / ALWAYS OFFLINE - presence management
// ============================================================
let _presenceInterval = null;

function startPresenceManager(sock) {
    if (_presenceInterval) clearInterval(_presenceInterval);
    
    _presenceInterval = setInterval(async () => {
        try {
            delete require.cache[require.resolve('./settings')];
            const s = require('./settings');
            const onlineOn = (s.alwaysOnline || 'off').toLowerCase() === 'on';
            const offlineOn = (s.alwaysOffline || 'off').toLowerCase() === 'on';
            
            if (onlineOn) {
                await sock.sendPresenceUpdate('available').catch(() => {});
            } else if (offlineOn) {
                await sock.sendPresenceUpdate('unavailable').catch(() => {});
            }
        } catch (e) {}
    }, 30000); // every 30s
}

// Expose starters so main.js / connection handler can call them
global.startAutoBio = startAutoBio;
global.startPresenceManager = startPresenceManager;

let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.redBright(`Update ${__filename}`))
    delete require.cache[file]
    require(file)
})