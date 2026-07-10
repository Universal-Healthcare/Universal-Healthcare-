'use client'

import {
  registerSchema,
  type RegisterInput,
} from '@universal-healthcare/shared'
import { useState, type FormEvent } from 'react'
import { AuthApiError } from '../../lib/auth-client'
import { useAuth } from '../../lib/auth-context'

type Role = 'creator' | 'fan'

export function RegisterForm() {
  const { register } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('fan')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [genre, setGenre] = useState('')
  const [location, setLocation] = useState('')
  const [genrePrefsRaw, setGenrePrefsRaw] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setSuccess(false)

    const genrePrefs = genrePrefsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const payload: RegisterInput = {
      email,
      password,
      role,
      displayName,
      ...(role === 'creator'
        ? {
            profile: {
              ...(bio ? { bio } : {}),
              ...(genre ? { genre } : {}),
              ...(location ? { location } : {}),
            },
          }
        : {
            profile: genrePrefs.length > 0 ? { genrePrefs } : {},
          }),
    }

    const result = registerSchema.safeParse(payload)
    if (!result.success) {
      const errors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const field = issue.path.join('.') || 'form'
        if (!errors[field]) errors[field] = issue.message
      }
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setIsSubmitting(true)

    try {
      await register(result.data)
      setSuccess(true)
    } catch (error) {
      setFormError(
        error instanceof AuthApiError
          ? error.message
          : 'Unable to create account'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor='role'>I am a</label>
        <select
          id='role'
          name='role'
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
        >
          <option value='fan'>Fan</option>
          <option value='creator'>Creator</option>
        </select>
        {fieldErrors.role && <p role='alert'>{fieldErrors.role}</p>}
      </div>

      <div>
        <label htmlFor='email'>Email</label>
        <input
          id='email'
          name='email'
          type='email'
          autoComplete='email'
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        {fieldErrors.email && <p role='alert'>{fieldErrors.email}</p>}
      </div>

      <div>
        <label htmlFor='displayName'>Display name</label>
        <input
          id='displayName'
          name='displayName'
          type='text'
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
        {fieldErrors.displayName && (
          <p role='alert'>{fieldErrors.displayName}</p>
        )}
      </div>

      <div>
        <label htmlFor='password'>Password</label>
        <input
          id='password'
          name='password'
          type='password'
          autoComplete='new-password'
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {fieldErrors.password && <p role='alert'>{fieldErrors.password}</p>}
      </div>

      {role === 'creator' ? (
        <>
          <div>
            <label htmlFor='bio'>Bio (optional, 300 chars max)</label>
            <textarea
              id='bio'
              name='bio'
              rows={3}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
            />
            {fieldErrors['profile.bio'] && (
              <p role='alert'>{fieldErrors['profile.bio']}</p>
            )}
          </div>
          <div>
            <label htmlFor='genre'>Primary genre (optional)</label>
            <input
              id='genre'
              name='genre'
              type='text'
              value={genre}
              onChange={(event) => setGenre(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor='location'>Location (optional)</label>
            <input
              id='location'
              name='location'
              type='text'
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
          </div>
        </>
      ) : (
        <div>
          <label htmlFor='genrePrefs'>
            Genre preferences (comma separated)
          </label>
          <input
            id='genrePrefs'
            name='genrePrefs'
            type='text'
            value={genrePrefsRaw}
            onChange={(event) => setGenrePrefsRaw(event.target.value)}
            placeholder='rock, jazz, classical'
          />
          {fieldErrors['profile.genrePrefs'] && (
            <p role='alert'>{fieldErrors['profile.genrePrefs']}</p>
          )}
        </div>
      )}

      {formError && <p role='alert'>{formError}</p>}
      {success && (
        <p role='status'>
          Account created. You&apos;re logged in. Check your email to verify
          your address.
        </p>
      )}

      <button type='submit' disabled={isSubmitting}>
        {isSubmitting ? 'Creating account...' : 'Create account'}
      </button>
    </form>
  )
}
