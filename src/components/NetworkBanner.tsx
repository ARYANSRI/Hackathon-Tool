'use client'

import { useState, useEffect } from 'react'
import { WifiOff, SignalLow } from 'lucide-react'

export default function NetworkBanner() {
  const [isOffline, setIsOffline] = useState(false)
  const [isSlowNetwork, setIsSlowNetwork] = useState(false)

  useEffect(() => {
    function handleOnline() {
      setIsOffline(false)
    }

    function handleOffline() {
      setIsOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check initial online status
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOffline(true)
    }

    // Check connection type / speed if supported by browser
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    if (connection) {
      const updateNetworkSpeed = () => {
        if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g' || connection.rtt > 1000) {
          setIsSlowNetwork(true)
        } else {
          setIsSlowNetwork(false)
        }
      }
      connection.addEventListener('change', updateNetworkSpeed)
      updateNetworkSpeed()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOffline && !isSlowNetwork) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top duration-300">
      {isOffline ? (
        <div className="bg-rose-600 text-white px-4 py-2.5 text-center text-xs font-bold shadow-lg flex items-center justify-center space-x-2">
          <WifiOff className="w-4 h-4 animate-bounce shrink-0" />
          <span>You are currently OFFLINE. Reconnecting to lab network...</span>
        </div>
      ) : (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-center text-xs font-bold shadow-lg flex items-center justify-center space-x-2">
          <SignalLow className="w-4 h-4 shrink-0" />
          <span>Slow Connection Detected. Answers will automatically retry if network drops.</span>
        </div>
      )}
    </div>
  )
}
