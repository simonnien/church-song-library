param([string]$VideoFolder,[string]$ShowsFolder,[string]$PackageFolder=$PSScriptRoot,[switch]$NonInteractive)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
function Choose-Folder($description){$picker=New-Object Windows.Forms.FolderBrowserDialog;$picker.Description=$description;if($picker.ShowDialog() -ne 'OK'){throw '已取消，未產生匯入檔'};return $picker.SelectedPath}
function Read-Json($path){return Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json}
function Song-Title($name){return (($name -replace '^\s*\d+\s*[-_－–—]\s*','').Trim() -replace '\s+',' ').ToLowerInvariant()}
function Save-Json($path,$value){[IO.File]::WriteAllText($path,(ConvertTo-Json -InputObject $value -Depth 100),[Text.UTF8Encoding]::new($false))}
try {
 $preferencesPath=Join-Path $env:LOCALAPPDATA 'ChurchSongLibrary/media-preferences.json'
 $preferences=[pscustomobject]@{folder='';files=@{}}
 if(Test-Path -LiteralPath $preferencesPath){try{$preferences=Read-Json $preferencesPath}catch{}}
 $remembered=@{};if($preferences.files){foreach($prop in $preferences.files.PSObject.Properties){$remembered[$prop.Name]=$prop.Value}}
 # Read only the configured library; never write into FreeShow's own Shows directory.
 if(!$ShowsFolder){foreach($configName in @('settings.json','config.json')){
  $configPath=Join-Path $env:APPDATA ('FreeShow/'+$configName)
  if(Test-Path -LiteralPath $configPath){try{$config=Read-Json $configPath;if($config.dataPath){$candidate=Join-Path $config.dataPath 'Shows';if(Test-Path -LiteralPath $candidate -PathType Container){$ShowsFolder=$candidate;break}}}catch{}}
 }}
 if(!$ShowsFolder){if($NonInteractive){throw 'ShowsFolder is required'};$ShowsFolder=Choose-Folder '選擇 FreeShow 的 Shows 歌曲資料夾（請先儲存 FreeShow 的修改）'}
 if(!(Test-Path -LiteralPath $ShowsFolder -PathType Container)){throw '找不到 FreeShow Shows 資料夾'}
 $library=@();$problems=@();$report=@('來源歌曲庫：'+$ShowsFolder)
 foreach($file in Get-ChildItem -LiteralPath $ShowsFolder -Filter '*.show' -File){
  try{$raw=Read-Json $file.FullName;if($raw -isnot [array] -or $raw.Count -ne 2 -or $raw[0] -isnot [string] -or !$raw[1].name){throw '缺少歌曲 ID 或名稱'}
   $library+=,[pscustomobject]@{Id=$raw[0];Show=$raw[1];File=$file.FullName;Title=(Song-Title $raw[1].name)}
  }catch{$problems+='無法讀取歌曲，請先修復或移出歌曲庫：'+$file.Name}
 }
 if($problems.Count){throw ($problems -join "`r`n")}
 $projectFiles=@(Get-ChildItem -LiteralPath $PackageFolder -Filter '*.project' -File)
 if($projectFiles.Count -ne 1){throw '下載包應有一個 .project，請完整解壓縮到獨立資料夾'}
 $data=Read-Json $projectFiles[0].FullName
 $missing=@{};$references=@();$usedExisting=0
 foreach($reference in $data.project.shows){
  if($reference.type -ne 'show'){$references+=,$reference;continue}
  $source=$data.shows.PSObject.Properties[$reference.id].Value
  if(!$source){throw ('歌單缺少歌曲內容：'+$reference.id)}
  # Identity wins; otherwise use exact display name, then a unique title without its catalog prefix.
  $matches=@($library | Where-Object {$_.Id -eq $reference.id})
  if(!$matches.Count){$matches=@($library | Where-Object {$_.Show.name -ieq $source.name})}
  if(!$matches.Count){$title=Song-Title $source.name;$matches=@($library | Where-Object {$_.Title -eq $title})}
  if($matches.Count -gt 1){$problems+=('歌曲同名多個，請先在 FreeShow 整理：'+$source.name+"`r`n"+($matches.File -join "`r`n"));continue}
  if($matches.Count -eq 1){
   $local=$matches[0];$reference.id=$local.Id;$reference.name=$local.Show.name
   $layout=$local.Show.settings.activeLayout
   if(!$layout -or !$local.Show.layouts.PSObject.Properties[$layout]){$layout=@($local.Show.layouts.PSObject.Properties.Name)[0]}
   if(!$layout){throw ('本機歌曲沒有可用版面：'+$source.name)}
   $reference.layout=$layout;$usedExisting++;$report+='使用本機歌曲：'+$local.Show.name
   # Do not embed local songs: importProject then creates only missing songs and preserves local edits.
  }else{
   $showPath=Join-Path $PackageFolder ($source.name+'.show')
   if(!(Test-Path -LiteralPath $showPath)){throw ('下載包缺少 .show：'+$source.name)}
   $download=Read-Json $showPath
   if($download -isnot [array] -or $download.Count -ne 2 -or $download[0] -ne $reference.id){throw ('下載歌曲 ID 不一致：'+$source.name)}
   $missing[$reference.id]=$download[1];$report+='新增下載歌曲：'+$source.name
  }
  $references+=,$reference
 }
 if($problems.Count){throw ($problems -join "`r`n`r`n")}
 $data.project.shows=$references;$data.shows=[pscustomobject]$missing
 # Only new songs need downloaded-package backgrounds. Existing songs retain all local media/layouts.
 $manifest=@(Read-Json (Join-Path $PackageFolder 'media-map.json'))
 $serialized=ConvertTo-Json -InputObject $data -Depth 100
 $needed=@($manifest | Where-Object {$serialized.Contains('"'+$_.placeholder+'"')})
 $mapping=@{}
 if($needed.Count){
  if(!$VideoFolder -and $preferences.folder -and (Test-Path -LiteralPath $preferences.folder -PathType Container)){$VideoFolder=$preferences.folder}
  if(!$VideoFolder -and !$NonInteractive -and (Test-Path -LiteralPath 'D:\FreeShow\video')){$VideoFolder='D:\FreeShow\video'}
  if(!$VideoFolder){if($NonInteractive){throw 'VideoFolder is required for backgrounds'};$VideoFolder=Choose-Folder '選擇背景影片資料夾（會記住本次位置）'}
  $files=@(Get-ChildItem -LiteralPath $VideoFolder -Recurse -File -ErrorAction SilentlyContinue)
  foreach($m in $needed){
   $key=$m.filename+'|'+$m.bytes
   if($remembered[$key] -and (Test-Path -LiteralPath $remembered[$key] -PathType Leaf)){$mapping[$m.placeholder]=$remembered[$key];$report+='使用記住的影片：'+$m.filename;continue}
   $matches=@($files|Where-Object {$_.Name -ieq $m.filename -and (!$m.bytes -or $_.Length -eq $m.bytes)})
   if($matches.Count -eq 1){$mapping[$m.placeholder]=$matches[0].FullName;$report+='找到影片：'+$m.filename}
   elseif($NonInteractive){$problems+=('影片缺少或同名多個：'+$m.filename)}
   else{
    $picker=New-Object Windows.Forms.OpenFileDialog;$picker.Title='指定影片（缺少或同名多個）：'+$m.filename;$picker.Filter='影片|*.mp4;*.mov;*.mkv;*.webm;*.avi';$picker.InitialDirectory=$VideoFolder
    if($picker.ShowDialog() -eq 'OK'){$mapping[$m.placeholder]=$picker.FileName;$remembered[$key]=$picker.FileName;$report+='手動指定並記住：'+$m.filename+' → '+$picker.FileName}else{$problems+='未指定影片：'+$m.filename}
   }
  }
 }
 if($problems.Count){throw ($problems -join "`r`n`r`n")}
 foreach($key in $mapping.Keys){$serialized=$serialized.Replace(('"'+$key+'"'),(ConvertTo-Json -InputObject $mapping[$key] -Compress))}
 $data=$serialized|ConvertFrom-Json
 if($VideoFolder -and !$NonInteractive){New-Item -ItemType Directory -Force -Path (Split-Path $preferencesPath) | Out-Null;Save-Json $preferencesPath @{folder=$VideoFolder;files=$remembered}}
 $output=Join-Path $PackageFolder ('matched-'+(Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
 New-Item -ItemType Directory -Path $output | Out-Null
 $projectPath=Join-Path $output $projectFiles[0].Name
 Save-Json $projectPath $data
 foreach($property in $data.shows.PSObject.Properties){$safeName=$property.Value.name -replace '[<>:"/\\|?*]','_';Save-Json (Join-Path $output ($safeName+'.show')) @($property.Name,$property.Value)}
 $report+="使用本機 $usedExisting 首；新增 $($missing.Count) 首。請匯入 .project；已存在歌曲不會被覆蓋。"
 [IO.File]::WriteAllLines((Join-Path $output '配對結果.txt'),$report,[Text.UTF8Encoding]::new($true))
 if($NonInteractive){Write-Output $output;exit 0}
 [Windows.Forms.MessageBox]::Show(($report -join "`r`n")+"`r`n`r`n輸出：$output",'歌曲與影片配對完成')|Out-Null
 # Let the installed .project association open FreeShow; fallback keeps the ready-to-import file accessible.
 try{Start-Process -FilePath $projectPath}catch{Start-Process explorer.exe -ArgumentList ('"'+$output+'"')}
} catch {if($NonInteractive){Write-Error $_.Exception.Message;exit 1};[Windows.Forms.MessageBox]::Show($_.Exception.Message,'未產生匯入檔')|Out-Null;exit 1}
