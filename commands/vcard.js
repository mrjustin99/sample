const fs = require('fs');
const path = require('path');

async function vcardCommand(sock, chatId, message, isGroup, isOwner, groupMetadata) {
    try {
        if (!isGroup) {
            await sock.sendMessage(chatId, { text: '❌ This command can only be used in groups.' }, { quoted: message });
            return;
        }
        if (!isOwner) {
            await sock.sendMessage(chatId, { text: '❌ This command is for the owner only.' }, { quoted: message });
            return;
        }

        // Get fresh metadata if not passed
        if (!groupMetadata || !groupMetadata.participants) {
            try { groupMetadata = await sock.groupMetadata(chatId); } catch (e) {
                await sock.sendMessage(chatId, { text: '❌ Failed to fetch group data.' }, { quoted: message });
                return;
            }
        }

        const { participants } = groupMetadata;
        if (!participants || participants.length === 0) {
            await sock.sendMessage(chatId, { text: '❌ No participants found.' }, { quoted: message });
            return;
        }

        await sock.sendMessage(chatId, {
            text: `⏳ *Generating VCF for ${participants.length} contacts...*`
        }, { quoted: message });

        let vcard = '';
        participants.forEach((p, i) => {
            const num = p.id.split('@')[0];
            vcard += `BEGIN:VCARD\nVERSION:3.0\nFN:[${i}] +${num}\nTEL;type=CELL;type=VOICE;waid=${num}:+${num}\nEND:VCARD\n`;
        });

        const tmpDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        const vcfPath = path.join(tmpDir, `contacts_${Date.now()}.vcf`);
        fs.writeFileSync(vcfPath, vcard.trim());

        await sock.sendMessage(chatId, {
            document: fs.readFileSync(vcfPath),
            mimetype: 'text/vcard',
            fileName: `${groupMetadata.subject || 'Group'}_contacts.vcf`,
            caption: `✅ *Done!*\n\n*Group:* ${groupMetadata.subject}\n*Contacts:* ${participants.length}\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴋᴇɪᴛʜ`
        }, { quoted: message });

        // Clean up
        try { fs.unlinkSync(vcfPath); } catch (_) {}

    } catch (err) {
        console.error('Error in vcard command:', err);
        await sock.sendMessage(chatId, { text: `❌ Error: ${err.message}` }, { quoted: message });
    }
}

module.exports = vcardCommand;
