const registerProductHandlers   = require('./product.handlers')
const registerInventoryHandlers = require('./inventory.handlers')
const registerSalesHandlers     = require('./sales.handlers')
const registerCustomerHandlers  = require('./customer.handlers')
const registerAccountingHandlers= require('./accounting.handlers')
const registerAdminHandlers     = require('./admin.handlers')
const registerReportHandlers    = require('./reports.handlers')
const registerIntegrationHandlers = require('./integration.handlers')
const registerWebhookHandlers   = require('./webhook.handlers')

function registerHandlers() {
  registerProductHandlers()
  registerInventoryHandlers()
  registerSalesHandlers()
  registerCustomerHandlers()
  registerAccountingHandlers()
  registerAdminHandlers()
  registerReportHandlers()
  registerIntegrationHandlers()
  registerWebhookHandlers()
}

module.exports = { registerHandlers }


