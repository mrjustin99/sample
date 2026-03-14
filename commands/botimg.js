const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

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

async function botimgCommand(sock, chatId, message, isOwner) {
    try {
        if (!isOwner) {
            await sock.sendMessage(chatId, {
                text: '❌ *Only the bot owner can use this command!*',
                ...channelInfo
            }, { quoted: message });
            return;
        }

        // Check quoted or direct image
        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const directImage = message.message?.imageMessage;
        const quotedImage = quotedMessage?.imageMessage;

        if (!directImage && !quotedImage) {
            await sock.sendMessage(chatId, {
                text: '❌ *Please reply to an image or send an image with the command!*\n\n*Usage:* Reply to an image with `.setbotimg` or `.botimg`',
                ...channelInfo
            }, { quoted: message });
            return;
        }

        await sock.sendMessage(chatId, {
            text: '⏳ *Updating bot menu image...*',
            ...channelInfo
        }, { quoted: message });

        // Download the image
        let buffer;
        if (directImage) {
            buffer = await downloadMediaMessage(message, 'buffer', {});
        } else {
            buffer = await downloadMediaMessage(
                { key: message.key, message: quotedMessage },
                'buffer',
                {}
            );
        }

        // Ensure assets dir exists
        const assetsDir = path.join(__dirname, '../assets');
        if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, { recursive: true });
        }

        // Save as Menu.jpg
        const imgPath = path.join(assetsDir, 'Menu.jpg');
        fs.writeFileSync(imgPath, buffer);

        await sock.sendMessage(chatId, {
            text: '✅ *Bot menu image updated successfully!*\n\n_The new image will be used in the menu (v1 mode)._',
            ...channelInfo
        }, { quoted: message });

    } catch (error) {
        console.error('Error in botimg command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ *Failed to update bot image!*\n\nPlease make sure you replied to a valid image.',
            ...channelInfo
        }, { quoted: message });
    }
}

module.exports = botimgCommand;
