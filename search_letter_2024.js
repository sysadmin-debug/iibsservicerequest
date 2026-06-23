const xlsx = require('xlsx');

const workbook = xlsx.readFile('Laptop issused list 2024.xlsx');
const sheetNames = workbook.SheetNames;

sheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\n--- Sheet: ${sheetName} ---`);
  // Look for any cell containing 'letter'
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    for (let j = 0; j < row.length; j++) {
      if (typeof row[j] === 'string' && row[j].toLowerCase().includes('letter')) {
        console.log(`Found 'letter' at row ${i}:`, row);
        break; // found in this row, move to next row
      }
    }
  }
});
