const settings = require('../settings');

async function channelInfoCommand(sock, chatId, message, userMessage) {
    try {
        // Support: .cid <url> or .id <url> or .newsletter <url>
        const cmd = userMessage.split(' ')[0];
        const url = userMessage.slice(cmd.length).trim();

        if (!url) {
            await sock.sendMessage(chatId, {
                text: `❌ *Please provide a WhatsApp Channel link.*\n\n*Example:*\n\`.cid https://whatsapp.com/channel/0029VbXXXXX\``
            }, { quoted: message });
            return;
        }

        // Extract invite code from URL
        const match = url.match(/whatsapp\.com\/channel\/([\w-]+)/);
        if (!match) {
            await sock.sendMessage(chatId, {
                text: '⚠️ *Invalid channel link.*\n\nMake sure it looks like:\nhttps://whatsapp.com/channel/xxxxxxxxx'
            }, { quoted: message });
            return;
        }

        const inviteCode = match[1];
        const loadingMsg = await sock.sendMessage(chatId, { text: '⏳ *Fetching channel info...*' }, { quoted: message });

        let metadata;
        try {
            metadata = await sock.newsletterMetadata('invite', inviteCode);
        } catch (e) {
            await sock.sendMessage(chatId, { delete: loadingMsg.key }).catch(() => {});
            await sock.sendMessage(chatId, {
                text: `❌ Failed to fetch channel info.\n\nError: ${e.message || 'Channel not found or inaccessible.'}`
            }, { quoted: message });
            return;
        }

        await sock.sendMessage(chatId, { delete: loadingMsg.key }).catch(() => {});

        if (!metadata || !metadata.id) {
            await sock.sendMessage(chatId, {
                text: '❌ Channel not found or inaccessible.'
            }, { quoted: message });
            return;
        }

        const createdDate = metadata.creation_time
            ? new Date(metadata.creation_time * 1000).toLocaleString('en-US')
            : 'Unknown';

        const infoText = `┎▣ ◈ *CHANNEL INFO* ◈
┃ *Name:* ${metadata.name || 'Unknown'}
┃ *ID:* ${metadata.id}
┃ *Followers:* ${metadata.subscribers?.toLocaleString() || 'N/A'}
┃ *Created:* ${createdDate}
┃ *Description:* ${metadata.description || 'No description'}
┃ *Verification:* ${metadata.verification === 'VERIFIED' ? '✅ Verified' : '❌ Not Verified'}
┖▣

> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍᴏᴏɴ xᴍᴅ`.trim();

        // Try to get channel picture
        const picUrl = metadata.picture || (metadata.preview ? `https://pps.whatsapp.net${metadata.preview}` : null);

        if (picUrl) {
            try {
                await sock.sendMessage(chatId, { image: { url: picUrl }, caption: infoText }, { quoted: message });
                return;
            } catch (_) {}
        }
        await sock.sendMessage(chatId, { text: infoText }, { quoted: message });

    } catch (error) {
        console.error('❌ Error in channel info command:', error);
        await sock.sendMessage(chatId, { text: `⚠️ An unexpected error occurred: ${error.message}` }, { quoted: message });
    }
}

module.exports = channelInfoCommand;
