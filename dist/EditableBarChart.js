import * as d3 from 'd3';
const defaultOptions = {
    margin: { top: 20, right: 20, bottom: 40, left: 40 },
    range: [undefined, undefined],
    autoPaddingFactor: [0.15, 0.15],
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
    function dragged(event, datum) {
        const i = Number(index.get(this));
        // The change is proportional to the drag y offset from the zero position.
        selected[1] = scaleBandInvert(xScale)(xScale(i) + event.x);
        selected = [Math.min(selected[0], selected[1]), Math.max(selected[0], selected[1])];
        g.selectAll('.bar-bar').classed('bar-active', false);
        const target = g.selectAll('.bar').filter((v, k) => k >= selected[0] && k <= selected[1]);
        // The g on which drag event is registered has already been translated st 0 corresponds to 0 on the y-axis.
        // Thus event.y above the x-axis is -ve the new height of bar, and scaleY(0) + event.y proportional to new data value.
        const value = -event.y;
        const domainValue = Number(Number(yScale.invert(yScale(0) - value)).toPrecision(options.precision));
        // Yes I really needed this to figure these scale transforms out (a saner way WIP).
        console.debug(`
    data=${datum},
    yPos(datum)=${yScale(datum)}
    yPos(0)=${yScale(0)}
    height=${height}
    event.y=${event.y}
    newValue=${value}
    newDomainValue=${domainValue}`);
        target.data(Array.from(Array(target.size())).map(() => domainValue));
        target
            .selectAll('.bar-bar')
            .attr('height', Math.abs(value))
            .attr('transform', () => `scale(1, ${-1 * Math.sign(value)})`)
            .classed('bar-active', true);
        drawLine(event.y);
    }
    function stopped() {
        selected = [-1, -1];
        g.selectAll('.bar-bar').classed('bar-active', false);
        cb(g.selectAll('.bar').data());
    }
    function getRange() {
        const [min, max] = [Math.min(...data), Math.max(...data)];
        const spread = max - min;
        function _min() {
            if (options.range && options.range[0] !== undefined)
                return options.range[0];
            if (spread)
                return min - options.autoPaddingFactor[0] * spread;
            else if (min !== 0) {
                return (min < 0) ? min + options.autoPaddingFactor[0] * min : 0;
            }
            return -1;
        }
        function _max() {
            if (options.range && options.range[1] !== undefined)
                return options.range[1];
            if (spread)
                return max + options.autoPaddingFactor[1] * spread;
            else if (max !== 0) {
                return (max < 0) ? 0 : max + options.autoPaddingFactor[1] * max;
            }
            return 1;
        }
        return [_min(), _max()];
    }
    function drawLine(eventY) {
        lineGroup
            .attr('opacity', 1)
            .attr('transform', `translate(0, ${yScale(0) + eventY})`)
            .select('text')
            .text(d3.format(`.${options.precision}f`)(yScale.invert(yScale(0) + eventY)));
    }
    const options = Object.assign(Object.assign({}, defaultOptions), _options);
    const index = d3.local();
    const svg = d3.select(container);
    const width = svg.node().width.animVal.value - options.margin.left - options.margin.right;
    const height = svg.node().height.animVal.value - options.margin.top - options.margin.bottom;
    let selected = [-1, -1];
    const xScale = d3.scaleBand().rangeRound([0, width]).padding(0.1).domain(Object.keys(data).map(i => +i));
    // This says that a value of min-range should be drawn at height on the canvas.
    // But heights of bars aren't directly mapped to canvas.
    const _range = getRange();
    const yScale = d3.scaleLinear().rangeRound([height, 0]).domain(_range);
    const g = svg.append('g')
        .attr('transform', `translate(${options.margin.left}, ${options.margin.top})`);
    g.append('line')
        .attr('stroke', 'black')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', yScale(0))
        .attr('y2', yScale(0));
    const dg = d3.drag();
    // Translate all bar origins to the their lanes and zero line.
    const barLanes = g.selectAll('.bar').data(data).enter().append('g')
        .attr('transform', (d, i) => `translate(${xScale(i)}, ${yScale(0)})`);
    const bars = barLanes
        .append('g')
        .attr('class', 'bar')
        .each(function (d, i) { index.set(this, i); })
        .call(dg.on('start', started))
        .call(dg.on('drag', dragged))
        .call(dg.on('end', stopped));
    barLanes.exit().remove();
    bars
        .append('rect')
        .attr('class', 'bar-bar')
        .attr('title', (d, i) => d + i)
        .attr('width', xScale.bandwidth())
        // If SVG allowed -ve h,w this would be a lot easier!
        .attr('height', (d) => Math.abs(yScale(0) - yScale(d)))
        .attr('transform', (d) => `scale(1, ${-1 * Math.sign(yScale(0) - yScale(d))})`)
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
    // xy axes.
    g.append('g')
        .attr('class', 'axis axis--x')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(xScale).tickFormat(options.xFormatter));
    g.selectAll('.axis--x g.tick text')
        .attr('transform', 'rotate(-90) translate(-20,-14)');
    g.append('g')
        .attr('class', 'axis axis--y')
        .call(d3.axisLeft(yScale).ticks(10, ''));
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
