import { jest } from '@jest/globals'
import { rpc } from "../rpc"
import { dummy_url } from './test-constants'

beforeEach(() => {
    jest.clearAllMocks()
})

test('get block', async () => {
    rpc.makeRPC = jest.fn()
    await rpc.getBlock(dummy_url, '10')
    expect(rpc.makeRPC).toHaveBeenCalledWith(dummy_url, "eth_getBlockByNumber", ['10', false])
})

test('get past events', async () => {
    rpc.makeRPC = jest.fn()
    const address = '0x' + '00'.repeat(20)
    const topics = ["a", "b"]
    await rpc.getPastEvents(dummy_url, address, topics)
    expect(rpc.makeRPC).toHaveBeenCalledWith(dummy_url, "eth_getLogs", [{
        address: address,
        topics: topics,
        fromBlock: '0xe02db4',
        toBlock: 'latest'
    }])
})

test('get storage', async () => {
    rpc.makeRPC = jest.fn()
    const address = '0x' + '00'.repeat(20)
    const slot = 0
    await rpc.RPCGetStorage(dummy_url, address, slot)
    expect(rpc.makeRPC).toHaveBeenCalledWith(
        dummy_url,
        "eth_getStorageAt",
        [address, slot, 'latest']
    )
})
