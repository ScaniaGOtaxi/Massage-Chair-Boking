import test from 'node:test';import assert from 'node:assert/strict';
import {analyze} from '../release/MassageBoking/assets/qfsv-analytics.plus1.js';
const now=new Date('2026-10-16T12:00:00Z');
const row=(date,start='10:00:00',end='10:20:00',user_id='a')=>({date,start_time:start,end_time:end,user_id});
test('occupancy unions overlapping intervals, clips hours, excludes future and closed dates',()=>{
 const data=[row('2026-10-15','05:40:00','06:20:00'),row('2026-10-15','06:00:00','06:40:00'),row('2026-10-16','16:40:00','17:20:00'),row('2026-10-17')];
 const a=analyze(data,'all',{},now);assert.equal(a.capacity,1320);assert.equal(a.occupied,60);assert.equal(a.occupancy,60/1320*100);assert.equal(a.bookings,3);
 const b=analyze(data,'all',{closed:'2026-10-15'},now);assert.equal(b.capacity,660);assert.equal(b.occupied,20);
 assert.equal(analyze(data,'all',{open:'18:00',close:'06:00'},now).occupancy,null);
 assert.equal(analyze(data,'all',{days:[]},now).occupancy,null);
});
test('new and returning users use complete saved history; repeat is distinct',()=>{
 const history=[row('2025-01-01'),row('2026-10-12'),row('2026-10-13'),row('2026-10-14','10:00:00','10:20:00','b'),row('2026-11-01','10:00:00','10:20:00','c')];
 const a=analyze(history,'month',{},now);assert.equal(a.returning,1);assert.equal(a.newUsers,1);assert.equal(a.repeat,1);assert.equal(a.users,2);assert.equal(a.bookings,3);
 const all=analyze(history,'all',{},now);assert.equal(all.returning,0);assert.equal(all.newUsers,2);assert.equal(all.repeat,1);
});
test('hour buckets split minutes at boundaries, weekday follows booking date, missing months zero-filled',()=>{
 const a=analyze([row('2026-01-01','10:40:00','11:20:00'),row('2026-10-16')],'all',{},now);
 assert.equal(a.hours[10].minutes,40);assert.equal(a.hours[11].minutes,20);assert.equal(a.week[3].bookings,1);assert.equal(a.week[4].bookings,1);
 assert.equal(a.months.length,10);assert.equal(a.months[1].bookings,0);assert.equal(a.years[0].minutes,60);
});
test('empty history is zero and Sweden date handles year boundary',()=>{
 const a=analyze([],'all',{},now);assert.equal(a.occupancy,0);assert.equal(a.bookings,0);assert.equal(a.users,0);
 const b=analyze([row('2027-01-01')],'year',{},new Date('2026-12-31T23:30:00Z'));assert.equal(b.bookings,1);assert.equal(b.to,'2027-01-01');
});
