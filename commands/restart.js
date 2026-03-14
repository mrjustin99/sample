const channelInfo = {
    contextInfo: {
        forwardingScore: 1, isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363417440480101@newsletter',
            newsletterName: 'KEITH TECH', serverMessageId: -1
        }
    }
};

async function restartCommand(sock, chatId, message, isOwner) {
    try {
        if (!isOwner) {
            await sock.sendMessage(chatId, { text: '❌ Only the owner can restart the bot!', ...channelInfo }, { quoted: message });
            return;
        }
        await sock.sendMessage(chatId, {
            text: '🔄 *Restarting bot...*\n\n_Bot will be back online shortly._', ...channelInfo
        }, { quoted: message });
        setTimeout(() => process.exit(0), 2000);
    } catch (e) {
        process.exit(0);
    }
}

module.exports = restartCommand;
