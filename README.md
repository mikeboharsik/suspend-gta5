# Overview
This is a port of [SuspendGTA5PS](https://github.com/mikeboharsik/SuspendGTA5PS) which is intended to be more user-friendly for non-developers.

# Prerequisites
  * Windows 10

# Usage
1. Download and run the latest build of `suspend-gta5.exe` from the [releases page](https://github.com/mikeboharsik/suspend-gta5/releases)
    * Make sure you allow the app through all applicable firewalls if you want to be able to connect via another device, like a phone
    * By default, the port used is 80, so you don't need to specify a port when connecting to the server; this can be overridden by passing `port={num}` to the executable, such as `suspend-gta5.exe port=8080`
    * The program will check if PowerShell Core is installed; if it is not installed, the program will prompt you to install it and initiate the download in your Internet browser

2. Use a browser to connect to either `http://localhost` (and append the port if you have changed it) or whatever local IP address or hostname at which your PC is accessible
    * The web page will do its best to display the URLs on which it believes it is accessible