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

18 September 2023

 */

// For full, unminified source code of QOper8Worker.js, see /src/QOper8Worker.js in repository

let workerCode = `let QWorker=class{constructor(){this.logging=!1;let e,r=new Map,t=new Map,o=!1,i=!1,n=this,s=!1,a=!1,g=!1,l=6e4,p=18e4,u=new Map,c=!1,d=Date.now(),y=0;"undefined"!=typeof Bun&&(e=require("path"));let f=function(){n.log("Worker "+o+" sending request to shut down");c&&clearInterval(c),postMessage({qoper8:{shutdown:!0}}),n.emit("shutdown_signal_sent")},m=function(e){(e=e||{}).qoper8||(e.qoper8={}),e.qoper8.finished=!0,postMessage(e),n.emit("finished",e),s=!1,a&&f()};this.getMessageCount=function(){return y},this.on=function(e,t){r.has(e)||r.set(e,t)},this.off=function(e){r.has(e)&&r.delete(e)},this.emit=function(e,t){if(r.has(e)){r.get(e).call(this,t)}},this.onMessage=async function(r){let h;if(d=Date.now(),s=!0,r.qoper8&&r.qoper8.init&&void 0!==r.qoper8.id){if(i)return h="QOper8 Worker "+o+" has already been initialised",n.emit("error",h),m({error:h,originalMessage:r});if("undefined"!=typeof Bun&&r.qoper8.onStartupModule){let t;try{let{onStartupModule:i}=await import(e.resolve(process.cwd(),r.qoper8.onStartupModule));t=i}catch(e){return h="Unable to load onStartup customisation module "+r.qoper8.onStartupModule,n.log(h),n.log(JSON.stringify(e,Object.getOwnPropertyNames(e))),n.emit("error",{error:h,caughtError:JSON.stringify(e,Object.getOwnPropertyNames(e))}),m({error:h,caughtError:JSON.stringify(e,Object.getOwnPropertyNames(e)),originalMessage:r,workerId:o})}try{t.call(n,r.qoper8.onStartupArguments)}catch(e){return h="Error running onStartup customisation module "+r.qoper8.onStartupModule,n.log(h),n.log(JSON.stringify(e,Object.getOwnPropertyNames(e))),n.emit("error",{error:h,caughtError:JSON.stringify(e,Object.getOwnPropertyNames(e))}),m({error:h,caughtError:JSON.stringify(e,Object.getOwnPropertyNames(e)),originalMessage:r,workerId:o})}}return o=r.qoper8.id,g=r.qoper8.uuid,r.qoper8.workerInactivityCheckInterval&&(l=r.qoper8.workerInactivityCheckInterval),r.qoper8.workerInactivityLimit&&(p=r.qoper8.workerInactivityLimit),r.qoper8.handlersByMessageType&&(u=r.qoper8.handlersByMessageType),n.logging=r.qoper8.logging,c=setInterval(function(){let e=Date.now()-d;n.log("Worker "+o+" inactive for "+e),n.log("Inactivity limit: "+p),e>p&&(s?(n.log("Worker "+o+" flagged for termination"),a=!0):f())},l),n.log("new worker "+o+" started..."),n.emit("started",{id:o}),i=!0,m()}if(!i)return h="QOper8 Worker "+o+" has not been initialised",n.emit("error",h),m({error:h,originalMessage:r});if(!r.qoper8||!r.qoper8.uuid)return h="Invalid message sent to QOper8 Worker "+o,n.emit("error",h),m({error:h,originalMessage:r});if(r.qoper8.uuid!==g)return h="Invalid UUID on message sent to QOper8 Worker "+o,n.emit("error",h),m({error:h,originalMessage:r});let O={...r};if(delete r.qoper8.uuid,delete O.qoper8,n.log("Message received by worker "+o+": "+JSON.stringify(O,null,2)),n.emit("received",{message:O}),"qoper8_terminate"!==r.type){if(!r.type&&!r.handlerUrl)return h="No type or handler specified in message sent to worker "+o,n.emit("error",h),m({error:h,originalMessage:O});if(!r.type||!u.has(r.type))return h="No handler for messages of type "+r.type,n.log(h),n.emit("error",h),m({error:h,originalMessage:O});{if(!t.has(r.type)){let i=u.get(r.type);i.module&&(i=i.module),n.log("fetching "+i);try{let s;if("undefined"!=typeof Bun){let{handler:r}=await import(e.resolve(process.cwd(),i));s=r}else importScripts(i),s=self.handler;t.set(r.type,s),n.emit("handler_imported",{handlerUrl:i})}catch(e){return h="Unable to load Handler Url "+i,n.log(h),n.log(JSON.stringify(e,Object.getOwnPropertyNames(e))),n.emit("error",{error:h,caughtError:JSON.stringify(e,Object.getOwnPropertyNames(e))}),m({error:h,caughtError:JSON.stringify(e,Object.getOwnPropertyNames(e)),originalMessage:O,workerId:o})}}y++;let i=t.get(r.type);try{let e={...n};e.id=o,i.call(e,r,m)}catch(e){return h="Error running Handler Method for type "+r.type,n.log(h),n.log(JSON.stringify(e,Object.getOwnPropertyNames(e))),n.emit("error",{error:h,caughtError:JSON.stringify(e,Object.getOwnPropertyNames(e))}),c&&clearInterval(c),m({error:h,caughtError:JSON.stringify(e,Object.getOwnPropertyNames(e)),shutdown:!0,originalMessage:O,workerId:o})}}}else f()}}log(e){this.logging&&console.log(Date.now()+": "+e)}},QOper8Worker=new QWorker;onmessage=async function(e){QOper8Worker.onMessage(e.data)};`;

