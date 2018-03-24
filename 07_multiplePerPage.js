
function createRandomIndicatorData(n,range,rand, startDate, timespan, idName) {
    var data = {AvgData: {DataPoints:[]}, MaxData:{DataPoints:[]}, MinData:{DataPoints:[]}, IndicatorId: idName || "indicator"}
    timespan = timespan || (60*1000); //1min default
    var d = startDate || +moment() - 31557600000;  //current date - 1yr
    if(range==null) {range=[0,100]}
    if(rand==null) {rand=1/20}

    var num = range[0] + Math.floor(Math.random()*(range[1]-range[0]))
    var rgen = d3.randomNormal(0,(range[1]-range[0])*rand)
    for (var i = 0; i<n; i++) {
        
        data.AvgData.DataPoints.push({x: d, y:num});
        data.MaxData.DataPoints.push({x: d, y:num*1.05});
        data.MinData.DataPoints.push({x: d, y:num*.95});
        d+= timespan; // +1 min
        num = num+rgen();
        num = Math.min(Math.max(num,range[0]),range[1]);
    }
    return data;
}
//var data = createRandomIndicatorData(100,[0,1000],0.01,+moment, 60*60*1000);
//data = data.AvgData.DataPoints;
data = [];
for (var i = 0; i < 3; i++){
    var d = createRandomIndicatorData(100,[0,1000],0.01,+moment, 60*60*1000);
    d.IndicatorId = d.IndicatorId + i;
    data.push(d);
}

$( ".wgt-control" ).resizable({
    resize: function( event, ui ) {
    var parent = d3.select(this).select('.wgt-content').node();
    draw(parent, parent.model);
    var r = parent.getBoundingClientRect();
    d3.select('#sizeDisplay').text(r.width + ':' + r.height);
    }
});
var models = [
    {interactive:false, legendPosition:'right', dataDisplays:{line:true, area:false}},
    {interactive:true, legendPosition:'left', dataDisplays:{symbols:true, line:true}}
]
$('.wgt-content').each(function(i,e){
    draw(e, models[i]);
});

