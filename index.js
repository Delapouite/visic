/* global d3, R */

(function (R, d3) {
"use strict"

const palette = {
  195: "#feb2dd",
  196: "#feb2dd",
  197: "#e271b1",
  198: "#c6478f",
  199: "#a4286e",
  200: "#721148",
  201: "#3a0222"
}

const {
  assoc,
  curry,
  filter,
  groupBy,
  identity,
  length,
  map,
  pipe,
  prop,
  propOr,
  reduce,
  replace,
  slice,
  sortBy,
  toLower,
  toPairs,
  trim,
  values
} = R

// utils

const getArtist = song => {
  let a = song.artist.toLowerCase()
  const m = a.match(/(.*) feat[^h]/)
  if (m) a = m[1]
  return a.trim()
}

const getAlbum = pipe(propOr("", "album"), toLower, trim)

const formatXY = (o, xFmt = Number, yFmt = identity) => {
  const a = Array.isArray(o) ? o : toPairs(o)
  return a.map(([k, v]) => ({ x: xFmt(k), y: yFmt(v) }))
}

const reduceConcat = pipe(
  toPairs,
  reduce(
    (a, [k, v]) => assoc(v, (a[v] || []).concat(k), a)
  , {})
)

const kebabCase = pipe(
  toLower,
  replace(/\s/g, '-')
)

const byYear = pipe(groupBy(prop("year")), map(length))

const bySortedYear = pipe(toPairs, sortBy(prop(1)))

// raw data

// Promise<Array>
const songsP = fetch("dump.json").then(res => res.json()).then(prop("songs"))

// Promise<Array>
const datedSongsP = songsP.then(pipe(
  map(s => (s.year = Number(s.date), s)),
  filter(s => !isNaN(s.year) && s.artist)
))

// Promise<POJO>
const songsByYearP = datedSongsP.then(byYear)

// Promise<POJO>
const songsBySortedYearP = songsByYearP.then(bySortedYear)

// Promise<POJO>
const songsByDecadeP = datedSongsP.then(pipe(
  groupBy(pipe(
    prop("date"),
    slice(0, 3)
  )),
  map(length)
))

// Promise<POJO>
const newArtistsByYearP = datedSongsP.then(
  reduce((acc, song) => {
    var a = getArtist(song)
    if (!acc[a] || acc[a] > song.year) acc[a] = song.year
    return acc
  }, {})
).then(reduceConcat)

// Promise<POJO>
const albumsByYearP = datedSongsP
.then(reduce((a, s) => (a[getAlbum(s)] = s.year, a), {}))
.then(reduceConcat)

// Promise<Array>
const singlesP = datedSongsP.then(pipe(
  filter(s => getAlbum(s) === 'singles')
))

const singlesByYearP = singlesP.then(byYear)

const singlesBySortedYearP = singlesByYearP.then(bySortedYear)

// XY chart data

const songsByYearXYP = songsByYearP.then(formatXY)
const songsBySortedYearXYP = songsBySortedYearP.then(formatXY)
const songsByDecadeXYP = songsByDecadeP.then(d => formatXY(d, k => String(Number(k)) + "0s"))

const newArtistsByYearXYP = newArtistsByYearP.then(d => formatXY(d, Number, length))

const albumsByYearXYP = albumsByYearP.then(d => formatXY(d, Number, length))

const singlesByYearXYP = singlesByYearP.then(formatXY)
const singlesBySortedYearXYP = singlesBySortedYearP.then(formatXY)

// visualizations

const addMenu = (songs) => {
  const nav = document.createElement("nav")
  const strong = document.createElement("strong")
  strong.textContent = `${songs.length} songs`

  nav.appendChild(strong)
  document.body.appendChild(nav)
}

const addTitle = title => {
  const id = kebabCase(title)
  const h = document.createElement("h2")
  h.textContent = title
  h.id = id
  document.body.appendChild(h)

  const a = document.createElement("a")
  a.textContent = title
  a.href = `#${id}`

  const nav = document.querySelector("nav")
  nav.appendChild(a)
}

const timeChart = curry((title, data) => {
  addTitle(title)

  const margin = {top: 20, right: 20, bottom: 30, left: 40},
    width = 1900 - margin.left - margin.right,
    height = 800 - margin.top - margin.bottom

  const x = d3.scale.ordinal()
    .rangeRoundBands([0, width], .1)
    .domain(data.map(d => d.x))

  const y = d3.scale.linear()
    .range([height, 0])
    .domain([0, d3.max(data, d => d.y)])

  const xAxis = d3.svg.axis()
    .scale(x)

  const yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .ticks(20)

  const svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis)

  svg.append("g")
    .attr("class", "y axis")
    .call(yAxis)

  svg.selectAll(".bar")
    .data(data)
  .enter().append("rect")
    .attr("class", "bar")
    .attr("title", d => x(d.x))
    .attr("x", d => x(d.x))
    .attr("width", x.rangeBand())
    .attr("y", d => y(d.y))
    .attr("height", d => height - y(d.y))
    .attr("fill", d => palette[String(d.x).slice(0, 3)])

  svg.selectAll(".label")
    .data(data)
  .enter().append("svg:text")
    .attr("class", "label")
    .attr("x", d => x(d.x))
    .attr("y", d => y(d.y) - 5)
    .text(d => d.y)
})

const table = curry((title, data) => {
 addTitle(title)

 const h = document.createElement("h3")
 h.textContent = values(data).reduce((acc, v) => acc += v.length, 0)
 const pre = document.createElement("pre")
 pre.textContent = toPairs(data).map(([k, v]) => `${k} ${v.join(", ")}\n`)
 document.body.appendChild(h)
 document.body.appendChild(pre)
})

// layout

songsP.then((songs) => addMenu(songs))

// connect

songsByYearXYP.then(timeChart("Songs per year"))
songsBySortedYearXYP.then(timeChart("Songs per sorted year"))
songsByDecadeXYP.then(timeChart("Songs per decade"))

newArtistsByYearXYP.then(timeChart("New artists per year"))
newArtistsByYearP.then(table("New artists per year"))

albumsByYearXYP.then(timeChart("Albums per year"))
albumsByYearP.then(table("Albums per year"))

singlesByYearXYP.then(timeChart("Singles per year"))
singlesBySortedYearXYP.then(timeChart("Singles per sorted year"))

}(R, d3))
