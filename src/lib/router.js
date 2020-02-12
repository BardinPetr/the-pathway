'use strict'

const PriorityQueue = require('js-priority-queue'),
  {
    dist,
    o2a
  } = require('./utils.js'),
  osm = require('./OSM.js'),
  db = require('./db.js'),
  c = require('chalk')

const log = console.log

module.exports.Router = class {
  constructor(callback) {
    this.callback = callback || (() => {})
  }

  async prepare(start, end) {
    this.start = start
    this.end = end

    log(c `{cyan.bold Started routing preparation from {green ${this.start.join(' ')}} to {green ${this.end.join(' ')}}}`)
    this.callback({
      type: 0
    })

    await osm.preloadArea([...this.start], [...this.end])

    log(c `{green.bold Tile preloading finished}`)

    this.start = await db.nearestNode(...this.start)
    this.end = await db.nearestNode(...this.end)

    if (!this.start || !this.end) return this.callback({
      type: -1,
      msg: "Could't find requested nodes"
    })
    log(c `{green.bold Found nearest nodes: ${this.start.id} and ${this.end.id}}`)

    this.callback({
      type: 1
    })

    this.queue = new PriorityQueue({
      comparator: (a, b) => a.p - b.p,
      initialValues: [{
        id: this.start.id,
        geo: this.start.geo,
        p: 0
      }]
    });
    this.parents = {}
    this.parents[this.start.id] = undefined
    this.costs = {}
    this.costs[this.start.id] = 0
  }

  async route() {
    log(c `{yellow.bold Routing started}`)
    let ttl = 10000000
    let nearestEndNode = {
      dist: 10e10
    }

    while (this.queue.length > 0 && (ttl--) > 0) {
      let cur = this.queue.dequeue(),
        newCost = -1

      if (cur.id == this.end.id) break;
      let curDist = dist(o2a(cur.geo), o2a(this.end.geo))
      if (nearestEndNode.dist > curDist) nearestEndNode = {
        dist: curDist,
        ...cur
      }

      if (dist(o2a(cur.geo), o2a(this.start.geo)) > 0.1) await osm.loadTile(...o2a(cur.geo))

      await Promise.all((await db.getAdjacent(cur.id)).map(async next => {
        next = await db.getNode(next)
        if (!next) return
        newCost = this.costs[cur.id] + dist(o2a(cur.geo), o2a(next.geo))
        if (!(next.id in this.costs) || (newCost < this.costs[next.id])) {
          this.costs[next.id] = newCost
          this.queue.queue({
            id: next.id,
            geo: next.geo,
            p: newCost + dist(o2a(next.geo), o2a(this.end.geo))
          })
          this.parents[next.id] = cur
        }
      }))
    }
    log(nearestEndNode)
    log(c `{magenta.bold Routing finished. Generating path}`)
    if (this.end.id in this.parents) {
      log(c `{green.bold Successfully found end node}`)
      return this.restorePath(this.end)
    } else if (nearestEndNode.dist < 0.03) {
      log(c `{yellow.bold End node not found, selecting nearest - {red ${Math.round(nearestEndNode.dist*1000)}m}}`)
      return this.restorePath(nearestEndNode)
    } else {
      log(c `{red.bold Route not found}`)
      return [];
    }
  }

  restorePath(end, clean = true) {
    let res = [],
      cur = end

    while (cur.id != this.start.id) {
      res.push(clean ? o2a(cur.geo) : cur)
      cur = this.parents[cur.id]
    }
    res.reverse()
    log(c `{blue Route length: {red.bold ${res.length} nodes}}`)
    return res
  }
}



setTimeout(async () => {

  // return
  // return

  let timeStart = new Date().getTime()

  let q = new module.exports.Router()

  await db.getAllNodes()

  // log(...tileEdges(...coords2tile(55.560395, 37.414888, 15), 15))

  await q.prepare([55.557536, 37.422674], [55.560395, 37.414888])
  let res = await q.route()

  log(res.map(x => `${x[0]},${x[1]}`).join('\n'))

  log(c `{magenta ${new Date().getTime() - timeStart}ms}`)

  require('fs').writeFileSync('./test.dat', (await db.getNodesInRadius([55.557536, 37.422674], 2)).map(x => `${x.geo.lat},${x.geo.lon}`).join('\n'))

}, 500)