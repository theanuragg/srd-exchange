import { createPublicClient, createWalletClient, http, parseUnits, formatUnits, Address } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { bsc } from 'viem/chains'

// 🔥 NEW: Alchemy integration
const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY

// Simple, reliable BSC client with Alchemy support
export class SimpleBSCClient {
  private publicClient: any
  private walletClient: any
  private account: any

  constructor(privateKey?: string) {
    // 🔥 UPDATED: Use Alchemy RPC with fallback
    const rpcUrl = ALCHEMY_API_KEY 
      ? `https://bnb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
      : 'https://1rpc.io/bnb'
    
    const transport = http(rpcUrl, {
      timeout: ALCHEMY_API_KEY ? 30000 : 15000, // Higher timeout for Alchemy
      retryCount: 3,
      retryDelay: 2000,
      fetchOptions: ALCHEMY_API_KEY ? {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      } : undefined
    })

    console.log('🔧 SimpleBSCClient initialized:', {
      usingAlchemy: !!ALCHEMY_API_KEY,
      rpcUrl: rpcUrl.replace(ALCHEMY_API_KEY || '', '***'),
      hasPrivateKey: !!privateKey
    })

    this.publicClient = createPublicClient({
      chain: bsc,
      transport
    })

    if (privateKey) {
      this.account = privateKeyToAccount(privateKey as `0x${string}`)
      this.walletClient = createWalletClient({
        account: this.account,
        chain: bsc,
        transport
      })
    }
  }

  async getBalance(address: string): Promise<{ bnb: string; usdt: string }> {
    try {
      const [bnbBalance, usdtBalance] = await Promise.allSettled([
        this.publicClient.getBalance({ address }),
        this.publicClient.readContract({
          address: '0x55d398326f99059fF775485246999027B3197955',
          abi: [{
            inputs: [{ name: 'account', type: 'address' }],
            name: 'balanceOf',
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function'
          }],
          functionName: 'balanceOf',
          args: [address]
        })
      ])

      return {
        bnb: bnbBalance.status === 'fulfilled' ? formatUnits(bnbBalance.value, 18) : '0',
        usdt: usdtBalance.status === 'fulfilled' ? formatUnits(usdtBalance.value, 18) : '0'
      }
    } catch (error) {
      console.warn('Balance fetch failed:', error)
      return { bnb: '0', usdt: '0' }
    }
  }

  async checkAllowance(owner: string, spender: string): Promise<string> {
    try {
      const allowance = await this.publicClient.readContract({
        address: '0x55d398326f99059fF775485246999027B3197955',
        abi: [{
          inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' }
          ],
          name: 'allowance',
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view',
          type: 'function'
        }],
        functionName: 'allowance',
        args: [owner, spender]
      })
      return formatUnits(allowance, 18)
    } catch (error) {
      console.warn('Allowance check failed:', error)
      return '0'
    }
  }

  async transferUSDT(from: string, to: string, amount: string): Promise<string> {
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not initialized')
    }

    try {
      const hash = await this.walletClient.writeContract({
        address: '0x55d398326f99059fF775485246999027B3197955',
        abi: [{
          inputs: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          name: 'transferFrom',
          outputs: [{ name: '', type: 'bool' }],
          stateMutability: 'nonpayable',
          type: 'function'
        }],
        functionName: 'transferFrom',
        args: [from, to, parseUnits(amount, 18)],
        gas: BigInt(100000)
      })
      return hash
    } catch (error) {
      console.error('Transfer failed:', error)
      throw error
    }
  }
}