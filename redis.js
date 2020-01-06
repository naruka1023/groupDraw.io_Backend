var redis = require('redis');
url = process.env.REDISCLOUD_URL
module.exports = function(){
  return redis.createClient(url, { return_buffers: true });
};