$headers = @{ Origin = 'http://localhost:4173' }
$body = '{"email":"test2@example.com","password":"testpassword123"}'
try {
  $r = Invoke-WebRequest -Uri 'http://127.0.0.1:4173/api/auth/login' -Method Post -Headers $headers -ContentType 'application/json' -Body $body -UseBasicParsing -SessionVariable "mySession"
  Write-Output $r.Content
  $mySession.Cookies.GetCookies("http://127.0.0.1:4173") | Select-Object Name, Value
  $reqBody = '{"message":"Olá"}'
  $rChat = Invoke-WebRequest -Uri 'http://127.0.0.1:4173/api/ai/chat' -Method Post -Headers $headers -ContentType 'application/json' -Body $reqBody -UseBasicParsing -WebSession $mySession
  Write-Output "--- CHAT RESPONSE ---"
  Write-Output $rChat.Content
} catch {
  $response = $_.Exception.Response
  $reader = New-Object IO.StreamReader($response.GetResponseStream())
  Write-Output "status=$($response.StatusCode.value__) body=$($reader.ReadToEnd())"
}
