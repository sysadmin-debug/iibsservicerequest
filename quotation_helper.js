const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const PDFDocument = require('pdfkit');

const PROJECT_EXCEL_PATH = path.join(__dirname, 'Quotation.xlsx');
const LOCAL_EXCEL_PATH = 'D:\\Local Disk F_4282023147\\New folder\\Quotation\\Quotation.xlsx';

function resolveExcelPath() {
  if (fs.existsSync(PROJECT_EXCEL_PATH)) return PROJECT_EXCEL_PATH;
  if (fs.existsSync(LOCAL_EXCEL_PATH)) return LOCAL_EXCEL_PATH;
  return null;
}

const DEFAULT_PRESET_QUOTATIONS = [
  {
    sheetName: 'Mangala It',
    vendorName: 'Mangala IT Solutions',
    vendorAddress: '#970, L.I.G , 2nd Stage, 16th B Cross Rd, Housing Board Colony, Yelahanka New Town, Bengaluru, Karnataka 560064\nPhone: 078993 40027',
    quoteDate: '06.07.2026',
    clientName: 'International Institute of Business Studies',
    clientAddress: 'Bangalore',
    items: [
      { slNo: 1, product: 'Epson 13310 Printer Ink Tank Printer', description: 'Ink Tank Printer', hsn: '8443', quantity: 2, rate: 11750, total: 23500, gst: 4230, amount: 27730 },
      { slNo: 2, product: 'Canon LBP 3010B Multi Function Printer (Print, Scan & Copy)', description: 'Multi Function Printer', hsn: '8443', quantity: 1, rate: 17800, total: 17800, gst: 3204, amount: 21004 }
    ],
    totalAmount: 48734,
    amountInWords: 'Rupees Thirty Two Thousand Eight Hundred Four Only',
    deliveryTerms: 'Delivery: within 7 working days',
    terms: ['An electronic copy does not carry any signature.']
  },
  {
    sheetName: 'GDS Techno Service',
    vendorName: 'GDS Techno Service',
    vendorAddress: 'No. 120, 40 Feet Road, Phase 2, WOC Road, Opposite City Hospital, Manjunath Nagar, Bangalore - 560010\nPhone: 9448151117',
    quoteDate: '06.07.2026',
    clientName: 'International Institute of Business Studies',
    clientAddress: 'Bangalore',
    items: [
      { slNo: 1, product: 'Gobbler Cash Counting Machine', description: 'Cash Counting Machine', hsn: '8472', quantity: 1, rate: 10800, total: 10800, gst: 1944, amount: 12744 }
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
    clientName: 'IIBS',
    clientAddress: 'Bangalore',
    items: [
      { slNo: 1, product: 'Office 365', description: 'office 365 with 1 TB Cloud Storage (1 year)', hsn: '997331', quantity: 20, rate: 7700, total: 154000, gst: 27720, amount: 181720 }
    ],
    totalAmount: 181720,
    amountInWords: 'Rupees One Lakh Eighty One Thousand Seven Hundred Twenty Only',
    deliveryTerms: 'Delivery: within 7 working days',
    terms: ['An electronic copy does not carry any signature.']
  },
  {
    sheetName: 'Sheet2',
    vendorName: 'SCS SAI COMPUTER SERVICES',
    vendorAddress: 'Sales, Service, Networking & Maintenance of Computer Peripherals\n20/4, 4th Cross, Ganesha Block, R.T. Nagar, Bangalore -560032\nPhone : 080 23434428   E-Mail : scs@net4india.com',
    quoteDate: '19.02.2026',
    clientName: 'International Institute of Business Studies',
    clientAddress: 'Bangalore',
    items: [
      { slNo: 1, product: 'AMD 3400G CPU', description: 'Processor', hsn: '8471', quantity: 5, rate: 8650, total: 43250, gst: 7785, amount: 51035 },
      { slNo: 2, product: 'Asus Mother Board', description: 'Motherboard', hsn: '8471', quantity: 5, rate: 5650, total: 28250, gst: 5085, amount: 33335 },
      { slNo: 3, product: '16 GB Ram EVM', description: 'RAM EVM', hsn: '8471', quantity: 5, rate: 9600, total: 48000, gst: 8640, amount: 56640 },
      { slNo: 4, product: '512GB SSD EVM', description: 'SSD Drive', hsn: '8471', quantity: 5, rate: 6200, total: 31000, gst: 5580, amount: 36580 },
      { slNo: 5, product: '4 GB Zebronic card', description: 'Graphic Card', hsn: '8471', quantity: 5, rate: 5200, total: 26000, gst: 4680, amount: 30680 },
      { slNo: 6, product: 'cabinet Zebronic', description: 'Zebronic Cabinet', hsn: '8471', quantity: 5, rate: 2200, total: 11000, gst: 1980, amount: 12980 },
      { slNo: 7, product: '400watts SMPS', description: 'SMPS Power Supply', hsn: '8471', quantity: 5, rate: 1200, total: 6000, gst: 1080, amount: 7080 },
      { slNo: 8, product: '24 inch Display Dell', description: 'Dell Monitor', hsn: '8528', quantity: 5, rate: 9500, total: 47500, gst: 8550, amount: 56050 },
      { slNo: 9, product: 'Dell keyboard', description: 'USB Keyboard', hsn: '8471', quantity: 5, rate: 850, total: 4250, gst: 765, amount: 5015 },
      { slNo: 10, product: 'Dell Mouse', description: 'USB Optical Mouse', hsn: '8471', quantity: 5, rate: 490, total: 2450, gst: 441, amount: 2891 }
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
    return DEFAULT_PRESET_QUOTATIONS;
  }
}

// Custom letterhead / styling per company
function getCompanyStyle(vName = '') {
  const v = (vName || '').toLowerCase();
  if (v.includes('mangala')) {
    return {
      type: 'mangala',
      primaryColor: '#1e3a8a', // Royal Blue
      accentColor: '#dbeafe',
      headerAlign: 'center',
      borderStyle: 'solid',
      tableHeaderBg: '#1e3a8a',
      tableHeaderColor: '#ffffff',
      hasDescCol: true,
      hasHsnCol: false
    };
  } else if (v.includes('gds')) {
    return {
      type: 'gds',
      primaryColor: '#047857', // Emerald Green
      accentColor: '#d1fae5',
      headerAlign: 'left',
      borderStyle: 'minimal',
      tableHeaderBg: '#047857',
      tableHeaderColor: '#ffffff',
      hasDescCol: true,
      hasHsnCol: false
    };
  } else if (v.includes('aditya')) {
    return {
      type: 'aditya',
      primaryColor: '#b45309', // Warm Amber / Bronze
      accentColor: '#fef3c7',
      headerAlign: 'left',
      borderStyle: 'grid',
      tableHeaderBg: '#78350f',
      tableHeaderColor: '#ffffff',
      hasDescCol: true,
      hasHsnCol: true
    };
  } else if (v.includes('scs') || v.includes('sai')) {
    return {
      type: 'scs',
      primaryColor: '#4338ca', // Indigo
      accentColor: '#e0e7ff',
      headerAlign: 'center',
      borderStyle: 'boxed',
      tableHeaderBg: '#3730a3',
      tableHeaderColor: '#ffffff',
      hasDescCol: true,
      hasHsnCol: false
    };
  }
  // Default clean style for custom companies
  return {
    type: 'standard',
    primaryColor: '#1e293b',
    accentColor: '#f1f5f9',
    headerAlign: 'left',
    borderStyle: 'clean',
    tableHeaderBg: '#1e293b',
    tableHeaderColor: '#ffffff',
    hasDescCol: true,
    hasHsnCol: false
  };
}

function generateQuotationPDF(quotation, res) {
  // Balanced margins for professional full-page A4 document
  const doc = new PDFDocument({ margins: { top: 40, bottom: 40, left: 40, right: 40 }, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  const safeName = (quotation.vendorName || 'Vendor').replace(/[^a-zA-Z0-9_-]/g, '_');
  res.setHeader('Content-Disposition', 'inline; filename="Quotation_' + safeName + '.pdf"');

  doc.pipe(res);

  const style = getCompanyStyle(quotation.vendorName);
  const pageWidth = doc.page.width;
  const leftMargin = 40;
  const rightMargin = pageWidth - 40;
  const contentWidth = rightMargin - leftMargin;

  // ================= COMPANY HEADER (DISTINCT PER COMPANY) =================
  if (style.type === 'mangala') {
    doc.fillColor(style.primaryColor).fontSize(23).font('Helvetica-Bold')
       .text(quotation.vendorName.toUpperCase(), leftMargin, 45, { align: 'center', width: contentWidth });
    doc.fillColor('#475569').fontSize(10).font('Helvetica')
       .text(quotation.vendorAddress || '', leftMargin + 20, 76, { align: 'center', width: contentWidth - 40, lineGap: 3 });

    const sepY = doc.y + 14;
    doc.moveTo(leftMargin, sepY).lineTo(rightMargin, sepY).strokeColor(style.primaryColor).lineWidth(2).stroke();
    doc.moveTo(leftMargin, sepY + 4).lineTo(rightMargin, sepY + 4).strokeColor('#93c5fd').lineWidth(0.8).stroke();
    doc.y = sepY + 22;

  } else if (style.type === 'gds') {
    doc.rect(leftMargin, 40, 8, 65).fill(style.primaryColor);
    doc.fillColor(style.primaryColor).fontSize(22).font('Helvetica-Bold')
       .text(quotation.vendorName, leftMargin + 18, 44);
    doc.fillColor('#475569').fontSize(9.5).font('Helvetica')
       .text(quotation.vendorAddress || '', leftMargin + 18, 74, { width: contentWidth - 120, lineGap: 3 });

    doc.rect(rightMargin - 120, 44, 120, 28).fill(style.accentColor);
    doc.fillColor(style.primaryColor).fontSize(11).font('Helvetica-Bold')
       .text('QUOTATION', rightMargin - 120, 52, { width: 120, align: 'center' });

    doc.y = 120;
    doc.moveTo(leftMargin, 120).lineTo(rightMargin, 120).strokeColor('#e2e8f0').lineWidth(1.5).stroke();
    doc.y = 135;

  } else if (style.type === 'aditya') {
    doc.rect(leftMargin, 40, contentWidth, 68).fill('#fef3c7');
    doc.rect(leftMargin, 40, 6, 68).fill('#b45309');
    doc.fillColor('#78350f').fontSize(22).font('Helvetica-Bold')
       .text(quotation.vendorName, leftMargin + 18, 48);
    doc.fillColor('#92400e').fontSize(10).font('Helvetica')
       .text(quotation.vendorAddress || '', leftMargin + 18, 76, { lineGap: 3 });

    doc.y = 130;

  } else if (style.type === 'scs') {
    doc.rect(leftMargin, 40, contentWidth, 75).fill('#312e81');
    doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold')
       .text(quotation.vendorName, leftMargin, 48, { align: 'center', width: contentWidth });
    doc.fillColor('#c7d2fe').fontSize(10).font('Helvetica')
       .text(quotation.vendorAddress || '', leftMargin + 15, 75, { align: 'center', width: contentWidth - 30, lineGap: 3 });

    doc.y = 135;

  } else {
    doc.rect(leftMargin, 40, contentWidth, 70).fill(style.primaryColor);
    doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold')
       .text((quotation.vendorName || 'QUOTATION').toUpperCase(), leftMargin + 18, 52, { width: contentWidth - 36 });
    doc.fontSize(10).font('Helvetica').fillColor('#cbd5e1')
       .text(quotation.vendorAddress || '', leftMargin + 18, 78, { width: contentWidth - 36 });
    doc.y = 130;
  }

  // ================= METADATA (TO / DATE) =================
  const metaY = doc.y;
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e293b').text('To,', leftMargin, metaY);
  doc.fontSize(12).font('Helvetica-Bold').fillColor(style.primaryColor)
     .text(quotation.clientName || 'International Institute of Business Studies', leftMargin, metaY + 16);
  if (quotation.clientAddress) {
    doc.font('Helvetica').fontSize(10).fillColor('#64748b').text(quotation.clientAddress, leftMargin, metaY + 33);
  }

  // Right-aligned Date Box
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e293b')
     .text('Date: ' + (quotation.quoteDate || new Date().toLocaleDateString('en-GB')), rightMargin - 180, metaY, { width: 180, align: 'right' });

  doc.y = metaY + 58;
  doc.font('Helvetica').fontSize(10.5).fillColor('#334155')
     .text('Dear Sir,\n  Please find the enclosed offer for your kind perusal and consideration.', leftMargin, doc.y);

  doc.moveDown(1.5);

  // ================= ITEMS TABLE (GENEROUS FULL A4 PROPORTIONS) =================
  const tableTop = doc.y;
  const items = quotation.items || [];
  const isAditya = style.type === 'aditya';
  const hasAnyDesc = items.some(it => it.description && String(it.description).trim());
  const showDescCol = isAditya || style.hasDescCol || hasAnyDesc;

  const cols = showDescCol ? [
    { name: 'Sl. No', x: leftMargin, w: 30, align: 'center' },
    { name: 'Product / Model', x: leftMargin + 30, w: 118, align: 'left' },
    { name: 'Description', x: leftMargin + 148, w: 124, align: 'left' },
    { name: 'Qty', x: leftMargin + 272, w: 30, align: 'center' },
    { name: 'Rate (Rs)', x: leftMargin + 302, w: 50, align: 'right' },
    { name: 'Total (Rs)', x: leftMargin + 352, w: 54, align: 'right' },
    { name: 'GST', x: leftMargin + 406, w: 42, align: 'right' },
    { name: 'Amount (Rs)', x: leftMargin + 448, w: contentWidth - 448, align: 'right' }
  ] : [
    { name: 'Sl. No', x: leftMargin, w: 45, align: 'center' },
    { name: 'Product / Model', x: leftMargin + 45, w: 195, align: 'left' },
    { name: 'Qty', x: leftMargin + 240, w: 45, align: 'center' },
    { name: 'Rate (Rs)', x: leftMargin + 285, w: 65, align: 'right' },
    { name: 'Total (Rs)', x: leftMargin + 350, w: 65, align: 'right' },
    { name: 'GST (Rs)', x: leftMargin + 415, w: 50, align: 'right' },
    { name: 'Amount (Rs)', x: leftMargin + 465, w: contentWidth - 465, align: 'right' }
  ];

  // Calculate dynamic comfortable row height so small tables expand to fill the A4 page
  const targetRowHeight = items.length <= 3 ? 40 : (items.length <= 6 ? 34 : 28);

  // Table Header Background
  doc.rect(leftMargin, tableTop, contentWidth, 26).fill(style.tableHeaderBg);
  doc.fillColor(style.tableHeaderColor).font('Helvetica-Bold').fontSize(9.5);
  cols.forEach(c => {
    doc.text(c.name, c.x + 2, tableTop + 8, { width: c.w - 4, align: c.align });
  });

  let curY = tableTop + 26;

  items.forEach((it, idx) => {
    const prodText = it.product || (!showDescCol ? (it.description || '') : '');
    const descText = it.description || '';

    // Calculate height needed for multiline texts
    doc.fontSize(9.5).font('Helvetica');
    const prodHeight = prodText ? doc.heightOfString(prodText, { width: cols[1].w - 4 }) : 12;
    const descHeight = (showDescCol && descText) ? doc.heightOfString(descText, { width: cols[2].w - 4 }) : 12;
    const textBlockHeight = Math.max(prodHeight, descHeight, 14);
    const rowHeight = Math.max(targetRowHeight, textBlockHeight + 10);

    if (curY + rowHeight > doc.page.height - 100) {
      doc.addPage();
      curY = 40;
    }

    const rowBg = idx % 2 === 1 ? style.accentColor : '#ffffff';
    doc.rect(leftMargin, curY, contentWidth, rowHeight).fill(rowBg);
    doc.fillColor('#1e293b');

    const numPadTop = Math.max(4, (rowHeight - 12) / 2);
    const textPadTop = Math.max(4, (rowHeight - textBlockHeight) / 2);

    // Sl. No
    doc.text(String(it.slNo || idx + 1), cols[0].x + 2, curY + numPadTop, { width: cols[0].w - 4, align: cols[0].align });
    // Product / Model
    doc.text(prodText, cols[1].x + 2, curY + textPadTop, { width: cols[1].w - 4, align: cols[1].align });

    if (showDescCol) {
      // Description
      doc.text(descText, cols[2].x + 2, curY + textPadTop, { width: cols[2].w - 4, align: cols[2].align });
      // Qty
      doc.text(String(it.quantity || 1), cols[3].x + 2, curY + numPadTop, { width: cols[3].w - 4, align: cols[3].align });
      // Rate
      doc.text(Number(it.rate || 0).toLocaleString('en-IN'), cols[4].x + 2, curY + numPadTop, { width: cols[4].w - 4, align: cols[4].align });
      // Total
      doc.text(Number(it.total || 0).toLocaleString('en-IN'), cols[5].x + 2, curY + numPadTop, { width: cols[5].w - 4, align: cols[5].align });
      // GST
      doc.text(Number(it.gst || 0).toLocaleString('en-IN'), cols[6].x + 2, curY + numPadTop, { width: cols[6].w - 4, align: cols[6].align });
      // Amount
      doc.text(Number(it.amount || 0).toLocaleString('en-IN'), cols[7].x + 2, curY + numPadTop, { width: cols[7].w - 4, align: cols[7].align });
    } else {
      // Qty
      doc.text(String(it.quantity || 1), cols[2].x + 2, curY + numPadTop, { width: cols[2].w - 4, align: cols[2].align });
      // Rate
      doc.text(Number(it.rate || 0).toLocaleString('en-IN'), cols[3].x + 2, curY + numPadTop, { width: cols[3].w - 4, align: cols[3].align });
      // Total
      doc.text(Number(it.total || 0).toLocaleString('en-IN'), cols[4].x + 2, curY + numPadTop, { width: cols[4].w - 4, align: cols[4].align });
      // GST
      doc.text(Number(it.gst || 0).toLocaleString('en-IN'), cols[5].x + 2, curY + numPadTop, { width: cols[5].w - 4, align: cols[5].align });
      // Amount
      doc.text(Number(it.amount || 0).toLocaleString('en-IN'), cols[6].x + 2, curY + numPadTop, { width: cols[6].w - 4, align: cols[6].align });
    }

    doc.moveTo(leftMargin, curY + rowHeight).lineTo(rightMargin, curY + rowHeight).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
    curY += rowHeight;
  });

  // Grand Total Summary Row
  doc.rect(leftMargin, curY, contentWidth, 28).fill('#e2e8f0');
  doc.fillColor(style.primaryColor).font('Helvetica-Bold').fontSize(10.5);
  doc.text('Grand Total:', leftMargin + 10, curY + 8, { width: contentWidth - 130, align: 'right' });
  doc.text('Rs. ' + Number(quotation.totalAmount || 0).toLocaleString('en-IN'), rightMargin - 115, curY + 8, { width: 110, align: 'right' });

  curY += 38;

  // Amount in Words
  if (quotation.amountInWords) {
    doc.rect(leftMargin, curY, contentWidth, 28).fill('#f8fafc');
    doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(10)
       .text(quotation.amountInWords, leftMargin + 12, curY + 8, { width: contentWidth - 24 });
    curY += 38;
  }

  // Filter out duplicate disclaimer from terms
  const cleanTerms = (quotation.terms && Array.isArray(quotation.terms))
    ? quotation.terms.filter(t => !t.toLowerCase().includes('electronic copy'))
    : [];

  // Terms & Conditions / Delivery Footer
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text('Terms & Conditions:', leftMargin, curY);
  curY += 16;
  doc.font('Helvetica').fontSize(9.5).fillColor('#334155');
  if (quotation.deliveryTerms) {
    doc.text('• ' + quotation.deliveryTerms, leftMargin + 12, curY);
    curY += 16;
  }
  cleanTerms.forEach(t => {
    doc.text('• ' + t, leftMargin + 12, curY);
    curY += 15;
  });

  // Position disclaimer towards bottom of the A4 page
  const footerY = Math.max(curY + 25, doc.page.height - 55);
  doc.font('Helvetica-Oblique').fontSize(8.5).fillColor('#64748b')
     .text('An electronic copy does not carry any signature.', leftMargin, footerY, { align: 'center', width: contentWidth });

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
    return null;
  }
}

module.exports = {
  parseQuotationExcel,
  generateQuotationPDF,
  appendQuotationToExcel,
  numberToWordsINR,
  DEFAULT_PRESET_QUOTATIONS,
  getCompanyStyle
};
