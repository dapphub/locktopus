# locktopus

## Core term

`[ when zone name path meta data ]`

- `when`: time entry was locked in the dmap (last event block time)
- `zone`: dmap namezone
- `name`: the key that was set
- `path`: the dpath
- `meta`: the metadata, bit 0 is lock flag
- `data`: the data

## Core rule

Only add values that are locked in the dmap.

## Config

```
~/.locktopus/
    config.jams
    locktopus.sqlite
```

`config.jams`
```
{
  eth_rpc  <url>
  finality <seconds> // time from lock time to last confirmed block time
}
```

## Command

The locktopus is a cache for `dmap walk` and other dmap resolvers.
In this repo make a command with just `dmap walk <dpath>`, and have
it resolve via locktopus if entry is cached, otherwise look it up
and cache it if locked.

```
dmap walk <dpath>
```

Returns:

```
meta: ...
data: ...
```