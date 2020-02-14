// import {
// ipcRenderer
// } from 'electron'
// import 'index.css'

const {
  ipcRenderer,
  remote
} = require('electron')

mapboxgl.accessToken = remote.app.MAPBOX_TOKEN

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v11',
  center: [37.622504, 55.753215],
  zoom: 15
});
map.on('click', addMarker);



var geocoderA = new MapboxGeocoder({
  accessToken: mapboxgl.accessToken,
  language: 'ru-RU',
  mapboxgl: mapboxgl
});

var geocoderB = new MapboxGeocoder({
  accessToken: mapboxgl.accessToken,
  language: 'ru-RU',
  mapboxgl: mapboxgl
});

// map.addControl(geocoderA);
// map.addControl(geocoderB);



function addRoute(coords) {
  if (map.getSource('route')) {
    map.removeLayer('route')
    map.removeSource('route')
  } else {
    map.addLayer({
      id: "route",
      type: "line",
      source: {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: coords
          }
        }
      },
      layout: {
        "line-join": "round",
        "line-cap": "round"
      },
      paint: {
        "line-color": "#9818d6",
        "line-width": 8,
        "line-opacity": 0.8
      }
    });
  };
}

ipcRenderer.on('route:result', (event, res) => {
  console.log(res)
  res = res.map(x => x.reverse())
  addRoute(res)
  map.flyTo({
    center: res.reduce((prev, cur) => [prev[0] + cur[0], prev[1] + cur[1]], [0, 0]).map(x => x / res.length)
  })
})

ipcRenderer.on('route:update', (event, res) => {
  console.log(res)
})

ipcRenderer.on('route:failed', (event, res) => {
  console.log(res)
})

setTimeout(() => {
  ipcRenderer.send('route:request', [
    [55.760358, 37.621166],
    [55.761806, 37.617456]
  ])
}, 3000);