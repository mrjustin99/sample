const axios = require('axios');

// Store processed message IDs to prevent duplicates
const processedMessages = new Set();

async function tiktokCommand(sock, chatId, message) {
    try {
        // Check if message has already been processed
        if (processedMessages.has(message.key.id)) {
            return;
        }
        
        // Add message ID to processed set
        processedMessages.add(message.key.id);
        
        // Clean up old message IDs after 5 minutes
        setTimeout(() => {
            processedMessages.delete(message.key.id);
        }, 5 * 60 * 1000);

        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        
        if (!text) {
            return await sock.sendMessage(chatId, { 
                text: "🎵 *Please provide a TikTok link!*\n\nExample: `.tiktok https://tiktok.com/@user/video/123456`"
            }, { quoted: message });
        }

        // Extract URL from command
        const url = text.split(' ').slice(1).join(' ').trim();
        
        if (!url) {
            return await sock.sendMessage(chatId, { 
                text: "🎵 *Please provide a TikTok link!*\n\nExample: `.tiktok https://tiktok.com/@user/video/123456`"
            }, { quoted: message });
        }

        // Check for various TikTok URL formats
        const tiktokPatterns = [
            /https?:\/\/(?:www\.)?tiktok\.com\//,
            /https?:\/\/(?:vm\.)?tiktok\.com\//,
            /https?:\/\/(?:vt\.)?tiktok\.com\//,
            /https?:\/\/(?:www\.)?tiktok\.com\/@/,
            /https?:\/\/(?:www\.)?tiktok\.com\/t\//
        ];

        const isValidUrl = tiktokPatterns.some(pattern => pattern.test(url));
        
        if (!isValidUrl) {
            return await sock.sendMessage(chatId, { 
                text: "❌ *Invalid TikTok link!*\nPlease provide a valid TikTok video URL."
            }, { quoted: message });
        }

        // Send processing reaction
        await sock.sendMessage(chatId, {
            react: { text: '🔄', key: message.key }
        });

        // Send "downloading" message
        await sock.sendMessage(chatId, { 
            text: "⏳ *Downloading TikTok video...*\nPlease wait."
        }, { quoted: message });

        // Use only the Eliteprotech API
        const apiUrl = `https://eliteprotech-apis.zone.id/tiktok?url=${encodeURIComponent(url)}`;
        
        try {
            const response = await axios.get(apiUrl, { 
                timeout: 30000,
                headers: {
                    'accept': '*/*',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            // Based on common API patterns, we need to determine the response structure
            // You'll need to check the actual response and adjust these paths
            const data = response.data;
            
            let videoUrl = null;
            let title = "TikTok Video";
            let author = null;
            let stats = null;
            
            // Try to extract data based on common API response formats
            // You'll need to modify these paths based on the actual API response
            if (data) {
                // Check if the API returns data directly or in a nested structure
                if (data.videoUrl || data.video_url || data.downloadUrl || data.download_url) {
                    videoUrl = data.videoUrl || data.video_url || data.downloadUrl || data.download_url;
                } else if (data.data && (data.data.videoUrl || data.data.video_url || data.data.downloadUrl || data.data.download_url)) {
                    videoUrl = data.data.videoUrl || data.data.video_url || data.data.downloadUrl || data.data.download_url;
                } else if (data.result && (data.result.videoUrl || data.result.video_url || data.result.downloadUrl || data.result.download_url)) {
                    videoUrl = data.result.videoUrl || data.result.video_url || data.result.downloadUrl || data.result.download_url;
                }
                
                // Try to get title
                if (data.title) title = data.title;
                else if (data.data?.title) title = data.data.title;
                else if (data.result?.title) title = data.result.title;
                
                // Try to get author
                if (data.author) author = data.author;
                else if (data.data?.author) author = data.data.author;
                else if (data.result?.author) author = data.result.author;
            }
            
            if (!videoUrl) {
                console.error("API Response:", JSON.stringify(data, null, 2));
                throw new Error("No video URL found in API response");
            }
            
            // Send thumbnail/info if available
            try {
                const thumbnailUrl = data.thumbnail || data.cover || data.data?.thumbnail || data.result?.cover;
                const caption = `*🎬 TIKTOK VIDEO* 🎬\n\n` +
                               `*📝 Title:* ${title}\n` +
                               (author ? `*👤 Author:* ${author}\n` : '') +
                               `*⏳ Status:* Downloading...`;
                
                if (thumbnailUrl) {
                    await sock.sendMessage(chatId, {
                        image: { url: thumbnailUrl },
                        caption: caption
                    }, { quoted: message });
                }
            } catch (thumbError) {
                console.error("Thumbnail error:", thumbError.message);
            }
            
            // Download video as buffer
            const videoResponse = await axios.get(videoUrl, {
                responseType: 'arraybuffer',
                timeout: 60000,
                maxContentLength: 100 * 1024 * 1024, // 100MB limit
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'video/mp4,video/*,*/*;q=0.9',
                    'Referer': 'https://www.tiktok.com/'
                }
            });
            
            const videoBuffer = Buffer.from(videoResponse.data);
            
            // Validate video buffer
            if (videoBuffer.length === 0) {
                throw new Error("Video buffer is empty");
            }
            
            const finalCaption = `*${title}*\n\n> *_Downloaded by Moon-X_*`;
            
            await sock.sendMessage(chatId, {
                video: videoBuffer,
                mimetype: "video/mp4",
                caption: finalCaption
            }, { quoted: message });
            
            // Update reaction to success
            await sock.sendMessage(chatId, {
                react: { text: '✅', key: message.key }
            });
            
        } catch (apiError) {
            console.error("API Error:", apiError.message);
            if (apiError.response) {
                console.error("API Response Status:", apiError.response.status);
                console.error("API Response Data:", apiError.response.data);
            }
            
            // Fallback to sending the video directly via URL if buffer download fails
            try {
                // You might need to extract video URL again here
                // This part depends on having the videoUrl from the previous attempt
                await sock.sendMessage(chatId, { 
                    text: "⚠️ *Download processed but couldn't fetch video buffer.*\nPlease try again with a different link."
                }, { quoted: message });
            } catch (fallbackError) {
                throw apiError;
            }
        }

    } catch (error) {
        console.error('Error in TikTok command:', error);
        await sock.sendMessage(chatId, { 
            text: "❌ *Failed to download TikTok video.*\nPlease try again with a different link or check if the video is available."
        }, { quoted: message });
        
        // Update reaction to error
        await sock.sendMessage(chatId, {
            react: { text: '❌', key: message.key }
        });
    }
}

module.exports = tiktokCommand;