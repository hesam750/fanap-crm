param()

$ErrorActionPreference = 'Stop'

$baseUrl = 'http://localhost:3000'
$loginUrl = "$baseUrl/api/auth/login"
$usersUrl = "$baseUrl/api/users"

# Try multiple known seeded credentials (from prisma/seed.ts)
$credentialsToTry = @(
  @{ email = 'root@example.com'; password = 'root123' },
  @{ email = 'manager@example.com'; password = 'manager123' },
  @{ email = 'operator@example.com'; password = 'operator123' },
  @{ email = 'supervisor@example.com'; password = 'supervisor123' }
)

$session = $null
$loginResponse = $null
$loggedInEmail = $null

foreach ($cred in $credentialsToTry) {
  try {
    Write-Host "Attempting login as $($cred.email) ..."
    $loginBody = $cred | ConvertTo-Json
    $loginResponse = Invoke-WebRequest -Uri $loginUrl -Method POST -ContentType 'application/json' -Body $loginBody -SessionVariable session

    $authCookie = ($session.Cookies.GetCookies($baseUrl) | Where-Object { $_.Name -eq 'auth-token' } | Select-Object -First 1)
    if ($authCookie) {
      $loggedInEmail = $cred.email
      break
    }
  } catch {
    # try next credential
    continue
  }
}

if (-not $session -or -not $loggedInEmail) {
  throw 'Login failed with all known test credentials.'
}

Write-Host "Login OK as $loggedInEmail. Cookie acquired." -ForegroundColor Green

Write-Host "Fetching users ..."
$usersResponse = Invoke-WebRequest -Uri $usersUrl -WebSession $session -Method GET
$usersJson = $usersResponse.Content | ConvertFrom-Json
$users = @($usersJson.users)
if (-not $users -or $users.Count -eq 0) { throw 'No users returned' }
Write-Host "Users count:" $users.Count

# Prefer a non-root user; if none, create one for testing
$firstUser = $users | Where-Object { $_.email -ne 'root@example.com' } | Select-Object -First 1
if (-not $firstUser) {
  Write-Host "No non-root user found. Creating a temporary user for testing ..." -ForegroundColor Yellow
  $tempEmail = 'temp_' + [guid]::NewGuid().ToString('N') + '@example.com'
  $newUserBody = @{ name='Temp User'; email=$tempEmail; password='password'; role='operator'; isActive=$true } | ConvertTo-Json
  $newUserResp = Invoke-WebRequest -Uri $usersUrl -WebSession $session -Method POST -ContentType 'application/json' -Body $newUserBody
  $firstUser = ($newUserResp.Content | ConvertFrom-Json).user
  Write-Host "Created temp user:" $firstUser.id $firstUser.email
}

$targetId = $firstUser.id
$updateUrl = "$usersUrl/$targetId"

Write-Host "Updating user $targetId via PUT $updateUrl ..."
$updateBody = @{ name = 'Updated Name Test' } | ConvertTo-Json
$updateResp = Invoke-WebRequest -Uri $updateUrl -WebSession $session -Method PUT -ContentType 'application/json' -Body $updateBody
Write-Host "Update status:" $updateResp.StatusCode

Write-Host "Deleting user $targetId via DELETE $updateUrl ..."
$deleteResp = Invoke-WebRequest -Uri $updateUrl -WebSession $session -Method DELETE
Write-Host "Delete status:" $deleteResp.StatusCode

Write-Host "Creating a new temp user to test collection DELETE ..."
$newEmail2 = 'temp_' + [guid]::NewGuid().ToString('N') + '@example.com'
$newUser2Body = @{ name='Temp User 2'; email=$newEmail2; password='password'; role='operator'; isActive=$true } | ConvertTo-Json
$newUser2Resp = Invoke-WebRequest -Uri $usersUrl -WebSession $session -Method POST -ContentType 'application/json' -Body $newUser2Body
$newUser2 = ($newUser2Resp.Content | ConvertFrom-Json).user
Write-Host "Created user:" $newUser2.id $newUser2.email

Write-Host "Deleting via collection DELETE with body { id } ..."
$deleteBody = @{ id = $newUser2.id } | ConvertTo-Json
$collDeleteResp = Invoke-WebRequest -Uri $usersUrl -WebSession $session -Method DELETE -ContentType 'application/json' -Body $deleteBody
Write-Host "Collection DELETE status:" $collDeleteResp.StatusCode

Write-Host 'All user route tests completed successfully.' -ForegroundColor Green