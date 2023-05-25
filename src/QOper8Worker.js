/*
 ----------------------------------------------------------------------------
 | QOper8: Queue-based WebWorker Pool Manager                                |
 |                                                                           |
 | Copyright (c) 2023 MGateway Ltd,                                          |
 | Redhill, Surrey UK.                                                       |
 | All rights reserved.                                                      |
 |                                                                           |
 | https://www.mgateway.com                                                  |
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

24 August 2022

 */

let QWorker = class {
  constructor() {
    this.logging = false;

    let listeners = new Map();
    let handlers = new Map();
    let id = false;
    let initialised = false;
    let q = this;
    let isActive = false;
    let toBeTerminated = false;
    let uuid = false;
    let delay = 60000;
    let inactivityLimit = 180000;
    let handlersByMessageType = new Map();
    let timer = false;
    let lastActivityAt = Date.now();
    let noOfMessages = 0;

    let shutdown = function() {
      // signal to master process that I'm to be shut down
      q.log('Worker ' + id + ' sending request to shut down');
      let obj = {
        qoper8: {
          shutdown: true
        }
      };
      if (timer) clearInterval(timer);
      postMessage(obj);
      q.emit('shutdown_signal_sent');
    }

    let finished = function(res) {
      res = res || {};
      if (!res.qoper8) res.qoper8 = {};
      res.qoper8.finished = true;
      postMessage(res);
      q.emit('finished', res);
      isActive = false;
      if (toBeTerminated) {
        shutdown();
      }
    }

    let startTimer = function() {
      timer = setInterval(function() {
        let inactiveFor = Date.now() - lastActivityAt;
        q.log('Worker ' + id + ' inactive for ' + inactiveFor);
        q.log('Inactivity limit: ' + inactivityLimit);
        if (inactiveFor > inactivityLimit) {
          if (isActive) {
            // flag to be terminated when activity finished
            q.log('Worker ' + id + ' flagged for termination');
            toBeTerminated = true;
          }
          else {
            shutdown();
          }
        }
      }, delay);
    }

    this.getMessageCount = function() {
      return noOfMessages;
    };

    this.on = function(type, callback) {
      if (!listeners.has(type)) {
        listeners.set(type, callback);
      }
    };

    this.off = function(type) {
      if (listeners.has(type)) {
        listeners.delete(type);
      }
    };

    this.emit = function(type, data) {
      if (listeners.has(type)) {
        let handler =  listeners.get(type);
        handler.call(this, data);
      }
    };

    this.onMessage = function(obj) {

      lastActivityAt = Date.now();
      isActive = true;

      let error;

      if (obj.qoper8 && obj.qoper8.init && typeof obj.qoper8.id !== 'undefined') {
        if (initialised) {
          error = 'QOper8 Worker ' + id + ' has already been initialised';
          q.emit('error', error);
          //delete obj.qoper8.uuid;
          return finished({
            error: error,
            originalMessage: obj
          });
        }

        id = obj.qoper8.id;
        uuid = obj.qoper8.uuid;
        if (obj.qoper8.workerInactivityCheckInterval) delay = obj.qoper8.workerInactivityCheckInterval; 
        if (obj.qoper8.workerInactivityLimit) inactivityLimit = obj.qoper8.workerInactivityLimit;
        if (obj.qoper8.handlersByMessageType) {
          handlersByMessageType = obj.qoper8.handlersByMessageType;
        }

        q.logging = obj.qoper8.logging;
        startTimer();
        q.log('new worker ' + id + ' started...');
        q.emit('started', {id: id});
        initialised = true;
        return finished();
      }

      // all subsequent messages

      if (!initialised) {
        error = 'QOper8 Worker ' + id + ' has not been initialised';
        q.emit('error', error);
        return finished({
          error: error,
          originalMessage: obj
        });
      }

      if (!obj.qoper8 || !obj.qoper8.uuid) {
        error = 'Invalid message sent to QOper8 Worker ' + id;
        q.emit('error', error);
        return finished({
          error: error,
          originalMessage: obj
        });
      }

      if (obj.qoper8.uuid !== uuid) {
        error = 'Invalid UUID on message sent to QOper8 Worker ' + id;
        q.emit('error', error);
        return finished({
          error: error,
          originalMessage: obj
        });
      }

      let dispObj = {...obj};
      //let dispObj = JSON.parse(JSON.stringify(obj));
      delete obj.qoper8.uuid;
      delete dispObj.qoper8;
      q.log('Message received by worker ' + id + ': ' + JSON.stringify(dispObj, null, 2));
      q.emit('received', {message: dispObj});

      if (obj.type === 'qoper8_terminate') {
        shutdown();
        return;
      }

      if (!obj.type && !obj.handlerUrl) {
        error = 'No type or handler specified in message sent to worker ' + id;
        q.emit('error', error);
        return finished({
          error: error,
          originalMessage: dispObj
        });
      }

      if (obj.type && handlersByMessageType.has(obj.type)) {
        if (!handlers.has(obj.type)) {
          let handlerUrl = handlersByMessageType.get(obj.type);
          q.log('fetching ' + handlerUrl);
          try {
            importScripts(handlerUrl);
            let handler = self.handler;
            handlers.set(obj.type, handler);
            q.emit('handler_imported', {handlerUrl: handlerUrl});
          }
          catch(err) {
            error = 'Unable to load Handler Url ' + handlerUrl;
            q.log(error);
            q.log(JSON.stringify(err, Object.getOwnPropertyNames(err)));
            q.emit('error', {
              error: error,
              caughtError: JSON.stringify(err, Object.getOwnPropertyNames(err))
            });
            return finished({
              error: error,
              caughtError: JSON.stringify(err, Object.getOwnPropertyNames(err)),
              originalMessage: dispObj,
              workerId: id
            });
          }
        }
        noOfMessages++;
        let handler = handlers.get(obj.type);
        try {
          let ctx = {...q};
          ctx.id = id;
          handler.call(ctx, obj, finished);
        }
        catch(err) {
          error = 'Error running Handler Method for type ' + obj.type;
          q.log(error);
          q.log(JSON.stringify(err, Object.getOwnPropertyNames(err)));
          q.emit('error', {
            error: error,
            caughtError: JSON.stringify(err, Object.getOwnPropertyNames(err))
          });
          // shutdown the WebWorker to prevent any unwanted side-effects
          if (timer) clearInterval(timer);
          return finished({
            error: error,
            caughtError: JSON.stringify(err, Object.getOwnPropertyNames(err)),
            shutdown: true,
            originalMessage: dispObj,
            workerId: id
          });
        }
      }
      else {
        error = 'No handler for messages of type ' + obj.type;
        q.log(error);
        q.emit('error', error);
        return finished({
          error: error,
          originalMessage: dispObj
        });
      }
    };
  }

  log(message) {
    if (this.logging) {
      console.log(Date.now() + ': ' + message);
    }
  }
};

let QOper8Worker = new QWorker();

onmessage = async function(e) {
  QOper8Worker.onMessage(e.data);
};
