-- Kör manuellt i Supabase SQL Editor, en gång. Kan köras igen.
-- Lägger bara till en funktion. Inga bokningar eller befintliga RLS-policyer ändras.
begin;
create or replace function public.qfsv_booking_statistics_v2(p_from date, p_to date)
returns table(date date, start_time time without time zone, booking_count bigint, booked_minutes bigint)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 365 then
    raise exception 'Choose a valid range of at most 366 days' using errcode = '22023';
  end if;
  return query
    select b.date::date,
           b.start_time::time,
           count(*)::bigint,
           coalesce(sum(greatest(0, extract(epoch from (b.end_time::time - b.start_time::time)) / 60)), 0)::bigint
    from public.bookings as b
    where b.date::date between p_from and p_to
    group by b.date::date, b.start_time::time
    order by b.date::date, b.start_time::time;
end;
$function$;
revoke all on function public.qfsv_booking_statistics_v2(date, date) from public, anon;
grant execute on function public.qfsv_booking_statistics_v2(date, date) to authenticated;
comment on function public.qfsv_booking_statistics_v2(date, date) is
'Authenticated users: aggregate booking counts and reserved minutes only. No user IDs, names or email addresses. Max 366 days.';
notify pgrst, 'reload schema';
commit;
