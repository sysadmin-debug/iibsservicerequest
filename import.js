const fs = require('fs');

async function importData() {
  console.log("Fetching Google Sheet CSV...");
  const csvResponse = await fetch('https://docs.google.com/spreadsheets/d/1_jd5yNLlb52U28WTolxwFLWcWSA2hMeznIdD8WKwbH0/export?format=csv&gid=1802082833');
  const csvText = await csvResponse.text();

  // Simple CSV parser
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (insideQuotes) {
      if (char === '"' && nextChar === '"') {
        currentCell += '"';
        i++; // skip next
      } else if (char === '"') {
        insideQuotes = false;
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell);
        currentCell = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentRow.push(currentCell);
        if (currentRow.join('').trim() !== '') {
            rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
        if (char === '\r') i++;
      } else {
        currentCell += char;
      }
    }
  }
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  console.log(`Parsed ${rows.length} rows.`);

  const supabaseUrl = 'https://ttfpstdetevgkjnkqcxf.supabase.co/rest/v1/tickets';
  const supabaseKey = 'sb_publishable_MXV3EFM0dxohHYcieiptdA_p7UhMePb';

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // Ignore header or invalid rows
    if (row.length < 5 || (row[0] && row[0].toLowerCase().includes('timestamp'))) {
        continue;
    }

    let rawTimestamp = row[0] || '';
    let timeNum = rawTimestamp.replace(/[^0-9]/g, '');
    const pseudoId = timeNum ? `TKT-${timeNum.substring(0, 8)}-${i}` : `TKT-1000${i}`;

    let rawDate = new Date(row[0]);
    if (isNaN(rawDate.getTime())) rawDate = new Date();

    const rawStatus = (row[10] || '').trim().toLowerCase();
    let sheetStatus = 'open';
    if (rawStatus === 'completed' || rawStatus === 'closed') sheetStatus = 'resolved';
    if (rawStatus === 'process' || rawStatus === 'in progress') sheetStatus = 'progress';

    const payload = {
        created_at: rawDate.toISOString(),
        ticket_id: pseudoId,
        name: row[1] || 'Unknown',
        iibs_id: row[2] || '-',
        role: row[3] || '-',
        department: row[4] || '-',
        contact: row[5] || '-',
        email: row[6] || '-',
        ticket_type: row[7] || '-',
        other_request: row[8] || '',
        status: sheetStatus,
        resolution: row[11] || ''
    };

    const res = await fetch(supabaseUrl, {
        method: 'POST',
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        console.log(`Uploaded ${pseudoId}`);
    } else {
        console.error(`Failed ${pseudoId}:`, await res.text());
    }
  }

  console.log("Migration complete!");
}

importData();
