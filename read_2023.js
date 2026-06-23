const xlsx = require('xlsx');

const workbook = xlsx.readFile('Laptop final list 2023.xlsx');
const sheetNames = workbook.SheetNames;
console.log('Sheets:', sheetNames);

sheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet);
  console.log(`\n--- Sheet: ${sheetName} ---`);
  console.log(`Row count: ${data.length}`);
  if (data.length > 0) {
    console.log('Headers:', Object.keys(data[0]));
    console.log('First 2 rows:', data.slice(0, 2));
  }
});
