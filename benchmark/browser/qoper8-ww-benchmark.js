(async () => {

  const {QOper8} = await import('https://cdn.jsdelivr.net/gh/robtweed/QOper8/src/QOper8.min.js');

  function getValue(id) {
    return document.getElementById(id).value;
  }

  let handlerCode = `
    self.handler = function(msg, finished) {
      finished({
        messageNo: msg.messageNo,
        workerId: this.id,
        count: this.getMessageCount(),
      });
    };
  `;

  document.getElementById('goBtn').addEventListener("click", async function() {

    let poolSize = +getValue('noOfWorkers');
    let maxMessages = +getValue('noOfMessages');
    let blockLength = +getValue('msgsPerBlock');
    let delay = +getValue('delayPerBlock');

    let q = new QOper8({
      //logging: true,
      workerInactivityLimit: 2,
      poolSize: poolSize
    });

    let url = q.createUrl(handlerCode);
    q.handlersByMessageType.set('benchmark', url);

    let msgNo = 0;
    let batchNo = 0;
    let maxQueueLength = 0;
    let responseNo = 0;
    let startTime = Date.now();
    let messageCountByWorker = {};
    for (let id = 0; id < poolSize; id++) {
      messageCountByWorker[id] = 0;
    }

    function handleResponse(res, responseNo, workerId) {
      if (responseNo) {
        messageCountByWorker[workerId]++;
        if (responseNo === maxMessages) {
          let elapsed = (Date.now() - startTime) / 1000;
          let rate = maxMessages / elapsed;
          console.log('===========================');
          console.log(' ');
          console.log(responseNo + ' messages: ' + elapsed + ' sec');
          console.log('Processing rate: ' + rate + ' message/sec');
          for (let id = 0; id < poolSize; id++) {
            console.log('WebWorker ' + id + ': ' + messageCountByWorker[id] + ' messages handled');
          }
          console.log(' ');
          console.log('===========================');
        }
      }
    };

    function addBlockOfMessages(blockLength, delay) {
      // add a block of messages to the queue
      batchNo++;
      setTimeout(function() {
        // Check what's already in the queue
        let queueLength = q.getQueueLength();
        if (queueLength > maxQueueLength) {
          console.log('Block no: ' + batchNo + ' (' + msgNo + '): queue length increased to ' + queueLength);
          maxQueueLength = queueLength;
        }
        if (queueLength === 0) console.log('Block no: ' + batchNo + ' (' + msgNo + '): Queue exhausted');
        // Now add another block
        for (let i = 0; i < blockLength; i++) {
          msgNo++;
          let msg = {
            type: 'benchmark',
            messageNo: msgNo,
            time: Date.now()
          };
          q.message(msg, function(res, workerId) {
            responseNo++;
            handleResponse(res, responseNo, workerId);
          });
        }
        // add another block of message to the queue
        if (msgNo < maxMessages) {
          addBlockOfMessages(blockLength, delay);
        }
        else {
          console.log('Completed sending messages');
        }  
      }, delay);
    };

    addBlockOfMessages(blockLength, delay);

  });

})();
