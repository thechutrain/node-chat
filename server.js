const http = require('http'); // built in, HTTP server & client
const fs = require('fs'); // built in, provides filesystem path-related func
const path = require('path'); //build in, provides filestystem functionality
const mime = require('mime'); // add-on, provides ability to derive MIME type
const cache = {};  // where cached objects are stored

// 3 helper functions --> Serve Static HTTP files
// 1) handle when a file doesn't exist
function send404(response){
  response.writeHead(404, {'Content-type': 'text/plain'});
  response.write("Error 404: content not found");
  response.end();
}
// 2) serves file data
function sendFile(response, filePath, fileContents){
  response.writeHead(
    200,
    {'Content-type': mime.lookup(path.basename(filePath))}
  );
  response.end(fileContents);

}


// 3) checks if file is cached, if not tries to get it from the disk
function serveStatic(response, cache, absPath){
  if (cache[absPath]){ //check if file is cached in memory
    sendFile(response, absPath, cache[absPath]); // serve file from memory
  }
  else{
    fs.exists(absPath, function(exists){  // check if file exists
      if (exists){
        fs.readFile(absPath, function(err, data){ // read file from disk
          if (err){
            send404(response);
          }
          else {
            cache[absPath] = data;
            sendFile(response, absPath, data);  // serve file read from disk
          }
        })
      }
      else {
        send404(response);
      }
    });
  } // closes else
}

//  Part 2: Create the HTTP server
const server = http.createServer((request, response) =>{
  let filePath = false;

  if (request.url == '/'){
    filePath = 'public/index.html';
  }
  else {
    filePath = 'public' + request.url;
  }

  const absPath = './' + filePath;
  serveStatic(response, cache, absPath);
})

// Part 3: Start the Server
server.listen(3000, ()=>{
  console.log("listening on port 3000");
})

// Part 4: Setting up Socket.IO server
var chatServer = require('./lib/chat_server');
chatServer.listen(server);
