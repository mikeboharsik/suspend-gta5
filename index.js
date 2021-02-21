const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { clear } = require('console');

clear();

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

function get(hostname) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname, path: '/' }, res => {
      const buf = [];
      res.on('data', d => {
        buf.push(d);
      });
      res.on('end', () => {
        resolve(buf.join());
      });
    });

    req.on('error', e => {
      reject(e);
    });

    req.end();
  });
}

function handleRequest({ req, res }) {
  function log(...args) {
    const { id } = req;

    console.log(`${new Date().toISOString()} [${id}]:`, ...args)
  }

  try {
    const requestId = parseInt(Math.random() * 1000000).toString().padStart(6, '0');
    req.id = requestId;

    const { client, headers, method, url } = req;
    const { remoteAddress } = client;

    const referer = headers.referer ? `via ${headers.referer}` : '';
    log(`${remoteAddress} => ${method} ${url} ${referer}`);

    let out = '';
    if (method === 'POST' && url === '/suspend') {
      if (suspendInProgress) {
        const msg = 'Another suspend request is currently in progress';
        res.statusCode = 429;
        throw new Error(msg);
      }

      suspendInProgress = true;
      exec(psCommand, { shell: 'pwsh'}, (err, stdout, stderr) => {
        try {
          if (stderr) {
            out = stderr;
          } else {
            out = stdout;
          }
          res.json(out);
        } catch(e) {
          throw e;
        } finally {
          suspendInProgress = false;
        }
      });
    } else if (url === '/hostinfo') {
      exec('ipconfig', (err, stdout, stderr) => {
        if (stderr) {
          res.statusCode = 500;
          out = JSON.stringify({ error: stderr });
        } else {
          const ipconfig = stdout;

          exec('hostname', async (err, stdout, stderr) => {
            const hostname = stdout.trim();
            
            const dnsMatches = Array.from(ipconfig.matchAll(/Connection-specific DNS Suffix.+: (\S+)/g))
              .reduce((all, match) => {
                return [`${hostname}.${match[1].trim()}`, ...all];
              }, []);

            const ipMatches = Array.from(ipconfig.matchAll(/IPv4 Address.+: (\S+)/g))
              .reduce((all, match) => {
                return [match[1].trim(), ...all];
              }, []);

            const bindings = [...ipMatches, ...dnsMatches].reduce((acc, cur) => [...acc, { name: cur, works: false }], []);

            const jobs = bindings.map(binding =>
              new Promise(async (resolve, reject) => {
                try {
                  const { name } = binding;
                  await get(name);
                  binding.works = true;
                  resolve(true);
                } catch {
                  reject(false);
                }
              })
            );

            try { await Promise.allSettled(jobs) } catch { }

            res.json(bindings);
          });
        }
      });
    } else if (url.includes('\.map')) {
      res.statusCode = 404;
      res.send();
    } else {
      res.html(html);
    }
  } catch (e) {
    res.json({ error: e.message });
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
      res.html = function(html) { this.header('Content-Type', 'text/html'); this.end(html) };
      res.send = function(str) { this.header('Content-Type', 'text/plain'); this.end(str) };
      res.json = function(ob) {
        try {
          const par = typeof ob === 'string' ? JSON.parse(ob) : ob;

          if (par.error && this.statusCode < 400) { this.statusCode = 500 }

          this.header('Content-Type', 'application/json');
          this.end(JSON.stringify(par));
        } catch(e) {
          console.warn(e);
          this.send(ob);
        }
      };

      resolve({ req, res });
    })
    .on('error', e => reject(e));
  })
  .then(handleRequest);
}

const server = http.createServer(handleHttp)
  .listen(port, '0.0.0.0')

console.log(`Server listening on port ${port}`);