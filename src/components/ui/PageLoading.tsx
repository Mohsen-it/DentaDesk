import React from 'react'
import { RefreshCw } from 'lucide-react'

interface PageLoadingProps {
  message?: string
  className?: string
}

export function PageLoading({ message = 'جاري التحميل...', className = '' }: PageLoadingProps) {
  return (
    <div className={`flex items-center justify-center min-h-[400px] bg-background ${className}`}>
      <div className="text-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

export default PageLoading