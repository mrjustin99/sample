const channelInfo = {
    contextInfo: {
        forwardingScore: 1, isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363417440480101@newsletter',
            newsletterName: 'KEITH TECH', serverMessageId: -1
        }
    }
};

async function TotalCommand(sock, chatId, message) {
    try {
        const { COMMAND_CATEGORIES, getTotalCommands } = global.menuHelpers;
        const total = getTotalCommands();

        const breakdown = Object.entries(COMMAND_CATEGORIES)
            .map(([cat, cmds]) => `┃ *${cat}:* ${cmds.length} commands`)
            .join('\n');

        await sock.sendMessage(chatId, {
            text: `┎▣ ◈ *TOTAL COMMANDS* ◈\n${breakdown}\n┖▣\n\n*Total: ${total} commands*\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍᴏᴏɴ xᴍᴅ`,
            ...channelInfo
        }, { quoted: message });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '❌ Error getting total commands: ' + e.message }, { quoted: message });
    }
}

module.exports = TotalCommand;
