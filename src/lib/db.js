const storePath = require('env-paths')('thepathway').data,
  Datastore = require('nedb-promises'),
  path = require('path')

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

module.exports = {
  insertRoutes: x => Promise.all(Object.values(x).map(r => routesDB.insert(r).catch(() => {}))),

  getNode: id => routesDB.findOne({
    id
  }),
  getAdjacent: async id => (await module.exports.getNode(id)).adj,

  isTileDownloaded: async id => (await miscDB.findOne({
    id: "tiles_downloaded"
  })).tiles.includes(id),
  markTileDownloaded: x => miscDB.update({
    id: "tiles_downloaded"
  }, {
    $addToSet: {
      tiles: x
    }
  })
}