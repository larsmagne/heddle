var root = "/home/larsi/tmp/warp";

var util = require("util"),
http = require("http"),
path = require("path"),
url = require("url"),
fs = require("fs"),
Buffer = require('buffer').Buffer;

var clientPath = "/home/larsi/src/heddle";

function issue404(response) {
    response.writeHeader(404, {"Content-Type": "text/plain"});
    response.write("404 Not Found\n");
    response.end();
}

http.createServer(function(request, response) {
    var file = url.parse(request.url).pathname;

    util.puts(file);

    if (file == "/")
	file = "/client/index.html";
    
    if (file.match(/^.client/))
	outputStatic(file, response);
    else if (file.match(/^.group/))
	outputGroup(file, response);
    else if (file.match(/^.thread/))
	outputThread(file, response);
    else
	issue404(response);
}).listen(8080);

function outputStatic(file, response) {
    if (file.match(/\.\./)) {
	issue404();
	return;
    }
    
    var full_path = path.join(clientPath, file);

    path.exists(full_path, function(exists) {
        if (! exists)
	    issue404(response);
        else {
	  fs.readFile(full_path, "binary", function(err, file) {
	      if (err) {
		  response.writeHeader(500, {"Content-Type": "text/plain"});
		  response.write(err + "\n");
		  response.end();
	      } else {
		  if (full_path.match(/\.html$/))
		      contentType = "text/html";
		  else if (full_path.match(/\.css$/))
		      contentType = "text/css";
		  else
		      contentType = "text/plain";
		  response.writeHeader(200, {"Content-Type": contentType +
					     " ;charset=utf-8"});
		  response.write(file, "binary");
		  response.end();
	      }
            });
        }
      });
}

function outputGroup(url, response) {
    var regs = url.match(/\/group\/([^\/]+)(\/([0-9]+))?/);
    if (! regs)
	return;
    var group = regs[1];
    var page = regs[2];
    if (! page)
	page = 0;

    var warp = path.normalize(root + "/" + group.replace(/\./g, "/") + "/WARP");
    util.puts(warp);

    path.exists(warp, function(exists) {
        if (! exists) {
	    issue404(response);
	    return;
	}

	fs.open(warp, "r", function(err, fd) {
	    if (err) {
		util.puts(err);
		return;
	    }

	    // Find the start of each segment.
	    var buffer = new Buffer(8);
   	    fs.read(fd, buffer, 0, 8, 0, function(err, bytesRead) {
		var numberOfRoots = buffer.readUInt32LE(0)
		var lastArticle = buffer.readUInt32LE(4)
		// Find the start of the root segment.
   		fs.read(fd, buffer, 0, 8, 4 * (2 + lastArticle + page),
			function(err, bytesRead) {
			    var pageStart = buffer.readUInt32LE(0)
			    var pageEnd = buffer.readUInt32LE(4)
			    util.puts(pageStart);
			    util.puts(pageEnd);

			    buffer = new Buffer(pageEnd - pageStart);
   			    fs.read(fd, buffer, 0, pageEnd - pageStart,
				    pageStart, function(err, bytesRead) {
					writeRoots(response, buffer, group);
				    });
			});
	    });
	});
	
    });
}

function writeRoots(response, buffer, group) {
    var i = 0;
    var length = buffer.length;
    var char;
    var from;
    
    response.writeHeader(200, {"Content-Type":
			       "text/html; charset=utf-8"});
    while (i < length) {
	char = 0;
	from = "";
	while (char != 10) {
	    char = buffer.readUInt8(i++);
	    if (char != 10)
		from += String.fromCharCode(char);
	}
	
	char = 0;
	subject = "";
	while (char != 10) {
	    char = buffer.readUInt8(i++);
	    if (char != 10)
		subject += String.fromCharCode(char);
	}

	var time = buffer.readUInt32LE(i);
	i += 8;

	var article = buffer.readUInt32LE(i);
	var rootArticle = article;
	i += 4;
	while (article) {
	    var article = buffer.readUInt32LE(i);
	    i += 4;
	}
	
	response.write("<a href=\"/thread/" + group + "/" + rootArticle +
		       "><div class=root><span class=from>" +
		       from +
		       "<span class=subject>" +
		       subject + "</a>", "binary");
    }
    response.end();
}

util.puts("Server Running on 8080");
