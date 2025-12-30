import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const checks: Record<string, { success: boolean; message: string }> = {}

    // 1. subscriptions 테이블에 category, tags 컬럼 확인
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('category, tags')
        .limit(1)

      if (error && error.message.includes('column') && error.message.includes('does not exist')) {
        checks.subscriptions_category = {
          success: false,
          message: 'category 또는 tags 컬럼이 없습니다. 스키마 업데이트가 필요합니다.',
        }
      } else {
        checks.subscriptions_category = {
          success: true,
          message: 'subscriptions 테이블에 category와 tags 컬럼이 있습니다.',
        }
      }
    } catch (error) {
      checks.subscriptions_category = {
        success: false,
        message: `확인 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
      }
    }

    // 2. payment_history 테이블 확인
    try {
      const { data, error } = await supabase
        .from('payment_history')
        .select('id')
        .limit(1)

      if (error && error.message.includes('does not exist')) {
        checks.payment_history = {
          success: false,
          message: 'payment_history 테이블이 없습니다. 스키마 업데이트가 필요합니다.',
        }
      } else {
        checks.payment_history = {
          success: true,
          message: 'payment_history 테이블이 존재합니다.',
        }
      }
    } catch (error) {
      checks.payment_history = {
        success: false,
        message: `확인 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
      }
    }

    // 3. user_settings 테이블에 notification_days_before_array 컬럼 확인
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('notification_days_before_array')
        .limit(1)

      if (error && error.message.includes('column') && error.message.includes('does not exist')) {
        checks.user_settings_array = {
          success: false,
          message: 'notification_days_before_array 컬럼이 없습니다. 스키마 업데이트가 필요합니다.',
        }
      } else {
        checks.user_settings_array = {
          success: true,
          message: 'user_settings 테이블에 notification_days_before_array 컬럼이 있습니다.',
        }
      }
    } catch (error) {
      checks.user_settings_array = {
        success: false,
        message: `확인 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
      }
    }

    // 전체 성공 여부 확인
    const allSuccess = Object.values(checks).every((check) => check.success)

    return NextResponse.json(
      {
        success: allSuccess,
        checks,
        message: allSuccess
          ? '모든 스키마 업데이트가 완료되었습니다! ✅'
          : '일부 스키마 업데이트가 필요합니다. SCHEMA_UPDATE_GUIDE.md를 참고하세요.',
      },
      { status: allSuccess ? 200 : 200 } // 200으로 반환하되 success 필드로 상태 표시
    )
  } catch (error) {
    console.error('스키마 확인 오류:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      },
      { status: 500 }
    )
  }
}

