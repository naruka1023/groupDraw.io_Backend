var sio = require('socket.io');
var forwarded = require('forwarded-for');
var debug = require('debug');

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
  redis.lrange('weplay:log', 0, 20, function(err, log){
    if (!Array.isArray(log)) return;
    log.reverse().forEach(function(data){
      data = data.toString();
      socket.emit.apply(socket, JSON.parse(data));
    });
  });
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
    socket.broadcast.to(data.room).emit('paint', data);
  });
  
  socket.on('move', function(data){
    socket.broadcast.to(data.room).emit('move', data);
  });
});

function broadcast(socket/*, …*/){
  var args = Array.prototype.slice.call(arguments, 1);
  redis.lpush('weplay:log', JSON.stringify(args));
  redis.ltrim('weplay:log', 0, 20);
  socket.broadcast.emit.apply(socket, args);
}