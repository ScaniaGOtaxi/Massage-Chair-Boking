const dayFormatter = new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'});
const timeFormatter = new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/Stockholm',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
export function stockholm(now = new Date()) { return {date:dayFormatter.format(now), time:timeFormatter.format(now)}; }
export function validDate(value) {
 if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
 const d = new Date(value+'T12:00:00Z');
 return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === value;
}
export function shiftDate(date, days) {
 if (!validDate(date)) throw new Error('Ogiltigt datum');
 const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);
}
export function validateRange(from,to) {
 if (!validDate(from)||!validDate(to)||from>to) return 'Välj ett giltigt start- och slutdatum.';
 if ((Date.parse(to)-Date.parse(from))/86400000>365) return 'Välj högst 366 dagar åt gången.';
 return '';
}
function minutes(value) {
 if(typeof value!=='string'||!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?$/.test(value))return NaN;
 return Number(value.slice(0,2))*60+Number(value.slice(3,5));
}
export function bookedMinutes(row) {
 const from=minutes(row.start_time),to=minutes(row.end_time);
 return Number.isFinite(from)&&Number.isFinite(to)&&to>from ? to-from : 0;
}
export function isUpcoming(row, now=new Date()) {
 const current=stockholm(now);
 return validDate(row.date)&&Number.isFinite(minutes(row.start_time)) &&
 (row.date>current.date||(row.date===current.date&&row.start_time.slice(0,5)>current.time));
}
export function summarize(rows, now=new Date(), aggregate=false) {
 let count=0,total=0,future=0;const days=new Map(),times=new Map();
 for (const row of rows) {
  if(!validDate(row.date)||!Number.isFinite(minutes(row.start_time)))continue;
  const n=aggregate?Number(row.booking_count):1, duration=aggregate?Number(row.booked_minutes):bookedMinutes(row);
  if(!Number.isFinite(n)||n<0||!Number.isFinite(duration)||duration<0)continue;
  if(isUpcoming(row,now)){future+=n;continue;}
  count+=n;total+=duration;
  days.set(row.date,(days.get(row.date)||0)+n);
  const time=row.start_time.slice(0,5);times.set(time,(times.get(time)||0)+n);
 }
 return {count,minutes:total,future,days:[...days].sort(([a],[b])=>a.localeCompare(b)),times:[...times].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))};
}
export async function fetchOwnBookings(client,userId,from=null,to=null) {
 if(!userId)throw new Error('Du behöver logga in igen.');
 const rows=[];
 for(let offset=0;;offset+=500){
  let query=client.from('bookings').select('id,user_id,date,start_time,end_time,sessions').eq('user_id',userId);
  if(from)query=query.gte('date',from);
  if(to)query=query.lte('date',to);
  const {data,error}=await query.order('date',{ascending:true}).order('start_time',{ascending:true}).order('id',{ascending:true}).range(offset,offset+499);
  if(error)throw error;
  if(!Array.isArray(data))throw new Error('Ogiltigt svar från bokningsservern.');
  rows.push(...data.filter(row=>row.user_id===userId));
  if(data.length<500)break;
 }
 return rows;
}
export async function cancelOwnBooking(client,row,userId,now=new Date()) {
 if(!userId||row.user_id!==userId)throw new Error('Du kan bara avboka dina egna bokningar.');
 if(!isUpcoming(row,now))throw new Error('Tiden har redan börjat och kan inte avbokas.');
 const current=stockholm(now);
 const {data,error}=await client.from('bookings').delete().eq('id',row.id).eq('user_id',userId)
  .or(`date.gt.${current.date},and(date.eq.${current.date},start_time.gt.${current.time}:00)`)
  .select('id').single();
 if(error||!data||data.id!==row.id)throw new Error('Avbokningen kunde inte bekräftas. Uppdatera listan och försök igen.');
 return data.id;
}
const pending=new WeakMap();
export function logOut(client,redirect=()=>window.location.assign('/MassageBoking/')){
 if(pending.has(client))return pending.get(client);
 const request=Promise.resolve().then(async()=>{
  const {error}=await client.auth.signOut({scope:'local'});
  if(error)throw error;
  redirect();
 }).finally(()=>pending.delete(client));
 pending.set(client,request);return request;
}
export async function fetchCommunityStatistics(client,from,to){
 const invalid=validateRange(from,to);if(invalid)throw new Error(invalid);
 const rows=[];
 for(let offset=0;;offset+=500){
  const {data,error}=await client.rpc('qfsv_booking_statistics_v2',{p_from:from,p_to:to})
   .order('date',{ascending:true}).order('start_time',{ascending:true}).range(offset,offset+499);
  if(error){
   if(error.code==='PGRST202'||error.code==='42883')throw new Error('Gemensam statistik är inte aktiverad ännu. Administratören behöver köra den medföljande SQL-filen i Supabase. Din egen statistik fungerar redan.');
   throw new Error('Kunde inte hämta gemensam statistik. Kontrollera anslutningen och försök igen.');
  }
  if(!Array.isArray(data))throw new Error('Kunde inte läsa statistiken. Försök igen.');
  rows.push(...data);if(data.length<500)break;
 }
 return rows;
}
