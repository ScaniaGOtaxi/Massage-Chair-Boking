from pathlib import Path
import re,shutil,sys
root=Path(__file__).resolve().parent
source=Path(sys.argv[1]);out=Path(sys.argv[2])
if out.exists():raise SystemExit('Välj en ny utmatningsmapp.')
shutil.copytree(source,out)
html=(out/'index.html').read_text()
old=r'<div id="qfsv-splash".*?(?=\s*<div id="root">)'
html,count=re.subn(old,(root/'src/splash.html').read_text().strip()+'\n    ',html,flags=re.S)
assert count==1,'Förväntad startvy saknas.'
assert html.count('/MassageBoking/qfsv-start-v2.features2.js')==1
html=html.replace('/MassageBoking/qfsv-start-v2.features2.js','/MassageBoking/qfsv-splash-v3.js')
assert 'qfsv-splash-v3.css' not in html
html=html.replace('</head>','<link rel="stylesheet" href="/MassageBoking/qfsv-splash-v3.css">\n</head>')
(out/'index.html').write_text(html)
shutil.copyfile(root/'src/splash.css',out/'qfsv-splash-v3.css')
shutil.copyfile(root/'src/splash.js',out/'qfsv-splash-v3.js')
print('Ny startvy byggd:',out)
