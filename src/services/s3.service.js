import { PutObjectCommand,DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "../config/aws.js";
import logger from "../config/logger.js";

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME

export const uploadToS3 = async (fileBuffer, key , contentType)=>{
    try{
        logger.debug('Uploading to S3:', { bucket: BUCKET_NAME, key, contentType });
        const command = new PutObjectCommand({
            Bucket:BUCKET_NAME,
            Key:key,
            Body:fileBuffer,
            ContentType:contentType
        })
        const result = await s3Client.send(command);
        logger.debug('S3 upload successful:', result);
        return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
    }catch(error){
        logger.error('S3 Upload Error:', error)
        throw new Error('Failed to upload file to S3')
    }
}

export const deleteFromS3 = async (key) =>{
    try{
        const command = new DeleteObjectCommand({
            Bucket:BUCKET_NAME,
            Key:key
        })
        await s3Client.send(command)
    }catch(error){
        logger.error('S3 Delete Error:',error)
        throw new Error('Failed to delete file from S3')
    }
}

export const getSignedUrlForUpload = async (key , contentType) =>{
    const command = new PutObjectCommand({
        Bucket:BUCKET_NAME,
        Key:key,
        ContentType:contentType
    })
    return await getSignedUrl(s3Client,command,{expiresIn:3600})
}