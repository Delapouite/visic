// utils

var inc = (o, k) => ((o[k] = o[k] ? o[k] + 1 : 1), o)

var getArtist = song => {
  var a = song.artist.toLowerCase()
  var m = a.match(/(.*) feat[^h]/)
  if (m) a = m[1]
  return a.trim()
}

var getAlbum = song => {
  return song.album.toLowerCase().trim()
}

// data

var songsP = fetch("dump.json").then(res => res.json()).then(j => j.songs)

var datedSongsP = songsP.then(songs =>
  songs.map(song => (song.year = Number(song.date), song))
       .filter(song => !isNaN(song.year))
       .filter(song => song.artist))

var songsCountByYearP = datedSongsP.then(songs => {
  var hash = songs.reduce((acc, song) => inc(acc, song.year), {})
  return Object.keys(hash).map(k => ({ time: Number(k), count: hash[k] }))
})

var songsCountByDecadeP = datedSongsP.then(songs => {
  var hash = songs.reduce((acc, song) => inc(acc, String(song.year).slice(0, 3)), {})
  return Object.keys(hash).map(k => ({ time: String(Number(k)) + "0s", count: hash[k] }))
})

var newArtistsByYearP = datedSongsP.then(songs => {
  var hash = songs.reduce((acc, song) => {
    var a = getArtist(song)
    if (!acc[a] || acc[a] > song.year) acc[a] = song.year
    return acc
  }, {})

  return Object.keys(hash).reduce((acc, artist) => {
    var year = hash[artist]
    if (!acc[year]) {
      acc[year] = [artist]
    } else {
      acc[year].push(artist)
    }
    return acc
  }, {})
})

var newArtistsCountByYearP = newArtistsByYearP.then(d => Object.keys(d).map(k => ({ time: Number(k), count: d[k].length })))

var albumsByYearP = datedSongsP.then(songs => {
  var hash = songs.reduce((acc, song) => {
    acc[getAlbum(song)] = song.year
    return acc
  }, {})

  return Object.keys(hash).reduce((acc, album) => {
    var year = hash[album]
    if (!acc[year]) {
      acc[year] = [album]
    } else {
      acc[year].push(album)
    }
    return acc
  }, {})
})

var albumsCountByYearP = albumsByYearP.then(d => Object.keys(d).map(k => ({ time: Number(k), count: d[k].length })))

// visualizations

var addTitle = title => {
  var h = document.createElement('h2')
  h.textContent = title
  document.body.appendChild(h)
}

var timeChart = (title, data) => {
  addTitle(title)

  var margin = {top: 20, right: 20, bottom: 30, left: 40},
    width = 1900 - margin.left - margin.right,
    height = 800 - margin.top - margin.bottom

  var x = d3.scale.ordinal()
    .rangeRoundBands([0, width], .1)

  var y = d3.scale.linear()
    .range([height, 0])

  var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom")

  var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .ticks(20)

  var svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

  x.domain(data.map(d => d.time))
  y.domain([0, d3.max(data, d => d.count)])

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
    .attr("title", d => x(d.time))
    .attr("x", d => x(d.time))
    .attr("width", x.rangeBand())
    .attr("y", d => y(d.count))
    .attr("height", d => height - y(d.count))

  svg.selectAll(".label")
    .data(data)
  .enter().append("svg:text")
    .attr("class", "label")
    .attr("x", d => x(d.time))
    .attr("y", d => y(d.count) - 5)
    .text(d => d.count)
}

var table = (title, data) => {
 addTitle(title)

 var h = document.createElement('h3')
 h.textContent = Object.keys(data).reduce((acc, k) => acc += data[k].length, 0)
 var pre = document.createElement('pre')
 pre.textContent = Object.keys(data).map(k => `${k} ${data[k].join(", ")}\n`)
 document.body.appendChild(h)
 document.body.appendChild(pre)
}

// connect

songsCountByYearP.then((d) => timeChart('Songs per year', d))
songsCountByDecadeP.then((d) => timeChart('Songs per decade', d))

newArtistsCountByYearP.then((d) => timeChart('New artists per year', d))
newArtistsByYearP.then((d) => table('New artists per year', d))

albumsCountByYearP.then((d) => timeChart('Albums per year', d))
albumsByYearP.then((d) => table('Albums per year', d))
