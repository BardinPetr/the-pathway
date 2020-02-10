const util = require('./utils.js'),
  parse = require('osm-read').parse,
  axios = require('axios'),
  db = require('./db.js'),
  c = require('chalk'),
  fs = require('fs')

const log = console.log

const downloadTempFile = url => {
  return Promise.resolve('/tmp/thepathway.tile.6776.osm')
  let p = `/tmp/thepathway.tile.${Math.round(Math.random() * 10000)}.osm`
  // console.log(p)
  return axios.get(url).then(response => new Promise((resolve, reject) => {
    fs.writeFileSync(p, response.data)
    resolve(p)
  }))
}

const saveWays = async x => {
  let timeStart = new Date().getTime()
  let [id, ways] = x

  return;

  log(c `{green Saving tile {bold ID${id}} to DB --- {magenta ${Object.keys(ways).length} elements}`);

  await Promise.all(ways.map(async v => {
    if (v.tags.highway && util.carAvailableTypes.includes(v.tags.highway.replace('_link', ''))) return
    await db.updateRoutes()
  }))
  await db.markTileDownloaded(id)
  log(c `{green Saving tile {bold ID${id}} finished --- {blue Took ${new Date().getTime() - timeStart}ms}}`)
}

const loadTile = async (lat, lon) => {
  let [x, y] = util.coords2tile(lat, lon, util.baseZoom)
  let id = `${x}.${y}.${util.baseZoom}`
  let url = `http://api.openstreetmap.org/api/0.6/map?bbox=${util.tileEdges(x, y, util.baseZoom).join(',')}`
  let timeStart = new Date().getTime()

  log(c `{green Downloading tile {bold ID${id}} center at {dim ${lat} ${lon}}}`)
  if (db.isTileDownloaded(id)) {
    return downloadTempFile(url)
      .then(tmpPath => (new Promise((resolve, reject) => {
        log(c `{green Download tile {bold ID${id}} finished}`)
        var res = {}
        parse({
          filePath: tmpPath,
          error: reject,
          format: 'xml',
          endDocument: function () {
            log(c `{green Parse tile {bold ID${id}} finished --- {blue Took ${new Date().getTime() - timeStart}ms}}`)
            resolve([id, res])
          },
          node: function (x) {
            res[x.id] = {
              id: x.id,
              geo: [x.lat, x.lon],
              adj: []
            }
          },
          way: function (v) {
            if (v.tags.highway && util.carAvailableTypes.includes(v.tags.highway.replace('_link', ''))) return
            util.sliding_window(v.nodeRefs, 2).map(w => {
              res[w[0]].adj.push(w[1])
              if (v.tags.oneway === 'yes') res[w[1]].adj.push(w[0])
            })
          },
        })
      })))
      .then(saveWays)
  }
}

(async () => {
  console.log(util.tileEdges(...util.coords2tile(55.557536, 37.422674, 15), 15))
  console.log(await db.isTileDownloaded('19790.10275.15'))
  await loadTile(55.557536, 37.422674)
})()