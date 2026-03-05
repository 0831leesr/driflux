-- last_steam_update → last_data_update 컬럼 변경
-- last_data_update: 갱신 시도 시각 (성공/실패 무관). game_data_update와 함께 선정에 사용.
-- update-evaluations는 이 컬럼을 갱신하지 않음 (평가 갱신은 데이터 갱신으로 보지 않음)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'games' AND column_name = 'last_steam_update'
  ) THEN
    ALTER TABLE games RENAME COLUMN last_steam_update TO last_data_update;
  END IF;
END $$;

-- 인덱스: 기존 idx_games_last_steam_update는 컬럼 rename 시 자동으로 유효하지만, 이름 통일을 위해 재생성
DROP INDEX IF EXISTS idx_games_last_steam_update;
CREATE INDEX IF NOT EXISTS idx_games_last_data_update ON games(last_data_update);
