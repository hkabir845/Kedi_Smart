# Call before Bubblewrap / keytool commands in this folder.
# Adds Android Studio's JDK + Android SDK to the current PowerShell session.
$jbrCandidates = @(
  "C:\Program Files\Android\Android Studio1\jbr",
  "C:\Program Files\Android\Android Studio\jbr"
)
foreach ($jbr in $jbrCandidates) {
  if (Test-Path "$jbr\bin\java.exe") {
    $env:JAVA_HOME = $jbr
    $env:Path = "$jbr\bin;$env:Path"
    Write-Host "JAVA_HOME=$jbr"
    break
  }
}
$sdk = "$env:LOCALAPPDATA\Android\Sdk"
if (Test-Path $sdk) {
  $env:ANDROID_HOME = $sdk
  $env:ANDROID_SDK_ROOT = $sdk
  Write-Host "ANDROID_HOME=$sdk"
}
java -version
