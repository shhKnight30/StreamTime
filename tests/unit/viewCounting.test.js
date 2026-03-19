// tests/unit/viewCounting.test.js
describe('View counting deduplication', () => {
    it('should not count same viewer twice within 1 hour', async () => {
        const agent = request.agent(app);
        await agent.patch('/api/v1/analytics/video/videoId/views');
        await agent.patch('/api/v1/analytics/video/videoId/views');
        
        const video = await Video.findById('videoId');
        expect(video.views).toBe(1); // not 2
    });
});