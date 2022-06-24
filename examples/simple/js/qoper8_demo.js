(async () => {

  const {QOper8} = await import('../js/QOper8.js');

  let options = {
    poolSize: 2,
    workerLoaderUrl: './js/QOper8Worker.min.js',
    workerInactivityCheckInterval: 20,
    workerInactivityLimit: 5,
    //logging: true,
    handlersByMessageType: new Map([
      ['type1', './type1.js'],
      ['type2', './type2.js']
    ])
  };

  let qoper8 = new QOper8(options);

  qoper8.on('workerStarted', function(id) {
    console.log('***** worker started: ' + id + ' *******');
        });

  qoper8.on('addedToQueue', function(obj) {
    console.log('***** message added to queue *******');
    console.log(JSON.stringify(obj, null, 2));
  });

  qoper8.on('sentToWorker', function(obj) {
    console.log('***** message sent to worker *******');
    console.log(JSON.stringify(obj, null, 2));
  });

  qoper8.on('replyReceived', function(obj) {
    console.log('***** response received from worker *******');
    console.log(JSON.stringify(obj, null, 2));
  });



  qoper8.log('ok!');

  let obj = {
    type: 'type1',
    data: {
      hello: 'world'
    }
  };
  let msg1 = qoper8.send(obj);

  let obj2 = {
    type: 'type1',
    data: {
      hello: 'again'
    }
  };
  let msg2 = qoper8.send(obj2);

  let responses = await Promise.all([msg1, msg2]);
  console.log('responses: ');
  console.log(JSON.stringify(responses[0], null, 2));
  console.log(JSON.stringify(responses[1], null, 2));
  console.log('---------');


  setTimeout(async function() {
    let obj = {
      type: 'type2',
      data: {
        hello: 'message 3'
      }
    };
    let res = await qoper8.send(obj);
  }, 10000);


  setTimeout(async function() {
    let obj = {
      type: 'type1',
      data: {
        hello: 'message 3'
      }
    };
    let res = await qoper8.send(obj);
  }, 45000);



})();
