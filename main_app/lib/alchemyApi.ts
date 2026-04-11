// Alchemy API helper for fetching USDT transaction history
// This uses Alchemy's optimized getAssetTransfers API instead of manual log queries

export async function fetchTransactionHistoryAlchemy(userAddress: string): Promise<any[]> {
    try {
        const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || 'demo'
        const ALCHEMY_URL = `https://bnb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
        const USDT_CONTRACT = '0x55d398326f99059fF775485246999027B3197955'

        console.log('📡 Fetching transaction history from Alchemy API for:', userAddress)

        // Fetch incoming and outgoing transfers in parallel
        const [incomingResponse, outgoingResponse] = await Promise.all([
            // Incoming transfers (to this address)
            fetch(ALCHEMY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'alchemy_getAssetTransfers',
                    params: [{
                        fromBlock: '0x0',
                        toBlock: 'latest',
                        toAddress: userAddress,
                        contractAddresses: [USDT_CONTRACT],
                        category: ['erc20'],
                        maxCount: '0x32', // 50 in hex
                        order: 'desc', // Most recent first
                        withMetadata: true // Include timestamps
                    }]
                })
            }),
            // Outgoing transfers (from this address)
            fetch(ALCHEMY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 2,
                    method: 'alchemy_getAssetTransfers',
                    params: [{
                        fromBlock: '0x0',
                        toBlock: 'latest',
                        fromAddress: userAddress,
                        contractAddresses: [USDT_CONTRACT],
                        category: ['erc20'],
                        maxCount: '0x32', // 50 in hex
                        order: 'desc', // Most recent first
                        withMetadata: true // Include timestamps
                    }]
                })
            })
        ])

        const incomingData = await incomingResponse.json()
        const outgoingData = await outgoingResponse.json()

        if (incomingData.error) {
            console.error('Alchemy API error (incoming):', incomingData.error)
            throw new Error(incomingData.error.message || 'Failed to fetch incoming transfers')
        }

        if (outgoingData.error) {
            console.error('Alchemy API error (outgoing):', outgoingData.error)
            throw new Error(outgoingData.error.message || 'Failed to fetch outgoing transfers')
        }

        const incomingTransfers = incomingData.result?.transfers || []
        const outgoingTransfers = outgoingData.result?.transfers || []

        console.log('✅ Alchemy API response:', {
            incoming: incomingTransfers.length,
            outgoing: outgoingTransfers.length,
            total: incomingTransfers.length + outgoingTransfers.length
        })

        // Tag transfers with their type BEFORE combining
        const taggedIncoming = incomingTransfers.map((t: any) => ({ ...t, transferType: 'Deposit' }))
        const taggedOutgoing = outgoingTransfers.map((t: any) => ({ ...t, transferType: 'Withdraw' }))

        // Combine and sort by block number (most recent first)
        const allTransfers = [...taggedIncoming, ...taggedOutgoing]
            .sort((a, b) => {
                const blockA = parseInt(a.blockNum, 16)
                const blockB = parseInt(b.blockNum, 16)
                return blockB - blockA
            })
            .slice(0, 50)

        // Format transactions for display
        const transactions = allTransfers.map((transfer: any) => {
            const date = transfer.metadata?.blockTimestamp
                ? new Date(transfer.metadata.blockTimestamp).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                }).replace(',', ', ')
                : 'Recent'

            return {
                type: transfer.transferType, // Use the pre-tagged type
                amount: `${transfer.value || '0'} USDT`,
                date: date,
                hash: transfer.hash,
                blockNumber: transfer.blockNum
            }
        })

        console.log('💾 Formatted', transactions.length, 'transactions:', {
            deposits: transactions.filter(t => t.type === 'Deposit').length,
            withdraws: transactions.filter(t => t.type === 'Withdraw').length
        })
        return transactions

    } catch (error) {
        console.error('Failed to fetch transaction history from Alchemy:', error)
        throw error
    }
}
