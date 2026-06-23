const xlsx = require('xlsx');

function extractLetterStudents(sheetData, defaultStatus) {
  let records = [];
  let foundLetterHeader = false;
  
  for (let i = 0; i < sheetData.length; i++) {
    const row = sheetData[i];
    let isLetterHeader = Object.values(row).some(v => typeof v === 'string' && v.toLowerCase().includes('letter'));
    if (isLetterHeader) {
       foundLetterHeader = true;
       continue;
    }
    
    if (foundLetterHeader) {
      let name = '';
      for (const key of Object.keys(row)) {
          if (typeof row[key] === 'string' && row[key].trim().length > 3 && !row[key].toLowerCase().includes('cancel') && !row[key].toLowerCase().includes('received') && !row[key].toLowerCase().includes('recived') && !row[key].toLowerCase().includes('letter') && !row[key].toLowerCase().includes('slno')) {
            name = row[key];
            break;
          }
      }
      
      if (!name || typeof name !== 'string' || name.trim() === '' || name.toLowerCase().includes('student name') || name.toLowerCase().includes('sl.n')) continue;
      
      records.push({
        name: name.trim(),
        course: 'Student taken Laptop with Letter',
        status: defaultStatus
      });
    }
  }
  return records;
}

async function fix() {
  try {
    const workbook = xlsx.readFile('Laptop issused list 2024.xlsx');
    
    // Extract the letter students
    let letterStudents = [];
    letterStudents.push(...extractLetterStudents(xlsx.utils.sheet_to_json(workbook.Sheets['PGDM']), 'Received'));
    letterStudents.push(...extractLetterStudents(xlsx.utils.sheet_to_json(workbook.Sheets['MBA ']), 'Received'));
    
    console.log(`Found ${letterStudents.length} letter students.`);
    
    // 1. Fetch live DB
    const res = await fetch('https://iibsservicerequest.vercel.app/api/laptop/list');
    const dbRecords = await res.json();
    
    let deleted = 0;
    
    for (const ls of letterStudents) {
       // find them in the DB where course is PGDM 2024-2026 or MBA 2024-2026
       const wrongEntry = dbRecords.find(r => r.name === ls.name && (r.course === 'PGDM 2024-2026' || r.course === 'MBA 2024-2026'));
       if (wrongEntry) {
         console.log(`Deleting wrong entry for ${ls.name} (${wrongEntry.course})`);
         await fetch(`https://iibsservicerequest.vercel.app/api/laptop/${wrongEntry._id}`, { method: 'DELETE' });
         deleted++;
       }
    }
    
    console.log(`Deleted ${deleted} incorrect entries.`);
    
    // 2. Re-insert with correct course
    const importRes = await fetch('https://iibsservicerequest.vercel.app/api/laptop/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(letterStudents)
    });
    const result = await importRes.json();
    console.log('Re-insert Result:', result);
    
  } catch(e) {
    console.error(e);
  }
}

fix();
