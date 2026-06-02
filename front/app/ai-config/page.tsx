'use client'

import { useState } from 'react'
import { BiBrain, BiBot } from 'react-icons/bi'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import PageHeader from '@/app/components/PageHeader'
import AiAssistant from './AiAssistant'
import UnifiedConfig from './UnifiedConfig'

export default function AiConfigPage() {
  const [activeTab, setActiveTab] = useState('config')
  const [refreshKey, setRefreshKey] = useState(0)

  const handleConfigUpdated = () => setRefreshKey(k => k + 1)

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<BiBrain className="text-2xl" />}
        title="AI配置"
        subtitle="统一管理AI与各平台的配置，支持AI同步到各平台"
        iconClass="text-white"
        accentBgClass="bg-purple-500"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-center mb-6">
          <TabsList className="rounded-full">
            <TabsTrigger value="config" className="rounded-full">
              <BiBrain className="mr-1.5" /> AI配置
            </TabsTrigger>
            <TabsTrigger value="assistant" className="rounded-full">
              <BiBot className="mr-1.5" /> AI助手
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: 统一配置（AI + 各平台） */}
        <TabsContent value="config" forceMount>
          <UnifiedConfig key={refreshKey} />
        </TabsContent>

        {/* Tab 2: AI助手（简历分析 + AI对话） */}
        <TabsContent value="assistant" forceMount>
          <AiAssistant onConfigUpdated={handleConfigUpdated} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
