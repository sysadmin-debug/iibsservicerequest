const xlsx = require('xlsx');

function parseSheet(sheetData, nameCol, statusCol, defaultCourse, defaultStatus) {
  const records = [];
  
  let startIndex = 0;
  for (let i = 0; i < Math.min(5, sheetData.length); i++) {
    const row = sheetData[i];
    if (Object.values(row).some(v => typeof v === 'string' && v.toLowerCase().includes('student name'))) {
      startIndex = i + 1;
      break;
    }
  }

  for (let i = startIndex; i < sheetData.length; i++) {
    const row = sheetData[i];
    
    let name = '';
    if (nameCol && row[nameCol]) {
      name = row[nameCol];
    } else {
      for (const key of Object.keys(row)) {
        if (typeof row[key] === 'string' && row[key].trim().length > 3 && !row[key].toLowerCase().includes('cancel') && !row[key].toLowerCase().includes('received')) {
          name = row[key];
          break;
        }
      }
    }

    if (!name || typeof name !== 'string' || name.trim() === '' || name.toLowerCase().includes('student name') || name.toLowerCase().includes('sl.n')) continue;

    let status = defaultStatus;
    if (statusCol && row[statusCol]) {
       const rawStatus = String(row[statusCol]).toLowerCase();
       if (rawStatus.includes('cancel')) status = 'Cancel';
       else if (rawStatus.includes('received') || rawStatus.includes('collected')) status = 'Received';
    }

    records.push({
      name: name.trim(),
      course: defaultCourse,
      status: status
    });
  }
  return records;
}

async function migrate() {
  try {
    const workbook = xlsx.readFile('Laptop final list 2023.xlsx');
    let allRecords = [];

    let data = xlsx.utils.sheet_to_json(workbook.Sheets['PGDM Received']);
    allRecords.push(...parseSheet(data, 'PGDM SLOT 1', '__EMPTY_1', 'PGDM 2023-2025', 'Received'));

    data = xlsx.utils.sheet_to_json(workbook.Sheets['AIMA PGDM 2023 -2025 BATCH\t\t']);
    allRecords.push(...parseSheet(data, '__EMPTY', '__EMPTY_1', 'AIMA PGDM 2023-2025', 'Received'));

    data = xlsx.utils.sheet_to_json(workbook.Sheets['Cancel']);
    allRecords.push(...parseSheet(data, 'PGDM Cancel SLOT 1,2,3', '__EMPTY', 'PGDM 2023-2025', 'Cancel'));

    data = xlsx.utils.sheet_to_json(workbook.Sheets['Cancel MBA']);
    allRecords.push(...parseSheet(data, null, '__EMPTY_1', 'MBA 2023-2025', 'Cancel'));

    data = xlsx.utils.sheet_to_json(workbook.Sheets['MBA Received']);
    allRecords.push(...parseSheet(data, 'LAPTOP ELIGIBILITY LIST (SLOT - 1)', '__EMPTY_1', 'MBA 2023-2025', 'Received'));

    data = xlsx.utils.sheet_to_json(workbook.Sheets['UG Received']);
    allRecords.push(...parseSheet(data, '__EMPTY', '__EMPTY_2', 'UG 2023-2026', 'Received'));

    console.log(`Prepared ${allRecords.length} records for insertion.`);

    const chunkSize = 50;
    let totalInserted = 0;
    
    for (let i = 0; i < allRecords.length; i += chunkSize) {
      const chunk = allRecords.slice(i, i + chunkSize);
      console.log(`Sending chunk ${i / chunkSize + 1}...`);
      const response = await fetch('https://iibsservicerequest.vercel.app/api/laptop/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk)
      });
      const result = await response.json();
      console.log('Result:', result);
      totalInserted += result.inserted || 0;
    }
    
    console.log(`Finished. Total newly inserted: ${totalInserted}`);

  } catch (err) {
    console.error('Migration error:', err);
  }
}

migrate();
