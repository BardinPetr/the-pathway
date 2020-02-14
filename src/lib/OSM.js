const util = require('./utils.js'),
  parse = require('osm-read').parse,
  {
    log,
    c
  } = require('./log'),
  axios = require('axios'),
  db = require('./db.js'),
  fs = require('fs')

const downloadTempFile = url => {
  log(c `{green.dim Downloading started {italic ${url}} }`)
  let p = `/tmp/thepathway.tile.${Math.round(Math.random() * 10000)}.osm`
  return axios.get(url).then(response => new Promise((resolve, reject) => {
    fs.writeFileSync(p, response.data)
    resolve(p)
  }))
}

const loadTileRel = async (x, y) => {
  let id = `${x}.${y}.${util.baseZoom}`
  let timeStart = new Date().getTime()
  if (!(await db.isTileDownloaded(id))) {
    log(c `{green.dim Processing tile {bold ID${id}} started}`)
    return downloadTempFile(util.tileURL(x, y))
      .then(tmpPath => (new Promise((resolve, reject) => {
        log(c `{green Download tile {bold ID${id}} finished}`)
        let res = {},
          nodes = {}
        parse({
          filePath: tmpPath,
          error: reject,
          format: 'xml',
          endDocument: function () {
            log(c `{green Parse tile {bold ID${id}} finished --- {blue Took ${new Date().getTime() - timeStart}ms}}`)
            resolve(res)
          },
          node: function (x) {
            nodes[x.id] = {
              id: x.id,
              geo: {
                lat: x.lat,
                lon: x.lon
              },
              adj: []
            }
          },
          way: function (v) {
            if (v.tags.highway && util.carAvailableTypes.includes(v.tags.highway.replace('_link', ''))) {
              util.sliding_window(v.nodeRefs, 2).map(w => {
                if (!res[w[0]]) res[w[0]] = nodes[w[0]]
                res[w[0]].adj.push(w[1])
                if (v.tags.oneway === 'yes') {
                  if (!res[w[1]]) res[w[1]] = nodes[w[1]]
                  res[w[1]].adj.push(w[0])
                }
              })
            } else {
              v.nodeRefs.map(w => delete res[w])
            }
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
    // log( `{yellow.dim Already processed tile {bold ID${id}}}`)
    return Promise.resolve()
  }
}

const loadTile = async (lat, lon) => {
  let [x, y] = util.coords2tile(lat, lon, util.baseZoom)
  await loadTileRel(x, y)
}

const dirs = [
  [1, 1],
  [-1, -1],
  [1, -1],
  [-1, 1],
  [0, 1],
  [0, -1],
  [-1, 0],
  [1, 0]
]
const preloadArea = async (start, end) => {
  let timeStart = new Date().getTime()
  let d = Math.ceil(util.dist(start, end) / 0.5)
  let dlat = (start[0] - end[0]) / d,
    dlon = (start[1] - end[1]) / d
  let proms = []
  log(c `{green.dim Starting preloading {reset ${d + 16}} tiles}`)

  for (let i = 0; i < d; i++) {
    proms.push(async () => await loadTile(...start))
    start[0] += dlat
    start[1] += dlon
  }

  let [x0, y0] = util.coords2tile(...start, util.baseZoom)
  let [x1, y1] = util.coords2tile(...end, util.baseZoom)
  proms.push(...dirs.map(async dir => await loadTileRel(x0 + dir[0], y0 + dir[1])))
  proms.push(...dirs.map(async dir => await loadTileRel(x1 + dir[0], y1 + dir[1])))

  await Promise.all(proms)
  log(c `{magenta Preloading tiles finished --- Took ${new Date().getTime() - timeStart}ms}`)
}

const realRoadMatch = async path => {
  require('dotenv').config()
  return [].concat(...(await Promise.all(path.reduce((p, c) => {
    p[p.length - 1].length < 99 ? p[p.length - 1].push(c) : p.push([c])
    return p
  }, [
    []
  ]).map(async x => {
    try {
      return (await axios.get(`https://api.mapbox.com/matching/v5/mapbox/driving/${x.map(y => y.reverse().join(',')).join(';')}?steps=true&geometries=geojson&radiuses=${x.map(() => '10').join(';')}&access_token=${process.env.ACCESS_TOKEN}`))
        .data.matchings[0].geometry.coordinates.map(y => y.reverse())
    } catch {
      return path
    }
  }))))
}

module.exports = {
  preloadArea,
  loadTileRel,
  loadTile,
  realRoadMatch
}

// (async () => {
//   log(await mapMatch([
//     [55.743164, 37.600913],
//     [55.742151, 37.603242]
//   ]))
// })()

// console.log(util.tileEdges(...util.coords2tile(55.557587, 37.422576, 15), 15))
// await loadTile(55.557536, 37.422674)
// log(await db.isTileDownloaded("19792.10276.15"))

// setTimeout(async () => {
// let timeStart = new Date().getTime()
// await db.getAdjacent("6255798901")
// log(await db.findNearest(55.557536, 37.422674))
// await db.getAdjacent("6187570782")
// await db.getAdjacent("6187571470")
// await db.getAdjacent("6255798923")
// const cache = await db.getAllNodes()
// log(util.coords2tile(55.557587, 37.422576, 15))
// await preloadArea([55.557587, 37.422576], [55.558175, 37.561866])

// log( `{magenta ${new Date().getTime() - timeStart}ms}`)
// timeStart = new Date().getTime()

// cache.sort((a, b) => util.dist(55.557536, 37.422674, a.geo.lat, a.geo.lon) - util.dist(55.557536, 37.422674, b.geo.lat, b.geo.lon))[0]

// log( `{magenta ${new Date().getTime() - timeStart}ms}`)
// }, 5000)
// })()