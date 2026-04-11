-- upcoming_followed_events 뷰 (캘린더 팔로우 + 다가오는 이벤트)
-- GET /api/calendar/followed-events 가 .from("upcoming_followed_events") 로 조회함.
-- 컬럼은 PostgREST select 와 맞출 것: id, title, start_date, end_date, event_type, game_category, user_id
--
-- calendar_follows: (user_id, event_id) → events.id
--
-- 기존 뷰와 컬럼 구성이 다르면 CREATE OR REPLACE VIEW 만으로는 갱신 불가
-- (ERROR 42P16: cannot drop columns from view). 반드시 DROP 후 CREATE 할 것.

DROP VIEW IF EXISTS public.upcoming_followed_events CASCADE;

CREATE VIEW public.upcoming_followed_events AS
SELECT
  cf.user_id,
  e.id,
  e.title,
  e.start_date,
  e.end_date,
  e.event_type,
  e.game_category
FROM public.calendar_follows cf
INNER JOIN public.events e ON e.id = cf.event_id
WHERE e.end_date IS NULL OR e.end_date >= (NOW() AT TIME ZONE 'UTC');

COMMENT ON VIEW public.upcoming_followed_events IS
  '로그인 유저가 팔로한 일정 중 아직 종료되지 않은 행; API는 id→event_id 로 매핑해 반환';

-- RLS: 뷰는 보통 기본 테이블 정책을 따름. SELECT 만 필요하면 events/calendar_follows RLS 확인.
