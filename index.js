const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const html = fs.readFileSync(path.join(__dirname, './client/prod/index.html'), 'utf-8');
let psCommand = fs.readFileSync(path.join(__dirname, './ps/command.ps1'), 'utf-8');

const argPattern = '{arg}=(.+)$';

let suspendInProgress = false;

function getArg(arg, d) {
  if (d) console.log({ arg });

  const pattern = new RegExp(argPattern.replace('{arg}', arg));
  if (d) console.log({ pattern });

  const args = process.argv;
  if (d) console.log({ args });

  for (arg of args) {
    const matches = arg.match(pattern);
    if (d) console.log(matches);
    if (matches) {
      return matches[1];
    }
  }

  return null;
}

const port = getArg('port') ?? 80;
const debug_name = getArg('debug_name');
if (debug_name) {
  console.log({ debug_name });
  psCommand = psCommand.replace('$ProcessName = "gta5"', `$ProcessName = "${debug_name}"`);
}

function handleRequest({ req, res }) {
  try {
    const { client, method, url } = req;
    const { remoteAddress } = client;

    console.log(`${remoteAddress} => ${method} ${url}`);

    let out = '';
    if (method === 'POST' && url === '/suspend') {
      if (suspendInProgress) {
        res.statusCode = 429;
        res.send(JSON.stringify({ error: 'Another suspend request is currently in progress' }));
        return;
      }

      suspendInProgress = true;
      exec(psCommand, { shell: 'pwsh'}, (err, stdout, stderr) => {
        try {
          if (stderr) {
            res.statusCode = 500;
            out = stderr;
          } else {
            out = stdout;
          }
          res.header('Content-Type', 'application/json');
          res.send(out);
        } catch(e) {
          throw e;
        } finally {
          suspendInProgress = false;
        }
      });
    } else {
      console.log(`Returning ${res.statusCode}`);

      out = html;
      res.header('Content-Type', 'text/html');
      res.send(out);
    }
  } catch (e) {
    res.statusCode = 500;
    res.header('Content-Type', 'application/json');
    res.send(JSON.stringify({ error: e.message }));
  }
}

function handleHttp(req, res) {
  return new Promise((resolve, reject) => {
    let body = [];
    req.on('data', chunk => {
      body.push(chunk);
    }).on('end', () => {
      body = Buffer.from(body).toString();
      req.body = body;

      res.header = function(name, value) { this.setHeader(name, value) };
      res.send = function(str) { this.end(str) };

      resolve({ req, res });
    });
  })
  .then(handleRequest);
}

const server = http.createServer(handleHttp)
  .listen(port, '0.0.0.0')

console.log(`Server listening on port ${port}`);