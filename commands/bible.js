const axios = require("axios");

async function bibleCommand(sock, chatId, message, rawText) {
    try {
        // Extract the reference after ".bible "
        const reference = rawText.slice(7).trim(); // Changed from 6 to 7 to account for the space after ".bible"

        if (!reference) {
            await sock.sendMessage(chatId, {
                text: `⚠️ *Please provide a Bible reference.*\n\n📝 *Example:*\n.bible John 1:1\n\n💡 *Other examples:*\n.bible Genesis 1:1\n.bible Psalm 23\n.bible Matthew 5:3-10\n.bible Romans 8:28`
            }, { quoted: message });
            return;
        }

        const apiUrl = `https://bible-api.com/${encodeURIComponent(reference)}`;
        console.log(`Fetching Bible verse from: ${apiUrl}`);
        
        const response = await axios.get(apiUrl, { timeout: 10000 });

        if (response.status === 200 && response.data && response.data.text) {
            const { reference: ref, text, translation_name, verses } = response.data;

            // Format the verse(s) nicely
            let verseText = text;
            
            // If there are multiple verses, format them better
            if (verses && verses.length > 0) {
                verseText = verses.map(v => 
                    `${v.book_name} ${v.chapter}:${v.verse} - ${v.text}`
                ).join('\n\n');
            }

            await sock.sendMessage(chatId, {
                text: `📖 *BIBLE VERSE*\n\n` +
                      `📚 *Reference:* ${ref}\n\n` +
                      `📜 *Text:*\n${verseText}\n\n` +
                      `🔄 *Translation:* ${translation_name}\n\n` +
                      `✨ *Powered by Moon-X*`
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, {
                text: `❌ *Verse not found.*\n\nPlease check if the reference is valid.\n\n📋 *Valid format examples:*\n- John 3:16\n- Psalm 23:1-6\n- Genesis 1:1-5\n- Matthew 5:3-10`
            }, { quoted: message });
        }
    } catch (error) {
        console.error("Bible command error:", error.message);
        
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            await sock.sendMessage(chatId, {
                text: "⏰ *Request timeout.* Please try again in a moment."
            }, { quoted: message });
        } else if (error.response) {
            // API returned an error
            await sock.sendMessage(chatId, {
                text: `❌ *API Error:* ${error.response.status}\n\nCould not fetch the Bible verse. Please try a different reference.`
            }, { quoted: message });
        } else if (error.request) {
            // No response received
            await sock.sendMessage(chatId, {
                text: "🌐 *Network error.* Please check your internet connection and try again."
            }, { quoted: message });
        } else {
            // Other errors
            await sock.sendMessage(chatId, {
                text: "⚠️ *An error occurred while fetching the Bible verse.*\n\nPlease try again or use a different reference."
            }, { quoted: message });
        }
    }
}

module.exports = bibleCommand;