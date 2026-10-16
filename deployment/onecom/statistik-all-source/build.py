from pathlib import Path
import zipfile
out=Path('deployment/onecom/MassageBoking')
assets=out/'assets'
helper=r'''
export const PAGE_SIZE=500;
export const stockholmDate=(now=new Date())=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
const iso=d=>d.toISOString().slice(0,10);
export function periodBounds(period,now=new Date()){
 if(period==='all')return null;
 const today=stockholmDate(now),year=Number(today.slice(0,4)),month=Number(today.slice(5,7))-1;
 const date=new Date(today+'T12:00:00Z');let start,end;
 if(period==='week'){
  const monday=new Date(date);monday.setUTCDate(monday.getUTCDate()-(monday.getUTCDay()+6)%7);
  start=monday;end=new Date(monday);end.setUTCDate(end.getUTCDate()+6);
 }else if(period==='month'){
  start=new Date(Date.UTC(year,month,1,12));end=new Date(Date.UTC(year,month+1,0,12));
 }else if(period==='quarter'){
  const q=Math.floor(month/3)*3;start=new Date(Date.UTC(year,q,1,12));end=new Date(Date.UTC(year,q+3,0,12));
 }else if(period==='year'){
  start=new Date(Date.UTC(year,0,1,12));end=new Date(Date.UTC(year,11,31,12));
 }else throw new Error('Ogiltig statistikperiod.');
 return {from:iso(start),to:iso(end)};
}
export async function fetchStatistics(client,period,now=new Date()){
 const bounds=periodBounds(period,now),rows=[];
 for(let offset=0;;offset+=PAGE_SIZE){
  let query=client.from('bookings').select('id,user_id,date,start_time,end_time,sessions,users!bookings_user_id_fkey(id,department)');
  if(bounds)query=query.gte('date',bounds.from).lte('date',bounds.to);
  const {data,error}=await query.order('date',{ascending:true}).order('start_time',{ascending:true}).order('id',{ascending:true}).range(offset,offset+PAGE_SIZE-1);
  if(error)throw new Error('Kunde inte hämta hela statistiken. Försök igen.');
  if(!Array.isArray(data))throw new Error('Ogiltigt svar från statistikservern.');
  rows.push(...data);if(data.length<PAGE_SIZE)break;
 }
 return rows;
}
export function bookingMinutes(row){
 const pattern=/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?$/;
 if(pattern.test(row.start_time)&&pattern.test(row.end_time)){
  const minutes=t=>Number(t.slice(0,2))*60+Number(t.slice(3,5));
  const diff=minutes(row.end_time)-minutes(row.start_time);if(diff>0)return diff;
 }
 return [1,2].includes(Number(row.sessions))?Number(row.sessions)*20:0;
}
export function aggregateStatistics(rows){
 const users=new Set(),departmentStats=Object.create(null),timeSlotStats=Object.create(null),days=new Map(),years=new Map();
 let totalMinutes=0,firstDate=null,lastDate=null;
 for(const row of rows){
  const minutes=bookingMinutes(row);totalMinutes+=minutes;
  if(row.user_id)users.add(row.user_id);
  const department=row.users?.department||'Unassigned';
  if(!departmentStats[department])departmentStats[department]={bookings:0,uniqueUsers:new Set(),minutes:0};
  const d=departmentStats[department];d.bookings++;d.minutes+=minutes;if(row.user_id)d.uniqueUsers.add(row.user_id);
  const time=String(row.start_time||'').slice(0,5);timeSlotStats[time]=(timeSlotStats[time]||0)+1;
  if(row.date){
   days.set(row.date,(days.get(row.date)||0)+1);
   const year=row.date.slice(0,4);
   if(!years.has(year))years.set(year,{year,date:year+'-01-01',bookings:0,minutes:0});
   years.get(year).bookings++;years.get(year).minutes+=minutes;
   if(firstDate===null||row.date<firstDate)firstDate=row.date;
   if(lastDate===null||row.date>lastDate)lastDate=row.date;
  }
 }
 for(const d of Object.values(departmentStats)){d.uniqueUsers=d.uniqueUsers.size;d.averageDuration=d.bookings?d.minutes/d.bookings:0;}
 return {totalBookings:rows.length,uniqueUsers:users.size,totalMinutes,averageDuration:rows.length?totalMinutes/rows.length:0,
  departmentStats,timeSlotStats,dailyStats:[...days].sort(([a],[b])=>a.localeCompare(b)).map(([date,bookings])=>({date,bookings})),weeklyStats:[],monthlyStats:[],yearlyStats:[...years.values()].sort((a,b)=>a.year.localeCompare(b.year)),firstDate,lastDate};
}
'''
(assets/'qfsv-statistics-all-v1.js').write_text(helper.lstrip('\n'))
count=0
for p in assets.glob('AdminPanel-*.js'):
 s=p.read_text()
 start=s.index('function Fe(){');end=s.index('function Ce(){',start)
 block=s[start:end]
 old='[c,C]=d.useState(null);d.useEffect(()=>{U()},[u]);'
 assert block.count(old)==1
 block=block.replace(old,'[c,C]=d.useState(null);const QFSV_request=d.useRef(0);d.useEffect(()=>{U();return()=>{QFSV_request.current++}},[u]);')
 a=block.index('const U=async()=>{');b=block.index(',v=()=>{',a)
 block=block[:a]+'''const U=async()=>{const request=++QFSV_request.current;try{w(!0);k(null);const rows=await QFSV_fetch(j,u);if(request!==QFSV_request.current)return;C(QFSV_aggregate(rows))}catch(error){if(request===QFSV_request.current)k(error.message||"Kunde inte hämta statistiken.")}finally{if(request===QFSV_request.current)w(!1)}}'''+block[b:]
 old='e.jsx("option",{value:"year",children:"This Year"})'
 assert block.count(old)==1
 block=block.replace(old,old+',e.jsx("option",{value:"all",children:"Statistik ALL"})')
 old='children:[e.jsxs("div",{className:"bg-white p-4 rounded-lg shadow",children:[e.jsxs("div",{className:"flex items-center gap-2 text-blue-600"'
 assert block.count(old)==1
 card='''e.jsxs("div",{className:"bg-white p-4 rounded-lg shadow",children:[e.jsx("h3",{className:"text-lg font-medium text-gray-900",children:"Bokade timmar"}),e.jsx("p",{className:"mt-2 text-3xl font-semibold text-blue-600",children:new Intl.NumberFormat("sv-SE",{maximumFractionDigits:1}).format(c.totalMinutes/60)})]}),'''
 block=block.replace(old,'children:['+card+old[len('children:['):])
 old='className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4",children:'
 assert block.count(old)==1
 block=block.replace(old,'className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4",style:{gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))"},children:')
 old='c&&e.jsxs(e.Fragment,{children:'
 assert block.count(old)==1
 block=block.replace(old,'e.jsx("p",{className:"text-sm text-gray-500",children:"Bokad tid är reserverad tid, inte bekräftad användning. Raderade avbokningar ingår inte."+(c?.firstDate?" Sparade bokningar: "+c.firstDate+" – "+c.lastDate:" ")}),'+old)
 old='t.text(`Period: ${u}`,n-40,35)'
 assert block.count(old)==1
 block=block.replace(old,'t.text(`Period: ${u==="all"?"Alla tider":u}`,n-55,35)')
 old='t.text("Department Usage",m,s+r+20)'
 assert block.count(old)==1
 block=block.replace(old,'t.text("Booked hours: "+(c.totalMinutes/60).toFixed(1),m,s+r+12),'+old)
 old='[T,S.bookings.toString(),S.uniqueUsers.toString(),`${c.averageDuration.toFixed(0)} min`]'
 assert block.count(old)==1
 block=block.replace(old,'[T,S.bookings.toString(),S.uniqueUsers.toString(),`${S.averageDuration.toFixed(0)} min`]')
 old='overview:[{metric:"Total Bookings",value:c.totalBookings}'
 assert block.count(old)==1
 block=block.replace(old,'overview:[{metric:"Booked Hours",value:(c.totalMinutes/60).toFixed(2)},{metric:"Period",value:u==="all"?"All Time":u},{metric:"Total Bookings",value:c.totalBookings}')
 old='children:"Daily Bookings"'
 assert block.count(old)==1
 block=block.replace(old,'children:u==="all"?"Bokningar per år":"Daily Bookings"')
 old='data:c.dailyStats,children:'
 assert block.count(old)==1
 block=block.replace(old,'data:u==="all"?c.yearlyStats:c.dailyStats,children:')
 old='tickFormatter:t=>z(new Date(t),"MMM d")'
 assert block.count(old)==1
 block=block.replace(old,'tickFormatter:t=>u==="all"?String(t).slice(0,4):z(new Date(t),"MMM d")')
 old='labelFormatter:t=>z(new Date(t),"MMMM d, yyyy")'
 assert block.count(old)==1
 block=block.replace(old,'labelFormatter:t=>u==="all"?String(t).slice(0,4):z(new Date(t),"MMMM d, yyyy")')
 marker='e.jsxs("div",{className:"bg-white p-6 rounded-lg shadow",children:[e.jsx("h3",{className:"text-lg font-medium text-gray-900 mb-4",children:u==="all"?"Bokningar per år":"Daily Bookings"})'
 assert block.count(marker)==1
 table='''u==="all"&&e.jsxs("section",{className:"bg-white p-4 rounded-lg shadow",children:[e.jsx("h3",{className:"text-lg font-medium text-gray-900 mb-4",children:"Årssammanställning"}),e.jsx("table",{className:"qfsv-year-table",style:{width:"100%",textAlign:"left"},children:e.jsxs(e.Fragment,{children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{scope:"col",children:"År"}),e.jsx("th",{scope:"col",children:"Bokningar"}),e.jsx("th",{scope:"col",children:"Bokade timmar"})]})}),e.jsx("tbody",{children:c.yearlyStats.map(row=>e.jsxs("tr",{children:[e.jsx("td",{style:{padding:"10px 0"},children:row.year}),e.jsx("td",{children:row.bookings}),e.jsx("td",{children:new Intl.NumberFormat("sv-SE",{maximumFractionDigits:1}).format(row.minutes/60)})]},row.year))})]})})]}),'''
 block=block.replace(marker,table+marker)
 old='dailyStats:c.dailyStats},n=Q.unparse'
 assert block.count(old)==1
 block=block.replace(old,'dailyStats:c.dailyStats,yearlyStats:c.yearlyStats},n=Q.unparse')
 old='...t.dailyStats.map(r=>["Daily Statistics",r.date,r.bookings])'
 assert block.count(old)==1
 block=block.replace(old,old+',...t.yearlyStats.map(r=>["Yearly Statistics",r.year,"Bookings: "+r.bookings+", Hours: "+(r.minutes/60).toFixed(2)])')
 for old,new in [
  ('onClick:v,className:', 'onClick:v,"aria-label":"Export PDF",className:'),
  ('onClick:F,className:', 'onClick:F,"aria-label":"Export CSV",className:'),
  ('className:"flex justify-between items-center",children:[e.jsx("h2",', 'className:"flex justify-between items-center",style:{flexWrap:"wrap",gap:12},children:[e.jsx("h2",'),
  ('className:"flex items-center gap-4",children:[e.jsxs("select",', 'className:"flex items-center gap-4",style:{flexWrap:"wrap",maxWidth:"100%"},children:[e.jsxs("select",'),
  ('value:u,onChange:t=>y(t.target.value),className:', 'value:u,onChange:t=>y(t.target.value),style:{maxWidth:"100%"},className:')
 ]:
  assert block.count(old)==1,old
  block=block.replace(old,new)
 s=s[:start]+block+s[end:]
 a=s.index('function we(){');b=s.index('function Fe(){',a)
 users=s[a:b];assert users.count('children:"Total Bookings"')==1
 users=users.replace('children:"Total Bookings"','children:"Bokningar sedan start"')
 s=s[:a]+users+s[b:]
 p.write_text('import{fetchStatistics as QFSV_fetch,aggregateStatistics as QFSV_aggregate}from"./qfsv-statistics-all-v1.js";\n'+s)
 count+=1
