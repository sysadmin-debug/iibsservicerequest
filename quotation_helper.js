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
      primaryColor: '#002060', // Deep Navy Corporate
      titleColor: '#002060',
      fontFamily: 'Helvetica-Bold',
      headerLayout: 'letterhead_line',
      hasDescCol: false,
      hasHsnCol: false
    };
  } else if (v.includes('gds')) {
    return {
      type: 'gds',
      primaryColor: '#000000',
      titleColor: '#000000',
      fontFamily: 'Helvetica-Bold',
      headerLayout: 'standard_top',
      hasDescCol: false,
      hasHsnCol: false
    };
  } else if (v.includes('aditya')) {
    return {
      type: 'aditya',
      primaryColor: '#e00000', // Iconic Aditya red title
      titleColor: '#d60000',
      fontFamily: 'Helvetica-Bold',
      headerLayout: 'letterhead_line',
      hasDescCol: true,
      hasHsnCol: true
    };
  } else if (v.includes('scs') || v.includes('sai')) {
    return {
      type: 'scs',
      primaryColor: '#d60000',
      titleColor: '#d60000',
      fontFamily: 'Helvetica-Bold',
      headerLayout: 'scs_boxed',
      hasDescCol: false,
      hasHsnCol: false
    };
  } else if (v.includes('best')) {
    return {
      type: 'best',
      primaryColor: '#d60000',
      titleColor: '#d60000',
      fontFamily: 'Helvetica-Bold',
      headerLayout: 'letterhead_line',
      hasDescCol: true,
      hasHsnCol: true
    };
  }
  // Default clean corporate style
  return {
    type: 'standard',
    primaryColor: '#1e293b',
    titleColor: '#1e293b',
    fontFamily: 'Helvetica-Bold',
    headerLayout: 'letterhead_line',
    hasDescCol: false,
    hasHsnCol: false
  };
}

