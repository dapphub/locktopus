import os from 'os'
import process from 'node:process'
import { fileURLToPath } from "url";
import { readFileSync } from 'fs'

import { Command } from 'commander'
import { jams } from 'jams.js'

import { locktopus } from './locktopus.js'

const program = new Command()

program
    .name('dmap')
    .description('dmap interface tools')
    .version('0.1.0')
    .option('-d, --dir <string>', 'path to locktopus database and config file',
            `${os.homedir()}/.locktopus`)
    .hook('preAction', (_, __) => {
        const config = jams(readFileSync(`${program.opts().dir}/config.jams`, {encoding: 'utf-8'}))
        locktopus.set_config(config)
        locktopus.init_db(program.opts().dir)
    });

program
    .command('walk')
    .description('Read a value from a dpath with caching')
    .argument('<string>', 'dpath to read')
    .action((dpath) => {
        locktopus.look(dpath)
    });

process.on('exit', () => locktopus.close())
// Only run if called as main program
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    program.parse();
}
