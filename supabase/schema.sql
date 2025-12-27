-- 정기구독 관리 서비스를 위한 Supabase 테이블 스키마

-- subscriptions 테이블 생성
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL, -- 추후 Supabase Auth 연동 시 UUID로 변경 가능
  service_name TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KRW',
  next_billing_date DATE NOT NULL,
  cycle TEXT NOT NULL CHECK (cycle IN ('monthly', 'yearly', 'weekly', 'quarterly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  billing_email TEXT,
  service_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing_date ON subscriptions(next_billing_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- updated_at 자동 업데이트를 위한 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- user_settings 테이블 생성 (Slack Webhook URL 등 사용자 설정 저장)
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  slack_webhook_url TEXT,
  notification_enabled BOOLEAN DEFAULT true,
  notification_days_before INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- notification_history 테이블 생성 (알림 히스토리 및 중복 방지)
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  notification_date DATE NOT NULL,
  days_before_billing INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'retrying')),
  slack_webhook_url TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 중복 방지를 위한 유니크 제약조건 (같은 구독, 같은 날짜, 같은 days_before에는 한 번만 알림)
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_history_unique 
ON notification_history(subscription_id, notification_date, days_before_billing);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_subscription_id ON notification_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_date ON notification_history(notification_date);
CREATE INDEX IF NOT EXISTS idx_notification_history_status ON notification_history(status);

-- 복합 인덱스 (자주 함께 조회되는 컬럼들)
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status_date 
ON subscriptions(user_id, status, next_billing_date);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_enabled 
ON user_settings(user_id, notification_enabled) 
WHERE notification_enabled = true;

-- RLS (Row Level Security) 정책 (선택사항 - 추후 인증 시스템 추가 시 활성화)
-- ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY "Users can view their own subscriptions"
--   ON subscriptions FOR SELECT
--   USING (auth.uid()::text = user_id);
-- 
-- CREATE POLICY "Users can insert their own subscriptions"
--   ON subscriptions FOR INSERT
--   WITH CHECK (auth.uid()::text = user_id);
-- 
-- CREATE POLICY "Users can update their own subscriptions"
--   ON subscriptions FOR UPDATE
--   USING (auth.uid()::text = user_id);
-- 
-- CREATE POLICY "Users can delete their own subscriptions"
--   ON subscriptions FOR DELETE
--   USING (auth.uid()::text = user_id);

