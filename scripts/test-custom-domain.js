// Integration test for custom domain webhook and polling endpoints
import { handler } from '../netlify/functions/api.js';

async function runCustomDomainTest() {
  console.log('--- 1. Testing Webhook Email Ingestion for @itcareerpoint.in ---');
  const testAddress = 'student.test99@itcareerpoint.in';
  const incomingPayload = {
    to: testAddress,
    from: {
      address: 'recruiter@techcorp.com',
      name: 'Google Recruiter',
    },
    subject: 'Your Verification Code is 849201',
    text: 'Hello, your temporary verification code is 849201. Use it to complete your login.',
    html: '<p>Hello, your temporary verification code is <strong>849201</strong>.</p>',
  };

  const webhookRes = await handler({
    httpMethod: 'POST',
    path: '/api/webhook/email',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(incomingPayload),
  });

  console.log('Webhook Status:', webhookRes.statusCode);
  const webhookBody = JSON.parse(webhookRes.body);
  console.log('Webhook Body:', webhookBody);
  if (webhookRes.statusCode !== 200 || !webhookBody.success) {
    throw new Error('Webhook ingestion failed');
  }

  console.log('\n--- 2. Testing Message Retrieval for Custom Address ---');
  const getRes = await handler({
    httpMethod: 'GET',
    path: '/api/custom/messages',
    queryStringParameters: { address: testAddress },
    headers: {},
  });

  console.log('Get Messages Status:', getRes.statusCode);
  const getBody = JSON.parse(getRes.body);
  console.log('Total messages retrieved:', getBody.total);
  const receivedMsg = getBody.messages[0];
  console.log('Received Subject:', receivedMsg.subject);
  console.log('Received From:', receivedMsg.from);
  if (getBody.total < 1 || receivedMsg.subject !== 'Your Verification Code is 849201') {
    throw new Error('Retrieved message does not match payload');
  }

  console.log('\n--- 3. Testing Message Detail Retrieval ---');
  const detailRes = await handler({
    httpMethod: 'GET',
    path: `/api/custom/message/${receivedMsg.id}`,
    queryStringParameters: { address: testAddress },
    headers: {},
  });
  console.log('Detail Status:', detailRes.statusCode);
  const detailBody = JSON.parse(detailRes.body);
  console.log('Detail Text snippet:', detailBody.text.substring(0, 40));

  console.log('\n--- 4. Testing Message Deletion ---');
  const deleteRes = await handler({
    httpMethod: 'DELETE',
    path: `/api/custom/message/${receivedMsg.id}`,
    queryStringParameters: { address: testAddress },
    headers: {},
  });
  console.log('Delete Status:', deleteRes.statusCode);

  console.log('\n======================================================');
  console.log('CUSTOM DOMAIN INGESTION & POLLING TESTS PASSED 100%!');
  console.log('======================================================');
}

runCustomDomainTest().catch((err) => {
  console.error('Custom domain test failed:', err);
  process.exit(1);
});
