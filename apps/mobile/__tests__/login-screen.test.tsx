import { render } from '@testing-library/react-native'
import { AuthProvider } from '../src/hooks/useAuth'
import LoginScreen from '../src/screens/LoginScreen'

describe('LoginScreen', () => {
  it('renders email and password fields', () => {
    const { getByTestId, getAllByText } = render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>
    )

    expect(getByTestId('email-input')).toBeTruthy()
    expect(getByTestId('password-input')).toBeTruthy()
    expect(getAllByText('Log in').length).toBeGreaterThan(0)
  })

  it('renders the log in button', () => {
    const { getByLabelText } = render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>
    )

    expect(getByLabelText('Log in')).toBeTruthy()
  })
})
