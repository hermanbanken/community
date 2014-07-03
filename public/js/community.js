(function billEdit($, _){
	function ts(t){
		return "[data-type="+t+"], [data-type="+t+"] input";
	}
	function pick(i, e){ 
		var v = e.value && parseFloat(e.value) || 0;
		if(e.className.indexOf("euro") != -1 && v.toFixed(2) != e.value)
			e.value = v.toFixed(2);
		return v;
	}
	function sum(list){
		return _.reduce(list, function(memo, num){ return memo + num }, 0);
	}

	function update(el, val){
		var h = el.jquery && el.get(0) || el.setAttribute && el;
		if(h && h.setAttribute){
			h.setAttribute("value", val);
			h.value = val;
		} else {
		console.log(el)
		throw new Error("Invalid set", el);	
		}
	}

	// Change cost field
	$("#bill-type-tabs [data-type=cost-visual]").on("change", function(){
		var v = (pick(0, this) * 100).toFixed(0);
		var id = $(this).closest("[data-account]").attr('data-account');
		update($("[name='balances["+id+"]']"), v);
		calc();
	});

	// Change presence field
	$("#bill-type-tabs [data-type=presence]").on("change", calc);

	// Change personal field
	$("#bill-type-tabs [data-type=personal-visual]").on("change", function(){
		var visual = $(this).closest("tr").find("[data-type=personal]");
		update(visual, (pick(0, this) * 100).toFixed(0));
		calc();
	});

	/* Method that does the actual computation */
	var calc = function(){
		var costs = sum($(ts("cost")).map(pick).get());
		var personals = sum($(ts("personal"), this).map(pick).get());
		var presences = sum($(ts("presence"), this).map(pick).get());

		if(presences == 0)
			return;

		var costpp = (costs - personals) / presences;

		// Update totals per person
		$("tr[data-type=user]", this).each(function(){
			var id = $(this).attr('data-user');
			var a = parseFloat($(ts("presence"), this).val());
			var b = parseFloat($(ts("personal"), this).val());
			update($(ts("change-visual"), this), ((costpp * a + b)/100).toFixed(2));
			update($("[name='changes["+id+"]']"), (costpp * a + b).toFixed(0));
		});

		// Update totals
		$(ts("total-presence"), this).text(presences);
		$(ts("total-personal"), this).text((personals/100).toFixed(2)).attr('value', (personals/100).toFixed(2));
		var total_cost = sum($(ts("change"), this).map(pick).get())
		$(ts("total-changes"), this).text((total_cost/100).toFixed(2)).attr('value', (total_cost/100).toFixed(2));
	}.bind($("#bill-type-tabs").get(0));

	calc();
})(jQuery, _);