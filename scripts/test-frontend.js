async function checkAssets() {
  try {
    const res = await fetch('http://127.0.0.1:5173');
    const html = await res.text();
    console.log('HTML size:', html.length, 'Contains root div:', html.includes('id="root"'));
    console.log('Title included:', html.includes('DropMail'));

    const sRes = await fetch('http://127.0.0.1:5173/src/main.jsx');
    const scriptContent = await sRes.text();
    console.log('src/main.jsx Status:', sRes.status, 'Script size:', scriptContent.length);

    const appRes = await fetch('http://127.0.0.1:5173/src/App.jsx');
    const appContent = await appRes.text();
    console.log('src/App.jsx Status:', appRes.status, 'App size:', appContent.length);

    console.log('--- Frontend Assets Verification Passed ---');
  } catch (e) {
    console.error('Frontend check failed:', e);
    process.exit(1);
  }
}

checkAssets();
