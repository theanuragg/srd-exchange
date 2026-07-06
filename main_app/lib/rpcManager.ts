import { createPublicClient, http, PublicClient, Chain } from 'viem';
import { mainnet, bsc, base, arbitrum, optimism, polygon, avalanche } from 'viem/chains';

const getChain = (chainId: number): Chain => {
    switch (chainId) {
        case 1: return mainnet;
        case 8453: return base;
        case 42161: return arbitrum;
        case 10: return optimism;
        case 137: return polygon;
        case 43114: return avalanche;
        case 56:
        default: return bsc;
    }
}

// Comprehensive list of BSC RPC endpoints, ordered by reliability
// NodeReal is prioritized as the primary endpoint for faster performance
const BSC_RPC_ENDPOINTS = [
    'https://bsc-dataseed.bnbchain.org',
    'https://bsc-dataseed1.defibit.io',
    'https://bsc-dataseed1.ninicoin.io',
    'https://1rpc.io/bnb',
];

interface RPCEndpointHealth {
    url: string;
    failures: number;
    lastFailure: number;
    lastSuccess: number;
    isCircuitOpen: boolean;
}

class RPCManager {
    private endpointHealth: Map<string, RPCEndpointHealth>;
    private currentEndpointIndex: number;
    private readonly CIRCUIT_BREAKER_THRESHOLD = 3;
    private readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 60 seconds
    private readonly FAILURE_RESET_TIME = 300000; // 5 minutes

    constructor() {
        this.endpointHealth = new Map();
        this.currentEndpointIndex = 0;

        // Initialize health tracking for all endpoints
        BSC_RPC_ENDPOINTS.forEach(url => {
            this.endpointHealth.set(url, {
                url,
                failures: 0,
                lastFailure: 0,
                lastSuccess: 0,
                isCircuitOpen: false,
            });
        });
    }

    /**
     * Get the next healthy RPC endpoint
     */
    getHealthyEndpoint(): string {
        const now = Date.now();

        // Try to find a healthy endpoint
        for (let i = 0; i < BSC_RPC_ENDPOINTS.length; i++) {
            const index = (this.currentEndpointIndex + i) % BSC_RPC_ENDPOINTS.length;
            const endpoint = BSC_RPC_ENDPOINTS[index];
            const health = this.endpointHealth.get(endpoint)!;

            // Check if circuit breaker should be reset
            if (health.isCircuitOpen && now - health.lastFailure > this.CIRCUIT_BREAKER_TIMEOUT) {
                health.isCircuitOpen = false;
                health.failures = 0;
            }

            // Return first healthy endpoint
            if (!health.isCircuitOpen) {
                this.currentEndpointIndex = index;
                return endpoint;
            }
        }

        // If all endpoints have open circuits, reset the one that failed longest ago
        let oldestFailure = now;
        let oldestIndex = 0;

        BSC_RPC_ENDPOINTS.forEach((endpoint, index) => {
            const health = this.endpointHealth.get(endpoint)!;
            if (health.lastFailure < oldestFailure) {
                oldestFailure = health.lastFailure;
                oldestIndex = index;
            }
        });

        const fallbackEndpoint = BSC_RPC_ENDPOINTS[oldestIndex];
        const fallbackHealth = this.endpointHealth.get(fallbackEndpoint)!;
        fallbackHealth.isCircuitOpen = false;
        fallbackHealth.failures = 0;
        this.currentEndpointIndex = oldestIndex;

        return fallbackEndpoint;
    }

    /**
     * Mark an endpoint as successful
     */
    recordSuccess(endpoint: string): void {
        const health = this.endpointHealth.get(endpoint);
        if (health) {
            health.lastSuccess = Date.now();
            health.failures = 0;
            health.isCircuitOpen = false;
        }
    }

    /**
     * Mark an endpoint as failed
     */
    recordFailure(endpoint: string): void {
        const health = this.endpointHealth.get(endpoint);
        if (health) {
            health.failures++;
            health.lastFailure = Date.now();

            // Open circuit breaker if threshold reached
            if (health.failures >= this.CIRCUIT_BREAKER_THRESHOLD) {
                health.isCircuitOpen = true;
                console.warn(`🔴 Circuit breaker opened for ${endpoint} after ${health.failures} failures`);
            }
        }
    }

    /**
     * Get all endpoints sorted by health (best first)
     */
    getEndpointsByHealth(): string[] {
        const now = Date.now();

        return BSC_RPC_ENDPOINTS.slice().sort((a, b) => {
            const healthA = this.endpointHealth.get(a)!;
            const healthB = this.endpointHealth.get(b)!;

            // Prioritize endpoints with closed circuits
            if (healthA.isCircuitOpen && !healthB.isCircuitOpen) return 1;
            if (!healthA.isCircuitOpen && healthB.isCircuitOpen) return -1;

            // Then by recency of success
            if (healthA.lastSuccess > healthB.lastSuccess) return -1;
            if (healthA.lastSuccess < healthB.lastSuccess) return 1;

            // Then by fewer failures
            return healthA.failures - healthB.failures;
        });
    }

    /**
     * Create a public client with automatic RPC failover for BSC, or viem default for others
     */
    createPublicClient(chainId: number = 56): PublicClient {
        const chain = getChain(chainId);
        
        // For BSC, use our advanced fallback manager
        if (chainId === 56) {
            const endpoint = this.getHealthyEndpoint();
            return createPublicClient({
                chain,
                transport: http(endpoint, {
                    timeout: 10000,
                    retryCount: 0,
                }),
            });
        }
        
        // For other chains, use Alchemy if an API key is available
        const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
        let rpcUrl: string | undefined = undefined;

        if (apiKey) {
            switch (chainId) {
                case 1: rpcUrl = `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`; break;
                case 137: rpcUrl = `https://polygon-mainnet.g.alchemy.com/v2/${apiKey}`; break;
                case 42161: rpcUrl = `https://arb-mainnet.g.alchemy.com/v2/${apiKey}`; break;
                case 8453: rpcUrl = `https://base-mainnet.g.alchemy.com/v2/${apiKey}`; break;
                case 10: rpcUrl = `https://opt-mainnet.g.alchemy.com/v2/${apiKey}`; break;
                case 11155111: rpcUrl = `https://eth-sepolia.g.alchemy.com/v2/${apiKey}`; break;
            }
        }

        return createPublicClient({
            chain,
            transport: http(rpcUrl, {
                timeout: 10000,
                retryCount: 0,
            }),
        });
    }

    /**
     * Get current RPC status for debugging
     */
    getStatus(): { current: string; health: RPCEndpointHealth[] } {
        return {
            current: BSC_RPC_ENDPOINTS[this.currentEndpointIndex],
            health: Array.from(this.endpointHealth.values()),
        };
    }
}

// Export singleton instance
export const rpcManager = new RPCManager();

// Export helper function for retry with RPC failover
export async function retryWithRPCFailover<T>(
    fn: (client: PublicClient) => Promise<T>,
    maxRetries = 3,
    chainId: number = 56
): Promise<T | null> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const endpoint = chainId === 56 ? rpcManager.getHealthyEndpoint() : 'public_rpc';
        const client = rpcManager.createPublicClient(chainId);

        try {
            const result = await fn(client);
            if (chainId === 56) rpcManager.recordSuccess(endpoint);
            return result;
        } catch (error) {
            lastError = error as Error;
            if (chainId === 56) rpcManager.recordFailure(endpoint);
            
            // Wait before retrying (exponential backoff)
            if (attempt < maxRetries - 1) {
                const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    return null;
    return null;
}
