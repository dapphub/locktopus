import { exec } from "node:child_process"
import { copyFileSync, rmSync } from 'node:fs'

const meta_bench = "meta: 0x0000000000000000000000000000000000000000000000000000000000000001"
const data_bench = "data: 0xf151b2c51f0885684a502d9e901846d9ffce3d4a000000000000000000000000"

const rmdb =()=> {
    rmSync("test/integration/fail_config/locktopus.sqlite", {force: true})
    rmSync("test/integration/pass_config/locktopus.sqlite", {force: true})
}

describe('use real dmap, set your eth RPC url at test/integration/pass_config/config.jams', () => {
    beforeAll(() => {
        rmdb()
    })

    afterAll(() => {
        rmdb()
    })

    it('use ethereum', done => {
        exec('node index.js --dir "./test/integration/pass_config" walk ":free"', (error, stdout, stderr) => {
            expect(stderr).toEqual('')
            expect(stdout).toEqual(expect.stringContaining(meta_bench))
            expect(stdout).toEqual(expect.stringContaining(data_bench))
            done()
        })
    })

    it('use cache', done => {
        copyFileSync('test/integration/pass_config/locktopus.sqlite',
                     'test/integration/fail_config/locktopus.sqlite')

        exec('node index.js --dir "./test/integration/fail_config" walk ":free"', (error, stdout, stderr) => {
            expect(stderr).toEqual('')
            expect(stdout).toEqual(expect.stringContaining(meta_bench))
            expect(stdout).toEqual(expect.stringContaining(data_bench))
            done()
        })
    })
})
