// Test Shopify API access
const fs = require('fs');
const path = require('path');

// Read config
const configPath = 'C:\\Users\\YourUsername\\AppData\\Roaming\\inventory_management_system\\integrations.json';
// Update the path above with actual user path

async function testShopifyAPI() {
  try {
    // For testing, use hardcoded values
    const domain = 'mm-watches-gnw3rrvu.myshopify.com';
    const token = 'YOUR_TOKEN_HERE'; // Replace with actual token
    
    console.log('Testing Shopify API access...');
    console.log('Domain:', domain);
    console.log('Token:', token ? `${token.substring(0, 10)}...` : 'NOT SET');
    
    const url = `https://${domain}/admin/api/2024-10/webhooks.json`;
    console.log('URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status, response.statusText);
    
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('✅ Shopify API access successful!');
      console.log(`Found ${data.webhooks?.length || 0} existing webhooks`);
    } else {
      console.log('❌ Shopify API access failed!');
      console.log('Error:', data.errors || data.error);
    }
  } catch (err) {
    console.log('❌ Exception occurred!');
    console.log('Error:', err.message);
    console.log('Cause:', err.cause);
  }
}

testShopifyAPI();
