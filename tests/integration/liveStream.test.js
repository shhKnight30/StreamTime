// tests/integration/liveStream.test.js
describe('Live Stream Lifecycle', () => {
    it('should cleanup recording when stream stops via REST', async () => {
        const stopSpy = jest.spyOn(recordingService, 'stopRecording');
        await request(app)
            .post(`/api/v1/live-stream/${streamId}/stop`)
            .set('Cookie', `accessToken=${token}`);
        expect(stopSpy).toHaveBeenCalledWith(`stream_${streamId}`);
    });
    
    it('should mark stream as not live in DB on socket disconnect', async () => {
        // Simulate streamer disconnect
        socket.disconnect();
        await new Promise(r => setTimeout(r, 100));
        const stream = await LiveStream.findById(dbStreamId);
        expect(stream.isLive).toBe(false);
    });
});