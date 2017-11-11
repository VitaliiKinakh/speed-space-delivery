(function(){
  document.addEventListener('DOMContentLoaded', function(){
	/*<global variables>*/
	// Help variables 
	// Begin and end are reqiured for aStar algorithm
	// Path for custom algorithm
	// Algo variable for changing algorithm
	let begin, end;
		
	// Todays date
	var today;
	
	// Values for start of jpurney time and for end of journey time
	let beginTime, expectedDeliveryTime;
	/*<global variables>*/
	
	// Initialize cytoscape map for future adding graph
	let cy;
	
	/* Function for running aStar algorithm
	*  As custom algorithm is aStar - based 
	*  Takes: algrorithm as promise
	*  Sets option from global variables
	*  Return: resolve promise algorithm with options
	*/
	let runAlgorithm = (algorithm) => {
		if (algorithm === undefined) {
			return Promise.resolve(undefined);
		} else{
			let options = {
				root: '#' + begin,
				// astar requires target; goal property is ignored for other algorithms
				goal: '#' + end,
				weight : function(edge){
					return Number(edge.data().length) * Number(edge.data().difficulty);
				}
			};
			return Promise.resolve(algorithm(options));
		}
	}
						
	/*Varible for saving curret algorithm*/
	let currentAlgorithm;
		
	/* Function for animating algorithm
	*  In this case it will show the position of delivery 
	*  Takes: algResults returned by runAlgorithm
	*  Applies algorithm with animation
	*/
    let animateAlgorithm = (algResults) => {
		// clear old algorithm results
		cy.$().removeClass('highlighted start end');
		cy.$().removeClass('delivery-place');
		currentAlgorithm = algResults;
		if (algResults === undefined || algResults.path === undefined) {
			return Promise.resolve();
		}
		else {
			let i = 0;
			// for path algorithm
			// Case astar path algorithm
			let time = 4;
			for(let k = 1; k < algResults.path.length - 1; ++k)
			{
				//alert(time);
				if(algResults.path[k].group() == "edges")
				{
					time += Number(algResults.path[k].data().length * algResults.path[k].data().difficulty);
					//alert(algResults.path[k].data().length * algResults.path[k].data().difficulty);
				}else{
					if(algResults.path[k].group() == "nodes")
					{
						time += 2.0;
					}
				}
			}

			// Compute abstract time to real time
			let secondsInAbsractTime = expectedDeliveryTime / time;
			
			// Compute how many abstract time goes thtow from start to today
			let todayBeginTimeDiff = Math.abs(today.getTime() - beginTime.getTime());
			let timeUnitsTodayBeginDiff = todayBeginTimeDiff / secondsInAbsractTime + 4;
		
			// for astar, highlight first and final before showing path
			if (algResults.distance) {
				// Among DFS, BFS, A*, only A* will have the distance property defined
				algResults.path[0].addClass('highlighted start');
				algResults.path[algResults.path.length - 1].addClass('highlighted end');
				// i is not advanced to 1, so start node is effectively highlighted twice.
				// this is intentional; creates a short pause between highlighting ends and highlighting the path
			}
			
			return new Promise(resolve => {
				let highlightNext = () => {
					if (currentAlgorithm === algResults && i < algResults.path.length && timeUnitsTodayBeginDiff > 0) {
						do{
							if(algResults.path[i].group() == "nodes")
							{
								timeUnitsTodayBeginDiff -= 2;
							}else{
								timeUnitsTodayBeginDiff -= (Number(algResults.path[i].data().length) * Number(algResults.path[i].data().difficulty));
							}
							if(timeUnitsTodayBeginDiff > 0){
								i++;
							}
						}while(timeUnitsTodayBeginDiff > 0);
						cy.animate({
							fit: {
								eles: algResults.path[i],
								padding: 200
							},
							duration: 700,
							easing: 'ease',
							queue: true
						});
						
						// show info
						if(algResults.path[i].group() == "edges")
						{
							$("#delivery-info").html(
							"Your delivery is on path between " + cy.getElementById(algResults.path[i].data().source).data().name + " and " 
							+ cy.getElementById(algResults.path[i].data().target).data().name + ".");
							$("#delivery-info").css("visibility", "visible");
						}
						
						
						algResults.path[i].addClass('delivery-place');
						highlightNext();
					} else {
						// resolve when finished or when a new algorithm has started visualization
						resolve();
					}
				}
				highlightNext();
			});
		}
    };
	
	
	/*Promise for appplying algorithm*/
    let applyAlgorithmFromSelect = () => tryPromise(getAlgorithm).then( runAlgorithm ).then( animateAlgorithm );
	
	/*Variable for saving delivery data*/
	let deliveryData;
	
	/* Function for appling dataset
	*  Takes: dataset
	*  Applies dataset to cytoscape map
	*/
	let applyDatasetDeliveries = dataset => {
		deliveryData = dataset;	
	};
	
	/* Variable for saving containers */
	let containers;
	
	/* Function for saving constiners to variable */
	let applyContainers = dataset =>{
		containers = dataset;
	}

	/* Promise for getting container dataset*/
	let applyDatasetContainers = () => Promise.resolve("https://someleltest.herokuapp.com/api/orders/containers?SID=" + SID).then(getDataset).then(applyDatasetContainers);
	
	/*Promise for getting deliveries dataset*/
	let applyDatasetD = () => Promise.resolve("https://someleltest.herokuapp.com/api/orders?SID=" + SID).then( getDataset ).then( applyDatasetDeliveries );
	
	// Function for adding event listeners to submit
	let setEventListeners = () => {
		$("#submit").on("click", function()
		{
			cy.$().removeClass('delivery-place');
			cy.$().removeClass('start-delivery-place');
			cy.$().removeClass('end-delivery-place');
			cy.$().removeClass('highlighted');
			cy.$().removeClass('end');
			cy.$().removeClass('start');
			
			$("#delivery-info").css("visibility", "hidden");
			
			cy.stop();
			// Here must be some validation
			if($("#truck-number").val() != "" && $("#truck-number").val() != undefined)
			{
				// Simple search
				let currentDelivery = -1;
				for(var i = 0; i < deliveryData.length; ++i)
				{
					if(deliveryData[i]["trackID"] == $("#truck-number").val())
					{
						currentDelivery = deliveryData[i];
						break;
					}
				}
				
				if(currentDelivery != -1){
					if(currentDelivery["status"] == "registered" || currentDelivery["status"] == "accepted")
					{
						let begin = findPlanetIdByName(currentDelivery["from"]);
						if(begin != -1)
						{
							cy.getElementById(begin).addClass("start-delivery-place");
							cy.animate({
								fit: {
									eles: cy.getElementById(begin),
									padding: 200
								},
								duration: 700,
								easing: 'ease',		
								queue: true
							});
						}
					}else if(currentDelivery["status"] == "inprogress")
					{
						let beginPlanet = currentDelivery["from"];
						let endPlanet = currentDelivery["to"];
					
						begin = findPlanetIdByName(beginPlanet);
						end = findPlanetIdByName(endPlanet);
						if(begin != -1 && end != -1)
						{
							if(today == undefined)
							{
								today = new Date();
							}	
							
							if(currentDelivery["send_date"] != undefined)
							{
								beginTime = new Date(currentDelivery["send_date"]);
								expectedDeliveryTime = currentDelivery["esttime"] * 24 * 60 * 60 * 1000; // in milliseconds
								tryPromise(applyAlgorithmFromSelect);
							}
						}
					}else if(currentDelivery["status"] == "waitingpickup" || currentDelivery["status"] == "delivered")
					{
						let end = findPlanetIdByName(currentDelivery["to"]);
						if(begin != -1)
						{
							cy.getElementById(end).addClass("end-delivery-place");
							cy.animate({
								fit: {
									eles: cy.getElementById(end),
									padding: 200
								},
								duration: 700,
								easing: 'ease',		
								queue: true
							});
						}
					}else if(currentDelivery["status"] == "canceled")
					{
						$("#error").html("<b>Error!</b>This delivery was canceled!");
						$("#error").css("visibility","visible");
					}else if(currentDelivery["status"] == "returned")
					{
						$("#error").html("<b>Error!</b>This delivery was returned!");
						$("#error").css("visibility","visible");
					}
				}else{
					$("#error").html("<b>Error!</b>Invalid track ID!");
					$("#error").css("visibility","visible");
				}
			}else{
					$("#error").html("<b>Error!</b>Please, enter track ID!");
					$("#error").css("visibility","visible");
			}
		});
	}
		
	// </Helper functions>
	
	$("#truck-number").on("input", function(){
		$("#error").css("visibility","hidden");
	});
	
	// Write data to page
	tryPromise(applyDatasetD).then(setEventListeners);
	// Create cytoscape map for graph
    cy = window.cy = cytoscape({
      container: $('#cy')
    });
	
		/* Display planet info on mouseover */
	cy.on('mouseover', 'node', function(event) {
		let node = event.cyTarget;
		let info = "Planet name: " + node.data("name") + "<br/>" + "Galactic: " + node.data("galactic") + "<br/>"+"URL: " + node.data("image");
		node.qtip({
			content: info,
			show: {
				event: event.type,
				ready: true
			},
			hide: {
				event: 'mouseout unfocus'
			}
		}, event);
	});
	
	// All promises and events
    tryPromise( applyDatasetFromSelect ).then( applyPathsFromSelect ).then( applyStylesheetFromSelect ).then( applyLayoutFromSelect );
  });
})();

// tooltips with jQuery
$(document).ready(() => $('.tooltip').tooltipster());