const { request } = require('urllib');

async function testStream() {
    console.log('Connecting to alertStream...');
    try {
        const response = await request('http://192.168.8.200/ISAPI/Event/notification/alertStream', {
            digestAuth: 'admin:password123', // I will ask the user for their password later
            streaming: true,
            timeout: 0 // No timeout
        });

        console.log('Status:', response.status);

        response.res.on('data', (chunk) => {
            console.log('Data received:', chunk.toString());
        });
        
        response.res.on('error', (err) => {
            console.log('Stream error:', err);
        });

        response.res.on('end', () => {
            console.log('Stream ended');
        });

    } catch (err) {
        console.error('Connection failed:', err.message);
    }
}

testStream();
