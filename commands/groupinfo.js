async function groupInfoCommand(sock, chatId, msg) {
    try {
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, { text: '❌ This command can only be used in groups!' }, { quoted: msg });
            return;
        }

        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants || [];
        const groupAdmins = participants.filter(p => p.admin);
        const superAdmin = groupAdmins.find(p => p.admin === 'superadmin');
        const owner = superAdmin?.id || groupMetadata.owner || groupAdmins[0]?.id || chatId.split('@')[0] + '@s.whatsapp.net';

        const adminList = groupAdmins.length > 0
            ? groupAdmins.map((v, i) => `${i + 1}. @${v.id.split('@')[0]}`).join('\n')
            : 'None';

        // Created date
        let createdDate = 'Unknown';
        try {
            if (groupMetadata.creation) {
                createdDate = new Date(groupMetadata.creation * 1000).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric'
                });
            }
        } catch (_) {}

        const desc = groupMetadata.desc
            ? (typeof groupMetadata.desc === 'object'
                ? Buffer.from(groupMetadata.desc).toString('utf8')
                : groupMetadata.desc.toString())
            : 'No description set';

        const text = `┎▣ ◈ *GROUP INFO* ◈
┃ *Name:* ${groupMetadata.subject}
┃ *ID:* ${groupMetadata.id}
┃ *Members:* ${participants.length}
┃ *Admins:* ${groupAdmins.length}
┃ *Owner:* @${owner.split('@')[0]}
┃ *Created:* ${createdDate}
┃ *Restricted:* ${groupMetadata.restrict ? 'Yes' : 'No'}
┃ *Announce:* ${groupMetadata.announce ? 'Yes' : 'No'}
┖▣

┎▣ ◈ *ADMINS* ◈
${adminList}
┖▣

┎▣ ◈ *DESCRIPTION* ◈
${desc}
┖▣

> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍᴏᴏɴ xᴍᴅ`.trim();

        const mentions = [...groupAdmins.map(v => v.id), owner].filter(Boolean);

        // Try to get group profile picture
        let pp = null;
        try { pp = await sock.profilePictureUrl(chatId, 'image'); } catch (_) {}

        if (pp) {
            await sock.sendMessage(chatId, {
                image: { url: pp },
                caption: text,
                mentions
            }, { quoted: msg });
        } else {
            await sock.sendMessage(chatId, { text, mentions }, { quoted: msg });
        }

    } catch (error) {
        console.error('Error in groupinfo command:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to get group info: ' + error.message }, { quoted: msg });
    }
}

module.exports = groupInfoCommand;
