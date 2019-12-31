var redis = require('redis');
var pieces = uri.split(':');

module.exports = function(){
  return redis.createClient(process.env.REDIS_SERVER, { return_buffers: true });
};