const dayFmt=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'});
const timeFmt=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
const clock=now=>({date:dayFmt.format(now),time:timeFmt.format(now)});

export function upcoming(row,now=new Date()){
 const current=clock(now);
 return row.date>current.date||(row.date===current.date&&row.start_time.slice(0,8)>current.time);
}

export async function requireAdmin(client){
 const {data,error}=await client.auth.getUser();
 if(error||!data?.user)throw new Error('Du behöver logga in igen.');
 const result=await client.from('admins').select('id').eq('user_id',data.user.id).maybeSingle();
 if(result.error||!result.data)throw new Error('Du behöver administratörsbehörighet.');
 return data.user;
}

export async function fetchUpcoming(client,now=new Date()){
 await requireAdmin(client);
 const current=clock(now),rows=[];
 for(let offset=0;;offset+=500){
  const {data,error}=await client.from('bookings')
   .select('id,user_id,name,email,date,start_time,end_time,sessions')
   .or(`date.gt.${current.date},and(date.eq.${current.date},start_time.gt.${current.time})`)
   .order('date',{ascending:true})
   .order('start_time',{ascending:true})
   .order('id',{ascending:true})
   .range(offset,offset+499);
  if(error||!Array.isArray(data))
   throw new Error('Kunde inte hämta alla kommande bokningar. Försök igen.');
  rows.push(...data);
  if(data.length<500)break;
 }
 return rows;
}

export async function cancelAsAdmin(client,row,now=new Date()){
 await requireAdmin(client);
 if(!upcoming(row,now))
  throw new Error('Bokningen har redan börjat. Uppdatera listan.');
 const current=clock(now);
 const {data,error}=await client.from('bookings').delete()
  .eq('id',row.id)
  .eq('user_id',row.user_id)
  .eq('date',row.date)
  .eq('start_time',row.start_time)
  .or(`date.gt.${current.date},and(date.eq.${current.date},start_time.gt.${current.time})`)
  .select('id,user_id,date,start_time').single();
 if(error?.code==='42501')
  throw new Error('Databasen tillåter inte avbokningen. Kontrollera administratörsbehörigheten.');
 if(error||data?.id!==row.id)
  throw new Error('Avbokningen kunde inte bekräftas. Bokningen kan ha ändrats. Uppdatera listan.');
 return data.id;
}

export function AdminUpcoming({React:R,client}){
 const h=R.createElement;
 const [rows,setRows]=R.useState([]);
 const [loading,setLoading]=R.useState(true);
 const [error,setError]=R.useState('');
 const [notice,setNotice]=R.useState('');
 const [pending,setPending]=R.useState(null);
 const [search,setSearch]=R.useState('');
 const [now,setNow]=R.useState(()=>new Date());
 const generation=R.useRef(0),lock=R.useRef(false),alive=R.useRef(true);
 const label=d=>new Intl.DateTimeFormat('sv-SE',{
  timeZone:'Europe/Stockholm',day:'numeric',month:'long',year:'numeric'
 }).format(new Date(d+'T12:00:00Z'));
 const name=row=>row.name||row.email||'Användare';

 async function refresh(){
  const request=++generation.current;
  setLoading(true);setError('');
  try{
   const data=await fetchUpcoming(client);
   if(request===generation.current){
    setRows(data);setNow(new Date());
   }
  }catch(e){
   if(request===generation.current){
    setRows([]);setError(e.message);
   }
  }finally{
   if(request===generation.current)setLoading(false);
  }
 }

 R.useEffect(()=>{
  alive.current=true;refresh();
  const timer=setInterval(()=>setNow(new Date()),15000);
  return()=>{
   alive.current=false;
   generation.current++;
   clearInterval(timer);
  };
 },[]);

 async function cancel(row){
  if(lock.current)return;
  lock.current=true;
  if(!await window.QFSVPopup.confirm(`Avboka ${name(row)}s bokning den ${label(row.date)} kl. ${row.start_time.slice(0,5)}–${row.end_time.slice(0,5)}?`)){lock.current=false;return;}
  lock.current=true;
  setPending(row.id);setError('');setNotice('');
  try{
   await cancelAsAdmin(client,row);
   if(alive.current){
    setRows(old=>old.filter(item=>item.id!==row.id));
    setNotice('Bokningen är avbokad. Tiden är tillgänglig igen.');
    window.dispatchEvent(new Event('qfsv:bookings-changed'));
   }
  }catch(e){
   if(alive.current)setError(e.message);
  }finally{
   lock.current=false;
   if(alive.current){
    setPending(null);setNow(new Date());
   }
  }
 }

 const current=rows.filter(row=>upcoming(row,now));
 const term=search.trim().toLocaleLowerCase('sv-SE');
 const visible=current.filter(row=>
  [name(row),row.email||'',row.date].join(' ')
   .toLocaleLowerCase('sv-SE').includes(term)
 );

 return h('section',{
  className:'qfsv-panel',
  'aria-label':'Kommande bokningar för administratör'
 },
  h('div',{className:'qfsv-toolbar'},
   h('div',null,
    h('h2',null,'Kommande bokningar'),
    h('p',null,'Se och avboka kommande bokningar för alla användare. Tider visas i svensk tidszon.')
   ),
   h('button',{
    type:'button',onClick:refresh,disabled:loading||!!pending
   },loading?'Hämtar…':'Uppdatera')
  ),
  h('label',{className:'qfsv-admin-search'},
   'Sök användare eller datum',
   h('input',{
    type:'search',value:search,
    onChange:e=>setSearch(e.target.value),
    placeholder:'Namn, e-post eller ÅÅÅÅ-MM-DD'
   })
  ),
  error&&h('p',{role:'alert',className:'qfsv-error'},error),
  h('p',{role:'status',className:'qfsv-success'},notice),
  loading
   ?h('p',null,'Hämtar bokningar…')
   :!error&&h('p',null,`${visible.length} av ${current.length} kommande bokningar`),
  !loading&&!error&&visible.length===0&&h('p',{
   className:'qfsv-empty'
  },current.length?'Inga bokningar matchar sökningen.':'Det finns inga kommande bokningar.'),
  !loading&&h('ul',{className:'qfsv-booking-list'},
   visible.map(row=>h('li',{
    key:row.id,className:'qfsv-booking'
   },
    h('div',null,
     h('h3',null,name(row)),
     row.email&&h('p',{className:'qfsv-muted'},row.email),
     h('p',null,`${label(row.date)} · ${row.start_time.slice(0,5)}–${row.end_time.slice(0,5)}`)
    ),
    h('button',{
     type:'button',className:'qfsv-danger',disabled:!!pending,
     onClick:()=>cancel(row),
     'aria-label':`Avboka ${name(row)} ${row.date} kl. ${row.start_time.slice(0,5)}`
    },pending===row.id?'Avbokar…':'Avboka')
   ))
  )
 );
}
