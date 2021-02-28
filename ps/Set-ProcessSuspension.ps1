function Set-ProcessSuspension { 
  Param (
    [string] $ProcessName = "gta5"
  )

  $output = @{}
  $exitCode = 0

  function log {
    Param(
      [string] $msg
    )

    if (!$output.log) {
      $output.log = [string[]]@($msg)
    } else {
      $output.log += $msg
    }
  }

  function Inject-SuspendMethodsIntoScope {
    return Add-Type @"
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

  function Publish {
    Param(
      [string] $Event,
      [string] $Message
    )

    try {
      Invoke-RestMethod `
        -Uri "http://localhost/publish" `
        -Method 'POST' `
        -Headers @{ "Content-Type" = "application/json"; "X-Publisher" = $true } `
        -Body (@{ "event" = $Event; "message" = $Message } | ConvertTo-Json)
    } catch {
      Write-Error $_
    }
  }

  function Act {
    Param(
      [bool] $State
    )

    $ret = $false

    $func = $null
    if ($State) {
      $func = [Win32]::DebugActiveProcess
    } else {
      $func = [Win32]::DebugActiveProcessStop
    }

    log "Set method to '$($func.ToString())'"

    $processes = Get-Process | Where-Object { $_.ProcessName -eq $processName }

    foreach ($process in $processes) {
      $processId = $process.Id
      $func.Invoke($processId) | Out-Null
      $ret = $true
    }

    $output.debug = "Processes suspended: $($processes.Length)"

    return $ret
  }

  function Suspend { return Act $true }

  function Unsuspend { return Act $false }

  try {
    log "`$ProcessName is set to '$ProcessName'"

    Inject-SuspendMethodsIntoScope

    $result = Suspend
    if (!$result) {
      throw "Failed to find a process upon which to act ($ProcessName)"
    }
    Publish "SuspendSuccess"

    Sleep 15

    $result = Unsuspend
    if (!$result) {
      throw "Failed to find a process upon which to act ($ProcessName)"
    }
    Publish "UnsuspendSuccess"
  } catch {
    Publish "SuspendError" $_.Exception.Message

    $output.error = "Encountered exception: $($_.Exception.Message)"
    $exitCode = 1
  }

  Write-Host (ConvertTo-Json $output)

  exit $exitCode
}

Set-ProcessSuspension