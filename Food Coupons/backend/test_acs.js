require('dotenv').config();
const { request } = require('urllib');

async function testAcs() {
    const HIK_IP = process.env.HIKVISION_IP || '192.168.8.200';
    const HIK_USER = process.env.HIKVISION_USER || 'admin';
    const HIK_PASS = process.env.HIKVISION_PASSWORD;

    const payload = {
        "AcsEventCond": {
            "searchID": "1",
            "searchResultPosition": 0,
            "maxResults": 5,
            "startTime": "2024-01-01T00:00:00+05:30",
            "endTime": "2026-12-31T23:59:59+05:30"
        }
    };

    console.log('Sending AcsEvent request without filters...');
    
    try {
        const response = await request(`http://${HIK_IP}/ISAPI/AccessControl/AcsEvent?format=json`, {
            method: 'POST',
            digestAuth: `${HIK_USER}:${HIK_PASS}`,
            data: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' },
            dataType: 'json',
            timeout: 5000
        });

        console.log('Response Status:', response.status);
        console.log('Response Data:', JSON.stringify(response.data, null, 2));
    } catch (err) {
        console.error('Request Failed:', err.message);
    }
}

testAcs();
