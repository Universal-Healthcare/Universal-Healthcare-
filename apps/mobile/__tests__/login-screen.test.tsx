import { render, waitFor } from '@testing-library/react-native'
import { AuthProvider } from '../src/hooks/useAuth'
import LoginScreen from '../src/screens/LoginScreen'

describe('LoginScreen', () => {
  it('renders email and password fields', async () => {
    const { getByTestId, getAllByText } = render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(getByTestId('email-input')).toBeTruthy()
      expect(getByTestId('password-input')).toBeTruthy()
      expect(getAllByText('Log in').length).toBeGreaterThan(0)
    })
  })

  it('renders the log in button', async () => {
    const { getByLabelText } = render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(getByLabelText('Log in')).toBeTruthy()
    })
  })
})
