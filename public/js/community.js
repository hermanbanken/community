/* Typeahead */
(function($, _){
	function handleChange(suggest, e, pick){
	if(suggest.find(".selected").size() == 0)
		suggest.find("li:visible").first().addClass('selected');

	if(e.keyCode == 27 /* esc */ || e.type == 'blur')
		suggest.delay(100).hide(10);
	if(e.keyCode == 38 /* up */)
		suggest.find(".selected").removeClass('selected').prev().addClass('selected');
	if(e.keyCode == 40 /* down */)
		suggest.find(".selected").removeClass('selected').next().addClass('selected');
	if(e.keyCode == 13 /* enter */){
		suggest.hide();

		/* keyup is called later */
		if(e.type != 'keypress')
			return false; 

		pick.call(
			e.target,
			$(".selected", suggest).attr('data-id'),
			$(".selected", suggest).text().trim()
		);
		e.preventDefault(); 
		return false;
	}
	
	if(suggest.find(".selected").size() == 0)
		suggest.find("li:visible").first().addClass('selected');
}

function addSuggest(type, relativeTo){
	var suggest = $(".suggest[data-role=template][data-suggest="+type+"]").clone();
	suggest.removeAttr('style').removeAttr('data-role');
	
	$("<div class='typeahead'></div>").append(suggest).appendTo(document.body);

	return suggest;
}

function cmp(a, b){
	return a.toLowerCase().indexOf(b.toLowerCase()) > -1;
}

$.fn.extend({
	typeahead: function(pick){
		this.attr("autocomplete", "off");
		var suggest;

		this.on("click keyup keypress blur focus", function(e){
			// First time, then create suggest
			if(!suggest){
				var type = $(this).attr('data-typeahead');
				suggest = addSuggest(type, $(this));

				suggest.on('click', 'li', function(){
					console.log("click", arguments, this)
					pick.call(
						e.target,
						$(this).attr('data-id'), 
						$(this).text().trim()
					);
				});
			} else 
				$(".typeahead").append(suggest);
			
			var p = $(this);
			suggest.css({
				position: "absolute",
				left: p.left,
				top: p.top + $(this).height(),
				width: $(this).width(),
			});
			suggest.show();

			
			// Filter
			var filter = this.value;
			suggest.find("li").hide();
			suggest.find("li").each(function(){
				var inText = cmp(this.innerText, filter);
				if(inText || cmp($(this).attr('data-tags'), filter))
					$(this).show();
				else 
					$(this).hide();
			});

			return handleChange(suggest, e, pick);
		});

		return suggest;
	},
});
})(jQuery, _);

/* Deposit bills */
(function billDeposit($, _){

	$("[data-typeahead]")
	.on('keyup', function(){
		var b = this.hasAttribute('data-id');
		if(b && this.value != this.getAttribute('data-username'))
			this.removeAttribute('data-id');

		// Class flipping
		if(!this.value)
			$(this).next('.glyphicon').removeClass("glyphicon-ok");
		else
			$(this).next('.glyphicon').toggleClass("glyphicon-remove", !b).toggleClass("glyphicon-ok", b);
	})
	.trigger('keyup')
	.typeahead(function(id, name){
		console.log(this, arguments);
		this.value = name;
		this.setAttribute('data-id', id);
		this.setAttribute('data-username', name);

		$(this).closest("tr").find("[data-name]").each(function(){
			$(this).attr('name', $(this).attr('data-name').replace(/deposits\[[^\[]*\]/, "deposits["+id+"]"));
		})

		$(this).next('.glyphicon').removeClass("glyphicon-remove").addClass("glyphicon-ok");
	});

})(jQuery, _);

/* Standard bills */
(function billStandard($, _){
	function ts(t){
		return "[data-type="+t+"], [data-type="+t+"] input";
	}
	function pick(i, e){
		if(e.jquery)
			e = e.get(0);
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
	$("[data-type=cost-visual]", this).on("change", function(){
		var v = (pick(0, this) * 100).toFixed(0);
		var id = $(this).closest("[data-account]").attr('data-account');
		update($("[name='balances["+id+"]']"), v);
		calc();
	});

	// Change presence field
	$("[data-type=presence]", this).on("change keyup blur", calc);

	// Change personal field
	$("[data-type=personal-visual]", this).on("change", function(){
		var visual = $(this).closest("tr").find("[data-type=personal]");
		update(visual, (pick(0, this) * 100).toFixed(0));
		calc();
	});

	/* Method that does the actual computation */
	function calc(){ (function()
	{
		var costs = sum($(ts("cost")).map(pick).get());
		var personals = sum($(ts("personal"), this).map(pick).get());
		var presences = sum($(ts("presence"), this).map(pick).get());

		if(presences == 0)
			return;

		var costpp = (costs - personals) / presences;

		// Update totals per person
		$("tr[data-type=user]", this).each(function(){
			var id = $(this).attr('data-user');
			var a = pick(0, $(ts("presence"), this));
			var b = pick(0, $(ts("personal"), this));
			update($(ts("change-visual"), this), ((costpp * a + b)/100).toFixed(2));
			update($("[name='changes["+id+"]']"), (costpp * a + b).toFixed(0));
		});

		// Update totals
		$(ts("total-presence"), this).text(presences);
		$(ts("total-personal"), this).text((personals/100).toFixed(2)).attr('value', (personals/100).toFixed(2));
		var total_cost = sum($("[name^='changes']").map(pick).get())
		$(ts("total-changes"), this).text((total_cost/100).toFixed(2)).attr('value', (total_cost/100).toFixed(2));
	
	}).bind($("#billEditorStandard").get(0)).call(); }

	calc();
}.bind($("#billEditorStandard").get(0)))(jQuery, _);