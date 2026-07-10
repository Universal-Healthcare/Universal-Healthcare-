import { userRepository } from '../repositories/user.repository.js'
import type { CreateUserInput, User } from '../types/user.types.js'

export const userService = {
  findByEmail(email: string): Promise<User | null> {
    return userRepository.findByEmail(email)
  },

  findById(id: string): Promise<User | null> {
    return userRepository.findById(id)
  },

  findByIdWithProfiles(
    id: string
  ): Promise<(User & { creatorProfile: unknown; fanProfile: unknown }) | null> {
    return userRepository.findByIdWithProfiles(id)
  },

  create(input: CreateUserInput): Promise<User> {
    return userRepository.create(input)
  },

  markEmailVerified(id: string): Promise<void> {
    return userRepository.markEmailVerified(id)
  },
}
