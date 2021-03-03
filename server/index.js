const http = require('http');
const { clear } = require('console');

const { getArg } = require('./util/getArg');
const { routes } = require('./routes');

clear();

const port = getArg('port') ?? 80;

let io = null;

async function handleRequest({ req, res }) {
  try {
    const { client, headers, method, url } = req;
    const { remoteAddress } = client;

    const referer = headers.referer ? `via ${headers.referer}` : '';
    res.log(`${remoteAddress} => ${method} ${url} ${referer}`);

    if (remoteAddress === '127.0.0.1') {
      res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    }

    if (url.includes('\.map')) {
      res.statusCode = 404;
      return res.send();
    }

    const { handler } = (routes.find(route =>
      route.method.toUpperCase() === method.toUpperCase()
      && route.path === url
    ) || {});

    if (!handler) {
      console.error(`Could not find handler for ${method} ${url}`);
      res.statusCode = 404;
      return res.send();
    }

    return await handler(req, res);
  } catch (e) {
    console.error('Error while handling request', e);
    res.json({ error: e.message });
  }
}

function handleHttp(req, res) {
  return new Promise((resolve, reject) => {
    let body = [];
    req.on('data', chunk => {
      body.push(chunk);
    }).on('end', () => {
      const requestId = parseInt(Math.random() * 1000000).toString().padStart(6, '0');
      req.id = requestId;

      function log(...args) {
        const { id } = req;
    
        console.log(`${new Date().toISOString()} [${id}]:`, ...args)
      }

      body = body.toString();
      req.body = null;

      if (req.headers['content-type'] === 'application/json') {
        try { req.body = JSON.parse(body); } catch {}
      }

      if (!req.body) req.body = body;

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
          console.warn(`Error serializing JSON, returning text/plain instead`, e);
          this.send(ob);
        }
      };
      res.log = log;

      req.io = io;

      resolve({ req, res });
    })
    .on('error', e => reject(e));
  })
  .then(handleRequest)
  .catch(e => {
    res.statusCode = 500;
    res.send(e.toString());
  });
}

const server = http.createServer(handleHttp)
  .listen(port, '0.0.0.0');

io = require("socket.io")(server, {
  cors: {
    origin: ["http://localhost", "http://localhost:3000"],
  },
});

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

console.log(`Server listening on port ${port}`);