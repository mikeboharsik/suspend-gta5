$output = @{}
$exitCode = 0

function InjectSuspendMethodsIntoScope {
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

  $processes = Get-Process | Where-Object { $_.ProcessName -eq $processName }

  foreach ($process in $processes) {
    $processId = $process.Id
    [Win32]::DebugActiveProcess($processId) | Out-Null
    $ret = $true
  }

  $output.debug = "Processes suspended: $($processes.Length)"

  return $ret
}

function Unsuspend {
  Param(
    [string] $processName
  )

  $ret = $false

  $processes = Get-Process | Where-Object { $_.ProcessName -eq $processName }

  foreach ($process in $processes) {
    $processId = $process.Id
    [Win32]::DebugActiveProcessStop($processId) | Out-Null
    $ret = $true
  }

  $output.debug = Write-Host "Processes unsuspended: $($processes.Length)"

  return $ret
}

InjectSuspendMethodsIntoScope

if (Suspend "gta5") {
  Sleep 15

  Unsuspend "gta5" | Out-Null
} else {
  $output.error = "Failed to find a process to suspend"
  $exitCode = 1
}

Write-Host (ConvertTo-Json $output)
exit $exitCode