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

15 August 2022

 */

// For full, unminified source code of QOper8Worker.js, see /src/QOper8Worker.js in repository

let workerCode = `let QWorker=class{constructor(){this.logging=!1;let e=new Map,r=new Map,t=!1,o=!1,i=this,n=!1,s=!1,a=!1,l=6e4,g=18e4,p=new Map,d=!1,f=Date.now(),h=0,u=function(){i.log("Worker "+t+" sending request to shut down");clearInterval(QOper8Worker.timer),postMessage({qoper8:{shutdown:!0}}),i.emit("shutdown_signal_sent")},c=function(e){(e=e||{}).qoper8||(e.qoper8={}),e.qoper8.finished=!0,postMessage(e),i.emit("finished",e),n=!1,s&&u()};this.getMessageCount=function(){return h},this.on=function(r,t){e.has(r)||e.set(r,t)},this.off=function(r){e.has(r)&&e.delete(r)},this.emit=function(r,t){if(e.has(r)){e.get(r).call(this,t)}},this.onMessage=function(e){let m;if(f=Date.now(),n=!0,e.qoper8&&e.qoper8.init&&void 0!==e.qoper8.id)return o?(m="QOper8 Worker "+t+" has already been initialised",i.emit("error",m),c({error:m,originalMessage:e})):(t=e.qoper8.id,a=e.qoper8.uuid,e.qoper8.workerInactivityCheckInterval&&(l=e.qoper8.workerInactivityCheckInterval),e.qoper8.workerInactivityLimit&&(g=e.qoper8.workerInactivityLimit),e.qoper8.handlersByMessageType&&(p=e.qoper8.handlersByMessageType),i.logging=e.qoper8.logging,d=setInterval(function(){let e=Date.now()-f;i.log("Worker "+t+" inactive for "+e),i.log("Inactivity limit: "+g),e>g&&(n?(i.log("Worker "+t+" flagged for termination"),s=!0):u())},l),i.log("new worker "+t+" started..."),i.emit("started",{id:t}),o=!0,c());if(!o)return m="QOper8 Worker "+t+" has not been initialised",i.emit("error",m),c({error:m,originalMessage:e});if(!e.qoper8||!e.qoper8.uuid)return m="Invalid message sent to QOper8 Worker "+t,i.emit("error",m),c({error:m,originalMessage:e});if(e.qoper8.uuid!==a)return m="Invalid UUID on message sent to QOper8 Worker "+t,i.emit("error",m),c({error:m,originalMessage:e});let y=JSON.parse(JSON.stringify(e));if(delete e.qoper8.uuid,delete y.qoper8,i.log("Message received by worker "+t+": "+JSON.stringify(y,null,2)),i.emit("received",{message:y}),"qoper8_terminate"!==e.type){if(!e.type&&!e.handlerUrl)return m="No type or handler specified in message sent to worker "+t,i.emit("error",m),c({error:m,originalMessage:y});if(!e.type||!p.has(e.type))return m="No handler for messages of type "+e.type,i.log(m),i.emit("error",m),c({error:m,originalMessage:y});if(!r.has(e.type)){let o=p.get(e.type);i.log("fetching "+o);try{importScripts(o);let n=self.handler;r.set(e.type,n),i.emit("handler_imported",{handlerUrl:o})}catch(e){return m="Unable to load Handler Url "+o,i.log(m),i.log(JSON.stringify(e,null,2)),i.emit("error",m),c({error:m,originalMessage:y,workerId:t})}}h++,r.get(e.type).call(i,e,c)}else u()}}log(e){this.logging&&console.log(Date.now()+": "+e)}},QOper8Worker=new QWorker;onmessage=async function(e){QOper8Worker.onMessage(e.data)};`;

// ******* QOper8 *****************

class QOper8 {
  constructor(obj) {

    obj = obj || {};

    function uuidv4() {
      if (window.location.protocol === 'https:') {
        return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
          (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
      }
      else {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      }
    }

    if (obj.workerInactivityCheckInterval) obj.workerInactivityCheckInterval = obj.workerInactivityCheckInterval * 1000;
    if (obj.workerInactivityLimit) obj.workerInactivityLimit = obj.workerInactivityLimit * 60000;

    this.name = 'QOper8';
    this.build = '2.5';
    this.buildDate = '15 August 2022';
    this.logging = obj.logging || false;
    let poolSize = +obj.poolSize || 1;
    let maxPoolSize = obj.maxPoolSize || 32;
    if (poolSize > maxPoolSize) poolSize = maxPoolSize;
    let loggingDisabled = obj.disabled || false;
    let inactivityCheckInterval = obj.workerInactivityCheckInterval || 60000;
    let inactivityLimit = obj.workerInactivityLimit || (20 * 60000);
    this.handlersByMessageType = obj.handlersByMessageType || new Map();
    let listeners = new Map();

    let uuid = uuidv4();
    let workers = new Map();
    let isAvailable = new Map();
    let callbacks = new Map();
    let queue = [];
    let nextWorkerId = 0;
    let stopped = false;
    let noOfMessages = 0;
    let q = this;

    this.log = function(message) {
      if (!logging.disabled && this.logging) {
        console.log(Date.now() + ': ' + message);
      }
    };

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
        handler.call(q, data);
      }
    };

    this.getQueueLength = function() {
      return queue.length;
    };

    function processQueue() {
      q.log('try processing queue: length ' + queue.length);
      if (queue.length === 0) {
        q.log('Queue empty');
        return;
      }
      let worker = getWorker();
      if (worker) {
        q.log('worker ' + worker.id + ' was available. Sending message to it');
        sendMessageToWorker(worker);
      }
      else {
        // no workers were available
        // start a new one unless maximum pool size has been exceeded
        q.log('no available workers');
        if (workers.size < poolSize) {
          q.log('starting new worker');
          startWorker();
        }
      }
    }

