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
var log = fs.createWriteStream("/cache/log/heddle.log", {'flags': 'a'});

//process.on('uncaughtException', function(err) {
//  console.log(err);
//});

function logOutput(req, code, length) {
  log.write(req.connection.remoteAddress + " - - [" + 
	    new Date().toISOString() + "] \"GET " +
	    req.url + "\" " + code + " " + length + " \"" +
	    req.headers['referer'] + "\" \"" +
	    req.headers['user-agent'] + "\"\n");
}

function issue404(req, res) {
  logOutput(req, 404, 0);
  res.writeHeader(404, {"Content-Type": "text/plain"});
  res.write("404 Not Found\n");
  res.end();
}

http.createServer(function(req, res) {
  var file = req.url;
  util.puts(file);

  if (file == "/")
    file = "/client/index.html";

  try {
    if (file.match(/^\/client/))
      outputStatic(file, req, res);
    else if (file.match(/^\/group/))
      outputGroup(file, req, res);
    else if (file.match(/^\/thread/))
      outputThread(file, req, res);
    else if (file.match(/^\/thumbnail/))
      outputThumbnail(file, req, res);
    else
      issue404(res);
  } catch(err) {
    util.puts("Error: "+ err);
    res.end();
  }
}).listen(8080);

function outputStatic(file, req, res) {
  if (file.match(/\.\./)) {
    issue404(req, res);
    return;
  }

  var full_path = path.join(clientPath, file);

  fs.exists(full_path, function(exists) {
    if (! exists)
      issue404(req, res);
    else {
      fs.readFile(full_path, "binary", function(err, file) {
	if (err) {
	  res.writeHeader(500, {"Content-Type": "text/plain"});
	  res.write(err + "\n");
	  logOutput(req, 500, 0);
	  res.end();
	} else {
	  if (full_path.match(/\.html$/))
	    contentType = "text/html";
	  else if (full_path.match(/\.css$/))
	    contentType = "text/css";
	  else if (full_path.match(/\.png$/))
	    contentType = "image/png";
	  else
	    contentType = "text/plain";
	  res.writeHeader(200, {"Content-Type": contentType +
				     " ;charset=utf-8"});
	  res.write(file, "binary");
	  logOutput(req, 200, file.length);
	  res.end();
	}
      });
    }
  });
}

function outputGroup(url, req, res) {
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
      issue404(req, res);
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
	  fs.closeSync(fd);
	  issue404(req, res);
	  return;
	}

	// Find the start of the root segment.
   	fs.read(fd, buffer, 0, 8, 4 * (2 + lastArticle + page),
		function(err, bytesRead) {
		  var pageStart = buffer.readUInt32LE(0);
		  var pageEnd = buffer.readUInt32LE(4);
		  if (pageEnd == 0) {
		    fs.closeSync(fd);
		    issue404(req, res);
		    return;
		  }
		  buffer = new Buffer(pageEnd - pageStart);
   		  fs.read(fd, buffer, 0, pageEnd - pageStart,
			  pageStart, function(err, bytesRead) {
			    writeRoots(req, res, buffer,
   				       group, naked);
			    fs.closeSync(fd);
			  });
		});
      });
    });

  });
}

function writeRoots(req, res, buffer, group, naked) {
  res.writeHeader(200, {"Content-Type":
	"text/html; charset=utf-8"});

  if (! naked)
    fs.readFile(path.join(clientPath, "client/group.html"), "binary", 
		function(err, file) {
		  res.write(file, "binary");
		  writeRootContents(req, res, buffer, group);
		});
  else
    writeRootContents(req, res, buffer, group);
}

function writeRootContents(req, res, buffer, group) {
  var i = 0;
  var length = buffer.length;
  var char;
  var from;

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

    res.write("<div class=root>");
    if (from.length > 0 && from != "unknown")
      from = "<span class=from>" + from + "</span>:  ";
    else
      from = "";

    res.write(from + "<a href=\"/thread/" + group + "/" + rootArticle +
	      "\">" +
	      "<span class=subject>" +
	      subject + "</span></a>", "binary");
    if (comments > 0)
      res.write("<span class=comments>" + comments + " comments</span>");
  }
  res.write("<script>decorateGroup(\"" + group + "\");</script>");
  logOutput(req, 200, 0);
  res.end();
}

