import json
import re
import sqlite3
import webbrowser
import threading
from urllib.parse import urlsplit
from datetime import datetime
from pathlib import Path
import tkinter as tk
from tkinter import ttk, messagebox, filedialog, colorchooser
from viewer import Viewer, connect_db, load_songs

GROUPS = ('歌名', '主歌', '副歌', '尾句', '導歌', '橋段')


def create_song(path, number, title):
    if not isinstance(number, int) or number < 1 or not title.strip():
        raise ValueError('請輸入正整數編號與歌名。')
    con = sqlite3.connect(Path(path).resolve().as_uri()+'?mode=rw', uri=True)
    try:
        con.execute('BEGIN IMMEDIATE')
        if con.execute('SELECT 1 FROM songs WHERE catalog_number=?',(number,)).fetchone():
            raise ValueError('這個歌曲編號已經存在，請換一個編號。')
        folder = Path(path).parent / '編輯前備份'
        folder.mkdir(exist_ok=True)
        source = connect_db(path)
        target = sqlite3.connect(folder / ('新增前_'+datetime.now().strftime('%Y%m%d_%H%M%S_%f')+'.sqlite'))
        try:
            source.backup(target)
        finally:
            source.close()
            target.close()
        cursor = con.execute('INSERT INTO songs(catalog_number,catalog_code,title,source_set,source_path,source_hash,slide_count,section_count,parse_status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',
            (number,f'{number:03d}',title.strip(),'手動新增','','',1,1,'需確認',datetime.now().isoformat()))
        sid = cursor.lastrowid
        section = con.execute('INSERT INTO sections(song_id,sequence,marker_raw,marker_code,group_name,start_slide,end_slide,confidence) VALUES(?,1,?,?,?,?,?,?)',
            (sid,'主歌 1','V','主歌 1',1,1,'手動新增')).lastrowid
        con.execute('INSERT INTO slides(song_id,section_id,slide_number,section_slide_number,group_name,raw_text,lyrics_text,removed_metadata) VALUES(?,?,1,1,?,?,?,?)',
            (sid,section,'主歌 1','','',''))
        con.commit()
        return sid
    except Exception:
        con.rollback()
        raise
    finally:
        con.close()


def split_group(value):
    match = re.fullmatch(r'(歌名|主歌|副歌|尾句|導歌|橋段)\s*([0-9０-９]+)', value)
    if match:
        number = int(match[2])
        return match[1], str(number) if number else ''
    return value, '1' if value == '主歌' else ''


def card_group(card):
    number = card['number'].get().strip()
    if number and not re.fullmatch(r'[0-9０-９]+', number):
        raise ValueError('段落數字請填入整數，0 或留空表示不編號。')
    return card['group'].get() + (' ' + str(int(number)) if number and int(number) else '')


def song_state(con, sid):
    song = dict(con.execute('SELECT * FROM songs WHERE song_id=?', (sid,)).fetchone())
    song.setdefault('youtube_url', '')
    return {
        'song': song,
        'sections': [dict(r) for r in con.execute('SELECT * FROM sections WHERE song_id=? ORDER BY sequence', (sid,))],
        'slides': [dict(r) for r in con.execute('SELECT * FROM slides WHERE song_id=? ORDER BY slide_number', (sid,))],
        'issues': [dict(r) for r in con.execute('SELECT * FROM review_issues WHERE song_id=? ORDER BY issue_id', (sid,))],
    }


def blocks_from_state(state):
    blocks = []
    for section in state['sections']:
        pages = [r for r in state['slides'] if r['section_id'] == section['section_id']]
        blocks.append({'group': section['group_name'], 'text': '\n'.join(r['lyrics_text'] or '' for r in pages), 'original': section, 'pages': pages})
    return blocks


