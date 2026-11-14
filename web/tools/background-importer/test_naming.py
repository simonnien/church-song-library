from naming import base_name, unique_name

assert base_name('藍色光帶_32比9_循環') == '藍色光帶'
assert unique_name('藍色光帶', ['藍色光帶_16比9_循環', '藍色光帶_02_32比9_循環']) == '藍色光帶_03'
assert unique_name('Blue Light', ['blue_light_16:9']) == 'Blue Light_02'
assert unique_name('新影片', ['其他影片']) == '新影片'
assert base_name('  <>  ') == '背景影片'
print('PASS: ratio suffix normalization, collision suffixes, case/space matching and filename sanitation')
