import {periodBounds,stockholmDate,bookingMinutes} from './qfsv-statistics-all-v1.allstats1.plus1.weekday1.version2.optional1.screen1.cancel1.admincancel1.js';
const date=d=>new Date(d+'T12:00:00Z');
const iso=d=>d.toISOString().slice(0,10);
const next=d=>{const n=date(d);n.setUTCDate(n.getUTCDate()+1);return iso(n)};
const minute=t=>/^\d{2}:\d{2}/.test(t||'')?+t.slice(0,2)*60 + +t.slice(3,5):NaN;
export function analyze(history,period,settings={},now=new Date()){
 const today=stockholmDate(now),bounds=periodBounds(period,now);
 const all=history.filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&r.date<=today&&![0,6].includes(date(r.date).getUTCDay()));
 const first=all.reduce((s,r)=>!s||r.date<s?r.date:s,null);
 const from=bounds?.from||first||today,to=bounds?.to&&bounds.to<today?bounds.to:today;
 const rows=all.filter(r=>r.date>=from&&r.date<=to);
 const start=minute(settings.open||'06:00'),end=minute(settings.close||'17:00');
 const valid=Number.isFinite(start)&&Number.isFinite(end)&&start>=0&&end<=1440&&end>start;
 const weekdays=settings.days||[1,2,3,4,5],closed=new Set((settings.closed||'').split(/[\s,;]+/));
 const active=d=>weekdays.includes(date(d).getUTCDay())&&!closed.has(d);
 const availableFrom=first&&first>from?first:from;
 let days=0;for(let d=availableFrom;d<=to;d=next(d))if(active(d))days++;
 const capacity=valid?days*(end-start):0,intervals=new Map();
 const week=Array.from({length:7},(_,i)=>({label:['Måndag','Tisdag','Onsdag','Torsdag','Fredag','Lördag','Söndag'][i],bookings:0,minutes:0}));
 const hours=Array.from({length:24},(_,i)=>({label:String(i).padStart(2,'0')+':00',bookings:0,minutes:0}));
 const firstByUser=new Map(),countByUser=new Map(),months=new Map(),years=new Map();
 for(const r of all)if(r.user_id&&(!firstByUser.has(r.user_id)||r.date<firstByUser.get(r.user_id)))firstByUser.set(r.user_id,r.date);
 for(const r of rows){
  const duration=bookingMinutes(r),weekday=(date(r.date).getUTCDay()+6)%7;
  week[weekday].bookings++;week[weekday].minutes+=duration;
  if(r.user_id)countByUser.set(r.user_id,(countByUser.get(r.user_id)||0)+1);
  for(const [map,key] of [[months,r.date.slice(0,7)],[years,r.date.slice(0,4)]]){
   if(!map.has(key))map.set(key,{label:key,bookings:0,minutes:0});
   map.get(key).bookings++;map.get(key).minutes+=duration;
  }
  const a=minute(r.start_time),b=Number.isFinite(minute(r.end_time))?minute(r.end_time):a+duration;
  if(Number.isFinite(a)&&b>a){
   for(let h=0;h<24;h++){const overlap=Math.max(0,Math.min(b,(h+1)*60)-Math.max(a,h*60));if(overlap){hours[h].minutes+=overlap;hours[h].bookings++;}}
   if(valid&&active(r.date)){
    const x=Math.max(start,a),y=Math.min(end,b);
    if(y>x){if(!intervals.has(r.date))intervals.set(r.date,[]);intervals.get(r.date).push([x,y]);}
   }
  }
 }
 let occupied=0;for(const spans of intervals.values()){
  spans.sort((a,b)=>a[0]-b[0]);let end=-1;
  for(const [a,b]of spans){occupied+=Math.max(0,b-Math.max(a,end));end=Math.max(end,b);}
 }
 // Fill gaps: a month with no bookings must remain visible in the trend.
 if(rows.length){for(let d=from.slice(0,7)+'-01';d<=to;){const key=d.slice(0,7);if(!months.has(key))months.set(key,{label:key,bookings:0,minutes:0});const n=date(d);n.setUTCMonth(n.getUTCMonth()+1);d=iso(n);}
 for(let y=+from.slice(0,4);y<=+to.slice(0,4);y++){const key=String(y);if(!years.has(key))years.set(key,{label:key,bookings:0,minutes:0});}}
 let newUsers=0,returning=0,repeat=0;for(const[id,n]of countByUser){if(firstByUser.get(id)>=from)newUsers++;else returning++;if(n>1)repeat++;}
 return {from:availableFrom,to,days,capacity,occupied,occupancy:capacity?occupied/capacity*100:null,valid,week:week.slice(0,5),hours,
  months:[...months.values()].sort((a,b)=>a.label.localeCompare(b.label)),years:[...years.values()].sort((a,b)=>a.label.localeCompare(b.label)),
  newUsers,returning,repeat,users:countByUser.size,bookings:rows.length,minutes:rows.reduce((n,r)=>n+bookingMinutes(r),0)};
}
