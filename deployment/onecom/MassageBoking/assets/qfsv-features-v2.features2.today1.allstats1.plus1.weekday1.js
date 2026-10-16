import {r as React} from './react-vendor-CZ0cz5LI.timefix1.pwfix1.features2.today1.allstats1.plus1.weekday1.js';
import {s as client} from './index-D0UV-BkB.timefix1.pwfix1.features2.today1.allstats1.plus1.weekday1.js';
import {stockholm,shiftDate,validateRange,isUpcoming,bookedMinutes,summarize,fetchOwnBookings,cancelOwnBooking,logOut,fetchCommunityStatistics} from './qfsv-feature-rules-v2.features2.today1.allstats1.plus1.weekday1.js';
const h=React.createElement;
const number=n=>new Intl.NumberFormat('sv-SE',{maximumFractionDigits:1}).format(n);
const dateLabel=date=>new Intl.DateTimeFormat('sv-SE',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Stockholm'}).format(new Date(date+'T12:00:00Z'));
function Button({children,...props}){return h('button',{type:'button',...props},children);}
function Alert({children}){return children?h('p',{role:'alert',className:'qfsv-error'},children):null;}
export function LogoutButton(){
 const [busy,setBusy]=React.useState(false),[error,setError]=React.useState('');const lock=React.useRef(false);
 async function run(){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{await logOut(client);}catch{setError('Kunde inte logga ut. Kontrollera anslutningen och försök igen.');lock.current=false;setBusy(false);}
 }
 return h('div',{className:'qfsv-logout'},h(Button,{onClick:run,disabled:busy,'aria-busy':busy,className:'qfsv-danger'},h('span',{'aria-hidden':true},'↪ '),busy?'Loggar ut…':'Logga ut'),h(Alert,null,error));
}
async function authenticatedUser(){
 const {data,error}=await client.auth.getUser();
 if(error||!data?.user)throw new Error('Du behöver logga in igen.');
 return data.user;
}
function MyBookings(){
 const [rows,setRows]=React.useState([]),[loading,setLoading]=React.useState(true),[error,setError]=React.useState(''),[notice,setNotice]=React.useState(''),[user,setUser]=React.useState(null),[pending,setPending]=React.useState(null),[view,setView]=React.useState('upcoming'),[now,setNow]=React.useState(()=>new Date());
 const lock=React.useRef(false),generation=React.useRef(0);
 async function refresh(){
  const id=++generation.current;setLoading(true);setError('');
  try{const u=await authenticatedUser(),data=await fetchOwnBookings(client,u.id);if(id!==generation.current)return;setUser(u);setRows(data);setNow(new Date());}
  catch{if(id===generation.current)setError('Kunde inte hämta dina bokningar. Kontrollera anslutningen och uppdatera listan.');}
  finally{if(id===generation.current)setLoading(false);}
 }
 React.useEffect(()=>{refresh();const timer=setInterval(()=>setNow(new Date()),15000);return()=>{generation.current++;clearInterval(timer);};},[]);
 async function cancel(row){
  if(lock.current)return;
  if(!window.confirm(`Vill du avboka din tid den ${dateLabel(row.date)} kl. ${row.start_time.slice(0,5)}–${row.end_time.slice(0,5)}?`))return;
  lock.current=true;setPending(row.id);setError('');setNotice('');
  try{
   await cancelOwnBooking(client,row,user?.id);
   setRows(previous=>previous.filter(item=>item.id!==row.id));
   setNotice('Bokningen är avbokad. Tiden är nu tillgänglig igen.');
   window.dispatchEvent(new Event('qfsv:bookings-changed'));
  }catch(err){setError(err.message||'Kunde inte avboka. Uppdatera listan och försök igen.');}
  finally{lock.current=false;setPending(null);setNow(new Date());}
 }
 const visible=rows.filter(row=>view==='upcoming'?isUpcoming(row,now):!isUpcoming(row,now));
 if(view==='history')visible.reverse();
 return h('section',{className:'qfsv-panel','aria-labelledby':'qfsv-my-heading'},
  h('div',{className:'qfsv-toolbar'},h('div',null,h('h2',{id:'qfsv-my-heading'},'Mina bokningar'),h('p',null,'Här kan du enkelt avboka dina kommande tider.')),h(Button,{onClick:refresh,disabled:loading||!!pending},loading?'Hämtar…':'Uppdatera')),
  h('div',{className:'qfsv-tabs','aria-label':'Visa egna bokningar'},...['upcoming','history'].map(value=>h(Button,{key:value,'aria-pressed':view===value,onClick:()=>setView(value)},value==='upcoming'?'Kommande':'Historik'))),
  h(Alert,null,error),h('p',{role:'status',className:'qfsv-success'},notice),
  loading?h('p',{role:'status'},'Hämtar dina bokningar…'):!error&&visible.length===0?h('p',{className:'qfsv-empty'},view==='upcoming'?'Du har inga kommande bokningar. Välj Boka för att hitta en ledig tid.':'Du har inga tidigare bokningar.'):null,
  !loading&&h('ul',{className:'qfsv-booking-list'},...visible.map(row=>h('li',{key:row.id,className:'qfsv-booking'},
   h('div',null,h('h3',null,dateLabel(row.date)),h('p',null,`${row.start_time.slice(0,5)}–${row.end_time.slice(0,5)} · ${bookedMinutes(row)} minuter`)),
   isUpcoming(row,now)?h(Button,{className:'qfsv-danger',disabled:!!pending,onClick:()=>cancel(row),'aria-label':`Avboka ${dateLabel(row.date)} kl. ${row.start_time.slice(0,5)}`},pending===row.id?'Avbokar…':'Avboka'):h('span',{className:'qfsv-muted'},'Passerad starttid')
  )))
 );
}
function Stats(){
 const today=stockholm().date;
 const [from,setFrom]=React.useState(()=>shiftDate(today,-29)),[to,setTo]=React.useState(today),[scope,setScope]=React.useState('own'),[rows,setRows]=React.useState([]),[range,setRange]=React.useState(null),[loading,setLoading]=React.useState(true),[error,setError]=React.useState(''),[validation,setValidation]=React.useState('');
 const generation=React.useRef(0);
 async function load(nextScope=scope,start=from,end=to){
  const invalid=validateRange(start,end);setValidation(invalid);if(invalid)return;
  const id=++generation.current;setLoading(true);setError('');setRows([]);setRange(null);
  try{
   const user=await authenticatedUser();let data;
   if(nextScope==='own'){data=await fetchOwnBookings(client,user.id,start,end);}
   else{
    data=await fetchCommunityStatistics(client,start,end);
   }
   if(id!==generation.current)return;setRows(data);setRange({from:start,to:end});
  }catch(err){if(id===generation.current)setError(err instanceof Error?err.message:'Kunde inte hämta statistiken. Kontrollera anslutningen och försök igen.');}
  finally{if(id===generation.current)setLoading(false);}
 }
 React.useEffect(()=>{load();return()=>{generation.current++;};},[]);
 function choose(next){setScope(next);load(next);}
 const summary=summarize(rows,new Date(),scope==='community');
 const max=Math.max(1,...summary.days.map(([,value])=>value));
 const cards=[['Bokningar hittills',number(summary.count)],['Bokade timmar',number(summary.minutes/60)],['Kommande i perioden',number(summary.future)],['Vanligaste starttid',summary.times[0]?.[0]||'—']];
 return h('section',{className:'qfsv-panel','aria-labelledby':'qfsv-stats-heading'},
  h('h2',{id:'qfsv-stats-heading'},'Statistik'),h('p',null,'Se din egen bokade tid eller gemensamma summeringar. Alla tider visas i svensk tidszon.'),
  h('div',{className:'qfsv-tabs','aria-label':'Statistikens omfattning'},h(Button,{'aria-pressed':scope==='own',onClick:()=>choose('own')},'Min statistik'),h(Button,{'aria-pressed':scope==='community',onClick:()=>choose('community')},'Gemensam statistik')),
  h('form',{className:'qfsv-filters',onSubmit:event=>{event.preventDefault();load();}},
   h('label',null,'Från',h('input',{type:'date',value:from,onChange:event=>setFrom(event.target.value),required:true})),
   h('label',null,'Till',h('input',{type:'date',value:to,onChange:event=>setTo(event.target.value),required:true})),
   h('button',{type:'submit',disabled:loading},loading?'Hämtar…':'Visa statistik')),
  h(Alert,null,validation||error),
  loading?h('p',{role:'status'},'Hämtar statistik…'):range&&h(React.Fragment,null,
   h('p',{className:'qfsv-muted'},`${dateLabel(range.from)}–${dateLabel(range.to)}`),
   h('div',{className:'qfsv-stat-cards'},...cards.map(([label,value])=>h('div',{key:label,className:'qfsv-stat-card'},h('span',null,label),h('strong',null,value)))),
   h('p',{className:'qfsv-note'},'Bokad tid visar reserverade minuter, inte bekräftad användning. Framtida bokningar räknas separat. Avbokningar som tagits bort ingår inte.'),
   summary.count===0?h('p',{className:'qfsv-empty'},'Inga bokningar med passerad starttid i den valda perioden.'):h('div',{className:'qfsv-stat-columns'},
    h('section',null,h('h3',null,'Bokningar per dag'),h('ul',{className:'qfsv-chart'},...summary.days.map(([day,count])=>h('li',{key:day},h('span',null,dateLabel(day)),h('div',{className:'qfsv-bar-track','aria-hidden':true},h('div',{className:'qfsv-bar',style:{width:`${count/max*100}%`}})),h('strong',null,number(count)))))),
    h('section',null,h('h3',null,'Populära starttider'),h('table',{className:'qfsv-table'},h('thead',null,h('tr',null,h('th',{scope:'col'},'Tid'),h('th',{scope:'col'},'Bokningar'))),h('tbody',null,...summary.times.slice(0,10).map(([time,count])=>h('tr',{key:time},h('td',null,time),h('td',null,number(count))))))))
  )
 );
}
export function BookingTabs({Book,List}){
 const [tab,setTab]=React.useState('book');
 const tabs=[['book','Boka'],['mine','Mina bokningar'],['stats','Statistik'],['all','Alla bokningar']];
 return h('div',{className:'qfsv-features'},
  h('nav',{className:'qfsv-tabs','aria-label':'Bokning och statistik'},...tabs.map(([key,label])=>h(Button,{key,'aria-pressed':tab===key,onClick:()=>setTab(key)},label))),
  tab==='book'?h(Book):tab==='mine'?h(MyBookings):tab==='stats'?h(Stats):h(List)
 );
}
