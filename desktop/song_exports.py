"""One measured layout shared by FreeShow and native PowerPoint exports."""
import json
import math
import os
import re
import time
import uuid
from copy import deepcopy
from pathlib import Path
from PIL import ImageFont

# PowerPoint uses points; FreeShow uses a 1920px canvas at twice this scale.
SLIDE_WIDTH_PT, SLIDE_HEIGHT_PT = 960, 540
LEFT_PT, TOP_PT, TEXT_WIDTH_PT, FONT_PT = 12, 12, 936, 44
WIDTH, HEIGHT = SLIDE_WIDTH_PT * 2, SLIDE_HEIGHT_PT * 2
FONT = 'Microsoft JhengHei'
LEFT, TOP, TEXT_WIDTH = LEFT_PT * 2, TOP_PT * 2, TEXT_WIDTH_PT * 2
BASE_SIZE, LINE_FACTOR = FONT_PT * 2, 1.4
TEXT_HEIGHT = BASE_SIZE * LINE_FACTOR * 2


def group_settings():
    """Prefer the user's current FreeShow settings, then the packaged snapshot."""
    paths = []
    appdata = Path(os.environ.get('APPDATA', '')) / 'FreeShow'
    for config in ('config.json', 'settings.json'):
        try:
            data = json.loads((appdata/config).read_text(encoding='utf-8-sig'))
            if data.get('dataPath'):
                paths.append(Path(data['dataPath'])/'Config/settings_synced.json')
        except (OSError, ValueError):
            pass
    paths.extend([Path('D:/FreeShow/Config/settings_synced.json'), Path(__file__).with_name('group_colors.json')])
    for path in paths:
        try:
            groups = json.loads(path.read_text(encoding='utf-8-sig')).get('groups', {})
            if groups:
                return groups
        except (OSError, ValueError):
            pass
    return {}


def group_style(label, groups):
    compact = re.sub(r'\s+', '', label)
    for key, group in groups.items():
        if re.sub(r'\s+', '', group.get('name', '')) == compact:
            return key, group.get('color', '#FFFFFF')
    base = re.sub(r'[0-9０-９]+$', '', compact)
    key = {'主歌':'verse', '副歌':'chorus', '導歌':'pre_chorus', '橋段':'bridge', '尾句':'tag'}.get(base)
    return key, groups.get(key, {}).get('color', '#FFFFFF')


def filename(code, title):
    clean = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '_', title).rstrip(' .')
    return str(code) + '-' + (clean or '未命名')[:100]


def export_options(options=None):
    result = {'show_page_numbers': False, 'show_title': True, 'show_footer_title': False, 'aspect_ratio': '16:9', 'text_color': '#FFFFFF'}
    result.update(options or {})
    if result['aspect_ratio'] not in ('16:9', '32:9'):
        raise ValueError('比例請選擇 16:9 或 32:9。')
    if not re.fullmatch(r'#[0-9A-Fa-f]{6}', result['text_color']):
        raise ValueError('文字顏色必須是 #RRGGBB 格式。')
    return result


