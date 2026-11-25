# Windows backup and recovery

Run these commands in PowerShell from the repository root under the Windows account that owns the DevQuest installation. Stop the backend or pause all edits while taking and checking a backup. Keep PostgreSQL running.

```powershell
.\scripts\Start-LocalPostgres.ps1
$backup = .\scripts\Backup-DevQuest.ps1
$backup
$dump = Join-Path $backup 'devquest_db.dump'
$manifest = Get-Content -Raw (Join-Path $backup 'manifest.json') | ConvertFrom-Json
if ((Get-FileHash -LiteralPath $dump -Algorithm SHA256).Hash -ne $manifest.sha256) { throw 'Checksum mismatch' }
& "$env:LOCALAPPDATA\DevQuest\PostgreSQL\pgsql\bin\pg_restore.exe" --list $dump
if ($LASTEXITCODE) { throw 'Cannot inspect archive' }
.\scripts\Test-DevQuestBackup.ps1 -BackupDirectory $backup
```

The backup command prints the new directory under `%LOCALAPPDATA%\DevQuest\Backups`. To verify an older copy, set `$backup` to that copy's full directory path. Both files must travel together. A directory ending in `.partial` signals an unfinished run. Keep its diagnostics and retry into a new directory. Each run keeps previous backups. Save the console error and generated database name if verification fails.

PostgreSQL stores accepted Markdown revisions, hierarchy, stable item IDs, source mappings, four-state progress, timestamps, events, and migration history. Repository files supply application code, migrations, scripts, and the original curriculum. Markdown export represents completion with one checkbox and cannot recover database identities or history. Keep a separate repository copy and keep the backup on an encrypted drive separate from this PC. The dump is not encrypted. Its checksum detects accidental damage, not malicious replacement of both files. Restore only trusted archives.

Verification creates an empty database from template0 using the DPAPI-protected database administrator credential. The application role restores in one transaction. Verification compares table counts and ordered row fingerprints to the saved manifest, including every revision and mapping. It also compares live learning data before and after. Allow enough disk space for another database. Concurrent live edits can make verification fail. Backups do not include cluster roles, local passwords, or server configuration.

### Optional cleanup after review

The verifier always retains the database. Only after deciding to discard that exact copy, stop any application using it, run the following, check the displayed target, and answer the interactive confirmation. Never discard a database that you adopted for recovery.

```powershell
. .\scripts\Recovery-Common.ps1
$target = Read-Host 'Exact disposable verification database name'
if ($target -cnotmatch '^devquest_verify_[0-9a-f]{32}$') { throw 'Invalid verification target' }
Invoke-PgTool dropdb $app ($connection + @('--interactive','--maintenance-db=postgres',$target))
```

### Disaster recovery or migration to another PC

1. Preserve the damaged installation and any recent backup separately. Stop application writes. Copy the repository and a trusted backup directory to the recovery computer. Verify its SHA-256 against a separately kept checksum if available.
2. Use the same PostgreSQL major version where possible. A newer server may accept an older logical dump. An older destination is not guaranteed to work. Use matching native tools and verify the restored data before switching. [PostgreSQL pg_dump documentation](https://www.postgresql.org/docs/18/app-pgdump.html)
3. On a new PC, provision a fresh, loopback-only DevQuest instance in an empty installation directory following WINDOWS_DEVELOPMENT.md. Generate new local credentials there. DPAPI credential files belong to their original Windows account and computer. On an existing installation, leave its cluster and credentials intact. Never run initialization against existing data.
4. If the original live database is readable, use the verification script above. If the live database is missing or unreadable, use the following manual recovery on the replacement instance after checking the checksum and archive listing. The destination is always new. If creation fails, stop.
   
```powershell
. .\scripts\Recovery-Common.ps1
$target = 'devquest_recovered_' + [guid]::NewGuid().ToString('N')
$admin = Import-Clixml (Join-Path $installation 'admin.credential.xml')
Invoke-PgTool createdb $admin @('-w','-h','127.0.0.1','-p',"$port",'-U',$admin.UserName,'--maintenance-db=postgres','-T','template0','-O',$app.UserName,$target)
Invoke-PgTool psql $app ($connection + @('-X','-v','ON_ERROR_STOP=1','-d',$target,'-c',"REVOKE CONNECT ON DATABASE $target FROM PUBLIC"))
Invoke-PgTool pg_restore $app ($connection + @('--single-transaction','--no-owner','--no-acl','-d',$target,$dump))
$format = if ($null -eq $manifest.manifestVersion) { 1 } else { [int]$manifest.manifestVersion }
if (Compare-Object @($manifest.snapshot) @(Get-RecoverySnapshot $target $format)) { throw 'Recovered data differs' }
```

5. Confirm the restored revision, mappings, progress and event counts before starting the app. Keep the archive untouched. Start the matching DevQuest release against the recovered database by setting the datasource URL explicitly in the backend terminal. Flyway may apply newer migrations to this recovered copy at startup.

```powershell
. .\scripts\Use-LocalEnvironment.ps1
$env:SPRING_DATASOURCE_URL = "jdbc:postgresql://127.0.0.1:$env:DEVQUEST_DB_PORT/$target"
Set-Location backend
.\mvnw.cmd spring-boot:run
```

Open the roadmap and export its Markdown. Confirm the expected learning state before resuming writes. Record the chosen database name in the private local datasource configuration before subsequent restarts. The standard backup script targets only devquest_db. If adopting a differently named database permanently, update and verify the backup source as part of that cutover before resuming normal use. Keep the original database for independent review.

## Assessment drafts and submitted attempts

Before first starting a backend with a new migration against your personal database, run the backup and verification procedure above. Full database backups include saved draft responses and positions from V4 and submitted attempts from V5. The version 2 manifest fingerprints the complete contents of both tables when the corresponding migration has been applied. This includes the original serialized attempt snapshot and option order. Older manifests can still be checked against the tables they originally covered.

Restore the full archive to a fresh database. Use a compatible DevQuest build with the original authored package to continue an unfinished draft. Completed attempts carry a bounded snapshot of their paper, answers, guided markers, grading explanations and rubric. History reads this snapshot directly. Optional self-ratings belong to the submission. Unconfirmed edits and earlier temporary practice sessions have no historical record. Keep the repository for Reading deep links. Treat archives and restored databases as personal learning data.

### Rehearse assessment recovery on isolated test data

The test source must contain a guided draft and a completed attempt with guided, independent and written responses. Use a separately created empty database owned by the local test role. The script takes a full custom-format dump into a unique temporary file, hashes it, inspects it, restores it in one transaction and compares all manifest tables before and after. It retains the temporary archive and target database for inspection. Neither parameter accepts the personal database name.

```powershell
. .\scripts\Recovery-Common.ps1
$test = Import-Clixml (Join-Path $installation 'test.credential.xml')
$admin = Import-Clixml (Join-Path $installation 'admin.credential.xml')
$target = 'devquest_verify_' + [guid]::NewGuid().ToString('N')
Invoke-PgTool createdb $admin @('-w','-h','127.0.0.1','-p',"$port",'-U',$admin.UserName,'--maintenance-db=postgres','-T','template0','-O',$test.UserName,$target)
Invoke-PgTool psql $test @('-w','-h','127.0.0.1','-p',"$port",'-U',$test.UserName,'-d',$target,'-c',"REVOKE CONNECT ON DATABASE $target FROM PUBLIC")
.\scripts\Test-AssessmentRecovery.ps1 -SourceDatabase $sourceTestDatabase -EmptyTarget $target
```
