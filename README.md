# IronMQ client library with Heroku support

License: MIT

## Usage

    var ironmq = require('ironmq');
    var client = new ironmq();

    // Get list of queues
    client.project.queues(function(err, queues) {
      queues.forEach(function(queue) {
        console.log(queue.name());
        
        if (!queues.length) return;
        
        // Get all messages from first queue
        queues[0].messages(function(err, messages) {
          messages.forEach(function(msg) {
            console.log(msg.id(), ':', msg.body());
          });
        });
      });
    });
  
