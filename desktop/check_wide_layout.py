from song_exports import layout_pages
blocks=[{'group':'主歌 1','text':'A\nB\nC\nD\nE'},{'group':'副歌','text':'F\nG'}]
w=layout_pages('test',blocks,{'show_title':False,'aspect_ratio':'32:9'})
n=layout_pages('test',blocks,{'show_title':False,'aspect_ratio':'16:9'})
assert len(n)==4 and len(w)==3
assert [[l['text'] for l in p['lines']] for p in w]==[['A B','C D'],['E'],['F G']]
print('PASS: 32:9 pairs lines and preserves section boundaries')
