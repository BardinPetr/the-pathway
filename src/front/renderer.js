// import {
// ipcRenderer
// } from 'electron'
// import 'index.css'
const {
  ipcRenderer,
  remote
} = require('electron')

var map, control, requestCoords = [null, null]

ymaps.ready(() => {
  map = new ymaps.Map('map', {
    center: [55.76, 37.64],
    zoom: 14,
    controls: ["routePanelControl"]
  })

  control = map.controls.get('routePanelControl')

  control.routePanel.state.set({
    type: 'car',
    fromEnabled: true,
    toEnabled: true
  })

  control.routePanel.options.set({
    allowSwitch: false,
    reverseGeocoding: true,
    types: {
      car: true
    }
  })

  control.routePanel.getRouteAsync().then(multiRoute => {
    multiRoute.options.set({
      routeStrokeColor: "#00000000",
      routeActiveStrokeColor: "#00000000"
    })
    multiRoute.model.events.add('requestsuccess', function () {
      var activeRoute = multiRoute.getActiveRoute()
      if (activeRoute) {
        var cur = 0
        multiRoute.getWayPoints().each(x => requestCoords[cur++] = x.geometry._coordinates)
      }
    })
  })


  var routeButton = new ymaps.control.Button({
    data: {
      content: "Проложить маршрут",
      title: "Проложить маршрут"
    },
    options: {
      selectOnClick: false,
      maxWidth: 160
    }
  })
  routeButton.events.add('click', () => {
    console.log(requestCoords);
    if (requestCoords[0] && requestCoords[1]) {
      ipcRenderer.send('route:request', requestCoords)
    } else {
      alert('Выберите точки начала и назначения')
    }
  })
  map.controls.add(routeButton)
})


ipcRenderer.on('route:result', (event, res) => {
  console.log(res)
  map.geoObjects
    .removeAll()
    .add(new ymaps.Polyline(res, {}, {
      strokeColor: "#3386c0",
      strokeWidth: 5,
      strokeOpacity: 0.5
    }))
})

ipcRenderer.on('route:update', (event, res) => {
  console.log(res)
})

ipcRenderer.on('route:failed', (event, res) => {
  console.log(res)
})