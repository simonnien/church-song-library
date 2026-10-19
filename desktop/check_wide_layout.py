from song_exports import layout_pages
blocks=[{'group':'主歌 1','text':'A\nB\nC\nD\nE'},{'group':'副歌','text':'F\nG'}]
w=layout_pages('test',blocks,{'show_title':False,'aspect_ratio':'32:9'})
n=layout_pages('test',blocks,{'show_title':False,'aspect_ratio':'16:9'})
assert len(n)==4 and len(w)==3
assert [[l['text'] for l in p['lines']] for p in w]==[['A B','C D'],['E'],['F G']]
print('PASS: 32:9 pairs lines and preserves section boundaries')
from song_exports import compact_short_pages
assert compact_short_pages([['A','B'],['C','D']],100,len)==[['A B','C D']]
for count in (50,51):
    pages=[['x'*count,'B'],['C','D']]
    assert compact_short_pages(pages,100,len)==pages
pages=[['x'*49,'x'*49],['x'*49,'x'*49]]
assert compact_short_pages(pages,98.5,len)==pages
for pages in ([['A',''],['C','D']],[['A','B'],['C']]):
    assert compact_short_pages(pages,100,len)==pages
assert compact_short_pages([[str(i)+'a',str(i)+'b'] for i in range(4)],100,len)==[['0a 0b 1a 1b','2a 2b 3a 3b']]
w=layout_pages('test',[{'group':'主歌','text':'A\nB\nC\nD\nE\nF\nG\nH'}],{'show_title':False,'aspect_ratio':'32:9','show_page_numbers':True})
assert len(w)==1 and w[0]['footer'][0]['text']=='1 / 1'
assert [l['text'] for l in w[0]['lines']]==['A B C D','E F G H']
print('PASS: 50% threshold, overflow, incomplete pages, recursive merge and page numbers')
