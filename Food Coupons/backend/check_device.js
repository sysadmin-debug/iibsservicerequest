require('dotenv').config();
const { request } = require('urllib');
const xml2js = require('xml2js');

async function checkDevice() {
    const HIK_IP = process.env.HIKVISION_IP || '192.168.8.200';
    const HIK_USER = process.env.HIKVISION_USER || 'admin';
    const HIK_PASS = process.env.HIKVISION_PASSWORD;

    const auth = { digestAuth: `${HIK_USER}:${HIK_PASS}` };

    console.log('1. Checking Device Time...');
    try {
        const timeRes = await request(`http://${HIK_IP}/ISAPI/System/time`, auth);
        const parser = new xml2js.Parser();
        const timeObj = await parser.parseStringPromise(timeRes.data.toString());
        const deviceTime = timeObj.Time.localTime[0];
        console.log(`Device thinks the current time is: ${deviceTime}`);
    } catch (err) {
        console.error('Failed to get device time:', err.message);
    }

    console.log('\n2. Pulling ALL Access Events from 1970 to 2037...');
    const payload = {
        "AcsEventCond": {
            "searchID": "1",
            "searchResultPosition": 0,
            "maxResults": 10,
            "major": 5, // Access Control Event
            "minor": 0, // All minors
            "startTime": "1970-01-01T00:00:00+05:30",
            "endTime": "2037-12-31T23:59:59+05:30"
        }
    };
    
    try {
        const eventRes = await request(`http://${HIK_IP}/ISAPI/AccessControl/AcsEvent?format=json`, {
            method: 'POST',
            ...auth,
            data: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' },
            dataType: 'json',
            timeout: 5000
        });
        
        console.log('Event Response Status:', eventRes.status);
        if (eventRes.data.AcsEvent && eventRes.data.AcsEvent.InfoList) {
            console.log(`Found ${eventRes.data.AcsEvent.numOfMatches} matches!`);
            const events = eventRes.data.AcsEvent.InfoList;
            events.forEach((ev, i) => {
                console.log(`Event ${i+1}: ID: ${ev.employeeNoString}, Time: ${ev.time}, Major: ${ev.major}, Minor: ${ev.minor}`);
            });
        } else {
            console.log('No events found (NO MATCH) or invalid response:');
            console.log(JSON.stringify(eventRes.data, null, 2));
        }
    } catch (err) {
        console.error('Failed to pull events:', err.message);
    }
}

checkDevice();
