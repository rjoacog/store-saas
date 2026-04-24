type ApiErrorTextProps = {
  message: string | null
  className?: string
}

/**
 * Muestra un mensaje de error de API; no renderiza nada si message es null.
 */
export function ApiErrorText({ message, className }: ApiErrorTextProps) {
  if (message == null) {
    return null
  }
  return (
    <p
      role="alert"
      className={className}
      style={
        className
          ? undefined
          : { color: '#b91c1c', margin: '0.5rem 0' }
      }
    >
      {message}
    </p>
  )
}
