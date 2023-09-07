let handler = function(obj, finished) {

    // simple example that just echoes back the incoming message

  console.log('handling incoming message in worker ' + this.id);
  console.log('Message count: ' + this.getMessageCount());

  // deliberately delaying response using a setTimeout

  setTimeout(() => { 
    finished({
      processing: 'Message processing done!',
      data: obj.data,
      time: Date.now(),
      handledByWorker: this.id
    });
  }, 1000);

};

export {handler};