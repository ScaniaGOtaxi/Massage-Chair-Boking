from pathlib import Path
import re,shutil,json,sys,hashlib
ROOT=Path(__file__).resolve().parent
source=Path(sys.argv[1]) if len(sys.argv)>1 else Path('/workspace/onecom-logout/base/deployment/onecom/MassageBoking')
out=Path(sys.argv[2]) if len(sys.argv)>2 else ROOT/'release/MassageBoking'
if out.exists():raise SystemExit('Output directory already exists; choose a new directory.')
shutil.copytree(source,out)
assets=out/'assets'
main=assets/'index-D0UV-BkB.timefix1.pwfix1.js'
s=main.read_text()
# This snapshot includes the time and password fixes, before the old header logout.
assert 'QFSV_LogoutButton' not in s and 'qfsv-router-pw1.js' in (out/'index.html').read_text()
anchor=';n.useEffect(()=>{(async()=>{try{const{data:{session:x}}=await u.auth.getSession();'
assert s.count(anchor)==1
s=s.replace(anchor,';n.useEffect(()=>{if(!s)window.dispatchEvent(new Event("qfsv:ready"))},[s])'+anchor)
auth='e.jsx(we,{onAuthSuccess:()=>{}})'
assert s.count(auth)==1
s=s.replace(auth,'e.jsxs("div",{className:"qfsv-login-brand",children:[e.jsx("img",{src:"/MassageBoking/massage-chair-v2.png",alt:"Massagestol",width:148,height:148}),'+auth+']})')
# The old touchmove handler blocked scrolling throughout the installed PWA.
blocked='document.body.addEventListener("touchmove",s=>{(window.navigator.standalone||window.matchMedia("(display-mode: standalone)").matches)&&s.preventDefault()},{passive:!1});'
assert s.count(blocked)==1
s=s.replace(blocked,'')
main.write_text(s)
bookings=assets/'BookingsAndStats-CtIRhBIX.timefix1.pwfix1.js'
s=bookings.read_text()
start=s.index('function Re(){');end=s.index('export{Re as default};',start)
s=s[:start]+'function Re(){return e.jsx(QFSV_BookingTabs,{Book:Be,List:Ee})}'+s[end:]
bookings.write_text('import{BookingTabs as QFSV_BookingTabs}from"./qfsv-features-v2.js";\n'+s)
for settings in assets.glob('UserSettings-*.js'):
 s=settings.read_text()
 pattern=r'e\.jsxs\("button",\{onClick:F,className:"[^"]+",children:\[e\.jsx\(O,\{size:18\}\),e\.jsx\("span",\{children:"Sign Out"\}\)\]\}\)'
 s,n=re.subn(pattern,'e.jsx(QFSV_LogoutButton,{})',s);assert n==1
 settings.write_text('import{LogoutButton as QFSV_LogoutButton}from"./qfsv-features-v2.js";\n'+s)
for src,dest in [('features.js','assets/qfsv-features-v2.js'),('rules.js','assets/qfsv-feature-rules-v2.js'),('features.css','qfsv-features-v2.css'),('start.js','qfsv-start-v2.js')]:
 shutil.copyfile(ROOT/'src'/src,out/dest)
shutil.copyfile(ROOT/'src/massage-chair-v2.png',out/'massage-chair-v2.png')
html=(out/'index.html').read_text()
html=html.replace('<html lang="en">','<html lang="sv">')
html=html.replace('width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover','width=device-width, initial-scale=1.0, viewport-fit=cover')
html=html.replace('</head>','<link rel="stylesheet" href="/MassageBoking/qfsv-features-v2.css">\n</head>')
html=html.replace('<div id="root"></div>','''<div id="qfsv-splash" role="status" aria-live="polite"><div><img src="/MassageBoking/massage-chair-v2.png" width="210" height="210" alt=""><h1>Massage Chair Booking</h1><div class="qfsv-loader" aria-hidden="true"></div><p>Startar bokningen…</p></div></div>
    <div id="root"></div>
    <script src="/MassageBoking/qfsv-start-v2.js"></script>''')
html=html.replace('/MassageBoking/icon.svg','/MassageBoking/massage-chair-v2.png')
(out/'index.html').write_text(html)
manifest=json.loads((out/'manifest.json').read_text())
# Read PNG IHDR dimensions without modifying the artwork.
image=(out/'massage-chair-v2.png').read_bytes();width=int.from_bytes(image[16:20],'big');height=int.from_bytes(image[20:24],'big')
manifest['icons']=[{'src':'/MassageBoking/massage-chair-v2.png','sizes':f'{width}x{height}','type':'image/png','purpose':'any'}]
manifest['background_color']='#f5f8fd';manifest['theme_color']='#2563eb'
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
# Bust module caches together: lazy modules must import the same main instance.
files=list(out.rglob('*.js'));mapping={p.name:p.stem+'.features2.js' for p in files}
for p in list(out.rglob('*')):
 if p.is_file() and p.suffix in ('.js','.html'):
  s=p.read_text()
  for old,new in mapping.items():s=s.replace(old,new)
  p.write_text(s)
for p in files:p.rename(p.with_name(mapping[p.name]))
print('Created',out)
