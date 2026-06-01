const SCHEMA_VERSION = 1

const schema = `
  -- â”€â”€â”€ CORE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  CREATE TABLE IF NOT EXISTS schema_version (version INTEGER);

  -- â”€â”€â”€ BRANDS & CATEGORIES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  CREATE TABLE IF NOT EXISTS brands (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT,                        -- NULL = top-level
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- â”€â”€â”€ PRODUCTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  CREATE TABLE IF NOT EXISTS products (
    id                        TEXT PRIMARY KEY,
    name                      TEXT NOT NULL,
    sku                       TEXT UNIQUE,
    barcode                   TEXT,
    brand_id                  TEXT,
    category_id               TEXT,
    price                     REAL DEFAULT 0,
    cost_price                REAL DEFAULT 0,
    quantity                  INTEGER DEFAULT 0,
    low_stock_threshold       INTEGER DEFAULT 10,
    unit                      TEXT DEFAULT 'pcs',
    synced                    INTEGER DEFAULT 0,
    shopify_product_id        TEXT,
    shopify_variant_id        TEXT,
    shopify_inventory_item_id TEXT,
    updated_at                TEXT DEFAULT (datetime('now')),
    deleted_at                TEXT
  );

  CREATE TABLE IF NOT EXISTS product_variants (
    id         TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    name       TEXT NOT NULL,             -- e.g. "Red / XL"
    sku        TEXT,
    price      REAL,
    quantity   INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- â”€â”€â”€ INVENTORY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  CREATE TABLE IF NOT EXISTS stock_log (
    id         TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    type       TEXT NOT NULL,             -- 'in' | 'out' | 'adjust' | 'transfer'
    quantity   INTEGER NOT NULL,
    batch_no   TEXT,
    expiry_date TEXT,
    note       TEXT,
    branch_id  TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    synced     INTEGER DEFAULT 0
  );

  -- â”€â”€â”€ CUSTOMERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  CREATE TABLE IF NOT EXISTS customers (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    phone      TEXT,
    email      TEXT,
    address    TEXT,
    credit_limit REAL DEFAULT 0,
    balance    REAL DEFAULT 0,            -- positive=credit, negative=debit
    created_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS customer_ledger (
    id          TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    type        TEXT NOT NULL,            -- 'sale' | 'payment' | 'refund'
    amount      REAL NOT NULL,
    note        TEXT,
    ref_id      TEXT,                     -- sale_id or payment_id
    created_at  TEXT DEFAULT (datetime('now'))
  );

  -- â”€â”€â”€ SALES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  CREATE TABLE IF NOT EXISTS sales (
    id           TEXT PRIMARY KEY,
    invoice_no   TEXT UNIQUE,
    customer_id  TEXT,
    branch_id    TEXT,
    subtotal     REAL DEFAULT 0,
    discount     REAL DEFAULT 0,
    tax          REAL DEFAULT 0,
    total        REAL DEFAULT 0,
    paid         REAL DEFAULT 0,
    change_due   REAL DEFAULT 0,
    payment_method TEXT DEFAULT 'cash',
    status       TEXT DEFAULT 'completed', -- 'completed' | 'returned' | 'partial'
    note         TEXT,
    created_at   TEXT DEFAULT (datetime('now')),
    synced       INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id         TEXT PRIMARY KEY,
    sale_id    TEXT NOT NULL,
    product_id TEXT NOT NULL,
    variant_id TEXT,
    name       TEXT,
    qty        INTEGER NOT NULL,
    price      REAL NOT NULL,
    discount   REAL DEFAULT 0,
    total      REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS returns (
    id         TEXT PRIMARY KEY,
    sale_id    TEXT NOT NULL,
    reason     TEXT,
    refund_amount REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- â”€â”€â”€ ACCOUNTING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  CREATE TABLE IF NOT EXISTS transactions (
    id         TEXT PRIMARY KEY,
    type       TEXT NOT NULL,             -- 'income' | 'expense'
    category   TEXT,
    amount     REAL NOT NULL,
    note       TEXT,
    ref_id     TEXT,
    branch_id  TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    synced     INTEGER DEFAULT 0
  );

  -- â”€â”€â”€ DISCOUNTS & COUPONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  CREATE TABLE IF NOT EXISTS discounts (
    id         TEXT PRIMARY KEY,
    code       TEXT UNIQUE,
    type       TEXT DEFAULT 'percent',    -- 'percent' | 'fixed'
    value      REAL NOT NULL,
    min_amount REAL DEFAULT 0,
    expires_at TEXT,
    active     INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- â”€â”€â”€ BRANCHES & SHOPS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  CREATE TABLE IF NOT EXISTS branches (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    address    TEXT,
    phone      TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS shops (
    id         TEXT PRIMARY KEY,
    branch_id  TEXT,
    name       TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS stock_transfers (
    id           TEXT PRIMARY KEY,
    from_shop_id TEXT,
    to_shop_id   TEXT,
    product_id   TEXT NOT NULL,
    quantity     INTEGER NOT NULL,
    note         TEXT,
    created_at   TEXT DEFAULT (datetime('now'))
  );

  -- â”€â”€â”€ USERS & ROLES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  CREATE TABLE IF NOT EXISTS users (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    username   TEXT UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    role_id    TEXT,
    branch_id  TEXT,
    active     INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS roles (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    permissions TEXT DEFAULT '{}'         -- JSON string of module permissions
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id         TEXT PRIMARY KEY,
    user_id    TEXT,
    action     TEXT NOT NULL,
    module     TEXT,
    detail     TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- â”€â”€â”€ SYNC QUEUE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  CREATE TABLE IF NOT EXISTS sync_queue (
    id         TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id  TEXT NOT NULL,
    operation  TEXT NOT NULL,             -- 'insert' | 'update' | 'delete'
    payload    TEXT,                      -- JSON
    status     TEXT DEFAULT 'pending',    -- 'pending' | 'synced' | 'failed'
    retries    INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    synced_at  TEXT
  );

  -- ─── BACKUPS ───────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS backups (
    id         TEXT PRIMARY KEY,
    path       TEXT,
    type       TEXT DEFAULT 'local',      -- 'local' | 'gdrive'
    size_kb    INTEGER,
    gdrive_file_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- ─── SHOPIFY WEBHOOK AUDIT LOG ─────────────────────────────
  -- Records every inbound Shopify webhook and every outbound IMS→Shopify push
  CREATE TABLE IF NOT EXISTS shopify_webhook_log (
    id            TEXT PRIMARY KEY,
    source        TEXT NOT NULL,   -- 'shopify_to_ims' | 'ims_to_shopify'
    topic         TEXT NOT NULL,   -- 'products/create' | 'products/update' | 'products/delete' | 'inventory_levels/update'
    shopify_id    TEXT,            -- Shopify product/inventory item ID
    ims_id        TEXT,            -- Local IMS product ID
    status        TEXT NOT NULL,   -- 'success' | 'error' | 'skipped'
    message       TEXT,            -- Human-readable result or error message
    created_at    TEXT DEFAULT (datetime('now'))
  );
`

module.exports = { schema, SCHEMA_VERSION }


