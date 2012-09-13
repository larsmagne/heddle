var touchp = 'ontouchstart' in window;

function XHR() {
  try {
    return new XMLHttpRequest();
  } catch (err) {
    return new ActiveXObject('Microsoft.XMLHTTP');
  }
}

function getHTML(url, callback) {
  var request = XHR();
  request.open("GET", url, true);
  request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

  request.onreadystatechange = function() {
    if (request.readyState == 4 && request.status == 200 &&
	request.responseText) {
      callback(request.responseText);
    }
  };
  request.send("hello");
  return request;
}

var jsonCallbacks = new Array();
var jsonPart = 1;

function getJSON(url, callback) {
  jsonPart++;
  jsonCallbacks[jsonPart] = callback;
  var script = document.createElement("script");
  script.src = url + "&jsonpart=" + jsonPart;
  script.type = "text/javascript";
  document.getElementsByTagName("BODY")[0].appendChild(script);
}

function jsonCallback(data) {
  var callback = jsonCallbacks[data["callback"]];
  if (callback)
    callback(data);
}

function windowWidth() {
  return window.innerWidth || document.documentElement.clientWidth ||
    document.body.clientWidth;
}

function windowHeight() {
  return window.innerHeight || document.documentElement.clientHeight ||
    document.body.clientHeight;
}

function windowScrollX() {
  return window.pageXOffset || document.body.scrollLeft ||
    document.documentElement.scrollLeft;
}

function windowScrollY() {
  return window.pageYOffset || document.body.scrollTop ||
    document.documentElement.scrollTop;
}

function documentWidth() {
  return document.body.scrollWidth || document.body.offsetWidth ||
    document.documentElement.scrollWidth;
}

function documentHeight() {
  return document.body.scrollHeight || document.body.offsetHeight ||
    document.documentElement.scrollHeight;
}

function getElementsByTagAndName(tag, name) {
  var tags = document.getElementsByTagName(tag);
  var result = new Array();
  for (var i = 0; i < tags.length; i++) {
    var elem = tags[i];
    if (elem.getAttribute("name") == name)
      result.push(elem);
  }
  return result.reverse();
}

function findPos(elem) {
  var curleft = curtop = 0;
  if (elem.style && elem.style.left)
    return [numberify(elem.style.left), numberify(elem.style.top)];

  if (elem.offsetParent) {
    do {
      curleft += elem.offsetLeft;
      curtop += elem.offsetTop;
    } while (elem = elem.offsetParent);
  }
  return [curleft, curtop];
}

function eventPosition(ev) {
  var x, y;
  ev = getEvent(ev);
  if (ev.touches && ev.touches.length > 0) {
    x = ev.touches[ev.touches.length - 1].clientX + document.body.scrollLeft +
      document.documentElement.scrollLeft;
    y = ev.touches[ev.touches.length - 1].clientY + document.body.scrollTop +
      document.documentElement.scrollTop;
    return [x, y];
  }

  if (ev.pageX || ev.pageY) {
    x = ev.pageX;
    y = ev.pageY;
  } else {
    x = ev.clientX + document.body.scrollLeft +
      document.documentElement.scrollLeft;
    y = ev.clientY + document.body.scrollTop +
      document.documentElement.scrollTop;
  }
  return [x, y];
}

function eventElement(ev) {
  if (! ev)
    return window.event.srcElement;
  else
    return ev.target;
}

function makeUndraggable(elem) {
  elem.onselectstart = function() { return false; }
  elem.draggable = false;
  elem.onmousedown = function(ev) {
    if (! ev) ev = window.event;
    try { ev.preventDefault(); } catch (err) {}
    return false;
  };
}

function disableSelection(elem) {
  if (typeof elem.onselectstart != "undefined")
    elem.onselectstart = function () { return false; }
  else if (elem.style && typeof elem.style.MozUserSelect != "undefined")
    elem.style.MozUserSelect = "none";

  elem.onmousedown = function() { return false; }
}

function getStyle(elem, prop) {
  if (elem.currentStyle)
    return elem.currentStyle[prop];
  else if (window.getComputedStyle)
    return document.defaultView.getComputedStyle(elem,null).getPropertyValue(prop);
}

function getZIndex(elem) {
  if (elem.style && elem.style.zIndex)
    return elem.style.zIndex;
  else if (elem.parentNode)
    return getZIndex(elem.parentNode);
  else
    return 100;
}

function getEvent(e) {
  if (!e)
    return window.event;
  else
    return e;
}

function stopPropagation(e) {
  e = getEvent(e);
  e.cancelBubble = true;
  if (e.stopPropagation)
    e.stopPropagation();
}

function preventDefault(e) {
  try {
    e.preventDefault();
  } catch(err) {}
}

function getKey(e) {
  if (e && e.target) { // Netscape
    return e.keyCode;
  } else { // non-Netscape
    e = window.event;
    return e.keyCode;
  }
}

function removeElem(elem) {
  if (elem) {
    if (elem.parentNode)
      elem.parentNode.removeChild(elem);
  }
}

function removeChildren(elem) {
  while (elem.childNodes.length > 0)
    elem.removeChild(elem.childNodes[0]);
}

function parentOfType(elem, type) {
  do {
    elem = elem.parentNode;
  } while (elem && elem.nodeName != type);
  return elem;
}

function map(list, func) {
  if (! list)
    return;
  for (var i = 0; i < list.length; i++)
    func(list[i]);
}

function mapCar(list, func) {
  var result = new Array();
  if (! list)
    return;
  for (var i = 0; i < list.length; i++)
    result.push(func(list[i]));
  return result;
}

function setCookie(name, value, domain, days, path) {
  var today = new Date();
  var expire = new Date();
  if (days == null || days == 0)
    days = 1;
  expire.setTime(today.getTime() + 3600000 * 24 * days);
  document.cookie = name + "=" + escape(value) +
    ";expires=" + expire.toGMTString() +
    ";domain=" + escape(domain) +
    ";path=" + escape(path);
}

function assocGet(name, arr) {
  var result = false;
  map(arr,
      function(elem) {
	if (elem[0] == name)
	  result = elem[1];
      });
  return result;
}

function plistGet(name, arr) {
  for (var i = 0; i < arr.length; i += 2) {
    if (arr[i] == name)
      return arr[i + 1];
  }
  return false;
}

function composeFunction(oldFunc, newFunc) {
  return function(ev) {
    if (oldFunc)
      oldFunc(ev);
    return newFunc(ev);
  };
}

function subseq(sequence, from, to) {
  var result = new Array();
  if (! to)
    to = sequence.length;
  for (var i = from; i < to; i++)
    result.push(sequence[i]);
  return result.reverse();
}

function last(sequence) {
  return sequence[sequence.length - 1];
}

function getChildOfType(elem, type) {
  for (var i = 0; i < elem.childNodes.length; i++)
    if (elem.childNodes[i].nodeName == type)
      return elem.childNodes[i];
}

function pixelRatio() {
  return window.devicePixelRatio || 1;
}

function getTextValue(elem) {
  var text = "";
  for (var i = 0; i < elem.childNodes.length; i++) {
    var child = elem.childNodes[i];
    if (child.nodeType == 3)
      text = text + child.nodeValue;
    else if (child.nodeType == 1)
      text = text + getTextValue(child);
  }
  return text;
}

function position(arr, value) {
  for (var i = 0; i < arr.length; i++) {
    if (arr[i] == value)
      return i;
  }
  return -1;
}
