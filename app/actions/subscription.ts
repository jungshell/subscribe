'use server'

import { supabase } from '@/lib/supabase'
import { GoogleGenerativeAI } from '@google/generative-ai'

const geminiApiKey = process.env.GEMINI_API_KEY

if (!geminiApiKey) {
  throw new Error('Missing GEMINI_API_KEY environment variable')
}

const genAI = new GoogleGenerativeAI(geminiApiKey)

export interface ParsedSubscription {
  service_name: string
  amount: number
  currency: string
  cycle: 'monthly' | 'yearly' | 'weekly' | 'quarterly'
  next_billing_date: string
  billing_email?: string
}

/**
 * Gemini API를 사용하여 결제 텍스트에서 구독 정보 추출
 */
export async function parseSubscriptionText(text: string): Promise<ParsedSubscription | null> {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error('텍스트를 입력해주세요.')
    }

    // Gemini 모델 초기화 - 최신 모델 사용
    // 사용 가능한 모델: gemini-2.5-flash, gemini-2.0-flash, gemini-2.5-pro 등
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `
다음은 정기구독 결제 알림 텍스트입니다. 이 텍스트에서 다음 정보를 추출하여 JSON 형식으로 응답해주세요:

1. service_name: 서비스명 (예: 넷플릭스, 스포티파이, 유튜브 프리미엄 등)
2. amount: 결제 금액 (숫자만, 소수점 포함 가능)
3. currency: 통화 (KRW, USD, EUR 등, 기본값은 KRW)
4. cycle: 결제 주기 ('monthly', 'yearly', 'weekly', 'quarterly' 중 하나)
5. next_billing_date: 다음 결제 예정일 (YYYY-MM-DD 형식)
6. billing_email: 결제 이메일 주소 (있는 경우만)

만약 날짜가 명시되어 있지 않다면, 오늘 날짜를 기준으로 주기에 맞춰 계산해주세요.
예를 들어, 오늘이 2024-01-15이고 주기가 'monthly'라면 다음 결제일은 2024-02-15가 됩니다.

응답은 반드시 유효한 JSON 형식이어야 하며, 다른 설명 없이 JSON만 반환해주세요.

텍스트:
${text}
`

    const result = await model.generateContent(prompt)
    const response = result.response
    const textResponse = response.text()

    // JSON 추출 (마크다운 코드 블록 제거)
    let jsonText = textResponse.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    const parsed = JSON.parse(jsonText) as ParsedSubscription

    // 데이터 검증
    if (!parsed.service_name || !parsed.amount || !parsed.cycle || !parsed.next_billing_date) {
      throw new Error('필수 필드가 누락되었습니다.')
    }

    // 날짜 형식 검증
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(parsed.next_billing_date)) {
      throw new Error('날짜 형식이 올바르지 않습니다.')
    }

    // 통화 기본값 설정
    if (!parsed.currency) {
      parsed.currency = 'KRW'
    }

    return parsed
  } catch (error) {
    console.error('Gemini API 오류:', error)
    
    // 더 자세한 에러 메시지 제공
    let errorMessage = '텍스트 분석 중 오류가 발생했습니다.'
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'Gemini API 키가 유효하지 않습니다. 환경 변수를 확인해주세요.'
      } else if (error.message.includes('model')) {
        errorMessage = 'Gemini 모델을 사용할 수 없습니다. API 키와 모델 이름을 확인해주세요.'
      } else if (error.message.includes('quota') || error.message.includes('limit')) {
        errorMessage = 'Gemini API 할당량을 초과했습니다. 잠시 후 다시 시도해주세요.'
      } else {
        errorMessage = `오류: ${error.message}`
      }
    }
    
    throw new Error(errorMessage)
  }
}

/**
 * 구독 정보를 Supabase에 저장
 */
export async function saveSubscription(
  userId: string,
  subscription: ParsedSubscription
) {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        service_name: subscription.service_name,
        amount: subscription.amount,
        currency: subscription.currency,
        next_billing_date: subscription.next_billing_date,
        cycle: subscription.cycle,
        billing_email: subscription.billing_email || null,
        status: 'active',
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase 저장 오류:', error)
      throw new Error('구독 정보 저장에 실패했습니다.')
    }

    return data
  } catch (error) {
    console.error('저장 오류:', error)
    throw error
  }
}

/**
 * 사용자의 모든 구독 정보 조회
 */
export async function getSubscriptions(userId: string) {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('next_billing_date', { ascending: true })

    if (error) {
      console.error('Supabase 조회 오류:', error)
      throw new Error('구독 정보를 불러오는데 실패했습니다.')
    }

    return data || []
  } catch (error) {
    console.error('조회 오류:', error)
    throw error
  }
}

/**
 * 구독 정보 삭제 (해지)
 */
export async function cancelSubscription(subscriptionId: string) {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', subscriptionId)
      .select()
      .single()

    if (error) {
      console.error('Supabase 업데이트 오류:', error)
      throw new Error('구독 해지에 실패했습니다.')
    }

    return data
  } catch (error) {
    console.error('해지 오류:', error)
    throw error
  }
}

