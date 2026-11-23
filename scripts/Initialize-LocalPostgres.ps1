#Requires -Version 5.1
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$ArchivePath,
    [string]$InstallRoot = (Join-Path $env:LOCALAPPDATA 'DevQuest/PostgreSQL'),
    [ValidateRange(1024, 65535)][int]$Port = 55432
)
$ErrorActionPreference = 'Stop'
$InstallRoot = [IO.Path]::GetFullPath($InstallRoot)
if ($InstallRoot -match '(?i)OneDrive') { throw 'PostgreSQL must be outside OneDrive.' }
$archive = (Resolve-Path -LiteralPath $ArchivePath).Path
$data = Join-Path $InstallRoot 'data'
if (Test-Path -LiteralPath $InstallRoot) {
    throw "Installation directory already exists: $InstallRoot. Refusing to replace any existing installation or data."
}
$probe = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $Port)
try { $probe.Start() } finally { $probe.Stop() }
New-Item -ItemType Directory -Path $InstallRoot | Out-Null
Expand-Archive -LiteralPath $archive -DestinationPath $InstallRoot
$bin = Join-Path $InstallRoot 'pgsql/bin'
if (!(Test-Path (Join-Path $bin 'initdb.exe'))) { throw 'Expected native PostgreSQL binaries were not found.' }

function New-LocalCredential([string]$Username) {
    $bytes = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    $password = -join ($bytes | ForEach-Object { $_.ToString('x2') })
    return [PSCredential]::new($Username, (ConvertTo-SecureString $password -AsPlainText -Force))
}
$admin = New-LocalCredential 'devquest_admin'
$app = New-LocalCredential 'devquest_app'
$test = New-LocalCredential 'devquest_test'
# Windows DPAPI protects these files for the current Windows account.
$admin | Export-Clixml (Join-Path $InstallRoot 'admin.credential.xml')
$app | Export-Clixml (Join-Path $InstallRoot 'app.credential.xml')
$test | Export-Clixml (Join-Path $InstallRoot 'test.credential.xml')
@{ installRoot = $InstallRoot; port = $Port } | ConvertTo-Json | Set-Content (Join-Path $InstallRoot 'instance.json') -Encoding UTF8
$passwordFile = Join-Path $InstallRoot 'initdb-password.tmp'
try {
    [IO.File]::WriteAllText($passwordFile, $admin.GetNetworkCredential().Password)
    & (Join-Path $bin 'initdb.exe') -D $data -U devquest_admin -A scram-sha-256 --encoding=UTF8 --locale=C "--pwfile=$passwordFile"
    if ($LASTEXITCODE -ne 0) { throw 'initdb failed.' }
} finally {
    if (Test-Path -LiteralPath $passwordFile) { Remove-Item -LiteralPath $passwordFile }
}
@"

# Dedicated DevQuest instance. Never listen on a public interface.
listen_addresses = '127.0.0.1'
port = $Port
password_encryption = 'scram-sha-256'
"@ | Add-Content (Join-Path $data 'postgresql.conf') -Encoding UTF8
@"
# Loopback TCP only, password authentication required.
host all all 127.0.0.1/32 scram-sha-256
"@ | Set-Content (Join-Path $data 'pg_hba.conf') -Encoding ASCII
& (Join-Path $bin 'pg_ctl.exe') -D $data -l (Join-Path $InstallRoot 'postgresql.log') -w start
if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL did not start.' }

$previousPassword = $env:PGPASSWORD
try {
    $env:PGPASSWORD = $admin.GetNetworkCredential().Password
    # Passwords are generated hexadecimal strings, sent via stdin, never command arguments.
    $sql = @"
CREATE ROLE devquest_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '$($app.GetNetworkCredential().Password)';
CREATE ROLE devquest_test LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '$($test.GetNetworkCredential().Password)';
CREATE DATABASE devquest_db OWNER devquest_app;
CREATE DATABASE devquest_test_db OWNER devquest_test;
REVOKE CONNECT ON DATABASE devquest_db FROM PUBLIC;
REVOKE CONNECT ON DATABASE devquest_test_db FROM PUBLIC;
GRANT CONNECT ON DATABASE devquest_db TO devquest_app;
GRANT CONNECT ON DATABASE devquest_test_db TO devquest_test;
"@
    $sql | & (Join-Path $bin 'psql.exe') -X -w -h 127.0.0.1 -p $Port -U devquest_admin -d postgres -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) { throw 'Dedicated database provisioning failed.' }
} finally { $env:PGPASSWORD = $previousPassword; $sql = $null }
Write-Host "Native PostgreSQL is ready at 127.0.0.1:$Port. Data: $data"
Write-Host 'Created devquest_db and isolated devquest_test_db. No Windows service was installed.'
