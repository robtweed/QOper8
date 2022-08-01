self.handler = function(obj, finished) {

  let worker = this;

  this.on('error', function(error) {
    this.log('*** error *** : ' + error);
  });

  finished({
    processing: 'Type 2 message processed successfully',
    data: obj.data,
    time: Date.now(),
    worker: worker.id
  });
  

};
