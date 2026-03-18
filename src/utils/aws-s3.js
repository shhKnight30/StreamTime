import { uploadToS3, deleteFromS3 } from '../services/s3.service.js';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import logger from '../config/logger.js';
import fsOriginal from 'fs'

export const uploadOnS3 = async (localFilePath, folder = 'uploads') => {
    try {
        if (!localFilePath) {
            logger.error('No file path provided');
            return null;
        }

        // Read the file
            
        // Generate unique key
        const ext = path.extname(localFilePath);
        const key = `${folder}/${uuidv4()}${ext}`;
        
        // Determine content type
        const contentType = getContentType(ext);
        
        // Upload to S3
        const fileStream = fsOriginal.createReadStream(localFilePath);
        const url = await uploadToS3(fileStream, key, contentType);
        
        // Clean up local file
        await fs.unlink(localFilePath);
        
        return { url, key };
    } catch (error) {
        logger.error('S3 Upload Error:', error);
        
        // Clean up local file if it exists
        try {
            await fs.unlink(localFilePath);
        } catch (unlinkErr) {
            logger.error('Error deleting local file:', unlinkErr);
        }
        
        return null;
    }
};

export const deleteFromS3ByKey = async (key) => {
    try {
        if (!key) {
            logger.error('No S3 key provided');
            return false;
        }
        await deleteFromS3(key);
        return true;
    } catch (error) {
        logger.error('S3 Delete Error:', error);
        return false;
    }
};

function getContentType(extension) {
    const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.mp4': 'video/mp4',
        '.avi': 'video/avi',
        '.mov': 'video/quicktime',
        '.wmv': 'video/x-ms-wmv',
        '.flv': 'video/x-flv',
        '.webm': 'video/webm'
    };
    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}