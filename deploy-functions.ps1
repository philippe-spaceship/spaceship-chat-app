# Supabase Edge Functions Deployment Script

Write-Host "🚀 Deploying Supabase Edge Functions..." -ForegroundColor Cyan

# Check if supabase CLI is installed
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Supabase CLI not found. Installing..." -ForegroundColor Red
    npm install -g supabase
}

# Navigate to project directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# List of functions to deploy
$functions = @(
    "spaceship-query",
    "add-comment",
    "add-document",
    "add-url",
    "analytics-citation",
    "delete-document",
    "delete-url",
    "list-documents",
    "list-urls",
    "load-conversations",
    "rate-message"
)

# Deploy each function
foreach ($func in $functions) {
    Write-Host "📦 Deploying $func..." -ForegroundColor Yellow
    supabase functions deploy $func
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $func deployed successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to deploy $func" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🎉 Deployment complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Your function URLs:" -ForegroundColor Cyan
Write-Host "https://ejgvdscyadtqrsouvorq.supabase.co/functions/v1/[function-name]" -ForegroundColor Gray




