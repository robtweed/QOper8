import { QOper8 } from "qoper8-ww";

let qoper8 = new QOper8({
  logging: true,
  poolSize: 2,
  handlersByMessageType: new Map([
    ['myMessage', 'myMessageHandler.js']
  ])
});


let req1 = qoper8.send({
  type: 'myMessage',
  data: {
    hello: 'world'
  }
});

let req2 = qoper8.send({
  type: 'myMessage',
  data: {
    hello: 'world2'
  }
});

let req3 = qoper8.send({
  type: 'myMessage',
  data: {
    hello: 'world3'
  }
});

let values = await Promise.all([req1, req2, req3]);

console.log(values);

let obj = {
 type: 'myMessage',
 data: {
   hello: 'world4'
 }
};
qoper8.message(obj, (resp, id) => {
 console.log('response received from worker ' + id + ':');
 console.log(resp);
});

let obj2 = {
 type: 'myMessage',
 data: {
   hello: 'world5'
 }
};

qoper8.message(obj2, (resp, id) => {
 console.log('response received from worker ' + id + ':');
 console.log(resp);
});


