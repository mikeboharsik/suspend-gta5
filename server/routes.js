const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const { get } = require('./util/get');
const { getArg } = require('./util/getArg');

const html = fs.readFileSync(path.join(__dirname, '../client/prod/index.html'), 'utf-8');
const psText = fs.readFileSync(path.join(__dirname, '../ps/Set-ProcessSuspension.ps1'), 'utf-8');

let suspensionInProgress = false;

const debug_name = getArg('debug_name');

const root = {
  method: 'GET',
  path: '/',
  handler: (req, res) => {
    res.html(html);
  },
};

function getIpconfig() {
  return new Promise((resolve, reject) => {
    exec('ipconfig', (err, stdout, stderr) => {
      if (stderr) return reject(stderr)
      resolve(stdout);
    });
  });
}

function getHostname() {
  return new Promise((resolve, reject) => {
    exec('hostname', (err, stdout, stderr) => {
      if (stderr) return reject(stderr)
      resolve(stdout);
    });
  });
}

async function getBindings() {
  const [ipconfig, hostname] = await Promise.allSettled([getIpconfig(), getHostname()])
    .then(results => results.map(result => result.value));

  const dnsMatches = Array.from(ipconfig.matchAll(/Connection-specific DNS Suffix.+: (\S+)/g))
    .reduce((all, match) => {
      return [`${hostname.trim()}.${match[1].trim()}`, ...all];
    }, []);

  const ipMatches = Array.from(ipconfig.matchAll(/IPv4 Address.+: (\S+)/g))
    .reduce((all, match) => {
      return [match[1].trim(), ...all];
    }, []);

  const bindings = [...ipMatches, ...dnsMatches]
    .reduce((acc, cur) => [...acc, { name: cur, works: null }], []);

  const jobs = bindings.map(binding =>
    (async () => {
      try {
        const { name } = binding;
        await get(name);
        binding.works = true;
        return true;
      } catch(e) {
        console.error(e);
        return false;
      }
    })()
  );

  try { await Promise.allSettled(jobs); } catch(e) { console.error(e) }

  return bindings;
}

const hostInfo = {
  method: 'GET',
  path: '/hostinfo',
  handler: async (req, res) => {
    const result = await getBindings();

    res.json(result);
  },
};

function sendSuspensionCommand(command) {
  return new Promise((resolve, reject) => {
    suspensionInProgress = true;
    exec(command, { shell: 'pwsh'}, (err, stdout, stderr) => {
      try {
        if (stderr) reject(stderr);
        resolve(stdout);
      } catch(e) {
        console.error(e);
        reject(e);
      } finally {
        suspensionInProgress = false;
      }
    });
  });
}

const suspend = {
  method: 'POST',
  path: '/suspend',
  handler: async (req, res) => {
    if (suspensionInProgress) {
      const msg = 'Another suspension request is currently in progress';
      res.statusCode = 429;
      throw new Error(msg);
    }

    let command = psText;
    if (debug_name) {
      command = command.replace('$ProcessName = "gta5"', `$ProcessName = "${debug_name}"`);
    }
    
    try {
      sendSuspensionCommand(command);

      res.statusCode = 202;
      res.send();
    } catch (e) {
      console.error(e);
      res.statusCode = 500;
      res.send();
    }
  },
};

const publish = {
  method: 'POST',
  path: '/publish',
  handler: (req, res) => {
    const { headers: { 'content-type': contentType, 'x-publisher': xPublisher } } = req;
    if (!xPublisher) {
      res.statusCode = 400;
      return res.send();
    }

    if (contentType !== 'application/json') {
      res.statusCode = 400;
      return res.send();
    }

    const { body: { event, message } } = req;

    req.io.emit(event, message);

    res.send();
  },
};

module.exports = {
  routes: [hostInfo, publish, root, suspend]
}