function generateQuotationPDF(quotation, res) {
  // Exact standard A4 dimensions: 595.28 x 841.89 points
  // Use exact professional margins (left: 45, right: 45, top: 40, bottom: 40)
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 40, bottom: 40, left: 45, right: 45 },
    autoFirstPage: true
  });

  if (res.setHeader) {
    res.setHeader('Content-Type', 'application/pdf');
    const safeName = (quotation.vendorName || 'Vendor').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Disposition', 'inline; filename="Quotation_' + safeName + '.pdf"');
  }

  doc.pipe(res);

  const style = getCompanyStyle(quotation.vendorName);
  const left = 45;
  const right = doc.page.width - 45;
  const contentWidth = right - left; // 505.28 pt

  // ================= 1. VENDOR LETTERHEAD =================
  let y = 45;

  if (style.headerLayout === 'scs_boxed') {
    // SCS Sai Computer Services layout with outer top box
    doc.rect(left, y, contentWidth, 54).lineWidth(1.2).strokeColor('#000000').stroke();
    doc.fillColor(style.titleColor).font('Helvetica-Bold').fontSize(22)
       .text(quotation.vendorName.toUpperCase(), left, y + 8, { align: 'center', width: contentWidth });
    
    // Sub-title
    y += 58;
    const subTitle = quotation.vendorAddress ? quotation.vendorAddress.split('\n')[0] : 'Sales, Service, Networking & Maintenance of Computer Peripherals';
    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(10)
       .text(subTitle, left, y, { align: 'center', width: contentWidth });
    y += 18;
  } else {
    // Standard Letterhead: Centered / Distinct Company Title + Address + Full Divider Line
    doc.fillColor(style.titleColor).font('Helvetica-Bold').fontSize(22)
       .text(quotation.vendorName.toUpperCase(), left, y, { align: 'center', width: contentWidth });
    
    y = doc.y + 3;
    if (quotation.vendorAddress) {
      doc.fillColor('#000000').font('Helvetica').fontSize(9)
         .text(quotation.vendorAddress, left + 10, y, { align: 'center', width: contentWidth - 20, lineGap: 2 });
      y = doc.y + 8;
    } else {
      y += 8;
    }

    // Horizontal Rule separating Header
    doc.moveTo(left, y).lineTo(right, y).lineWidth(1.2).strokeColor('#000000').stroke();
    y += 12;
  }

  // ================= 2. METADATA: DATE & CLIENT INFO =================
  const dateStr = 'Date: ' + (quotation.quoteDate || new Date().toLocaleDateString('en-GB'));
  doc.fillColor('#000000').font('Helvetica').fontSize(9.5)
     .text(dateStr, left, y, { align: 'right', width: contentWidth });

  y += 6;
  doc.font('Helvetica').fontSize(9.5).fillColor('#000000');
  doc.text('To,', left, y);
  y += 13;
  doc.font('Helvetica-Bold').text(quotation.clientName || 'International Institute of Business Studies', left, y);
  y += 13;
  if (quotation.clientAddress) {
    doc.font('Helvetica').text(quotation.clientAddress, left, y);
    y += 13;
  }

  y += 6;
  doc.font('Helvetica').text('Dear Sir,', left, y);
  y += 13;
  doc.text(' Please find the enclosed offer for your kind perusal and consideration.', left, y);
  y += 18;

  // ================= 3. PROFESSIONAL DATA GRID TABLE =================
  const isAditya = style.hasDescCol || Boolean(quotation.items && quotation.items.some(it => it.description && it.description !== it.product));

  // Define Columns and precise widths summing exactly to contentWidth (505)
  // [Sl, Product, (Desc), (HSN), Qty, Rate, Total, GST, Amount]
  let columns = [];
  if (isAditya) {
    columns = [
      { id: 'slNo', title: 'Sl. No', w: 38, align: 'center' },
      { id: 'product', title: 'Product / Model', w: 122, align: 'left' },
      { id: 'desc', title: 'Description', w: 105, align: 'left' },
      { id: 'hsn', title: 'HSN', w: 40, align: 'center' },
      { id: 'qty', title: 'Qty', w: 32, align: 'center' },
      { id: 'rate', title: 'Rate', w: 44, align: 'right' },
      { id: 'total', title: 'Total', w: 44, align: 'right' },
      { id: 'gst', title: 'GST %', w: 36, align: 'right' },
      { id: 'amount', title: 'Amount', w: 44, align: 'right' }
    ];
  } else {
    columns = [
      { id: 'slNo', title: 'Sl. No', w: 45, align: 'center' },
      { id: 'product', title: 'Product / Model', w: 190, align: 'left' },
      { id: 'qty', title: 'Qty', w: 42, align: 'center' },
      { id: 'rate', title: 'Rate', w: 56, align: 'right' },
      { id: 'total', title: 'Total', w: 56, align: 'right' },
      { id: 'gst', title: 'GST %', w: 56, align: 'right' },
      { id: 'amount', title: 'Amount', w: 60, align: 'right' }
    ];
  }

  // Adjust last column to snap perfectly to right edge
  const curTotalW = columns.reduce((s, c) => s + c.w, 0);
  columns[columns.length - 1].w += (contentWidth - curTotalW);

  // Compute X coordinates
  let currentX = left;
  columns.forEach(col => {
    col.x = currentX;
    currentX += col.w;
  });

  const tableTop = y;
  const headerHeight = 22;

  // Header Row
  doc.rect(left, tableTop, contentWidth, headerHeight).lineWidth(1.2).strokeColor('#000000').stroke();
  doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9);

  // Vertical separators in header
  for (let i = 1; i < columns.length; i++) {
    doc.moveTo(columns[i].x, tableTop).lineTo(columns[i].x, tableTop + headerHeight).lineWidth(1).strokeColor('#000000').stroke();
  }

  columns.forEach(col => {
    doc.text(col.title, col.x + 2, tableTop + 6, { width: col.w - 4, align: col.align });
  });

  let rowY = tableTop + headerHeight;
  const items = quotation.items || [];
  
  // Render Item Rows
  items.forEach((it, idx) => {
    // Measure required height based on text wrap
    doc.font('Helvetica').fontSize(9);
    let cellHeight = 22;
    
    // Check product text height
    const prodHeight = doc.heightOfString(it.product || '', { width: columns[1].w - 6 });
    if (prodHeight + 8 > cellHeight) cellHeight = Math.ceil(prodHeight + 8);

    if (isAditya) {
      const descHeight = doc.heightOfString(it.description || '', { width: columns[2].w - 6 });
      if (descHeight + 8 > cellHeight) cellHeight = Math.ceil(descHeight + 8);
    }

    // Outer row box
    doc.rect(left, rowY, contentWidth, cellHeight).lineWidth(1).strokeColor('#000000').stroke();

    // Column divider lines
    for (let i = 1; i < columns.length; i++) {
      doc.moveTo(columns[i].x, rowY).lineTo(columns[i].x, rowY + cellHeight).lineWidth(1).strokeColor('#000000').stroke();
    }

    const padY = rowY + 5;

    // Sl No
    doc.text(String(it.slNo || idx + 1), columns[0].x + 2, padY, { width: columns[0].w - 4, align: columns[0].align });

    // Product / Model
    doc.text(it.product || '', columns[1].x + 3, padY, { width: columns[1].w - 6, align: columns[1].align });

    if (isAditya) {
      // Description
      doc.text(it.description || '', columns[2].x + 3, padY, { width: columns[2].w - 6, align: columns[2].align });
      // HSN
      doc.text(String(it.hsn || ''), columns[3].x + 2, padY, { width: columns[3].w - 4, align: columns[3].align });
      // Qty
      doc.text(String(it.quantity || 1), columns[4].x + 2, padY, { width: columns[4].w - 4, align: columns[4].align });
      // Rate
      doc.text(Number(it.rate || 0).toLocaleString('en-IN'), columns[5].x + 2, padY, { width: columns[5].w - 4, align: columns[5].align });
      // Total
      doc.text(Number(it.total || 0).toLocaleString('en-IN'), columns[6].x + 2, padY, { width: columns[6].w - 4, align: columns[6].align });
      // GST %
      doc.text(Number(it.gst || 0).toLocaleString('en-IN'), columns[7].x + 2, padY, { width: columns[7].w - 4, align: columns[7].align });
      // Amount
      doc.text(Number(it.amount || 0).toLocaleString('en-IN'), columns[8].x + 2, padY, { width: columns[8].w - 4, align: columns[8].align });
    } else {
      // Qty
      doc.text(String(it.quantity || 1), columns[2].x + 2, padY, { width: columns[2].w - 4, align: columns[2].align });
      // Rate
      doc.text(Number(it.rate || 0).toLocaleString('en-IN'), columns[3].x + 2, padY, { width: columns[3].w - 4, align: columns[3].align });
      // Total
      doc.text(Number(it.total || 0).toLocaleString('en-IN'), columns[4].x + 2, padY, { width: columns[4].w - 4, align: columns[4].align });
      // GST
      doc.text(Number(it.gst || 0).toLocaleString('en-IN'), columns[5].x + 2, padY, { width: columns[5].w - 4, align: columns[5].align });
      // Amount
      doc.text(Number(it.amount || 0).toLocaleString('en-IN'), columns[6].x + 2, padY, { width: columns[6].w - 4, align: columns[6].align });
    }

    rowY += cellHeight;
  });

  // Render blank grid rows to replicate the classic full A4 commercial format (target ~9 total rows)
  const emptyRowsNeeded = Math.max(0, 9 - items.length);
  const emptyRowHeight = 22;
  for (let e = 0; e < emptyRowsNeeded; e++) {
    doc.rect(left, rowY, contentWidth, emptyRowHeight).lineWidth(1).strokeColor('#000000').stroke();
    for (let i = 1; i < columns.length; i++) {
      doc.moveTo(columns[i].x, rowY).lineTo(columns[i].x, rowY + emptyRowHeight).lineWidth(1).strokeColor('#000000').stroke();
    }
    rowY += emptyRowHeight;
  }

  // ================= 4. GRAND TOTAL ROW & AMOUNT IN WORDS =================
  const totalRowHeight = 24;
  doc.rect(left, rowY, contentWidth, totalRowHeight).lineWidth(1.2).strokeColor('#000000').stroke();

  // Determine split for Amount in Words vs Total Value column
  const totalColIndex = isAditya ? 7 : 5; // column where 'Total' starts
  const totalColX = columns[totalColIndex].x;
  const amountColX = columns[columns.length - 1].x;

  // Vertical line before 'Total'
  doc.moveTo(totalColX, rowY).lineTo(totalColX, rowY + totalRowHeight).lineWidth(1).strokeColor('#000000').stroke();
  // Vertical line before Amount value
  doc.moveTo(amountColX, rowY).lineTo(amountColX, rowY + totalRowHeight).lineWidth(1).strokeColor('#000000').stroke();

  // Amount In Words (left side of total row)
  const inWords = (quotation.amountInWords || numberToWordsINR(quotation.totalAmount || 0)).replace(/^rupees:?\s*/i, '');
  doc.fillColor('#000000').font('Helvetica-Bold').fontSize(8.5);
  doc.text('Rupees: ' + inWords, left + 5, rowY + 6, { width: totalColX - left - 10, align: 'left', lineGap: 1 });

  // "Total" label
  doc.font('Helvetica-Bold').fontSize(9.5)
     .text('Total', totalColX + 2, rowY + 6, { width: amountColX - totalColX - 4, align: 'center' });

  // Final Total Amount Number
  const formattedGrandTotal = Number(quotation.totalAmount || 0).toLocaleString('en-IN');
  doc.text(formattedGrandTotal, amountColX + 2, rowY + 6, { width: columns[columns.length - 1].w - 4, align: 'right' });

  rowY += totalRowHeight + 14;

  // ================= 5. TERMS & CONDITIONS & SIGNATURE =================
  doc.font('Helvetica').fontSize(9.5).fillColor('#000000');
  doc.text('Terms & Conditions', left, rowY);
  rowY += 14;

  const defaultTerms = [
    'Taxes: All Inclusive',
    'Payment: 100% as Advance'
  ];
  if (quotation.deliveryTerms) {
    defaultTerms.push(quotation.deliveryTerms.startsWith('Delivery:') ? quotation.deliveryTerms : ('Delivery: ' + quotation.deliveryTerms));
  } else {
    defaultTerms.push('Delivery: within 7 working days');
  }

  // Combine custom terms if any, filtering out disclaimers and duplicates
  if (quotation.terms && Array.isArray(quotation.terms)) {
    quotation.terms.forEach(t => {
      const cleanT = String(t).trim();
      if (!cleanT) return;
      if (cleanT.toLowerCase().includes('electronic copy')) return;
      if (cleanT.toLowerCase().includes('terms & conditions')) return;
      if (!defaultTerms.some(dt => dt.toLowerCase() === cleanT.toLowerCase())) {
        defaultTerms.push(cleanT);
      }
    });
  }

  defaultTerms.forEach(term => {
    doc.text(term, left, rowY);
    rowY += 13;
  });

  // Electronic copy disclaimer
  rowY += 12;
  doc.text('An electronic copy does not carry any signature.', left + 40, rowY);

  // For SCS Sai, print contact details at bottom of sheet
  if (style.type === 'scs') {
    rowY += 24;
    doc.text('20/4, 4th Cross, Ganesha Block, R.T. Nagar, Bangalore -560032', left, rowY, { align: 'center', width: contentWidth });
    rowY += 13;
    doc.text('Phone : 080 23434428   E-Mail : scs@net4india.com', left, rowY, { align: 'center', width: contentWidth });
  }

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
