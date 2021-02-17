const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const html = fs.readFileSync(path.join(__dirname, './client/index.html'), 'utf-8');
const psCommand = fs.readFileSync(path.join(__dirname, './ps/command.ps1'), 'utf-8');

function getPortArg() {
  const args = process.argv;
  for (arg of args) {
    const matches = arg.match(/port=(\d+)/);
    if (matches) {
      return parseInt(matches[1]);
    }
  }
  return null;
}

const port = getPortArg() ?? 80;

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