import bcrypt from 'bcryptjs'
import { prisma } from '../../../shared/database/prisma.js'
import { AppError } from '../../../shared/errors/app-error.js'
import { generateUniqueSlug } from '../../../shared/utils/slug.js'
import {
  toCreatorResponse,
  type CreatorProfile,
} from '../../creators/types/creator.types.js'
import { toFanResponse, type FanProfile } from '../../fans/types/fan.types.js'
import type { User } from '../../users/types/user.types.js'
import { userService } from '../../users/services/user.service.js'
import {
  toAuthUserResponse,
  toTokenPair,
  type AuthResult,
} from './token-helpers.js'
import { tokenService, type IssuedTokenPair } from './token.service.js'
import { emailVerificationService } from './email-verification.service.js'
import type {
  LoginInput,
  RegisterInput,
} from '../validators/auth.validators.js'

const PASSWORD_SALT_ROUNDS = 10

type RawPrismaFan = {
  id: string
  userId: string
  displayName: string
  avatarUrl: string | null
  genrePrefs: string
  createdAt: Date
  updatedAt: Date
}

function convertRawFan(raw: unknown): FanProfile {
  const r = raw as RawPrismaFan
  return {
    id: r.id,
    userId: r.userId,
    displayName: r.displayName,
    avatarUrl: r.avatarUrl,
    genrePrefs: JSON.parse(r.genrePrefs) as string[],
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

export const authService = {
  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await userService.findByEmail(input.email)
    if (existing) {
      throw new AppError(
        409,
        'EMAIL_ALREADY_REGISTERED',
        'An account with this email already exists'
      )
    }

    const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS)

    const { user, creatorProfile, fanProfile } = await prisma.$transaction(
      async (tx) => {
        const created = await tx.user.create({
          data: { email: input.email, passwordHash },
        })

        if (input.role === 'creator') {
          const slug = await generateUniqueSlug(input.displayName, (s) =>
            tx.creatorProfile.findUnique({ where: { slug: s } })
          )
          const raw = await tx.creatorProfile.create({
            data: {
              userId: created.id,
              displayName: input.displayName,
              slug,
              bio: input.profile?.bio,
              genre: input.profile?.genre,
              location: input.profile?.location,
            },
          })
          return {
            user: created as unknown as User,
            creatorProfile: raw as unknown as CreatorProfile,
            fanProfile: null as unknown as FanProfile | null,
          }
        }

        const raw = await tx.fanProfile.create({
          data: {
            userId: created.id,
            displayName: input.displayName,
            genrePrefs: JSON.stringify(input.profile?.genrePrefs ?? []),
          },
        })
        const builtFan: FanProfile = {
          id: raw.id,
          userId: raw.userId,
          displayName: raw.displayName,
          avatarUrl: raw.avatarUrl,
          genrePrefs: JSON.parse(raw.genrePrefs) as string[],
          createdAt: raw.createdAt,
          updatedAt: raw.updatedAt,
        }
        return {
          user: created as unknown as User,
          creatorProfile: null as unknown as CreatorProfile | null,
          fanProfile: builtFan,
        }
      }
    )

    const role = input.role
    const tokens: IssuedTokenPair = await tokenService.issueTokenPair(user.id)

    try {
      await emailVerificationService.issueAndSend(user.id, user.email)
    } catch (err) {
      void err
    }

    if (role === 'creator') {
      if (!creatorProfile) {
        throw new AppError(
          500,
          'PROFILE_MISSING',
          'Creator profile not created during registration'
        )
      }
      return {
        user: toAuthUserResponse(user, role),
        tokens: toTokenPair(tokens),
        profile: toCreatorResponse(creatorProfile),
      }
    }

    if (!fanProfile) {
      throw new AppError(
        500,
        'PROFILE_MISSING',
        'Fan profile not created during registration'
      )
    }
    return {
      user: toAuthUserResponse(user, role),
      tokens: toTokenPair(tokens),
      profile: toFanResponse(fanProfile),
    }
  },

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: { creatorProfile: true, fanProfile: true },
    })

    if (!user) {
      throw new AppError(
        401,
        'INVALID_CREDENTIALS',
        'Invalid email or password'
      )
    }
    const passwordMatches = await bcrypt.compare(
      input.password,
      user.passwordHash
    )
    if (!passwordMatches) {
      throw new AppError(
        401,
        'INVALID_CREDENTIALS',
        'Invalid email or password'
      )
    }
    if (!user.creatorProfile && !user.fanProfile) {
      throw new AppError(
        500,
        'PROFILE_MISSING',
        'Account has no role profile; contact support'
      )
    }
    const role: 'creator' | 'fan' = user.creatorProfile ? 'creator' : 'fan'
    const rawProfile = (user.creatorProfile ?? user.fanProfile)!
    const localUser = user as unknown as User
    const tokens = await tokenService.issueTokenPair(localUser.id)

    return {
      user: toAuthUserResponse(localUser, role),
      tokens: toTokenPair(tokens),
      profile:
        role === 'creator'
          ? toCreatorResponse(rawProfile as unknown as CreatorProfile)
          : toFanResponse(convertRawFan(rawProfile)),
    }
  },

  async refresh(refreshToken: string): Promise<AuthResult> {
    const next = await tokenService.rotate(refreshToken)
    const payload = tokenService.verifyAccessToken(next.accessToken)
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { creatorProfile: true, fanProfile: true },
    })
    if (!user) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Account no longer exists')
    }
    if (!user.creatorProfile && !user.fanProfile) {
      throw new AppError(
        500,
        'PROFILE_MISSING',
        'Account has no role profile; contact support'
      )
    }
    const role: 'creator' | 'fan' = user.creatorProfile ? 'creator' : 'fan'
    const rawProfile = (user.creatorProfile ?? user.fanProfile)!
    const localUser = user as unknown as User

    return {
      user: toAuthUserResponse(localUser, role),
      tokens: toTokenPair(next),
      profile:
        role === 'creator'
          ? toCreatorResponse(rawProfile as unknown as CreatorProfile)
          : toFanResponse(convertRawFan(rawProfile)),
    }
  },

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return
    await tokenService.revokeRefreshToken(refreshToken)
  },

  async logoutAll(userId: string): Promise<number> {
    return tokenService.revokeAllForUser(userId)
  },
}
