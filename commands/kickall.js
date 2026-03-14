const channelInfo = {
    contextInfo: {
        forwardingScore: 1, isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363417440480101@newsletter',
            newsletterName: 'KEITH TECH', serverMessageId: -1
        }
    }
};

async function kickallCommand(sock, chatId, message, senderId) {
    try {
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, { text: '❌ This command can only be used in groups!', ...channelInfo }, { quoted: message });
            return;
        }

        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants || [];
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';

        // Only kick non-admins, non-bot
        const toKick = participants.filter(p => {
            if (p.id === botId) return false;
            if (p.id === senderId) return false;
            if (p.admin) return false;
            return true;
        });

        if (toKick.length === 0) {
            await sock.sendMessage(chatId, { text: '⚠️ No non-admin members to kick.', ...channelInfo }, { quoted: message });
            return;
        }

        await sock.sendMessage(chatId, {
            text: `⏳ *Kicking ${toKick.length} members...*`, ...channelInfo
        }, { quoted: message });

        let kicked = 0;
        for (const p of toKick) {
            try {
                await sock.groupParticipantsUpdate(chatId, [p.id], 'remove');
                kicked++;
                await new Promise(r => setTimeout(r, 800)); // delay to avoid ban
            } catch (_) {}
        }

        await sock.sendMessage(chatId, {
            text: `✅ *Kicked ${kicked}/${toKick.length} members!*`, ...channelInfo
        }, { quoted: message });

    } catch (error) {
        console.error('Error in kickall:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed: ' + error.message, ...channelInfo }, { quoted: message });
    }
}

module.exports = kickallCommand;
