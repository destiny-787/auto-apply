'use client'

import { useState, useRef } from 'react'
import { BiAnalyse, BiCopy, BiCheck, BiBrain, BiTargetLock, BiBriefcase, BiBuildingHouse, BiChat, BiUpload, BiFile, BiX, BiSave } from 'react-icons/bi'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface AnalysisResult {
  jobTypes?: string[]
  keywords?: string[]
  salaryRange?: string
  industries?: string[]
  greetingTemplate?: string
}

interface ResumeAnalysisProps {
  onConfigUpdated?: () => void
}

export default function ResumeAnalysis({ onConfigUpdated }: ResumeAnalysisProps) {
  const [resumeText, setResumeText] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [rawResult, setRawResult] = useState('')
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // File upload state
  const [uploadMode, setUploadMode] = useState<'text' | 'file'>('text')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Apply to AI config state
  const [applyingToConfig, setApplyingToConfig] = useState(false)
  const [appliedToConfig, setAppliedToConfig] = useState(false)

  // Job type filter
  const [jobTypeFilter, setJobTypeFilter] = useState('不限')

  const parseResult = (raw: string): AnalysisResult => {
    try {
      const cleaned = raw
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim()
      const parsed = JSON.parse(cleaned)
      return {
        jobTypes: parsed.jobTypes || [],
        keywords: parsed.keywords || [],
        salaryRange: parsed.salaryRange || '',
        industries: parsed.industries || [],
        greetingTemplate: parsed.greetingTemplate || '',
      }
    } catch {
      return {}
    }
  }

  const handleAnalyze = async () => {
    setAnalyzing(true)
    setResult(null)
    setRawResult('')
    setAppliedToConfig(false)

    try {
      let response: Response

      if (uploadMode === 'file' && uploadedFile) {
        const formData = new FormData()
        formData.append('file', uploadedFile)
        if (jobTypeFilter !== '不限') {
          formData.append('jobType', jobTypeFilter)
        }
        response = await fetch('http://localhost:8888/api/ai/resume-analyze/upload', {
          method: 'POST',
          body: formData,
        })
      } else {
        if (!resumeText.trim()) return
        const body: Record<string, string> = { resume: resumeText.trim() }
        if (jobTypeFilter !== '不限') {
          body.jobType = jobTypeFilter
        }
        response = await fetch('http://localhost:8888/api/ai/resume-analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }

      const data = await response.json()
      if (data.success && data.data) {
        setRawResult(data.data)
        setResult(parseResult(data.data))
      } else {
        alert('分析失败: ' + (data.message || '未知错误'))
      }
    } catch (error) {
      console.error('简历分析失败:', error)
      alert('分析失败，请检查后端服务')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    })
  }

  // File handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('文件大小不能超过10MB')
        return
      }
      setUploadedFile(file)
      setResult(null)
      setRawResult('')
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (!['pdf', 'docx', 'doc'].includes(ext || '')) {
        alert('仅支持 PDF、DOCX、DOC 格式的文件')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('文件大小不能超过10MB')
        return
      }
      setUploadedFile(file)
      setResult(null)
      setRawResult('')
    }
  }

  const handleRemoveFile = () => {
    setUploadedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const canAnalyze = uploadMode === 'file' ? !!uploadedFile : resumeText.trim().length > 0

  // Build AI config intro text from analysis result
  const buildAiIntroText = (r: AnalysisResult): string => {
    const parts: string[] = []
    if (r.jobTypes?.length) {
      parts.push('【推荐岗位】' + r.jobTypes.join('、'))
    }
    if (r.keywords?.length) {
      parts.push('【核心技能】' + r.keywords.join('、'))
    }
    if (r.industries?.length) {
      parts.push('【行业方向】' + r.industries.join('、'))
    }
    if (r.salaryRange) {
      parts.push('【期望薪资】' + r.salaryRange)
    }
    return parts.join('\n')
  }

  const handleApplyToAiConfig = async () => {
    if (!result) return
    setApplyingToConfig(true)
    try {
      // Fetch current AI config to preserve prompt
      const configRes = await fetch('http://localhost:8888/api/ai/config')
      const configData = await configRes.json()
      const currentPrompt = configData?.data?.prompt || ''

      const introText = buildAiIntroText(result)

      const saveRes = await fetch('http://localhost:8888/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ introduce: introText, prompt: currentPrompt }),
      })

      const saveData = await saveRes.json()
      if (saveData.success) {
        setAppliedToConfig(true)
        onConfigUpdated?.()
        alert('AI配置已更新！技能介绍已同步到AI配置中。可切换到「AI配置」标签查看。')
      } else {
        alert('应用失败: ' + (saveData.message || '未知错误'))
      }
    } catch (error) {
      console.error('应用AI配置失败:', error)
      alert('应用失败，请检查后端服务')
    } finally {
      setApplyingToConfig(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
      {/* 简历输入 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BiBrain className="text-purple-500" />
            简历分析
          </CardTitle>
          <CardDescription>
            粘贴简历文本或上传PDF/Word文件，AI将分析并推荐适合的岗位类型和招呼语模板
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Mode toggle */}
            <div className="flex gap-2 p-1 bg-muted/50 rounded-full w-fit">
              <button
                type="button"
                onClick={() => { setUploadMode('text'); setUploadedFile(null); setResult(null); setRawResult('') }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  uploadMode === 'text'
                    ? 'bg-white dark:bg-neutral-800 shadow text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                粘贴文本
              </button>
              <button
                type="button"
                onClick={() => { setUploadMode('file'); setResult(null); setRawResult('') }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${
                  uploadMode === 'file'
                    ? 'bg-white dark:bg-neutral-800 shadow text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <BiUpload className="text-sm" /> 上传文件
              </button>
            </div>

            {uploadMode === 'text' ? (
              <div className="space-y-2">
                <Label htmlFor="resume">简历内容</Label>
                <Textarea
                  id="resume"
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="请粘贴您的简历内容，包括：教育背景、工作经历、技能特长、项目经验等..."
                  className="min-h-[200px] resize-y"
                />
                <p className="text-xs text-muted-foreground">
                  支持任意长度的简历文本，AI将自动提取关键信息进行分析
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>上传简历文件</Label>
                {/* Drop zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                    dragOver
                      ? 'border-purple-400 bg-purple-500/10'
                      : uploadedFile
                      ? 'border-green-400 bg-green-500/5'
                      : 'border-muted-foreground/30 hover:border-purple-400 hover:bg-purple-500/5'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadedFile ? (
                    <div className="space-y-2">
                      <BiFile className="text-3xl text-green-500 mx-auto" />
                      <p className="text-sm font-medium">{uploadedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(uploadedFile.size / 1024).toFixed(1)} KB
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600"
                        onClick={(e) => { e.stopPropagation(); handleRemoveFile() }}
                      >
                        <BiX className="mr-1" /> 移除文件
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <BiUpload className="text-3xl text-muted-foreground mx-auto" />
                      <p className="text-sm text-muted-foreground">
                        拖拽文件到此处，或点击选择文件
                      </p>
                      <p className="text-xs text-muted-foreground/60">
                        支持 PDF、DOCX、DOC 格式，最大 10MB
                      </p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            )}

            {/* Job type filter */}
            <div className="space-y-2">
              <Label>目标岗位类型</Label>
              <select
                value={jobTypeFilter}
                onChange={(e) => setJobTypeFilter(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all appearance-none cursor-pointer"
              >
                <option value="不限">不限</option>
                <option value="全职">全职</option>
                <option value="实习">实习</option>
                <option value="兼职">兼职</option>
              </select>
              <p className="text-xs text-muted-foreground">
                选择您倾向的岗位类型，AI将据此调整分析结果和推荐方向
              </p>
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={analyzing || !canAnalyze}
              className="w-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {analyzing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  AI正在分析中...
                </>
              ) : (
                <>
                  <BiAnalyse className="mr-2" /> 开始分析
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 分析结果 */}
      {rawResult && !result?.jobTypes?.length && (
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">AI返回结果（原始文本）：</p>
            <pre className="text-sm whitespace-pre-wrap bg-muted/50 p-4 rounded-lg">{rawResult}</pre>
          </CardContent>
        </Card>
      )}

      {result && result.jobTypes && result.jobTypes.length > 0 && (
        <div className="space-y-4">
          {/* 推荐岗位 */}
          <Card className="border-purple-500/20 animate-in fade-in slide-in-from-bottom-3 duration-500">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BiTargetLock className="text-purple-500" />
                推荐岗位类型
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {result.jobTypes.map((job, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-full text-sm bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 font-medium"
                  >
                    {job}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 核心技能 */}
          <Card className="border-blue-500/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BiBrain className="text-blue-500" />
                核心技能标签
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {result.keywords?.map((kw, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-full text-sm bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20"
                  >
                    {kw}
                  </span>
                ))}
              </div>
              {(!result.keywords || result.keywords.length === 0) && (
                <p className="text-sm text-muted-foreground">暂未提取到关键词</p>
              )}
            </CardContent>
          </Card>

          {/* 薪资 + 行业 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.salaryRange && (
              <Card className="border-green-500/20 animate-in fade-in slide-in-from-bottom-5 duration-500">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BiBriefcase className="text-green-500" />
                    建议薪资范围
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">{result.salaryRange}</p>
                </CardContent>
              </Card>
            )}

            {result.industries && result.industries.length > 0 && (
              <Card className="border-amber-500/20 animate-in fade-in slide-in-from-bottom-5 duration-500">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BiBuildingHouse className="text-amber-500" />
                    推荐行业方向
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.industries.map((ind, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 rounded-full text-sm bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                      >
                        {ind}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 招呼语模板 */}
          {result.greetingTemplate && (
            <Card className="border-pink-500/20 animate-in fade-in slide-in-from-bottom-6 duration-500">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BiChat className="text-pink-500" />
                  招呼语建议
                </CardTitle>
                <CardDescription>可直接复制使用，向HR发送</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm leading-relaxed pr-12">{result.greetingTemplate}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-8 w-8 p-0"
                    onClick={() => handleCopy(result.greetingTemplate!, 'greeting')}
                  >
                    {copiedField === 'greeting' ? (
                      <BiCheck className="text-green-500" />
                    ) : (
                      <BiCopy className="text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 应用到AI配置 */}
          <Card className={`border-green-500/20 animate-in fade-in slide-in-from-bottom-7 duration-500 ${appliedToConfig ? 'bg-green-500/5' : ''}`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BiSave className={appliedToConfig ? 'text-green-500' : 'text-foreground'} />
                同步到AI配置
              </CardTitle>
              <CardDescription>
                {appliedToConfig
                  ? '已成功同步到AI配置的「技能介绍」字段'
                  : '将分析结果中的技能标签和岗位方向写入AI配置，用于自动生成个性化求职内容'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">预览将要设置的内容：</p>
                  <pre className="text-sm whitespace-pre-wrap font-sans">{buildAiIntroText(result)}</pre>
                </div>
                <Button
                  onClick={handleApplyToAiConfig}
                  disabled={applyingToConfig || appliedToConfig}
                  className={`w-full rounded-full text-white shadow-lg hover:shadow-xl transition-all duration-300 ${
                    appliedToConfig
                      ? 'bg-green-500 cursor-default'
                      : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                  }`}
                >
                  {applyingToConfig ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      应用中...
                    </>
                  ) : appliedToConfig ? (
                    <>
                      <BiCheck className="mr-2" /> 已应用
                    </>
                  ) : (
                    <>
                      <BiSave className="mr-2" /> 应用到AI配置
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
