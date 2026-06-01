// Quick test script to verify webhook server is running
const http = require('http');

// Test 1: Check localhost:3456
console.log('Testing localhost:3456...');
http.get('http://localhost:3456/shopify-webhook', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('✅ Local server is running!');
    console.log('Response:', data);
  });
}).on('error', (err) => {
  console.log('❌ Local server is NOT running!');
  console.log('Error:', err.message);
});

// Test 2: Check ngrok URL (if provided)
const ngrokUrl = 'https://unfaintly-ungleaned-victor.ngrok-free.dev';
if (ngrokUrl) {
  console.log('\nTesting ngrok URL...');
  const https = require('https');
  https.get(`${ngrokUrl}/shopify-webhook`, {
    headers: {
      'ngrok-skip-browser-warning': 'true',
      'User-Agent': 'Test-Script'
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('✅ ngrok URL is accessible!');
      console.log('Response:', data);
    });
  }).on('error', (err) => {
    console.log('❌ ngrok URL is NOT accessible!');
    console.log('Error:', err.message);
  });
}
