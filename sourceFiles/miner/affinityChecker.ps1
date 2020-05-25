$json = Get-Content -Path $env:APPDATA\charitas\options.json -TotalCount 1
$settingsFile  = $json | ConvertFrom-Json
$process = Get-process | where {$_.Path -imatch 'Charitas'}
foreach($aff in $process){
    $aff.ProcessorAffinity=$settingsFile.affinity
}