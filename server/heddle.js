var root = "/cache/warp";
var spool = "/var/spool/news/articles/";
var clientPath = "/home/larsi/src/heddle";
var woof = "/home/larsi/src/woof/woof";
var thumbnail = "/home/larsi/src/heddle/bin/thumbnail";
var cache = "/cache/woof/";

var util = require("util"),
http = require("http"),
path = require("path"),
url = require("url"),
fs = require("fs"),
Buffer = require('buffer').Buffer,
cp = require('child_process'),
crypto = require('crypto');

var thumbnails = 0;

process.on('uncaughtException', function(err) {
  console.log(err);
});

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

  try {
    if (file.match(/^\/client/))
      outputStatic(file, response);
    else if (file.match(/^\/group/))
      outputGroup(file, response);
    else if (file.match(/^\/thread/))
      outputThread(file, response);
    else if (file.match(/^\/thumbnail/))
      outputThumbnail(file, response);
    else
      issue404(response);
  } catch(err) {
    util.puts("Error: "+ err);
    response.end();
  }
}).listen(8080);

function outputStatic(file, response) {
  if (file.match(/\.\./)) {
    issue404();
    return;
  }

  var full_path = path.join(clientPath, file);

  fs.exists(full_path, function(exists) {
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
	  else if (full_path.match(/\.png$/))
	    contentType = "image/png";
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
  var regs = url.match(/\/group\/([^\/]+)(\/([0-9]+)(\/naked)?)?/);
  if (! regs)
    return;
  var group = regs[1];
  var page = regs[3];
  var naked = regs[4];
  if (! page)
    page = 0;
  else
    page = parseInt(page);

  var warp = path.normalize(root + "/" + group.replace(/\./g, "/") + "/WARP");

  fs.exists(warp, function(exists) {
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
	var numberOfRoots = buffer.readUInt32LE(0);
	var lastArticle = buffer.readUInt32LE(4);
	if (page > numberOfRoots / 30) {
	  issue404(response);
	  return;
	}

	// Find the start of the root segment.
   	fs.read(fd, buffer, 0, 8, 4 * (2 + lastArticle + page),
		function(err, bytesRead) {
		  var pageStart = buffer.readUInt32LE(0);
		  var pageEnd = buffer.readUInt32LE(4);
		  if (pageEnd == 0) {
		    issue404(response);
		    return;
		  }
		  buffer = new Buffer(pageEnd - pageStart);
   		  fs.read(fd, buffer, 0, pageEnd - pageStart,
			  pageStart, function(err, bytesRead) {
			    writeRoots(response, buffer,
   				       group, naked);
			  });
		});
      });
    });

  });
}

function writeRoots(response, buffer, group, naked) {
  var i = 0;
  var length = buffer.length;
  var char;
  var from;

  response.writeHeader(200, {"Content-Type":
			     "text/html; charset=utf-8"});

  if (! naked)
    writeFile(path.join(clientPath, "client/group.html"), response);

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
    var comments = 0;
    i += 4;
    while (article) {
      var article = buffer.readUInt32LE(i);
      i += 4;
      comments++;
    }
    // Zero-terminated list of articles.
    comments--;

    response.write("<div class=root>");
    if (from.length > 0 && from != "unknown")
      from = "<span class=from>" + from + "</span>:  ";
    else
      from = "";

    response.write(from + "<a href=\"/thread/" + group + "/" + rootArticle +
		   "\">" +
		   "<span class=subject>" +
		   subject + "</span></a>", "binary");
    if (comments > 0)
      response.write("<span class=comments>" + comments + " comments</span>");
  }
  response.write("<script>decorateGroup(\"" + group + "\");</script>");
  response.end();
}

