
d3.select('#lightTheme').on('click',function(){
    d3.select('body').classed('dark', false);
});
d3.select('#darkTheme').on('click',function(){
    d3.select('body').classed('dark', true);
});

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
testData = [];
for (var i = 0; i < 3; i++){
    var d = createRandomIndicatorData(100,[0,1000],0.01,+moment, 60*60*1000);
    d.IndicatorId = d.IndicatorId + i;
    testData.push(d);
}

$( ".wgt-control" ).resizable({
    resize: function( event, ui ) {
    var wgtContent = d3.select(this).select('.wgt-content').node();
    wgtContent.viewModel.draw();
    //draw(parent, parent.model);
    var r = wgtContent.getBoundingClientRect();
    d3.select('#sizeDisplay').text(r.width + ':' + r.height);
    }
});
var models = [
    {interactive:false, legendPosition:'left', dataDisplays:{line:true, area:true}},
    {interactive:true, legendPosition:'right', dataDisplays:{symbols:true, line:true}, title:{text:"This is a graph title", position:"center"}, yAxis:{suffix:'GB', label:"Y Axis Label"}}
]
$('.wgt-content').each(function(i,e){
    timeSeries(e, models[i], testData).draw();
});

//creates an RFC4122v4 compliant guid string
//from the most upvoted answer here: https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript 
function guid(){
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
});
}

//returns the [width,height] of an svg text element.
//this adds, measures, then removes a <text> element.  
//so only use this if you need a measurement before having a final destination layer
//svg: an svg or 'g' element to draw the text element on
//textString: optional (returns [0,0] if falsey)
//className: optional - assign a class name string for css style assignment prior to measurement
function textExtent(svg, textString, className){
    var extent = [0,0];
    if (textString){
        var t = svg.append('text')
            .attr('class', className)
            .text(textString);
        var bbox = t.node().getBBox();
        extent = [bbox.width, bbox.height];
        t.remove();
    }
    return extent;
}

// timeseries object.  acts as a viewModel for the parent element.
function timeSeries(pe, m, d){
    var ts = {};
    var data = d;
    //some basic initialization of the model object if nothing was originally specified.
    var model = m || {};
    model.dataDisplays = model.dataDisplays || {line:true}; //show lines at least if nothing was specified.
    model.yAxis = model.yAxis || {};
    model.xAxis = model.xAxis || {};
    model.title = typeof model.title === 'string' ? {text: model.title} : model.title || {};
    var parentElement = pe;
    parentElement.viewModel = ts;
    
    ts.model = model; //expose the model  //TODO: make this a d3 style getter/setter function instead
    ts.data = data; //expose the data.   //TODO: make this a d3 style getter/setter function instead
    ts.draw = function(){
        //size svg region to fill parent div
        var rect = parentElement.getBoundingClientRect();
        var p = d3.select(parentElement);
        p.html('');
        var svg = p.append('svg')
                    .attr('width', rect.width)
                    .attr('height', rect.height);
        
        var topMargin = 15;
        var titleHeight = 0;
        if (model.title.text){
            var t = svg.append('text')
                .attr('class', 'title')
                .attr('y',0)
                .attr('x',10)
                .text(model.title.text);
            titleHeight = t.node().getBBox().height;
            t.attr('y', titleHeight);
            if (model.title.position === 'center'){
                t.style('text-anchor', 'middle')
                .attr('x', .5*rect.width);
            }
        }
        var leftMargin = 45; //TODO: make this dynamic based on yAxis width

        //make left margin space for the yAxisLabel if there is one.
        var yAxisLabelExtent = textExtent(svg,model.yAxis.label,'axisLabel yAxisLabel');
        leftMargin += yAxisLabelExtent[1];
        
        //'margin' here really means the margin for the data region on the graph
        var margin = {top: topMargin + titleHeight, right: 20, bottom: model.interactive ? 90 : 20, left: leftMargin},
            width = Math.max(0, +svg.attr("width") - margin.left - margin.right),
            height = Math.max(0, +svg.attr("height") - margin.top - margin.bottom),
            margin2 = {top: height + margin.top + 25, right: 20, bottom: 20, left: leftMargin},
            height2 = +svg.attr("height") - margin2.top - margin2.bottom;
        
        //x is the main display's current scale range.  x2 is the bottom drawer (overall scale range). 
        var x = d3.scaleTime().range([0, width]),
            x2 = d3.scaleTime().range([0, width]),
            y = d3.scaleLinear().range([height, 0]),
            y2 = d3.scaleLinear().range([height2, 0]);

        //compute the # of ticks based off the height or width / divided by the width or height (roughly) of a tick label.  this avoids label collision
        var xAxis = d3.axisBottom(x).ticks(width/80).tickSizeOuter(0);
        var yAxis = d3.axisLeft(y)
                .ticks(height/25)
                .tickSizeOuter(0) //removes start and end ticks
                .tickFormat(model.yAxis.suffix ? function(d) { return d + model.yAxis.suffix; } : null);
        
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
            /*var line2 = d3.line()  //if I wanted lines in the drawer instead
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

        var clipPath = guid();
        svg.append("defs").append("clipPath")
            .attr("id", clipPath)
            .append("rect")
                .attr("width", width)
                .attr("height", height)

        var focus = svg.append("g")
            .attr("class", "focus")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        //add layer here now, so other 'data region' elements will be drawn on top of data-displays
        var dataDisplayLayer = focus.append('g');
        var dataOverlayLayer = focus.append('g');

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

        if (model.yAxis.label){
            var labelDest = [.5*yAxisLabelExtent[1] - 62, .5 * height]; //-62 kicks it left of the axis
            var yLabel = focus.append('text')
                .attr('class', 'axisLabel yAxisLabel')
                .style('text-anchor', 'middle')
                .attr('x',labelDest[0])
                .attr('y',labelDest[1])
                .text(model.yAxis.label);
            yLabel.attr("transform", "rotate(90," + labelDest[0] + "," + labelDest[1] + ")");
        }

        if(model.interactive){
            //draw the bottom drawer content
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
            dataOverlayLayer.append("rect")
                .attr("class", "zoom")
                .attr("width", width)
                .attr("height", height)
                .call(zoom);
        }

        legend = focus.append("g")
            .attr("class","legend")
        //var legendBg = legend.append('rect').attr('id','legendBackground');

        var colors = d3.schemeCategory10;
        //todo: do an .data() enter/exit here instead of forEach
        data.forEach(function(da,i){
            var g = dataDisplayLayer.append('g')
                .attr('id', 'dataGroup' + i)
                .attr('class', 'dataGroup')
                .style('clip-path', 'url(#' + clipPath + ')');
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
                .attr("transform","translate(" + xOffset + ",0)")
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
            legend.attr("transform", "translate(" + (width - lgRect.width) + ",0)" );
        }
        else{ //top-left
            legend.attr("transform","translate(5,0)");
        }
        //legendBg.attr('x',lgRect.x).attr('y',lgRect.y).attr('width',lgRect.width).attr('height',lgRect.height);

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
            model.domain = x.domain(); //store the selected time range  TODO: this may need to be on the VM instead (not serialized)
            focus.selectAll(".line").attr("d", line);
            focus.selectAll(".area").attr("d", area);
            focus.selectAll(".point").attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; });
            focus.select(".axis--x").call(xAxis);
            d3.select('#timerangeDisplay').html('[' + model.domain[0].toString() + ", " + model.domain[1].toString() + ']' );
        }
    }
    return ts;
}