function draw(parentElement, model){
    //some basic initialization of the model object if nothing was originally specified.
    if (!model) { model = {}}
    model.dataDisplays = model.dataDisplays || {line:true}; //show lines at least if nothing was specified.
    parentElement.model = model;

    //size svg region to fill parent div
    var rect = parentElement.getBoundingClientRect();
    var p = d3.select(parentElement);
    p.html('');
    var svg = p.append('svg')
                .attr('width', rect.width)
                .attr('height', rect.height);

    var margin = {top: 20, right: 20, bottom: model.interactive ? 90 : 20, left: 40},
        width = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom,
        margin2 = {top: height + margin.top + 25, right: 20, bottom: 20, left: 40},
        height2 = +svg.attr("height") - margin2.top - margin2.bottom;
    
    //x is the main display's current scale range.  x2 is the bottom drawer (overall scale range). 
    var x = d3.scaleTime().range([0, width]),
        x2 = d3.scaleTime().range([0, width]),
        y = d3.scaleLinear().range([height, 0]),
        y2 = d3.scaleLinear().range([height2, 0]);

    //compute the # of ticks based off the height or width / divided by the width or height (roughly) of a tick label.  this avoids label collision
    var xAxis = d3.axisBottom(x).ticks(width/80).tickSizeOuter(0),
        yAxis = d3.axisLeft(y).ticks(height/25).tickSizeOuter(0);
    
    if (model.interactive) { //brush & zoom
        var xAxis2 = d3.axisBottom(x2).ticks(width/80).tickSizeOuter(0);
        
        var brush = d3.brushX()
            .extent([[0, 0], [width, height2]])
            .on("brush end", brushed);

        var zoom = d3.zoom()
            .scaleExtent([1, Infinity])
            .translateExtent([[0, 0], [width, height]])
            .extent([[0, 0], [width, height]])
            .on("zoom", zoomed);
        
        var area2 = d3.area()
            .curve(d3.curveLinear)
            .x(function(d) { return x2(d.x); })
            .y0(height2)
            .y1(function(d) { return y2(d.y); });
        /*var line2 = d3.line()  //if I wanted lines in the drawer
        .curve(d3.curveLinear)
        .x(function(d) { return x2(d.x); })
        .y(function(d) { return y2(d.y); });*/
    }

    var area = d3.area()
        .curve(d3.curveLinear)
        .x(function(d) { return x(d.x); })
        .y0(height)
        .y1(function(d) { return y(d.y); });

    var line = d3.line()
        .curve(d3.curveLinear)
        .x(function(d) { return x(d.x); })
        .y(function(d) { return y(d.y); });

    svg.append("defs").append("clipPath")
        .attr("id", "clip")
    .append("rect")
        .attr("width", width)
        .attr("height", height);

    var focus = svg.append("g")
        .attr("class", "focus")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


    x2.domain(d3.extent(data[0].AvgData.DataPoints, function(d) { return d.x; }));
    x.domain(model.domain || x2.domain()); //use stored timerange
        //TODO: make more efficient.
    y.domain([d3.min(data, function(d){return d3.min(d.AvgData.DataPoints, function(d2){return d2.y})}),
    d3.max(data, function(d){return d3.max(d.AvgData.DataPoints, function(d2){return d2.y})})])
    
    y2.domain(y.domain());

    focus.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    focus.append("g")
        .attr("class", "axis axis--y")
        .call(yAxis);

    if(model.interactive){
        var context = svg.append("g")
            .attr("class", "context")
            .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");
        context.append("path")
            .datum(data[0].AvgData.DataPoints)
            .attr("class", "area")
            .attr("d", area2);

        context.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(0," + height2 + ")")
            .call(xAxis2);

        context.append("g")
            .attr("class", "brush")
            .call(brush)
            .call(brush.move, model.domain ? [x2(model.domain[0]),x2(model.domain[1])] : x2.range());
        svg.append("rect")
            .attr("class", "zoom")
            .attr("width", width)
            .attr("height", height)
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .call(zoom);
    }

    legend = svg.append("g")
        .attr("class","legend")
    var legendBg = legend.append('rect').attr('id','legendBackground');

    var colors = d3.schemeCategory10;
    //todo: do an .data() enter/exit here instead of forEach
    data.forEach(function(da,i){
        var g = focus.append('g')
            .attr('id', 'dataGroup' + i)
            .attr('class', 'dataGroup');
        if (model.dataDisplays.line){
            g.append("path")
                .datum(da.AvgData.DataPoints)
                .attr("class", "line")
                .attr("d", line)
                .style('stroke', colors[i]);
        }
        if (model.dataDisplays.area){
            g.append("path")
                .datum(da.AvgData.DataPoints)
                .attr("class", "area")
                .attr("d", area)
                .style('fill', colors[i]);
        }
        if (model.dataDisplays.symbols){
            g.selectAll(".point")
                .data(da.AvgData.DataPoints)
                .enter().append("path")
                .attr("class", "point")
                .attr("d", d3.symbol().type(d3.symbolCircle).size(15))
                .attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; })
                .style('fill', colors[i]);
        }

        // Legend Items
        var xOffset = legend.node().getBoundingClientRect().width + (i > 0? 10:0); //current width + 10px pad
        var lg = legend.append('g') //a legendItem 'group' (rect + label)
            .attr('class', 'legendItem')
            .attr("transform","translate(" + xOffset + ",30)")
            .on('click',function(){
                d3.select(this).classed('hidden', !g.classed('hidden'));
                g.classed('hidden', !g.classed('hidden'));
            });
        lg.append('rect')
            .attr('fill', colors[i])
            .attr('x',0).attr('y', 0).attr('width',10).attr('height',10);
        lg.append('text')
            .attr('x',15).attr('y',9)
            .text(da.IndicatorId);

    });
    //now that the legend has all its content, size the background rect to fit.
    var lgRect = legend.node().getBBox();
    if (model.legendPosition && model.legendPosition === 'right'){
        legend.attr("transform", "translate(" + (40 + width - lgRect.width) + ",-20)" );
    }
    else{ //top-left
        legend.attr("transform","translate(50,-20)");
    }
    
    legendBg.attr('x',lgRect.x).attr('y',lgRect.y).attr('width',lgRect.width).attr('height',lgRect.height);

    function brushed() {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
        var s = d3.event.selection || x2.range();
        x.domain(s.map(x2.invert, x2));
        updateDataDisplays();
        focus.select(".axis--x").call(xAxis);
        svg.select(".zoom").call(zoom.transform, d3.zoomIdentity
            .scale(width / (s[1] - s[0]))
            .translate(-s[0], 0));
    }

    function zoomed() {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; // ignore zoom-by-brush
        var t = d3.event.transform;
        x.domain(t.rescaleX(x2).domain());
        updateDataDisplays();
        context.select(".brush").call(brush.move, x.range().map(t.invertX, t));
    }
    //the common functionality between brush&zoom
    function updateDataDisplays(){
        model.domain = x.domain(); //store the selected time range
        focus.selectAll(".line").attr("d", line);
        focus.selectAll(".area").attr("d", area);
        focus.selectAll(".point").attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; });
        focus.select(".axis--x").call(xAxis);
        d3.select('#timerangeDisplay').html('[' + model.domain[0].toString() + ", " + model.domain[1].toString() + ']' );
    }
}


