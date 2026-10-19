import os
import sqlite3
import sys
from pathlib import Path
import tkinter as tk
from tkinter import ttk, filedialog, messagebox


def connect_db(path):
    con = sqlite3.connect(Path(path).resolve().as_uri() + '?mode=ro', uri=True)
    con.row_factory = sqlite3.Row
    try:
        for sql in ('SELECT song_id,catalog_number,catalog_code,title,source_set,source_path,parse_status,slide_count,section_count FROM songs LIMIT 0',
                    'SELECT song_id,slide_number,group_name,lyrics_text FROM slides LIMIT 0',
                    'SELECT song_id,sequence,group_name,start_slide,end_slide,confidence FROM sections LIMIT 0',
                    'SELECT song_id,issue_type,details FROM review_issues LIMIT 0'):
            con.execute(sql)
    except Exception:
        con.close()
        raise ValueError('這不是目前支援的歌曲資料庫，請選擇「歌曲資料庫.sqlite」。')
    return con


def find_database():
    base = Path(sys.executable if getattr(sys, 'frozen', False) else __file__).resolve().parent
    for parent in (base, *list(base.parents)[:4]):
        direct = parent / '歌曲資料庫.sqlite'
        if direct.is_file():
            return direct
        folder = parent / '01_詩歌與簡報' / 'outputs'
        if folder.exists():
            found = sorted(folder.glob('song_database_*/歌曲資料庫.sqlite'), reverse=True)
            if found:
                return found[0]
    return None


def resolve_source(value, database):
    source = Path(value)
    if source.is_file():
        return source
    # The church workspace was reorganized after these source paths were recorded.
    parts = source.parts
    for parent in Path(database).resolve().parents:
        for marker in ('2025 別是巴教會詩歌',):
            if marker in parts:
                tail = Path(*parts[parts.index(marker):])
                for candidate in (parent / tail, parent / '01_詩歌與簡報' / tail):
                    if candidate.is_file():
                        return candidate
    return None


def load_songs(con):
    lyrics = {}
    for row in con.execute('SELECT song_id,lyrics_text FROM slides ORDER BY song_id,slide_number'):
        lyrics.setdefault(row['song_id'], []).append(row['lyrics_text'] or '')
    result = []
    for row in con.execute('SELECT * FROM songs ORDER BY catalog_number'):
        song = dict(row)
        song['search'] = (' '.join((str(song['catalog_number']), song['catalog_code'], song['title'])) + '\n' + '\n'.join(lyrics.get(song['song_id'], []))).casefold()
        result.append(song)
    return result


def matches(song, query, status):
    return (status == '全部狀態' or song['parse_status'] == status) and all(word in song['search'] for word in query.casefold().split())


