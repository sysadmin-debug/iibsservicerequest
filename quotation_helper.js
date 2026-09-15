const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const PDFDocument = require('pdfkit');

// Candidate Excel paths: project root first (packaged in repo for Vercel/production), then local hard disk
const PROJECT_EXCEL_PATH = path.join(__dirname, 'Quotation.xlsx');
const LOCAL_EXCEL_PATH = 'D:\\Local Disk F_4282023147\\New folder\\Quotation\\Quotation.xlsx';

function resolveExcelPath() {
  if (fs.existsSync(PROJECT_EXCEL_PATH)) return PROJECT_EXCEL_PATH;
  if (fs.existsSync(LOCAL_EXCEL_PATH)) return LOCAL_EXCEL_PATH;
  return null;
}

// Pre-seeded quotations extracted directly from Mangala It, GDS Techno Service, ADITYA COMPUTER, SCS SAI COMPUTER
const DEFAULT_PRESET_QUOTATIONS = [
  {
    sheetName: 'Mangala It',
    vendorName: 'Mangala IT Solutions',
    vendorAddress: '#970, L.I.G , 2nd Stage, 16th B Cross Rd, Housing Board Colony, Yelahanka New Town, Bengaluru, Karnataka 560064\nPhone: 078993 40027',
    quoteDate: '06.07.2026',
    clientName: 'International Institute of Business Studies',
    clientAddress: 'Bangalore',
    items: [
      {
        slNo: 1,
        product: 'Epson 13310 Printer Ink Tank Printer',
        description: 'Ink Tank Multifunction Printer',
        hsn: '8443',
        quantity: 2,
        rate: 11750,
        total: 23500,
        gst: 4230,
        amount: 27730
      },
      {
        slNo: 2,
        product: 'Canon LBP 3010B Multi Function Printer (Print, Scan & Copy)',
        description: 'Multi Function Printer',
        hsn: '8443',
        quantity: 1,
        rate: 17800,
        total: 17800,
        gst: 3204,
        amount: 21004
      }
    ],
    totalAmount: 48734,
    amountInWords: 'Rupees Thirty Two Thousand Eight Hundred Four Only',
    deliveryTerms: 'Delivery: within 7 working days',
    terms: ['Taxes: All Inclusive', 'Payment: 100% as Advance', 'An electronic copy does not carry any signature.']
  },
  {
    sheetName: 'GDS Techno Service',
    vendorName: 'GDS Techno Service',
    vendorAddress: 'No. 120, 40 Feet Road, Phase 2, WOC Road, Opposite City Hospital, Manjunath Nagar, Bangalore - 560010\nPhone: 9448151117',
    quoteDate: '06.07.2026',
    clientName: 'International Institute of Business Studies',
    clientAddress: 'Bangalore',
    items: [
      {
        slNo: 1,
        product: 'Gobbler Cash Counting Machine',
        description: 'High Speed Currency Counting Machine',
        hsn: '8472',
        quantity: 1,
        rate: 10800,
        total: 10800,
        gst: 1944,
        amount: 12744
      }
    ],
    totalAmount: 12744,
    amountInWords: 'Rupees Twelve Thousand Seven Hundred Forty Four Only',
    deliveryTerms: 'Delivery: within 7 working days',
    terms: [
      'Taxes: All Inclusive',
      'Payment: 100% as Advance',
      'Delivery: within 7 working days',
      'No. 120, 40 Feet Road, Phase 2, WOC Road, Opposite City Hospital, Manjunath Nagar, Bangalore - 560010',
      'Phone :9448151117'
    ]
  },
  {
    sheetName: 'ADITYA COMPUTER',
    vendorName: 'ADITYA COMPUTER',
    vendorAddress: '1080, 1ST Floor, 12th Cross, Kadandramapuram, Malleshwaram, Bengaluru-560003\nMob: 9342533253',
    quoteDate: '31.01.2026',
    clientName: 'International Institute of Business Studies',
    clientAddress: 'Bangalore',
    items: [
      {
        slNo: 1,
        product: 'Office 365',
        description: 'Office 365 with 1 TB Cloud Storage (1 year subscription)',
        hsn: '997331',
        quantity: 20,
        rate: 7700,
        total: 154000,
        gst: 27720,
        amount: 181720
      }
    ],
    totalAmount: 181720,
    amountInWords: 'Rupees One Lakh Eighty One Thousand Seven Hundred Twenty Only',
    deliveryTerms: 'Delivery: within 7 working days',
    terms: ['Taxes: All Inclusive', 'An electronic copy does not carry any signature.']
  },
  {
    sheetName: 'Sheet2',
    vendorName: 'SCS SAI COMPUTER SERVICES',
    vendorAddress: '20/4, 4th Cross, Ganesha Block, R.T. Nagar, Bangalore -560032\nPhone : 080 23434428   E-Mail : scs@net4india.com',
    quoteDate: '19.02.2026',
    clientName: 'International Institute of Business Studies',
    clientAddress: 'Bangalore',
    items: [
      { slNo: 1, product: 'AMD 3400G CPU', description: 'Processor', hsn: '8471', quantity: 5, rate: 8650, total: 43250, gst: 7785, amount: 51035 },
      { slNo: 2, product: 'Asus Mother Board', description: 'Motherboard', hsn: '8471', quantity: 5, rate: 5650, total: 28250, gst: 5085, amount: 33335 },
      { slNo: 3, product: '16 GB Ram EVM', description: 'RAM EVM DDR4', hsn: '8471', quantity: 5, rate: 9600, total: 48000, gst: 8640, amount: 56640 },
      { slNo: 4, product: '512GB SSD EVM', description: 'Solid State Drive', hsn: '8471', quantity: 5, rate: 6200, total: 31000, gst: 5580, amount: 36580 },
      { slNo: 5, product: '4 GB Zebronic card', description: 'Graphic Card', hsn: '8471', quantity: 5, rate: 5200, total: 26000, gst: 4680, amount: 30680 },
      { slNo: 6, product: 'cabinet Zebronic', description: 'Cabinet with fan', hsn: '8471', quantity: 5, rate: 2200, total: 11000, gst: 1980, amount: 12980 },
      { slNo: 7, product: '400watts SMPS', description: 'Power Supply', hsn: '8471', quantity: 5, rate: 1200, total: 6000, gst: 1080, amount: 7080 },
      { slNo: 8, product: '24 inch Display Dell', description: 'Dell 24 Full HD Monitor', hsn: '8528', quantity: 5, rate: 9500, total: 47500, gst: 8550, amount: 56050 },
      { slNo: 9, product: 'Dell keyboard', description: 'USB Keyboard', hsn: '8471', quantity: 5, rate: 850, total: 4250, gst: 765, amount: 5015 },
      { slNo: 10, product: 'Dell Mouse', description: 'Optical USB Mouse', hsn: '8471', quantity: 5, rate: 490, total: 2450, gst: 441, amount: 2891 }
    ],
    totalAmount: 292286,
    amountInWords: 'Rupees Two Lakh Ninety Two Thousand Two Hundred Eighty Six Only',
    deliveryTerms: 'Delivery: within 7 working days',
    terms: [
      'Taxes: All Inclusive',
      'Payment: 100% as Advance',
      'Delivery: within 7 working days',
      '20/4, 4th Cross, Ganesha Block, R.T. Nagar, Bangalore -560032',
      'Phone : 080 23434428   E-Mail : scs@net4india.com'
    ]
  }
];

