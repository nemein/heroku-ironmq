ironmq = require('../');
test_data = require('./test_data');
nock = require('nock');

var TEST_PROJECT = 'test_project';
var TEST_QUEUE = 'test_queue';

if (test_data.use_proxy) {
  var req = nock('https://mq-aws-us-east-1.iron.io:443')
  .matchHeader('authorization','OAuth ' + test_data.token)
  .matchHeader('content-type','application/json')
  .matchHeader('user-agent','IronMQ Node Client for Heroku')
  .get('/1/projects/' + TEST_PROJECT + '/queues')
  .reply(
    200,
    [
      { "id": "123456",
        "project_id": TEST_PROJECT,
        "name": "test_queue"
      }
    ]
  );
  
  var req = nock('https://mq-aws-us-east-1.iron.io:443')
  .matchHeader('authorization','OAuth ' + test_data.token)
  .matchHeader('content-type','application/json')
  .matchHeader('user-agent','IronMQ Node Client for Heroku')
  .get('/1/projects/' + TEST_PROJECT + '/queues/' + TEST_QUEUE)
  .reply(
    200,
    {
      "size": 0
    }
  );
  
  var req = nock('https://mq-aws-us-east-1.iron.io:443')
  .matchHeader('authorization','OAuth ' + test_data.token)
  .matchHeader('content-type','application/json')
  .matchHeader('user-agent','IronMQ Node Client for Heroku')
  .get('/1/projects/' + TEST_PROJECT + '/queues/' + TEST_QUEUE)
  .reply(
    200,
    {
      "size": 0
    }
  );
  var req = nock('https://mq-aws-us-east-1.iron.io:443')
  .matchHeader('authorization','OAuth ' + test_data.token)
  .matchHeader('content-type','application/json')
  .matchHeader('user-agent','IronMQ Node Client for Heroku')
  .post('/1/projects/' + TEST_PROJECT + '/queues/' + TEST_QUEUE + '/clear')
  .reply(
    200,
    {
      "msg": "cleared"
    }
  );
}

describe('IronMQ::queues', function(){
  it('should return list of queues', function(done) {
    var instance = new ironmq({token: test_data.token, project: TEST_PROJECT});
    
    instance.project.queues(function(err, queues) {
      if (err) return;
      
      queues.should.have.lengthOf(1);
      queues[0].should.be.a('object');
      queues[0].name().should.equal("test_queue");
      queues[0].project.should.be.ok;      
      queues[0].project.id().should.equal(TEST_PROJECT);
      
      done();
    });
  });
  it('should return queue named test_queue', function(done) {
    var instance = new ironmq({token: test_data.token, project: TEST_PROJECT});
    
    instance.project.queues(TEST_QUEUE, function(err, queue) {
      if (err) return;
      
      queue.should.be.a('object');
      queue.name().should.equal(TEST_QUEUE);
      queue.size().should.equal(0);
      
      done();
    });
  });
  it('should clear queue', function(done) {
    var instance = new ironmq({token: test_data.token, project: TEST_PROJECT});
    
    instance.project.queues(TEST_QUEUE, function(err, queue) {
      if (err) return;
      queue.should.be.a('object');
      queue.clear.should.ok;
      queue.clear.should.be.a('function');
      queue.clear(function(err, status) {
        if (err) return;
        status.should.be.true;
        done();
      });
    });
  });
});
