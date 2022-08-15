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


## Live Demo

Try out this [live example](https://robtweed.github.io/QOper8/examples/live), running directly
from the source code you'll find in the [*/examples/live*](/examples/live) folder of this repo.


## Installing

### From CDN

You can use QOoper8 directly from the Github CDN linked to this repository.  In your main module, load it using:

      const {QOper8} = await import('https://cdn.jsdelivr.net/gh/robtweed/QOper8/src/QOper8.min.js');

### Clone from Github

Alternatively, clone or copy the file [*/src/QOper8.min.js*](/src/QOper8.min.js)
to an appropriate directory on your web server and load it directly from there, eg:


      const {QOper8} = await import('/path/to/QOper8.min.js');

### From NPM

        npm install qoper8-ww

Then you can import the QOper8 class:

        import {QOper8} from 'qoper8-ww';


## Starting/Configuring QOper8

You start and configure QOper8 by creating an instance of the QOper8 class:

      let qoper8 = new QOper8(options);

*options* is an object that defines your particular configuration.  Its main properties are:

- *poolSize*: the maximum number of WebWorker processes that QOper8 will start and run concurrently (Note that WebWorkers are started dynamically on demand.  If not specified, the poolSize will be 1: ie all messages will be handled by a single WebWorker

- *handlersByMessageType*: a JavaScript Map of each message type to its respective handler method module URL.  Message types can be any string value

- *logging*: if set to *true*, QOper8 will generate console.log messages for each of its critical processing steps within both the main process and every WebWorker process.  This is useful for debugging during development.  If not specified, it is set to *false*.

- *disableLogging*: if set to *true*, QOper8's externally-accessible read/write *logging* property is deactivated, thereby preventing the risk of unauthorised message "snooping* using the browser's JavaScript console in a production system.  If not specified, it defaults to *false*.


You can optionally modify the parameters used by QOper8 for monitoring and shutting down inactive WebWorker processes, by using the following *options* properties:

- *workerInactivityCheckInterval*: how frequently (in seconds) a WebWorker checks itself for inactivity.  If not specified, a value of 60 (seconds) is used

- *workerInactivityLimit*: the length of time (in minutes) a WebWorker process can remain inactive until QOper8 shuts it down.  If not specified, the maximum inactivity duration is 20 minutes.


For example:

      let qoper8 = new QOper8({
        poolSize: 2,
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


So, as you can see, everything related to the WebWorker processes and the message flow between the main process and the WebWorker processes is handled automatically for you by QOper8.  As far as you are concerned, there are just three steps:

- you ceeate a Message Handler script file for each of your required message *type*s

- you then add objects to the QOper8 queue, specifying the message *type* for each one

- you await the response object returned from the WebWorker by your message handler


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

First, let's define the Message Handler Script file.  We'll use the example above:

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

        const {QOper8} = await import('../js/QOper8.min.js');

        // Start/Configure an instance of QOper8:

        let qoper8 = new QOper8({
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


## How Many WebWorkers Should I Use?

It's entirely up to you.  Each WebWorker in your pool will be able to invoke your type-specific message handler, and each will run identically.  There's a few things to note:

- Having more than one WebWorker will allow a busy workload of queued messages to be shared amongst the WebWorker pool;

- if you have more than one WebWorker, you have no control over which WebWorker handles each message you add to the QOper8 queue.  This should normally not matter to you, but you need to be aware;

- A QOper8 WebWorker process only handles a single message at a time.  The WebWorker is not available again until it invokes the *finished()* method within your handler.

- You'll find that overall throughput will initially increase as you add more WebWorkers to your pool, but you'll then find that throughput will start to decrease as you further increase the pool.  It will depend on a number of factors, such as the type of browser and the number of CPU cores available on the machine running the browser.  Typically optimal throughput is achieved with 3-4 WebWorkers.

- If you use just a single WebWorker, your queued messages will be handled individually, one at a time, in strict chronological sequence.  This can be advantageous for certain kinds of activity where you need strict control over the serialisation of activities.  The downside is that the overall throughput will be typically less than if you had a larger WebWorker pool.


## Benchmarking QOper8 Throughput

To get an idea of the throughput performance of QOper8 on different browsers, try out the benchmarking application.  

This application allows you to specify the WebWorker Pool Size, and you then set up the parameters for generating a stream of identical messages that will be handled by a simple almost "do-nothing" message handler.  

You specify the total number of messages you want to generate, eg 50,000, but rather than the application simply adding the whole lot to the QOper8 queue in one go, you define how to generate batches of messages that get added to the queue.  So you define:

- the batch size, eg 1000 messages at a time
- the delay time between batches, eg 200ms

This avoids the performance overheads of the browser's JavaScript run-time handling a potentially massive array which could potententially adversely affect the performance throughput.  

The trick is to create a balance of batch size and delay to maintain a sustainably-sized queue.  The application reports its work and results to the browser's JavaScript console, and will tell you if the queue increases with each message batch, or if the queue is exhausted between batches.

Keep tweaking the delay time:

- increase it if the queue keeps expanding with each new batch
- decrease it if the queue is getting exhausted at each batch

At the end of each run, the application will display, in the JavaScript console:

- the total time taken
- the throughtput rate (messages handled per second)
- the number of messages handled by each of the WebWorkers in the pool you specified.

The results can be pretty interesting, particularly comparing throughput for different browsers on the same hardware platform.  For example, you will probably find that Firefox is significantly faster than Safari.


## Optionally Packaging Your Message Handler Code

As you'll have seen above, the default way in which QOper8 dynamically loads each of your Message Handler script files is via a corresponding URL that you define in the QOper8 constructor's *handlersByMessageType* property.

When a Message Handler Script File is needed by QOper8, it loads it using the WebWorker's *importScripts()* API.  This is the standard way to load libraries into WebWorkers, but of course, it means that each of your Message Handler Script Files need to reside on the Web Server from which they can be fetched via the URL you've specified.

This approach is OK if you manually build and maintain your front-end code, but if you want to use a Node.js/WebPack approach for building a bundled file containing all your front-end code, it is awkward and inconvenient to have the parts needed by QOper8's WebWorker(s) residing separately on the Web Server.  It's also awkward if you want to distribute a package based around QOper8.

Fortunately, there is a trick that can be used, using what are known as *Blob URLs* that can be dynamically created from an image of the code you want to fetch.  QOper8 uses this approach itself for its *QOper8Worker.js* Loader file, and makes available to you the same logic via an API named *createURL()*, so you can use it for your own Message Handler Script Files.

Let's modify the example we created above to demonstrate how to package all your code into a single bundleable file.

First, add the handler code as the value of a variable in your main script file.  By using back-tick characters around the code, you can have it laid out in an easy-to-read form:

        let handlerCode = `      
          self.handler = function(obj, finished) {
            // simple example that just echoes back the incoming message
            finished({
              processing: 'Message processing done!',
              data: obj.data,
              time: Date.now()
            });
            };
        `;


We can now use QOper8's blobURL creation API to create a blobURL for the Message Handler Script File code:

        let url = qoper8.createUrl(handlerCode);

And we can now use this URL in the *handlersByMessageType* Map, eg:

          qoper8.handlersByMessageType.set('myMessage', url);


So, let's put that all together into a new version of the *app.js* file:

### app.js

      (async () => {

        // load/import the QOper8 module from its source directory (change the path as appropriate)

        const {QOper8} = await import('../js/QOper8.min.js');

        // Start/Configure an instance of QOper8, without specifying a handlersByMessageType Map:

        let qoper8 = new QOper8({
          logging: true
        });

        let handlerCode = `     
          self.handler = function(obj, finished) {
            // simple example that just echoes back the incoming message
            finished({
              processing: 'Message processing done!',
              data: obj.data,
              time: Date.now()
            });
            };
        `;
        `;
        let url = qoper8.createUrl(handlerCode);

        // Now add this Blob URL to your QOper8 instance's handlersByMessageType Map:

        qoper8.handlersByMessageType.set('myMessage', url);

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


So you now have everything defined in a single file that can be bundled using WebPack or distributed as a single package!

### Downsides of the Blob URL Approach

Whilst it clearly has many advantages in terms of portability and re-usability of code, the main downside of this approach is that it becomes a lot more difficult to debug your WebWorker code during development.  You'll find that the browser's development tools will show a meaningless URL when your Message Handler Script File is loaded into the WebWorker, and, for example, if you use a lot of different Message Handler Scripts, you'll find it difficult to distinguish and identify which ones have been loaded from the browser's Development Tools console.

I recommend developing using separately-loaded versions of your Message Handler Script Files until you have them working properly, and only then should you package them up using Blob URLs.



## Additional QOper8 APIs

- As an alternative to the *send()* API, you can use the asynchronous *message()* API which allows you to define a callback function for handling the response returned by the WebWorker that processed the message, eg:

      qoper8.message(messageObj, function(responseObj) {

        // handle the returned response object

      });


- You can use the *log()* API to display date/time-stamped console.log messages.  To use this API, you must configure QOper8 with *logging: true* as one of its configuration option properties.  For example:

      qoper8.log('This is a message');

      // 1656004435581: This is a message

  This can be helpful to verify the correct chronological sequence of events within the console log when debugging.

- qoper8.getMessageCount(): Returns the total number of messages successfully handled by QOper8

- qoper8.getQueueLength(): Returns the current queue length.  Under most circumstances this should usually return zero.

- qoper8.stop(): Controllably shuts down all WebWorkers in the pool and prevents any further messages being added to the queue.  Any messages currently in the queue will remain there and will not be processed.

- qoper8.start(): Can be used after a *stop()* to resume QOper8's ability to add messages to its queue and to process them.  QOper8 will automatically start up new WebWorker(s).

- qoper8.createUrl(code): Creates a *blobURL* (see earlier for explanation).

### Properties:

- qoper8.name: returns *QOper8*

- qoper8.build: returns the build number, eg 2.5

- qoper8.buildDate: returns the date the build was created

- qoper8.logging: read/write property, defaults to *false*.  Set it to *true* to see a trace of QOper8 foreground and WebWorker activity in the JavaScript console.  Set to false for production systems to avoid any overheads and to prevent message snooping. To prevent unauthorised logging, use the *disableLogging* property at startup (this cannot be subsequently modified by a user or third-party script)

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
- *stop*: emitted whenever QOper8 is stopped using the *stop()* API
- *start*: emitted whenever QOper8 is re-started using the *start()* API

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
