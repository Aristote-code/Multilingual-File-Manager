const Redis = jest.createMockFromModule('ioredis');

Redis.prototype.on = jest.fn((event, callback) => {
  if (event === 'connect') {
    callback();
  }
});

Redis.prototype.quit = jest.fn().mockResolvedValue('OK');

module.exports = Redis; 