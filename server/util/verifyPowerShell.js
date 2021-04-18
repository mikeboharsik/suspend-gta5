const { execSync } = require('child_process');

const prompt = require('prompt-sync')();

const { getSecure } = require('./get');

async function verifyPowerShell() {
  try {
    execSync('$PSVersionTable', { shell: 'pwsh' });

    return true;
  } catch (e) {
    const res = prompt('PowerShell Core needs to be installed. Would you like to install PowerShell Core? (y/n): ').toLowerCase();

    if (res === 'y') {
      const meta = JSON.parse(await getSecure('raw.githubusercontent.com', '/PowerShell/PowerShell/master/tools/metadata.json'));

      let { StableReleaseTag: version } = meta;
      version = version.replace('v', '');

      const msiLink = `https://github.com/PowerShell/PowerShell/releases/download/v${version}/PowerShell-${version}-win-x64.msi`;

      execSync(`start ${msiLink}`);
    } else {
      console.log('Not getting PowerShell');
    }

    return false;
  }
}

module.exports = { verifyPowerShell };
