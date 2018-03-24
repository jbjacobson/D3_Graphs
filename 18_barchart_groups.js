
d3.select('#lightTheme').on('click',function(){
    d3.select('body').classed('dark', false);
});
d3.select('#darkTheme').on('click',function(){
    d3.select('body').classed('dark', true);
});

$( ".wgt-control" ).resizable({
    resize: function( event, ui ) {
    var wgtContent = d3.select(this).select('.wgt-content').node();
    wgtContent.viewModel.draw();
    var r = wgtContent.getBoundingClientRect();
    d3.select('#sizeDisplay').text(r.width + ':' + r.height);
    }
});

var testData = [{name: 'B', value: .01492},{name: 'A', value: .08167},{name: 'C', value: .02782},{name: 'D', value: .04253},{name: 'E', value: .12702},{name: 'F', value: .02288},{name: 'G', value: .02015}];
var groupedData = [
    {name:'JAN', values: {"Site 1": .01492, "Site 2":.08167, "Site 3":.02782, "Site 4":.04253, "Site 5":.12702, "Site 6":.02288, "Site 7":.02015}},
    {name:'FEB', values: {"Site 1": .1492, "Site 2":.02167, "Site 3":.03782, "Site 4":.0925, "Site 5":.32702, "Site 6":.062, "Site 7":.03}},
    {name:'MAR', values: {"Site 1": .1, "Site 2":.2, "Site 3":.3, "Site 4":.2, "Site 5":.1, "Site 6":.2, "Site 7":.1}},
    {name:'APR', values: {"Site 1": .05, "Site 2":.06, "Site 3":.07, "Site 4":.08, "Site 5":.09, "Site 6":.1, "Site 7":.11}},
    {name:'MAY', values: {"Site 1": .2, "Site 2":.19, "Site 3":.18, "Site 4":.17, "Site 5":.16, "Site 6":.15, "Site 7":.14}}
]

var highSeverityColors = ["#006837", "#fad225", "#ae0000"];  //[green,yellow,red]
var lowSeverityColors = ["#ae0000", "#fad225", "#006837"];  //[red,yellow,green]
var models = [
    {title: "groups", groupColors: d3.schemeCategory10, sort:"none"},
    {sort: "none"},
    {title:"color bars based on value",sort:"categoryDescending", axisLabel:{text:"Frequency"},colorByValue:{colors:highSeverityColors, thresholds:[.04,.08]}},
    {title:"inverse colors for low alarms (same thresholds)",sort:"valueDescending",inverted:true, axisLabel:{text:"custom axis label"},colorByValue:{colors:lowSeverityColors, thresholds:[.04,.08]}}
];

var sortOptions = ["valueDescending", "valueAscending", "categoryDescending", "categoryAscending", "none"];

function getColorForValue(colors, thresholds, value){
    if (!colors || !thresholds || colors.length != (thresholds.length +1)){
        throw "invalid color range/threshold values specified";
    }
    for (var i = 0; i < thresholds.length; i++){
        if (value < thresholds[i]){
            return colors[i];
        }
    }
    //not found, must be last color
    return colors[i];
}

$('.wgt-control').each(function(i,e){
    var content = d3.select(e).select('.wgt-content').node();
    if (i == 0){ barchart(content, models[i], groupedData)}
    else{ barchart(content, models[i], JSON.parse(JSON.stringify(testData))); }
    d3.select(e).select('textarea').node().value = JSON.stringify(models[i], undefined, 4);
});

function drawTitle(parentElement, titleModel){
    if (titleModel.text){
        var t = parentElement.append('text')
            .attr('class', 'title')
            .attr('y',0)
            .attr('x',10)
            .text(titleModel.text);
        var titleHeight = t.node().getBBox().height;
        t.attr('y', titleHeight);
        if (titleModel.position === 'center'){
            t.style('text-anchor', 'middle')
            .attr('x', .5*rect.width);
        }
    }
    return titleHeight || 0;
}