function outputThread(url, response) {
  var regs = url.match(/\/thread\/([^\/]+)\/([0-9]+)(\/naked)?/);
  if (! regs)
    return;
  var group = regs[1];
  var article = parseInt(regs[2]);
  var naked = regs[3];

  var warp = path.normalize(root + "/" + group.replace(/\./g, "/") + "/WARP");
  var directory = path.normalize(spool + "/" + group.replace(/\./g, "/")
				 + "/");

  fs.exists(warp, function(exists) {
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
	var numberOfRoots = buffer.readUInt32LE(0);
	var lastArticle = buffer.readUInt32LE(4);
	if (article > lastArticle) {
	  issue404(response);
	  return;
	}
	// Find the start of the root segment.
   	fs.read(fd, buffer, 0, 4, 4 * (2 + article),
		function(err, bytesRead) {
		  var articleStart = buffer.readUInt32LE(0);
		  buffer = new Buffer(1024);
   		  fs.read(fd, buffer, 0, 1024,
			  articleStart, function(err, bytesRead) {
			    writeThread(response, buffer,
					group, naked);
			  });
		});
      });
    });
  });
}

function writeThread(response, buffer, group, naked) {
  var i = 0;
  var length = buffer.length;
  var char;
  var from;
  var groupPath = spool + group.replace(/\./g, "/") + "/";

  response.writeHeader(200, {"Content-Type":
			     "text/html; charset=utf-8"});
  // From
  while (buffer.readUInt8(i++) != 10)
    ;

  // Subject
  while (buffer.readUInt8(i++) != 10)
    ;

  // Time
  i += 8;

  var articles = new Array();

  var article = buffer.readUInt32LE(i);
  var rootArticle = article;
  articles.push(article);
  i += 4;
  while (article) {
    var article = buffer.readUInt32LE(i);
    i += 4;
    if (article != 0)
      articles.push(article);
  }

  var artString = "";
  articles.map(function(article) {
    artString += " " + groupPath + article;
  });

  var cacheFile = cache + group.replace(/\./g, "/") + "/" +
      crypto.createHash('md5').update(artString).digest("hex");

  fs.exists(cacheFile, function(exists) {
    if (! exists) {
      cp.exec(woof + " " + cacheFile + " " + artString,
	      function (error, stdout, stderr) {
		if (error) {
		  util.puts(error);
		  issue404(response);
		  return;
		}
		response.writeHeader(200, {"Content-Type": "text/html; charset=utf-8"});
		if (! naked)
		  writeFile(path.join(clientPath, "client/thread.html"), response);
		fs.readFile(cacheFile, "binary", function(err, file) {
		  response.write(file, "binary");
		  response.end();
		});
	      });
      } else {
	fs.readFile(cacheFile, "binary", function(err, file) {
	  response.write(file, "binary");
	  response.end();
	});
      }
    });
}

function writeFile(fpath, response) {
  response.write(fs.readFileSync(fpath, "binary"), "binary");
}

function outputThumbnail(file, response) {
  var regs = file.match(/\/thumbnail\/(.*)/);
  if (! regs || thumbnails > 100) {
    issue404(response);
    return;
  }
  var url = regs[1];
  var cache = "/cache/thumbnail" + thumbnailCache(url);
  util.puts("Number of thumbnails running: " + thumbnails);
  fs.exists(cache, function(exists) {
    if (! exists) {
      thumbnails++;
      cp.execFile(thumbnail, [url, cache],
		  function(err, stdout, stderr) {
		    thumbnails--;
		    if (err) {
		      util.puts(err);
		      response.end();
		      return;
		    }
		    outputPng(cache, response);
		  });
    } else
      outputPng(cache, response);
  });
}

function outputPng(png, response) {
  fs.readFile(png, "binary", function(err, file) {
    if (err) {
      response.writeHeader(500, 
			   {"Content-Type": "text/plain"});
      response.write(err + "\n");
    } else {
      response.writeHeader(200,
			   {"Content-Type": "image/png"});
      response.write(file, "binary");
    }
    response.end();
  });
}

function thumbnailCache(url) {
  var hash = crypto.createHash('md5').update(url).digest("hex");
  var cache = "";
  for (var i = 0; i < 4; i++)
    cache += "/" + hash.substring(i * 8, (i + 1) * 8);
  return cache;
}

util.puts("Server Running on 8080");
