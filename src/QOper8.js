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

24 August 2022

 */

// For full, unminified source code of QOper8Worker.js, see /src/QOper8Worker.js in repository

let workerCode = `let QWorker=class{constructor(){this.logging=!1;let e=new Map,r=new Map,t=!1,o=!1,i=this,n=!1,s=!1,a=!1,g=6e4,l=18e4,p=new Map,d=!1,c=Date.now(),h=0,y=function(){i.log("Worker "+t+" sending request to shut down");d&&clearInterval(d),postMessage({qoper8:{shutdown:!0}}),i.emit("shutdown_signal_sent")},u=function(e){(e=e||{}).qoper8||(e.qoper8={}),e.qoper8.finished=!0,postMessage(e),i.emit("finished",e),n=!1,s&&y()};this.getMessageCount=function(){return h},this.on=function(r,t){e.has(r)||e.set(r,t)},this.off=function(r){e.has(r)&&e.delete(r)},this.emit=function(r,t){if(e.has(r)){e.get(r).call(this,t)}},this.onMessage=function(e){let f;if(c=Date.now(),n=!0,e.qoper8&&e.qoper8.init&&void 0!==e.qoper8.id)return o?(f="QOper8 Worker "+t+" has already been initialised",i.emit("error",f),u({error:f,originalMessage:e})):(t=e.qoper8.id,a=e.qoper8.uuid,e.qoper8.workerInactivityCheckInterval&&(g=e.qoper8.workerInactivityCheckInterval),e.qoper8.workerInactivityLimit&&(l=e.qoper8.workerInactivityLimit),e.qoper8.handlersByMessageType&&(p=e.qoper8.handlersByMessageType),i.logging=e.qoper8.logging,d=setInterval(function(){let e=Date.now()-c;i.log("Worker "+t+" inactive for "+e),i.log("Inactivity limit: "+l),e>l&&(n?(i.log("Worker "+t+" flagged for termination"),s=!0):y())},g),i.log("new worker "+t+" started..."),i.emit("started",{id:t}),o=!0,u());if(!o)return f="QOper8 Worker "+t+" has not been initialised",i.emit("error",f),u({error:f,originalMessage:e});if(!e.qoper8||!e.qoper8.uuid)return f="Invalid message sent to QOper8 Worker "+t,i.emit("error",f),u({error:f,originalMessage:e});if(e.qoper8.uuid!==a)return f="Invalid UUID on message sent to QOper8 Worker "+t,i.emit("error",f),u({error:f,originalMessage:e});let m={...e};if(delete e.qoper8.uuid,delete m.qoper8,i.log("Message received by worker "+t+": "+JSON.stringify(m,null,2)),i.emit("received",{message:m}),"qoper8_terminate"!==e.type){if(!e.type&&!e.handlerUrl)return f="No type or handler specified in message sent to worker "+t,i.emit("error",f),u({error:f,originalMessage:m});if(!e.type||!p.has(e.type))return f="No handler for messages of type "+e.type,i.log(f),i.emit("error",f),u({error:f,originalMessage:m});{if(!r.has(e.type)){let o=p.get(e.type);i.log("fetching "+o);try{importScripts(o);let n=self.handler;r.set(e.type,n),i.emit("handler_imported",{handlerUrl:o})}catch(e){return f="Unable to load Handler Url "+o,i.log(f),i.log(JSON.stringify(e,Object.getOwnPropertyNames(e))),i.emit("error",{error:f,caughtError:JSON.stringify(e,Object.getOwnPropertyNames(e))}),u({error:f,caughtError:JSON.stringify(e,Object.getOwnPropertyNames(e)),originalMessage:m,workerId:t})}}h++;let o=r.get(e.type);try{let r={...i};r.id=t,o.call(r,e,u)}catch(r){return f="Error running Handler Method for type "+e.type,i.log(f),i.log(JSON.stringify(r,Object.getOwnPropertyNames(r))),i.emit("error",{error:f,caughtError:JSON.stringify(r,Object.getOwnPropertyNames(r))}),d&&clearInterval(d),u({error:f,caughtError:JSON.stringify(r,Object.getOwnPropertyNames(r)),shutdown:!0,originalMessage:m,workerId:t})}}}else y()}}log(e){this.logging&&console.log(Date.now()+": "+e)}},QOper8Worker=new QWorker;onmessage=async function(e){QOper8Worker.onMessage(e.data)};`;

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
    this.build = '2.6';
    this.buildDate = '23 August 2022';
    this.logging = obj.logging || false;
    let poolSize = +obj.poolSize || 1;
    let maxPoolSize = obj.maxPoolSize || 32;
    if (poolSize > maxPoolSize) poolSize = maxPoolSize;
    let loggingDisabled = obj.disabled || false;
    let inactivityCheckInterval = obj.workerInactivityCheckInterval || 60000;
    let inactivityLimit = obj.workerInactivityLimit || (20 * 60000);
    this.handlersByMessageType = obj.handlersByMessageType || new Map();
    let handlerTimeout = obj.handlerTimeout || false;
    let listeners = new Map();

    let uuid = uuidv4();
    let workers = new Map();
    let isAvailable = new Map();
    let pendingRequests = new Map();

    let handlerTimers = new Map();
    let queue = [];
    let nextWorkerId = 0;
    let stopped = false;
    let noOfMessages = 0;
    let q = this;

    this.log = function(message) {
      if (!loggingDisabled && this.logging) {
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
      let id = +worker.id;
      let pendingRecord = {
        messageNo: requestObj.qoper8.messageNo,
        request: requestObj,
        callback: requestObj.qoper8.callback
      };
      pendingRequests.set(id, pendingRecord);
      delete requestObj.qoper8.callback;
      delete requestObj.qoper8.messageNo;
      isAvailable.set(+id, false);

      if (handlerTimeout) {
        let timer = setTimeout(function() {

          // return an error to the waiting request promise
          //  include the original request, so it can be re-queued if desired

          // terminate the WebWorker as there's probably something wrong with it

          if (pendingRequests.has(id)) {
            let pendingRecord = pendingRequests.get(id);
            let callback = pendingRecord.callback;
            let requestObj = pendingRecord.request;
            delete requestObj.qoper8;
            let res = {
              error: 'WebWorker handler timeout exceeded',
              originalRequest: requestObj
            };
            if (callback) callback(res, id);
            pendingRequests.delete(id);
            handlerTimers.delete(id);
            // send shutdown signal to child process to ensure it
            // stops its timer

            sendMessage({
              type: 'qoper8_terminate'
            }, worker);

          }

        },handlerTimeout);
        handlerTimers.set(id, timer);
      } 

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

        let id = +worker.id;
        let res = e.data;

        let dispRes = {...res};
        //let dispRes = JSON.parse(JSON.stringify(res));
        delete dispRes.qoper8;

        q.emit('replyReceived', {
          reply: dispRes,
          workerId: id
        });

        q.log('response received from Worker: ' + id);
        q.log(JSON.stringify(dispRes, null, 2));

        if (res.qoper8) {
          if (res.qoper8.finished) {

            if (pendingRequests.has(id)) {
              let pendingRecord = pendingRequests.get(id);
              let originalMessageNo = pendingRecord.messageNo;
              q.emit('QBackupDelete', originalMessageNo);
              let callback = pendingRecord.callback;
              if (callback) callback(res, id);
            }

            isAvailable.set(id, true);
            q.emit('worker' + id + 'Available');
            clearTimeout(handlerTimers.get(id));

            if (res.error && res.shutdown) {
              workers.delete(id);
              isAvailable.delete(id);
              pendingRequests.delete(id);
              handlerTimers.delete(id)
              q.emit('worker' + id + 'Terminated');
              worker.terminate();
              if (!stopped) processQueue();
              return;
            }

            pendingRequests.delete(id);
            isAvailable.set(id, true);
            handlerTimers.delete(id)
            if (!stopped) processQueue();
          }
          else if (res.qoper8.shutdown) {
            q.log('Master shutting down worker ' + id);
            workers.delete(id);
            isAvailable.delete(id);
            pendingRequests.delete(id);
            handlerTimers.delete(id)
            q.emit('workerTerminated', id);
            q.emit('worker' + id + 'Terminated');
            worker.terminate();
          }
        }
      };

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
      obj.qoper8.messageNo = noOfMessages;
      queue.push(obj);
      let req = {...obj};
      delete req.qoper8;
      q.emit('QBackupAdd', {
        id: obj.qoper8.messageNo,
        requestObject: req
      });
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
          q.log('WebWorker ' + id + ' has been stopped');
        }
        else {
          q.log('Waiting for WebWorker ' + id + ' to become available');
          await isNowAvailable(id);
          let msg = {type: 'qoper8_terminate'};
          sendMessage(msg, worker);
          await isStopped(id);
          q.log('WebWorker ' + id + ' has been stopped');
        }
      }
      q.emit('stop');
      q.log('No WebWorkers are running.  QOper8 is no longer handling messages');
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
