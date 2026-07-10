import { render } from '@testing-library/react-native'
import { AuthProvider } from '../src/hooks/useAuth'
import RegisterScreen from '../src/screens/RegisterScreen'

describe('RegisterScreen', () => {
  it('renders the create account title', () => {
    const { getAllByText } = render(
      <AuthProvider>
        <RegisterScreen />
      </AuthProvider>
    )

    expect(getAllByText('Create account').length).toBeGreaterThan(0)
  })

  it('renders role selector with Fan and Creator buttons', () => {
    const { getByLabelText } = render(
      <AuthProvider>
        <RegisterScreen />
      </AuthProvider>
    )

    expect(getByLabelText('Sign up as a fan')).toBeTruthy()
    expect(getByLabelText('Sign up as a creator')).toBeTruthy()
  })

  it('renders email, display name, and password inputs', () => {
    const { getByTestId } = render(
      <AuthProvider>
        <RegisterScreen />
      </AuthProvider>
    )

    expect(getByTestId('email-input')).toBeTruthy()
    expect(getByTestId('display-name-input')).toBeTruthy()
    expect(getByTestId('password-input')).toBeTruthy()
  })

  it('shows fan genre preferences field by default', () => {
    const { getByTestId } = render(
      <AuthProvider>
        <RegisterScreen />
      </AuthProvider>
    )

    expect(getByTestId('genre-prefs-input')).toBeTruthy()
  })

  it('renders the create account button', () => {
    const { getByLabelText } = render(
      <AuthProvider>
        <RegisterScreen />
      </AuthProvider>
    )

    expect(getByLabelText('Create account')).toBeTruthy()
  })
})
