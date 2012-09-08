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
		for (var i = 2; i < bit.length + 1; i++) {
		    var sub = "pr." + bit.substring(0, i);
		    if (! prefixTable[sub])
			prefixTable[sub] = new Array(group);
		    else
			prefixTable[sub].push(group);
		}
	});
    });

    // setup infinite scroll
    infiniteScroll({
	distance: 50,
	callback: function(done) {
	    console.log("scrolling");
	    var roots = document.getElementById("roots");
	    var page = parseInt(roots.getAttribute("page")) + 1;
	    var group = roots.getAttribute("group");
	    if (! group)
		return;
	    getHTML("http://localhost:8080/group/" + group + "/" + page,
		    function(html) {
			roots.innerHTML += html;
			decorateGroupLinks(roots);
			roots.setAttribute("page", page);
			done();
		    });
	}
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
	a.onclick = function() {
	    displayGroup(group);
	    return false;
	}
	a.innerHTML = group;
	results.appendChild(a);
    });
}

function displayGroup(group) {
    getHTML("http://localhost:8080/group/" + group,
	    function(html) {
		var roots = document.getElementById("roots");
		roots.innerHTML = html;
		decorateGroupLinks(roots);
		roots.setAttribute("group", group);
		roots.setAttribute("page", 0);
	    });
}

function decorateGroupLinks(roots) {
    map(roots.getElementsByTagName("A"),
	function(link) {
	    if (link.onclick)
		return;
	    link.onclick = function() {
		var old = document.getElementById(articleId(link.href));
		if (old)
		    removeElem(old);
		else 
		    insertThread(link);
		return false;
	    };
	});
}

function insertThread(link) {
    getHTML(link.href,
	    function(html) {
		var div = document.createElement("div");
		div.className = "thread";
		div.innerHTML = html;
		div.id = articleId(link.href);
		link.parentNode.insertBefore(div, link.nextSibling);
	    });
}

function articleId(url) {
    var regs = url.match(/[0-9]+$/);
    if (regs)
	return "article" + regs;
}

