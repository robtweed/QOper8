import {benchmark} from 'qoper8-ww/bunbenchmark';

benchmark({
  poolSize: 3,
  maxMessages: 100000,
  blockLength:1400,
  delay: 135
});
