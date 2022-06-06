import { jest } from '@jest/globals'
import { locktopus } from '../locktopus.js'
import { dummy_url, dummy_trace, dummy_events } from './test-constants.js'
import { rpc } from '../rpc.js'
import lib from '../lib/dmap/dmap.js'
import fs from 'fs'
import Database from 'better-sqlite3/lib/database'

rpc.makeRPC = jest.fn()
const original_get = lib.get
const original_walk2 = lib.walk2

beforeEach(() => {
    locktopus.set_config({'eth_rpc': dummy_url, 'finality': '60'})
    return locktopus.init_db('./testdb')

})

afterEach(() => {
    lib.get = original_get
    lib.walk2 = original_walk2
    rpc.makeRPC.mockReset()
    return Promise.all([locktopus.close(),  fs.promises.rmdir('./testdb', {recursive: true, force: true})])
})

test('test init last', async () => {
    //await locktopus.init_db('./testdb')
    rpc.makeRPC.mockReturnValueOnce({"timestamp": '1'})
    const getBlock = jest.spyOn(rpc, 'getBlock')
    await locktopus.init_last()
    expect(getBlock).toHaveBeenCalledWith(dummy_url, 'latest')
    expect(rpc.makeRPC).toHaveBeenCalledWith(
        dummy_url,
        "eth_getBlockByNumber",
        ['latest', false]
    )
})


test('test look', async () => {
    // Setup mock blocks, traces, and events
    const mock_blocks = jest.fn().mockReturnValueOnce({timestamp: '0x629ce77e'}).mockReturnValueOnce({timetsamp: '0x626e72ea'})
    const mock_get = jest.fn().mockReturnValueOnce(dummy_trace[0])
    .mockReturnValueOnce(dummy_trace[1])
    .mockReturnValueOnce(dummy_trace[2])
    const mock_events = jest.fn().mockReturnValue(dummy_events)

    // Set mocks and re-init db and re-init last
    lib.get = mock_get
    rpc.getPastEvents = mock_events
    rpc.getBlock = mock_blocks
    await locktopus.init_db('./testdb')
    await locktopus.init_last() // sets last to '0x629ce77e'. TODO <optional> set this to live epoch seconds

    // Test that save is called
    const save = jest.spyOn(locktopus, 'save')
    await locktopus.look('free.bird')
    expect(save).toHaveBeenCalledWith(dummy_trace, 'free.bird')

    // Test that locked root and free entries are in db
    const db = new Database('./testdb/locktopus.sqlite')
    const select_stmt = db.prepare('SELECT * FROM locks WHERE slot = ?')
    const root_entry = select_stmt.get('0x' + '00'.repeat(32))
    expect(root_entry.meta).toBe(dummy_trace[0][0])
    expect(root_entry.data).toBe(dummy_trace[0][1])
    // hash of root zone and free name (could also hash this live)
    const free_slot = "0x6e2ef1eeed78634415701b77ed3a9ece31559d92745267d12e36ff7faf49ce96"
    const free_entry = select_stmt.get(free_slot)
    expect(free_entry.meta).toBe(dummy_trace[1][0])
    expect(free_entry.data).toBe(dummy_trace[1][1])
})

