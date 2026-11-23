param([string]$InstallRoot = (Join-Path $env:LOCALAPPDATA 'DevQuest/PostgreSQL'))
$ErrorActionPreference = 'Stop'
$data = Join-Path $InstallRoot 'data'
$pgctl = Join-Path $InstallRoot 'pgsql/bin/pg_ctl.exe'
& $pgctl -D $data status
if ($LASTEXITCODE -eq 0) { return }
& $pgctl -D $data -l (Join-Path $InstallRoot 'postgresql.log') -w start
if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL failed to start. Inspect postgresql.log.' }
