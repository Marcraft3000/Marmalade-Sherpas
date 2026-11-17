[CmdletBinding()]
param(
    [string]$AppName = 'marmalade-plan-audit-upv-2026',
    [string]$ResourceGroup,
    [string]$AzureCliPath,
    [switch]$PackageOnly
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$archive = Join-Path ([IO.Path]::GetTempPath()) "$AppName-$([Guid]::NewGuid().ToString('N')).zip"
$settingsFile = $null

function Invoke-Azure {
    $output = & $azureCli @args
    if ($LASTEXITCODE -ne 0) { throw ('Azure CLI failed while running ' + ($args[0..1] -join ' ') + '.') }
    return $output
}

Push-Location -LiteralPath $repo
try {
    $samples = Get-ChildItem -File -Path 'cases/*/financial-health.json', 'cases/*/report.pdf' |
        ForEach-Object { 'cases/' + $_.Directory.Name + '/' + $_.Name }
    $inputs = @('package.json', 'package-lock.json', 'index.html', 'vite.config.js', 'postcss.config.js', 'tailwind.config.js', 'src', 'server') + $samples
    & tar.exe -a -c -f $archive @inputs
    if ($LASTEXITCODE -ne 0) { throw 'Could not create the deployment package.' }
    Write-Output $archive
    if ($PackageOnly) { return }

    $azureCli = if ($AzureCliPath) {
        (Resolve-Path -LiteralPath $AzureCliPath).Path
    } else {
        Get-Command az -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Source
    }
    if (-not $azureCli) {
        $azureCli = Get-ChildItem -Path 'node_modules/.cache/azure-cli-*/bin/az.cmd' -File -ErrorAction SilentlyContinue |
            Select-Object -First 1 -ExpandProperty FullName
        if ($azureCli -and -not $env:AZURE_CONFIG_DIR) {
            $env:AZURE_CONFIG_DIR = Join-Path $repo 'node_modules/.cache/azure-cli-config'
        }
    }
    if (-not $azureCli) {
        throw 'Azure CLI is required. Install it, run az login, and run this script again.'
    }
    if (-not $ResourceGroup) {
        $ResourceGroup = Invoke-Azure webapp list --query "[?name=='$AppName'].resourceGroup | [0]" --output tsv --only-show-errors
        if (-not $ResourceGroup) { throw 'The Web App is missing from the active subscription. Check az account show or pass -ResourceGroup.' }
    }
    $target = @('--resource-group', $ResourceGroup, '--name', $AppName, '--only-show-errors')
    $stored = Invoke-Azure webapp config appsettings list @target --output json | ConvertFrom-Json
    $current = @{}
    foreach ($setting in $stored) { $current[$setting.name] = $setting.value }
    $local = & node --env-file-if-exists=.env -e "const keys=['LLM_PROXY_URL','TEAM_KEY','OPENROUTER_PRIMARY_MODEL','OPENROUTER_FAST_MODEL','OPENROUTER_ANALYSIS_MODEL','TTS_PROVIDER','TTS_MODEL','OPENROUTER_TTS_MODEL','TTS_VOICE_ID','ELEVENLABS_API_KEY']; console.log(JSON.stringify(Object.fromEntries(keys.filter(key=>process.env[key]).map(key=>[key,process.env[key]]))))"
    if ($LASTEXITCODE -ne 0) { throw 'Could not read the local deployment configuration.' }
    $deployment = $local | ConvertFrom-Json -AsHashtable
    foreach ($key in @('SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY')) {
        if (-not $current[$key]) { throw "Set $key in the Azure Web App before deploying." }
    }
    if (-not ($deployment['TEAM_KEY'] -or $current['TEAM_KEY'])) { throw 'Configure TEAM_KEY in .env or Azure.' }
    if (-not ($deployment['TTS_VOICE_ID'] -or $current['TTS_VOICE_ID'])) { throw 'Configure TTS_VOICE_ID in .env or Azure.' }
    $deployment['ADVISOR_PORTAL'] = 'true'
    $deployment['PUBLIC_DEMO'] = 'true'
    $deployment['MOCK_AI'] = 'false'
    $deployment['ADVISOR_PLAN_AI'] = 'true'
    $deployment['ADVISOR_INTERVIEW_AI'] = 'true'
    $deployment['ADVISOR_QUESTIONS_AI'] = 'true'
    $deployment['ADVISOR_TTS'] = 'true'

    Invoke-Azure webapp config appsettings set @target --settings SCM_DO_BUILD_DURING_DEPLOYMENT=true --output none
    Invoke-Azure webapp deploy @target --src-path $archive --type zip --output none
    $settingsFile = Join-Path ([IO.Path]::GetTempPath()) "$([Guid]::NewGuid().ToString('N')).json"
    [IO.File]::WriteAllText($settingsFile, ($deployment | ConvertTo-Json -Compress))
    Invoke-Azure webapp config appsettings set @target --settings "@$settingsFile" --output none
    $healthUrl = "https://$AppName.azurewebsites.net/api/health"
    for ($attempt = 1; $attempt -le 12; $attempt++) {
        try {
            if ((Invoke-RestMethod -Uri $healthUrl -TimeoutSec 8).status -eq 'ok') {
                Write-Output "Azure health check passed at $healthUrl"
                return
            }
        } catch {}
        Start-Sleep -Seconds 5
    }
    throw "Azure accepted the deployment, but the health check did not pass at $healthUrl."
} finally {
    if ($settingsFile -and (Test-Path -LiteralPath $settingsFile)) { Remove-Item -LiteralPath $settingsFile }
    Pop-Location
}
