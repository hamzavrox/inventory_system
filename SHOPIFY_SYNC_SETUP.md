# Shopify Bidirectional Sync Setup

## Overview
Your Inventory Management System now supports **bidirectional synchronization** with Shopify:
- **IMS → Shopify**: Product changes sync automatically to Shopify
- **Shopify → IMS**: Product changes in Shopify sync back to IMS via webhooks

## Features
✅ Real-time product creation sync (both directions)
✅ Real-time product updates sync (both directions)  
✅ Real-time product deletion sync (both directions)
✅ Inventory quantity sync
✅ Price, SKU, barcode sync
✅ Duplicate prevention
✅ Infinite loop prevention

## Setup Instructions

### 1. Configure Shopify Integration
1. Open **Integrations** page in IMS
2. Fill in Shopify credentials:
   - Store URL: `your-store.myshopify.com`
   - Admin API Access Token: `shpat_...`
3. Enable "Auto-sync Products"
4. Click "Test Connection" to verify
5. Click "Save All"

### 2. Expose Webhook Server (For Local Development)

The webhook server runs on `http://localhost:3456` by default. Shopify needs a public URL to send webhooks.

#### Option A: Using ngrok (Recommended for testing)
```bash
# Install ngrok
npm install -g ngrok

# Start ngrok tunnel
ngrok http 3456
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

#### Option B: Deploy to Production
Deploy your app to a server with a public IP/domain and ensure port 3456 is accessible.

### 3. Register Webhooks
1. In **Integrations** page, scroll to "Bidirectional Sync (Webhooks)"
2. Enter your webhook URL: `https://your-domain.com` or `https://abc123.ngrok.io`
3. (Optional) Enter webhook secret for HMAC verification
4. Click "Register Webhooks with Shopify"
5. Wait for confirmation message

### 4. Test Bidirectional Sync

#### Test IMS → Shopify:
1. Create/update/delete a product in IMS
2. Check Shopify admin - changes should appear immediately

#### Test Shopify → IMS:
1. Create/update/delete a product in Shopify admin
2. Check IMS Products page - changes should appear immediately
3. Check console logs for webhook processing

## Webhook Events Registered
- `products/create` - New product created in Shopify
- `products/update` - Product updated in Shopify
- `products/delete` - Product deleted in Shopify
- `inventory_levels/update` - Inventory quantity changed in Shopify

## Troubleshooting

### Webhooks not working?
1. Check webhook server is running (should start automatically with app)
2. Verify webhook URL is publicly accessible
3. Check Shopify Admin → Settings → Notifications → Webhooks
4. Look for webhook delivery status and errors
5. Check IMS console logs for incoming webhook requests

### Duplicate products?
The system prevents duplicates by checking `shopify_product_id`. If you see duplicates:
1. Delete duplicate products manually
2. Re-sync from Shopify using "Pull All from Server"

### Infinite sync loops?
The system marks products with `synced=1` when they come from Shopify to prevent loops. If you experience loops:
1. Check console logs for sync patterns
2. Restart the application
3. Clear sync queue: Settings → Sync → Reset Failed

### HMAC Verification Failing?
1. Ensure webhook secret matches in both IMS and Shopify
2. Leave secret empty to skip verification (not recommended for production)

## Security Notes
- Store webhook secret securely
- Use HTTPS for webhook URLs in production
- Enable HMAC verification for production deployments
- Rotate API tokens regularly

## Database Schema
Products table includes Shopify mapping columns:
- `shopify_product_id` - Shopify product ID
- `shopify_variant_id` - Shopify variant ID  
- `shopify_inventory_item_id` - Shopify inventory item ID
- `synced` - Flag to prevent sync loops (0=needs sync, 1=synced)

## API Endpoints
Webhook server exposes:
- `POST /shopify-webhook` - Receives Shopify webhook events
- `GET /health` - Health check endpoint

## Support
For issues or questions, check:
1. Console logs (Ctrl+Shift+I → Console)
2. Shopify webhook delivery logs
3. Network tab for failed requests
