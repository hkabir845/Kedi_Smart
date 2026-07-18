# Call before Bubblewrap / keytool / gradle commands in this folder.
$jbrCandidates = @(
  "C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot",
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
$sdkCandidates = @(
  "$env:LOCALAPPDATA\Android\Sdk",
  "$env:USERPROFILE\.bubblewrap\android_sdk"
)
foreach ($sdk in $sdkCandidates) {
  if ((Test-Path "$sdk\platforms") -or (Test-Path "$sdk\tools")) {
    $env:ANDROID_HOME = $sdk
    $env:ANDROID_SDK_ROOT = $sdk
    Write-Host "ANDROID_HOME=$sdk"
    break
  }
}
java -version
