const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_DIR = path.join(__dirname, 'Repo1214');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function createRequestHandler() {
  return (req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/' || reqPath === '') {
      reqPath = '/index.html';
    }

    const filePath = path.join(BASE_DIR, reqPath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        if (err.code === 'ENOENT') {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
        } else {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('500 Server Error');
        }
      } else {
        res.writeHead(200, { 
          'Content-Type': contentType,
          'Cache-Control': 'no-cache',
          'Service-Worker-Allowed': '/'
        });
        res.end(content);
      }
    });
  };
}

// Listen on both 8080 (VSCode launch) and 3000
const server1 = http.createServer(createRequestHandler());
server1.listen(8080, () => {
  console.log(`Server running at http://localhost:8080/`);
}).on('error', (err) => {
  console.log(`Port 8080 unavailable: ${err.message}`);
});

const server2 = http.createServer(createRequestHandler());
server2.listen(3000, () => {
  console.log(`Server running at http://localhost:3000/`);
}).on('error', (err) => {
  console.log(`Port 3000 unavailable: ${err.message}`);
});
