#Requires -Version 5.1
param([Parameter(Mandatory)][string]$BackupDirectory)
. (Join-Path $PSScriptRoot 'Recovery-Common.ps1')
$dump = Join-Path $BackupDirectory 'devquest_db.dump'
$manifest = Get-Content -Raw -LiteralPath (Join-Path $BackupDirectory 'manifest.json') | ConvertFrom-Json
if ($manifest.sha256 -ne (Get-FileHash -LiteralPath $dump).Hash) { throw 'Archive checksum mismatch. No database created.' }
Invoke-PgTool pg_restore $app @('--list',$dump) | Out-Null
$before = @(Get-RecoverySnapshot 'devquest_db')
$target = 'devquest_verify_' + [guid]::NewGuid().ToString('N')
$admin = Import-Clixml (Join-Path $installation 'admin.credential.xml')
Write-Host "Verification target: $target (retained for inspection)"
Invoke-PgTool createdb $admin @('-w','-h','127.0.0.1','-p',"$port",'-U',$admin.UserName,'--maintenance-db=postgres','-T','template0','-O',$app.UserName,$target)
Invoke-PgTool psql $app ($connection + @('-X','-v','ON_ERROR_STOP=1','-d',$target,'-c',"REVOKE CONNECT ON DATABASE $target FROM PUBLIC"))
try {
    Invoke-PgTool pg_restore $app ($connection + @('--single-transaction','--no-owner','--no-acl','-d',$target,$dump))
    $restored = @(Get-RecoverySnapshot $target)
    if (Compare-Object @($manifest.snapshot) $restored) { throw "Restored data differs from backup manifest. Inspect $target." }
} finally {
    if (Compare-Object $before @(Get-RecoverySnapshot 'devquest_db')) { throw 'Live data changed during verification. Investigate concurrent edits.' }
}
Write-Host "Verified SHA-256 $($manifest.sha256), restored tables, and unchanged live snapshot."
$restored