    function getWorker() {
      let worker;
      for (const [id, worker] of workers) {
        worker.id = id;
        if (isAvailable.get(+worker.id)) return worker;
        q.log('worker ' + id + ' is not available');
      }
      return false;
    }

    function sendMessageToWorker(worker) {
      if (queue.length === 0) return;
      let requestObj = queue.shift();
      let id = worker.id;
      callbacks.set(id, requestObj.qoper8.callback);
      delete requestObj.qoper8.callback;
      isAvailable.set(+id, false);
      sendMessage(requestObj, worker);
      q.emit('sentToWorker', {
        message: requestObj,
        workerId: id
      });
    }

    function sendMessage(msg, worker) {
      if (!msg.qoper8) msg.qoper8 = {};
      msg.qoper8.uuid = uuid;
      worker.postMessage(msg);
    }

    function startWorker() {
      let blobUrl = q.createUrl(workerCode);
      let worker;
      if (blobUrl) {
        worker = new Worker(blobUrl);
      }
      else {
        // if loaded in Node.js to allow it to load without an error
        worker = {};
        worker.postMessage = function(obj) {
          //console.log('simulated postMessage for ' + JSON.stringify(obj))
        };
      }

      worker.onmessage = function(e) {
        let res = e.data;

        let dispRes = JSON.parse(JSON.stringify(res));
        delete dispRes.qoper8;

        q.emit('replyReceived', {
          reply: dispRes,
          workerId: worker.id
        });

        q.log('response received from Worker: ' + worker.id);
        q.log(JSON.stringify(dispRes, null, 2));

        if (callbacks.has(worker.id)) {
          let callback = callbacks.get(worker.id);
          if (callback) callback(res, worker.id);
          callbacks.delete(worker.id);
        }

        if (res.qoper8) {
          if (res.qoper8.finished) {
            isAvailable.set(+worker.id, true);
            q.emit('worker' + worker.id + 'Available');
            if (!stopped) processQueue();
          }
          else if (res.qoper8.shutdown) {
            q.log('Master shutting down worker ' + worker.id);
            workers.delete(worker.id);
            q.emit('workerTerminated', worker.id);
            q.emit('worker' + worker.id + 'Terminated');
            worker.terminate();
          }
        }
      }

      worker.id = nextWorkerId++;
      let msg = {
        qoper8: {
          init: true,
          id: worker.id,
          handlersByMessageType: q.handlersByMessageType,
          workerInactivityCheckInterval: inactivityCheckInterval,
          workerInactivityLimit: inactivityLimit,
          logging: q.logging
        }
      };
      sendMessage(msg, worker);
      workers.set(worker.id, worker);
      q.emit('workerStarted', worker.id)
    }

    function addToQueue(obj) {
      if (stopped) {
        if (obj.qoper8 && obj.qoper8.callback) {
          obj.qoper8.callback({
            error: 'QOper8 has been stopped'
          });
        }
        return;
      }
      noOfMessages++;
      queue.push(obj);
      q.emit('addedToQueue', obj);
      processQueue();
    }

    this.message = function(obj, callback) {
      if (!obj.qoper8) obj.qoper8 = {};
      obj.qoper8.callback =  callback || false
      addToQueue(obj);
    }

    function isNowAvailable(id) {
      return new Promise((resolve) => {
        q.on('worker' + id + 'Available', function() {
          q.off('worker' + id + 'Available');
          resolve();
        });
      });
    };

    function isStopped(id) {
      return new Promise((resolve) => {
        q.on('worker' + id + 'Terminated', function() {
          q.off('worker' + id + 'Terminated');
          resolve();
        });
      });
    };

    this.stop = async function() {
      stopped = true;
      for (const [id, worker] of workers) {
        if (isAvailable.get(+id)) {
          q.log('Web Worker ' + id + ' is being stopped');
          let msg = {type: 'qoper8_terminate'};
          sendMessage(msg, worker);
          await isStopped(id);
          q.log('Worker Thread ' + id + ' has been stopped');
        }
        else {
          q.log('Waiting for Worker Thread ' + id + ' to become available');
          await isNowAvailable(id);
          let msg = {type: 'qoper8_terminate'};
          sendMessage(msg, worker);
          await isStopped(id);
          q.log('Worker Thread ' + id + ' has been stopped');
        }
      }
      q.emit('stop');
      q.log('No Worker Threads are running.  QOper8 is no longer handling messages');
    };

    this.start = function() {
      stopped = false;
      q.log('QOper8 is started and will handle messages');
      processQueue();
    }

  }

  send(messageObj) {
    let q = this;
    return new Promise((resolve) => {
      q.message(messageObj, function(responseObj) {
        resolve(responseObj);
      });
    });
  }

  createUrl(code) {
    let blob;
    let blobUrl;
    try {
      blob = new Blob([code], { "type": 'application/javascript' });
    }
    catch (e) {
      try {
        let blobBuilder = new (window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder)();
        blobBuilder.append(code);
        blob = blobBuilder.getBlob('application/javascript');
      }
      catch(e2) {
        // running in old version of Node.js?
        return false;
      }
    }
    try {
      // wrapped in a try here to allow Node.js to import this module
      let url = window.URL || window.webkitURL;
      blobUrl = url.createObjectURL(blob);
    }
    catch(e2) {
      blobUrl = false;
    }
    return blobUrl;
  }

}

export {QOper8};
