#Requires -RunAsAdministrator

$destinationRelativeToSystemRoot = '../Program Files/suspend-gta5'
$destination = Join-Path $env:systemroot $destinationRelativeToSystemRoot

if (!(Test-Path $destinationRelativeToSystemRoot)) {
  mkdir $destination
}

yarn build
cp ./bin/* $destination