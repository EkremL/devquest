# Shared by the two local recovery commands. Keep passwords scoped to each native call.
$ErrorActionPreference = 'Stop'
$installation = Join-Path $env:LOCALAPPDATA 'DevQuest/PostgreSQL'
$port = (Get-Content -Raw (Join-Path $installation 'instance.json') | ConvertFrom-Json).port
$app = Import-Clixml (Join-Path $installation 'app.credential.xml')

function Invoke-PgTool($Tool, $Credential, [string[]]$Arguments) {
    $previous = $env:PGPASSWORD
    try {
        $env:PGPASSWORD = $Credential.GetNetworkCredential().Password
        & (Join-Path $installation "pgsql/bin/$Tool.exe") @Arguments
        if ($LASTEXITCODE -ne 0) { throw "$Tool failed with exit code $LASTEXITCODE." }
    } finally { $env:PGPASSWORD = $previous }
}
$connection = @('-w','-h','127.0.0.1','-p',"$port",'-U',$app.UserName)
function Get-RecoverySnapshot([string]$Database, [int]$ManifestVersion = 2, [pscredential]$Credential = $app) {
    # One statement uses one MVCC snapshot. Canonical ordering includes every row and column.
    $snapshotConnection = @('-w','-h','127.0.0.1','-p',"$port",'-U',$Credential.UserName)
    $tables = 'curriculum','curriculum_revision','curriculum_node','checklist_item','source_item_mapping','item_progress','progress_event','flyway_schema_history'
    if ($ManifestVersion -eq 2) {
        $version = Invoke-PgTool psql $Credential ($snapshotConnection + @('-X','-qAt','-v','ON_ERROR_STOP=1','-d',$Database,'-c',
            "SELECT coalesce(max(version::int),0) FROM devquest.flyway_schema_history WHERE success AND version ~ '^[0-9]+$'"))
        if ([int]$version -ge 4) { $tables += 'assessment_draft' }
        if ([int]$version -ge 5) { $tables += 'assessment_attempt' }
    } elseif ($ManifestVersion -ne 1) { throw 'Unsupported recovery manifest version.' }
    $queries = foreach ($table in $tables) {
        # JSONB normalizes object keys. Include the original serialized snapshot to verify option ordering too.
        $row = if ($table -eq 'assessment_attempt') { "jsonb_build_array(to_jsonb(t),t.snapshot::text)" } else { "to_jsonb(t)" }
        "SELECT '$table', count(*), encode(sha256(convert_to(coalesce(jsonb_agg($row ORDER BY convert_to(${row}::text,'UTF8'))::text,'[]'),'UTF8')),'hex') FROM devquest.$table t"
    }
    $sql = ($queries -join ' UNION ALL ') + ' ORDER BY 1'
    Invoke-PgTool psql $Credential ($snapshotConnection + @('-X','-qAt','-v','ON_ERROR_STOP=1','-d',$Database,'-c',"SET TIME ZONE 'UTC'; $sql"))
}
