import type { StellarAccountReference } from '../types/index.js'

export interface StellarPaymentClient {
  getAccount(reference: StellarAccountReference): Promise<unknown>
}
