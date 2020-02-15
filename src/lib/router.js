'use strict'

const PriorityQueue = require('js-priority-queue'),
  {
    routeLen,
    dist,
    o2a
  } = require('./utils.js'),
  osm = require('./OSM.js'),
  db = require('./db.js'),
  {
    log,
    c
  } = require('./log')


module.exports.Router = class {
  rerouteRetries = 0
  qres = []
  resRoutes = []

  constructor(start, end, callback) {
    this.callback = callback || (() => {})
    this.xstart = start
    this.xend = end
  }

  async run() {
    log(c `{cyan.bold Started routing preparation from {green ${this.xstart.join(' ')}} to {green ${this.xend.join(' ')}}}`);
    !this.rerouteRetries && this.callback({
      type: 0
    })

    await osm.preloadArea([...this.xstart], [...this.xend])

    log(c `{green.bold Tile preloading finished}`)

    this.start = (await db.nearestNodes(...this.xstart))[this.rerouteRetries]
    this.end = await db.nearestNode(...this.xend)

    // log(o2a(this.start.geo))
    // log(o2a(this.end.geo))
    if (!this.start || !this.end) throw new Error('Not found node')

    log(c `{green.bold Found nearest nodes: ${this.start.id} and ${this.end.id}}`);

    !this.rerouteRetries && this.callback({
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

    return await this.route()
  }

  async route() {
    log(c `{yellow.bold Routing started}`)
    let ttl = 10e100
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
            p: newCost + dist(o2a(next.geo), this.xend)
          })
          this.parents[next.id] = cur
        }
      }))
    }

    this.qres.push(nearestEndNode)
    log(c `{magenta.bold Routing finished. Generating path}`)
    if (this.end.id in this.parents) {
      log(c `{green.bold Successfully found end node}`)
      // self.resRoutes.push({
      //   res: this.restorePath(this.end),
      //   dist: 0
      // })
      // if (++this.rerouteRetries < 100) this.run() 
      return this.restorePath(this.end)
    } else if (nearestEndNode.dist < 0.1) {
      log(c `{yellow.bold End node not found, selecting nearest - {red ${Math.round(nearestEndNode.dist*1000)}m}}`)
      return this.restorePath(nearestEndNode)
      // self.resRoutes.push({
      //   res: this.restorePath(nearestEndNode),
      //   dist: nearestEndNode.dist
      // })
      // if (++this.rerouteRetries < 100) this.run()
    } else {
      if (++this.rerouteRetries < 100) return this.run()
      log(c `{red.bold Route not found}`)
      return [];
      // self.resRoutes = self.resRoutes.sort((a, b) => routeLen(a.res) - routeLen(b.res))
      // log(self.resRoutes)
      // if (self.resRoutes.length === 0 || self.resRoutes) {
      //   log(c `{red.bold Route not found}`)
      //   return [];
      // }
      // return self.resRoutes[0].res;
    }
  }

  restorePath(end, clean = true) {
    let res = [this.xend],
      cur = end

    while (cur.id != this.start.id) {
      res.push(clean ? o2a(cur.geo) : cur)
      cur = this.parents[cur.id]
    }
    res.push(this.xstart)
    res.reverse()
    log(c `{blue Route length: {red.bold ${res.length} nodes}}`)
    return res
  }
}


// setTimeout(async () => {
//   return

//   let timeStart = new Date().getTime()

//   let q = new module.exports.Router([55.760358, 37.621166], [55.761806, 37.617456])

//   await db.getAllNodes()

//   // log(...tileEdges(...coords2tile(55.560395, 37.414888, 15), 15))

//   let res = await q.run()

//   log(res.map(x => `${x[0]},${x[1]}`).join('\n'))

//   // log(q.qres.sort(function (a, b) {
//   //   b.dist - a.dist
//   // })[q.qres.length - 1])

//   log(c `{magenta ${new Date().getTime() - timeStart}ms}`)

//   require('fs').writeFileSync('./test.dat', (await db.getNodesInRadius([55.557536, 37.422674], 2)).map(x => `${x.geo.lat},${x.geo.lon}`).join('\n'))

// }, 500)