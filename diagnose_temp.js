const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const possiblePaths = [
  path.join(process.env.APPDATA, 'IMS', 'inventory.db'),
  path.join(process.env.APPDATA, 'flor_management_system', 'inventory.db'),
  path.join(process.env.APPDATA, 'ims', 'inventory.db')
];

for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    console.log("Found database at:", p);
    const db = new Database(p);
    const products = db.prepare("SELECT id, name, sku, price, quantity, shopify_product_id, shopify_variant_id FROM products ORDER BY updated_at DESC").all();
    console.log("Products count:", products.length);
    console.log("Last 5 products:", JSON.stringify(products.slice(0, 5), null, 2));
    
    const configPath = path.join(path.dirname(p), 'integrations.json');
    console.log("Config path:", configPath, "Exists:", fs.existsSync(configPath));
    if (fs.existsSync(configPath)) {
      console.log("integrations.json content:", fs.readFileSync(configPath, 'utf8'));
    } else {
      console.log("integrations.json does NOT exist.");
    }
    db.close();
  }
}
