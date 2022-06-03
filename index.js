import process from 'node:process'
import { Command } from 'commander'
import Database from 'better-sqlite3'
import lib from './lib/dmap/dmap.js'
import { rpc }  from './rpc.js'
import { jams } from 'jams.js'
import { existsSync, mkdirSync, readFileSync } from 'fs'
import os from 'os'

let   config
let   db
let   last
const lots = []
const slot_idx = 0
const save_idx = 1
const program = new Command()

program
    .name('dmap')
    .description('dmap interface tools')
    .version('0.1.0')
    .option('-d, --dir <string>', 'path to locktopus database and config file',
            `${os.homedir()}/.locktopus`)
    .hook('preAction', (_, __) => {
        config = jams(readFileSync(`${program.opts().dir}/config.jams`, {encoding: 'utf-8'}))
        init_db(program.opts().dir)
    });

program
    .command('walk')
    .description('Read a value from a dpath with caching')
    .argument('<string>', 'dpath to read')
    .action((dpath) => {
        look(dpath)
    });

const init_db = (dir) => {
    if (!existsSync(dir)) mkdirSync(dir)
    db = new Database(`${dir}/locktopus.sqlite`, { verbose: console.log })
    const create = db.prepare("CREATE TABLE IF NOT EXISTS locks(" +
        "'when' INTEGER, 'slot' TEXT PRIMARY KEY, 'zone' TEXT, 'name' TEXT, 'meta' TEXT, 'data' TEXT )")
    create.run();

    lib.get = monk_get.bind(null, db, lib.get)
}

const init_last = async () => {
    const block = await rpc.getBlock(config.eth_rpc, 'latest')
    last = block.timestamp
}

const look = async (path) => {
    const dmap = await rpc.getFacade(config.eth_rpc, db)
    const trace = await lib.walk2(dmap, path);
    let [meta, data] = trace.slice(-1)[0]
    if (lots.some(s => s[save_idx] === true)) await save(trace, path)
    console.log(`meta: ${meta}\ndata: ${data}`)
}

const monk_get = async (db, orig, dmap, slot) => {
    let meta, data
    const stmt = db.prepare('SELECT * FROM locks WHERE slot = ?')
    const lock = stmt.get(slot)
    lots.push([slot, lock === undefined])
    if (lock === undefined) {
        if (last === undefined) init_last();
        [meta, data] = await orig(dmap, slot)
    } else {
        meta = lock.meta
        data = lock.data
    }
    return [meta, data]
}

const save = async (trace, path) => {
    if ( path.length > 0 && ![':', '.'].includes(path.charAt(0))) path = ':' + path
    const names = path.split(/[:.]/)
    for (const [i, slot] of lots.entries()) {
        const [meta, data] = trace[i]
        if ((lib._hexToArrayBuffer(meta)[31] & lib.FLAG_LOCK) === 0) return
        if (!slot[save_idx]) continue

        const stored_zone = i === 0 ? lib.address : trace[i - 1][1]
        const zone = '0x' + '00'.repeat(12) + stored_zone.slice(2, 42)
        const name = '0x' + lib._strToHex(names[i]) + '00'.repeat(32 - names[i].length)
        let when = 0
        if (i > 0) {
            let events = await rpc.getPastEvents(config.eth_rpc, lib.address, [zone, name, null, null])
            events.sort((e1, e2) => { return parseInt(e1.blockNumber) - parseInt(e2.blockNumber) })
            const block = await rpc.getBlock(config.eth_rpc, events.reverse()[0].blockNumber)
            when = parseInt(block.timestamp)
        }

        if (last - when < config.finality) return
        const insert = db.prepare('INSERT INTO locks VALUES (@when, @slot, @zone, @name, @meta, @data)')
        insert.run({when: when, slot: slot[slot_idx], zone: zone, name: name, meta: meta, data: data})
    }
}

process.on('exit', () => db.close())
program.parse();
