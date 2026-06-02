'use client'

import { useState, useEffect } from 'react'
import {
  BiSave, BiBrain, BiInfoCircle, BiChevronDown, BiChevronUp,
  BiSync, BiCheck, BiBuilding, BiBriefcase, BiGlobe
} from 'react-icons/bi'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface PlatformConfigs {
  boss: Record<string, string | number>
  liepin: Record<string, string | number>
  job51: Record<string, string | number>
  zhilian: Record<string, string | number>
}

interface AiConfigType {
  introduce: string
  prompt: string
}

const platformLabels: Record<string, string> = {
  boss: 'Boss直聘',
  liepin: '猎聘',
  job51: '51job',
  zhilian: '智联招聘',
}

const platformIcons: Record<string, React.ReactNode> = {
  boss: null,
  liepin: null,
  job51: null,
  zhilian: null,
}

const platformFields: Record<string, { key: string; label: string; type: 'text' | 'number' | 'select'; options?: string[] }[]> = {
  boss: [
    { key: 'keywords', label: '搜索关键词', type: 'text' },
    { key: 'cityCode', label: '城市', type: 'text' },
    { key: 'industry', label: '行业', type: 'text' },
    { key: 'jobType', label: '职位类型', type: 'select', options: ['', '全职', '实习', '兼职'] },
    { key: 'experience', label: '经验要求', type: 'text' },
    { key: 'degree', label: '学历要求', type: 'text' },
    { key: 'salary', label: '薪资范围', type: 'text' },
    { key: 'scale', label: '公司规模', type: 'text' },
    { key: 'stage', label: '融资阶段', type: 'text' },
    { key: 'sayHi', label: '打招呼语', type: 'text' },
    { key: 'expectedSalaryMin', label: '最低期望薪资(K)', type: 'number' },
    { key: 'expectedSalaryMax', label: '最高期望薪资(K)', type: 'number' },
    { key: 'enableAi', label: 'AI招呼语(0关1开)', type: 'number' },
    { key: 'sendImgResume', label: '图片简历(0关1开)', type: 'number' },
    { key: 'filterDeadHr', label: '过滤离线HR(0关1开)', type: 'number' },
    { key: 'waitTime', label: '等待时间(秒)', type: 'number' },
    { key: 'debugger', label: '调试模式(0关1开)', type: 'number' },
  ],
  liepin: [
    { key: 'keywords', label: '搜索关键词', type: 'text' },
    { key: 'city', label: '城市', type: 'text' },
    { key: 'salaryCode', label: '薪资范围', type: 'text' },
  ],
  job51: [
    { key: 'keywords', label: '搜索关键词', type: 'text' },
    { key: 'jobArea', label: '城市/区域', type: 'text' },
    { key: 'salary', label: '薪资范围', type: 'text' },
  ],
  zhilian: [
    { key: 'keywords', label: '搜索关键词', type: 'text' },
    { key: 'cityCode', label: '城市', type: 'text' },
    { key: 'salary', label: '薪资范围', type: 'text' },
  ],
}

