try {
    $ppt = New-Object -ComObject PowerPoint.Application
    Write-Output "PowerPoint is installed"
    $ppt.Quit()
} catch {
    Write-Output "PowerPoint COM not available: $_"
}
