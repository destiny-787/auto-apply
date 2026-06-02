'use client'

import { useState } from 'react'
import { BiChevronDown, BiChevronUp } from 'react-icons/bi'
import ResumeAnalysis from './ResumeAnalysis'
import ChatPanel from './ChatPanel'

interface AiAssistantProps {
  onConfigUpdated?: () => void
}

export default function AiAssistant({ onConfigUpdated }: AiAssistantProps) {
  const [resumeExpanded, setResumeExpanded] = useState(true)

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-500">
      {/* Resume analysis section (collapsible) */}
      <div>
        <button
          type="button"
          onClick={() => setResumeExpanded(!resumeExpanded)}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-muted/40 border border-border hover:bg-muted/60 transition-colors mb-3"
        >
          <span className="text-sm font-medium text-foreground/80 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            简历分析
          </span>
          {resumeExpanded ? (
            <BiChevronUp className="text-muted-foreground" />
          ) : (
            <BiChevronDown className="text-muted-foreground" />
          )}
        </button>
        {resumeExpanded && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <ResumeAnalysis onConfigUpdated={onConfigUpdated} />
          </div>
        )}
      </div>

      {/* AI chat section (always visible) */}
      <div>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/40 border border-border mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          <span className="text-sm font-medium text-foreground/80">AI 对话</span>
        </div>
        <ChatPanel />
      </div>
    </div>
  )
}
