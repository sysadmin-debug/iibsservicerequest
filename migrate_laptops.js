const mongoose = require('mongoose');
const xlsx = require('xlsx');

// MongoDB Connection (Force Google DNS to bypass Windows SRV bug)
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoUri = 'mongodb+srv://iibs:iibspassword123@cluster0.tx3p15k.mongodb.net/iibs?appName=Cluster0';

// Schema
const laptopSchema = new mongoose.Schema({
  name: { type: String, required: true },
  course: { type: String, required: true },
  status: { type: String, default: 'Pending' }, // 'Received', 'Cancel', 'Pending'
  serialNo: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now }
});

const LaptopEligibility = mongoose.models.LaptopEligibility || mongoose.model('LaptopEligibility', laptopSchema);

async function migrateLaptops() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected.');

    const wb = xlsx.readFile('LAPTOP ELIGIBILITY LIST 2025-2026.xlsx');
    const sheetsToProcess = [
      { name: 'PGDM ', course: 'PGDM' },
      { name: 'MBA', course: 'MBA' },
      { name: 'UG', course: 'UG' },
      { name: 'Student taken Laptop with Lette', course: 'Student taken Laptop with Letter' },
      { name: 'Factulty', course: 'Faculty' }
    ];

    let totalInserted = 0;

    for (const sheetInfo of sheetsToProcess) {
      if (!wb.Sheets[sheetInfo.name]) continue;
      
      const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetInfo.name], { header: 1 });
      
      // Faculty structure is different
      if (sheetInfo.course === 'Faculty') {
        const rows = data.slice(1); // skip headers
        for (const row of rows) {
          if (!row[1]) continue; // Skip empty names
          const studentName = String(row[1]).trim();
          
          await LaptopEligibility.findOneAndUpdate(
            { name: studentName, course: sheetInfo.course },
            { 
              name: studentName, 
              course: sheetInfo.course, 
              status: 'Received', // Assume received since they are listed
              updatedAt: new Date()
            },
            { upsert: true }
          );
          totalInserted++;
        }
      } else {
        const rows = data.slice(2); // headers are typically in row 1, data starts row 2
        for (const row of rows) {
          if (!row[1]) continue; // Skip empty names
          
          const studentName = String(row[1]).trim();
          const rawStatus = row[2] ? String(row[2]).toUpperCase().trim() : '';
          const serialNo = row[3] ? String(row[3]).trim() : '';
          
          let parsedStatus = 'Pending';
          if (rawStatus.includes('AVAIL') || rawStatus === 'RECIVED' || rawStatus === 'RECEIVED' || rawStatus.includes('TAKEN')) {
            parsedStatus = 'Received';
          } else if (rawStatus.includes('CANCEL') && rawStatus !== 'AVAIL / CANCEL') {
            parsedStatus = 'Cancel';
          }

          await LaptopEligibility.findOneAndUpdate(
            { name: studentName, course: sheetInfo.course },
            { 
              name: studentName, 
              course: sheetInfo.course, 
              status: parsedStatus,
              serialNo: serialNo,
              updatedAt: new Date()
            },
            { upsert: true }
          );
          totalInserted++;
        }
      }
      console.log(`Processed ${sheetInfo.course}`);
    }

    console.log(`🎉 Successfully migrated ${totalInserted} laptop records to MongoDB!`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateLaptops();
