-- 개선사항을 위한 데이터베이스 스키마 업데이트

-- 1. subscriptions 테이블에 카테고리와 태그 추가
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- 카테고리 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_subscriptions_category ON subscriptions(category) WHERE category IS NOT NULL;

-- 2. payment_history 테이블 생성 (결제 내역 히스토리)
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KRW',
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'failed', 'refunded')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_subscription_id ON payment_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_payment_date ON payment_history(payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_history_user_date ON payment_history(user_id, payment_date);

-- 3. user_settings 테이블에 여러 알림 시점 설정 추가
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS notification_days_before_array INTEGER[] DEFAULT ARRAY[3],
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_address TEXT;

-- 기존 notification_days_before를 배열로 변환 (마이그레이션)
UPDATE user_settings 
SET notification_days_before_array = ARRAY[notification_days_before]
WHERE notification_days_before_array IS NULL OR array_length(notification_days_before_array, 1) IS NULL;

