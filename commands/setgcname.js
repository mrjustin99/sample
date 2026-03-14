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

async function setgcnameCommand(sock, chatId, message, args, senderId) {
    try {
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, {
                text: '❌ *This command can only be used in groups!*',
                ...channelInfo
            }, { quoted: message });
            return;
        }

        const isAdmin = require('../lib/isAdmin');
        const adminStatus = await isAdmin(sock, chatId, senderId);

        if (!adminStatus.isBotAdmin) {
            await sock.sendMessage(chatId, {
                text: '❌ *Please make the bot an admin first!*',
                ...channelInfo
            }, { quoted: message });
            return;
        }

        if (!adminStatus.isSenderAdmin && !message.key.fromMe) {
            await sock.sendMessage(chatId, {
                text: '❌ *Only group admins can use this command!*',
                ...channelInfo
            }, { quoted: message });
            return;
        }

        const newName = (args || '').trim();

        if (!newName) {
            const metadata = await sock.groupMetadata(chatId);
            await sock.sendMessage(chatId, {
                text: `📛 *Current Group Name:* ${metadata.subject}\n\n*Usage:* \`.setgcname <new name>\`\n*Example:* \`.setgcname Moon-X Squad\``,
                ...channelInfo
            }, { quoted: message });
            return;
        }

        await sock.groupUpdateSubject(chatId, newName);

        await sock.sendMessage(chatId, {
            text: `✅ *Group name updated!*\n\n*New Name:* ${newName}`,
            ...channelInfo
        }, { quoted: message });

    } catch (error) {
        console.error('Error in setgcname command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ *Failed to update group name!*\n\nMake sure the bot is an admin.',
            ...channelInfo
        }, { quoted: message });
    }
}

module.exports = setgcnameCommand;
