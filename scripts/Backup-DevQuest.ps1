#Requires -Version 5.1
. (Join-Path $PSScriptRoot 'Recovery-Common.ps1')
$root = Join-Path $env:LOCALAPPDATA 'DevQuest/Backups'
# Refuse redirected/junction paths rather than following them into synchronized storage.
for ($dir = [IO.DirectoryInfo]$root; $dir; $dir = $dir.Parent) {
    if ($dir.Exists -and ($dir.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw "Redirected backup path: $dir" }
}
foreach ($excluded in @($env:OneDrive,$env:OneDriveCommercial,$env:OneDriveConsumer,$installation,(Split-Path $PSScriptRoot))) {
    if ($excluded -and ($root + '\').StartsWith(([IO.Path]::GetFullPath($excluded).TrimEnd('\') + '\'),[StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe backup directory.' }
}
$name = 'devquest_db_' + (Get-Date -Format yyyyMMdd_HHmmss) + '_' + [guid]::NewGuid().ToString('N')
$stage = Join-Path $root ($name + '.partial')
New-Item -ItemType Directory -Path $stage -ErrorAction Stop | Out-Null
$dump = Join-Path $stage 'devquest_db.dump'
$before = @(Get-RecoverySnapshot 'devquest_db')
Invoke-PgTool pg_dump $app ($connection + @('-Fc','-f',$dump,'-d','devquest_db'))
Invoke-PgTool pg_restore $app @('--list',$dump) | Out-Null
if (Compare-Object $before @(Get-RecoverySnapshot 'devquest_db')) { throw 'Live data changed during backup. Pause edits and retry.' }
@{manifestVersion=2; sha256=(Get-FileHash -LiteralPath $dump).Hash; snapshot=$before} | ConvertTo-Json | Set-Content (Join-Path $stage 'manifest.json') -Encoding UTF8
$destination = Join-Path $root $name
[IO.Directory]::Move($stage,$destination)
Write-Output $destination
