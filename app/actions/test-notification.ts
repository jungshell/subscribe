'use server'

import { checkAndSendNotifications } from './notifications'

/**
 * 수동 테스트용 알림 전송 함수
 */
export async function testNotification(userId: string) {
  try {
    const result = await checkAndSendNotifications(userId, 3)

    return {
      success: result.success,
      message: result.success
        ? `테스트 완료: ${result.sent}개 알림 전송, ${result.skipped || 0}개 건너뜀`
        : result.error || '테스트 실패',
      details: result,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '테스트 중 오류 발생',
      details: null,
    }
  }
}


