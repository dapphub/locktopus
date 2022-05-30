import { Command } from 'commander'
import  lib  from './lib/dmap/dmap.js'
import  { rpc }   from './rpc.js'
import { jams } from './lib/jams/jams.js'
import { readFileSync } from 'fs'
const program = new Command();

// TODO: DMFXYZ Should move this to a config provider that defaults to home directory
// and allows optional flag for custom config path
const config = jams(readFileSync("./config.jams", {encoding: 'utf-8'}))

program
    .name('dmap')
    .description('dmap interface tools')
    .version('0.1.0');

program.command('walk')
    .description('Read a value from a dpath with caching')
    .argument('<string>', 'dpath to read')
    .action((dpath) => {
        look(dpath)
    });

const seek = (path) => {
    let hit = false
    let meta, data
    return [hit, meta, data]
}

const save = (trace) => {
    console.log(trace)
}

const look = async (path) => {
    let [hit, meta, data] = seek(path)
    if (!hit) {
        const dmap = await rpc.getFacade(config.eth_rpc);
        const trace = await lib.walk2(dmap, path);
        [meta, data] = trace.slice(-1)
        save(trace)
    }
    console.log(meta, data)
}

program.parse();
