begin;
drop trigger if exists qfsv_booking_today_only_v1 on public.bookings;
drop function if exists public.qfsv_booking_today_only_v1();
commit;
