
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
    //draw(parent, parent.model);
    var r = wgtContent.getBoundingClientRect();
    d3.select('#sizeDisplay').text(r.width + ':' + r.height);
    }
});

var testData = [{name: 'B', value: .01492},{name: 'A', value: .08167},{name: 'C', value: .02782},{name: 'D', value: .04253},{name: 'E', value: .12702},{name: 'F', value: .02288},{name: 'G', value: .02015}];

var models = [
    {title:"foo",sort:"name", axisLabel:{text:"Frequency"}},
    {title:"foo",sort:"value",inverted:true, axisLabel:{text:"custom axis label"}}
];

$('.wgt-content').each(function(i,e){
    barchart(e, models[i], testData);
});

//creates an RFC4122v4 compliant guid string
//from the most upvoted answer here: https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript 
function guid(){
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
});
}

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
        //bc.draw();
    }
    bc.data = function(d){
        bc.d = d;
        bc.draw();
    }
    bc.draw = function(){
        //size svg region to fill parent div
        var rect = parentElement.getBoundingClientRect();
        var p = d3.select(parentElement);
        p.html('');
        var svg = p.append('svg')
                    .attr('width', rect.width)
                    .attr('height', rect.height);
        p.append('label').attr('class', 'sortCheckbox').text('Sort by value')
            .append('input').attr('type', 'checkbox').property('checked', bc.m.sort == "value").on("change", bc.onSortChanged);
        
        var titleHeight = drawTitle(svg, bc.m.title);
        var margin = {top: 20 + .5*titleHeight, right: 20, bottom: 30, left: 40};
        var width = +svg.attr("width") - margin.left - margin.right;
        var height = +svg.attr("height") - margin.top - margin.bottom;
        var g = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        if (bc.m.inverted){  //drawing bars horizontally
            bc.x = d3.scaleLinear().rangeRound([0, width])
                .domain([0, d3.max(bc.d, function(d) { return d.value; })]);
            bc.y = d3.scaleBand().rangeRound([height, 0]).padding(0.1)
                .domain(bc.d.map(function(d) { return d.name; }));
    
            g.selectAll(".bar")
            .data(bc.d)
            .enter().append("rect")
                .attr("class", "bar")
                .attr("x", 0)
                .attr("y", function(d) { return bc.y(d.name); })
                .attr("width", function(d) { return bc.x(d.value); })
                .attr("height", bc.y.bandwidth());
            
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
            bc.x.domain(bc.d.map(function(d) { return d.name; }));
            bc.y.domain([0, d3.max(bc.d, function(d) { return d.value; })]);
    
            g.selectAll(".bar")
            .data(bc.d)
            .enter().append("rect")
                .attr("class", "bar")
                .attr("x", function(d) { return bc.x(d.name); })
                .attr("y", function(d) { return bc.y(d.value); })
                .attr("width", bc.x.bandwidth())
                .attr("height", function(d) { return height - bc.y(d.value); });
            
            var numTicks = height / 30;
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
        bc.mainGraph = g;
    }
    bc.onSortChanged = function(){
        bc.m.sort = this.checked ? "value" : "name";
        bc.sortBars(this.checked, true);
    }
    bc.sortBars = function(isSortByValue, animate){
        bc.m.inverted ? bc.sortBarsHoriz(isSortByValue, animate) : bc.sortBarsVert(isSortByValue, animate);
    }

    bc.sortBarsVert = function(sortByValue, animate) {
    
        // Copy-on-write since tweens are evaluated after a delay.
        var x0 = bc.x.domain(bc.d.sort(sortByValue
            ? function(a, b) { return b.value - a.value; }
            : function(a, b) { return d3.ascending(a.name, b.name); })
            .map(function(d) { return d.name; }))
            .copy();
    
        bc.mainGraph.selectAll(".bar")
            .sort(function(a, b) { return x0(a.name) - x0(b.name); });
    
        var transition = bc.mainGraph.transition().duration(animate ? 750 : 0),
            delay = animate ? function(d, i) { return i * 50; } : 0;
        transition.selectAll(".bar")
            .delay(delay)
            .attr("x", function(d) { return x0(d.name); });
    
        transition.select(".x.axis")
            .call(bc.xAxis)
          .selectAll("g")
            .delay(delay);
      }

    bc.sortBarsHoriz = function(sortByValue, animate) {
    
        // Copy-on-write since tweens are evaluated after a delay.
        var y0 = bc.y.domain(bc.d.sort(sortByValue
            ? function(a, b) { return a.value - b.value; }
            : function(a, b) { return d3.descending(a.name, b.name); })
            .map(function(d) { return d.name; }))
            .copy();
    
        bc.mainGraph.selectAll(".bar")
            .sort(function(a, b) { return y0(a.name) - y0(b.name); });
    
        var transition = bc.mainGraph.transition().duration(animate ? 750 : 0),
            delay = animate ? function(d, i) { return i * 50; } : 0;
        transition.selectAll(".bar")
            .delay(delay)
            .attr("y", function(d) { return y0(d.name); });
    
        transition.select(".y.axis")
            .call(bc.yAxis)
          .selectAll("g")
            .delay(delay);
      }


    bc.model(m);
    bc.d = d;
    bc.draw();
    bc.sortBars(m.sort == "value", false);
    return bc;


}




