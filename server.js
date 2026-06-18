const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const app = express();
const port = process.env.PORT || 3000;

// Email Configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

// Function to send resolution email
async function sendResolutionEmail(ticket) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    console.warn('Email credentials not set. Skipping email notification.');
    return;
  }
  
  if (!ticket.email) {
    console.warn('Ticket has no email address. Skipping email notification.');
    return;
  }

  const mailOptions = {
    from: `"IIBS IT Helpdesk" <${process.env.GMAIL_USER}>`,
    to: ticket.email,
    subject: `Ticket Resolved: ${ticket.ticket_id} - ${ticket.ticket_type}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0f172a; padding: 20px; text-align: center;">
          <h2 style="color: #fff; margin: 0;">IIBS IT Helpdesk</h2>
        </div>
        <div style="padding: 20px;">
          <h3 style="color: #10b981; margin-top: 0;">Your Ticket has been Resolved!</h3>
          <p>Dear <strong>${ticket.name}</strong>,</p>
          <p>We are pleased to inform you that your service request has been marked as resolved by our IT Admin team.</p>
          
          <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0 0 10px 0;"><strong>Ticket ID:</strong> ${ticket.ticket_id}</p>
            <p style="margin: 0 0 10px 0;"><strong>Category:</strong> ${ticket.ticket_type}</p>
            <p style="margin: 0;"><strong>Resolution Notes:</strong><br/> ${ticket.resolution || 'No specific notes provided.'}</p>
          </div>
          
          <h4 style="color: #334155; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">We Value Your Feedback!</h4>
          <p style="font-size: 0.95rem;">Please reply directly to this email to let us know if the issue is completely resolved to your satisfaction, or if you need any further assistance regarding this matter.</p>
          
          <p style="margin-top: 30px; font-size: 0.9rem; color: #64748b;">
            Best Regards,<br/>
            <strong>IIBS IT Department</strong>
          </p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Resolution email sent to ${ticket.email} for ticket ${ticket.ticket_id}`);
  } catch (err) {
    console.error('Error sending resolution email:', err);
  }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Added for HTML form submissions
app.use(express.static(__dirname)); // --- FILE UPLOAD (Vercel Compatible) ---
// Vercel serverless functions cannot write to the local disk permanently.
// We use memory storage and encode to Base64 to save directly in MongoDB.
const storage = multer.memoryStorage();
const upload = multer({ storage });

// MongoDB Connection (Force Google DNS locally to bypass Windows SRV bug)
if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
  const dns = require('dns');
  dns.setServers(['8.8.8.8', '8.8.4.4']);
}

const mongoUri = 'mongodb+srv://iibs:iibspassword123@cluster0.tx3p15k.mongodb.net/iibs?appName=Cluster0';
let cachedDb = null; async function connectToDatabase() { if (cachedDb) return cachedDb; const uri = 'mongodb+srv://iibs:iibspassword123@cluster0.tx3p15k.mongodb.net/iibs?appName=Cluster0'; const client = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 }); cachedDb = client; return cachedDb; } app.use(async (req, res, next) => { try { await connectToDatabase(); next(); } catch(err) { res.status(500).json({ error: 'Database connection failed', details: err.message }); } });

// =======================
// MONGOOSE MODELS
// =======================

const ticketSchema = new mongoose.Schema({
  ticket_id: { type: String, unique: true },
  name: String,
  iibs_id: String,
  role: String,
  department: String,
  course: String,
  classroom: String,
  contact: String,
  email: String,
  ticket_type: String,
  other_request: String,
  status: { type: String, default: 'open' },
  resolution: String,
  attended_by: String,
  created_at: { type: Date, default: Date.now }
});
const Ticket = mongoose.model('Ticket', ticketSchema);

const inventorySchema = new mongoose.Schema({
  id: { type: String, default: () => crypto.randomUUID(), unique: true },
  item_name: String,
  category: String,
  quantity: { type: Number, default: 0 },
  last_updated: { type: Date, default: Date.now }
});
const Inventory = mongoose.model('Inventory', inventorySchema);

