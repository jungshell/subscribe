import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * 연결 테스트용 API 엔드포인트
 */
export async function GET() {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
  }

  // 1. 환경 변수 확인
  results.env_variables = {
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? '✅ 설정됨'
      : '❌ 없음',
    supabase_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? '✅ 설정됨'
      : '❌ 없음',
    gemini_key: process.env.GEMINI_API_KEY ? '✅ 설정됨' : '❌ 없음',
  }

  // 2. Supabase 연결 테스트
  try {
    const { data, error } = await supabase.from('subscriptions').select('count').limit(1)

    if (error) {
      results.supabase_connection = {
        status: '❌ 연결 실패',
        error: error.message,
        code: error.code,
      }
    } else {
      results.supabase_connection = {
        status: '✅ 연결 성공',
        message: 'Supabase에 정상적으로 연결되었습니다.',
      }
    }
  } catch (error) {
    results.supabase_connection = {
      status: '❌ 연결 오류',
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    }
  }

  // 3. 테이블 존재 확인
  const tablesToCheck = ['subscriptions', 'user_settings', 'notification_history']
  results.tables = {}

  for (const table of tablesToCheck) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1)

      if (error) {
        if (error.code === '42P01') {
          // 테이블이 존재하지 않음
          results.tables[table] = '❌ 테이블 없음 (스키마 실행 필요)'
        } else {
          results.tables[table] = `⚠️ 오류: ${error.message}`
        }
      } else {
        results.tables[table] = '✅ 존재함'
      }
    } catch (error) {
      results.tables[table] = `❌ 확인 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    }
  }

  // 4. Gemini API 테스트 (선택사항)
  if (process.env.GEMINI_API_KEY) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' })

      const result = await model.generateContent('테스트')
      results.gemini_api = {
        status: '✅ 연결 성공',
        message: 'Gemini API에 정상적으로 연결되었습니다.',
      }
    } catch (error) {
      results.gemini_api = {
        status: '❌ 연결 실패',
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      }
    }
  } else {
    results.gemini_api = {
      status: '⚠️ 키 없음',
      message: 'GEMINI_API_KEY가 설정되지 않았습니다.',
    }
  }

  // 전체 상태 요약
  const hasErrors =
    results.env_variables.supabase_url === '❌ 없음' ||
    results.env_variables.supabase_key === '❌ 없음' ||
    results.supabase_connection.status.includes('❌') ||
    Object.values(results.tables).some((v) => typeof v === 'string' && v.includes('❌'))

  results.summary = {
    status: hasErrors ? '❌ 설정 불완전' : '✅ 모든 설정 완료',
    message: hasErrors
      ? '일부 설정이 누락되었거나 오류가 있습니다. 위의 결과를 확인하세요.'
      : '모든 설정이 정상적으로 완료되었습니다!',
  }

  return NextResponse.json(results, { status: hasErrors ? 200 : 200 })
}

