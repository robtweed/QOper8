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

30 July 2022

 */

class QOper8 {
  constructor(obj) {

    obj = obj || {};
    if (typeof obj === 'string') {
      obj = {workerLoaderUrl: obj};
    }

    if (obj.workerInactivityCheckInterval) obj.workerInactivityCheckInterval = obj.workerInactivityCheckInterval * 1000;
    if (obj.workerInactivityLimit) obj.workerInactivityLimit = obj.workerInactivityLimit * 60000;

    this.name = 'QOper8';
    this.build = '1.0';
    this.buildDate = '23 June 2022';
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

  startWorker() {
    let worker = new Worker(this.worker.loaderUrl);
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