def font_at(size):
    return ImageFont.truetype(str(Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Fonts/msjhbd.ttc'), size=max(1, int(size)))


def compact_short_pages(pages, usable_width, measure):
    result = [list(page) for page in pages]
    changed = True
    while changed:
        changed = False
        output = []
        i = 0
        while i < len(result):
            a = result[i]
            b = result[i+1] if i+1 < len(result) else None
            if b and len(a) == len(b) == 2 and all(t.strip() and measure(t) < usable_width * .5 for t in a+b):
                joined = [' '.join(a), ' '.join(b)]
                if all(measure(t) <= usable_width for t in joined):
                    output.append(joined)
                    i += 2
                    changed = True
                    continue
            output.append(a)
            i += 1
        result = output
    return result


def layout_pages(title, blocks, options=None):
    options = export_options(options)
    width = WIDTH * (2 if options['aspect_ratio'] == '32:9' else 1)
    text_width = width - LEFT * 2
    if not title.strip():
        raise ValueError('請先填寫歌名。')
    if not blocks or not any(b['text'].strip() for b in blocks):
        raise ValueError('請先輸入歌詞再匯出。')
    # Wide output joins phrases without changing stored lyrics.
    pages = []
    def append_page(group, lines, block_id, base=BASE_SIZE):
        font = font_at(base)
        measured = max((font.getlength(line) for line in lines), default=0)
        size = min(base, base * text_width * .99 / max(1, measured))
        size = math.floor(size * 10) / 10
        if size < 1:
            raise ValueError('有一行歌詞過長，縮小後仍無法容納，請先調整該行。')
        step = size * LINE_FACTOR
        start = TOP
        pages.append({'group': group, 'block': block_id, 'font_size': size,
                      'lines': [{'text': line, 'x': LEFT, 'y': start + i * step,
                                 'width': text_width, 'height': step} for i, line in enumerate(lines)]})
    if options['show_title'] and not blocks[0]['group'].startswith('歌名'):
        append_page('歌名', [title], -1, 140)
    capacity = min(2, max(1, round(TEXT_HEIGHT / (BASE_SIZE * LINE_FACTOR))))
    for i, block in enumerate(blocks):
        if block['group'].startswith('歌名') and not options['show_title']:
            continue
        lines = block['text'].replace('\r\n', '\n').split('\n')
        if options['aspect_ratio'] == '32:9' and not block['group'].startswith('歌名'):
            lines = [' '.join(lines[j:j+2]) for j in range(0, len(lines), 2)]
        chunks = [lines[j:j+capacity] for j in range(0, len(lines), capacity)]
        if options['aspect_ratio'] == '32:9' and not block['group'].startswith('歌名'):
            chunks = compact_short_pages(chunks, text_width * .96, font_at(BASE_SIZE).getlength)
        for chunk in chunks:
            append_page(block['group'], chunk, i)
    if not pages:
        raise ValueError('沒有可匯出的歌詞頁面。')
    for i, page in enumerate(pages):
        page['width'], page['height'] = width, HEIGHT
        page['footer'] = []
        if options['show_footer_title']:
            size = min(28, 28 * (width-220) / max(1, font_at(28).getlength(title)))
            page['footer'].append({'text':title, 'x':24, 'y':HEIGHT-60, 'width':width-220, 'height':40, 'font_size':size, 'align':'left'})
        if options['show_page_numbers']:
            page['footer'].append({'text':f'{i+1} / {len(pages)}', 'x':width-180, 'y':HEIGHT-60, 'width':156, 'height':40, 'font_size':28, 'align':'right'})
    return pages


def export_show(path, code, title, blocks, youtube='', options=None):
    options = export_options(options)
    pages = layout_pages(title, blocks, options)
    source = Path('D:/FreeShow/Exports/歌詞範本.fstemplate')
    if not source.is_file():
        source = Path(__file__).with_name('lyrics.fstemplate')
    template = json.loads(source.read_text(encoding='utf-8-sig'))['template']
    scale = pages[0]['width'] / WIDTH
    prototype = next(item for item in template['items'] if item.get('type') == 'text')
    line_prototype = prototype['lines'][0]
    run_prototype = line_prototype['text'][0]
    def css_number(style, name, default):
        match = re.search(r'(?:^|;)\s*'+re.escape(name)+r'\s*:\s*([\d.]+)', style)
        return float(match[1]) if match else default
    style = prototype['style']
    # FreeShow uses normalized 1920x1080 item positions even for wider outputs.
    run_style = re.sub(r'((?:font-size|-webkit-text-stroke-width)\s*:\s*)([\d.]+)(px)', lambda m: m[1]+str(float(m[2])/scale)+m[3], run_prototype['style'])
    run_style = re.sub(r'(?<![-\w])color\s*:[^;]*', 'color:'+options['text_color'], run_style)
    base = css_number(run_style, 'font-size', 96)
    width = css_number(style, 'width', 1889.76)
    height = css_number(style, 'height', 272.12)
    padding = re.search(r'(?:^|;)\s*padding\s*:\s*([^;]+)', style)
    pads = [float(v) for v in re.findall(r'[\d.]+', padding[1])] if padding else [0]
    top_pad, right_pad = pads[0], pads[1] if len(pads)>1 else pads[0]
    bottom_pad = pads[2] if len(pads)>2 else top_pad
    left_pad = pads[3] if len(pads)>3 else right_pad
    stroke = css_number(run_style, '-webkit-text-stroke-width', 0)
    usable_width = width-left_pad-right_pad-stroke*2
    usable_height = height/scale-top_pad-bottom_pad
    groups = group_settings()
    slides, layout = {}, []
    parents = {}
    for i, page in enumerate(pages):
        key = 'slide_' + str(i+1)
        measured = max((font_at(base).getlength(line['text']) for line in page['lines']), default=0)
        size = math.floor(min(base, base*usable_width*.99/max(1, measured), usable_height/(max(1,len(page['lines']))*LINE_FACTOR))*10)/10
        if size < 1:
            raise ValueError('歌詞過長，無法在範本中顯示。')
        page['font_size'] = size
        item = deepcopy(prototype)
        item.update(auto=False, textFit='none')
        item['lines'] = []
        for line in page['lines']:
            row = deepcopy(line_prototype)
            run = deepcopy(run_prototype)
            run['value'] = line['text']
            run['style'] = re.sub(r'font-size\s*:\s*[\d.]+px', f'font-size:{size}px', run_style) + ';white-space:pre;text-wrap:nowrap;overflow-wrap:normal;word-break:keep-all;'
            row['text'] = [run]
            row['align'] = row.get('align','') + ';white-space:pre;text-wrap:nowrap;'
            item['lines'].append(row)
        items = [deepcopy(other) if other is not prototype else item for other in template['items']]
        for footer in page['footer']:
            items.append({'type':'text','auto':False,'textFit':'none',
                          'style':f"left:{footer['x']/scale}px;top:{footer['y']}px;width:{footer['width']/scale}px;height:{footer['height']}px;",
                          'lines':[{'align':f"text-align:{footer['align']};white-space:pre;text-wrap:nowrap;",'text':[{'value':footer['text'],'style':f"font-family:Microsoft JhengHei;font-size:{footer['font_size']/scale}px;color:{options['text_color']};white-space:pre;text-wrap:nowrap;"}]}]})
        slide = {'group':None,'color':None,'settings':{'resolution':{'width':page['width'],'height':page['height']},'color':'#000000'},'notes':'','items':items}
        if page['block'] not in parents:
            global_group, color = group_style(page['group'], groups)
            slide.update(group=page['group'], color=color, children=[])
            if global_group:
                slide['globalGroup'] = global_group
            entry = {'id':key, 'children':{}}
            layout.append(entry)
            parents[page['block']] = (key, entry)
        else:
            parent, entry = parents[page['block']]
            slides[parent]['children'].append(key)
            entry['children'][key] = {}
        slides[key] = slide
    now = int(time.time()*1000)
    show = {'name':filename(code,title), 'category':'song', 'settings':{'activeLayout':'default','template':None},
            'timestamps':{'created':now//1000,'modified':now,'used':None},
            'meta':{'number':str(code),'title':title}, 'slides':slides,
            'layouts':{'default':{'name':'預設','notes':youtube,'slides':layout}}, 'media':{}}
    Path(path).write_text(json.dumps(['church_song_library_'+str(int(code)),show],ensure_ascii=False),encoding='utf-8')
    return pages


def export_ppt(path, code, title, blocks, youtube='', preview_dir=None, options=None):
    options = export_options(options)
    import subprocess
    import tempfile
    pages = layout_pages(title, blocks, options)
    with tempfile.TemporaryDirectory() as folder:
        data_path = Path(folder)/'layout.json'
        data_path.write_text(json.dumps({'pages':pages,'path':str(Path(path).resolve()),'font':FONT,'youtube':youtube,
            'text_color':options['text_color'], 'preview':str(Path(preview_dir).resolve()) if preview_dir else ''},ensure_ascii=False),encoding='utf-8-sig')
        shell = Path(os.environ.get('WINDIR','C:/Windows'))/'System32/WindowsPowerShell/v1.0/powershell.exe'
        result = subprocess.run([str(shell),'-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',str(Path(__file__).with_name('export_ppt.ps1')),str(data_path)],
            capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW)
        if result.returncode:
            error_file = Path(str(data_path)+'.error')
            raise RuntimeError(error_file.read_text(encoding='utf-8-sig') if error_file.exists() else result.stderr.decode('utf-8',errors='replace'))
    return pages

