const mongoose = require('mongoose');
const { createClient } = require('@supabase/supabase-js');

// Supabase Configuration
const supabaseUrl = 'https://ttfpstdetevgkjnkqcxf.supabase.co';
const supabaseKey = 'sb_publishable_MXV3EFM0dxohHYcieiptdA_p7UhMePb';
const supabase = createClient(supabaseUrl, supabaseKey);

// MongoDB Connection (Standard string to bypass DNS SRV issues)
const mongoUri = 'mongodb://iibs:BcOUKVzKL0doMFlR@ac-rfizocd-shard-00-00.tx3p15k.mongodb.net:27017,ac-rfizocd-shard-00-01.tx3p15k.mongodb.net:27017,ac-rfizocd-shard-00-02.tx3p15k.mongodb.net:27017/iibs?ssl=true&replicaSet=atlas-rfizocd-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0';

// Mongoose Models
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
  id: { type: String, unique: true },
  item_name: String,
  category: String,
  quantity: { type: Number, default: 0 },
  last_updated: { type: Date, default: Date.now }
});
const Inventory = mongoose.model('Inventory', inventorySchema);

const stockLogSchema = new mongoose.Schema({
  id: { type: String, unique: true },
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

async function migrateData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.\n');

    // --- Migrate Tickets ---
    console.log('Fetching Tickets from Supabase...');
    const { data: tickets, error: ticketError } = await supabase.from('tickets').select('*');
    if (ticketError) throw ticketError;
    
    if (tickets && tickets.length > 0) {
      console.log(`Found ${tickets.length} tickets. Inserting into MongoDB...`);
      for (const t of tickets) {
        await Ticket.findOneAndUpdate({ ticket_id: t.ticket_id }, t, { upsert: true });
      }
      console.log('Tickets migration complete.\n');
    } else {
      console.log('No tickets found in Supabase.\n');
    }

    // --- Migrate Inventory ---
    console.log('Fetching Inventory from Supabase...');
    const { data: inventory, error: invError } = await supabase.from('inventory').select('*');
    if (invError && invError.code !== '42P01') throw invError; // Ignore if table doesn't exist

    if (inventory && inventory.length > 0) {
      console.log(`Found ${inventory.length} inventory items. Inserting into MongoDB...`);
      for (const item of inventory) {
        await Inventory.findOneAndUpdate({ id: item.id }, item, { upsert: true });
      }
      console.log('Inventory migration complete.\n');
    } else {
      console.log('No inventory found in Supabase.\n');
    }

    // --- Migrate Stock Logs ---
    console.log('Fetching Stock Logs from Supabase...');
    const { data: logs, error: logError } = await supabase.from('stock_log').select('*');
    if (logError && logError.code !== '42P01') throw logError;

    if (logs && logs.length > 0) {
      console.log(`Found ${logs.length} stock logs. Inserting into MongoDB...`);
      for (const log of logs) {
        await StockLog.findOneAndUpdate({ id: log.id }, log, { upsert: true });
      }
      console.log('Stock log migration complete.\n');
    } else {
      console.log('No stock logs found in Supabase.\n');
    }

    console.log('🎉 All data successfully migrated from Supabase to MongoDB!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateData();
