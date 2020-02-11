const storePath = require('env-paths')('thepathway').data,
  Datastore = require('nedb-promises'),
  utils = require('./utils.js'),
  path = require('path'),
  c = require('chalk')

const log = console.log

const routesDB = new Datastore({
  filename: path.join(storePath, 'thepathway', 'routes.db'),
  autoload: true
});
routesDB.ensureIndex({
  fieldName: 'id',
  unique: true
});

const miscDB = new Datastore({
  filename: path.join(storePath, 'thepathway', 'misc.db'),
  autoload: true
});

miscDB.count({
  id: "tiles_downloaded"
}).then(x => x == 0 && miscDB.insert({
  id: "tiles_downloaded",
  tiles: []
}))

const insertRoutes = x => Promise.all(Object.values(x).map(r => routesDB.insert(r).catch(() => {})))

const getNode = id => routesDB.findOne({
  id
})

const getNodesInArea = (lat1, lon1, lat2, lon2) => routesDB.find({
  "geo.lat": {
    $gt: Math.min(lat1, lat2),
    $lt: Math.max(lat1, lat2),
  },
  "geo.lon": {
    $gt: Math.min(lon1, lon2),
    $lt: Math.max(lon1, lon2),
  },
  $not: {
    "adj": {
      $size: 0
    }
  }
})

const getAllNodes = () => routesDB.find({
  $not: {
    "adj": {
      $size: 0
    }
  }
})

const getAdjacent = async id => (await module.exports.getNode(id)).adj

const isTileDownloaded = async id => (await miscDB.findOne({
  id: "tiles_downloaded"
})).tiles.includes(id)

const markTileDownloaded = x => miscDB.update({
  id: "tiles_downloaded"
}, {
  $addToSet: {
    tiles: x
  }
})

const nearestNode = async (lat, lon) => {
  let variants = await getNodesInArea(...utils.tileEdges(...utils.coords2tile(lat, lon, 20), 20));
  return variants.sort((a, b) => utils.dist([lat, lon], [a.geo.lat, a.geo.lon]) - utils.dist([lat, lon], [b.geo.lat, b.geo.lon]))[0]
}

module.exports = {
  nearestNode,
  getAdjacent,
  getAllNodes,
  getNode,
  getNodesInArea,
  getAdjacent,
  isTileDownloaded,
  markTileDownloaded,
  insertRoutes
}