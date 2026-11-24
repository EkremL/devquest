# M2.3 verification · November 24, 2026

The native Windows backup and restore rehearsal succeeded. Live devquest_db was read only. No restore targeted the development or test database.

| Evidence | Actual result |
| --- | --- |
| Published backup directory under %LOCALAPPDATA%\DevQuest\Backups | devquest_db_20261124_092943_7e7c7829a34e4339b265dcb38b41bc35 |
| Archive SHA-256, checked before restore | 2A995CCFB5B237951B6C003D0BC7582F89714A8BBACFB70AA96271011AA0860D |
| Archive inspection | Native pg_restore --list succeeded |
| New database retained for review | devquest_verify_8a96cf196a86479cb7e04df5f75bf2ae |
| Restored rows | 1 curriculum, 1 revision, 98 nodes, 889 items, 889 mappings, 889 progress rows, 0 events |
| Read checks | 25 completed, 864 not started. All 889 mappings joined to revision and progress. Stored source SHA-256 matched the source text. |
| Current revision | b179570f-9505-4bae-8e8b-c6ee02b7365c, the sole revision in the live V2 schema |
| Flyway | 3 history rows, numbered migrations 1 and 2. The rehearsal preserved the live schema as found. |
| Live protection | Before/after row fingerprints matched for the seven learning tables and Flyway history. The restored rows also matched the backup manifest. |
| Final backend regression | mvnw.cmd -B -Pintegration verify passed once, 10 unit and 27 PostgreSQL integration tests. Covered roadmap reads, saved progress, events, export, revision retention and safe re-import on devquest_test_db. |
| Final frontend regression | npm.cmd test passed all 27 tests. npm.cmd run build passed TypeScript and Vite. |

The positive restore verified the real data, which currently has no events and one revision. Nonempty event and multi-revision preservation were exercised by the application regression tests, not by this live archive. The fingerprints check known application tables. The dump itself covers the entire database. Cross-version and second-PC recovery were documented but not performed. PostgreSQL was returned to its initial stopped state.

## Repeat the rehearsal

```powershell
.\scripts\Start-LocalPostgres.ps1
$backup = .\scripts\Backup-DevQuest.ps1
.\scripts\Test-DevQuestBackup.ps1 -BackupDirectory $backup
```

The [Windows recovery guide](WINDOWS_RECOVERY.md) gives the standalone checksum and inspection commands, manual recovery procedure, and explicitly confirmed cleanup. No cleanup was requested for the retained database.

Created scripts/Backup-DevQuest.ps1, scripts/Test-DevQuestBackup.ps1, scripts/Recovery-Common.ps1, docs/WINDOWS_RECOVERY.md and this report. Updated docs/WINDOWS_DEVELOPMENT.md and frontend/src/features/data-safety/DataSafetyPage.tsx. No backend or migration changes.

Suggested commit message: `feat: add verified local PostgreSQL backup and recovery`.
