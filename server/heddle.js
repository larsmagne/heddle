var util = require("util"),
  http = require("http"),
  path = require("path"),
  url = require("url"),
  filesys = require("fs");

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
	  filesys.readFile(full_path, "binary", function(err, file) {
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

util.puts("Server Running on 8080");
