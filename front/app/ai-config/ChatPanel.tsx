'use client'

import { useState, useRef, useEffect } from 'react'
import { BiSend, BiTrash, BiUser, BiBot, BiBrain, BiCog, BiCheck, BiX } from 'react-icons/bi'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

interface SettingsAction {
  platform: string
  field: string
  value: string
  success: boolean
  reason?: string
}

interface SettingsActionResult {
  actions: SettingsAction[]
  summary: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  settingsResult?: SettingsActionResult
}

function platformLabel(platform: string): string {
  const labels: Record<string, string> = {
    boss: 'Boss直聘',
    liepin: '猎聘',
    job51: '51job',
    zhilian: '智联招聘',
    ai: 'AI配置',
  }
  return labels[platform] || platform
}

function fieldLabel(field: string): string {
  const labels: Record<string, string> = {
    keywords: '关键词',
    cityCode: '城市',
    city: '城市',
    industry: '行业',
    jobType: '职位类型',
    experience: '经验要求',
    degree: '学历要求',
    salary: '薪资范围',
    salaryCode: '薪资',
    scale: '公司规模',
    stage: '融资阶段',
    sayHi: '打招呼语',
    expectedSalaryMin: '最低期望薪资',
    expectedSalaryMax: '最高期望薪资',
    enableAi: 'AI招呼语',
    sendImgResume: '图片简历',
    filterDeadHr: '过滤离线HR',
    waitTime: '等待时间',
    debugger: '调试模式',
    jobArea: '城市区域',
    introduce: '技能介绍',
    prompt: 'AI提示词',
  }
  return labels[field] || field
}

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [settingsMode, setSettingsMode] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return

    const userMsg: Message = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setSending(true)

    try {
      // Build history from existing messages (keep last 20 turns for context)
      const history = messages.slice(-20).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const endpoint = settingsMode
        ? 'http://localhost:8888/api/ai/settings-agent'
        : 'http://localhost:8888/api/ai/chat'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: history,
        }),
      })

      const data = await response.json()
      if (data.success && data.data) {
        if (settingsMode) {
          // Parse settings agent response
          try {
            const result: SettingsActionResult = typeof data.data === 'string'
              ? JSON.parse(data.data)
              : data.data
            setMessages((prev) => [...prev, {
              role: 'assistant',
              content: result.summary || '设置已处理',
              settingsResult: result,
            }])
          } catch {
            setMessages((prev) => [...prev, { role: 'assistant', content: data.data }])
          }
        } else {
          setMessages((prev) => [...prev, { role: 'assistant', content: data.data }])
        }
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: '❌ ' + (data.message || '请求失败') }])
      }
    } catch (error) {
      console.error('请求失败:', error)
      setMessages((prev) => [...prev, { role: 'assistant', content: '❌ 网络错误，请检查后端服务连接' }])
    } finally {
      setSending(false)
    }
  }

  const handleClear = () => {
    if (messages.length === 0) return
    if (confirm('确定要清空所有对话记录吗？')) {
      setMessages([])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-500">
      <Card className="flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BiBot className="text-violet-500" />
                AI 对话
              </CardTitle>
              <CardDescription>
                {settingsMode ? '设置模式：描述您想修改的应用设置' : '与AI助手进行多轮对话，支持上下文理解'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Settings mode toggle */}
              <button
                type="button"
                onClick={() => setSettingsMode(!settingsMode)}
                className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  settingsMode
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 shadow-sm'
                    : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                }`}
              >
                <BiCog className={`text-sm ${settingsMode ? 'animate-spin-slow' : ''}`} />
                {settingsMode ? '设置模式 ON' : '设置模式'}
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-muted-foreground hover:text-red-500"
                disabled={messages.length === 0}
              >
                <BiTrash className="mr-1" /> 清空
              </Button>
            </div>
          </div>
          {settingsMode && (
            <div className="mt-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10 text-xs text-muted-foreground">
              <strong>支持的操作：</strong>修改Boss直聘/猎聘/51job/智联的关键词、城市、薪资、学历等设置；修改AI配置的技能介绍和提示词。
              例如：「把Boss直聘的关键词改成AI工程师、Python开发」「设置期望薪资为15K到25K」
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 flex flex-col min-h-0">
          {/* Messages area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2"
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <BiBrain className="text-5xl text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground text-sm">
                  {settingsMode ? '设置模式已开启' : '开始与AI对话吧'}
                </p>
                <p className="text-muted-foreground/60 text-xs mt-1">
                  {settingsMode
                    ? '描述您想修改的应用设置，AI将自动识别并应用'
                    : '输入您想咨询的问题，按 Enter 发送'}
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                    msg.settingsResult ? 'bg-amber-500/20' : 'bg-violet-500/20'
                  }`}>
                    {msg.settingsResult ? (
                      <BiCog className="text-amber-500 text-sm" />
                    ) : (
                      <BiBot className="text-violet-500 text-sm" />
                    )}
                  </div>
                )}

                {msg.settingsResult ? (
                  /* Settings result card */
                  <div className="max-w-[85%] bg-muted/50 border border-amber-500/20 rounded-2xl rounded-bl-md overflow-hidden">
                    <div className="px-4 py-3 border-b border-border/50 bg-amber-500/5">
                      <p className="text-sm font-medium">{msg.settingsResult.summary}</p>
                    </div>
                    <div className="px-4 py-2 space-y-1">
                      {msg.settingsResult.actions?.map((action, j) => (
                        <div key={j} className="flex items-center gap-2 text-xs py-1.5 border-b border-border/30 last:border-0">
                          {action.success ? (
                            <BiCheck className="text-green-500 flex-shrink-0" />
                          ) : (
                            <BiX className="text-red-500 flex-shrink-0" />
                          )}
                          <span className="text-muted-foreground font-medium min-w-[60px]">
                            {platformLabel(action.platform)}
                          </span>
                          <span className="text-muted-foreground">·</span>
                          <span className="font-mono text-foreground/80">{fieldLabel(action.field)}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-mono text-foreground truncate max-w-[180px]" title={action.value}>
                            {action.value}
                          </span>
                          {action.reason && (
                            <span className="text-muted-foreground/50 italic hidden sm:inline">({action.reason})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-br-md'
                        : 'bg-muted/50 border border-border rounded-bl-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                )}

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <BiUser className="text-blue-500 text-sm" />
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div className="flex gap-3 justify-start">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                  settingsMode ? 'bg-amber-500/20' : 'bg-violet-500/20'
                }`}>
                  {settingsMode ? (
                    <BiCog className="text-amber-500 text-sm" />
                  ) : (
                    <BiBot className="text-violet-500 text-sm" />
                  )}
                </div>
                <div className="bg-muted/50 border border-border rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="flex gap-2 flex-shrink-0">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                settingsMode
                  ? '描述您想修改的设置，例如：把Boss直聘的期望薪资改成15K到25K...'
                  : '输入消息，按 Enter 发送，Shift+Enter 换行...'
              }
              className="min-h-[44px] max-h-[120px] resize-none"
              rows={1}
              disabled={sending}
            />
            <Button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className={`rounded-full text-white shadow-lg hover:shadow-xl transition-all duration-300 self-end ${
                settingsMode
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                  : 'bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600'
              }`}
              size="icon"
            >
              <BiSend className="text-lg" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
