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

  addInfiniteScroll();
  checkPageSize();
}

function addInfiniteScroll() {
  // setup infinite scroll
  infiniteScroll({
    distance: 50,
    callback: extendGroupPage
  });
}

function extendGroupPage(done) {
  var roots = document.getElementById("roots");
  var page = parseInt(roots.getAttribute("page")) + 1;
  var group = roots.getAttribute("group");
  if (! group)
    return;
  getHTML("http://localhost:8080/group/" + group + "/" +
	  page + "/naked",
	  function(html) {
	    var div = document.createElement("div");
	    div.innerHTML = html;
	    decorateGroupLinks(div);
	    map(div.childNodes,
		function(node) {
		  roots.appendChild(node);
		});
	    roots.setAttribute("page", page);
	    if (done)
	      done();
	    checkPageSize();
	  });
}

function checkPageSize() {
  if (documentHeight() - 50 < windowHeight())
    extendGroupPage();
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
    a.innerHTML = group + "<br>";
    results.appendChild(a);
  });
}

function displayGroup(group) {
  getHTML("http://localhost:8080/group/" + group + "/0/naked",
	  function(html) {
	    var roots = document.getElementById("roots");
	    roots.innerHTML = html;
	    decorateGroupLinks(roots);
	    roots.setAttribute("group", group);
	    roots.setAttribute("page", 0);
	    checkPageSize();
	  });
}

function decorateGroup(group) {
  var roots = document.getElementById("roots");
  decorateGroupLinks(roots);
  roots.setAttribute("page", 0);
  roots.setAttribute("group", group);
  addInfiniteScroll();
  checkPageSize();
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
  getHTML(link.href + "/naked",
	  function(html) {
	    var div = document.createElement("div");
	    div.className = "thread";
	    div.innerHTML = html;
	    var first = true;
	    map(div.getElementsByTagName("A"),
		function(link) {
		  if (first && link.href.match(/^http/)) {
		    first = false;
		    addThumbnail(div, link.href);
		  }
		  link.onclick = function() {
		    window.open(link.href, '_blank');
		    window.focus();
		    return false;
		  };
		});
	    addPermalink(div, link.href);
	    div.id = articleId(link.href);
	    var next = link.nextSibling;
	    if (next.className == "comments")
	      next = next.nextSibling;
	    link.parentNode.insertBefore(div, next);
	  });
}

function addPermalink(div, url) {
  var link = document.createElement("a");
  link.href = url;
  link.innerHTML = "&nbsp;☉";
  link.className = "permalink";
  link.title = "Permalink";
  var inner = getChildOfType(div, "DIV");
  inner.insertBefore(link, inner.childNodes[0]);
}

function addThumbnail(div, url) {
  var image = new Image();
  image.src = "http://immediatenet.com/t/m?Size=1024x768&URL=" + url;
  image.onload = function() {
    var link = document.createElement("a");
    link.innerHTML =
      "<img src=\"http://immediatenet.com/t/m?Size=1024x768&URL=" +
      url + "\">";
    link.href = url;
    link.className = "thumbnail";
    div.insertBefore(link, div.childNodes[0]);
    link.onclick = function() {
      window.open(link.href, '_blank');
      window.focus();
      return false;
    };
  };
}

function articleId(url) {
  var regs = url.match(/[0-9]+$/);
  if (regs)
    return "article" + regs;
}
