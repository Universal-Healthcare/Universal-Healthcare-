import { render, waitFor } from '@testing-library/react-native'
import { AuthProvider } from '../src/hooks/useAuth'
import RegisterScreen from '../src/screens/RegisterScreen'

describe('RegisterScreen', () => {
  it('renders the create account title', async () => {
    const { getAllByText } = render(
      <AuthProvider>
        <RegisterScreen />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(getAllByText('Create account').length).toBeGreaterThan(0)
    })
  })

  it('renders role selector with Fan and Creator buttons', async () => {
    const { getByLabelText } = render(
      <AuthProvider>
        <RegisterScreen />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(getByLabelText('Sign up as a fan')).toBeTruthy()
      expect(getByLabelText('Sign up as a creator')).toBeTruthy()
    })
  })

  it('renders email, display name, and password inputs', async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <RegisterScreen />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(getByTestId('email-input')).toBeTruthy()
      expect(getByTestId('display-name-input')).toBeTruthy()
      expect(getByTestId('password-input')).toBeTruthy()
    })
  })

  it('shows fan genre preferences field by default', async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <RegisterScreen />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(getByTestId('genre-prefs-input')).toBeTruthy()
    })
  })

  it('renders the create account button', async () => {
    const { getByLabelText } = render(
      <AuthProvider>
        <RegisterScreen />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(getByLabelText('Create account')).toBeTruthy()
    })
  })
})
