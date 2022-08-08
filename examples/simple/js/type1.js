self.handler = function(obj, finished) {

  let worker = this;

  this.on('error', function(error) {
    worker.log('*** error *** : ' + error);
  });

  setTimeout(function() {

    finished({
      processing: 'Type 1 message processing done!',
      data: obj.data,
      time: Date.now(),
      worker: worker.id
    });
  }, 1000);
  

};
