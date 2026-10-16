from pathlib import Path
import shutil,sys
root=Path(__file__).resolve().parent
source=Path(sys.argv[1]);out=Path(sys.argv[2])
if out.exists():raise SystemExit('Utmatningsmappen finns redan.')
shutil.copytree(source,out)
assets=out/'assets'
for name in ['analytics.js','panel.js']:
 shutil.copyfile(root/'src'/name,assets/('qfsv-'+name))
shutil.copyfile(root/'src/panel.css',out/'qfsv-statistics-plus.css')
for p in assets.glob('AdminPanel-*.js'):
 s=p.read_text()
 old='const rows=await QFSV_fetch(j,u);if(request!==QFSV_request.current)return;C(QFSV_aggregate(rows))'
 assert s.count(old)==1
 new='const history=await QFSV_fetch(j,"all"),bounds=QFSV_bounds(u),rows=bounds?history.filter(r=>r.date>=bounds.from&&r.date<=bounds.to):history;if(request!==QFSV_request.current)return;C({...QFSV_aggregate(rows),history})'
 s=s.replace(old,new)
 a=s.index('function Fe(){');b=s.index('function Ce(){',a)
 block=s[a:b]
 old='c&&e.jsxs(e.Fragment,{children:['
 assert block.count(old)==1
 block=block.replace('u==="all"&&e.jsxs("section",', 'e.jsx(QFSV_Plus,{history:c.history,period:u,React:d}),u==="all"&&e.jsxs("section",')
 # Remove duplicate legacy charts, keeping department summary and year totals.
 def expression_end(text,start):
  depth=0;quote=None;escaped=False
  for i in range(text.index('(',start),len(text)):
   ch=text[i]
   if quote:
    if escaped:escaped=False
    elif ch=='\\':escaped=True
    elif ch==quote:quote=None
   elif ch in ['"',"'",'`']:quote=ch
   elif ch=='(':depth+=1
   elif ch==')':
    depth-=1
    if depth==0:return i+1
  raise ValueError('Ofullständigt diagram')
 for title in ['children:u===\"all\"?\"Bokningar per år\":\"Daily Bookings\"','children:\"Popular Time Slots\"']:
  pos=block.index(title);start=block.rfind('e.jsxs("div",{className:"bg-white p-6 rounded-lg shadow",children:[',0,pos)
  end=expression_end(block,start)
  if block[end:end+1]==',':block=block[:start]+block[end+1:]
  else:
   assert block[start-1]==','
   block=block[:start-1]+block[end:]
 for old,new in {'Booking Statistics':'Bokningsstatistik','This Week':'Denna vecka','This Month':'Denna månad','This Quarter':'Detta kvartal','This Year':'Detta år','Total Bookings':'Bokningar','Unique Users':'Unika användare','Avg Duration':'Genomsnittlig tid','Departments':'Avdelningar','Department Statistics':'Användning per avdelning'}.items():
  block=block.replace('children:"'+old+'"','children:"'+new+'"')
 block=block.replace('className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"','className:"qs-overview grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"').replace('minmax(170px,1fr)','minmax(120px,1fr)')
 block=block.replace('value:u,onChange:', '"aria-label":"Statistikperiod",value:u,onChange:')
 s=s[:a]+block+s[b:]
 s='import{StatisticsPlus as QFSV_Plus}from"./qfsv-panel.js";import{periodBounds as QFSV_bounds}from"./qfsv-statistics-all-v1.allstats1.js";\n'+s
 # Add navigation semantics and explicit active state, retaining the existing handlers.
 s=s.replace('className:"flex items-center gap-2 sm:gap-4",children:', 'className:"qs-subnav",role:"navigation","aria-label":"Administrationsmeny",children:')
 for key in ['users','statistics','backup','restore']:
  s=s.replace('onClick:()=>y("'+key+'"),className:', 'onClick:()=>y("'+key+'"),"aria-current":u==="'+key+'"?"page":void 0,className:')
 for old,new in {'Users':'Användare','Statistics':'Statistik','Stats':'Statistik','Backup':'Säkerhetskopia','Restore':'Återställ'}.items():
  # Only rename labels within the admin navigation function.
  pos=s.index('function Re(){');s=s[:pos]+s[pos:].replace('children:"'+old+'"','children:"'+new+'"')
 p.write_text(s)
for p in assets.glob('index-D0UV-*.js'):
 s=p.read_text();assert s.count('children:"Massage Chair Booking"')==1
 s=s.replace('className:"max-w-4xl mx-auto p-4 sm:p-6",children:', 'className:"qfsv-shell",children:')
 s=s.replace('className:"flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 animate-slide-in",children:', 'className:"qs-app-header",children:')
 s=s.replace('className:"flex items-center gap-2",children:[e.jsxs("button",{onClick:()=>l("bookings")', 'className:"qs-mainnav",role:"navigation","aria-label":"Huvudmeny",children:[e.jsxs("button",{onClick:()=>l("bookings")')
 for key in ['bookings','admin','settings']:
  s=s.replace('onClick:()=>l("'+key+'"),className:', 'onClick:()=>l("'+key+'"),"aria-current":a==="'+key+'"?"page":void 0,className:')
 for old,new in {'Book your relaxation sessions':'Din stund för återhämtning','Bookings & Stats':'Bokning & statistik','Book':'Bokning','Settings':'Inställningar','Set':'Inställningar'}.items():s=s.replace('children:"'+old+'"','children:"'+new+'"')
 p.write_text(s)
p=out/'index.html';s=p.read_text();assert '</head>' in s
s=s.replace('</head>','<link rel="stylesheet" href="./qfsv-statistics-plus.css">\n</head>');p.write_text(s)
files=list(out.rglob('*.js'));mapping={p.name:p.stem+'.plus1.js' for p in files}
for p in out.rglob('*'):
 if p.is_file() and p.suffix in ['.js','.html']:
  s=p.read_text()
  for old,new in mapping.items():s=s.replace(old,new)
  p.write_text(s)
for p in files:p.rename(p.with_name(mapping[p.name]))
print('Statistik PLUS byggd.')
