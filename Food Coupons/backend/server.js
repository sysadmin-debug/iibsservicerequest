require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { request } = require('urllib');
const db = require('./db');
const printer = require('./printer');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API: Get today's coupons (for dashboard)
app.get('/api/coupons/today', async (req, res) => {
    try {
        const coupons = await db.getTodayCoupons();
        res.json(coupons);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch coupons' });
    }
});

// API: Manually trigger a coupon
app.post('/api/coupons/trigger', async (req, res) => {
    const { employeeNo, mealType = 'Lunch' } = req.body;
    if (!employeeNo) return res.status(400).json({ error: 'employeeNo is required' });

    try {
        await handleAccessEvent(employeeNo, mealType);
        res.json({ success: true, message: 'Coupon triggered' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// --- Hikvision Polling Method (Replaces alertStream) ---
let lastEventTimeStr = new Date(Date.now() - 30000).toISOString().split('.')[0] + '+05:30'; // Start looking from 30 seconds ago

async function pollHikvisionEvents() {
    const HIK_IP = process.env.HIKVISION_IP || '192.168.8.200';
    const HIK_USER = process.env.HIKVISION_USER || 'admin';
    const HIK_PASS = process.env.HIKVISION_PASSWORD;

    if (!HIK_PASS) return; // Wait for password

    // End time is far in the future to catch everything
    const payload = {
        "AcsEventCond": {
            "searchID": "1",
            "searchResultPosition": 0,
            "maxResults": 10,
            "major": 5, // Access Control Events
            "minor": 38, // The minor code your device uses for successful scans!
            "startTime": lastEventTimeStr,
            "endTime": "2030-12-31T23:59:59+05:30"
        }
    };
    
    try {
        const response = await request(`http://${HIK_IP}/ISAPI/AccessControl/AcsEvent?format=json`, {
            method: 'POST',
            digestAuth: `${HIK_USER}:${HIK_PASS}`,
            data: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' },
            dataType: 'json',
            timeout: 5000
        });

        if (response.data && response.data.AcsEvent && response.data.AcsEvent.InfoList) {
            const events = response.data.AcsEvent.InfoList;
            
            for (const ev of events) {
                // If the event time is newer than our last checked time
                if (ev.time > lastEventTimeStr) {
                    lastEventTimeStr = ev.time; // Update the marker
                    
                    const employeeNo = ev.employeeNoString;
                    console.log(`\n🎉 NEW SCAN DETECTED! Employee: ${employeeNo} at ${ev.time}`);
                    
                    const hour = new Date().getHours();
                    let mealType = 'Lunch';
                    if (hour < 11) mealType = 'Breakfast';
                    else if (hour > 17) mealType = 'Dinner';

                    // Process the coupon
                    handleAccessEvent(employeeNo, mealType).catch(e => console.error('Handle Error:', e));
                }
            }
        }
    } catch (err) {
        // Ignore timeout/connection errors during polling to keep console clean
    }

    // Poll again in 2 seconds
    setTimeout(pollHikvisionEvents, 2000);
}

// Core logic to check limits and print
async function handleAccessEvent(employeeNo, mealType) {
    const canGet = await db.canGetCoupon(employeeNo, mealType);
    if (!canGet) {
        console.log(`User ${employeeNo} already received ${mealType} coupon today. Rejecting.`);
        return;
    }

    let studentName = 'Student';
    await new Promise((resolve) => {
        db.db.get('SELECT name FROM users WHERE employeeNo = ?', [employeeNo], (err, row) => {
            if (row) studentName = row.name;
            resolve();
        });
    });

    console.log(`Printing ${mealType} coupon for ${employeeNo} (${studentName})...`);
    try {
        await printer.printCoupon(employeeNo, studentName, mealType);
        await db.issueCoupon(employeeNo, mealType);
        console.log('Coupon generated successfully.');
    } catch (printerErr) {
        console.error('Printer failed:', printerErr);
    }
}

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
    console.log(`Started polling Hikvision terminal for new scans every 2 seconds...`);
    pollHikvisionEvents();
});