export default function UnifiedConfig() {
  const [aiConfig, setAiConfig] = useState<AiConfigType>({ introduce: '', prompt: '' })
  const [platformConfigs, setPlatformConfigs] = useState<PlatformConfigs>({
    boss: {}, liepin: {}, job51: {}, zhilian: {},
  })
  const [enableAi, setEnableAi] = useState<number>(0)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    ai: true, boss: false, liepin: false, job51: false, zhilian: false,
  })
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [synced, setSynced] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    loadAllConfigs()
  }, [])

  const loadAllConfigs = async () => {
    try {
      // Load AI config
      const aiRes = await fetch('http://localhost:8888/api/ai/config')
      const aiData = await aiRes.json()
      if (aiData.success && aiData.data) {
        setAiConfig({ introduce: aiData.data.introduce || '', prompt: aiData.data.prompt || '' })
      }

      // Load enableAi from boss
      const bossRes = await fetch('http://localhost:8888/api/boss/config')
      const bossData = await bossRes.json()
      if (bossData?.config) {
        const raw = bossData.config.enableAi
        const val = String(raw ?? '').trim().toLowerCase()
        setEnableAi(val === '1' || val === 'true' || val === 'on' ? 1 : Number(raw) === 1 ? 1 : 0)
        // Map Boss config fields
        const bc = bossData.config
        setPlatformConfigs(prev => ({
          ...prev,
          boss: {
            keywords: bc.keywords || '',
            cityCode: bc.cityCode || '',
            industry: bc.industry || '',
            jobType: bc.jobType || '',
            experience: bc.experience || '',
            degree: bc.degree || '',
            salary: bc.salary || '',
            scale: bc.scale || '',
            stage: bc.stage || '',
            sayHi: bc.sayHi || '',
            expectedSalaryMin: bc.expectedSalaryMin ?? '',
            expectedSalaryMax: bc.expectedSalaryMax ?? '',
            enableAi: bc.enableAi ?? 0,
            sendImgResume: bc.sendImgResume ?? 0,
            filterDeadHr: bc.filterDeadHr ?? 0,
            waitTime: bc.waitTime ?? '',
            debugger: bc.debugger ?? '',
          },
        }))
      }

      // Load Liepin config
      try {
        const lpRes = await fetch('http://localhost:8888/api/liepin/config')
        const lpData = await lpRes.json()
        if (lpData?.config) {
          setPlatformConfigs(prev => ({
            ...prev,
            liepin: {
              keywords: lpData.config.keywords || '',
              city: lpData.config.city || '',
              salaryCode: lpData.config.salaryCode || '',
            },
          }))
        }
      } catch (e) { console.warn('加载猎聘配置失败', e) }

      // Load Job51 config
      try {
        const j51Res = await fetch('http://localhost:8888/api/51job/config')
        const j51Data = await j51Res.json()
        if (j51Data?.config) {
          setPlatformConfigs(prev => ({
            ...prev,
            job51: {
              keywords: j51Data.config.keywords || '',
              jobArea: j51Data.config.jobArea || '',
              salary: j51Data.config.salary || '',
            },
          }))
        }
      } catch (e) { console.warn('加载51job配置失败', e) }

      // Load Zhilian config
      try {
        const zlRes = await fetch('http://localhost:8888/api/zhilian/config')
        const zlData = await zlRes.json()
        if (zlData?.config) {
          setPlatformConfigs(prev => ({
            ...prev,
            zhilian: {
              keywords: zlData.config.keywords || '',
              cityCode: zlData.config.cityCode || '',
              salary: zlData.config.salary || '',
            },
          }))
        }
      } catch (e) { console.warn('加载智联配置失败', e) }

    } catch (error) {
      console.error('加载配置失败:', error)
    }
  }

  const toggleExpand = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const updatePlatformField = (platform: keyof PlatformConfigs, field: string, value: string | number) => {
    setPlatformConfigs(prev => ({
      ...prev,
      [platform]: { ...prev[platform], [field]: value },
    }))
  }

  const handleSaveAll = async () => {
    setLoading(true)
    setSaveMsg('')
    const errors: string[] = []

    try {
      // 1. Save AI config
      const aiRes = await fetch('http://localhost:8888/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiConfig),
      })
      const aiData = await aiRes.json()
      if (!aiData.success) errors.push('AI配置: ' + aiData.message)

      // 2. Save enableAi
      await fetch('http://localhost:8888/api/boss/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enableAi }),
      })

      // 3. Save Boss config
      try {
        await fetch('http://localhost:8888/api/boss/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(platformConfigs.boss),
        })
      } catch (e) { errors.push('Boss配置保存失败') }

      // 4. Save Liepin config
      try {
        await fetch('http://localhost:8888/api/liepin/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(platformConfigs.liepin),
        })
      } catch (e) { errors.push('猎聘配置保存失败') }

      // 5. Save Job51 config
      try {
        await fetch('http://localhost:8888/api/51job/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(platformConfigs.job51),
        })
      } catch (e) { errors.push('51job配置保存失败') }

      // 6. Save Zhilian config
      try {
        await fetch('http://localhost:8888/api/zhilian/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(platformConfigs.zhilian),
        })
      } catch (e) { errors.push('智联配置保存失败') }

      if (errors.length === 0) {
        setSaveMsg('✅ 所有配置已保存')
        setTimeout(() => setSaveMsg(''), 3000)
      } else {
        setSaveMsg('⚠️ 部分保存失败: ' + errors.join('; '))
      }
    } catch (error) {
      console.error('保存失败:', error)
      setSaveMsg('❌ 保存失败，请检查后端服务')
    } finally {
      setLoading(false)
    }
  }

  const handleSyncToPlatforms = async () => {
    if (!aiConfig.introduce.trim()) {
      alert('请先在"技能介绍"中填写您的技能信息')
      return
    }
    setSyncing(true)
    setSynced(false)
    try {
      const res = await fetch('http://localhost:8888/api/ai/sync-to-platforms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ introduce: aiConfig.introduce }),
      })
      const data = await res.json()
      if (data.success) {
        setSynced(true)
        // Reload all configs to show updated values
        await loadAllConfigs()
        // Expand platform sections
        setExpanded({ ai: true, boss: true, liepin: true, job51: true, zhilian: true })
        setTimeout(() => setSynced(false), 5000)
        alert('同步成功！AI已将技能信息同步到各平台配置。')
      } else {
        alert('同步失败: ' + (data.message || '未知错误'))
      }
    } catch (error) {
      console.error('同步失败:', error)
      alert('同步失败，请检查后端服务')
    } finally {
      setSyncing(false)
    }
  }

  const renderFields = (platform: keyof PlatformConfigs) => {
    const fields = platformFields[platform] || []
    const config = platformConfigs[platform] || {}

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fields.map(f => {
          const val = config[f.key] ?? ''
          return (
            <div key={f.key} className="space-y-1">
              <Label className="text-xs text-muted-foreground">{f.label}</Label>
              {f.type === 'select' && f.options ? (
                <select
                  value={String(val)}
                  onChange={e => updatePlatformField(platform, f.key, e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  {f.options.map(o => (
                    <option key={o} value={o}>{o || '--'}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type}
                  value={val}
                  onChange={e => updatePlatformField(platform, f.key,
                    f.type === 'number' ? Number(e.target.value) : e.target.value
                  )}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-500">
      {/* AI Config section */}
      <Card className="border-primary/20">
        <CardHeader
          className="pb-3 cursor-pointer select-none"
          onClick={() => toggleExpand('ai')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BiBrain className="text-purple-500" />
              <CardTitle className="text-base">AI配置</CardTitle>
            </div>
            <div className="flex items-center gap-3">
              {/* AI toggle */}
              <button
                type="button"
                aria-label="AI启用开关"
                onClick={e => { e.stopPropagation(); setEnableAi(enableAi ? 0 : 1) }}
                className={`relative inline-flex h-6 w-11 rounded-full transition-colors border border-white/20 ${enableAi ? 'bg-emerald-500/80' : 'bg-white/10'}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${enableAi ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              {expanded.ai ? <BiChevronUp /> : <BiChevronDown />}
            </div>
          </div>
        </CardHeader>
        {expanded.ai && (
          <CardContent className="animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="introduce">技能介绍</Label>
                <Textarea
                  id="introduce"
                  value={aiConfig.introduce}
                  onChange={e => setAiConfig({ ...aiConfig, introduce: e.target.value })}
                  placeholder="请输入您的技能介绍，例如：我熟练使用Java、Python等语言进行开发..."
                  className="min-h-[120px] resize-y"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prompt">AI提示词</Label>
                <Textarea
                  id="prompt"
                  value={aiConfig.prompt}
                  onChange={e => setAiConfig({ ...aiConfig, prompt: e.target.value })}
                  placeholder="请输入AI提示词模板..."
                  className="min-h-[100px] resize-y"
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Platform config sections */}
      {(['boss', 'liepin', 'job51', 'zhilian'] as const).map(platform => (
        <Card key={platform} className="border-border/50">
          <CardHeader
            className="pb-3 cursor-pointer select-none"
            onClick={() => toggleExpand(platform)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{platformLabels[platform]}</span>
                <span className="text-xs text-muted-foreground">
                  ({Object.values(platformConfigs[platform] || {}).filter(v => v !== '' && v !== 0 && v !== '0').length} 项已配置)
                </span>
              </div>
              {expanded[platform] ? <BiChevronUp /> : <BiChevronDown />}
            </div>
          </CardHeader>
          {expanded[platform] && (
            <CardContent className="animate-in fade-in slide-in-from-top-2 duration-200">
              {renderFields(platform)}
            </CardContent>
          )}
        </Card>
      ))}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handleSaveAll}
          disabled={loading}
          className="flex-1 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg"
        >
          <BiSave className="mr-1.5" /> {loading ? '保存中...' : '保存全部配置'}
        </Button>
        <Button
          onClick={handleSyncToPlatforms}
          disabled={syncing}
          className={`flex-1 rounded-full text-white shadow-lg ${
            synced
              ? 'bg-green-500'
              : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
          }`}
        >
          {syncing ? (
            <><svg className="animate-spin -ml-1 mr-1.5 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> AI分析中...</>
          ) : synced ? (
            <><BiCheck className="mr-1.5" /> 已同步</>
          ) : (
            <><BiSync className="mr-1.5" /> AI同步到各平台</>
          )}
        </Button>
      </div>
      {saveMsg && (
        <p className={`text-sm text-center ${saveMsg.startsWith('✅') ? 'text-green-500' : saveMsg.startsWith('⚠️') ? 'text-amber-500' : 'text-red-500'}`}>
          {saveMsg}
        </p>
      )}
    </div>
  )
}
