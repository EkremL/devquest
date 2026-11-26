#Requires -Version 5.1
param([switch]$Check)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$frontend = Join-Path $PSScriptRoot '../frontend'
$release = 'http-401-and-403/1'
$package = Join-Path $frontend "src/features/learning/labs/$release"
$brief = Get-Content -LiteralPath (Join-Path $package 'brief.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$source = Join-Path $package 'starter'
$output = Join-Path $frontend "public/labs/$release/$($brief.starter.filename)"
$files = @(
  'README.md'
  'pom.xml'
  'src/main/java/com/ekrem/devquest/lab/LabApplication.java'
  'src/main/java/com/ekrem/devquest/lab/SecurityConfig.java'
  'src/main/resources/application.properties'
  'src/test/java/com/ekrem/devquest/lab/SummarySecurityTest.java'
)
$timestamp = [DateTimeOffset]::new(2000, 1, 1, 0, 0, 0, [TimeSpan]::Zero)

[xml]$pom = Get-Content -LiteralPath (Join-Path $source 'pom.xml') -Raw
if ($brief.starter.java -cne $pom.project.properties.'java.version' -or
    $brief.starter.springBoot -cne $pom.project.parent.version) {
  throw 'The lab brief must match the Java and Spring Boot versions in pom.xml.'
}

if (!$Check) {
  New-Item -ItemType Directory -Force -Path (Split-Path $output -Parent) | Out-Null
  $buffer = [IO.MemoryStream]::new()
  try {
    $zip = [IO.Compression.ZipArchive]::new($buffer, [IO.Compression.ZipArchiveMode]::Create, $true)
    try {
      foreach ($file in $files) {
        $entry = $zip.CreateEntry($file, [IO.Compression.CompressionLevel]::NoCompression)
        $entry.LastWriteTime = $timestamp
        $entry.ExternalAttributes = 0
        $stream = $entry.Open()
        try {
          $bytes = [IO.File]::ReadAllBytes((Join-Path $source $file))
          $stream.Write($bytes, 0, $bytes.Length)
        } finally { $stream.Dispose() }
      }
    } finally { $zip.Dispose() }
    [IO.File]::WriteAllBytes($output, $buffer.ToArray())
  } finally { $buffer.Dispose() }
}

$archive = [IO.Compression.ZipFile]::OpenRead($output)
try {
  if (($archive.Entries.FullName -join "`n") -cne ($files -join "`n")) {
    throw 'The ZIP contents do not match the starter allowlist.'
  }
  foreach ($entry in $archive.Entries) {
    $stream = $entry.Open()
    try { $archivedHash = (Get-FileHash -InputStream $stream -Algorithm SHA256).Hash }
    finally { $stream.Dispose() }
    $sourceHash = (Get-FileHash -LiteralPath (Join-Path $source $entry.FullName) -Algorithm SHA256).Hash
    if ($archivedHash -cne $sourceHash) {
      throw "Starter ZIP differs from $($entry.FullName). Run scripts/Package-LabStarter.ps1."
    }
  }
} finally { $archive.Dispose() }
Write-Output "Verified $($files.Count) files in $($brief.starter.filename)."
