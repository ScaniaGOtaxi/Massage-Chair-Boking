begin;
create or replace function public.qfsv_booking_today_only_v1()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if tg_op = 'INSERT'
     or new.date is distinct from old.date
     or new.start_time is distinct from old.start_time
     or new.end_time is distinct from old.end_time
     or new.sessions is distinct from old.sessions then
    if new.date is null
       or new.date::date <> (clock_timestamp() at time zone 'Europe/Stockholm')::date then
      raise exception 'Du kan bara boka tider för dagens datum.' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists qfsv_booking_today_only_v1 on public.bookings;
create trigger qfsv_booking_today_only_v1
before insert or update of date, start_time, end_time, sessions
on public.bookings
for each row execute function public.qfsv_booking_today_only_v1();

revoke all on function public.qfsv_booking_today_only_v1() from public, anon, authenticated;
notify pgrst, 'reload schema';
commit;
