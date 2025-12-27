'use client'

import { useState, useEffect } from 'react'
import { Slack, CheckCircle, XCircle, Loader2, Bell } from 'lucide-react'
import { saveSlackWebhook, getSlackWebhook } from '@/app/actions/notifications'
import { testNotification } from '@/app/actions/test-notification'

interface SlackSettingsProps {
  userId: string
}

export default function SlackSettings({ userId }: SlackSettingsProps) {
  const [webhookUrl, setWebhookUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadWebhook()
  }, [userId])

  const loadWebhook = async () => {
    setIsLoading(true)
    try {
      const { webhookUrl: url } = await getSlackWebhook(userId)
      if (url) {
        setWebhookUrl(url)
      }
    } catch (error) {
      console.error('Webhook 로드 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!webhookUrl.trim()) {
      setMessage({ type: 'error', text: 'Slack Webhook URL을 입력해주세요.' })
      return
    }

    // URL 형식 검증
    if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
      setMessage({
        type: 'error',
        text: '올바른 Slack Webhook URL 형식이 아닙니다. (https://hooks.slack.com/... 로 시작해야 합니다)',
      })
      return
    }

    setIsSaving(true)
    setMessage(null)

    try {
      const result = await saveSlackWebhook(userId, webhookUrl.trim())
      if (result.success) {
        setMessage({ type: 'success', text: 'Slack Webhook URL이 저장되었습니다!' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: result.error || '저장에 실패했습니다.' })
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleTest = async () => {
    if (!webhookUrl.trim()) {
      setMessage({ type: 'error', text: '먼저 Slack Webhook URL을 저장해주세요.' })
      return
    }

    setIsTesting(true)
    setMessage(null)

    try {
      const result = await testNotification(userId)
      if (result.success) {
        setMessage({ type: 'success', text: result.message || '테스트 알림이 전송되었습니다!' })
        setTimeout(() => setMessage(null), 5000)
      } else {
        setMessage({ type: 'error', text: result.message || '테스트 실패' })
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '테스트 중 오류가 발생했습니다.',
      })
    } finally {
      setIsTesting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-[#1a73e8]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="rounded-full bg-[#4A154B] p-2">
          <Slack className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-[#202124]">Slack 알림 설정</h3>
          <p className="text-sm text-[#5f6368]">
            다음 결제일 3일 전에 Slack으로 알림을 받습니다
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="slack-webhook" className="block text-sm font-medium text-[#5f6368] mb-2">
            Slack Webhook URL
          </label>
          <input
            id="slack-webhook"
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
            className="w-full rounded-xl border border-[#dadce0] px-4 py-3 text-sm text-[#202124] placeholder:text-[#80868b] focus:border-[#1a73e8] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20 transition-all duration-200"
          />
          <p className="mt-2 text-xs text-[#80868b]">
            Slack 워크스페이스에서 Incoming Webhook을 생성하여 URL을 입력하세요.
          </p>
        </div>

        {message && (
          <div
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
              message.type === 'success'
                ? 'bg-[#e6f4ea] border border-[#81c995] text-[#137333]'
                : 'bg-[#fce8e6] border border-[#f28b82] text-[#c5221f]'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 flex-shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving || isTesting}
            className="flex-1 rounded-full bg-[#1a73e8] px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-[#1557b0] hover:shadow-md active:bg-[#174ea6] disabled:cursor-not-allowed disabled:bg-[#dadce0] disabled:text-[#80868b]"
          >
            {isSaving ? '저장 중...' : '저장하기'}
          </button>
          <button
            onClick={handleTest}
            disabled={isSaving || isTesting || !webhookUrl.trim()}
            className="flex items-center gap-2 rounded-full border border-[#dadce0] px-6 py-3 text-sm font-medium text-[#5f6368] transition-all duration-200 hover:bg-[#f8f9fa] hover:border-[#c4c7c5] active:bg-[#f1f3f4] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isTesting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                테스트 중...
              </>
            ) : (
              <>
                <Bell className="h-4 w-4" />
                알림 테스트
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-[#f8f9fa] p-4 space-y-2">
        <h4 className="text-sm font-medium text-[#202124]">Slack Webhook 생성 방법</h4>
        <ol className="text-xs text-[#5f6368] space-y-1 list-decimal list-inside">
          <li>
            <a
              href="https://api.slack.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#1a73e8] hover:underline"
            >
              Slack API 웹사이트
            </a>
            에서 새 앱 생성
          </li>
          <li>앱 설정에서 "Incoming Webhooks" 활성화</li>
          <li>워크스페이스에 추가하고 Webhook URL 복사</li>
          <li>위 입력창에 URL 붙여넣기</li>
        </ol>
      </div>
    </div>
  )
}

