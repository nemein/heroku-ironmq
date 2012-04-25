/*!
 * heroku-IronMQ
 * Copyright(c) 2012 Jerry Jalava <jerry.jalava@nemein.com>
 * MIT Licensed
 */
 
// **heroku-IronMQ** is [IronMQ](http://iron.io) client mainly developed
// to be used inside Heroku nodes. 

var _ = require("underscore")._;
var url = require('url');
var qs = require('querystring');
var request = require('request');
var util = require('util');

var LOG_TO_CONSOLE = (global.process.env.NODE_ENV || 'development') == 'development';
var REQ_HEADERS = {};
var HOST_STRING = "";

// Internal namespace
IronMQ = {};

// Internal logging utility
IronMQ.LOG = function() {
  if (LOG_TO_CONSOLE) console.log.apply(this, arguments);
};

// Private method to generate request headers
IronMQ._buildRequestHeaders = function(token) {
  REQ_HEADERS = {
    'Authorization': 'OAuth ' + token,
    'Content-Type': 'application/json',
    'User-Agent': 'IronMQ Node Client for Heroku'
  };
};

// Private method to generate target host string
IronMQ._buildRequestHostPrefix = function(config) {
  HOST_STRING = url.format({
    protocol: config.protocol,
    hostname: config.host,
    port: config.port,
    pathname: '/1'
  });
};

// Internal HTTP request wrapper
IronMQ._transport = {
  get: function(path, params, cb) {
    var param_str = qs.stringify(params);
    param_str = param_str ? ('?' + param_str) : ''
    
    request.get({
      url: HOST_STRING + path + param_str,
      headers : REQ_HEADERS
    }, this._parseResponse(cb)).end();
  },
  put: function(path, body, cb) {
    request.put({
      url: HOST_STRING + path,
      headers : REQ_HEADERS
    }, this._parseResponse(cb)).end(JSON.stringify(body));
  },
  post: function(path, body, cb) {
    if (body) body = JSON.stringify(body)
    request.post({
      url: HOST_STRING + path,
      headers : REQ_HEADERS
    }, this._parseResponse(cb)).end(body);
  },
  del: function(path, cb) {
    request.del({
      url: HOST_STRING + path,
      headers : REQ_HEADERS
    }, this._parseResponse(cb)).end();
  },
  _parseResponse: function(cb) {
    return function parse(err, response, body) {
      if (err) return cb(err);
      if (response.statusCode == 200 || response.statusCode == 201) {
        cb(null, JSON.parse(body));
      } else {
        var msg = null;
        switch (response.statusCode) {
          case 400:
            msg = "Bad Request: Invalid JSON (can't be parsed or has wrong types).";
          case 401:
            msg = "Unauthorized: The OAuth token is either not provided or invalid.";
          case 404:
            msg = "Not Found: The resource, project, or endpoint being requested doesn’t exist.";
          case 405:
            msg = "Invalid HTTP method: A GET, POST, DELETE, or PUT was sent to an endpoint that doesn’t support that particular verb.";
          case 406:
            msg = "Not Acceptable: Required fields are missing.";
          case 503:
            msg = "Server currently unavailable!";
            //TODO: Handle "exponential backoff"
        }
        return cb(msg, JSON.parse(body));
      }
    };
  }
};

// This is the exported class.
// It configures the instance prepares internal globals.
//
// In Heroku environment you don't need to give any configuration,
// but if you wish to set the Iron token and project_id by hand
// you can use config like this: {"token": 'XXXX', "project": 'XXXX'}.
// To enable/disable logging in environment other than development
// you can set {debug: [true|false]}.
IronMQ.Base = function(options) {
  var _defaults = {
    token: null,
    project: null,
    host: 'mq-aws-us-east-1.iron.io',
    port: 443,
    protocol: 'https',
    debug: null
  };
  var _config = {};
  
  var base = {
    project: null,    
    constructor: function(config)
    {
      IronMQ.LOG('IronMQ.base::constructor',config);
      _config = _.extend(_defaults, config);
      
      if (!_config.token && global.process.env.IRON_MQ_TOKEN) _config.token = global.process.env.IRON_MQ_TOKEN;
      if (!_config.project && global.process.env.IRON_MQ_PROJECT_ID) _config.project = global.process.env.IRON_MQ_PROJECT_ID;
      
      if (!_config.token || !_config.project) throw new Error("config options 'token' and 'project' required!");
      
      if (_config.debug != null) LOG_TO_CONSOLE = _config.debug;
      
      IronMQ._buildRequestHeaders(_config.token);
      IronMQ._buildRequestHostPrefix(_config);
      
      this.setProject(_config.project);
    },
    setProject: function(id)
    {
      this.project = new IronMQ.Project(id);
    }
  };
  
  base.constructor(options);
  
  delete base.constructor;
  return base;
};

