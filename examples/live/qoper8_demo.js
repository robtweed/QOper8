(async () => {

  const {QOper8} = await import('../../src/QOper8.min.js');

  let qoper8 = new QOper8({
    logging: true,
    handlersByMessageType: new Map([
      ['demoMessage', 'https://robtweed.github.io/QOper8/examples/live/demoMessage.js']
    ])
  });

  qoper8.on('workerStarted', function(id) {
    document.getElementById('activity').innerText += '\nNew WebWorker started with id: ' + id;
  });

  qoper8.on('addedToQueue', function(obj) {
    document.getElementById('activity').innerText += '\nMessage added to queue';
  });

  qoper8.on('sentToWorker', function(obj) {
    document.getElementById('activity').innerText += '\nMessage sent to WebWorker ' + obj.workerId;
  });

  qoper8.on('replyReceived', function(obj) {
    document.getElementById('activity').innerText += '\nResponse received from WebWorker ' + obj.workerId;
  });

  qoper8.on('workerTerminated', function(id) {
    document.getElementById('activity').innerText += '\nWebWorker ' + id + ' terminated';
  });

  document.getElementById('queueBtn').addEventListener("click", async function() {
    let json;
    try {
      json = JSON.parse(document.getElementById('payload').value);
    }
    catch(err) {
      alert('Invalid JSON');
      return;
    }

    let res = await qoper8.send({
      type: 'demoMessage',
      data: json
    });

    document.getElementById('results').innerText = JSON.stringify(res, null, 2);

  });



})();
