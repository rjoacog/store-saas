import { useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/AuthContext'
import './LoginPage.css'

type RegisterPageProps = {
  onBackToLogin: () => void
}

export function RegisterPage({ onBackToLogin }: RegisterPageProps) {
  const { register } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [storeName, setStoreName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await register(email.trim(), password, storeName.trim())
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo crear la cuenta',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-page__card">
        <h1 className="login-page__title">Nueva cuenta</h1>
        <p className="login-page__lead">
          Creá tu usuario y tu primera tienda
        </p>
        <form className="login-page__form" onSubmit={handleSubmit}>
          <label className="login-page__field">
            <span>Correo</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </label>
          <label className="login-page__field">
            <span>Contraseña (mín. 8 caracteres)</span>
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              disabled={loading}
            />
          </label>
          <label className="login-page__field">
            <span>Nombre de la tienda</span>
            <input
              name="storeName"
              type="text"
              autoComplete="organization"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              required
              disabled={loading}
              minLength={1}
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
            {loading ? 'Creando cuenta…' : 'Registrarme'}
          </button>
        </form>
        <p className="login-page__switch">
          ¿Ya tenés cuenta?{' '}
          <button
            type="button"
            className="login-page__link"
            onClick={onBackToLogin}
            disabled={loading}
          >
            Iniciar sesión
          </button>
        </p>
      </div>
    </div>
  )
}
