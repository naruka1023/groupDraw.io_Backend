var sio = require('socket.io');
var forwarded = require('forwarded-for');
var debug = require('debug');
var redis = require('redis')
process.title = 'groupDraw-io';

var port = process.env.WEPLAY_PORT || 3001;
var io = module.exports = sio(port);
console.log('listening on *:' + port);


// redis socket.io adapter
var uri = process.env.WEPLAY_REDIS || 'localhost:6379';
// io.adapter(require('socket.io-redis')(uri));

// redis queries instance
var redis = require('./redis')();


io.total = 0;
io.on('connection', function(socket){
  var req = socket.request;
  var ip = forwarded(req, req.headers);
  console.log('client ip %s', ip.port);

  // keep track of connected clients
  socket.on('disconnect', function(){
    console.log(`client ${ip.port} is leaving`)
  });

  // send events log so far
  // redis.lrange('weplay:log', 0, 20, function(err, log){
  //   if (!Array.isArray(log)) return;
  //   log.reverse().forEach(function(data){
  //     data = data.toString();
  //     socket.emit.apply(socket, JSON.parse(data));
  //   });
  // });
  // socket.on('paint', function(data){
  //   console.log('works')
  // })
  // broadcast moves, throttling them first



  // broadcast user joining
  socket.on('join', function(userInfo){
    socket.join(userInfo.room)
    io.in(userInfo.room).emit('joined', userInfo.name)
    // broadcast(socket, 'join', nick);
  });
  socket.on('paint', function(data){
    broadcast('paint', data)
  });
  socket.on('hover', function(data){
    broadcast('hover', data)
  });
  socket.on('pressed', function(data){
    broadcast('pressed', data)
  });
  
  socket.on('move', function(data){
    broadcast('move', data)
  });
  function broadcast(key, data){
    socket.broadcast.to(data.room).emit(key, data);
  }
});

