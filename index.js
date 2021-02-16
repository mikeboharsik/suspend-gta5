const http = require('http');
const fs = require('fs');
const { execSync } = require('child_process');

const html = fs.readFileSync('./index.html', 'utf-8');
const psCommand = fs.readFileSync('./psCommand.ps1', 'utf-8');

const port = 80;

const server = http.createServer((req, res) => {
  new Promise((resolve, reject) => {
    let body = [];
    req.on('data', chunk => {
      body.push(chunk);
    }).on('end', () => {
      body = Buffer.from(body).toString();
      req.body = body;
      resolve({ req, res });
    });
  })
    .then(({ req, res }) => {
      const { client, method, url } = req;
      const { remoteAddress } = client;

      console.log(`${remoteAddress} => ${method} ${url}`);

      if (method === 'POST' && url === '/suspend') {
        let out = '';
        try {
          out = execSync(psCommand, { shell: 'pwsh' });
        } catch(e) {
          res.statusCode = 500;
          out = e.stdout.toString().trim();
        }
        console.log(`Returning ${res.statusCode}`);
        res.end(Buffer.from(out).toString());
      } else {
        console.log(`Returning ${res.statusCode}`);
        res.end(Buffer.from(html).toString());
      }
    });
})
.listen(port, '0.0.0.0')

console.log(`Server listening on port ${port}`);