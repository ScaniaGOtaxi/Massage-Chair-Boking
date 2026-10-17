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
  rows.push(...data.filter(r=>{const day=new Date(r.date+'T12:00:00Z').getUTCDay();return day>=1&&day<=5}));if(data.length<PAGE_SIZE)break;
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