function numberToWordsINR(num) {
  if (num === null || num === undefined || isNaN(num)) return '';
  num = Math.round(num);
  if (num === 0) return 'Zero';

  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
             'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n) {
    if (n < 20) return a[n];
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return b[tens] + (ones ? ' ' + a[ones] : '');
  }

  function convertThreeDigits(n) {
    let str = '';
    const hundreds = Math.floor(n / 100);
    const rest = n % 100;
    if (hundreds > 0) {
      str += a[hundreds] + ' Hundred';
      if (rest > 0) str += ' and ';
    }
    if (rest > 0) {
      str += convertTwoDigits(rest);
    }
    return str;
  }

  let words = '';
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;

  if (crore > 0) words += convertTwoDigits(crore) + ' Crore ';
  if (lakh > 0) words += convertTwoDigits(lakh) + ' Lakh ';
  if (thousand > 0) words += convertTwoDigits(thousand) + ' Thousand ';
  if (num > 0) words += convertThreeDigits(num);

  return 'Rupees ' + words.trim() + ' Only';
}

function parseQuotationExcel(excelPath = null) {
  const filePath = excelPath || resolveExcelPath();
  if (!filePath || !fs.existsSync(filePath)) {
    // Return embedded presets directly if file is not on the server
    return DEFAULT_PRESET_QUOTATIONS;
  }

  try {
    const wb = xlsx.readFile(filePath);
    const results = [];

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      if (!ws) continue;

      const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (!rows || rows.length === 0) continue;

      let vendorName = '';
      let vendorAddress = '';
      let quoteDate = '';
      let clientName = 'International Institute of Business Studies';
      let clientAddress = '';
      let items = [];
      let totalAmount = 0;
      let amountInWords = '';
      let deliveryTerms = 'within 7 working days';
      let terms = [];

      for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const row = rows[i] || [];
        const rowText = row.map(c => String(c).trim()).filter(Boolean).join(' ');

        if (i === 0 || i === 1) {
          for (let col = 0; col < row.length; col++) {
            const val = String(row[col] || '').trim();
            if (val && !vendorName && !val.toLowerCase().startsWith('to') && !val.toLowerCase().startsWith('date')) {
              vendorName = val;
              break;
            }
          }
        }

        if (i === 1 || i === 2) {
          for (let col = 0; col < row.length; col++) {
            const val = String(row[col] || '').trim();
            if (val && val !== vendorName && (val.includes('Bengaluru') || val.includes('Bangalore') || val.includes('Phone') || val.includes('Road') || val.includes('Floor') || val.includes('Sales'))) {
              vendorAddress = vendorAddress ? (vendorAddress + '\n' + val) : val;
            }
          }
        }

        for (let col = 0; col < row.length; col++) {
          const val = String(row[col] || '').trim();
          const dateMatch = val.match(/Date:\s*([0-9\.\-\/]+)/i);
          if (dateMatch) {
            quoteDate = dateMatch[1];
          }
        }

        if (rowText.includes('International Institute of Business Studies') || rowText.includes('IIBS')) {
          clientName = 'International Institute of Business Studies';
        }
        if (rowText.toLowerCase() === 'bangalore' || rowText.toLowerCase() === 'bengaluru') {
          clientAddress = 'Bangalore';
        }
      }

      if (!vendorName) {
        vendorName = sheetName;
      }

      let headerRowIdx = -1;
      let colMap = { slNo: -1, product: -1, desc: -1, hsn: -1, qty: -1, rate: -1, total: -1, gst: -1, amount: -1 };

      for (let r = 0; r < rows.length; r++) {
        const row = rows[r] || [];
        for (let c = 0; c < row.length; c++) {
          const cell = String(row[c] || '').trim().toLowerCase();
          if (cell === 'sl. no' || cell === 'sl no' || cell === 'slno' || cell === 's.no') {
            headerRowIdx = r;
            break;
          }
        }
        if (headerRowIdx !== -1) {
          for (let c = 0; c < row.length; c++) {
            const cell = String(row[c] || '').trim().toLowerCase();
            if (cell.includes('sl.') || cell.includes('sl no') || cell === 's.no') colMap.slNo = c;
            else if (cell.includes('product') || cell.includes('model') || cell.includes('item')) colMap.product = c;
            else if (cell.includes('desc')) colMap.desc = c;
            else if (cell.includes('hsn')) colMap.hsn = c;
            else if (cell.includes('qty')) colMap.qty = c;
            else if (cell.includes('rate') || cell.includes('price')) colMap.rate = c;
            else if (cell === 'total') colMap.total = c;
            else if (cell.includes('gst')) colMap.gst = c;
            else if (cell.includes('amount')) colMap.amount = c;
          }
          break;
        }
      }

      if (headerRowIdx !== -1) {
        for (let r = headerRowIdx + 1; r < rows.length; r++) {
          const row = rows[r] || [];
          const slVal = colMap.slNo !== -1 ? String(row[colMap.slNo] || '').trim() : '';
          const prodVal = colMap.product !== -1 ? String(row[colMap.product] || '').trim() : '';
          const rowStr = row.map(c => String(c).trim()).filter(Boolean).join(' ');

          if (rowStr.toLowerCase().includes('rupees:')) {
            amountInWords = rowStr.replace(/^.*rupees:/i, 'Rupees:').trim();
            continue;
          }
          if (rowStr.toLowerCase().includes('delivery:')) {
            deliveryTerms = rowStr.trim();
            continue;
          }
          if (rowStr.toLowerCase().includes('terms & conditions')) {
            for (let k = r + 1; k < rows.length; k++) {
              const tRow = (rows[k] || []).map(c => String(c).trim()).filter(Boolean).join(' ');
              if (tRow) terms.push(tRow);
            }
            break;
          }

          const isNumericSl = /^\d+$/.test(slVal);
          if (isNumericSl || (prodVal && !prodVal.toLowerCase().includes('total') && !prodVal.toLowerCase().includes('rupees') && !prodVal.toLowerCase().includes('signature'))) {
            const qty = Number(colMap.qty !== -1 ? row[colMap.qty] : 1) || 1;
            const rate = Number(colMap.rate !== -1 ? row[colMap.rate] : 0) || 0;
            const total = Number(colMap.total !== -1 ? row[colMap.total] : (qty * rate)) || (qty * rate);
            const gst = Number(colMap.gst !== -1 ? row[colMap.gst] : Math.round(total * 0.18)) || Math.round(total * 0.18);
            const amount = Number(colMap.amount !== -1 ? row[colMap.amount] : (total + gst)) || (total + gst);
            const desc = colMap.desc !== -1 ? String(row[colMap.desc] || '').trim() : '';
            const hsn = colMap.hsn !== -1 ? String(row[colMap.hsn] || '').trim() : '';

            items.push({
              slNo: items.length + 1,
              product: prodVal,
              description: desc,
              hsn: hsn,
              quantity: qty,
              rate: rate,
              total: total,
              gst: gst,
              amount: amount
            });
          }
        }
      }

      totalAmount = items.reduce((acc, item) => acc + (item.amount || 0), 0);
      if (!amountInWords && totalAmount > 0) {
        amountInWords = numberToWordsINR(totalAmount);
      }

      results.push({
        sheetName,
        vendorName,
        vendorAddress,
        quoteDate: quoteDate || '06.07.2026',
        clientName,
        clientAddress,
        items,
        totalAmount,
        amountInWords,
        deliveryTerms,
        terms
      });
    }

    return results.length > 0 ? results : DEFAULT_PRESET_QUOTATIONS;
  } catch (err) {
    console.warn('Fallback to presets on excel read error:', err.message);
    return DEFAULT_PRESET_QUOTATIONS;
  }
}

