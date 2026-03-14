const crypto = require('crypto');
const {
    generateWAMessageContent,
    generateWAMessageFromContent,
    downloadContentFromMessage,
} = require('@whiskeysockets/baileys');
const { PassThrough } = require('stream');
const path = require('path');

const channelInfo = {
    contextInfo: {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363417440480101@newsletter',
            newsletterName: 'KEITH TECH',
            serverMessageId: -1
        }
    }
};

const PURPLE_COLOR = '#9C27B0';

// ---- Helper: download media from quoted message ----
async function downloadMedia(msg, type) {
    const mediaMsg = msg[`${type}Message`] || msg;
    const stream = await downloadContentFromMessage(mediaMsg, type);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

// ---- Helper: post group status ----
async function groupStatus(sock, jid, content) {
    const { backgroundColor } = content;
    delete content.backgroundColor;

    const inside = await generateWAMessageContent(content, {
        upload: sock.waUploadToServer,
        backgroundColor: backgroundColor || PURPLE_COLOR,
    });

    const secret = crypto.randomBytes(32);
    const msg = generateWAMessageFromContent(
        jid,
        {
            messageContextInfo: { messageSecret: secret },
            groupStatusMessageV2: {
                message: {
                    ...inside,
                    messageContextInfo: { messageSecret: secret },
                },
            },
        },
        {}
    );

    await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
    return msg;
}

// ---- Helper: convert audio to opus/ogg voice note ----
function toVN(buffer) {
    return new Promise((resolve, reject) => {
        let ffmpeg;
        try { ffmpeg = require('fluent-ffmpeg'); } catch (_) { return reject(new Error('ffmpeg not installed')); }
        const input = new PassThrough();
        const output = new PassThrough();
        const chunks = [];
        input.end(buffer);
        ffmpeg(input)
            .noVideo()
            .audioCodec('libopus')
            .format('ogg')
            .audioChannels(1)
            .audioFrequency(48000)
            .on('error', reject)
            .on('end', () => resolve(Buffer.concat(chunks)))
            .pipe(output);
        output.on('data', (c) => chunks.push(c));
    });
}

// ---- Helper: generate waveform ----
function generateWaveform(buffer, bars = 64) {
    return new Promise((resolve, reject) => {
        let ffmpeg;
        try { ffmpeg = require('fluent-ffmpeg'); } catch (_) { return resolve(undefined); }
        const input = new PassThrough();
        input.end(buffer);
        const chunks = [];
        ffmpeg(input)
            .audioChannels(1)
            .audioFrequency(16000)
            .format('s16le')
            .on('error', reject)
            .on('end', () => {
                const raw = Buffer.concat(chunks);
                const samples = raw.length / 2;
                const amps = [];
                for (let i = 0; i < samples; i++) {
                    amps.push(Math.abs(raw.readInt16LE(i * 2)) / 32768);
                }
                const size = Math.floor(amps.length / bars);
                if (size === 0) return resolve(undefined);
                const avg = Array.from({ length: bars }, (_, i) =>
                    amps.slice(i * size, (i + 1) * size).reduce((a, b) => a + b, 0) / size
                );
                const max = Math.max(...avg);
                if (max === 0) return resolve(undefined);
                resolve(Buffer.from(avg.map((v) => Math.floor((v / max) * 100))).toString('base64'));
            })
            .pipe()
            .on('data', (c) => chunks.push(c));
    });
}

// ---- Main command ----
async function setgstatusCommand(sock, chatId, message, args, isOwner) {
    try {
        // Owner or sudo only
        if (!isOwner) {
            await sock.sendMessage(chatId, {
                text: '❌ *Only the bot owner/admin can use this command!*',
                ...channelInfo
            }, { quoted: message });
            return;
        }

        // Group only
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, {
                text: '👥 *This command can only be used in groups.*',
                ...channelInfo
            }, { quoted: message });
            return;
        }

        // Check bot is admin
        const isAdmin = require('../lib/isAdmin');
        const adminStatus = await isAdmin(sock, chatId, message.key.participant || message.key.remoteJid);
        if (!adminStatus.isBotAdmin) {
            await sock.sendMessage(chatId, {
                text: '❌ *Please make the bot an admin to use this command!*',
                ...channelInfo
            }, { quoted: message });
            return;
        }

        const caption = (args || '').trim();
        const ctxInfo = message.message?.extendedTextMessage?.contextInfo;
        const hasQuoted = !!ctxInfo?.quotedMessage;

        // TEXT status (no quoted message)
        if (!hasQuoted) {
            if (!caption) {
                await sock.sendMessage(chatId, {
                    text: `📝 *Group Status Usage*\n\n• Reply to image/video/audio:\n  \`.setgstatus [caption]\`\n• Text status:\n  \`.setgstatus Your text here\`\n\n_Text statuses use a purple background by default._\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍᴏᴏɴ xᴍᴅ`,
                    ...channelInfo
                }, { quoted: message });
                return;
            }

            await sock.sendMessage(chatId, { text: '⏳ Posting text group status...', ...channelInfo }, { quoted: message });
            try {
                await groupStatus(sock, chatId, { text: caption, backgroundColor: PURPLE_COLOR });
                await sock.sendMessage(chatId, { text: '✅ *Text group status posted!*', ...channelInfo }, { quoted: message });
            } catch (e) {
                await sock.sendMessage(chatId, { text: `❌ Failed to post text group status: ${e.message || e}`, ...channelInfo }, { quoted: message });
            }
            return;
        }

        // Quoted media
        const targetMessage = {
            key: {
                remoteJid: chatId,
                id: ctxInfo.stanzaId,
                participant: ctxInfo.participant,
            },
            message: ctxInfo.quotedMessage,
        };

        const mtype = Object.keys(targetMessage.message)[0] || '';

        // IMAGE / STICKER
        if (/image|sticker/i.test(mtype)) {
            await sock.sendMessage(chatId, { text: '⏳ Posting image group status...', ...channelInfo }, { quoted: message });
            let buf;
            try {
                buf = await downloadMedia(targetMessage.message, /sticker/i.test(mtype) ? 'sticker' : 'image');
            } catch { return sock.sendMessage(chatId, { text: '❌ Failed to download image', ...channelInfo }, { quoted: message }); }
            if (!buf) return sock.sendMessage(chatId, { text: '❌ Could not download image', ...channelInfo }, { quoted: message });
            try {
                await groupStatus(sock, chatId, { image: buf, caption: caption || '' });
                await sock.sendMessage(chatId, { text: '✅ *Image group status posted!*', ...channelInfo }, { quoted: message });
            } catch (e) {
                await sock.sendMessage(chatId, { text: `❌ Failed to post image group status: ${e.message || e}`, ...channelInfo }, { quoted: message });
            }
            return;
        }

        // VIDEO
        if (/video/i.test(mtype)) {
            await sock.sendMessage(chatId, { text: '⏳ Posting video group status...', ...channelInfo }, { quoted: message });
            let buf;
            try {
                buf = await downloadMedia(targetMessage.message, 'video');
            } catch { return sock.sendMessage(chatId, { text: '❌ Failed to download video', ...channelInfo }, { quoted: message }); }
            if (!buf) return sock.sendMessage(chatId, { text: '❌ Could not download video', ...channelInfo }, { quoted: message });
            try {
                await groupStatus(sock, chatId, { video: buf, caption: caption || '' });
                await sock.sendMessage(chatId, { text: '✅ *Video group status posted!*', ...channelInfo }, { quoted: message });
            } catch (e) {
                await sock.sendMessage(chatId, { text: `❌ Failed to post video group status: ${e.message || e}`, ...channelInfo }, { quoted: message });
            }
            return;
        }

        // AUDIO
        if (/audio/i.test(mtype)) {
            await sock.sendMessage(chatId, { text: '⏳ Posting audio group status...', ...channelInfo }, { quoted: message });
            let buf;
            try {
                buf = await downloadMedia(targetMessage.message, 'audio');
            } catch { return sock.sendMessage(chatId, { text: '❌ Failed to download audio', ...channelInfo }, { quoted: message }); }
            if (!buf) return sock.sendMessage(chatId, { text: '❌ Could not download audio', ...channelInfo }, { quoted: message });

            let vn = buf;
            try { vn = await toVN(buf); } catch (_) {}
            let waveform;
            try { waveform = await generateWaveform(buf); } catch (_) {}

            try {
                await groupStatus(sock, chatId, {
                    audio: vn,
                    mimetype: 'audio/ogg; codecs=opus',
                    ptt: true,
                    waveform,
                });
                await sock.sendMessage(chatId, { text: '✅ *Audio group status posted!*', ...channelInfo }, { quoted: message });
            } catch (e) {
                await sock.sendMessage(chatId, { text: `❌ Failed to post audio group status: ${e.message || e}`, ...channelInfo }, { quoted: message });
            }
            return;
        }

        await sock.sendMessage(chatId, {
            text: '❌ Unsupported media type. Reply to an image, video, or audio.',
            ...channelInfo
        }, { quoted: message });

    } catch (e) {
        console.error('setgstatus error:', e);
        await sock.sendMessage(chatId, { text: `❌ Error: ${e.message || e}`, ...channelInfo }, { quoted: message });
    }
}

module.exports = setgstatusCommand;