function outputThread(url, req, res) {
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
      issue404(req, res);
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
	  fs.closeSync(fd);
	  issue404(req, res);
	  return;
	}
	// Find the start of the root segment.
   	fs.read(fd, buffer, 0, 4, 4 * (2 + article),
		function(err, bytesRead) {
		  var articleStart = buffer.readUInt32LE(0);
		  buffer = new Buffer(1024);
   		  fs.read(fd, buffer, 0, 1024,
			  articleStart, function(err, bytesRead) {
			    writeThread(req, res, buffer,
					group, naked);
			    fs.closeSync(fd);
			  });
		});
      });
    });
  });
}

function writeThread(req, res, buffer, group, naked) {
  var i = 0;
  var length = buffer.length;
  var char;
  var from;
  var groupPath = spool + group.replace(/\./g, "/") + "/";

  res.writeHeader(200, {"Content-Type":
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

  var cacheFile = cache + group.replace(/\./g, "/") + splitHash(artString);

  fs.exists(cacheFile, function(exists) {
    if (! exists) {
      cp.exec(woof + " " + cacheFile + " " + artString,
	      function (error, stdout, stderr) {
		if (error) {
		  util.puts(error);
		  issue404(req, res);
		  return;
		}
		res.writeHeader(200, {"Content-Type": "text/html; charset=utf-8"});
		writeThreadContents(req, res, cacheFile, naked);
	      });
    } else {
      util.puts("Serving out cached woof file " + cacheFile);
      writeThreadContents(req, res, cacheFile, naked);
    }
  });
}

function writeThreadContents(req, res, cacheFile, naked) {
  if (! naked) {
    fs.readFile(path.join(clientPath, "client/thread.html"), "binary", 
		function(err, file) {
		  res.write(file, "binary");
		  fs.readFile(cacheFile, "binary", function(err, file) {
		    res.write(file, "binary");
		    res.write("<script>addThumbnailToThread();</script>");
		    logOutput(req, 200, 0);
		    res.end();
		  });
		});
  } else {
    fs.readFile(cacheFile, "binary", function(err, file) {
      res.write(file, "binary");
      logOutput(req, 200, file.length);
      res.end();
    });
  }
}

function outputThumbnail(file, req, res) {
  var regs = file.match(/\/thumbnail\/(.*)/);
  var url = regs[1];
  if (! regs ||
      thumbnails > 100 ||
      ! url.match(/^http/)) {
    issue404(req, res);
    return;
  }
  var cache = "/cache/thumbnail" + splitHash(url);
  util.puts("Number of thumbnails running: " + thumbnails);
  fs.exists(cache, function(exists) {
    if (! exists) {
      thumbnails++;
      cp.execFile(thumbnail, [url, cache],
		  function(err, stdout, stderr) {
		    thumbnails--;
		    if (err) {
		      util.puts(err);
		      logOutput(req, 500, 0);
		      res.end();
		      return;
		    }
		    outputPng(cache, req, res);
		  });
    } else
      outputPng(cache, req, res);
  });
}

function outputPng(png, req, res) {
  fs.readFile(png, "binary", function(err, file) {
    if (err) {
      res.writeHeader(500, 
			   {"Content-Type": "text/plain"});
      res.write(err + "\n");
      logOutput(req, 500, 0);
    } else {
      res.writeHeader(200,
			   {"Content-Type": "image/png"});
      res.write(file, "binary");
      logOutput(req, 200, file.length);
    }
    res.end();
  });
}

function splitHash(url) {
  var hash = crypto.createHash('md5').update(url).digest("hex");
  var cache = "";
  for (var i = 0; i < 4; i++)
    cache += "/" + hash.substring(i * 8, (i + 1) * 8);
  return cache;
}

util.puts("Server Running on 8080");
