const { Command } = require('commander');
const program = new Command();

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

const look = async (dpath) => {
    console.log(dpath)
}

program.parse();
