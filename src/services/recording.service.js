import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import logger from '../config/logger.js';
import mediasoupService from './mediasoup.service.js';

class RecordingService {
    constructor() {
        this.activeRecordings = new Map();
        this.portCounter = 20000; // Starting port for FFmpeg UDP listeners
        
        // Ensure recordings directory exists
        this.recordingsDir = path.join(process.cwd(), 'recordings');
        if (!fs.existsSync(this.recordingsDir)) {
            fs.mkdirSync(this.recordingsDir, { recursive: true });
        }
    }

    getAvailablePort() {
        this.portCounter += 2; // Increment by 2 (one for RTP, one for RTCP)
        return this.portCounter;
    }

    /**
     * Generates a dynamic SDP string for FFmpeg to know what codecs to expect
     */
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
                throw new Error("Recording already in progress for this stream");
            }

            // 1. Get the video and audio producers for this stream
            const producers = mediasoupService.getStreamProducers(streamId);
            const videoProducer = producers.find(p => p.kind === 'video');
            const audioProducer = producers.find(p => p.kind === 'audio');

            if (!videoProducer) throw new Error("No video producer found to record");

            // 2. Setup Ports & SDP
            const videoPort = this.getAvailablePort();
            const audioPort = audioProducer ? this.getAvailablePort() : null;
            
            const sdpString = this.generateSDP(videoPort, audioPort || 0);
            const sdpPath = path.join(this.recordingsDir, `${streamId}.sdp`);
            fs.writeFileSync(sdpPath, sdpString);

            // 3. Create PlainTransports & Consumers
            const videoTransport = await mediasoupService.createPlainTransport(streamId);
            await mediasoupService.startRecordingConsumer(streamId, videoTransport, videoProducer.id, videoPort);

            let audioTransport = null;
            if (audioProducer) {
                audioTransport = await mediasoupService.createPlainTransport(streamId);
                await mediasoupService.startRecordingConsumer(streamId, audioTransport, audioProducer.id, audioPort);
            }

            // 4. Build FFmpeg Command
            const outputPath = path.join(this.recordingsDir, `${streamId}_${Date.now()}.mp4`);
            
            const ffmpegArgs = [
                '-protocol_whitelist', 'file,udp,rtp',
                '-i', sdpPath,
                '-c:v', 'copy',      // Copy video codec directly (VP8/H264)
                '-c:a', 'aac',       // Convert Opus to AAC for mp4 compatibility
                '-strict', '-2',
                '-y',                // Overwrite output
                outputPath
            ];

            // 5. Spawn FFmpeg
            const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

            ffmpegProcess.stderr.on('data', (data) => {
                // FFmpeg logs to stderr natively. Uncomment to debug FFmpeg issues:
                // console.log(`FFMPEG: ${data.toString()}`);
            });

            ffmpegProcess.on('close', (code) => {
                logger.info(`FFmpeg process closed with code ${code} for stream ${streamId}`);
                // Here you would trigger an AWS S3 upload of the completed `outputPath`
            });

            // 6. Save recording state
            this.activeRecordings.set(streamId, {
                process: ffmpegProcess,
                videoTransport,
                audioTransport,
                sdpPath,
                outputPath
            });

            logger.info(`Started recording stream ${streamId} to ${outputPath}`);

        } catch (error) {
            logger.error(`Recording failed: ${error.message}`);
        }
    }

    stopRecording(streamId) {
        const recording = this.activeRecordings.get(streamId);
        if (!recording) return;

        // Kill FFmpeg gracefully
        recording.process.kill('SIGINT');

        // Close Mediasoup Transports
        recording.videoTransport.close();
        if (recording.audioTransport) recording.audioTransport.close();

        // Cleanup SDP file
        if (fs.existsSync(recording.sdpPath)) {
            fs.unlinkSync(recording.sdpPath);
        }

        this.activeRecordings.delete(streamId);
        logger.info(`Stopped recording for stream ${streamId}`);
    }
}

export default new RecordingService();