const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'IMS', 'inventory.db');
console.log('Database path:', dbPath);

try {
  const db = new Database(dbPath, { fileMustExist: true });
  
  console.log('\n--- CUSTOMERS ---');
  const customers = db.prepare('SELECT id, name, deleted_at FROM customers').all();
  console.log(customers);
  
  console.log('\n--- SYNC QUEUE (last 10 entries) ---');
  const syncQueue = db.prepare("SELECT id, table_name, record_id, operation, status FROM sync_queue ORDER BY created_at DESC LIMIT 10").all();
  console.log(syncQueue);

  db.close();
} catch (e) {
  console.error('Error reading database:', e.message);
}
