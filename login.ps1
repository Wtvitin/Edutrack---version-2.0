$headers = @{ Origin = 'http://localhost:4173' }
$body = '{"email":"test2@example.com","password":"testpassword123"}'
$r = Invoke-WebRequest -Uri 'http://127.0.0.1:4173/api/auth/login' -Method Post -Headers $headers -ContentType 'application/json' -Body $body -UseBasicParsing -SessionVariable "mySession"
Write-Output $r.Content
Write-Output '--- Cookies ---'
$mySession.Cookies.GetCookies("http://127.0.0.1:4173") | Select-Object Name, Value