// ******* QOper8 *****************

class QOper8 {
  constructor(obj) {

    obj = obj || {};

    function uuidv4() {
      if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
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
    this.build = '3.2';
    this.buildDate = '18 September 2023';
    this.logging = obj.logging || false;
    let poolSize = +obj.poolSize || 1;
    let maxPoolSize = obj.maxPoolSize || 32;
    if (poolSize > maxPoolSize) poolSize = maxPoolSize;
    let loggingDisabled = obj.disabled || false;
    let inactivityCheckInterval = obj.workerInactivityCheckInterval || 60000;
    let inactivityLimit = obj.workerInactivityLimit || (20 * 60000);
    this.handlersByMessageType = obj.handlersByMessageType || new Map();
    let handlerTimeout = obj.handlerTimeout || false;
    let onStartup = obj.onStartup || {};
    let onStartupModule = onStartup.module;
    let onStartupArguments = onStartup.arguments;
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

    this.setPoolSize = function(size) {
      if (+size > 0 && +size < (maxPoolSize + 1)) {
        poolSize = +size;
      }
    }


    this.setOnStartupModule = function(obj) {
      // should be an object:  {module: '/path/to/module', arguments: {key1: value1, ...etc} }
      if (!onStartupModule) {
        obj = obj || {};
        onStartupModule = obj.module;
        onStartupArguments = obj.arguments;
      }
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
      let id = +worker.id;
      isAvailable.set(id, false);
      let requestObj = queue.shift();
      let pendingRecord = {
        messageNo: requestObj.qoper8.messageNo,
        request: requestObj,
        callback: requestObj.qoper8.callback
      };
      pendingRequests.set(id, pendingRecord);
      delete requestObj.qoper8.callback;
      delete requestObj.qoper8.messageNo;

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
      let worker;

      if (typeof Bun !== 'undefined') {
        const workerURL = new URL('QOper8Worker.js', import.meta.url).href;
        worker = new Worker(workerURL);
      }
      else {
        let blobUrl = q.createUrl(workerCode);
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

            q.emit('worker' + id + 'Available');
            clearTimeout(handlerTimers.get(id));
            isAvailable.set(id, true);

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
            handlerTimers.delete(id);
            isAvailable.set(id, true);
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
          logging: q.logging,
          onStartupModule: onStartupModule,
          onStartupArguments: onStartupArguments
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

    if (typeof Bun !== 'undefined' && this.logging) {
      console.log('========================================================');
      console.log('qoper8-ww Build ' + this.build + '; ' + this.buildDate + ' running in process ' + process.pid);
      console.log('Max WebWorker Pool Size: ' + poolSize);
      console.log('========================================================');
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
