Get-Process | Where-Object { $_.ProcessName -match 'python|node' } | Stop-Process -Force
