ironmq = require('../');
test_data = require('./test_data');
nock = require('nock');

var TEST_PROJECT = 'test_project';

describe('IronMQ::project', function(){
  it('property should exist', function(done) {
    var instance = new ironmq({token: test_data.token, project: TEST_PROJECT});
    
    instance.project.should.be.ok;
    instance.project.should.be.a('object');
    
    instance.project.id().should.equal(TEST_PROJECT);
    
    done();
  });
  it('should have methods for queues', function(done) {
    var instance = new ironmq({token: test_data.token, project: TEST_PROJECT});
    
    instance.project.queues.should.be.ok;
    instance.project.queues.should.be.a('function');
    instance.project.queue.should.be.ok;
    instance.project.queue.should.be.a('function');
    
    done();
  });
});
