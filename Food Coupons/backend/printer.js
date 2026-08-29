const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Ensure the coupons directory exists for testing
const couponsDir = path.join(__dirname, 'coupons');
if (!fs.existsSync(couponsDir)) {
    fs.mkdirSync(couponsDir);
}

const printCoupon = (employeeNo, studentName = 'Student', mealType = 'Lunch') => {
    return new Promise((resolve, reject) => {
        try {
            // For testing: Generate a PDF instead of sending to the physical thermal printer
            const dateStr = new Date().toLocaleString().replace(/[\/:]/g, '-');
            const filename = `Coupon_${employeeNo}_${mealType}_${dateStr}.pdf`;
            const filePath = path.join(couponsDir, filename);

            const doc = new PDFDocument({ size: [226, 400], margin: 10 }); // Thermal printer size roughly
            const stream = fs.createWriteStream(filePath);
            
            doc.pipe(stream);

            // Add content to PDF
            doc.font('Helvetica-Bold')
               .fontSize(16)
               .text('IIBS FOOD COUPON', { align: 'center' })
               .moveDown(0.5);

            doc.font('Helvetica')
               .fontSize(10)
               .text('----------------------------------', { align: 'center' })
               .moveDown(0.5);

            doc.fontSize(12)
               .text(`Date: ${new Date().toLocaleString()}`)
               .text(`Meal: ${mealType.toUpperCase()}`)
               .text(`Emp/Std No: ${employeeNo}`)
               .text(`Name: ${studentName}`)
               .moveDown(0.5);

            doc.fontSize(10)
               .text('----------------------------------', { align: 'center' })
               .moveDown(0.5);

            doc.font('Helvetica-Bold')
               .fontSize(12)
               .text('Valid for today only.', { align: 'center' });

            doc.end();

            stream.on('finish', () => {
                console.log(`[TESTING] Saved PDF coupon to: ${filePath}`);
                resolve(true);
            });

            stream.on('error', (err) => {
                console.error('Error saving PDF:', err);
                reject(err);
            });

        } catch (err) {
            console.error('Printer module error:', err);
            reject(err);
        }
    });
};

module.exports = { printCoupon };
