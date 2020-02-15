const {
  ipcRenderer,
  remote
} = require('electron')

import './index.css'
import 'jquery'
import * as toastr from 'toastr'

let map, control, requestCoords = [null, null],
  activeRoute

ymaps.ready(() => {
  toastr.warning('Данное программное обеспечение производит расчет маршрутов на вашем компьютере, поэтому не следует строить маршруты более 5км, т.к. тайлы весят много и грузятся долго', 'ВНИМАНИЕ', {
    timeOut: 10000
  })
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
      routeActiveStrokeColor: "#B0000000"
    })
    multiRoute.model.events.add('requestsuccess', function () {
      activeRoute = multiRoute.getActiveRoute()
      if (activeRoute) {
        console.log(activeRoute);
        console.log(multiRoute);
        multiRoute.getWayPoints().each(x => {
          requestCoords[x.properties._data.index] = x.geometry._coordinates
        })
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
    map.geoObjects.removeAll()
    if (requestCoords[0] && requestCoords[1]) {
      ipcRenderer.send('route:request', requestCoords)
    } else {
      toastr.error('Выберите точки начала и назначения')
    }
  })
  map.controls.add(routeButton)
})


ipcRenderer.on('route:result', (event, res) => {
  map.geoObjects
    .removeAll()
  if (res.length === 0) {
    return toastr.error('Вероятно, на картах OpenStreetMap не нашлось подходящих нод для вашего маршрута', 'Ошибка построения')
  }
  toastr.success('Маршрут успешно построен!')
  console.log(res)
  map.geoObjects
    .add(new ymaps.Polyline(res, {}, {
      strokeColor: "#3386c0",
      strokeWidth: 5,
      strokeOpacity: 1
    }))
})

ipcRenderer.on('route:update', (event, res) => {
  if (res.type == 0) {
    toastr.success('Обработка маршрута начата')
    toastr.info('Загрузка тайлов')
  } else if (res.type == 1) {
    toastr.success('Начат роутинг')
  }
})

ipcRenderer.on('route:failed', (event, res) => {
  toastr.error('Вероятно, на картах OpenStreetMap не нашлось подходящих нод для вашего маршрута', 'Ошибка построения')
  console.log(event)
  console.log(res)
})