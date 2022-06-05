import { existsSync, mkdirSync } from 'fs'

import Database from 'better-sqlite3'

import lib from './lib/dmap/dmap.js'
import { rpc }  from './rpc.js'

let   config
let   db
let   last
const lots = []
const slot_idx = 0
const save_idx = 1

export const locktopus = {}

locktopus.set_config = (new_config) => {
    config = new_config
}

locktopus.init_db = (dir) => {
    if (!existsSync(dir)) mkdirSync(dir)
    db = new Database(`${dir}/locktopus.sqlite`, { verbose: console.log })
    const create = db.prepare("CREATE TABLE IF NOT EXISTS locks(" +
        "'when' INTEGER, 'slot' TEXT PRIMARY KEY, 'zone' TEXT, 'name' TEXT, 'meta' TEXT, 'data' TEXT )")
    create.run();

    lib.get = locktopus.monk_get.bind(null, db, lib.get)
}

locktopus.init_last = async () => {
    const block = await rpc.getBlock(config.eth_rpc, 'latest')
    last = block.timestamp
}

locktopus.look = async (path) => {
    const dmap = await rpc.getFacade(config.eth_rpc, db)
    const trace = await lib.walk2(dmap, path);
    let [meta, data] = trace.slice(-1)[0]
    if (lots.some(s => s[save_idx] === true)) await locktopus.save(trace, path)
    console.log(`meta: ${meta}\ndata: ${data}`)
}

locktopus.monk_get = async (db, orig, dmap, slot) => {
    let meta, data
    const stmt = db.prepare('SELECT * FROM locks WHERE slot = ?')
    const lock = stmt.get(slot)
    lots.push([slot, lock === undefined])
    if (lock === undefined) {
        if (last === undefined) await locktopus.init_last();
        [meta, data] = await orig(dmap, slot)
    } else {
        meta = lock.meta
        data = lock.data
    }
    return [meta, data]
}

locktopus.save = async (trace, path) => {
    const skipped = ![':', '.'].includes(path.charAt(0))
    const add_rune = path.length > 0 && skipped
    if (add_rune) path = ':' + path
    const names = path.split(/[:.]/)
    for (const [i, slot] of lots.entries()) {
        const [meta, data] = trace[i]
        const lock_byte = lib._hexToArrayBuffer(meta)[31]
        if ((lock_byte & lib.FLAG_LOCK) === 0) return
        if (!slot[save_idx]) continue

        const stored_zone = i === 0 ? lib.address : trace[i - 1][1]
        const zone = '0x' + '00'.repeat(12) + stored_zone.slice(2, 42)
        const hex_name = lib._strToHex(names[i])
        const fill = 64 - hex_name.length
        const name = '0x' + hex_name + '0'.repeat(fill)
        let when = 0
        if (i > 0) {
            const topics = [zone, name, null, null]
            let events = await rpc.getPastEvents(config.eth_rpc, lib.address, topics)
            const blocknum = event => parseInt(event.blockNumber)
            events.sort((e1, e2) => blocknum(e2) - blocknum(e1))
            const block = await rpc.getBlock(config.eth_rpc, events[0].blockNumber)
            when = parseInt(block.timestamp)
        }

        const event_age = last - when
        if (event_age < config.finality) return
        const sql_str = 'INSERT INTO locks VALUES (@when, @slot, @zone, @name, @meta, @data)'
        const insert = db.prepare(sql_str)
        insert.run({when: when, slot: slot[slot_idx], zone: zone, name: name, meta: meta, data: data})
    }
}

locktopus.close = () => {
    db.close()
}
