const xlsx = require('xlsx');

async function uploadToVercel() {
  console.log('Reading Excel file...');
  const workbook = xlsx.readFile('Stock Register.xlsx');
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  const baseUrl = 'https://iibsservicerequest.vercel.app/api/inventory';

  console.log('Fetching existing records to wipe...');
  const getRes = await fetch(baseUrl);
  if (getRes.ok) {
    const existing = await getRes.json();
    console.log(`Deleting ${existing.length} existing records...`);
    
    const chunkSize = 20;
    for (let i = 0; i < existing.length; i += chunkSize) {
      const chunk = existing.slice(i, i + chunkSize);
      await Promise.all(chunk.map(item => fetch(`${baseUrl}/${item.id}`, { method: 'DELETE' })));
      console.log(`Deleted chunk ${i / chunkSize + 1} of ${Math.ceil(existing.length / chunkSize)}`);
    }
  }

  // Skip row 0 (title), row 1 (headers)
  let count = 0;
  let currentDate = new Date(); // Fallback
  const payloads = [];

  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    // First check if this row has a date and update currentDate
    let dateVal = row[0];
    let isDateRow = false;

    if (dateVal !== undefined && dateVal !== null && dateVal !== '') {
      if (typeof dateVal === 'number') {
          if (dateVal >= 1900 && dateVal <= 2100) {
              currentDate = new Date(dateVal, 0, 1);
              isDateRow = true;
          } else if (dateVal > 10000) {
              // Excel serial date (1900 format)
              currentDate = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
              isDateRow = true;
          }
      } else if (typeof dateVal === 'string') {
          const parsed = new Date(dateVal);
          if (!isNaN(parsed.getTime()) && dateVal.length > 5) {
              currentDate = parsed;
              isDateRow = true;
          }
      }
    }

    // Now, if this row has no particulars or values, skip it.
    // It might have just been a date header row which we already captured.
    if (!row[1] && !row[2] && !row[5]) continue; 

    // Skip empty items that are just "undefined"
    if (!row[1]) continue;

    const payload = {
      date: currentDate,
      particulars: String(row[1]).trim(),
      opening_stock: parseInt(row[2]) || 0,
      arrivals: parseInt(row[3]) || 0,
      issues: 0,
      closing_stock: parseInt(row[5]) || 0,
      item_name: String(row[1]).trim(),
      quantity: parseInt(row[5]) || 0
    };
    payloads.push(payload);
  }

  const postChunkSize = 20;
  for (let i = 0; i < payloads.length; i += postChunkSize) {
    const chunk = payloads.slice(i, i + postChunkSize);
    await Promise.all(chunk.map(payload => 
      fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    ));
    count += chunk.length;
    console.log(`Uploaded chunk ${i / postChunkSize + 1} of ${Math.ceil(payloads.length / postChunkSize)}`);
  }

  console.log(`Successfully uploaded ${count} items to Vercel DB.`);
}

uploadToVercel().catch(console.error);
