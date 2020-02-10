// Credit to wiki.openstreetmap.org

const rad = x => x * Math.PI / 180
const m2c = x => Math.atan(Math.sinh(x)) / Math.PI * 180

const nTiles = x => Math.pow(2, x)

module.exports = {
  carAvailableTypes: ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'minor', 'residential', 'service', 'living_street', 'track', 'road'],
  sliding_window: (x, y) => x.reduce((acc, _, index, arr) => (index + y > arr.length) ? acc : acc.concat([arr.slice(index, index + y)]), []),

  dist: (lat1, lon1, lat2, lon2) => {
    var dLat = rad(lat2 - lat1);
    var dLon = rad(lon2 - lon1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(rad(lat1)) * Math.cos(rad(lat2));
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371 * c;
  },

  coords2tile: (lat, lon, zoom) => [
    (lon + 180) / 360, (1 - Math.log(Math.tan(rad(lat)) + 1 / Math.cos(rad(lat))) / Math.PI) / 2
  ].map(x => Math.round(x * nTiles(zoom))),
  tileEdges: (x, y, zoom) => {
    let lat1r = y / nTiles(zoom)
    let lon1 = x * 360 / nTiles(zoom) - 180
    return [lon1, m2c(Math.PI * (1 - 2 * (lat1r + 1 / nTiles(zoom)))), lon1 + 360 / nTiles(zoom), m2c(Math.PI * (1 - 2 * lat1r))]
  },
  baseZoom: 15
}