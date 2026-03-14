const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const settings = require('../settings');

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

const p = Array.isArray(settings.Prefix) ? settings.Prefix[0] : settings.Prefix;

async function tourlCommand(sock, chatId, message) {
    try {
        const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quotedMsg) {
            await sock.sendMessage(chatId, {
                text: `❌ *Reply to a media file with \`${p}tourl\`*\n\nSupports: image, video, audio, document`
            }, { quoted: message });
            return;
        }

        // Determine media type
        let mediaType = null;
        let mimeType = '';
        let fileName = '';

        if (quotedMsg.imageMessage) {
            mediaType = 'Image'; mimeType = quotedMsg.imageMessage.mimetype || 'image/jpeg';
            fileName = `image_${Date.now()}.jpg`;
        } else if (quotedMsg.videoMessage) {
            mediaType = 'Video'; mimeType = quotedMsg.videoMessage.mimetype || 'video/mp4';
            fileName = `video_${Date.now()}.mp4`;
        } else if (quotedMsg.audioMessage) {
            mediaType = 'Audio'; mimeType = quotedMsg.audioMessage.mimetype || 'audio/mpeg';
            fileName = `audio_${Date.now()}.mp3`;
        } else if (quotedMsg.documentMessage) {
            mediaType = 'Document'; mimeType = quotedMsg.documentMessage.mimetype || 'application/octet-stream';
            fileName = quotedMsg.documentMessage.fileName || `file_${Date.now()}.bin`;
        } else if (quotedMsg.stickerMessage) {
            mediaType = 'Sticker'; mimeType = 'image/webp';
            fileName = `sticker_${Date.now()}.webp`;
        } else {
            await sock.sendMessage(chatId, {
                text: '❌ Unsupported media type. Reply to an image, video, audio, sticker or document.'
            }, { quoted: message });
            return;
        }

        const statusMsg = await sock.sendMessage(chatId, { text: '⏳ *Downloading media...*' }, { quoted: message });

        // Build a proper message object for downloadMediaMessage
        const contextInfo = message.message.extendedTextMessage.contextInfo;
        const quotedKey = {
            remoteJid: chatId,
            id: contextInfo.stanzaId,
            participant: contextInfo.participant || chatId,
            fromMe: false
        };

        let mediaBuffer;
        try {
            mediaBuffer = await sock.downloadMediaMessage(
                { key: quotedKey, message: quotedMsg },
                'buffer'
            );
        } catch (dlErr) {
            console.error('Download error:', dlErr.message);
            await sock.sendMessage(chatId, { delete: statusMsg.key }).catch(() => {});
            await sock.sendMessage(chatId, {
                text: '❌ Failed to download media. Try again or the file may have expired.'
            }, { quoted: message });
            return;
        }

        if (!mediaBuffer || mediaBuffer.length === 0) {
            await sock.sendMessage(chatId, { delete: statusMsg.key }).catch(() => {});
            await sock.sendMessage(chatId, { text: '❌ Empty media buffer.' }, { quoted: message });
            return;
        }

        await sock.sendMessage(chatId, { delete: statusMsg.key }).catch(() => {});
        const uploadMsg = await sock.sendMessage(chatId, { text: `⏳ *Uploading ${mediaType} to Catbox...*` });

        // Save temp
        const tmpDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        const tempFile = path.join(tmpDir, `tourl_${Date.now()}_${fileName}`);
        fs.writeFileSync(tempFile, mediaBuffer);

        let mediaUrl = null;
        try {
            const form = new FormData();
            form.append('fileToUpload', fs.createReadStream(tempFile), { filename: fileName, contentType: mimeType });
            form.append('reqtype', 'fileupload');

            const resp = await axios.post('https://catbox.moe/user/api.php', form, {
                headers: form.getHeaders(),
                timeout: 120000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            if (resp.data && typeof resp.data === 'string' && resp.data.trim().startsWith('http')) {
                mediaUrl = resp.data.trim();
            } else {
                throw new Error('Bad response: ' + String(resp.data).substring(0, 100));
            }
        } catch (upErr) {
            console.error('Catbox upload error:', upErr.message);
            // Try tmpfiles.org as fallback
            try {
                const form2 = new FormData();
                form2.append('file', fs.createReadStream(tempFile), fileName);
                const r2 = await axios.post('https://tmpfiles.org/api/v1/upload', form2, {
                    headers: form2.getHeaders(), timeout: 60000
                });
                if (r2.data?.data?.url) {
                    mediaUrl = r2.data.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
                }
            } catch (_) {}
        } finally {
            try { fs.unlinkSync(tempFile); } catch (_) {}
        }

        await sock.sendMessage(chatId, { delete: uploadMsg.key }).catch(() => {});

        if (!mediaUrl) {
            await sock.sendMessage(chatId, {
                text: '❌ Upload failed. Both Catbox and tmpfiles.org are unavailable. Please try later.'
            }, { quoted: message });
            return;
        }

        await sock.sendMessage(chatId, {
            text: `✅ *${mediaType} Uploaded!*\n\n📁 *File:* ${fileName}\n📊 *Size:* ${formatBytes(mediaBuffer.length)}\n🔗 *URL:*\n${mediaUrl}\n\n> © ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴋᴇɪᴛʜ-ᴛᴇᴄʜ`
        }, { quoted: message });

    } catch (error) {
        console.error('Error in tourl command:', error);
        await sock.sendMessage(chatId, {
            text: `❌ Unexpected error: ${error.message || 'Please try again'}`
        }, { quoted: message });
    }
}

module.exports = tourlCommand;
