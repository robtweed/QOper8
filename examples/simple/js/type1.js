export function handler(obj, finished) {

  let worker = this;

  this.on('error', function(error) {
    this.log('*** error *** : ' + error);
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