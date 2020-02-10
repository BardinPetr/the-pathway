const storePath = require('env-paths')('thepathway').data,
  Datastore = require('nedb'),
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

const upadteRoute = (node, cb) => routesDB.update({
  id: node[0].id
}, {
  $push: {
    adj: node[1].id
  }
}, cb);

module.exports = {
  insertRoutes: (x, reverible) => Promise.all(x.map(node => new Promise((resolvedb, rejectdb) =>
    upadteRoute(node, () => reverible && upadteRoute(node.reverse(), err => err ? rejectdb(err) : resolvedb()) || resolvedb())))),

  updateRoutes: x => ,

  getAdjacent: id => new Promise((resolve, reject) => routesDB.findOne({
    id
  }, (err, data) => err ? reject(err) : resolve(data.adj))),

  getNode: async id => new Promise((resolve, reject) => routesDB.findOne({
    id
  }, (err, data) => err ? reject(err) : resolve({
    id: data.id,
    geo: data.geo
  }))),

  isTileDownloaded: async id => new Promise((resolve, reject) => miscDB.findOne({
    id: "tiles_downloaded"
  }, (err, data) => err ? reject(err) : resolve(data && data.tiles.includes(id)))),
  markTileDownloaded: async x => new Promise((resolve, reject) => miscDB.update({
    id: "tiles_downloaded"
  }, {
    $push: {
      tiles: x
    }
  }, err => err ? reject(err) : resolve())),
}