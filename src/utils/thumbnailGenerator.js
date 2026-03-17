import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import path from 'path';
import fs from 'fs/promises';
import logger from '../config/logger.js';

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);
/**
 * Generate thumbnail from video file
 * @param {string} videoPath - Path to video file
 * @returns {Promise<string>} - Path to generated thumbnail
 */
export const generateThumbnail = async (videoPath) => {
    try {
        if (!videoPath) {
            throw new Error('Video path is required');
        }

        // Check if video file exists
        await fs.access(videoPath);

        // Generate thumbnail path
        const videoDir = path.dirname(videoPath);
        const videoName = path.basename(videoPath, path.extname(videoPath));
        const thumbnailPath = path.join(videoDir, `${videoName}_thumbnail.jpg`);

        logger.debug('Generating thumbnail:', { videoPath, thumbnailPath });

        // Generate thumbnail using ffmpeg
        return new Promise((resolve, reject) => {
            ffmpeg(videoPath)
                .screenshots({
                    timestamps: ['00:00:01'], // Take screenshot at 1 second
                    filename: path.basename(thumbnailPath),
                    folder: videoDir,
                    size: '1280x720'
                })
                .on('end', () => {
                    logger.debug('Thumbnail generated successfully:', thumbnailPath);
                    resolve(thumbnailPath);
                })
                .on('error', (err) => {
                    logger.error('Error generating thumbnail:', err);
                    reject(new Error('Failed to generate thumbnail'));
                });
        });
    } catch (error) {
        logger.error('Thumbnail generation error:', error);
        throw new Error('Failed to generate thumbnail');
    }
};

/**
 * Get video duration
 * @param {string} videoPath - Path to video file
 * @returns {Promise<number>} - Duration in seconds
 */
export const getVideoDuration = async (videoPath) => {
    try {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(videoPath, (err, metadata) => {
                if (err) {
                    // reject(err);
                    resolve(0)
                    return;
                }
                resolve(metadata.format.duration || 0);
            });
        });
    } catch (error) {
        logger.error('Error getting video duration:', error);
        return 0;
    }
};