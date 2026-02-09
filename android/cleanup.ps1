# Clean all Capacitor plugin build directories in node_modules
$nmPath = "c:\Users\cyphr\Documents\Company2Code\reach\node_modules\@capacitor"
Get-ChildItem $nmPath -Directory | ForEach-Object {
    $buildDir = Join-Path $_.FullName "android\build"
    if (Test-Path $buildDir) {
        Remove-Item -Recurse -Force $buildDir
        Write-Host "Removed: $buildDir"
    }
}

# Also clean community plugins
$communityPath = "c:\Users\cyphr\Documents\Company2Code\reach\node_modules\@capacitor-community"
if (Test-Path $communityPath) {
    Get-ChildItem $communityPath -Directory | ForEach-Object {
        $buildDir = Join-Path $_.FullName "android\build"
        if (Test-Path $buildDir) {
            Remove-Item -Recurse -Force $buildDir
            Write-Host "Removed: $buildDir"
        }
    }
}

# Clean main android build dirs
$androidBuild = "c:\Users\cyphr\Documents\Company2Code\reach\android\app\build"
$androidRoot = "c:\Users\cyphr\Documents\Company2Code\reach\android\build"
$androidGradle = "c:\Users\cyphr\Documents\Company2Code\reach\android\.gradle"

if (Test-Path $androidBuild) { Remove-Item -Recurse -Force $androidBuild; Write-Host "Removed: $androidBuild" }
if (Test-Path $androidRoot) { Remove-Item -Recurse -Force $androidRoot; Write-Host "Removed: $androidRoot" }
if (Test-Path $androidGradle) { Remove-Item -Recurse -Force $androidGradle; Write-Host "Removed: $androidGradle" }

Write-Host "Cleanup complete"
