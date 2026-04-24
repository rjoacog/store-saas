import { useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/AuthContext'
import './LoginPage.css'

type LoginPageProps = {
  onGoToRegister?: () => void
}

export function LoginPage({ onGoToRegister }: LoginPageProps) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email.trim(), password)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo iniciar sesión',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-page__card">
        <h1 className="login-page__title">Drugstore SaaS</h1>
        <p className="login-page__lead">Iniciá sesión para continuar</p>
        <form className="login-page__form" onSubmit={handleSubmit}>
          <label className="login-page__field">
            <span>Correo</span>
            <input
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </label>
          <label className="login-page__field">
            <span>Contraseña</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </label>
          {error && (
            <p className="login-page__error" role="alert">
              {error}
            </p>
          )}
          <button
            className="login-page__submit"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
        {onGoToRegister && (
          <p className="login-page__switch">
            ¿No tenés cuenta?{' '}
            <button
              type="button"
              className="login-page__link"
              onClick={onGoToRegister}
              disabled={loading}
            >
              Crear cuenta
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
