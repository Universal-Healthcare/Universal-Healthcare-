import type {
  AuthUser,
  LoginInput,
  RegisterInput,
} from '@universal-healthcare/shared'
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { loginUser, registerUser } from '../services/auth-client'

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  login: (input: LoginInput) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => void
  setAuth: (user: AuthUser, token: string) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)

  const setAuth = useCallback((nextUser: AuthUser, nextToken: string) => {
    setUser(nextUser)
    setToken(nextToken)
  }, [])

  const login = useCallback(
    async (input: LoginInput) => {
      const result = await loginUser(input)
      setAuth(result.user, result.tokens.accessToken)
    },
    [setAuth]
  )

  const register = useCallback(
    async (input: RegisterInput) => {
      const result = await registerUser(input)
      setAuth(result.user, result.tokens.accessToken)
    },
    [setAuth]
  )

  const logout = useCallback(() => {
    setUser(null)
    setToken(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, token, login, register, logout, setAuth }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
