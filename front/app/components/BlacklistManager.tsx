'use client'

import { useState, useEffect, useCallback } from 'react'
import { BiTrash, BiPlus, BiBlock, BiX } from 'react-icons/bi'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface BlacklistItem {
  id: number
  keyword: string
  createTime: string
}

interface BlacklistData {
  company?: BlacklistItem[]
  recruiter?: BlacklistItem[]
  job?: BlacklistItem[]
  keyword?: BlacklistItem[]
}

interface BlacklistManagerProps {
  platform: 'boss' | 'liepin' | 'job51' | 'zhilian'
  title?: string
}

const typeLabels: Record<string, string> = {
  company: '公司',
  recruiter: '招聘者/HR',
  job: '职位',
  keyword: '关键词',
}

export default function BlacklistManager({ platform, title }: BlacklistManagerProps) {
  const [blacklist, setBlacklist] = useState<BlacklistData>({})
  const [loading, setLoading] = useState(false)
  const [newType, setNewType] = useState('keyword')
  const [newValue, setNewValue] = useState('')
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const fetchBlacklist = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`http://localhost:8888/api/blacklist?platform=${platform}`)
      const result = await response.json()
      if (result.success && result.data) {
        setBlacklist(result.data)
      }
    } catch (error) {
      console.error('加载黑名单失败:', error)
    } finally {
      setLoading(false)
    }
  }, [platform])

  useEffect(() => {
    fetchBlacklist()
  }, [fetchBlacklist])

  const handleAdd = async () => {
    if (!newValue.trim()) return
    setAdding(true)
    try {
      const response = await fetch('http://localhost:8888/api/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          type: newType,
          keyword: newValue.trim(),
        }),
      })
      const result = await response.json()
      if (result.success) {
        setNewValue('')
        fetchBlacklist()
      } else {
        alert(result.message || '添加失败')
      }
    } catch (error) {
      console.error('添加黑名单失败:', error)
      alert('添加失败，请检查后端服务')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除该黑名单项吗？')) return
    setDeletingId(id)
    try {
      const response = await fetch(`http://localhost:8888/api/blacklist/${id}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (result.success) {
        fetchBlacklist()
      } else {
        alert(result.message || '删除失败')
      }
    } catch (error) {
      console.error('删除黑名单失败:', error)
      alert('删除失败，请检查后端服务')
    } finally {
      setDeletingId(null)
    }
  }

  const hasItems = Object.values(blacklist).some(arr => arr && arr.length > 0)

  return (
    <Card className="border-red-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BiBlock className="text-red-500" />
          {title || '屏蔽词管理'}
        </CardTitle>
        <CardDescription>
          添加屏蔽词后，匹配的职位/公司/HR将在投递时自动跳过
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Add form */}
        <div className="flex gap-2 mb-4">
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
          >
            <option value="keyword">关键词</option>
            <option value="company">公司</option>
            <option value="recruiter">招聘者/HR</option>
            <option value="job">职位</option>
          </select>
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="输入屏蔽词..."
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
          />
          <Button
            onClick={handleAdd}
            disabled={adding || !newValue.trim()}
            size="sm"
            className="rounded-full bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white"
          >
            <BiPlus className="mr-1" /> 添加
          </Button>
        </div>

        {/* Blacklist items */}
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-4">加载中...</p>
        ) : hasItems ? (
          <div className="space-y-3">
            {Object.entries(blacklist).map(([type, items]) => {
              if (!items || items.length === 0) return null
              return (
                <div key={type}>
                  <p className="text-xs text-muted-foreground font-medium mb-1.5 uppercase">
                    {typeLabels[type] || type}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((item: BlacklistItem) => (
                      <span
                        key={item.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20 group"
                      >
                        {item.keyword}
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="text-red-400 hover:text-red-600 transition-colors ml-0.5"
                          title="删除"
                        >
                          {deletingId === item.id ? (
                            <span className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin inline-block" />
                          ) : (
                            <BiX className="text-sm" />
                          )}
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            暂无屏蔽词，添加后投递时将自动过滤
          </p>
        )}
      </CardContent>
    </Card>
  )
}
