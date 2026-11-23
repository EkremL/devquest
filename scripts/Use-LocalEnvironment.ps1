# Dot-source this script before running the backend, integration tests, or psql.
param([string]$InstallRoot = (Join-Path $env:LOCALAPPDATA 'DevQuest/PostgreSQL'))
$ErrorActionPreference = 'Stop'
$instance = Get-Content -Raw (Join-Path $InstallRoot 'instance.json') | ConvertFrom-Json
$appCredential = Import-Clixml (Join-Path $InstallRoot 'app.credential.xml')
$testCredential = Import-Clixml (Join-Path $InstallRoot 'test.credential.xml')
$env:DEVQUEST_DB_PORT = [string]$instance.port
$env:DEVQUEST_DB_USERNAME = $appCredential.UserName
$env:DEVQUEST_DB_PASSWORD = $appCredential.GetNetworkCredential().Password
$env:DEVQUEST_TEST_DB_USERNAME = $testCredential.UserName
$env:DEVQUEST_TEST_DB_PASSWORD = $testCredential.GetNetworkCredential().Password
$env:JAVA_HOME = 'C:/Program Files/Java/jdk-25.0.3'
if (!(Test-Path (Join-Path $env:JAVA_HOME 'bin/java.exe'))) { throw 'Set JAVA_HOME to your installed JDK 25.0.3.' }
Write-Host 'Loaded DevQuest credentials into this process only (values are not displayed).'
