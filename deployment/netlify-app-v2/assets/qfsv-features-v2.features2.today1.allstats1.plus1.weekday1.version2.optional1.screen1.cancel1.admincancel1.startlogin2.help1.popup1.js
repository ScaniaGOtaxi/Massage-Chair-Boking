import {r as React} from './react-vendor-CZ0cz5LI.timefix1.pwfix1.features2.today1.allstats1.plus1.weekday1.version2.optional1.screen1.cancel1.admincancel1.startlogin2.help1.popup1.js';
import {s as client} from './index-D0UV-BkB.timefix1.pwfix1.features2.today1.allstats1.plus1.weekday1.version2.optional1.screen1.cancel1.admincancel1.startlogin2.help1.popup1.js';
import {stockholm,shiftDate,validateRange,isUpcoming,bookedMinutes,summarize,fetchOwnBookings,cancelOwnBooking,logOut,fetchCommunityStatistics} from './qfsv-feature-rules-v2.features2.today1.allstats1.plus1.weekday1.version2.optional1.screen1.cancel1.admincancel1.startlogin2.help1.popup1.js';
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
  lock.current=true;
  if(!await window.QFSVPopup.confirm(`Vill du avboka din tid den ${dateLabel(row.date)} kl. ${row.start_time.slice(0,5)}–${row.end_time.slice(0,5)}?`)){lock.current=false;return;}
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
 const tabs=[['book','Boka'],['mine','Mina bokningar'],['stats','Statistik'],['all','Alla bokningar'],['help','Hjälp']];
 return h('div',{className:'qfsv-features'},
  h('nav',{className:'qfsv-tabs','aria-label':'Bokning och statistik'},...tabs.map(([key,label])=>h(Button,{key,'aria-pressed':tab===key,onClick:()=>setTab(key)},label))),
  tab==='book'?h(Book):tab==='mine'?h(MyBookings):tab==='stats'?h(Stats):tab==='help'?h(QFSV_Help):h(List)
 );
}

const QFSV_HELP=[["Boka en tid", "Öppna Boka. Välj en eller två sessioner: varje session är 20 minuter. Välj sedan en ledig starttid. Kontrollera starttid, sluttid och längd i sammanfattningen och tryck på bokningsknappen. Kontrollera därefter att bokningen finns under Mina bokningar.", "Bokningar kan bara skapas för dagens datum. Tider som redan har passerat kan inte bokas. Hela det valda tidsintervallet måste vara ledigt."], ["Varför blir en ledig starttid röd?", "Exempel: du har en bokning 12:00–12:40. Med en session kan du boka 11:40–12:00. Med två sessioner kan du inte börja 11:40, eftersom tiden då skulle sluta 12:20 och överlappa din bokning.", "Du kan börja 12:40 och boka två sessioner till 13:20 om hela tiden är ledig. En bokning får börja exakt när en annan slutar. En röd ruta betyder därför inte alltid att just det 20-minuterspasset är bokat: den valda längden kan överlappa en senare bokning."], ["Färger och vald tid", "Blå: vald starttid. Kontrollera hela tidsintervallet i sammanfattningen. Röd: starttiden överlappar en bokning med den längd du valt. Gul: den valda längden ryms inte före stängning. Grå: tiden har passerat. Ljus eller vit: möjlig starttid för den valda längden.", "En bokning 12:00–12:40 omfattar två pass, 12:00 och 12:20. Båda visas som upptagna, men det är en bokning under Mina bokningar."], ["Bekräfta och uppdatera", "En tid blir bokad när bokningen har sparats och finns under Mina bokningar. Använd Uppdatera/Refresh för att hämta aktuell tillgänglighet. Någon annan kan ha bokat en tid sedan du öppnade sidan.", "Om bekräftelsen uteblir: uppdatera Mina bokningar och kontrollera resultatet innan du försöker boka samma tid igen."], ["Mina bokningar och avbokning", "Under Mina bokningar → Kommande ser du dina kommande bokningar. Välj Avboka på rätt bokning och följ bekräftelsen. När appen bekräftar avbokningen blir tiden tillgänglig igen.", "Om ett fel visas och bokningen finns kvar är avbokningen inte bekräftad. Uppdatera listan och försök igen. Historik visar tidigare bokningar som finns kvar i systemet."], ["Alla bokningar", "Alla bokningar ger en överblick över bokningarna. Vanliga användare kan avboka sina egna kommande bokningar via Mina bokningar."], ["Statistik och Statistik ALL", "Välj period för statistiken. Statistik ALL omfattar hela den sparade bokningshistoriken från första bokningen, även över flera år.", "Bokad tid visar reserverade timmar. Beläggningsgrad jämför bokad tid med tillgängliga öppettimmar. Populäraste tiderna visar veckodagar och klockslag som bokas mest. Utveckling över tid jämför månader och år. Nya och återkommande användare visar förstagångsbokare och personer som bokar igen.", "Öppettid och beläggning räknas för måndag till fredag. Lördag och söndag räknas inte som öppetdagar. Statistiken visar bokad tid, inte uppmätt användning av stolen. Avbokningar som har tagits bort ingår inte i den sparade historiken."], ["Inställningar, konto och lösenord", "Under Inställningar/Settings kan du hantera profilbild, visningsnamn och avdelning. Logga ut finns också här. Logga gärna ut på en delad dator.", "Har du glömt lösenordet? Använd återställningen på inloggningssidan. Begär en ny länk om den tidigare länken har gått ut."], ["Installera appen – frivilligt", "Appen fungerar direkt i webbläsaren. Om webbläsaren stöder installation kan Installera appen skapa en genväg på datorn eller telefonens hemskärm.", "Välj Nej tack för att stänga installationsrutan. Installationsalternativet finns även under Inställningar."], ["Helskärm och uppstart", "Under Boka finns Aktivera helskärm. Välj Avsluta helskärm eller tryck Esc på datorn för att lämna läget. Stöd beror på webbläsaren.", "Startbilden visas i ungefär fyra sekunder vid första öppningen i en fliksession. När du uppdaterar sidan hoppas den över. En ny separat flik kan visa startbilden igen."], ["För administratörer", "Admin → Kommande bokningar visar kommande bokningar för alla användare. Sök efter namn, e-post eller datum. Administratörer kan avboka andras kommande bokningar. Kontrollera alltid person, datum och tid före bekräftelsen."], ["Om något inte fungerar", "Kan en tid inte väljas? Kontrollera antal sessioner och att hela tidsintervallet är ledigt. Saknas bokningen? Uppdatera Mina bokningar innan du bokar igen. Misslyckas avbokningen? Kontrollera om bokningen finns kvar.", "Ladda om sidan om uppgifter verkar gamla. Kontakta administratören om problemet kvarstår och ange vad du gjorde samt eventuellt felmeddelande."]];
function QFSV_Help(){return h('section',{className:'qfsv-help','aria-label':'Hjälp för Massage Chair Booking'},
 h('h2',{tabIndex:-1},'Hjälp'),h('p',null,'Så fungerar Massage Chair Booking. Öppna ett avsnitt för att läsa mer.'),
 ...QFSV_HELP.map(([title,...paragraphs],i)=>h('details',{key:title,open:i===1},h('summary',null,title),...paragraphs.map((text,j)=>h('p',{key:j},text)))));}
