module.exports = {
	animate: function(mousePosition0, projection, feature){
		var currentCenter = projection.rotate(),
			mousePosition1 = [d3.event.pageX, d3.event.pageY],
			newCenter = [currentCenter[0] + (mousePosition0[0]-mousePosition1[0]) / 8, currentCenter[1] + (mousePosition1[1]-mousePosition0[1]) / 8];

		//set rotate according to mouse event
	    projection.rotate([-newCenter[0], -newCenter[1], 0]);
	    //rerender path using new projection
		feature.attr('d', d3.geoPath().projection(projection));
		//rerender labels
		label.attr('transform', function(d) { 
			var center = path.centroid(d);
			if (!isNaN(center[0])){
				return 'translate(' + [center[0] - 20, center[1]] + ')';
			}
		});		
	}
}