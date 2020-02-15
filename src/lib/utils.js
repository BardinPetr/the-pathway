// Credit to wiki.openstreetmap.org

const rad = x => x * Math.PI / 180
const m2c = x => Math.atan(Math.sinh(x)) / Math.PI * 180

const nTiles = x => Math.pow(2, x)

module.exports = {
  baseZoom: 15,
  carAvailableTypes: ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'minor', 'residential', 'service', 'living_street', 'track', 'road'],
  sliding_window: (x, y) => x.reduce((acc, _, index, arr) => (index + y > arr.length) ? acc : acc.concat([arr.slice(index, index + y)]), []),

  m2dlat: x => x / 110574,
  m2dlon: (x, lat) => x / (111320 * Math.cos(rad(lat))),

  a2o: x => ({
    lat: x[0],
    lon: x[1]
  }),
  o2a: x => [x.lat, x.lon],

  dist: (a, b) => {
    var dLat = rad(b[0] - a[0]);
    var dLon = rad(b[1] - a[1]);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(rad(a[0])) * Math.cos(rad(b[0]));
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371 * c;
  },

  coords2tile: (lat, lon, zoom) => [
    (lon + 180) / 360, (1 - Math.log(Math.tan(rad(lat)) + 1 / Math.cos(rad(lat))) / Math.PI) / 2
  ].map(x => Math.round(x * nTiles(zoom))),

  tileEdges: (x, y, zoom) => {
    let lat1r = y / nTiles(zoom)
    let lon1 = x * 360 / nTiles(zoom) - 180
    return [
      [m2c(Math.PI * (1 - 2 * (lat1r + 1 / nTiles(zoom)))), lon1],
      [m2c(Math.PI * (1 - 2 * lat1r)), lon1 + 360 / nTiles(zoom)]
    ]
  },

  tileURL: (x, y) => {
    let edges = module.exports.tileEdges(x, y, module.exports.baseZoom)
    return `http://api.openstreetmap.org/api/0.6/map?bbox=${[...edges[0].reverse(), ...edges[1].reverse()]}`
  },

  routeLen: path => module.exports.sliding_window(path, 2).reduce((p, c) => p + module.exports.dist(c[0], c[1]))
}