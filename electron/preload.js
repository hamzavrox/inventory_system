const { contextBridge, ipcRenderer } = require('electron')

const invoke = (ch, ...a) => ipcRenderer.invoke(ch, ...a)

contextBridge.exposeInMainWorld('api', {
  // ── Products & Catalog ──────────────────────────────────
  products: {
    getAll:       ()        => invoke('products:getAll'),
    add:          (data)    => invoke('products:add', data),
    update:       (id, d)   => invoke('products:update', id, d),
    delete:       (id)      => invoke('products:delete', id),
    getLowStock:  ()        => invoke('products:getLowStock'),
  },
  variants: {
    getByProduct: (pid)     => invoke('variants:getByProduct', pid),
    add:          (data)    => invoke('variants:add', data),
    delete:       (id)      => invoke('variants:delete', id),
  },
  brands: {
    getAll:  ()             => invoke('brands:getAll'),
    add:     (data)         => invoke('brands:add', data),
    delete:  (id)           => invoke('brands:delete', id),
  },
  categories: {
    getAll:  ()             => invoke('categories:getAll'),
    add:     (data)         => invoke('categories:add', data),
    delete:  (id)           => invoke('categories:delete', id),
  },

  // ── Inventory ───────────────────────────────────────────
  inventory: {
    adjustStock:    (data)  => invoke('inventory:adjustStock', data),
    getStockLog:    (pid)   => invoke('inventory:getStockLog', pid),
    getAllStockLog:  ()      => invoke('inventory:getAllStockLog'),
    transfer:       (data)  => invoke('inventory:transfer', data),
    getTransfers:   ()      => invoke('inventory:getTransfers'),
  },

  // ── Sales ───────────────────────────────────────────────
  sales: {
    create:   (data)        => invoke('sales:create', data),
    getAll:   (opts)        => invoke('sales:getAll', opts),
    getById:  (id)          => invoke('sales:getById', id),
    return:   (data)        => invoke('sales:return', data),
  },

  // ── Customers ───────────────────────────────────────────
  customers: {
    getAll:             ()          => invoke('customers:getAll'),
    add:                (data)      => invoke('customers:add', data),
    update:             (id, d)     => invoke('customers:update', id, d),
    delete:             (id)        => invoke('customers:delete', id),
    getLedger:          (id)        => invoke('customers:getLedger', id),
    getPurchaseHistory: (id)        => invoke('customers:getPurchaseHistory', id),
    addPayment:         (data)      => invoke('customers:addPayment', data),
  },

  // ── Accounting ──────────────────────────────────────────
  accounting: {
    getTransactions:  (filters)   => invoke('accounting:getTransactions', filters),
    addTransaction:   (data)      => invoke('accounting:addTransaction', data),
    getSummary:       (filters)   => invoke('accounting:getSummary', filters),
    getCashFlow:      (filters)   => invoke('accounting:getCashFlow', filters),
  },

  // ── Branches & Shops ────────────────────────────────────
  branches: {
    getAll:  ()             => invoke('branches:getAll'),
    add:     (data)         => invoke('branches:add', data),
    delete:  (id)           => invoke('branches:delete', id),
  },
  shops: {
    getAll:  ()             => invoke('shops:getAll'),
    add:     (data)         => invoke('shops:add', data),
    delete:  (id)           => invoke('shops:delete', id),
  },

  // ── Users & Roles ────────────────────────────────────────
  users: {
    getAll:  ()             => invoke('users:getAll'),
    add:     (data)         => invoke('users:add', data),
    update:  (id, d)        => invoke('users:update', { id, ...d }),
    delete:  (id)           => invoke('users:delete', id),
    login:   (creds)        => invoke('users:login', creds),
  },
  roles: {
    getAll:  ()             => invoke('roles:getAll'),
    add:     (data)         => invoke('roles:add', data),
    update:  (id, d)        => invoke('roles:update', { id, ...d }),
    delete:  (id)           => invoke('roles:delete', id),
  },

  // ── Activity Logs ────────────────────────────────────────
  logs: {
    add:     (data)         => invoke('logs:add', data),
    getAll:  ()             => invoke('logs:getAll'),
  },

  // ── Discounts ────────────────────────────────────────────
  discounts: {
    getAll:    ()           => invoke('discounts:getAll'),
    add:       (data)       => invoke('discounts:add', data),
    validate:  (data)       => invoke('discounts:validate', data),
    delete:    (id)         => invoke('discounts:delete', id),
  },

  // ── Reports ─────────────────────────────────────────────
  reports: {
    sales:        (f)       => invoke('reports:sales', f),
    topProducts:  (f)       => invoke('reports:topProducts', f),
    profitLoss:   (f)       => invoke('reports:profitLoss', f),
    tax:          (f)       => invoke('reports:tax', f),
    inventory:    ()        => invoke('reports:inventory'),
    branchSales:  (f)       => invoke('reports:branchSales', f),
  },

  // ── Print ───────────────────────────────────────────────
  print: {
    html: (html) => invoke('print:html', html),
  },

  // ── Sync ────────────────────────────────────────────────
  sync: {
    run:         (url, token) => invoke('sync:run', url, token),
    pullAll:     (url, token) => invoke('sync:pullAll', url, token),
    status:      ()           => invoke('sync:status'),
    resetFailed: ()           => invoke('sync:resetFailed'),
    fullSync:    ()           => invoke('sync:fullSync'),
  },

  autobackup: {
    save: (cfg) => invoke('autobackup:save', cfg),
    load: ()    => invoke('autobackup:load'),
  },

  // ── Backup ───────────────────────────────────────────────
  backup: {
    create:     ()          => invoke('backup:create'),
    getAll:     ()          => invoke('backup:getAll'),
    restore:    ()          => invoke('backup:restore'),
    openFolder: ()          => invoke('backup:openFolder'),
  },

  // ── Events ──────────────────────────────────────────────
  on: (channel, cb) => ipcRenderer.on(channel, (_, ...args) => cb(...args)),
  off: (channel, cb) => ipcRenderer.removeListener(channel, cb),
})
