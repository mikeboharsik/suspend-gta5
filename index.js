const http = require('http');
const { execSync } = require('child_process');

const port = 80;

const html = 
`<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <title>SuspendGTA5PS</title>

  <style>
    body {
      align-items: center;
      display: flex;
      flex-direction: column;
      font-family: monospace;
      height: 100%;
      justify-content: center;
      margin: 0;
      padding: 0;
      user-select: none;
      width: 100%;
    }

    #button {
      align-items: center;
      background: radial-gradient(#f00, #a00);
      border: 4px solid black;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      height: 128px;
      justify-content: center;
      text-align: center;
      width: 128px;
    }

    #status {
      height: 5em;
      margin-top: 1em;
      text-align: center;
    }
  </style>
</head>

<body>
  <div id="button" onClick="handleButtonClick()">
    Click to Suspend
  </div>
  <span id="status">Waiting for user input</span>

  <script>
    let fetching = false;

    function handleButtonClick() {
      if (!fetching) {
        sendRequest();
      }
    }

    function setStatus(msg) {
      document.querySelector("#status").innerHTML = msg;
    }

    async function sendRequest() {
      fetching = true;
      setStatus('Waiting for response...');
      return await fetch('/suspend', { method: 'post' })
        .then(async res => { 
          if (!res.ok) {
            setStatus(\`Received a non-success response:<br>\${await res.text()}\`);
          } else {
            setStatus('Waiting for user input');
          }
          return;
        })
        .catch(e => {
          setStatus('error');
          console.error(e);
        })
        .finally(() => {
          fetching = false;
        });
    }
  </script>
</body>
</html>`;

const psCommand =
`function InjectSuspendMethodsIntoScope {
  Add-Type @"
  using System;
  using System.Runtime.InteropServices;

  public static class Win32
  {
    [DllImport("kernel32.dll")]
    public static extern bool DebugActiveProcess(int processId);

    [DllImport("kernel32.dll")]
    public static extern bool DebugActiveProcessStop(int processId);
  }
"@
}

function Suspend {
  Param(
    [string] $processName
  )

  $ret = $false

  $processes = Get-Process | Where-Object { $_.ProcessName -Like "*$processName*" }

  foreach ($process in $processes) {
    $processId = $process.Id
    [Win32]::DebugActiveProcess($processId) | Out-Null
    $ret = $true
  }

  Write-Verbose "Processes suspended: $($processes.Length)"

  return $ret
}

function Unsuspend {
  Param(
    [string] $processName
  )

  $ret = $false

  $processes = Get-Process | Where-Object { $_.ProcessName -Like "*$processName*" }

  foreach ($process in $processes) {
    $processId = $process.Id
    [Win32]::DebugActiveProcessStop($processId) | Out-Null
    $ret = $true
  }

  Write-Verbose "Processes unsuspended: $($processes.Length)"

  return $ret
}

InjectSuspendMethodsIntoScope

if (Suspend "gta5") {
  Sleep 15

  Unsuspend "gta5" | Out-Null
  exit 0
} else {
  Write-Host "Failed to find a process to suspend"
  exit 1
}`;


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
.listen(80);

console.log(`Server listening on port ${port}`);