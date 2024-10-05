/**
 * Presents a bar graph with mutatable bars. The use can click on one bar and drag to change its
 * height and corresponding value. The user can click and drag to select >1 and simultaneously
 * change thier values.
 */
class EditableBarChart
{
  /**
   * Init. We need to explicitly deal with margins ~because axes.
   */
  constructor(container, data, options = {}) {
    var defaults = {
      margin: { top: 20, right: 20, bottom: 40, left: 40},
    }
    options = Object.assign(defaults, options)
    this.svg = d3.select(container)
    this.width = +this.svg.attr('width') - options.margin.left - options.margin.right;
    this.height = +this.svg.attr('height') - options.margin.top - options.margin.bottom;
    this.g = this.svg.append('g')
        .attr('transform', 'translate(' + options.margin.left + ',' + options.margin.top + ')');
    this.init(data, options)
    this.draw()
  }

  /**
   * Draw data and set up graph based on data. data must be an array of numbers.
   * If range use that for y-axis range.
   */
  init(data, options = {}) {
    var defaults = {
      range: null,
      xFormatter: null,
    }
    options = Object.assign(defaults, options)
    this.selected = [-1,-1]
    this.data = data
    if(options.range == null) {
      options.range = [Math.min.apply(null, this.data), Math.max.apply(null, this.data)]
    }
    this.xAxis = d3.scaleBand().rangeRound([0, this.width]).padding(0.1).domain(Object.keys(data).map(i => +i))
    this.yAxis = d3.scaleLinear().rangeRound([this.height,0]).domain(options.range);
    this.g.append('g')
        .attr('class', 'axis axis--x')
        .attr('transform', 'translate(0,' + this.height + ')')
        .call(d3.axisBottom(this.xAxis).tickFormat(options.xFormatter))
    this.g.selectAll('.axis--x g.tick text')
        .attr('transform', 'rotate(-90) translate(-20,-14)')
    this.g.append('g')
        .attr('class', 'axis axis--y')
        .call(d3.axisLeft(this.yAxis).ticks(10, ''))
  }

  /**
   * Draw / redraw
   */
  draw() {
    var dg = d3.drag()
    var bars = this.g.selectAll('.bar').data(this.data).enter()
        .append('g')
        .attr('transform', (d,i) => { return 'translate(' +  this.xAxis(i) + ',0)'; })
    bars.append('rect')
        .attr('class', 'bar-bar')
        .attr('width', this.xAxis.bandwidth())
        .attr('transform', (d) => { return 'translate(0,' + this.yAxis(d) + ')'; })
        .attr('height',  (d) => { return this.height - this.yAxis(d); })
        .call(dg.on('start', (d, i, n) => { this.started(d, i, n) }))
        .call(dg.on('drag', (d, i, n) => { this.dragged(d, i, n) }))
        .call(dg.on('end', (d, i, n) => { this.stopped(d, i, n) }))
    bars.exit()
  }

  started(d, i, n) {
    console.log('Drag started', d, i);
    this.selected[0] = this.selected[1] = i
    d3.select(n[i]).classed('bar-active', true)
  }

  dragged(d, i, n) {
    console.log('Drag', d, i);
    var mouse = d3.mouse(this.g.node())
    this.selected[1] = this.xi(mouse[0])
    var target = d3.selectAll(n.slice.apply(n, this.selection()))
    d3.selectAll(n).classed('bar-active', false)
    target.attr('transform', 'translate(0,' + mouse[1] + ')')
        .attr('height', this.height - mouse[1])
        .classed('bar-active', true)
  }

  stopped(d, i, n) {
    console.log('Drag stopped');
    d3.selectAll(n).classed('bar-active', false)
    this.selected = [-1,-1]
  }

  /**
   * Return current drag selection.
   */
  selection() {
    return [Math.min(this.selected[0], this.selected[1]), 1+Math.max(this.selected[0], this.selected[1])]
  }

  /**
   * Implements equiv of scaleBand().inverse() to map mouse pos to column.
   */
  xi(x) {
    if(x <= this.xAxis(1)) {
      return 0
    }
    for(var i = 2; i < this.xAxis.domain().length; i++) {
      if(x <= this.xAxis(i)) {
        return i-1
      }
    }
    return this.xAxis.domain().length-1
  }

  get() {
    return this.data
  }

  set(data) {
    this.init(data)
  }
}
