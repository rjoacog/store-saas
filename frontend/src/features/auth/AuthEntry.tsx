import { useState } from 'react'
import { LoginPage } from './LoginPage'
import { RegisterPage } from './RegisterPage'

export function AuthEntry() {
  const [mode, setMode] = useState<'login' | 'register'>('login')

  if (mode === 'register') {
    return <RegisterPage onBackToLogin={() => setMode('login')} />
  }

  return <LoginPage onGoToRegister={() => setMode('register')} />
}
