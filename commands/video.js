const axios = require('axios');
const yts = require('yt-search');

async function videoCommand(sock, chatId, message) {
    try {
        await sock.sendMessage(chatId, {
            react: { text: '🎥', key: message.key }
        });

        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const searchQuery = text.split(' ').slice(1).join(' ').trim();

        if (!searchQuery) {
            await sock.sendMessage(chatId, { 
                text: '🎥 *What video do you want to download?*\n\nExample: `.video Moon knight`' 
            }, { quoted: message });
            return;
        }

        // Determine if input is a YouTube link
        let videoUrl = '';
        let videoTitle = '';
        let videoThumbnail = '';
        
        if (searchQuery.startsWith('http://') || searchQuery.startsWith('https://')) {
            videoUrl = searchQuery;
        } else {
            // Search YouTube for the video
            const { videos } = await yts(searchQuery);
            if (!videos || videos.length === 0) {
                await sock.sendMessage(chatId, { 
                    text: '❌ *No videos found!*\nPlease try a different search term.' 
                }, { quoted: message });
                return;
            }
            videoUrl = videos[0].url;
            videoTitle = videos[0].title;
            videoThumbnail = videos[0].thumbnail;
        }

        // Extract YouTube ID for thumbnail
        const ytId = videoUrl.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/)?.[1];
        
        // Send thumbnail with video info
        const thumbnail = videoThumbnail || (ytId ? `https://i.ytimg.com/vi/${ytId}/maxresdefault.jpg` : null);
        const captionTitle = videoTitle || searchQuery;

        if (thumbnail) {
            await sock.sendMessage(chatId, {
                image: { url: thumbnail },
                caption: `*🎬 MOON-X VIDEO DL* 🎬\n\n` +
                        `*📀 Title:* ${captionTitle}\n` +
                        `*⏳ Status:* Processing download...`
            }, { quoted: message });
        }

        // Validate YouTube URL
        const isValidUrl = videoUrl.match(/(?:https?:\/\/)?(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:watch\?v=|v\/|embed\/|shorts\/|playlist\?list=)?)([a-zA-Z0-9_-]{11})/i);
        if (!isValidUrl) {
            await sock.sendMessage(chatId, { 
                text: '❌ *Invalid YouTube link!*\nPlease provide a valid YouTube URL.' 
            }, { quoted: message });
            return;
        }

        // Get video from the single API
        const apiUrl = `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(videoUrl)}&format=mp4`;
        
        const response = await axios.get(apiUrl, {
            timeout: 60000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.data?.success || !response.data?.downloadURL) {
            throw new Error('API returned invalid response');
        }

        const videoData = {
            download: response.data.downloadURL,
            title: response.data.title || videoTitle || 'Video'
        };

        // Send video directly using the download URL
        await sock.sendMessage(chatId, {
            video: { url: videoData.download },
            mimetype: 'video/mp4',
            fileName: `${videoData.title.replace(/[^\w\s]/gi, '')}.mp4`,
            caption: `*${videoData.title}*\n\n> *_Downloaded by Moon-X_*`
        }, { quoted: message });

    } catch (error) {
        console.error('[VIDEO] Command Error:', error?.message || error);
        await sock.sendMessage(chatId, { 
            text: '❌ *Download failed:* ' + (error?.message || 'Unknown error') 
        }, { quoted: message });
    }
}

module.exports = videoCommand;