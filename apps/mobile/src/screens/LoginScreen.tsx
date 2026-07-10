import { loginSchema } from '@universal-healthcare/shared'
import { useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useAuth } from '../hooks/useAuth'
import { AuthApiError } from '../services/auth-client'

export default function LoginScreen() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit() {
    setFormError(null)

    const result = loginSchema.safeParse({ email, password })

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
      await login(result.data)
    } catch (error) {
      setFormError(
        error instanceof AuthApiError ? error.message : 'Unable to log in'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitting) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size='large' color='#1976d2' />
        <Text style={styles.loadingText}>Logging in...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log in</Text>

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

      <View style={styles.field}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete='password'
          textContentType='password'
          placeholder='Enter your password'
          testID='password-input'
        />
        {fieldErrors.password && (
          <Text style={styles.fieldError} role='alert'>
            {fieldErrors.password}
          </Text>
        )}
      </View>

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
        accessibilityLabel='Log in'
      >
        <Text style={styles.buttonText}>Log in</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
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
