# QOper8: Queue-based WebWorker Pool Manager
 
Rob Tweed <rtweed@mgateway.com>  
23 June 2022, M/Gateway Developments Ltd [http://www.mgateway.com](http://www.mgateway.com)  

Twitter: @rtweed

Google Group for discussions, support, advice etc: [http://groups.google.co.uk/group/enterprise-web-developer-community](http://groups.google.co.uk/group/enterprise-web-developer-community)


## What is QOper8?

QOper8 is a JavaScript Module that provides a simple yet powerful way to use and manage WebWorkers in your
browser applications.

QOper8 allows you to define a pool of WebWorkers, to which messages that you create are automatically
dispatched and handled.  QOper8 manages the WebWorker pool for you automatically, bringing them into play and closing them down based on demand.  Qoper8 allows you to determine how long a WebWorker process will persist.

*Note*: The inspiration for and design of QOper8 originates from the tried and tested [QEWD](https://github.com/robtweed/qewd) framework for Node.js.  At the heart of QEWD is a very similar queue/dispatch mechanism - 
[ewd-qoper8](https://github.com/robtweed/ewd-qoper8).  *ewd-qoper8* maintains and manages the use of a pool of Node.js Child Processes, and is used in a very similar way to *QOper8*.  Qoper8 essentially brings the equivalent concept to the browser.


QOper8 is unique for several reasons:

- it works on a queue/dispatch architecture.  All you do as a developer is use a simple API to add a message to the QOper8 queue.  You then let QOper8 do the rest.

- each WebWorker process only handles a single message request at a time.  There are therefore no concurrency issues to worry about within your WebWorker handler method(s)

- messages contain a JSON payload and a type which you specify.  You can have and use as many types as you wish, but you must create a handler method for each message type.  QOper8 will load your message type handler methods dynamically and automatically into the WebWorker that it allocates to handle the message.

QOper8 will automatically shut down WebWorkers if they have been inactive for a pre-defined length of time (20 minutes by default).


## Will QOper8 Work on All Browsers?

QOper8 should work on all modern browsers. The only dependencies are that the browser must support:

- WebWorkers
- async/await
- ES6 Modules


## Installing

You can use QOoper8 directly from the Github CDN linked to this repository.  In your main module, load it using:

      const {QOper8} = await import('https://cdn.jsdelivr.net/gh/robtweed/QOper8/src/qoper8.min.js');

Alternatively, clone or copy the file [*/src/qoper8.min.js*](/src/qoper8.min.js)
to an appropriate directory on your web server and load it directly from there, eg:


      const {QOper8} = await import('/path/to/qoper8.min.js');


## Starting/Configuring QOper8

You start and configure QOper8 by creating an instance of the QOper8 class:

      let qoper8 = new QOper8(options);

*options* is an object that defines your particular configuration.  Its main properties are:

- *poolSize*: the maximum number of WebWorker processes that QOper8 will start and run concurrently (Note that WebWorkers are started dynamically on demand.  If not specified, the poolSize will be 1: ie all messages will be handled by a single WebWorker

- *workerLoaderUrl*: the URL for the QOper8Worker.js module that is used by each of your WebWorkers.  If not specified, a URL of *./js/QOper8Worker.min.js* will be used

- *handlersByMessageType*: a JavaScript Map of each message type to its respective handler method module URL.  Message types can be any string value

- *logging*: if set to *true*, QOper8 will generate console.log messages for each of its critical processing steps within both the main process and every WebWorker process.  This is useful for debugging during development.  If not specified, it is set to *false*.


You can optionally modify the parameters used by QOper8 for monitoring and shutting down inactive WebWorker processes, by using the following *options* properties:

- *inactivityCheckInterval*: how frequently (in seconds) a WebWorker checks itself for inactivity.  If not specified, a value of 60 (seconds) is used

- *inactivityLimit*: the length of time (in minutes) a WebWorker process can remain inactive until QOper8 shuts it down.  If not specified, the maximum inactivity duration is 20 minutes.


For example:

      let qoper8 = new QOper8({
        poolSize: 2,
        workerLoaderUrl: './js/QOper8Worker.min.js',
        logging: true,
        handlersByMessageType: new Map([
          ['myMessageType1', './type1.js'],
          ['myMessageType2', './type2.js']
        ]),
        workerInactivityCheckInterval: 20,
        workerInactivityLimit: 5
      });


## Adding a Message to the QOper8 Queue

The simplest technique is to use the *send* API.  This method creates a Promise, the resolution of which will be the response object returned from the assigned WebWorker that handled the message.

For example, you can use async/await syntax:

      let res = await qoper8.send(messageObject);

  where:

  - *messageObject*: an object with the following properties:

    - *type*: mandatory property specifying the message type.  The *type* value is a string that you determine, and must have a corresponding mapping in the *options.handlersByMessageType* Map that you used when configuring QOper8 (see above)

    - *data*: a sub-object containing your message payload.  The message payload content and structure is up to you.  Your associated message type handler method will, of course, be designed by you to expect and process this payload structure


  - *res*: the response object returned from the WebWorker process that handled the message.  The structure and contents of the *res* object will be determined by you within your message type handler module.

eg:

      let res = await qoper8.send({
        type: 'myMessageType1',
        data: {
          hello: 'world'
        }
      });


## What Happens When You Add A Message To the QOper8 Queue?

Adding a Message to the queue sets off a chain of events:


1. Qoper8 first checks to see if a WebWorker process is available

  - if not, and if the WebWorker poolsize has not yet been exceeded, QOper8:

    - starts a new WebWorker process, loading it with the QOper8Worker.js file
    - sends an initialisation message to the new WebWorker process with the relevent configuration parameters
    - on completion, the WebWorker returns a message to the main process, instructing QOper8 that the WebWorker is ready and available

  - if not, and if the maximum number of WebWorkers is already running, no further action takes place and the new message is left in the queue for later processing

  - if a WebWorker process is available, QOper8 extracts the first message from the queue and sends it to the allocated WebWorker process.  The WebWorker process is flagged as *unavailable*


2. When the WebWorker process receives the message:

  - it checks the *type* value against the *handlersByMessageType* Map.  If the associated handler method script has not been loaded into the WebWorker, it is now loaded (using the importScripts method)

  - the type-specific Handler Method is invoked, passing the incoming message object as its first argument.

3. When the Handler Method completes, the QOper8Worker WebWorker returns its response object to the awaiting main process Promise.  The main QOper8 process:

  - flags the WebWorker process as *available*
  - repeats the procedure, starting at step *1)* above again


So, as you can see, everything related to the WebWorker processes and the message flow between the main process and the WebWorker processes is handled automatically for you by QOper8.  As far as you are concerned, there are just two steps:

- you ceeate a Message Handler script file for each of your required message *type*s

- you then add objects to the QOper8 queue, specifying the message *type* for each one


## The Message Handler Method Script

QOper8 Message Handler Method script files must conform to a predetermined pattern as follows:

      self.handler = function(messageObj, finished) {

        // your logic for processing the incoming message object 

        // as a result of your processing, create a response object (responseObj)

        // when processing is complete, you MUST invoke the finished() method and exit the handler method:

        return finished(responseObj);

      };


The structure and contents of the response object are up to you.  

The *finished()* method is provided for you by the *QOper8Worker* module.  It:

- returns the response object (specified as its argument) to the main QOper8 process
- instructs the main QOper8 process that processing has completed in the WebWorker, and, as a result, the WebWorker is flagged as *available* for handling any new incoming/queued messages
- finally tells QOper8 to process the first message in its queue (unless it's empty)


For example:

      self.handler = function(obj, finished) {

        // simple example that just echoes back the incoming message

        finished({
          processing: 'Message processing done!',
          data: obj.data,
          time: Date.now()
        });

      };


## Simple Example

This simple example creates a pool of 1 WebWorker (the default configuration) and allows you to process a message of type *myMessage*

First, let's define the Message Handler Module.  We'll use the example above:

### myMessage.js

      self.handler = function(obj, finished) {

        // simple example that just echoes back the incoming message

        finished({
          processing: 'Message processing done!',
          data: obj.data,
          time: Date.now()
        });

      };


Now define our main application file.  Note the mapping of the *myMessage* type to the *myMessage.js* handler module:

### app.js

      (async () => {

        // load/import the QOper8 module from its source directory (change the path as appropriate)

        const {QOper8} = await import('../js/qoper8.min.js');

        // Start/Configure an instance of QOper8:

        let qoper8 = new QOper8({
          workerLoaderUrl: './js/QOper8Worker.min.js',
          logging: true,
          handlersByMessageType: new Map([
            ['myMessage', './myMessage.js']
          ])
        });


        // add a message to the Qoper8 queue and await its results

        let res = await qoper8.send({
          type: 'myMessage',
          data: {
            hello: 'world'
          }
        });

        console.log('Results received from WebWorker:');
        console.log(JSON.stringify(res, null, 2));


      })();


Load and run this module in your browser with a web page such as this:


### index.html

      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>QOper8 Demo</title>
        </head>
        <body>
          <script type="module" src="/qoper8/js/app.js"></script>
        </body>
      </html>


When you load it into you browser, take a look at the console log in your browser's development tools panel.

You should see the *console.log()* messages generated at each step by QOper8 as it processes the queued message.

If you now leave the web page alone, you'll see the messages generated when it periodically checks the WebWorker process for inactivity.  Eventually you'll see it being shut down automatically.


## Additional QOper8 APIs

- As an alternative to the *send()* API, you can use the asynchronous *message()* API which allows you to define a callback function for handling the response returned by the WebWorker that processed the message, eg:

      qoper8.message(messageObj, function(responseObj) {

        // handle the returned response object

      });


- You can use the *log()* API to display date/time-stamped console.log messages.  To use this API, you must configure QOper8 with *logging: true* as one of its configuration option properties.  For example:

      qoper8.log('This is a message');

      // 1656004435581: This is a message

  This can be helpful to verify the correct chronological sequence of events within the console log when debugging.


## Events

The QOper8 module allows you to emit and handle your own specific custom events


- Define an event handler using the *on()* method, eg:

      qoper8.on('myEvent', function(dataObj) {
        // handle the 'myEvent' event
      });

  The first argument can be any string you like.

- Emit an event using the *emit()* method, eg:

      qoper8.emit('myEvent', {foo: bar}):

  The second argument can be either a string or object, and is passed to the callback of the associated *on()* method.


- Remove an event handler using the *off()* method, eg:

      qoper8.off('myEvent');

Note that repeated calls to the *on()* method with the same event name will be ignored if a handler has already been defined.  To change/replace an event handler, first delete it using the *off()* method, then redefine it using the *on()* method.


QOper8 itself emits a number of events that you can handle, both in the main browser process and within the WebWorker(s).

The Main process QOper8 event names are:

- *workerStarted*: emitted whenever a WebWorker starts
- *addedToQueue*: emitted whenever a new message is added to the queue
- *sentToWorker*: emitted whenever a message is removed from the queue and sent to a WebWorker
- *replyReceived*: emitted whenever a response message from a WebWorker is received by the main browser process 
- *workerTerminated*: emitted whenever QOper8 shuts down a WebWorker

You can provide your own custom handlers for these events by using the *on()* method within your main module.


The WebWorker (QOper8Worker) event names are:

- *started*: emitted when the WebWorker has started and been successfully initialised by the main QOper8 process
- *handler_imported*: emitted on successful import of a message type handler module
- *received*: emitted whenever the WebWorker receives a message from the main QOper8 process
- *finished*: emitted whenever the *finished()* method has been invoked
- *shutdown_signal_sent*: emitted whenever the WebWorker sends a message to the main QOper8 process, signalling that it is to be shut down (as a result of inactivity)
- *error*: emitted whenever errors occur during processing within the WebWorker

You can provide your own custom handlers for these events by using the *this.on()* method within your message type handler module(s).  Note, as explained earlier, that repeated use of *this.on()* for the same event name will be ignored.


Note that you cannot access the browser DOM from a WebWorker.  Instead, use the WebWorker *postMessage(messageObj)* API to send a message to the main QOper8 process.  You can then handle this within the main process using an *on('replyReceived') handler, eg:

- in your message type handler:

      postMessage({
        type: 'custom',
        data: {
          foo: 'bar'
        }
      });

- in your main module

      qoper8.on('replyReceived', function(res) {
        if (res.type === 'custom') {
          // do something with res.data
        }
      });


## Live Demo

Try out this [live example](https://robtweed.github.io/QOper8/examples/live), running directly
from the source code you'll find in the [*/examples/live*](/examples/live) folder of this repo.



## License

 Copyright (c) 2022 M/Gateway Developments Ltd,                           
 Redhill, Surrey UK.                                                      
 All rights reserved.                                                     
                                                                           
  http://www.mgateway.com                                                  
  Email: rtweed@mgateway.com                                               
                                                                           
                                                                           
  Licensed under the Apache License, Version 2.0 (the "License");          
  you may not use this file except in compliance with the License.         
  You may obtain a copy of the License at                                  
                                                                           
      http://www.apache.org/licenses/LICENSE-2.0                           
                                                                           
  Unless required by applicable law or agreed to in writing, software      
  distributed under the License is distributed on an "AS IS" BASIS,        
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
  See the License for the specific language governing permissions and      
   limitations under the License.      
