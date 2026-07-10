'use client'

import {
  updateMeSchema,
  type UpdateMeInput,
} from '@universal-healthcare/shared'
import { useState, type FormEvent } from 'react'
import { ApiError } from '../../lib/api-client'
import { updateMe } from '../../lib/user-client'

interface EditProfileFormProps {
  token: string
  initialValues: {
    displayName: string
    bio: string
    genre: string
    location: string
    genrePrefs: string[]
  }
  onSuccess: () => void
}

export function EditProfileForm({
  token,
  initialValues,
  onSuccess,
}: EditProfileFormProps) {
  const [displayName, setDisplayName] = useState(initialValues.displayName)
  const [bio, setBio] = useState(initialValues.bio)
  const [genre, setGenre] = useState(initialValues.genre)
  const [location, setLocation] = useState(initialValues.location)
  const [genrePrefsText, setGenrePrefsText] = useState(
    initialValues.genrePrefs.join(', ')
  )
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setSuccess(false)

    const genrePrefs = genrePrefsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const input: UpdateMeInput = {
      displayName: displayName || undefined,
      bio: bio || null,
      genre: genre || undefined,
      location: location || undefined,
      genrePrefs: genrePrefs.length > 0 ? genrePrefs : undefined,
    }

    const result = updateMeSchema.safeParse(input)

    if (!result.success) {
      const errors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0]
        if (typeof field === 'string' && !errors[field]) {
          errors[field] = issue.message
        }
      }
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setIsSubmitting(true)

    try {
      await updateMe(token, result.data)
      setSuccess(true)
      onSuccess()
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : 'Unable to save changes'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor='displayName'>Display Name</label>
        <input
          id='displayName'
          name='displayName'
          type='text'
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        {fieldErrors.displayName && (
          <p role='alert'>{fieldErrors.displayName}</p>
        )}
      </div>

      <div>
        <label htmlFor='bio'>Bio</label>
        <textarea
          id='bio'
          name='bio'
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
        {fieldErrors.bio && <p role='alert'>{fieldErrors.bio}</p>}
      </div>

      <div>
        <label htmlFor='genre'>Genre</label>
        <input
          id='genre'
          name='genre'
          type='text'
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
        />
        {fieldErrors.genre && <p role='alert'>{fieldErrors.genre}</p>}
      </div>

      <div>
        <label htmlFor='location'>Location</label>
        <input
          id='location'
          name='location'
          type='text'
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        {fieldErrors.location && <p role='alert'>{fieldErrors.location}</p>}
      </div>

      <div>
        <label htmlFor='genrePrefs'>Genre Preferences (comma-separated)</label>
        <input
          id='genrePrefs'
          name='genrePrefs'
          type='text'
          value={genrePrefsText}
          onChange={(e) => setGenrePrefsText(e.target.value)}
        />
        {fieldErrors.genrePrefs && <p role='alert'>{fieldErrors.genrePrefs}</p>}
      </div>

      {formError && <p role='alert'>{formError}</p>}
      {success && <p role='status'>Profile updated successfully.</p>}

      <button type='submit' disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  )
}