class Viewer(tk.Tk):
    def __init__(self, auto=True):
        super().__init__()
        self.title('歌曲資料庫檢視器')
        self.geometry('1180x780')
        self.minsize(920, 600)
        self.option_add('*Font', ('Microsoft JhengHei UI', 11))
        style = ttk.Style(self)
        style.theme_use('clam')
        style.configure('Treeview', rowheight=31, font=('Microsoft JhengHei UI', 11))
        style.configure('Treeview.Heading', font=('Microsoft JhengHei UI', 11, 'bold'))
        self.con = None
        self.database = None
        self.songs = []
        self.current = None
        self.pending = None
        self.query = tk.StringVar()
        self.status = tk.StringVar(value='全部狀態')
        self.count = tk.StringVar(value='請開啟歌曲資料庫')
        self.path_label = tk.StringVar(value='')
        top = ttk.Frame(self, padding=16)
        top.pack(fill='x')
        ttk.Label(top, text='歌曲資料庫', font=('Microsoft JhengHei UI', 22, 'bold')).pack(side='left')
        ttk.Button(top, text='開啟資料庫…', command=self.pick).pack(side='right', padx=5)
        ttk.Button(top, text='重新載入', command=self.reload).pack(side='right', padx=5)
        search = ttk.Frame(self, padding=(16, 0, 16, 12))
        search.pack(fill='x')
        ttk.Label(search, text='搜尋歌名、編號或歌詞').pack(side='left', padx=(0, 10))
        entry = ttk.Entry(search, textvariable=self.query)
        entry.pack(side='left', fill='x', expand=True)
        self.filter = ttk.Combobox(search, textvariable=self.status, state='readonly', width=14, values=['全部狀態'])
        self.filter.pack(side='left', padx=10)
        ttk.Button(search, text='清除', command=lambda: self.query.set('')).pack(side='left')
        self.query.trace_add('write', self.schedule_search)
        self.filter.bind('<<ComboboxSelected>>', lambda e: self.refresh_list())
        pane = ttk.Panedwindow(self, orient='horizontal')
        pane.pack(fill='both', expand=True, padx=16)
        left = ttk.Frame(pane)
        right = ttk.Frame(pane, padding=(12, 0, 0, 0))
        pane.add(left, weight=2)
        pane.add(right, weight=3)
        self.tree = ttk.Treeview(left, columns=('code', 'title', 'status'), show='tree headings', selectmode='browse')
        self.tree.heading('#0', text='歌曲資料夾')
        self.tree.column('#0', width=130, minwidth=100, stretch=False)
        for name, label, width in [('code', '編號', 65), ('title', '歌名', 245), ('status', '狀態', 95)]:
            self.tree.heading(name, text=label)
            self.tree.column(name, width=width, minwidth=55, stretch=name == 'title')
        scroll = ttk.Scrollbar(left, command=self.tree.yview)
        self.tree.configure(yscrollcommand=scroll.set)
        scroll.pack(side='right', fill='y')
        self.tree.pack(fill='both', expand=True)
        self.tree.bind('<<TreeviewSelect>>', self.select)
        self.heading = ttk.Label(right, text='選擇歌曲查看內容', font=('Microsoft JhengHei UI', 19, 'bold'), wraplength=540)
        self.heading.pack(anchor='w', pady=(0, 8))
        self.meta = ttk.Label(right, text='')
        self.meta.pack(anchor='w', pady=(0, 10))
        actions = ttk.Frame(right)
        actions.pack(fill='x', pady=(0, 12))
        ttk.Button(actions, text='複製歌詞', command=self.copy).pack(side='left')
        ttk.Button(actions, text='開啟原始簡報', command=self.open_source).pack(side='left', padx=8)
        tabs = ttk.Notebook(right)
        tabs.pack(fill='both', expand=True)
        self.texts = {}
        for label in ('歌詞', '段落與分頁', '資料與待確認事項'):
            frame = ttk.Frame(tabs)
            tabs.add(frame, text=label)
            box = tk.Text(frame, wrap='word', font=('Microsoft JhengHei UI', 14), padx=16, pady=16, relief='flat', background='#ffffff', state='disabled')
            bar = ttk.Scrollbar(frame, command=box.yview)
            box.configure(yscrollcommand=bar.set)
            bar.pack(side='right', fill='y')
            box.pack(fill='both', expand=True)
            self.texts[label] = box
        bottom = ttk.Frame(self, padding=16)
        bottom.pack(fill='x')
        ttk.Label(bottom, textvariable=self.count).pack(anchor='w')
        ttk.Label(bottom, textvariable=self.path_label, foreground='#666666', wraplength=1120).pack(anchor='w', pady=(5, 0))
        self.bind('<Control-f>', lambda e: entry.focus_set())
        self.protocol('WM_DELETE_WINDOW', self.close)
        if auto:
            path = find_database()
            if path:
                self.load(path)
        entry.focus_set()

    def schedule_search(self, *_):
        if self.pending:
            self.after_cancel(self.pending)
        self.pending = self.after(180, self.refresh_list)

    def pick(self):
        path = filedialog.askopenfilename(title='選擇歌曲資料庫', filetypes=[('歌曲資料庫', '*.sqlite *.db *.sqlite3'), ('所有檔案', '*.*')])
        if path:
            self.load(path)

    def reload(self):
        if self.database:
            self.load(self.database)
        else:
            self.pick()

    def load(self, path):
        new = None
        try:
            new = connect_db(path)
            songs = load_songs(new)
        except Exception as exc:
            if new:
                new.close()
            messagebox.showerror('無法開啟資料庫', str(exc))
            return
        if self.con:
            self.con.close()
        self.con, self.database, self.songs = new, Path(path).resolve(), songs
        self.by_id = {str(s['song_id']): s for s in songs}
        self.filter['values'] = ['全部狀態'] + sorted({s['parse_status'] for s in songs})
        self.status.set('全部狀態')
        self.path_label.set('資料來源（唯讀）：' + str(self.database))
        self.refresh_list()

    def refresh_list(self):
        self.pending = None
        selected = self.tree.selection()
        expanded = {key for key in self.tree.get_children() if self.tree.item(key, 'open')}
        self.tree.delete(*self.tree.get_children())
        found = [s for s in self.songs if matches(s, self.query.get(), self.status.get())]
        for s in found:
            start = ((s['catalog_number']-1)//100)*100+1
            folder = 'folder_' + str(start)
            if not self.tree.exists(folder):
                self.tree.insert('', 'end', iid=folder, text=f'{start:03d}–{start+99:03d}', open=bool(self.query.get()) or folder in expanded)
            self.tree.insert(folder, 'end', iid=str(s['song_id']), values=(s['catalog_code'], s['title'], s['parse_status']))
        self.count.set('顯示 {:,} / {:,} 首歌曲'.format(len(found), len(self.songs)))
        if found:
            key = selected[0] if selected and selected[0] in self.by_id and self.tree.exists(selected[0]) else str(found[0]['song_id'])
            self.tree.selection_set(key)
            self.tree.see(key)
            self.select()
        else:
            self.current = None
            self.heading.configure(text='找不到符合的歌曲')
            self.meta.configure(text='試試歌名的一部分，或縮短搜尋字詞。')
            for label in self.texts:
                self.write(label, '')

    def write(self, label, text):
        box = self.texts[label]
        box.configure(state='normal')
        box.delete('1.0', 'end')
        box.insert('1.0', text)
        box.configure(state='disabled')

    def select(self, _=None):
        selected = self.tree.selection()
        if not selected or selected[0] not in self.by_id:
            return
        song = self.current = self.by_id[selected[0]]
        sid = song['song_id']
        self.heading.configure(text=song['catalog_code'] + '  ' + song['title'])
        self.meta.configure(text='{} 頁  ·  {} 段  ·  {}  ·  {}'.format(song['slide_count'], song['section_count'], song['source_set'], song['parse_status']))
        slides = self.con.execute('SELECT * FROM slides WHERE song_id=? ORDER BY slide_number', (sid,)).fetchall()
        self.lyrics = '\n\n'.join(r['lyrics_text'] or '' for r in slides)
        self.write('歌詞', self.lyrics or '此歌曲沒有歌詞文字。')
        sections = self.con.execute('SELECT * FROM sections WHERE song_id=? ORDER BY sequence', (sid,)).fetchall()
        summary = '\n'.join('{}  {}：第 {}–{} 頁（{}）'.format(r['sequence'], r['group_name'], r['start_slide'], r['end_slide'], r['confidence']) for r in sections)
        pages = '\n\n'.join('第 {} 頁｜{}\n{}'.format(r['slide_number'], r['group_name'], r['lyrics_text'] or '') for r in slides)
        self.write('段落與分頁', summary + '\n\n' + '─' * 24 + '\n\n' + pages)
        issues = self.con.execute('SELECT issue_type,details FROM review_issues WHERE song_id=? ORDER BY issue_id', (sid,)).fetchall()
        source = resolve_source(song['source_path'], self.database)
        info = '原始簡報：\n' + str(source or song['source_path']) + '\n\n' + ('檔案存在，可按「開啟原始簡報」。' if source else '找不到原始簡報檔案，可能已移動。')
        info += '\n\n待確認事項：\n' + ('\n\n'.join(r['issue_type'] + '\n' + r['details'] for r in issues) or '資料庫未記錄待確認事項。')
        self.write('資料與待確認事項', info)

    def copy(self):
        if self.current:
            self.clipboard_clear()
            self.clipboard_append(self.lyrics)
            self.count.set('已複製「' + self.current['title'] + '」歌詞')

    def open_source(self):
        if not self.current:
            return
        source = resolve_source(self.current['source_path'], self.database)
        if not source:
            messagebox.showinfo('找不到簡報', '原始檔案可能已移動，請查看「資料與待確認事項」中的路徑。')
            return
        try:
            os.startfile(str(source))
        except OSError as exc:
            messagebox.showerror('無法開啟簡報', str(exc))

    def close(self):
        if self.con:
            self.con.close()
        self.destroy()


if __name__ == '__main__':
    Viewer().mainloop()
