const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
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
mongoose.connect(mongoUri)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

// =======================
// MONGOOSE MODELS
// =======================

const ticketSchema = new mongoose.Schema({
  ticket_id: { type: String, unique: true },
  name: String,
  iibs_id: String,
  role: String,
  department: String,
  contact: String,
  email: String,
  ticket_type: String,
  other_request: String,
  status: { type: String, default: 'open' },
  resolution: String,
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
const StockLog = mongoose.model('StockLog', stockLogSchema);

// =======================
// API ENDPOINTS
// =======================

// --- TICKETS ---

app.post(['/api/tickets', '/tickets'], async (req, res) => {
  try {
    const newTicket = new Ticket(req.body);
    await newTicket.save();
    res.status(201).json([newTicket]); 
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    const updated = await Ticket.findOneAndUpdate(
      { ticket_id: req.params.ticket_id }, 
      req.body, 
      { new: true }
    );
    res.json([updated]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- INVENTORY ---

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

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`IIBS Backend running at http://localhost:${port}`);
  });
}

module.exports = app;
