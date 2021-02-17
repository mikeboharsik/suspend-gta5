# Overview
This is a port of [SuspendGTA5PS](https://github.com/mikeboharsik/SuspendGTA5PS) which is intended to be more user-friendly for non-developers.

# Prerequisites
  * Windows 10
  * [Latest PowerShell Core installed via `.msi` file from this page](https://github.com/PowerShell/PowerShell/releases)

# Usage
Download and run one of the built `suspend-gta5.exe` files from the [releases page](https://github.com/mikeboharsik/suspend-gta5/releases). Make sure you allow the app through the firewall if you want to be able to connect via another device, like a phone.

By default, the port used is 80, so you don't need to specify a port. This can be overridden by passing `port={num}` to the executable, such as `suspend-gta5.exe port=8080`.

Use a browser to connect to either `http://localhost{:port}` or whatever local IP address or hostname your PC is accessible at.