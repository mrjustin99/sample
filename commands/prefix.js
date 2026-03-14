const { getPrefixes, setPrefixes, addPrefix, removePrefix } = require('../lib/prefixManager');

const channelInfo = {
    contextInfo: {
        forwardingScore: 1, isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363417440480101@newsletter',
            newsletterName: 'KEITH TECH', serverMessageId: -1
        }
    }
};

async function prefixCommand(sock, chatId, message, isOwnerOrSudo) {
    if (!isOwnerOrSudo) {
        await sock.sendMessage(chatId, {
            text: '❌ This command is only available for the bot owner!', ...channelInfo
        }, { quoted: message });
        return;
    }

    const rawText = message.message?.conversation?.trim() ||
        message.message?.extendedTextMessage?.text?.trim() || '';

    const parts = rawText.trim().split(/\s+/);
    // command is "setprefix" or "prefix" — parts[0]
    // value is everything after command
    const value = parts.slice(1).join(' ').trim();
    const currentPrefixes = getPrefixes();

    // No argument — show status
    if (!value) {
        const prefixList = currentPrefixes.map(p => `\`${p}\``).join(', ');
        await sock.sendMessage(chatId, {
            text: `📋 *Current Prefix(es):* ${prefixList}\n\n📝 *Usage:*\n• \`setprefix .\` — Set prefix to .\n• \`setprefix none\` — Remove prefix (no prefix mode)\n• \`setprefix .!#\` — Set multiple prefixes\n\n*Note:* After setting prefix, use commands WITH the new prefix.`,
            ...channelInfo
        }, { quoted: message });
        return;
    }

    // setprefix none → no-prefix mode
    if (value.toLowerCase() === 'none') {
        if (setPrefixes([''])) {
            await sock.sendMessage(chatId, {
                text: `✅ *Prefix removed!*\n\n_You can now use commands without any prefix._\n_To restore, type: \`setprefix .\`_`,
                ...channelInfo
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { text: '❌ Failed to set prefix!', ...channelInfo }, { quoted: message });
        }
        return;
    }

    // Set to provided value(s) — each character becomes a prefix
    const newPrefixes = [...new Set(value.split('').filter(p => p.trim()))];
    if (newPrefixes.length === 0) {
        await sock.sendMessage(chatId, { text: '❌ Invalid prefix!', ...channelInfo }, { quoted: message });
        return;
    }

    if (setPrefixes(newPrefixes)) {
        const prefixList = newPrefixes.map(p => `\`${p}\``).join(', ');
        await sock.sendMessage(chatId, {
            text: `✅ *Prefix set to:* ${prefixList}\n\nAll commands now work with ${newPrefixes.length > 1 ? 'these prefixes' : 'this prefix'}!`,
            ...channelInfo
        }, { quoted: message });
    } else {
        await sock.sendMessage(chatId, { text: '❌ Failed to set prefix!', ...channelInfo }, { quoted: message });
    }
}

module.exports = prefixCommand;
