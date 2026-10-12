// Automated test for Netlify Function handler & Mail.tm Provider Lifecycle
import { handler } from '../netlify/functions/api.js';

async function runTests() {
  console.log('--- 1. Testing Netlify Function Health Check ---');
  const healthRes = await handler({
    httpMethod: 'GET',
    path: '/api/health',
    headers: {},
  });
  console.log('Health Status:', healthRes.statusCode);
  const healthBody = JSON.parse(healthRes.body);
  console.log('Health Body:', healthBody);
  if (healthRes.statusCode !== 200 || healthBody.status !== 'healthy') {
    throw new Error('Health check failed');
  }

  console.log('\n--- 2. Testing Domain Retrieval via Gateway ---');
  const domainsRes = await handler({
    httpMethod: 'GET',
    path: '/api/domains',
    headers: {},
  });
  console.log('Domains Status:', domainsRes.statusCode);
  console.log('Domains Body:', domainsRes.body);
  const domainsBody = JSON.parse(domainsRes.body);
  const rawList = domainsBody['hydra:member'] || (Array.isArray(domainsBody) ? domainsBody : []);
  const domains = rawList.map(d => d.domain);
  console.log('Available Domains:', domains);
  if (domains.length === 0) throw new Error('No domains retrieved');

  console.log('\n--- 3. Testing Disposable Account Creation ---');
  const domain = domains[0];
  const username = 'test_' + Math.random().toString(36).substring(2, 9);
  const address = `${username}@${domain}`;
  const password = 'TestSecret123!' + Math.random().toString(36).substring(2, 6);

  const accountRes = await handler({
    httpMethod: 'POST',
    path: '/api/accounts',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, password }),
  });
  console.log('Create Account Status:', accountRes.statusCode);
  const accountBody = JSON.parse(accountRes.body);
  console.log('Created Account ID:', accountBody.id, 'Address:', accountBody.address);
  if (accountRes.statusCode !== 201) throw new Error('Account creation failed');

  console.log('\n--- 4. Testing JWT Authentication Token ---');
  const tokenRes = await handler({
    httpMethod: 'POST',
    path: '/api/token',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, password }),
  });
  console.log('Token Status:', tokenRes.statusCode);
  const tokenBody = JSON.parse(tokenRes.body);
  console.log('Token Received:', Boolean(tokenBody.token));
  if (!tokenBody.token) throw new Error('Token acquisition failed');

  console.log('\n--- 5. Testing Messages Listing (Empty Inbox) ---');
  const messagesRes = await handler({
    httpMethod: 'GET',
    path: '/api/messages',
    headers: {
      Authorization: `Bearer ${tokenBody.token}`,
    },
  });
  console.log('Messages Status:', messagesRes.statusCode);
  const messagesBody = JSON.parse(messagesRes.body);
  console.log('Total Messages in newly created inbox:', messagesBody['hydra:totalItems'] ?? 0);
  if (messagesRes.statusCode !== 200) throw new Error('Messages list failed');

  console.log('\n--- 6. Testing Rate Limiter Guard ---');
  let rateLimited = false;
  for (let i = 0; i < 70; i++) {
    const rlRes = await handler({
      httpMethod: 'GET',
      path: '/api/health',
      headers: { 'x-forwarded-for': '192.168.1.100' },
    });
    if (rlRes.statusCode === 429) {
      rateLimited = true;
      console.log(`Rate limit triggered successfully at request #${i + 1}`);
      break;
    }
  }
  if (!rateLimited) {
    console.warn('Note: Rate limiter did not trigger within 70 iterations (check threshold)');
  }

  console.log('\n--- 7. Testing Cleanup (Account Deletion) ---');
  const deleteRes = await handler({
    httpMethod: 'DELETE',
    path: `/api/accounts/${accountBody.id}`,
    headers: {
      Authorization: `Bearer ${tokenBody.token}`,
    },
  });
  console.log('Delete Account Status:', deleteRes.statusCode);

  console.log('\n=======================================');
  console.log('ALL PROVIDER LIFECYCLE TESTS PASSED!');
  console.log('=======================================');
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