def youtube_link(value):
    value = value.strip()
    if not value:
        return ''
    if '://' not in value:
        value = 'https://' + value
    parsed = urlsplit(value)
    if parsed.scheme not in ('http', 'https') or parsed.hostname not in ('youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'www.youtu.be') or parsed.username or parsed.password or any(c.isspace() for c in value):
        raise ValueError('請貼上有效的 YouTube 連結，或留空。')
    return value


def save_song(path, sid, title, blocks, expected, youtube_url=None):
    youtube_url = youtube_link(expected['song'].get('youtube_url', '') if youtube_url is None else youtube_url)
    title = title.strip()
    if not title:
        raise ValueError('請輸入歌名。')
    if not blocks or not any(b['text'].strip() for b in blocks):
        raise ValueError('請至少保留一段有內容的歌詞。')
    if any(not b['group'].strip() for b in blocks):
        raise ValueError('請選擇每一段的段落名稱。')
    con = sqlite3.connect(Path(path).resolve().as_uri() + '?mode=rw', uri=True, timeout=5)
    con.row_factory = sqlite3.Row
    con.execute('PRAGMA foreign_keys=ON')
    backup = None
    try:
        con.execute('BEGIN IMMEDIATE')
        if song_state(con, sid) != expected:
            raise ValueError('這首歌曲已被其他程式修改。請先保留你的文字，再重新載入歌曲後編輯。')
        folder = Path(path).parent / '編輯前備份'
        folder.mkdir(exist_ok=True)
        backup = folder / ('歌曲資料庫_' + datetime.now().strftime('%Y%m%d_%H%M%S_%f') + '.sqlite')
        source = connect_db(path)
        try:
            with sqlite3.connect(backup) as target:
                source.backup(target)
        finally:
            source.close()
        if 'youtube_url' not in {r['name'] for r in con.execute('PRAGMA table_info(songs)')}:
            con.execute("ALTER TABLE songs ADD COLUMN youtube_url TEXT NOT NULL DEFAULT ''")
        old_blocks = blocks_from_state(expected)
        same = [(b['group'], b['text']) for b in blocks] == [(b['group'], b['text']) for b in old_blocks]
        if not same:
            con.execute('DELETE FROM slides WHERE song_id=?', (sid,))
            con.execute('DELETE FROM sections WHERE song_id=?', (sid,))
            page_no = 1
            for sequence, block in enumerate(blocks, 1):
                original = block.get('original')
                original_pages = block.get('pages', [])
                unchanged_text = original is not None and block['text'] == '\n'.join(r['lyrics_text'] or '' for r in original_pages)
                if unchanged_text:
                    pages = original_pages
                else:
                    text = block['text'].replace('\r\n', '\n')
                    pages = [{'lyrics_text': text, 'raw_text': text, 'removed_metadata': ''}]
                if not pages:
                    pages = [{'lyrics_text': '', 'raw_text': '', 'removed_metadata': ''}]
                group = block['group']
                cursor = con.execute('INSERT INTO sections(song_id,sequence,marker_raw,marker_code,group_name,start_slide,end_slide,confidence) VALUES(?,?,?,?,?,?,?,?)',
                    (sid, sequence, group, {'主歌':'V', '副歌':'C', '尾句':'E', '導歌':'PC', '橋段':'B', '歌名':'TITLE'}.get(split_group(group)[0], 'CUSTOM'), group, page_no, page_no + len(pages)-1, '手動編輯'))
                for index, page in enumerate(pages, 1):
                    con.execute('INSERT INTO slides(song_id,section_id,slide_number,section_slide_number,group_name,raw_text,lyrics_text,removed_metadata) VALUES(?,?,?,?,?,?,?,?)',
                        (sid, cursor.lastrowid, page_no, index, group, page.get('raw_text'), page['lyrics_text'], page.get('removed_metadata')))
                    page_no += 1
            con.execute('UPDATE songs SET slide_count=?,section_count=? WHERE song_id=?', (page_no-1, len(blocks), sid))
        con.execute("UPDATE songs SET title=?,youtube_url=?,parse_status='已確認' WHERE song_id=?", (title, youtube_url, sid))
        con.execute('DELETE FROM review_issues WHERE song_id=?', (sid,))
        con.commit()
        return backup
    except Exception:
        con.rollback()
        raise
    finally:
        con.close()


class Editor(Viewer):
    def __init__(self, auto=True):
        self.cards = []
        self.baseline = None
        self.state = None
        self.switching = False
        self.exporting = False
        super().__init__(auto=False)
        self.title('歌曲資料庫')
        self.geometry('1280x850')
        self.heading.configure(text='選擇歌曲開始編輯')
        actions = ttk.Frame(self.heading.master)
        actions.pack(fill='x', before=self.heading, pady=(0,10))
        ttk.Button(actions, text='＋ 新增歌曲', command=self.new_song).pack(side='left')
        ttk.Button(actions, text='匯出 .show', command=lambda: self.export_song('.show')).pack(side='left', padx=6)
        ttk.Button(actions, text='匯出 PPT', command=lambda: self.export_song('.ppt')).pack(side='left')
        self.show_page_numbers = tk.BooleanVar(value=False)
        self.show_export_title = tk.BooleanVar(value=True)
        self.show_footer_title = tk.BooleanVar(value=False)
        self.export_ratio = tk.StringVar(value='32:9')
        ttk.Checkbutton(actions, text='顯示頁碼', variable=self.show_page_numbers).pack(side='left', padx=10)
        ttk.Checkbutton(actions, text='顯示歌名頁', variable=self.show_export_title).pack(side='left')
        ttk.Checkbutton(actions, text='下方顯示歌名', variable=self.show_footer_title).pack(side='left')
        ttk.Label(actions, text='比例').pack(side='left', padx=(12,4))
        ttk.Combobox(actions, textvariable=self.export_ratio, values=('16:9','32:9'), state='readonly', width=6).pack(side='left')
        self.export_color = tk.StringVar(value='#FFFFFF')
        color_row = ttk.Frame(self.heading.master)
        color_row.pack(fill='x', before=self.heading, pady=(0, 8))
        ttk.Button(color_row, text='文字顏色…', command=self.choose_export_color).pack(side='left')
        self.color_sample = tk.Label(color_row, textvariable=self.export_color, bg='#FFFFFF', fg='#000000', width=10)
        self.color_sample.pack(side='left', padx=8)
        host = self.texts['歌詞'].master
        for child in host.winfo_children():
            child.destroy()
        del self.texts['歌詞']
        title_row = ttk.Frame(host, padding=10)
        title_row.pack(fill='x')
        ttk.Label(title_row, text='歌名').pack(side='left', padx=(0, 10))
        self.song_title = tk.StringVar()
        ttk.Entry(title_row, textvariable=self.song_title, font=('Microsoft JhengHei UI', 14)).pack(side='left', fill='x', expand=True)
        ttk.Button(title_row, text='儲存修改', command=self.save).pack(side='left', padx=(10, 0))
        ttk.Button(title_row, text='確認無誤', command=lambda: self.save(confirm=True)).pack(side='left', padx=(6, 0))
        link_row = ttk.Frame(host, padding=(10, 0, 10, 10))
        link_row.pack(fill='x')
        ttk.Label(link_row, text='YouTube 連結').pack(side='left', padx=(0, 10))
        self.youtube_url = tk.StringVar()
        ttk.Entry(link_row, textvariable=self.youtube_url).pack(side='left', fill='x', expand=True)
        ttk.Button(link_row, text='開啟影片', command=self.open_youtube).pack(side='left', padx=(10, 0))
        ttk.Label(host, text='空白表示斷句，換行表示換氣或換句；新增段落請按下方按鈕。', padding=(10, 0, 10, 8)).pack(anchor='w')
        area = ttk.Frame(host)
        area.pack(fill='both', expand=True)
        self.canvas = tk.Canvas(area, highlightthickness=0, background='#eef1f5')
        bar = ttk.Scrollbar(area, orient='vertical', command=self.canvas.yview)
        self.canvas.configure(yscrollcommand=bar.set)
        bar.pack(side='right', fill='y')
        self.canvas.pack(fill='both', expand=True)
        self.block_host = ttk.Frame(self.canvas, padding=10)
        window = self.canvas.create_window((0, 0), window=self.block_host, anchor='nw')
        self.block_host.bind('<Configure>', lambda e: self.canvas.configure(scrollregion=self.canvas.bbox('all')))
        self.canvas.bind('<Configure>', lambda e: self.canvas.itemconfigure(window, width=e.width))
        controls = ttk.Frame(host, padding=10)
        controls.pack(fill='x')
        ttk.Button(controls, text='＋ 新增歌詞段落', command=self.add_block).pack(side='left')
        ttk.Label(controls, text='Ctrl+S 儲存 · 儲存前自動備份').pack(side='right')
        self.bind('<Control-s>', lambda e: self.save())
        if auto:
            from viewer import find_database
            path = find_database()
            if path:
                self.load(path)

    def snapshot(self):
        return (self.song_title.get(), tuple((c['group'].get(), c['number'].get(), c['text'].get('1.0', 'end-1c')) for c in self.cards), self.youtube_url.get())

    def open_youtube(self):
        if not self.current:
            return
        try:
            link = youtube_link(self.youtube_url.get())
            if not link:
                messagebox.showinfo('YouTube 連結', '請先貼上這首歌的 YouTube 連結。')
                return
            webbrowser.open(link)
        except Exception as exc:
            messagebox.showerror('無法開啟影片', str(exc))

    def guard(self):
        if self.baseline is None or self.snapshot() == self.baseline:
            return True
        answer = messagebox.askyesnocancel('尚未儲存', '這首歌有尚未儲存的修改，要先儲存嗎？\n選「否」會放棄修改；「取消」會留在目前歌曲。')
        if answer is None:
            return False
        return self.save() if answer else True

    def load(self, path):
        if not self.guard():
            return
        # Clear the selection identity only after the next database validates.
        try:
            probe = connect_db(path)
            probe.close()
        except Exception as exc:
            messagebox.showerror('無法開啟資料庫', str(exc))
            return
        self.baseline = None
        self.current = None
        super().load(path)
        self.path_label.set('資料來源：' + str(self.database))

    def refresh_list(self):
        if self.pending:
            self.after_cancel(self.pending)
            self.pending = None
        if not self.guard():
            return
        self.baseline = None
        self.current = None
        super().refresh_list()
        if self.current is None:
            self.clear_cards()
            self.song_title.set('')
            self.youtube_url.set('')

    def write(self, label, text):
        if label in self.texts:
            super().write(label, text)

    def select(self, _=None):
        selected = self.tree.selection()
        if not selected or selected[0] not in self.by_id or self.switching:
            return
        if self.current and str(self.current['song_id']) == selected[0]:
            return
        if not self.guard():
            if self.current:
                self.switching = True
                self.tree.selection_set(str(self.current['song_id']))
                self.switching = False
            return
        super().select()
        if not self.current:
            return
        self.state = song_state(self.con, self.current['song_id'])
        self.song_title.set(self.current['title'])
        self.youtube_url.set(self.state['song'].get('youtube_url', ''))
        self.clear_cards()
        for block in blocks_from_state(self.state):
            self.add_block(block)
        self.baseline = self.snapshot()
        self.canvas.yview_moveto(0)

    def clear_cards(self):
        for child in self.block_host.winfo_children():
            child.destroy()
        self.cards = []

    def add_block(self, block=None):
        if not self.current:
            return
        is_new = block is None
        block = block or {'group':'主歌 1', 'text':''}
        frame = ttk.Frame(self.block_host, padding=10, relief='solid', borderwidth=1)
        frame.pack(fill='x', pady=(0, 10))
        side = ttk.Frame(frame)
        side.pack(side='left', fill='y', padx=(0, 12))
        name, digits = split_group(block['group'])
        group = tk.StringVar(value=name)
        number = tk.StringVar(value=digits)
        values = GROUPS if name in GROUPS else (name, *GROUPS)
        label_row = ttk.Frame(side)
        label_row.pack(pady=(0, 12))
        group_box = ttk.Combobox(label_row, textvariable=group, values=values, state='readonly', width=6)
        group_box.pack(side='left')
        group_box.bind('<<ComboboxSelected>>', lambda e: number.set('1' if group.get() == '主歌' else ''))
        validate_number = (self.register(lambda value: not value or bool(re.fullmatch(r'[0-9０-９]+', value))), '%P')
        ttk.Spinbox(label_row, textvariable=number, from_=0, to=9999, width=4, validate='key', validatecommand=validate_number).pack(side='left', padx=(5, 0))
        def hide_zero():
            value = number.get()
            if value and re.fullmatch(r'[0-9０-９]+', value) and int(value) == 0:
                number.set('')
        number.trace_add('write', lambda *_: self.after_idle(hide_zero))
        box = tk.Text(frame, height=max(5, min(12, block['text'].count('\n')+2)), wrap='word', undo=True, font=('Microsoft JhengHei UI', 14), relief='flat', padx=10, pady=8)
        box.insert('1.0', block['text'])
        scroll = ttk.Scrollbar(frame, command=box.yview)
        box.configure(yscrollcommand=scroll.set)
        scroll.pack(side='right', fill='y')
        box.pack(side='left', fill='both', expand=True)
        card = {'frame':frame, 'group':group, 'number':number, 'text':box, 'original':block.get('original'), 'pages':block.get('pages', [])}
        self.cards.append(card)
        ttk.Button(side, text='↑ 上移', command=lambda: self.move(card, -1)).pack(fill='x')
        ttk.Button(side, text='↓ 下移', command=lambda: self.move(card, 1)).pack(fill='x', pady=4)
        ttk.Button(side, text='刪除此段', command=lambda: self.remove(card)).pack(fill='x')
        if is_new:
            self.after_idle(lambda: self.canvas.yview_moveto(1))
            box.focus_set()

    def move(self, card, direction):
        i = self.cards.index(card)
        j = i + direction
        if 0 <= j < len(self.cards):
            self.cards[i], self.cards[j] = self.cards[j], self.cards[i]
            for c in self.cards:
                c['frame'].pack_forget()
            for c in self.cards:
                c['frame'].pack(fill='x', pady=(0, 10))

    def remove(self, card):
        if card['text'].get('1.0', 'end-1c').strip() and not messagebox.askyesno('刪除段落', '刪除這段歌詞？按下儲存後才會寫入資料庫。'):
            return
        self.cards.remove(card)
        card['frame'].destroy()

    def save(self, confirm=False):
        if not self.current:
            return False
        unchanged = self.snapshot() == self.baseline
        if unchanged and not confirm:
            self.count.set('沒有尚未儲存的修改')
            return True
        sid = self.current['song_id']
        try:
            blocks = [{'group':card_group(c), 'text':c['text'].get('1.0','end-1c'), 'original':c['original'], 'pages':c['pages']} for c in self.cards]
            if self.snapshot()[1] == self.baseline[1]:
                blocks = blocks_from_state(self.state)
            backup = save_song(self.database, sid, self.song_title.get(), blocks, self.state, self.youtube_url.get())
        except Exception as exc:
            messagebox.showerror('儲存失敗，修改仍保留在畫面上', str(exc))
            return False
        self.songs = load_songs(self.con)
        self.by_id = {str(s['song_id']): s for s in self.songs}
        self.filter['values'] = ['全部狀態'] + sorted({s['parse_status'] for s in self.songs})
        self.current = None
        self.baseline = None
        self.tree.item(str(sid), values=(self.by_id[str(sid)]['catalog_code'], self.by_id[str(sid)]['title'], self.by_id[str(sid)]['parse_status']))
        selected = self.tree.selection()
        if not selected or selected[0] not in self.by_id:
            self.tree.selection_set(str(sid))
        self.select()
        self.count.set('已儲存並標記為「已確認」。備份：' + backup.name)
        return True

    def copy(self):
        if self.current:
            self.clipboard_clear()
            self.clipboard_append('\n\n'.join(c['text'].get('1.0','end-1c') for c in self.cards))
            self.count.set('已複製目前畫面的歌詞')

    def close(self):
        if self.exporting:
            messagebox.showinfo('正在匯出', '匯出完成後即可關閉程式。')
            return
        if self.guard():
            super().close()

    def new_song(self):
        if not self.database:
            messagebox.showinfo('新增歌曲', '請先開啟歌曲資料庫。')
            return
        if not self.guard():
            return
        dialog = tk.Toplevel(self)
        dialog.title('新增歌曲')
        dialog.transient(self)
        dialog.grab_set()
        fields = ttk.Frame(dialog, padding=20)
        fields.pack(fill='both', expand=True)
        number = tk.StringVar(value=str(max((s['catalog_number'] for s in self.songs), default=0)+1))
        title = tk.StringVar()
        for label, variable in [('歌曲編號',number),('歌名',title)]:
            ttk.Label(fields,text=label).pack(anchor='w')
            ttk.Entry(fields,textvariable=variable,width=40).pack(fill='x',pady=(0,12))
        def commit():
            try:
                if not number.get().isdigit():
                    raise ValueError('歌曲編號請輸入正整數。')
                sid = create_song(self.database,int(number.get()),title.get())
            except Exception as exc:
                messagebox.showerror('無法新增',str(exc),parent=dialog)
                return
            dialog.destroy()
            self.baseline = None
            self.query.set('')
            self.status.set('全部狀態')
            self.load(self.database)
            self.tree.selection_set(str(sid))
            self.tree.see(str(sid))
            self.select()
        ttk.Button(fields,text='新增並編輯歌詞',command=commit).pack(fill='x')

    def choose_export_color(self):
        selected = colorchooser.askcolor(color=self.export_color.get(), title='選擇匯出文字顏色', parent=self)[1]
        if selected:
            selected = selected.upper()
            self.export_color.set(selected)
            luminance = sum(int(selected[i:i+2], 16) * w for i, w in ((1,.299),(3,.587),(5,.114)))
            self.color_sample.configure(bg=selected, fg='#000000' if luminance > 150 else '#FFFFFF')

    def export_song(self, extension):
        if not self.current or self.exporting:
            return
        from song_exports import filename, layout_pages, export_show, export_ppt
        try:
            blocks = [{'group':card_group(c),'text':c['text'].get('1.0','end-1c')} for c in self.cards]
            title = self.song_title.get().strip()
            code = self.current['catalog_code']
            options = {'show_page_numbers':self.show_page_numbers.get(), 'show_title':self.show_export_title.get(), 'show_footer_title':self.show_footer_title.get(), 'aspect_ratio':self.export_ratio.get(), 'text_color':self.export_color.get()}
            pages = layout_pages(title,blocks,options)
        except Exception as exc:
            messagebox.showerror('無法匯出',str(exc))
            return
        path = filedialog.asksaveasfilename(title='匯出目前畫面的歌曲',initialfile=filename(code,title)+extension,defaultextension=extension,
            filetypes=[('FreeShow', '*.show')] if extension=='.show' else [('PowerPoint 97–2003','*.ppt'),('PowerPoint','*.pptx')])
        if not path:
            return
        self.exporting = True
        self.count.set('正在匯出，請稍候…')
        youtube = self.youtube_url.get().strip()
        result = {}
        def worker():
            try:
                # Write to a temporary sibling and replace only after successful export.
                import uuid
                target = Path(path)
                temp = target.with_name('.export_'+uuid.uuid4().hex+target.suffix)
                try:
                    (export_show if extension=='.show' else export_ppt)(temp,code,title,blocks,youtube,options=options)
                    temp.replace(target)
                finally:
                    if temp.exists():
                        temp.unlink()
                result['ok'] = True
            except Exception as exc:
                result['error'] = str(exc)
        thread = threading.Thread(target=worker,daemon=True)
        thread.start()
        def poll():
            if thread.is_alive():
                self.after(150,poll)
                return
            self.exporting = False
            if 'error' in result:
                self.count.set('匯出失敗')
                messagebox.showerror('匯出失敗',result['error'] + ('\nPPT 匯出需要安裝 Microsoft PowerPoint。' if extension!='.show' else ''))
            else:
                self.count.set('已匯出 '+str(len(pages))+' 頁：'+path)
                messagebox.showinfo('匯出完成',path)
        self.after(150,poll)


if __name__ == '__main__':
    Editor().mainloop()

