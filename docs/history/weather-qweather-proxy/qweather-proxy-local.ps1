[CmdletBinding()]
param(
	[ValidateSet('mock', 'live')]
	[string]$Mode = 'mock',
	[ValidateRange(1024, 65535)]
	[int]$Port = 8787,
	[Parameter(HelpMessage = 'The current UTC QWeather billing month in YYYY-MM format.')]
	[string]$BillingMonth,
	[Parameter(HelpMessage = 'The number of QWeather calls used before this proxy first ran this month. Repeat the same value on every same-month restart; the Durable Object tracks this proxy after its first reservation.')]
	[string]$ExternalCallsUsedThisMonth,
	[Parameter(HelpMessage = 'Confirms this month and account usage baseline are verified and no other untracked QWeather calls are shared with this blog account.')]
	[switch]$ConfirmQWeatherUsage
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$oldLocation = Get-Location
$apiKey = $null
$apiHost = $null
$credential = $null
$childExitCode = 0
$environmentNames = @(
	'QWEATHER_API_KEY',
	'QWEATHER_API_HOST',
	'QWEATHER_ACCOUNT_USAGE_CONFIRMED',
	'QWEATHER_BILLING_MONTH',
	'QWEATHER_ACCOUNT_CALLS_USED',
	'QWEATHER_BILLING_MONTH_ALIGNED',
	'WEATHER_PROXY_LOCAL_PORT',
	'WEATHER_PROXY_MINIFLARE_ROOT'
)
$previousEnvironment = @{}

try {
	if ($Mode -eq 'live') {
		$utcNow = [DateTime]::UtcNow
		$currentBillingMonth = $utcNow.ToString('yyyy-MM')
		if ($BillingMonth -cne $currentBillingMonth) {
			throw 'Live mode requires -BillingMonth set to the current UTC billing month.'
		}
		if (-not $ConfirmQWeatherUsage.IsPresent) {
			throw 'Live mode requires -ConfirmQWeatherUsage on every launch.'
		}
		if (
			$ExternalCallsUsedThisMonth -notmatch '^(0|[1-9]\d{0,5})$' -or
			[int]$ExternalCallsUsedThisMonth -gt 50000
		) {
			throw 'Live mode requires an explicit nonnegative monthly external-call baseline.'
		}
		$daysInUtcMonth = [DateTime]::DaysInMonth($utcNow.Year, $utcNow.Month)
		$billingMonthAligned = $utcNow.Day -ge 2 -and $utcNow.Day -le ($daysInUtcMonth - 2)
		if (-not $billingMonthAligned) {
			throw 'Live mode is closed within two UTC dates of a billing-month boundary.'
		}
	}

	foreach ($name in $environmentNames) {
		try {
			$previousEnvironment[$name] = (Get-Item -LiteralPath "Env:\$name").Value
		} catch {
			$previousEnvironment[$name] = $null
		}
		Remove-Item -LiteralPath "Env:\$name" -ErrorAction SilentlyContinue
	}

	$pnpmCommand = Get-Command -Name 'pnpm.cmd' -CommandType Application -ErrorAction Stop | Select-Object -First 1
	$pnpmExe = $pnpmCommand.Source
	$nodeCommand = Get-Command -Name 'node' -CommandType Application -ErrorAction Stop | Select-Object -First 1
	$nodeExe = $nodeCommand.Source
	$nodeScript = Join-Path $repoRoot 'weather-proxy\src\local-trial.mjs'
	$bootstrapArguments = @('dlx', '--package=wrangler@4.142.0', 'node', $nodeScript, '--resolve-runtime')
	Set-Location -LiteralPath $repoRoot
	$bootstrapOutput = @(& $pnpmExe @bootstrapArguments 2>&1)
	$bootstrapExitCode = $LASTEXITCODE
	if ($bootstrapExitCode -ne 0) {
		throw 'Could not resolve the pinned local Miniflare runtime.'
	}
	$bootstrapLines = @($bootstrapOutput | ForEach-Object { $_.ToString() })
	$miniflareLine = $bootstrapLines | Where-Object { $_.StartsWith('WEATHER_PROXY_MINIFLARE_ROOT:') } | Select-Object -Last 1
	$keyPresenceLine = $bootstrapLines | Where-Object { $_.StartsWith('WEATHER_PROXY_BOOTSTRAP_KEY_PRESENT:') } | Select-Object -Last 1
	if ($keyPresenceLine -cne 'WEATHER_PROXY_BOOTSTRAP_KEY_PRESENT:false') {
		throw 'Runtime bootstrap inherited an API key; refusing to start.'
	}
	if (-not $miniflareLine) {
		throw 'Pinned Miniflare runtime resolution returned no package path.'
	}
	$miniflareRoot = $miniflareLine.Substring('WEATHER_PROXY_MINIFLARE_ROOT:'.Length)
	$miniflareManifestPath = Join-Path $miniflareRoot 'package.json'
	if (-not (Test-Path -LiteralPath $miniflareManifestPath -PathType Leaf)) {
		throw 'Resolved Miniflare package is unavailable.'
	}
	$miniflareManifest = Get-Content -LiteralPath $miniflareManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
	if ($miniflareManifest.name -cne 'miniflare' -or $miniflareManifest.version -cne '5.20260926.0-alpha') {
		throw 'Resolved Miniflare package does not match the pinned runtime.'
	}

	if ($Mode -eq 'live') {
		$credentialPath = Join-Path $env:LOCALAPPDATA 'WindowsIt\QWeather\api-test.credential.xml'
		$credential = Import-Clixml -LiteralPath $credentialPath
		if ($credential -isnot [pscredential]) {
			throw 'The saved QWeather credential is unavailable.'
		}

		$apiHost = $credential.UserName.Trim()
		$hostPattern = '^[a-z\d](?:[a-z\d-]*[a-z\d])?(?:\.[a-z\d](?:[a-z\d-]*[a-z\d])?)+$'
		if ($apiHost -notmatch $hostPattern -or [Uri]::CheckHostName($apiHost) -ne [UriHostNameType]::Dns) {
			throw 'The saved QWeather API Host is invalid.'
		}

		$apiKey = $credential.GetNetworkCredential().Password
		if ([string]::IsNullOrWhiteSpace($apiKey) -or $apiKey -match '\s') {
			throw 'The saved QWeather API credential is invalid.'
		}

		$env:QWEATHER_API_HOST = $apiHost
		$env:QWEATHER_API_KEY = $apiKey
		$env:QWEATHER_ACCOUNT_USAGE_CONFIRMED = $ConfirmQWeatherUsage.IsPresent.ToString().ToLowerInvariant()
		$env:QWEATHER_BILLING_MONTH = $BillingMonth
		$env:QWEATHER_ACCOUNT_CALLS_USED = $ExternalCallsUsedThisMonth
		$env:QWEATHER_BILLING_MONTH_ALIGNED = $billingMonthAligned.ToString().ToLowerInvariant()
	} else {
		$env:QWEATHER_API_HOST = 'api9.example.qweather.test'
		$env:QWEATHER_API_KEY = 'local-mock-key'
		$env:QWEATHER_ACCOUNT_USAGE_CONFIRMED = ([bool]$true).ToString().ToLowerInvariant()
		$env:QWEATHER_BILLING_MONTH = [DateTime]::UtcNow.ToString('yyyy-MM')
		$env:QWEATHER_ACCOUNT_CALLS_USED = '0'
		$env:QWEATHER_BILLING_MONTH_ALIGNED = ([bool]$true).ToString().ToLowerInvariant()
	}

	$env:WEATHER_PROXY_LOCAL_PORT = $Port.ToString()
	$env:WEATHER_PROXY_MINIFLARE_ROOT = $miniflareRoot
	$nodeArguments = @($nodeScript)
	if ($Mode -eq 'mock') {
		$nodeArguments += '--mock'
	}

	& $nodeExe @nodeArguments
	$childExitCode = $LASTEXITCODE
} finally {
	foreach ($name in $environmentNames) {
		if ($null -eq $previousEnvironment[$name]) {
			Remove-Item -LiteralPath "Env:\$name" -ErrorAction SilentlyContinue
		} else {
			Set-Item -LiteralPath "Env:\$name" -Value $previousEnvironment[$name]
		}
	}
	$apiKey = $null
	$apiHost = $null
	$credential = $null
	Set-Location -LiteralPath $oldLocation
}

if ($childExitCode -ne 0) {
	throw "The local weather proxy exited with code $childExitCode."
}
