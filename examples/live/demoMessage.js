export function handler(obj, finished) {

  let worker = this;

  postMessage({
    type: 'custom',
    data: {
      foo: 'bar'
    }
  });

  finished({
    info: 'Message successfully processed by WebWorker',
    originalData: obj.data,
    time: Date.now(),
    workerId: worker.id
  });

};