// timeseries object.  acts as a viewModel for the parent element.
function barchart(parentElement, m, d){
    var bc = {};
    parentElement.viewModel = bc;
    bc.model = function(m){
        m.title = typeof m.title === 'string' ? {text: m.title} : m.title || {};
        bc.m = m;
        bc.sortIndex = sortOptions.indexOf(m.sort || 'none'); //current cycle index for clicking the sort button.
    }
    bc.data = function(d){
        bc.d = d;
        if (d[0].values){
            bc.grouped = true;
            bc.groupKeys = Object.keys(d[0].values);
            for(var i = 0; i < d.length; i++){
                d[i].index = i; //assign index for sorting, so we can get back to original order
                d[i].value = Object.values(d[i].values).reduce((p,c)=> p+c,0); //sum all values and store in the group holder for sorting purposes
            }
        }
        else{
            for(var i = 0; i < d.length; i++){d[i].index = i} //assign index for sorting, so we can get back to original order
        }
    }
    bc.draw = function(){
        //size svg region to fill parent div
        var rect = parentElement.getBoundingClientRect();
        var p = d3.select(parentElement);
        p.html('');
        var svg = p.append('svg')
                    .attr('width', rect.width)
                    .attr('height', rect.height);
        
        p.append('input').attr('type', 'button').attr('class', 'sortButton').property('value','Sort').on('click', bc.sortClicked);

        var titleHeight = drawTitle(svg, bc.m.title);
        var margin = {top: 20 + .5*titleHeight, right: 20, bottom: 30, left: 40};
        var width = +svg.attr("width") - margin.left - margin.right;
        var height = +svg.attr("height") - margin.top - margin.bottom;
        var g = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        if (bc.m.groupColors){
            bc.z = d3.scaleOrdinal().range(bc.m.groupColors);
        }
        if (bc.m.inverted){  //drawing bars horizontally
            bc.x = d3.scaleLinear().rangeRound([0, width])
                .domain([0, d3.max(bc.d, function(d) { return d.value; })]);
            bc.y = d3.scaleBand().rangeRound([height, 0]).padding(0.1)
                .domain(bc.d.map(function(d) { return d.name; }));
            
            var r = g.selectAll(".bar")
                .data(bc.d)
                .enter().append("rect")
                .attr("class", "bar")
                .attr("x", 0)
                .attr("y", function(d) { return bc.y(d.name); })
                .attr("width", function(d) { return bc.x(d.value); })
                .attr("height", bc.y.bandwidth());
            if (bc.m.colorByValue){
                r.style('fill', function(d){return getColorForValue(bc.m.colorByValue.colors, bc.m.colorByValue.thresholds, d.value); });
            }
            
            var numTicks = width / 60; //TODO: account for tick label width here or rotate these ticks
            bc.xAxis = d3.axisBottom(bc.x).ticks(numTicks, "%");
            bc.yAxis = d3.axisLeft(bc.y);
    
            var xGroup = g.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .call(bc.xAxis);
            if (bc.m.axisLabel && bc.m.axisLabel.text){
                xGroup.append("text")
                    .attr("x", width)
                    .attr("dy", "-0.4em")
                    .attr("text-anchor", "end")
                    .text(bc.m.axisLabel.text);
            }
    
            g.append("g")
                .attr("class", "y axis")
                .call(bc.yAxis)
            
        }
        else{
            bc.x = d3.scaleBand().rangeRound([0, width]).padding(0.1);
            bc.y = d3.scaleLinear().rangeRound([height, 0]);
            if(bc.grouped){
                bc.x.domain(bc.d.map(function(d) { return d.name; }));
                bc.x1 = d3.scaleBand().padding(0.05)
                    .domain(bc.groupKeys).rangeRound([0, bc.x.bandwidth()]);
                bc.y.domain([0, d3.max(bc.d, function(d) { 
                    return d3.max(bc.groupKeys, function(key) { 
                        return d.values[key]; 
                    }); 
                })]);
            
                var barWidth = bc.x1.bandwidth();
            
                g.append("g")
                .selectAll("barGroup")
                .data(bc.d)
                .enter().append("g") //create a group of bars
                  .attr('class', 'barGroup')
                  .attr("transform", function(d) { return "translate(" + bc.x(d.name) + ",0)"; })
                .selectAll("rect")
                .data(function(d) { return bc.groupKeys.map(function(key) { return {key: key, value: d.values[key]}; }); })
                .enter().append("rect")
                  .attr("x", function(d) { return bc.x1(d.key); })
                  .attr("y", function(d) { return bc.y(d.value); })
                  .attr("width", bc.x1.bandwidth())
                  .attr("height", function(d) { 
                      return height - bc.y(d.value); 
                    })
                  .attr("fill", function(d) { return bc.z(d.key); });
            }
            else{
                bc.x.domain(bc.d.map(function(d) { return d.name; }));
                bc.y.domain([0, d3.max(bc.d, function(d) { return d.value; })]);
                var barWidth = bc.x.bandwidth();

                var r = g.selectAll(".bar")
                .data(bc.d)
                .enter().append("rect")
                .attr("class", "bar")
                .attr("x", function(d) { return bc.x(d.name); })
                .attr("y", function(d) { return bc.y(d.value); })
                .attr("width", barWidth)
                .attr("height", function(d) { return height - bc.y(d.value); });
                if (bc.m.colorByValue){
                    r.style('fill', function(d){return getColorForValue(bc.m.colorByValue.colors, bc.m.colorByValue.thresholds, d.value); });
                }
            }
            
            var numTicks = height / 35;
            bc.xAxis = d3.axisBottom(bc.x); //TODO: account for tick label width here or rotate these ticks
            bc.yAxis = d3.axisLeft(bc.y).ticks(numTicks, "%");
    
            var xGroup = g.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .call(bc.xAxis);
    
            var yGroup = g.append("g")
                .attr("class", "y axis")
                .call(bc.yAxis);
            if (bc.m.axisLabel && bc.m.axisLabel.text){
                yGroup.append("text")
                    .attr("transform", "rotate(-90)")
                    .attr("y", 6)
                    .attr("dy", "0.71em")
                    .attr("text-anchor", "end")
                    .text(bc.m.axisLabel.text);
            }
        }

        if(bc.grouped){
            //vertical oriented legend
            //magic numbers in this section are just styling choices to make it 'look good'
            var legend = g.append("g")
                .attr('class', 'chart-legend')
                .attr('transform', `translate(${width-4},8)`)
                .selectAll("g")
                .data(bc.groupKeys)
                .enter().append("g")
                .attr("transform", function(d, i) { return "translate(0," + i * 17 + ")"; });
            
            legend.append("rect")
                .attr("x", 0)
                .attr("width", 15)
                .attr("height", 15)
                .attr("fill", bc.z);
        
            legend.append("text")
                .attr("x", -5)
                .attr("y", 9.5)
                .attr("dy", "0.15em")
                .text(function(d) { return d; });
        }

        bc.mainGraph = g;
    }
    bc.sortClicked = function(){
        bc.sortIndex = (bc.sortIndex+1) % sortOptions.length;
        bc.m.sort = sortOptions[bc.sortIndex];
        bc.sortBars(bc.m.sort, true);
        //HACK
        $(this).closest('.wgt-control').find('textarea').get(0).value = JSON.stringify(bc.m, undefined, 4);
    }
    bc.sortBars = function(sort, animate){
        console.log(sort);
        bc.m.inverted ? bc.sortBarsHoriz(sort, animate) : bc.sortBarsVert(sort, animate);
    }

    //valueAscending, valueDescending, categoryAscending, categoryDescending, none
    function getSortedScale(sort, referenceScale, data, flip){
        var desc = sort.includes('Desc');
        // Copy-on-write since tweens are evaluated after a delay.
        var scale = referenceScale.domain(data.sort(function(a, b) { 
                if (sort.includes('value')) { return (flip ^ desc) ? b.value - a.value : a.value - b.value; }
                else if (sort.includes('cat')) {return (flip ^ desc) ? d3.descending(a.name, b.name) : d3.ascending(a.name, b.name); }
                return  a.index - b.index; //none - so sort on original index
            })
            .map(function(d) { return d.name; }))
            .copy();
        return scale;
    }
    
    bc.sortBarsVert = function(sort, animate) {
        var x0 = getSortedScale(sort, bc.x, bc.d, false);
        
        var transition = bc.mainGraph.transition().duration(animate ? 750 : 0),
            delay = animate ? function(d, i) { return i * 50; } : 0;
        
        if (bc.grouped){
            bc.mainGraph.selectAll(".barGroup")
                .sort(function(a, b) { return x0(a.name) - x0(b.name); });
            transition.selectAll(".barGroup")
                .delay(delay)
                .attr("transform", function(d) { return "translate(" + x0(d.name) + ",0)"; });
        }else{
            bc.mainGraph.selectAll(".bar")
                .sort(function(a, b) { return x0(a.name) - x0(b.name); });
            transition.selectAll(".bar")
                .delay(delay)
                .attr("x", function(d) { return x0(d.name); });
        }
        transition.select(".x.axis")
            .call(bc.xAxis)
          .selectAll("g")
            .delay(delay);
      }

    bc.sortBarsHoriz = function(sort, animate) {

        var y0 = getSortedScale(sort, bc.y, bc.d, true);
    
        var transition = bc.mainGraph.transition().duration(animate ? 750 : 0),
            delay = animate ? function(d, i) { return i * 50; } : 0;

        if (bc.grouped){
            bc.mainGraph.selectAll(".barGroup")
                .sort(function(a, b) { return y0(a.name) - y0(b.name); });
            transition.selectAll(".barGroup")
                .delay(delay)
                .attr("transform", function(d) { return "translate(" + y0(d.name) + ",0)"; });
        }else{
            bc.mainGraph.selectAll(".bar")
            .sort(function(a, b) { return y0(a.name) - y0(b.name); });
    
            transition.selectAll(".bar")
                .delay(delay)
                .attr("y", function(d) { return y0(d.name); });
        }
        transition.select(".y.axis")
            .call(bc.yAxis)
          .selectAll("g")
            .delay(delay);
      }


    bc.model(m);
    bc.data(d);
    bc.draw();
    if (m.sort && m.sort != 'none'){
        bc.sortBars(m.sort, false);
    }
    return bc;


}




