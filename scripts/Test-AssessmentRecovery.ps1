#Requires -Version 5.1
param(
    [Parameter(Mandatory)][ValidatePattern('^devquest_test_db_learning_[a-f0-9]{32}$')][string]$SourceDatabase,
    [Parameter(Mandatory)][ValidatePattern('^devquest_verify_[a-f0-9]{32}$')][string]$EmptyTarget
)
. (Join-Path $PSScriptRoot 'Recovery-Common.ps1')
$testCredential = Import-Clixml (Join-Path $installation 'test.credential.xml')
$argsLocal = @('-w','-h','127.0.0.1','-p',"$port",'-U',$testCredential.UserName)
function Invoke-TestQuery($Database, $Sql) {
    Invoke-PgTool psql $testCredential ($argsLocal + @('-X','-qAt','-v','ON_ERROR_STOP=1','-d',$Database,'-c',$Sql))
}
$nonSystem = "SELECT count(*) FROM pg_namespace WHERE nspname <> 'public' AND nspname <> 'information_schema' AND nspname !~ '^pg_'"
$publicObjects = "SELECT count(*) FROM pg_class WHERE relnamespace = 'public'::regnamespace"
if ((Invoke-TestQuery $EmptyTarget $nonSystem) -ne '0' -or (Invoke-TestQuery $EmptyTarget $publicObjects) -ne '0') {
    throw 'Restore requires a fresh empty verification database.'
}
$fixture = @"
SELECT EXISTS (
  SELECT 1 FROM devquest.assessment_draft
  WHERE jsonb_array_length(answers)>=2 AND jsonb_array_length(revealed)>0
) AND EXISTS (
  SELECT 1 FROM devquest.assessment_attempt
  WHERE written AND guided>0 AND independent_correct+independent_incorrect>0
  AND json_array_length(snapshot->'results')>0
)
"@
if ((Invoke-TestQuery $SourceDatabase $fixture) -ne 't') { throw 'Expected a nontrivial saved draft and completed attempt.' }
$source = @(Get-RecoverySnapshot $SourceDatabase 2 $testCredential)
$archive = Join-Path ([IO.Path]::GetTempPath()) ('devquest-rehearsal-' + [guid]::NewGuid().ToString('N') + '.dump')
Invoke-PgTool pg_dump $testCredential ($argsLocal + @('-Fc','-f',$archive,'-d',$SourceDatabase))
$sha = (Get-FileHash -LiteralPath $archive).Hash
Invoke-PgTool pg_restore $testCredential @('--list',$archive) | Out-Null
try {
    Invoke-PgTool pg_restore $testCredential ($argsLocal + @('--single-transaction','--no-owner','--no-acl','-d',$EmptyTarget,$archive))
    $restored = @(Get-RecoverySnapshot $EmptyTarget 2 $testCredential)
    if (Compare-Object $source $restored) { throw 'Restored contents differ from the captured source snapshot.' }
    if ((Get-FileHash -LiteralPath $archive).Hash -ne $sha) { throw 'Archive changed during verification.' }
} finally {
    if (Compare-Object $source @(Get-RecoverySnapshot $SourceDatabase 2 $testCredential)) { throw 'Source changed during verification.' }
}
Write-Host "Verified archive $archive SHA-256 $sha"
Write-Host "Restored and retained $EmptyTarget. Source $SourceDatabase unchanged."
$restored
