const util = require('./utils.js'),
  parse = require('osm-read').parse,
  axios = require('axios'),
  db = require('./db.js'),
  c = require('chalk'),
  fs = require('fs')

const log = console.log

const downloadTempFile = url => {
  log(c `{green.dim Downloading started {italic ${url}} }`)
  return Promise.resolve('/tmp/thepathway.tile.6776.osm')
  let p = `/tmp/thepathway.tile.${Math.round(Math.random() * 10000)}.osm`
  // console.log(p)
  return axios.get(url).then(response => new Promise((resolve, reject) => {
    fs.writeFileSync(p, response.data)
    resolve(p)
  }))
}

const loadTile = async (lat, lon) => {
  let [x, y] = util.coords2tile(lat, lon, util.baseZoom)
  let id = `${x}.${y}.${util.baseZoom}`
  let url = `http://api.openstreetmap.org/api/0.6/map?bbox=${util.tileEdges(x, y, util.baseZoom).join(',')}`
  let timeStart = new Date().getTime()
  if (!(await db.isTileDownloaded(id))) {
    log(c `{green.dim Processing tile {bold ID${id}} started --- {italic center at ${lat} ${lon}}}`)
    return downloadTempFile(url)
      .then(tmpPath => (new Promise((resolve, reject) => {
        log(c `{green Download tile {bold ID${id}} finished}`)
        let res = {}
        parse({
          filePath: tmpPath,
          error: reject,
          format: 'xml',
          endDocument: function () {
            log(c `{green Parse tile {bold ID${id}} finished --- {blue Took ${new Date().getTime() - timeStart}ms}}`)
            resolve(res)
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
      .then(async (ways) => {
        let timeStart = new Date().getTime()
        log(c `{green.dim Saving tile {bold ID${id}} to DB --- {magenta ${Object.keys(ways).length} elements}}`);
        await db.insertRoutes(ways)
        await db.markTileDownloaded(id)
        log(c `{magenta Processing tile {bold ID${id}} finished --- {blue Saving took ${new Date().getTime() - timeStart}ms}}`)
      })
  } else {
    log(c `{yellow.dim Already processed tile {bold ID${id}}}`)
  }
}

(async () => {
  // console.log(util.tileEdges(...util.coords2tile(55.558359, 37.499271, 15), 15))
  // await loadTile(55.574354, 37.429566)
  // log(await db.isTileDownloaded("19792.10276.15"))
})()