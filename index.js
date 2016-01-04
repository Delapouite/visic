// data

var songsP = fetch("dump.json").then(res => res.json()).then(j => j.songs)

var songsByYearP = songsP
.then(songs => {
  var hash = songs.reduce((acc, song) => {
    var d = Number(song.date)
    if (!isNaN(d)) acc[d] = acc[d] ? acc[d] + 1 : 1
      return acc
  }, {})

  return Object.keys(hash).map(k => ({ year: Number(k), songs: hash[k] }))
})

// visualizations

var yearsChart = (data) => {
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

  x.domain(data.map(d => d.year))
  y.domain([0, d3.max(data, d => d.songs)])

  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis)

  svg.append("g")
    .attr("class", "y axis")
    .call(yAxis)
  .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", "1em")
    .style("text-anchor", "end")
    .text("Songs")

  svg.selectAll(".bar")
    .data(data)
  .enter().append("rect")
    .attr("class", "bar")
    .attr("title", d => x(d.year))
    .attr("x", d => x(d.year))
    .attr("width", x.rangeBand())
    .attr("y", d => y(d.songs))
    .attr("height", d => height - y(d.songs))

  svg.selectAll(".label")
    .data(data)
  .enter().append("svg:text")
    .attr("class", "label")
    .attr("x", d => x(d.year))
    .attr("y", d => y(d.songs) - 5)
    .text(d => d.songs)
}

// connect

songsByYearP.then(yearsChart)
