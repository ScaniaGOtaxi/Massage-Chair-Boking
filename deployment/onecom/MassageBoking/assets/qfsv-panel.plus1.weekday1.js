import {analyze} from './qfsv-analytics.plus1.weekday1.js';
const fmt=n=>new Intl.NumberFormat('sv-SE',{maximumFractionDigits:1}).format(n);
export function StatisticsPlus({history,period,React:R}){
 const h=R.createElement,[settings,setSettings]=R.useState({open:'06:00',close:'17:00',days:[1,2,3,4,5],closed:''}),[group,setGroup]=R.useState('months'),[style,setStyle]=R.useState('line'),[metric,setMetric]=R.useState('bookings');
 R.useEffect(()=>setGroup(period==='all'?'years':'months'),[period]);
 const a=R.useMemo(()=>analyze(history,period,settings),[history,period,settings]);
 const change=(key,value)=>setSettings(s=>({...s,[key]:value}));
 const card=(title,value,note)=>h('article',{className:'qs-card'},h('h4',null,title),h('strong',null,value),h('p',null,note));
 const value=r=>metric==='minutes'?r.minutes/60:r.bookings;
 const chart=(rows,type,id)=>{
  const width=Math.max(560,rows.length*58),height=240,pad=42,top=24,base=height-pad,max=Math.max(1,...rows.map(value));
  const x=i=>pad+(i+.5)*(width-pad*2)/Math.max(rows.length,1),y=n=>base-n/max*(base-top),points=rows.map((r,i)=>`${x(i)},${y(value(r))}`).join(' ');
  return h('div',{className:'qs-scroll',tabIndex:0,'aria-label':id},h('svg',{viewBox:`0 0 ${width} ${height}`,style:{width:rows.length>12?width:'100%',minWidth:rows.length>12?width:300,height:240},role:'img','aria-label':id},
   h('title',null,id),[0,.25,.5,.75,1].map(t=>h('g',{key:t},h('line',{x1:pad,y1:y(max*t),x2:width-pad,y2:y(max*t),stroke:'#e8eef7'}),h('text',{x:pad-8,y:y(max*t)+4,textAnchor:'end',fill:'#64748b',fontSize:11},fmt(max*t)))),
   type==='line'&&rows.length>0?h('g',null,h('polygon',{points:`${x(0)},${base} ${points} ${x(rows.length-1)},${base}`,fill:'#eff6ff'}),h('polyline',{points,fill:'none',stroke:'#2563eb',strokeWidth:3,strokeLinejoin:'round'})):null,
   rows.map((r,i)=>h('g',{key:r.label},type==='line'?h('circle',{cx:x(i),cy:y(value(r)),r:4,fill:'#2563eb'},h('title',null,`${r.label}: ${fmt(value(r))}`)):h('rect',{x:x(i)-16,y:y(value(r)),width:32,height:Math.max(0,base-y(value(r))),rx:5,fill:'#3b82f6'},h('title',null,`${r.label}: ${fmt(value(r))}`)),
    h('text',{x:x(i),y:base+20,textAnchor:'middle',fill:'#475569',fontSize:10},r.label),h('text',{x:x(i),y:y(value(r))-9,textAnchor:'middle',fill:'#17304e',fontSize:10},fmt(value(r)))))
  ));
 };
 const table=rows=>h('details',null,h('summary',null,'Visa alla värden i tabell'),h('div',{className:'qs-scroll'},h('table',null,h('thead',null,h('tr',null,['Period / tid','Bokningar','Bokade timmar'].map(t=>h('th',{key:t,scope:'col'},t)))),h('tbody',null,rows.map(r=>h('tr',{key:r.label},h('td',null,r.label),h('td',null,r.bookings),h('td',null,fmt(r.minutes/60))))))));
 const select=(label,value,change,options)=>h('label',null,label,h('select',{value,onChange:e=>change(e.target.value)},options.map(([v,t])=>h('option',{value:v,key:v},t))));
 const exportCSV=()=>{
  const rows=[['Statistik PLUS',a.from,a.to],['Beräknad beläggning (%)',a.occupancy??''],['Tillgängliga timmar',a.capacity/60],['Bokade öppettimmar (utan överlapp)',a.occupied/60],['Nya bokande användare',a.newUsers],['Återkommande från tidigare period',a.returning],['Minst två bokningar i perioden',a.repeat],['Öppnar',settings.open],['Stänger',settings.close],['Öppna veckodagar (0=söndag)',settings.days.join(',')],['Stängda datum',settings.closed],['Typ','Period / tid','Bokningar','Bokade timmar'],...['week','hours','months','years'].flatMap(k=>a[k].map(r=>[k,r.label,r.bookings,r.minutes/60]))];
  const csv='\ufeff'+rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='statistik-plus.csv';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
 };
 return h('section',{className:'qs-plus','aria-label':'Statistik PLUS'},
  h('header',{className:'qs-title'},h('div',null,h('span',{className:'qs-badge'},'STATISTIK PLUS'),h('h3',null,'Stolens användning över tid'),h('p',null,`${a.from} – ${a.to} · måndag–fredag · sparade bokningar till och med idag`)),h('button',{onClick:exportCSV},'Exportera utökad CSV')),
  h('div',{className:'qs-cards'},card('Beräknad beläggning',a.occupancy===null?'–':fmt(a.occupancy)+' %',`${fmt(a.occupied/60)} bokade av ${fmt(a.capacity/60)} tillgängliga timmar`),card('Nya bokande användare',a.newUsers,'Första sparade bokningen finns i vald period.'),card('Återkommande användare',a.returning,'Har en sparad bokning före vald period.'),card('Bokar flera gånger',a.repeat,'Användare med minst två bokningar i perioden.')),
  h('div',{className:'qs-card'},h('h4',null,'Beläggning inom öppettiderna'),h('div',{className:'qs-track',role:'progressbar','aria-label':'Beräknad beläggning','aria-valuemin':0,'aria-valuemax':100,'aria-valuenow':a.occupancy??0},h('div',{style:{width:(a.occupancy??0)+'%'}})),h('p',null,'En stol. Måndag–fredag kl. 06–17 som standard. Helger är stängda och ingår inte. Hela öppetdagen räknas även idag. Dagar före första sparade bokningen räknas bort. Överlappande bokningar räknas en gång. Framtida bokningar ingår inte här.'),
   h('details',null,h('summary',null,'Anpassa öppettider och stängda dagar'),h('div',{className:'qs-controls'},h('label',null,'Öppnar',h('input',{type:'time',value:settings.open,onChange:e=>change('open',e.target.value)})),h('label',null,'Stänger',h('input',{type:'time',value:settings.close,onChange:e=>change('close',e.target.value)}))),
    h('fieldset',null,h('legend',null,'Öppna veckodagar'),[[1,'Mån'],[2,'Tis'],[3,'Ons'],[4,'Tor'],[5,'Fre']].map(([i,label])=>h('label',{key:i,className:'qs-check'},h('input',{type:'checkbox',checked:settings.days.includes(i),onChange:e=>change('days',e.target.checked?[...settings.days,i]:settings.days.filter(d=>d!==i))}),label))),
    h('label',null,'Stängda datum, exempel: 2026-12-24, 2026-12-25',h('input',{type:'text',value:settings.closed,placeholder:'ÅÅÅÅ-MM-DD, ÅÅÅÅ-MM-DD',onChange:e=>change('closed',e.target.value)})),h('p',null,'Inställningarna används i denna vy och ändrar inte bokningsreglerna. Helgdagar och driftstopp räknas bort bara om de anges.')),
   !a.valid&&h('p',{role:'alert'},'Välj en stängningstid efter öppningstiden.')),
  h('div',{className:'qs-controls'},select('Visa mått',metric,setMetric,[['bookings','Antal bokningar'],['minutes','Bokade timmar']])),
  h('div',{className:'qs-charts'},h('article',{className:'qs-card'},h('h4',null,'Populäraste veckodagarna'),h('p',null,'Alla sparade bokningar i vald period till och med idag. Dra grafen åt sidan på mobil.'),chart(a.week,'bar','Bokningar per veckodag'),table(a.week)),h('article',{className:'qs-card'},h('h4',null,'Populäraste klockslagen'),h('p',null,'En bokning som går över ett timskifte räknas i båda timmarna. Tiden fördelas per timme. Dra åt sidan på mobil.'),chart(a.hours.filter((r,i)=>r.minutes>0||(i>=6&&i<17)),'bar','Bokningar per klockslag'),table(a.hours))),
  h('article',{className:'qs-card'},h('div',{className:'qs-title'},h('h4',null,'Utveckling över tid'),h('div',{className:'qs-controls'},select('Gruppera',group,setGroup,[['months','Månader'],['years','År']]),select('Diagram',style,setStyle,[['line','Linjegraf'],['bar','Staplar']]))),h('p',null,'Visar hela vald period. Tomma månader och år visas som noll. På mobil kan du dra grafen åt sidan.'),chart(a[group],style,'Utveckling över tid'),table(a[group])),
  h('p',{className:'qs-footnote'},'Statistiken visar reserverad tid, inte bekräftad massage. Raderade avbokningar saknas. ”Ny” betyder första bokning som finns kvar i databasen. Under Statistik ALL är alla användare nya inom hela perioden; ”Bokar flera gånger” visar återbesök. Inga namn eller e-postadresser visas.')
 );
}
