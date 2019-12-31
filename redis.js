var redis = require('redis');

module.exports = function(){
  return redis.createClient(process.env.REDIS_SERVER, { return_buffers: true });
};