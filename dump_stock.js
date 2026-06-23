const xlsx = require('xlsx');
const workbook = xlsx.readFile('Stock Register.xlsx');
const sheet = workbook.Sheets['Sheet1'];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

console.log('--- Sheet1 ---');
for (let i = 0; i < Math.min(30, data.length); i++) {
  console.log(i, data[i]);
}
