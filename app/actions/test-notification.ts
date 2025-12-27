'use server'

import { checkAndSendNotifications } from './notifications'

/**
 * 수동 테스트용 알림 전송 함수
 * 테스트를 위해 더 긴 기간(30일)을 체크하여 모든 활성 구독에 대해 테스트
 */
export async function testNotification(userId: string) {
  try {
    const { supabase } = await import('@/lib/supabase')
    
    // 디버깅: 전체 구독 수 확인
    const { data: allSubscriptions, error: allError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
    
    // 디버깅: 사용자 설정 확인
    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    // 테스트를 위해 30일 이내의 모든 구독을 체크
    const result = await checkAndSendNotifications(userId, 30)

    // 결과 메시지 개선 (디버깅 정보 포함)
    let message = ''
    if (!result.success) {
      message = result.error || '테스트 실패'
      if (settingsError) {
        message += ` (설정 조회 오류: ${settingsError.message})`
      }
    } else if (result.sent === 0 && result.skipped === 0) {
      const totalSubs = allSubscriptions?.length || 0
      const today = new Date().toISOString().split('T')[0]
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)
      const futureDateStr = futureDate.toISOString().split('T')[0]
      
      message = `알림이 필요한 구독이 없습니다.`
      message += `\n- 전체 활성 구독: ${totalSubs}개`
      message += `\n- 30일 이내 구독: ${result.total || 0}개`
      message += `\n- 알림 설정 활성화: ${userSettings?.notification_enabled ? '예' : '아니오'}`
      message += `\n- Webhook URL 설정: ${userSettings?.slack_webhook_url ? '예' : '아니오'}`
      
      if (totalSubs > 0 && allSubscriptions) {
        const nextDates = allSubscriptions.map(s => s.next_billing_date).join(', ')
        message += `\n- 다음 결제일들: ${nextDates}`
        message += `\n- 체크 기간: ${today} ~ ${futureDateStr}`
      }
    } else {
      message = `테스트 완료: ${result.sent}개 알림 전송, ${result.skipped || 0}개 건너뜀`
      if (result.total !== undefined) {
        message += ` (총 ${result.total}개 구독 확인)`
      }
    }

    return {
      success: result.success,
      message,
      details: {
        ...result,
        debug: {
          totalSubscriptions: allSubscriptions?.length || 0,
          userSettings: userSettings ? {
            notification_enabled: userSettings.notification_enabled,
            has_webhook: !!userSettings.slack_webhook_url,
            notification_days_before: userSettings.notification_days_before,
          } : null,
        },
      },
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '테스트 중 오류 발생',
      details: null,
    }
  }
}


