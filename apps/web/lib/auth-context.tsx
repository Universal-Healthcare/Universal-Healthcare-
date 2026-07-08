"use client"

import type { AuthUser, LoginInput, RegisterInput } from "@universal-healthcare/shared"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import {
  loginUser,
  logoutUser,
  refreshTokens,
  registerUser,
} from "./auth-client"

const ACCESS_TOKEN_KEY = "universal-healthcare.token"
const REFRESH_TOKEN_KEY = "universal-healthcare.refreshToken"
const USER_KEY = "universal-healthcare.user"

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  login: (input: LoginInput) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedAccess = window.localStorage.getItem(ACCESS_TOKEN_KEY)
    const storedRefresh = window.localStorage.getItem(REFRESH_TOKEN_KEY)
    const storedUser = window.localStorage.getItem(USER_KEY)

    if (storedAccess && storedRefresh && storedUser) {
      setToken(storedAccess)
      setRefreshToken(storedRefresh)
      setUser(JSON.parse(storedUser) as AuthUser)
    }

    setIsLoading(false)
  }, [])

  const persist = useCallback(
    (
      nextUser: AuthUser,
      nextAccess: string,
      nextRefresh: string,
      refreshExpiresAt: string
    ) => {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, nextAccess)
      window.localStorage.setItem(REFRESH_TOKEN_KEY, nextRefresh)
      window.localStorage.setItem(
        USER_KEY,
        JSON.stringify(nextUser)
      )
      void refreshExpiresAt // expiry is informational; the API enforces it
      setUser(nextUser)
      setToken(nextAccess)
      setRefreshToken(nextRefresh)
    },
    []
  )

  const clear = useCallback(() => {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY)
    window.localStorage.removeItem(REFRESH_TOKEN_KEY)
    window.localStorage.removeItem(USER_KEY)
    setUser(null)
    setToken(null)
    setRefreshToken(null)
  }, [])

  const login = useCallback(
    async (input: LoginInput) => {
      const result = await loginUser(input)
      persist(
        result.user,
        result.tokens.accessToken,
        result.tokens.refreshToken,
        result.tokens.refreshTokenExpiresAt
      )
    },
    [persist]
  )

  const register = useCallback(
    async (input: RegisterInput) => {
      const result = await registerUser(input)
      persist(
        result.user,
        result.tokens.accessToken,
        result.tokens.refreshToken,
        result.tokens.refreshTokenExpiresAt
      )
    },
    [persist]
  )

  const refresh = useCallback(async () => {
    if (!refreshToken) throw new Error("No refresh token")
    const result = await refreshTokens(refreshToken)
    persist(
      result.user,
      result.tokens.accessToken,
      result.tokens.refreshToken,
      result.tokens.refreshTokenExpiresAt
    )
  }, [refreshToken, persist])

  const logout = useCallback(async () => {
    try {
      await logoutUser(refreshToken ?? undefined)
    } finally {
      clear()
    }
  }, [refreshToken, clear])

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, register, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }

  return context
}
