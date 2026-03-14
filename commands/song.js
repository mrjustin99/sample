const fs = require("fs");
const axios = require('axios');
const yts = require('yt-search');
const path = require('path');

async function songCommand(sock, chatId, message) {
    try { 
        await sock.sendMessage(chatId, {
            react: { text: '🎵', key: message.key }
        });         
                    
        const tempDir = path.join(__dirname, "temp");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const parts = text.split(' ');
        const query = parts.slice(1).join(' ').trim();

        if (!query) {
            return await sock.sendMessage(chatId, { 
                text: '🎵 *Please provide a song name!*\n\nExample: `.play Moonlight`' 
            }, { quoted: message });
        }

        if (query.length > 100) {
            return await sock.sendMessage(chatId, { 
                text: `📝 *Song name too long!*\nMax 100 characters allowed.` 
            }, { quoted: message });
        }

        // Search for the song
        const searchResult = await (await yts(`${query} official audio`)).videos[0];
        if (!searchResult) {
            return sock.sendMessage(chatId, { 
                text: "❌ *Couldn't find your song!*\nPlease try again with a different name." 
            }, { quoted: message });
        }

        const video = searchResult;

        // Get download URL from API
        const apiUrl = `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(video.url)}&format=mp3`;
        const response = await axios.get(apiUrl);
        const apiData = response.data;

        if (!apiData.status || !apiData.result || !apiData.result.downloadUrl) {
            throw new Error("API failed to fetch track!");
        }

        // Send thumbnail with song information
        const thumbnailUrl = video.thumbnail || `https://img.youtube.com/vi/${video.videoId}/maxresdefault.jpg`;
        const caption = `*🎵 MOON-X MUSIC DL*\n\n` +
                       `*📀 Title:* ${video.title}\n` +
                       `*👤 Artist:* ${video.author.name}\n` +
                       `*⏱️ Duration:* ${video.timestamp}\n` +
                       `*👁️ Views:* ${video.views.toLocaleString()}\n` +
                       `*📅 Uploaded:* ${video.ago}\n` +
                       `*🔗 Link:* ${video.url}\n\n` +
                       `⏳ *Downloading audio...*`;

        await sock.sendMessage(chatId, {
            image: { url: thumbnailUrl },
            caption: caption
        }, { quoted: message });

        const timestamp = Date.now();
        const fileName = `audio_${timestamp}.mp3`;
        const filePath = path.join(tempDir, fileName);

        // Download MP3
        const audioResponse = await axios({ 
            method: "get", 
            url: apiData.result.downloadUrl, 
            responseType: "stream", 
            timeout: 600000 
        });
        
        const writer = fs.createWriteStream(filePath);
        audioResponse.data.pipe(writer);
        await new Promise((resolve, reject) => { 
            writer.on("finish", resolve); 
            writer.on("error", reject); 
        });

        if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
            throw new Error("Download failed or empty file!");
        }

        // Send the audio file
        await sock.sendMessage(chatId, { 
            document: { url: filePath }, 
            mimetype: "audio/mpeg", 
            fileName: `${(apiData.result.title || video.title).substring(0, 100)}.mp3`,
            caption: `✅ *Download complete!*\n🎵 *${video.title}*`
        }, { quoted: message });

        // Cleanup
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

    } catch (error) {
        console.error("Play command error:", error);
        return await sock.sendMessage(chatId, { 
            text: `🚫 *Error:* ${error.message}` 
        }, { quoted: message });
    }
}

module.exports = songCommand;