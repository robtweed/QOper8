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

2 August 2022

 */

// For full, unminified source code of QOper8Worker.js, see /src/QOper8Worker.js in repository

let workerCode = `
let QOper8Worker={handlersByMessageType:new Map,handlers:new Map,id:!1,lastActivityAt:Date.now(),delay:6e4,timer:!1,inactivityLimit:18e4,isActive:!1,toBeTerminated:!1,logging:!1,listeners:new Map,on:function(e,r){this.listeners.has(e)||this.listeners.set(e,r)},off:function(e){this.listeners.has(e)&&this.listeners.delete(e)},emit:function(e,r){if(this.listeners.has(e)){this.listeners.get(e).call(this,r)}}};onmessage=async function(e){function r(e){(e=e||{}).qoper8={finished:!0},postMessage(e),QOper8Worker.emit("finished",e),QOper8Worker.isActive=!1,QOper8Worker.toBeTerminated&&t()}function i(e){QOper8Worker.logging&&console.log(Date.now()+": "+e)}function t(){i("Worker "+QOper8Worker.id+" sending request to shut down");clearInterval(QOper8Worker.timer),postMessage({qoper8:{shutdown:!0}}),QOper8Worker.emit("shutdown_signal_sent")}let o;QOper8Worker.lastActivityAt=Date.now(),QOper8Worker.isActive=!0,QOper8Worker.log=i;let s=e.data;if(s.qoper8&&s.qoper8.init&&void 0!==s.qoper8.id)return QOper8Worker.id=s.qoper8.id,s.qoper8.workerInactivityCheckTime&&(QOper8Worker.delay=s.qoper8.workerInactivityCheckTime),s.qoper8.workerInactivityLimit&&(QOper8Worker.inactivityLimit=s.qoper8.workerInactivityLimit),s.qoper8.handlersByMessageType&&(QOper8Worker.handlersByMessageType=s.qoper8.handlersByMessageType),QOper8Worker.logging=s.qoper8.logging,QOper8Worker.timer=setInterval(function(){let e=Date.now()-QOper8Worker.lastActivityAt;i("Worker "+QOper8Worker.id+" inactive for "+e),i("Inactivity limit: "+QOper8Worker.inactivityLimit),e>QOper8Worker.inactivityLimit&&(QOper8Worker.isActive?(i("Worker "+QOper8Worker.id+" flagged for termination"),QOper8Worker.toBeTerminated=!0):t())},QOper8Worker.delay),i("new worker "+QOper8Worker.id+" started..."),QOper8Worker.emit("started",{id:QOper8Worker.id}),r();if(i("Message received by worker "+QOper8Worker.id+": "+JSON.stringify(s,null,2)),QOper8Worker.emit("received",{message:s}),!s.type&&!s.handlerUrl)return o="No type or handler specified in message sent to worker "+QOper8Worker.id,QOper8Worker.emit("error",o),r({error:o,originalMessage:s});if(!s.type||!QOper8Worker.handlersByMessageType.has(s.type))return i(o="No handler for messages of type "+s.type),QOper8Worker.emit("error",o),r({error:o,originalMessage:s});if(!QOper8Worker.handlers.has(s.type)){let e=QOper8Worker.handlersByMessageType.get(s.type);i("fetching "+e);try{importScripts(e);let t=self.handler;QOper8Worker.handlers.set(s.type,t),QOper8Worker.emit("handler_imported",{handlerUrl:e})}catch(t){return i(o="Unable to load Handler Url "+e),i(JSON.stringify(t,null,2)),QOper8Worker.emit("error",o),r({error:o,originalMessage:s,workerId:QOper8Worker.id})}}QOper8Worker.handlers.get(s.type).call(QOper8Worker,s,r)};
`;

class QOper8 {
  constructor(obj) {

    obj = obj || {};
    if (typeof obj === 'string') {
      obj = {workerLoaderUrl: obj};
    }

    if (obj.workerInactivityCheckInterval) obj.workerInactivityCheckInterval = obj.workerInactivityCheckInterval * 1000;
    if (obj.workerInactivityLimit) obj.workerInactivityLimit = obj.workerInactivityLimit * 60000;

    this.name = 'QOper8';
    this.build = '2.2';
    this.buildDate = '2 August 2022';
    this.logging = obj.logging || false;
    this.queue = [];
    this.workers = new Map();
    this.isAvailable = new Map();
    this.callbacks = new Map();
    this.nextWorkerId = 0;
    this.poolSize = obj.poolSize || 1;
    this.worker = {
      loaderUrl: obj.workerLoaderUrl || './js/QOper8Worker.min.js',
      inactivityCheckInterval: obj.workerInactivityCheckInterval || 60000,
      inactivityLimit: obj.workerInactivityLimit || 20 * 60000
    }
    this.handlersByMessageType = obj.handlersByMessageType || new Map();
    this.listeners = new Map();
  }

