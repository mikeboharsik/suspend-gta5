const http = require('http');
const https = require('https');

function get(hostname, path = '/') {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname, path }, res => {
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
};

function getSecure(hostname, path = '/') {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname, path }, res => {
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
};

module.exports = { get, getSecure };