function generateQuotationPDF(quotation, res) {
  const doc = new PDFDocument({ margins: { top: 40, bottom: 40, left: 40, right: 40 }, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  const safeName = (quotation.vendorName || 'Vendor').replace(/[^a-zA-Z0-9_-]/g, '_');
  res.setHeader('Content-Disposition', 'inline; filename="Quotation_' + safeName + '.pdf"');

  doc.pipe(res);

  const pageWidth = doc.page.width;
  const leftMargin = 40;
  const rightMargin = pageWidth - 40;
  const contentWidth = rightMargin - leftMargin;

  doc.rect(leftMargin, 35, contentWidth, 65).fill('#1e293b');
  doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold')
     .text((quotation.vendorName || 'QUOTATION').toUpperCase(), leftMargin + 15, 45, { width: contentWidth - 30, align: 'left' });
  
  doc.fontSize(9).font('Helvetica').fillColor('#cbd5e1')
     .text(quotation.vendorAddress || '', leftMargin + 15, 68, { width: contentWidth - 30, lineGap: 2 });

  doc.y = 115;

  const yMeta = doc.y;
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b').text('To:', leftMargin, yMeta);
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(quotation.clientName || 'International Institute of Business Studies', leftMargin, yMeta + 14);
  if (quotation.clientAddress) {
    doc.font('Helvetica').fontSize(10).fillColor('#475569').text(quotation.clientAddress, leftMargin, yMeta + 28);
  }

  doc.font('Helvetica-Bold').fontSize(10).fillColor('#1e293b').text('Quotation Date:', rightMargin - 180, yMeta, { width: 180, align: 'right' });
  doc.font('Helvetica').fontSize(10).fillColor('#334155').text(quotation.quoteDate || new Date().toLocaleDateString('en-GB'), rightMargin - 180, yMeta + 14, { width: 180, align: 'right' });

  doc.y = yMeta + 50;
  doc.font('Helvetica').fontSize(10).fillColor('#334155')
     .text('Dear Sir,\n  Please find the enclosed offer for your kind perusal and consideration.', leftMargin, doc.y);

  doc.moveDown(1.2);

  const tableTop = doc.y;
  const cols = [
    { name: 'Sl', x: leftMargin, w: 30, align: 'center' },
    { name: 'Product / Model', x: leftMargin + 30, w: 180, align: 'left' },
    { name: 'Qty', x: leftMargin + 210, w: 45, align: 'center' },
    { name: 'Rate (INR)', x: leftMargin + 255, w: 70, align: 'right' },
    { name: 'Total (INR)', x: leftMargin + 325, w: 75, align: 'right' },
    { name: 'GST (INR)', x: leftMargin + 400, w: 55, align: 'right' },
    { name: 'Amount (INR)', x: leftMargin + 455, w: 60, align: 'right' }
  ];

  doc.rect(leftMargin, tableTop, contentWidth, 22).fill('#f1f5f9');
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9);
  cols.forEach(c => {
    doc.text(c.name, c.x + 3, tableTop + 6, { width: c.w - 6, align: c.align });
  });

  doc.moveTo(leftMargin, tableTop + 22).lineTo(rightMargin, tableTop + 22).strokeColor('#cbd5e1').lineWidth(1).stroke();

  let curY = tableTop + 23;
  doc.font('Helvetica').fontSize(9).fillColor('#1e293b');

  const items = quotation.items || [];
  items.forEach((it, idx) => {
    if (curY > doc.page.height - 130) {
      doc.addPage();
      curY = 50;
    }

    const rowBg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';
    doc.rect(leftMargin, curY, contentWidth, 24).fill(rowBg);
    doc.fillColor('#1e293b');

    doc.text(String(it.slNo || idx + 1), cols[0].x + 3, curY + 6, { width: cols[0].w - 6, align: cols[0].align });
    doc.text(it.product || it.description || '', cols[1].x + 3, curY + 6, { width: cols[1].w - 6, align: cols[1].align });
    doc.text(String(it.quantity || 1), cols[2].x + 3, curY + 6, { width: cols[2].w - 6, align: cols[2].align });
    doc.text(Number(it.rate || 0).toLocaleString('en-IN'), cols[3].x + 3, curY + 6, { width: cols[3].w - 6, align: cols[3].align });
    doc.text(Number(it.total || 0).toLocaleString('en-IN'), cols[4].x + 3, curY + 6, { width: cols[4].w - 6, align: cols[4].align });
    doc.text(Number(it.gst || 0).toLocaleString('en-IN'), cols[5].x + 3, curY + 6, { width: cols[5].w - 6, align: cols[5].align });
    doc.text(Number(it.amount || 0).toLocaleString('en-IN'), cols[6].x + 3, curY + 6, { width: cols[6].w - 6, align: cols[6].align });

    doc.moveTo(leftMargin, curY + 24).lineTo(rightMargin, curY + 24).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
    curY += 24;
  });

  doc.rect(leftMargin, curY, contentWidth, 24).fill('#e2e8f0');
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10);
  doc.text('Grand Total:', cols[0].x + 10, curY + 6, { width: 440, align: 'right' });
  doc.text('Rs. ' + Number(quotation.totalAmount || 0).toLocaleString('en-IN'), cols[6].x + 3, curY + 6, { width: cols[6].w - 6, align: cols[6].align });

  curY += 34;

  if (quotation.amountInWords) {
    doc.rect(leftMargin, curY, contentWidth, 24).fill('#f1f5f9');
    doc.fillColor('#334155').font('Helvetica-Bold').fontSize(9)
       .text(quotation.amountInWords, leftMargin + 10, curY + 6, { width: contentWidth - 20 });
    curY += 32;
  }

  doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text('Terms & Conditions:', leftMargin, curY);
  curY += 14;
  doc.font('Helvetica').fontSize(9).fillColor('#475569');
  if (quotation.deliveryTerms) {
    doc.text('- ' + quotation.deliveryTerms, leftMargin + 10, curY);
    curY += 14;
  }
  if (quotation.terms && Array.isArray(quotation.terms)) {
    quotation.terms.forEach(t => {
      doc.text('- ' + t, leftMargin + 10, curY);
      curY += 13;
    });
  }

  curY += 15;
  doc.font('Helvetica-Oblique').fontSize(8).fillColor('#64748b')
     .text('An electronic copy does not carry any signature.', leftMargin, curY, { align: 'center', width: contentWidth });

  doc.end();
}

