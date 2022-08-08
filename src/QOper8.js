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

7 August 2022

 */

// For full, unminified source code of QOper8Worker.js, see /src/QOper8Worker.js in repository

let workerCode = `let QWorker=class{constructor(){this.listeners=new Map,this.logging=!1;let e=new Map,r=!1,t=!1,i=this,o=!1,s=!1,n=!1,a=6e4,l=18e4,g=new Map,p=!1,d=Date.now(),h=function(){i.log("Worker "+r+" sending request to shut down");clearInterval(QOper8Worker.timer),postMessage({qoper8:{shutdown:!0}}),i.emit("shutdown_signal_sent")},c=function(e){(e=e||{}).qoper8||(e.qoper8={}),e.qoper8.finished=!0,postMessage(e),i.emit("finished",e),o=!1,s&&h()};this.onMessage=function(f){let m;if(d=Date.now(),o=!0,f.qoper8&&f.qoper8.init&&void 0!==f.qoper8.id)return t?(m="QOper8 Worker "+r+" has already been initialised",i.emit("error",m),c({error:m,originalMessage:f})):(r=f.qoper8.id,n=f.qoper8.uuid,f.qoper8.workerInactivityCheckTime&&(a=f.qoper8.workerInactivityCheckTime),f.qoper8.workerInactivityLimit&&(l=f.qoper8.workerInactivityLimit),f.qoper8.handlersByMessageType&&(g=f.qoper8.handlersByMessageType),i.logging=f.qoper8.logging,p=setInterval(function(){let e=Date.now()-d;i.log("Worker "+r+" inactive for "+e),i.log("Inactivity limit: "+l),e>l&&(o?(i.log("Worker "+r+" flagged for termination"),s=!0):h())},a),i.log("new worker "+r+" started..."),i.emit("started",{id:r}),t=!0,c());if(!f.qoper8||!f.qoper8.uuid)return m="Invalid message sent to QOper8 Worker "+r,i.emit("error",m),c({error:m,originalMessage:f});if(f.qoper8.uuid!==n)return m="Invalid UUID on message sent to QOper8 Worker "+r,i.emit("error",m),c({error:m,originalMessage:f});let u=JSON.parse(JSON.stringify(f));if(delete f.qoper8.uuid,delete u.qoper8,i.log("Message received by worker "+r+": "+JSON.stringify(u,null,2)),i.emit("received",{message:u}),!f.type&&!f.handlerUrl)return m="No type or handler specified in message sent to worker "+r,i.emit("error",m),c({error:m,originalMessage:u});if(!f.type||!g.has(f.type))return m="No handler for messages of type "+f.type,i.log(m),i.emit("error",m),c({error:m,originalMessage:u});if(!e.has(f.type)){let t=g.get(f.type);i.log("fetching "+t);try{importScripts(t);let o=self.handler;e.set(f.type,o),i.emit("handler_imported",{handlerUrl:t})}catch(e){return m="Unable to load Handler Url "+t,i.log(m),i.log(JSON.stringify(e,null,2)),i.emit("error",m),c({error:m,originalMessage:u,workerId:r})}}e.get(f.type).call(i,f,c)}}log(e){this.logging&&console.log(Date.now()+": "+e)}on(e,r){this.listeners.has(e)||this.listeners.set(e,r)}off(e){this.listeners.has(e)&&this.listeners.delete(e)}emit(e,r){if(this.listeners.has(e)){this.listeners.get(e).call(this,r)}}},QOper8Worker=new QWorker;onmessage=async function(e){QOper8Worker.onMessage(e.data)};`;

// ******* QOper8 *****************

class QOper8 {
  constructor(obj) {

    obj = obj || {};

    if (obj.workerInactivityCheckInterval) obj.workerInactivityCheckInterval = obj.workerInactivityCheckInterval * 1000;
    if (obj.workerInactivityLimit) obj.workerInactivityLimit = obj.workerInactivityLimit * 60000;

    this.name = 'QOper8';
    this.build = '2.4';
    this.buildDate = '7 August 2022';
    this.logging = obj.logging || false;
    this.poolSize = obj.poolSize || 1;
    this.worker = {
      inactivityCheckInterval: obj.workerInactivityCheckInterval || 60000,
      inactivityLimit: obj.workerInactivityLimit || 20 * 60000
    }
    this.handlersByMessageType = obj.handlersByMessageType || new Map();
    this.listeners = new Map();

    let uuid = uuidv4();
    let workers = new Map();
    let isAvailable = new Map();
    let callbacks = new Map();
    let queue = [];
    let nextWorkerId = 0;
    let q = this;

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
        if (workers.size < q.poolSize) {
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
          if (callback) callback(res);
          callbacks.delete(worker.id);
        }

        if (res.qoper8) {
          if (res.qoper8.finished) {
            isAvailable.set(+worker.id, true);
            processQueue();
          }
          else if (res.qoper8.shutdown) {
            q.log('Master shutting down worker ' + worker.id);
            workers.delete(worker.id);
            q.emit('workerTerminated', worker.id);
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
          workerInactivityCheckTime: q.worker.inactivityCheckTime,
          workerInactivityLimit: q.worker.inactivityLimit,
          logging: q.logging
        }
      };
      sendMessage(msg, worker);
      workers.set(worker.id, worker);
      q.emit('workerStarted', worker.id)
    }

    this.addToQueue = function(obj) {
      queue.push(obj);
      q.emit('addedToQueue', obj);
      processQueue();
    }

  }

  log(message) {
    if (this.logging) {
      console.log(Date.now() + ': ' + message);
    }
  }

  message(obj, callback) {
    if (!obj.qoper8) obj.qoper8 = {};
    obj.qoper8.callback =  callback || false
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
