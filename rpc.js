import fetch from "node-fetch"
import lib from "./lib/dmap/dmap.js"

export let rpc = {}

rpc.makeRPC = async (url, method, params) => {
    let result = null
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "jsonrpc": "2.0",
                "method": method,
                "params": params,
                "id": 0
            }),
        });
        ({ result } = await response.json());
    }
    catch (err) {
        throw err
    }
    return result
}

rpc.RPCGetStorage = async (url, address, slot) => {
    return await rpc.makeRPC(url, "eth_getStorageAt", [address, slot, "latest"])
}

rpc.getFacade = async (url) => {
    const storageFunction = rpc.RPCGetStorage.bind(null, url)

    return { provider: { getStorageAt:storageFunction },
             address : lib.address
    }
}

// Default fromBlock to the block that the dmap object was deployed
// Will not work with light clients
rpc.getPastEvents = async(url, address, topics, fromBlock='0xe02db4', toBlock='latest') => {
    return await rpc.makeRPC(url, "eth_getLogs", [{address: address, 
        fromBlock: fromBlock, 
        toBlock: toBlock,
        topics: topics
    }])
}

rpc.getBlock = async(url, block) => {
    return await rpc.makeRPC(url, "eth_getBlockByNumber", [block, false])
}
