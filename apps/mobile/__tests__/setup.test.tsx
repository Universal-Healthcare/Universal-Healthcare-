import { render } from '@testing-library/react-native'

import App from '../App'

describe('App', () => {
  it('renders without crashing', () => {    const { getAllByText } = render(<App />)
    const elements = getAllByText('Log in')
    expect(elements.length).toBeGreaterThan(0)
  })
})