  log(message) {
    if (this.logging) {
      console.log(Date.now() + ': ' + message);
    }
  }

  addToQueue(obj) {
    this.queue.push(obj);
    this.emit('addedToQueue', obj);
    this.processQueue();
  }

  message(obj, callback) {
    obj.qoper8 = {
      callback: callback || false
    };
    this.addToQueue(obj);
  }

  send(messageObj) {
    let q = this;
    return new Promise((resolve) => {
      q.message(messageObj, function(responseObj) {
        resolve(responseObj);
      });
    });
  }

  getWorker() {
    let worker;
    for (const [id, worker] of this.workers) {
      worker.id = id;
      if (this.isAvailable.get(+worker.id)) return worker;
      this.log('worker ' + id + ' is not available');
    }
    return false;
  }

  sendMessageToWorker(worker) {
    if (this.queue.length === 0) return;
    let requestObj = this.queue.shift();
    let id = worker.id;
    this.callbacks.set(id, requestObj.qoper8.callback);
    delete requestObj.qoper8;
    this.isAvailable.set(+id, false);
    worker.postMessage(requestObj);
    this.emit('sentToWorker', {
      message: requestObj,
      workerId: id
    });
  }

  processQueue() {
    this.log('try processing queue: length ' + this.queue.length);
    if (this.queue.length === 0) {
      this.log('Queue empty');
      return;
    }
    let worker = this.getWorker();
    if (worker) {
      this.log('worker ' + worker.id + ' was available. Sending message to it');
      this.sendMessageToWorker(worker);
    }
    else {
      // no workers were available
      // start a new one unless maximum pool size has been exceeded
      this.log('no available workers');
      if (this.workers.size < this.poolSize) {
        this.log('starting new worker');
        this.startWorker();
      }
    }
  }

  createUrl(code) {
    let blob;
    try {
      blob = new Blob([code], { "type": 'application/javascript' });
    }
    catch (e) {
      let blobBuilder = new (window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder)();
      blobBuilder.append(code);
      blob = blobBuilder.getBlob('application/javascript');
    }
    let url = window.URL || window.webkitURL;
    let blobUrl = url.createObjectURL(blob);
    return blobUrl;
  }

  startWorker() {
    let blobUrl = this.createUrl(workerCode);
    let worker = new Worker(blobUrl);
    let q = this;

    worker.onmessage = function(e) {
      let res = e.data;

      q.emit('replyReceived', {
        reply: res,
        workerId: worker.id
      });

      q.log('response received from Worker: ' + worker.id);
      q.log(JSON.stringify(res, null, 2));

      if (q.callbacks.has(worker.id)) {
        let callback = q.callbacks.get(worker.id);
        if (callback) callback(res);
        q.callbacks.delete(worker.id);
      }

      if (res.qoper8) {
        if (res.qoper8.finished) {
          q.isAvailable.set(+worker.id, true);
          q.processQueue();
        }
        else if (res.qoper8.shutdown) {
          q.log('Master shutting down worker ' + worker.id);
          q.workers.delete(worker.id);
          q.emit('workerTerminated', worker.id);
          worker.terminate();
        }
      }
    }

    worker.id = this.nextWorkerId++;

    worker.postMessage({
      qoper8: {
        init: true,
        id: worker.id,
        handlersByMessageType: this.handlersByMessageType,
        workerInactivityCheckTime: this.worker.inactivityCheckTime,
        workerInactivityLimit: this.worker.inactivityLimit,
        logging: this.logging
      }
    });

    this.workers.set(worker.id, worker);
    this.emit('workerStarted', worker.id)
  }

  on(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, callback);
    }
  }

  off(type) {
    if (this.listeners.has(type)) {
      this.listeners.delete(type);
    }
  }
  emit(type, data) {
    if (this.listeners.has(type)) {
      let handler =  this.listeners.get(type);
      handler.call(this, data);
    }
  }

}

export {QOper8};