const stockLogSchema = new mongoose.Schema({
  id: { type: String, default: () => crypto.randomUUID(), unique: true },
  item_id: String,
  item_name: String,
  action: String,
  amount: Number,
  remarks: String,
  supplier_name: String,
  purchase_cost: Number,
  bill_photo_url: String,
  created_at: { type: Date, default: Date.now }
});
const StockLog = mongoose.models.StockLog || mongoose.model('StockLog', stockLogSchema);

const laptopEligibilitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  course: { type: String, required: true },
  status: { type: String, default: 'Pending' },
  serialNo: { type: String, default: '' },
  givenDate: { type: String, default: '' },
  returnDate: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now }
});
const LaptopEligibility = mongoose.models.LaptopEligibility || mongoose.model('LaptopEligibility', laptopEligibilitySchema);

// =======================
// API ENDPOINTS
// =======================

// --- TICKETS ---

app.post(['/api/tickets', '/tickets'], async (req, res) => {
  try {
    const newTicket = new Ticket(req.body);
    await newTicket.save();
    
    // --- CCTV APPROVAL EMAIL ---
    if (req.body.ticket_type === 'CCTV Footage Checking' && req.body.cctvApprover) {
      const approveUrl = `https://${req.headers.host || 'iibsservicerequest.vercel.app'}/api/tickets/approve/${newTicket.ticket_id}`;
      const mailOptions = {
        from: `"IIBS IT Helpdesk" <${process.env.GMAIL_USER}>`,
        to: req.body.cctvApprover,
        subject: `ACTION REQUIRED: CCTV Footage Approval - ${newTicket.ticket_id}`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #ddd; max-width: 500px; border-radius: 8px;">
            <h2 style="color: #0f172a; margin-top: 0;">CCTV Footage Request</h2>
            <p style="font-size: 1.05rem;"><strong>Requested By:</strong> ${newTicket.name} (${newTicket.role})</p>
            <div style="background: #f1f5f9; padding: 15px; border-left: 4px solid #3b82f6; border-radius: 6px; margin: 15px 0;">
              <strong style="display: block; margin-bottom: 5px;">Footage Details:</strong>
              <span style="color: #475569;">${newTicket.other_request}</span>
            </div>
            <p>Please review this request and submit your official decision.</p>
            <br/>
            <a href="${approveUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Review & Approve/Reject</a>
          </div>
        `
      };
      
      if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
        try {
          await transporter.sendMail(mailOptions);
        } catch (err) {
          console.error('Error sending CCTV approval email:', err);
          newTicket.resolution = `[System Error: Failed to send email to ${req.body.cctvApprover} - ${err.message}]\n` + (newTicket.resolution || '');
          await newTicket.save();
        }
      } else {
        newTicket.resolution = `[System Error: GMAIL_USER or GMAIL_PASS environment variables are NOT set on Vercel. Email was not sent.]\n` + (newTicket.resolution || '');
        await newTicket.save();
      }
    }
    
    res.status(201).json([newTicket]); 
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tickets/approve/:ticket_id', async (req, res) => {
  try {
    const ticketId = req.params.ticket_id;
    const ticket = await Ticket.findOne({ ticket_id: ticketId });
    
    if (!ticket) {
      return res.status(404).send('<h1>Ticket not found</h1>');
    }
    
    // If it's already approved or rejected, just show a message.
    const isApproved = ticket.status === 'approved';
    const isRejected = ticket.status === 'rejected';
    if (isApproved || isRejected) {
      return res.send(`
        <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; text-align: center; color: #333; max-width: 600px; margin: 0 auto;">
          <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
            <h1 style="color: ${isApproved ? '#10b981' : '#ef4444'}; margin-top: 0;">${isApproved ? '✅ Already Approved' : '❌ Already Rejected'}</h1>
            <p>This ticket was previously processed.</p>
            <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 0;">You may close this window.</p>
          </div>
        </div>
      `);
    }

    res.send(`
      <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; text-align: center; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
          <h1 style="color: #4f46e5; margin-top: 0;">CCTV Footage Request</h1>
          <p style="font-size: 1.1rem; color: #475569;">Please review the requested footage details and decide to approve or reject.</p>
          
          <div style="text-align: left; background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 25px 0;">
            <h3 style="margin-top: 0; color: #0f172a; margin-bottom: 15px;">Ticket Details</h3>
            <p style="margin: 8px 0;"><strong>Ticket ID:</strong> ${ticket.ticket_id}</p>
            <p style="margin: 8px 0;"><strong>Requested By:</strong> ${ticket.name} (${ticket.role})</p>
            <p style="margin: 8px 0;"><strong>Contact:</strong> ${ticket.contact}</p>
            <p style="margin: 8px 0;"><strong>Footage Details:</strong><br/> <span style="display: inline-block; margin-top: 5px; color: #475569;">${ticket.other_request}</span></p>
          </div>
          
          <form method="POST" action="/api/tickets/approve/${ticket.ticket_id}" style="text-align: left;">
            <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #334155;">Remarks (Optional):</label>
            <textarea name="remarks" rows="3" style="width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; margin-bottom: 20px; font-family: inherit;" placeholder="Type any comments here..."></textarea>
            
            <div style="display: flex; gap: 15px;">
              <button type="submit" name="action" value="approve" style="flex: 1; background-color: #10b981; color: white; padding: 14px; border: none; border-radius: 6px; font-size: 1.1rem; font-weight: 600; cursor: pointer;">✅ Approve</button>
              <button type="submit" name="action" value="reject" style="flex: 1; background-color: #ef4444; color: white; padding: 14px; border: none; border-radius: 6px; font-size: 1.1rem; font-weight: 600; cursor: pointer;">❌ Reject</button>
            </div>
          </form>
        </div>
      </div>
    `);
  } catch (err) {
    res.status(500).send('<h1>Error loading request</h1>');
  }
});

app.post('/api/tickets/approve/:ticket_id', async (req, res) => {
  try {
    const ticketId = req.params.ticket_id;
    const { action, remarks } = req.body;
    
    const ticket = await Ticket.findOne({ ticket_id: ticketId });
    if (!ticket) {
      return res.status(404).send('<h1>Ticket not found</h1>');
    }

    const existingRes = ticket.resolution ? ticket.resolution + '\n\n' : '';
    const remarkText = remarks ? ` - Remarks: ${remarks}` : '';

    if (action === 'approve') {
      ticket.status = 'approved';
      ticket.resolution = `✅ APPROVED for CCTV Check${remarkText}\n\n${existingRes}`;
    } else if (action === 'reject') {
      ticket.status = 'rejected';
      ticket.resolution = `❌ REJECTED for CCTV Check${remarkText}\n\n${existingRes}`;
    }

    await ticket.save();

    res.send(`
      <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; text-align: center; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
          <h1 style="color: ${action === 'approve' ? '#10b981' : '#ef4444'}; margin-top: 0;">${action === 'approve' ? '✅ Request Approved' : '❌ Request Rejected'}</h1>
          <p style="font-size: 1.1rem; color: #475569;">The decision has been recorded and the IT team will be notified.</p>
          <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 0;">You may now close this window.</p>
        </div>
      </div>
    `);
  } catch (err) {
    res.status(500).send('<h1>Error processing approval</h1>');
  }
});

app.get(['/api/tickets', '/tickets'], async (req, res) => {
  try {
    const tickets = await Ticket.find().sort({ date: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put(['/api/tickets/:ticket_id', '/tickets/:ticket_id'], async (req, res) => {
  try {
    // Check existing ticket status before updating
    const existingTicket = await Ticket.findOne({ ticket_id: req.params.ticket_id });
    const wasResolved = existingTicket && existingTicket.status === 'resolved';

    const updated = await Ticket.findOneAndUpdate(
      { ticket_id: req.params.ticket_id }, 
      req.body, 
      { new: true }
    );

    // If it wasn't resolved before, but is resolved now, trigger the email
    if (!wasResolved && updated.status === 'resolved') {
      // Must await the email in Vercel, otherwise the lambda terminates before sending
      await sendResolutionEmail(updated).catch(console.error);
    }

    res.json([updated]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- INVENTORY ---

app.post('/api/inventory/import', async (req, res) => {
  try {
    const items = req.body;
    let inserted = 0;
    for (const item of items) {
      if (!item.id) item.id = 'INV-' + Date.now() + Math.floor(Math.random() * 1000);
      
      const existing = await Inventory.findOne({ item_name: item.item_name });
      if (!existing) {
        const newItem = new Inventory({ ...item, last_updated: new Date() });
        await newItem.save();
        inserted++;
      } else {
        // If it exists, we just append to the history and update quantity
        if (item.history && item.history.length > 0) {
           existing.history = existing.history.concat(item.history);
           existing.quantity = item.quantity;
           existing.last_updated = new Date();
           await existing.save();
           inserted++;
        }
      }
    }
    res.json({ success: true, inserted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post(['/api/inventory', '/inventory'], async (req, res) => {
  try {
    const newItem = new Inventory({ ...req.body, last_updated: new Date() });
    await newItem.save();
    res.status(201).json([newItem]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get(['/api/inventory', '/inventory'], async (req, res) => {
  try {
    const items = await Inventory.find().sort({ item_name: 1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put(['/api/inventory/:id', '/inventory/:id'], async (req, res) => {
  try {
    const updated = await Inventory.findOneAndUpdate(
      { id: req.params.id }, 
      { ...req.body, last_updated: new Date() }, 
      { new: true }
    );
    res.json([updated]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/inventory/:id', async (req, res) => {
  try {
    await Inventory.findOneAndDelete({ id: req.params.id });
    await StockLog.deleteMany({ item_id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- STOCK LOGS ---

app.post('/api/stock_log', async (req, res) => {
  try {
    const newLog = new StockLog(req.body);
    await newLog.save();
    res.status(201).json([newLog]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stock_log', async (req, res) => {
  try {
    const itemId = req.query.item_id;
    let query = {};
    if (itemId) query.item_id = itemId;
    const logs = await StockLog.find(query).sort({ created_at: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- FILE UPLOAD ---

app.post(['/api/upload', '/upload'], upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const base64Image = req.file.buffer.toString('base64');
  const mimeType = req.file.mimetype;
  const publicUrl = `data:${mimeType};base64,${base64Image}`;
  res.json({ publicUrl });
});

// --- LAPTOP ELIGIBILITY ---

app.get('/api/laptop/search', async (req, res) => {
  try {
    const { name, course } = req.query;
    if (!name || !course) return res.status(400).json({ error: 'Name and course are required' });
    
    // Case insensitive regex search for name
    const student = await LaptopEligibility.findOne({
      name: new RegExp(`^${name}$`, 'i'),
      course: course
    });
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found in eligibility list' });
    }
    
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/laptop/list', async (req, res) => {
  try {
    const laptops = await LaptopEligibility.find({}).sort({ course: 1, name: 1 });
    res.json(laptops);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/laptop/update', async (req, res) => {
  try {
    const { id, status, name, serialNo, givenDate, returnDate } = req.body;
    if (!id) return res.status(400).json({ error: 'ID is required' });
    
    const updateData = { updatedAt: new Date() };

    if (status !== undefined) {
      if (!['Pending', 'Received', 'Cancel'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      updateData.status = status;
    }

    if (name !== undefined) updateData.name = name;
    if (serialNo !== undefined) updateData.serialNo = serialNo;
    if (givenDate !== undefined) updateData.givenDate = givenDate;
    if (returnDate !== undefined) updateData.returnDate = returnDate;

    const student = await LaptopEligibility.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/laptop/:id', async (req, res) => {
  try {
    const result = await LaptopEligibility.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: 'Record not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/laptop/import', async (req, res) => {
  try {
    const records = req.body;
    if (!Array.isArray(records)) return res.status(400).json({ error: 'Array required' });
    
    let inserted = 0;
    for (const rec of records) {
      const existing = await LaptopEligibility.findOne({ name: rec.name, course: rec.course });
      if (!existing) {
        await LaptopEligibility.create(rec);
        inserted++;
      }
    }
    res.json({ success: true, inserted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`IIBS Backend running at http://localhost:${port}`);
  });
}

module.exports = app;
