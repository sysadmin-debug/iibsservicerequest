const mongoose = require('mongoose');
const xlsx = require('xlsx');
const crypto = require('crypto');

const inventorySchema = new mongoose.Schema({
  id: { type: String, default: () => crypto.randomUUID(), unique: true },
  date: { type: Date, default: Date.now },
  particulars: { type: String, default: '' },
  opening_stock: { type: Number, default: 0 },
  arrivals: { type: Number, default: 0 },
  issues: { type: Number, default: 0 },
  closing_stock: { type: Number, default: 0 },
  last_updated: { type: Date, default: Date.now }
});

const Inventory = mongoose.model('Inventory', inventorySchema);

const uri = 'mongodb+srv://iibs:iibspassword123@cluster0.tx3p15k.mongodb.net/iibs?appName=Cluster0';

async function importData() {
  await mongoose.connect(uri);
  console.log('Connected to DB');
  
  const workbook = xlsx.readFile('Stock Register.xlsx');
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  await Inventory.deleteMany({});
  console.log('Cleared existing inventory');

  // Skip row 0 (title), row 1 (headers)
  let count = 0;
  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    if (!row[1] && !row[2] && !row[5]) continue; // Skip completely empty trailing rows

    // Handle date
    let dateVal = row[0];
    if (typeof dateVal === 'number') {
        if (dateVal >= 1900 && dateVal <= 2100) {
            dateVal = new Date(dateVal, 0, 1);
        } else {
            // Excel serial date (1900 format)
            dateVal = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
        }
    } else if (typeof dateVal === 'string') {
        dateVal = new Date(dateVal);
    }

    if (!dateVal || isNaN(new Date(dateVal).getTime())) {
        dateVal = new Date(); // fallback to today if invalid
    }

    const item = new Inventory({
      date: dateVal,
      particulars: row[1] ? String(row[1]).trim() : 'Unknown Item',
      opening_stock: parseInt(row[2]) || 0,
      arrivals: parseInt(row[3]) || 0,
      // row[4] is total, ignored
      closing_stock: parseInt(row[5]) || 0
    });
    
    await item.save();
    count++;
  }

  console.log(`Successfully imported ${count} items`);
  process.exit(0);
}

importData().catch(err => {
  console.error(err);
  process.exit(1);
});
