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
function Get-RecoverySnapshot([string]$Database) {
    # One statement uses one MVCC snapshot. Canonical ordering includes every row and column.
    $tables = 'curriculum','curriculum_revision','curriculum_node','checklist_item','source_item_mapping','item_progress','progress_event','flyway_schema_history'
    $queries = foreach ($table in $tables) {
        "SELECT '$table', count(*), encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text COLLATE `"C`")::text,'[]'),'UTF8')),'hex') FROM devquest.$table t"
    }
    $sql = ($queries -join ' UNION ALL ') + ' ORDER BY 1'
    Invoke-PgTool psql $app ($connection + @('-X','-qAt','-v','ON_ERROR_STOP=1','-d',$Database,'-c',"SET TIME ZONE 'UTC'; $sql"))
}
