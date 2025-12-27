'use server'

import { checkAndSendNotifications } from './notifications'

/**
 * 수동 테스트용 알림 전송 함수
 * 테스트를 위해 더 긴 기간(30일)을 체크하여 모든 활성 구독에 대해 테스트
 */
export async function testNotification(userId: string) {
  try {
    // 테스트를 위해 30일 이내의 모든 구독을 체크
    const result = await checkAndSendNotifications(userId, 30)

    // 결과 메시지 개선
    let message = ''
    if (!result.success) {
      message = result.error || '테스트 실패'
    } else if (result.sent === 0 && result.skipped === 0) {
      message = '알림이 필요한 구독이 없습니다. (다음 결제일이 30일 이내인 구독이 없거나, 이미 알림을 보낸 구독입니다)'
    } else {
      message = `테스트 완료: ${result.sent}개 알림 전송, ${result.skipped || 0}개 건너뜀`
      if (result.total !== undefined) {
        message += ` (총 ${result.total}개 구독 확인)`
      }
    }

    return {
      success: result.success,
      message,
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


