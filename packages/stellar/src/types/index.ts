// Placeholder types for the future Stellar payment layer; no blockchain logic yet.

export interface StellarAccountReference {
  publicKey: string
}

export interface StellarNetworkConfig {
  network: 'testnet' | 'public'
  horizonUrl: string
}
