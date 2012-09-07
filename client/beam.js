var prefixTable;

function decorateHeddle() {
    var results = document.getElementById("searchResults");
    var input = document.getElementById("search");

    input.onkeyup = function() {
	displayResults(input, results);
    };

    prefixTable = new Array();
    map(groups, function(group) {
	map(group.split("."), function(bit) {
	    if (bit.length > 2)
		for (var i = 2; i < bit.length; i++) {
		    var sub = "pr." + bit.substring(0, i);
		    if (! prefixTable[sub])
			prefixTable[sub] = new Array(group);
		    else
			prefixTable[sub].push(group);
		}
	});
    });
}

function displayResults(input, results) {
    var matches = prefixTable["pr." + input.value];
    if (! matches)
	return;
    removeChildren(results);
    map(matches, function(group) {
	group = "gwene." + group;
	var a = document.createElement("a");
	a.href = "/group/" + group;
	a.innerHTML = group;
	results.appendChild(a);
    });
}
