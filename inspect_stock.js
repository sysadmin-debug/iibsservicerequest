const xlsx = require('xlsx');

const workbook = xlsx.readFile('Stock Register.xlsx');
console.log('Sheets:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\n--- Sheet: ${sheetName} ---`);
  console.log(`Row count: ${data.length}`);
  if (data.length > 0) {
    console.log('First 5 rows:');
    for (let i = 0; i < Math.min(5, data.length); i++) {
      console.log(i, data[i]);
    }
  }
});
