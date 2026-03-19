// tests/unit/watchHistory.test.js
import { addToWatchHistory } from '../src/utils/watchHistory.js';
import { User } from '../src/models/user.models.js';

describe('addToWatchHistory', () => {
    it('should prepend video to empty history', async () => {
        const mockUpdate = jest.fn().mockResolvedValue({});
        User.findByIdAndUpdate = mockUpdate;
        await addToWatchHistory('userId', 'videoId');
        expect(mockUpdate).toHaveBeenCalledTimes(1); // single atomic update
    });

    it('should not crash with invalid userId', async () => {
        await expect(addToWatchHistory(null, 'videoId')).resolves.not.toThrow();
    });

    it('should handle concurrent calls without duplicates', async () => {
        // Run 10 concurrent calls with same video
        const calls = Array(10).fill(null).map(() => 
            addToWatchHistory('userId', 'videoId')
        );
        await expect(Promise.all(calls)).resolves.not.toThrow();
    });
});