// IronMQ project wrapper class
IronMQ.Project = function(id) {
  var _id = null;
  var _queues = [];
  
  var base = {
    constructor: function(id)
    {
      IronMQ.LOG('IronMQ.Project::constructor',id);
      _id = id;
    },
    queues: function()
    {
      var cb = arguments[0];
      if (arguments.length > 1) {
        var name = arguments[0];
        cb = arguments[1];
      }
      var _self = this;
      
      if (name) return this.queue(name, cb);
      
      IronMQ._transport.get('/projects/'+_id+'/queues', null, function(err, response) {
        if (err) {
          if (cb) cb(err);
          return;
        }
        _queues = response.map(function(queue) {
          return IronMQ.Queue(_self, queue.name);
        });        
        cb(null, _queues);
      });
    },
    queue: function(name, cb)
    {
      var _self = this;
      
      IronMQ._transport.get('/projects/'+_id+'/queues/'+name, null, function(err, response) {
        if (err) {
          if (cb) cb(err);
          return;
        }
        cb(null, IronMQ.Queue(_self, name, response.size));
      });
    },
    id: function() {return _id;}
  };
  
  base.constructor(id);
  
  delete base.constructor;
  return base;
};

// IronMQ queue wrapper class
IronMQ.Queue = function(project, name, size) {
  var _name = null;
  var _size = null;
  var _messages = [];
  
  var base = {
    project: null,
    constructor: function(project, name, size)
    {
      IronMQ.LOG('IronMQ.Queue::constructor',name,size);
      this.project = project;
      _name = name;
      _size = size;
    },
    clear: function(cb) {
      IronMQ._transport.post('/projects/'+this.project.id()+'/queues/'+_name+'/clear', null, function(err, response) {
        if (err) {
          if (cb) cb(err);
          return;
        }
        if (response.msg && response.msg == 'cleared') {
          if (cb) cb(null, true);
        } else {
          if (cb) cb(response.msg);
        }
      });
    },
    info: function(cb) {
      this.project.queue(_name, cb);
    },
    messages: function(cb) {
      var _self = this;
      
      IronMQ._transport.get('/projects/'+this.project.id()+'/queues/'+_name+'/messages', null, function(err, response) {
        if (err) {
          if (cb) cb(err);
          return;
        }        
        
        _messages = response.messages.map(function(msg) {
          return IronMQ.Message(_self, msg);
        });
        
        var timeout = null;
        if (response.timeout) timeout = response.timeout;
        
        cb(null, {messages: _messages, timeout: timeout});        
      });
    },
    message: function(id, cb) {cb(false);},
    newMessage: function(messages, cb) {
      if (!util.isArray(messages)) {
        messages = [messages];
      }
      
      messages = messages.map(function(msg) {
        if (msg.body) {
          return msg;
        }
      });
      
      if (!messages.length) {
        return cb("no valid message given");
      }
      
      var data = {"messages": messages};
      
      IronMQ._transport.post('/projects/'+this.project.id()+'/queues/'+_name+'/messages', data, function(err, response) {
        if (err) {
          if (cb) cb(err);
          return;
        }
        if (response.msg && response.msg == "Messages put on queue.") {
          if (cb) cb(null, response.ids);
        } else {
          if (cb) cb(response.msg);
        }
      });
    },
    deleteMessage: function(id, cb) {cb(false);},    
    name: function() {return _name;},
    size: function() {return _size;}
  };
  
  base.constructor(project, name, size);
  
  delete base.constructor;
  return base;
};

// IronMQ message wrapper class
IronMQ.Message = function(queue, data) {
  var _id = _body = _timeout = _delay = _expires_in = null;
  
  var base = {
    queue: null,
    constructor: function(queue, data)
    {
      IronMQ.LOG('IronMQ.Message::constructor',data);
      this.queue = queue;
      _id = data.id;
      _body = data.body;
      
      if (data.timeout) _timeout = data.timeout;
      if (data.delay) _delay = data.delay;
      if (data.expires_in) _expires_in = data.expires_in;
    },
    delete: function(cb) {cb(false);},
    toJSON: function() {
      var obj = {
        id: _id,
        body: _body        
      };
      if (_timeout) obj.timeout = _timeout;
      if (_delay) obj.delay = _delay;
      if (_expires_in) obj.expires_in = _expires_in;
      
      return obj;
    },
    id: function() {return _id;},
    body: function() {return _body;}
  };
  
  base.constructor(queue, data);
  
  delete base.constructor;
  return base;
};

module.exports = IronMQ.Base;