assert count==2
files=list(out.rglob('*.js'));mapping={p.name:p.stem+'.allstats1.js' for p in files}
for p in list(out.rglob('*')):
 if p.is_file() and p.suffix in ('.js','.html'):
  s=p.read_text()
  for old,new in mapping.items():s=s.replace(old,new)
  p.write_text(s)
for p in files:p.rename(p.with_name(mapping[p.name]))
print('Alla tider och bokade timmar tillagda i adminstatistiken.')

with zipfile.ZipFile('qfsv-statistik-alla-tider.zip','w',zipfile.ZIP_DEFLATED) as archive:
 for p in out.rglob('*'):
  if p.is_file():archive.write(p,'MassageBoking/'+str(p.relative_to(out)))
 archive.writestr('LAS-MIG.txt','Säkerhetskopiera MassageBoking på one.com. Ladda upp hela paketets MassageBoking inklusive alla assets till befintliga MassageBoking. Behåll massage-splash.png och andra egna filer; radera inte hela mappen. Ladda om med Ctrl+F5. Öppna Admin > Statistics > Statistik ALL. Bokade timmar är reserverad tid. Alla sparade bokningar räknas, inklusive framtida bokningar som finns kvar. Raderade avbokningar kan inte räknas. Ingen ny SQL behövs. Samma dags-bokning och vit fyrasekunders startvy behålls. Äldre säkerhetskopia kan återställas vid behov.')
