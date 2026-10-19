param([string]$DataPath)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new()
$data = Get-Content -LiteralPath $DataPath -Raw -Encoding UTF8 | ConvertFrom-Json
$app = $null
$deck = $null
try {
    $app = New-Object -ComObject PowerPoint.Application
    $deck = $app.Presentations.Add(0)
    $deck.PageSetup.SlideWidth = $data.pages[0].width / 2
    $deck.PageSetup.SlideHeight = $data.pages[0].height / 2
    $hexColor = if ($data.text_color) { $data.text_color.TrimStart('#') } else { 'FFFFFF' }
    $textRgb = [Convert]::ToInt32($hexColor.Substring(0,2),16) + 256 * [Convert]::ToInt32($hexColor.Substring(2,2),16) + 65536 * [Convert]::ToInt32($hexColor.Substring(4,2),16)
    foreach ($page in $data.pages) {
        $slide = $deck.Slides.Add($deck.Slides.Count + 1, 12)
        $slide.FollowMasterBackground = 0
        $slide.Background.Fill.Solid()
        $slide.Background.Fill.ForeColor.RGB = 0
        foreach ($line in (@($page.lines) + @($page.footer))) {
            $shape = $slide.Shapes.AddTextbox(1, $line.x/2, $line.y/2, $line.width/2, $line.height/2)
            $frame = $shape.TextFrame
            $frame.AutoSize = 0
            $shape.TextFrame2.AutoSize = 0
            $frame.WordWrap = 0
            $frame.MarginLeft = 0
            $frame.MarginRight = 0
            $frame.MarginTop = 0
            $frame.MarginBottom = 0
            $frame.VerticalAnchor = 3
            $text = $frame.TextRange
            $text.Text = $line.text
            $text.Font.Name = $data.font
            $text.Font.NameFarEast = $data.font
            $text.Font.Size = [single]($page.font_size / 2)
            if ($line.font_size) { $text.Font.Size = [single]($line.font_size / 2) }
            $text.Font.Bold = -1
            $text.Font.Color.RGB = $textRgb
            $text.ParagraphFormat.Alignment = 2
            if ($line.align -eq 'left') { $text.ParagraphFormat.Alignment = 1 }
            if ($line.align -eq 'right') { $text.ParagraphFormat.Alignment = 3 }
            $text.ParagraphFormat.SpaceBefore = 0
            $text.ParagraphFormat.SpaceAfter = 0
            $text.ParagraphFormat.Bullet.Visible = 0
            $shape.Width = [single]($line.width / 2)
            $shape.Height = [single]($line.height / 2)
            if ($line.text -and $text.BoundWidth -gt $shape.Width * .98) {
                $text.Font.Size = [single][Math]::Max(1, $text.Font.Size * $shape.Width * .96 / $text.BoundWidth)
            }
        }
        if ($data.youtube) { $slide.NotesPage.Shapes.Placeholders.Item(2).TextFrame.TextRange.Text = $data.youtube }
    }
    $format = if ([IO.Path]::GetExtension($data.path) -eq '.ppt') { 1 } else { 24 }
    $deck.SaveAs($data.path, $format)
    if ($data.preview) {
        [IO.Directory]::CreateDirectory($data.preview) | Out-Null
        for ($i=1; $i -le $deck.Slides.Count; $i++) {
            $deck.Slides.Item($i).Export((Join-Path $data.preview "$i.png"), 'PNG', [int](720 * $deck.PageSetup.SlideWidth / $deck.PageSetup.SlideHeight), 720)
        }
    }
} catch {
    [IO.File]::WriteAllText(($DataPath + '.error'), ($_ | Out-String) + $_.ScriptStackTrace, [Text.UTF8Encoding]::new())
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
} finally {
    if ($null -ne $deck) { $deck.Close() }
    # Quit only our empty application; never close another user presentation.
    if ($null -ne $app -and $app.Presentations.Count -eq 0) { $app.Quit() }
}

