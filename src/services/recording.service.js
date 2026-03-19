// src/services/recording.service.js
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import logger from '../config/logger.js';
import mediasoupService from './mediasoup.service.js';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';  // ← ADD THIS

const FFMPEG_PATH = ffmpegInstaller.path;  // ← points to node_modules binary

class RecordingService {
    constructor() {
        this.activeRecordings = new Map();
        this.portCounter = 20000;
        
        this.recordingsDir = path.join(process.cwd(), 'recordings');
        if (!fs.existsSync(this.recordingsDir)) {
            fs.mkdirSync(this.recordingsDir, { recursive: true });
        }
        
        logger.info(`FFmpeg path: ${FFMPEG_PATH}`);  // verify on startup
    }

    getAvailablePort() {
        this.portCounter += 2;
        return this.portCounter;
    }

    generateSDP(videoPort, audioPort) {
        return `v=0
o=- 0 0 IN IP4 127.0.0.1
s=Mediasoup Recording
c=IN IP4 127.0.0.1
t=0 0
m=video ${videoPort} RTP/AVP 100
a=rtpmap:100 VP8/90000
m=audio ${audioPort} RTP/AVP 111
a=rtpmap:111 OPUS/48000/2`;
    }

    async startRecording(streamId) {
        try {
            if (this.activeRecordings.has(streamId)) {
                logger.warn(`Recording already in progress for stream ${streamId}, skipping`);
                return;  // ← changed from throw to warn+return (non-fatal)
            }

            const producers = mediasoupService.getStreamProducers(streamId);
            const videoProducer = producers.find(p => p.kind === 'video');
            const audioProducer = producers.find(p => p.kind === 'audio');

            if (!videoProducer) {
                logger.warn(`No video producer found for stream ${streamId}, skipping recording`);
                return;
            }

            const videoPort = this.getAvailablePort();
            const audioPort = audioProducer ? this.getAvailablePort() : null;

            const sdpString = this.generateSDP(videoPort, audioPort || 0);
            const sdpPath = path.join(this.recordingsDir, `${streamId}.sdp`);
            fs.writeFileSync(sdpPath, sdpString);

            const videoTransport = await mediasoupService.createPlainTransport(streamId);
            await mediasoupService.startRecordingConsumer(streamId, videoTransport, videoProducer.id, videoPort);

            let audioTransport = null;
            if (audioProducer) {
                audioTransport = await mediasoupService.createPlainTransport(streamId);
                await mediasoupService.startRecordingConsumer(streamId, audioTransport, audioProducer.id, audioPort);
            }

            const outputPath = path.join(
                this.recordingsDir,
                `${streamId}_${Date.now()}.mp4`
            );

            const ffmpegArgs = [
                '-protocol_whitelist', 'file,udp,rtp',
                '-i', sdpPath,
                '-c:v', 'copy',
                '-c:a', 'aac',
                '-strict', '-2',
                '-y',
                outputPath
            ];

            // ← Use FFMPEG_PATH instead of bare 'ffmpeg'
            const ffmpegProcess = spawn(FFMPEG_PATH, ffmpegArgs);

            ffmpegProcess.stderr.on('data', (data) => {
                logger.debug(`FFmpeg [${streamId}]: ${data.toString().trim()}`);
            });

            ffmpegProcess.on('error', (err) => {
                logger.error(`FFmpeg process error for stream ${streamId}:`, err.message);
                this.activeRecordings.delete(streamId);
            });

            ffmpegProcess.on('close', (code) => {
                logger.info(`FFmpeg closed (code ${code}) for stream ${streamId} → ${outputPath}`);
                // TODO: upload outputPath to S3 here
                this.activeRecordings.delete(streamId);
            });

            this.activeRecordings.set(streamId, {
                process: ffmpegProcess,
                videoTransport,
                audioTransport,
                sdpPath,
                outputPath
            });

            logger.info(`Started recording stream ${streamId} → ${outputPath}`);

        } catch (error) {
            logger.error(`Recording failed for ${streamId}: ${error.message}`);
            // Don't rethrow — recording failure should never crash the stream
        }
    }

    stopRecording(streamId) {
        const recording = this.activeRecordings.get(streamId);
        if (!recording) return;

        recording.process.kill('SIGINT');

        recording.videoTransport?.close();
        if (recording.audioTransport) recording.audioTransport.close();

        if (fs.existsSync(recording.sdpPath)) {
            fs.unlinkSync(recording.sdpPath);
        }

        this.activeRecordings.delete(streamId);
        logger.info(`Stopped recording for stream ${streamId}`);
    }
}

export default new RecordingService();