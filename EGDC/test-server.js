const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <html>
      <body>
        <h1>Simple Server Test</h1>
        <p>This is a basic Node.js server running on port 3008</p>
        <p>If you can see this, Node.js networking is working!</p>
      </body>
    </html>
  `);
});

server.listen(3008, 'localhost', () => {
  console.log('Server running at http://localhost:3008');
});

server.on('error', (err) => {
  console.error('Server error:', err);
});