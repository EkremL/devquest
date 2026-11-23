param([string]$InstallRoot = (Join-Path $env:LOCALAPPDATA 'DevQuest/PostgreSQL'))
$ErrorActionPreference = 'Stop'
& (Join-Path $InstallRoot 'pgsql/bin/pg_ctl.exe') -D (Join-Path $InstallRoot 'data') -m fast -w stop
if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL could not be stopped; check whether it is running.' }
