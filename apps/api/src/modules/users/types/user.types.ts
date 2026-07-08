export interface User {
  id: string
  email: string
  passwordHash: string
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateUserInput {
  email: string
  passwordHash: string
}
