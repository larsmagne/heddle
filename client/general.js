var touchp = 'ontouchstart' in window;
var imgUrl = "/";
var baseUrl = "/";

function XHR () {
  try {
    return new XMLHttpRequest();
  } catch (err) {
    return new ActiveXObject('Microsoft.XMLHTTP');
  }
}

function getHTML (url, callback) {
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

function getJSON (url, callback) {
  jsonPart++;
  jsonCallbacks[jsonPart] = callback;
  var script = document.createElement("script");
  script.src = url + "&jsonpart=" + jsonPart;
  script.type = "text/javascript";
  document.getElementsByTagName("BODY")[0].appendChild(script);
}

function jsonCallback (data) {
  var callback = jsonCallbacks[data["callback"]];
  if (callback)
    callback(data);
}

function addTextSubmit (input, func) {
  input.onkeypress = 
    function (e, origin) {
      if (!e) e = window.event;
      var code = e.charCode || e.keyCode;
      if (code == 13) {
	func(this);
	return false;
      }
    }
}

function disableButtons() {
  var inputs = document.getElementsByTagName("input");
  for (var i = 0; i < inputs.length; i++) {
    var input = inputs[i];
    if (input.type == "submit")
      input.disabled = true;
  }
  return true;
}

function addDefaultSubmitAction() {
  var forms = document.getElementsByTagName("FORM");
  for (var i = 0; i < forms.length; i++) {
    var form = forms[i];
    if (form.name != "gototick") {
      form.onsubmit = disableButtons;
    }
  }
}

function windowWidth () {
  return window.innerWidth || document.documentElement.clientWidth || 
    document.body.clientWidth;
}

function windowHeight () {
  return window.innerHeight || document.documentElement.clientHeight || 
    document.body.clientHeight;
}

function windowScrollX () {
  return window.pageXOffset || document.body.scrollLeft ||
    document.documentElement.scrollLeft;
}

function windowScrollY () {
  return window.pageYOffset || document.body.scrollTop ||
    document.documentElement.scrollTop;
}

function documentWidth () {
  return document.body.scrollWidth || document.body.offsetWidth ||
    document.documentElement.scrollWidth;
}

function documentHeight () {
  return document.body.scrollHeight || document.body.offsetHeight ||
    document.documentElement.scrollHeight;
}

function getElementsByTagAndName (tag, name) {
  var tags = document.getElementsByTagName(tag);
  var result = new Array();
  for (var i = 0; i < tags.length; i++) {
    var elem = tags[i];
    if (elem.getAttribute("name") == name)
      result.push(elem);
  }
  return result.reverse();
}

function getElementsByName (name, node) {
  var root = false;
  if (! node) {
    var builtin = document.getElementsByName(name);
    if (builtin && builtin.length > 0)
      return builtin;

    node = document.documentElement;
    root = true;
  }
  var result = false;
  if (node.getAttribute("name") == name) {
    result = new Array();
    result.push(node);
  }
  for (var i = 0; i < node.childNodes.length; i++) {
    var child = node.childNodes[i];
    if (child.nodeType == 1) {
      var children = getElementsByName(name, child);
      if (children) {
	if (! result)
	  result = new Array();
	result = result.concat(children);
      }
    }
  }
  if (root && ! result)
    result = new Array();
  return result;
}

function numberify (value) {
  if (! value)
    return 0;
  else if (typeof value == "string")
    return parseInt(value.replace(/px|pt/, ""));
  else
    return value;
}

function findPos (elem) {
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

function eventPosition (ev) {
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

function eventElement (ev) {
  if (! ev)
    return window.event.srcElement;
  else
    return ev.target;
}

function makeUndraggable (elem) {
  elem.onselectstart = function () { return false; }
  elem.draggable = false;
  elem.onmousedown = function (ev) {
    if (! ev) ev = window.event;
    try { ev.preventDefault(); } catch (err) {}
    return false;
  };
}

function disableSelection (elem) {
  if (typeof elem.onselectstart != "undefined")
    elem.onselectstart = function () { return false; }
  else if (elem.style && typeof elem.style.MozUserSelect != "undefined")
    elem.style.MozUserSelect = "none";

  elem.onmousedown = function () { return false; }
}

function getStyle (elem, prop) {
  if (elem.currentStyle)
    return elem.currentStyle[prop];
  else if (window.getComputedStyle)
    return document.defaultView.getComputedStyle(elem,null).getPropertyValue(prop);
}

function getZIndex (elem) {
  if (elem.style && elem.style.zIndex)
    return elem.style.zIndex;
  else if (elem.parentNode)
    return getZIndex(elem.parentNode);
  else
    return 100;
}

function getEvent (e) {
  if (!e) 
    return window.event;
  else
    return e;
}

function stopPropagation (e) {
  e = getEvent(e);
  e.cancelBubble = true;
  if (e.stopPropagation)
    e.stopPropagation();
}

function preventDefault (e) {
  try {
    e.preventDefault();
  } catch(err) {}
}

function getKey (e) {
  if (e && e.target) { // Netscape
    return e.keyCode;
  } else { // non-Netscape
    e = window.event;
    return e.keyCode;
  }
}

var garbageCollector = false;

function discardElem (elem) {
  return;
  if (! garbageCollector) {
    garbageCollector = document.createElement('div');
    garbageCollector.style.display = 'none';
    document.body.appendChild(garbageCollector);
  }
  garbageCollector.appendChild(elem);
  garbageCollector.innerHTML = "";
}

function removeElem (elem) {
  if (elem) {
    if (elem.parentNode)
      elem.parentNode.removeChild(elem);
    discardElem(elem);
  }
}

function removeChildren (elem) {
  while (elem.childNodes.length > 0)
    elem.removeChild(elem.childNodes[0]);
}

function parentOfType (elem, type) {
  do {
    elem = elem.parentNode;
  } while (elem && elem.nodeName != type);
  return elem;
}

function padNumber (number) {
  if (number >= 10)
    return number.toString();
  else
    return "0" + number.toString();
}

function padMoney (number) {
  var string = number.toString();
  var decimals = string.split(".")[1];
  if (!decimals)
    return number + ".00";
  else if (decimals.length == 0)
    return number + "00";
  else if (decimals.length == 1)
    return number + "0";
  else
    return number;
}

function formatMoney (number) {
  var whole = Math.floor(number);
  var decimals = Math.round((number - whole)*100);
  if (decimals == 100) {
    whole++;
    decimals = 0;
  }
  return formatInteger(whole) + "." + padNumber(decimals);
}

function formatInteger (number) {
  var string = number.toString();
  var result = false;
  while (string.length > 3) {
    var bit = string.substring(string.length - 3);
    if (result)
      result = bit + " " + result;
    else
      result = bit;
    string = string.substring(0, string.length - 3);
  }
  if (result)
    return string + " " + result;
  else
    return string;
}

function makeTrVisible (tr) {
  try {
    tr.style.visibility = "visible";
    tr.style.display = "table-row";
  } catch(err) {
    tr.style.cssText = "display: inline; visibility: visible;";
  }
}

function map (list, func) {
  if (! list)
    return;
  for (var i = 0; i < list.length; i++)
    func(list[i]);
}

function mapCar (list, func) {
  var result = new Array();
  if (! list)
    return;
  for (var i = 0; i < list.length; i++)
    result.push(func(list[i]));
  return result;
}

function setCookie (name, value, domain, days, path) {
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

function assocGet (name, arr) {
  var result = false;
  map(arr,
      function(elem) {
	if (elem[0] == name)
	  result = elem[1];
      });
  return result;
}

function plistGet (name, arr) {
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

function subseq (sequence, from, to) {
  var result = new Array();
  if (! to)
    to = sequence.length;
  for (var i = from; i < to; i++)
    result.push(sequence[i]);
  return result.reverse();
}

function last (sequence) {
  return sequence[sequence.length - 1];
}

function getChildOfType(elem, type) {
  for (var i = 0; i < elem.childNodes.length; i++)
    if (elem.childNodes[i].nodeName == type)
      return elem.childNodes[i];
}

function addTopLevelLinks() {
  map(document.getElementsByTagName("A"),
      function(a) {
	a.setAttribute("target", "_top");
      });
}

function pixelRatio() {
  return window.devicePixelRatio || 1;
}

function parseSloppyFloat(string) {
  string = string.replace(/[,]/g, ".");
  string = string.replace(/[^-0-9.]/g, "");
  if (string == "")
    return 0;
  else
    return parseFloat(string);
}

function getTextValue (elem) {
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

