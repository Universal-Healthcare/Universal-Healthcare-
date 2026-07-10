import {
  registerSchema,
  type RegisterInput,
} from '@universal-healthcare/shared'
import { useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useAuth } from '../hooks/useAuth'
import { AuthApiError } from '../services/auth-client'

type Role = 'creator' | 'fan'

export default function RegisterScreen() {
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

  async function handleSubmit() {
    setFormError(null)

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

  if (isSubmitting) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size='large' color='#1976d2' />
        <Text style={styles.loadingText}>Creating account...</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps='handled'
    >
      <Text style={styles.title}>Create account</Text>

      {/* Role selector */}
      <View style={styles.field}>
        <Text style={styles.label}>I am a</Text>
        <View style={styles.roleRow}>
          <Pressable
            style={[
              styles.roleButton,
              role === 'fan' && styles.roleButtonActive,
            ]}
            onPress={() => setRole('fan')}
            accessibilityRole='button'
            accessibilityLabel='Sign up as a fan'
          >
            <Text
              style={[
                styles.roleButtonText,
                role === 'fan' && styles.roleButtonTextActive,
              ]}
            >
              Fan
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.roleButton,
              role === 'creator' && styles.roleButtonActive,
            ]}
            onPress={() => setRole('creator')}
            accessibilityRole='button'
            accessibilityLabel='Sign up as a creator'
          >
            <Text
              style={[
                styles.roleButtonText,
                role === 'creator' && styles.roleButtonTextActive,
              ]}
            >
              Creator
            </Text>
          </Pressable>
        </View>
        {fieldErrors.role && (
          <Text style={styles.fieldError} role='alert'>
            {fieldErrors.role}
          </Text>
        )}
      </View>

      {/* Email */}
      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize='none'
          autoComplete='email'
          keyboardType='email-address'
          textContentType='emailAddress'
          placeholder='you@example.com'
          testID='email-input'
        />
        {fieldErrors.email && (
          <Text style={styles.fieldError} role='alert'>
            {fieldErrors.email}
          </Text>
        )}
      </View>

      {/* Display name */}
      <View style={styles.field}>
        <Text style={styles.label}>Display name</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          autoComplete='name'
          textContentType='name'
          placeholder='Your display name'
          testID='display-name-input'
        />
        {fieldErrors.displayName && (
          <Text style={styles.fieldError} role='alert'>
            {fieldErrors.displayName}
          </Text>
        )}
      </View>

      {/* Password */}
      <View style={styles.field}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete='new-password'
          textContentType='newPassword'
          placeholder='At least 8 characters, 1 letter + 1 number'
          testID='password-input'
        />
        {fieldErrors.password && (
          <Text style={styles.fieldError} role='alert'>
            {fieldErrors.password}
          </Text>
        )}
      </View>

      {/* Role-specific fields */}
      {role === 'creator' ? (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>Bio (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              placeholder='Tell people about yourself (300 chars max)'
              testID='bio-input'
            />
            {fieldErrors['profile.bio'] && (
              <Text style={styles.fieldError} role='alert'>
                {fieldErrors['profile.bio']}
              </Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Primary genre (optional)</Text>
            <TextInput
              style={styles.input}
              value={genre}
              onChangeText={setGenre}
              placeholder='e.g. primary-care, cardiology'
              testID='genre-input'
            />
            {fieldErrors['profile.genre'] && (
              <Text style={styles.fieldError} role='alert'>
                {fieldErrors['profile.genre']}
              </Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Location (optional)</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder='e.g. New York, NY'
              testID='location-input'
            />
            {fieldErrors['profile.location'] && (
              <Text style={styles.fieldError} role='alert'>
                {fieldErrors['profile.location']}
              </Text>
            )}
          </View>
        </>
      ) : (
        <View style={styles.field}>
          <Text style={styles.label}>Genre preferences (comma separated)</Text>
          <TextInput
            style={styles.input}
            value={genrePrefsRaw}
            onChangeText={setGenrePrefsRaw}
            placeholder='rock, jazz, classical'
            testID='genre-prefs-input'
          />
          {fieldErrors['profile.genrePrefs'] && (
            <Text style={styles.fieldError} role='alert'>
              {fieldErrors['profile.genrePrefs']}
            </Text>
          )}
        </View>
      )}

      {formError && (
        <Text style={styles.formError} role='alert'>
          {formError}
        </Text>
      )}

      <Pressable
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
        accessibilityRole='button'
        accessibilityLabel='Create account'
      >
        <Text style={styles.buttonText}>Create account</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  roleButtonActive: {
    borderColor: '#1976d2',
    backgroundColor: '#e3f2fd',
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  roleButtonTextActive: {
    color: '#1976d2',
  },
  fieldError: {
    color: '#d32f2f',
    fontSize: 13,
    marginTop: 4,
  },
  formError: {
    color: '#d32f2f',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#1976d2',
    marginTop: 12,
  },
  button: {
    backgroundColor: '#1976d2',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
