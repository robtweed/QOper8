/*
 ----------------------------------------------------------------------------
 | QOper8: Queue-based WebWorker Pool Manager                                |
 |                                                                           |
 | Copyright (c) 2022 M/Gateway Developments Ltd,                            |
 | Redhill, Surrey UK.                                                       |
 | All rights reserved.                                                      |
 |                                                                           |
 | http://www.mgateway.com                                                   |
 | Email: rtweed@mgateway.com                                                |
 |                                                                           |
 |                                                                           |
 | Licensed under the Apache License, Version 2.0 (the "License");           |
 | you may not use this file except in compliance with the License.          |
 | You may obtain a copy of the License at                                   |
 |                                                                           |
 |     http://www.apache.org/licenses/LICENSE-2.0                            |
 |                                                                           |
 | Unless required by applicable law or agreed to in writing, software       |
 | distributed under the License is distributed on an "AS IS" BASIS,         |
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  |
 | See the License for the specific language governing permissions and       |
 |  limitations under the License.                                           |
 ----------------------------------------------------------------------------
 */

let QOper8Worker = {
  handlersByMessageType:new Map(),
  handlers: new Map(),
  id: false,
  lastActivityAt: Date.now(),
  delay: 60000,
  timer: false,
  inactivityLimit: 180000,
  isActive: false,
  toBeTerminated: false,
  logging: false,
  listeners: new Map(),

  on: function(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, callback);
    }
  },

  off: function(type) {
    if (this.listeners.has(type)) {
      this.listeners.delete(type);
    }
  },

  emit: function(type, data) {
    if (this.listeners.has(type)) {
      let handler =  this.listeners.get(type);
      handler.call(this, data);
    }
  }
};

onmessage = async function(e) {

  function finished(res) {
    res = res || {};
    res.qoper8 = {
      finished: true
    };
    postMessage(res);
    QOper8Worker.emit('finished', res);
    QOper8Worker.isActive = false;
    if (QOper8Worker.toBeTerminated) {
      shutdown();
    }
  }

  function log(message) {
    if (QOper8Worker.logging) {
      console.log(Date.now() + ': ' + message);
    }
  }

  function shutdown() {
    // signal to master process that I'm to be shut down
    log('Worker ' + QOper8Worker.id + ' sending request to shut down');
    let obj = {
      qoper8: {
        shutdown: true
      }
    };
    clearInterval(QOper8Worker.timer);
    postMessage(obj);
    QOper8Worker.emit('shutdown_signal_sent');
  }

  function startTimer() {
    QOper8Worker.timer = setInterval(function() {
      let inactiveFor = Date.now() - QOper8Worker.lastActivityAt;
      log('Worker ' + QOper8Worker.id + ' inactive for ' + inactiveFor);
      log('Inactivity limit: ' + QOper8Worker.inactivityLimit);
      if (inactiveFor > QOper8Worker.inactivityLimit) {
        if (QOper8Worker.isActive) {
          // flag to be terminated when activity finished
          log('Worker ' + QOper8Worker.id + ' flagged for termination');
          QOper8Worker.toBeTerminated = true;
        }
        else {
          shutdown();
        }
      }
    }, QOper8Worker.delay);
  }

  QOper8Worker.lastActivityAt = Date.now();
  QOper8Worker.isActive = true;
  QOper8Worker.log = log;
  let error;

  let obj = e.data;

  // startup message

  if (obj.qoper8 && obj.qoper8.init && typeof obj.qoper8.id !== 'undefined') {
    //messageHandler = await import(obj.messageHandler);
    QOper8Worker.id = obj.qoper8.id;
    if (obj.qoper8.workerInactivityCheckTime) QOper8Worker.delay = obj.qoper8.workerInactivityCheckTime; 
    if (obj.qoper8.workerInactivityLimit) QOper8Worker.inactivityLimit = obj.qoper8.workerInactivityLimit; 
    if (obj.qoper8.handlersByMessageType) {
      QOper8Worker.handlersByMessageType = obj.qoper8.handlersByMessageType;
    }
    QOper8Worker.logging = obj.qoper8.logging;
    startTimer();
    log('new worker ' + QOper8Worker.id + ' started...');

    QOper8Worker.emit('started', {id: QOper8Worker.id});

    return finished();
  }

  // all subsequent messages

  log('Message received by worker ' + QOper8Worker.id + ': ' + JSON.stringify(obj, null, 2));
  QOper8Worker.emit('received', {message: obj});


  if (!obj.type && !obj.handlerUrl) {
    error = 'No type or handler specified in message sent to worker ' + QOper8Worker.id;
    QOper8Worker.emit('error', error);
    return finished({
      error: error,
      originalMessage: obj
    });
  }

  if (obj.type && QOper8Worker.handlersByMessageType.has(obj.type)) {
    if (!QOper8Worker.handlers.has(obj.type)) {
      let handlerUrl = QOper8Worker.handlersByMessageType.get(obj.type);
      log('fetching ' + handlerUrl);
      try {
        let {handler} = await import(handlerUrl);

        QOper8Worker.handlers.set(obj.type, handler);
        QOper8Worker.emit('handler_imported', {handlerUrl: handlerUrl});
      }
      catch(err) {
        error = 'Unable to load Handler Url ' + handlerUrl;
        log(error);
        log(JSON.stringify(err, null, 2));
        QOper8Worker.emit('error', error);
        return finished({
          error: error,
          originalMessage: obj,
          workerId: QOper8Worker.id
        });
      }
    }
    let handler = QOper8Worker.handlers.get(obj.type);
    handler.call(QOper8Worker, obj, finished);
  }
  else {
    error = 'No handler for messages of type ' + obj.type;
    log(error);
    QOper8Worker.emit('error', error);
    return finished({
      error: error,
      originalMessage: obj
    });
  }

};
