# PowerShell script to reset today's HoopGrids puzzle
# Requires: You must be logged in as admin on the website in your default browser

Write-Host "Resetting today's HoopGrids puzzle..." -ForegroundColor Cyan

$response = Invoke-WebRequest -Uri "https://minecraftbasketball.com/api/admin/minigames/reset" `
    -Method POST `
    -UseDefaultCredentials `
    -SessionVariable session

if ($response.StatusCode -eq 200) {
    $result = $response.Content | ConvertFrom-Json
    Write-Host "✅ Success: $($result.message)" -ForegroundColor Green
    Write-Host "New puzzle generated for: $($result.date)" -ForegroundColor Yellow
} else {
    Write-Host "❌ Failed to reset puzzle" -ForegroundColor Red
    Write-Host $response.Content
}
