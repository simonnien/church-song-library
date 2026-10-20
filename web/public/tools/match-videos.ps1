param([string]$VideoFolder,[string]$PackageFolder=$PSScriptRoot,[switch]$NonInteractive)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
try {
 if(!$VideoFolder -and $NonInteractive){throw 'VideoFolder is required'}
 if(!$VideoFolder){$picker=New-Object Windows.Forms.FolderBrowserDialog;$picker.Description='選擇背景影片所在資料夾（含子資料夾）';if($picker.ShowDialog() -ne 'OK'){exit};$VideoFolder=$picker.SelectedPath}
 $files=@(Get-ChildItem -LiteralPath $VideoFolder -Recurse -File -ErrorAction SilentlyContinue)
 $manifest=Get-Content -LiteralPath (Join-Path $PackageFolder 'media-map.json') -Raw -Encoding UTF8 | ConvertFrom-Json
 $mapping=@{};$problems=@()
 foreach($m in $manifest){
  $matches=@($files | Where-Object {$_.Name -ieq $m.filename})
  if($matches.Count -eq 1){$mapping[$m.placeholder]=$matches[0].FullName}
  elseif($matches.Count -eq 0){$problems+="找不到：$($m.filename)"}
  else {$problems+="同名多個，請選更精確的資料夾：$($m.filename)`r`n$($matches.FullName -join "`r`n")"}
 }
 if($problems.Count){throw ($problems -join "`r`n`r`n")}
 $output=Join-Path $PackageFolder ('matched-'+(Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
 New-Item -ItemType Directory -Path $output | Out-Null
 foreach($file in Get-ChildItem -LiteralPath $PackageFolder -File | Where-Object {$_.Extension -in '.show','.project'}){
  $text=Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
  foreach($key in $mapping.Keys){$escaped=ConvertTo-Json -InputObject $mapping[$key] -Compress;$text=$text.Replace(('"'+$key+'"'),$escaped)}
  [IO.File]::WriteAllText((Join-Path $output $file.Name),$text,[Text.UTF8Encoding]::new($false))
 }
 if($NonInteractive){Write-Output $output;exit 0}
 [Windows.Forms.MessageBox]::Show("已依檔名配對完成。請匯入此資料夾內的 .project 或 .show：`r`n$output",'影片配對完成') | Out-Null
} catch {if($NonInteractive){Write-Error $_.Exception.Message;exit 1};[Windows.Forms.MessageBox]::Show($_.Exception.Message,'未產生匯入檔') | Out-Null;exit 1}
