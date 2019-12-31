var sio = require('socket.io');
var forwarded = require('forwarded-for');
var debug = require('debug');
var redis = require('redis')
process.title = 'groupDraw-io';

var port = process.env.BACK_PORT || 3001;
var io = module.exports = sio(port);
console.log('listening on *:' + port);


// redis socket.io adapter
var uri = process.env.REDIS_SERVER || 'localhost:6379';
// io.adapter(require('socket.io-redis')(uri));

// redis queries instance
var redis = require('./redis')();


io.total = 0;
redis.scan('0', 'MATCH', 'room*',function(part, full){
  if(full.length == 0){
    return
  }else{
    temp = full.map((f)=>{
      return f.toString()
    })
    final = temp[1].split(",");
    redis.del(final, function(){
      console.log('all residual keys are deleted')
    })
  }
})
io.on('connection', function(socket){
  var req = socket.request;
  var ip = forwarded(req, req.headers);
  console.log('client ip %s', ip.port);

  function printStats(){
    console.log('done')
    Object.keys(socket.adapter.rooms).forEach( function(socketId){
      console.log('========')
      console.log("sioRoom client socket Id: " + socketId );
      console.log('inside that key have a value of: ' + JSON.stringify(socket.adapter.rooms[socketId]))
      console.log('========')
    }); 
    console.log('done')
  }

  function updateList(socket, action){
    redis.smembers(`roomMembers:${socket.room}`, function(err, result){
      final = []
      result.forEach(function(r){
        final.push(JSON.parse(r.toString()));
      })
      payload = {
        mainName: socket.userName,
        list:final
      };
      io.in(socket.room).emit(action, payload)
    })

  }
  // keep track of connected clients
  socket.on('disconnect', function(){
    // printStats()
    redis.srem(`roomMembers:${socket.room}`, socket.userEntity, function(){
      console.log(`client ${socket.userEntity} is leaving`)
      updateList(socket, 'leave')

    })
  });
  //broadcast clearing of canvas in a room
  socket.on('clear', function(room){
    redis.del(`roomRecords:${room}`, function(){
      socket.broadcast.to(room).emit('clear');
    })
  })
  // broadcast user joining
  socket.on('join', function(userInfo){
    socket.join(userInfo.room, function(){
      userEntity = {
        name:userInfo.name,
        id:socket.id
      }

      //set values for disconnect event
      userEntity = JSON.stringify(userEntity);
      socket.room = userInfo.room
      socket.userName = userInfo.name
      socket.userEntity = userEntity

      //update redis and broadcast redis value of memebers inside room to other clients in the same room
      redis.sadd(`roomMembers:${socket.room}`, userEntity, function(err, result){
        updateList(socket, 'joined')
      })

    })
  });
  socket.on('paint', function(data){
    redisData = {
      x:data.x,
      y:data.y,
      px:data.px,
      py:data.py,
      color:data.color,
      weight:data.weight 
    }
    redis.lpush(`roomRecords:${data.room}`,JSON.stringify(redisData),function(){
      broadcast('paint', data)
    })
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

