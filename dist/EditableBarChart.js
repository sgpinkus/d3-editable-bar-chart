import * as d3 from 'd3';
const defaultOptions = {
    margin: { top: 20, right: 20, bottom: 40, left: 40 },
    range: undefined,
    xFormatter: null,
    precision: 3,
};
export function draw(container, _options = {}, data, cb) {
    function started(event) {
        const i = Number(index.get(this));
        selected[0] = selected[1] = i;
        d3.select(this).select('.bar-bar').classed('bar-active', true);
        drawLine(event.y);
    }
    function dragged(event) {
        const i = Number(index.get(this));
        const [value, domainValue] = yValues(event.y);
        selected[1] = scaleBandInvert(xPos)(xPos(i) + event.x);
        selected = [Math.min(selected[0], selected[1]), Math.max(selected[0], selected[1])];
        g.selectAll('.bar-bar').classed('bar-active', false);
        const target = g.selectAll('.bar').filter((v, k) => k >= selected[0] && k <= selected[1]);
        target.data(Array.from(Array(target.size())).map(() => domainValue));
        target
            .attr('transform', `translate(0, ${height - value})`)
            .selectAll('.bar-bar')
            .attr('height', value)
            .classed('bar-active', true);
        drawLine(event.y);
    }
    function stopped() {
        selected = [-1, -1];
        g.selectAll('.bar-bar').classed('bar-active', false);
        cb(g.selectAll('.bar').data());
    }
    function getRange() {
        const rangeMin = options.range && options.range[0];
        const rangeMax = options.range && options.range[1];
        const [min, max] = [rangeMin !== null && rangeMin !== void 0 ? rangeMin : Math.min(...data), rangeMax !== null && rangeMax !== void 0 ? rangeMax : Math.max(...data)];
        const spread = max - min;
        const minSpread = rangeMin !== undefined ? 0 : 0.1 * spread;
        const maxSpread = rangeMax !== undefined ? 0 : 0.5 * spread;
        return [min - minSpread, max + maxSpread];
    }
    function yValues(y) {
        const value = height - y;
        const domainValue = Math.round(yPos.invert(y) * Math.pow(10, options.precision)) / Math.pow(10, options.precision);
        return [value, domainValue];
    }
    function drawLine(y) {
        lineGroup
            .attr('opacity', 1)
            .attr('transform', `translate(0, ${y})`)
            .select('text')
            .text(d3.format(`.${options.precision}f`)(yPos.invert(y)));
    }
    const options = Object.assign(Object.assign({}, defaultOptions), _options);
    const index = d3.local();
    const svg = d3.select(container);
    const width = svg.node().width.animVal.value - options.margin.left - options.margin.right;
    const height = svg.node().height.animVal.value - options.margin.top - options.margin.bottom;
    let selected = [-1, -1];
    const xPos = d3.scaleBand().rangeRound([0, width]).padding(0.1).domain(Object.keys(data).map(i => +i));
    const yPos = d3.scaleLinear().rangeRound([height, 0]).domain(getRange());
    const g = svg.append('g')
        .attr('transform', `translate(${options.margin.left}, ${options.margin.top})`);
    g.append('g') // y position in g is proportional to data values.
        .attr('class', 'axis axis--x')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(xPos).tickFormat(options.xFormatter));
    g.selectAll('.axis--x g.tick text')
        .attr('transform', 'rotate(-90) translate(-20,-14)');
    g.append('g')
        .attr('class', 'axis axis--y')
        .call(d3.axisLeft(yPos).ticks(10, ''));
    const dg = d3.drag();
    const barLanes = g.selectAll('.bar').data(data).enter()
        .append('g')
        .attr('transform', (d, i) => `translate(${xPos(i)},0)`);
    const bars = barLanes
        .append('g')
        .attr('class', 'bar')
        .attr('transform', (d) => `translate(0, ${yPos(d)})`)
        .each(function (d, i) { index.set(this, i); })
        .call(dg.on('start', started))
        .call(dg.on('drag', dragged))
        .call(dg.on('end', stopped));
    barLanes.exit().remove();
    bars
        .append('rect')
        .attr('class', 'bar-bar')
        .attr('title', (d, i) => d + i)
        .attr('width', xPos.bandwidth())
        .attr('height', (d) => height - yPos(d))
        .on('mouseover', function () {
        d3.select(this).attr('opacity', '.50');
        d3.select(this.parentElement).select('.tool-tip')
            .attr('opacity', 1);
    })
        .on('mouseout', function () {
        const node = d3.select(this);
        node.attr('opacity', '1');
        d3.select(this.parentElement).select('.tool-tip')
            .attr('opacity', 0);
    });
    bars.append('text').text((d) => d)
        .attr('class', 'tool-tip')
        .attr('opacity', '0');
    const lineGroup = g.append('g')
        .attr('opacity', 0);
    lineGroup.append('line')
        .attr('class', 'line')
        .attr('stroke', 'black')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', 0)
        .attr('y2', 0);
    lineGroup.append('text')
        .text('')
        .attr('class', 'text')
        .attr('x', 0)
        .attr('y', 0)
        .attr('fill', 'black');
}
function scaleBandInvert(scale) {
    const domain = scale.domain();
    const paddingOuter = scale(domain[0]);
    const eachBand = scale.step();
    return function (value) {
        const index = Math.floor(((value - paddingOuter) / eachBand));
        return domain[Math.max(0, Math.min(index, domain.length - 1))];
    };
}
