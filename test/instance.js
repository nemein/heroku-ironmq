ironmq = require('../');
test_data = require('./test_data');

describe('IronMQ', function(){
  describe('construct', function(){
    it('should throw error without config', function(done) {
      (function() {
        new ironmq();
      }).should.throw("config options 'token' and 'project' required!");
      
      done();
    });
    it('should return instance with proper config', function(done) {
      var instance = new ironmq({token: test_data.token, project: 'xxx'});
      instance.should.be.a('object');
      done();
    });
    it('should return instance with proper environment', function(done) {
      global.process.env.IRON_MQ_TOKEN = test_data.token;
      global.process.env.IRON_MQ_PROJECT_ID = 'xxx';
      var instance = new ironmq();
      instance.should.be.a('object');
      done();
    });
    it('instance should have proper methods', function(done) {
      var instance = new ironmq({token: test_data.token, project: 'xxx'});
      instance.setProject.should.be.ok;
      instance.setProject.should.be.a('function');
      instance.project.should.be.ok;
      instance.project.should.be.a('object');
      done();
    });
  })
});