function appendQuotationToExcel(quotation, excelPath = null) {
  const filePath = excelPath || resolveExcelPath();
  if (!filePath) return null;

  try {
    let wb;
    if (fs.existsSync(filePath)) {
      wb = xlsx.readFile(filePath);
    } else {
      wb = xlsx.utils.book_new();
    }

    let sheetName = (quotation.vendorName || 'Quotation').substring(0, 30).trim();
    let uniqueSheetName = sheetName;
    let counter = 1;
    while (wb.SheetNames.includes(uniqueSheetName)) {
      uniqueSheetName = (sheetName.substring(0, 26) + '_' + (counter++));
    }

    const rows = [
      ['', quotation.vendorName || ''],
      ['', quotation.vendorAddress || ''],
      ['', '', '', '', 'Date: ' + (quotation.quoteDate || '')],
      ['', 'To, '],
      ['', quotation.clientName || 'International Institute of Business Studies'],
      ['', quotation.clientAddress || 'Bangalore'],
      ['', 'Dear Sir /'],
      ['', ' Please find the enclosed offer for your kind perusal and consideration.'],
      ['', 'Sl. No', 'Product / Model', 'Qty', 'Rate', 'Total', 'GST %', 'Amount']
    ];

    (quotation.items || []).forEach((it, idx) => {
      rows.push([
        '',
        idx + 1,
        it.product || '',
        it.quantity || 1,
        it.rate || 0,
        it.total || 0,
        it.gst || 0,
        it.amount || 0
      ]);
    });

    rows.push(['', quotation.amountInWords || '']);
    rows.push(['', quotation.deliveryTerms || 'Delivery: within 7 working days']);
    rows.push(['', 'An electronic copy does not carry any signature.']);

    const ws = xlsx.utils.aoa_to_sheet(rows);
    xlsx.utils.book_append_sheet(wb, ws, uniqueSheetName);
    xlsx.writeFile(wb, filePath);

    return uniqueSheetName;
  } catch (err) {
    console.warn('Could not append sheet to Excel:', err.message);
    return null;
  }
}

module.exports = {
  parseQuotationExcel,
  generateQuotationPDF,
  appendQuotationToExcel,
  numberToWordsINR,
  DEFAULT_PRESET_QUOTATIONS
};
