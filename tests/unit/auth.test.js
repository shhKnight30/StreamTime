// tests/unit/auth.test.js
describe('JWT Authentication', () => {
    it('registerUser should set both access and refresh token cookies', async () => {
        const res = await request(app)
            .post('/api/v1/users/register')
            .field('fullname', 'Test User')
            .field('username', 'testuser')
            .field('email', 'test@test.com')
            .field('password', 'password123')
            .attach('avatar', 'tests/fixtures/avatar.jpg');
        
        expect(res.status).toBe(201);
        expect(res.headers['set-cookie']).toContain(expect.stringContaining('accessToken='));
        expect(res.headers['set-cookie']).toContain(expect.stringContaining('refreshToken='));
        // Verify refreshToken is not empty/undefined
        const refreshCookie = res.headers['set-cookie'].find(c => c.startsWith('refreshToken='));
        expect(refreshCookie).not.toMatch(/refreshToken=;/); // not empty
    });
});