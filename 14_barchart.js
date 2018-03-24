
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

var testData = [{name: 'A', value: .08167},{name: 'B', value: .01492},{name: 'C', value: .02782},{name: 'D', value: .04253},{name: 'E', value: .12702},{name: 'F', value: .02288},{name: 'G', value: .02015}];

var models = [
    {title:"foo"}
];

$('.wgt-content').each(function(i,e){
    barchart(e, models[i], testData);
});


// timeseries object.  acts as a viewModel for the parent element.
function barchart(parentElement, m, d){
    var bc = {};
    parentElement.viewModel = bc;
    bc.model = function(m){
        bc.m = m;
        bc.draw();
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
        
        if (bc.m.title.text){
            var t = svg.append('text')
                .attr('class', 'title')
                .attr('y',0)
                .attr('x',10)
                .text(bc.m.title.text);
            titleHeight = t.node().getBBox().height;
            t.attr('y', titleHeight);
            if (bc.m.title.position === 'center'){
                t.style('text-anchor', 'middle')
                .attr('x', .5*rect.width);
            }
        }

        var margin = {top: 20, right: 20, bottom: 30, left: 40};
        var width = +svg.attr("width") - margin.left - margin.right;
        var height = +svg.attr("height") - margin.top - margin.bottom;
        var x = d3.scaleBand().rangeRound([0, width]).padding(0.1),
            y = d3.scaleLinear().rangeRound([height, 0]);

        var g = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

          x.domain(bc.d.map(function(d) { return d.name; }));
          y.domain([0, d3.max(bc.d, function(d) { return d.value; })]);

          g.append("g")
              .attr("class", "axis axis--x")
              .attr("transform", "translate(0," + height + ")")
              .call(d3.axisBottom(x));

          g.append("g")
              .attr("class", "axis axis--y")
              .call(d3.axisLeft(y).ticks(10, "%"))
            .append("text")
              .attr("transform", "rotate(-90)")
              .attr("y", 6)
              .attr("dy", "0.71em")
              .attr("text-anchor", "end")
              .text("Frequency");

          g.selectAll(".bar")
            .data(bc.d)
            .enter().append("rect")
              .attr("class", "bar")
              .attr("x", function(d) { return x(d.name); })
              .attr("y", function(d) { return y(d.value); })
              .attr("width", x.bandwidth())
              .attr("height", function(d) { return height - y(d.value); });
    }

    bc.m = m;
    bc.d = d;
    bc.draw();
    return bc;


}




