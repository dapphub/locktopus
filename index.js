import process from 'node:process'
import { Command } from 'commander'
import Database from 'better-sqlite3'
import lib from './lib/dmap/dmap.js'
import { rpc }  from './rpc.js'
import { jams } from 'jams.js'
import { existsSync, mkdirSync, readFileSync } from 'fs'
import os from 'os'

let config
let db
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

program.command('walk')
    .description('Read a value from a dpath with caching')
    .argument('<string>', 'dpath to read')
    .action((dpath) => {
        look(dpath)
    });

const init_db = (dir) => {
    if (!existsSync(dir)) mkdirSync(dir)
    db = new Database(`${dir}/locktopus.sqlite`, { verbose: console.log })
    const create = db.prepare("CREATE TABLE IF NOT EXISTS locks(" +
        "'when' INTEGER, 'zone' TEXT, 'name' TEXT,'path' TEXT PRIMARY KEY, 'meta' TEXT, 'data' TEXT )")
    create.run();
}

const seek = (path) => {
    let miss = true
    let meta, data
    const stmt = db.prepare('SELECT * FROM locks WHERE path = ?')
    const lock = stmt.get(path)
    if (lock !== undefined) {
        miss = false
        meta = lock.meta
        data = lock.data
    }
    return [miss, meta, data]
}

const save = (meta, data, trace, path, when) => {
    if ((lib._hexToArrayBuffer(meta)[31] & lib.FLAG_LOCK) === 0) return
    const zone = trace.length > 1 ? trace.slice(-2)[0][1] : '0x' + '0'.repeat(64)
    const name = path.split(/[:.]/).slice(-1)[0]
    const insert = db.prepare('INSERT INTO locks VALUES (@when, @zone, @name, @path, @meta, @data)')
    insert.run({ when: when, zone: zone, name: name, path: path, meta: meta, data: data })
}

const look = async (path) => {
    let [miss, meta, data] = seek(path)
    if (miss) {
        let when = 0
        const dmap = await rpc.getFacade(config.eth_rpc)
        const trace = await lib.walk2(dmap, path);
        [meta, data] = trace.slice(-1)[0]
        save(meta, data, trace, path, when)
    }
    console.log(`meta: ${meta}\ndata: ${data}`)
}

process.on('exit', () => db.close())
program.parse();
