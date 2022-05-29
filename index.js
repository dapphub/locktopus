const { Command } = require('commander');
const lib = require('./lib/dmap/dmap.js')
const rpc = require('./rpc.js')
const program = new Command();
const config_URL_todo = 'https://mainnet.infura.io/v3/c0a739d64257448f855847c6e3d173e1'

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

const look = async (path) => {
    let [hit, meta, data] = seek(path)
    if (!hit) {
        const dmap = await rpc.getFacade(config_URL_todo);
        ({meta, data} = await lib.walk(dmap, path))
    }
    console.log(meta, data)
}

program.parse();
