// tests/load/video-feed.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    vus: 100,
    duration: '30s',
    thresholds: {
        http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
        http_req_failed: ['rate<0.01'],   // <1% error rate
    },
};

export default function () {
    const res = http.get('http://localhost:4000/api/v1/videos?page=1&limit=10');
    check(res, {
        'status 200': (r) => r.status === 200,
        'has videos': (r) => JSON.parse(r.body).data.videos.length > 0,
    });
    sleep(1);
}